## Why

daodao 目前的管理功能散落在兩個 repo：`daodao-f2e`（平台營運：用戶統計、郵件、系統監控）和 `daodao-admin-ui`（AI 服務管理：模型、Prompts、查詢日誌）。團隊 2-5 人需要在兩個系統間切換，且缺乏社群管理、遊戲化、學習進度追蹤等教育平台核心功能。需要將 `daodao-admin-ui` 打造為統一的全功能營運中心，整合既有功能並大幅擴充社群、教育、內容管理能力。

## What Changes

### 遷移與整合
- 將 `daodao-f2e/apps/product/src/app/[locale]/admin` 的 6 個頁面遷移至 `daodao-admin-ui`，改寫為 Vite + React Router + react-query 架構
- 合併兩邊的 Dashboard 為統一儀表板（用戶 KPI + AI 成本 + 系統健康）
- 重新設計 Sidebar 為分組式導航（總覽、用戶、AI 服務、內容、溝通、報表、支援、系統、信任與審核、學習、遊戲化、社群、活動）

### 新增功能模組
- **用戶管理強化**：用戶詳情頁（活動時間軸、AI 用量）、用戶分析（DAU/WAU/MAU、漏斗、Cohort 留存）、標籤分群系統、個人資料匯出
- **匯出功能**：所有數據頁面支援 CSV + Excel 匯出，前端生成
- **內容管理**：主題實踐管理頁
- **溝通系統**：站內通知（對用戶/分群推送）、觸發式郵件（沉睡喚回、引導信）
- **報表中心**：排程報表（週/月 KPI 自動寄信）、自訂報表（拖拉欄位）、異常警報（閾值觸發通知）
- **用戶支援**：意見回饋收件匣、FAQ 管理
- **系統營運**：系統監控（CPU/記憶體/DB/Redis）、郵件管理（統計/狀態/手動發信）
- **信任等級系統**：Lv0→Lv3 自動升降級、群組權限覆寫、社群自治（多人檢舉自動隱藏）
- **AutoMod 自動審核**：關鍵字過濾、違規自動處理、ML 垃圾偵測、用戶名過濾
- **學習管理**：課程進度追蹤（完成率/卡關點）、內容滴灌排程、測驗管理、證書管理、學習路徑建構
- **遊戲化**：徽章系統（自動觸發 + 自訂）、挑戰 & 連續打卡、排行榜（可設定權重）
- **社群 Onboarding**：互動問卷、自動貼標/指派角色、引導第一步行動
- **內容績效分析**：閱讀深度、停留時間、互動率、策展功能
- **活動管理**：RSVP + 簽到、週期性活動模板、錄影管理
- **審計日誌**：管理員操作全記錄（365 天保留）、合規性鎖定、資料保留政策
- **會員名錄**：可搜尋的會員目錄、自訂 Profile 欄位、會員互連
- **AI 社群助手**：知識庫上傳、24/7 AI 回答、共享收件匣、人工接管

## Capabilities

### New Capabilities

