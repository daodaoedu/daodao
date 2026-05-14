## Why

靈感頁面每張 practice 卡片 mount 時獨立呼叫 `GET /reactions` + `GET /reactions/list` 兩個 API，20 張卡片產生 40 個請求，造成不必要的網路負載與伺服器壓力。需要一個批次端點將 2N 請求降為 1 個。

## What Changes

- 後端新增 `GET /api/v1/reactions/batch` 端點，接收多個 targetId，一次回傳所有目標的反應計數 + 用戶反應列表
- 前端新增 `useReactionsBatch` hook，在列表頁層級一次取得所有卡片的 reactions 資料
- 卡片元件（`PracticeShowcaseCard`、`BrewingCard`）支援透過 props 接收預取的 reactions 資料，有傳就用 props，沒傳就 fallback 到原本的獨立 hook
- `useCardReactions` hook 支援接收預取資料，避免重複 fetch

## Capabilities

### New Capabilities

- `batch-reactions`: 批次取得多個目標的反應計數與用戶反應列表的 API 端點與前端 hook

### Modified Capabilities

（無既有 spec 需要修改）

## Impact

- **daodao-server**：新增 batch endpoint（controller、service、route、validator）、OpenAPI spec 更新
- **daodao-f2e**：`packages/api` 新增 batch API function + hook；`apps/product` 列表頁整合 batch hook、卡片元件新增 optional props
- **API 相容性**：純新增，不影響既有端點，無 breaking change
