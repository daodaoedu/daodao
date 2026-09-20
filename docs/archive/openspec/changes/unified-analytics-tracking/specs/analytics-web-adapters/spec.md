## ADDED Requirements

### Requirement: GA4 Adapter
系統 SHALL 提供 `ga4Adapter` 實作 `AnalyticsAdapter` interface。

- `track()` SHALL 呼叫 `window.gtag("event", eventName, properties)`
- `track()` SHALL 內建 sanitization：
  - properties 超過 25 個 key 時，靜默丟棄多餘的 key
  - key 超過 40 字元時自動 truncate
  - string value 超過 100 字元時自動 truncate
- `identify()` SHALL 呼叫 `window.gtag("set", { user_id: userId })`
- `reset()` SHALL 呼叫 `window.gtag("set", { user_id: null })`
- 所有方法 SHALL 在 `typeof window === "undefined"` 或 `window.gtag` 不存在時靜默返回

#### Scenario: 追蹤事件
- **WHEN** 呼叫 `ga4Adapter.track("check_in", { practice_id: "abc", streak_count: 3 })`
- **THEN** 呼叫 `window.gtag("event", "check_in", { practice_id: "abc", streak_count: 3 })`

#### Scenario: Properties 超過 25 個
- **WHEN** 呼叫 `track()` 帶有 30 個 properties
- **THEN** 只有前 25 個 properties 被送到 GA4，無錯誤拋出

#### Scenario: Key 超過 40 字元
- **WHEN** properties 包含 key `"this_is_a_very_long_parameter_name_exceeding_forty_chars"`
- **THEN** key 被 truncate 為 40 字元

#### Scenario: Value 超過 100 字元
- **WHEN** properties 包含 string value 長度 150 字元
- **THEN** value 被 truncate 為 100 字元，非 string value 不受影響

#### Scenario: SSR 環境
- **WHEN** 在 server-side 呼叫 `ga4Adapter.track()`
- **THEN** 靜默返回，不拋出例外

#### Scenario: GA4 識別使用者
- **WHEN** 呼叫 `ga4Adapter.identify("user-123")`
- **THEN** 呼叫 `window.gtag("set", { user_id: "user-123" })`

#### Scenario: GA4 清除身份
- **WHEN** 呼叫 `ga4Adapter.reset()`
- **THEN** 呼叫 `window.gtag("set", { user_id: null })`

### Requirement: PostHog Adapter
系統 SHALL 提供 `posthogAdapter` 實作 `AnalyticsAdapter` interface。

- `track()` SHALL 呼叫 `window.posthog.capture(eventName, properties)`
- `identify()` SHALL 呼叫 `window.posthog.identify(userId, traits)`
- `reset()` SHALL 呼叫 `window.posthog.reset()`
- `consent()` SHALL 呼叫 `window.posthog.opt_in_capturing()`
- `optIn()` SHALL 呼叫 `window.posthog.opt_in_capturing()`
- `optOut()` SHALL 呼叫 `window.posthog.opt_out_capturing()`
- 所有方法 SHALL 在 `typeof window === "undefined"` 或 `window.posthog` 不存在時靜默返回

#### Scenario: 追蹤事件
- **WHEN** 呼叫 `posthogAdapter.track("signup", { method: "google", referrer_page: "/quiz" })`
- **THEN** 呼叫 `window.posthog.capture("signup", { method: "google", referrer_page: "/quiz" })`

#### Scenario: 識別使用者
- **WHEN** 呼叫 `posthogAdapter.identify("user-123", { name: "Alice" })`
- **THEN** 呼叫 `window.posthog.identify("user-123", { name: "Alice" })`

#### Scenario: 登出重置
- **WHEN** 呼叫 `posthogAdapter.reset()`
- **THEN** 呼叫 `window.posthog.reset()`

#### Scenario: SSR 環境
- **WHEN** 在 server-side 呼叫 `posthogAdapter.track()`
- **THEN** 靜默返回，不拋出例外

