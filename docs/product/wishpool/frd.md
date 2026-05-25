# 島島許願池 FRD（技術功能規格）

版本 v1.0　｜　2026-05-25　｜　對應 PRD：[`docs/product/wishpool/prd.md`](./prd.md)（v1.3）

> 本文承接 PRD 已定案決策，補齊資料模型、API、前後台與通知的技術規格。涉及子專案：**daodao-storage**（schema/migration）、**daodao-server**（API）、**daodao-f2e/product**（公開頁與互動）、**daodao-admin-ui**（策展與報表）。慣例對齊既有程式碼：Prisma `Int` 自增主鍵 + 對外資源以 `external_id`（UUID）暴露、`/api/v1` RESTful、Zod 驗證、OpenAPI 以 `registry.registerPath` 定義、`authenticate` / `optionalAuth` middleware。

---

## 1. 資料模型（daodao-storage + Prisma）

**Purpose**　定義許願池三張表：原始許願（`wishes`）、對外路線圖項目（`roadmap_items`）、投票/支持（`roadmap_item_supports`），落實 PRD 的「兩層 + 投票」。

**Scope**
- daodao-storage：新增 numbered SQL（依既有編號接續，如 `6xx_create_table_wishes.sql` 等三檔），含 UNIQUE 與 index。
- daodao-server：`prisma/schema.prisma` 同步三個 model，`pnpm run prisma:generate`。

### FR-1.1 `wishes`（原始許願，僅後台可見）

| 欄位 | 型別 | 說明 |
| :---- | :---- | :---- |
| `id` | `Int` PK autoincrement | 內部主鍵（不對外） |
| `category` | `VarChar(20)` | `operation`/`practice`/`social`/`explore`/`challenge`/`ai`/`profile`/`other` |
| `situation` | `Text` | Step 2 情境描述 |
| `desire` | `Text` | Step 3 期待描述 |
| `submitter_user_id` | `Int` FK→users | **必填**（許願需登入）；`onDelete: Cascade` |
| `contact_email` | `VarChar(255)?` | 進度通知 email；預設取帳號 email，可覆寫 |
| `status` | `VarChar(20)` default `pending` | `pending`/`linked`/`archived` |
| `linked_roadmap_item_id` | `Int?` FK→roadmap_items | 歸入的項目（`onDelete: SetNull`） |
| `internal_module_tag` | `VarChar(50)?` | 內部模組子標籤（策展補；`other` 強制） |
| `source` | `VarChar(10)` default `web` | `web`/`app` |
| `created_at`/`updated_at` | `Timestamptz(6)` | `@default(now())` |

Index：`idx_wishes_status`、`idx_wishes_category`、`idx_wishes_submitter`、`idx_wishes_linked_item`。

### FR-1.2 `roadmap_items`（對外公開卡片）

| 欄位 | 型別 | 說明 |
| :---- | :---- | :---- |
| `id` | `Int` PK autoincrement | 內部主鍵 |
| `external_id` | `Uuid` unique `@default(dbgenerated("gen_random_uuid()"))` | **對外 API/URL 使用**，避免暴露序號 |
| `title` | `VarChar(255)` | 對外標題（痛點，一句話） |
| `description` | `Text` | 對外描述（打算怎麼做） |
| `category` | `VarChar(20)` | 同 §FR-1.1 分類 |
| `status` | `VarChar(20)` default `collected` | `collected`/`discussing`/`planned`/`in_progress`/`done`/`parked` |
| `support_count` | `Int` default `0` | 去正規化票數（= 去重支持者數） |
| `is_public` | `Boolean` default `true` | `parked`/內部項目可設 false |
| `pinned` | `Boolean` default `false` | 置頂 |
| `sort_order` | `Int` default `0` | 手動排序 |
| `shipped_at` | `Timestamptz(6)?` | status=`done` 時設定 |
| `created_at`/`updated_at` | `Timestamptz(6)` | `@default(now())` |

Index：`idx_roadmap_items_status`、`idx_roadmap_items_public_status`（`(is_public, status)`）、`idx_roadmap_items_category`。

### FR-1.3 `roadmap_item_supports`（投票/支持）

| 欄位 | 型別 | 說明 |
| :---- | :---- | :---- |
| `id` | `Int` PK autoincrement | |
| `roadmap_item_id` | `Int` FK→roadmap_items | `onDelete: Cascade` |
| `user_id` | `Int` FK→users | `onDelete: Cascade` |
| `origin` | `VarChar(20)` default `vote` | `vote`（主動投票）/`wish_link`（歸併產生） |
| `created_at` | `Timestamptz(6)` | `@default(now())` |

`@@unique([roadmap_item_id, user_id], map: "uq_roadmap_item_supports")`、index `idx_ris_item`、`idx_ris_user`。

### FR-1.4 計數一致性
- `support_count` 由 service 在新增/刪除 support 時於**同一 transaction** 內 `+1`/`-1`，避免 N+1 與漂移。
- 歸併（admin link）= 以 `origin='wish_link'` upsert 一筆 support（去重鍵已含 user）；若該許願者已投過票，UNIQUE 衝突則略過、不重複計數。

