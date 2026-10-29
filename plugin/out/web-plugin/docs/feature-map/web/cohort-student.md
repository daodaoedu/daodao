# 學員端：探索與加入活動／共同挑戰、本期內容

學員探索活動課程與共同挑戰，透過邀請連結加入團，加入後在本期頁面啟用實踐、看本期參與者的打卡動態並管理隱私與退出。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/activities 、https://app-dev.daodao.so/challenges 、https://app-dev.daodao.so/cohorts/join/<joinToken> 、https://app-dev.daodao.so/cohorts/<cohortId>
- 主要程式位置：apps/product/src/app/[locale]/activities/、apps/product/src/app/[locale]/(with-layout)/challenges/page.tsx、apps/product/src/components/cohort/（apps/product/src/components/cohort/cohort-join-page.tsx、apps/product/src/components/cohort/cohort-member-page.tsx）、apps/product/src/components/activity/、apps/product/src/components/challenge/、apps/product/src/constants/activity-detail-cta.ts、apps/product/src/utils/challenge-card.ts
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- 探索活動課程 `/activities`：搜尋、狀態篩選（全部／開放報名／進行中／已結束）、費用篩選（免費…）、活動卡（已加入的卡直接連 `/cohorts/<id>`，否則連 `/activities/<id>`）、底部 CTA。
- 活動詳情 `/activities/<cohortId>`：主辦、形式、地點、場次時間、費用、人數、模板數、主辦介紹、邀請訊息；CTA 依狀態決定（apps/product/src/constants/activity-detail-cta.ts:38-58）：「查看活動」（已加入）／「前往外部報名」（可加入且為外部報名）／「加入活動」（可加入，連 `/cohorts/join/<joinToken>`）／停用按鈕顯示原因「已額滿」「暫停加入」「報名截止」「已結束」。已結束另顯示提示「此活動已結束」（apps/product/src/app/[locale]/activities/[cohortId]/page.tsx:127-132）。
- 加入團 `/cohorts/join/<joinToken>`：顯示主辦與邀請訊息、可見性同意勾選框（文案依活動隱私為私密或公開兩種）、「同意並加入」；連結失效顯示「邀請連結不存在或已失效」，不可加入時依原因顯示標題（未開放／已過截止日／人數已滿／暫停連結加入）與說明。
- 本期頁 `/cohorts/<cohortId>`（團內學員視角）：三個分頁「本期實踐」「本期動態」「設定」。本期實踐可對草稿按「啟用實踐」；設定頁可勾選「我同意將自己的成果納入教練匯出」並儲存、「退出本期，保留為個人實踐」。
- 探索共同挑戰 `/challenges`：依「即將開始／進行中／已結束」分區（沒有項目的分區不顯示）；未加入且即將開始的卡片才有「現在加入」→ 加入對話框「加入這個挑戰」→ 成功畫面「打開我的挑戰實踐」（導到 `/practices/<id>`）；已加入的卡顯示「打卡」（即將開始時為停用樣式）或「觀看總結」，進行中／已結束時整張卡連到該實踐頁（總結為 `/practices/<id>/summary`），並有「抽靈感卡」入口（抽靈感對話框「抽一張」）（apps/product/src/utils/challenge-card.ts:33-60）。

## 怎麼到這頁（使用者視角）
1. 活動：主頁（`/`）的探索列點「探索活動課程」連結（apps/product/src/components/dashboard/explore-row.tsx:14，`dashboard.explore_activity`，packages/i18n/src/locales/zh-TW/dashboard.json:51），或直接開 `/activities`（側欄「空間」在 `/spaces`、`/activities`、`/challenges` 路徑都會呈現選中，apps/product/src/components/layout/sidebar/constant.tsx:36-40）。點活動卡進詳情，按「加入活動」。
2. 邀請連結：講師在燈塔「名單」或「系列與場次」複製的邀請連結即 `/cohorts/join/<joinToken>`；學員開啟 → 勾同意 → 「同意並加入」。
3. 加入後：`/mine` 的「我的活動」點團名，或活動詳情按「查看活動」，進 `/cohorts/<cohortId>`。
4. 共同挑戰：主頁探索列點「探索共同挑戰」（apps/product/src/components/dashboard/explore-row.tsx:12，`dashboard.explore_challenge`，packages/i18n/src/locales/zh-TW/dashboard.json:50），或直接開 `/challenges`。

