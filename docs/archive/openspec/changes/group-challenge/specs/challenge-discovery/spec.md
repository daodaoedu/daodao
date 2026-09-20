# challenge-discovery

## ADDED Requirements

### Requirement: 探索共同挑戰頁公開可瀏覽
系統 SHALL 提供探索共同挑戰 standalone 頁，未登入 SHALL 可瀏覽。頁面列出已發佈且未結束的挑戰；點擊「加入」時 SHALL 要求登入。

#### Scenario: 未登入瀏覽
- **WHEN** 未登入訪客開啟探索共同挑戰頁
- **THEN** 可看到挑戰清單與各挑戰的名稱、期間、參與人數

#### Scenario: 未登入點擊加入
- **WHEN** 未登入訪客點擊「加入」
- **THEN** 導向登入流程，完成後回到加入流程

### Requirement: 參與人數顯示
共同挑戰的主題實踐卡片 SHALL 顯示「xx 座島已加入」，人數 SHALL 反映實際參與者數量。

#### Scenario: 人數更新
- **WHEN** 有新使用者加入挑戰
- **THEN** 卡片顯示的已加入人數隨之增加

### Requirement: 已結束挑戰的呈現
挑戰結束後 SHALL 進入「已結束」狀態：不再出現在可加入清單、不接受新加入者，但既有內容 SHALL 仍可被查看（歷史足跡）。

#### Scenario: 結束後嘗試加入
- **WHEN** 使用者對已結束的挑戰發出加入請求
- **THEN** API 拒絕並說明挑戰已結束

#### Scenario: 結束後查看
- **WHEN** 任何使用者開啟已結束挑戰的頁面
- **THEN** 仍可瀏覽該挑戰的打卡紀錄與參與者
