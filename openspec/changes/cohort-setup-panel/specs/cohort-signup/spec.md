# cohort-signup

## Purpose

報名設定區段與島民端報名頁：邀請訊息及其顯示旗標、報名表自訂問題與答案、報名頁依收費／報名方式分流（島島報名表 vs 外部連結）、報名頁預覽（內嵌與 modal），以及帶領人在名單看到答案（FRD #171 FR-SU-01～05、TP-SU-01～11）。

## ADDED Requirements

### Requirement: 邀請訊息與顯示旗標
場次 SHALL 具備 `showInviteMessageOnSignup`（預設 false）。為 true 時 `inviteMessage` SHALL 必填（建立與更新皆驗證），並出現在報名頁與邀請信；為 false 時 `inviteMessage` 僅出現在邀請信，`GET /cohorts/join/{joinToken}` 的 `inviteMessage` SHALL 回 null。前端在未勾選時 SHALL 將 textarea disabled 並顯示 placeholder「勾選上方選項後可填寫」。（FR-SU-01）

#### Scenario: 勾選顯示但訊息為空
- **WHEN** `PATCH { showInviteMessageOnSignup: true, inviteMessage: '' }`
- **THEN** 回 400，前端跳至「報名設定」並標紅邀請訊息（TP-SU-01）

#### Scenario: 未勾選顯示
- **WHEN** `showInviteMessageOnSignup=false` 且 `inviteMessage` 有值
- **THEN** 報名頁不顯示邀請訊息，邀請信仍包含

### Requirement: 報名表自訂問題
場次 SHALL 具備 0–20 題自訂問題，每題含 `label`（≤200）、`questionType`（`short_text`｜`long_text`｜`single_choice`｜`multi_choice`）、`options`（選擇題必填，1–10 個）、`isRequired`、`position`。以 `PUT /api/v1/lighthouse/programs/{programId}/cohorts/{cohortId}/signup-questions` 全量覆寫：帶 `id` 者更新、無 `id` 者新增、缺席者軟刪除（保留既有答案）。固定欄位「怎麼稱呼你」「Email」SHALL NOT 入表，由前端固定顯示並標示「由 Google 帳號帶入」。前端 SHALL 支援上移／下移、題型切換時顯示選項輸入、必填／選填 toggle、刪除後題號重排。（FR-SU-02）

#### Scenario: 新增單選題
- **WHEN** 帶領人新增題目、題型切為「單選」、填 3 個選項並儲存
- **THEN** `PUT` 帶該題 `options` 長度 3，回應含新 `id` 與 `position`（TP-SU-03）

#### Scenario: 選擇題缺選項
- **WHEN** `PUT` 帶 `questionType: 'single_choice'` 且 `options` 為空
- **THEN** 回 400

#### Scenario: 刪除已有答案的題目
- **WHEN** 某題已有 5 筆答案，帶領人刪除該題並儲存
- **THEN** 該題 `deletedAt` 被設定，答案保留，名單中該題答案標示「（已刪除的問題）」（TP-SU-05）

### Requirement: 報名頁資訊與分流
`GET /api/v1/cohorts/join/{joinToken}` SHALL 額外回傳 `tagline`、`interactionModes`、`location`、`sessions`、`feeType`、`feeAmount`、`signupMethod`、`externalSignupUrl`、`capacity`、`joinDeadline`、`participantCount`、`questions[]`（僅 `signupMethod='island_form'` 時非空）、`publicBlocks[]`、`privacy`；SHALL NOT 回傳 `meetingUrl`。報名頁 SHALL 顯示：場次名稱、一句話簡介、資訊 chip（起迄、報名截止、費用、名額）、互動方式卡片、聚會時段、邀請訊息（依旗標）。CTA 依場次：`island_form` → 「用 Google 帳號報名」；`external`（含所有付費） → 「前往報名頁面」開外部連結（含外部連結 icon）＋次要 CTA「已完成報名？加入場次」。（FR-SU-04、TP-SU-10、TP-SU-11）

