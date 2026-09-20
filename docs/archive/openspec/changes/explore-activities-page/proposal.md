# Proposal: 探索活動課程頁——搜尋、篩選、三態卡片與發起人快覽

> 2026-09-03 依 issue daodaoedu/daodao#152 的 FRD v0.1（Google Doc 15oN4EVTltJguAEyM7H7kKiBUIgHXRPMNO3AdWgftVNA）與 server／f2e 實地盤點產出。上游：2026-09-02 歸檔的 `challenge-activity-space-wiring`（活動 = lighthouse cohort、`cohorts.visibility`、`GET /api/v1/activities`、`/activities` 真資料）。相依：`cohort-setup-panel`（#171，Phase A 提供 `tagline`／`interaction_modes`／`location`／`fee_*`／`signup_method`）；`group-messages`（#154，一對一私訊不在其範圍）。

## Why

`/activities` 探索頁在前一輪已接上真資料，但只是一張「名稱＋系列說明＋加入按鈕」的過渡卡：沒有簡介、線上／實體、費用，篩選只有「全部／開放加入中」，看不到已結束的活動，也不知道發起人是誰。FRD #152 把這頁定位成島島面向學習者與訪客的**公開活動目錄**：關鍵字搜尋、四種狀態＋費用篩選、三態卡片（開放報名／進行中／已結束）、發起人快覽彈窗、訪客視圖與註冊轉化。

同時 `cohort-setup-panel`（#171）Phase A 正把 FRD 需要的欄位補進 `cohorts`，且 PM 已拍板「探索頁 UI 以 #152 為準」——本 change 負責接手探索頁的 UI 與列表端點的完整形狀；#171 的 `activity-discovery` delta 只保留後端資料揭露（見「相依與順序」）。

## FRD 要求 vs. 現況對照（2026-09-03 程式碼實查）

