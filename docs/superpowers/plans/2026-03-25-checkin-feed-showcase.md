# CheckIn Feed Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在主頁靈感 feed 中新增打卡摘要卡片，與實踐卡片混合排列展示。

**Architecture:** 四層依序實作 — DB constraint 擴展 → daodao-server Reaction/Comment targetType 支援 checkin → daodao-ai-backend 統一 feed API → daodao-f2e 前端元件與 hook 整合。各層透過 `targetType: "checkin"` 串接。

**Tech Stack:** PostgreSQL (CHECK constraints) / Node.js + Prisma + Zod + BullMQ (server) / Python + FastAPI + SQLAlchemy (ai-backend) / Next.js + SWR + Tailwind (f2e)

**Spec:** `docs/superpowers/specs/2026-03-25-checkin-feed-showcase-design.md`

---

## File Structure

### daodao-storage
- Create: `migrate/sql/030_add_checkin_to_reactions_and_comments_target_type.sql`
- Modify: `schema/530_create_table_reactions.sql` (更新 CHECK constraint 註解)
- Modify: `schema/290_create_table_comments.sql` (更新 CHECK constraint 註解)

### daodao-server
- Modify: `src/types/reaction.types.ts` — 加入 `checkin` targetType
- Modify: `src/types/comment.types.ts` — 加入 `checkin` targetType
- Modify: `src/validators/reaction.validators.ts` — Zod schema 加入 `checkin`
- Modify: `src/validators/comment.validators.ts` — Zod schema 加入 `checkin`
- Modify: `src/controllers/reaction.controller.ts` — `resolveTargetId` 支援 checkin
- Modify: `src/services/reaction.service.ts` — notification 支援 checkin
- Modify: `src/services/comment.service.ts` — checkin entity 解析
- Modify: `tests/unit/services/reaction.service.test.ts` — checkin 測試
- Modify: `tests/unit/services/comment.service.test.ts` — checkin 測試

### daodao-ai-backend
- Create: `src/routers/feed.py` — `GET /api/v1/feed` endpoint
- Create: `src/services/feed/__init__.py` — package init
- Create: `src/services/feed/feed_service.py` — feed 查詢與組裝邏輯
- Create: `src/schemas/feed.py` — request/response schemas
- Create: `tests/routers/test_feed.py` — feed endpoint 測試
- Modify: `src/main.py` — 註冊 feed router

### daodao-f2e
- Create: `apps/product/src/components/showcase/CheckInShowcaseCard.tsx` — 打卡摘要卡片
- Create: `packages/api/src/services/feed-hooks.ts` — `useFeed` hook + types
- Modify: `packages/api/src/services/showcase-hooks.ts` — export `fetchAiBackend` 和 `IReactionCountItem`（供 feed-hooks 共用）
- Modify: `packages/api/src/services/index.ts` — barrel re-export feed-hooks
- Modify: `apps/product/src/components/showcase/index.ts` — barrel re-export CheckInShowcaseCard（若有此 barrel file）
- Modify: `apps/product/src/app/[locale]/(with-layout)/page.tsx` — 靈感 tab 改用 `useFeed`
- Modify: `apps/product/src/components/showcase/PracticeShowcaseCard.tsx` — 新增「實踐」badge
- Modify: `packages/api/src/services/reaction-hooks.ts` — targetType 支援 checkin（若有 type restriction）

---

## Phase 1: daodao-storage — DB Constraint 擴展

### Task 1: Migration — reactions 和 comments 加入 checkin targetType

**Files:**
- Create: `daodao-storage/migrate/sql/030_add_checkin_to_reactions_and_comments_target_type.sql`

- [ ] **Step 1: 建立 migration 檔案**

```sql
-- 030_add_checkin_to_reactions_and_comments_target_type.sql
-- 為 reactions 和 comments 的 target_type CHECK constraint 加入 'checkin'

-- 1. Reactions: 加入 'checkin' target_type
DO $$
DECLARE
  cname text;
BEGIN
  SELECT c.conname INTO cname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE t.relname = 'reactions'
    AND c.contype = 'c'
    AND a.attname = 'target_type'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "reactions" DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE "reactions"
    ADD CONSTRAINT "reactions_target_type_check"
    CHECK ("target_type" IN ('practice', 'comment', 'checkin'));
END $$;

-- 2. Comments: 加入 'checkin' target_type
DO $$
DECLARE
  cname text;
BEGIN
  SELECT c.conname INTO cname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
  WHERE t.relname = 'comments'
    AND c.contype = 'c'
    AND a.attname = 'target_type'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "comments" DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE "comments"
    ADD CONSTRAINT "chk_comments_target_type"
    CHECK ("target_type" IN ('post', 'resource', 'note', 'outcome', 'review', 'circle', 'idea', 'practice', 'portfolio', 'checkin'));
END $$;

COMMENT ON CONSTRAINT "reactions_target_type_check" ON "reactions" IS '反應目標類型：practice | comment | checkin';
COMMENT ON CONSTRAINT "chk_comments_target_type" ON "comments" IS '留言目標類型：post | resource | note | outcome | review | circle | idea | practice | portfolio | checkin';
```

- [ ] **Step 2: 更新 schema 檔案的 CHECK constraint 註解**

`schema/530_create_table_reactions.sql` — 將 `CHECK ("target_type" IN ('practice', 'comment'))` 更新為包含 `'checkin'`。

`schema/290_create_table_comments.sql` — 將 CHECK constraint 更新為包含 `'checkin'`。

> 注意：schema 檔案是參考文件，migration 才是實際執行的。但兩者應保持同步。

- [ ] **Step 3: Commit**

```
feat(storage): add checkin to reactions and comments target_type
```

---

## Phase 2: daodao-server — Reaction/Comment 支援 checkin

### Task 2: Type definitions 擴展

