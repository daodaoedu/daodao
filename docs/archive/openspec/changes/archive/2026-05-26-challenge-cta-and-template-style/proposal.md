## Why

使用者在瀏覽他人的實踐卡片時，缺乏明顯的入口來嘗試相同的實踐，導致新實踐的採用率偏低。
透過將「我也想實踐」CTA 移至卡片外並作為主要行動按鈕，降低使用者嘗試新實踐的心理門檻。

## What Changes

- 新增「我也想實踐」功能：使用者可從他人的挑戰卡片一鍵複製該實踐到自己的清單
- 將按鈕從卡片內部移至卡片外部，使其更顯眼（視覺層級提升）
- **列表外層卡片**（feed/探索頁）也加入「我也想實踐」按鈕，讓使用者無需進入詳情頁即可直接採用
- 複製成功後顯示慶祝畫面（「已複製到你的清單！」），提供正向反饋，並提供「馬上開始」與「編輯內容」選項
- Template 預覽頁面（`/dev/template-preview`）樣式調整（與主功能無關的視覺修正）

## Capabilities

### New Capabilities
- `practice-copy-cta`: 使用者從挑戰詳情頁或列表外層卡片複製他人實踐到自己清單的功能，包含 CTA 按鈕位置（卡片外部）、複製邏輯、成功慶祝畫面

### Modified Capabilities
<!-- 無現有 spec 需要修改 -->

## Impact

- **daodao-f2e**（base `dev`，參考 `feat/challenge`）：
  - 挑戰詳情頁（`challenge-preview`）：CTA 按鈕移至卡片外
  - 成功慶祝畫面元件（新增）
  - Template 預覽頁（`template-preview`）：樣式調整
- **daodao-server**：可能需要新增「複製實踐」API endpoint（從他人 challenge 複製 practice item 到自己帳號）
- **daodao-storage**：確認是否需要新增 migration 支援複製關係記錄

## Non-goals

- 不修改實踐的分享或公開權限邏輯
- 不在此次變更中重構挑戰卡片的其他互動元件
- Template 樣式調整僅限視覺，不異動資料結構
