## ADDED Requirements

### Requirement: Notification API SHALL return reactionType for reaction notifications

當通知類型為 practice reaction 時，API response 必須包含 `reactionType` 欄位，其值來自 notification payload 中的 `reactionType`。

#### Scenario: Reaction notification includes reactionType
- **WHEN** 使用者查詢通知列表，且通知為 practice reaction 類型
- **THEN** API response 的該筆通知必須包含 `reactionType` 欄位（如 `"encourage"`、`"fire"`、`"useful"` 等）

#### Scenario: Non-reaction notification omits reactionType
- **WHEN** 通知類型不是 practice reaction（如留言、追蹤等）
- **THEN** API response 的該筆通知不包含 `reactionType` 欄位

### Requirement: Frontend SHALL display correct emoji based on reactionType

前端通知列表必須根據 `reactionType` 顯示對應的 emoji，而非使用寫死的 fallback。

#### Scenario: Display correct emoji for known reactionType
- **WHEN** 通知包含 `reactionType` 且值為已知類型（encourage / touched / fire / useful / sameHere / curious）
- **THEN** 顯示對應的 emoji（🥰 / 💓 / 🔥 / 👍🏻 / 😳 / 🧐）

#### Scenario: Fallback emoji for missing reactionType
- **WHEN** 通知為 reaction 類型但 `reactionType` 欄位不存在（舊資料）
- **THEN** 顯示 fallback emoji 🙌

### Requirement: Email notification SHALL display correct emoji based on reactionType

Reaction email 通知必須根據 `reactionType` 顯示對應的 emoji，而非使用寫死的 🎉。

#### Scenario: Email displays correct emoji for reaction
- **WHEN** 使用者收到 practice reaction 的 email 通知
- **THEN** email 內容顯示對應 reactionType 的 emoji（🥰 / 💓 / 🔥 / 👍🏻 / 😳 / 🧐），而非寫死的 🎉

#### Scenario: Email fallback for missing reactionType
- **WHEN** email 通知的 reactionType 不存在（舊資料或異常）
- **THEN** email 顯示 fallback emoji 🎉