**Files:**
- Modify: `daodao-server/src/types/reaction.types.ts`
- Modify: `daodao-server/src/types/comment.types.ts`

- [ ] **Step 1: reaction.types.ts — 加入 checkin**

在 `ReactionTargetType` 或等效的 type union 中加入 `'checkin'`：

```typescript
// 現有: 'practice' | 'comment'
// 改為: 'practice' | 'comment' | 'checkin'
```

- [ ] **Step 2: comment.types.ts — 加入 checkin**

在 `CommentTargetType` 中加入 `'checkin'`：

```typescript
// 現有 9 種，加入 'checkin'
type CommentTargetType =
  | 'post' | 'resource' | 'note' | 'outcome' | 'review'
  | 'circle' | 'idea' | 'practice' | 'portfolio'
  | 'checkin';
```

- [ ] **Step 3: Commit**

```
feat(server): add checkin to reaction and comment target types
```

### Task 3: Validators 擴展

**Files:**
- Modify: `daodao-server/src/validators/reaction.validators.ts`
- Modify: `daodao-server/src/validators/comment.validators.ts`

- [ ] **Step 1: reaction.validators.ts — Zod enum 加入 checkin**

找到 `targetType` 的 Zod enum/union，加入 `'checkin'`。

- [ ] **Step 2: comment.validators.ts — Zod enum 加入 checkin**

找到 `targetType` 的 Zod enum/union，加入 `'checkin'`。

- [ ] **Step 3: Commit**

```
feat(server): add checkin to reaction and comment validators
```

### Task 4: Controller — resolveTargetId 支援 checkin

**Files:**
- Modify: `daodao-server/src/controllers/reaction.controller.ts`

- [ ] **Step 1: 在 resolveTargetId 加入 checkin 分支**

checkin 的 target_id 需要從 external UUID → internal ID 轉換。查看 `practice_checkins` 表是否有 `external_id` 欄位。

> 重要：`practice_checkins` 表只有 `id`（SERIAL），沒有 `external_id`。因此 checkin 的 targetId 直接使用 internal integer ID（與 comment 相同模式）。

```typescript
async function resolveTargetId(targetType: string, targetId: string): Promise<number> {
  if (targetType === 'comment' || targetType === 'checkin') {
    const id = parseInt(targetId, 10);
    if (isNaN(id)) throw new BadRequestError(`Invalid ${targetType} ID`);
    return id;
  }
  return externalToInternalId(targetType as EntityType, targetId);
}
```

- [ ] **Step 2: Commit**

```
feat(server): support checkin in resolveTargetId
```

### Task 5: Reaction Service — checkin notification

**Files:**
- Modify: `daodao-server/src/services/reaction.service.ts`

- [ ] **Step 1: 擴展 upsertReaction 的 notification 邏輯**

現有邏輯只在 `targetType === 'practice'` 時發送通知。需加入 `checkin` 分支：

```typescript
// 在 upsertReaction 中，找到 notification 區塊
if (targetType === 'checkin' && isNewReaction) {
  // 1. 查詢 checkin 的 user_id（即 checkin 擁有者）
  const checkin = await prisma.practice_checkins.findUnique({
    where: { id: targetId },
    select: { user_id: true, practice_id: true },
  });
  if (checkin && checkin.user_id !== userId) {
    // 2. 查詢 practice title
    const practice = await prisma.practices.findUnique({
      where: { id: checkin.practice_id },
      select: { title: true, external_id: true },
    });
    // 3. 發送通知
    notificationEventService.createEvent({
      type: 'reaction',
      actorId: userId,
      recipientId: checkin.user_id,
      entityType: 'checkin',
      entityId: targetId,
      payload: {
        reactionType,
        practice_title: practice?.title,
        entity_external_id: practice?.external_id,
      },
      priority: 'P2',
    }).catch(() => {});
  }
}
```

- [ ] **Step 2: Commit**

```
feat(server): add checkin reaction notification support
```

### Task 6: Comment Service — checkin entity 解析

**Files:**
- Modify: `daodao-server/src/services/comment.service.ts`

- [ ] **Step 1: 擴展 createComment 的 entity 驗證**

在 `createComment` 中，驗證 target entity 存在的邏輯需支援 checkin：

```typescript
// 找到驗證 target entity 存在的區段，加入 checkin 分支
if (targetType === 'checkin') {
  const checkin = await prisma.practice_checkins.findUnique({
    where: { id: internalTargetId },
    select: { id: true, user_id: true },
  });
  if (!checkin) throw new NotFoundError('Check-in not found');
  // entity owner = checkin owner
  entityOwnerId = checkin.user_id;
}
```

- [ ] **Step 2: 擴展 getComments 的 entity 查詢**

確保 `getTargetEntityByInternalId` 或等效方法能處理 `checkin` type。

- [ ] **Step 3: Commit**

```
feat(server): add checkin support to comment service
```

### Task 7: Server 測試

**Files:**
- Modify: `daodao-server/tests/unit/services/reaction.service.test.ts`
- Modify: `daodao-server/tests/unit/services/comment.service.test.ts`

- [ ] **Step 1: Reaction 測試 — 新增 checkin describe block**

```typescript
describe('checkin reactions', () => {
  const checkinReaction = makeReaction({
    target_type: 'checkin',
    target_id: 50,
  });

  it('should upsert reaction for checkin target', async () => {
    prismaMock.reactions.upsert.mockResolvedValue(checkinReaction);
    prismaMock.practice_checkins.findUnique.mockResolvedValue({
      id: 50, user_id: 2, practice_id: 10,
    });
    // ... assert upsert succeeds and notification fires
  });

  it('should not notify when reacting to own checkin', async () => {
    // userId === checkin.user_id → no notification
  });
});
```

- [ ] **Step 2: Comment 測試 — 新增 checkin describe block**

