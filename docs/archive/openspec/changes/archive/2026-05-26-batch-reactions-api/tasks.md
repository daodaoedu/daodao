## 1. 後端 — Batch Endpoint（daodao-server）

- [x] 1.1 新增 Zod 驗證 schema `GetReactionsBatchQuerySchema`，驗證 `targetType` enum + `targetIds` 逗號分隔 UUID（1-50 個）
  - 驗收：schema 能正確 parse 合法輸入、拒絕空值/超過 50 個/非 UUID 格式

- [x] 1.2 在 `reaction.service.ts` 新增 `getReactionsBatchByTargets` 方法，使用 `WHERE target_id IN (...)` 單次查詢，在記憶體中 group by targetId 組裝回傳
  - 驗收：單次 DB 查詢取回所有目標的 reactions + list 資料，回傳 `Record<externalId, { reactions, currentUserReaction, items }>`（`items` 對齊現有 list API 命名）

- [x] 1.3 在 `reaction.controller.ts` 新增 `getReactionsBatch` handler，用 Prisma `findMany({ where: { external_id: { in: [...] } } })` 批次轉換 external → internal ID（不使用現有的 `batchExternalToInternalIds`，因為它是 N+1 查詢）
  - 驗收：handler 正確批次解析 query params、一次轉換所有 ID、回傳標準 API response

- [x] 1.4 在 `reaction.routes.ts` 註冊 `GET /api/v1/reactions/batch` 路由（optionalAuth），加上 OpenAPI/Swagger 標註
  - 驗收：route 可被存取、Swagger 文件正確顯示

- [x] 1.5 撰寫 batch endpoint 的測試（未登入查詢、登入查詢含 currentUserReaction、空結果、超過 50 個 ID 的 400 錯誤）
  - 驗收：所有測試通過，覆蓋 spec 中定義的 scenarios

## 2. 前端 — 類型生成與 Batch Hook（daodao-f2e/packages/api）

- [x] 2.1 後端 OpenAPI spec 更新後，重新生成前端 API types（暫用手動型別定義，待後端 merge 後再 gen:types）（`pnpm run types:generate` 或對應指令）
  - 驗收：`packages/api/src/types` 中包含 batch endpoint 的型別定義

- [x] 2.2 在 `reaction.ts` 新增 `getReactionsBatch` API function，呼叫 `GET /api/v1/reactions/batch`
  - 驗收：function 正確組裝 query params（targetIds 逗號分隔），回傳型別正確

- [x] 2.3 在 `reaction-hooks.ts` 新增 `useReactionsBatch` hook，SWR key 使用排序後的 targetIds
  - 驗收：相同 ID 集合不同順序產生相同 SWR key；refreshInterval 與 revalidateOnFocus 設定一致

- [x] 2.4 匯出新增的 function 和 hook，確保 `@daodao/api` package 的 public API 正確
  - 驗收：從 `@daodao/api` 可正確 import `getReactionsBatch` 和 `useReactionsBatch`

## 3. 前端 — 卡片元件整合（daodao-f2e/apps/product）

- [x] 3.1 修改 `useCardReactions` hook，接受 optional 預取 reactions 資料參數，有傳入時跳過獨立 fetch
  - 驗收：傳入預取資料時不呼叫 `useReactions`；未傳入時行為不變；mutation 後正確 revalidate batch cache

- [x] 3.2 修改 `PracticeShowcaseCard` 和 `BrewingCard`，新增 optional reactions props，有傳入時使用 props 而非獨立 hook
  - 驗收：傳入 props 時不發出獨立 reactions API 請求；未傳入時 fallback 正常

- [x] 3.3 在靈感頁面（`page.tsx`）整合 `useReactionsBatch`，從 practices 提取 ID 集合，將結果透過 props 傳給每張卡片
  - 驗收：靈感頁面載入 20 張卡片時僅發出 1 個 batch 請求；滾動載入新頁面時發出新的 batch 請求

## 4. 驗證與清理

- [ ] 4.1 端到端驗證：開啟靈感頁面，確認 Network tab 僅出現 batch 請求，無個別 reactions 請求
  - 驗收：DevTools Network 中不再出現大量 `reactions?targetType=practice&targetId=` 請求

- [ ] 4.2 驗證 detail page 不受影響：點進單一 practice 詳情頁，確認仍使用獨立 hook 正常運作
  - 驗收：detail page 的 reactions 功能完全正常
