## ADDED Requirements

### Requirement: Email 發送時效（高價值事件）
系統 SHALL 確保 P1 事件在下一個 4 小時批次週期內（最長延遲 4 小時）發送 Email 通知。

> **與 PRD/FRD 的差異說明**：PRD Release Criteria 原文要求「Email 發送延遲不超過 1 分鐘」，FRD Test Point 亦要求「留言後 1 分鐘內收到 Email」。根據 `design.md` 架構決策 #1（批次優先），MVP 階段採用 4 小時批次發送，最大延遲 4 小時（已知差異，已評估為 MVP 可接受範圍）。FRD 的「1 分鐘」測試點在 MVP 階段不適用，Post-MVP 可透過即時推送升級縮短延遲。

#### Scenario: 連結請求 Email 延遲不超過 4 小時
- **WHEN** 用戶 A 向用戶 B 發送連結請求
- **THEN** 用戶 B SHALL 在 4 小時內收到包含該連結請求的 Email 摘要

### Requirement: 連結請求 Email 內容
連結請求的 Email 通知 SHALL 直接顯示對方的「連結初衷」文字摘要。

#### Scenario: Email 包含連結初衷
- **WHEN** 系統發送包含連結請求的 Email
- **THEN** Email 內容 SHALL 顯示發送方的「連結初衷」完整文字，不需用戶點擊進入平台才能查看

### Requirement: Email 退訂機制
每一封通知 Email MUST 在頁尾（Footer）包含退訂連結。

#### Scenario: Email 頁尾退訂連結
- **WHEN** 系統發送任何通知 Email
- **THEN** Email 頁尾 SHALL 包含「取消訂閱此類通知」的直達連結，以及「前往通知設定」的連結

#### Scenario: 點擊退訂立即生效
- **WHEN** 用戶點擊 Email 中的「取消訂閱此類通知」連結
- **THEN** 系統 SHALL 立即更新 `notification_preferences` 資料庫，將對應類型的 N01 設為 false
- **THEN** 下一封同類型 Email 批次 SHALL 不再包含該用戶

#### Scenario: 退訂無需登入
- **WHEN** 用戶點擊退訂連結（含 signed JWT token）
- **THEN** 系統 SHALL 驗證 token 後直接完成退訂，不要求用戶登入

#### Scenario: 退訂 token 過期
- **WHEN** 用戶點擊一個已過期的退訂連結（token 有效期 90 天）
- **THEN** 系統 SHALL 顯示提示訊息並提供「前往設定頁」的備用連結，讓用戶手動調整設定

### Requirement: 週報（P3 學習足跡摘要）
系統 SHALL 於每週日晚間或週一晨間發送「學習足跡週報」Email，彙整用戶本週的互動成果。

#### Scenario: 週報發送時間
- **WHEN** 系統時間到達週日 20:00（UTC+8）
- **THEN** 系統 SHALL 對所有已開啟週報設定的用戶發送週報 Email

#### Scenario: 週報資料統計邊界
- **WHEN** 系統計算本週統計數據
- **THEN** 「本週」的時間範圍 SHALL 定義為 UTC+8 週一 00:00:00 至週日 23:59:59

#### Scenario: 週報內容
- **WHEN** 系統產生週報 Email
- **THEN** Email 內容 SHALL 包含：本週收到的讚數、留言數、新關注者數、連結請求數，以及本人的主題實踐進度摘要

#### Scenario: 無活動時不發送週報
- **WHEN** 某用戶本週無任何互動數據
- **THEN** 系統 SHALL 不對該用戶發送週報（避免空白摘要）

### Requirement: Email 情感化文案
所有通知 Email MUST 避免使用冰冷的系統通知語氣，採用與平台「島嶼探索」語境一致的情感化文案。

#### Scenario: 留言通知文案
- **WHEN** 系統發送留言通知 Email
- **THEN** Email 主旨與內文 SHALL 使用符合平台語氣的文案（例如：「有人在你的島嶼留下了足跡」），而非「系統通知：您有一則新留言」
