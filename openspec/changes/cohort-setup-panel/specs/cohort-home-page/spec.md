# cohort-home-page

## Purpose

場次活動主頁：帶領人以三種區塊（自由文字、資源連結、日曆）組裝參與者加入後看到的首頁，區塊各自有發佈狀態與公開／限成員可見性；沿用 spaces 區塊系統的資料表與元件，改以 cohort 為擁有者（FRD #171 FR-HP-01～05、TP-HP-01～11）。

## ADDED Requirements

### Requirement: 主頁掛在場次
每個場次 SHALL 至多有一個活動主頁（`space_home_pages.cohort_id` 唯一），主頁 SHALL 在帶領人第一次新增區塊時自動建立，狀態固定為已發佈（可見性由區塊各自控制）。燈塔端點 `GET /api/v1/lighthouse/programs/{programId}/cohorts/{cohortId}/home-page` 對尚無主頁的場次 SHALL 回 `{ status: 'published', blocks: [] }`。既有 `spaces` 的主頁行為 SHALL 不受影響。

#### Scenario: 第一次新增區塊
- **WHEN** 場次尚無主頁，帶領人呼叫 `POST .../home-page/blocks { blockType: 'text' }`
- **THEN** 系統建立主頁與一個草稿區塊，回 201 並回傳區塊

#### Scenario: 非組織成員操作
- **WHEN** 非該組織成員呼叫任何 `.../home-page/*` 燈塔端點
- **THEN** 回 403

### Requirement: 區塊通用屬性與操作
每個區塊 SHALL 具備：型別（`text`｜`resources`｜`calendar`）、標題、發佈狀態（草稿／已發佈；排程到時視同已發佈）、可見性 `visibility`（`public`｜`members`，預設 `members`）、排序位置。帶領人 SHALL 可：編輯、存檔、存為草稿、發佈、上移／下移（首個無上移、末個無下移）、複製、刪除。複製 SHALL 產生標題加「（複本）」、狀態為草稿、位置緊接原區塊、子列完整複製的新區塊。（FR-HP-02）

#### Scenario: 切換可見性
- **WHEN** 帶領人把區塊 toggle 為「公開」並存檔
- **THEN** `PATCH .../blocks/{blockId} { visibility: 'public' }` 成功，區塊出現在報名頁的公開區塊中（TP-HP）

#### Scenario: 複製區塊
- **WHEN** 對已發佈的「課前準備」資源區塊點「複製」
- **THEN** 出現「課前準備（複本）」草稿區塊，含相同資源列，位置在原區塊之後

#### Scenario: 排序邊界
- **WHEN** 第一個區塊
- **THEN** 上移按鈕不顯示；對其呼叫 `move up` 回 400

### Requirement: 自由文字區塊
`text` 區塊編輯模式 SHALL 提供 rich text 工具列（粗體、斜體、項目符號、插入連結）與 textarea（placeholder「用『- 』開頭做項目符號；連結寫成 [文字](https://…)」）；檢視模式 SHALL 渲染粗體、斜體、項目符號與超連結。（FR-HP-03）

#### Scenario: 渲染連結
- **WHEN** 內文含 `[報名表](https://example.com)`
- **THEN** 檢視模式顯示可點擊的「報名表」連結，開新分頁並帶 `rel="noreferrer"`

### Requirement: 資源連結區塊
`resources` 區塊 SHALL 支援：貼上連結新增（Enter 送出；自動命名）、切換為手動輸入名稱、每筆資源可指定所屬實踐模版（`templateId`，下拉為此場次已連結的模版＋「未指定實踐」）、編輯／刪除。「從實踐模版匯入」SHALL 以多選挑選已連結的模版（顯示各自資源數），匯入所選模版的資源並以 url（無 url 則 name）去重，匯入列自動帶 `templateId` 與來源 badge。（FR-HP-04）

#### Scenario: 匯入去重
- **WHEN** 區塊已有 `https://a.example` 一筆，帶領人匯入含同一 url 的模版資源 3 筆
- **THEN** 只新增另外 2 筆，按鈕文字顯示「匯入所選 2 個資源」的結果提示

#### Scenario: 指定所屬實踐
- **WHEN** 把資源的所屬實踐改為模版 B 並存檔
- **THEN** `PATCH` 的 `links[]` 該筆帶 `templateId=B`，檢視模式顯示模版 B badge

#### Scenario: 模版解除綁定後
- **WHEN** 資源指向的模版已從場次解綁
- **THEN** 資源仍保留，badge 顯示模版名稱但下拉標示「（已解除連結）」

### Requirement: 日曆區塊
`calendar` 區塊每筆活動 SHALL 具備：標題、開始日（必填，日曆選擇器 popup 含月份切換、「今天」「清除」）、結束日（選填）、開始／結束時間（選填）、描述（rich text，選填）。檢視模式 SHALL 依月份分組（每月標題＋活動計數），每筆顯示標題、日期時間、描述。（FR-HP-05）

#### Scenario: 月份分組
- **WHEN** 活動分佈在 2026-10 兩筆、2026-11 一筆
- **THEN** 檢視模式顯示「2026 年 10 月（2）」「2026 年 11 月（1）」兩組

#### Scenario: 日曆 popup 無障礙
- **WHEN** 開啟日期選擇器
- **THEN** 月份切換按鈕具備 aria-label「上個月」「下個月」（TP-A11Y-02）

### Requirement: 學員視圖
已加入（status=joined）的學員 SHALL 可經 `GET /api/v1/cohorts/{cohortId}/home-page` 取得該場次所有已發佈區塊（不分可見性），並在 `/cohorts/[cohortId]` 的「主頁」分頁唯讀檢視；草稿與未到時排程區塊 SHALL 不回傳。

#### Scenario: 學員看主頁
- **WHEN** 已加入學員開啟主頁分頁，場次有 2 published（1 public、1 members）與 1 draft 區塊
- **THEN** 看到 2 個區塊，看不到草稿

#### Scenario: 未加入者呼叫學員端點
- **WHEN** 未加入的登入使用者呼叫 `GET /api/v1/cohorts/{cohortId}/home-page`
- **THEN** 回 404

### Requirement: 公開區塊出現在報名頁與探索詳情
`visibility='public'` 且已發佈的區塊 SHALL 隨 `GET /api/v1/cohorts/join/{joinToken}` 與 `GET /api/v1/activities/{cohortId}` 以 `publicBlocks[]` 回傳，供未加入者在報名頁／探索詳情閱讀；`members` 區塊 SHALL NOT 出現。

#### Scenario: 報名頁顯示公開區塊
- **WHEN** 匿名訪客開啟報名頁，場次有 1 個 public 已發佈區塊
- **THEN** 報名頁在邀請訊息之後顯示該區塊內容

### Requirement: 預覽活動主頁
帶領人 SHALL 可在區段內點「預覽活動主頁」，以唯讀方式檢視「學員會看到的主頁」（僅已發佈區塊，依排序），不需要帶領人本人是該場次成員。

#### Scenario: 預覽
- **WHEN** 帶領人點「預覽活動主頁」
- **THEN** 開啟 modal，內容與學員主頁分頁一致，不含草稿區塊
