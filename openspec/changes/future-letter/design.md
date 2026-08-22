## Context

Dao Dao 是 Next.js 15 前端 + Express.js 後端 + BullMQ 背景任務的架構。

**Codebase 現狀：**
- 後端使用 Express.js + Prisma ORM + Zod validator + BullMQ (Redis) job queue
- 已有 13+ BullMQ queues（email, notification, badge-award 等），delayed job 基礎設施成熟
- 通知 pipeline 完整：`notification-event.service.ts` → BullMQ → `notifications` 表 + email
- `practice_checkins` 表記錄打卡，`quiz_results` 記錄學習 DNA
- 前端 `future-letter-dialog.tsx` + `future-letter-timeline.tsx` 已建好 UI shell（`feat/letter-to-future-self` 分支），handler 為空 stub
- 無任何 future_letter / time_capsule 相關的 DB 表或 API

**可複用基礎：**
- BullMQ delayed job — 原生支援「N 秒後執行」，不需 cron polling
- `notification-event.service.ts` — 建立 event 後自動 fan-out 到 in-app + email
- `id-converter.service.ts` — external_id (UUID) ↔ internal id (INT) 轉換
- Express route/controller/service 三層架構 — 可直接照 `practice.routes.ts` 模式建新模組

---

## Goals / Non-Goals

**Goals:**
- 使用者可寫信給未來的自己（記錄當下狀態 + 給未來的話）
- 信件到期後由 timeline 的 delivered-unopened marker 安靜呈現，不建立 P1/email 通知
- 可存草稿、可寄出、可刪除
- 可關聯一個主題實踐
- 前端 UI 接上真實 API

**Non-Goals:**
- 信件公開分享
- AI 代寫信件內容
- 信件附件（圖片/檔案）

---

## Decisions

### D1：信件 scope 放 `/api/v1/me/future-letters`，不放 `/api/v1/future-letters`

**做法：** 所有 endpoint 掛在 `/me/` 前綴下，隱含 Owner-only 語意。

**原因：**
- 信件是純私人功能，不會有「查看別人的信」的需求
- 對齊現有 `/api/v1/me/practices`、`/api/v1/me/ideas` 慣例
- 不需額外的 ownership 檢查 middleware（`/me/` 語意已隱含）

**棄選：`/api/v1/future-letters` + ownership middleware**——增加 middleware 複雜度，且語意上這是「我的」資源。

### D2：排程送達用 BullMQ delayed job，不用 cron polling

**做法：** 信件寄出時，計算 `delayMs = deliver_at.getTime() - Date.now()`，呼叫 `futureLetterQueue.add('deliver', { letterId }, { delay: delayMs })`。

**原因：**
- BullMQ delayed job 精確到毫秒，不需每分鐘 poll DB
- 已有成熟的 queue 基礎設施（connection config、error handling、retry）
- 信件量不大（每人每月幾封），不會造成 Redis 記憶體壓力
- BullMQ 的 delayed job 在 server 重啟後自動恢復（存在 Redis 中）

**棄選：cron + DB polling（類似 `email-trigger.worker.ts`）**——每小時掃全表找到期信件，延遲最多 1 小時；且 cron 適合「批量規則比對」（email trigger），不適合「指定時間點單一事件」。

**風險：** Redis 重啟會遺失 delayed jobs。**緩解：** 新增啟動時 recovery 邏輯——server 啟動時掃 `status = 'scheduled' AND deliver_at <= now` 的信件，重新 enqueue 為即時 job。

### D3：軟刪除（status = deleted），不做硬刪除

**做法：** DELETE API 將 `status` 改為 `deleted`，不從 DB 移除記錄。列表 API 預設不回傳 `deleted` 狀態的信件。

**原因：**
- 使用者可能誤刪，保留恢復可能性
- scheduled 狀態的信件刪除時需同時移除 BullMQ job，硬刪除後無法追蹤
- 對齊平台整體資料保留策略

### D4：送達時間限制 3 天 ~ 90 天

**做法：** 後端 validator 限制 `deliver_at` 必須在 `now + 3 days`（含）到 `now + 90 days`（含）之間。UI 仍提供「7 天」快捷選項，自訂日期則可選完整 3-90 天範圍。

**原因：**
- FRD v0.1 功能條文明確採 3 天為自訂日期下界
- 太長（> 3 個月）delayed job 的 Redis 記憶體佔用時間過長，且使用者容易忘記
- 設計稿 UI 已標示「最長 3 個月」