---

## 2. 後端 API（daodao-server）

**Purpose**　提供公開看板查詢、許願提交、投票、後台策展與報表。

**Scope**　新增 `src/routes/roadmap.routes.ts`、`src/routes/wish.routes.ts`、admin 端點（沿用 `admin.routes.ts` 或新增 `admin-roadmap.routes.ts`）；對應 controller/service/validator；於 `src/app.ts` 掛載。OpenAPI 以 `registry.registerPath` 定義。

### FR-2.1 公開端點（`optionalAuth`）
帶 `optionalAuth` 以便在已登入時回傳 `voted` 狀態。

| Method | Path | 說明 |
| :---- | :---- | :---- |
| GET | `/api/v1/roadmap/items` | Query：`status`（`all`/`scheduled`/`discussing`/`done`）、`category?`、`cursor?`、`limit?`（預設 20）。回傳 `is_public=true` 項目，排序 `pinned DESC, support_count DESC, updated_at DESC`。每項：`external_id, title, description, category, status, support_count, voted`（未登入 `voted=false`）。`scheduled` = `planned`+`in_progress`。 |
| GET | `/api/v1/roadmap/stats` | 回傳 `{ partners, feedback }`：`partners`=曾許願或投票的去重 user 數、`feedback`=許願總則數。**Redis 快取 1 小時**。 |

### FR-2.2 互動端點（`authenticate`）

| Method | Path | 說明 |
| :---- | :---- | :---- |
| POST | `/api/v1/wishes` | Body：`{ category, situation, desire, contact_email? }`（Zod；`situation` ≥ 10 字）。`submitter_user_id = req.user.id`。回傳 wish `id`。 |
| POST | `/api/v1/roadmap/items/:externalId/supports` | 投票（冪等 upsert，`origin='vote'`）。回傳 `{ support_count, voted: true }`。 |
| DELETE | `/api/v1/roadmap/items/:externalId/supports` | 取消投票。回傳 `{ support_count, voted: false }`。 |

- 未登入呼叫互動端點 → `401`；前端據此引導登入（見 §4.3）。

### FR-2.3 後台端點（`authenticate` + admin 權限）

| Method | Path | 說明 |
| :---- | :---- | :---- |
| GET | `/api/v1/admin/wishes` | Query：`status?`、`category?`、`q?`（全文搜尋 situation/desire）、`cursor?`。回傳許願（含 submitter、聯絡方式）。 |
| POST | `/api/v1/admin/wishes/:id/link` | Body：`{ roadmap_item_id, internal_module_tag? }`。歸入既有項目：建立 `wish_link` support、wish.status→`linked`。`category=other` 時 `internal_module_tag` 必填。 |
| POST | `/api/v1/admin/wishes/:id/promote` | Body：`{ title, description, category, status?, internal_module_tag? }`。建立新 `roadmap_items` 並 link（同上）。 |
| POST | `/api/v1/admin/wishes/:id/archive` | wish.status→`archived`（保留原文）。 |
| POST | `/api/v1/admin/roadmap/items` | 建立項目。 |
| PATCH | `/api/v1/admin/roadmap/items/:id` | 編輯 `title/description/category/status/is_public/pinned/sort_order`。`status→done` 時設 `shipped_at` 並 enqueue 通知（§5）。 |
| GET | `/api/v1/admin/roadmap/reports` | Query：`range`（預設本月）。回傳四指標（見 §FR-3.3）。 |

---

## 3. 後台策展與報表（daodao-admin-ui）

### FR-3.1 許願收件匣
- 列表：`pending` 優先，可依 `category`/`status` 篩選、關鍵字搜尋；顯示分類、情境、期待、來源、聯絡方式、時間。
- 動作：**歸入現有項目**（選 item）、**建立新項目**（填對外標題/描述/分類/初始狀態）、**封存**。
- `category=other` 的許願在歸入/建立時**強制**填 `internal_module_tag`。

### FR-3.2 路線圖項目管理
- 建立/編輯卡片；設狀態（狀態機見 §FR-6）；`is_public`、`pinned`、`sort_order`。
- 標「已完成」→ 寫 `shipped_at` + 觸發進度通知。
- 檢視項目已歸入的許願清單與票數來源（`vote` vs `wish_link`）。

### FR-3.3 趨勢報表 Dashboard（預設本月、可切時間範圍）
| 指標 | 內容 |
| :---- | :---- |
| 熱門分類 | 期間內各分類許願量排行 |
| 熱門項目 | 依 `support_count` 排行，可篩 `status` |
| 許願量趨勢 | 週/月折線，可依分類拆 |
| 待處理積壓 | `pending` 數、最舊一筆等待時間 |

---

## 4. 前端：公開頁與互動（daodao-f2e / product app）

**Purpose**　在 product app 開公開免登入唯讀路由，承載看板、許願 wizard、投票與訪客引導。

**Scope**　路由 `app/[locale]/roadmap/page.tsx`（**不套全站登入 guard**，加白名單）；API hooks 置 `packages/api/src/services/`；UI 用 `@daodao/ui`。

