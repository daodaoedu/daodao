## 0. Admin 改善需求（來源：Admin.md）

### P0 — 純前端快速修正

- [ ] 0.1 用戶管理表格增加 `customId` 欄位 `[server]` `[admin-ui]`
  - server: `adminUserListItemSchema` 加 `customId` 欄位，SQL query select `custom_id`
  - admin-ui: `AdminUserListItem` type 加 `customId`，表格加一欄「Custom ID」顯示 `@username`
  - 驗收：用戶列表可看到每位用戶的 custom_id

- [ ] 0.2 用戶管理表格增加 tag 欄位 `[server]` `[admin-ui]`
  - server: admin users list API 回傳中加入用戶 tags 資料
  - admin-ui: 表格加一欄「標籤」顯示用戶所屬 tags（Badge 形式）
  - 驗收：用戶列表可看到每位用戶的標籤
  - 依賴：4.1、4.2（tag 資料表與 API 須先建立）

- [ ] 0.3 用戶標籤頁「手動標籤」改名為「全部標籤」 `[admin-ui]`
  - UserTagsPage 中 h2 文字改為「全部標籤」
  - 自動標籤結果也顯示在同一列表中
  - 驗收：標題變更，自動產生的標籤也出現在全部標籤列表

### P1 — 前端 + 小幅 Server 修改

- [ ] 0.4 主題實踐搜尋增加「實踐期間」篩選 `[admin-ui]`
  - PracticesPage 新增期間篩選 Select（7/14/21/30 天）
  - 傳送 `duration` 參數給 API
  - 驗收：可依實踐期間篩選列表

- [ ] 0.5 主題實踐列表增加「實踐期間」數據欄位 `[server]` `[admin-ui]`
  - server: practices list API 回傳加入 `duration`（實踐天數）
  - admin-ui: 表格新增「實踐期間」欄位
  - 驗收：列表可看到每個實踐的天數

- [ ] 0.6 主題實踐搜尋增加 tag 篩選 `[admin-ui]`
  - PracticesPage 新增 tag 篩選 Select（載入所有 tags）
  - 傳送 `tagId` 參數給 API
  - 驗收：可依標籤篩選實踐列表
  - 依賴：4.2（tag API）

- [ ] 0.7 內容分析（公開 Practice）增加使用者名稱及 email 欄位 `[server]` `[admin-ui]`
  - server: content performance API 回傳加入 creator `name` 和 `email`
  - admin-ui: ContentPerformancePage practice tab 表格加「建立者」「Email」欄位
  - 驗收：可看到每篇公開 Practice 的作者資訊

- [ ] 0.8 內容分析增加被複製次數及複製來源欄位 `[server]` `[admin-ui]`
  - server: content performance API 回傳加入 `copyCount` 和 `copiedFrom`
  - admin-ui: 表格加「被複製次數」「複製來源」欄位
  - 驗收：可看到每篇 Practice 的複製統計

- [ ] 0.9 Onboarding 頁增加期間和 tag 搜尋 `[admin-ui]`
  - OnboardingFlowsPage 新增日期範圍篩選和 tag 篩選
  - 驗收：可依期間和標籤篩選 Onboarding 數據

- [ ] 0.10 社群互動分析增加使用者 tag 篩選 `[admin-ui]`
  - 確認對應頁面（CommunityMapPage 或 ContentPerformancePage）
  - 新增 tag 篩選 Select
  - 驗收：可依使用者標籤篩選社群互動資料

### P2 — 需要較多 Server 端工作

- [ ] 0.11 用戶標籤頁：實作標籤指派功能 `[server]` `[admin-ui]`
  - server: POST /api/v1/admin/tags/:tagId/assign（指派 tag 給用戶）
  - admin-ui: UserTagsPage 編輯按鈕功能實作（目前是 alert('功能開發中')）
  - 驗收：可從標籤頁指定標籤給使用者
  - 關聯：既有 task 4.2、4.3

- [ ] 0.12 用戶標籤頁：Excel 批次指派 tag `[server]` `[admin-ui]`
  - server: POST /api/v1/admin/users/bulk-tag 支援接收 userId + tagId 陣列
  - admin-ui: UserTagsPage 新增「上傳 Excel」按鈕，解析 Excel 後呼叫 bulk-tag API
  - 驗收：上傳 Excel 可批次指派 tag 給多位用戶
  - 關聯：既有 task 4.2

- [ ] 0.13 用戶來源整合進 tag 體系 `[server]` `[storage]`
  - 將 S1/S2/S3 用戶來源視為系統 tag（tag category = 'source'）
  - 標籤表增加 `category` 欄位區分「來源」和「用戶特性」
  - admin-ui: UserTagsPage 分欄顯示不同類別的 tag
  - 驗收：來源以 tag 形式呈現，標籤分類正確顯示

- [ ] 0.14 自動標籤：特定參數 URL 入口 `[server]`
  - 為不同入口產生帶有特定參數的 URL
  - 從特定參數 URL 註冊的用戶自動加上對應 tag
  - 驗收：透過帶參數 URL 註冊的用戶自動獲得對應標籤
  - 關聯：既有 task 4.2（tag-rules conditionType 需支援 'url_param'）

- [ ] 0.15 自動標籤：活躍度標籤 `[server]`
  - 根據用戶活躍度自動標籤（如：活躍/不活躍/沉睡）
  - 驗收：用戶依活躍度自動獲得標籤
  - 關聯：既有 task 4.2（tag-rules conditionType 需支援 'activity_level'）

- [ ] 0.16 信件管理：預約寄信功能 `[server]` `[admin-ui]`
  - server: sendCustomEmail API 支援 `scheduledAt` 參數，排程發送
  - admin-ui: EmailManagementPage compose tab 加日期時間選擇器
  - 驗收：可設定未來時間發送郵件
  - 關聯：既有 task 5.5

- [ ] 0.17 信件管理：選擇 tag 寄信 `[server]` `[admin-ui]`
  - server: POST /api/v1/admin/email/send-bulk 支援 `tagIds` 參數
  - admin-ui: compose tab 收件人區域加 tag 選擇（多選），選擇 tag 後顯示預估人數
  - 驗收：可選擇一或多個 tag，寄信給所有符合標籤的用戶
  - 關聯：既有 task 5.5、5.6

