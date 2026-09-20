## ADDED Requirements

### Requirement: EventMap 型別定義
系統 SHALL 提供 `EventMap` 型別，以 TypeScript `interface` 定義所有統一事件名稱對應的 properties 型別。每個事件名稱為 key，properties interface 為 value。

#### Scenario: TypeScript 自動推導事件 properties
- **WHEN** 呼叫 `trackUnifiedEvent("signup", props)`
- **THEN** TypeScript 推導 `props` 型別為 `{ method: "google" | "apple" | "email"; referrer_page: string }`

#### Scenario: 不存在的事件名稱
- **WHEN** 呼叫 `trackUnifiedEvent("nonexistent_event", {})`
- **THEN** TypeScript 編譯失敗

### Requirement: Auth Events（3 個事件）
EventMap SHALL 包含以下 Auth 事件：

**`signup`** — 首次註冊完成
- `method`: `"google" | "apple" | "email"` (必要)
- `referrer_page`: `string` (必要)

**`login`** — 登入成功
- `method`: `"google" | "apple" | "email"` (必要)

**`onboarding_completed`** — 完成 onboarding 流程
- 無額外 properties（空物件 `{}`）

#### Scenario: signup 事件
- **WHEN** 使用者以 Google 帳號從 /quiz 頁面註冊完成
- **THEN** 送出 `trackUnifiedEvent("signup", { method: "google", referrer_page: "/quiz" })`

#### Scenario: login 事件
- **WHEN** 使用者以 Email 登入成功
- **THEN** 送出 `trackUnifiedEvent("login", { method: "email" })`

#### Scenario: onboarding_completed 事件
- **WHEN** 使用者完成 onboarding 流程
- **THEN** 送出 `trackUnifiedEvent("onboarding_completed", {})`

### Requirement: Practice Events（4 個事件）
EventMap SHALL 包含以下 Practice 事件：

**`practice_create_started`** — 進入建立練習流程
- 無額外 properties

**`practice_created`** — 成功建立練習
- `practice_id`: `string` (必要)
- `template_id`: `string` (可選)
- `duration_days`: `number` (必要)
- `frequency`: `"2-4" | "3-5" | "4-7"` (必要，對應 Frequency enum)
- `is_first`: `boolean` (必要)

**`practice_archived`** — 歸檔練習
- `practice_id`: `string` (必要)

**`check_in`** — 完成打卡
- `practice_id`: `string` (必要)
- `streak_count`: `number` (必要)
- `has_note`: `boolean` (必要)
- `has_media`: `boolean` (必要，從 media array 長度推導)
- `mood`: `string` (可選)
- `is_first`: `boolean` (必要)

#### Scenario: practice_created 含模板
- **WHEN** 使用者選用模板建立第一個練習
- **THEN** 送出 `trackUnifiedEvent("practice_created", { practice_id: "p-1", template_id: "t-reading", duration_days: 30, frequency: "3-5", is_first: true })`

#### Scenario: practice_created 不含模板
- **WHEN** 使用者不用模板建立練習
- **THEN** 送出 `trackUnifiedEvent("practice_created", { practice_id: "p-2", duration_days: 21, frequency: "2-4", is_first: false })`，`template_id` 可省略

#### Scenario: check_in 含 media
- **WHEN** 使用者打卡附帶照片和筆記
- **THEN** 送出 `trackUnifiedEvent("check_in", { practice_id: "p-1", streak_count: 7, has_note: true, has_media: true, is_first: false })`

#### Scenario: check_in 首次打卡
- **WHEN** 使用者第一次打卡
- **THEN** `is_first` 為 `true`，`streak_count` 為 1

### Requirement: Content Events（2 個事件）
EventMap SHALL 包含以下 Content 事件：

**`content_viewed`** — 查看練習或資源詳情頁
- `content_type`: `"practice" | "resource"` (必要)
- `content_id`: `string` (必要)

**`template_selected`** — 選用模板建立練習
- `template_id`: `string` (必要)

#### Scenario: 查看練習詳情
- **WHEN** 使用者進入練習詳情頁
- **THEN** 送出 `trackUnifiedEvent("content_viewed", { content_type: "practice", content_id: "p-1" })`

#### Scenario: 查看資源詳情
- **WHEN** 使用者進入資源詳情頁
- **THEN** 送出 `trackUnifiedEvent("content_viewed", { content_type: "resource", content_id: "r-42" })`

#### Scenario: 選用模板
- **WHEN** 使用者在建立練習流程中選擇模板
- **THEN** 送出 `trackUnifiedEvent("template_selected", { template_id: "t-reading" })`

### Requirement: Engagement Events（4 個事件）
EventMap SHALL 包含以下 Engagement 事件：

**`cta_clicked`** — 點擊 CTA 按鈕
- `cta_id`: `string` (必要)
- `page`: `string` (必要)
- `section`: `string` (必要)