### D5：信件 status 狀態機

```
draft → scheduled → delivered
  ↓        ↓
deleted  deleted
```

- `draft`：已存草稿，尚未寄出
- `scheduled`：已寄出，等待到期送達
- `delivered`：已到期送達
- `deleted`：已軟刪除（從任何狀態皆可轉入）

狀態轉換規則：
- draft → scheduled：呼叫 `POST /:id/send`
- draft → deleted：呼叫 `DELETE /:id`
- scheduled → delivered：BullMQ worker 到期觸發
- scheduled → deleted：呼叫 `DELETE /:id`（同時移除 BullMQ delayed job）
- delivered：終態，不可再轉換（但可 DELETE → deleted）

### D6：送達不建立通知事件

送達只轉換生命週期並由時間軸呈現；不得建立含內容 preview 的 in-app/email 通知。

### D9：寫信 Modal（已由 D10-D16 取代）

FRD v0.1 最終規格見 D10-D16。

### D7：時間軸 API 用多表 UNION 查詢，不用 materialized view

**做法：** `getTimeline()` 對 `future_letters`、`practice_checkins`、`quiz_results` 各自查詢後在 service 層合併排序，採穩定的 cursor-based 分頁。排序鍵固定為 `(date DESC, eventKey DESC)`；`eventKey` 由事件類型與來源識別碼組成，衍生里程碑則由類型、日期與 streak 組成。cursor 是封裝這兩個排序鍵的 opaque token，不是單獨的 ISO datetime。

**原因：**
- 資料量小（每人每月幾十筆事件），in-memory merge sort 效能足夠
- 不需維護額外的 materialized view 和 refresh 機制
- 各來源的 schema 差異大，統一 view 反而增加維護成本

**棄選：materialized view**——需要 cron refresh、增加 DB 複雜度，在當前規模不值得。

**棄選：獨立 timeline_events 表（event sourcing）**——需要每個來源寫入時同步插入 event，增加耦合和一致性風險。

### D8：里程碑為計算值，不另存表

**做法：** 時間軸 API 查詢打卡記錄後，在 service 層計算連續天數，達到 7/14/30/60/90 天時動態生成里程碑 entry。

**原因：**
- 里程碑是打卡資料的衍生值，另存表會有一致性問題
- 計算邏輯簡單（遍歷打卡日期找最長連續段）
- 前端已有 `currentStreak` 統計邏輯可參考

---

## FRD v0.1 superseding decisions (2026-08-22)

下列 D10-D16 取代本文件較早的 D3-D6、D9 與舊 response object 中衝突的部分。FRD 功能條文與測試點對自訂日期範圍互相矛盾，本 change 採功能條文的 3-90 天；介面不顯示字數上限或計數，server 亦不以 Zod 字數上限拒絕，但仍受全站 HTTP body-size 安全限制。

### D10：內容條件為任一欄非空白

兩個文字欄位皆為選填；寄出時只要求至少一欄 `trim()` 後非空。兩欄皆空白的草稿不在關閉時建立。前端不顯示 counter。

### D11：單一草稿用 DB 約束與 upsert 保證

每位使用者最多一筆 `status = draft`，以 partial unique index 保護競態。建立草稿 API 採 owner-scoped upsert；關閉 dialog 時有內容即 upsert，空白則不建立。再次進入唯一 CTA 時先載入此草稿。

### D12：草稿建立時即使用 authenticated encryption

新草稿建立/更新時即以 AES-256-GCM 版本化 envelope 儲存；draft owner 讀取可解密，scheduled 不可解密回傳，只有 delivered owner open/read 路徑可解密。金鑰由環境設定注入且啟動時驗證，不寫入 DB/log。

列表與單封 API 對 `scheduled` 一律回傳 `currentSelf: null`、`message: null`；timeline、notification 與 logs 不含內容 preview。這是 server-side contract，不依賴前端隱藏。

### D13：生命週期以 timestamps 區分未拆與已拆

保留 status `draft → scheduled → delivered → deleted`，新增 `sent_at` 與 `opened_at`。`delivered` 且 `opened_at IS NULL` 是 arrived-unopened；`opened_at IS NOT NULL` 是 opened。`POST /:id/open` owner-only 且冪等，首次呼叫寫入時間，之後保留原值。

### D14：刪除不可由使用者復原

