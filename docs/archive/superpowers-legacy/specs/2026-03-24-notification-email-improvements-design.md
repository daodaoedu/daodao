# Notification Digest Email Improvements

## Problem

Two issues with the notification digest email (共鳴回饋 section):

1. **P2 描述太籠統** — 共鳴通知顯示「對你的內容按了共鳴」，缺少具體的主題實踐名稱。根本原因是 email worker 用 `payload.entityTitle` 取值，但 reaction 事件的 payload key 實際上是 `practice_title`，導致標題永遠是 `undefined`。
2. **CTA 按鈕文案/連結不適當** — 底部按鈕寫「前往通知設定」連到設定頁，應改為「查看更多」連到平台首頁。

## Design

### Change 1: Fix notification description (P1 + P2)

**Worker bug fix** (`src/queues/notification-email.worker.ts:175,187`):
- Both P1 (L175) and P2 (L187) read `payload.entityTitle`, but services write `practice_title`
- Fix both mappings: read `payload.practice_title` instead of `payload.entityTitle`

**Template rendering** (`src/services/email/notification-digest-template.ts`):
- In `generateP2Summary()`, restructure the text so `titlePart` is inserted inside the label, not appended after it
- When entityTitle exists: `小安 對《學習日語的30天挑戰》按了共鳴`
- When entityTitle is absent: `小安 對你的內容按了共鳴` (fallback, unchanged)
- Only the `reaction` type needs this dynamic treatment; other P2 types keep current behavior
- Template string for reaction: `${safeName}${countPart} 對${titlePart}按了共鳴` (titlePart = `《標題》` or `你的內容`)

### Change 2: CTA button text and URL

**Data interface** (`NotificationDigestData`):
- Add `homeUrl: string` field

**Worker** (`src/queues/notification-email.worker.ts`):
- Pass `homeUrl` using `FRONTEND_URL` env var (via existing config pattern)

**Template** (`src/services/email/notification-digest-template.ts:226`):
- Change button text from `'前往通知設定'` to `'查看更多'`
- Change URL from `safeSettingsUrl` to `safeHomeUrl`

## Files to modify

1. `src/queues/notification-email.worker.ts` — fix payload key mapping, add homeUrl
2. `src/services/email/notification-digest-template.ts` — fix P2 rendering, change CTA button

## Out of scope

- Changing the `settingsUrl` field or removing it (footer unsubscribe link still uses it)
- Modifying how reaction events are created in `reaction.service.ts`
- Changes to weekly digest template or reaction notification template
