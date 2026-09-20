## 1. Core 模組建立 (packages/analytics)

- [ ] 1.1 建立 `src/core/adapters/types.ts` — 定義 `AnalyticsAdapter` interface
  - 子專案：packages/analytics
  - 驗收：interface 包含 name、track（必要）+ identify/reset/consent/optIn/optOut（可選），TypeScript 編譯通過

- [ ] 1.2 建立 `src/core/events/` — 定義 EventMap 與 18 個事件型別
  - 子專案：packages/analytics
  - 驗收：EventMap interface 有 18 個 key，各事件 properties 型別正確（含必要/可選欄位），按 auth/practice/content/engagement/funnel/generic 拆檔，`index.ts` re-export 全部

- [ ] 1.3 建立 `src/core/tracker.ts` — 實作 initTracker、registerAdapter、trackUnifiedEvent、identify、reset、consent、optIn、optOut
  - 子專案：packages/analytics
  - 驗收：trackUnifiedEvent 泛型型別安全、自動注入 platform/app、adapter 錯誤隔離（try/catch + console.warn）

- [ ] 1.4 建立 `src/core/index.ts` — re-export core 公開 API
  - 子專案：packages/analytics
  - 驗收：export AnalyticsAdapter type、EventMap type、所有 tracker 函數、所有事件型別

- [ ] 1.5 更新 `package.json` 的 exports 欄位 — 新增 `"./core"` 指向 `./src/core/index.ts`
  - 子專案：packages/analytics
  - 驗收：`import { trackUnifiedEvent } from "@daodao/analytics/core"` 在 mobile app 可解析

- [ ] 1.6 撰寫 core 單元測試 — tracker 初始化、事件追蹤、adapter 錯誤隔離、identify/reset
  - 子專案：packages/analytics
  - 驗收：測試涵蓋 tracker.ts 所有函數，mock adapter 驗證呼叫行為，覆蓋率 > 90%

## 2. Web Adapters (packages/analytics)

- [ ] 2.1 建立 `src/adapters/ga4.ts` — GA4 adapter 含 sanitization
  - 子專案：packages/analytics
  - 驗收：track 呼叫 window.gtag、25 params 上限截斷、key 40 字元截斷、value 100 字元截斷、SSR guard、identify 設定 user_id、reset 清除 user_id

- [ ] 2.2 建立 `src/adapters/posthog.ts` — PostHog adapter
  - 子專案：packages/analytics
  - 驗收：track 呼叫 posthog.capture、identify 呼叫 posthog.identify、reset 呼叫 posthog.reset、consent/optIn 呼叫 opt_in_capturing、optOut 呼叫 opt_out_capturing、SSR guard

- [ ] 2.3 建立 `src/adapters/clarity.ts` — Clarity adapter
  - 子專案：packages/analytics
  - 驗收：track 只送 event name（不送 properties）、identify 呼叫 clarity("identify")、consent 呼叫 clarity("consent")、SSR guard

- [ ] 2.4 更新 `src/index.ts` — re-export core + web adapters，現有 API 標記 @deprecated
  - 子專案：packages/analytics
  - 驗收：現有 trackEvent/posthogCapture/posthogIdentify/posthogReset/clarityEvent/clarityIdentify 保留匯出但標記 @deprecated，內部轉接到對應 adapter

- [ ] 2.5 撰寫 web adapter 單元測試 — GA4 sanitization、各 adapter SSR guard、deprecated wrapper
  - 子專案：packages/analytics
  - 驗收：測試 GA4 truncation 邏輯、各 adapter 的 window guard、deprecated API 轉接行為

## 3. Website App 埋點 (apps/website)

- [ ] 3.1 global-provider.tsx 加入 tracker 初始化 — initTracker + registerAdapter
  - 子專案：apps/website
  - 驗收：`initTracker({ platform: "web", app: "website" })` 在 client side 執行，三個 adapter 註冊完成

- [ ] 3.2 Landing Page CTA 埋點 — cta_clicked 事件
  - 子專案：apps/website
  - 驗收：8 個 CTA 按鈕（header_join、hero_join、community_join、join_section、bottom_cta、plan_join、personality_test、marathon_apply）各送出正確的 cta_id/page/section

- [ ] 3.3 Quiz 埋點 — quiz_started、quiz_completed 事件
  - 子專案：apps/website
  - 驗收：進入 Quiz 送 quiz_started、完成看到結果送 quiz_completed（含 result_theme）

- [ ] 3.4 Action Maker 埋點 — action_maker_started、action_maker_completed 事件
  - 子專案：apps/website
  - 驗收：進入 Action Maker 送 action_maker_started、完成看到結果送 action_maker_completed

