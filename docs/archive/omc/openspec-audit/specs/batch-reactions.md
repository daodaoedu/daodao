# batch-reactions
- 涉及 repo: server (reaction route/validator/service), f2e (reaction-hooks, showcase cards)
- 對應 archived change: batch-reactions-api（git status 顯示 openspec/changes/batch-reactions-api 已刪除＝archived）
- 總計: 5 條 requirement / 11 個 scenario | ✅9 ⚠️2 ❌0 ❓0

## Requirement: Batch reactions API endpoint → ✅
證據: daodao-server:src/routes/reaction.routes.ts:117,160 `GET /api/v1/reactions/batch`；validators getReactionsBatchQuerySchema (reaction.validators.ts:113)；回應 record<targetId, {reactions, currentUserReaction, items}> (reaction.validators.ts:146)
- Scenario: 成功批次查詢 → ✅ — 回 data 物件 key=targetId，值含 reactions/currentUserReaction/items (reaction.validators.ts:146-150)。命名 items 對齊 list
- Scenario: 未登入用戶查詢 → ⚠️ — batch route 用 optionalAuthenticate（需確認），currentUserReaction 設計為 nullable (reaction.validators.ts:148)；未登入時 null 行為由 service 控制，未逐行驗證 currentUserId 為 undefined 路徑
- Scenario: 目標無任何反應 → ⚠️ — 回應 schema 允許 reactions 空陣列、currentUserReaction null、items 空陣列；spec 提及 `reactionList` 命名，實作用 `items`（spec 主文也說對齊 list 命名）— 命名一致性 OK，但空目標的實際 service 輸出未逐行驗證

## Requirement: Batch endpoint 參數驗證 → ✅
證據: daodao-server:src/validators/reaction.validators.ts:118-124 targetIds 1~50、targetType enum、UUID/整數格式 superRefine
- Scenario: targetIds 超過 50 → ✅ — `.max(50)` 拋驗證錯誤→400 (reaction.validators.ts:124)
- Scenario: targetIds 為空 → ✅ — `.min(1)` + `z.string().min(1)`→400 (reaction.validators.ts:118,124)
- Scenario: targetType 無效 → ✅ — `z.enum(REACTION_TARGET_TYPES)`→400 (reaction.validators.ts:114)

## Requirement: 前端批次 reactions hook → ✅
證據: daodao-f2e:packages/api/src/services/reaction-hooks.ts:73 `useReactionsBatch`，SWR key ["/api/v1/reactions/batch", targetType, sortedIds]
- Scenario: 列表頁用 batch 取代個別請求 → ✅ — page.tsx 使用 useReactionsBatch 單一請求；卡片接 batchReactionData props (PracticeShowcaseCard.tsx:165)
- Scenario: SWR 快取 key 一致性 → ✅ — reaction-hooks.ts:74 `[...targetIds].sort().join(",")` 排序後組 key

## Requirement: 卡片元件支援預取 reactions props → ✅
證據: daodao-f2e:apps/product/src/components/showcase/PracticeShowcaseCard.tsx:165 與 BrewingCard.tsx:157 `useCardReactions("practice", id, batchReactionData, ...)`
- Scenario: 列表頁傳入預取資料 → ✅ — 卡片接 batchReactionData，透過 use-card-reactions 使用 props 而非獨立請求
- Scenario: Detail page 不傳 props → ✅ — useCardReactions 在 batchReactionData 為空時 fallback 獨立 hook（use-card-reactions 設計）

## Requirement: Mutation 後快取更新 → ✅
證據: daodao-f2e:apps/product/src/components/showcase/*Card.tsx 透過 onReactionMutate callback（useCardReactions 第 4 參數）
- Scenario: 用戶在列表頁按反應 → ✅ — onReactionMutate 回傳給列表頁觸發 batch SWR revalidate（cards 將 mutate 委派給父層 page）
