# 實踐詳情：打卡記錄 Tab 顯示「(4)」但下方沒有任何打卡卡片

> 最後更新：2026-05-07
>
> 對應分支：`daodao-f2e@prod`、`daodao-server@production`
>
> 重現案例：<https://app.daodao.so/en/practices/fcb4ce9e-f75b-4e68-999a-197b204f32e0>

---

## 1. 症狀

進入實踐詳情頁切到「打卡紀錄」Tab：

- Tab 標題顯示 `打卡紀錄(4)`，計數正確
- 心情排行（心情排行）所有 emoji 數量都顯示 `0`
- Mood ranking 下方原本應該渲染 4 張漂浮的打卡卡片（`CheckInStack`），實際上**完全沒有任何卡片**
- 無 console error、無 network error、API 回 200

對應截圖：頁面卡在「心情排行」區塊就結束，Matter.js 容器沒有任何內容。

---

## 2. API 實際回傳

`GET https://server.daodao.so/api/v1/practices/fcb4ce9e-f75b-4e68-999a-197b204f32e0/checkins?...`

```json
{
  "success": true,
  "data": [
    {
      "id": 143,
      "practiceId": 60,
      "userId": 322,
      "checkinDate": "2026-05-07",
      "imageUrls": [],
      "ogImageUrl": null,
      "tags": [],
      "createdAt": "2026-05-07T10:44:10.537Z"
    },
    { "id": 144, "practiceId": 60, "userId": 322, "checkinDate": "2026-05-07", "imageUrls": [], "ogImageUrl": null, "tags": [], "createdAt": "2026-05-07T10:44:17.140Z" },
    { "id": 145, "practiceId": 60, "userId": 322, "checkinDate": "2026-05-07", "imageUrls": [], "ogImageUrl": null, "tags": [], "createdAt": "..." },
    { "id": 146, "practiceId": 60, "userId": 322, "checkinDate": "2026-05-07", "imageUrls": [], "ogImageUrl": null, "tags": [], "createdAt": "..." }
  ],
  "pagination": { "totalItems": 4, ... }
}
```

關鍵觀察：4 筆 check-in 物件都**缺少 `mood`、`note`、`updatedAt` 三個欄位**。
（與既有的 `docs/troubleshooting/checkin-missing/bug.md` 紀錄到的「部分 record 缺 mood」是同一類問題。）

---

## 3. 根本原因

### 3.1 前端會把「沒有 mood」的記錄整筆過濾掉

`apps/product/src/components/check-in/display/check-in-stack.tsx`（prod 分支）：

```ts
const items: ICheckInItem[] = useMemo(() => {
  if (!checkInsData?.data) return [];

  return checkInsData.data
    .map((checkIn) => {
      const moodType = mapApiMoodToMoodType(checkIn.mood);
      // 如果沒有心情類型，跳過這個打卡記錄
      if (!moodType) {
        return null;
      }
      return {
        id: String(checkIn.id),
        date: formatCheckInDate(checkIn.checkinDate),
        mood: moodType,
        content: checkIn.note || "",
      };
    })
    .filter((item): item is ICheckInItem => item !== null);
}, [checkInsData]);

const count = items.length;
// ...
if (count === 0) {
  return null;  // ← 整個 stack 不渲染
}
```

`mapApiMoodToMoodType`（`apps/product/src/constants/mood.ts`）：

```ts
export const mapApiMoodToMoodType = (apiMood: ApiMoodType | undefined): MoodType | null => {
  if (!apiMood) return null;
  return ApiMoodToMoodTypeMap[apiMood] ?? null;
};
```

→ `mood` 為 `undefined` / `null` / 不在 enum 內 → `moodType = null` → 該 check-in 被 `.filter()` 移除 → `count === 0` → `CheckInStack` 整個 `return null`。

`CheckInRecordCard`（心情排行）也用同一個 `mapApiMoodToMoodType`，沒 mood 的記錄不會被計入任何 emoji，所以 6 個 emoji 全部 `0`。

但是 Tab 計數來源是 API `pagination.totalItems` 或 `checkInsData.data.length`，不經過 mood 過濾，所以仍正確顯示 `(4)`。

### 3.2 為什麼 API 回傳沒有 mood ── 線上四道防線全部失守

