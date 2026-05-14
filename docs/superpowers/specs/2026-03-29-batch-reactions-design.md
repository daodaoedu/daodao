# Batch Reactions API Design

## Problem

The showcase feed page renders N practice cards. Each card independently calls two reaction endpoints:

1. `GET /api/v1/reactions?targetType=practice&targetId=<id>` (reaction counts)
2. `GET /api/v1/reactions/list?targetType=practice&targetId=<id>` (individual user reactions)

Result: **2N API requests** for N cards (40 requests for 20 cards).

## Solution

Add a single batch endpoint that returns both reaction counts and user reaction lists for multiple targets at once.

## Backend

### New Endpoint: `GET /api/v1/reactions/batch`

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `targetType` | `string` | Yes | e.g. `"practice"` |
| `targetIds` | `string` | Yes | Comma-separated external UUIDs, max 50 |

**Auth:** Optional (`optionalAuth` middleware, same as existing endpoints)

**Response (200):**

```json
{
  "data": {
    "<targetId>": {
      "reactions": [
        { "type": "encourage", "count": 3, "latestUserNames": ["Alice", "Bob"] }
      ],
      "currentUserReaction": "encourage",
      "items": [
        {
          "userId": "...",
          "name": "...",
          "photoURL": "...",
          "reactionType": "encourage",
          "reactedAt": "..."
        }
      ]
    }
  }
}
```

Each key in `data` is a targetId from the request. Targets with zero reactions are included with empty arrays and `null` currentUserReaction.

### Implementation

- File: `daodao-server/src/controllers/reaction.controller.ts` — new `getReactionsBatch` handler
- File: `daodao-server/src/services/reaction.service.ts` — new `getReactionsBatchByTargets` method
  - Reuses existing DB queries but batches them: single query with `WHERE target_id IN (...)` instead of N individual queries
- File: `daodao-server/src/routes/reaction.routes.ts` — register new route
- File: `daodao-server/src/validators/reaction.validators.ts` — new Zod schema for batch query params
- OpenAPI spec update for the new endpoint

### Validation

- `targetIds` must contain 1-50 valid UUIDs
- `targetType` must be a valid enum value
- Return 400 if validation fails

## Frontend

### New Hook: `useReactionsBatch`

- File: `daodao-f2e/packages/api/src/services/reaction-hooks.ts`
- Accepts `{ targetType, targetIds: string[] }`
- Returns `Record<string, { reactions, currentUserReaction, reactionList }>`
- Uses SWR with same refresh/revalidation settings as existing hooks
- SWR key includes sorted targetIds to ensure cache consistency

### New API Function: `getReactionsBatch`

- File: `daodao-f2e/packages/api/src/services/reaction.ts`
- Calls `GET /api/v1/reactions/batch`

### List Page Integration

- File: `daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx`
- After `useShowcaseFeed()` returns practices, extract all IDs
- Call `useReactionsBatch({ targetType: "practice", targetIds })` once
- Pass each card's reactions data via props

### Card Component Changes

- Files: `PracticeShowcaseCard.tsx`, `BrewingCard.tsx`
- Add optional props for pre-fetched reactions data:
  - `reactionsData?: { reactions, currentUserReaction }`
  - `reactionsListData?: ReactionListItem[]`
- If props are provided, use them instead of calling individual hooks
- If props are not provided, fall back to existing hooks (preserves standalone usage in detail pages)

### `useCardReactions` Hook Update

- File: `daodao-f2e/apps/product/src/hooks/use-card-reactions.ts`
- Accept optional pre-fetched data parameter
- When provided, skip the internal `useReactions` call and use the pre-fetched data
- Mutation (`handleToggle`) still works by calling upsert/remove API, then invalidates the batch SWR cache

## Result

- **Before:** 2N requests (40 for 20 cards)
- **After:** 1 request for all cards on the page
- Detail pages and other standalone card usages remain unchanged
