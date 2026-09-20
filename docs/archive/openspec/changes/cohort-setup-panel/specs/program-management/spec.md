# program-management

## Purpose

燈塔「系列與場次」頁面的系列層操作：建立、編輯、複製、級聯封存，以及場次列項目的摘要與操作選單，讓帶領人在一頁內管理主題容器與其下所有場次（FRD #171 FR-PC-01～03、FR-CP-01、TP-CP-03～04）。

## ADDED Requirements

### Requirement: 系列與場次頁面結構
`/lighthouse/programs` SHALL 顯示頁面標頭（小字標籤「PROGRAMS / COHORTS」、H1「系列與場次」、說明文字）與右上角「建立系列」按鈕；每個未封存系列 SHALL 以卡片呈現：系列標籤、名稱、簡介、「編輯」按鈕、context menu（複製、封存）、場次列表區塊（H3「場次」＋「建立場次」按鈕）。（FR-PC-01、FR-PC-02）

#### Scenario: 帶領人進入頁面
- **WHEN** 組織成員開啟 `/lighthouse/programs`
- **THEN** 看到所有 `kind='lighthouse'` 且未封存的系列卡片，依建立時間排序，每張卡片內列出該系列全部場次（含草稿與已封存）

#### Scenario: 建立系列表單展開與收合
- **WHEN** 點擊「建立系列」
- **THEN** 系列列表上方展開內嵌表單（系列名稱、系列簡介、「建立」）；再次點擊按鈕 SHALL 收合表單（FR-CP-01、TP-CP-01）

### Requirement: 複製系列
系統 SHALL 提供 `POST /api/v1/lighthouse/programs/{programId}/duplicate`（限組織成員、`kind='lighthouse'`），建立名稱為「{原名}（複製）」（截至 100 字）、簡介相同的新系列；SHALL NOT 複製任何場次。系列沒有狀態欄位，回應與 `programResponseSchema` 相同。

#### Scenario: 從 context menu 複製
- **WHEN** 帶領人在系列卡片 context menu 點「複製」
- **THEN** 列表出現新系列「{原名}（複製）」，場次列表為空，並寫入 audit `lighthouse.program_duplicated`（TP-CP-03）

#### Scenario: 對共同挑戰主題複製
- **WHEN** 呼叫者對 `kind='challenge'` 的 program 呼叫 duplicate
- **THEN** 回 403，不建立任何資料

### Requirement: 封存系列級聯封存場次
`DELETE /api/v1/lighthouse/programs/{programId}` SHALL 在同一交易內把該系列下所有 `status <> 'archived'` 的場次改為 `archived`，再將系列標記封存；回應 SHALL 包含 `archivedCohortCount`。不再因「系列仍有場次」回 409。

#### Scenario: 封存有進行中場次的系列
- **WHEN** 系列下有 2 個 published、1 個 draft、1 個 archived 場次，帶領人確認封存
- **THEN** 三個未封存場次全部變 `archived`，系列從列表消失，回應 `archivedCohortCount=3`，audit 記錄 `lighthouse.program_archived_cascade`

#### Scenario: 封存確認文案
- **WHEN** 帶領人點「封存」且系列下有 N 個未封存場次
- **THEN** 確認對話框 SHALL 顯示「將一併封存 N 個場次」後才送出

### Requirement: 場次列項目摘要與操作
每個場次列 SHALL 顯示：日曆圖示、場次名稱、狀態標籤（已發佈／草稿／已封存）、「尚未綁定模板」badge（無有效模板綁定時）、摘要文字（起迄日期、網址代稱、公開／私密、收費資訊）；已發佈場次 SHALL 顯示邀請區塊（邀請連結、QR code、「複製連結」、「以 email 邀請成員」導向名單頁）。操作列 SHALL 依狀態顯示「發佈」（草稿）、「編輯」（非封存）、「管理本場次」，以及 context menu（複製、封存）。（FR-PC-03）

#### Scenario: 付費公開場次的摘要
- **WHEN** 場次 `visibility='public'`、`feeType='paid'`、`feeAmount=1200`
- **THEN** 摘要文字包含「公開」與「NT$1,200／人」

#### Scenario: 從 context menu 複製場次
- **WHEN** 帶領人點場次 context menu 的「複製」
- **THEN** 呼叫既有 `POST .../cohorts/{cohortId}/duplicate`，列表出現「{原名}（副本）」草稿場次

#### Scenario: 封存草稿場次
- **WHEN** 帶領人對草稿場次點 context menu 的「封存」並確認
- **THEN** 場次狀態變為已封存（不再限定只有 published 才能封存）
