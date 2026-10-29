# 公開內容頁（學習資源、Roadmap、問卷）

訪客與使用者免登入瀏覽學習資源與分類、在 Roadmap 看島島的開發進度並支持／許願，以及透過分享連結填寫問卷。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/resource、https://app-dev.daodao.so/roadmap、https://app-dev.daodao.so/survey/r/<shareId>（主機見 daodao-infra/README.md:39）
- 主要程式位置：apps/product/src/app/[locale]/resource/、apps/product/src/components/resource/、apps/product/src/app/[locale]/roadmap/page.tsx、apps/product/src/components/roadmap/、apps/product/src/features/survey/components/survey-response/
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- 資源列表 `/resource`：banner + 熱門標籤 + 最新 10 筆資源（apps/product/src/app/[locale]/resource/page.tsx，server 端 `getResources({ limit: "10" })`）
- 全部分類 `/resource/categories`：分類卡片 + 資源列表（apps/product/src/app/[locale]/resource/categories/page.tsx）
- 分類頁 `/resource/categories/<major>[/<sub>]`：麵包屑、子分類（「展開更多／收合」）、無限捲動資源列表（apps/product/src/app/[locale]/resource/categories/[...categories]/page.tsx）
- 資源詳情 `/resource/<resourceId>`：查看資源（外連）、分享、更多選單（自己的資源才有「編輯」，另有「檢舉」連到 Google 表單）（apps/product/src/app/[locale]/resource/[resourceId]/page.tsx、apps/product/src/components/resource/detail.tsx:106-137）
- Roadmap `/roadmap`：hero 統計、狀態分頁（全部／許願中／排程中／討論中／已完成）、分類篩選、「我支持」投票、載入更多、右下「點我許願」精靈（apps/product/src/components/roadmap/roadmap-board.tsx、apps/product/src/components/roadmap/roadmap-item-card.tsx、apps/product/src/components/roadmap/wish-wizard-modal.tsx）
- 問卷填答 `/survey/r/<shareId>`：所有題目一頁呈現，必填驗證、作答自動存 localStorage、送出後顯示感謝頁（apps/product/src/features/survey/components/survey-response/SurveyResponsePage.tsx）

## 怎麼到這頁（使用者視角）
- 資源：直接開 `/resource`；資源 layout 有獨立 header／footer（apps/product/src/app/[locale]/resource/layout.tsx），不走主站側欄。卡片點擊到 `/resource/<id>`（apps/product/src/components/resource/card.tsx:97）；熱門標籤到 `/resource/categories/<value>`（apps/product/src/components/resource/banner.tsx:87）；分類卡到 `<目前路徑>/<value>`（apps/product/src/components/resource/category-card.tsx:30）；麵包屑「找資源」回 `/resource`（apps/product/src/app/[locale]/resource/[resourceId]/page.tsx:57）。
- Roadmap：登入後點側欄帳號選單（桌機 apps/product/src/components/layout/sidebar/account-menu.tsx:97-105）或手機 bottom sheet（apps/product/src/components/layout/sidebar/mobile-bottom-sheet.tsx:111-117）的「Roadmap & 建議」——**注意 href 寫死 `https://app.daodao.so/roadmap`（正式站）**；資源頁 footer 用 `${appUrl}/roadmap`（apps/product/src/components/layout/resource-footer.tsx:67）。dev 驗收請直接輸入 `https://app-dev.daodao.so/roadmap`。
- 問卷：只能經分享連結進入（通常由講師端／期末回饋寄出），程式內無站內入口。

