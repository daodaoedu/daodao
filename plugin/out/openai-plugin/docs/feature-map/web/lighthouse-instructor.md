# 燈塔（講師／團主管理端）

講師或團主在燈塔建立系列與場次、邀請成員、追蹤每場次的打卡節律與今日焦點、傳訊息給學員、產出成果報告，並管理模板庫與組織設定。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/lighthouse （無權限頁 https://app-dev.daodao.so/lighthouse/access-required ；舊網址 `/manage` 會轉到這裡）
- 主要程式位置：apps/product/src/app/[locale]/(lighthouse)/lighthouse/、apps/product/src/app/[locale]/lighthouse/access-required/page.tsx、apps/product/src/components/lighthouse/、apps/product/src/middleware.ts
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- 總覽 `/lighthouse`：場次卡片（管理本場次、編輯場次設定）、值得慶祝／需要鼓勵統計；沒有場次時顯示空狀態。
- 系列與場次 `/lighthouse/programs`：建立系列、建立場次（場次名稱、時間、截止日、人數、線上連結、地點、時段、邀請訊息、「建立後立即發佈並產生邀請連結」開關）、發佈、編輯、更多操作、邀請連結／QR code。`?edit=<cohortId>#cohort-<cohortId>` 直接展開編輯。
- 場次管理（`/lighthouse/programs/<programId>/cohorts/<cohortId>/...`，五個分頁）：
  - 儀表板 `dashboard`：實踐篩選、已加入／已啟用／活躍人數、實踐概況（日期區間）、節律熱力圖、標籤、心情、趨勢。
  - 名單 `roster`：以 email 清單或 CSV 邀請成員（預覽名單 → 寄出邀請）、重寄、移除成員、邀請連結、重置加入連結、暫停／恢復加入。
  - 今日焦點 `focus`：「需要鼓勵」「值得慶祝」分頁，對學員開訊息紀錄、寫訊息、看打卡紀錄。
  - 動態 `feed`：活動統計、搜尋與篩選（期間、類型、實踐、僅文字）、活動明細對話框。
  - 成果 `outcome`：階段、概況、AI 摘要（平台 AI／自己的 AI API，產生／重新產生／編輯／儲存）、匯出場次成果報告（新分頁開 `outcome/report`，可列印／儲存 PDF）。
- 模板庫 `/lighthouse/templates`：搜尋、建立模板（多步驟編輯器，可儲存草稿）、模板卡編輯／更多操作／綁定場次。
- 組織設定 `/lighthouse/organization`：組織名稱、簡介、連結、成員（可移除；以 email 新增成員目前停用、標示即將推出，apps/product/src/components/lighthouse/organization-settings.tsx:175-194）、AI API key 設定。
- 封存 `/lighthouse/archive`：分頁切換封存的系列／場次等，「恢復」。
- 無權限 `/lighthouse/access-required`：「燈塔尚未為你開通」＋「回到首頁」；權限查詢失敗（`?reason=unavailable`）時改顯示「暫時無法確認你的燈塔權限」＋「重試」（apps/product/src/components/lighthouse/lighthouse-membership-guard.tsx:19-59）。

## 怎麼到這頁（使用者視角）
1. 登入後主頁側欄點「管理」（`app_product.nav_manage`，連到 `/lighthouse`，apps/product/src/components/layout/sidebar/constant.tsx:50-57），或在 `/mine` 桌機版右下「新增」→「建立活動課程」（導 `/manage` → `/lighthouse`）。
2. 燈塔左側（桌機）或頂部（手機）導覽：總覽／系列與場次／模板庫／組織設定／封存。
3. 在「系列與場次」或總覽點場次的「管理本場次」→ 進入該場次儀表板，再用場次導覽切分頁。

## 測試帳號與前置條件
- 角色：講師或團主＝已登入，且 `GET /api/v1/lighthouse/organizations` 回傳至少一個組織（middleware 判斷，apps/product/src/middleware.ts:21-46）。不是看使用者 roles。
- middleware 規則（只比對 `/lighthouse` 與 `/en/lighthouse`，apps/product/src/middleware.ts:18）：
  - 沒有 `auth_token` cookie 或 API 401 → 302 到 `/auth/login?redirect=<原路徑>`（apps/product/src/middleware.ts:65-67）。
  - API 403 或組織清單為空 → 302 到 `/lighthouse/access-required`（apps/product/src/middleware.ts:68-71）。
  - API 失敗或回應格式不符 → 302 到 `/lighthouse/access-required?reason=unavailable`（apps/product/src/middleware.ts:57-62）。
