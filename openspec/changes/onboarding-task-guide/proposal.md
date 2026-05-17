## Why

新用戶註冊後缺乏明確的引導，容易因「空白頁焦慮」而流失，無法在黃金期內建立第一個實踐。透過結構化的 Onboarding 流程（In-app 進度提示 + Email 序列），我們希望提升「註冊後 3 天內建立第一個實踐」的轉化率，並根據用戶來源（直接註冊 / 測驗導向 / 工具導向）提供適性化引導。

## What Changes

- **新增** In-app 浮動進度組件（Floating Widget），位於畫面右下角，以 to-do list 方式顯示 Onboarding 任務
- **新增** 基於用戶來源（S1 / S2 / S3）的適性化任務路由邏輯，不同來源的任務順序不同
- **新增** 任務自動偵測機制，當用戶完成對應動作時即時更新進度
- **新增** 限量 Early User Badge 獎勵，當用戶完成全部任務時觸發
- **新增** 階梯式 Email 序列（L0 → A/B/C/D/E），完成上一步才觸發下一封郵件
- **新增** 後端 Onboarding 紀錄：用戶來源、實踐建立方式、Badge 獲得狀態、完成所需天數

## Capabilities

### New Capabilities

- `onboarding-progress-widget`: In-app 浮動進度組件的 UI 狀態、適性化任務路由（S1/S2/S3）、任務自動偵測與即時更新、組件最小化 / 展開邏輯
- `onboarding-email-sequence`: 階梯式 Email 觸發序列（L0、A、B、C、D、E），依用戶來源決定順序，完成任務才觸發下一封
- `onboarding-badge`: Early User Badge 觸發邏輯——全部任務完成後一次性通知，組件轉化為 Badge 展示

### Modified Capabilities

（無既有 spec 需異動）

## Impact

- **daodao-f2e (product app)**: 新增浮動進度組件、Badge 通知 UI；需讀取 onboarding 狀態 API
- **daodao-server**: 新增 onboarding 狀態 API（查詢 / 更新任務進度、Badge 發放）；各任務完成事件需觸發 Onboarding 偵測
- **daodao-storage**: 新增 `user_onboarding` 表，紀錄 `user_source`、各任務完成狀態、Badge 發放狀態、完成天數
- **daodao-worker**: Email 序列排程與觸發邏輯（Cloudflare Workers + BullMQ 協作）
