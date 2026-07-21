# recommendation-feedback-signals
- 涉及 repo: ai-backend (recommendation router/service/model), f2e (recommendation-hooks), storage (migration)
- 對應 archived change: 無（以程式碼為準）
- 總計: 5 條 requirement / 10 個 scenario | ✅3 ⚠️2 ❌0 ❓0

## Requirement: support like, unlike, dislike, and hide semantics → ⚠️
證據: daodao-ai-backend:src/services/dashboard_recommendation_service.py:233-283 `submit_feedback`：like/dislike，再按同一型 → 刪除回 neutral（unlike）；dislike → `is_hidden=True`。FeedbackType 僅 like/dislike（daodao-f2e:packages/api/src/services/recommendation-hooks.ts:11）。
- Scenario: Like a recommendation card → ✅ — submit_feedback 建 record feedback_type=like，回 LIKED。
- Scenario: Undo a like → ✅ — 同型再按 `session.delete(record)` 回 NEUTRAL（service line 253-260）。
- Scenario: Dislike and hide → ✅ — dislike 設 `is_hidden = (type==DISLIKE)`（line 261/273）並回 DISLIKED。
  差異：spec 列舉 4 種語意（like/unlike/dislike/hide），實作以 like/dislike 兩型 + toggle 達成；無獨立 "hide" 動作，hide 綁在 dislike。⚠️ 命名/動作數量與 spec 略有落差。

## Requirement: Hidden recommendations persist across sessions and devices → ✅
證據: daodao-ai-backend:src/models/RecommendationFeedback.py（DB table `recommendation_feedback`，user_id + is_hidden 持久化）；查詢 `_get_hidden_target_ids`（dashboard_recommendation_service.py:52-64）以 user_id 撈，跨裝置一致。
- Scenario: remains hidden after refresh → ✅ — get_topic_cards 以 hidden_ids 過濾（service line 165-175）。
- Scenario: remains hidden across devices → ✅ — 帳號綁定 DB 紀錄，與裝置無關。

## Requirement: exclude user-hidden targets before ranking output → ✅
證據: daodao-ai-backend:src/services/dashboard_recommendation_service.py:165-175 `hidden_ids = _get_hidden_target_ids(...)`、`all_exclude = hidden ∪ exclude_ids`、`query.filter(Practice.id.notin_(all_exclude))` 於回傳前排除。router topic_cards 註解 line 88「已 hidden/dislike 自動排除」。
- Scenario: Exclude hidden targets from result → ✅ — notin_ 過濾於排序輸出前。
- Scenario: Exclude currently displayed targets during refill → ✅ — router exclude_ids query 參數（recommendation.py:82）+ hidden 合併排除，補卡不重複。

## Requirement: Feedback signals influence future ranking → ⚠️
證據: 負向回饋 → is_hidden → 排除（等同強制降權至 0）。但 spec 要求「正向提高相似內容權重 / 負向降低相似內容權重」之 ranking signal，未見明確 similar-content 加權邏輯（dashboard_recommendation_service 無相似度權重調整）。
- Scenario: Positive feedback increases similar weight → ⚠️ — 無「相似內容加權」實作證據，liked 僅記狀態。
- Scenario: Negative feedback decreases similar weight → ⚠️ — disliked 走 hidden 排除（極端降權），非「相似內容降權」之軟訊號。

## Requirement: Feedback write API validate and persist source-specific events → ✅
證據: daodao-ai-backend:src/routers/recommendation.py:97 `POST /v1/recommendation/topic_cards/{practice_id}/feedback`，body `RecommendationFeedbackRequest`（schemas/dashboard_recommendation.py）驗證 feedbackType；service 寫入帶 `source=RECOMMENDATION_SOURCE`、`target_type=TARGET_TYPE`，回 feedbackState。前端 daodao-f2e:packages/api/src/services/recommendation-hooks.ts:105-121 對應呼叫。
- Scenario: Accept valid dashboard feedback → ✅ — router 驗證並 submit_feedback 寫入回 state。
- Scenario: Reject unsupported payload → ✅ — FeedbackType enum + Pydantic schema 驗證，非法 type 由 FastAPI 422 拒絕（依 RecommendationFeedbackRequest 型別）。