- 一般使用者（沒有組織）可用來驗證「無權限」路徑；temp 使用者會被導 onboarding。
- 資料前置：組織內要有系列＋場次才看得到總覽卡片與場次分頁；儀表板／動態／焦點要有成員加入並打卡才有資料；成果 AI 摘要「自己的 AI API」需先在組織設定存 API key。
- 程式只取第一個組織（`organizations?.[0]`，apps/product/src/components/lighthouse/lighthouse-overview.tsx:93、apps/product/src/components/lighthouse/programs-manager.tsx:1587、apps/product/src/components/lighthouse/organization-settings.tsx:35、apps/product/src/components/lighthouse/templates-manager.tsx:39、apps/product/src/components/lighthouse/archive-manager.tsx:27、apps/product/src/components/lighthouse/cohort-focus.tsx:50），沒有組織切換器；測試帳號最好只屬於一個組織。
- 邀請成員會寄出真實 email（server-dev 會真的寄信），不要用不存在的信箱。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| 主頁側欄「管理」 | `getByRole('link', { name: '管理' })`（`app_product.nav_manage`，desktop 版 aria-label=label） | apps/product/src/components/layout/sidebar/constant.tsx:53-54；apps/product/src/components/layout/sidebar/desktop.tsx:92；packages/i18n/src/locales/zh-TW/app-product.json:17 |
| 燈塔主導覽 | `getByRole('navigation', { name: '燈塔主要導覽' })`（桌機與手機各一個，需限定可見者） | apps/product/src/components/lighthouse/lighthouse-shell.tsx:55、95；packages/i18n/src/locales/zh-TW/lighthouse.json:271 |
| 導覽項目 | 導覽內 `getByRole('link', { name: '總覽' })`／`'系列與場次'`／`'模板庫'`／`'組織設定'`／`'封存'`；目前頁有 `aria-current="page"` | apps/product/src/components/lighthouse/lighthouse-shell.tsx:21-30、63-64；packages/i18n/src/locales/zh-TW/lighthouse.json:272-275、203 |
| 回主頁 | `getByRole('link', { name: '回主頁' })`（`lighthouse.back_home`） | apps/product/src/components/lighthouse/lighthouse-shell.tsx:42-44、86-87；packages/i18n/src/locales/zh-TW/lighthouse.json:477 |
| 總覽標題 | `getByRole('heading', { name: '看見一群人如何持續往前' })`（`lighthouse.overview_title`） | apps/product/src/components/lighthouse/lighthouse-overview.tsx:102；packages/i18n/src/locales/zh-TW/lighthouse.json:278 |
| 總覽空狀態 | `getByText('還沒有任何場次，先到「系列與場次」建立一個。')`（`overview_empty`） | apps/product/src/components/lighthouse/lighthouse-overview.tsx:117；packages/i18n/src/locales/zh-TW/lighthouse.json:494 |
| 總覽場次卡進入 | `getByRole('link', { name: '管理本場次：<場次名>' })` | apps/product/src/components/lighthouse/lighthouse-overview.tsx:32；packages/i18n/src/locales/zh-TW/lighthouse.json:333 |
| 建立系列 | `getByRole('button', { name: '建立系列' })` → `getByPlaceholder('系列名稱')` → `getByRole('button', { name: '建立', exact: true })` | apps/product/src/components/lighthouse/programs-manager.tsx:1622-1641；packages/i18n/src/locales/zh-TW/lighthouse.json:294、299、357 |
| 建立場次 | `getByRole('button', { name: '建立場次' })`；表單送出按鈕同名（type=submit） | apps/product/src/components/lighthouse/programs-manager.tsx:1540-1543、943-949；packages/i18n/src/locales/zh-TW/lighthouse.json:307 |
| 場次名稱欄位 | `getByLabel('場次名稱')`（label htmlFor=`<prefix>-name`，name="displayName"） | apps/product/src/components/lighthouse/programs-manager.tsx:376-384；packages/i18n/src/locales/zh-TW/lighthouse.json:322 |
| 立即發佈開關 | 文字「建立後立即發佈並產生邀請連結」旁的 `getByRole('switch')`（Switch 與文字同在 span 內，沒有 label 關聯，`getByLabel` 取不到） | apps/product/src/components/lighthouse/programs-manager.tsx:928-933；packages/i18n/src/locales/zh-TW/lighthouse.json:329 |
| 場次卡（系列頁） | `locator('#cohort-<cohortId>')` | apps/product/src/components/lighthouse/programs-manager.tsx:1165 |
| 場次發佈／編輯／更多操作 | 場次卡內 `getByRole('button', { name: '發佈' })`、`'編輯'`、`'更多操作'` | apps/product/src/components/lighthouse/programs-manager.tsx:1217、1231、1252；packages/i18n/src/locales/zh-TW/lighthouse.json:334、355、485 |
| 場次卡：管理本場次 | `getByRole('link', { name: '管理本場次' })`，href `/lighthouse/programs/<p>/cohorts/<c>/dashboard` | apps/product/src/components/lighthouse/programs-manager.tsx:1237-1244 |
| 場次導覽 | `getByRole('navigation', { name: '場次管理導覽' })` 內 `getByRole('link', { name: '儀表板' })`／`'名單'`／`'今日焦點'`／`'動態'`／`'成果'`；`aria-current="page"` | apps/product/src/components/lighthouse/cohort-shell.tsx:17、32-41；packages/i18n/src/locales/zh-TW/lighthouse.json:367-372 |
| 返回系列與場次 | `getByRole('link', { name: '返回系列與場次' })` | apps/product/src/components/lighthouse/cohort-shell.tsx:56-60；packages/i18n/src/locales/zh-TW/lighthouse.json:480 |
| 編輯場次設定 | `getByRole('link', { name: '編輯場次設定' })` | apps/product/src/components/lighthouse/cohort-shell.tsx:68-70；packages/i18n/src/locales/zh-TW/lighthouse.json:481 |
| 儀表板實踐篩選 | `getByTestId('practice-filter')`（aria-label「實踐篩選」） | apps/product/src/components/lighthouse/cohort-dashboard.tsx:81-82；packages/i18n/src/locales/zh-TW/lighthouse.json:507 |
| 儀表板空狀態 | `getByText('本場次還沒有足夠的節律資料')` | apps/product/src/components/lighthouse/cohort-dashboard.tsx:63；packages/i18n/src/locales/zh-TW/lighthouse.json:418 |
| 名單：email 清單 | `locator('#invite-emails')`（name="emails"） | apps/product/src/components/lighthouse/cohort-roster.tsx:243-244 |
| 名單：CSV 上傳 | `locator('#invite-csv')`（type=file） | apps/product/src/components/lighthouse/cohort-roster.tsx:252-253 |
| 名單：預覽名單 → 寄出邀請 | `getByRole('button', { name: '預覽名單' })` → `getByRole('button', { name: '寄出邀請' })` | apps/product/src/components/lighthouse/cohort-roster.tsx:259-261、326；packages/i18n/src/locales/zh-TW/lighthouse.json:379、392 |
| 名單：重置加入連結／暫停加入 | `getByRole('button', { name: '重置加入連結' })`／`'暫停加入'`（會跳確認框） | apps/product/src/components/lighthouse/cohort-roster.tsx:173、185；packages/i18n/src/locales/zh-TW/lighthouse.json:396、397 |
| 邀請連結 QR | `locator('canvas[aria-label="加入本場次的 QR code"]')`（canvas 沒有 role，不能用 getByRole('img')） | apps/product/src/components/lighthouse/join-code.tsx:52-55；packages/i18n/src/locales/zh-TW/lighthouse.json:364 |
| 複製邀請連結 | `getByRole('button', { name: '複製連結' })`（名單頁用 hideCopyButton，按鈕在 programs 頁） | apps/product/src/components/lighthouse/join-code.tsx:71；apps/product/src/components/lighthouse/cohort-roster.tsx:286；packages/i18n/src/locales/zh-TW/lighthouse.json:365 |
| 今日焦點分頁 | `getByRole('tablist', { name: '今日焦點' })` 內 `getByRole('tab', { name: /需要鼓勵/ })`／`/值得慶祝/`，`aria-selected` | apps/product/src/components/lighthouse/cohort-focus.tsx:134-158；packages/i18n/src/locales/zh-TW/lighthouse.json:547-548 |
| 寫訊息給學員 | `getByRole('button', { name: '寫訊息給 <暱稱>' })` | apps/product/src/components/lighthouse/cohort-focus.tsx:104-110；packages/i18n/src/locales/zh-TW/lighthouse.json:580 |
| 訊息內容／送出 | `getByRole('textbox', { name: '寫下你想說的話…' })` → `getByRole('button', { name: '送出' })`（內容空白時 disabled） | apps/product/src/components/lighthouse/cohort-message-dialogs.tsx:284、298-304；packages/i18n/src/locales/zh-TW/lighthouse.json:576-577 |
| 看打卡紀錄／訊息紀錄 | `getByRole('button', { name: '查看 <暱稱> 的打卡紀錄' })`／`'查看與 <暱稱> 的訊息紀錄'` | apps/product/src/components/lighthouse/cohort-focus.tsx:91-96、117-121；packages/i18n/src/locales/zh-TW/lighthouse.json:562、565 |
| 動態統計／篩選／空狀態 | `getByTestId('activity-stats')`、`getByTestId('activity-filters')`、`getByTestId('activity-empty')` | apps/product/src/components/lighthouse/cohort-activity.tsx:147、208、324 |
| 動態搜尋 | `getByRole('textbox', { name: '搜尋成員、實踐或關鍵字' })` | apps/product/src/components/lighthouse/cohort-activity.tsx:219-220；packages/i18n/src/locales/zh-TW/lighthouse.json:9 |
| 動態類型篩選 | `getByRole('combobox', { name: '類型' })` | apps/product/src/components/lighthouse/cohort-activity.tsx:255；packages/i18n/src/locales/zh-TW/lighthouse.json:15 |
| 活動明細對話框 | `getByTestId('activity-detail')` | apps/product/src/components/lighthouse/cohort-activity-detail-dialog.tsx:76 |
| 成果：階段／概況 | `getByTestId('outcome-phase')`、`getByTestId('outcome-overview')` | apps/product/src/components/lighthouse/cohort-outcome.tsx:138、167 |
| 成果：匯出報告 | `getByTestId('outcome-export-report')`（文字「匯出場次成果報告」，開新分頁） | apps/product/src/components/lighthouse/cohort-outcome.tsx:87-96；packages/i18n/src/locales/zh-TW/lighthouse.json:93 |
| AI 模式 | `getByTestId('outcome-ai-mode')`（select：平台 AI／自己的 AI API） | apps/product/src/components/lighthouse/cohort-outcome-summary.tsx:131-143；packages/i18n/src/locales/zh-TW/lighthouse.json:49-50 |
| AI 摘要狀態／內容 | `getByTestId('outcome-summary-status')`、`getByTestId('outcome-summary-content')` | apps/product/src/components/lighthouse/cohort-outcome-summary.tsx:177、198 |
| 產生／重新產生 AI 摘要 | `getByRole('button', { name: /產生 AI 摘要/ })` | apps/product/src/components/lighthouse/cohort-outcome-summary.tsx:229-242；packages/i18n/src/locales/zh-TW/lighthouse.json:61-62 |
| 編輯／儲存摘要 | `getByRole('button', { name: '編輯摘要' })`、`getByRole('button', { name: '儲存摘要' })` | apps/product/src/components/lighthouse/cohort-outcome-summary.tsx:209-248；packages/i18n/src/locales/zh-TW/lighthouse.json:66-67 |
| 成果報告頁 | `getByTestId('outcome-report')`；列印 `getByTestId('outcome-report-print')`（「列印／儲存 PDF」） | apps/product/src/components/lighthouse/cohort-outcome-report.tsx:57、74-80；packages/i18n/src/locales/zh-TW/lighthouse.json:97 |
| 模板：建立 | `getByRole('button', { name: '建立模板' })` | apps/product/src/components/lighthouse/templates-manager.tsx:75-81、126-131；packages/i18n/src/locales/zh-TW/lighthouse.json:440 |
| 模板搜尋 | `getByRole('textbox', { name: '搜尋模板名稱、標籤或資源…' })` | apps/product/src/components/lighthouse/templates-manager.tsx:96；packages/i18n/src/locales/zh-TW/lighthouse.json:104 |
| 模板卡 | `getByTestId('template-<templateId>')`；卡內 `getByRole('button', { name: '編輯' })` | apps/product/src/components/lighthouse/template-card.tsx:230、242-247 |
| 模板編輯器 | `getByTestId('template-editor')`；`getByRole('button', { name: '儲存草稿' })`、`'下一步 ›'` | apps/product/src/components/lighthouse/template-editor-dialog.tsx:287、652、662-663；packages/i18n/src/locales/zh-TW/lighthouse.json:189、192 |
| 組織設定欄位 | `locator('#organization-name')`、`#organization-bio`、`#organization-link`；儲存 `getByRole('button', { name: '儲存' })` | apps/product/src/components/lighthouse/organization-settings.tsx:119-151 |
| 新增組織成員（停用） | `getByRole('textbox', { name: 'email' })`、`getByRole('button', { name: '新增成員' })` 兩者皆 disabled（title「即將推出新增組織成員功能」） | apps/product/src/components/lighthouse/organization-settings.tsx:175-194；packages/i18n/src/locales/zh-TW/lighthouse.json:215-216、463 |
| AI key 狀態 | `getByTestId('ai-key-status')`；欄位 `#organization-ai-provider`、`#organization-ai-key` | apps/product/src/components/lighthouse/organization-ai-key-card.tsx:156、174、191 |
| 封存分頁 | `getByRole('tablist', { name: '封存' })` 內 `getByRole('tab')`；恢復 `getByRole('button', { name: '恢復' })` | apps/product/src/components/lighthouse/archive-manager.tsx:88-96、166；packages/i18n/src/locales/zh-TW/lighthouse.json:250、258 |
| 無權限頁 | `getByText('燈塔尚未為你開通')`（`?reason=unavailable` 時為「暫時無法確認你的燈塔權限」）、`getByRole('link', { name: '回到首頁' })` | apps/product/src/components/lighthouse/lighthouse-membership-guard.tsx:30-59；packages/i18n/src/locales/zh-TW/lighthouse.json:285、287、288 |

