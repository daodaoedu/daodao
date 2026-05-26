## Why

島島在迭代過程中收到大量回饋與功能許願，但散落各處（私訊、表單、口頭），難以彙整，也讓使用者覺得「講了沒回應」。「許願池」把單向客訴轉成雙向共創：使用者用低摩擦的三步驟流程許願，團隊策展成公開的產品 Roadmap，並用投票量化呼聲。公開頁同時是未註冊者認識島島的拉新入口。產品決策見 [`docs/product/wishpool/prd.md`](../../../docs/product/wishpool/prd.md)（v1.3），技術規格見 [`docs/product/wishpool/frd.md`](../../../docs/product/wishpool/frd.md)。

## What Changes

- 新增 **許願提交**：三步驟引導 wizard（選分類 → 舉例子 → 說期待），**需登入**；未登入於互動當下引導登入、登入後返回完成，填寫內容以 localStorage 草稿保留（24h）。
- 新增 **公開 Roadmap 看板**：放在 product app 的**公開免登入唯讀路由** `/roadmap`，狀態分頁（全部／排程中／討論中／已完成）、Hero 統計、SEO meta；未登入「有引導、不空白」。
- 新增 **投票/支持**：登入使用者對路線圖項目一人一票（可取消），DB UNIQUE 去重，`support_count` 於 transaction 內維護。
- 新增 **後台策展與報表**：許願收件匣、歸併/促成/封存、內部模組子標籤、項目 CRUD 與狀態機、進度通知、趨勢報表。
- 採**兩層 + 投票**模型：原始 `wishes`（僅後台可見）↔ 對外 `roadmap_items`（公開卡片，UUID `external_id`）↔ `roadmap_item_supports`（投票，含 `wish_link` 歸併即投票）。

## Capabilities

### New Capabilities

- `wish-submission`: 三步驟許願提交、登入引導、草稿保留、帳號綁定與聯絡方式。
- `roadmap-board`: 公開唯讀看板查詢、狀態分頁與排序、Hero 統計與快取、SEO meta、訪客引導不空白。
- `roadmap-voting`: 投票/取消、一人一票去重、`support_count` 一致性、未登入投票引導與 intent 還原。
- `wish-curation`: 後台收件匣、歸併/促成/封存、模組子標籤強制、項目管理與狀態機、進度通知、趨勢報表。

### Modified Capabilities

<!-- openspec/specs/ 目前無既有規格，無修改項目 -->

## Impact

- **daodao-storage**：新增 `wishes`、`roadmap_items`、`roadmap_item_supports` 三張表的 numbered SQL（含 UNIQUE 與 index）。
- **daodao-server**：新增 Roadmap / Wish / Vote 的 `/api/v1` API（公開看板 `optionalAuth`、互動 `authenticate`、後台策展與報表 admin）；Prisma schema 同步；狀態變更觸發通知。
- **daodao-f2e（product app）**：公開免登入路由 `/roadmap`（白名單）、看板與卡片、三步驟 wizard、投票、訪客引導空狀態、SEO meta；API hooks 置 `packages/api`。
- **daodao-admin-ui**：許願收件匣、項目管理、趨勢報表 dashboard。
- **通知系統**：沿用既有 notification system 與 Email Worker，新增 `wish.linked`、`roadmap.shipped` 事件（聚合防轟炸）。

## Non-goals

- 不做即時公開的原始許願牆（原文一律經策展才公開）。
- 不做使用者之間的留言/討論串（社群互動另有規劃）。
- 不做匿名許願/投票（互動一律需登入，未登入僅瀏覽）。
- 不做對外的工時估算、指派、看板拖拉等專案管理功能。
- 不做後端跨裝置續寫草稿（草稿以前端 localStorage 為主）。
