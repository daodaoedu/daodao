# activity-discovery

> 本 delta 接管探索頁列表端點的完整形狀。「探索活動頁公開列表端點」與「探索活動頁使用真資料並沿用既有加入流程」兩條 requirement 以本 delta 為最終版，**取代** `cohort-setup-panel` 同名 delta 中對列表的描述（其欄位 `tagline`／`interactionModes`／`feeType`／`feeAmount`／`signupMethod` 與 `?mode=` 已納入本文）；`cohort-setup-panel` delta 中詳情的 `sessions`／`externalSignupUrl`／`publicBlocks` 敘述仍由該 change 擁有，本文只補 `host`／`templateCount`。

## MODIFIED Requirements

### Requirement: 探索活動頁公開列表端點
系統 SHALL 提供 `GET /api/v1/activities`（optionalAuth），列出 `programs.kind='lighthouse'`、`programs.deleted_at IS NULL`、組織 `status='active'`、`cohorts.status='published'`、`cohorts.visibility='public'` 的期，**包含已結束的期**：未結束（今日 ≤ `end_date`）全量依 `start_date` 升冪在前，已結束（今日 > `end_date`）依 `end_date` 降冪接在後面且最多 `ACTIVITY_ENDED_LIMIT`（24）筆。回應 `meta` SHALL 含 `endedLimit` 與 `endedTruncated`（已結束是否被截斷）。每筆 SHALL 包含：`id`、`displayName`、`programName`、`description`、`tagline`、`organizationName`、`host`（`userId`、`name`、`avatar`、`identifier`）、`startDate`、`endDate`、`joinDeadline`、`capacity`、`interactionModes`、`location`、`feeType`、`feeAmount`、`signupMethod`、`templateCount`（有效綁定的實踐模版數）、`participantCount`（`status='joined'` 人數）、`runStatus`、`canJoin`、`unavailableReason`、`isJoined`、`joinToken`。端點 SHALL 接受 `?mode=sync|async|physical` 篩選互動方式。列表 SHALL NOT 回傳 `meetingUrl`、`inviteMessage`、`externalSignupUrl`。

#### Scenario: 未登入瀏覽
- **WHEN** 未登入訪客呼叫 `GET /api/v1/activities`
- **THEN** 回 200，`isJoined` 全為 false，僅回傳公開且已發佈的期，`meta.endedLimit=24`

#### Scenario: 私密期不出現
- **WHEN** 某期 `visibility='private'` 或 `status='draft'` 或 `status='archived'`
- **THEN** 不出現在列表，即使呼叫者是該組織成員

#### Scenario: 共同挑戰不出現
- **WHEN** 某期所屬 program 的 `kind='challenge'`
- **THEN** 不出現在 `/api/v1/activities`（由 `/api/v1/challenges` 負責）

#### Scenario: 已結束的期出現在列表尾端
- **WHEN** 有 2 個進行中、1 個未開始、3 個已結束的公開期
- **THEN** 回傳 6 筆：前 3 筆為未結束且依 `start_date` 升冪，後 3 筆 `runStatus='ended'` 且依 `end_date` 降冪，`meta.endedTruncated=false`

#### Scenario: 已結束超過上限被截斷
- **WHEN** 已結束的公開期有 30 個
- **THEN** 只回傳 `end_date` 最近的 24 個已結束期，`meta.endedTruncated=true`

#### Scenario: 以互動方式篩選
- **WHEN** 呼叫 `GET /api/v1/activities?mode=physical`
- **THEN** 只回傳 `interactionModes` 含 `physical` 的期（未結束與已結束皆套用）

#### Scenario: 卡片欄位齊全
- **WHEN** 期的 `tagline='每天 15 分鐘的書寫陪跑'`、`interactionModes=['physical','sync']`、`location='台北市大安區'`、`feeType='paid'`、`feeAmount=1800`，綁定 3 個模版（其中 1 個已 `unbound_at`）
- **THEN** 該筆回傳上述值且 `templateCount=2`，不含 `meetingUrl`

### Requirement: 加入連結只在可加入時公開
列表與詳情的 `joinToken` SHALL 只在 `canJoin=true` 時回傳，其餘為 `null`。`join_paused=true` SHALL 視為不可加入，`unavailableReason='paused'`。已結束的期 SHALL 回傳 `canJoin=false`、`unavailableReason='ended'`、`joinToken=null`。

#### Scenario: 暫停加入
- **WHEN** 組織成員將某公開期設為暫停加入
- **THEN** 列表仍顯示該期，但 `canJoin=false`、`unavailableReason='paused'`、`joinToken=null`

#### Scenario: 額滿
- **WHEN** joined 人數 ≥ `capacity`
- **THEN** `canJoin=false`、`unavailableReason='full'`、`joinToken=null`

