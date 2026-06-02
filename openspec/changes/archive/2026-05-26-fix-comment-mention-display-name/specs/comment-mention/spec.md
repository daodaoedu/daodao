## MODIFIED Requirements

### Requirement: @mention 插入文字使用顯示名稱
當使用者從 @mention 下拉選單選取候選人後，系統 SHALL 將 `@${candidate.name}` 插入輸入框，不得使用 `customId`。

#### Scenario: 選取有 customId 的使用者
- **WHEN** 使用者輸入 `@` 並從下拉選單選取一個具有 `customId` 的使用者（如 customId="Aaa", name="小許"）
- **THEN** 輸入框插入 `@小許`，而非 `@Aaa`

#### Scenario: 選取沒有 customId 的使用者
- **WHEN** 使用者輸入 `@` 並從下拉選單選取一個沒有 `customId` 的使用者（name="peggy"）
- **THEN** 輸入框插入 `@peggy`

#### Scenario: mention 仍可正確送出通知
- **WHEN** 使用者選取使用者後送出留言，內容包含 `@小許`
- **THEN** `getActiveMentionIds()` 回傳該使用者的 numericUserId，後端收到正確的 `mentionedUserIds`
