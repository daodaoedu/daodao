## Why

Dao Dao 需要一個「共同挑戰」功能，讓官方可以發起高可見度的群體學習活動。目前平台缺乏公開的集體挑戰機制，無法有效建立「熱鬧學習場」的品牌印象、也無法創造外部觀察者到參與者的轉換動力。

## What Changes

- **新增** 共同挑戰建立與管理（官方發起，名稱/期間不可編輯）
- **新增** 挑戰卡片狀態系統（報名中/未開始/進行中/已結束）
- **新增** 彈挑視窗（登入後對全站使用者顯示即將開始的挑戰）
- **新增** 分層互動權限：參與者可評論與回覆，外部觀察者僅可快速回應（送花）
- **新增** Lurker Banner：對非參與者顯示即時參與人數與報名入口
- **新增** 結營自動化：挑戰結束後自動判斷達標，發放 Growth Map 勳章並解鎖精華區
- **新增** 承諾宣言報名流程（空值不可送出）
- **新增** 報名成功 Email 通知與分享圖卡生成
- **新增** 挑戰熱度組件（Challenge Pulse）：總打卡次數、送花數、活躍成員頭像堆疊

## Capabilities

### New Capabilities

- `challenge-discovery`: 挑戰發現機制，包含首頁卡片、彈挑視窗、卡片狀態管理與即時人數顯示
- `challenge-enrollment`: 承諾宣言報名流程、報名成功 Email 通知、分享圖卡生成
- `challenge-feed`: 挑戰專屬動態流，全站公開可讀，打卡在開始日前不可提交
- `challenge-permissions`: 分層互動權限 ACL，參與者標籤、評論權限控管、快速回應元件
- `challenge-conversion`: Lurker Banner、Challenge Pulse 熱度統計、FOMO 轉換機制
- `challenge-completion`: 結營自動化邏輯，達標判斷、Growth Map 勳章發放、未達標通知

### Modified Capabilities

（無）

## Impact

- **後端**：新增 `challenges`、`challenge_participants` 資料表；新增參與者身分驗證 ACL middleware；結營 cronjob
- **前端**：首頁新增挑戰卡片與彈挑視窗；挑戰 Feed 頁面；互動元件（快速回應、評論權限判斷）；Lurker Banner；Challenge Pulse
- **Email 系統**：新增報名確認信、完成賀信模板
- **Growth Map**：需支援挑戰勳章類型與精華區解鎖觸發
