# 給未來的信（我的足跡時間軸）

使用者寫一封信給未來的自己、選送達時間（可關聯一個實踐），信在送達前封存看不到內容，送達後在「我的足跡」時間軸上點信件卡片，以閱讀彈窗查看；已讀卡片與閱讀彈窗沒有刪除入口。草稿與未送達的排程信仍可刪除。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/me/footprints（首頁摘要條在 https://app-dev.daodao.so/ ；host 依據 daodao-infra/README.md:39）
- 主要程式位置：apps/product/src/components/future-letter/、apps/product/src/components/me/footprints-page-content.tsx、apps/product/src/app/[locale]/(with-layout)/me/footprints/page.tsx、e2e 參考 apps/product/e2e/future-letter/
- 依據版本：daodao-f2e dev `0ce57b81dce39fe29f1930ff01afb96b66252c43`（2026-11-04）；本次實作 `cc2dc1445ea45db02040067b7194d0e62557b354`，tree `53705f677e330204804dd7fe27e7ae68cab9dd66`。
- 部署／驗收：**已部署 dev，PM 驗收未完成**。[f2e#1156](https://github.com/daodaoedu/daodao-f2e/pull/1156) 已合併；[CD product 部署紀錄](https://github.com/daodaoedu/daodao-f2e/actions/runs/41663870467/job/126016337270) 對應此 dev revision。dev 冒煙與同一 PM 帳號的三步交接前置檢查已通過，fixture 已還原並保留；[部署後驗證報告](https://docs.google.com/document/d/12HY8_MFSsjCX_sMgmbCnP_pQHTQFRxO983F-XCmichk/edit) 記錄實際結果，尚未正式 PM 驗收。

> 以下路徑皆相對 projects/daodao-f2e；i18n 字串依 namespace 分檔於 `packages/i18n/src/locales/zh-TW/<namespace>.json`（本功能在 `future-letter.json`）。

## 子功能

- 寫信對話框：「現在的我」「想對未來的自己說」兩欄（任一有字即可寄出）、送達時間（7 天／14 天／1 個月／自訂日期）、關聯實踐（可不選）（apps/product/src/components/future-letter/future-letter-dialog.tsx:261-430）。
- 草稿：存成草稿、關閉時自動存草稿（全空白不存）、刪除草稿；重開對話框會帶回唯一一份草稿（apps/product/src/components/future-letter/future-letter-dialog.tsx:161-254；apps/product/src/components/me/footprints-page-content.tsx:10-11）。
- 寄出：送出後狀態為 scheduled，內容封存，時間軸只顯示倒數（apps/product/src/components/future-letter/vertical-timeline.tsx:117-134）。
- 時間軸節點：`data-kind` = `scheduled` / `delivered-unopened` / `opened` / `today` 等，`data-node-id="letter-<id>"`（apps/product/src/components/future-letter/vertical-timeline.tsx:123-126、188-189、222-223、469-470）。
- 閱讀已送達／已讀信件：點卡片即開閱讀彈窗；未讀的 delivered 信件自動呼叫既有 open API，成功後顯示內容與寄出／送達日期，已讀信件直接閱讀。開啟失敗保留彈窗及「打開這封信」重試按鈕（apps/product/src/components/future-letter/future-letter-timeline.tsx:125-163、259-328；apps/product/src/components/future-letter/letter-detail-card.tsx:16-57）。
- 閱讀操作：長文在彈窗內捲動；初始焦點放可捲動內容，PageDown 可捲，Tab 到「關閉信件」後 Enter 或直接 Esc 關閉。關閉後回到原開啟元素；深連結沒有開啟元素、或原元素已移除時，回到時間軸區塊（apps/product/src/components/future-letter/future-letter-timeline.tsx:265-288、308-312；apps/product/src/components/future-letter/letter-detail-card.tsx:25-32）。
- 狀態標籤：英文寄出標籤 `Sent`、已讀 `Read`；繁中已讀「已讀取」。未讀 delivered 卡片另外使用 `Delivered`／「已送達」，不是把 delivered 狀態改成 Sent（apps/product/src/components/future-letter/vertical-timeline.tsx:117-134、188-205；packages/i18n/src/locales/en/future-letter.json:70-71、105、114；packages/i18n/src/locales/zh-TW/future-letter.json:70-71、105、114）。
- 刪除：未送達 scheduled 卡片保留「更多操作」與封存詳情「信件操作」入口，經「不再送達這封信？」二次確認後才永久刪除；取消不刪。已讀卡片及閱讀彈窗沒有刪除入口（apps/product/src/components/future-letter/future-letter-timeline.tsx:178-203、232-257；apps/product/src/components/future-letter/vertical-timeline.tsx:140-154）。
- 深連結：`/me/footprints?futureLetterId=<id>&focusDate=YYYY-MM-DD` 選中該信；delivered／已讀開閱讀彈窗，scheduled 顯示封存詳情。關閉閱讀彈窗會移除 futureLetterId，保留其他 query（apps/product/src/components/future-letter/future-letter-timeline.tsx:46-47、72-75、117-123、165-174）。
- 首頁摘要條：登入使用者在首頁看到壓縮版時間軸，點節點或整條跳 `/me/footprints`（apps/product/src/app/[locale]/(with-layout)/page.tsx:286；apps/product/src/components/future-letter/home-timeline-summary.tsx:30-42）。

## 怎麼到這頁（使用者視角）

1. 登入後進首頁 `/`，在頂部 banner 下方看到「我的足跡」摘要條，點它 → `/me/footprints`。
2. 時間軸「未來」區塊的卡片「與自己對話！… 寫信給未來的自己」→ 開寫信對話框。
3. 填任一欄、選送達時間 →「寄出這封信」→ toast「信件已寄出！」，時間軸出現排程節點。
4. 送達後（後端 worker 投遞）點「已送達」信件卡片 → 閱讀彈窗自動開信並顯示完整內容與日期；「已讀取」卡片開同款彈窗，不再手動按一次開信。失敗時可按「打開這封信」重試。

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
| 時間軸節點 | `locator('[data-testid="timeline-node"][data-node-id="letter-<id>"][data-kind="<kind>"]')`（kind 擇一：scheduled／delivered-unopened／opened；today 不屬信件） | apps/product/src/components/future-letter/vertical-timeline.tsx:123-126、188-189、222-223、469-470；e2e apps/product/e2e/future-letter/lifecycle-delete.spec.ts:23-24、45 |
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
| 選中排程信的操作鈕 | `getByRole('button', { name: '信件操作' })` | apps/product/src/components/future-letter/future-letter-timeline.tsx:250；`letter_actions` packages/i18n/src/locales/zh-TW/future-letter.json:88；e2e apps/product/e2e/future-letter/lifecycle-delete.spec.ts:60 |
| 已送達／已讀閱讀彈窗 | `getByRole('dialog', { name: '你的信到了 💌' })` | apps/product/src/components/future-letter/future-letter-timeline.tsx:259-297；`detail_title` packages/i18n/src/locales/zh-TW/future-letter.json:99（標題為 sr-only，可存取名稱仍存在） |
| 關閉閱讀彈窗 | 彈窗內 `getByRole('button', { name: '關閉信件', exact: true })`；英文 `Close letter` | apps/product/src/components/future-letter/letter-detail-card.tsx:25-32；未讀 fallback apps/product/src/components/future-letter/future-letter-timeline.tsx:298-306；locale `detail_close` |
| 開信失敗後重試 | 彈窗內 `getByRole('button', { name: '打開這封信' })`；英文 `Open this letter` | apps/product/src/components/future-letter/future-letter-timeline.tsx:319-325；自動開信進行中 disabled，成功後此鈕消失；不是正常閱讀流程必按的一步 |
| 永久刪除（確認） | `getByRole('button', { name: '永久刪除' })`；取消 `getByRole('button', { name: '取消', exact: true })`（預設 focus 在取消） | apps/product/src/components/future-letter/future-letter-timeline.tsx:184-185；packages/i18n/src/locales/zh-TW/future-letter.json:62-63；e2e apps/product/e2e/future-letter/lifecycle-delete.spec.ts:72-89 |
| 信件內容卡 | 彈窗內 `getByTestId('letter-detail-card')`（已讀標籤、日期、當時的我／信件本文及選填關聯主題實踐） | apps/product/src/components/future-letter/letter-detail-card.tsx:16-57；e2e apps/product/e2e/future-letter/lifecycle-delete.spec.ts:37、50 |

## 怎樣算成功（可觀察的結果與證據）

- 寄出：toast「信件已寄出！」（apps/product/src/components/future-letter/future-letter-dialog.tsx:201；packages/i18n/src/locales/zh-TW/future-letter.json:47）；時間軸出現 `[data-kind="scheduled"]` 節點、顯示剩餘天數；頁面 body 不包含剛寫的內文（e2e apps/product/e2e/future-letter/scheduled-secrecy.spec.ts:27-29），API 回應也不含內文（apps/product/e2e/future-letter/scheduled-secrecy.spec.ts:31-46）。
- 草稿：關閉對話框時有內容會 toast「草稿已替你保存」（apps/product/src/components/future-letter/future-letter-dialog.tsx:166；packages/i18n/src/locales/zh-TW/future-letter.json:52）；重開對話框兩欄帶回原值；全空白（只有空格/換行）不產生草稿（e2e apps/product/e2e/future-letter/draft-restore.spec.ts:61-94）。帳號最多一份 draft。
- 未填任何欄位不能寄出，顯示「寫下任一欄，就可以寄出。」（apps/product/src/components/future-letter/future-letter-dialog.tsx:364；packages/i18n/src/locales/zh-TW/future-letter.json:54）。
- 閱讀：點 delivered 卡片後彈窗自動開信，`letter-detail-card` 顯示原內文與日期，節點 data-kind 由 `delivered-unopened` 變 `opened`；openedAt 只寫一次。已讀重開、重新載入後仍可閱讀，且卡片及彈窗都沒有刪除鈕（e2e apps/product/e2e/future-letter/lifecycle-delete.spec.ts:28-58）。
- 鍵盤：Enter 開卡片後，Esc 或 Tab 到「關閉信件」再 Enter 均關閉彈窗並把焦點還給原卡片；長文內容可用 PageDown 捲動。已讀關閉鈕隨內文 header 捲動，讀到最底不保證仍在可視區，可 Tab 回關閉鈕或 Esc 關閉（apps/product/src/components/future-letter/future-letter-timeline.tsx:265-312；apps/product/src/components/future-letter/letter-detail-card.tsx:17-32；apps/product/e2e/future-letter/lifecycle-delete.spec.ts:34-55）。
- 刪除未送達信件：toast「信件已永久刪除」（apps/product/src/components/future-letter/future-letter-timeline.tsx:196；packages/i18n/src/locales/zh-TW/future-letter.json:64），URL 的 `futureLetterId` 被移除（apps/product/src/components/future-letter/future-letter-timeline.tsx:187-193），節點消失；API GET 該信回 404。
- 首頁摘要條不出現寫信 CTA（e2e apps/product/e2e/future-letter/timeline-summary.spec.ts:42）。

## 陷阱

- Playwright lifecycle 合約測試會自建資料、推進送達與檢查 Redis job；只在隔離測試環境執行，不能直接拿來對 dev／prod 操作。隔離測試通過、部署成功、dev 冒煙與 PM 驗收是不同證據，不互相替代。
- 不要在點 delivered 卡片後才等待手動開信按鈕：自動 open request 已可能送出；自動化需先設 response waiter 再點卡片，成功後直接檢查彈窗內容。重試按鈕只在尚未讀取成功時存在。
- 寫信入口按鈕在草稿查詢 loading/validating 時 disabled（apps/product/src/components/me/footprints-page-content.tsx:12-17），太早點會沒反應；先等 `toBeEnabled()`。
- 「寫信給未來的自己」字串同時是按鈕子字串與對話框標題，`getByRole('button')` 要 `.first()` 或限縮在時間軸內。
- 首頁摘要條在載入中、還有下一頁或錯誤時回傳 null（apps/product/src/components/future-letter/home-timeline-summary.tsx:26-28），看不到不代表壞掉。
- 摘要條「我的足跡」與節點 aria-label（「今天」）是硬編中文，`/en` 也不會翻譯（apps/product/src/components/future-letter/compact-timeline-strip.tsx:91-93、151）。
- 送達需要後端排程 worker；在 dev 上驗收「送達／打開」得有已送達的既有信件或後端協助調整時間。
- 時間軸目前只用 VerticalTimeline（apps/product/src/components/future-letter/future-letter-timeline.tsx:212）；horizontal-timeline 只在 summary 模式出現，兩者 data-testid 不同（apps/product/src/components/future-letter/horizontal-timeline.tsx:58）。

## 可重跑本機驗證

共用入口：**verify-product**（`skills\verify-product\SKILL.md`，未隨本包出貨）。完成runtime init/launch/doctor後執行 `node "$SKILL_DIR/scripts/drive.cjs" run future-letter`，以兩個普通User fixture從實際足跡表單寄出，再經原delayed job、真SMTP Mailpit、實收HTML href到本人開信及非owner拒絕。另涵蓋首頁摘要入口與登出保留redirect。

先保存原日期／job，再明示加速serverDate與同步browserDate；不改DB/job或直接呼叫deliver。dev-login session不等同OAuth，Mailpit收件不等同外部inbox，沒有等待七天wallclock。其他子功能（草稿／刪除／實踐snapshot等）仍按本feature-map各自recipe／既有e2e實測，這條driver不代替整份feature所有狀態。

維護開信流程：development `0ce57b81`（`cc2dc144` / f2e#1156）會在通知深連結選中已送達信件後自動送出 open 並顯示「你的信到了 💌」dialog；`1f1cc054` 使用舊的「打開這封信」按鈕。Driver 必須在點實收 href **之前**訂閱首次 POST open 回應；兩種流程都要先讀回 opened_at=null，再驗 POST200、原兩欄可見及 opened_at 持久化。已讀重開只GET，不可替代首次開信證據；不要因新UI沒有舊按鈕便判產品失敗。
