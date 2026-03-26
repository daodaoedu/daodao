# Notification Email Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix notification digest email so P2 descriptions include the practice title, and change the CTA button from "前往通知設定" to "查看更多" linking to the platform homepage.

**Architecture:** Two-file change. Worker fixes payload key mapping (`practice_title` → `entityTitle`). Template restructures P2 rendering to embed title inside the label text, and swaps the CTA button.

**Tech Stack:** TypeScript, BullMQ worker, HTML email template

**Spec:** `docs/superpowers/specs/2026-03-24-notification-email-improvements-design.md`

**Note:** Multiple services (`reaction.service.ts`, `follow.service.ts`, `comment.service.ts`, `buddy-request.service.ts`, `practice-checkin.service.ts`) write `practice_title` into the payload. The key mapping fix benefits all of them.

---

### Task 1: Fix payload key mapping, update template interface, and add homeUrl

**Files:**
- Modify: `src/queues/notification-email.worker.ts:175,187,191`
- Modify: `src/services/email/notification-digest-template.ts:35-41`

Both P1 (L175) and P2 (L187) read `payload.entityTitle`, but services write `practice_title`. Fix both, and add `homeUrl` to the interface and worker together so the code stays compilable at each step.

- [ ] **Step 1: Add `homeUrl` to `NotificationDigestData` interface**

In `src/services/email/notification-digest-template.ts`, add to the `NotificationDigestData` interface (L35-41):
```typescript
homeUrl: string;
```

- [ ] **Step 2: Fix P1 entityTitle mapping (worker L175)**

In `src/queues/notification-email.worker.ts`, change line 175 from:
```typescript
entityTitle:    payload?.entityTitle ? String(payload.entityTitle) : undefined,
```
to:
```typescript
entityTitle:    payload?.entityTitle ? String(payload.entityTitle) : payload?.practice_title ? String(payload.practice_title) : undefined,
```

Checks `entityTitle` first (future-proof), then falls back to `practice_title` (current key used by all services).

- [ ] **Step 3: Fix P2 entityTitle mapping (worker L187)**

Same fix on line 187:
```typescript
entityTitle: payload?.entityTitle ? String(payload.entityTitle) : payload?.practice_title ? String(payload.practice_title) : undefined,
```

- [ ] **Step 4: Add homeUrl to digest data (worker L191)**

After `settingsUrl: generateSettingsUrl(),` add:
```typescript
homeUrl: process.env.FRONTEND_URL ?? 'https://daodao.cc',
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `pnpm run typecheck`
Expected: No new errors (interface and worker are now in sync)

- [ ] **Step 6: Run existing tests**

Run: `pnpm test -- tests/unit/queues/notification-email.worker.test.ts`
Expected: All tests PASS (template is mocked so payload mapping changes don't affect existing assertions)

- [ ] **Step 7: Commit**

```bash
git add src/queues/notification-email.worker.ts src/services/email/notification-digest-template.ts
git commit -m "fix(notification): fix payload key mapping (practice_title) and add homeUrl to digest data"
```

---

### Task 2: Restructure P2 description and change CTA button

**Files:**
- Modify: `src/services/email/notification-digest-template.ts:106-131,222-229`

Two changes:
1. Restructure `generateP2Summary()` so reaction events show "對《標題》按了共鳴" instead of "對你的內容按了共鳴 《標題》"
2. Change CTA button from "前往通知設定" (settings URL) to "查看更多" (home URL)

- [ ] **Step 1: Restructure P2 summary rendering**

In `generateP2Summary()` (L106-131), replace the row-building logic inside `events.map()`:

From:
```typescript
const safeName  = escapeHtml(e.actorName);
const safeTitle = e.entityTitle ? escapeHtml(e.entityTitle) : '';
const label     = getEventLabel(e.type);

const titlePart = safeTitle ? `《${safeTitle}》` : '';
const countPart = e.count > 1
  ? `等 <strong>${e.count}</strong> 人`
  : '';

return `
<tr>
  <td style="padding: 8px 0; border-bottom: 1px solid ${EMAIL_COLORS.divider};">
    <p style="margin: 0; font-size: 14px; color: ${EMAIL_COLORS.textPrimary}; line-height: 1.5;">
      <strong>${safeName}</strong>${countPart} ${label} ${titlePart}
    </p>
  </td>
</tr>`;
```

To:
```typescript
const safeName  = escapeHtml(e.actorName);
const safeTitle = e.entityTitle ? escapeHtml(e.entityTitle) : '';
const countPart = e.count > 1
  ? `等 <strong>${e.count}</strong> 人`
  : '';

// 共鳴事件：標題嵌入 label 中間；其他事件：標題附在末尾
let description: string;
if (e.type === 'reaction' && safeTitle) {
  description = `對《${safeTitle}》按了共鳴`;
} else {
  const label     = getEventLabel(e.type);
  const titlePart = safeTitle ? ` 《${safeTitle}》` : '';
  description = `${label}${titlePart}`;
}

return `
<tr>
  <td style="padding: 8px 0; border-bottom: 1px solid ${EMAIL_COLORS.divider};">
    <p style="margin: 0; font-size: 14px; color: ${EMAIL_COLORS.textPrimary}; line-height: 1.5;">
      <strong>${safeName}</strong>${countPart} ${description}
    </p>
  </td>
</tr>`;
```

- [ ] **Step 2: Change CTA button text and URL**

In `generateNotificationDigestHtml()`:

Add `safeHomeUrl` declaration near L156 (next to `safeSettingsUrl`):
```typescript
const safeHomeUrl = sanitizeUrl(data.homeUrl);
```

Replace L222-226:
```typescript
<!-- 前往通知設定 -->
...
      ${generateCtaButton({ text: '前往通知設定', url: safeSettingsUrl, color: 'cyan' })}
```

With:
```typescript
<!-- 查看更多 -->
...
      ${generateCtaButton({ text: '查看更多', url: safeHomeUrl, color: 'cyan' })}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `pnpm run typecheck`
Expected: No new errors

- [ ] **Step 4: Run all tests**

Run: `pnpm test -- tests/unit/queues/notification-email.worker.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/email/notification-digest-template.ts
git commit -m "fix(notification): improve P2 description with practice title and update CTA to 查看更多"
```
