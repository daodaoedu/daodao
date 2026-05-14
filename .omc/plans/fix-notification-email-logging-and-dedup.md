# Fix: Notification Email Logging & Reaction Deduplication

**建立日期：** 2026-05-09  
**Repo：** daodaoedu/daodao-server  
**Branch 策略：** 從 production` 建新分支 `fix/notification-email-logging-and-dedup`，PR 合入 production`，再由 CI 部署至 production  
**來源：** 調查 prod DB + Redis + 原始碼所得

---

## 問題摘要

### 問題 1：Reaction 重複寄信

- `reaction-notification.worker` → practice reaction 發生 1 小時後寄個人化 email
- `notification-email.worker` → 每 4 小時批次撈 `notification_events`，**含所有 reaction 事件**（practice + checkin + comment）→ digest 也寄一封
- **結果：practice owner 收到兩封 reaction 相關信**

> ⚠️ **Critic 發現的 regression risk**：`reaction.service.ts` 對三種 target（practice / checkin / comment）都建立 `type: 'reaction'` 的 notification_events，但 `enqueueReactionNotification` 目前**只有 practice** 有呼叫。若直接排除全部 reaction，checkin/comment 上的 reaction 將不再有任何 email 通知。

### 問題 2：三個 worker 都沒有寫 email_logs

- `notification-email.worker`、`notification-weekly.worker`、`reaction-notification.worker` 皆直接呼叫 `emailService.sendEmail()` → 不寫 DB
- **結果：無法從 DB 確認信有沒有送出、有沒有重複**

---

## 需求摘要

1. 修正 reaction 重複寄信問題（不能讓其他 target 的 reaction 無聲消失）
2. 讓三個 worker 都寫 `email_logs`，使用現有 `EMAIL_STATUS.PENDING → sent/failed` 模式
3. 加入 `hasEmailBeenSent()` 防止 BullMQ retry 重複寄信
4. 不破壞現有 practice email 流程
5. Branch：`fix/notification-email-logging-and-dedup` from production`

---

## Acceptance Criteria

- [ ] 同一 practice reaction，practice owner 最多收到 1 封信（reaction_notification）
- [ ] checkin / comment 上的 reaction 仍有 email 通知路徑（不靜默消失）
- [ ] `email_logs` 中有 `NOTIFICATION_DIGEST`、`NOTIFICATION_WEEKLY`、`REACTION_NOTIFICATION` 三種 email_type 記錄
- [ ] 每封信的發送結果（sent/failed）都寫入 `email_logs.status`
- [ ] BullMQ worker 重試（attempts: 3）不會重複寄同一封信給同一 user（`hasEmailBeenSent()` 保護）
- [ ] `notification-email.worker` 批次完成後，可從 `email_logs` 查出當批有多少人收到信
- [ ] 現有 practice email 行為不變

---

## 前置調查（開始實作前確認）

在 `src/services/reaction.service.ts` 確認：

1. `enqueueReactionNotification` 被呼叫的 targetType 有哪些（目前已知只有 `practice`）
2. checkin / comment reaction 的 `notification_events` 有被建立，但沒有對應的 email 路徑

**結論**：有兩個選擇：

- **Option A（推薦）**：擴充 `reaction-notification.worker` 支援 checkin/comment target，再排除全部 reaction from digest
- **Option B（保守）**：不排除 reaction from digest，改在 reaction-notification.worker 內先檢查 `hasEmailBeenSent()` 跳過重複

本 plan 採 **Option A**，若調查發現風險過高則改 Option B。

---

## 實作步驟

### Step 1：新增 email_type 常數

**檔案：** `src/types/email/base.types.ts`（`EMAIL_TYPES` 的定義位置）

遵循現有 SCREAMING_SNAKE_CASE key 命名慣例：

```typescript
NOTIFICATION_DIGEST: 'notification_digest',
NOTIFICATION_WEEKLY: 'notification_weekly',
REACTION_NOTIFICATION: 'reaction_notification',
```

---

### Step 2：擴充 reaction-notification.worker 支援所有 targetType

**檔案：** `src/queues/reaction-notification.worker.ts`  
**檔案：** `src/services/reaction.service.ts`

在 `reaction.service.ts` 確認 checkin / comment 的 `enqueueReactionNotification` 呼叫位置，補上對應呼叫（或在 worker 內依 entityType 路由）。

確保 reaction-notification.worker 能處理 practice / checkin / comment 三種 target 後，Step 3a 的排除才安全。

---

### Step 3：reaction-notification.worker 加 email_logs + hasEmailBeenSent

**檔案：** `src/queues/reaction-notification.worker.ts`

```typescript
import { createEmailLog, updateEmailLogStatus, hasEmailBeenSent } from '../services/email/email-log.service';
import { EMAIL_TYPES, EMAIL_STATUS } from '../types/email';

