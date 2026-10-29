# 空間（Spaces）

使用者在「空間」列表看到自己的個人實踐、共同挑戰、活動課程空間；發起人可在活動課程空間編排空間首頁並分享公開連結給訪客。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/spaces（主機見 daodao-infra/README.md:39；API 為 https://server-dev.daodao.so）
- 主要程式位置：apps/product/src/app/[locale]/(with-layout)/spaces/、apps/product/src/app/[locale]/spaces/public/[token]/page.tsx、apps/product/src/components/spaces/、apps/product/src/lib/spaces/space-href.ts
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- 空間列表 `/spaces`：顯示「你的空間 · N 個」與空間卡片，右下 FAB 建立選單（apps/product/src/app/[locale]/(with-layout)/spaces/page.tsx）
- 個人實踐子頁 `/spaces/personal`：列出自己的實踐（apps/product/src/app/[locale]/(with-layout)/spaces/personal/page.tsx）
- 共同挑戰子頁 `/spaces/challenge`：我參加的挑戰，預設篩選「進行中」，可改全部／即將開始／已結束；有「探索共同挑戰」入口連到 `/challenges`（apps/product/src/app/[locale]/(with-layout)/spaces/challenge/page.tsx:57-136）
- 活動課程空間 `/spaces/[id]`：標頭（成員數、成員名單 dialog）、「空間首頁／實踐」分頁、發起人可建立／編輯／發佈空間首頁區塊、複製公開連結、切換訪客視角（apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx）
- 公開訪客頁 `/spaces/public/[token]`：免登入，只顯示已發佈內容（apps/product/src/app/[locale]/spaces/public/[token]/page.tsx）
- FAB 建立：個人實踐 → 導到 `/practices/create`；活動課程／共同挑戰 → 開 sheet，但送出只跳 toast「建立流程即將推出」，不會真的建立（apps/product/src/components/spaces/space-create-sheet.tsx:80-87）

## 怎麼到這頁（使用者視角）
1. 登入後點側欄（桌機在左、手機在底）「空間」（i18n `app_product.nav_spaces`「空間」，packages/i18n/src/locales/zh-TW/app-product.json:15；連結 href `/spaces`，apps/product/src/components/layout/sidebar/constant.tsx:34-35）。`/activities`、`/challenges` 也會讓「空間」tab 呈現 active（apps/product/src/components/layout/sidebar/constant.tsx:37-40）。
2. 列表點卡片（apps/product/src/components/spaces/space-card.tsx:25、29-30 → apps/product/src/lib/spaces/space-href.ts:9-19）：個人實踐卡 → `/spaces/personal`；共同挑戰卡 → `/spaces/challenge`；活動課程卡 → 能管理該場次（`canManage` 且有 `programId`）的組織成員導到 `/lighthouse/programs/<programId>/cohorts/<id>/dashboard`，其他人導到 **`/cohorts/<id>`（不是 `/spaces/<id>`）**；缺 id 時退回 `/spaces`。
3. `/spaces/[id]` 目前在程式中找不到任何站內連結，只能直接輸入網址（id 為空間 UUID / external_id，packages/api/src/types.ts:36530 附近 `/api/v1/spaces/{id}`）。
4. 公開頁：發起人在 `/spaces/[id]` 按「複製公開連結」得到 `${origin}/spaces/public/<publicToken>`（apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:154-167），訪客直接開。