#### Scenario: 付費場次
- **WHEN** `feeType='paid'`
- **THEN** 主 CTA 為「前往報名頁面」導向 `externalSignupUrl`，費用 chip 顯示「NT$1,200／人」，不顯示自訂問題

#### Scenario: 會議連結不外洩
- **WHEN** 匿名訪客呼叫 `GET /cohorts/join/{joinToken}`
- **THEN** 回應不含 `meetingUrl`；加入後 `GET /cohorts/{cohortId}` 才包含

#### Scenario: 外部報名場次的加入
- **WHEN** 島民點「已完成報名？加入場次」並勾選同意
- **THEN** 走既有 `POST /cohorts/join/{joinToken}` 加入，不收答案

### Requirement: 島島報名表的兩步驟與答案提交
`island_form` 場次的報名頁 SHALL 為兩步：Step 1 隱私說明＋「我已了解並同意」checkbox（未勾選時報名按鈕 disabled）＋報名按鈕；Step 2 顯示 Google 帳號（暱稱、Email）確認、自訂問題表單、「送出報名」與「回上一步」。`POST /api/v1/cohorts/join/{joinToken}` body SHALL 為 `{ consent: true, answers?: [{ questionId, value }] }`；server SHALL 驗證必填題皆有答、選擇題的值在 `options` 內、`questionId` 屬於該場次且未刪除，並在與 enrollment 同一交易寫入答案。（FR-SU-04、TP-SU-07、TP-SU-08）

#### Scenario: 必填題未答
- **WHEN** 某必填題無對應 `answers` 項或值為空
- **THEN** 回 400 並指名 `questionId`，前端標紅該題

#### Scenario: 成功報名
- **WHEN** 島民填完問題送出
- **THEN** 建立 enrollment（status=joined）、寫入答案、產生實踐草稿，導向 `/cohorts/{cohortId}`

#### Scenario: 經邀請信加入
- **WHEN** 島民使用邀請信的 `inviteToken` 加入
- **THEN** 不要求填答問題，答案為空

### Requirement: 帶領人看到答案
`GET .../cohorts/{cohortId}/participants` 與 `.../enrollments` 每列 SHALL 附 `answers: [{ questionId, label, value, deleted }]`；期末匯出（`outcome/export`）SHALL NOT 包含答案；帳號刪除匿名化 SHALL 一併刪除該使用者的答案。

#### Scenario: 名單顯示答案
- **WHEN** 帶領人開啟參與者名單
- **THEN** 每位經島島報名表加入者可展開查看其答案；經邀請信加入者顯示「未填寫報名表」

### Requirement: 報名頁預覽
報名設定區段 SHALL 內嵌完整報名頁預覽（標題列「活動加入頁」＋短網址＋「複製連結」；內容與真實報名頁一致並即時反映面板未儲存的變更；Step 1／Step 2 可互動切換）；「預覽報名頁」按鈕 SHALL 開啟最大寬 560px、可獨立捲動的 modal 版本，標題「報名頁預覽」＋說明「島民看到的畫面，尚未真正開放報名」。預覽 SHALL 與真實報名頁共用同一個展示元件。（FR-SU-04、FR-SU-05）

#### Scenario: 即時反映
- **WHEN** 在「基本資訊」把費用改為付費
- **THEN** 預覽的 CTA 立即變為「前往報名頁面」（TP-SU-06）

#### Scenario: 複製連結
- **WHEN** 點預覽標題列「複製連結」
- **THEN** 寫入剪貼簿並將按鈕文字短暫改為「已複製」（TP-SU-09）

#### Scenario: 尚未填寫的提示
- **WHEN** 一句話簡介或邀請訊息為空
- **THEN** 預覽顯示「尚未填寫一句話簡介」／「尚未填寫邀請訊息」提示並標示「僅發起人可見」
