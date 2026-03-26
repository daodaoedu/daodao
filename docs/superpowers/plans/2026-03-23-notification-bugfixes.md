# Notification System Bugfixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all issues identified in the notification system code review — duplicate notifications, race conditions, performance, security, and consistency.

**Architecture:** Targeted fixes across 7 files. No new files created. Changes are independent per task and can be committed separately.

**Tech Stack:** TypeScript, BullMQ, Prisma, Express

---

### Task 1: Remove duplicate practice-checkin follower notification

**Files:**
- Modify: `daodao-server/src/services/practice-checkin.service.ts:252-281`

**Problem:** Practice followers receive TWO notifications on checkin: `update-practice-checkin` (direct, lines 254-281) AND `PracticeCheckinActivity` (via fan-out, line 286). Remove the direct path; keep fan-out. Preserve `update-practice-finish` (lines 269-279) which only fires on completion and is NOT duplicated.

- [ ] **Step 1: Remove the duplicate direct notification block**

Replace lines 252-281 with only the `update-practice-finish` logic:

```typescript
    // 通知關注此實踐的 followers：實踐完成（非阻塞）
    if (newStatus === 'completed') {
      const practiceTitle = (checkIn as { practices?: { title?: string | null } }).practices?.title ?? '';
      prismaClient.follows.findMany({
        where:  { target_type: 'practice', target_id: practiceId },
        select: { follower_id: true },
      }).then((followers) => {
        for (const { follower_id } of followers) {
          notificationEventService.createEvent({
            type:        'update-practice-finish',
            actorId:     userId,
            recipientId: follower_id,
            entityType:  'practice',
            entityId:    practiceId,
            payload:     { practice_title: practiceTitle },
            priority:    'P2',
          }).catch(() => {});
        }
      }).catch(() => {});
    }
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd daodao-server && pnpm run typecheck`

- [ ] **Step 3: Commit**

---

### Task 2: Fix race condition in reaction notification dedup

**Files:**
- Modify: `daodao-server/src/queues/reaction-notification.queue.ts:90-109`

**Problem:** Between `remove()` and `add()`, a concurrent call can insert same jobId, causing `add()` to throw. Fix: wrap `add()` in try/catch and retry once after removing.

- [ ] **Step 1: Fix the dedup logic**

Replace `enqueueReactionNotification` function body (lines 90-109):

```typescript
export async function enqueueReactionNotification(job: ReactionNotificationJob): Promise<void> {
  const queue = reactionNotificationQueueInstance;
  if (!queue) return;

  const jobId = `reaction-notification-${job.practiceId}`;

  // Remove existing delayed job if present, then add new one.
  // Retry once if add() fails due to race with concurrent enqueue.
  for (let attempt = 0; attempt < 2; attempt++) {
    const existingJob = await queue.getJob(jobId);
    if (existingJob) {
      try { await existingJob.remove(); } catch { /* job may have been processed or removed by another caller */ }
    }
    try {
      await queue.add('reaction.notified', job, {
        jobId,
        delay: REACTION_NOTIFICATION_DELAY_MS,
        removeOnComplete: true,
      });
      return; // success
    } catch {
      if (attempt === 1) throw new Error(`Failed to enqueue reaction notification after retry: ${jobId}`);
      // First attempt failed (likely race condition), retry
    }
  }
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd daodao-server && pnpm run typecheck`

- [ ] **Step 3: Commit**

---

### Task 3: Add self-exclusion in connection.service fan-out + fix console.warn + remove redundant query

**Files:**
- Modify: `daodao-server/src/services/connection.service.ts:152-199`

**Problem:**
1. Fan-out loop (line 165) doesn't skip `follower_id === requesterId`
2. Line 174 uses `console.warn` instead of `loggerService`
3. Lines 179-187 do a redundant `findUnique` — `upsertedRequest` already has `id`

- [ ] **Step 1: Fix all three issues**

Replace lines 152-199:

```typescript
  // Enqueue connect.request notification to followers of requester
  // Only for new requests (created_at equals updated_at), not re-sends
  const isNewRequest =
    upsertedRequest.created_at !== null &&
    upsertedRequest.updated_at !== null &&
    upsertedRequest.created_at.getTime() === upsertedRequest.updated_at.getTime();
  if (isNewRequest) {
    try {
      const { enqueueSocialNotification } = await import('../queues/social-notification.queue');
      const followers = await prisma.follows.findMany({
        where: { target_type: 'user', target_id: requesterId },
        select: { follower_id: true }
      });
      for (const follower of followers) {
        if (follower.follower_id === requesterId) continue;
        await enqueueSocialNotification({
          event: 'connect.request',
          actorId: requesterId,
          recipientId: follower.follower_id,
          payload: { receiverId }
        });
      }
    } catch (e) {
      loggerService.warn('Failed to enqueue connect.request notification', { requesterId, receiverId, error: e });
    }
  }

  // Fire-and-forget: P1 Connect event
  if (upsertedRequest) {
    prisma.users.findUnique({ where: { id: requesterId }, select: { nickname: true } })
      .then(actor => notificationEventService.createEvent({
        type: 'Connect',
        actorId: requesterId,
        recipientId: receiverId,
        entityType: 'connection',
        entityId: upsertedRequest.id,
        payload: { actorName: actor?.nickname ?? null, intent: intent?.trim() ?? null, connection_request_id: upsertedRequest.id },
        priority: 'P1',
      }))
      .catch(() => {});
```

