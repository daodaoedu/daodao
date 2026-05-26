## Context

島島現有基礎設施：
- **資料層**：PostgreSQL（daodao-storage numbered SQL，如 `530_create_table_reactions.sql`）+ Prisma（daodao-server `prisma/schema.prisma`）。對外資源慣例以 `external_id UUID`（`@default(dbgenerated("gen_random_uuid()"))`）暴露，內部 PK 為 `Int` 自增（參考 `marathon`、`practices`）。`users` 表有 `external_id UUID`。
- **API 層**：Express 4 + TypeScript，`/api/v1` RESTful；route 檔以 `registry.registerPath()` 定義 OpenAPI；Zod 驗證放 `src/validators/`；middleware 有 `authenticate`（必登入）與 `optionalAuth`（可選登入，登入時帶入 `req.user`）。
- **通知**：`practice-email.worker.ts`（BullMQ）已存在，可擴充事件類型。
- **前端**：`daodao-f2e` Turborepo，product app 在 `apps/product/`，用 `@daodao/api`（openapi-fetch）、`@daodao/ui`、`@daodao/shared`。website 為官網（公開）。Cookie 設於父網域（`COOKIE_DOMAIN`，如 `.daodao.so`），website 與 product **共用登入態**。

本設計以最小侵入在既有架構上實作四個 capability，產品決策依 PRD v1.3。

---

## Goals / Non-Goals

**Goals:**
- 兩層資料模型（`wishes` 原始池 ↔ `roadmap_items` 對外卡片）+ `roadmap_item_supports` 投票，DB 層保證去重與計數一致。
- product app 公開免登入唯讀路由 `/roadmap`，SSR 出 SEO meta；互動需登入並於登入後返回完成。
- 後台策展（歸併/促成/封存 + 模組子標籤）、狀態機、進度通知與趨勢報表。

**Non-Goals:**
- 原始許願公開牆、使用者留言串、匿名互動、對外專案管理視圖、後端跨裝置草稿（見 proposal Non-goals）。

---

## Decisions

### 1. 兩層模型 + 「歸併即投票」統一計數
`wishes`（內部 `Int` id，僅後台可見）與 `roadmap_items`（對外 `external_id UUID`）分離。投票與許願歸併共用 `roadmap_item_supports` 一張表，以 `origin`（`vote`/`wish_link`）區分來源；`@@unique([roadmap_item_id, user_id])` 保證一人一票。
**理由：** 讓「主動投票者」與「許願者」統一去重計數，`support_count` 即「想要這件事的去重人數」，避免重複灌票。歸併已投票者時 UNIQUE 衝突自然略過。
**替代方案：** 在 wishes 上做票數欄位。**拒絕**——許願與投票語義不同、無法跨許願去重。

### 2. 對外以 `external_id UUID`，不暴露序號
`roadmap_items` API/URL 一律用 `external_id`；`wishes` 為內部資源，admin API 用 `Int` id 即可。
**理由：** 公開路由可被未登入者與爬蟲看到，序號 id 會洩漏總量與可被枚舉。對齊 `marathon`/`practices` 既有慣例。

### 3. 公開查詢用 `optionalAuth`，互動用 `authenticate`
`GET /roadmap/items`、`/roadmap/stats` 走 `optionalAuth`（未登入可讀，登入時回 `voted`）；`POST /wishes`、投票端點走 `authenticate`，未登入回 `401`。
**理由：** 一條查詢同時服務訪客與登入者，避免兩套端點；前端據 `401` 觸發登入引導。

### 4. `support_count` 去正規化 + transaction 維護
投票/取消與歸併在**同一 transaction** 內 `±1`，看板查詢直接讀欄位。
**理由：** 看板是高頻公開查詢，避免每次 `COUNT(*)` 與 N+1。
**替代方案：** 即時 `COUNT`。**拒絕**——公開頁流量高、成本不划算。

### 5. product app 開「公開白名單路由」承載全部互動，website 僅選用連結
整個許願池放 product app；`/roadmap` 於全站登入 guard 設公開白名單。website 日後放入口連結導向 `app.../roadmap`，不搬功能。
**理由：** 互動（wizard、投票）重用 product 既有 auth + `@daodao/api` + UI，避免在官網重造；共用父網域 cookie 使「登入後返回」順暢。

### 6. 登入引導以 `returnTo` + `intent` 還原動作；草稿用 localStorage
未登入投票 → 登入帶 `intent=vote:<externalId>`，返回自動補票；未登入許願 → 返回 `/roadmap?openWish=1` 開 wizard。wizard 內容寫 localStorage（24h 過期），返回回填、送出即清。
**理由：** 滿足「互動才登入、登入後返回完成、不走死路、不空白、不丟內容」。

### 7. 通知沿用既有 BullMQ Worker
新增事件 `wish.linked`（通知許願者）、`roadmap.shipped`（通知支持者）；Email 取 `contact_email`，無則帳號 email；同項目短時間多次變動聚合為一次。

### 8. 訪客體驗「有引導、不空白」
看板未登入即顯示完整內容；需登入才有資料的區塊（我的許願/我支持的）未登入顯示引導內容（價值說明 + 範例 + 註冊 CTA）。

---

## Risks / Trade-offs

- **登入牆降低互動量**：以「未登入可完整瀏覽 + 登入後返回完成 + 草稿不丟」降低流失；登入牆同時是註冊 CTA。
- **`support_count` 漂移**：以 transaction + UNIQUE 防護；必要時提供重算 script 校正。
- **公開路由濫用/灌票**：投票需登入去重；許願經人工策展才公開，原文不外洩。
- **跨 app 體驗割裂**：靠父網域共用 cookie，投票就地、許願導 product wizard；website 僅連結不重造。

## Migration Plan

1. daodao-storage 新增三張表 numbered SQL（接續既有編號），含 UNIQUE 與 index。
2. daodao-server 同步 Prisma model → `pnpm run prisma:generate` → typecheck。
3. 後端 service/controller/route/validator + OpenAPI；`src/app.ts` 掛載。
4. 前端 `/roadmap` 公開路由白名單 + 元件 + API hooks；admin-ui 收件匣/管理/報表。
5. 通知事件接上 Worker。無資料遷移風險（全新表）。

## Open Questions

- 八類分類最終文案與「其他」歸類流程、報表指標清單、OG image、草稿機制——皆已於 PRD v1.3 定案，實作時細化即可。
- admin 權限：沿用既有 admin middleware/角色，實作時確認端點掛載點（`admin.routes.ts` 或新增 `admin-roadmap.routes.ts`）。