> ⚠️ **第一輪分析犯的錯**：一開始我讀的是本地 stale 的 `production` branch，看到 form schema 有 `refine(mood !== null)`、server 有 conflict check，誤判「儲存沒壞」。
>
> 實際上線上 daodao-server 跑的是 `origin/production` HEAD `c670217`（VPS image `vincentxxx/app:production-c6702172...`），daodao-f2e 跑的是 `origin/prod` HEAD `8fb940cf`（VPS image `vincentxu77/daodao-product:prod-8fb940cf...`）── 兩邊都比我本地讀的版本新。當年我筆記的「強制必填」與「conflict check」都已經被拆掉了。

線上實際的寫入鏈：

| 層 | 檔案 | 線上實際寫法 | 對 NULL/空白的處理 |
|---|---|---|---|
| Form schema | `apps/product/src/components/check-in/form/schema.ts`（`origin/prod`）| `mood: z.enum(...).nullable().default(null)`、`tags: z.array(...).default([])`、`description: z.string().max(300).default("")` ── **沒有任何 refine / min(1)** | mood = null、tags = []、description = "" 都通過 |
| Sheet onSubmit | `apps/product/src/components/check-in/form/check-in-sheet.tsx`（`origin/prod`）| `await onComplete({ mood: values.mood, tags, description, media, ... })` ── **沒有 `if (values.mood === null) return;` 那道擋** | 空白 form 直接送 |
| Submit hook | `apps/product/src/components/check-in/form/hooks/use-check-in-submit.ts` | `const apiMood = mapMoodTypeToApiMood(data.mood)`，`mood = null → undefined` | `apiMood = undefined` |
| 組 multipart | `packages/api/src/services/practice-hooks.ts` | `if (data.mood) formData.append("mood", data.mood)` ── undefined 為 falsy | mood 完全不 append |
| 同 multipart 處理 description | 同上 | `if (data.description) formData.append("note", data.description)` ── 空字串為 falsy | note 完全不 append |
| Controller 解析 | `daodao-server/src/controllers/practice.controller.ts` `parseCheckInFormData` | `if (value === undefined \|\| value === null \|\| value === '') continue;` | 沒帶就 skip |
| Server 驗證 | `daodao-server/src/validators/practice.validators.ts` `checkInSchema` | `mood: z.enum(...).optional()`、`note: z.string().max(300).optional()` | 缺欄位通過 |
| Service 寫 DB | `daodao-server/src/services/practice-checkin.service.ts` `createCheckIn` | `data: { mood: data.mood, note: data.note, ... }` ── undefined 由 Prisma 落到 column default | DB column = NULL |
| DB column | `practice_checkins.mood / note` (`String?`) | nullable | 接受 NULL |
| DB CHECK | `practice_checkins_mood_check` enum | CHECK 對 NULL 永遠 true | NULL 通過 |

**結論**：使用者只要打開打卡 sheet、什麼都不填，直接按「完成打卡」，就會送出一個 mood/note/tags/media 全空的 request；後端不檢查、DB 不擋；存成一筆全空白 record。

### 3.3 為什麼會塞 4 筆同日打卡 ── conflict check 也被拆了

線上 `daodao-server origin/production` 的 `createCheckIn` 已經沒有「同日不能重複打卡」的擋阻：

```ts
// 線上實際的 createCheckIn（origin/production:c670217）
if (!canCheckIn(practice.status as PracticeStatusType)) {
  throw new ConflictError('此實踐狀態不允許打卡');
}

// 用於日期位移與 checkin_date（UTC 零點）
const today = new Date();
today.setUTCHours(0, 0, 0, 0);

// 取得實踐配置用於進度計算   ← 直接接這行，原本「今日已完成簽到」的整段檢查不見了
const durationDays = ...
```

這段 conflict check 是被 commit `ba0af56 feat: 移除打卡間隔限制，允許隨時打卡`（2026-02-11，by xiaoxu）刻意拿掉的，commit message 寫：

> - 在打卡服務中移除 24 小時打卡間隔限制，使用者現在可以隨時進行打卡。
> - 更新 `validateDailyCheckIn` 函數，始終返回 true，簡化驗證邏輯。

dev 上拆掉之後，2026-03-29 的 PR #207（`d5cb06f`）把 dev → production，自此線上正式站就不擋同日重複打卡。

