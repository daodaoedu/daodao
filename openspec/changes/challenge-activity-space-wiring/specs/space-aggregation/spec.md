# space-aggregation

## ADDED Requirements

### Requirement: 共同挑戰空間卡反映真實參與
`GET /api/v1/spaces` 的 `kind='challenge'` 卡 SHALL 由 `cohort_enrollments`（status=`joined`，program.kind=`challenge`）聚合：`memberCount` 為我加入的進行中挑戰參與者數（無進行中則取最近一檔）、`practiceCount` 為我的挑戰實踐數、`hasActivePractice` 為其中是否有 `status='active'`、`memberAvatars` 取最近一檔挑戰前 N 位參與者。未加入任何挑戰時 SHALL 仍回傳此卡，數值為 0。

#### Scenario: 已加入進行中挑戰
- **WHEN** 使用者加入一檔進行中且已有 12 人的挑戰，且自動複製的實踐為 active
- **THEN** 挑戰卡 `memberCount=12`、`practiceCount=1`、`hasActivePractice=true`

#### Scenario: 未加入任何挑戰
- **WHEN** 使用者沒有任何 challenge enrollment
- **THEN** 挑戰卡仍存在，`memberCount=0`、`practiceCount=0`、`hasActivePractice=false`

### Requirement: 活動卡由參加的期產生
`GET /api/v1/spaces` 的 `kind='event_course'` 卡 SHALL 對應使用者每一筆 status=`joined`、program.kind=`lighthouse` 的 enrollment 各一張：`id` 為 cohort id 字串、`name` 為期名稱、`host` 為組織名、`memberCount` 為該期 joined 數、`isHost` 為 enrollment role 屬 owner/assistant、`lastActivityAt` 為我在該期實踐的最近打卡時間（無則加入時間）。不再讀取 `space_members`。

#### Scenario: 參加兩期活動
- **WHEN** 使用者 joined 兩個 lighthouse cohort
- **THEN** 空間列表回傳 personal、challenge 之後兩張 `event_course` 卡，依 `lastActivityAt` 降冪

#### Scenario: 退出活動
- **WHEN** 使用者對某期呼叫 `/cohorts/{cohortId}/exit`
- **THEN** 該期不再出現於空間列表

### Requirement: 活動卡導向學員頁
前端 `SpaceCard` 的 `event_course` 卡 SHALL 導向 `/cohorts/{id}`；`personal` 與 `challenge` 卡導向不變。`/spaces/[id]` 頁面保留但不再有入口。

#### Scenario: 點擊活動卡
- **WHEN** 使用者點擊空間列表中的活動卡
- **THEN** 開啟 `/cohorts/{cohortId}` 學員頁
