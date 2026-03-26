# Mentions Feature Design

**Date**: 2026-03-19
**Status**: Approved

## Overview

Complete the @mention feature so that when a user tags another user in a comment, the tagged user receives an in-app and email notification.

## Current State

- **Frontend**: `MentionInput` component already detects `@` and shows a dropdown from comment participants. Selects a candidate and inserts `@customId` into the text. But the selected `userId` is discarded — only raw text is sent.
- **Backend**: Comment content is stored as-is. No mention extraction or notification is triggered.
- **Notification infrastructure**: Fully operational. `notification_events` table feeds both the in-app worker (every minute → `notifications` table) and the email digest worker (every 4 hours → email). Adding a `mention` event record is sufficient for both channels to work.

## Design

### Data Flow

```
User selects @Alice in MentionInput
  → Frontend tracks mentionedIds: Map<userId, customId>
  → On submit: filter map to entries whose @customId still appears in content
  → POST /api/v1/comments { content, mentionedUserIds: [42], ... }

comment.service.createComment()
  → persists comment (best-effort: notification failure does not fail comment)
  → dedup mentionedUserIds: remove commenter, remove target owner
  → verify each userId exists in users table; skip invalid ones
  → for each remaining userId: notificationEventService.createEvent()
     { type: 'mention', actor_id: commenter, recipient_id: userId,
       entity_type: 'comment', entity_id: commentId,
       priority: 'P1',
       payload: { content, actorName: commenter.nickname, url, entityTitle? } }

notification-inapp.worker (every minute)
  → picks up unprocessed P1 events → writes to notifications table

notification-email.worker (every 4h)
  → picks up P1 events → sends digest email
```

### URL Construction

The `url` in the notification payload is constructed from `targetType` and `targetId` (external ID):

- `targetType = 'practice'` → `${FRONTEND_URL}/practices/${targetId}`
- `targetType = 'check_in'` → `${FRONTEND_URL}/check-ins/${targetId}`
- Other types → `${FRONTEND_URL}` (fallback)

`FRONTEND_URL` is read from `process.env.FRONTEND_URL` (consistent with existing services).

### Backend Changes

**1. `comment.validators.ts`**
Add to `createCommentSchema` only (not update schema — see v1 scope below):
```ts
mentionedUserIds: z.array(z.number().int().positive()).max(10).optional()
```

**2. `comment.service.ts`** — `createComment()` only
After comment is persisted:
1. If `mentionedUserIds` is empty/missing, skip.
2. Deduplicate: `new Set(mentionedUserIds)`, remove `userId` (commenter) and `targetEntity.user_id` (owner).
3. Verify existence: `prisma.users.findMany({ where: { id: { in: [...deduped] } } })` — use only found IDs.
4. For each verified userId, call `notificationEventService.createEvent(...)`.
5. Wrap step 3–4 in try/catch; log errors but do not throw (comment is already saved).

**3. `notification-event.service.ts`**
Confirm `'mention'` is an accepted type. If the service has a strict type enum, add `'mention'` to it.

### Frontend Changes

**`comment-section.tsx` — `CommentInput` component**

Track a `mentionedIds: Map<number, string>` in state (key = userId, value = customId). When `MentionInput.handleSelect` fires:
- Add `candidate.id → candidate.customId` to the map.

On submit (inside `handleSubmit`), derive the final set:
```ts
const activeMentionIds = [...mentionedIds.entries()]
  .filter(([, customId]) => content.includes(`@${customId}`))
  .map(([id]) => id);
```
Pass `mentionedUserIds: activeMentionIds` in the API payload.

Reset `mentionedIds` to an empty map after successful submit.

### V1 Scope (explicitly excluded)

- **Update comment** does not re-trigger mention notifications. Adding a mention while editing is a v2 concern. This avoids the dedup complexity of comparing old vs new mentions.
- **Visibility guardrail**: the API trusts the client's `mentionedUserIds` list. `MentionInput` only surfaces participants, so notification disclosure is low risk. A server-side participant check is deferred.

## What Is Not Changing

- DB schema (no new tables or columns needed)
- `updateCommentSchema` / `updateComment` service
- In-app worker
- Email worker
- Social notification worker (`social-notification.worker.ts` — separate BullMQ system)
- Notification preference system (email opt-out already works)

## Success Criteria

**Create path**
1. Tagging `@alice` in a new comment, with alice's userId in `mentionedUserIds`, creates a P1 `notification_events` record for alice.
2. Within one minute, a `notifications` record appears for alice (`is_read = false`).
3. Within 4 hours, alice receives a digest email containing the mention.
4. Self-mentions produce no notification.
5. Tagging the content owner produces no duplicate notification beyond the existing `comment` event.
6. Mentioning a non-existent userId is silently ignored.
7. Mentioning the same user twice in one comment creates only one notification event.

**Update path**
8. Editing a comment does not fire new mention notifications (v1 explicit non-requirement).

**Frontend**
9. Deleting `@alice` from the text before submitting removes alice from `mentionedUserIds`.
10. After submit, the mentionedIds map is reset.
