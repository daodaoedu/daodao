# 建立實踐

使用者從模板挑一個主題，或自己從頭填寫，建立一個新的個人實踐（也可複製別人的實踐）。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/practices/create（dev host 依據 daodao-infra/README.md:39、daodao-infra/nginx/conf.d/product.conf:26；API 為 https://server-dev.daodao.so，見 .github/workflows/mobile-deploy.yml:53）
- 主要程式位置：apps/product/src/app/[locale]/practices/create/、apps/product/src/components/practice/create/wizard/、apps/product/src/app/[locale]/practices/copy-success/page.tsx
- 依據版本：daodao-f2e 70155dce（2026-10-29）

> 以下路徑皆相對 projects/daodao-f2e；i18n 字串依 namespace 分檔於 `packages/i18n/src/locales/zh-TW/<namespace>.json`。

## 子功能

- 選模板：`/practices/create` 依類別列出模板（每次 16 筆），點模板進 `/practices/create/template/[templateId]`（apps/product/src/app/[locale]/practices/create/page.tsx:80-82）。
- 自己建立：`/practices/create/manual`（`?mode=template` 會改成「建立模版」模式，apps/product/src/app/[locale]/practices/create/manual/page.tsx:11）。
- 建立精靈（wizard）：多步驟（行動 → 節奏 → 標籤／資源 → 預覽），可分段（多段一次批次建立）（apps/product/src/components/practice/create/wizard/wizard-page.tsx:201-215）。
- 草稿還原：精靈有本機草稿，再次進入會跳「還原草稿」對話框（apps/product/src/components/practice/create/wizard/wizard-page.tsx:112-145，hooks/use-restore-draft-dialog）。
- 完成彈窗：建立成功不換頁，就地開完成對話框（apps/product/src/components/practice/create/wizard/wizard-page.tsx:234-244、apps/product/src/components/practice/create/wizard/completion-dialog.tsx）。
- 複製實踐成功頁：從別人實踐「我也想實踐」／「建立複本」後到 `/practices/copy-success?practiceId=<id>`（apps/product/src/components/practice/detail/practice-detail-shell.tsx:517、648）。
- `/practices/create/success`：舊版成功頁，程式內已無任何導向此頁的連結（grep 無引用），推測已淘汰。

## 怎麼到這頁（使用者視角）

1. 登入後在首頁（`/`）或 `/mine` 點新增實踐浮動鈕（AddTaskFAB，apps/product/src/app/[locale]/(with-layout)/page.tsx:492、apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:219，按下導向 apps/product/src/components/dashboard/add-task-fab.tsx:52）；手機底部導覽「建立主題實踐」也連到此（apps/product/src/components/layout/sidebar/mobile.tsx:122-124）→ `/practices/create`。
2. 上方選類別按鈕 → 下方出現模板卡片，點一張 → 模板精靈（欄位已預填）。
3. 或點頁底「我想自己建立」→ `/practices/create/manual` 空白精靈。
4. 一路「下一步」到「預覽」，按「完成新增」→ 完成彈窗 →「看看我的實踐」回首頁 `/`。

## 測試帳號與前置條件

- 角色：一般使用者（已完成註冊、email 已驗證）。`/practices/create*` 不在 publicPattern（apps/product/src/app/global-provider.tsx:62-82），未登入會被導去 `/auth/login?redirect=...`；temp 使用者被導去 `/auth/onboarding`；email 未驗證導去 `/auth/verify-email/pending`（apps/product/src/app/global-provider.tsx:83-93）。
- 模板頁額外用 `requireAuth` 包住送出（apps/product/src/app/[locale]/practices/create/template/[templateId]/page.tsx:28-37），註解寫「未登入時先要求登入」，但路由層本來就會擋。
- 前置資料：dev DB 需有實踐模板分類與模板，否則顯示「載入模板時發生錯誤」或空清單。
- 複製流程需要另一位使用者的公開、非共同挑戰實踐（apps/product/src/components/practice/detail/practice-detail-shell.tsx:634 `!isOwner && !practice.isChallenge`）。