| FRD 條目 | 現況（程式碼實查） | 缺口 |
|---|---|---|
| FR-EX-01 使用者視圖：左側導覽列、返回／關閉導向「空間」、主內容 760px | ❌ `apps/product/src/app/[locale]/activities/page.tsx` 在 `(with-layout)` 之外（standalone，無 Sidebar、無 PageHeader），主內容 640px；`Sidebar` 的「空間」`isMatch` 只認 `/spaces*` | 登入者渲染 `Sidebar` + `PageHeader`；`isMatch` 納入 `/activities` |
| FR-EX-02 訪客視圖：黏性頂部導覽列（logo＋登入＋免費加入）、H1＋副標、無側欄 | ❌ 產品站沒有訪客用頂部導覽列元件；官網 `apps/website/src/components/layout/header.tsx` 是錨點導覽＋登入 dialog，不可直接重用。✅ `/activities` 已在 `global-provider.tsx` 的 `publicPattern`（訪客可看） | 新建 `explore-guest-header.tsx`（sticky + backdrop-blur） |
| FR-EX-03 搜尋列（即時、名稱／介紹／發起人／地點、清除鈕、不分大小寫） | ❌ 無搜尋 | 前端過濾（design D3） |
| FR-EX-04 狀態篩選：全部／開放報名／進行中／已結束 | 部分：只有「全部／開放加入中」；**server 列表排除已結束**（`end_date >= today`，`activity.service.ts:105`），「已結束」根本拿不到資料 | 列表契約變更：包含已結束（design D2） |
| FR-EX-05 費用篩選：免費／付費 toggle | ❌ 無 `feeType` 欄位（#171 Phase A 補） | 相依 #171；前端 toggle |
| FR-EX-06 區段標題隨篩選切換＋計數 | 部分：固定「即將開始／進行中」兩段各帶計數 | 改為單一區段＋動態標題 |
| FR-EX-07 兩欄 Grid、整卡可點導向詳情、hover 位移 | 部分：兩欄 grid ✅；整卡不可點（CTA 按鈕才可點）；**`/activities/[id]` 詳情頁不存在**（server `GET /api/v1/activities/:cohortId` 已有但無消費者） | 卡片改 `<a>`；詳情目的地見待確認 #5 |
| FR-EX-08 卡片：色帶＋「N 個主題實踐」＋進行中 badge＋名稱＋簡介 4 行＋日期區間＋地點 icon＋發起人頭像名稱＋費用 badge＋箭頭 | 部分：`activity-card.tsx` 有主題 SVG 背景（依 `id % 4` 輪替）、狀態 badge、名稱、`description`、開始日／天數進度、頭像堆疊（DefaultAvatar）＋組織名。❌ `templateCount`、`tagline`、`interactionModes`、`location`、`fee*`、發起人（頭像／名稱／可點）皆無 | server 補 `templateCount`、`host`、Phase A 欄位；卡片重寫 |
| FR-EX-09 已結束卡片：低飽和、「已結束」badge、「・N 位島民參與過」 | ❌ 列表沒有已結束資料，卡片也無此態 | 同上 |
| FR-EX-10 只列 `visibility=public` 且 `published` | ✅ `activity.service.ts` 已過濾（含組織 `status='active'`、program 未刪除） | 無 |
| FR-EX-11 發起人快覽彈窗：頭像、名稱、角色、自我介紹、統計（發起的活動／一起學過的島民／加入年份）、「看看 TA 的小島」＋「傳訊息」 | ❌ **cohort 沒有單一 host user 欄位**；`organization` 表無頭像；統計無端點。既有可用來源：`cohort_enrollments.role='owner'`（`cohort-join.service.ts:113` 已用 owner／assistant 通知）、`organization_members.role='owner'`（建組織時必建，`organization.service.ts:194`）、`contacts.photo_url`（頭像，`space.service.ts:25` 同源）、`basic_info.self_introduction`（`/users/profile` 同源）、`users.created_at`。「我的小島」= sidebar `nav_my_island` → `/users/[identifier]`（`custom_id ?? external_id`） | server 解析 host（design D4）、新增快覽端點（D5）；「傳訊息」停用（待確認 #1） |
| FR-EX-13 空狀態卡片 | 部分：有純文字空狀態（`empty`／`empty_open`） | 改為虛線卡片＋固定文案 |
| FR-EX-14 使用者視圖 CTA「開一個空間」→ 建立流程 | 部分：現有 CTA「前往你的空間」→ `/spaces`；`/spaces` 的建立 FAB 只跳 `sheet_coming_soon` toast（`space-create-sheet.tsx:82`，#173 暫緩） | 導向規則見待確認 #3 |
| FR-EX-15 訪客視圖 CTA「免費加入島島」→ 註冊 | ❌ 訪客看到的是同一顆「前往你的空間」。註冊＝登入（Google 單一流程，`login_dialog_google_button_text`「Google 帳號註冊 / 登入」） | 依登入狀態切換 CTA，導 `/auth/login?redirect=/activities` |
| FR-EX-16 視覺規範（oklch 色、Noto Sans TC、pill 樣式） | 部分：pill 樣式（`bg-logo-cyan`／`#DCEBEA`）已一致；卡片為主題 SVG 滿版背景，非「白卡＋34px 色帶」 | 卡片改白底＋色帶 |
| i18n `explore_activities` | ✅ 25 key（`page_title`、`filter_all/open`、`status_*`、`cta_*`、`empty*`、`cta_prompt/button`） | 補篩選／區段／卡片／彈窗／訪客約 30 key |

## FRD 內部矛盾與跨文件衝突（待 PM 確認）