```typescript
describe('checkin comments', () => {
  it('should create comment on checkin', async () => {
    mockGetTargetEntity.mockResolvedValue({ id: 50, user_id: 2 });
    // ... assert comment creation succeeds
  });

  it('should return 404 for non-existent checkin', async () => {
    // ... assert NotFoundError
  });
});
```

- [ ] **Step 3: 執行測試**

Run: `cd daodao-server && npx jest tests/unit/services/reaction.service.test.ts tests/unit/services/comment.service.test.ts --verbose`
Expected: All tests pass

- [ ] **Step 4: Commit**

```
test(server): add checkin reaction and comment tests
```

---

## Phase 3: daodao-ai-backend — 統一 Feed API

### Task 8: Feed response schemas

**Files:**
- Create: `daodao-ai-backend/src/schemas/feed.py`

- [ ] **Step 1: 定義 feed schemas**

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class FeedItemType(str, Enum):
    PRACTICE = "practice"
    CHECKIN = "checkin"


class FeedTypeFilter(str, Enum):
    ALL = "all"
    PRACTICE = "practice"
    CHECKIN = "checkin"


class FeedQueryParams(BaseModel):
    cursor: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)
    keyword: Optional[str] = None
    tags: Optional[list[str]] = None
    type: FeedTypeFilter = FeedTypeFilter.ALL
```

- [ ] **Step 2: Commit**

```
feat(ai-backend): add feed schemas
```

### Task 9: Feed service

**Files:**
- Create: `daodao-ai-backend/src/services/feed/__init__.py`
- Create: `daodao-ai-backend/src/services/feed/feed_service.py`

- [ ] **Step 0: 建立 `__init__.py`**

```python
# src/services/feed/__init__.py
from .feed_service import FeedService

__all__ = ["FeedService"]
```

- [ ] **Step 1: 建立 feed service**

核心邏輯：
1. 查詢 public practices + public checkins（所屬 practice 為 public）
2. 按 `created_at` 排序（統一時間排序）
3. Cursor 分頁
4. Batch enrichment：reactions、comment_count、comment_preview、user info

```python
from sqlalchemy import text
from sqlalchemy.orm import Session
from src.schemas.feed import FeedItemType, FeedTypeFilter