**`newsletter_subscribed`** — Footer 訂閱電子報成功
- 無額外 properties

**`comment_created`** — 發表留言
- `content_type`: `"practice" | "check_in"` (必要)
- `content_id`: `string` (必要)

**`share`** — 分享內容
- `content_type`: `"practice" | "check_in" | "quiz_result" | "action_maker_result"` (必要)
- `content_id`: `string` (必要)
- `share_method`: `string` (可選)

#### Scenario: CTA 點擊
- **WHEN** 使用者在 Landing Page hero section 點擊「立即加入」
- **THEN** 送出 `trackUnifiedEvent("cta_clicked", { cta_id: "hero_join", page: "/", section: "hero" })`

#### Scenario: 分享打卡記錄
- **WHEN** 使用者分享打卡記錄到 LINE
- **THEN** 送出 `trackUnifiedEvent("share", { content_type: "check_in", content_id: "ci-1", share_method: "line" })`

#### Scenario: 留言
- **WHEN** 使用者在練習頁面發表留言
- **THEN** 送出 `trackUnifiedEvent("comment_created", { content_type: "practice", content_id: "p-1" })`

#### Scenario: 訂閱電子報
- **WHEN** 使用者在 Footer 成功訂閱電子報
- **THEN** 送出 `trackUnifiedEvent("newsletter_subscribed", {})`

### Requirement: Funnel Events（4 個事件）
EventMap SHALL 包含以下 Website Funnel 事件：

**`quiz_started`** — 開始 Quiz
- 無額外 properties

**`quiz_completed`** — 完成 Quiz 看到結果
- `result_theme`: `string` (必要)

**`action_maker_started`** — 開始 Action Maker 流程
- 無額外 properties

**`action_maker_completed`** — 完成 Action Maker 看到結果
- 無額外 properties

#### Scenario: Quiz 完整流程
- **WHEN** 使用者從開始到完成 Quiz
- **THEN** 依序送出 `quiz_started` 和 `quiz_completed`，completed 事件包含 `result_theme`

#### Scenario: Action Maker 完整流程
- **WHEN** 使用者從開始到完成 Action Maker
- **THEN** 依序送出 `action_maker_started` 和 `action_maker_completed`

### Requirement: Generic Events（1 個事件）
EventMap SHALL 包含以下 Generic 事件：

**`funnel_dropped`** — 使用者離開未完成的流程
- `funnel_name`: `"quiz" | "action_maker" | "practice_create"` (必要)
- `last_step`: `string` (必要)

#### Scenario: 使用者中途離開 Quiz
- **WHEN** 使用者在 Quiz 第 3 題離開頁面
- **THEN** 送出 `trackUnifiedEvent("funnel_dropped", { funnel_name: "quiz", last_step: "question_3" })`

#### Scenario: 使用者中途離開練習建立
- **WHEN** 使用者在練習建立流程的模板選擇步驟離開
- **THEN** 送出 `trackUnifiedEvent("funnel_dropped", { funnel_name: "practice_create", last_step: "template_selection" })`

#### Scenario: 正常完成不觸發
- **WHEN** 使用者正常完成 Quiz 並看到結果
- **THEN** 不送出 `funnel_dropped` 事件，只送 `quiz_completed`

### Requirement: Auto-Injected Properties
`trackUnifiedEvent()` SHALL 自動注入以下 properties，呼叫端不需手動傳入：
- `platform`: `"web" | "mobile"` — 來自 `initTracker` 的 config
- `app`: `"website" | "product" | "mobile"` — 來自 `initTracker` 的 config

這些 properties 不包含在各事件的 EventMap 型別中，由 tracker 在執行時注入。

#### Scenario: Web product app 事件
- **WHEN** product app 送出 `trackUnifiedEvent("check_in", { ... })`
- **THEN** adapter 收到的 properties 額外包含 `platform: "web"` 和 `app: "product"`

#### Scenario: Mobile app 事件
- **WHEN** mobile app 送出 `trackUnifiedEvent("check_in", { ... })`
- **THEN** adapter 收到的 properties 額外包含 `platform: "mobile"` 和 `app: "mobile"`

### Requirement: 事件總數為 18
EventMap SHALL 精確包含 18 個事件：Auth 3 + Practice 4 + Content 2 + Engagement 4 + Funnel 4 + Generic 1。

#### Scenario: EventMap key 數量
- **WHEN** 列舉 `keyof EventMap` 的所有 key
- **THEN** 共有 18 個 key：`signup`, `login`, `onboarding_completed`, `practice_create_started`, `practice_created`, `practice_archived`, `check_in`, `content_viewed`, `template_selected`, `cta_clicked`, `newsletter_subscribed`, `comment_created`, `share`, `quiz_started`, `quiz_completed`, `action_maker_started`, `action_maker_completed`, `funnel_dropped`
