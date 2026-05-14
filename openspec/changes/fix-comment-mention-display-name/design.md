## Context

留言 @mention 功能透過 `useMentionInput` hook 管理狀態。當使用者從下拉選單選取候選人後，hook 將 `numericUserId → handle` 的映射存入 `mentionedIds` Map，同時 `mention-input.tsx` 把 `@handle` 文字插入輸入框。

目前 handle 的計算邏輯為 `candidate.customId || candidate.name`，導致有 customId 的使用者顯示 customId（如 `@Aaa`）而非名稱（如 `@小許`）。

## Goals / Non-Goals

**Goals:**
- 修正 @mention 插入文字改為固定使用 `candidate.name`
- `getActiveMentionIds()` 掃描邏輯保持不變，僅 handle 值改變

**Non-Goals:**
- 不處理名稱含空白的邊界問題（獨立 issue）
- 不回填已存在的歷史留言
- 不修改後端 API 或 DB schema

## Decisions

### 使用 `name` 而非 `customId` 作為 mention handle

**決定**：handle 固定為 `candidate.name`，移除 `customId || name` 的優先邏輯。

**理由**：
- `name` 是對使用者有意義的顯示文字，`customId` 是系統識別碼（類似帳號 ID）
- 下拉選單本身已顯示 `name`，選取後應保持一致
- `getActiveMentionIds()` 用 handle 掃描 content，兩處同步修改即可維持正確性

**替代方案**：在渲染層將 `@customId` 解析成 name
- 需要在 `renderContent()` 傳入 participants 映射表
- 增加複雜度，且已存在留言的 customId 也需對應解析
- 不如直接在來源修正

## Risks / Trade-offs

- [風險] 修改後新留言存 `@name`，舊留言存 `@customId`，兩種格式並存 → 已知且可接受，渲染層不區分，僅高亮顯示
- [風險] 名稱含空白（如 `Enn Tang`）時 `@Enn Tang` 的 handle 掃描可能不準確 → 此為既有問題，不在本次修正範圍

## Migration Plan

1. 修改 `use-mention-input.ts`：handle 儲存改為 `candidate.name`
2. 修改 `mention-input.tsx`：插入文字改為 `@${candidate.name}`
3. 無 DB migration，無 API 變更
4. Rollback：還原兩個檔案即可
