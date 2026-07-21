# user-detail-timeline
- 涉及 repo: admin-ui (UI) / server (API)
- 對應 archived change: admin-user-management-apis（部分）
- 總計: 11 條 requirement / 22 個 scenario | ✅3 ⚠️5 ❌3 ❓0

## Requirement: 使用者個人資料顯示 → ⚠️
證據: admin-ui:src/pages/UserDetailPage.tsx:937-942 顯示 name/email/註冊日期/最後登入/狀態 Badge；server GET /admin/users/:userId (admin.routes.ts:981)
- Scenario: 進入使用者詳情頁 → ⚠️ — 顯示姓名/Email/註冊/最後登入/狀態皆有，但**頭像以 name 後兩字 initials（line 891 `user.name.slice(-2)`）呈現，未渲染 photoURL 實際圖片**
- Scenario: 使用者無頭像 → ⚠️ — 永遠顯示 initials 圓圈，非 spec 所述「預設頭像佔位圖」，且也不顯示真實頭像

## Requirement: 活動時間軸顯示 → ⚠️
證據: admin-ui ActivityTimeline 組件 (UserDetailPage.tsx:86)；server GET activity-timeline (admin.routes.ts:1025)；type ActivityTimelineEvent
- Scenario: 載入使用者活動時間軸 → ⚠️ — 事件類型僅 `'login'|'checkin'|'post'`（types.ts:399），**缺 AI 查詢、角色變更等類型**；spec 要求登入/打卡/發文/留言/AI查詢/角色變更
- Scenario: 無任何活動紀錄 → ⚠️ — filtered.length===0 有空狀態（line 142），但無明確空提示文案內容驗證；部分符合

## Requirement: 活動時間軸事件類型篩選 → ⚠️
證據: UserDetailPage.tsx:84 eventFilterOptions = ['全部','登入','打卡','發文']
- Scenario: 篩選 AI 查詢事件 → ❌ — **篩選選項不含「AI 查詢」**（僅 登入/打卡/發文），無法篩選 AI 查詢
- Scenario: 清除篩選條件 → ✅ — filter='全部' 顯示全部 (line 89)

## Requirement: 活動時間軸日期範圍篩選 → ❌
證據: 無
- Scenario: 設定日期範圍篩選 → ❌ — page 無 startDate/endDate 篩選 UI；getActivityTimeline 只接受 `limit` param，無日期參數
- Scenario: 日期範圍與事件類型組合篩選 → ❌ — 同上，無日期篩選

## Requirement: AI 查詢事件詳細資訊 → ❌
證據: 無
- Scenario: 檢視 AI 查詢事件 → ❌ — 時間軸事件型別無 AI 類型，無 model/token/cost 欄位
- Scenario: AI 查詢事件展開詳情 → ❌ — 無對應實作

## Requirement: AI 使用統計彙總 → ❌
證據: AdminActivityStats type (types.ts:386) 僅 login/practice/checkin/post/reaction 計數
- Scenario: 檢視 AI 使用統計 → ❌ — **無總查詢次數/總 token/總費用/最常使用模型欄位**；ActivityStatsTab 也無此區塊
- Scenario: 使用者未曾使用 AI → ❌ — 無 AI 統計實作

## Requirement: 登入歷史紀錄 → ⚠️
證據: server GET login-history (admin.routes.ts:992)；admin-ui LoginHistoryTab (UserDetailPage.tsx:163)、useAdminLoginHistory
- Scenario: 檢視登入歷史 → ⚠️ — 有登入歷史列表，但需確認 IP/裝置/瀏覽器欄位是否齊全（AdminLoginHistoryItem 未檢視全部欄位）
- Scenario: 偵測異常登入 → ❌ — 無地理位置比對/異常視覺標記邏輯

## Requirement: 使用者角色指派 → ⚠️
證據: UserDetailPage.tsx:215 RoleManagementTab updateUserRole；server users/:userId/role
- Scenario: 變更使用者角色 → ⚠️ — 可變更角色，但**未確認會在時間軸新增「角色變更」事件**（時間軸型別無 role-change）
- Scenario: 角色變更確認 → ❌ — RoleManagementTab onChange 直接 changeRole，無確認對話框

## Requirement: 使用者帳號啟用/停用 → ✅
證據: UserDetailPage.tsx:863 handleToggleStatus → updateAdminUserStatus；server PUT users/:userId/status (admin.routes.ts:1036)
- Scenario: 停用使用者帳號 → ✅ — updateAdminUserStatus({isActive:false})，refetch 更新狀態 Badge
- Scenario: 啟用已停用帳號 → ✅ — 同 toggle 機制

## Requirement: 個人資料匯出（GDPR）→ ❌
證據: 無
- Scenario: 匯出使用者個人資料 → ❌ — page 無「匯出個人資料」按鈕，server 無 export 端點（grep export 為空）
- Scenario: 匯出大量資料 → ❌ — 無進度指示器

## Requirement: 資料載入骨架畫面 → ⚠️
證據: UserDetailPage.tsx:874 isLoading 時顯示 `<Loader2 animate-spin>`
- Scenario: 頁面初次載入 → ⚠️ — 僅置中 spinner，**非與各區塊佈局一致的骨架畫面**
- Scenario: 資料載入完成 → ⚠️ — 載入完成後渲染內容，但非 spec 描述的骨架平滑過渡
