## ADDED Requirements

### Requirement: 高品質門檻判定
系統 SHALL 於 PDF 導出時動態判定實踐是否符合高品質門檻。
符合條件：實踐持續天數 ≥ 14 天 **且** Insightful 計數 ≥ 3。

#### Scenario: 同時符合兩項條件
- **WHEN** 實踐持續 14 天以上，且 Insightful 計數 ≥ 3
- **THEN** 系統 SHALL 將 `isVerified: true` 回傳至前端

#### Scenario: 僅持續天數符合但 Insightful 不足
- **WHEN** 實踐持續 20 天，但 Insightful 計數為 2
- **THEN** 系統 SHALL 回傳 `isVerified: false`，不附加驗證章

#### Scenario: 僅 Insightful 足夠但持續天數不足
- **WHEN** 實踐持續 10 天，但 Insightful 計數為 5
- **THEN** 系統 SHALL 回傳 `isVerified: false`，不附加驗證章

---

### Requirement: 驗證章僅出現於 PDF
數位驗證章 SHALL 僅嵌入 PDF 導出文件，Markdown 導出 SHALL NOT 包含驗證章圖像。
Markdown 導出中 SHALL 以 YAML front matter 欄位 `verified: true` 標記驗證狀態。

#### Scenario: PDF 顯示驗證章
- **WHEN** 實踐符合高品質門檻並觸發 PDF 導出
- **THEN** 生成的 PDF SHALL 在封面或指定位置顯示 Dao Dao 官方驗證章圖像

#### Scenario: 不符合門檻的 PDF 無驗證章
- **WHEN** 實踐不符合高品質門檻並觸發 PDF 導出
- **THEN** 生成的 PDF SHALL NOT 顯示任何驗證章

#### Scenario: Markdown 以 front matter 標記
- **WHEN** 實踐符合高品質門檻並觸發 Markdown 導出
- **THEN** 導出的 `.md` YAML front matter SHALL 包含 `verified: true`

---

### Requirement: 驗證資格於導出時動態計算
驗證資格 SHALL 於每次呼叫 export API 時即時計算，不預先儲存於資料庫。

#### Scenario: 導出 API 回傳驗證狀態
- **WHEN** 客戶端呼叫 `GET /api/v1/practices/:id/export`
- **THEN** 回應 SHALL 包含 `isVerified: boolean` 欄位

#### Scenario: 驗證狀態反映最新見證計數
- **WHEN** 使用者在第 3 筆 Insightful 標記後立即觸發導出
- **THEN** 導出 API SHALL 回傳 `isVerified: true`（若持續天數條件亦符合）
