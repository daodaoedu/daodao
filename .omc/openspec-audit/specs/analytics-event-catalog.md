# analytics-event-catalog
- 涉及 repo: f2e (packages/analytics)
- 對應 archived change: unified-analytics-tracking (docs/superpowers plan 2026-03-26)
- 總計: 9 條 requirement / 19 個 scenario | ✅0 ⚠️0 ❌9 ❓0

整體結論：此 spec **完全未實作**。`packages/analytics` 在 origin/dev 只有舊的 analytics-provider/posthog/google-analytics/clarity 元件，**沒有** `core/`、`events/types.ts`、`tracker.ts`。grep `EventMap` 與 `trackUnifiedEvent` 在 origin/dev 只出現在 `docs/superpowers/plans/2026-03-26-unified-analytics-tracking.md` 與 `docs/superpowers/specs/...-design.md`（計畫/設計文件），完全沒有任何 packages/apps 的程式碼實作。

## Requirement: EventMap 型別定義 → ❌
證據: daodao-f2e:git grep EventMap origin/dev 僅命中 docs/superpowers/plans/*.md（計畫文件），`packages/analytics/src` 下無 events/types.ts、無 EventMap interface。
- Scenario: TypeScript 自動推導事件 properties → ❌ — 無 trackUnifiedEvent 實作
- Scenario: 不存在的事件名稱 → ❌ — 無型別約束實作

## Requirement: Auth Events（3 個事件）→ ❌
證據: 無 EventMap，signup/login/onboarding_completed 事件定義不存在於程式碼。
- Scenario: signup 事件 → ❌
- Scenario: login 事件 → ❌
- Scenario: onboarding_completed 事件 → ❌

## Requirement: Practice Events（4 個事件）→ ❌
證據: 無 practice_created/check_in 等事件定義。
- Scenario: practice_created 含模板 → ❌
- Scenario: practice_created 不含模板 → ❌
- Scenario: check_in 含 media → ❌
- Scenario: check_in 首次打卡 → ❌

## Requirement: Content Events（2 個事件）→ ❌
證據: 無 content_viewed/template_selected 定義（僅 plan 文件範例）。
- Scenario: 查看練習詳情 → ❌
- Scenario: 查看資源詳情 → ❌
- Scenario: 選用模板 → ❌

## Requirement: Engagement Events（4 個事件）→ ❌
證據: 無 cta_clicked/newsletter_subscribed/comment_created/share 定義。
- Scenario: CTA 點擊 → ❌
- Scenario: 分享打卡記錄 → ❌
- Scenario: 留言 → ❌
- Scenario: 訂閱電子報 → ❌

## Requirement: Funnel Events（4 個事件）→ ❌
證據: 無 quiz_started/quiz_completed/action_maker_* 定義。
- Scenario: Quiz 完整流程 → ❌
- Scenario: Action Maker 完整流程 → ❌

## Requirement: Generic Events（1 個事件）→ ❌
證據: 無 funnel_dropped 定義。
- Scenario: 使用者中途離開 Quiz → ❌
- Scenario: 使用者中途離開練習建立 → ❌
- Scenario: 正常完成不觸發 → ❌

## Requirement: Auto-Injected Properties → ❌
證據: 無 initTracker config 與 platform/app 注入邏輯實作。
- Scenario: Web product app 事件 → ❌
- Scenario: Mobile app 事件 → ❌

## Requirement: 事件總數為 18 → ❌
證據: EventMap 不存在，無法列舉 key。
- Scenario: EventMap key 數量 → ❌
