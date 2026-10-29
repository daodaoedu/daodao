# 給未來的信（我的足跡時間軸）

使用者寫一封信給未來的自己、選送達時間（可關聯一個實踐），信在送達前封存看不到內容，送達後在「我的足跡」時間軸上打開閱讀或永久刪除。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/me/footprints（首頁摘要條在 https://app-dev.daodao.so/ ；host 依據 daodao-infra/README.md:39）
- 主要程式位置：apps/product/src/components/future-letter/、apps/product/src/components/me/footprints-page-content.tsx、apps/product/src/app/[locale]/(with-layout)/me/footprints/page.tsx、e2e 參考 apps/product/e2e/future-letter/
- 依據版本：daodao-f2e 70155dce（2026-10-29）

> 以下路徑皆相對 projects/daodao-f2e；i18n 字串依 namespace 分檔於 `packages/i18n/src/locales/zh-TW/<namespace>.json`（本功能在 `future-letter.json`）。

## 子功能

- 寫信對話框：「現在的我」「想對未來的自己說」兩欄（任一有字即可寄出）、送達時間（7 天／14 天／1 個月／自訂日期）、關聯實踐（可不選）（apps/product/src/components/future-letter/future-letter-dialog.tsx:261-430）。
- 草稿：存成草稿、關閉時自動存草稿（全空白不存）、刪除草稿；重開對話框會帶回唯一一份草稿（apps/product/src/components/future-letter/future-letter-dialog.tsx:161-254；apps/product/src/components/me/footprints-page-content.tsx:10-11）。
- 寄出：送出後狀態為 scheduled，內容封存，時間軸只顯示倒數（apps/product/src/components/future-letter/vertical-timeline.tsx:117-134）。
- 時間軸節點：`data-kind` = `scheduled` / `delivered-unopened` / `opened` / `today` 等，`data-node-id="letter-<id>"`（apps/product/src/components/future-letter/vertical-timeline.tsx:123-126、188-189、222-223、469-470）。
- 打開已送達的信：「打開這封信」→ 顯示信件內容卡（letter-detail-card）（apps/product/src/components/future-letter/future-letter-timeline.tsx:230-238；apps/product/src/components/future-letter/letter-detail-card.tsx:17）。
- 刪除：排程中「不再送達這封信？」、已送達「永久刪除這封信？」，二次確認（apps/product/src/components/future-letter/future-letter-timeline.tsx:140-168；apps/product/src/components/future-letter/vertical-timeline.tsx:140-154）。
- 深連結：`/me/footprints?futureLetterId=<id>&focusDate=YYYY-MM-DD` 直接聚焦該信（apps/product/src/components/future-letter/future-letter-timeline.tsx:46-47、116-118）。
- 首頁摘要條：登入使用者在首頁看到壓縮版時間軸，點節點或整條跳 `/me/footprints`（apps/product/src/app/[locale]/(with-layout)/page.tsx:286；apps/product/src/components/future-letter/home-timeline-summary.tsx:30-42）。

## 怎麼到這頁（使用者視角）

1. 登入後進首頁 `/`，在頂部 banner 下方看到「我的足跡」摘要條，點它 → `/me/footprints`。
2. 時間軸「未來」區塊的卡片「與自己對話！… 寫信給未來的自己」→ 開寫信對話框。
3. 填任一欄、選送達時間 →「寄出這封信」→ toast「信件已寄出！」，時間軸出現排程節點。
4. 送達後（後端 worker 投遞）時間軸出現「一封過去的信已送達」→「打開這封信」→ 看到「你的信到了 💌」內容卡。

## 測試帳號與前置條件

- 角色：一般使用者。`/me/footprints` 不在 publicPattern（apps/product/src/app/global-provider.tsx:62-82），未登入導去 `/auth/login?redirect=...`；首頁摘要條只在 `user` 存在時渲染（apps/product/src/app/[locale]/(with-layout)/page.tsx:286）。
- 信件只有本人看得到（privacy_promise，packages/i18n/src/locales/zh-TW/future-letter.json:12）；e2e 以 user B（`E2E_USER_B_*`）驗證看不到 user A 的信（apps/product/e2e/README.md、apps/product/e2e/future-letter/scheduled-secrecy.spec.ts）。
- 驗證「送達／打開」需要信已到 delivered：dev 上要等真實送達日或由後端/DB 調整，前端無法直接觸發；e2e 用測試 DB 與 Future Letter worker 處理（apps/product/e2e/README.md「Required environment」）。
- 關聯實踐需帳號已有實踐（下拉選單由我的實踐載入，apps/product/src/components/future-letter/future-letter-dialog.tsx:412-424）。
- e2e 規格明訂只能指向隔離測試環境（不會打 dev／prod DB），不能直接拿來跑 app-dev.daodao.so（apps/product/e2e/README.md 開頭）。