加上 §3.5 確認的「線上 DB 完全沒有 `(practice_id, checkin_date)` unique index」── service 防線砍了、DB 防線本來就沒建 ── **使用者連按 N 次「完成打卡」按鈕，就 N 筆 record 全部寫進 DB**。

practice 60 那 4 筆 createdAt 間隔 +7s/+8s/+278s 完全吻合「真人連續按按鈕」的節奏（不是毫秒級 race，也不是腳本批次塞）。

### 3.4 是哪個 commit 拆掉前端 form 的擋阻

`apps/product/src/components/check-in/form/schema.ts` 的 commit history（origin/prod）：

```text
e3f5d68b 2026-03-19 feat(check-in): 新增反思問題功能並改善表單欄位
7fa08c36 style: formatted coding style
415e7a53 feat(check-in): refactor form & add API integration
```

`e3f5d68b` 的 commit message 只提「新增反思問題、隱私欄位、改善 UI 互動體驗」，但 diff 裡**順手把 `refine(mood !== null)`、`tags.min(1)`、`description.min(1)` 全部拿掉了**，message 沒提這件事。

這是非預期副作用 ── 原本設計可能是想把「填心情」做成兩階段（從 `use-check-in-submit.ts` 看到 Phase 2 `onOpenPhase2` callback 的存在，意圖應該是先快速打卡、之後再補心得），但前端 schema 一鬆綁、Sheet 的 onSubmit guard 也跟著拿掉、後端又沒守住 ── 變成「什麼都不填也能成功打卡」。

### 3.4a 真兇總表

| 防線 | 應該做什麼 | 線上實際 | 何時被拆 |
|---|---|---|---|
| Form schema | mood / tags / description 必填 | 都改 nullable / default 空 | `e3f5d68b` (2026-03-19) |
| Sheet onSubmit | `if (mood === null) return;` | 沒了 | `e3f5d68b` 前後 |
| Server checkInSchema | mood 必填 | `.optional()` | 一直就是 |
| Server createCheckIn | 同日已打卡擋下 | conflict check 整段拆 | `ba0af56` (2026-02-11) |
| DB unique constraint | `(practice_id, checkin_date)` 擋重複 | 沒建 | schema → DB 從來沒 sync |
| DB CHECK on mood | enum 限定 | CHECK 對 NULL = TRUE，擋不了 NULL | 設計如此 |

→ 6 道防線全失守，使用者隨便連按按鈕就能塞空白 record。

### 3.5 線上 DB 實際盤點（2026-05-07，prod `pg-prod` container）

連 prod DB 跑 read-only SQL（連線方式：`ssh daodao "docker exec -i pg-prod psql -U $USER -d $DB"`，憑證在 `daodao-storage/.env`）。

**(a) 線上 `practice_checkins` 完全沒有 unique index**

```text
\d practice_checkins
Indexes:
    "practice_checkins_pkey" PRIMARY KEY, btree (id)
    "idx_practice_checkins_date" btree (checkin_date)
    "idx_practice_checkins_practice_id" btree (practice_id)
    "idx_practice_checkins_user_id" btree (user_id)
Check constraints:
    "chk_image_urls_limit" CHECK (array_length(image_urls, 1) <= 3 OR image_urls IS NULL)
    "practice_checkins_mood_check" CHECK (mood::text = ANY (ARRAY['give_up','frustrated','bored','neutral','good','happy']))
```

→ **Prisma schema 上的 `@@unique([practice_id, checkin_date])` 從來沒落地到線上 DB**（schema drift）。任何人 / 腳本 / 並發請求都能塞重複 row。
→ `mood` CHECK constraint 對 enum 有效，但 **CHECK 對 NULL 永遠 true**，所以 NULL 不會被擋。

**(b) 重複組數一覽（全站 13 組）**

```text
 practice_id | checkin_date | count
-------------+--------------+-------
          33 | 2026-03-24   |     7
          60 | 2026-05-07   |     4   ← 本次案例
          56 | 2026-05-05   |     3
          40 | 2026-04-08   |     2
          51 | 2026-05-05   |     2
          41 | 2026-04-08   |     2
          36 | 2026-03-30   |     2
           7 | 2026-02-16   |     2
          14 | 2026-02-28   |     2
          42 | 2026-04-27   |     2
           5 | 2026-02-16   |     2
          42 | 2026-04-13   |     2
           1 | 2026-02-16   |     2
```

