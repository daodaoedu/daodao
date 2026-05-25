## ADDED Requirements

### Requirement: 許願收件匣
團隊 SHALL 能在後台檢視待處理許願，並依分類/狀態篩選、關鍵字搜尋。

#### Scenario: 篩選與搜尋
- **WHEN** 管理者開啟收件匣並套用分類/狀態篩選或關鍵字
- **THEN** 系統 SHALL 回傳符合條件的許願（含分類、情境、期待、來源、聯絡方式、時間）

### Requirement: 歸併到既有項目
團隊 SHALL 能將一則許願歸入既有路線圖項目，視為該許願者對項目投票。

#### Scenario: 歸併成功
- **WHEN** 管理者將許願 link 到某項目
- **THEN** 系統 SHALL 建立 `origin='wish_link'` 的 support，並將 `wishes.status` 設為 `linked`、`linked_roadmap_item_id` 指向該項目

#### Scenario: 其他分類強制模組標籤
- **WHEN** 許願 `category='other'` 且歸併/促成時未填 `internal_module_tag`
- **THEN** 系統 SHALL 回傳 400 並要求補上模組子標籤

### Requirement: 促成新項目
團隊 SHALL 能以一則許願為基礎建立新的對外路線圖項目並完成歸併。

#### Scenario: promote 建立並歸併
- **WHEN** 管理者填寫對外標題、描述、分類、初始狀態並 promote
- **THEN** 系統 SHALL 建立 `roadmap_items`（自動產生 `external_id`）並將該許願歸入（同歸併流程）

### Requirement: 封存許願
團隊 SHALL 能封存重複/無效/不適用的許願，且 SHALL 保留原文。

#### Scenario: 封存
- **WHEN** 管理者封存某許願
- **THEN** 系統 SHALL 將 `wishes.status` 設為 `archived`，不刪除原文

### Requirement: 路線圖項目管理與狀態機
團隊 SHALL 能管理項目的標題、描述、分類、狀態、`is_public`、`pinned`、`sort_order`。狀態 SHALL 限於 `collected`/`discussing`/`planned`/`in_progress`/`done`/`parked`。

#### Scenario: 設為已完成
- **WHEN** 管理者將項目 `status` 設為 `done`
- **THEN** 系統 SHALL 寫入 `shipped_at` 並對所有支持者觸發一次 `roadmap.shipped` 通知

#### Scenario: 暫不考慮預設不公開
- **WHEN** 項目設為 `parked`
- **THEN** 系統 SHALL 預設 `is_public=false`，不出現在公開看板

### Requirement: 進度通知
系統 SHALL 在許願被採納與項目完成時通知相關使用者，並聚合避免轟炸。

#### Scenario: 許願被採納
- **WHEN** 某使用者的許願被歸入或促成項目
- **THEN** 系統 SHALL 發送 `wish.linked` 通知給該許願者（站內 + Email，Email 取 `contact_email` 或帳號 email）

#### Scenario: 聚合防轟炸
- **WHEN** 同一項目短時間內多次狀態變動
- **THEN** 系統 SHALL 聚合為單次通知

### Requirement: 趨勢報表
後台 SHALL 提供許願/投票的彙整與趨勢報表，預設本月、可切時間範圍。

#### Scenario: 四指標
- **WHEN** 管理者開啟報表
- **THEN** 系統 SHALL 提供：熱門分類排行、熱門項目排行（依票數，可篩狀態）、許願量趨勢（週/月，可依分類拆）、待處理積壓（pending 數與最舊等待時間）