- `unified-dashboard`: 合併用戶 KPI、AI 成本摘要、系統健康狀態、近期警示為統一儀表板
- `grouped-sidebar`: Sidebar 重新設計為分組式導航，支援 13 個功能群組的展開/收合
- `user-detail-timeline`: 用戶詳情頁，含個人資料、活動時間軸（登入/打卡/發文/AI 查詢）、AI 用量統計、個人資料匯出（GDPR）
- `user-analytics`: 用戶分析頁，含 DAU/WAU/MAU 趨勢、漏斗分析（註冊→打卡→活躍）、Cohort 留存矩陣熱力圖
- `user-tags-segmentation`: 用戶標籤與分群系統，含手動標籤、自動標籤規則引擎（活躍/沉睡/高用量）、列表標籤篩選
- `data-export`: 共用匯出元件，支援 CSV + Excel (.xlsx) 格式，匯出當前篩選條件資料，前端生成（xlsx 套件）
- `practice-management`: 主題實踐管理頁，含列表搜尋、狀態篩選、排序、統計摘要
- `communication`: 溝通系統，含站內通知（對全體/標籤/指定用戶推送、排程發送、已讀統計）和觸發式郵件（條件→動作規則、模板編輯、執行紀錄、成效統計）
- `report-center`: 報表中心，含排程報表（週/月 KPI 自動寄信）、自訂報表（拖拉欄位組合、儲存常用）、異常警報（閾值設定、Email/站內通知觸發）
- `user-support`: 用戶支援，含意見回饋收件匣（分類標記、狀態追蹤：待處理/已回覆/已關閉）和 FAQ 管理（分類排序、前台內容編輯、上下架）
- `system-ops`: 系統營運，含系統監控（CPU/記憶體/磁碟/PostgreSQL/Redis 健康）和郵件管理（發送統計、服務狀態、手動發信）
- `trust-automod`: 信任等級與自動審核系統，含 Lv0→Lv3 自動升降級、群組權限覆寫、社群自治（多人檢舉自動隱藏）、關鍵字過濾（預設+自訂+萬用字元）、違規自動處理、ML 垃圾偵測、用戶名過濾
- `learning-admin`: 學習管理後台，含課程進度追蹤（完成率/卡關點/停滯用戶）、內容滴灌排程（時間閘門）、測驗管理（題目/及格線/成績統計）、證書管理（模板/發放條件/驗證連結）、學習路徑建構（先修條件/視覺地圖）
- `gamification`: 遊戲化系統，含徽章（自動觸發+自訂圖示）、挑戰活動（限時目標/進度追蹤/完成獎勵）、連續打卡追蹤、排行榜（週/月/總計、活動加權可設定）
- `community-onboarding`: 社群 Onboarding 流程，含互動問卷（興趣調查）、依回答自動貼標籤/推薦內容/指派角色、引導第一步行動、完成徽章
- `content-performance`: 內容績效分析，含每篇閱讀深度（捲動%）、停留時間、互動率、新註冊轉換、編輯精選/置頂/策展
- `event-management`: 活動管理，含 RSVP + 簽到追蹤、週期性活動模板（每週 Office Hours）、錄影管理 + 回放權限
- `audit-log`: 審計日誌，含管理員操作全記錄（誰/什麼/何時/IP/新舊值）、365 天保留可匯出、合規性保留鎖定、資料保留政策設定
- `member-directory`: 會員名錄，含可搜尋目錄（依標籤/角色/興趣篩選）、自訂 Profile 欄位（職稱/學習目標/技能等級）、會員互連/私訊
- `ai-assistant`: AI 社群助手，含知識庫上傳（FAQ/課程/資源）、社群空間 24/7 AI 回答、共享收件匣（管理員檢視 AI 對話）、AI 無法解決時人工接管

### Modified Capabilities

（無既有 spec 需要修改）

## Impact

### 影響的子專案
- **daodao-admin-ui**（主要）：所有前端頁面、路由、元件、API 層的新增與改動
- **daodao-server**：需新增多個 admin API endpoint（標籤、通知、報表、信任等級、AutoMod、學習進度、遊戲化、活動、審計、會員名錄、AI 助手等）；既有的用戶/郵件/系統監控 API 已實作
- **daodao-storage**：需新增資料表（tags、notifications、email_rules、reports、alert_rules、feedback、faq、trust_levels、automod_rules、badges、challenges、events、audit_logs、member_profiles、ai_knowledge_base 等）
- **daodao-f2e**：遷移完成後移除 `/admin` 路由及相關元件

### 新增依賴
- `xlsx`：前端 Excel/CSV 匯出
- `@dnd-kit/core` + `@dnd-kit/sortable`：自訂報表拖拉欄位

### API 變更
- 大量新增 `/api/v1/admin/*` endpoint，不影響既有 API
- 遷移頁面使用的 API 已在 daodao-server 實作完成

### Breaking Changes
- 無。daodao-admin-ui 是獨立 repo，新增功能不影響既有頁面
