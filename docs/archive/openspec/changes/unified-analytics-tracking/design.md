## Context

目前 `packages/analytics` 是純 Next.js 實作，每個 provider（GA4、PostHog、Clarity）各自用 `Script` 元件初始化，追蹤函數直接操作 `window.gtag` / `window.posthog` / `window.clarity`。Mobile app 有完全獨立的 `AnalyticsService` class，不共用任何程式碼。

現有追蹤函數：
- `trackEvent(action, category, label?, value?)` — GA4 專用，參數格式與統一事件不同
- `posthogCapture(event, properties?)` — PostHog 專用
- `clarityEvent(eventName)` — Clarity 專用
- 各平台各自的 `identify` / `reset` / `consent` 函數

兩個 web app 都在 `global-provider.tsx` 中渲染 `<AnalyticsScripts />`，product app 有少量 `posthogCapture("content_viewed", ...)` 呼叫。

## Goals / Non-Goals

**Goals:**
- 建立平台無關的 tracker 核心（`core/`），mobile 可直接 import
- 統一 18 個事件的型別定義，確保跨平台事件名稱與 properties 一致
- 透過 adapter pattern 讓各平台（web / mobile）註冊自己的 provider 實作
- 保留現有 `AnalyticsScripts` 元件與 Script tag 初始化機制不動
- 現有 API 標記 `@deprecated` 後內部轉接到 `trackUnifiedEvent`，無 breaking change

**Non-Goals:**
- 不改變 GA4 / PostHog / Clarity 的 Script 初始化方式（仍用現有 React 元件）
- 不在此階段建立 server-side tracking
- 不在此階段加入 consent management UI（只提供程式碼層面的 `consent()` / `optOut()` API）
- 不處理 `screen_view`、`follow`、`reaction_added` 等延後追蹤的事件
- 不建立 PostHog / GA4 的 dashboard（Phase 4 手動設定）

## Decisions

### D1: Package 拆分策略 — sub-path export 而非獨立 package

**選擇：** `@daodao/analytics/core` sub-path export

**替代方案：** 建立獨立 `@daodao/analytics-core` package

**理由：** sub-path export 不需要新增 Turborepo workspace 設定、不需要獨立的 `package.json` 和 build pipeline。只需在現有 `package.json` 的 `exports` 欄位新增 `"./core"` 路徑。程式碼在同一個 repo 目錄下更容易維護。

**實作：**
```json
// packages/analytics/package.json
{
  "exports": {
    ".": "./src/index.ts",
    "./core": "./src/core/index.ts",
    "./components/*": "./src/components/*.tsx",
    "./lib/*": "./src/lib/*.ts"
  }
}
```

### D2: Tracker 初始化方式 — module-level singleton

**選擇：** `initTracker()` + `registerAdapter()` 的 imperative API，module-level 變數儲存狀態

**替代方案：** React Context provider pattern（`<TrackerProvider adapters={[...]}>`)

**理由：**
- Mobile（React Native）和 Web（Next.js）的 provider tree 結構不同，imperative API 更通用
- `core/` 不能依賴 React，module-level singleton 最簡單
- 初始化只在 app 啟動時執行一次，不需要 React 生命週期管理

### D3: 事件型別安全 — generic constrained EventMap

**選擇：** `trackUnifiedEvent<T extends keyof EventMap>(event: T, properties: EventMap[T])` 的 generic 簽名

**理由：** TypeScript 在呼叫端自動推導 `T`，確保 event name 和 properties 型別配對。新增事件只需在 EventMap 加一個 entry。

### D4: Deprecated API 過渡策略 — wrapper 轉接

**選擇：** 現有 `trackEvent`、`posthogCapture` 等保留匯出，內部改為呼叫對應的 adapter。標記 `@deprecated`，在 Phase 2 + 3 完成後的下一個 release 移除。

**替代方案：** 立即刪除舊 API

**理由：** product app 已有 `posthogCapture("content_viewed", ...)` 呼叫，立即刪除會造成 breaking change。wrapper 過渡讓遷移可以分步進行。

### D5: GA4 Sanitization — adapter 內建

**選擇：** GA4 adapter 內部自動處理 25 params 上限、key 40 字元、value 100 字元 truncation

**替代方案：** 在 tracker core 統一 sanitize

**理由：** 這些限制是 GA4 專屬的，放在 adapter 內部遵循「各 adapter 自行處理自己平台的限制」原則。Firebase adapter 也有相同限制，可複用相同的 sanitize 函數。

