# 個人頁、關注與夥伴連結

使用者看別人或自己的個人頁（我的小島），關注／取消關注使用者與實踐，送出與處理夥伴連結請求，並看學習足跡（未來信時間軸）。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/users/<customId 或 userId>、/island/<identifier>、/social、/settings/follow-hub、/settings/following、/settings/connections、/me/footprints（daodao-infra/README.md:39；英文版加 `/en` 前綴）
- 主要程式位置：apps/product/src/app/[locale]/(with-layout)/users/[identifier]/page.tsx、apps/product/src/components/user/、apps/product/src/app/[locale]/island/[identifier]/page.tsx、apps/product/src/components/island/、apps/product/src/components/social/social-hub.tsx、apps/product/src/components/settings/following/following-settings.tsx、apps/product/src/components/settings/connections/connections-settings.tsx、apps/product/src/components/me/footprints-page-content.tsx、packages/api/src/services/follow.ts
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- 個人頁 `/users/[identifier]`：島嶼頭圖（學習類型 Lottie）、使用者資訊卡（自介、社群連結、Followers 數、近期實踐數、共同圈子數）、實踐列表（`UserProfileTabs` → `PracticeSection`）
- 他人個人頁：「+ 關注」／「關注中」切換；「請求連結」對話框（填理由、送出），狀態變「已送出連結請求」或「已連結」
- 自己的個人頁：「編輯個人資料」連到 `/settings/public-info`
- 關注與連結中樞 `/settings/follow-hub`：兩個入口「關注設定」（/settings/following）與「連結的夥伴」（/settings/connections）
- 關注設定 `/settings/following`：分頁「關注的使用者」「關注的實踐」，每列「取消關注」
- 夥伴 `/social`（SocialHub）與 `/settings/connections`：收到的請求（接受／忽略）、發出的請求（撤回）、我的夥伴（解除連結），各動作有確認對話框
- 實踐卡「…」選單裡的「關注／取消關注」實踐（apps/product/src/components/showcase/PracticeActionMenu.tsx:240）
- 3D 島嶼 `/island/[identifier]`：three.js 全螢幕、島主資訊面板；WebGL 不支援時顯示降級頁
- 學習足跡 `/me/footprints`：未來信時間軸＋信件對話框（未來信細節屬另一份 feature map）

## 怎麼到這頁（使用者視角）
1. 自己的個人頁：桌機側欄或手機底部導覽點「我的小島」→ `/users/<自己的 customId 或 id>`（apps/product/src/components/layout/sidebar/constant.tsx:68-70、apps/product/src/components/layout/sidebar/mobile.tsx:133-135）。
2. 他人個人頁：首頁動態卡上點作者頭像／名字（apps/product/src/components/showcase/PracticeShowcaseCard.tsx:161、apps/product/src/components/showcase/CheckInShowcaseCard.tsx:215），或從關注列表、夥伴列表點人。
3. 關注與連結：桌機側欄帳號選單（「帳號選單」按鈕）→「關注與連結」→ 再選「關注設定」或「連結的夥伴」（apps/product/src/components/layout/sidebar/account-menu.tsx:88-94；手機在 apps/product/src/components/layout/sidebar/mobile-bottom-sheet.tsx:105-107）。
4. `/social`：程式內找不到任何連到 `/social` 的入口，只能直接輸入網址。
5. 3D 島嶼：個人頁的「上島」按鈕目前被 `false &&` 隱藏（apps/product/src/components/user/island-header.tsx:182），只能直接輸入 `/island/<identifier>`。
6. 學習足跡：已登入時首頁上方 `HomeTimelineSummary` 點擊進入（apps/product/src/components/future-letter/home-timeline-summary.tsx:33、41）。