- [ ] 0.18 信件管理：使用者搜尋表單 `[admin-ui]`
  - compose tab 新增「選擇收件者」按鈕，開啟 modal
  - modal 中可搜尋用戶（名稱/email），勾選多位作為收件者
  - 驗收：可搜尋並勾選特定使用者為收件者

### P3 — 需產品決策或跨 Repo 修改

- [ ] 0.19 主題實踐指標公式定義 `[product]`
  - 定義「活躍中」計算公式
  - 定義「平均完成率」計算公式
  - 定義「分類分佈」的分類依據
  - 驗收：公式確定後可進入實作

- [ ] 0.20 Onboarding 參與度指標公式定義 `[product]`
  - 定義「H 參與度指標」計算公式
  - 驗收：公式確定後可進入實作

- [ ] 0.21 打卡動態：心情改非必填、tag 改必填 `[server]` `[f2e]`
  - 這是產品端的改動，需修改前端產品頁 + 後端 API validation
  - server: checkin API 的 mood 欄位改 optional，tag 改 required
  - f2e: 打卡 UI 調整對應欄位必填性
  - 驗收：打卡時心情可不填，tag 必填

- [ ] 0.22 公開 Practice 是否合併到主題實踐頁 `[product]` `[admin-ui]`
  - 決策：ContentPerformancePage 的 practice tab 是否移到 PracticesPage
  - 若合併：PracticesPage 增加公開 Practice 專區
  - 驗收：產品確認架構後實作

- [ ] 0.23 被設為精選後的展示位置說明 `[product]` `[admin-ui]`
  - 在精選操作旁加 tooltip 說明精選內容會出現在哪裡
  - 或在精選設定 UI 中顯示展示位置選項
  - 驗收：管理員清楚知道精選內容的展示位置

## 1. 基礎設施與共用元件

- [ ] 1.1 安裝新依賴 xlsx、@dnd-kit/core、@dnd-kit/sortable `[admin-ui]`
  - 驗收：pnpm install 成功，package.json 已更新，build 通過
- [ ] 1.2 拆分 API 層為按領域分檔結構 `[admin-ui]`
  - 建立 src/api/admin-users.ts、admin-content.ts、admin-communication.ts、admin-reports.ts、admin-support.ts、admin-system.ts、admin-trust.ts、admin-learning.ts、admin-gamification.ts、admin-community.ts、admin-events.ts、admin-audit.ts、admin-ai-assistant.ts
  - 既有 admin.ts 不動
  - 驗收：所有檔案建立，既有功能不受影響，build 通過
- [ ] 1.3 建立 ExportButton 共用元件 `[admin-ui]`
  - 支援 CSV + Excel 下拉選單、UTF-8 BOM、column config、loading state、空資料處理
  - 檔名格式：{pageName}_{yyyy-MM-dd}.{ext}
  - 驗收：在任一現有頁面整合測試匯出功能正常
- [ ] 1.4 建立 StatCard 共用元件 `[admin-ui]`
  - 從 daodao-f2e 遷移 stat-card.tsx，改寫為目標 repo 風格（tailwind-merge + cn）
  - 驗收：元件可獨立渲染，props 型別完整
- [ ] 1.5 設定所有新頁面使用 React.lazy() 動態載入 `[admin-ui]`
  - 在 App.tsx 中新增路由時統一用 lazy import + Suspense
  - 驗收：新頁面不增加 initial bundle size，可正常載入
- [ ] 1.6 建立 src/hooks/ 目錄並確立 custom hook 慣例 `[admin-ui]`
  - 建立目錄，為現有 DashboardPage 建立示範 hook（useAdminDashboardStats）
  - 驗收：hook 正常運作，既有頁面不受影響，作為後續頁面的 hook 範本
- [ ] 1.7 安裝 rich text 編輯器依賴 @tiptap/react + @tiptap/starter-kit `[admin-ui]`
  - 建立 RichTextEditor 共用元件（供郵件模板、FAQ 編輯使用）
  - 驗收：元件可渲染、輸入、取得 HTML 內容
- [ ] 1.8 安裝測試依賴 vitest + @testing-library/react（如尚未安裝）`[admin-ui]`
  - 設定 vitest config，建立測試範本
  - 驗收：pnpm test 可執行，示範測試通過

## 2. Sidebar 改版

- [ ] 2.1 重構 Sidebar 為分組式導航 `[admin-ui]`
  - 建立 SidebarGroup 元件，支援 collapsible sections
  - 分組：總覽、用戶、AI 服務、內容、溝通、報表、支援、系統、信任與審核、學習、遊戲化、社群、活動
  - 驗收：所有分組可展開/收合，既有頁面連結正常
- [ ] 2.2 Sidebar 狀態持久化 `[admin-ui]`
  - 展開/收合狀態存入 localStorage
  - 驗收：重新整理頁面後分組展開狀態維持
- [ ] 2.3 Sidebar 響應式與行動版 `[admin-ui]`
  - 桌面版固定顯示，行動版漢堡選單 + overlay
  - 驗收：行動版寬度下 sidebar 正確隱藏/顯示

## 3. Phase 1 — 統一儀表板

- [ ] 3.1 建立統一 Dashboard API endpoints `[server]`
  - GET /api/v1/admin/dashboard/overview（用戶 KPI）
  - GET /api/v1/admin/dashboard/active-users（DAU/WAU/MAU）
  - 整合既有 /api/v1/admin/dashboard/stats（AI 成本）
  - 驗收：API 回傳正確資料，Zod schema 驗證通過
- [ ] 3.2 建立 Dashboard API types 與 hooks `[admin-ui]`
  - 在 admin-users.ts 新增 API functions
  - 建立 useAdminOverview、useAdminActiveUsers hooks
  - 驗收：hooks 回傳正確型別，loading/error 狀態正常
- [ ] 3.3 改版 DashboardPage 合併 KPI + AI 成本 + 系統健康 `[admin-ui]`
  - 用戶 KPI cards（總用戶、本月新增、活躍用戶、成長率）
  - DAU/WAU/MAU 區塊含趨勢指標
  - AI 成本摘要（既有資料）
  - 系統健康狀態指示器
  - 近期異常警示
  - 自動 60 秒刷新
  - 驗收：所有區塊正確渲染，loading skeleton 正常

## 4. Phase 1 — 用戶管理強化