資料層仍可 soft-delete 以支援稽核與 queue 一致性，但產品 API/UI 不提供 restore；所有狀態確認刪除後立即從 owner 查詢與時間軸消失。scheduled 刪除同時取消 delayed job。

### D15：實踐名稱在寄出時快照

草稿保留 live `practice_id`；寄出 transaction 將當時 title 寫入 `practice_title_snapshot`。閱讀優先顯示 snapshot，因此實踐退出、軟刪除或 FK set-null 後仍保留情境。

### D16：時間軸共用日期座標 view model

完整足跡與首頁摘要共用同一 API/hook 正規化資料。座標以日期相對今天計算：過去在左、今天置中、未來在右；信件固定於 deliver date。letter entry 必須提供 `status`、`deliverAt`、`sentAt`、`deliveredAt` 與 `openedAt`，讓兩種 view 以相同資料區分 scheduled、delivered-unopened 與 opened。完整 view 才有 CTA、tooltip、open/delete；首頁摘要只導航並傳遞 focus date/id。資料 mutation 後 revalidate 共用 cache。

送達預設不建立含內容的 P1/email 通知；低干擾提示由 timeline 的 delivered-unopened marker 負責。若未來產品決定保留通知，只能明確 opt-in 且 payload 不含信件內容。

---

## API Spec

### Response Object: FutureLetter

```json
{
  "id": "UUID (external_id)",
  "currentSelf": "string | null (scheduled 時必為 null)",
  "message": "string | null (scheduled 時必為 null)",
  "status": "draft | scheduled | delivered",
  "deliverAt": "ISO 8601 datetime | null",
  "sentAt": "ISO 8601 datetime | null",
  "deliveredAt": "ISO 8601 datetime | null",
  "openedAt": "ISO 8601 datetime | null",
  "practiceId": "UUID | null",
  "practice": { "id": "UUID | null", "title": "string" } | null,
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}
```

### POST /api/v1/me/future-letters

建立草稿。POST 只能建立 `draft`，寄出一律走 `POST /:id/send`。

Request:
```json
{
  "currentSelf": "string (optional; empty allowed for draft; no field-level character cap)",
  "message": "string (optional; empty allowed for draft; no field-level character cap)",
  "deliverAt": "ISO 8601 datetime (optional, 預填送達時間)",
  "practiceId": "UUID (optional, external_id of related practice)"
}
```

Response: `201 Created` with FutureLetter object

### GET /api/v1/me/future-letters

Query params: `status` (optional filter, 不含 deleted), `page`, `limit`

Response: paginated list of FutureLetter objects

### GET /api/v1/me/future-letters/:id

Response: single FutureLetter object

### PATCH /api/v1/me/future-letters/:id

Only `draft` status letters can be updated. Request body same as POST (all fields optional).

### DELETE /api/v1/me/future-letters/:id

Soft delete (status → deleted). If `scheduled`, also removes BullMQ delayed job.

### POST /api/v1/me/future-letters/:id/send

Transitions `draft` → `scheduled`. Creates BullMQ delayed job.

Request:
```json
{
  "deliverAt": "ISO 8601 datetime (required, must be >= now+3d and <= now+90d)"
}
```

Response: updated FutureLetter object with `status: "scheduled"`

### GET /api/v1/me/timeline
聚合學習事件時間軸。

Query params: `cursor` (optional opaque token encoding the last `(date, eventKey)` sort tuple), `limit` (default 20). Results sort by `(date DESC, eventKey DESC)` so events sharing a timestamp are neither skipped nor duplicated across pages.

Response:
```json
{
  "data": [
    {
      "type": "check-in | milestone | letter | learning-dna",
      "title": "string",
      "description": "string | null",
      "date": "ISO 8601 datetime",
      "meta": {
        "letterId": "UUID (for letter type)",
        "status": "scheduled | delivered (for letter type)",
        "deliverAt": "ISO 8601 datetime (for letter type)",
        "sentAt": "ISO 8601 datetime | null (for letter type)",
        "deliveredAt": "ISO 8601 datetime | null (for letter type)",
        "openedAt": "ISO 8601 datetime | null (for letter type)",
        "practiceId": "UUID (for check-in type)",
        "streak": 30 (for milestone type),
        "quizType": "string (for learning-dna type)"
      }
    }
  ],
  "nextCursor": "opaque (date, eventKey) cursor | null"
}