## 測試帳號與前置條件
- `/users/*`：未登入可看（publicPattern `^/users/`，apps/product/src/app/global-provider.tsx:67），但「+ 關注」「請求連結」只在已登入且不是本人時顯示（apps/product/src/components/user/user-info-card.tsx:317）。
- `/island/*`、`/social`、`/settings/*`、`/me/footprints`：不在 publicPattern（apps/product/src/app/global-provider.tsx:62-82），需一般使用者（已完成註冊）；未登入導到 `/auth/login?redirect=…`，temp 使用者導到 `/auth/onboarding`。島嶼頁註解提到「訪客／島主判斷」（apps/product/src/app/[locale]/island/[identifier]/page.tsx:18），但 AuthProvider 仍會擋未登入（推測：設計與實作不一致）。
- 驗證關注／連結需要兩個帳號 A、B；B 要有可被找到的個人頁（建議有 customId）。
- 驗證「收到的請求」需要 B 先對 A 送出連結請求。
- 驗證「關注的實踐」需要一個別人的公開實踐。
- 學習足跡需要該帳號有未來信資料，否則只看到空時間軸。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|------|---------------------|------|
| 側欄「我的小島」 | `page.getByRole('link', { name: '我的小島' })` | apps/product/src/components/layout/sidebar/desktop.tsx:92、apps/product/src/components/layout/sidebar/mobile.tsx:135；key `app_product.nav_my_island` packages/i18n/src/locales/zh-TW/app-product.json:21 |
| 帳號選單按鈕 | `page.getByRole('button', { name: '帳號選單' })` | apps/product/src/components/layout/sidebar/account-menu.tsx:49、apps/product/src/components/layout/sidebar/mobile.tsx:153、apps/product/src/components/layout/sidebar/mobile-bottom-sheet.tsx:76；key `app_product.account_menu` packages/i18n/src/locales/zh-TW/app-product.json:29 |
| 選單「關注與連結」 | `page.getByRole('link', { name: '關注與連結' })` | apps/product/src/components/layout/sidebar/account-menu.tsx:88-94；key `app_product.account_follow_hub` packages/i18n/src/locales/zh-TW/app-product.json:577 |
| 關注按鈕（他人頁） | `page.getByRole('button', { name: '+ 關注' })`／已關注時 `{ name: '關注中' }` | apps/product/src/components/user/user-info-card.tsx:481；keys `user_profile.follow_btn` packages/i18n/src/locales/zh-TW/user-profile.json:58、`user_profile.following_btn` packages/i18n/src/locales/zh-TW/user-profile.json:59 |
| 請求連結按鈕 | `page.getByRole('button', { name: '請求連結' })`（之後名稱變「已送出連結請求」／「已連結」，且 disabled） | apps/product/src/components/user/user-info-card.tsx:493-500；keys `user_profile.conn_request_title` packages/i18n/src/locales/zh-TW/user-profile.json:50、`conn_status_pending` packages/i18n/src/locales/zh-TW/user-profile.json:57、`conn_status_connected` packages/i18n/src/locales/zh-TW/user-profile.json:56 |
| 連結理由輸入 | `page.getByPlaceholder('請簡短說明連結原因（最多 50 字）')` | apps/product/src/components/user/user-info-card.tsx:258；key `user_profile.conn_request_placeholder` packages/i18n/src/locales/zh-TW/user-profile.json:52 |
| 對話框送出 | `page.getByRole('dialog').getByRole('button', { name: '送出' })` | apps/product/src/components/user/user-info-card.tsx:267；key `user_profile.conn_request_submit` packages/i18n/src/locales/zh-TW/user-profile.json:53 |
| 編輯個人資料（本人頁） | `page.getByRole('link', { name: '編輯個人資料' })` | apps/product/src/components/user/user-info-card.tsx:396-399；key `user_profile.edit_profile_title` packages/i18n/src/locales/zh-TW/user-profile.json:2 |
| Followers 數 | `page.getByText(/Followers/)`（英文硬寫字） | apps/product/src/components/user/user-info-card.tsx:443 |
| 中樞「關注設定」「連結的夥伴」 | `page.getByRole('link', { name: '關注設定' })`／`{ name: '連結的夥伴' }` | apps/product/src/app/[locale]/(with-layout)/settings/follow-hub/page.tsx:9-22；keys `app_product.settings_following` packages/i18n/src/locales/zh-TW/app-product.json:85、`settings_connections` packages/i18n/src/locales/zh-TW/app-product.json:86 |
| 關注設定分頁 | `page.getByRole('button', { name: '關注的使用者' })`／`{ name: '關注的實踐' }` | apps/product/src/components/settings/following/following-settings.tsx:54-63；keys `app_product.following_users_tab` packages/i18n/src/locales/zh-TW/app-product.json:101、`following_practices_tab` packages/i18n/src/locales/zh-TW/app-product.json:102 |
| 取消關注（列表） | `page.getByRole('button', { name: '取消關注' })`（多筆時先以使用者名稱或實踐標題縮小範圍） | apps/product/src/components/settings/following/following-settings.tsx:106、151；key `app_product.following_unfollow` packages/i18n/src/locales/zh-TW/app-product.json:105 |
| 列表空狀態 | `page.getByText('尚未關注任何使用者')`／`'尚未關注任何實踐'` | apps/product/src/components/settings/following/following-settings.tsx:76、120；keys `app_product.following_empty_users` packages/i18n/src/locales/zh-TW/app-product.json:103、`following_empty_practices` packages/i18n/src/locales/zh-TW/app-product.json:104 |
| 夥伴區塊標題 | `page.getByRole('heading', { name: '收到的請求' })`／`'發出的請求'`／`'我的夥伴'`（「我的夥伴」後面會接人數） | apps/product/src/components/social/social-hub.tsx:115、171、213；keys `social.conn_incoming_section` packages/i18n/src/locales/zh-TW/social.json:7、`conn_outgoing_section` packages/i18n/src/locales/zh-TW/social.json:8、`conn_partners_section` packages/i18n/src/locales/zh-TW/social.json:9 |
| 接受／忽略／撤回／解除連結 | `page.getByRole('button', { name: '接受' })`、`'忽略'`、`'撤回'`、`'解除連結'`（確認對話框內的按鈕名稱相同，要限定在 `getByRole('dialog')` 裡） | apps/product/src/components/social/social-hub.tsx:150、158、201、247；keys `social.conn_accept_btn` packages/i18n/src/locales/zh-TW/social.json:13、`conn_ignore_confirm` packages/i18n/src/locales/zh-TW/social.json:17、`conn_withdraw_confirm` packages/i18n/src/locales/zh-TW/social.json:21、`conn_disconnect_confirm` packages/i18n/src/locales/zh-TW/social.json:25 |
| 夥伴空狀態 | `page.getByText('尚未與任何人建立連結')` | apps/product/src/components/social/social-hub.tsx:217；key `social.conn_empty` packages/i18n/src/locales/zh-TW/social.json:11 |
| 實踐卡「…」選單 | 無穩定選擇器（icon-only Button 無 aria-label），建議補 data-testid／aria-label | apps/product/src/components/showcase/PracticeActionMenu.tsx:104-111 |
| 選單「關注」實踐 | `page.getByText('關注', { exact: true })` | apps/product/src/components/showcase/PracticeActionMenu.tsx:240；key `app_product.following_follow` packages/i18n/src/locales/zh-TW/app-product.json:106 |
| 島嶼載入中 | `page.getByText('正在打造你的島嶼…')` | apps/product/src/components/island/island-page-client.tsx:20；key `island.loading` packages/i18n/src/locales/zh-TW/island.json:2 |
| 島主資訊面板 | `page.getByRole('dialog', { name: '島主資訊' })` | apps/product/src/components/island/island-owner-panel.tsx:47-60；key `island.owner_sheet_title` packages/i18n/src/locales/zh-TW/island.json:13 |
| 島嶼降級／錯誤 | `page.getByRole('heading', { name: '這裡看不到 3D 島嶼' })`／`{ name: '島嶼資料載入失敗' }` | apps/product/src/components/island/webgl-fallback.tsx:25、apps/product/src/components/island/island-error.tsx:17；keys `island.webgl_fallback_title` packages/i18n/src/locales/zh-TW/island.json:8、`island.error_title` packages/i18n/src/locales/zh-TW/island.json:44 |
| 足跡時間軸 | `page.getByTestId('future-letter-timeline')`、節點 `page.getByTestId('timeline-node')` | apps/product/src/components/future-letter/vertical-timeline.tsx:391、469；apps/product/src/components/future-letter/horizontal-timeline.tsx:58 |
| 首頁足跡摘要（入口） | `page.getByTestId('home-timeline-summary')` | apps/product/src/components/future-letter/compact-timeline-strip.tsx:144、apps/product/src/components/future-letter/horizontal-timeline.tsx:58 |

