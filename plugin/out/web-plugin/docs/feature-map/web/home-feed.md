# 首頁動態牆與全站導覽

使用者在首頁看別人的打卡、互動與新實踐（靈感動態牆），搜尋靈感，從「你的今天」接續自己的實踐，並透過側欄／底部導覽前往各主要功能；人物誌分頁可讀別人的學習故事並分享自己的。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/ 、https://app-dev.daodao.so/persona 、https://app-dev.daodao.so/persona/<questionId>（daodao-infra/README.md:39；英文版加 `/en` 前綴）
- 主要程式位置：apps/product/src/app/[locale]/(with-layout)/page.tsx、apps/product/src/components/showcase/、apps/product/src/components/dashboard/（your-today、explore-row、add-task-fab、feed-space-filter）、apps/product/src/app/[locale]/(with-layout)/persona/page.tsx、apps/product/src/app/[locale]/persona/[id]/page.tsx、apps/product/src/components/persona/persona-tab.tsx、apps/product/src/components/layout/sidebar/、apps/product/src/constants/home-navigation.ts、packages/api/src/services/feed-hooks.ts
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- 首頁 `/`：Banner、已登入時的未來信足跡摘要（`HomeTimelineSummary`）、「你的今天」（自己今天的實踐卡，未登入不顯示）、探索列（「探索共同挑戰」→/challenges、「探索活動課程」→/activities）、搜尋列（近期熱門、你的興趣建議）、動態牆（活動卡、打卡卡、醞釀中實踐卡、實踐卡，依 打卡:互動:實踐 = 1:1:1 重排，無限捲動）、右下「新增」FAB（建立主題實踐／建立活動課程／共同挑戰）
- 動態牆空間篩選：篩選選單「全部」「個人實踐」「共同挑戰」及自己的空間，可複選，網址帶 `spaces` 參數（apps/product/src/components/dashboard/feed-space-filter-menu.tsx:42-75、apps/product/src/components/dashboard/feed-space-filter.ts:21、87-101）
- 動態卡標籤：「{userName} 在 {practiceTitle} 打卡」「{userName} 發布了新實踐」「{actorName} 表達了加油」「編輯精選」
- 實踐卡「…」選單：編輯、複製、封存、刪除、檢舉、關注／取消關注等（依是否本人顯示）
- 首頁分頁：`HOME_TAB_PATHS` = 靈感 `/`、人物誌 `/persona`、我的 `/mine`（分頁列只出現在 /persona 與 /mine 頁，`/` 本身沒有分頁列）；`/?tab=mine` 會轉到 `/mine`
- 人物誌 `/persona`：故事輪播、「讀故事、加入交流」「分享我的故事」；`/persona/[id]`：寫下想法、看回答分布、留言
- 全站導覽：桌機左側欄（主頁、空間、訊息＋未讀徽章、管理、最新通知、我的小島、收合／展開、帳號選單）；手機底部導覽（主頁、最新通知、建立主題實踐、我的小島、帳號選單）

## 怎麼到這頁（使用者視角）
1. 開 https://app-dev.daodao.so/ 即為首頁靈感動態牆；登入後側欄「主頁」也回到這裡。
2. 人物誌：先到 `/mine`（側欄沒有直接入口；首頁 FAB 與「你的今天」不會帶過去），點上方分頁「人物誌」→ `/persona`；在人物誌點故事或「讀故事、加入交流」→ `/persona/<id>`。
3. 側欄「管理」→ `/lighthouse`（另一份 feature map）；「空間」→ `/spaces`；「訊息」→ `/messages`；「最新通知」→ `/notifications`。

