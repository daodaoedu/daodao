## ADDED Requirements

### Requirement: 挑戰專屬動態流公開可讀
挑戰 Feed（`/challenge/:id/feed`）SHALL 對所有使用者（含未登入者）公開。任何人均可瀏覽挑戰內的打卡全文，無需登入或報名。

#### Scenario: 未登入使用者瀏覽挑戰 Feed
- **WHEN** 未登入使用者訪問挑戰 Feed URL
- **THEN** 頁面正常顯示所有公開打卡記錄，不強制登入

#### Scenario: 挑戰 Feed 僅顯示屬於此挑戰的打卡
- **WHEN** 任何使用者訪問挑戰 Feed
- **THEN** 僅顯示 `challenge_id` 對應此挑戰的 Practice check-in，不顯示非此挑戰的打卡

### Requirement: 私密打卡在 Feed 中僅對挑戰成員可見
若參與者將其打卡設為私密（`visibility: 'private'`），該打卡 SHALL 僅對挑戰成員（`challenge_participants` 內的使用者）可見，外部觀察者 SHALL 無法透過任何途徑看到私密打卡全文。

#### Scenario: 外部觀察者無法看到私密打卡
- **WHEN** 非挑戰成員的使用者（或未登入使用者）訪問挑戰 Feed
- **THEN** 私密打卡不出現在 Feed 列表中；若直接訪問私密打卡 URL，API 回傳 403

#### Scenario: 挑戰成員可看到私密打卡
- **WHEN** 已報名的挑戰成員訪問挑戰 Feed
- **THEN** Feed 中包含其他成員的私密打卡（完整內容可讀）

#### Scenario: 打卡擁有者永遠可見自己的私密打卡
- **WHEN** 打卡擁有者（同時為挑戰成員）訪問 Feed
- **THEN** 自己的私密打卡正常顯示

### Requirement: 挑戰 Feed API 支援分頁與過濾
`GET /api/challenges/:id/feed` SHALL 支援游標分頁（cursor-based），並可依時間排序。

#### Scenario: 正常分頁取得 Feed
- **WHEN** 呼叫 `GET /api/challenges/:id/feed?limit=20`
- **THEN** 回傳最多 20 筆打卡，並包含下頁游標（`nextCursor`）

#### Scenario: 已無更多資料時回傳空游標
- **WHEN** 呼叫帶有最後一頁游標的 API
- **THEN** 回傳的 `nextCursor` 為 null