**Note:** Verify `loggerService` is already imported in connection.service.ts. If not, add import.

- [ ] **Step 2: Verify typecheck passes**

- [ ] **Step 3: Commit**

---

### Task 4: Use addBulk for fan-out performance

**Files:**
- Modify: `daodao-server/src/services/social-notification-fanout.service.ts`
- Modify: `daodao-server/src/queues/social-notification.queue.ts:65-75`

**Problem:** Sequential `await enqueueSocialNotification()` in a loop causes N Redis round-trips. Use `queue.addBulk()` instead. Also remove duplicate job options from `enqueueSocialNotification` (already set in `defaultJobOptions`).

- [ ] **Step 1: Add `bulkEnqueueSocialNotifications` to social-notification.queue.ts and remove duplicate options**

Add new bulk function and simplify existing one:

```typescript
export async function enqueueSocialNotification(job: SocialNotificationJob): Promise<void> {
  const queue = socialNotificationQueueInstance;
  if (!queue) return;
  await queue.add(job.event, job);
}

/**
 * 批次新增多個社交通知任務（使用 addBulk 減少 Redis round-trips）
 */
export async function bulkEnqueueSocialNotifications(jobs: SocialNotificationJob[]): Promise<void> {
  const queue = socialNotificationQueueInstance;
  if (!queue || jobs.length === 0) return;
  await queue.addBulk(jobs.map(job => ({
    name: job.event,
    data: job,
  })));
}
```

- [ ] **Step 2: Refactor fanout helpers to use bulkEnqueue**

Replace `social-notification-fanout.service.ts`:

```typescript
/**
 * Social Notification Fan-out Helpers
 *
 * 將社交通知事件 fan-out 到追蹤者和連結夥伴。
 * 所有函數皆為 fire-and-forget 設計，呼叫端應自行加 .catch(() => {})。
 */

import { prisma } from './database/prisma.service';
import type { SocialNotificationEventType } from '../types/social.types';

/**
 * Fan-out 通知給實踐的追蹤者
 * @param event - 社交通知事件類型
 * @param actorId - 觸發者 user id（會被排除在收件人外）
 * @param practiceId - 實踐 id
 * @param payload - 額外資料
 */
export async function fanoutToPracticeFollowers(
  event: SocialNotificationEventType,
  actorId: number,
  practiceId: number,
  payload: Record<string, unknown>
): Promise<void> {
  const followers = await prisma.follows.findMany({
    where: { target_type: 'practice', target_id: practiceId },
    select: { follower_id: true },
  });
  const { bulkEnqueueSocialNotifications } = await import('../queues/social-notification.queue');
  const jobs = followers
    .filter(f => f.follower_id !== actorId)
    .map(f => ({ event, actorId, recipientId: f.follower_id, payload }));
  await bulkEnqueueSocialNotifications(jobs);
}

/**
 * Fan-out 通知給雙向連結夥伴
 * @param event - 社交通知事件類型
 * @param actorId - 觸發者 user id
 * @param payload - 額外資料
 */
export async function fanoutToConnectedPartners(
  event: SocialNotificationEventType,
  actorId: number,
  payload: Record<string, unknown>
): Promise<void> {
  const connections = await prisma.connections.findMany({
    where: { OR: [{ user_a_id: actorId }, { user_b_id: actorId }] },
    select: { user_a_id: true, user_b_id: true },
  });
  const { bulkEnqueueSocialNotifications } = await import('../queues/social-notification.queue');
  const jobs = connections.map(conn => ({
    event,
    actorId,
    recipientId: conn.user_a_id === actorId ? conn.user_b_id : conn.user_a_id,
    payload,
  }));
  await bulkEnqueueSocialNotifications(jobs);
}
```

- [ ] **Step 3: Verify typecheck passes**

- [ ] **Step 4: Commit**

---

### Task 5: Fix cursor timestamp precision in notification.controller.ts

**Files:**
- Modify: `daodao-server/src/controllers/notification.controller.ts:107-108`

**Problem:** `created_at: new Date(c)` does exact equality, which can fail if DB stores microseconds but JSON serializes milliseconds.

- [ ] **Step 1: Fix the cursor condition**

