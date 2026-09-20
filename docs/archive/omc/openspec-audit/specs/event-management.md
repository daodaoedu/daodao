# event-management
- 涉及 repo: daodao-server + daodao-admin-ui + daodao-storage
- 對應 archived change: 無
- 總計: 13 條 requirement / 26 個 scenario | ✅5 ⚠️5 ❌3 ❓0

## Requirement: 建立活動（標題/描述/時間/時長/地點/人數上限）→ ✅
證據: daodao-server:src/routes/admin.routes.ts:1423 `POST /events`；service createEvent INSERT admin_events(title, description, start_at, end_at, location, max_capacity, is_recurring)（admin-events.service.ts:81-82）；storage 表 admin_events（schema/810_create_table_admin_events.sql）。
- Scenario: 建立新活動 → ✅ — INSERT 含全部欄位。
- Scenario: 設定虛擬活動連結 → ⚠️ — location 為單一字串欄位，無 location_type(線上/實體) 切換邏輯或虛擬連結專屬欄位；可塞 URL 但無 spec 描述的型別切換。
- Scenario: 設定人數上限（滿員自動候補）→ ⚠️ — 有 max_capacity 欄位與 waitlist 狀態統計，但無使用者報名時「滿員→自動轉候補」的寫入邏輯（無 end-user RSVP 報名端點，見下）。

## Requirement: RSVP 追蹤（registered/waitlist/attended/no-show）→ ⚠️
證據: event_rsvps 表 + 依 status 聚合計數（service:49-51 registered/waitlist/attended）；route `GET /events/:id/rsvps`（admin.routes.ts:1426）。但**無使用者端 RSVP 報名/候補寫入 API**，且未見 no-show 狀態的明確處理。
- Scenario: 用戶報名活動（滿員轉候補）→ ❌ — 無使用者報名寫入端點；候補轉換邏輯缺。
- Scenario: 管理員查看 RSVP 清單（含各狀態）→ ✅ — getRsvps 端點 + 狀態聚合。

## Requirement: 簽到功能（手動 / QR Code）→ ⚠️
證據: route `POST /events/:id/checkin`（admin.routes.ts:1427）；controller checkinUser 接 userId（admin-events.controller.ts:84-87）將狀態更新為 attended。**僅手動簽到**，無 QR Code 掃描端點/邏輯（grep 無 qr）。
- Scenario: 手動簽到 → ✅ — checkinUser(eventId, userId) 更新 attended。
- Scenario: QR Code 簽到 → ❌ — 無 QR 產生/掃描實作。

## Requirement: 建立週期性活動範本（每週/每兩週/每月）→ ✅
證據: route `POST /events/templates`（admin.routes.ts:1430）；event_templates 表含 frequency；generateFromTemplate intervalMap weekly/biweekly/monthly（admin-events.service.ts:355-357）。
- Scenario: 建立週期性範本 → ✅ — createTemplate 端點 + frequency。
- Scenario: 設定範本細節 → ⚠️ — template_data 存範本資料，但 generateFromTemplate 產生實例時未套用（見下），範本預設值落地存疑。

## Requirement: 自動產生未來活動實例（至少提前 4 週）→ ⚠️
證據: route `POST /events/templates/:id/generate`（admin.routes.ts:1431）；service generateFromTemplate（:342）。**但僅產生 1 個實例**（單筆 INSERT，start_at = NOW()+interval :364），非「自動 + 提前 4 週批次」；需手動觸發 generate，無排程。
- Scenario: 自動產生活動（提前 4 週）→ ❌ — 僅手動單次產生 1 筆，無 4 週批次/排程。
- Scenario: 產生實例繼承範本設定 → ⚠️ — INSERT 以 template.name 當 title，但 description/location 寫死空字串、max_capacity=0（service:363-365），**未繼承範本完整預設值**。

