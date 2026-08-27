# challenge-participation

## ADDED Requirements

### Requirement: 固定時段
共同挑戰的期間 SHALL 為固定時段（同一起訖日，91 天內），所有參與者共用；SHALL NOT 提供個人化開始日。

#### Scenario: 加入後的期間
- **WHEN** 使用者於挑戰開始前任一時點加入
- **THEN** 其挑戰實踐的起訖日與挑戰本身一致，不因加入時間而異

### Requirement: 加入自動複製實踐
使用者加入共同挑戰後，系統 SHALL 自動複製該挑戰實踐給使用者。除名稱與期間外，其他欄位 SHALL 可由使用者依自身情況編輯。

#### Scenario: 加入
- **WHEN** 已登入使用者在挑戰可加入期間點擊加入
- **THEN** 系統建立參與記錄並自動複製實踐到使用者的「我的」頁面

#### Scenario: 不可編輯欄位
- **WHEN** 使用者嘗試編輯挑戰實踐的名稱或期間
- **THEN** 介面不提供修改，API 拒絕變更這兩個欄位

### Requirement: 挑戰實踐不可被複製
共同挑戰實踐 SHALL NOT 提供「我也想實踐」複製按鈕；複製 API 對挑戰實踐 SHALL 拒絕。

#### Scenario: 嘗試複製
- **WHEN** 使用者對共同挑戰實踐呼叫複製 API
- **THEN** API 拒絕；加入挑戰的唯一途徑是加入流程

### Requirement: 卡片狀態流轉
挑戰實踐卡片 SHALL 依日期與參與狀態呈現四種狀態：「現在加入」（未加入、可加入）、「打卡 Disable」（已加入、未到開始日）、「打卡 Enable」（開始日至結束日）、「已完成」（過結束日）。

#### Scenario: 開始日前打卡
- **WHEN** 已加入的使用者在開始日之前嘗試打卡
- **THEN** 打卡按鈕為 Disable，API 拒絕開始日前的打卡

#### Scenario: 開始日起打卡
- **WHEN** 開始日當天或期間內使用者打卡
- **THEN** 沿用平台既有打卡機制正常記錄

### Requirement: 隱私固定為公開
挑戰實踐與其打卡紀錄 SHALL 全公開，使用者 SHALL NOT 可另外設定隱私。

#### Scenario: 嘗試改為私密
- **WHEN** 使用者嘗試將挑戰實踐或其打卡設為私密
- **THEN** 介面不提供該選項，API 拒絕變更
