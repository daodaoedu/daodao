## ADDED Requirements

### Requirement: 三項專業見證指標定義
系統 SHALL 支援以下三種見證類型，用於量化一段實踐歷程的專業影響力：
- **Insightful（深具啟發）**：專業同儕主動標記此實踐「深具啟發」
- **Referenced（實踐引用）**：其他使用者將此實踐存入靈感庫作為未來實踐參考
- **Witnessed（同儕見證）**：使用者主動標記已閱讀並見證此完整歷程

#### Scenario: 使用者標記 Insightful
- **WHEN** 使用者對一段完成的實踐點選「Insightful」
- **THEN** 系統 SHALL 記錄該使用者對該實踐的 Insightful 見證，且同一使用者對同一實踐 SHALL 只能標記一次

#### Scenario: 使用者標記 Referenced
- **WHEN** 使用者將某實踐存入自己的靈感庫
- **THEN** 系統 SHALL 記錄一筆 Referenced 見證，且同一使用者對同一實踐 SHALL 只能觸發一次計數

#### Scenario: 使用者標記 Witnessed
- **WHEN** 使用者主動點選「見證此歷程」
- **THEN** 系統 SHALL 記錄一筆 Witnessed 見證，且同一使用者對同一實踐 SHALL 只能標記一次

---

### Requirement: 見證指標不含按讚與一般留言
導出文件與見證指標顯示 SHALL NOT 包含按讚數（like count）或一般留言數。

#### Scenario: 導出文件無按讚資訊
- **WHEN** 導出 PDF 或 Markdown
- **THEN** 導出文件 SHALL NOT 顯示任何按讚數、愛心數或一般留言計數

---

### Requirement: 見證計數聚合 API
後端 SHALL 提供 API，於導出時一次回傳實踐的三項見證計數。

#### Scenario: 導出資料包含見證計數
- **WHEN** 客戶端呼叫 `GET /api/v1/practices/:id/export`
- **THEN** 回應 SHALL 包含 `socialProof` 物件，含 `insightfulCount`、`referencedCount`、`witnessedCount` 三個整數欄位

#### Scenario: 無任何見證時計數為零
- **WHEN** 實踐尚無任何使用者標記見證
- **THEN** 三項計數 SHALL 均回傳 `0`，不回傳 null 或 undefined

---

### Requirement: 見證指標顯示於導出文件
PDF 與 Markdown 導出文件 SHALL 在見證區塊顯示三項指標的數值。

#### Scenario: PDF 見證區塊呈現
- **WHEN** PDF 生成完成
- **THEN** PDF SHALL 包含標示 Insightful、Referenced、Witnessed 計數的專屬區塊，即使計數為 0 亦需顯示

#### Scenario: Markdown 見證資訊呈現
- **WHEN** Markdown 導出完成
- **THEN** `.md` 文件 SHALL 包含以 Markdown 表格或列表格式呈現的三項見證計數
