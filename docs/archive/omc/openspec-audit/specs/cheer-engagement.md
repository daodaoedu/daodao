# cheer-engagement
- 涉及 repo: server (reaction routes/controller/service) / storage (reactions table)
- 對應 archived change: 2026-05-26-social-interactions / 2026-05-26-batch-reactions-api（spec 描述為早期 practice_reactions 設計，最終實作為泛用 reactions 系統）
- 總計: 4 條 requirement / 11 個 scenario | ✅2 ⚠️5 ❌4 ❓0

## Requirement: Practice reaction action → ⚠️
spec: `POST /api/v1/practices/:id/react`，body `reaction_type`，toggle，可同時多種 reaction_type
實作: 泛用端點 `POST /api/v1/reactions`（daodao-server:src/routes/reaction.routes.ts:32-33），body 含 targetType/targetId/reactionType
- Scenario: 使用者對練習新增反應 → ⚠️ — 反應功能存在（reaction.service.ts upsert 寫入 reactions 表），但端點為 /api/v1/reactions 非 /practices/:id/react；回傳結構為 {reactions: ReactionCount[], currentUserReaction}（reaction.types.ts:37-40）非 spec 的 {reaction_type, is_reacted, reactions}
- Scenario: 使用者再次反應即取消（toggle）→ ⚠️ — DELETE /api/v1/reactions 提供取消（reaction.routes.ts:55-56），但行為由前端 upsert/remove 控制，非同端點 toggle；且 reactions 表 UNIQUE 為 (target_type,target_id,user_id)（migrate/sql/012:14）**不含 reaction_type**，故一使用者一目標僅能持有「一種」反應，與 spec「可同時持有多種不同 reaction_type」矛盾
- Scenario: 未登入使用者無法反應 → ⚠️ — reaction.routes.ts:138 router.post 套用 auth middleware（需驗證 401 行為，未逐行確認 middleware）；機制存在但端點命名不符

⚠️ reaction_type enum 落差：spec 要求 `encourage|touched|fire|useful|sameHere|curious`（6 種）；DB CHECK 僅 `useful|fire|touched|curious`（4 種，migrate/sql/012:9），缺 encourage 與 sameHere。

## Requirement: Reaction summary display → ⚠️
spec: `GET /api/showcase/practices` 回應含 reactions: IReactionCount[]（type/count/latestActorName）
實作: ReactionCount {type,count,latestActorName} 結構存在（reaction.types.ts:30-34），由 reaction.service.ts:265-284 聚合
- Scenario: 卡片回應包含反應聚合 → ⚠️ — 結構 type/count/latestActorName 與 spec IReactionCount 完全相符（reaction.service.ts:279-285），但取得管道為 GET /api/v1/reactions 與 /reactions/batch（reaction.routes.ts:78,117），非 spec 的 GET /api/showcase/practices 直接內嵌
- Scenario: 多人反應時顯示代表者名稱 → ✅ — latestActorName 取最新反應者 nickname（reaction.service.ts:272），結構支援「Joy 與其他 N 人」前端組合
- Scenario: 卡片顯示前兩名 emoji → ⚠️ — 後端回傳所有 type 的 count，「前兩名 emoji」為前端呈現邏輯（reaction-picker-button summary 已驗於 checkin-reactions spec），此處屬前端責任，後端資料足夠

## Requirement: Reaction notification for delayed practices → ❌
spec: 僅 privacy_status='delayed' 練習收到反應時通知擁有者，管道 email，1 小時內合併
實作: reaction.service.ts:99-125 practice 分支對「擁有者≠反應者」**一律**發 notificationEventService.createEvent（type:'reaction', priority:'P2'）
- Scenario: 延遲分享練習收到反應觸發通知 → ⚠️ — 會對 practice 擁有者發通知，但**不限 delayed**（grep privacy_status/delayed 於 reaction.service.ts 無結果），且管道為通知事件系統（in-app+email worker）非 spec 指定 email-only
- Scenario: 1 小時內多次反應合併通知 → ⚠️ — notification-inapp.worker.ts:7 依 (type,entity_type,entity_id) 聚合 P2，notification-email.worker 有 windowHours 機制，存在聚合但非「reaction 專屬 1 小時合併」明確實作
- Scenario: 即時公開練習收到反應不觸發通知 → ❌ — 與 spec 相反：實作對 public 練習仍會發通知（無 privacy_status 過濾），只要擁有者≠反應者就送（reaction.service.ts:104-115）

## Requirement: Reaction data model → ❌
spec: `practice_reactions` 表，欄位 practice_id/user_id/reaction_type/created_at，(practice_id,user_id,reaction_type) 唯一鍵
實作: 泛用 `reactions` 表（migrate/sql/012），欄位 target_type/target_id/user_id/reaction_type，唯一鍵 (target_type,target_id,user_id)
- Scenario: 防止重複反應記錄 → ❌ — 無 practice_reactions 表；唯一鍵為 (target_type,target_id,user_id) 不含 reaction_type，語意與 spec (practice_id,user_id,reaction_type) 不同 — spec 允許同使用者多種 reaction、實作限一種。reaction_type CHECK 值亦不含 encourage/sameHere（migrate/sql/012:5,9，target_type 初版僅 'practice'，後續 013/030 才加 comment/checkin）

## 關鍵落差
1. 架構整體改為泛用 reaction 系統：spec 的 `POST /practices/:id/react` + `practice_reactions` 表完全未實作，改為 `POST /api/v1/reactions`（targetType）+ `reactions` 表（❌ 兩條 data/endpoint requirement）。
2. 唯一鍵語意相反：reactions UNIQUE(target_type,target_id,user_id) 使每人每目標僅一種反應，直接違反 spec「同一使用者可同時持有多種不同 reaction_type」。
3. delayed 通知條件未實作：通知對所有 practice 反應（擁有者≠反應者）觸發，無 privacy_status='delayed' 過濾，「公開練習不通知」scenario 與實作相反；reaction_type 缺 encourage/sameHere 兩值。