### Requirement: Clarity Adapter
系統 SHALL 提供 `clarityAdapter` 實作 `AnalyticsAdapter` interface。

- `track()` SHALL 只送 event name：`window.clarity("event", eventName)`，不送 properties（Clarity 不支援 event-level properties）
- `identify()` SHALL 呼叫 `window.clarity("identify", userId)`
- `consent()` SHALL 呼叫 `window.clarity("consent")`
- 所有方法 SHALL 在 `typeof window === "undefined"` 或 `window.clarity` 不存在時靜默返回

#### Scenario: 追蹤事件（只送 event name）
- **WHEN** 呼叫 `clarityAdapter.track("check_in", { practice_id: "abc" })`
- **THEN** 呼叫 `window.clarity("event", "check_in")`，properties 被忽略

#### Scenario: 識別使用者
- **WHEN** 呼叫 `clarityAdapter.identify("user-123")`
- **THEN** 呼叫 `window.clarity("identify", "user-123")`

#### Scenario: 同意追蹤
- **WHEN** 呼叫 `clarityAdapter.consent()`
- **THEN** 呼叫 `window.clarity("consent")`

#### Scenario: SSR 環境
- **WHEN** 在 server-side 呼叫 `clarityAdapter.track()`
- **THEN** 靜默返回，不拋出例外

### Requirement: Deprecated API 轉接
現有匯出的函數 SHALL 保留並標記 `@deprecated`，內部改為呼叫對應的 adapter：
- `trackEvent(action, category, label?, value?)` → 轉接到 `ga4Adapter.track()`
- `posthogCapture(event, properties?)` → 轉接到 `posthogAdapter.track()`
- `posthogIdentify(distinctId, properties?)` → 轉接到 `posthogAdapter.identify()`
- `posthogReset()` → 轉接到 `posthogAdapter.reset()`
- `clarityEvent(eventName)` → 轉接到 `clarityAdapter.track()`
- `clarityIdentify(userId)` → 轉接到 `clarityAdapter.identify()`

#### Scenario: 舊 API 繼續運作
- **WHEN** 呼叫 `posthogCapture("content_viewed", { content_type: "practice" })`
- **THEN** 事件透過 PostHog adapter 送出，行為與直接呼叫 `window.posthog.capture` 相同

#### Scenario: TypeScript 顯示 deprecated 警告
- **WHEN** 在 IDE 中使用 `trackEvent()` 或 `posthogCapture()`
- **THEN** IDE 顯示 strikethrough 和 `@deprecated` JSDoc 提示

### Requirement: Web 初始化整合
website 和 product app 的 `global-provider.tsx` SHALL 在 `<AnalyticsScripts />` 之後呼叫 `initTracker()` 和 `registerAdapter()`。

#### Scenario: Website app 初始化
- **WHEN** website app 的 `global-provider.tsx` 載入
- **THEN** 依序執行：渲染 `<AnalyticsScripts />`、`initTracker({ platform: "web", app: "website" })`、註冊 ga4/posthog/clarity adapter

#### Scenario: Product app 初始化
- **WHEN** product app 的 `global-provider.tsx` 載入
- **THEN** 依序執行：渲染 `<AnalyticsScripts />`、`initTracker({ platform: "web", app: "product" })`、註冊 ga4/posthog/clarity adapter

### Requirement: Identity 串接
登入流程 SHALL 在登入成功後呼叫 `identify(userId)`，登出流程 SHALL 呼叫 `reset()`。

#### Scenario: 使用者登入
- **WHEN** 使用者透過 Google OAuth 登入成功，取得 userId
- **THEN** 呼叫 `identify(userId)`，PostHog 自動 merge 匿名事件到已登入使用者

#### Scenario: 使用者登出
- **WHEN** 使用者點擊登出
- **THEN** 呼叫 `reset()`，所有 adapter 清除 user identity，後續事件為匿名
