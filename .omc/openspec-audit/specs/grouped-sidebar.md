# grouped-sidebar
- 涉及 repo: daodao-admin-ui
- 對應 archived change: 無
- 總計: 7 條 requirement / 14 個 scenario | ✅5 ⚠️2 ❌1 ❓0

## Requirement: 分組導航結構（具名群組 + 預定義順序）→ ⚠️
證據: daodao-admin-ui:src/components/layout/Sidebar.tsx:53 `navGroups: NavGroup[]`，群組標題逐一定義（:55-162）。**順序與群組集合與 spec 不符**：spec 要求 13 組「總覽/用戶/AI 服務/內容/溝通/報表/支援/系統/信任與審核/學習/遊戲化/社群/活動」；實作為 16 組且順序不同（實際：總覽/用戶/AI 服務/內容/**社群**/信件/許願池/問卷/溝通/報表/支援/系統/信任與審核/活動/學習/遊戲化），多出「信件/許願池/問卷」，社群與學習/遊戲化位置不同。
- Scenario: 顯示分組導航 → ✅ — navGroups.map 渲染所有群組標題 + 子項（:270-275, SidebarGroup）。
- Scenario: 群組內項目排列 → ⚠️ — 群組內 items 依陣列順序排列，但群組層級順序與 spec 不符。

## Requirement: 群組可收合與展開 → ✅
證據: Sidebar.tsx:181 SidebarGroup 接 collapsed/onToggle；toggle(:245-251) 切換狀態；ChevronDown 收合時 `-rotate-90`（:205）；內容區 `collapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'`（:211）。
- Scenario: 收合群組（隱藏子項 + 箭頭轉向）→ ✅ — max-h-0 + ChevronDown 旋轉。
- Scenario: 展開群組 → ✅ — 反向 toggle。

## Requirement: 收合狀態持久化（localStorage）→ ✅
證據: STORAGE_KEY='admin-sidebar-collapsed'（:171）；getInitialCollapsed 從 localStorage 讀取（:173-175）；toggle 時 `localStorage.setItem(STORAGE_KEY, JSON.stringify(next))`（:248）。
- Scenario: 重新載入頁面還原狀態 → ✅ — useState(getInitialCollapsed) 初始化自 localStorage。
- Scenario: 首次進入（無狀態）→ ✅ — getInitialCollapsed 無紀錄回空物件，群組預設展開（collapsed=false）。

## Requirement: 當前路由高亮（+ 自動展開所屬收合群組）→ ⚠️
證據: 高亮已實作：`const active = location.pathname === to`（:215），active 套 `border-primary/35 bg-primary/10 text-primary` + 左側 marker（:228-229）。**但「若當前路由所屬群組為收合狀態 SHALL 自動展開」未實作**——無 useEffect 依 pathname 調整 collapsed（line 320 的 useEffect 屬 MobileHeader 關閉邏輯，非自動展開群組）。
- Scenario: 導航至特定頁面高亮 → ✅ — location.pathname 比對 active 樣式。
- Scenario: 當前路由群組已收合時自動展開 → ❌ — 無 pathname→展開所屬群組的邏輯。

## Requirement: 響應式設計（>=1024px 顯示 / <1024px 隱藏）→ ✅
證據: 桌面 aside `hidden lg:flex lg:flex-col lg:w-72`（:311），lg=1024px；MobileHeader `flex lg:hidden`（:331）僅行動裝置顯示。
- Scenario: 桌面裝置（>=1024px）固定左側 → ✅ — `hidden lg:flex` sticky aside。
- Scenario: 行動裝置（<1024px）隱藏 → ✅ — aside lg 以下隱藏。

## Requirement: 行動裝置漢堡選單（overlay + 遮罩）→ ✅
證據: MobileHeader（:317）有 `Menu` 按鈕 open state（:318,336）；開啟時 `fixed inset-0 z-50` overlay + `bg-black/40 backdrop-blur-sm` 遮罩（:351-356），點遮罩 setOpen(false)（:356）；slide-in aside（:358）。
- Scenario: 開啟行動端 Sidebar（左側滑入 + 半透明遮罩）→ ✅ — slide-in-from-left + bg-black/40。
- Scenario: 關閉（點遮罩）→ ✅ — onClick setOpen(false)。
- Scenario: 導航後自動關閉 → ✅ — SidebarContent onNavigate={() => setOpen(false)}（:371）。

## Requirement: 登出按鈕（固定底部）→ ✅
證據: Sidebar.tsx:242 `logout` from useAuth；登出按鈕 onClick={logout}（:297）+ LogOut icon（:301）。固定於底部容器（SidebarContent 尾部）。
- Scenario: 點擊登出（清 session + 導向登入）→ ✅ — logout() 來自 useAuth。
- Scenario: 長列表捲動時登出固定底部 → ⚠️/✅ — 登出區塊在 SidebarContent 結構末段；aside 為 flex-col，導航列表可捲動而底部區固定（樣式上合理，未逐像素驗證 sticky/flex-shrink-0）。記 ✅。