→ 不是孤例。歷史上一直有重複，最嚴重 practice 33 同日 7 筆。

**(c) NULL 規模**

```text
 null_mood | null_note | total
-----------+-----------+-------
        11 |        39 |   146
```

→ 全站 146 筆中 **11 筆 NULL mood（7.5%）**。比例不算大但確實在發生。

**(d) practice 60 那 4 筆 raw**

```text
 id  | practice_id | user_id | checkin_date | mood | note | image_urls | og_image_url |         created_at         | updated_at
-----+-------------+---------+--------------+------+------+------------+--------------+----------------------------+------------
 143 |          60 |     322 | 2026-05-07   |      |      | {}         |              | 2026-05-07 10:44:10.537+00 |
 144 |          60 |     322 | 2026-05-07   |      |      | {}         |              | 2026-05-07 10:44:17.14 +00 |
 145 |          60 |     322 | 2026-05-07   |      |      | {}         |              | 2026-05-07 10:44:25.027+00 |
 146 |          60 |     322 | 2026-05-07   |      |      | {}         |              | 2026-05-07 10:49:03.338+00 |
```

→ mood / note / og_image_url / updated_at 全空，image_urls 空陣列。
→ 間隔 +7s / +8s / +278s 的節奏 ── 完全吻合「真人連續按 4 次按鈕」（連線上 server 已沒有 conflict check 擋他、DB 也沒有 unique 擋他、form 也沒擋他什麼都不填）。**不是腳本、不是 race、不是另一個 endpoint，就是 form path 本身**。

### 3.6 結論

| 問題 | 是否成立 |
|---|---|
| 「選心情的儲存壞了」 | **壞了**，但不是「選了心情但沒存」── 是 **使用者根本不需要選心情就能存**。前端 form schema、Sheet onSubmit、後端 validator 全都 optional，server conflict check 也被刻意拆掉，DB 沒 unique 也沒 NOT NULL ── 等於沒有任何防線 |
| 「線上 DB 缺 unique constraint」 | **成立**。Prisma schema 寫了 `@@unique([practice_id, checkin_date])`，DB 沒建 |
| 「是別的路徑塞進去的」 | **不成立**。線上 server 只有 `POST /:id/checkins` 一支 create endpoint，4 筆完全是經 form path 寫進去的（form 與 server 都沒擋空白與重複）|
| 「前端 UI 對 NULL mood 過度防禦」 | **成立**。`CheckInStack` / `CheckInRecordCard` 應對 NULL 容錯，而不是整筆隱藏 |

---

## 4. 影響範圍

只要任何一筆 `practice_checkins.mood` 為 NULL：

| 位置 | 影響 |
|---|---|
| `CheckInStack`（漂浮卡片牆） | 該筆完全不顯示 |
| `CheckInRecordCard`（心情排行） | 不計入任何 emoji 計數 |
| 打卡記錄 Tab 計數 | 正常顯示（沒受影響）|
| `check-ins/[checkInId]` 詳情頁 | 需另外驗證（本次未檢） |

→ 如果一個實踐**所有**打卡都沒 mood，使用者看到的就是「Tab 寫 4 但下面空空」，明顯 bug。

---

## 5. 修復計畫

### 5.1 緊急止血（讓使用者馬上看到打卡卡片）

選一個就好：

**A. 前端容錯（不動 DB）**

`CheckInStack` 的 filter 改成「mood 缺失就 fallback 到 neutral」而不是 `return null`，並把 `count === 0 → return null` 拿掉（既然 tab 已經顯示 4 筆了，下方至少要呈現點什麼）。`CheckInRecordCard` 同理。

**B. backfill 髒資料的 mood**

線上跑（從 daodao mac 直接執行；憑證從 `daodao-storage/.env` 讀）：