## 怎樣算成功（可觀察的結果與證據）
- 權限：講師帳號開 `/lighthouse` 停在原路徑並顯示 `navigation[name=燈塔主要導覽]`；一般帳號 302 到 `/lighthouse/access-required` 並看到「燈塔尚未為你開通」；未登入 302 到 `/auth/login?redirect=%2Flighthouse`。用 network 看第一個 document 回應的 status 與 Location。
- 建立場次（開立即發佈）：系列頁出現 `#cohort-<id>`，有邀請連結／QR；複製連結 toast「邀請連結已複製」（packages/i18n/src/locales/zh-TW/lighthouse.json:366）；用學員帳號開該連結能走完 cohort-student.md 的加入流程。
- 邀請成員：預覽名單後按「寄出邀請」，toast「已排入 N 封邀請信」（有已加入者時為「已排入 N 封邀請信，M 位已加入者已略過」；`lighthouse.invitation_sent_count`／`invitation_sent_with_skipped`，apps/product/src/components/lighthouse/cohort-roster.tsx:132-137，packages/i18n/src/locales/zh-TW/lighthouse.json:382-383）；可在 admin email history 查寄送紀錄。
- 寫訊息：toast「訊息已送出」（packages/i18n/src/locales/zh-TW/lighthouse.json:578），該學員的訊息紀錄數字 +1。
- 成果：按「產生 AI 摘要」後 `outcome-summary-status` 狀態變化、`outcome-summary-content` 出現文字；「匯出場次成果報告」開新分頁 URL 為 `.../outcome/report` 且有 `outcome-report`。
- 模板：「儲存草稿」後模板庫出現新的 `template-<id>` 卡。
- 封存：「恢復」後項目從封存列表消失、回到系列與場次。

