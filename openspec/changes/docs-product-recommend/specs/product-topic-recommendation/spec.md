## ADDED Requirements

### Requirement: Dashboard SHALL display personalized topic recommendations
產品首頁 MUST 在主題實踐區塊下方提供「探索相關主題」推薦區塊，並在使用者已登入時顯示最多 3 張與使用者個人興趣、當前主題實踐或相關行為訊號有關的推薦卡片。

#### Scenario: Render initial recommendation cards
- **WHEN** 已登入使用者進入產品首頁且系統可取得至少 1 筆可用推薦
- **THEN** 系統 MUST 在主題實踐區塊下方顯示「探索相關主題」區塊與最多 3 張推薦卡片

#### Scenario: Exclude completed fixed section from occupying the recommendation slot
- **WHEN** 產品首頁渲染主題實踐與推薦版位
- **THEN** 系統 MUST 不再於相同首頁區域顯示原本固定的「已完成」區塊，避免擠壓推薦版位

### Requirement: Recommendation cards SHALL expose explainable card data
每張推薦卡片 MUST 提供穩定且可顯示的卡片資料，包含標題、簡短描述、作者資訊、標籤、推薦理由、AI 推薦聲明與可追蹤的推薦識別資訊。

#### Scenario: Return required recommendation card fields
- **WHEN** 系統回傳首頁推薦卡片資料
- **THEN** 每張卡片 MUST 至少包含 `recommendationId`、`targetType`、`targetId`、`title`、`description`、`creator`、`tags`、`matchReasonCode`、`matchReasonText`、`feedbackState` 與 `isAiGenerated`

#### Scenario: Show explainable recommendation reason
- **WHEN** 使用者查看任一推薦卡片
- **THEN** 系統 MUST 顯示對應該卡片的推薦理由文案，且該理由 MUST 可映射到明確的推薦依據類型

### Requirement: Recommendation service SHALL rank cards from supported user signals
系統 MUST 根據使用者專業領域、想探索的領域、相似用戶、目前進行中的主題實踐、瀏覽內容與歷史推薦互動訊號產出個人化排序結果，並允許在冷啟動情境下回傳可用結果。

#### Scenario: Rank with active user context
- **WHEN** 使用者具備專業領域、想探索領域或進行中的主題實踐資料
- **THEN** 系統 MUST 使用這些訊號參與推薦候選排序並回傳與其情境相關的推薦卡片

#### Scenario: Serve recommendation under cold start
- **WHEN** 使用者缺少足夠的主題實踐、瀏覽或互動歷史
- **THEN** 系統 MUST 仍能至少根據已知興趣欄位或相似用戶訊號回傳可用推薦，而不是直接失敗

### Requirement: Recommendation section SHALL support asynchronous loading and refill
推薦區塊 MUST 可獨立於首頁主內容非同步載入，且在使用者隱藏單一卡片後，系統 MUST 優先補上一張新的推薦卡片；若無更多推薦，則以空狀態或縮短後的列表呈現。

#### Scenario: Load recommendations without blocking main dashboard content
- **WHEN** 使用者進入產品首頁
- **THEN** 系統 MUST 允許主題實踐主內容先顯示，推薦區塊再獨立載入，不得因推薦延遲阻塞主要內容

#### Scenario: Refill card after hide feedback
- **WHEN** 使用者確認隱藏一張推薦卡片且仍有其他可用推薦
- **THEN** 系統 MUST 以不包含已顯示與已隱藏目標的結果補上一張新的推薦卡片

### Requirement: Recommendation section SHALL provide a defined empty state
當系統沒有可顯示的推薦內容，或使用者已透過不喜歡操作移除當前所有推薦卡片時，首頁 MUST 顯示專用空狀態，而不是顯示空白版位。

#### Scenario: Show empty state when no recommendation is available
- **WHEN** 推薦 API 回傳 0 筆結果
- **THEN** 系統 MUST 顯示包含圖示、標題、描述與 CTA 的空狀態內容

#### Scenario: Redirect from empty state CTA
- **WHEN** 使用者點擊推薦空狀態 CTA
- **THEN** 系統 MUST 導向或切換至既有「靈感」分頁

### Requirement: Recommendation interactions SHALL be measurable
系統 MUST 對推薦區塊建立可觀測事件，至少支援追蹤卡片曝光、點擊、喜歡、不喜歡與從推薦卡片進入加入主題流程的轉換。

#### Scenario: Track recommendation engagement events
- **WHEN** 使用者瀏覽並操作推薦區塊
- **THEN** 系統 MUST 能記錄區塊或卡片層級的曝光、點擊、喜歡與不喜歡事件

#### Scenario: Track join conversion from recommendation
- **WHEN** 使用者從推薦卡片進一步進入加入主題或相關行動流程
- **THEN** 系統 MUST 能將該行為歸因到首頁推薦區塊的轉換事件
