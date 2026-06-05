## Why

學習孤立感是用戶難以維持實踐動力的核心障礙，目前 daodao 缺乏「有人陪伴」的感知機制。Buddy 功能透過基於相似實踐的輕量配對，讓用戶感受到「有人跟我在做類似的事」；Ember（火苗）則把這段抽象的承諾關係具象化為雙方共有的可見物，讓社會承諾感成為持續動力。

## What Changes

- 新增 Buddy 配對流程：系統在實踐建立後主動推薦相似練習者，用戶亦可在實踐頁 / Profile 頁主動邀請
- 新增後端 API：`GET /practices/:id/suggested-buddies`、`GET /users/me/buddies`、`POST /buddies/:id/cards`
- 新增每日聚合打卡通知（cron job）：彙整當日 Buddy 打卡，推送最多 1 則 in-app 通知
- 新增守望相助排程（cron job）：偵測 Buddy 連續 5 天未打卡，提示另一方去捎訊息
- 新增里程碑偵測：打卡時判斷是否達成 Day 7 / 30 / 100 或完成整個實踐
- 新增 Ember（火苗）機制：每對 Buddy 共有一簇火苗，狀態隨打卡頻率衰退與回溫（旺 → 微弱 → 將熄 → 餘燼）
- 新增 B 的陪伴值：獨立於火苗存活之外，記錄 B 的照看次數與收到感謝
- 新增前端頁面：Buddy 列表頁、守望相助傳信畫面、每日聚合通知卡片（含 reaction）、里程碑慶祝通知
- 新增前端推薦卡片：實踐建立完成後與打卡後的 Buddy 推薦卡片
- 新增前端主動邀請 UI（實踐頁 / Profile 頁）
- 新增火苗視覺呈現（複用既有島嶼資產：營火 / 炊煙 / 情緒臉 / 吉祥物）

## Capabilities

### New Capabilities

- `buddy-pairing`：Buddy 配對機制——相似度推薦（template_id / title 關鍵字）、主動邀請、接受/忽略，以及配對後的 Buddy 關係管理
- `buddy-ember`：火苗（Ember）共有承諾載體——燃料模型（打卡加溫、提醒延緩熄滅）、四段狀態衰退、陪伴值（B 的獨立獎勵線）、火苗可見性（僅雙方可見）
- `buddy-companion`：陪伴互動流程——每日聚合打卡感知通知、守望相助傳信（罐頭卡片 + 自由留言）、里程碑慶祝（Day 7/30/100 / 完成實踐）

### Modified Capabilities

- `notifications`：新增 Buddy 相關通知事件類型（BuddyDailyCheckinSummary、BuddyWatchOver、BuddyMilestone、BuddyCard）
- `practice-management`：實踐建立完成後觸發 Buddy 推薦卡片（現有流程僅在打卡後推薦）

## Impact

**後端（daodao-server）**
- 新增 `buddy-suggestions`、`buddy-list`、`buddy-cards` endpoints
- 新增 2 支 BullMQ cron job（每日聚合 + 守望相助）
- 新增里程碑偵測邏輯（於打卡建立時觸發）
- 新增 Ember 狀態模型（DB schema + 計算服務）

**前端（daodao-f2e / product app）**
- 新增頁面：`/buddies`（列表）、傳信畫面
- 修改頁面：實踐建立成功畫面、打卡成功畫面（新增推薦卡片）、實踐頁 / Profile 頁（新增邀請按鈕）
- 新增通知卡片元件（每日聚合、守望相助、里程碑）
- 新增火苗視覺元件（複用 `packages/assets/images/island/` 與 `emotion/` 資產）

**DB（daodao-storage）**
- 新增 migration：`ember`（火苗狀態）、`companion_score`（陪伴值）
- 可能修改：`buddy_relationships` 表（視現有 schema 而定）

**Non-goals**
- 小組（3–5 人學習小組）不在本次範圍
- Senpai / Kouhai 經驗梯度配對不在本次範圍
- 守望相助留言的公開 / 私密策略屬待議設計問題，本次以私密為預設但不鎖定
- 火苗的具體數值公式（降溫速率、grace period 天數）屬實作細節，由 design 階段定義