## 陷阱
- 權限是 middleware（Edge）在伺服器端打 API 判斷，cookie 名稱必須是 `auth_token`；只在 localStorage 有登入資訊、沒有 cookie 會被當成未登入。
- dev 環境 API 掛掉時會導到 `?reason=unavailable`，頁面顯示「暫時無法確認你的燈塔權限」與「重試」，與「沒開通」的「燈塔尚未為你開通」不同（apps/product/src/app/[locale]/lighthouse/access-required/page.tsx:11-13）；驗證無權限路徑時要確認看到的是哪一種。
- middleware 的 regex 只認 `/lighthouse` 與 `/en/lighthouse`；成果報告用 `window.open('/${locale}/lighthouse/...')`（apps/product/src/components/lighthouse/cohort-outcome.tsx:52-56），zh-TW 會開 `/zh-TW/lighthouse/...`，靠 next-intl 再轉址回無前綴路徑後才過閘門（推測，未實測）。
- 燈塔 shell 桌機用左側 `aside`（`hidden md:flex`），手機用頂部 header（`md:hidden`），兩邊各有一份同名 navigation／「回主頁」連結，Playwright 需加 `.filter({ visible: true })` 或固定 viewport。
- 只讀第一個組織，沒有組織切換器：測試帳號屬於多個組織時只會看到最早加入的那個（server 依建立順序由舊到新排序，已在 app-dev 確認）。
- 「匯出學員成果紀錄」按鈕停用並標「coming soon」（`coming_soon_badge`，apps/product/src/components/lighthouse/cohort-outcome.tsx:101-109），不是功能壞掉。組織設定的「新增成員」同樣停用、即將推出。
- 名單頁的 JoinCode 設 `hideCopyButton`，在名單頁找不到「複製連結」按鈕；複製在系列與場次頁。
- 「封存」的 i18n key `nav_archive` 位置與其他 nav key 不連續（packages/i18n/src/locales/zh-TW/lighthouse.json:203），比對時以實際字串「封存」為準。
- 建立系列／場次、寄邀請、送訊息、AI 摘要都會寫入 dev 資料或寄出真實信件；AI 摘要可能消耗平台 AI 額度。