## 穩定的選擇器

| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| 選類別按鈕 | `getByRole('button', { name: /^選擇類別：/ })` | apps/product/src/app/[locale]/practices/create/page.tsx:157；i18n `practice.create_select_category_label`「選擇類別：{label}」packages/i18n/src/locales/zh-TW/practice.json:91 |
| 模板卡片 | `getByRole('button', { name: '選擇提案：<模板標題>' })` | apps/product/src/app/[locale]/practices/create/page.tsx:220；`practice.create_select_practice_label` packages/i18n/src/locales/zh-TW/practice.json:95 |
| 模板輪播上一個／下一個 | `getByRole('button', { name: '上一個' })` / `{ name: '下一個' }` | apps/product/src/app/[locale]/practices/create/page.tsx:253、259；packages/i18n/src/locales/zh-TW/practice.json:96-97 |
| 我想自己建立 | `getByRole('button', { name: '我想自己建立' })` | apps/product/src/app/[locale]/practices/create/page.tsx:267-268；`practice.create_manual` packages/i18n/src/locales/zh-TW/practice.json:98 |
| 精靈：實踐行動輸入 | `getByPlaceholder('例如：圖書館借閱《原子習慣》，每天閱讀 30 頁')` | apps/product/src/components/practice/create/wizard/step-action.tsx:78；`practice.wizard_action_placeholder` packages/i18n/src/locales/zh-TW/practice.json:358 |
| 精靈：名稱「修改」／「完成」 | `getByRole('button', { name: '修改' })`、`{ name: '完成' }` | apps/product/src/components/practice/create/wizard/step-action.tsx:152-154、130-133；packages/i18n/src/locales/zh-TW/practice.json:363-364 |
| 精靈：名稱輸入 | `getByPlaceholder('幫這個實踐取個名字')` | apps/product/src/components/practice/create/wizard/step-action.tsx:112；packages/i18n/src/locales/zh-TW/practice.json:365 |
| 精靈：開始日期 | `getByPlaceholder('選擇日期')`，旁邊日曆按鈕無 aria-label | apps/product/src/components/practice/create/wizard/step-rhythm.tsx:175-191；`practice.wizard_start_date_placeholder` packages/i18n/src/locales/zh-TW/practice.json:368 |
| 精靈：天數／頻率／時長預設選項 | `getByRole('button', { name: <選項文字> })`（各選項帶 aria-label） | apps/product/src/components/practice/create/wizard/step-rhythm.tsx:252、328、445 |
| 精靈：分段 +/- | `getByRole('button', { name: <wizard_split_increase/decrease> })` | apps/product/src/components/practice/create/wizard/step-rhythm.tsx:528、545 |
| 精靈：步驟計數 | `getByText('1 / 4')` 類文字（`{current} / {total}`，預覽步驟不顯示） | apps/product/src/components/practice/create/wizard/wizard-page.tsx:315；packages/i18n/src/locales/zh-TW/practice.json:353 |
| 上一步／下一步 | `getByRole('button', { name: '上一步' })`、`{ name: '下一步' }` | apps/product/src/components/practice/create/wizard/wizard-page.tsx:353-367；packages/i18n/src/locales/zh-TW/practice.json:354-355 |
| 完成新增（送出） | `getByRole('button', { name: '完成新增' })`（多段時為 `wizard_finish_personal_multi`；模版模式「完成新增模版」） | apps/product/src/components/practice/create/wizard/wizard-page.tsx:292-302、363-367；packages/i18n/src/locales/zh-TW/practice.json:439、441 |
| 關閉精靈（右上） | `getByRole('button', { name: '關閉' })` | apps/product/src/components/practice/create/wizard/wizard-page.tsx:309 → apps/product/src/components/layout/page-header.tsx:121；packages/i18n/src/locales/zh-TW/practice.json:356 |
| 完成彈窗 | `getByRole('dialog')` 內含標題「實踐建立完成」 | apps/product/src/components/practice/create/wizard/completion-dialog.tsx:40、180；packages/i18n/src/locales/zh-TW/practice.json:443 |
| 完成彈窗主按鈕 | `getByRole('button', { name: '看看我的實踐' })` | apps/product/src/components/practice/create/wizard/completion-dialog.tsx:200；packages/i18n/src/locales/zh-TW/practice.json:447 |
| 完成彈窗次按鈕 | `getByRole('button', { name: '再建立一個實踐' })` | apps/product/src/components/practice/create/wizard/completion-dialog.tsx:205；packages/i18n/src/locales/zh-TW/practice.json:452 |
| 複製成功頁標題 | `getByText('已複製到你的清單！')` | apps/product/src/app/[locale]/practices/copy-success/page.tsx:58；packages/i18n/src/locales/zh-TW/practice.json:125 |
| 複製成功頁「馬上開始」／「編輯內容」 | `getByRole('button', { name: '馬上開始' })` / `{ name: '編輯內容' }` | apps/product/src/app/[locale]/practices/copy-success/page.tsx:126-135；packages/i18n/src/locales/zh-TW/practice.json:127-128 |
| 類別按鈕的選取狀態 | 無穩定選擇器（只靠 variant 樣式），建議補 `aria-pressed` 或 data-testid | apps/product/src/app/[locale]/practices/create/page.tsx:155-157 |