## 測試帳號與前置條件
- `/`、`/persona`、`/persona/[id]`：未登入可看（publicPattern `^/$`、`^/persona(/.*)?$`，apps/product/src/app/global-provider.tsx:66、74）。
- 未登入時側欄／底部導覽整個不渲染（apps/product/src/components/layout/sidebar/index.tsx:16-18），「你的今天」也不顯示（apps/product/src/components/dashboard/your-today.tsx:55）。
- 一般使用者（已完成註冊）才看得到導覽、你的今天、足跡摘要；temp 使用者在受保護頁會被導去 `/auth/onboarding`。
- 前置資料：dev 環境要有公開實踐／打卡，動態牆才有卡片；「你的今天」需要帳號有進行中的實踐；動態牆資料來自 AI backend `GET /api/v1/feed`（packages/api/src/services/feed-hooks.ts:5、121），AI backend 掛掉時動態牆會空。空間篩選選單裡的「我的空間」選項只在登入且帳號有空間時出現（apps/product/src/app/[locale]/(with-layout)/page.tsx:127）。
- 管理入口 `/lighthouse` 需要組織成員資格（middleware 判斷），一般使用者點了會到 `/lighthouse/access-required`。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|------|---------------------|------|
| 桌機側欄各項 | `page.getByRole('link', { name: '主頁' })`、`'空間'`、`'訊息'`、`'管理'`、`'最新通知'`、`'我的小島'`；目前頁有 `aria-current="page"` | apps/product/src/components/layout/sidebar/desktop.tsx:92-93；apps/product/src/components/layout/sidebar/constant.tsx:27-70；keys `app_product.nav_home` packages/i18n/src/locales/zh-TW/app-product.json:14、`nav_spaces` packages/i18n/src/locales/zh-TW/app-product.json:15、`nav_messages` packages/i18n/src/locales/zh-TW/app-product.json:16、`nav_manage` packages/i18n/src/locales/zh-TW/app-product.json:17、`nav_notifications` packages/i18n/src/locales/zh-TW/app-product.json:20、`nav_my_island` packages/i18n/src/locales/zh-TW/app-product.json:21 |
| 側欄收合／展開 | `page.getByRole('button', { name: '收合側邊欄' })`／`{ name: '展開側邊欄' }` | apps/product/src/components/layout/sidebar/desktop.tsx:45；keys `app_product.sidebar_collapse` packages/i18n/src/locales/zh-TW/app-product.json:26、`sidebar_expand` packages/i18n/src/locales/zh-TW/app-product.json:25 |
| 回到官網（logo） | `page.getByRole('link', { name: '回到官網' })`（注意 href 是 `/`，實際是回首頁） | apps/product/src/components/layout/sidebar/desktop.tsx:56、apps/product/src/components/layout/sidebar/mobile.tsx:81；key `app_product.back_to_website` packages/i18n/src/locales/zh-TW/app-product.json:27 |
| 手機底部導覽 | `page.getByRole('navigation', { name: '主要導覽' })`，內含 link「主頁」「最新通知」「建立主題實踐」「我的小島」 | apps/product/src/components/layout/sidebar/mobile.tsx:87、95、112、124、135；keys `app_product.mobile_navigation` packages/i18n/src/locales/zh-TW/app-product.json:24、`nav_create_practice` packages/i18n/src/locales/zh-TW/app-product.json:23 |
| 帳號選單 | `page.getByRole('button', { name: '帳號選單' })` → 選單 link「設定」「關注與連結」等、「登出」 | apps/product/src/components/layout/sidebar/account-menu.tsx:49、74-132、apps/product/src/components/layout/sidebar/mobile.tsx:153；keys `app_product.account_menu` packages/i18n/src/locales/zh-TW/app-product.json:29、`account_settings` packages/i18n/src/locales/zh-TW/app-product.json:30、`account_logout` packages/i18n/src/locales/zh-TW/app-product.json:58 |
| 搜尋靈感輸入框 | `page.getByPlaceholder('搜尋靈感')`，按 Enter 送出 | apps/product/src/components/showcase/ShowcaseSearchBar.tsx:72、41-44（Enter 且非組字時呼叫 onSearch）；key `app_product.showcase_search_placeholder` packages/i18n/src/locales/zh-TW/app-product.json:231 |
| 展開搜尋（icon 按鈕） | `page.getByRole('button', { name: '搜尋靈感' })` | apps/product/src/components/showcase/ShowcaseSearchBar.tsx:108 |
| 清除搜尋 | `page.getByRole('button', { name: '清除搜尋' })` | apps/product/src/components/showcase/ShowcaseSearchBar.tsx:97；key `app_product.showcase_search_clear` packages/i18n/src/locales/zh-TW/app-product.json:560 |
| 建議區標題 | `page.getByText('近期熱門')`／`page.getByText('你的興趣')` | apps/product/src/components/showcase/ShowcaseSearchBar.tsx:120、137；keys `app_product.showcase_recent_hot` packages/i18n/src/locales/zh-TW/app-product.json:218、`showcase_your_interests` packages/i18n/src/locales/zh-TW/app-product.json:219 |
| 動態牆空間篩選 | `page.getByRole('button', { name: /^依空間篩選動態：/ })` → 選單內「全部」「個人實踐」「共同挑戰」 | apps/product/src/components/dashboard/feed-space-filter-menu.tsx:45-47、67；keys `dashboard.feed_space_filter_trigger_aria_label` packages/i18n/src/locales/zh-TW/dashboard.json:54、`feed_space_filter_all` packages/i18n/src/locales/zh-TW/dashboard.json:55、`feed_space_filter_personal` packages/i18n/src/locales/zh-TW/dashboard.json:56、`feed_space_filter_challenge` packages/i18n/src/locales/zh-TW/dashboard.json:57 |
| 探索列 | `page.getByRole('link', { name: '探索共同挑戰' })`／`{ name: '探索活動課程' }` | apps/product/src/components/dashboard/explore-row.tsx:12、14；keys `dashboard.explore_challenge` packages/i18n/src/locales/zh-TW/dashboard.json:50、`explore_activity` packages/i18n/src/locales/zh-TW/dashboard.json:51 |
| 你的今天：實踐卡 | `page.locator('a[href*="/practices/"]')` 限定在「你的今天」區塊；區塊本身無穩定容器，建議補 data-testid | apps/product/src/components/dashboard/your-today.tsx:80 |
| 你的今天：收合 | `page.getByRole('button', { name: '收合' })`（硬寫中文） | apps/product/src/components/dashboard/your-today.tsx:69 |
| 你的今天：空狀態 | `page.getByText('今天想從哪裡開始？')` | apps/product/src/components/dashboard/your-today.tsx:137；key `dashboard.your_today_empty` packages/i18n/src/locales/zh-TW/dashboard.json:47 |
| 動態卡（依類型＋id） | `page.locator('[data-feed-id="checkin-<id>"]')`、`'[data-feed-id="practice-<id>"]'`、活動卡 `'[data-feed-id^="activity"]'` | apps/product/src/app/[locale]/(with-layout)/page.tsx:330、364、405（data-feed-id，用於返回時捲動定位） |
| 動態卡標籤 | `page.getByText(/在 .+ 打卡/)`、`/發布了新實踐/`、`/表達了加油/`、`'編輯精選'` | apps/product/src/components/showcase/FeedLabel.tsx:24、34、54、68；keys `app_product.showcase_feed_checked_in`「{userName} 在 {practiceTitle} 打卡」packages/i18n/src/locales/zh-TW/app-product.json:235、`showcase_feed_new_practice` packages/i18n/src/locales/zh-TW/app-product.json:234、`showcase_feed_cheered` packages/i18n/src/locales/zh-TW/app-product.json:236、`showcase_feed_featured` packages/i18n/src/locales/zh-TW/app-product.json:237 |
| 卡片作者小島連結 | `page.getByRole('link', { name: '前往 <userName> 的小島' })`（留言者頭像） | apps/product/src/components/showcase/PracticeShowcaseCard.tsx:264、apps/product/src/components/showcase/BrewingCard.tsx:265；key `app_product.showcase_user_island_aria` packages/i18n/src/locales/zh-TW/app-product.json:226 |
| 實踐卡本身 | 無穩定選擇器（整張卡是 onClick 的 div，不是 link），用外層 `data-feed-id` 點擊 | apps/product/src/components/showcase/PracticeShowcaseCard.tsx:126、apps/product/src/components/showcase/BrewingCard.tsx:124 |
| 實踐卡「…」選單觸發 | 無穩定選擇器（icon-only，無 aria-label），建議補 aria-label | apps/product/src/components/showcase/PracticeActionMenu.tsx:104-111 |
| 動態牆載入中 | `page.getByText('載入中...')` | apps/product/src/app/[locale]/(with-layout)/page.tsx:485；key `dashboard.loading` packages/i18n/src/locales/zh-TW/dashboard.json:60 |
| 新增 FAB | `page.getByRole('button', { name: '新增' })` → 「建立主題實踐」「建立活動課程」「共同挑戰」 | apps/product/src/components/dashboard/add-task-fab.tsx:155、71、103、135；keys `dashboard.fab_add_task` packages/i18n/src/locales/zh-TW/dashboard.json:17、`fab_create_practice` packages/i18n/src/locales/zh-TW/dashboard.json:18、`fab_create_activity` packages/i18n/src/locales/zh-TW/dashboard.json:20、`fab_create_challenge` packages/i18n/src/locales/zh-TW/dashboard.json:22 |
| 首頁分頁（在 /persona、/mine） | `page.getByRole('button', { name: '靈感' })`、`'人物誌'`、`'我的'` | apps/product/src/app/[locale]/(with-layout)/persona/page.tsx:23-42、apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:113-129；keys `dashboard.tab_inspire` packages/i18n/src/locales/zh-TW/dashboard.json:36、`tab_persona` packages/i18n/src/locales/zh-TW/dashboard.json:37、`tab_mine` packages/i18n/src/locales/zh-TW/dashboard.json:38 |
| 人物誌入口按鈕 | `page.getByRole('button', { name: '讀故事、加入交流' })`／`{ name: '分享我的故事' }`（元素類型未逐一確認，若不是 button 改用 getByText） | apps/product/src/components/persona/persona-tab.tsx:189；keys `persona.tab.readAndRespond` packages/i18n/src/locales/zh-TW/persona.json:76、`persona.tab.shareMine` packages/i18n/src/locales/zh-TW/persona.json:77 |
| 人物誌想法輸入 | `page.getByPlaceholder('寫下你的想法...')` | apps/product/src/app/[locale]/persona/[id]/page.tsx:195、216；key `persona.detail.thoughtPlaceholder` packages/i18n/src/locales/zh-TW/persona.json:91 |
| 人物誌「分享我的想法」 | `page.getByText('分享我的想法')` | apps/product/src/app/[locale]/persona/[id]/page.tsx:113、990；key `persona.detail.shareThoughts` packages/i18n/src/locales/zh-TW/persona.json:90 |
| 人物誌送出回答 | 無穩定選擇器（未找到明確的送出按鈕文案），建議補 data-testid | apps/product/src/app/[locale]/persona/[id]/page.tsx:819 附近（submitPersonaAnswer） |
| 足跡摘要 | `page.getByTestId('home-timeline-summary')` | apps/product/src/components/future-letter/compact-timeline-strip.tsx:144、apps/product/src/components/future-letter/horizontal-timeline.tsx:58 |

