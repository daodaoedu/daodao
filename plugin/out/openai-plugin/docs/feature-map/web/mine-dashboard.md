# 我的（學員首頁 /mine）

學員登入後在「我的」分頁看自己的實踐進度、參加中的活動，並從右下角「新增」選單開始建立實踐或活動。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/mine（英文版 https://app-dev.daodao.so/en/mine）
- 主要程式位置：apps/product/src/app/[locale]/(with-layout)/mine/page.tsx、apps/product/src/components/dashboard/
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- 主頁三分頁切換：靈感（`/`）／人物誌（`/persona`）／我的（`/mine`）（路徑常數 apps/product/src/constants/home-navigation.ts:1-5）
- 統計卡：連續天數、回應數（`useMyPracticeStats`，apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:43）
- 「我的活動」：列出已加入的團／場次（`useMyCohorts`），點擊進入 `/cohorts/[cohortId]`
- 實踐篩選分頁：全部／草稿／未開始／進行中／已完成，每顆按鈕後面帶數量
- 進行中實踐卡：點卡片進 `/practices/[id]`；草稿卡顯示「繼續編輯」
- 推薦區：推薦別人的實踐，可按讚／不喜歡、隱藏（含 undo toast）、載入更多
- 沒有任何實踐時顯示隨機實踐區（RandomPracticesSection，apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:179）
- 右下角「新增」FAB（只在桌機寬度顯示）：建立主題實踐 → `/practices/create`；建立活動課程 → `/manage`（再轉到 `/lighthouse`）；共同挑戰（只有 admin 看得到）

## 怎麼到這頁（使用者視角）
1. 開 https://app-dev.daodao.so/ ，主頁上方分頁點「我的」；或直接開 `/mine`。
2. 未登入會看到「登入後查看你的實踐」與「立即登入」按鈕，不會自動導去登入頁。

## 測試帳號與前置條件
- 角色：一般使用者（已完成註冊）。`/mine` 在 publicPattern 內（apps/product/src/app/global-provider.tsx:75），未登入可進頁但只看到登入提示。
- temp（未完成註冊）使用者會被 AuthProvider 導去 `/auth/onboarding`（apps/product/src/app/global-provider.tsx:87-89）。
- 要看到篩選分頁與進行中卡片：帳號至少要有 1 個實踐（`hasPractices` 為真才渲染篩選與 InProgressSection，apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:180）。
- 要看到「我的活動」：帳號要已加入至少一個團（cohort）。
- 要看到 FAB「共同挑戰」：帳號 roles 含 `admin`（apps/product/src/components/dashboard/add-task-fab.tsx:17、108）。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| 分頁「我的」 | `getByRole('button', { name: '我的' })`（i18n `dashboard.tab_mine`） | apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:122；packages/i18n/src/locales/zh-TW/dashboard.json:38 |
| 分頁「靈感」 | `getByRole('button', { name: '靈感' })`（`dashboard.tab_inspire`） | apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:110-113；packages/i18n/src/locales/zh-TW/dashboard.json:36 |
| 分頁「人物誌」 | `getByRole('button', { name: '人物誌' })`（`dashboard.tab_persona`） | apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:126-129；packages/i18n/src/locales/zh-TW/dashboard.json:37 |
| 未登入提示 | `getByText('登入後查看你的實踐')`（`dashboard.not_logged_in_title`） | apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:135；packages/i18n/src/locales/zh-TW/dashboard.json:72 |
| 立即登入按鈕 | `getByRole('button', { name: '立即登入' })`（`dashboard.not_logged_in_action`） | apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:142；packages/i18n/src/locales/zh-TW/dashboard.json:74 |
| 我的活動標題 | `getByText('我的活動')`（`dashboard.my_cohorts_title`） | apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:153；packages/i18n/src/locales/zh-TW/dashboard.json:84 |
| 我的活動卡片 | 無穩定選擇器（按鈕文字為團名 `cohort.displayName`，可用 `getByRole('button', { name: /<團名>/ })`），建議補 data-testid | apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:160 |
| 篩選分頁列 | `getByRole('tablist', { name: '任務篩選' })`（`dashboard.filter_aria_label`） | apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:184-185；packages/i18n/src/locales/zh-TW/dashboard.json:61 |
| 篩選：全部／草稿／未開始／進行中／已完成 | `getByRole('tab', { name: /^全部/ })`，其餘同理用 `草稿`、`未開始`、`進行中`、`已完成`；選中狀態看 `aria-selected="true"` | apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:188-203；packages/i18n/src/locales/zh-TW/dashboard.json:62-66 |
| 實踐卡 | `getByRole('link', { name: /<實踐標題>/ })`，href 為 `/practices/<id>` | apps/product/src/components/dashboard/in-progress-task-card.tsx:73 |
| 草稿卡「繼續編輯」 | `getByText('繼續編輯')`（`dashboard.continue_editing`） | apps/product/src/components/dashboard/in-progress-task-card.tsx:167；packages/i18n/src/locales/zh-TW/dashboard.json:35 |
| 推薦卡 | `getByRole('link', { name: '<實踐標題>' })`（aria-label=card.title） | apps/product/src/components/dashboard/recommendation-section.tsx:95-97 |
| 推薦按讚／不喜歡 | `getByRole('button', { name: '喜歡', exact: true })`／`getByRole('button', { name: '不喜歡' })`（`dashboard.feedback_like`／`feedback_dislike`） | apps/product/src/components/dashboard/recommendation-section.tsx:146、162；packages/i18n/src/locales/zh-TW/dashboard.json:4-5 |
| 新增 FAB | `getByRole('button', { name: '新增' })`（`dashboard.fab_add_task`），展開後 `aria-expanded="true"` | apps/product/src/components/dashboard/add-task-fab.tsx:155-156；packages/i18n/src/locales/zh-TW/dashboard.json:17 |
| FAB 選單 | `getByRole('menu')` 內 `getByRole('menuitem', { name: /建立主題實踐/ })`、`/建立活動課程/`、`/共同挑戰/` | apps/product/src/components/dashboard/add-task-fab.tsx:44、48、71、103、135；packages/i18n/src/locales/zh-TW/dashboard.json:18、20、22 |

