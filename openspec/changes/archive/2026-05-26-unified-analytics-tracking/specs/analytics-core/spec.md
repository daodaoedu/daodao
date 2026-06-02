## ADDED Requirements

### Requirement: AnalyticsAdapter interface
系統 SHALL 定義 `AnalyticsAdapter` interface，包含以下方法：
- `name: string` — adapter 識別名稱
- `track(event: string, properties: Record<string, unknown>): void` — 送出事件
- `identify?(userId: string, traits?: Record<string, unknown>): void` — 識別使用者
- `reset?(): void` — 清除使用者身份
- `consent?(): void` — 標記使用者同意追蹤
- `optIn?(): void` — 啟用追蹤
- `optOut?(): void` — 停用追蹤

其中 `track` 和 `name` 為必要，其餘為可選。

#### Scenario: Adapter 實作最低需求
- **WHEN** 開發者建立新的 adapter 只實作 `name` 和 `track`
- **THEN** TypeScript 編譯通過，adapter 可正常註冊

#### Scenario: Adapter 實作完整方法
- **WHEN** 開發者實作所有方法（track、identify、reset、consent、optIn、optOut）
- **THEN** TypeScript 編譯通過，所有方法在對應操作時被呼叫

### Requirement: TrackerConfig 初始化
系統 SHALL 提供 `initTracker(config: TrackerConfig)` 函數，接受 `platform` 和 `app` 參數。
- `platform` 的型別 SHALL 為 `"web" | "mobile"`
- `app` 的型別 SHALL 為 `"website" | "product" | "mobile"`

#### Scenario: Web app 初始化
- **WHEN** 呼叫 `initTracker({ platform: "web", app: "website" })`
- **THEN** tracker 記錄 platform 為 "web"、app 為 "website"，後續事件自動注入這兩個值

#### Scenario: Mobile app 初始化
- **WHEN** 呼叫 `initTracker({ platform: "mobile", app: "mobile" })`
- **THEN** tracker 記錄 platform 為 "mobile"、app 為 "mobile"

### Requirement: Adapter 註冊
系統 SHALL 提供 `registerAdapter(adapter: AnalyticsAdapter)` 函數，支援註冊多個 adapter。

#### Scenario: 註冊多個 adapter
- **WHEN** 依序呼叫 `registerAdapter(ga4Adapter)` 和 `registerAdapter(posthogAdapter)`
- **THEN** 兩個 adapter 都被儲存，後續 track/identify/reset 操作會呼叫兩者

### Requirement: trackUnifiedEvent 型別安全追蹤
系統 SHALL 提供 `trackUnifiedEvent<T extends keyof EventMap>(event: T, properties: EventMap[T])` 泛型函數。
- 呼叫時 SHALL 自動注入 `platform` 和 `app` 到 properties
- SHALL 對所有已註冊的 adapter 呼叫 `track(event, enrichedProperties)`
- 單一 adapter 拋出例外 SHALL NOT 影響其他 adapter 執行

#### Scenario: 追蹤事件並自動注入 platform/app
- **WHEN** tracker 已用 `{ platform: "web", app: "product" }` 初始化，呼叫 `trackUnifiedEvent("check_in", { practice_id: "abc", streak_count: 3, has_note: true, has_media: false, is_first: false })`
- **THEN** 所有 adapter 收到的 properties 包含 `platform: "web"` 和 `app: "product"` 以及原始 properties

#### Scenario: 錯誤的 event name 或 properties 型別
- **WHEN** 呼叫 `trackUnifiedEvent("check_in", { wrong_prop: true })`
- **THEN** TypeScript 編譯失敗，提示型別不匹配

#### Scenario: 一個 adapter 拋出例外
- **WHEN** 已註冊 GA4 和 PostHog adapter，GA4 adapter 的 `track()` 拋出例外
- **THEN** PostHog adapter 的 `track()` 仍然被呼叫，console 輸出 warning 包含 adapter name

### Requirement: identify 使用者識別
系統 SHALL 提供 `identify(userId: string, traits?: Record<string, unknown>)` 函數。
- SHALL 對所有已註冊且實作 `identify` 的 adapter 呼叫
- 單一 adapter 拋出例外 SHALL NOT 影響其他 adapter

#### Scenario: 登入後呼叫 identify
- **WHEN** 呼叫 `identify("user-123", { name: "Alice" })`
- **THEN** 所有實作 `identify` 的 adapter 收到 userId "user-123" 和 traits

#### Scenario: Adapter 未實作 identify
- **WHEN** adapter 未實作 `identify` 方法，呼叫 `identify("user-123")`
- **THEN** 該 adapter 被跳過，不拋出例外

### Requirement: reset 清除身份
系統 SHALL 提供 `reset()` 函數，對所有已註冊且實作 `reset` 的 adapter 呼叫 reset。

#### Scenario: 登出時呼叫 reset
- **WHEN** 呼叫 `reset()`
- **THEN** 所有實作 `reset` 的 adapter 被呼叫，清除使用者身份狀態

### Requirement: consent 和 optIn/optOut 管理
系統 SHALL 提供 `consent()`、`optIn()`、`optOut()` 函數，分別對所有已註冊且實作對應方法的 adapter 呼叫。

#### Scenario: 使用者同意追蹤
- **WHEN** 呼叫 `consent()`
- **THEN** 所有實作 `consent` 的 adapter 被呼叫

#### Scenario: 使用者選擇退出
- **WHEN** 呼叫 `optOut()`
- **THEN** 所有實作 `optOut` 的 adapter 被呼叫

### Requirement: core 零依賴
`core/` 目錄下的所有程式碼 SHALL NOT import `next`、`react`、`@daodao/config`、或任何瀏覽器 / React Native 專屬 API。

#### Scenario: Mobile app import core
- **WHEN** React Native (Expo) app import `@daodao/analytics/core`
- **THEN** 不會引入任何 web 或 Next.js 依賴，bundler 不報錯

#### Scenario: Node.js 環境 import core
- **WHEN** 在 Node.js 測試環境 import `@daodao/analytics/core`
- **THEN** 不會因為缺少 `window` 或 `document` 而報錯

### Requirement: sub-path export
`packages/analytics` 的 `package.json` SHALL 在 `exports` 欄位提供 `"./core"` 路徑，指向 `./src/core/index.ts`。

#### Scenario: Web app import 完整 package
- **WHEN** import `@daodao/analytics`
- **THEN** 可存取 core（事件型別、tracker）+ web adapters + 現有元件

#### Scenario: Mobile app import core only
- **WHEN** import `@daodao/analytics/core`
- **THEN** 只取得事件型別、adapter interface、tracker 函數，不包含 web adapter 或 Next.js 元件
