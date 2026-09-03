# cohort-basic-setup

## Purpose

場次設定面板的骨架（五個區段、兩階段建立、底部操作列、驗證跳轉）與「基本資訊」區段的資料模型：一句話簡介、互動方式與附屬欄位、聚會時段、收費設定，以及複製場次的深複製範圍（FRD #171 FR-CS-01～02、FR-BS-01～05、FR-VL-01～02、TP-CS、TP-BS）。

## ADDED Requirements

### Requirement: 內嵌式五區段面板與兩階段建立
場次設定面板 SHALL 為內嵌展開式（非 modal），展開於對應場次列下方（新建時於「建立場次」按鈕下方），標題新建時為「建立場次」、編輯時為「場次設定」，含關閉按鈕與五個 pill 區段切換（基本資訊、連結實踐模版、場次活動主頁、隱私、報名設定）。在場次於「基本資訊」完成建立（取得 cohortId）前，後四個區段 SHALL 為 disabled。面板展開時 SHALL 自動捲動至面板頂端。（FR-CS-01）

#### Scenario: 新建場次
- **WHEN** 帶領人點「建立場次」
- **THEN** 面板展開於「基本資訊」，其餘四個 pill 為 disabled，底部顯示「建立後立即發佈」toggle 與「建立場次」按鈕（FR-CS-02）

#### Scenario: 基本資訊建立成功後
- **WHEN** `POST /api/v1/lighthouse/programs/{programId}/cohorts` 回 201
- **THEN** 面板切換為編輯模式（標題「場次設定」、底部「儲存」），四個區段變為可用，場次列出現邀請連結與 QR code（FR-BS-05）

#### Scenario: 由總覽頁深連結開啟
- **WHEN** 以 `/lighthouse/programs?edit={cohortId}` 進入
- **THEN** 該場次的面板自動展開於「基本資訊」並捲動到面板頂端（TP-CS-01）

#### Scenario: 關閉面板
- **WHEN** 點擊面板右上角 ✕
- **THEN** 面板收合且未儲存的暫存狀態清除（TP-CS-04）

### Requirement: 基本資訊欄位
場次 SHALL 具備：`tagline`（一句話簡介，1–80 字，建立時必填）、`slug`、`displayName`、`startDate`、`endDate`、`joinDeadline`（建立時必填）、`capacity`（null 表示不限）。`createCohortSchema` SHALL 對上述必填欄位驗證；`updateCohortSchema` SHALL 只驗證有提供的欄位。前端 SHALL 顯示字數計數器「N / 80」（超過轉紅）與「不限」toggle（開啟時 capacity 為 null 且輸入框 disabled）。（FR-BS-01）

#### Scenario: 簡介超過 80 字
- **WHEN** `POST` 或 `PATCH` 帶 81 字的 `tagline`
- **THEN** 回 400，錯誤指向 `tagline`

#### Scenario: 人數不限
- **WHEN** 帶領人開啟「不限」toggle 並儲存
- **THEN** 送出 `capacity: null`，場次列摘要顯示「不限人數」（TP-BS-03）

#### Scenario: 既有場次缺簡介
- **WHEN** 編輯 migration 前建立、`tagline` 為 null 的場次且只修改人數
- **THEN** `PATCH` 成功；面板在簡介欄顯示必填提示但不阻擋其他欄位儲存

### Requirement: 互動方式與附屬欄位
場次 SHALL 具備 `interactionModes`（多選，值域 `sync`｜`async`｜`physical`，建立時至少一項）、`meetingUrl`（含 `sync` 時可填）、`location`（含 `physical` 時可填）。server SHALL 在 modes 不含 `sync` 時將 `meetingUrl` 清為 null、不含 `physical` 時將 `location` 清為 null。`async` 的文案 SHALL 為「以島島群組訊息進行，不需連結」，訊息功能本身不在本能力範圍。（FR-BS-02）

#### Scenario: 選取線上同步
- **WHEN** 帶領人勾選「線上同步」
- **THEN** 出現「會議連結」輸入框與「聚會時段」區塊；取消勾選後兩者隱藏，儲存時 server 清除 `meetingUrl` 與時段（TP-BS-05）

#### Scenario: 未選任何互動方式建立
- **WHEN** `POST` 帶 `interactionModes: []`
- **THEN** 回 400

#### Scenario: 摘要文字
- **WHEN** 勾選「線上同步」與「實體」
- **THEN** 下拉按鈕摘要顯示「線上同步、實體」（TP-BS-04）