## 怎樣算成功（可觀察的結果與證據）
- 關注使用者：A 在 B 頁按「+ 關注」→ toast「已關注」（`user_profile.follow_success` packages/i18n/src/locales/zh-TW/user-profile.json:47；apps/product/src/components/user/user-info-card.tsx:236），按鈕變「關注中」；`POST /api/v1/follows` 2xx（packages/api/src/services/follow.ts:80-84）；A 的 `/settings/following`「關注的使用者」出現 B；重新整理 B 頁仍是「關注中」（從 `/api/v1/follows/check` 讀回，packages/api/src/services/follow-hooks.ts:42）。
- 取消關注：按「關注中」或列表「取消關注」→ toast「已取消關注」（`user_profile.unfollow_success` packages/i18n/src/locales/zh-TW/user-profile.json:48），列表該列消失。
- 連結請求：A 送出後 toast「已送出連結請求」（`user_profile.conn_request_sent` packages/i18n/src/locales/zh-TW/user-profile.json:54），按鈕 disabled；B 的 `/social` 或 `/settings/connections`「收到的請求」出現 A；B 按「接受」→ toast「已與 {name} 成為夥伴」（`social.conn_accept_success` packages/i18n/src/locales/zh-TW/social.json:14），兩邊「我的夥伴」都有對方。
- 3D 島嶼：canvas 出現且不是降級／錯誤頁；不存在的 identifier 回 404。
- 證據：截圖＋上述 API 回應。

