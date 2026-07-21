# comment-mention
- 涉及 repo: f2e (packages/features/mention)
- 對應 archived change: 無（MODIFIED requirement）
- 總計: 1 條 requirement / 3 個 scenario | ✅3 ⚠️0 ❌0 ❓0

## Requirement: @mention 插入文字使用顯示名稱 → ✅
證據: daodao-f2e:packages/features/mention/src/components/mention-input.tsx:102 `const mention = '@${candidate.name}';`（用 name 非 customId）；hook use-mention-input.ts:27 `next.set(candidate.numericUserId, candidate.name)`（以 name 當 handle）；存在 regression 測試 hooks/__tests__/use-mention-input.test.ts:65「[regression] 選取有 customId 的候選人，handle 應為 name 而非 customId」。
- Scenario: 選取有 customId 的使用者 → ✅ — mention-input.tsx:102 插入 `@${candidate.name}`；測試:65-75 驗證插入 @小許 而非 @Aaa
- Scenario: 選取沒有 customId 的使用者 → ✅ — 同樣使用 candidate.name（如 @peggy）
- Scenario: mention 仍可正確送出通知 → ✅ — use-mention-input.ts:27 map 以 numericUserId 為 key，getActiveMentionIds 比對內容 @name 後回傳 numericUserId（測試:75 驗證 mapWithCustomId 修復後可比對）
