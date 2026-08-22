## Why

島島阿學的使用者在學習過程中缺少「自我對話」的儀式感出口。打卡、里程碑、學習 DNA 等事件散落在各功能中，沒有統一的時間軸能讓使用者回顧自己的學習旅程。

「寫信給未來的自己」是一個安靜、私密的自我對話空間——使用者寫下當下狀態或給未來的話，選擇送達日，內容在送達前連本人也無法讀取。它錨定於「人」而非任何單一實踐，並由「我的足跡」水平時間軸承載等待與回顧。這個功能：

1. **深化反思**——提供不需向任何人交代的自我對話
2. **建立身分軌跡**——把打卡與未來信件放在同一條屬於使用者的時間軸
3. **保留情境**——信件可選擇性關聯實踐，但不成為實踐的附屬品
4. **保護等待期**——寄出後內容加密且在送達前不透過 UI/API 揭露

原 OpenSpec MVP 已完成基本 CRUD、BullMQ 排程與前端 API 串接；issue #148 的 FRD v0.1 進一步要求隱私、單一自動草稿、已讀狀態與水平座標時間軸，因此本 change 繼續承載校準工作，不可先行歸檔。

## What Changes

### 1. DB：新增 `future_letters` 表

```
future_letters
├── id (SERIAL PK)
├── external_id (UUID, UNIQUE, public-facing)
├── user_id (INT FK → users.id)
├── current_self / message — 舊版相容 nullable 欄位；新草稿與寄出信皆存 authenticated ciphertext
├── encryption_version — 密文格式版本
├── status (VARCHAR) — draft | scheduled | delivered | deleted
├── deliver_at (TIMESTAMPTZ) — 預定送達時間
├── sent_at (TIMESTAMPTZ, nullable) — 寄出時間
├── delivered_at (TIMESTAMPTZ, nullable) — 實際送達時間
├── opened_at (TIMESTAMPTZ, nullable) — 首次開信時間
├── practice_id (INT FK → practices.id, nullable) — 關聯的主題實踐
├── practice_title_snapshot (TEXT, nullable) — 寄出時實踐名稱
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
```

### 2. 後端：CRUD API

- `POST /api/v1/me/future-letters` — 建立草稿
- `GET /api/v1/me/future-letters` — 列出我的信件（分頁，支援 status filter）
- `GET /api/v1/me/future-letters/:id` — 取得單封信件
- `PATCH /api/v1/me/future-letters/:id` — 更新草稿
- `DELETE /api/v1/me/future-letters/:id` — 軟刪除（status → deleted）
- `POST /api/v1/me/future-letters/:id/send` — 將草稿寄出（status draft → scheduled，建立 BullMQ delayed job）
- `POST /api/v1/me/future-letters/:id/open` — owner 首次閱讀時冪等記錄 opened_at

### 3. 後端：排程送達（BullMQ delayed job）

- 新增 `future-letter` queue + worker
- 信件寄出時，計算 delay = `deliver_at - now`，建立 delayed job
- Worker 到期時：`status → delivered`、`delivered_at = now`
- 送達採時間軸標記的低干擾狀態切換；不得把信件明文放入通知 payload

### 4. 後端：學習時間軸 API

- `GET /api/v1/me/timeline` — 聚合使用者的學習事件時間軸
- 資料來源：`future_letters`（scheduled / delivered）、`practice_checkins`、里程碑（連續打卡天數）、`quiz_results`（學習 DNA）
- 提供完整水平座標與首頁摘要共用的打卡、草稿及信件狀態資料

### 5. 前端：接 API 取代 mock

- `@daodao/api` 新增 `future-letter.ts` + `future-letter-hooks.ts` service
- 寫信 Dialog handler 改為呼叫 API
- 時間軸 component 改為呼叫 timeline API
- 寫信介面支援關閉自動保存唯一草稿、任一欄有內容即可寄出、反壓力與隱私文案
- 完整足跡與首頁摘要共用水平日期座標；已送達未讀與已讀有不同標記

## Capabilities

### New Capabilities

- `future-letter-crud`：信件的建立、讀取、更新、刪除
- `future-letter-scheduling`：BullMQ delayed job 排程送達
- `future-letter-confidentiality`：寄出中信件加密與 API/UI 明文遮蔽
- `future-letter-lifecycle`：寄出、送達、首次開信與刪除狀態
- `learning-timeline`：學習事件聚合時間軸
- `future-letter-reading`：唯讀、可重複開啟的送達後閱讀 UI

## Impact

- **DB (daodao-storage)**：新增 `future_letters` 表 migration
- **後端 (daodao-server)**：新增 route/controller/service/validator/types、加密設定與 BullMQ queue + worker；移除 future-letter 通知耦合
- **前端 (daodao-f2e)**：`@daodao/api` 新增 service + hooks；Dialog/Timeline 接 API
- **AI (daodao-ai-backend)**：無改動
- **Worker (daodao-worker)**：無改動（BullMQ worker 在 daodao-server 內）

## Non-goals

- **信件分享/公開**——信件定位為私密自我對話，不做公開分享功能
- **AI 生成、潤飾或詮釋內容**——使用者原話不由平台改寫
- **重複寄送 / 週期性信件**——一封信只送達一次
- **信件附件**——MVP 純文字，不支援圖片/檔案附件
- **遊戲化與催促**——不做 streak、計數、排行、寫信提醒或到期倒數推播
