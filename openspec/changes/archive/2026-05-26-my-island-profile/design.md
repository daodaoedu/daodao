## Context

「我的小島」個人檔案頁是平台的公開身份介面。後端為 Node.js/Express TypeScript（`daodao-server`），前端為 Next.js monorepo（`daodao-f2e/apps/product`），檔案儲存使用 Cloudflare R2。

**現有相關資源：**
- 資料庫已有 `user_profiles.bio`（透過 `users.id` 一對一關聯）、`users.personal_slogan`、`users.custom_id`（@handle）、`users.location_id`（→ `location` 關聯）
- `contacts` 模型已有 `photo_url`（頭像）、`ig`、`discord`、`line`、`fb`、`threads`、`linkedin`、`github`、`website`；透過 `users.contact_id` 關聯
- 圖片上傳已有 `image.controller.ts` + `r2.service.ts`（支援 JPEG/PNG/WebP，500KB 上限）
- `social-follow-connect` change 正在進行中，連結/關注按鈕邏輯由該 change 提供

**約束：**
- 個人檔案為公開頁（不需登入即可瀏覽他人）
- 編輯自己的檔案需驗證（JWT）
- 不引入新的外部依賴

## Goals / Non-Goals

**Goals:**
- 建立公開個人檔案 GET endpoint（可用 `custom_id` 或 `user_id` 查詢）
- 增強現有前端頁面 `/users/[identifier]`，展示 Identity Header、About Me、社群連結、活躍度指標
- 新增近期實踐次數（最近 7 天）查詢
- 新增共同 Circle 數量查詢（需登入時才顯示）
- 在個人設定中新增「隱藏連結數」選項
- 允許使用者透過現有圖片上傳 API 更新頭像，並將 URL 寫回 `contacts.photo_url`

**Non-Goals:**
- Connect/Follow 按鈕的互動邏輯（屬於 `social-follow-connect` change）
- 連結名單彈窗（Connections list modal）
- About Me 的 Markdown 即時預覽編輯器
- 個人檔案 URL slug 的 SEO 優化（第一版用 userId 即可）

## Decisions

### 1. API 端點設計：用 `custom_id` 還是 `user_id` 查詢？

**決定：** 接受兩者，優先以 `GET /api/v1/users/profile/:identifier` 統一處理。`identifier` 可以是 `custom_id`（@handle）或數字 `userId`，後端自動判斷。

**理由：** 前端 URL 為 `/users/[identifier]`，API endpoint 為 `/api/v1/users/profile/:identifier`，兩者獨立設計。後端單一入口自動判斷 identifier 類型，避免建立兩個重複 endpoint。

**替代方案：** 分開建立 `GET /api/users/:id` 與 `GET /api/users/by-handle/:customId`，但這會讓前端路由邏輯複雜化。

---

### 2. 近期活躍度（7 天實踐次數）的計算位置

**決定：** 在 `profile` endpoint 的 response 中內嵌，由後端即時聚合（`COUNT` SQL query on `practices` table，`WHERE created_at >= NOW() - INTERVAL '7 days'`）。

**理由：** 資料量小、查詢簡單，不需要快取或獨立 stats endpoint。可在單一 API call 完成頁面資料加載。

**替代方案：** 建立獨立 `/api/users/:id/stats` endpoint，但會增加前端 waterfall request。

---

### 3. 共同 Circle 的顯示策略

**決定：** 只在登入狀態下查詢並顯示；未登入時隱藏「共同 Circle」模組。查詢為 `COUNT(DISTINCT circle_id) WHERE user_id IN (viewer_id, profile_id)`。

**理由：** 共同 Circle 只對已登入使用者有意義。未登入查詢需要額外權限判斷，增加複雜度。

---

### 4. 頭像上傳流程

**決定：** 複用現有 `POST /api/v1/images` endpoint，成功後前端將返回的 URL 透過 `PUT /api/users/me` 更新 `contacts.photo_url`。

**理由：** 避免重複建立上傳 API；現有圖片端點已有格式驗證與 R2 整合。

---

### 5. 隱藏連結數的實作位置

**決定：** 新增 `users.hide_connections_count` boolean 欄位（Prisma migration）。Profile endpoint 依此欄位決定是否回傳連結數，預設 `false`（公開）。

**理由：** 屬於使用者偏好設定，存於 DB 比存於 local storage 更可靠（跨裝置生效）。

## Risks / Trade-offs

- **`social-follow-connect` 依賴**：Profile 頁的 Connect/Follow 按鈕需等待該 change 完成。緩解：前端先渲染靜態佔位按鈕，`social-follow-connect` 完成後接入狀態邏輯。
- **`bio` 字元上限僅靠前端驗證**：現有 Prisma schema 的 `bio` 欄位無長度限制。緩解：在 `PUT /api/users/me` 的 Zod validator 中加入 `max(350)` 驗證，前後端雙重保護。
- **個人標語 `personal_slogan` 命名不一致**：PRD 稱之為 Headline，但 DB 欄位為 `personal_slogan`。緩解：API response 統一用 `headline` 欄位名稱，透過 transform 映射。

## Migration Plan

1. Prisma migration：新增 `users.hide_connections_count Boolean @default(false)`
2. 後端：新增 `GET /api/users/profile/:identifier` endpoint
3. 後端：在現有 `PUT /api/users/me` validator 加入 `bio`（350）與 `personal_slogan`（150）長度驗證
4. 前端：增強現有 `/users/[identifier]` 頁面（不新增路由）
5. 前端：在使用者設定頁新增「隱藏連結數」toggle
6. 部署：無需特殊 rollout 順序，前端為增強現有路由，無新前端路由引入

**Rollback：** 刪除新路由與 endpoint 即可回滾，不影響現有功能。

## Open Questions

- ~~「共同 Circle」的 DB 表名稱為何？~~ → **已決議**：表名為 `user_join_group`（codebase 探索確認）
- ~~Profile 頁 URL 最終設計？~~ → **已決議**：增強現有 `/users/[identifier]`，不新增路由
- ~~連結數隱藏設定是否也適用於隱藏追蹤者數？~~ → **已決議**：本 change 只隱藏 connections count；followers count 維持顯示，與 PRD 描述一致
