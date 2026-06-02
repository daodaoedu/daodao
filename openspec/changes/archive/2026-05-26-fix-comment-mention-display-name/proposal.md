## Why

留言輸入框的 @mention 功能在選取使用者後，插入的文字使用 `customId`（如 `@Aaa`）而非顯示名稱（如 `@小許`），導致留言內容對讀者不友善。這是前端邏輯的優先順序錯誤，應在修正後立即上線。

## What Changes

- `use-mention-input.ts`：`handleMentionSelect` 儲存的 handle 從 `customId || name` 改為固定使用 `name`
- `mention-input.tsx`：選取後插入文字從 `@${candidate.customId || candidate.name}` 改為 `@${candidate.name}`
- `getActiveMentionIds()` 行為不變（handle 已改為 name，掃描邏輯相同）

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `comment-mention`：@mention 插入文字的顯示規則從「優先 customId」改為「固定 name」

## Impact

- **daodao-f2e**：`packages/features/mention/src/`（hook + 元件）
- 不影響後端 API、DB schema、或通知流程
- 不影響已存在的留言資料（歷史留言不會回填）