## 測試帳號與前置條件
- 三者皆在 publicPattern，未登入可瀏覽（apps/product/src/app/global-provider.tsx:72、73、76：`^/roadmap(/.*)?$`、`^/resource(/.*)?$`、`^/survey/r/`）。
- Roadmap 投票與許願需登入：未登入點「我支持」或「點我許願」會開登入 dialog，redirect 帶 `?intent=vote:<id>` 或 `?openWish=1`，登入回來自動補做（apps/product/src/components/roadmap/roadmap-board.tsx:136-151、153-190）。一般使用者即可。
- 資源「編輯」只在 `isOwnResource` 時出現（apps/product/src/components/resource/detail.tsx:121）——需要該資源建立者帳號。
- 前置資料：dev 要有資源資料（否則列表空）、至少一個 roadmap item；問卷需要一個有效 shareId（由後台／講師端建立）。不存在的 resourceId 會走 `notFound()` 404（apps/product/src/app/[locale]/resource/[resourceId]/page.tsx）。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| 資源列表頁標題（meta） | `await expect(page).toHaveTitle('多元學習資源列表｜島島阿學')` | apps/product/src/app/[locale]/resource/page.tsx generateMetadata；`app_product.resource_meta_list_title` packages/i18n/src/locales/zh-TW/app-product.json:168 |
| 熱門標籤區 | `page.getByText('熱門標籤')`，標籤本身 `page.getByRole('link', { name: '<標籤名>' })` | apps/product/src/components/resource/banner.tsx:75、87；packages/i18n/src/locales/zh-TW/app-product.json:561 |
| 資源卡片 | `page.locator('a[href^="/resource/"]')` 或 `getByRole('link', { name: /<資源名>/ })` | apps/product/src/components/resource/card.tsx:97 |
| 分類卡片 | `page.getByRole('link', { name: /<分類名>/ })`（href 為 `/resource/categories/...`） | apps/product/src/components/resource/category-card.tsx:30 |
| 子分類展開／收合 | `getByRole('button', { name: '展開更多' })`／`{ name: '收合' }` | apps/product/src/components/resource/categories-container.tsx:90-92；packages/i18n/src/locales/zh-TW/app-product.json:177-178 |
| 麵包屑「找資源」 | `page.getByRole('link', { name: '找資源' })` | apps/product/src/app/[locale]/resource/[resourceId]/page.tsx:57、apps/product/src/app/[locale]/resource/categories/[...categories]/page.tsx:82；packages/i18n/src/locales/zh-TW/app-product.json:180 |
| 詳情「查看資源」 | `page.getByRole('link', { name: '查看資源' })`（target=_blank） | apps/product/src/components/resource/detail.tsx:106-108；packages/i18n/src/locales/zh-TW/app-product.json:191 |
| 詳情分享按鈕 | 無穩定選擇器（只有 Share2 icon、無 aria-label），建議補 aria-label／data-testid | apps/product/src/components/resource/detail.tsx:111-113 |
| 詳情更多選單觸發 | 無穩定選擇器（icon button 無 aria-label），建議補 data-testid | apps/product/src/components/resource/detail.tsx:115-118 |
| 選單「編輯」「檢舉」 | `getByRole('menuitem', { name: '編輯' })`／`getByRole('link', { name: '檢舉' })` | apps/product/src/components/resource/detail.tsx:121-137；packages/i18n/src/locales/zh-TW/app-product.json:10-11 |
| Roadmap hero 標題 | `page.getByRole('heading', { name: '島島正在進化' })` | apps/product/src/components/roadmap/roadmap-hero.tsx:23；`roadmap.hero_title` packages/i18n/src/locales/zh-TW/roadmap.json:4 |
| 狀態分頁 | `page.getByRole('tab', { name: '全部' })`、`'許願中'`、`'排程中'`、`'討論中'`、`'已完成'` | apps/product/src/components/roadmap/roadmap-board.tsx:206-212（shadcn Tabs）；apps/product/src/components/roadmap/constants.ts:16、21；packages/i18n/src/locales/zh-TW/roadmap.json:8-12 |
| 投票按鈕 | `item.getByRole('button', { name: '我支持' })`／投後 `'已支持'`；許願項未採納顯示 `'採納後可支持'` | apps/product/src/components/roadmap/roadmap-item-card.tsx:145-153；packages/i18n/src/locales/zh-TW/roadmap.json:27-28、32 |
| 支持人數 | `page.getByText(/\d+ 人支持/)`（文案「{count} 人支持」） | apps/product/src/components/roadmap/roadmap-item-card.tsx:140；packages/i18n/src/locales/zh-TW/roadmap.json:29 |
| 載入更多 | `page.getByRole('button', { name: '載入更多' })` | apps/product/src/components/roadmap/roadmap-board.tsx:273-274；packages/i18n/src/locales/zh-TW/roadmap.json:41 |
| 許願 CTA | `page.getByRole('button', { name: '點我許願' })` | apps/product/src/components/roadmap/roadmap-board.tsx:280-285；packages/i18n/src/locales/zh-TW/roadmap.json:35 |
| 許願精靈欄位 | `page.getByPlaceholder(<step2_placeholder 文案>)` 等（roadmap namespace） | apps/product/src/components/roadmap/wish-wizard-modal.tsx:212、234、264 |
| Roadmap 卡片本體 | 無穩定選擇器，建議補 data-testid（可暫以卡片標題文字 `getByText` 定位後找最近按鈕） | apps/product/src/components/roadmap/roadmap-item-card.tsx |
| 問卷題目 | 無穩定選擇器（題卡為 div，題號 `1.` + 題目文字），建議補 data-testid；暫用 `page.getByText('<題目文字>')` | apps/product/src/features/survey/components/survey-response/SurveyResponsePage.tsx:205-235 |
| 問卷必填錯誤 | `page.getByText('此題為必填')`（硬編碼中文，非 i18n） | apps/product/src/features/survey/components/survey-response/SurveyResponsePage.tsx:240 |
| 問卷送出 | `page.getByRole('button', { name: '提交問卷' })`（或問卷 `config.submitButtonText` 自訂文字；送出中為「提交中...」） | apps/product/src/features/survey/components/survey-response/SurveyResponsePage.tsx:246-253 |
| 問卷感謝頁 | `page.getByText('感謝你的回應！')`（或 `config.successMessage`） | apps/product/src/features/survey/components/survey-response/ThankYouPage.tsx:14 |
| 問卷錯誤頁返回 | `page.getByRole('button', { name: '回到首頁' })` | apps/product/src/features/survey/components/survey-response/SurveyResponsePage.tsx:181-182 |