```bash
# 1) 先 dry-run 看會動到的 row（11 筆）
set -a; source ~/Projects/daodao/daodao-storage/.env; set +a
ssh daodao "docker exec -i pg-prod psql -U $DAO_POSTGRES_USER -d $DAO_POSTGRES_DB" <<'SQL'
SELECT id, practice_id, user_id, checkin_date, note, created_at
FROM practice_checkins
WHERE mood IS NULL
ORDER BY created_at;
SQL

# 2) 確認後再 commit（包在 transaction 裡，安全）
ssh daodao "docker exec -i pg-prod psql -U $DAO_POSTGRES_USER -d $DAO_POSTGRES_DB" <<'SQL'
BEGIN;

-- backfill 全站 NULL mood 為 'neutral'（CHECK constraint 接受 neutral）
UPDATE practice_checkins
SET mood = 'neutral', updated_at = now()
WHERE mood IS NULL;

-- 驗證：應該 0 筆
SELECT count(*) AS still_null FROM practice_checkins WHERE mood IS NULL;

COMMIT;
SQL
```

預期結果：
- Step 1 列出 11 筆（含本案 practiceId=60 的 4 筆 + 其他 7 筆）
- Step 2 `UPDATE 11`、`still_null = 0`、`COMMIT`

如果 dry-run 看到的 row 跟預期不符（例如數量爆增），把 step 2 整段不要跑、改成 `ROLLBACK`。

⚠️ 短期止血用，**根本問題（為什麼會有 NULL mood 寫入）沒解**，§5.2 才是根本修。

> A 跟 B 建議都做：A 是前端永久防呆（避免下一次出現空白 record 又開天窗），B 是清現有的 11 筆髒資料讓使用者馬上看得到。

### 5.2 把 6 道防線補回來（根本解）

對應 §3.4a 真兇總表，每道防線都要決定「該不該補回」。產品先決定「打卡到底要不要強制選心情」與「同日能不能重複打卡」這兩件事，再依決定動 code：

**情境 A：打卡 = 必須選心情，且同日只能 1 次**（傳統打卡語意）

| 動作 | 檔案 | 改法 |
|---|---|---|
| Form schema 加回必填 | `daodao-f2e/apps/product/src/components/check-in/form/schema.ts` | `mood: z.enum(...).nullable().refine(val => val !== null, "請選擇心情")`、`tags.min(1)`、`description.min(1)` ── 這幾行就是 `e3f5d68b` 不小心拆掉的 |
| Sheet onSubmit guard 加回 | `apps/product/src/components/check-in/form/check-in-sheet.tsx` | `if (values.mood === null) return;`（其實有 zodResolver 之後可省，但雙保險）|
| Server checkInSchema 改必填 | `daodao-server/src/validators/practice.validators.ts` | `mood: z.enum(...)`（拿掉 `.optional()`）、`note: z.string().min(1).max(300)` |
| Server createCheckIn 加回 conflict check | `daodao-server/src/services/practice-checkin.service.ts` | 把 `ba0af56` 拆掉的 `existingCheckIn` block 加回；或改為 `upsert by (practice_id, user_id, checkin_date)` 防 race |
| DB 補 unique constraint | `daodao-storage` migration | 見 §5.3 |
| DB 把 mood 改 NOT NULL（可選）| migration | `ALTER TABLE practice_checkins ALTER COLUMN mood SET NOT NULL`（前提是 backfill 完）|

**情境 B：產品就是要「免心情快速打卡 + 之後再補心得」**（從 `use-check-in-submit.ts` 的 `onOpenPhase2` 看到的設計意圖）

則 NULL mood 是合法狀態，但**前端不能因為 NULL mood 就把 record 整筆隱藏**：

| 動作 | 檔案 | 改法 |
|---|---|---|
| 前端容錯（必做）| §5.5 | mood 為 null 時 fallback 到 neutral / 顯示「待補心情」貼紙，**不要 filter 掉** |
| Phase 2 補完流程 | `apps/product/src/components/check-in/form/hooks/use-check-in-submit.ts` | `onOpenPhase2` 真的開出第二階段表單，引導補 mood / note |
| 同日重複打卡是不是真的合法 | 產品決定 | 如果不合法就要補 §5.3 unique；如果合法就要解決 list endpoint 是否要 group by 日期顯示 |

無論 A / B，**§5.3 的 unique constraint 都該補**（要嘛擋重複、要嘛 schema 反映實際允許重複），現在這種「Prisma 寫了但 DB 沒建」是最糟的狀態 ── code 以為有保護其實沒有。

### 5.3 補 unique constraint（schema → DB drift）

先去重，再建 unique index：