## 怎樣算成功（可觀察的結果與證據）
- 動態牆：首頁出現至少一張 `[data-feed-id]` 卡片；`GET /api/v1/feed`（AI backend）2xx；捲到底觸發下一頁請求且卡片數增加。
- 搜尋：在「搜尋靈感」輸入關鍵字按 Enter，網址出現 `?keyword=<kw>`（apps/product/src/app/[locale]/(with-layout)/page.tsx:142-147、apps/product/src/components/dashboard/feed-space-filter.ts:97），`/api/v1/feed` 請求帶 keyword，卡片內容與關鍵字相關；按「清除搜尋」網址回到 `/`（若同時有標籤或空間篩選，網址會保留那些參數）。
- 空間篩選：勾選後網址出現 `spaces=<值>`，重新整理後篩選仍在（apps/product/src/components/dashboard/feed-space-filter.ts:86-101）。
- 點卡片：打卡卡 → `/practices/<id>/check-ins/<checkInId>`（apps/product/src/components/showcase/CheckInShowcaseCard.tsx:115）；實踐卡 → `/practices/<id>`；返回首頁時捲動回原卡片位置（apps/product/src/app/[locale]/(with-layout)/page.tsx:238-257 data-feed-id 錨點）。
- 導覽：點各側欄項目後網址改變，且該項 `aria-current="page"`。
- 人物誌：送出想法後出現 toast「留言成功！」（`persona.detail.commentSubmitSuccess` packages/i18n/src/locales/zh-TW/persona.json:95）或「我的回答」區塊（`persona.detail.myAnswer` packages/i18n/src/locales/zh-TW/persona.json:97）。
- 證據：首頁截圖（含側欄）、feed API 回應、網址變化。