#### Scenario: 已結束
- **WHEN** 某公開期的 `end_date` 早於今日（Asia/Taipei）
- **THEN** 列表與詳情皆回傳 `runStatus='ended'`、`canJoin=false`、`unavailableReason='ended'`、`joinToken=null`，`participantCount` 仍為實際 joined 人數

### Requirement: 探索活動頁使用真資料並沿用既有加入流程
`/activities` 頁 SHALL 讀 `GET /api/v1/activities`，不使用假資料。狀態篩選 SHALL 提供「全部／開放報名／進行中／已結束」，費用篩選 SHALL 提供「免費／付費」toggle，篩選與搜尋皆在前端過濾。卡片整體 SHALL 為連結：已加入者導向 `/cohorts/{cohortId}`，其餘導向 `/activities/{cohortId}` 詳情頁。詳情頁的加入 CTA SHALL 導向既有 `/cohorts/join/{joinToken}`，不可加入時停用並顯示原因。

#### Scenario: 點擊加入
- **WHEN** 訪客或登入者在探索活動頁點擊可加入的期的卡片（非發起人名稱區域）
- **THEN** 導向 `/activities/{cohortId}` 詳情頁，詳情頁提供「加入」CTA 導向 `/cohorts/join/{joinToken}`，後續走既有預覽與加入流程

#### Scenario: 點擊未加入的卡片
- **WHEN** 訪客或登入者點擊一張未加入的活動卡（非發起人名稱區域）
- **THEN** 導向 `/activities/{cohortId}`；詳情頁在 `canJoin=true` 時提供「加入」導向 `/cohorts/join/{joinToken}`

#### Scenario: 點擊已加入的卡片
- **WHEN** 登入者點擊 `isJoined=true` 的活動卡
- **THEN** 直接導向 `/cohorts/{cohortId}` 學員頁

#### Scenario: 無公開活動
- **WHEN** 列表為空
- **THEN** 顯示空狀態卡片，不顯示假資料

## ADDED Requirements

### Requirement: 發起人解析規則
每個公開期的 `host` SHALL 依下列順序解析為單一使用者：（1）該期 `cohort_enrollments` 中 `status='joined'`、`role='owner'`、`user_id` 非空者，取最早 `joined_at`；（2）否則該期所屬組織 `organization_members` 中 `role='owner'` 者，取最早 `created_at`；（3）皆無時 `host.userId=null`、`host.name` 為組織名稱、`avatar`／`identifier` 為 null。`host.name` SHALL 為使用者 `nickname`（空則組織名稱），`host.avatar` 為 `contacts.photo_url`，`host.identifier` 為 `custom_id ?? external_id`。

#### Scenario: 名單頁指定了 owner
- **WHEN** 某期有兩筆 `role='owner'` 的 joined enrollment，A 於 9/1 加入、B 於 9/2 加入
- **THEN** `host` 為 A

#### Scenario: 未指定 owner 時回退組織 owner
- **WHEN** 某期沒有任何 `role='owner'` 的 enrollment，所屬組織的 owner 為使用者 C
- **THEN** `host` 為 C，`host.identifier` 為 C 的 `custom_id`（無則 `external_id`）

#### Scenario: owner 使用者不存在
- **WHEN** 上述兩層皆解析不到使用者
- **THEN** `host.userId=null`、`host.name` 為組織名稱，前端不提供快覽彈窗

### Requirement: 發起人快覽端點
系統 SHALL 提供 `GET /api/v1/activities/hosts/{userId}`（optionalAuth），回傳 `userId`、`name`、`avatar`、`identifier`、`selfIntroduction`（`basic_info.self_introduction`）、`organizationName`、`hostedActivityCount`（依發起人解析規則此人為 host、`status='published'`、`kind='lighthouse'`、組織 active 的期數，不限 `visibility`）、`learnedWithCount`（上述期內 `status='joined'`、非本人的 distinct 使用者數）、`joinedYear`（`users.created_at` 年份）。若該使用者不是任何公開已發佈期的發起人，SHALL 回 404。

#### Scenario: 發起人統計
- **WHEN** 使用者 A 為 3 個已發佈燈塔期的 host（2 公開 1 私密），三期 joined 成員去重後共 25 人（含 A 本人）
- **THEN** `GET /api/v1/activities/hosts/{A}` 回 200，`hostedActivityCount=3`、`learnedWithCount=24`，`joinedYear` 為 A 的註冊年份

#### Scenario: 非發起人
- **WHEN** 使用者 B 不是任何公開已發佈期的 host
- **THEN** 回 404，即使 B 存在

#### Scenario: 未登入可讀
- **WHEN** 未登入訪客呼叫此端點
- **THEN** 與登入者得到相同內容