| # | 矛盾 | 預設處理（本 change 依此起草） | 狀態 |
|---|---|---|---|
| 1 | FR-EX-11(b) 寫「帶至發起人我的小島」，TP-EX-29～34 描述的是含統計與「傳訊息」的快覽彈窗；一對一私訊在 #154 FRD 明列 out of scope | 做**彈窗**；「看看 TA 的小島」導向 `/users/[identifier]`；「傳訊息」按鈕本輪 **disabled** 並以 tooltip 標示「私訊功能即將推出」，訪客顯示「加入後可傳訊息」（同樣 disabled） | 待 PM 確認 |
| 2 | 「已結束」篩選需要已結束資料，但現有列表端點排除已結束 cohort | 列表**包含已結束**（`runStatus='ended'`）：未結束全量、已結束只回**最近 24 筆**（依 `end_date` 降冪），回應 `meta.endedTruncated` 讓前端顯示「僅顯示最近 24 筆」；「全部」預設也顯示已結束（FRD 4(d) 原文）。不做 cursor 分頁（design D2） | 待 PM 確認（24 筆是否足夠） |
| 3 | 使用者視圖 CTA「開一個空間」導向建立流程，但 #173 已暫緩一般使用者建活動，空間 FAB 只跳「即將推出」 | 燈塔會員（`useLighthouseOrganizations` 有組織）→ `/lighthouse/programs`；非會員 → `/spaces`（沿用既有 coming-soon 提示）。按鈕文案維持「開一個空間」 | 待 PM 確認 |
| 4 | 費用 badge「每次 NT$XXX」暗示按次計價；#171 只有每人一次的 `fee_amount` | 只做「NT$X,XXX」（千分位），**不做按次**；`fee_type='paid'` 但 `fee_amount=null` 顯示「付費」 | 待 PM 確認 |
| 5 | 「活動詳情內頁 → 見獨立 FRD」但該 FRD 不存在；`/activities/[id]` 也不存在 | 新增**精簡詳情頁** `/activities/[id]`（消費既有 `GET /api/v1/activities/:cohortId`：名稱、簡介、系列說明、日期、地點／時段、費用、發起人、組織簡介、CTA），標示為過渡版，詳情 FRD 到位後重做；已加入者卡片直接導 `/cohorts/[id]`。替代方案：不做詳情頁，卡片可加入時導 `/cohorts/join/[joinToken]`、已結束卡不可點 | 待 PM 確認 |
| 6 | FR-EX-01 返回／關閉導向「空間」且 sidebar 高亮「空間」，但 `/activities` 目前是 standalone 路由（不在 `(with-layout)`） | **維持 `/activities` 路徑與 standalone**（訪客視圖需要無側欄），頁面依登入狀態自行渲染 `Sidebar`＋`PageHeader`（登入）或 guest header（訪客）；`Sidebar` 的「空間」`isMatch` 納入 `/activities` | 已決定，不需 PM |
| 7 | 搜尋範圍含「發起人名稱、地點」：地點來自 #171 Phase A；搜尋走前端或 server | **前端過濾**（列表一次載入全量，資料量為「公開燈塔期」等級，數十筆），不做 server `?q=`；因此無分頁互動，見 #2 | 已決定，不需 PM |

## 已確認的產品決策

| 問題 | 決策 |
|---|---|
| 探索頁 UI 的規格來源 | **#152 為準**（PM 2026-09-03 拍板於 `cohort-setup-panel` OQ-2）；本 change 接管列表端點完整形狀，#171 的 `activity-discovery` delta 退回「後端資料揭露」 |
| 「發起人」是誰 | 個人，不是組織：依序取 cohort 的 `role='owner'` 已加入 enrollment（最早 `joined_at`）→ 組織 `organization_members.role='owner'`（最早 `created_at`）；卡片仍保留 `organizationName`（design D4） |
| 統計口徑 | 「N 個主題實踐」= 該期有效綁定的 `cohort_templates`（`unbound_at IS NULL`）數；「N 位島民」= `status='joined'` enrollment 數（含 owner／assistant，與既有 `participantCount` 同口徑）；快覽三數見 design D5 |
| 色帶 | `blue/green/yellow/pink` 由 `cohort.id % 4` 派生，前端固定色盤，不加 DB 欄位（與 `group-messages` D8 的 `colorSeed % n` 同一套做法） |
| 訪客視圖 | CSR（沿用 `"use client"` 頁＋SWR），不做 SSR／SEO；註冊＝登入（Google 單一流程） |
| 一對一私訊 | 不做；彈窗按鈕停用 |
| DB | **不開 migration**：所有欄位由 #171 Phase A（storage 087）提供，統計皆為即時聚合 |

## What Changes

- **修改** `GET /api/v1/activities`：列表**包含已結束**（最近 24 筆）、每筆新增 `tagline`、`interactionModes`、`location`、`feeType`、`feeAmount`、`signupMethod`、`templateCount`、`host { userId, name, avatar, identifier }`；回應 `meta.endedLimit`／`meta.endedTruncated`；保留 #171 的 `?mode=`；排序改為未結束 `start_date` 升冪、已結束 `end_date` 降冪接在後面
- **新增** `GET /api/v1/activities/hosts/{userId}`（optionalAuth）：發起人快覽（頭像、名稱、identifier、自我介紹、組織名、發起的活動數、一起學過的島民數、加入年份）；只對「至少是一個公開已發佈期的發起人」回 200，其餘 404
- **修改** `GET /api/v1/activities/{cohortId}` 詳情：多 `host`、`templateCount`（其餘沿用 #171 Phase A 的 `location`／`sessions`／`externalSignupUrl`）
- **修改** f2e `/activities`：使用者／訪客雙視圖、搜尋、狀態＋費用篩選、動態區段標題、三態卡片、發起人快覽彈窗、空狀態、底部 CTA；`Sidebar` 「空間」高亮納入 `/activities`
- **新增** f2e `/activities/[id]` 精簡詳情頁（待確認 #5）
- **不改** admin-ui、ai-backend、worker、storage

