# analytics-core
- 涉及 repo: f2e (packages/analytics)
- 對應 archived change: add-analytics-core（推測，未實作）
- 總計: 9 條 requirement / ~18 個 scenario | ✅0 ⚠️1 ❌8 ❓0

## 整體判定：規格幾乎完全未實作
packages/analytics 目前僅有 provider 元件（posthog.tsx、google-analytics.tsx、clarity.tsx、analytics-provider.tsx）與 lib/config.ts，無 spec 所述的 core 抽象層。

## Requirement: AnalyticsAdapter interface → ❌
證據: 無 — git grep AnalyticsAdapter origin/dev -- packages/analytics/* 無命中。無 core/ 目錄。
- Scenario: Adapter 最低需求 → ❌。
- Scenario: Adapter 完整方法 → ❌。

## Requirement: TrackerConfig 初始化（initTracker）→ ❌
證據: 無 — grep initTracker/TrackerConfig 無命中。
- Scenario: Web app 初始化 → ❌。
- Scenario: Mobile app 初始化 → ❌。

## Requirement: Adapter 註冊（registerAdapter）→ ❌
證據: 無 — grep registerAdapter 無命中。
- Scenario: 註冊多個 adapter → ❌。

## Requirement: trackUnifiedEvent 型別安全追蹤 → ❌
證據: 無 — grep trackUnifiedEvent/EventMap 無命中。
- Scenario: 自動注入 platform/app → ❌。
- Scenario: 錯誤型別編譯失敗 → ❌。
- Scenario: 一個 adapter 拋例外不影響其他 → ❌。

## Requirement: identify 使用者識別 → ⚠️
證據: 無統一 identify 函數；僅 posthog.tsx 提供 posthogCapture（components/posthog.tsx:48）。spec 要求的多-adapter identify 抽象不存在。
- Scenario: 登入後 identify → ❌。
- Scenario: Adapter 未實作 identify 被跳過 → ❌。

## Requirement: reset 清除身份 → ❌
證據: 無 — 無統一 reset() 抽象。
- Scenario: 登出 reset → ❌。

## Requirement: consent / optIn / optOut 管理 → ❌
證據: 無 — 無對應統一函數。

## Requirement: core 零依賴 → ❌
證據: 無 core/ 目錄可驗證。

## Requirement: sub-path export "./core" → ❌
證據: daodao-f2e:packages/analytics/package.json:7-11 — exports 僅 "."、"./components/*"、"./lib/*"，無 "./core"。
- Scenario: import 完整 package → ⚠️ — "." 可 import（index.ts 匯出 posthogCapture），但無 core/web adapter 分層。
- Scenario: import core only → ❌ — 無 ./core 路徑。