## 測試帳號與前置條件
- `/spaces`、`/spaces/personal`、`/spaces/challenge`、`/spaces/[id]`：一般使用者（已登入、完成 onboarding）。未登入會被導到 `/auth/login?redirect=...`（apps/product/src/app/global-provider.tsx:61-85，`/spaces` 不在 publicPattern）；temp 使用者導到 `/auth/onboarding`（apps/product/src/app/global-provider.tsx:86-89）。
- FAB 選單中的「共同挑戰」項只對 admin 顯示（apps/product/src/components/spaces/space-fab.tsx:96-116，`isAdmin` 來自 `useAuth()`，apps/product/src/app/[locale]/(with-layout)/spaces/page.tsx:15）。
- `/spaces/[id]` 編輯能力：`viewerRole === "host"` 才是發起人（講師／團主）視角（apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:61）；一般成員只看得到已發佈的首頁（server 過濾草稿）。
- `/spaces/public/[token]`：未登入即可（apps/product/src/app/global-provider.tsx:78）。需要一個已有 `publicToken` 的空間。
- 前置資料：要看到卡片需帳號有實踐／參加挑戰／是某活動課程成員；個人實踐子頁需至少一筆實踐，否則看到空狀態。測活動課程卡導向時，注意帳號若是該場次的組織管理者會被導到燈塔而不是學員頁。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| 側欄「空間」入口 | `page.getByRole('link', { name: '空間' })` | apps/product/src/components/layout/sidebar/constant.tsx:34-35；packages/i18n/src/locales/zh-TW/app-product.json:15 `app_product.nav_spaces` |
| 空間數量文字 | `page.getByText(/你的空間 · \d+ 個/)` | apps/product/src/app/[locale]/(with-layout)/spaces/page.tsx:32；packages/i18n/src/locales/zh-TW/space.json:3 `space.space_count` |
| 載入中 spinner | `page.getByLabel('載入中…')` | apps/product/src/app/[locale]/(with-layout)/spaces/page.tsx:36；packages/i18n/src/locales/zh-TW/space.json:103 `space.loading` |
| 空間卡片（連結） | `page.getByRole('listitem').getByRole('link')`（再以卡片名稱 `{ name: /<空間名>/ }` 過濾） | apps/product/src/components/spaces/space-card.tsx:28-31 |
| 卡片「有進行中的實踐」標記 | `page.getByRole('img', { name: '有進行中的實踐' })`（只在個人實踐／共同挑戰卡） | apps/product/src/components/spaces/space-card.tsx:47-51；packages/i18n/src/locales/zh-TW/space.json:8 |
| 卡片成員數 | `page.getByRole('img', { name: /\d+ 位成員/ })`（只在活動課程卡） | apps/product/src/components/spaces/space-card.tsx:57-60；packages/i18n/src/locales/zh-TW/space.json:9 `space.members_label` |
| FAB「新增」按鈕 | `page.getByRole('button', { name: '新增' })` | apps/product/src/components/spaces/space-fab.tsx:127-128；packages/i18n/src/locales/zh-TW/space.json:10 `space.fab_add` |
| FAB 選單 | `page.getByRole('menu', { name: '建立選單' })` | apps/product/src/components/spaces/space-fab.tsx:70-71；packages/i18n/src/locales/zh-TW/space.json:11 |
| 選單項「個人實踐」 | `page.getByRole('menuitem', { name: /個人實踐/ })` | apps/product/src/components/spaces/space-fab.tsx:52、78；packages/i18n/src/locales/zh-TW/space.json:12 |
| 選單項「活動課程」 | `page.getByRole('menuitem', { name: /活動課程/ })` | apps/product/src/components/spaces/space-fab.tsx:59、78；packages/i18n/src/locales/zh-TW/space.json:14 |
| 選單項「共同挑戰」（admin） | `page.getByRole('menuitem', { name: /共同挑戰/ })` | apps/product/src/components/spaces/space-fab.tsx:101-110；packages/i18n/src/locales/zh-TW/space.json:16 |
| 建立 sheet 名稱欄 | `page.getByLabel('名稱')`（Label htmlFor="space-create-name"） | apps/product/src/components/spaces/space-create-sheet.tsx:57-61；packages/i18n/src/locales/zh-TW/space.json:23 |
| 建立 sheet 送出／取消 | `getByRole('button', { name: '建立' })`／`getByRole('button', { name: '再想想' })`（名稱空白時「建立」disabled） | apps/product/src/components/spaces/space-create-sheet.tsx:76、80、87；packages/i18n/src/locales/zh-TW/space.json:24-25 |
| 子頁返回空間列表 | `page.getByRole('link', { name: '回到空間列表' })` | apps/product/src/components/spaces/space-subpage-header.tsx:30-31、46-47；packages/i18n/src/locales/zh-TW/space.json:35 |
| 挑戰子頁「探索共同挑戰」 | `page.getByRole('link', { name: /探索共同挑戰/ })` | apps/product/src/app/[locale]/(with-layout)/spaces/challenge/page.tsx:58-67；packages/i18n/src/locales/zh-TW/space.json:29 |
| 挑戰子頁篩選下拉 | `page.getByRole('button', { name: '進行中' })`（預設值）→ `getByRole('menuitem', { name: '全部' })` 等 | apps/product/src/app/[locale]/(with-layout)/spaces/challenge/page.tsx:79-95（Radix DropdownMenu）；packages/i18n/src/locales/zh-TW/space.json:109 `space.challenge_filter_ongoing` |
| 挑戰卡「打開我的挑戰實踐」 | `page.getByRole('link', { name: '打開我的挑戰實踐' })`（指向 `/practices/<practiceId>`） | apps/product/src/app/[locale]/(with-layout)/spaces/challenge/page.tsx:136、173；packages/i18n/src/locales/zh-TW/space.json:106 |
| 活動空間成員按鈕 | `page.getByRole('button', { name: /\d+ 位成員/ })` | apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:113-115 |
| 成員 dialog | `page.getByRole('dialog', { name: '成員' })` | apps/product/src/components/spaces/space-members-dialog.tsx:33；packages/i18n/src/locales/zh-TW/space.json:36 |
| 複製公開連結 | `page.getByRole('button', { name: '複製公開連結' })` | apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:154-167；packages/i18n/src/locales/zh-TW/space.json:39 |
| 訪客視角切換 | `getByRole('button', { name: '訪客視角' })`／`{ name: '回到發起人視角' }` | apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:170-184；packages/i18n/src/locales/zh-TW/space.json:41-42 |
| 分頁「空間首頁」「實踐」 | `getByRole('button', { name: /空間首頁/ })`／`getByRole('button', { name: '實踐' })` | apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:192-224（是普通 button，不是 role=tab）；packages/i18n/src/locales/zh-TW/space.json:32-33 |
| 首頁草稿徽章 | `page.getByText('草稿')` | apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:203；packages/i18n/src/locales/zh-TW/space.json:34 |
| 引導卡「建立頁面」「先不用」 | `getByRole('button', { name: '建立頁面' })`／`{ name: '先不用' }` | apps/product/src/components/spaces/space-home-tab.tsx:230-233；packages/i18n/src/locales/zh-TW/space.json:46-47 |
| 建立方式「帶範例區塊」「空白頁」 | `getByRole('button', { name: /帶範例區塊/ })`／`{ name: /空白頁/ }` | apps/product/src/components/spaces/space-home-tab.tsx:256-275；packages/i18n/src/locales/zh-TW/space.json:50、52 |
| 發佈頁面 | `page.getByRole('button', { name: '發佈頁面' })` | apps/product/src/components/spaces/space-home-tab.tsx:99-105；packages/i18n/src/locales/zh-TW/space.json:57 |
| 新增區塊（自由文字／資源／行事曆） | `page.getByRole('button', { name: '自由文字' })` 等 | apps/product/src/components/spaces/space-home-tab.tsx:141-168；packages/i18n/src/locales/zh-TW/space.json:58-59 |
| 公開頁空間名稱 | `page.getByRole('heading', { level: 1 })` | apps/product/src/app/[locale]/spaces/public/[token]/page.tsx:39（header h1，`space.name`） |
| 公開頁錯誤／空狀態 | `page.getByText('這裡還沒有實踐')` | apps/product/src/app/[locale]/spaces/public/[token]/page.tsx:27-30（error 分支顯示 `space.empty_list`）；packages/i18n/src/locales/zh-TW/space.json:28 |
| 空間區塊內容 | 無穩定選擇器，建議補 data-testid（SpaceBlockView／SpaceBlockEditor 無 testid） | apps/product/src/components/spaces/space-block-view.tsx、apps/product/src/components/spaces/space-block-editor.tsx |