## 測試帳號與前置條件
- `/activities`、`/activities/<id>`、`/challenges`：未登入可瀏覽（publicPattern，apps/product/src/app/global-provider.tsx:70-71）。在 `/challenges` 未登入點「現在加入」會被導到 `/auth/login?redirect=/challenges`（apps/product/src/app/[locale]/(with-layout)/challenges/page.tsx:80-83）。
- `/cohorts/join/<joinToken>`：不在 publicPattern，未登入進頁就會被 AuthProvider 導去 `/auth/login?redirect=...`；按鈕本身也包在 `requireAuth`（apps/product/src/components/cohort/cohort-join-page.tsx:116）。
- `/cohorts/<cohortId>`：需一般使用者登入，且必須是該團成員；非成員（API 回 `APP_ERROR`）會被 `router.replace('/mine')`（apps/product/src/components/cohort/cohort-member-page.tsx:32-41、58-60）。
- temp 使用者一律被導去 `/auth/onboarding`。
- 資料前置：dev 上需有一個已發佈、`canJoin=true` 的場次及其 joinToken（由講師在燈塔建立，見 lighthouse-instructor.md）；測「啟用實踐」需教練已在該團指派草稿實踐；測「現在加入」需有 upcoming 的挑戰（進行中／已結束的挑戰不提供加入入口）。
- 加入/退出會改 dev 資料，盡量用專用測試帳號，測完退出。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| 活動頁標題 | 已登入：PageHeader 標題「探索活動課程」；未登入：`getByRole('heading', { level: 1, name: '探索活動課程' })`（`explore_activities.page_title`） | apps/product/src/app/[locale]/activities/page.tsx:95、106；packages/i18n/src/locales/zh-TW/explore-activities.json:3 |
| 活動搜尋框 | `getByPlaceholder('搜尋活動名稱、介紹或發起人')`（`explore_activities.search_placeholder`） | apps/product/src/components/activity/explore-search.tsx:22；packages/i18n/src/locales/zh-TW/explore-activities.json:7 |
| 清除搜尋 | `getByRole('button', { name: '清除搜尋' })`（`explore_activities.search_clear`，有輸入值時才出現） | apps/product/src/components/activity/explore-search.tsx:25-29；packages/i18n/src/locales/zh-TW/explore-activities.json:8 |
| 狀態篩選 | `getByRole('button', { name: '開放報名' })`／`'進行中'`／`'已結束'`／`'全部'`（`explore_activities.filter_*`）；無 aria-pressed，選中狀態無穩定屬性，建議補 aria-pressed | apps/product/src/components/activity/explore-filters.tsx:35-44；packages/i18n/src/locales/zh-TW/explore-activities.json:9-12 |
| 費用篩選「免費」 | `getByRole('button', { name: '免費' })`（`explore_activities.filter_free`） | apps/product/src/components/activity/explore-filters.tsx:48-57；packages/i18n/src/locales/zh-TW/explore-activities.json:13 |
| 活動卡 | `getByRole('link', { name: /<活動名稱>/ })`，href `/activities/<id>` 或 `/cohorts/<id>` | apps/product/src/components/activity/activity-card.tsx:41、49 |
| 詳情：加入活動 | `getByRole('link', { name: '加入活動' })`（`explore_activities.detail_join`），href `/cohorts/join/<token>` | apps/product/src/app/[locale]/activities/[cohortId]/page.tsx:305-310；packages/i18n/src/locales/zh-TW/explore-activities.json:77 |
| 詳情：查看活動 | `getByRole('link', { name: '查看活動' })`（`detail_view_cohort`） | apps/product/src/app/[locale]/activities/[cohortId]/page.tsx:288-293；packages/i18n/src/locales/zh-TW/explore-activities.json:78 |
| 詳情：前往外部報名 | `getByRole('link', { name: '前往外部報名' })`（`detail_external_signup`，另開分頁） | apps/product/src/app/[locale]/activities/[cohortId]/page.tsx:294-304；packages/i18n/src/locales/zh-TW/explore-activities.json:76 |
| 詳情：不可加入 | 停用按鈕 `getByRole('button', { name: '已額滿' })`／`'暫停加入'`／`'報名截止'`／`'已結束'`（`detail_cta_*`） | apps/product/src/app/[locale]/activities/[cohortId]/page.tsx:311-316；apps/product/src/constants/activity-detail-cta.ts:4-9；packages/i18n/src/locales/zh-TW/explore-activities.json:80-83 |
| 詳情：已加入徽章 | `getByText('已加入')`（`explore_activities.cta_joined`） | apps/product/src/app/[locale]/activities/[cohortId]/page.tsx:114-118；packages/i18n/src/locales/zh-TW/explore-activities.json:79 |
| 詳情：返回 | `getByRole('link', { name: '返回探索活動' })`（`detail_back`） | apps/product/src/app/[locale]/activities/[cohortId]/page.tsx:74-79、91-96；packages/i18n/src/locales/zh-TW/explore-activities.json:54 |
| 詳情：找不到 | `getByText('找不到此活動')`（`detail_not_found`） | apps/product/src/app/[locale]/activities/[cohortId]/page.tsx:81；packages/i18n/src/locales/zh-TW/explore-activities.json:84 |
| 加入頁：同意勾選框 | `getByRole('checkbox', { name: /我了解並同意/ })`（`cohort.visibility_consent_private`／`visibility_consent_public`，依活動隱私擇一；label 包住 input） | apps/product/src/components/cohort/cohort-join-page.tsx:85、100-108；apps/product/src/utils/cohort-join-consent.ts:13；packages/i18n/src/locales/zh-TW/cohort.json:16-17 |
| 加入頁：同意並加入 | `getByRole('button', { name: '同意並加入' })`（`cohort.agree_and_join`；未勾選或送出中 disabled） | apps/product/src/components/cohort/cohort-join-page.tsx:112-119；packages/i18n/src/locales/zh-TW/cohort.json:19 |
| 加入頁：連結失效 | `getByRole('heading', { name: '邀請連結不存在或已失效' })`（`cohort.link_invalid`） | apps/product/src/components/cohort/cohort-join-page.tsx:44；packages/i18n/src/locales/zh-TW/cohort.json:5 |
| 加入頁：不可加入時 | 標題 `getByRole('heading', { level: 1 })` 文字為 `cohort.unavailable_*` 之一；`getByRole('link', { name: '看看下一期' })`（`cohort.see_next_cohort`，只在主辦有外部連結時出現） | apps/product/src/components/cohort/cohort-join-page.tsx:47-80；packages/i18n/src/locales/zh-TW/cohort.json:6-14 |
| 本期頁：分頁 | `getByRole('button', { name: '本期實踐' })`／`'本期動態'`／`'設定'`（`cohort.my_cohort_practices`／`cohort_feed`／`settings`）；不是 role=tab，選中狀態無穩定屬性，建議補 role=tab＋aria-selected | apps/product/src/components/cohort/cohort-member-page.tsx:152-187；packages/i18n/src/locales/zh-TW/cohort.json:23、24、58 |
| 本期頁：回到我的 | `getByRole('button', { name: '回到我的' })`（`cohort.back_to_mine`） | apps/product/src/components/cohort/cohort-member-page.tsx:135-142；packages/i18n/src/locales/zh-TW/cohort.json:70 |
| 啟用草稿實踐 | `getByText('啟用實踐')`（`cohort.activate_practice`，作為 InProgressTaskCard 的 draftActionLabel） | apps/product/src/components/cohort/cohort-member-page.tsx:229；packages/i18n/src/locales/zh-TW/cohort.json:33 |
| 匯出同意勾選 | `getByRole('checkbox', { name: '我同意將自己的成果納入教練匯出' })`（`cohort.export_consent`；Label htmlFor="export-consent"），或 `locator('#export-consent')` | apps/product/src/components/cohort/cohort-member-page.tsx:296-301；packages/i18n/src/locales/zh-TW/cohort.json:25 |
| 設定儲存 | `getByRole('button', { name: '儲存' })`（`cohort.save`，勾選改變後 `consentDirty` 為真才出現） | apps/product/src/components/cohort/cohort-member-page.tsx:310-318；packages/i18n/src/locales/zh-TW/cohort.json:75 |
| 退出本期 | `getByRole('button', { name: '退出本期，保留為個人實踐' })`，確認對話框按 `getByRole('button', { name: '退出', exact: true })`（`cohort.exit_confirm_action`） | apps/product/src/components/cohort/cohort-member-page.tsx:89-97、329-337；packages/i18n/src/locales/zh-TW/cohort.json:36、77 |
| 挑戰頁標題 | `getByRole('heading', { level: 1, name: '探索共同挑戰' })`（`challenge.page_title`） | apps/product/src/app/[locale]/(with-layout)/challenges/page.tsx:91-94；packages/i18n/src/locales/zh-TW/challenge.json:3 |
| 挑戰分區 | `getByRole('heading', { level: 2, name: '即將開始' })`／`'進行中'`／`'已結束'`（`challenge.section_*`；用 getByText 會與卡片狀態徽章撞字） | apps/product/src/app/[locale]/(with-layout)/challenges/page.tsx:52-76、112；packages/i18n/src/locales/zh-TW/challenge.json:5-8 |
| 挑戰卡：現在加入 | `getByRole('button', { name: '現在加入' })`（只在未加入且即將開始的卡）；額滿／截止時為停用按鈕「已額滿」「報名截止」 | apps/product/src/utils/challenge-card.ts:37-45；apps/product/src/components/challenge/challenge-card.tsx:147-158；packages/i18n/src/locales/zh-TW/challenge.json:21、23、24 |
| 加入挑戰確認 | `getByRole('dialog').getByRole('button', { name: '加入這個挑戰' })`（`challenge.join_confirm`） | apps/product/src/components/challenge/join-challenge-dialog.tsx:167-168；packages/i18n/src/locales/zh-TW/challenge.json:33 |
| 加入成功 | `getByRole('heading', { name: '你已加入共同挑戰' })`＋`getByRole('button', { name: '打開我的挑戰實踐' })`（`challenge.joined_heading`／`joined_edit`） | apps/product/src/components/challenge/join-challenge-dialog.tsx:174-184；packages/i18n/src/locales/zh-TW/challenge.json:35、37 |
| 抽靈感卡入口 | `getByRole('button', { name: '抽靈感卡' })`（`challenge.draw_entry_label`；已加入、未結束且有指派卡組時出現） | apps/product/src/components/challenge/challenge-card.tsx:161-176；packages/i18n/src/locales/zh-TW/challenge.json:41 |
| 抽一張 | `getByRole('button', { name: '抽一張' })`（`challenge.draw_button`） | apps/product/src/components/challenge/inspiration-draw-dialog.tsx:132、220；packages/i18n/src/locales/zh-TW/challenge.json:46 |
| 已加入挑戰：動作膠囊 | `getByTestId('challenge-card-action')`（文字「打卡」／「觀看總結」，`challenge.cta_checkin`／`cta_view_summary`；不可點時帶 `aria-disabled="true"`）；可點時整張卡為 `getByRole('link', { name: '打卡：<挑戰名稱>' })`／`'觀看總結：<挑戰名稱>'`（`challenge.card_link_label`） | apps/product/src/components/challenge/challenge-card.tsx:71-77、177-193；packages/i18n/src/locales/zh-TW/challenge.json:25-27 |

