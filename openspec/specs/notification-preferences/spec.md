## ADDED Requirements

### Requirement: 全局通知開關
系統 SHALL 提供全局開關，允許用戶一鍵開啟或關閉所有通知頻道。

#### Scenario: 關閉全局通知
- **WHEN** 用戶將全局通知開關設為關閉
- **THEN** 系統 SHALL 停止對該用戶發送所有類型的 Email（N01）與 In-App Push（N03）通知，In-App 通知中心（N02）仍繼續累積但不主動提示
- **THEN** 資料庫中該用戶所有 `notification_preferences.is_enabled` 設為 false

#### Scenario: 重新開啟全局通知
- **WHEN** 用戶將全局通知開關重新設為開啟
- **THEN** 系統 SHALL 恢復各類型通知的發送，依據用戶先前的分項設定執行

### Requirement: 分項通知控制
系統 SHALL 允許用戶針對每種事件類型，分別設定 N01（Email）、N02（In-App）、N03（In-App Push）三個頻道的開啟狀態。

各通知類型的頻道預設值：

| 通知類型 | N01 (Email) | N02 (In-App) | N03 (Push) |
|---------|:-----------:|:------------:|:----------:|
| 反應 (Reaction) | ☑ | V | ☑ |
| 留言 (Comment) & @ | ☑ | V | ☑ |
| 關注 (Follow) | ☑ | V | ☑ |
| 連結請求 (Connect) | ☑ | V | ☑ |
| 連結確認 | ☑ | V | ☑ |
| 關注的主題實踐更新 | ☑ | V | ☑ |
| 關注的人開始主題實踐 | ☑ | V | ☑ |
| 關注的人請求 Buddy | ☑ | V | ☑ |
| 週報 | ☑ | N/A | N/A |

圖例說明：
- **V**：系統強制開啟，用戶無法關閉
- **☑**：預設開啟（用戶可關閉）
- **N/A**：此頻道不支援此類型（非「預設關閉」，而是功能不存在）

> **週報特殊規則**：週報僅存在於 Email（N01）頻道，In-App（N02）與 Push（N03）均無此類型。實作時不應為週報建立 N02/N03 的 `notification_preferences` 記錄。

#### Scenario: 關閉特定類型 Email
- **WHEN** 用戶將「反應（Reaction）」的 N01 設為關閉
- **THEN** 系統 SHALL 在下一個 Email 批次中不包含該用戶的 Reaction 事件
- **THEN** 其他類型的 Email 通知不受影響

#### Scenario: 設定即時生效
- **WHEN** 用戶在設定頁面修改任何通知偏好
- **THEN** 系統 SHALL 在下一個批次週期前即時反映該設定（變更寫入資料庫後立即生效）

#### Scenario: 週報設定
- **WHEN** 用戶關閉「週報」的 N01
- **THEN** 系統 SHALL 不再對該用戶發送週日/週一的週報 Email

### Requirement: 偏好設定持久化
系統 MUST 將用戶通知偏好儲存於 `notification_preferences` 表，並確保設定變更後即時反映。

#### Scenario: 設定寫入資料庫
- **WHEN** 用戶儲存通知設定
- **THEN** 系統 SHALL 更新 `notification_preferences` 表中對應的記錄，`updated_at` 更新為當前時間

#### Scenario: 查詢當前設定
- **WHEN** 用戶開啟通知設定頁面
- **THEN** 系統 SHALL 回傳該用戶所有類型的當前偏好設定，若無記錄則回傳預設值