- [ ] 4.1 建立用戶標籤相關 DB migration `[storage]`
  - 建立 user_tags、tag_rules 資料表
  - 驗收：migration up/down 成功，表結構正確
- [ ] 4.2 建立用戶標籤 API endpoints `[server]`
  - CRUD /api/v1/admin/tags（手動標籤）
  - CRUD /api/v1/admin/tag-rules（自動標籤規則）
  - POST /api/v1/admin/users/bulk-tag（批量貼標）
  - 驗收：所有 endpoint CRUD 正常，Zod 驗證通過
- [ ] 4.3 建立 UserTagsPage 用戶標籤管理頁 `[admin-ui]`
  - 標籤列表（類型、用戶數、建立日期）
  - 手動標籤 CRUD（名稱、顏色、描述）
  - 自動標籤規則設定（AND/OR 條件、啟停開關）
  - 驗收：可建立/編輯/刪除標籤，自動規則可設定條件
- [ ] 4.4 在現有 UserManagementPage 加入標籤篩選 `[admin-ui]`
  - 新增標籤篩選 dropdown
  - 支援批量指派/移除標籤
  - 驗收：可依標籤篩選用戶列表，批量操作正常
- [ ] 4.5 建立用戶詳情相關 API endpoints `[server]`
  - GET /api/v1/admin/users/:id（用戶資料 + AI 用量統計）
  - GET /api/v1/admin/users/:id/timeline（活動時間軸）
  - GET /api/v1/admin/users/:id/login-history（登入歷史）
  - GET /api/v1/admin/users/:id/export（個人資料匯出 JSON）
  - 驗收：API 回傳完整資料，分頁正常
- [ ] 4.6 建立 UserDetailPage 用戶詳情頁 `[admin-ui]`
  - 個人資料區塊（姓名、Email、頭像、註冊日、最後登入、狀態）
  - 活動時間軸（事件類型篩選 + 日期範圍篩選）
  - AI 用量統計（總查詢、總 token、總成本、常用模型）
  - 登入歷史（時間、IP、裝置）
  - 角色指派 / 帳號啟停
  - 個人資料匯出按鈕（下載 JSON）
  - 驗收：從用戶列表點擊可進入詳情，所有區塊正確渲染
- [ ] 4.7 建立用戶分析相關 API endpoints `[server]`
  - GET /api/v1/admin/analytics/registrations（註冊趨勢）
  - GET /api/v1/admin/analytics/active-users（DAU/WAU/MAU 時序資料）
  - GET /api/v1/admin/analytics/funnel（漏斗資料）
  - GET /api/v1/admin/analytics/cohort-retention（Cohort 留存矩陣）
  - 驗收：API 回傳正確時序/矩陣資料
- [ ] 4.8 建立 UserAnalyticsPage 用戶分析頁 `[admin-ui]`
  - DAU/WAU/MAU 趨勢折線圖 + 環比變化
  - 註冊趨勢圖（日/週/月）
  - 漏斗圖（註冊→首次登入→首次打卡→7日回訪→30日活躍）
  - Cohort 留存矩陣熱力圖（CSS Grid + 色階）
  - 日期範圍篩選、標籤分群篩選
  - ExportButton 匯出
  - 驗收：所有圖表正確渲染，篩選功能正常，匯出可用

## 5. Phase 1 — 內容與系統

- [ ] 5.1 建立主題實踐管理 API endpoints `[server]`
  - GET /api/v1/admin/practices（列表 + 搜尋 + 篩選 + 排序 + 分頁）
  - PATCH /api/v1/admin/practices/:id/status（狀態切換）
  - GET /api/v1/admin/practices/stats（統計摘要）
  - 驗收：API 支援所有查詢參數，分頁正常
- [ ] 5.2 建立 PracticesPage 主題實踐管理頁 `[admin-ui]`
  - 搜尋列 + 狀態篩選（active/inactive/draft）
  - 排序（建立日期、按讚數、參與人數）
  - 列表顯示（標題、狀態、建立者、日期、參與人數、按讚數）
  - 統計摘要（總數、活躍數、總參與人數）
  - 分頁 + ExportButton
  - 驗收：搜尋/篩選/排序/分頁/匯出全部正常
- [ ] 5.3 建立系統監控 API endpoints `[server]`
  - GET /api/v1/admin/system/monitor（CPU/記憶體/磁碟）
  - GET /api/v1/admin/system/db-info（PostgreSQL 連線池/查詢統計）
  - GET /api/v1/admin/system/redis-info（Redis 記憶體/連線數）
  - 驗收：API 回傳即時系統指標
- [ ] 5.4 建立 SystemMonitorPage 系統監控頁 `[admin-ui]`
  - CPU/記憶體/磁碟使用率 gauge
  - PostgreSQL 連線池狀態 + 查詢統計
  - Redis 記憶體使用 + 連線數
  - 30 秒自動刷新（refetchInterval）
  - 閾值超標時警示指標
  - 驗收：所有指標正確顯示，自動刷新正常
- [ ] 5.5 建立郵件管理 API endpoints `[server]`
  - GET /api/v1/admin/email/stats（發送統計）
  - GET /api/v1/admin/email/health（SMTP 健康）
  - GET /api/v1/admin/email/queue（佇列狀態）
  - POST /api/v1/admin/email/send（手動發信）
  - POST /api/v1/admin/email/send-bulk（批量發信）
  - 驗收：API 正常運作，手動發信可送達
- [ ] 5.6 建立 EmailManagementPage 郵件管理頁 `[admin-ui]`
  - 發送統計（總發送、成功率、退信率）
  - SMTP 服務狀態
  - 郵件佇列大小 + 待發送數
  - 手動發信表單（收件人、主旨、內容）
  - 批量發信（選擇用戶分群）
  - ExportButton 匯出統計
  - 驗收：統計正確顯示，手動/批量發信功能正常

## 6. Phase 1 — 遷移 daodao-f2e admin 頁面

- [ ] 6.1 遷移 Dashboard 頁面的 KPI 資料取得邏輯 `[admin-ui]`
  - 將 f2e useAdminOverview、useAdminActiveUsers、useEmailStats、useEmailHealth 改寫為 react-query hooks
  - 移除 "use client"、@daodao/api、@daodao/i18n 依賴，改用 axios + react-router-dom
  - 驗收：新 hooks 回傳與舊 hooks 相同資料結構