class FeedService:
    @staticmethod
    def get_feed(
        db: Session,
        current_user_external_id: str | None = None,
        cursor: str | None = None,
        limit: int = 20,
        keyword: str | None = None,
        tags: list[str] | None = None,
        type_filter: FeedTypeFilter = FeedTypeFilter.ALL,
    ) -> dict:
        """
        統一 feed 查詢：混合 practice + checkin，按時間排序。

        Strategy:
        1. UNION query: practices + checkins → sorted by created_at
        2. Batch enrich: reactions, comments, user info
        3. Cursor pagination on created_at + id
        """
        items = []

        # --- 1. Build UNION query ---
        # Practice 子查詢：沿用現有 /v1/users/practices 的篩選邏輯
        # Checkin 子查詢：join practice 確認 privacy_status = 'public'

        feed_query = text("""
            WITH feed AS (
                SELECT
                    'practice' AS item_type,
                    p.id AS item_id,
                    p.created_at AS sort_time
                FROM practices p
                WHERE p.privacy_status = 'public'
                  AND p.status IN ('active', 'completed')
                  AND p.deleted_at IS NULL

                UNION ALL

                SELECT
                    'checkin' AS item_type,
                    c.id AS item_id,
                    c.created_at AS sort_time
                FROM practice_checkins c
                JOIN practices p ON p.id = c.practice_id
                WHERE p.privacy_status = 'public'
                  AND p.status IN ('active', 'completed')
                  AND p.deleted_at IS NULL
            )
            SELECT item_type, item_id, sort_time
            FROM feed
            WHERE (:cursor_time IS NULL OR sort_time < :cursor_time
                   OR (sort_time = :cursor_time AND item_id < :cursor_id))
            ORDER BY sort_time DESC, item_id DESC
            LIMIT :limit
        """)

        # --- 2. Parse cursor ---
        cursor_time = None
        cursor_id = None
        if cursor:
            # cursor format: "{iso_timestamp}_{id}"
            parts = cursor.rsplit("_", 1)
            cursor_time = parts[0]
            cursor_id = int(parts[1])

        rows = db.execute(feed_query, {
            "cursor_time": cursor_time,
            "cursor_id": cursor_id,
            "limit": limit + 1,  # fetch one extra to detect hasNext
        }).fetchall()

        has_next = len(rows) > limit
        rows = rows[:limit]

        # --- 3. Separate IDs by type for batch enrichment ---
        practice_ids = [r.item_id for r in rows if r.item_type == "practice"]
        checkin_ids = [r.item_id for r in rows if r.item_type == "checkin"]

        # --- 4. Batch fetch practice data ---
        practices_map = FeedService._batch_fetch_practices(db, practice_ids)

        # --- 5. Batch fetch checkin data ---
        checkins_map = FeedService._batch_fetch_checkins(db, checkin_ids)

        # --- 6. Batch fetch reactions ---
        all_target_ids = {
            "practice": practice_ids,
            "checkin": checkin_ids,
        }
        reactions_map = FeedService._batch_fetch_reactions(db, all_target_ids)

        # --- 7. Batch fetch comment counts + previews ---
        comments_map = FeedService._batch_fetch_comments(db, all_target_ids)

        # --- 8. Assemble feed items ---
        for row in rows:
            if row.item_type == "practice" and row.item_id in practices_map:
                item = practices_map[row.item_id]
                item["reactions"] = reactions_map.get(("practice", row.item_id), [])
                comment_data = comments_map.get(("practice", row.item_id), {})
                item["comment_count"] = comment_data.get("count", 0)
                items.append({"type": "practice", "data": item})

            elif row.item_type == "checkin" and row.item_id in checkins_map:
                item = checkins_map[row.item_id]
                item["reactions"] = reactions_map.get(("checkin", row.item_id), [])
                comment_data = comments_map.get(("checkin", row.item_id), {})
                item["comment_count"] = comment_data.get("count", 0)
                item["comment_preview"] = comment_data.get("preview", [])
                items.append({"type": "checkin", "data": item})

        # --- 9. Build next_cursor ---
        next_cursor = None
        if has_next and rows:
            last = rows[-1]
            next_cursor = f"{last.sort_time.isoformat()}_{last.item_id}"

        return {
            "data": items,
            "next_cursor": next_cursor,
        }

    @staticmethod
    def _batch_fetch_practices(db: Session, ids: list[int]) -> dict:
        """沿用現有 users.py 的 practice 查詢模式（參考 routers/users.py lines 100-135）"""
        if not ids:
            return {}
        from sqlalchemy.orm import joinedload
        from src.models.Practice import Practice
        from src.models.User import User
        from src.utils.orm_to_dict import orm_to_dict

        practices = (
            db.query(Practice)
            .options(joinedload(Practice.user).joinedload(User.contact))
            .filter(Practice.id.in_(ids))
            .all()
        )
        result = {}
        for p in practices:
            d = orm_to_dict(p)
            d["id"] = str(p.external_id)  # 前端用 external_id
            u = p.user
            d["user"] = {
                "id": str(u.external_id) if u and u.external_id else None,
                "name": u.nickname or "" if u else "",
                "photo_url": u.contact.photo_url if u and u.contact else None,
            }
            d["is_brewing"] = (
                d.get("privacy_status") == "delayed" and d.get("status") == "active"
            )
            result[p.id] = d
        return result

    @staticmethod
    def _batch_fetch_checkins(db: Session, ids: list[int]) -> dict:
        """Batch fetch checkins with practice title + user info"""
        if not ids:
            return {}
        from sqlalchemy import bindparam

        rows = db.execute(
            text("""
                SELECT
                    c.id,
                    c.checkin_date::text AS checkin_date,
                    c.mood,
                    c.note,
                    c.image_urls,
                    c.created_at,
                    p.id AS practice_internal_id,
                    p.external_id AS practice_external_id,
                    p.title AS practice_title,
                    u.external_id AS user_external_id,
                    u.nickname AS user_name,
                    ct.photo_url AS user_photo_url
                FROM practice_checkins c
                JOIN practices p ON p.id = c.practice_id
                JOIN users u ON u.id = c.user_id
                LEFT JOIN contacts ct ON ct.user_id = u.id
                WHERE c.id IN :ids
            """).bindparams(bindparam("ids", expanding=True)),
            {"ids": ids},
        ).fetchall()

        result = {}
        for r in rows:
            # checkin tags: 從 practice_checkin_tags 表取得（若存在）
            # 若無此表，則使用空陣列
            result[r.id] = {
                "id": str(r.id),
                "checkin_date": r.checkin_date,
                "mood": r.mood,
                "note": r.note or "",
                "tags": [],  # 需確認 checkin tags 來源，見 Task 11
                "image_urls": r.image_urls or [],
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "practice": {
                    "id": str(r.practice_external_id),
                    "title": r.practice_title,
                },
                "user": {
                    "id": str(r.user_external_id) if r.user_external_id else None,
                    "name": r.user_name or "",
                    "photo_url": r.user_photo_url,
                },
            }
        return result

    @staticmethod
    def _batch_fetch_reactions(db: Session, target_ids: dict) -> dict:
        """沿用現有 users.py 的 reactions 批次查詢模式（參考 routers/users.py lines 140-178）"""
        from sqlalchemy import bindparam

        result = {}
        for target_type, ids in target_ids.items():
            if not ids:
                continue
            rows = db.execute(
                text("""
                    SELECT
                        r.target_id,
                        r.reaction_type,
                        COUNT(*) AS cnt,
                        (SELECT u2.nickname FROM reactions r2
                         LEFT JOIN users u2 ON u2.id = r2.user_id
                         WHERE r2.target_type = :target_type
                         AND r2.target_id = r.target_id
                         AND r2.reaction_type = r.reaction_type
                         ORDER BY r2.created_at DESC LIMIT 1) AS latest_actor_name
                    FROM reactions r
                    WHERE r.target_type = :target_type
                    AND r.target_id IN :ids
                    GROUP BY r.target_id, r.reaction_type
                """).bindparams(bindparam("ids", expanding=True)),
                {"target_type": target_type, "ids": ids},
            ).fetchall()

            for r in rows:
                key = (target_type, r.target_id)
                if key not in result:
                    result[key] = []
                result[key].append({
                    "reaction_type": r.reaction_type,
                    "count": r.cnt,
                    "latest_actor_name": r.latest_actor_name,
                })
        return result

    @staticmethod
    def _batch_fetch_comments(db: Session, target_ids: dict) -> dict:
        """Batch fetch comment counts + 2 preview comments per item"""
        from sqlalchemy import bindparam

        result = {}
        for target_type, ids in target_ids.items():
            if not ids:
                continue

            # 1. Counts
            count_rows = db.execute(
                text("""
                    SELECT target_id, COUNT(*) AS cnt
                    FROM comments
                    WHERE target_type = :target_type
                    AND target_id IN :ids
                    AND visibility = 'public'
                    AND is_deleted = FALSE
                    GROUP BY target_id
                """).bindparams(bindparam("ids", expanding=True)),
                {"target_type": target_type, "ids": ids},
            ).fetchall()

            for r in count_rows:
                result[(target_type, r.target_id)] = {"count": r.cnt, "preview": []}

            # 2. Preview (latest 2 per target) using LATERAL join
            preview_rows = db.execute(
                text("""
                    SELECT t.target_id, c.id, c.content, c.created_at,
                           u.external_id AS user_external_id,
                           u.nickname AS user_name,
                           ct.photo_url AS user_photo_url
                    FROM unnest(:ids::int[]) AS t(target_id)
                    CROSS JOIN LATERAL (
                        SELECT id, content, created_at, user_id
                        FROM comments
                        WHERE target_type = :target_type
                        AND target_id = t.target_id
                        AND visibility = 'public'
                        AND is_deleted = FALSE
                        ORDER BY created_at DESC
                        LIMIT 2
                    ) c
                    JOIN users u ON u.id = c.user_id
                    LEFT JOIN contacts ct ON ct.user_id = u.id
                """),
                {"target_type": target_type, "ids": ids},
            ).fetchall()

            for r in preview_rows:
                key = (target_type, r.target_id)
                if key not in result:
                    result[key] = {"count": 0, "preview": []}
                result[key]["preview"].append({
                    "id": str(r.id),
                    "content": r.content,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "user": {
                        "id": str(r.user_external_id) if r.user_external_id else None,
                        "name": r.user_name or "",
                        "photo_url": r.user_photo_url,
                    },
                })
        return result
