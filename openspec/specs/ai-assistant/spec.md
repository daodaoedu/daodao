# AI Assistant 規格

> **⚠️ 稽核狀態（2026-06-04，spec vs dev）：未實作（屬進行中的 `admin-panel-overhaul` change）**
> dev 查無後台 AI 助理 / 知識庫 / RAG / 共享收件匣 / 接手 / 指標的任何實作（僅 Qdrant 連線與泛用 LLM client）。
> 此能力隸屬尚在進行的 `openspec/changes/admin-panel-overhaul`，故保留於 specs/ 但標記為「未交付」。明細見 `.omc/openspec-audit/specs/ai-assistant.md`。

## ADDED Requirements

### Requirement: 上傳知識庫文件

管理員 SHALL 能夠上傳知識庫文件（支援 text、markdown、PDF 格式）。

#### Scenario: 上傳文件

- **WHEN** 管理員在知識庫管理頁面點擊「上傳文件」並選擇檔案
- **THEN** 系統 SHALL 接受 text、markdown、PDF 格式的檔案並新增至知識庫

#### Scenario: 上傳不支援的格式

- **WHEN** 管理員嘗試上傳不支援格式的檔案
- **THEN** 系統 SHALL 顯示錯誤訊息，說明僅支援 text、markdown、PDF 格式

### Requirement: 文件向量化處理

系統 SHALL 將上傳的文件進行向量化處理，並儲存至 Qdrant 以供檢索使用。

#### Scenario: 文件上傳後自動向量化

- **WHEN** 管理員成功上傳一份文件
- **THEN** 系統 SHALL 自動將文件內容切割為適當區段、產生向量嵌入，並儲存至 Qdrant 向量資料庫

#### Scenario: 向量化處理狀態

- **WHEN** 文件正在進行向量化處理
- **THEN** 系統 SHALL 顯示處理進度狀態（處理中/已完成/失敗），管理員可追蹤進度

### Requirement: 知識庫條目管理

管理員 SHALL 能夠檢視、編輯與刪除知識庫條目。

#### Scenario: 檢視知識庫條目列表

- **WHEN** 管理員進入知識庫管理頁面
- **THEN** 系統 SHALL 顯示所有已上傳的文件清單，包含檔案名稱、上傳時間、向量化狀態

#### Scenario: 編輯知識庫條目

- **WHEN** 管理員點擊某條目的「編輯」按鈕
- **THEN** 系統 SHALL 允許管理員編輯文件內容或中繼資料，編輯後自動重新向量化

#### Scenario: 刪除知識庫條目

- **WHEN** 管理員點擊某條目的「刪除」按鈕並確認
- **THEN** 系統 SHALL 刪除該文件及其在 Qdrant 中的向量資料

### Requirement: 設定 AI 助理個性

管理員 SHALL 能夠設定 AI 助理的個性特徵（語氣、語言、範圍邊界）。

#### Scenario: 設定語氣與語言

- **WHEN** 管理員在 AI 助理設定頁面調整語氣（例如：友善、專業、輕鬆）與回應語言
- **THEN** AI 助理 SHALL 依照設定的語氣與語言回應用戶問題

#### Scenario: 設定範圍邊界

- **WHEN** 管理員設定 AI 助理的回應範圍（例如：僅回答與課程相關的問題）
- **THEN** AI 助理 SHALL 對超出範圍的問題禮貌拒絕，並引導用戶至適當的資源

### Requirement: 指定 AI 助理活躍空間

管理員 SHALL 能夠指定 AI 助理在哪些社群空間中活躍。

#### Scenario: 啟用特定空間

- **WHEN** 管理員在設定頁面勾選特定社群空間
- **THEN** AI 助理 SHALL 僅在被勾選的空間中回應用戶問題

#### Scenario: 取消啟用空間

- **WHEN** 管理員取消勾選某社群空間
- **THEN** AI 助理 SHALL 停止在該空間中回應用戶問題

### Requirement: RAG 問答能力

AI 助理 SHALL 使用 RAG（Retrieval-Augmented Generation）從知識庫檢索相關資訊來回答會員問題。

#### Scenario: 用戶提問且知識庫有相關資訊

- **WHEN** 會員在啟用 AI 助理的空間中提出問題，且知識庫中有相關內容
- **THEN** AI 助理 SHALL 檢索知識庫中最相關的內容，並據此生成回答