- [ ] 6.2 遷移 admin-sidebar 元件 `[admin-ui]`
  - 將 f2e AdminSidebar + AdminMobileHeader 的設計語言納入新 Sidebar（已在 task 2.1 重構）
  - 確認新 Sidebar 涵蓋所有舊 sidebar 的導航項目
  - 驗收：舊 sidebar 所有選單項目都出現在新 Sidebar 中
- [ ] 6.3 遷移用戶統計頁（f2e admin/users）到 UserAnalyticsPage `[admin-ui]`
  - 改寫 f2e 的 recharts 圖表（註冊趨勢、留存率、裝置分析、熱門 profile）
  - 替換 @daodao/api hooks → react-query、@daodao/i18n Link → react-router-dom Link
  - 驗收：圖表正確渲染，資料與舊頁面一致
- [ ] 6.4 遷移用戶詳情頁（f2e admin/users/[userId]）到 UserDetailPage `[admin-ui]`
  - 改寫 f2e 的個人資料、活動統計、登入歷史、角色指派
  - 替換所有 monorepo package 依賴
  - 驗收：從用戶列表可導航到詳情頁，所有區塊正確渲染
- [ ] 6.5 遷移角色權限頁（f2e admin/roles）— 檢查與現有 RolesPermissionsPage 差異 `[admin-ui]`
  - 比對 f2e 版本和 admin-ui 現有版本的功能差異
  - 將 f2e 有但 admin-ui 缺少的功能補齊
  - 驗收：RolesPermissionsPage 涵蓋兩邊所有功能

## 7. Phase 1 — 現有頁面加匯出

- [ ] 7.1 在 UserManagementPage 加入 ExportButton `[admin-ui]`
  - 驗收：可匯出用戶列表為 CSV/Excel
- [ ] 7.2 在 QueryLogsPage 加入 ExportButton `[admin-ui]`
  - 驗收：可匯出查詢日誌為 CSV/Excel
- [ ] 7.3 在 UserQuotasPage 加入 ExportButton `[admin-ui]`
  - 驗收：可匯出配額列表為 CSV/Excel
- [ ] 7.4 在 DashboardPage 加入 ExportButton（KPI 摘要）`[admin-ui]`
  - 驗收：可匯出 Dashboard KPI 資料為 CSV/Excel

## 8. Phase 2 — 溝通系統

- [ ] 8.1 建立通知相關 DB migration `[storage]`
  - 建立 notifications、notification_targets 資料表
  - 驗收：migration 成功，表結構支援全體/標籤/個人推送
- [ ] 8.2 建立站內通知 API endpoints `[server]`
  - CRUD /api/v1/admin/notifications
  - POST /api/v1/admin/notifications/:id/send（發送/排程）
  - GET /api/v1/admin/notifications/:id/stats（已讀統計）
  - 驗收：可建立、預覽、發送、排程通知，已讀統計正確
- [ ] 8.3 建立 NotificationsPage 站內通知頁 `[admin-ui]`
  - 建立通知（標題、內容、類型：公告/提醒/系統通知）
  - 目標選擇（全體/指定標籤/指定用戶）
  - 排程發送（選擇日期時間）
  - 預覽功能
  - 歷史紀錄（發送數、已讀數、已讀率）
  - 驗收：完整 CRUD + 發送/排程/預覽流程正常
- [ ] 8.4 建立觸發式郵件相關 DB migration `[storage]`
  - 建立 email_trigger_rules、email_templates、email_execution_log 資料表
  - 驗收：migration 成功
- [ ] 8.5 建立觸發式郵件 API endpoints `[server]`
  - CRUD /api/v1/admin/email-triggers（規則管理）
  - CRUD /api/v1/admin/email-templates（模板管理）
  - GET /api/v1/admin/email-triggers/:id/log（執行紀錄）
  - GET /api/v1/admin/email-triggers/:id/stats（成效統計）
  - 驗收：規則 CRUD 正常，執行紀錄可查詢
- [ ] 8.6 建立觸發式郵件排程 worker `[server]`
  - BullMQ 定期掃描符合條件的用戶 + 發信
  - 記錄執行結果（發送對象、時間、開信/點擊追蹤）
  - 驗收：沉睡 N 天用戶自動收到喚回信，執行紀錄正確
- [ ] 8.7 建立 TriggeredEmailsPage 觸發式郵件頁 `[admin-ui]`
  - 規則列表（條件、動作、啟停開關）
  - 規則建立/編輯（條件選擇：沉睡N天/註冊N天未打卡/標籤變更 + 模板選擇）
  - 模板編輯（主旨、內容 rich text、變數插入）
  - 執行紀錄列表
  - 成效統計（每條規則的發送數、開信率、點擊率）
  - 驗收：完整規則 CRUD + 模板編輯 + 統計顯示正常

## 9. Phase 2 — 報表中心

- [ ] 9.1 建立報表相關 DB migration `[storage]`
  - 建立 scheduled_reports、report_executions、custom_report_configs、alert_rules、alert_history 資料表
  - 驗收：migration 成功
- [ ] 9.2 建立排程報表 API endpoints `[server]`
  - CRUD /api/v1/admin/reports/scheduled
  - GET /api/v1/admin/reports/scheduled/:id/preview（預覽）
  - GET /api/v1/admin/reports/scheduled/:id/history（執行歷史）
  - 驗收：可建立排程、預覽報表內容
- [ ] 9.3 建立排程報表 worker `[server]`
  - BullMQ scheduled job 依頻率（每日/週/月）生成報表 + 寄信
  - 驗收：到達排程時間自動生成報表並寄送到指定 email
- [ ] 9.4 建立 ScheduledReportsPage 排程報表頁 `[admin-ui]`
  - 報表排程列表 + CRUD
  - 頻率設定（每日/週/月）+ 收件人 email 列表
  - KPI section 選擇（用戶成長、DAU/WAU/MAU、AI 成本、郵件統計、系統健康）
  - 預覽 + 執行歷史
  - 驗收：完整 CRUD + 預覽 + 歷史顯示正常
- [ ] 9.5 建立自訂報表 API endpoints `[server]`
  - GET /api/v1/admin/reports/custom/fields（可用欄位清單）
  - POST /api/v1/admin/reports/custom/query（依選定欄位查詢資料）
  - CRUD /api/v1/admin/reports/custom/saved（儲存的報表設定）
  - 驗收：可查詢任意欄位組合，儲存/載入設定正常