## 怎樣算成功（可觀察的結果與證據）
- 列表：`/spaces` 顯示「你的空間 · N 個」且 N 等於卡片數；`GET /api/v1/spaces` 回 200（packages/api/src/services/space-hooks.ts:7-8，`useMySpaces(enabled = true)`；首頁也以 `useMySpaces(!!user)` 呼叫同一 API）。
- FAB → 「個人實踐」：URL 變成 `/practices/create`（apps/product/src/app/[locale]/(with-layout)/spaces/page.tsx:21-25）。
- FAB → 「活動課程」→ 填名稱 → 「建立」：只出現 toast「建立流程即將推出」（packages/i18n/src/locales/zh-TW/space.json:26），列表不增加——這是目前設計，不是 bug。
- 挑戰子頁：切換篩選後列表只剩對應 `runStatus` 的挑戰，或顯示「你還沒有參加任何共同挑戰」（packages/i18n/src/locales/zh-TW/space.json:105）。
- 發起人：點「複製公開連結」出現 toast「已複製公開連結」（packages/i18n/src/locales/zh-TW/space.json:40），剪貼簿為 `/spaces/public/<token>`；以無痕（未登入）開啟該網址能看到 h1 空間名稱與「N 位成員」，且看不到草稿區塊。
- 發佈首頁：按「發佈頁面」後草稿 banner 與「草稿」徽章消失；`POST /api/v1/spaces/{id}/home-page/publish` 成功（packages/api/src/types.ts:37035）。
- 訪客視角：切換後編輯入口（新增區塊、發佈）消失，按鈕文字變「回到發起人視角」；首頁為草稿時整個「空間首頁」分頁隱藏，已發佈頁只留已發佈區塊（apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:62-71）。

## 陷阱
- 活動課程卡片的 id 是 cohortId，一般學員導到 `/cohorts/<id>`、可管理的組織成員導到燈塔場次儀表板（apps/product/src/lib/spaces/space-href.ts:3-19）；但 `/spaces/[id]` 用的是空間 UUID。兩者 id 是否相同未確認（推測不同），驗收 `/spaces/[id]` 要自己從 API 拿 id。
- `/spaces/[id]` 沒有站內入口，PM 從 UI 點不到；驗收需直接輸入網址。
- 「空間首頁」分頁只在 `homePage !== null` 時出現，否則預設落在「實踐」分頁（apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:72-74）；成員看不到草稿首頁。
- 「複製公開連結」只在非訪客視角且 `detail.publicToken` 存在時顯示（apps/product/src/app/[locale]/(with-layout)/spaces/[id]/page.tsx:154）。
- 分頁是普通 `button`，不要用 `getByRole('tab')`。
- 共同挑戰子頁預設篩選是「進行中」，不是「全部」——參加的挑戰若尚未開始會看似空白。
- 剪貼簿驗證在 Playwright 需授權 `clipboard-read`；否則只驗 toast。
- 預設 locale zh-TW 無前綴；英文版為 `/en/spaces`（packages/i18n/src/routing.ts，localePrefix `as-needed`）。
- FAB 固定在右下（手機 bottom-20、桌機 md:bottom-15，apps/product/src/components/spaces/space-fab.tsx:67），手機寬度可能與底部導覽重疊，點擊前先 scroll／確認可見。