## Requirement: 覆寫個別週期性活動實例 → ⚠️
證據: route `PUT /events/:id`（admin.routes.ts:1424）updateEvent 可改單一活動（service:140-141 COALESCE 局部更新）；`DELETE /events/:id`（:1425）。可改/刪單一實例不影響其他，但無「僅修改此次 vs 修改全系列」的範本關聯語意，亦無「取消標記 cancelled 不影響後續產生」的狀態。
- Scenario: 修改單一實例（僅此次）→ ⚠️ — updateEvent 改單筆，但無 this-only vs series 區分。
- Scenario: 取消單一實例（標記 cancelled）→ ⚠️ — 僅 DELETE，無 cancelled 狀態標記語意。

## Requirement: 活動錄影管理（上傳/管理）→ ✅
證據: route `GET/POST /events/:id/recordings`、`DELETE /events/recordings/:id`（admin.routes.ts:1432-1434）；service uploadRecording(fileName, fileSize, accessLevel)（admin-events.service.ts:453）。
- Scenario: 上傳活動錄影 → ✅ — uploadRecording 端點。
- Scenario: 管理錄影檔案（列表/刪除）→ ✅ — listRecordings + deleteRecording。

## Requirement: 錄影播放權限設定（公開/僅會員/特定角色標籤）→ ⚠️
證據: uploadRecording 接 accessLevel `'public'|'members'|'roles'`（admin-events.service.ts:453）儲存權限欄位。**但所有 recording 路由皆 requireAdmin（admin.routes.ts:1432-1434），無面向觀眾的播放端點**，故 accessLevel 設定無實際存取控制執行點。
- Scenario: 設定錄影為公開 → ⚠️ — 可存 accessLevel='public'，但無公開播放端點驗證未登入可看。
- Scenario: 設定錄影為僅會員 → ⚠️ — 同上，無 members 播放權限執行。
- Scenario: 設定為特定角色/標籤 → ⚠️ — accessLevel='roles' 存值，但無角色/標籤條件選擇與執行邏輯。

## Requirement: 活動列表與篩選（即將/已結束/週期性）→ ✅
證據: route `GET /events`（admin.routes.ts:1422）；service listEvents 支援 filter.status upcoming/past（admin-events.service.ts:21-23）+ is_recurring 欄位。
- Scenario: 查看活動列表（預設即將舉行）→ ✅ — listEvents 支援 status filter。
- Scenario: 篩選活動 → ⚠️/✅ — upcoming/past 有；「週期性」篩選依 is_recurring 可達成但未見專屬 filter 分支，記 ✅（欄位存在）。

## Requirement: 活動分析數據（RSVP 數/出席率/未到率）→ ✅
證據: route `GET /events/:id/analytics`（admin.routes.ts:1428）getEventAnalytics；列表已聚合 rsvp_count/waitlist_count/attended_count（service:49-51, 67-69）。
- Scenario: 查看單一活動分析 → ✅ — analytics 端點。
- Scenario: 查看活動總覽分析 → ✅ — listEvents 每筆帶 rsvp/attended 計數摘要。

## Requirement: 發送活動提醒（對已 RSVP 用戶）→ ⚠️
證據: route `POST /events/:id/remind`（admin.routes.ts:1435）；service sendReminder 回 {sent, recipientCount}（admin-events.service.ts:489）。但未驗證提醒「內容含活動名稱/時間/地點」，疑似計數 stub。
- Scenario: 手動發送提醒 → ✅ — sendReminder 端點存在。
- Scenario: 提醒內容（名稱/時間/地點）→ ⚠️ — 未見提醒訊息組裝含這些欄位的證據。

## Requirement: 活動討論串自動建立 → ❌
證據: grep admin-events service/controller 無 discussion/thread 相關實作；無發佈活動時自動建討論串的邏輯，亦無活動詳情頁討論串連結。
- Scenario: 發佈活動時建立討論串 → ❌
- Scenario: 討論串連結至活動 → ❌
