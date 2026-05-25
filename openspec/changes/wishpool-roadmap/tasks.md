## 1. 資料庫 Schema（daodao-storage）

- [ ] 1.1 新增 `wishes` 表 numbered SQL（接續既有編號）：欄位見 FRD §FR-1.1；`submitter_user_id` FK→users `ON DELETE CASCADE`、`linked_roadmap_item_id` FK→roadmap_items `ON DELETE SET NULL`；index：status/category/submitter/linked。驗收：migration 可正反向執行。
- [ ] 1.2 新增 `roadmap_items` 表 SQL：含 `external_id UUID DEFAULT gen_random_uuid() UNIQUE`、`status`/`is_public`/`support_count`/`pinned`/`sort_order`/`shipped_at`；index：status、(is_public,status)、category。驗收：`external_id` 唯一且自動產生。
- [ ] 1.3 新增 `roadmap_item_supports` 表 SQL：`UNIQUE(roadmap_item_id, user_id)`（map `uq_roadmap_item_supports`）、`origin`、FK 皆 `ON DELETE CASCADE`；index：item、user。驗收：重複 insert 觸發 UNIQUE 衝突。

## 2. Prisma 同步（daodao-server）

- [ ] 2.1 在 `prisma/schema.prisma` 新增 `wishes`、`roadmap_items`、`roadmap_item_supports` 三個 model（對應 1.1–1.3，含 `@@unique`/`@@index`/relation）。
- [ ] 2.2 執行 `pnpm run prisma:generate`，`pnpm run typecheck` 無新錯誤。驗收：型別可編譯。

## 3. 後端型別與 service（daodao-server）

- [ ] 3.1 新增 `src/types/wishpool.types.ts`：分類 enum const、`WishStatus`、`RoadmapStatus`、`SupportOrigin`、API 回應型別。
- [ ] 3.2 新增 `src/services/roadmap.service.ts`：`listPublicItems`（狀態分頁、排序、`voted`）、`getStats`（Redis 1h 快取）、`toggleSupport`（transaction `±support_count`，UNIQUE upsert/delete）。附單元測試。
- [ ] 3.3 新增 `src/services/wish.service.ts`：`createWish`（綁 `submitter_user_id`，預設 `contact_email` 取帳號）、`listWishes`（後台篩選/搜尋）、`linkToItem`/`promoteToItem`/`archive`（含 `other` 強制 `internal_module_tag`、`wish_link` support upsert）。附單元測試。
- [ ] 3.4 新增 `src/services/roadmap-report.service.ts`：四指標彙整（熱門分類、熱門項目、許願量趨勢、待處理積壓）。附單元測試。

## 4. 公開與互動 API（daodao-server）

- [ ] 4.1 新增 `src/validators/roadmap.validators.ts` 與 `wish.validators.ts`（Zod：分類 enum、`situation` ≥ 10 字、狀態 query 等）。附驗證測試。
- [ ] 4.2 新增 `src/controllers/roadmap.controller.ts`、`wish.controller.ts`。
- [ ] 4.3 新增 `src/routes/roadmap.routes.ts`：`GET /api/v1/roadmap/items`、`GET /api/v1/roadmap/stats`（`optionalAuth`）、`POST/DELETE /api/v1/roadmap/items/:externalId/supports`（`authenticate`）；含 `registry.registerPath` OpenAPI。
- [ ] 4.4 新增 `src/routes/wish.routes.ts`：`POST /api/v1/wishes`（`authenticate`）；含 OpenAPI。
- [ ] 4.5 在 `src/app.ts` 掛載 roadmap/wish routes。驗收：Swagger UI 顯示新端點；未登入互動端點回 401。

## 5. 後台策展與報表 API（daodao-server）

- [ ] 5.1 新增 admin 端點（`admin.routes.ts` 或新增 `admin-roadmap.routes.ts`，掛 admin 權限）：`GET /admin/wishes`、`POST /admin/wishes/:id/link|promote|archive`、`POST/PATCH /admin/roadmap/items`、`GET /admin/roadmap/reports`；含 OpenAPI。
- [ ] 5.2 `PATCH .../items/:id` 於 `status→done` 設 `shipped_at` 並 enqueue `roadmap.shipped`。驗收：狀態機合法轉移、done 觸發通知一次。

## 6. 通知（daodao-server）

- [ ] 6.1 擴充通知 Worker 事件：`wish.linked`（通知許願者）、`roadmap.shipped`（通知所有支持者）；Email 取 `contact_email` 或帳號 email；同項目短時間聚合。附測試。

## 7. 前端：公開看板（daodao-f2e / product app）

- [ ] 7.1 在 `packages/api/src/services/` 新增 `roadmap.ts`（`useRoadmapItems` cursor 分頁、`useRoadmapStats`）與 `wish.ts`（`useCreateWish`）、`useToggleSupport`（樂觀更新 + rollback）。
- [ ] 7.2 新增公開路由 `apps/product/src/app/[locale]/roadmap/page.tsx`：**設為全站登入 guard 白名單**；server 取看板 + stats；`generateMetadata` 輸出標題/描述/OG image。驗收：未登入可瀏覽、分享預覽正確。
- [ ] 7.3 元件：`RoadmapHero`（統計）、`RoadmapTabs`（全部/排程中/討論中/已完成）、`RoadmapItemCard`（票數 + 投票按鈕）、`WishCTA`。
- [ ] 7.4 `GuestGuidedState`：需登入區塊未登入時顯示價值說明 + 範例 + 註冊 CTA（不空白）。

## 8. 前端：許願 wizard 與登入引導（daodao-f2e / product app）

- [ ] 8.1 `WishWizardModal`：三步驟（分類/情境/期待）+ 確認（聯絡 email 選填）+ 完成頁；必填驗證、進度條。
- [ ] 8.2 localStorage 草稿：即時保存（24h 過期）、登入返回回填、送出成功清除。驗收：填一半登入後回填；逾期失效。
- [ ] 8.3 登入引導：未登入投票 → 登入帶 `intent=vote:<externalId>`、返回自動補票；未登入許願 → 返回 `/roadmap?openWish=1` 開 wizard。驗收：兩種 intent 還原正確、無死路。

## 9. 後台 UI（daodao-admin-ui）

- [ ] 9.1 許願收件匣頁：列表 + 篩選/搜尋 + 歸併/促成/封存動作；`other` 強制模組子標籤。
- [ ] 9.2 路線圖項目管理頁：CRUD、狀態、is_public/pinned/sort_order、檢視已歸入許願與票數來源。
- [ ] 9.3 趨勢報表 dashboard：四指標、預設本月可切時間範圍。

## 10. 品質驗證

- [ ] 10.1 後端 `pnpm run lint`、`pnpm run typecheck`、`pnpm test` 通過。
- [ ] 10.2 前端 `pnpm run lint`、`pnpm typecheck`、`pnpm check:fix` 通過。
- [ ] 10.3 依各 spec 的 Scenario 驗證行為（投票去重、歸併計數、狀態機、訪客瀏覽、草稿還原、SEO meta）。
