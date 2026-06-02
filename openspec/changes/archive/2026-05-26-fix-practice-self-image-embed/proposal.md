## Why

舊的打卡（check-in）在建立時會自動產生 OG 截圖，並將該截圖存入 `image_urls` 欄位中。這導致打卡卡片內顯示一張「自己的截圖」，造成遞迴式的視覺效果。新的打卡已修正此問題，但歷史資料中仍殘留這些自嵌截圖。

## What Changes

- 在前端渲染打卡圖片時，過濾掉與該打卡 `og_image_url` 相同的圖片 URL，使舊打卡不再顯示自嵌截圖
- 或在後端 API 回傳 check-in 資料時過濾，避免前端需要額外邏輯
- 影響子專案：**f2e**（顯示邏輯）或 **server**（API 回傳邏輯）

## Capabilities

### New Capabilities

_無新增能力_

### Modified Capabilities

_無需修改 spec 層級的行為定義 — 這是既有行為的資料清理/顯示修正_

## Impact

- **daodao-f2e**: `check-in-card.tsx` 及相關打卡顯示元件需要過濾自嵌圖片
- **daodao-server**: 可能在 practice-checkin service 的回傳中過濾 `image_urls`
- **資料庫**: `practice_checkins.image_urls` 中的歷史資料不需修改（只在顯示層過濾）
- **風險**: 低 — 只影響圖片顯示，不影響資料完整性
