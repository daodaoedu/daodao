## Requirements

### Requirement: 期的公開旗標
燈塔的每一期（cohort）SHALL 具備 `visibility` 欄位，值域 `private` | `public`，預設 `private`。既有資料 SHALL 全部為 `private`。此欄位只對 `programs.kind='lighthouse'` 有意義；共同挑戰 API SHALL 不暴露也不讀取它。

#### Scenario: 建立期時未指定
- **WHEN** 組織成員透過燈塔 API 建立期且未帶 `visibility`
- **THEN** 該期 `visibility` 為 `private`，不出現在探索活動頁

#### Scenario: 組織成員切換公開
- **WHEN** 組織成員在燈塔期表單勾選「公開到探索活動頁」並儲存
- **THEN** `PATCH /api/v1/lighthouse/programs/{programId}/cohorts/{cohortId}` 帶 `visibility='public'`，回應包含 `visibility`

### Requirement: 探索活動頁公開列表端點
系統 SHALL 提供 `GET /api/v1/activities`（optionalAuth），列出 `programs.kind='lighthouse'`、`cohorts.status='published'`、`cohorts.visibility='public'` 且今日 ≤ `end_date` 的期，依 `start_date` 升冪。每筆 SHALL 包含名稱、系列名、主辦組織名、期間、參與人數、運行狀態、可否加入與原因、登入者是否已加入。

#### Scenario: 未登入瀏覽
- **WHEN** 未登入訪客呼叫 `GET /api/v1/activities`
- **THEN** 回 200，`isJoined` 全為 false，僅回傳公開且已發佈的期

#### Scenario: 私密期不出現
- **WHEN** 某期 `visibility='private'` 或 `status='draft'`
- **THEN** 不出現在列表，即使呼叫者是該組織成員

#### Scenario: 共同挑戰不出現
- **WHEN** 某期所屬 program 的 `kind='challenge'`
- **THEN** 不出現在 `/api/v1/activities`（由 `/api/v1/challenges` 負責）

### Requirement: 加入連結只在可加入時公開
列表與詳情的 `joinToken` SHALL 只在 `canJoin=true` 時回傳，其餘為 `null`。`join_paused=true` SHALL 視為不可加入，`unavailableReason='paused'`。

#### Scenario: 暫停加入
- **WHEN** 組織成員將某公開期設為暫停加入
- **THEN** 列表仍顯示該期，但 `canJoin=false`、`unavailableReason='paused'`、`joinToken=null`

#### Scenario: 額滿
- **WHEN** joined 人數 ≥ `capacity`
- **THEN** `canJoin=false`、`unavailableReason='full'`、`joinToken=null`

### Requirement: 探索活動頁使用真資料並沿用既有加入流程
`/activities` 頁 SHALL 改讀 `GET /api/v1/activities`，移除假資料。卡片「加入」SHALL 導向既有 `/cohorts/join/[joinToken]`；已加入者 SHALL 顯示「已加入」並導向 `/cohorts/[cohortId]`。篩選 SHALL 僅保留「全部」與「開放加入中」。

#### Scenario: 點擊加入
- **WHEN** 訪客或登入者在探索活動頁點擊可加入的期
- **THEN** 導向 `/cohorts/join/{joinToken}`，後續走既有預覽與加入流程

#### Scenario: 無公開活動
- **WHEN** 列表為空
- **THEN** 顯示空狀態文案，不顯示假資料