### D6: `core/` 的零依賴原則

**選擇：** `core/` 目錄不得 import `next`、`react`、`@daodao/config`、或任何 browser/native API

**理由：** 確保 mobile（Expo/React Native）可以直接 import `@daodao/analytics/core`。環境相關的邏輯（`typeof window`、native module 檢查）全部放在各平台的 adapter 內。

### D7: Mobile adapter 放置位置 — apps/mobile 內部

**選擇：** Firebase / PostHog / Clarity 的 mobile adapter 放在 `apps/mobile/adapters/`，不放 packages

**替代方案：** 放在 `packages/analytics/adapters/mobile/`

**理由：** Mobile adapter 依賴 `@react-native-firebase/analytics`、`posthog-react-native`、`@microsoft/react-native-clarity` 等 native module，放進 packages 會讓 web build 引入不需要的 native 依賴。

## Risks / Trade-offs

**Module singleton 在 SSR 環境的行為** → `initTracker()` 和 `registerAdapter()` 在 server-side 不應被呼叫。Web adapter 都有 `typeof window` guard，且 `AnalyticsScripts` 元件已是 client-only（Next.js Script）。初始化程式碼應放在 `"use client"` 元件中或確保只在 client 執行。

**Deprecated API 的過渡期長度不確定** → 設定明確的移除時間：Phase 2 + 3 完成後的下一個 release。在 CHANGELOG 中標記。

**`funnel_dropped` 事件的 `beforeunload` 可靠性** → `beforeunload` 在 mobile browser 和部分桌面瀏覽器不保證觸發。替代方案：改用 `visibilitychange` event 或 PostHog 的 session recording 來推算放棄行為。MVP 先用 `beforeunload` + `useEffect cleanup` 雙重偵測，後續根據數據品質決定是否調整。

**18 個事件一次全部定義但分階段埋入** → 事件型別定義在 Phase 1 全部建立，但實際埋點分 Phase 2（web）和 Phase 3（mobile）進行。風險是型別定義可能在埋點過程中需要調整。Mitigation：型別放在 `core/events/` 下按類別拆分檔案，修改影響範圍小。

## Migration Plan

### Phase 1: Package 重構
1. 在 `packages/analytics/src/` 下建立 `core/` 目錄
2. 建立 `core/events/types.ts`（EventMap）+ 各類別事件檔案
3. 建立 `core/adapters/types.ts`（AnalyticsAdapter interface）
4. 建立 `core/tracker.ts`（initTracker、registerAdapter、trackUnifiedEvent、identify、reset、consent、optOut、optIn）
5. 建立 `core/index.ts` re-export
6. 在 `src/adapters/` 建立 GA4、PostHog、Clarity web adapter
7. 更新 `package.json` exports 加入 `"./core"` 路徑
8. 更新 `src/index.ts` re-export core + web adapters
9. 將現有 `trackEvent`、`posthogCapture` 等改為 deprecated wrapper

### Phase 2: Web 埋點
1. website + product 的 `global-provider.tsx` 加入 `initTracker()` + `registerAdapter()`
2. website 埋入行銷漏斗事件
3. product 埋入產品事件
4. 登入流程加入 `identify()`、登出加入 `reset()`
5. 現有 `posthogCapture("content_viewed", ...)` 改用 `trackUnifiedEvent`

### Phase 3: Mobile 遷移（可與 Phase 2 平行）
1. 在 `apps/mobile/adapters/` 實作 Firebase / PostHog / Clarity adapter
2. `_layout.tsx` 加入 `initTracker({ platform: "mobile", app: "mobile" })` + registerAdapter
3. 將現有 analytics 呼叫改用 `trackUnifiedEvent`
4. 刪除 `apps/mobile/services/analytics.ts`

### Rollback
- Phase 1 的 deprecated wrapper 確保舊程式碼繼續運作
- 各 Phase 獨立部署，出問題只需 revert 該 Phase 的 commits
- Adapter 的 fire-and-forget 設計確保 analytics 失敗不影響使用者體驗

## Open Questions

- [ ] Product app 的 practice API response 是否包含 `currentStreak` 欄位？若無，`check_in` 事件的 `streak_count` 需送 0 或另外查詢
- [ ] `funnel_dropped` 事件的偵測方式是否需要在 MVP 就實作，還是先用 PostHog session recording 替代？
- [ ] Mobile app 的 Clarity SDK（`@microsoft/react-native-clarity`）是否支援 `event()` method？需確認版本
