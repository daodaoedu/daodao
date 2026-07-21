# analytics-web-adapters
- 涉及 repo: f2e (packages/analytics, apps/website, apps/product)
- 對應 archived change: 無；參考 docs/superpowers/specs/2026-03-25-unified-analytics-tracking-design.md（僅設計文件，未落地）
- 總計: 6 條 requirement / 19 個 scenario | ✅0 ⚠️1 ❌5 ❓0

## Requirement: GA4 Adapter（ga4Adapter 實作 AnalyticsAdapter） → ❌
證據: grep `ga4Adapter` / `AnalyticsAdapter` 於 origin/dev 全 repo 無命中。packages/analytics/src/index.ts 仍只匯出舊式 `trackEvent`/`trackPageView`，無 adapter 抽象、無 25-key/40-char/100-char sanitization、無 `window.gtag("set", { user_id })` identify/reset。
- Scenario: 追蹤事件 / Properties 超過 25 / Key 超過 40 / Value 超過 100 / SSR / identify / reset → ❌ — 對應 ga4Adapter 與 sanitization 邏輯不存在（google-analytics.tsx 無 truncate/sanitiz 命中）。

## Requirement: PostHog Adapter（posthogAdapter） → ❌
證據: grep `posthogAdapter` 無命中。現有為 packages/analytics/src/index.ts 匯出的 `posthogCapture/posthogIdentify/posthogReset/posthogOptIn/posthogOptOut`，非 adapter interface 形式。
- 全部 4 scenario（track/identify/reset/SSR）→ ❌ — 無 posthogAdapter 物件。

## Requirement: Clarity Adapter（clarityAdapter） → ❌
證據: grep `clarityAdapter` 無命中。現有 `clarityEvent/clarityIdentify/clarityConsent`（index.ts），非 adapter。
- 全部 4 scenario → ❌ — 無 clarityAdapter 物件。

## Requirement: Deprecated API 轉接（保留舊函數並標 @deprecated，內部轉接 adapter） → ❌
證據: 舊函數仍存在且為主要實作（非轉接層）；grep `deprecated` 於 packages/analytics/src/* 無命中，未加 @deprecated JSDoc，且無底層 adapter 可轉接。
- Scenario: 舊 API 繼續運作 → ⚠️ — 舊函數仍可呼叫並運作，但非「轉接到 adapter」架構。
- Scenario: TypeScript 顯示 deprecated 警告 → ❌ — 無 @deprecated 標記。

## Requirement: Web 初始化整合（global-provider 呼叫 initTracker + registerAdapter） → ❌
證據: grep `initTracker`/`registerAdapter` 無命中。apps/{website,product}/src/app/global-provider.tsx 存在但未呼叫此二函數。
- Website / Product app 初始化 scenario → ❌。

## Requirement: Identity 串接（登入 identify(userId)、登出 reset()） → ❌
證據: grep `identify(` / `posthogIdentify` 於 apps/website、apps/product 登入登出流程無命中。
- 使用者登入 / 登出 scenario → ❌ — 無統一 identify/reset 串接。

備註：整個 spec 描述的是一次「統一 analytics adapter」重構，origin/dev 尚停留在舊的扁平函數 API，重構未實作。