## 怎樣算成功（可觀察的結果與證據）

- 按「完成新增」後出現完成彈窗，標題「實踐建立完成」（多段為 `wizard_done_title_personal_multi`），內文帶第一段開始日期（apps/product/src/components/practice/create/wizard/completion-dialog.tsx:39-52）。
- 網路：`POST` 建立實踐（單段 `createPractice`，多段 `batchCreatePractices`）回 2xx（apps/product/src/components/practice/create/wizard/wizard-page.tsx:205-209）；例外時 toast「建立失敗，請稍後再試」（apps/product/src/components/practice/create/wizard/wizard-page.tsx:228；packages/i18n/src/locales/zh-TW/practice.json:454）；API 回錯誤時標出錯欄位、toast（zh-TW 顯示第一個欄位的 server 訊息）並跳回出錯步驟（apps/product/src/components/practice/create/wizard/wizard-page.tsx:174-195）。
- 點「看看我的實踐」導到首頁 `/`（`getDonePrimaryRoute`，個人實踐回 `HOME_TAB_PATHS.inspire`，模版模式回 `/practices/create`；apps/product/src/components/practice/create/wizard/wizard-page.tsx:265、apps/product/src/components/practice/create/wizard/submit-utils.ts:154-161），新實踐出現在首頁「你的今天」。
- 個人實踐預設 `privacyStatus: "public"`（apps/product/src/components/practice/create/wizard/wizard-page.tsx:206）——可在實踐詳情頁以未登入身分打開驗證可見。
- 複製：到 `/practices/copy-success?practiceId=<新 id>`，點「馬上開始」→ `/practices/<id>?from=copy`（apps/product/src/app/[locale]/practices/copy-success/page.tsx:126）。

## 陷阱

- 本機草稿：上一輪沒送出的內容會在下一次進入時跳還原對話框，自動化前要處理（選還原或捨棄）或清 localStorage（apps/product/src/components/practice/create/wizard/wizard-page.tsx:112-145）。送出成功才 `clearDraft()`（apps/product/src/components/practice/create/wizard/wizard-page.tsx:223）。
- 建立成功不換網址，不能用 URL 斷言成功；要看完成彈窗或 API 回應。
- `/practices/create/success` 是孤兒頁，不要拿它當成功證據。
- 精靈標題在「預覽」步驟變成「預覽」（apps/product/src/components/practice/create/wizard/wizard-page.tsx:289），且預覽步驟不顯示步驟計數。
- 模板頁 templateId 不存在時顯示「載入模板時發生錯誤」（apps/product/src/app/[locale]/practices/create/template/[templateId]/page.tsx:53；packages/i18n/src/locales/zh-TW/practice.json:118）。
- locale：zh-TW 無前綴，英文為 `/en/practices/create`（packages/i18n/src/routing.ts）。