// 發信前：防重複（BullMQ retry 保護）
const alreadySent = await hasEmailBeenSent({
  userId: practiceOwnerId,
  emailType: EMAIL_TYPES.REACTION_NOTIFICATION,
  entityType: 'practice',
  entityId: practiceId,
});
if (alreadySent) {
  loggerService.info('[reaction-notification-worker] Already sent, skipping', { practiceOwnerId, practiceId });
  return;
}

// 建立 pending log
const logRecord = await createEmailLog({
  userId: practiceOwnerId,
  emailType: EMAIL_TYPES.REACTION_NOTIFICATION,
  entityType: 'practice',
  entityId: practiceId,
  subject,
  status: EMAIL_STATUS.PENDING,
});

// 發信
const result = await emailService.sendEmail({
  to: ownerEmail,
  subject,
  html,
  trackingToken: logRecord.tracking_token ?? undefined,
});

// 更新狀態
await updateEmailLogStatus(logRecord.id, result.success ? EMAIL_STATUS.SENT : EMAIL_STATUS.FAILED);
```

---

### Step 4：notification-email.worker — 排除 reaction + 加 email_logs

**檔案：** `src/queues/notification-email.worker.ts`

#### 4a：排除 reaction（在 Step 2 完成後才部署）

```typescript
const events = await prisma.notification_events.findMany({
  where: {
    priority: { in: ['P1', 'P2'] },
    type: { not: 'reaction' }, // reaction 由 reaction-notification.worker 全面負責
    created_at: { gte: batchStart, lt: batchEnd },
  },
  orderBy: { created_at: 'asc' },
});
```

#### 4b：每位 recipient 發信前後寫 email_log + hasEmailBeenSent

```typescript
import { createEmailLog, updateEmailLogStatus, hasEmailBeenSent } from '../services/email/email-log.service';
import { EMAIL_TYPES, EMAIL_STATUS } from '../types/email';

// 防重複（BullMQ retry 保護）
const alreadySent = await hasEmailBeenSent({
  userId: recipientId,
  emailType: EMAIL_TYPES.NOTIFICATION_DIGEST,
  since: batchStart,
});
if (alreadySent) continue;

// 建立 pending log
const logRecord = await createEmailLog({
  userId: recipientId,
  emailType: EMAIL_TYPES.NOTIFICATION_DIGEST,
  subject,
  status: EMAIL_STATUS.PENDING,
});

const result = await emailService.sendEmail({
  to: recipientEmail,
  subject,
  html,
  trackingToken: logRecord.tracking_token ?? undefined,
});

await updateEmailLogStatus(logRecord.id, result.success ? EMAIL_STATUS.SENT : EMAIL_STATUS.FAILED);
```

---

### Step 5：notification-weekly.worker 加 email_logs + hasEmailBeenSent

**檔案：** `src/queues/notification-weekly.worker.ts`

```typescript
import { createEmailLog, updateEmailLogStatus, hasEmailBeenSent } from '../services/email/email-log.service';
import { EMAIL_TYPES, EMAIL_STATUS } from '../types/email';

const alreadySent = await hasEmailBeenSent({
  userId: recipientId,
  emailType: EMAIL_TYPES.NOTIFICATION_WEEKLY,
  since: weekStart, // 本週週期起點
});
if (alreadySent) continue;

const logRecord = await createEmailLog({
  userId: recipientId,
  emailType: EMAIL_TYPES.NOTIFICATION_WEEKLY,
  subject,
  status: EMAIL_STATUS.PENDING,
});

const result = await emailService.sendEmail({
  to: recipientEmail, // 注意：非 `to` 裸變數
  subject,
  html,
  trackingToken: logRecord.tracking_token ?? undefined,
});