```

- [ ] **Step 2: Commit**

```
feat(ai-backend): add feed service with batch enrichment
```

### Task 10: Feed router

**Files:**
- Create: `daodao-ai-backend/src/routers/feed.py`
- Modify: `daodao-ai-backend/src/main.py`

- [ ] **Step 1: 建立 feed router**

```python
from fastapi import APIRouter, Query
from typing import Optional

from src.dependencies import SessionDep, UserDep, CacheDep
from src.response_template import api_response_decorator
from src.observability import observe_api
from src.schemas.feed import FeedTypeFilter
from src.schemas.pageInfo import CursorPaginationInfo
from src.services.feed.feed_service import FeedService

router = APIRouter(prefix="/v1/feed", tags=["feed"])


@router.get("", description="統一 Feed：混合展示實踐與打卡", response_model=None)
@api_response_decorator
@observe_api
def get_feed(
    db: SessionDep,
    current_user: UserDep,
    cache: CacheDep,
    cursor: Optional[str] = Query(None, description="分頁游標"),
    limit: int = Query(20, ge=1, le=100, description="每頁數量"),
    keyword: Optional[str] = Query(None, description="搜尋關鍵字"),
    tags: Optional[list[str]] = Query(None, description="標籤篩選"),
    type: FeedTypeFilter = Query(FeedTypeFilter.ALL, description="篩選類型"),
):
    result = FeedService.get_feed(
        db=db,
        current_user_external_id=current_user,
        cursor=cursor,
        limit=limit,
        keyword=keyword,
        tags=tags,
        type_filter=type,
    )

    next_cursor = result.get("next_cursor")
    return {
        "data": result["data"],
        "pagination": CursorPaginationInfo(
            cursors={
                "start": cursor,
                "end": next_cursor,
            },
            hasPrev=cursor is not None,
            hasNext=next_cursor is not None,
            count=len(result["data"]),
        ),
        "cache_hit": False,
    }
```

- [ ] **Step 2: 註冊 router 到 main.py**

```python
from src.routers import feed

app.include_router(feed.router, prefix="/api", tags=["feed"])
```

- [ ] **Step 3: Commit**

```
feat(ai-backend): add feed router endpoint
```

### Task 11: Feed keyword/tags 篩選

**Files:**
- Modify: `daodao-ai-backend/src/services/feed/feed_service.py`

- [ ] **Step 1: UNION query 加入 keyword 篩選**

Practice: 搜尋 `title` 和 `practice_action` 欄位（沿用 `routers/users.py` 的 `_apply_keyword_filter` 邏輯）。
Checkin: 搜尋 `note` 欄位。

在 UNION 的兩個子查詢中各加 `AND` 條件：
```sql
-- Practice 子查詢追加：
AND (:keyword IS NULL OR p.title ILIKE '%' || :keyword || '%' OR p.practice_action ILIKE '%' || :keyword || '%')

-- Checkin 子查詢追加：
AND (:keyword IS NULL OR c.note ILIKE '%' || :keyword || '%')
```

- [ ] **Step 2: UNION query 加入 tags 篩選**

先確認 DB 中是否有 `practice_checkin_tags` 表：
```bash
cd daodao-storage && grep -r "checkin_tag\|checkin.*tag" schema/ migrate/sql/
```

若無此表：checkin 的 tags 來自所屬 practice 的 tags（join `practice_tags` 表）。
若有此表：直接 join `practice_checkin_tags`。

Practice tags 篩選（沿用現有模式）：
```sql
-- Practice 子查詢追加：
AND (:has_tags = FALSE OR EXISTS (
    SELECT 1 FROM practice_tags pt WHERE pt.practice_id = p.id AND pt.tag = ANY(:tags)
))

-- Checkin 子查詢：透過 practice 的 tags 篩選
AND (:has_tags = FALSE OR EXISTS (
    SELECT 1 FROM practice_tags pt WHERE pt.practice_id = c.practice_id AND pt.tag = ANY(:tags)
))
```

- [ ] **Step 3: type filter**

用 Python 動態組裝 SQL，根據 `type_filter` 只包含對應的 UNION 分支：
```python
parts = []
if type_filter in (FeedTypeFilter.ALL, FeedTypeFilter.PRACTICE):
    parts.append(practice_subquery)
if type_filter in (FeedTypeFilter.ALL, FeedTypeFilter.CHECKIN):
    parts.append(checkin_subquery)