## 穩定的選擇器

| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| 首頁摘要條容器 | `getByTestId('home-timeline-summary')` | apps/product/src/components/future-letter/compact-timeline-strip.tsx:144（另 apps/product/src/components/future-letter/horizontal-timeline.tsx:58 summary 模式）；e2e apps/product/e2e/future-letter/timeline-summary.spec.ts:41 |
| 首頁摘要條整條（進足跡頁） | `getByRole('button', { name: '我的足跡' })`（硬編中文，非 i18n） | apps/product/src/components/future-letter/compact-timeline-strip.tsx:149-151 |
| 摘要條節點 | `getByTestId('home-timeline-summary').locator('[data-testid="timeline-node"][data-kind="<kind>"]')`；aria-label 為「今天」或日期 | apps/product/src/components/future-letter/compact-timeline-strip.tsx:81-96 |
| 足跡頁時間軸 | `getByTestId('future-letter-timeline')` | apps/product/src/components/future-letter/vertical-timeline.tsx:391；e2e apps/product/e2e/future-letter/scheduled-secrecy.spec.ts:27 |
| 時間軸節點 | `locator('[data-testid="timeline-node"][data-node-id="letter-<id>"][data-kind="scheduled\|delivered-unopened\|opened\|today"]')` | apps/product/src/components/future-letter/vertical-timeline.tsx:123-126、188-189、222-223、469-470；e2e apps/product/e2e/future-letter/lifecycle-delete.spec.ts:23-24、45 |
| 寫信入口 | `getByRole('button', { name: '寫信給未來的自己' }).first()`（按鈕可存取名稱含卡片標題與說明，故用子字串比對；草稿查詢中為 disabled） | apps/product/src/components/future-letter/vertical-timeline.tsx:408-421；`future_letter.cta_button` packages/i18n/src/locales/zh-TW/future-letter.json:6；e2e apps/product/e2e/future-letter/draft-restore.spec.ts:14、108-111 |
| 再寫一封 | `getByRole('button', { name: '再寫一封' })` | apps/product/src/components/future-letter/vertical-timeline.tsx:435-441；packages/i18n/src/locales/zh-TW/future-letter.json:115 |
| 對話框 | `getByRole('dialog', { name: '寫信給未來的自己' })` | apps/product/src/components/future-letter/future-letter-dialog.tsx:272-274；`dialog_title` packages/i18n/src/locales/zh-TW/future-letter.json:8 |
| 現在的我 | `locator('#current-self')` 或 `getByLabel(/現在的我/)` | apps/product/src/components/future-letter/future-letter-dialog.tsx:282-290；packages/i18n/src/locales/zh-TW/future-letter.json:22；e2e apps/product/e2e/future-letter/draft-restore.spec.ts:15 |
| 想對未來的自己說 | `locator('#message-to-future')` 或 `getByLabel(/想對未來的自己說/)` | apps/product/src/components/future-letter/future-letter-dialog.tsx:297、356；packages/i18n/src/locales/zh-TW/future-letter.json:24；e2e apps/product/e2e/future-letter/draft-restore.spec.ts:16 |
| 送達時間選項 | `getByRole('button', { name: '7 天' })`、`'14 天'`、`'1 個月'`、`'自訂日期'`（以 delivery_* 字串為準） | apps/product/src/components/future-letter/future-letter-dialog.tsx:261-264、382；packages/i18n/src/locales/zh-TW/future-letter.json:28-31 |
| 關聯實踐下拉 | `locator('#related-practice')`（SelectTrigger） | apps/product/src/components/future-letter/future-letter-dialog.tsx:412-418 |
| 刪除草稿 | `getByRole('button', { name: '刪除草稿' })` | apps/product/src/components/future-letter/future-letter-dialog.tsx:442；packages/i18n/src/locales/zh-TW/future-letter.json:39 |
| 存成草稿 | `getByRole('button', { name: '存成草稿' })` | apps/product/src/components/future-letter/future-letter-dialog.tsx:452-457；packages/i18n/src/locales/zh-TW/future-letter.json:34 |
| 寄出 | `getByRole('button', { name: '寄出這封信' })`（送出中文字變 `action_sending`） | apps/product/src/components/future-letter/future-letter-dialog.tsx:461-464；packages/i18n/src/locales/zh-TW/future-letter.json:35 |
| 排程信「更多操作」 | `getByRole('button', { name: '更多操作' })` →「不再送達這封信？」 | apps/product/src/components/future-letter/vertical-timeline.tsx:140-154；packages/i18n/src/locales/zh-TW/future-letter.json:116、58 |
| 選中信件的操作鈕 | `getByRole('button', { name: '信件操作' })` | apps/product/src/components/future-letter/future-letter-timeline.tsx:216；`letter_actions` packages/i18n/src/locales/zh-TW/future-letter.json:88；e2e apps/product/e2e/future-letter/lifecycle-delete.spec.ts:60 |
| 打開這封信 | `getByRole('button', { name: '打開這封信' })` | apps/product/src/components/future-letter/future-letter-timeline.tsx:235-238；packages/i18n/src/locales/zh-TW/future-letter.json:86；e2e apps/product/e2e/future-letter/lifecycle-delete.spec.ts:35 |
| 永久刪除（確認） | `getByRole('button', { name: '永久刪除' })`；取消 `getByRole('button', { name: '取消', exact: true })`（預設 focus 在取消） | apps/product/src/components/future-letter/future-letter-timeline.tsx:146-147、259-263；packages/i18n/src/locales/zh-TW/future-letter.json:62-63；e2e apps/product/e2e/future-letter/lifecycle-delete.spec.ts:61-73 |
| 信件內容卡 | `getByTestId('letter-detail-card')`（含「你的信到了 💌」與關聯實踐快照標題） | apps/product/src/components/future-letter/letter-detail-card.tsx:17、25、52；packages/i18n/src/locales/zh-TW/future-letter.json:99；e2e apps/product/e2e/future-letter/practice-snapshot.spec.ts:27 |

