## Why

學習社群中常見「社交冷場」問題——用戶看到他人的實踐打卡後，不知如何回應，導致互動停留在沉默。透過「對話式快速回應」搭配「引導留言鷹架」，以及「關注/連結」機制，將社交行為轉化為「大聲學習 (Learn Out Loud)」的觸發點，並建立問責夥伴關係以提升課程完成率。

## What Changes

- 新增 **Quick Reactions**：四種口語化反應按鈕（加油/啟發/共鳴/好奇），顯示於主題實踐卡片，點擊後自動聚焦留言框並帶入對應引導語
- 新增 **Comments**：留言系統，支援 `@mention` 喚起用戶清單，目標類型為 `practice`
- 新增 **Follow**：單向關注「人」或「實踐」，人有找 buddy 時、實踐有新打卡或內容更新時推播通知
- 新增 **Connect**：雙向夥伴連結，需發送請求並附理由，對方同意後雙方可查看彼此非公開內容（隱私為 user-level 設定，所有實踐統一套用）

## Capabilities

### New Capabilities

- `quick-reactions`: 快速回應系統，定義四種反應類型、狀態切換邏輯、計數聚合顯示規則，以及與留言框的聯動行為
- `comments`: 留言與對話系統，定義二層回覆結構、@mention 功能、留言與反應的資料關聯
- `follow-connect`: 關注與連結機制，定義 Follow（單向）與 Connect（雙向請求流程）的行為規則、隱私橋接與通知觸發條件
### Modified Capabilities

<!-- 目前 openspec/specs/ 尚無既有規格，無需列出修改項目 -->

## Impact

- **後端 (daodao-server)**：新增 reactions、comments、follows、connects 相關 API endpoints（RESTful）；PostgreSQL schema 需新增對應資料表；通知服務需擴充 follow/connect 觸發條件
- **前端 (daodao-f2e)**：主題實踐卡片需加入 Reaction Bar、留言區；新增關注/連結按鈕與管理頁
- **資料庫**：Prisma schema 新增 `reactions`、`comments`、`follows`、`connects` 資料表
- **通知系統**：已有 Email Worker（`src/queues/practice-email.worker.ts`），需擴充 follow/connect 事件的通知邏輯