#### Scenario: 用戶提問且知識庫無相關資訊

- **WHEN** 會員在啟用 AI 助理的空間中提出問題，但知識庫中無相關內容
- **THEN** AI 助理 SHALL 使用設定的備用訊息回應，表示無法找到相關資訊

### Requirement: 引用來源文件

AI 助理回答時 SHALL 在適用情況下引用來源文件。

#### Scenario: 回答包含引用

- **WHEN** AI 助理從知識庫檢索到相關資訊並生成回答
- **THEN** 回答 SHALL 標示引用的來源文件名稱，用戶可點擊查看原始文件

### Requirement: 共享收件匣審閱

管理員 SHALL 能夠在共享收件匣中審閱所有 AI 對話。

#### Scenario: 查看 AI 對話列表

- **WHEN** 管理員進入 AI 助理共享收件匣
- **THEN** 系統 SHALL 顯示所有 AI 對話的列表，包含用戶名稱、最後訊息時間、對話狀態

#### Scenario: 查看單一對話內容

- **WHEN** 管理員點擊某筆對話
- **THEN** 系統 SHALL 顯示完整的對話記錄，包含用戶提問與 AI 回答

### Requirement: 對話狀態分類

對話 SHALL 被標記為以下狀態：AI 已解決（resolved by AI）、已升級（AI 無法回答，escalated）、需人工介入（human intervention needed）。

#### Scenario: AI 成功解決

- **WHEN** AI 助理成功回答用戶問題且用戶未追問
- **THEN** 系統 SHALL 將該對話標記為「AI 已解決」

#### Scenario: AI 無法回答

- **WHEN** AI 助理偵測到問題超出知識庫範圍或信心度過低
- **THEN** 系統 SHALL 將該對話標記為「已升級」，並通知管理員

#### Scenario: 管理員標記需人工介入

- **WHEN** 管理員審閱對話後判斷需要人工回應
- **THEN** 管理員 SHALL 能夠將對話狀態更改為「需人工介入」

### Requirement: 管理員接手對話

管理員 SHALL 能夠接手 AI 對話並直接回應用戶。

#### Scenario: 接手並回應

- **WHEN** 管理員在共享收件匣中點擊「接手對話」
- **THEN** 系統 SHALL 暫停該對話的 AI 自動回應，允許管理員以人工方式直接回覆用戶

#### Scenario: 交還給 AI

- **WHEN** 管理員完成人工回應後點擊「交還給 AI」
- **THEN** 系統 SHALL 恢復 AI 助理對該對話的自動回應功能

### Requirement: AI 助理指標

頁面 SHALL 顯示 AI 助理指標：總對話數、解決率、平均回應時間、升級率。

#### Scenario: 查看指標儀表板

- **WHEN** 管理員進入 AI 助理分析頁面
- **THEN** 頁面 SHALL 顯示以下指標：
  - 總對話數
  - AI 解決率（AI 已解決 / 總對話數）
  - 平均回應時間
  - 升級率（已升級 + 需人工介入 / 總對話數）

#### Scenario: 指標趨勢

- **WHEN** 管理員查看指標趨勢圖
- **THEN** 頁面 SHALL 顯示各指標隨時間變化的趨勢圖表

### Requirement: 逐空間開關 AI 助理

管理員 SHALL 能夠逐空間開啟或關閉 AI 助理。

#### Scenario: 關閉特定空間的 AI 助理

- **WHEN** 管理員在某空間的設定中關閉 AI 助理
- **THEN** AI 助理 SHALL 立即停止在該空間中回應新問題

#### Scenario: 開啟特定空間的 AI 助理

- **WHEN** 管理員在某空間的設定中開啟 AI 助理
- **THEN** AI 助理 SHALL 開始在該空間中回應用戶問題

### Requirement: 備用訊息設定

AI 助理 SHALL 在無法找到相關資訊時使用可設定的備用訊息。

#### Scenario: 設定備用訊息

- **WHEN** 管理員在 AI 助理設定頁面編輯備用訊息
- **THEN** 系統 SHALL 儲存該訊息，當 AI 無法找到相關資訊時使用此訊息回應

#### Scenario: 觸發備用訊息

- **WHEN** AI 助理在知識庫中找不到與用戶問題相關的資訊
- **THEN** AI 助理 SHALL 顯示管理員設定的備用訊息
