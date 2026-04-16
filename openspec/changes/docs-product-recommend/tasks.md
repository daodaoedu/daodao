## 1. AI Backend API 與推薦資料契約

- [ ] 1.1 [daodao-ai-backend] 設計並新增首頁推薦卡片的 request / response schema 與 router，定義 `GET /api/v1/recommendation/topic_cards`、`POST /api/v1/recommendation/topic_cards/{recommendationId}/feedback` 的欄位與驗證規則。（驗收：AI backend 有明確 schema 與 router；卡片回傳至少包含 `recommendationId`、`targetType`、`targetId`、`title`、`description`、`creator`、`tags`、`matchReasonCode`、`matchReasonText`、`feedbackState`、`isAiGenerated`；非法 feedback payload 會回傳錯誤）
- [ ] 1.2 [daodao-ai-backend] 建立 dashboard recommendation service 的候選召回流程，整合現有 practice / recommendation 排序基礎，支援 `limit` 與 `exclude_ids` 參數。（驗收：service 能回傳固定數量的推薦卡片；補卡請求不會回傳 `exclude_ids` 內的目標；可被 router 呼叫）
- [ ] 1.3 [daodao-ai-backend] 實作推薦理由映射與卡片欄位組裝，將專業領域、想探索領域、相似用戶、進行中主題與瀏覽訊號轉為可解釋的 `matchReasonCode` / `matchReasonText`。（驗收：每張卡片都有對應理由；理由來源可追溯到明確特徵；缺少完整歷史資料時仍能回傳 cold-start 推薦）

## 2. Feedback 訊號與持久化

- [ ] 2.1 [daodao-storage] 新增推薦 feedback / hidden 狀態所需的資料表與 migration SQL，至少支援 `user_id`、`target_type`、`target_id`、`feedback_type`、`is_hidden`、`source`、時間戳與必要索引。（驗收：migration 可建立資料表；有支援 user + target 查詢與 hidden 過濾的索引；欄位可表達 like / dislike / hidden 狀態）
- [ ] 2.2 [daodao-ai-backend] 串接推薦 feedback 寫入與讀取邏輯，讓 `POST /feedback` 能新增、取消或更新 like / dislike / hidden 狀態。（驗收：like 可切換為 neutral；dislike 會標記 hidden；API 回傳最新 `feedbackState`；資料會寫入持久化層）
- [ ] 2.3 [daodao-ai-backend] 在推薦查詢時先排除使用者已 hidden 或已明確 dislike 的目標，並將正負向 feedback 納入排序權重調整。（驗收：同一使用者刷新後不會再次看到已 hidden 目標；補卡不會回傳當前已顯示或已隱藏項目；正負向 feedback 會影響後續候選排序）

## 3. 前端 Hook 與首頁整合

- [ ] 3.1 [daodao-f2e] 在 `packages/api` 新增首頁推薦 hook 與 feedback mutation，沿用 `showcase-hooks.ts` 的 AI backend 取數模式與型別輸出。（驗收：前端可用單一 recommendation hook 取得卡片列表；支援帶入 `limit`、`exclude_ids`；feedback mutation 可更新卡片狀態）
- [ ] 3.2 [daodao-f2e] 在產品首頁加入「探索相關主題」區塊與推薦卡片元件，顯示卡片資訊、推薦理由、AI 推薦聲明與查看更多入口。（驗收：首頁在主題實踐區塊下方顯示最多 3 張推薦卡片；原固定「已完成」區塊不再佔用相同版位；卡片內容符合 spec 欄位）
- [ ] 3.3 [daodao-f2e] 實作推薦區塊的非同步載入、空狀態、👍/👎 互動與補卡流程。（驗收：首頁主內容可先渲染、推薦區塊後載入；👎 後會顯示確認並移除卡片；若仍有候選則補上一張，否則顯示空狀態；空狀態 CTA 可導向既有靈感分頁）

## 4. 追蹤與驗證

- [ ] 4.1 [daodao-f2e] 新增推薦區塊曝光、點擊、like、dislike 與加入主題轉換的 tracking 事件。（驗收：推薦卡片與區塊的核心互動都有對應事件；事件可區分 `matchReasonCode`、目標 id 與互動類型）
- [ ] 4.2 [daodao-ai-backend] 補齊推薦 service 與 feedback regression tests，覆蓋 cold-start、理由映射、hidden 排除、feedback 權重調整與非法 payload 情境。（驗收：新增測試可重現並驗證上述情境；`make test` 可涵蓋新增邏輯）
- [ ] 4.3 [daodao-f2e] 完成首頁推薦整合的手動驗證清單與必要前端測試更新，確認載入、空狀態、補卡、重新整理後 hidden 不回來與 CTA 導流行為。（驗收：有可執行的驗證步驟；前端改動不破壞既有首頁 tab 行為；推薦區塊在桌機與行動版都能正常顯示）