## 怎樣算成功（可觀察的結果與證據）
- 已登入且有實踐：可見 `tablist[name=任務篩選]`，點「草稿」後該 tab `aria-selected=true`，列表只剩草稿卡（卡上有「草稿」狀態字、「繼續編輯」）。
- 篩選按鈕的數字與各狀態實踐數一致（數字由 `buildMineFilterCounts` 計算，apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:97）。
- 點「我的活動」中的團 → URL 變成 `/cohorts/<cohortId>`。
- FAB「建立主題實踐」→ URL `/practices/create`；「建立活動課程」→ 最終 URL `/lighthouse`（或無燈塔權限時 `/lighthouse/access-required`）。
- 推薦區隱藏一張卡後出現 toast「已隱藏此推薦」（`dashboard.hidden_toast`，packages/i18n/src/locales/zh-TW/dashboard.json:7；apps/product/src/components/dashboard/recommendation-section.tsx:312-314）並帶「復原」動作（`dashboard.undo`）。
- 證據：截圖＋網路請求 `GET /api/v1/...practices`（my practices）、`my cohorts` 回應。

## 陷阱
- FAB 外層是 `hidden md:block`（apps/product/src/components/dashboard/add-task-fab.tsx:40）：手機寬度（<768px）完全看不到，要用桌機 viewport 驗。
- 「共同挑戰」選單項目只對 admin 顯示，而且 onClick 只關閉選單、沒有導頁（apps/product/src/components/dashboard/add-task-fab.tsx:108-116），不要當成壞掉。
- 「建立活動課程」導 `/manage`，`/manage` 是伺服器端 redirect 到 `/${locale}/lighthouse`（apps/product/src/app/[locale]/(with-layout)/manage/page.tsx），一般使用者沒有組織會再被 middleware 轉到 `/lighthouse/access-required`。
- 首次載入時 AuthProvider 先讀 localStorage 快取使用者，再打 API 確認（packages/auth/src/lib/auth-provider.tsx:334-335）；快取過期時畫面可能先顯示已登入再閃回未登入。
- 我的實踐最多取 16 筆（`useMyPractices({ limit: 16 })`，apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:42），超過 16 筆時篩選數字只算前 16 筆（推測，需實測）。
- zh-TW 不帶路徑前綴（localePrefix as-needed），英文才是 `/en/mine`。