## 怎樣算成功（可觀察的結果與證據）
- 加入團：按「同意並加入」後 URL 變成 `/cohorts/<cohortId>`（apps/product/src/components/cohort/cohort-join-page.tsx:33），頁首顯示團名；`/mine`「我的活動」出現該團；活動詳情 CTA 變成「查看活動」，詳情頁出現「已加入」徽章。失敗時 toast「無法加入本期，請稍後再試」，並重新取加入資訊、改顯示不可加入原因（apps/product/src/components/cohort/cohort-join-page.tsx:27-31）。
- 啟用實踐：toast「實踐已啟用」（`cohort.practice_activated`），卡片不再是草稿。
- 匯出同意：儲存後重新整理，勾選狀態維持。
- 退出：toast「已退出本期，實踐已保留在個人空間」，URL 回 `/mine`，該團從「我的活動」消失，實踐仍在個人列表。
- 加入挑戰：對話框顯示「你已加入共同挑戰」，挑戰卡動作由「現在加入」變成「打卡」（即將開始的挑戰為停用樣式）；按「打開我的挑戰實踐」URL 變成 `/practices/<id>`。
- 證據：截圖＋ `POST` 加入 API（`joinCohort`）回應 200。

## 陷阱
- `/cohorts/...` 不在 publicPattern：未登入開邀請連結會先被導到登入頁，登入後靠 `redirect` 參數回來；驗證時要確認 redirect 回到原 joinToken。
- 非成員開 `/cohorts/<id>` 不會顯示錯誤頁，而是靜默 `replace('/mine')`；看到被導回 `/mine` 代表帳號不在該團。其他載入錯誤才顯示錯誤狀態與重試（apps/product/src/components/cohort/cohort-member-page.tsx:117-124）。
- 本期頁與活動頁的分頁／篩選都沒有 aria-selected／aria-pressed，無法用屬性判斷選中，只能看內容變化。
- 已加入的活動卡直接連 `/cohorts/<id>`，不會經過詳情頁。
- 挑戰卡的「現在加入」只出現在未加入且即將開始的挑戰；進行中／已結束且未加入的卡沒有任何動作按鈕。已加入但前端拿不到實踐 id 時，膠囊顯示為不可點（`aria-disabled`），整張卡也沒有連結（apps/product/src/utils/challenge-card.ts:66-68）。
- 品牌用詞：介面用「本期參與者」「團」，不用舊稱「同梯」；比對文案時以 `packages/i18n/src/locales/zh-TW/<namespace>.json` 為準。
- 加入／退出／加入挑戰都會寫入 dev 資料庫，且加入挑戰會建立一個實踐。