## 陷阱
- 未登入時完全沒有側欄／底部導覽；要測導覽一定要先登入。
- 手機／桌機版型：伺服器依 User-Agent 只決定初始值（apps/product/src/app/[locale]/layout.tsx:54-57 `detectDevice()`），掛載後 DeviceProvider 依視窗寬度（768px／1025px）重新判斷，且每次 resize 都會更新（packages/shared/src/providers/device-provider.tsx:46-67、packages/shared/src/lib/device-detection.ts:74-89；`useIsMobile` 讀這個值，packages/shared/src/hooks/use-media-query.ts:139-152）。只調 viewport 就能切版型，不需要設 UA；量版面要等 networkidle 之後，DOMContentLoaded 時側欄還沒渲染。
- 手機底部導覽沒有「空間」「訊息」「管理」，桌機才有；訊息未讀徽章只在桌機側欄。
- 首頁「我的」分頁是獨立路由 `/mine`，`/?tab=mine` 會被 `router.replace` 轉走（apps/product/src/app/[locale]/(with-layout)/page.tsx:133-140）。
- 動態牆排序在前端重排（apps/product/src/app/[locale]/(with-layout)/page.tsx:47 的 reorderFeedItems），自己的互動會被推後；不要斷言特定卡片的絕對位置。
- 動態牆依賴 AI backend（不是 server-dev）；AI backend 不可用時首頁只剩載入中或空白，要先分清是前端還是 AI backend 的問題。
- FAB「建立活動課程」導到 `/manage`，再被 redirect 到 `/lighthouse`（apps/product/src/components/dashboard/add-task-fab.tsx:82、apps/product/src/app/[locale]/(with-layout)/manage/page.tsx），非組織成員會落到 access-required。
- 帳號選單「Roadmap & 建議」寫死 `https://app.daodao.so/roadmap`（apps/product/src/components/layout/sidebar/account-menu.tsx:97-105，新分頁開啟；key `app_product.account_roadmap_suggestion` packages/i18n/src/locales/zh-TW/app-product.json:579），在 dev 點下去會跳到正式站。
- 搜尋框中文組字時 Enter 不觸發（apps/product/src/components/showcase/ShowcaseSearchBar.tsx:41）。