## 陷阱
- 用 UUID 開個人頁時，如果對方有 customId 會 redirect 到 `/users/<customId>`（apps/product/src/app/[locale]/(with-layout)/users/[identifier]/page.tsx:131-133），斷言網址要用 regex。找不到使用者是 404（apps/product/src/app/[locale]/(with-layout)/users/[identifier]/page.tsx:118-128）。
- 關注／連結按鈕靠 client 端登入狀態判斷，SSR 首屏不會出現，要等 hydration 後再找。
- Followers 字樣是英文硬寫（apps/product/src/components/user/user-info-card.tsx:443），切到中文也不會翻譯。
- 個人資訊卡的「更多內容」桌機和手機擺放位置不同（apps/product/src/components/user/user-info-card.tsx:467-470）。
- 手機／桌機版型：伺服器依 User-Agent 只決定初始值（apps/product/src/app/[locale]/layout.tsx:54-57），掛載後 DeviceProvider 依視窗寬度重新判斷，每次 resize 也會更新（packages/shared/src/providers/device-provider.tsx:46-67，<768px 為手機，packages/shared/src/lib/device-detection.ts:85-88）。只調 viewport 就能切版型，不需要設 UA；量版面要等 networkidle 之後，DOMContentLoaded 時側欄還沒渲染。
- `/social` 與 `/settings/connections` 是兩份相似但分開的實作（i18n namespace 一個是 `social`，一個是 `account_settings`），文案可能不同，驗收時要說清楚驗的是哪一頁。
- 3D 島嶼需要 WebGL；headless Chromium 可能落入降級頁，不代表功能壞掉（推測，未實測）。
- 確認對話框的確認按鈕與列表按鈕同名（例如「忽略」），點擊時要限定範圍在 dialog 內。