- [ ] 9.6 建立 CustomReportsPage 自訂報表頁 `[admin-ui]`
  - 欄位選擇器（drag-and-drop，@dnd-kit）
  - 查詢結果表格 + 可選圖表
  - 儲存為常用報表（命名 + 儲存）
  - 重新執行已儲存報表（載入設定 + 更新資料）
  - ExportButton 匯出
  - 驗收：拖拉選欄位 → 查詢 → 顯示結果 → 儲存 → 重新載入全流程正常
- [ ] 9.7 建立異常警報 API endpoints `[server]`
  - CRUD /api/v1/admin/alerts/rules
  - GET /api/v1/admin/alerts/history（觸發歷史）
  - 驗收：可建立警報規則，歷史紀錄可查詢
- [ ] 9.8 建立異常警報檢測 worker `[server]`
  - BullMQ 定期檢查指標是否超過閾值
  - 觸發時發送 Email / 站內通知
  - 驗收：指標超過閾值時自動觸發通知
- [ ] 9.9 建立 AnomalyAlertsPage 異常警報頁 `[admin-ui]`
  - 規則列表 + CRUD（指標選擇、條件、閾值、通知管道、啟停開關）
  - 可用指標：DAU、WAU、MAU、每日 AI 成本、郵件退信率、錯誤率
  - 觸發歷史列表（觸發時間、指標值、閾值、處理狀態）
  - 驗收：完整 CRUD + 歷史顯示正常

## 10. Phase 2 — 用戶支援

- [ ] 10.1 建立用戶支援相關 DB migration `[storage]`
  - 建立 feedback、feedback_replies、faq_categories、faq_items 資料表
  - 驗收：migration 成功
- [ ] 10.2 建立意見回饋 API endpoints `[server]`
  - GET /api/v1/admin/feedback（列表 + 篩選 + 分頁）
  - PATCH /api/v1/admin/feedback/:id（更新狀態/分類）
  - POST /api/v1/admin/feedback/:id/reply（回覆）
  - 驗收：可查詢/篩選/回覆回饋
- [ ] 10.3 建立 FeedbackPage 意見回饋頁 `[admin-ui]`
  - 回饋列表（用戶、日期、內容、分類、狀態）
  - 狀態篩選（待處理/已回覆/已關閉）+ 分類篩選
  - 回覆功能（回覆內容送至用戶 email/站內通知）
  - 分類標記（bug/feature request/question/other）
  - 未讀/待處理數量 badge
  - 驗收：完整查詢/篩選/回覆/分類流程正常
- [ ] 10.4 建立 FAQ API endpoints `[server]`
  - CRUD /api/v1/admin/faq/categories
  - CRUD /api/v1/admin/faq/items
  - PATCH /api/v1/admin/faq/items/reorder（排序）
  - PATCH /api/v1/admin/faq/items/bulk-publish（批量上下架）
  - 驗收：CRUD + 排序 + 批量上下架正常
- [ ] 10.5 建立 FAQManagementPage FAQ 管理頁 `[admin-ui]`
  - 分類管理 + FAQ 項目 CRUD
  - rich text 編輯器（回答內容，使用 Tiptap）
  - drag-and-drop 排序
  - 上架/下架 toggle + 批量操作
  - 驗收：完整 CRUD + 排序 + 上下架流程正常

## 11. Phase 2 — 審計日誌

- [ ] 11.1 建立審計日誌 DB migration `[storage]`
  - 建立 audit_logs 資料表（timestamp、admin_id、action、target、old_value、new_value、ip、user_agent）
  - 建立索引（timestamp、admin_id、action_type）
  - 驗收：migration 成功，索引建立
- [ ] 11.2 建立審計日誌中間件 `[server]`
  - Express middleware 自動記錄所有 admin API 操作
  - 記錄 old/new value diff
  - 驗收：任何 admin API 操作自動產生 audit log
- [ ] 11.3 建立審計日誌 API endpoints `[server]`
  - GET /api/v1/admin/audit-logs（列表 + 篩選 + 分頁 + 全文搜尋）
  - POST /api/v1/admin/audit-logs/compliance-hold（合規鎖定）
  - GET/PUT /api/v1/admin/data-retention-policy（資料保留政策）
  - 驗收：可查詢/篩選/搜尋日誌，合規鎖定正常
- [ ] 11.4 建立 AuditLogPage 審計日誌頁 `[admin-ui]`
  - 日誌列表（時間、管理員、操作、目標、IP）逆時序分頁
  - 篩選（管理員、操作類型、目標資源、日期範圍）
  - 全文搜尋
  - 合規鎖定設定
  - 資料保留政策設定
  - ExportButton 匯出
  - 驗收：完整查詢/篩選/搜尋/匯出/鎖定流程正常

## 12. Phase 3 — 信任等級與 AutoMod

- [ ] 12.1 建立信任等級相關 DB migration `[storage]`
  - 建立 trust_levels、trust_level_configs、trust_level_history、user_groups、group_permissions 資料表
  - 驗收：migration 成功
- [ ] 12.2 建立信任等級 API endpoints `[server]`
  - GET/PUT /api/v1/admin/trust-levels/config（等級閾值設定）
  - GET /api/v1/admin/trust-levels/distribution（等級分布）
  - GET /api/v1/admin/trust-levels/history（升降級歷史）
  - PATCH /api/v1/admin/users/:id/trust-level（手動覆寫）
  - 驗收：等級設定/分布/歷史/覆寫全部正常
- [ ] 12.3 建立群組權限 API endpoints `[server]`
  - CRUD /api/v1/admin/user-groups
  - PUT /api/v1/admin/user-groups/:id/permissions（群組權限覆寫）
  - 驗收：群組 CRUD + 權限覆寫正常
- [ ] 12.4 建立信任等級自動評估 worker `[server]`
  - BullMQ 定期掃描用戶活動指標，自動升/降級
  - 降級 14 天寬限期邏輯
  - 驗收：符合條件的用戶自動升級，活躍度下降的用戶在寬限期後降級
- [ ] 12.5 建立信任等級初始化 migration script `[server]`
  - 根據既有用戶歷史活動資料一次性計算初始等級
  - 驗收：既有用戶獲得合理的初始等級，不全部從 Lv0 開始
