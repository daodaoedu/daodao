# activity-discovery

## MODIFIED Requirements

### Requirement: 探索活動頁公開列表端點
系統 SHALL 提供 `GET /api/v1/activities`（optionalAuth），列出 `programs.kind='lighthouse'`、`cohorts.status='published'`、`cohorts.visibility='public'` 且今日 ≤ `end_date` 的期，依 `start_date` 升冪。每筆 SHALL 包含名稱、系列名、主辦組織名、期間、參與人數、運行狀態、可否加入與原因、登入者是否已加入，以及一句話簡介（`tagline`）、互動方式（`interactionModes`）、收費資訊（`feeType`、`feeAmount`、`signupMethod`）。端點 SHALL 接受 `?mode=sync|async|physical` 篩選互動方式。詳情 `GET /api/v1/activities/{cohortId}` SHALL 額外包含 `location`、`sessions`、`externalSignupUrl` 與 `publicBlocks[]`（已發佈且 `visibility='public'` 的主頁區塊）。

#### Scenario: 未登入瀏覽
- **WHEN** 未登入訪客呼叫 `GET /api/v1/activities`
- **THEN** 回 200，`isJoined` 全為 false，僅回傳公開且已發佈的期

#### Scenario: 私密期不出現
- **WHEN** 某期 `visibility='private'` 或 `status='draft'`
- **THEN** 不出現在列表，即使呼叫者是該組織成員

#### Scenario: 共同挑戰不出現
- **WHEN** 某期所屬 program 的 `kind='challenge'`
- **THEN** 不出現在 `/api/v1/activities`（由 `/api/v1/challenges` 負責）

#### Scenario: 以互動方式篩選
- **WHEN** 呼叫 `GET /api/v1/activities?mode=physical`
- **THEN** 只回傳 `interactionModes` 含 `physical` 的期

#### Scenario: 卡片顯示新欄位
- **WHEN** 期的 `tagline='每天 15 分鐘的書寫陪跑'`、`interactionModes=['async']`、`feeType='free'`
- **THEN** 探索卡顯示該簡介、「線上非同步」chip 與「免費」badge；列表不含 `meetingUrl`、`location`

#### Scenario: 詳情帶公開區塊
- **WHEN** 期的主頁有 1 個 `public` 已發佈區塊與 1 個 `members` 已發佈區塊
- **THEN** `GET /api/v1/activities/{cohortId}` 的 `publicBlocks` 只含前者