```sql
-- 5.3.1 預覽要刪的「重複 row」── 同 (practice_id, checkin_date) 只留 id 最小的那筆
SELECT id, practice_id, user_id, checkin_date, mood, note
FROM practice_checkins pc
WHERE EXISTS (
  SELECT 1 FROM practice_checkins x
  WHERE x.practice_id = pc.practice_id
    AND x.checkin_date = pc.checkin_date
    AND x.id < pc.id
)
ORDER BY practice_id, checkin_date, id;

-- 5.3.2 真的去重（先備份！）
DELETE FROM practice_checkins pc
WHERE EXISTS (
  SELECT 1 FROM practice_checkins x
  WHERE x.practice_id = pc.practice_id
    AND x.checkin_date = pc.checkin_date
    AND x.id < pc.id
);

-- 5.3.3 建 unique index（與 Prisma schema 對齊）
ALTER TABLE practice_checkins
  ADD CONSTRAINT practice_checkins_practice_id_checkin_date_key
  UNIQUE (practice_id, checkin_date);
```

> 注意：上面「同日只留最小 id」是粗暴策略。如果其中重複 row 之一**有** mood / note 而其他沒有，應該保留有資料的那筆，例如：
>
> ```sql
> -- 同日多筆時，保留 mood IS NOT NULL 且 note IS NOT NULL 的、其餘刪
> ```
>
> 上線前要逐組看 13 組重複的 raw 內容，決定哪筆留下。

### 5.4 把 schema drift 補進 migration

`daodao-storage/migrate/sql/`（或對應 migration 目錄）新增一個 migration 檔，內容就是 5.3.2 + 5.3.3。並更新後端 Prisma migration history（如果用 Prisma migrate）。

### 5.5 前端 UI 防呆（永久）

不論後端怎麼修，前端不該因為一筆髒資料就整個 stack 消失。改：

- `CheckInStack`：mood 為 falsy 時 fallback 到 `neutral`，不 filter 掉
- `CheckInRecordCard`：mood 為 falsy 時不計入心情排行，但**不要影響其他 record 的顯示**（目前邏輯本來就是這樣，沒問題）
- 「打卡紀錄」tab 計數與底下 stack 用同一個資料源 → 一致性

---

## 6. 驗證步驟

修復後：

1. 重新打開該 practice 詳情頁，「打卡紀錄」Tab 下方應出現 4 個漂浮 SVG 卡片
2. 「心情排行」對應 emoji 計數總和應 = 4
3. 重新打開打卡 Sheet，什麼都不填、直接按「完成打卡」：
   - 情境 A：應該被 form refine 擋下、退一步也會被 server checkInSchema 擋下回 400
   - 情境 B：應該成功寫入但 record 顯示「待補心情」並引導進 Phase 2
4. 連按 N 次「完成打卡」：應只產生 1 筆（被 service conflict check + DB unique 擋下，回 409）
5. 檢查 prod DB 不再增加 `mood IS NULL` 的 row（情境 A）或 NULL mood 仍存在但 UI 正常顯示（情境 B）：

   ```sql
   SELECT count(*) FROM practice_checkins WHERE mood IS NULL;
   ```

6. 檢查 prod DB 不再出現新的 `(practice_id, checkin_date)` 重複組（unique 補上後應為 0）：

   ```sql
   SELECT practice_id, checkin_date, count(*)
   FROM practice_checkins
   GROUP BY 1, 2
   HAVING count(*) > 1;
   ```

---

## 7. 相關檔案

- 前端：
  - `daodao-f2e/apps/product/src/components/check-in/display/check-in-stack.tsx`
  - `daodao-f2e/apps/product/src/components/check-in/display/check-in-record-card.tsx`
  - `daodao-f2e/apps/product/src/constants/mood.ts`
  - `daodao-f2e/apps/product/src/app/[locale]/practices/[id]/page.tsx`
- 後端：
  - `daodao-server/src/services/practice-checkin.service.ts`（`getCheckIns`、`createCheckIn`）
  - `daodao-server/src/validators/practice.validators.ts`（`checkInSchema`）
  - `daodao-server/prisma/schema.prisma`（`practice_checkins`）
- 既有相關文件：
  - `docs/troubleshooting/checkin-missing/bug.md`（同類問題的早期案例）
  - `docs/troubleshooting/checkin-error/bug.md`（`getCheckIns` response 驗證錯誤的歷史紀錄）