### Requirement: 聚會時段
場次 SHALL 具備 0–50 筆聚會時段（`sessionDate`、`startTime`、`endTime`），僅在 `interactionModes` 含 `sync` 或 `physical` 時保留；以全量覆寫方式隨 `PATCH` 的 `sessions[]` 或 `PUT .../sessions` 更新；`startTime` 與 `endTime` 皆有值時 SHALL 滿足 start < end。前端 SHALL 至少保留一列（刪到最後一筆時重置為空白列），「＋ 新增時段」SHALL 帶入前一列的時間。（FR-BS-03）

#### Scenario: 新增時段帶入前一筆時間
- **WHEN** 第一列為 2026-10-01 19:00～21:00，點「＋ 新增時段」
- **THEN** 新列日期為空、時間預填 19:00～21:00（TP-BS-07）

#### Scenario: 結束早於開始
- **WHEN** 送出 `startTime: '21:00', endTime: '19:00'`
- **THEN** 回 400

#### Scenario: 空白列不送出
- **WHEN** 唯一一列的日期為空
- **THEN** 前端送出 `sessions: []`

### Requirement: 收費設定
場次 SHALL 具備 `feeType`（`free`｜`paid`，必填）、`feeAmount`（NT$/人，正整數）、`signupMethod`（`island_form`｜`external`）、`externalSignupUrl`。server SHALL 正規化：`paid` ⇒ `feeAmount` 與 `externalSignupUrl` 必填且 `signupMethod` 強制為 `external`；`free` ⇒ `feeAmount` 清為 null，`signupMethod='external'` 時 `externalSignupUrl` 必填，`island_form` 時清為 null。`PATCH` 部分更新時 SHALL 以合併後結果驗證。（FR-BS-04、FR-VL-01）

#### Scenario: 付費未填費用
- **WHEN** 送出 `feeType: 'paid'` 但無 `feeAmount` 或無 `externalSignupUrl`
- **THEN** 回 400 並指名缺少的欄位；前端將對應欄位標紅（TP-VL-02）

#### Scenario: 免費使用外部報名
- **WHEN** 送出 `feeType: 'free', signupMethod: 'external'` 且無 `externalSignupUrl`
- **THEN** 回 400（TP-VL-03）

#### Scenario: 付費切回免費
- **WHEN** 既有 `paid` 場次 `PATCH { feeType: 'free', signupMethod: 'island_form' }`
- **THEN** 回應 `feeAmount=null`、`externalSignupUrl=null`

### Requirement: 驗證失敗的回饋與跳轉
前端點「建立場次」或「儲存」時 SHALL 先做與 server 相同的必填驗證；失敗時對應欄位 border 變紅、頂部顯示「請補齊標紅的必填欄位」，並自動切換到有錯誤的區段（基本資訊優先於報名設定）。server 400 回應 SHALL 以相同方式呈現。（FR-VL-01、FR-CS-02）

#### Scenario: 報名設定與基本資訊同時有錯
- **WHEN** 簡介為空且勾選「在報名頁面顯示邀請訊息」但邀請訊息為空，點「儲存」
- **THEN** 面板跳到「基本資訊」，簡介欄標紅；修正後再儲存則跳到「報名設定」（TP-VL-01）

### Requirement: 儲存與發佈
驗證通過後，新建場次 SHALL 建立記錄；「建立後立即發佈」開啟時 `status='published'`，否則 `draft`。編輯場次 SHALL 維持原狀態。儲存成功後場次列表刷新。已發佈場次 SHALL 自動具備邀請連結（`joinToken`）。（FR-VL-02）

#### Scenario: 建立後立即發佈
- **WHEN** 開啟 toggle 並建立
- **THEN** 回應 `status='published'` 且 `joinToken` 非 null，場次列顯示邀請區塊（TP-VL-04）

#### Scenario: 編輯已發佈場次
- **WHEN** 對 published 場次修改地點並儲存
- **THEN** 回應 `status` 仍為 `published`，列表刷新，面板關閉（TP-VL-05）

### Requirement: 複製場次的深複製範圍
`POST .../cohorts/{cohortId}/duplicate` SHALL 在同一交易內複製：全部基本資訊欄位（`visibility` 強制 `private`、`status='draft'`）、聚會時段、有效模板綁定（含各自開始日）、未刪除的報名問題、活動主頁全部區塊與子列（區塊狀態重設為草稿、`scheduledAt` 清空）。SHALL NOT 複製名單、答案、打卡、加入連結、`joinPaused`。副本名稱為「{原名}（副本）」、slug 為 `{slug}-copy[-n]`。

#### Scenario: 複製含主頁與問題的場次
- **WHEN** 原場次有 3 個區塊（2 published、1 draft）、2 題報名問題、2 個模板綁定
- **THEN** 副本有 3 個 draft 區塊、2 題問題、2 個綁定、0 位成員、新的 `joinToken`、`visibility='private'`

#### Scenario: 副本可獨立編輯
- **WHEN** 修改副本的區塊或問題
- **THEN** 原場次不受影響