## Capabilities

### New Capabilities

- `explore-activities-ui`：探索活動課程頁的使用者／訪客視圖、搜尋、篩選、區段標題、三態卡片、發起人快覽彈窗、空狀態、底部 CTA、色帶分配與視覺規範

### Modified Capabilities

- `activity-discovery`：「探索活動頁公開列表端點」改為包含已結束期並定義完整回應欄位（含 host、templateCount、Phase A 欄位、meta）；「加入連結只在可加入時公開」補已結束情境；「探索活動頁使用真資料並沿用既有加入流程」的篩選改為四態＋費用、卡片導向詳情頁；新增「發起人解析規則」與「發起人快覽端點」

## Non-goals

- FRD 2.2 全部：活動詳情內頁的完整設計（本 change 只做過渡版精簡頁）、報名流程與報名表（#171 Phase C）、空間首頁、發起人「我的小島」完整頁、活動建立與編輯流程
- 一對一私訊（#154 亦不做）；「傳訊息」按鈕本輪停用
- mobile app
- SSR／SEO（sitemap、OG）——公開目錄的 SEO 另開 change
- server 端關鍵字搜尋與 cursor 分頁（資料量不需要；若公開期超過百筆再開）
- 一般使用者建活動（#173）；使用者視圖 CTA 只做導向
- `cohort.service.ts` 的 `participantCount`（只算 `role='member'`）與探索頁口徑（全部 joined）的統一——另案

## Impact

- **daodao-storage**：無（欄位全部來自 #171 的 `087_cohort_setup_fields.sql`）
- **daodao-server**：`src/validators/activity.validator.ts`（summary／detail／host schema、list query）、`src/services/activity.service.ts`（含已結束、host 解析、templateCount、host 快覽）、`src/controllers/activity.controller.ts`、`src/routes/activity.routes.ts`（新 `/hosts/:userId`，需註冊在 `/:cohortId` 之前）、新常量 `src/constants/activity.ts`（`ACTIVITY_ENDED_LIMIT`）、`tests/unit/services/activity.service.test.ts` 擴充、`openapi.json`／`generated/openapi-types.ts` 重生
- **daodao-f2e**：`packages/api/src/types.ts` 同步（生成物）；`packages/api/src/services/activity.ts`／`activity-hooks.ts`（`useActivities`、`useActivityHost`、`useActivity`）；`apps/product/src/app/[locale]/activities/page.tsx` 重寫、新 `activities/[id]/page.tsx`；`apps/product/src/components/activity/`（`activity-card.tsx` 重寫、新 `explore-guest-header.tsx`、`explore-filters.tsx`、`host-preview-dialog.tsx`、`activity-detail.tsx`）；`apps/product/src/constants/activity-color.ts`；`components/layout/sidebar/constant.tsx` 的 spaces `isMatch`；i18n `explore_activities` namespace（zh-TW／en）補約 30 key
- **daodao-admin-ui**：無
- **daodao-ai-backend**：無
- **daodao-worker**：無
- **daodao（本 repo）**：`scripts/product_status_manifest.yml` 探索活動 signals 補本 change；`docs/product` 對應狀態

## 相依與順序

```
cohort-setup-panel Phase A   storage 087 → server（cohorts 新欄位、activity summary 加 tagline/modes/fee）→ f2e 3.1
        │
        ▼
explore-activities-page      server（本 change，接手列表形狀）→ f2e（本 change）
```

- 本 change 的 server task **必須在 #171 Phase A 的 server PR 合併後**才能開工（tasks 1.1）；若 #171 Phase A 的 f2e task 3.9「探索頁補簡介／互動方式／費用」尚未做，直接由本 change 取代（#171 tasks 3.9 已註明「若 #152 先行則縮減」）。
- `activity-discovery` 主規格的「探索活動頁公開列表端點」requirement 以**本 change 的 delta 為最終版**（涵蓋 #171 delta 的欄位與 `?mode=`）；歸檔順序：#171 Phase A 先歸檔，本 change 後歸檔覆蓋同名 requirement。若本 change 先完成，歸檔時需手動把 #171 delta 中詳情的 `sessions`／`externalSignupUrl`／`publicBlocks` 敘述保留。
- 分支：`claude/explore-activities-page-<待定>`（server、f2e 各一條，同名後綴）。