## 怎樣算成功（可觀察的結果與證據）

- 寄出：toast「信件已寄出！」（apps/product/src/components/future-letter/future-letter-dialog.tsx:201；packages/i18n/src/locales/zh-TW/future-letter.json:47）；時間軸出現 `[data-kind="scheduled"]` 節點、顯示剩餘天數；頁面 body 不包含剛寫的內文（e2e apps/product/e2e/future-letter/scheduled-secrecy.spec.ts:27-29），API 回應也不含內文（apps/product/e2e/future-letter/scheduled-secrecy.spec.ts:31-46）。
- 草稿：關閉對話框時有內容會 toast「草稿已替你保存」（apps/product/src/components/future-letter/future-letter-dialog.tsx:166；packages/i18n/src/locales/zh-TW/future-letter.json:52）；重開對話框兩欄帶回原值；全空白（只有空格/換行）不產生草稿（e2e apps/product/e2e/future-letter/draft-restore.spec.ts:61-94）。帳號最多一份 draft。
- 未填任何欄位不能寄出，顯示「寫下任一欄，就可以寄出。」（apps/product/src/components/future-letter/future-letter-dialog.tsx:364；packages/i18n/src/locales/zh-TW/future-letter.json:54）。
- 打開：點「打開這封信」後 `letter-detail-card` 顯示原內文，節點 data-kind 由 `delivered-unopened` 變 `opened`；openedAt 只寫一次（e2e apps/product/e2e/future-letter/lifecycle-delete.spec.ts:35-45）。
- 刪除：toast「信件已永久刪除」（apps/product/src/components/future-letter/future-letter-timeline.tsx:164；packages/i18n/src/locales/zh-TW/future-letter.json:64），URL 的 `futureLetterId` 被移除（apps/product/src/components/future-letter/future-letter-timeline.tsx:160-162），節點消失；API GET 該信回 404。
- 首頁摘要條不出現寫信 CTA（e2e apps/product/e2e/future-letter/timeline-summary.spec.ts:42）。

## 陷阱

- apps/product/e2e/README.md 明說這批 Playwright 規格是 FRD 合約測試，「對舊實作預期會失敗」；規格裡的選擇器不一定都已在程式中實作——上表已逐一對過程式碼，但行為斷言（如 openedAt 不變、取消鈕預設 focus）未經實跑確認。
- 寫信入口按鈕在草稿查詢 loading/validating 時 disabled（apps/product/src/components/me/footprints-page-content.tsx:12-17），太早點會沒反應；先等 `toBeEnabled()`。
- 「寫信給未來的自己」字串同時是按鈕子字串與對話框標題，`getByRole('button')` 要 `.first()` 或限縮在時間軸內。
- 首頁摘要條在載入中、還有下一頁或錯誤時回傳 null（apps/product/src/components/future-letter/home-timeline-summary.tsx:26-28），看不到不代表壞掉。
- 摘要條「我的足跡」與節點 aria-label（「今天」）是硬編中文，`/en` 也不會翻譯（apps/product/src/components/future-letter/compact-timeline-strip.tsx:91-93、151）。
- 送達需要後端排程 worker；在 dev 上驗收「送達／打開」得有已送達的既有信件或後端協助調整時間。
- 時間軸目前只用 VerticalTimeline（apps/product/src/components/future-letter/future-letter-timeline.tsx:181）；horizontal-timeline 只在 summary 模式出現，兩者 data-testid 不同（apps/product/src/components/future-letter/horizontal-timeline.tsx:58）。
