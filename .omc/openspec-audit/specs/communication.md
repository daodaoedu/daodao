# communication
- 涉及 repo: admin-ui (UI) / server (API + queue worker)
- 對應 archived change: admin-user-management-apis（部分，email/notification）
- 總計: 11 條 requirement / 18 個 scenario | ✅2 ⚠️6 ❌3 ❓0

## Requirement: 站內通知建立 → ⚠️
證據: server POST /admin/notifications (admin.routes.ts:1256) createAdminNotification 存在；admin-communication.ts:createAdminNotification client 有
- Scenario: 建立公告通知 → ❌ — **NotificationsPage 為唯讀列表，「新增」按鈕只 `alert('功能開發中')`（NotificationsPage.tsx:39）**，前端無建立表單
- Scenario: 未填必要欄位阻擋 → ❓ — 後端可能有 zod 驗證，但前端無表單可觸發；無法確認 title/content 非空驗證

## Requirement: 站內通知受眾選擇 → ⚠️
證據: AdminNotification 有 `target` 欄位（admin-communication.ts），列表顯示 target（NotificationsPage.tsx:116）
- Scenario: 發送給全部使用者 → ⚠️ — 資料模型有 target 欄位，但**前端無受眾選擇 UI**（無建立表單）
- Scenario: 發送給特定標籤 → ⚠️ — 同上，無標籤勾選 UI
- Scenario: 發送給指定個別使用者 → ⚠️ — 同上，無使用者搜尋選取 UI

## Requirement: 站內通知排程發送 → ⚠️
證據: status 可為 'scheduled'（CreateAdminNotificationPayload）；stats 顯示 scheduled 數
- Scenario: 設定排程時間後建立 → ⚠️ — 有 scheduled 狀態概念，但前端無排程時間設定 UI（無建立表單）
- Scenario: 排程時間過期阻擋 → ❓ — 無前端可驗證；後端是否擋過期時間未見證據

## Requirement: 站內通知歷史與統計 → ✅
證據: NotificationsPage.tsx 列表顯示 total_sent/read_count/已讀率（line 88-119）；server GET /notifications + /notifications/:id/stats
- Scenario: 檢視通知歷史列表 → ✅ — 列表含已發送/已讀/已讀率欄
- Scenario: 通知發送後統計更新 → ⚠️ — readRate 由 read_count/total_sent 計算顯示，但即時更新依賴重抓；部分符合

## Requirement: 站內通知預覽 → ❌
證據: 無
- Scenario: 預覽通知內容 → ❌ — NotificationsPage 無「預覽」功能（無建立/編輯表單）

## Requirement: 觸發式信件規則建立 → ⚠️
證據: server POST /admin/email-triggers (admin.routes.ts:1287)；admin-communication.ts:createEmailTriggerRule client 有
- Scenario: 建立觸發規則 → ❌ — **TriggeredEmailsPage「新增」按鈕只 `alert('功能開發中')`（TriggeredEmailsPage.tsx:29）**，前端無建立表單；且 client 路徑 `/email/trigger-rules` 與 server 實際路徑 `/email-triggers` **不一致**（即使要呼叫也會 404）

## Requirement: 觸發條件類型 → ⚠️
證據: worker 處理 `dormant_days`（沉睡）與 `no_action_days`（最後活動 N 天）(email-trigger.worker.ts:8,56,68)
- Scenario: 設定「沉睡 N 天」→ ✅ — worker 支援 dormant_days：`last_login_at < NOW() - N days`
- Scenario: 設定「註冊 N 天未打卡」→ ⚠️ — worker 有 no_action_days（最後活動 N 天），但**非精確的「註冊滿 N 天且未執行特定動作（打卡）」語意**，且無依動作類型細分
- Scenario: 設定「標籤異動」觸發 → ❌ — **worker 無 tag_added/tag_removed 觸發類型**；triggerType 為自由字串（validator z.string().min(1)），無標籤異動處理

## Requirement: 信件模板編輯 → ⚠️
證據: EmailTemplateEditorPage.tsx + email-preview.ts (detectVariables/renderEmailPreview)；server email-templates CRUD (admin.routes.ts:1292-1296)
- Scenario: 編輯模板並插入變數 → ⚠️ — 有 `{{var}}` 偵測與替換（email-preview.ts:48，detectVariables），但內文用一般 textarea，**非富文本編輯器**；變數自動偵測而非插入式 UI
- Scenario: 預覽信件模板 → ✅ — renderEmailPreview 以 variables 替換顯示（EmailTemplateEditorPage.tsx:47-49），有 desktop/mobile 預覽

## Requirement: 觸發規則啟用與停用 → ⚠️
證據: TriggeredEmailsPage.tsx:100 toggleMutation → useToggleEmailTriggerRule → admin-communication.toggleEmailTriggerRule PATCH `/email/trigger-rules/:id/toggle`
- Scenario: 停用啟用中規則 → ⚠️ — 前端有 toggle UI，但 **client toggle 路徑 `/email/trigger-rules/:id/toggle` 在 server 不存在**（server 用 PUT `/email-triggers/:id` 更新，無獨立 toggle route）
- Scenario: 重新啟用已停用規則 → ⚠️ — 同上路徑不一致風險

## Requirement: 觸發信件執行紀錄 → ⚠️
證據: server GET /email-triggers/:id/log (admin.routes.ts:1290)；admin-ui listEmailTriggerLogs client（但路徑 `/email/trigger-logs`）；TriggeredEmailsPage useEmailTriggerLogs
- Scenario: 檢視執行紀錄 → ⚠️ — EmailTriggerLog 型別含 recipient/status/sent_at，但**缺「開啟狀態、點擊狀態」欄位**（type 只有 status）；且 client 路徑 `/email/trigger-logs` 與 server `/email-triggers/:id/log` 不一致

## Requirement: 觸發規則彙總統計 → ⚠️
證據: server GET /email-triggers/:id/stats；admin-ui getEmailTriggerStats（路徑 `/email/trigger-rules/stats`）；列表顯示 sent_count/open_rate（TriggeredEmailsPage.tsx:95-96）
- Scenario: 檢視規則統計 → ⚠️ — 顯示 sent_count、open_rate，但**缺點擊率（click rate）**；EmailTriggerStats 無 click 欄位；client/server 統計路徑亦不一致
