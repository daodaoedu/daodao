## Why

目前三個平台（website、product、mobile）各自用不同方式追蹤事件，事件名稱不一致、缺少關鍵漏斗事件，無法跨平台比較轉換率與留存。需要統一的 analytics 系統，讓 GA4、PostHog、Clarity 三個平台收到一致的事件，才能建立 Activation Funnel（Landing → 註冊 → 建立練習 → 第一次打卡）並追蹤功能使用率與留存黏著度。

## What Changes

- 新增 `packages/analytics/core/` 平台無關模組（事件型別、adapter interface、tracker），sub-path export `@daodao/analytics/core` 供 mobile 使用
- 新增 GA4 / PostHog / Clarity 三個 web adapter（`packages/analytics/adapters/`）
- 定義 18 個統一事件（Auth 3 + Practice 4 + Content 2 + Engagement 4 + Funnel 4 + Generic 1），含完整 TypeScript 型別
- website app 埋入行銷漏斗事件（cta_clicked、quiz、action_maker、newsletter）
- product app 埋入產品事件（practice CRUD、check_in、content_viewed、comment、share）
- 兩個 web app 的 global-provider 加入 `initTracker()` + `registerAdapter()` 初始化
- 登入 / 登出流程加入 `identify()` / `reset()` 呼叫，串接跨匿名→已登入的 user identity
- 現有 `trackEvent`、`posthogCapture` 等標記 `@deprecated`，內部改為呼叫 `trackUnifiedEvent`
- Mobile adapter（Firebase / PostHog / Clarity）放在 `apps/mobile/adapters/`，import `@daodao/analytics/core`

## Capabilities

### New Capabilities

- `analytics-core`: 平台無關的 tracker 核心——事件型別定義（EventMap）、AnalyticsAdapter interface、trackUnifiedEvent / identify / reset / consent API
- `analytics-web-adapters`: GA4、PostHog、Clarity 的 web adapter 實作，含 GA4 sanitization（25 params 上限、key 40 字元、value 100 字元）
- `analytics-event-catalog`: 18 個統一事件的完整定義與 properties 型別，涵蓋 Auth / Practice / Content / Engagement / Funnel / Generic 六大類

### Modified Capabilities

（目前 `openspec/specs/` 無既有 spec，無需修改）

## Impact

- **子專案影響：** f2e（website + product + mobile）、packages/analytics
- **packages/analytics：** 目錄結構重組，新增 `core/` sub-path export，現有 API 標記 deprecated
- **apps/website：** 新增 ~8 個事件埋點（CTA、quiz、action_maker、newsletter）
- **apps/product：** 新增 ~10 個事件埋點（practice 生命週期、check_in、content、social）+ identity 串接
- **apps/mobile：** 刪除 `services/analytics.ts`，改用 `@daodao/analytics/core` + 本地 adapter
- **登入流程：** auth 相關 hook / provider 需加入 `identify()` / `reset()` 呼叫
- **無 breaking change：** 現有 API 保留為 deprecated wrapper，逐步遷移