feed_cte = " UNION ALL ".join(parts)
```

- [ ] **Step 4: Commit**

```
feat(ai-backend): add keyword, tags, and type filter to feed
```

### Task 12: AI backend 測試

**Files:**
- Create: `daodao-ai-backend/tests/routers/test_feed.py`

- [ ] **Step 1: 寫 feed endpoint 測試**

```python
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from src.main import app
from src.dependencies import get_current_user, get_db_session, get_cache_client


@pytest.fixture
def client(monkeypatch):
    app.dependency_overrides[get_current_user] = lambda: "user-ext-1"
    app.dependency_overrides[get_db_session] = lambda: MagicMock()
    app.dependency_overrides[get_cache_client] = lambda: MagicMock()
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestFeedEndpoint:
    def test_returns_200_with_mixed_feed(self, client):
        with patch("src.routers.feed.FeedService.get_feed") as mock:
            mock.return_value = {
                "data": [
                    {"type": "practice", "data": {"id": "uuid-1", "title": "Test"}},
                    {"type": "checkin", "data": {"id": "1", "mood": "happy"}},
                ],
                "next_cursor": "2026-03-25T00:00:00_1",
            }
            resp = client.get("/api/v1/feed")
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert len(body["data"]) == 2

    def test_type_filter_practice_only(self, client):
        with patch("src.routers.feed.FeedService.get_feed") as mock:
            mock.return_value = {"data": [], "next_cursor": None}
            resp = client.get("/api/v1/feed?type=practice")
        assert resp.status_code == 200
        mock.assert_called_once()
        call_kwargs = mock.call_args
        assert call_kwargs.kwargs.get("type_filter") == FeedTypeFilter.PRACTICE

    def test_cursor_pagination(self, client):
        with patch("src.routers.feed.FeedService.get_feed") as mock:
            mock.return_value = {"data": [], "next_cursor": None}
            resp = client.get("/api/v1/feed?cursor=2026-03-25T00:00:00_1&limit=10")
        assert resp.status_code == 200
```

- [ ] **Step 2: 執行測試**

Run: `cd daodao-ai-backend && python -m pytest tests/routers/test_feed.py -v`
Expected: All tests pass

- [ ] **Step 3: Commit**

```
test(ai-backend): add feed endpoint tests
```

---

## Phase 4: daodao-f2e — 前端元件與整合

### Task 13: Feed hook 與 types

**Files:**
- Create: `daodao-f2e/packages/api/src/services/feed-hooks.ts`
- Modify: `daodao-f2e/packages/api/src/services/showcase-hooks.ts` (export IReactionCountItem)

- [ ] **Step 1: 確保 `fetchAiBackend` 和 `IReactionCountItem` 被 export**

在 `showcase-hooks.ts` 中：
1. 確認 `IReactionCountItem` 是 exported interface。若未 export，加上 export。
2. 確認 `fetchAiBackend`（或等效的 SWR fetcher 函式）被 export。`useFeed` 需要相同的 fetcher 來打 ai-backend API。若 `fetchAiBackend` 是 module-private，改為 export；或將其抽到共用的 `packages/api/src/lib/fetcher.ts`。

- [ ] **Step 2: 建立 feed-hooks.ts**

```typescript
import useSWRInfinite from "swr/infinite";
import type { IShowcasePractice, IReactionCountItem } from "./showcase-hooks";
import { fetchAiBackend } from "./showcase-hooks"; // 或從共用 fetcher 導入

// --- Types ---

// API mood values（對齊 ai-backend PracticeCheckIn model 的 CheckinMood enum）
export type ApiMoodType = "give_up" | "frustrated" | "bored" | "neutral" | "good" | "happy";

export interface IShowcaseCheckIn {
  id: string;
  checkin_date: string;
  mood: ApiMoodType;
  note: string;
  tags: string[];
  image_urls: string[];
  created_at: string;
  practice: {
    id: string;
    title: string;
  };
  user?: {
    id: string;
    name: string;
    photo_url?: string | null;
  };
  reactions?: IReactionCountItem[];
  comment_count?: number;
  comment_preview?: {
    id: string;
    content: string;
    created_at: string;
    user?: {
      id: string;
      name: string;
      photo_url?: string | null;
    };
  }[];
}

export type FeedItem =
  | { type: "practice"; data: IShowcasePractice }
  | { type: "checkin"; data: IShowcaseCheckIn };

export interface IFeedParams {
  keyword?: string;
  tags?: string[];
  type?: "all" | "practice" | "checkin";
}

// --- Hook ---