## 怎樣算成功（可觀察的結果與證據）
- 資源：`/resource` 未登入直接 200 並顯示資源卡片（server 端渲染，view-source 裡就有資源名稱）；點卡片進 `/resource/<id>` 有麵包屑與「查看資源」外連。
- 分類：點熱門標籤後 URL 為 `/resource/categories/<value>`，麵包屑最後一節為該分類名稱，列表捲動到底會再載入。
- Roadmap 投票（已登入）：點「我支持」立即變「已支持」且人數 +1（樂觀更新），重新整理後仍維持；失敗時回滾並出現 toast（`roadmap.toast_vote_failed`，apps/product/src/components/roadmap/roadmap-item-card.tsx:118）。
- Roadmap 未登入投票：出現登入 dialog；登入後回到 `/roadmap` 且 URL 的 `intent` 參數被清掉、該項已支持（apps/product/src/components/roadmap/roadmap-board.tsx:167-190）。
- 問卷：未填必填題按送出 → 該題出現「此題為必填」；全部填完送出 → 顯示感謝頁，`localStorage` 的 `survey-answers-<shareId>` 被刪除（apps/product/src/features/survey/components/survey-response/SurveyResponsePage.tsx:161）。

## 陷阱
- 側欄「Roadmap & 建議」連到正式站 `https://app.daodao.so/roadmap`（apps/product/src/components/layout/sidebar/account-menu.tsx:98、apps/product/src/components/layout/sidebar/mobile-bottom-sheet.tsx:111），在 dev 點下去會離開 dev；驗收時直接輸入 dev 網址。
- 資源頁用獨立 layout（ResourceHeader／ResourceFooter），未登入 header 有「立即免費註冊」（apps/product/src/components/layout/resource-header.tsx:87-88；`landing_join_cta` packages/i18n/src/locales/zh-TW/common.json:40），不要拿主站側欄的選擇器。
- 問卷頁文案多為硬編碼中文（「此題為必填」「提交問卷」「回到首頁」），英文 locale 也不會翻譯；送出鍵文字可能被問卷設定覆蓋。
- 問卷作答存在 localStorage，同一瀏覽器重開會帶回舊答案；重跑測試要清 storage 或用新 context。
- 問卷頁 `trackView` 每次載入都送 view 事件（apps/product/src/features/survey/components/survey-response/SurveyResponsePage.tsx:43），會影響講師端統計數字。
- 「期末回饋」問卷（tag `cohort-feedback`）會多顯示「Lighthouse · 期末回饋」標籤（apps/product/src/features/survey/components/survey-response/SurveyResponsePage.tsx:190、199）。
- Roadmap 首屏由 server 取資料，API 失敗時降級為空看板而非錯誤頁（apps/product/src/app/[locale]/roadmap/page.tsx:40-44）——看到空看板不一定代表沒資料。
- 「許願中」分頁不支援「載入更多」（apps/product/src/components/roadmap/roadmap-board.tsx:103 `if (isWishTab) return`）。
- 預設 locale zh-TW 無前綴；英文為 `/en/resource` 等。