await updateEmailLogStatus(logRecord.id, result.success ? EMAIL_STATUS.SENT : EMAIL_STATUS.FAILED);
```

---

### Step 6：驗證

1. **Reaction dedup**：在 dev 對同一 practice 按兩次 reaction → 確認 `email_logs` 只有 1 筆 `reaction_notification`
2. **Checkin/comment reaction**：對 checkin 按 reaction → 確認有收到 email
3. **Digest log**：等 notification-email batch 執行 → `email_logs` 有 `notification_digest` 記錄
4. **Weekly log**：手動觸發 weekly job → `email_logs` 有 `notification_weekly` 記錄
5. **BullMQ retry**：模擬 worker 第一次失敗 → retry 後不重複寄信

---

## 部署順序（重要）

1. **Step 1**（常數）先合入，確保 TypeScript 不報錯
2. **Step 2**（reaction targetType 擴充）合入，確認 checkin/comment reaction 有 email 路徑
3. **Steps 3–5**（email_logs + 排除）一起合入同一 PR

> ❌ 不可先部署 Step 4a（排除 reaction）而不先完成 Step 2，否則 checkin/comment reaction email 靜默消失。

---

## 風險與緩解

| 風險 | 緩解 |
|------|------|
| checkin/comment reaction 原本就沒有 email，擴充後影響不明 | 先查 `notification_events` 中 reaction 的 `entity_type` 分布，確認數量與影響 |
| `updateEmailLogStatus` 拋錯導致 worker 整批 crash | 用 try/catch 包裹 log 操作，log 失敗只記 loggerService.error，不 throw |
| BullMQ retry 與 `hasEmailBeenSent` 時間視窗配合問題 | `since: batchStart` 確保同批次內去重，跨批次以 entity_type+entity_id 去重 |
| reaction 舊事件（84 筆）修好後仍在 DB | 這些是 practice reaction，已超過 1 小時；reaction-notification.worker 的 job 早已完成；決定不補寄（stale 通知會造成困惑）|

---

## 檔案清單

| 檔案 | 變更類型 |
|------|---------|
| `src/types/email/base.types.ts` | 新增 3 個 NOTIFICATION_DIGEST / NOTIFICATION_WEEKLY / REACTION_NOTIFICATION 常數 |
| `src/services/reaction.service.ts` | 補上 checkin/comment 的 enqueueReactionNotification 呼叫 |
| `src/queues/reaction-notification.worker.ts` | 加 hasEmailBeenSent + createEmailLog + updateEmailLogStatus |
| `src/queues/notification-email.worker.ts` | 排除 reaction type + 加 email_log + hasEmailBeenSent |
| `src/queues/notification-weekly.worker.ts` | 加 hasEmailBeenSent + createEmailLog + updateEmailLogStatus |

---

## 驗證查詢（修好後可用）

```sql
-- 確認各類型 email 數量與狀態
SELECT email_type, status, COUNT(*)
FROM email_logs
WHERE email_type IN ('notification_digest', 'notification_weekly', 'reaction_notification')
GROUP BY email_type, status;

-- 確認 digest 不再含 reaction 事件
SELECT type, COUNT(*) FROM notification_events
WHERE type != 'reaction' AND priority IN ('P1', 'P2')
GROUP BY type;

-- 確認 reaction entity_type 分布（前置調查用）
SELECT entity_type, COUNT(*) FROM notification_events
WHERE type = 'reaction'
GROUP BY entity_type;
```

---

## Changelog（Critic review 修正）

- **C1 修正**：加入 Step 2 擴充 reaction targetType，防止排除 reaction 造成 checkin/comment notification 靜默消失；加入部署順序說明
- **C2 修正**：改用 `EMAIL_TYPES.NOTIFICATION_DIGEST` 常數（SCREAMING_SNAKE_CASE），不使用字串 literal
- **C3 修正**：明確指定 branch 策略（從 production`建分支，PR 合入 production`）
- **M1 修正**：所有 worker 加入 `hasEmailBeenSent()` 防重複；AC #5 現在有對應實作步驟
- **M2 修正**：Step 5 改為 `to: recipientEmail`，移除未定義的 `to` 裸變數
- **Risk #1 修正**：移除錯誤的 ENUM 風險（`email_type` 是 VARCHAR(50)，無需 migration）
- **新增**：`status: EMAIL_STATUS.PENDING` 初始值，符合現有 practice-email.service.ts 模式