- [ ] 3.5 Newsletter 埋點 — newsletter_subscribed 事件
  - 子專案：apps/website
  - 驗收：Footer 訂閱電子報成功後送出 newsletter_subscribed

- [ ] 3.6 Funnel drop 埋點 — funnel_dropped 事件（Quiz + Action Maker）
  - 子專案：apps/website
  - 驗收：使用者中途離開 Quiz 或 Action Maker 時送出 funnel_dropped（含 funnel_name 和 last_step），正常完成不觸發

## 4. Product App 埋點 (apps/product)

- [ ] 4.1 global-provider.tsx 加入 tracker 初始化 — initTracker + registerAdapter
  - 子專案：apps/product
  - 驗收：`initTracker({ platform: "web", app: "product" })` 在 client side 執行，三個 adapter 註冊完成

- [ ] 4.2 Auth 埋點 — signup、login、onboarding_completed + identify/reset
  - 子專案：apps/product
  - 驗收：註冊送 signup（含 method + referrer_page）、登入送 login（含 method）、onboarding 完成送 onboarding_completed、登入成功呼叫 identify(userId)、登出呼叫 reset()

- [ ] 4.3 Practice 埋點 — practice_create_started、practice_created、practice_archived
  - 子專案：apps/product
  - 驗收：進入建立流程送 practice_create_started、成功建立送 practice_created（含完整 properties）、歸檔送 practice_archived

- [ ] 4.4 Check-in 埋點 — check_in 事件
  - 子專案：apps/product
  - 驗收：打卡成功送 check_in（含 practice_id、streak_count、has_note、has_media、mood、is_first）

- [ ] 4.5 Content 埋點 — content_viewed、template_selected
  - 子專案：apps/product
  - 驗收：進入練習/資源詳情頁送 content_viewed、選用模板送 template_selected。現有 `posthogCapture("content_viewed")` 改用 trackUnifiedEvent

- [ ] 4.6 Social 埋點 — comment_created、share
  - 子專案：apps/product
  - 驗收：發表留言送 comment_created（含 content_type + content_id）、分享內容送 share（含 content_type + content_id + share_method）

- [ ] 4.7 Funnel drop 埋點 — funnel_dropped（practice_create）
  - 子專案：apps/product
  - 驗收：使用者中途離開練習建立流程時送出 funnel_dropped（funnel_name: "practice_create"），正常完成不觸發

## 5. Mobile App 遷移 (apps/mobile)

- [ ] 5.1 建立 `adapters/firebase.ts` — Firebase Analytics adapter
  - 子專案：apps/mobile
  - 驗收：實作 AnalyticsAdapter interface，track 呼叫 firebase analytics().logEvent，identify 呼叫 setUserId，內建 sanitization（複用現有 sanitizeFirebaseProperties 邏輯）

- [ ] 5.2 建立 `adapters/posthog.ts` — PostHog React Native adapter
  - 子專案：apps/mobile
  - 驗收：實作 AnalyticsAdapter interface，使用 posthog-react-native SDK

- [ ] 5.3 建立 `adapters/clarity.ts` — Clarity React Native adapter
  - 子專案：apps/mobile
  - 驗收：實作 AnalyticsAdapter interface，使用 @microsoft/react-native-clarity SDK

- [ ] 5.4 `_layout.tsx` 加入 tracker 初始化 — 替換現有 analytics 初始化
  - 子專案：apps/mobile
  - 驗收：`initTracker({ platform: "mobile", app: "mobile" })` + 三個 adapter 註冊，取代現有 AnalyticsProvider

- [ ] 5.5 遷移現有事件呼叫 — 改用 trackUnifiedEvent
  - 子專案：apps/mobile
  - 驗收：所有現有 analytics 呼叫改用 trackUnifiedEvent，`share_check_in` 改為 `share` + `content_type: "check_in"`

- [ ] 5.6 刪除 `services/analytics.ts` — 移除舊實作
  - 子專案：apps/mobile
  - 驗收：舊的 AnalyticsService class 和 useAnalytics hook 移除，app 正常運作無 analytics 錯誤

## 6. 驗證與清理

- [ ] 6.1 TypeScript 全專案 typecheck — 確保無編譯錯誤
  - 子專案：全部（pnpm run typecheck）
  - 驗收：`pnpm run typecheck` 通過，無新增 type error

- [ ] 6.2 Lint 檢查 — 確保程式碼品質
  - 子專案：全部（pnpm run lint）
  - 驗收：`pnpm run lint` 通過，無新增 lint error

- [ ] 6.3 手動驗證 — PostHog debug mode / GA4 DebugView 確認事件送達
  - 子專案：apps/website + apps/product
  - 驗收：在開發環境開啟 PostHog debug mode，確認至少 3 個關鍵事件（cta_clicked、signup、check_in）正確送達且包含 platform/app properties