- [ ] 12.6 建立 AutoMod 相關 DB migration `[storage]`
  - 建立 automod_rules、automod_word_lists、automod_actions_log、content_flags 資料表
  - 驗收：migration 成功
- [ ] 12.7 建立 AutoMod 關鍵字規則 API endpoints `[server]`
  - CRUD /api/v1/admin/automod/rules（關鍵字規則，支援萬用字元）
  - CRUD /api/v1/admin/automod/word-lists（預設敏感詞庫管理）
  - GET /api/v1/admin/automod/log（審核動作紀錄）
  - 驗收：規則 CRUD + 詞庫管理 + 紀錄查詢正常
- [ ] 12.8 建立 AutoMod 垃圾偵測與用戶名過濾 API endpoints `[server]`
  - PUT /api/v1/admin/automod/spam-detection（ML 垃圾偵測開關）
  - CRUD /api/v1/admin/automod/username-blocklist（用戶名黑名單）
  - 驗收：ML 開關正常，黑名單 CRUD 正常
- [ ] 12.9 建立 AutoMod 檢舉佇列 API endpoints `[server]`
  - GET /api/v1/admin/automod/flag-queue（檢舉佇列 + 優先度排序）
  - POST /api/v1/admin/automod/flag-queue/:id/action（同意/駁回/延後/刪除/靜音用戶）
  - 驗收：佇列查詢 + 一鍵處理正常
- [ ] 12.10 建立 AutoMod 內容過濾 middleware `[server]`
  - 在內容發布 API（daodao-server 的 post/comment routes）加入關鍵字過濾攔截
  - 社群自治：多人檢舉自動隱藏（可設定閾值 N）
  - 驗收：發布含敏感詞內容自動處理，多人檢舉自動隱藏
- [ ] 12.11 建立 TrustLevelsPage — 等級分布與設定 `[admin-ui]`
  - 等級分布圖表 + 近期升降級列表
  - 等級閾值設定表單（每級：閱讀數、發文數、天數、讚數）
  - 各等級解鎖能力設定
  - 驗收：分布圖表 + 閾值設定 + 能力設定全部正常
- [ ] 12.12 建立 TrustLevelsPage — 群組管理 `[admin-ui]`
  - 群組列表 + CRUD
  - 群組權限覆寫設定（與信任等級脫鉤的權限指派）
  - 驗收：群組 CRUD + 權限覆寫操作正常
- [ ] 12.13 建立 AutoModPage AutoMod 管理頁 `[admin-ui]`
  - 關鍵字規則列表 + CRUD（萬用字元支援）
  - 預設敏感詞庫啟停 toggle
  - 違規動作設定（靜默刪除/警告/禁言 N 分鐘）
  - ML 垃圾偵測開關
  - 用戶名黑名單管理
  - 審核動作紀錄
  - 檢舉佇列（優先度排序 + 一鍵處理）
  - 驗收：完整 CRUD + 佇列處理流程正常

## 13. Phase 3 — 學習管理

- [ ] 13.1 建立學習進度與滴灌 DB migration `[storage]`
  - 建立 learning_progress、drip_schedules 資料表
  - 驗收：migration 成功，關聯正確
- [ ] 13.2 建立測驗相關 DB migration `[storage]`
  - 建立 quizzes、quiz_questions、quiz_attempts 資料表
  - 驗收：migration 成功，關聯正確
- [ ] 13.3 建立證書與學習路徑 DB migration `[storage]`
  - 建立 certificates、certificate_templates、learning_paths、learning_path_courses 資料表
  - 驗收：migration 成功，關聯正確
- [ ] 13.4 建立課程進度 API endpoints `[server]`
  - GET /api/v1/admin/learning/courses（課程列表 + 完成率）
  - GET /api/v1/admin/learning/courses/:id/drop-off（卡關點分析）
  - GET /api/v1/admin/learning/courses/:id/stalled-users（停滯用戶）
  - GET /api/v1/admin/learning/courses/cohort-comparison（Cohort 對比）
  - 驗收：API 回傳正確進度/卡關/停滯資料
- [ ] 13.5 建立 LearningProgressPage 課程進度追蹤頁 `[admin-ui]`
  - 課程列表（註冊數、完成率、平均進度、平均耗時）
  - 卡關點分析（哪些課時最多人放棄）
  - 停滯用戶列表（N 天無進度，可設定 N）
  - Cohort 對比圖表
  - 驗收：所有指標正確顯示
- [ ] 13.6 建立滴灌排程 API endpoints `[server]`
  - CRUD /api/v1/admin/learning/drip-schedules
  - POST /api/v1/admin/learning/drip-schedules/manual-unlock（手動解鎖）
  - GET /api/v1/admin/learning/drip-schedules/:id/overview（用戶所在階段）
  - 驗收：可建立排程、手動解鎖、查詢用戶進度
- [ ] 13.7 建立 DripContentPage 內容滴灌排程頁 `[admin-ui]`
  - 排程列表 + CRUD（「Module N 於註冊後 X 天解鎖」/指定日期解鎖）
  - 排程總覽（各階段用戶分布）
  - 手動為特定用戶解鎖
  - 驗收：完整排程 CRUD + 用戶分布顯示正常
- [ ] 13.8 建立測驗管理 API endpoints `[server]`
  - CRUD /api/v1/admin/learning/quizzes
  - CRUD /api/v1/admin/learning/quizzes/:id/questions
  - GET /api/v1/admin/learning/quizzes/:id/stats（成績統計）
  - 驗收：測驗 + 題目 CRUD 正常，統計正確
- [ ] 13.9 建立 QuizzesPage 測驗管理頁 `[admin-ui]`
  - 測驗列表 + CRUD（附加到課程/課時）
  - 題目編輯（選擇題/是非題/簡答題 + 及格線設定）
  - 成績統計（每題正確率、平均分、通過率）
  - 預覽功能（以學生視角檢視）
  - 驗收：完整 CRUD + 統計 + 預覽正常
- [ ] 13.10 建立證書管理 API endpoints `[server]`
  - CRUD /api/v1/admin/learning/certificates/templates
  - POST /api/v1/admin/learning/certificates/issue（發放）
  - POST /api/v1/admin/learning/certificates/bulk-issue（批量發放）
  - GET /api/v1/admin/learning/certificates（已發放列表）
  - GET /api/v1/admin/learning/certificates/:id/verify（驗證連結）
  - 驗收：模板 CRUD + 發放 + 驗證全流程正常