### FR-4.1 路由與 SEO
- 公開、可 SSR/SSG；`generateMetadata` 輸出標題「島島 Roadmap｜我們正在做、正在想的事」、描述、固定 OG image（logo +「島島正在進化」）。
- 首屏以 server 取 `GET /roadmap/items` + `/roadmap/stats`，利於 SEO 與分享預覽。

### FR-4.2 元件
| 元件 | 說明 |
| :---- | :---- |
| `RoadmapHero` | 標語 + 動態統計（`partners`/`feedback`，「N+」） |
| `RoadmapTabs` | 全部／排程中／討論中／已完成；對應 `status` query |
| `RoadmapItemCard` | 標題、描述、分類標籤、❤️ 票數 + 投票按鈕（樂觀更新） |
| `WishCTA` | 底部「點我許願」 |
| `WishWizardModal` | 三步驟 + 確認（含聯絡 email 選填）+ 完成頁 |
| `GuestGuidedState` | 未登入區塊的引導內容（§4.4） |

API hooks：`useRoadmapItems`（cursor 分頁）、`useRoadmapStats`、`useCreateWish`、`useToggleSupport`（樂觀更新 + 失敗 rollback）。

### FR-4.3 互動登入引導（核心）
- **投票**：就地呼叫 API；若 `401`/未登入 → 觸發登入並帶 `returnTo`，附 `intent=vote:<externalId>`；登入返回後**自動補完該票**。
- **許願**：點「點我許願」未登入 → 登入後返回 `/roadmap?openWish=1`，自動開啟 wizard。
- **草稿保存**：wizard 內容即時寫 `localStorage`（key 含使用者匿名識別 + 24h 過期）；登入返回後回填、送出成功即清除。

### FR-4.4 訪客體驗（不空白）
- 看板本體未登入即顯示完整內容。
- 需登入才有資料的區塊（如「我的許願」「我支持的」）未登入時 SHALL 顯示 `GuestGuidedState`：價值說明 + 範例示意 + 註冊 CTA，**不得空白或僅「請登入」**。

---

## 5. 通知（沿用既有 notification system + Email Worker）

| 事件 | 觸發 | 對象 | 管道 |
| :---- | :---- | :---- | :---- |
| `wish.linked` | 許願被歸入/促成項目 | 許願者 | 站內 + Email |
| `roadmap.shipped` | 項目 `status→done` | 該項目所有支持者 | 站內 + Email |
| `roadmap.status_changed`（選用） | 進入 `planned`/`in_progress` | 支持者 | 站內 |

- Email 取 `contact_email`，無則取帳號 email。
- **聚合**：同一項目短時間多次狀態變動只發一次，避免轟炸。

---

## 6. 狀態機（後端強制）

```
Wish:    pending ──link/promote──► linked
              └────archive────────► archived

Item:    collected → discussing → planned → in_progress → done(set shipped_at)
              └──────────────────────────────► parked（預設 is_public=false）
```
- 允許回退（如 `planned→discussing`），由後台操作；任何變更更新 `updated_at`。
- `status→done` 為唯一會寫 `shipped_at` 並觸發 `roadmap.shipped` 的轉移。

---

## Test Points

**資料模型**
- [ ] `roadmap_item_supports` UNIQUE(item,user) 阻擋重複投票；同一人重複投回傳冪等結果。
- [ ] 投票/取消後 `support_count` 於 transaction 內正確 ±1。
- [ ] 歸併已投票的許願者不重複計數（UNIQUE 衝突略過）。
- [ ] `roadmap_items.external_id` 為 UUID，API/URL 不暴露序號 `id`。

**公開 API**
- [ ] 未登入可成功 `GET /roadmap/items`、`/roadmap/stats`；登入時 `voted` 正確。
- [ ] `status=scheduled` 同時涵蓋 `planned` 與 `in_progress`；`is_public=false` 不出現。
- [ ] 排序符合 `pinned DESC, support_count DESC, updated_at DESC`。
- [ ] `/roadmap/stats` 命中 Redis 快取（1 小時），未即時變動。

**互動 API**
- [ ] 未登入呼叫 `POST /wishes`、投票端點回 `401`。
- [ ] `POST /wishes` 寫入 `submitter_user_id`；`situation < 10 字` 回 `400`。
- [ ] 投票 → 取消 → 再投，`support_count` 與 `voted` 一致。

**後台**
- [ ] link/promote 後 wish.status→`linked` 且建立 `wish_link` support。
- [ ] `category=other` 未填 `internal_module_tag` 時擋下。
- [ ] `status→done` 寫 `shipped_at` 並對所有支持者發一次 `roadmap.shipped`。
- [ ] 報表四指標數值與資料一致。

**前端**
- [ ] `/roadmap` 未登入可瀏覽；`generateMetadata` 輸出正確標題/描述/OG。
- [ ] 未登入按投票 → 登入後自動補完該票（intent 還原）。
- [ ] 未登入填一半 wizard → 登入返回回填草稿；送出成功清除；超過 24h 草稿失效。
- [ ] 需登入區塊未登入顯示引導內容，非空白。
