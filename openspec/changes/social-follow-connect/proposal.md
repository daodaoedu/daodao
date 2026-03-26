## Why

學習平台需要差異化的社交關係機制：輕量的「關注」讓用戶追蹤感興趣的內容，而高承諾的「連結」則建立互信的學習夥伴關係。透過動態門檻設計，確保連結行為具備真實的互動基礎，從而建立可信任的學習生態，並以此作為內容隱私存取的判斷依據。

## What Changes

- 新增單向**關注系統 (Follow)**：支援關注用戶或單一主題實踐，無需對方同意
- 新增雙向**連結系統 (Connect)**：含動態門檻（互動 < 3 次須填寫連結原因）與信任豁免機制
- 新增**連結請求狀態管理**：Pending / Accepted / Rejected，含撤回功能
- 新增**社交關係中心 (Social Hub)**：整合連結請求管理、關注/粉絲管理於單一入口
- 新增**個人互動足跡 (Learning Footprints)**：按時間倒序顯示用戶的留言與回覆紀錄

## Capabilities

### New Capabilities
- `social-follow`: 單向關注系統，支援關注用戶或主題實踐，含通知觸發邏輯與關注者列表顯示
- `social-connect`: 雙向連結系統，含動態門檻設計（Familiarity Bypass）、連結請求流程、狀態管理（Pending/Accepted/Rejected）、以及解除連結與隱私權限聯動
- `social-hub`: 社交關係管理中心，整合連結請求（收到/發出）、關注/粉絲列表管理，作為單一入口
- `learning-footprints`: 個人互動足跡頁面，按時間倒序顯示用戶留言與回覆，含跳轉至對應實踐的功能

### Modified Capabilities
- `notifications`: 新增關注觸發通知類型（被關注、實踐更新、連結請求相關）
- `privacy`: 新增基於夥伴關係的隱私橋接 (Privacy Bridge)，連結/解除連結時同步更新內容存取權限

## Impact

- **資料層**：新增 `follows`、`connections`、`connection_requests` 資料表；`interactions` 計數需支援跨實踐累計查詢
- **API**：新增關注、連結相關 REST endpoints；需支援動態門檻計算的互動次數查詢
- **通知系統**：依賴現有通知 FRD，需擴充通知類型
- **隱私系統**：連結狀態變更需即時同步內容存取權限
- **前端**：新增 Social Hub 頁面、Learning Footprints 頁面、Connect Modal 元件