- [ ] 13.11 建立 CertificatesPage 證書管理頁 `[admin-ui]`
  - 模板管理（自訂欄位、品牌樣式）
  - 完成條件設定（課時完成 + 測驗分數門檻）
  - 批量發放（選擇 Cohort）
  - 已發放證書列表 + 搜尋/篩選
  - 驗收：完整模板 CRUD + 發放流程正常
- [ ] 13.12 建立學習路徑 API endpoints `[server]`
  - CRUD /api/v1/admin/learning/paths
  - PUT /api/v1/admin/learning/paths/:id/courses（設定課程順序 + 先修條件）
  - GET /api/v1/admin/learning/paths/:id/analytics（路徑級分析）
  - 驗收：路徑 CRUD + 先修設定 + 分析正常
- [ ] 13.13 建立 LearningPathsPage 學習路徑頁 `[admin-ui]`
  - 路徑列表 + CRUD
  - 視覺課程地圖（顯示課程相依關係）
  - 先修條件設定
  - 路徑級分析（用戶在多課程路徑的進展）
  - 驗收：完整 CRUD + 視覺地圖 + 分析正常

## 14. Phase 3 — 遊戲化

- [ ] 14.1 建立遊戲化相關 DB migration `[storage]`
  - 建立 badges、user_badges、challenges、challenge_progress、leaderboard_configs、user_points 資料表
  - 驗收：migration 成功
- [ ] 14.2 建立徽章 API endpoints `[server]`
  - CRUD /api/v1/admin/gamification/badges
  - POST /api/v1/admin/gamification/badges/:id/award（手動頒發）
  - DELETE /api/v1/admin/gamification/badges/:id/revoke/:userId（撤回）
  - 驗收：徽章 CRUD + 頒發/撤回正常
- [ ] 14.3 建立徽章自動頒發 worker `[server]`
  - BullMQ 定期檢查用戶行為是否觸發徽章條件
  - 支援條件：首次打卡、連續 N 天、累計 N 篇筆記、獲得 N 讚
  - 上線時根據歷史資料回溯頒發符合條件的徽章
  - 驗收：符合條件自動頒發，不重複頒發，歷史回溯正確
- [ ] 14.4 建立挑戰與連續打卡 API endpoints `[server]`
  - CRUD /api/v1/admin/gamification/challenges
  - GET /api/v1/admin/gamification/challenges/:id/participants（參與者 + 進度）
  - GET /api/v1/admin/gamification/streaks/distribution（連續打卡分布）
  - 驗收：挑戰 CRUD + 進度追蹤 + 打卡分布正常
- [ ] 14.5 建立排行榜 API endpoints `[server]`
  - GET/PUT /api/v1/admin/gamification/leaderboard/config（權重設定）
  - GET /api/v1/admin/gamification/leaderboard（排名列表 + 週期篩選）
  - POST /api/v1/admin/gamification/leaderboard/reset（重置週期排行）
  - 驗收：排名計算正確，權重設定生效
- [ ] 14.6 建立 BadgesPage 徽章管理頁 `[admin-ui]`
  - 徽章列表（圖示、名稱、觸發條件、頒發數、建立日期）
  - 自訂徽章 CRUD（名稱、描述、圖示上傳、觸發條件設定）
  - 手動頒發/撤回
  - 驗收：完整 CRUD + 頒發流程正常
- [ ] 14.7 建立 ChallengesPage 挑戰管理頁 `[admin-ui]`
  - 挑戰列表（進行中/即將開始/已結束 + 參與人數 + 完成率）
  - 挑戰 CRUD（名稱、描述、期間、需完成動作、獎勵）
  - 參與者列表 + 個人進度
  - 連續打卡分布圖
  - 驗收：完整 CRUD + 進度追蹤 + 分布圖正常
- [ ] 14.8 建立 LeaderboardsPage 排行榜管理頁 `[admin-ui]`
  - 活動權重設定（發文=X、留言=Y、獲讚=Z、完成課程=W）
  - 排名列表（Top N，含頭像、暱稱、分數明細）
  - 週期篩選（週/月/總計）
  - 重置週期排行
  - 驗收：權重設定後排名即時更新，篩選正常

## 15. Phase 3 — 社群 Onboarding 與內容績效

- [ ] 15.1 建立 Onboarding 相關 DB migration `[storage]`
  - 建立 onboarding_flows、onboarding_steps、onboarding_responses、onboarding_answer_mappings 資料表
  - 驗收：migration 成功
- [ ] 15.2 建立 Onboarding API endpoints `[server]`
  - CRUD /api/v1/admin/onboarding/flows
  - CRUD /api/v1/admin/onboarding/flows/:id/steps
  - PUT /api/v1/admin/onboarding/flows/:id/mappings（答案→動作對應）
  - GET /api/v1/admin/onboarding/flows/:id/analytics（完成率/各步驟統計）
  - 驗收：流程 CRUD + 對應設定 + 統計正常
- [ ] 15.3 建立 OnboardingFlowsPage Onboarding 管理頁 `[admin-ui]`
  - 流程列表 + CRUD + 啟停開關
  - 步驟編輯（單選/多選/自由文字）
  - 答案→動作對應（貼標籤、指派角色、推薦內容）
  - 引導第一步行動設定
  - 完成徽章設定
  - 預覽功能
  - 分析（每步完成率、流失點、常見答案）
  - 驗收：完整 CRUD + 預覽 + 分析正常
- [ ] 15.4 建立內容績效 API endpoints `[server]`
  - GET /api/v1/admin/content/performance（每篇：瀏覽、閱讀深度、停留時間、互動率）
  - GET /api/v1/admin/content/attribution（哪些內容帶來新註冊）
  - PATCH /api/v1/admin/content/:id/feature（設為精選/置頂/排程精選）
  - CRUD /api/v1/admin/content/collections（策展集合）
  - 驗收：績效查詢 + 精選操作 + 策展正常
