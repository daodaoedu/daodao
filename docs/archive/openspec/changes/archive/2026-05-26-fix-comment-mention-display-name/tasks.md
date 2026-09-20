## 1. 修正 mention handle 邏輯（daodao-f2e）

- [x] 1.1 修改 `packages/features/mention/src/hooks/use-mention-input.ts`：`handleMentionSelect` 中儲存 handle 從 `candidate.customId || candidate.name` 改為 `candidate.name`
- [x] 1.2 修改 `packages/features/mention/src/components/mention-input.tsx`：選取後插入文字從 `@${candidate.customId || candidate.name}` 改為 `@${candidate.name}`

## 2. 測試（daodao-f2e）

- [x] 2.1 為 `useMentionInput` 新增 regression test：選取有 customId 的候選人，驗證插入文字為 `@name` 而非 `@customId`
- [x] 2.2 驗收：手動測試留言輸入，選取使用者後確認顯示名稱正確
