## ADDED Requirements

### Requirement: 實踐建立完成後觸發 Buddy 推薦
實踐建立成功後，產品 app SHALL 在成功畫面觸發 Buddy 推薦流程（呼叫 `GET /practices/:id/suggested-buddies`），並在畫面下方顯示推薦卡片。此為使用者對實踐動力最強的時刻，SHALL 優先於打卡後推薦作為主要觸發點。

#### Scenario: 建立實踐後顯示推薦
- **WHEN** 用戶成功建立一個實踐，API 回傳建立成功
- **THEN** 成功畫面 SHALL 在主要確認內容下方顯示 Buddy 推薦卡片區塊（若 suggested-buddies 有結果）

#### Scenario: 推薦卡片不阻擋主流程
- **WHEN** suggested-buddies API 呼叫失敗或逾時
- **THEN** 實踐建立成功畫面 SHALL 仍正常顯示，推薦區塊 SHALL 靜默隱藏（不顯示錯誤）