- [ ] 15.5 建立 ContentPerformancePage 內容績效頁 `[admin-ui]`
  - 內容列表（瀏覽數、閱讀深度、停留時間、互動率）+ 可排序
  - 註冊歸因追蹤
  - 編輯精選 / 置頂 / 排程精選（含自動到期）
  - 策展集合管理
  - 日期範圍篩選
  - ExportButton 匯出
  - 零互動內容標記
  - 驗收：排序/精選/策展/篩選/匯出全部正常

## 16. Phase 4 — 活動管理

- [ ] 16.1 建立活動管理相關 DB migration `[storage]`
  - 建立 events、event_rsvps、event_templates、event_recordings 資料表
  - 驗收：migration 成功
- [ ] 16.2 建立活動管理 API endpoints `[server]`
  - CRUD /api/v1/admin/events
  - POST /api/v1/admin/events/:id/checkin（簽到）
  - GET /api/v1/admin/events/:id/analytics（出席率統計）
  - CRUD /api/v1/admin/events/templates（週期性模板）
  - POST /api/v1/admin/events/templates/:id/generate（生成未來場次）
  - CRUD /api/v1/admin/events/:id/recordings（錄影管理）
  - POST /api/v1/admin/events/:id/remind（發送提醒）
  - 驗收：完整 CRUD + 簽到 + 模板生成 + 提醒正常
- [ ] 16.3 建立 EventsPage 活動管理頁 `[admin-ui]`
  - 活動列表 + 篩選（即將舉行/已結束/週期性）
  - 活動 CRUD（標題、描述、時間、地點/連結、人數上限）
  - RSVP 追蹤（已報名/候補/出席/缺席）
  - 簽到功能（手動 or QR code）
  - 週期性模板 CRUD + 自動生成場次 + 覆寫個別場次
  - 錄影上傳 + 回放權限設定
  - 活動分析（RSVP 數、出席率、缺席率）
  - 發送提醒給已報名用戶
  - 驗收：完整活動生命週期管理正常

## 17. Phase 4 — 會員名錄

- [ ] 17.1 建立會員名錄相關 DB migration `[storage]`
  - 建立 member_profile_fields、member_profile_values、member_connections 資料表
  - 驗收：migration 成功
- [ ] 17.2 建立會員名錄 API endpoints `[server]`
  - CRUD /api/v1/admin/member-directory/fields（自訂 Profile 欄位）
  - PUT /api/v1/admin/member-directory/fields/reorder（排序）
  - GET /api/v1/admin/member-directory/stats（欄位使用統計）
  - GET /api/v1/admin/member-directory/analytics（目錄使用分析）
  - PUT /api/v1/admin/member-directory/settings（啟停名錄功能）
  - 驗收：欄位 CRUD + 排序 + 統計 + 設定正常
- [ ] 17.3 建立 MemberDirectoryPage 會員名錄管理頁 `[admin-ui]`
  - 自訂 Profile 欄位管理（text/dropdown/multi-select/URL）
  - 必填/選填設定 + 可見性設定（公開/僅會員/僅管理員）
  - 欄位排序（drag-and-drop）
  - 欄位使用統計（多少用戶填寫了各欄位）
  - 名錄啟停開關
  - 使用分析（搜尋量、Profile 瀏覽量、連結率）
  - Profile 審核（隱藏不當內容）
  - 驗收：完整欄位管理 + 統計 + 審核正常

## 18. Phase 4 — AI 社群助手

- [ ] 18.1 建立 AI 助手相關 DB migration `[storage]`
  - 建立 ai_knowledge_entries、ai_conversations、ai_messages 資料表
  - 驗收：migration 成功
- [ ] 18.2 建立知識庫 API endpoints `[server]`
  - POST /api/v1/admin/ai-assistant/knowledge（上傳文件 → 轉發至 ai-backend 向量化）
  - GET /api/v1/admin/ai-assistant/knowledge（列表）
  - DELETE /api/v1/admin/ai-assistant/knowledge/:id（刪除）
  - 驗收：知識庫 CRUD 正常
- [ ] 18.3 建立 AI backend 向量化與 RAG endpoint `[ai-backend]`
  - POST /api/v1/knowledge/vectorize（接收文件 → 向量化存入 Qdrant）
  - DELETE /api/v1/knowledge/:id（移除向量）
  - POST /api/v1/knowledge/chat（RAG chat：檢索知識庫 + LLM 生成回答）
  - 驗收：上傳文件自動向量化，chat 可根據知識庫回答
- [ ] 18.4 建立 AI 助手對話管理 API endpoints `[server]`
  - GET /api/v1/admin/ai-assistant/conversations（對話列表 + 狀態篩選）
  - GET /api/v1/admin/ai-assistant/conversations/:id（對話詳情）
  - POST /api/v1/admin/ai-assistant/conversations/:id/takeover（人工接管）
  - GET /api/v1/admin/ai-assistant/stats（指標：總對話數、解決率、升級率）
  - PUT /api/v1/admin/ai-assistant/config（人格/語氣/範圍/Fallback 設定）
  - 驗收：對話管理 + 人工接管 + 設定正常
- [ ] 18.5 建立 AIAssistantPage AI 社群助手管理頁 `[admin-ui]`
  - 知識庫管理（上傳/查看/刪除文件）
  - AI 設定（人格、語氣、範圍界限、Fallback 訊息）
  - 空間啟停（設定哪些社群空間啟用 AI）
  - 共享收件匣（對話列表 + 狀態：AI 已解決/已升級/需人工）
  - 對話詳情檢視 + 人工接管回覆
  - 指標（總對話數、AI 解決率、平均回應時間、升級率）
  - 驗收：知識庫上傳 + AI 設定 + 收件匣 + 接管全流程正常

## 19. 收尾與移除

- [ ] 19.1 整合測試所有頁面路由 `[admin-ui]`
  - 確認所有 30+ 頁面路由可正常訪問
  - 確認 Sidebar 所有連結正確
  - 驗收：逐一訪問每個路由無 404 或空白頁
- [ ] 19.2 移除 daodao-f2e 的 /admin 路由 `[f2e]`
  - 刪除 apps/product/src/app/[locale]/admin/ 目錄
  - 刪除 apps/product/src/components/admin/ 目錄
  - 確認 build 通過
  - 驗收：daodao-f2e build 成功，無 admin 相關引用殘留
- [ ] 19.3 更新 README 與文件 `[admin-ui]`
  - 更新 README.md 說明新功能架構
  - 驗收：README 反映最新功能清單
