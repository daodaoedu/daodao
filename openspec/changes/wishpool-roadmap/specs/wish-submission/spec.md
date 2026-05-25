## ADDED Requirements

### Requirement: 三步驟許願提交
登入使用者 SHALL 能透過三步驟引導流程（Step 1 選分類 → Step 2 描述情境 → Step 3 描述期待）提交許願。許願 SHALL 綁定提交者帳號（`submitter_user_id` 必填）。

#### Scenario: 完成三步驟送出
- **WHEN** 已登入使用者選好分類、填妥情境與期待並按「確認送出」
- **THEN** 系統 SHALL 建立一筆 `wishes` 記錄（`status='pending'`，帶 `submitter_user_id`），回傳成功與完成頁

#### Scenario: 未填必填欄位禁止前進
- **WHEN** 使用者在某一步未填妥必填欄位（分類未選，或情境/期待為空）
- **THEN** 系統 SHALL 禁止進入下一步並提示

#### Scenario: 情境字數不足
- **WHEN** Step 2 情境描述少於最小字數（10 字）
- **THEN** 系統 SHALL 回傳 400 並要求補充

### Requirement: 未登入許願引導與草稿保留
許願需登入。未登入使用者點擊「點我許願」時，系統 SHALL 引導登入/註冊並於登入後返回繼續流程，且 SHALL 盡量保留其已填內容。

#### Scenario: 未登入點許願
- **WHEN** 未登入使用者點「點我許願」
- **THEN** 系統 SHALL 導向登入/註冊，登入後返回 `/roadmap?openWish=1` 自動開啟 wizard

#### Scenario: 草稿回填
- **WHEN** 未登入使用者填到一半（或填完）才被要求登入，登入後返回
- **THEN** 系統 SHALL 從 localStorage 草稿回填 wizard 內容；送出成功後 SHALL 清除草稿

#### Scenario: 草稿過期
- **WHEN** localStorage 草稿建立超過 24 小時
- **THEN** 系統 SHALL 視為失效、不回填

### Requirement: 聯絡方式
許願者進度通知 email SHALL 預設取帳號 email，並允許使用者於確認頁覆寫。

#### Scenario: 預設與覆寫
- **WHEN** 使用者在確認頁未填聯絡 email
- **THEN** 系統 SHALL 以帳號 email 作為進度通知對象
- **WHEN** 使用者填入其他 email
- **THEN** 系統 SHALL 以該 email 覆寫存入 `contact_email`