Replace the cursor WHERE block (lines 103-111):

```typescript
    where.AND = [
      {
        OR: [
          { priority: { gt: p } },
          { priority: p, created_at: { lt: new Date(c) } },
          { priority: p, created_at: new Date(c), id: { lt: id } },
        ]
      }
    ];
```

Change the third condition to use `lte` on `created_at` combined with `lt` on `id`:

```typescript
    where.AND = [
      {
        OR: [
          { priority: { gt: p } },                                          // lower priority tier
          { priority: p, created_at: { lt: new Date(c) } },                // same priority, older
          { priority: p, created_at: { lte: new Date(c) }, id: { lt: id } }, // same priority, same-ish time, lower id
        ]
      }
    ];
```

- [ ] **Step 2: Verify typecheck passes**

- [ ] **Step 3: Commit**

---

### Task 6: Validate mentionedUserIds against comment content

**Files:**
- Modify: `daodao-server/src/services/comment.service.ts:147-153`

**Problem:** Client can pass arbitrary internal user IDs in `mentionedUserIds` without them appearing in content, triggering P1 notifications to anyone.

- [ ] **Step 1: Add content validation**

Before the `if (mentionedUserIds && mentionedUserIds.length > 0)` block, add a content check. Since we can't easily map internal IDs to @mentions in content, validate that the content contains at least as many @mention patterns as claimed user IDs:

```typescript
        // Fire-and-forget: mention 通知給被 @mention 的使用者
        const mentionedUserIds = params.mentionedUserIds;
        if (mentionedUserIds && mentionedUserIds.length > 0) {
          // Security: verify content actually contains @mention patterns
          const mentionPatterns = content.match(/@[\w]+/g) ?? [];
          if (mentionPatterns.length < mentionedUserIds.length) {
            loggerService.warn('[CommentService] mentionedUserIds count exceeds @mentions in content', {
              mentionedCount: mentionedUserIds.length,
              contentMentions: mentionPatterns.length,
              userId,
            });
          }
          // Only process up to the number of @mentions found in content
          const safeUserIds = mentionedUserIds.slice(0, Math.max(mentionPatterns.length, 0));
          const ownerId = targetEntity.user_id ?? null;
          const uniqueIds = [...new Set(safeUserIds)].filter(
            (id) => id !== userId && id !== ownerId
          );
```

- [ ] **Step 2: Verify typecheck passes**

- [ ] **Step 3: Commit**

---

### Task 7: Consistency fixes — void to .catch, remove CONNECT_ACCEPTED from enum

**Files:**
- Modify: `daodao-server/src/services/buddy-request.service.ts:103,123,164`
- Modify: `daodao-server/src/types/social.types.ts:33`
- Modify: `daodao-server/src/queues/social-notification.worker.ts:60-62,199-209`

- [ ] **Step 1: Replace `void` with `.catch(() => {})` in buddy-request.service.ts**

Three locations:
- Line 103: `void notificationEventService.createEvent({` → `notificationEventService.createEvent({...}).catch(() => {});`
- Line 123: same pattern
- Line 164: same pattern

- [ ] **Step 2: Remove CONNECT_ACCEPTED from enum and worker**

In `social.types.ts`, remove line 33:
```
  CONNECT_ACCEPTED: 'connect.accepted',
```

In `social-notification.worker.ts`, remove the case and handler:
```
      case SocialNotificationEvent.CONNECT_ACCEPTED:
        await handleConnectAccepted(actorId, recipientId, payload);
        break;
```
And remove the `handleConnectAccepted` function (lines 199-209).

- [ ] **Step 3: Verify typecheck passes**

- [ ] **Step 4: Commit**

---

### Task 8: Cache dynamic imports in practice-checkin and practice services

**Files:**
- Modify: `daodao-server/src/services/practice-checkin.service.ts:285`
- Modify: `daodao-server/src/services/practice.service.ts:814`

**Problem:** `import('./social-notification-fanout.service')` runs on every call. Cache at module level.

- [ ] **Step 1: Add cached import in practice-checkin.service.ts**

Near the top of the file (after other imports), add:

```typescript
/** Cached dynamic import to avoid per-call overhead (breaks circular dep if imported statically) */
let _fanoutModule: typeof import('./social-notification-fanout.service') | null = null;
async function getFanoutModule() {
  if (!_fanoutModule) _fanoutModule = import('./social-notification-fanout.service');
  return _fanoutModule;
}
```

Then replace line 285:
```typescript
    getFanoutModule().then(({ fanoutToPracticeFollowers, fanoutToConnectedPartners }) => {
```

- [ ] **Step 2: Same pattern in practice.service.ts**

Add same cached import helper and replace line 814.

- [ ] **Step 3: Verify typecheck passes**

- [ ] **Step 4: Commit**