export function useFeed(params: IFeedParams) {
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.next_cursor) return null;

    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set("keyword", params.keyword);
    if (params.tags?.length) {
      for (const tag of params.tags) searchParams.append("tags", tag);
    }
    if (params.type && params.type !== "all") {
      searchParams.set("type", params.type);
    }
    if (pageIndex > 0 && previousPageData?.next_cursor) {
      searchParams.set("cursor", previousPageData.next_cursor);
    }

    const qs = searchParams.toString();
    return `/api/v1/feed${qs ? `?${qs}` : ""}`;
  };

  const { data, error, size, setSize, isLoading, isValidating } =
    useSWRInfinite(getKey, fetchAiBackend, {
      revalidateFirstPage: false,
    });

  const feedItems: FeedItem[] = data
    ? data.flatMap((page: any) => page.data ?? [])
    : [];

  const hasMore = data
    ? data[data.length - 1]?.next_cursor != null
    : false;

  const loadMore = () => setSize(size + 1);

  return {
    feedItems,
    error,
    isLoading,
    isValidating,
    hasMore,
    loadMore,
    size,
  };
}
```

- [ ] **Step 3: 更新 barrel files**

在 `packages/api/src/services/index.ts`（若存在）加入：
```typescript
export * from "./feed-hooks";
```

- [ ] **Step 4: Commit**

```
feat(f2e): add useFeed hook and feed types
```

### Task 14: CheckInShowcaseCard 元件

**Files:**
- Create: `daodao-f2e/apps/product/src/components/showcase/CheckInShowcaseCard.tsx`

- [ ] **Step 1: 建立 CheckInShowcaseCard**

參考 `PracticeShowcaseCard.tsx` 的結構模式，但使用 spec 定義的 7 層佈局與橘色系。

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@daodao/ui/components/avatar";
import { ReactionPickerButton } from "@/components/check-in/reactions/reaction-picker-button";
import { DialogOutlineSvg } from "@daodao/assets/svg";
import { mapApiMoodToMoodType, MOOD_OPTIONS } from "@/constants/mood";
import { formatRelativeTime } from "@/utils/format-time";
import { buildCheerDisplay } from "@/components/showcase/utils";
import { useReactions } from "@daodao/api/services/reaction-hooks";
import type { IShowcaseCheckIn } from "@daodao/api/services/feed-hooks";

interface CheckInShowcaseCardProps extends IShowcaseCheckIn {}

export function CheckInShowcaseCard(props: CheckInShowcaseCardProps) {
  const {
    id,
    checkin_date,
    mood,
    note,
    tags,
    image_urls,
    practice,
    user,
    reactions: initialReactions,
    comment_count,
    comment_preview,
  } = props;

  const router = useRouter();
  const frontendMood = mapApiMoodToMoodType(mood);
  const moodOption = frontendMood
    ? MOOD_OPTIONS.find((m) => m.id === frontendMood)
    : null;

  // Reaction 狀態管理 — 沿用 PracticeShowcaseCard 的模式
  // useReactions 取得 currentUserReaction + 即時 reactions 資料
  // 需確認 useReactions 的 props interface，傳入 targetType="checkin", targetId=id
  const {
    reactions,
    currentUserReaction,
    toggleReaction,
  } = useReactions({ targetType: "checkin", targetId: id });

  // 優先使用 hook 的即時資料，fallback 到 feed API 帶回的初始資料
  const displayReactions = reactions ?? initialReactions;
  const cheerDisplay = buildCheerDisplay(displayReactions);

  const handleCardClick = () => {
    router.push(`/practices/${practice.id}/check-ins/${id}`);
  };

  const handlePracticeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/practices/${practice.id}`);
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: card click
    // biome-ignore lint/a11y/noStaticElementInteractions: card click
    <div
      className="rounded-2xl bg-white p-4 shadow-sm border border-logo-orange/15 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* 1. Header: badge + mood */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-logo-orange/10 text-logo-orange text-xs font-medium">
            ✏️ 打卡
          </span>
          <span className="text-xs text-dark/50">{checkin_date}</span>
        </div>
        {moodOption && (
          <div className="flex items-center justify-center size-7 rounded-full bg-logo-orange/8">
            <moodOption.emoji className="size-4" />
          </div>
        )}
      </div>

      {/* 2. 實踐追溯連結 */}
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-logo-cyan underline mb-2"
        onClick={handlePracticeClick}
      >
        📌 {practice.title} ›
      </button>

      {/* 3. 用戶 + 內容 */}
      {user && (
        <div className="flex gap-2 mb-2">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={user.photo_url ?? undefined} />
            <AvatarFallback>{user.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-dark">{user.name}</p>
            <p className="text-sm text-dark line-clamp-2">{note}</p>
          </div>
        </div>
      )}

      {/* 4. 圖片縮圖 */}
      {image_urls?.length > 0 && (
        <div className="flex gap-2 mb-2">
          {image_urls.slice(0, 3).map((url) => (
            <div
              key={url}
              className="size-16 rounded-lg bg-logo-orange/6 overflow-hidden"
            >
              <img
                src={url}
                alt=""
                className="size-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* 5. Tags */}
      {tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded-full bg-primary-lightest text-logo-cyan"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 6. Reaction bar */}
      <div
        className="flex items-center justify-between pt-3 border-t border-[#E4EAE9]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ReactionPickerButton — 沿用 PracticeShowcaseCard 的 props 模式：
            variant="summary"
            selectedReactions={currentUserReaction ? [currentUserReaction] : []}
            onToggle={toggleReaction}
            displayReactions={displayReactions}
            totalCount={displayReactions?.reduce((sum, r) => sum + (r.count ?? 0), 0) ?? 0}
            firstReactorName={cheerDisplay?.displayText}

            注意：確認 PracticeShowcaseCard 實際傳給 ReactionPickerButton 的 props，
            然後在此處用完全相同的模式。useReactions hook 也需確認是否接受
            targetType="checkin"（見 Task 17）。*/}
        <ReactionPickerButton
          variant="summary"
          selectedReactions={currentUserReaction ? [currentUserReaction] : []}
          onToggle={toggleReaction}
          displayReactions={displayReactions}
          totalCount={displayReactions?.reduce((sum, r) => sum + (r.count ?? 0), 0) ?? 0}
          firstReactorName={cheerDisplay?.displayText}
        />
        <div className="flex items-center gap-1 text-xs text-dark/50">
          <DialogOutlineSvg className="size-4" />
          <span>{comment_count ?? 0}</span>
        </div>
      </div>

      {/* 7. 留言預覽 */}
      {comment_preview && comment_preview.length > 0 && (
        <div className="pt-3 border-t border-[#E4EAE9] space-y-2">
          {comment_preview.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2">
              <Avatar className="size-6 shrink-0">
                <AvatarImage src={comment.user?.photo_url ?? undefined} />
                <AvatarFallback>{comment.user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-xs">
                <span className="font-medium text-[#295E5C]">{comment.user?.name}</span>
                {" "}
                <span className="text-dark">{comment.content}</span>
                <span className="ml-1 text-[#9FB5B8]">
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

> 注意：上方程式碼為參考骨架。實作時需要：
> 1. 確認 import paths 正確（SVG components、mood emoji 等）
> 2. 讀取 `PracticeShowcaseCard.tsx` 確認 `useReactions` + `ReactionPickerButton` 的實際 props 模式，完整複製
> 3. 確認 `buildCheerDisplay` 的回傳值格式

- [ ] **Step 2: 更新 barrel file**

若 `apps/product/src/components/showcase/index.ts` 存在，加入：
```typescript
export * from "./CheckInShowcaseCard";
```

- [ ] **Step 3: Commit**

```
feat(f2e): add CheckInShowcaseCard component
```

### Task 15: PracticeShowcaseCard 新增類型 badge

**Files:**
- Modify: `daodao-f2e/apps/product/src/components/showcase/PracticeShowcaseCard.tsx`

- [ ] **Step 1: 在 header row 加入「實踐」badge**

在現有 status badge 之前加入類型 badge：

```tsx
{/* 類型 badge — 新增 */}
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-light-blue text-logo-cyan text-xs font-medium">
  🚩 實踐
</span>
{/* 現有 status badge — 改為次級 */}
<Badge variant={...} className="text-[10px] bg-primary-lightest">
  {statusLabel}
</Badge>
```

- [ ] **Step 2: Commit**

```
feat(f2e): add practice type badge to PracticeShowcaseCard
```

### Task 16: 主頁靈感 tab 整合 useFeed

**Files:**
- Modify: `daodao-f2e/apps/product/src/app/[locale]/(with-layout)/page.tsx`

- [ ] **Step 1: 導入新 hook 和元件**

```typescript
import { useFeed } from "@daodao/api/services/feed-hooks";
import { CheckInShowcaseCard } from "@/components/showcase/CheckInShowcaseCard";
```

- [ ] **Step 2: 替換靈感 tab 的資料來源**

將 `useShowcaseFeed(feedParams)` 替換為 `useFeed(feedParams)`：

```typescript
// 原本：
// const { practices, isLoading, hasMore, loadMore } = useShowcaseFeed(feedParams);

// 改為：
const { feedItems, isLoading, hasMore, loadMore } = useFeed({
  keyword: feedParams.keyword,
  tags: feedParams.tags,
  // type 預設 "all"
});
```

- [ ] **Step 3: 替換渲染邏輯**

```tsx
{/* 原本：practices.map(...) */}
{feedItems.map((item) => {
  switch (item.type) {
    case "practice":
      return item.data.is_brewing ? (
        <BrewingCard key={`p-${item.data.id}`} {...item.data} />
      ) : (
        <PracticeShowcaseCard key={`p-${item.data.id}`} {...item.data} />
      );
    case "checkin":
      return (
        <CheckInShowcaseCard key={`c-${item.data.id}`} {...item.data} />
      );
  }
})}
```

- [ ] **Step 4: 確認 filter bar 相容性**

現有 `ShowcaseFilterBar` 的 `duration_min/max` 和 `status` filter 在新 feed API 中可能不支援（spec 只列了 keyword、tags、type）。確認是否需要：
- 暫時移除不支援的 filter
- 或在 feed API 加入支援

- [ ] **Step 5: Commit**

```
feat(f2e): integrate useFeed hook into inspiration tab
```

### Task 17: 前端 Reaction/Comment hooks 支援 checkin targetType

**Files:**
- Modify: `daodao-f2e/packages/api/src/services/reaction-hooks.ts`（或 reaction 相關 hooks 檔案）— targetType union 加入 `"checkin"`
- Modify: `daodao-f2e/packages/api/src/services/comment-hooks.ts`（或 comment 相關 hooks 檔案）— targetType union 加入 `"checkin"`

> 注意：`reaction-type.ts` 只定義 reaction 類型（encourage、fire 等），不定義 targetType。targetType 的 type restriction 在 API hooks 層。

- [ ] **Step 1: 找到 reaction hooks 中的 targetType 定義**

```bash
cd daodao-f2e && grep -r "targetType.*practice.*comment\|ReactionTargetType" packages/api/src/ apps/product/src/
```

在找到的檔案中，將 targetType union 從 `"practice" | "comment"` 擴展為 `"practice" | "comment" | "checkin"`。

- [ ] **Step 2: 找到 comment hooks 中的 targetType 定義**

同理搜尋 comment targetType 定義，加入 `"checkin"`。

- [ ] **Step 3: Commit**

```
feat(f2e): support checkin targetType in reaction components
```

---

## Phase 5: 驗證與收尾

### Task 18: 端對端手動驗證

- [ ] **Step 1: 執行 migration**

```bash
cd daodao-storage && <migration command>
```

- [ ] **Step 2: 啟動 daodao-server，測試 checkin reaction/comment**

```bash
# Create reaction on checkin
curl -X POST http://localhost:3001/api/v1/reactions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"targetType": "checkin", "targetId": "1", "reactionType": "fire"}'

# Create comment on checkin
curl -X POST http://localhost:3001/api/v1/comments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"targetType": "checkin", "targetId": "1", "content": "test comment"}'
```

- [ ] **Step 3: 啟動 daodao-ai-backend，測試 feed endpoint**

```bash
curl http://localhost:8000/api/v1/feed
curl http://localhost:8000/api/v1/feed?type=checkin
curl http://localhost:8000/api/v1/feed?type=practice
curl http://localhost:8000/api/v1/feed?cursor=<cursor>&limit=5
```

- [ ] **Step 4: 啟動前端，驗證靈感頁 feed 混合展示**

確認：
- 打卡卡片與實踐卡片交錯顯示
- 打卡卡片為橘色系，實踐卡片為青色系
- 點擊打卡卡片 → 打卡詳情頁
- 點擊實踐追溯連結 → 實踐頁面
- Reaction 互動正常
- 無限滾動正常

- [ ] **Step 5: Commit any fixes found during verification**
