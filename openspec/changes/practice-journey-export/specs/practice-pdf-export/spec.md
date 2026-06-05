## ADDED Requirements

### Requirement: 導出入口僅於完成狀態開放
實踐的 PDF 導出功能 SHALL 僅在實踐狀態為 `completed` 時顯示並可使用。
狀態為 `archived` 的實踐 SHALL NOT 提供 PDF 導出。

#### Scenario: 完成狀態顯示導出按鈕
- **WHEN** 使用者瀏覽狀態為 `completed` 的實踐詳情頁
- **THEN** 系統 SHALL 顯示「導出 PDF」按鈕

#### Scenario: 封存狀態隱藏導出按鈕
- **WHEN** 使用者瀏覽狀態為 `archived` 的實踐詳情頁
- **THEN** 系統 SHALL NOT 顯示「導出 PDF」按鈕

#### Scenario: 後端驗證封存限制
- **WHEN** 客戶端對狀態為 `archived` 的實踐呼叫 export API
- **THEN** 後端 SHALL 回傳 HTTP 403 並拒絕請求

---

### Requirement: 僅實踐擁有者可導出 PDF
Export API SHALL 要求認證，且僅允許該實踐的擁有者（`practices.user_id`）存取。

#### Scenario: 非擁有者呼叫 export API 被拒絕
- **WHEN** 已認證的使用者對「不屬於自己」的實踐呼叫 export API
- **THEN** 後端 SHALL 回傳 HTTP 403

#### Scenario: 未認證呼叫 export API 被拒絕
- **WHEN** 未攜帶有效 token 的請求呼叫 export API
- **THEN** 後端 SHALL 回傳 HTTP 401

---

### Requirement: PDF 包含完整實踐內容
導出的 PDF SHALL 包含以下所有區塊，依序排列：
1. 實踐主題標題與行動描述
2. 實踐時間範圍（開始日 ～ 完成日）與持續天數
3. 所有 Check-ins（按時間由舊到新排序），每筆含：日期、心情、文字內容、圖片、標籤
4. 最終覆盤（Reflection）
5. 專業見證指標（Insightful / Referenced / Witnessed 計數）
6. 末頁 QR Code 與原始實踐網址

#### Scenario: Check-in 時序排列
- **WHEN** 使用者觸發 PDF 導出
- **THEN** 系統 SHALL 將所有 Check-ins 依 `checkin_date` 升序（由舊到新）排列於 PDF 中

#### Scenario: 圖片完整嵌入
- **WHEN** Check-in 包含圖片（最多 3 張）
- **THEN** PDF SHALL 嵌入所有圖片，且圖片不得在跨頁處被裁切

#### Scenario: 無覆盤時省略該區塊
- **WHEN** 實踐無最終覆盤內容
- **THEN** PDF SHALL 省略覆盤區塊，不顯示空白欄位

#### Scenario: 0 筆 Check-in 時仍可導出
- **WHEN** 實踐狀態為 `completed` 但無任何 Check-in 紀錄
- **THEN** 系統 SHALL 仍生成 PDF，Check-in 區塊顯示提示文字（如「尚無打卡紀錄」），不報錯

---

### Requirement: PDF 自適應分頁
PDF 渲染引擎 SHALL 偵測內容高度並自動換頁，確保圖片與段落不在頁面中斷處被切割。

#### Scenario: 圖片不跨頁
- **WHEN** 單張圖片高度超過剩餘頁面空間
- **THEN** 系統 SHALL 在圖片前插入分頁，使圖片完整顯示於新頁面

#### Scenario: 長文字自動換頁
- **WHEN** Check-in 文字內容超過單頁剩餘空間
- **THEN** 系統 SHALL 允許文字跨頁延伸（文字可分割，圖片不可）

---

### Requirement: PDF 末頁附 QR Code
PDF 最後一頁 SHALL 包含一個可掃描的 QR Code，掃描後導向該實踐的永久公開網址。

#### Scenario: QR Code 可掃描且連結正確
- **WHEN** 使用者掃描 PDF 末頁 QR Code
- **THEN** 行動裝置 SHALL 導向該實踐的正確平台網址

#### Scenario: 網址永久有效
- **WHEN** 導出 PDF 生成後 365 天以上
- **THEN** QR Code 對應的網址 SHALL 仍能正確解析並顯示實踐內容

---

### Requirement: PDF 預設檔名規範
PDF 檔案 SHALL 以 `[DaoDao_主題實踐]_[主題名]_[使用者名]_[完成日期]` 命名。

#### Scenario: 預設檔名格式正確
- **WHEN** PDF 生成完成並觸發下載
- **THEN** 下載檔案的預設名稱 SHALL 符合規範格式，例如：`[DaoDao_主題實踐]_學習 React_小明_2026-03-01.pdf`

#### Scenario: 主題名含特殊字元時自動 sanitize
- **WHEN** 主題名稱含有檔名非法字元（如 `/` `:` `?` `*` `\` `"` `<` `>`）
- **THEN** 系統 SHALL 將這些字元替換為 `-`，不影響 PDF 內部顯示的原始主題名稱

---

### Requirement: PDF 導出效能
前端生成包含 30 則圖文 Check-in 的 PDF SHALL 在 3 秒內完成。

#### Scenario: 標準 30 筆資料效能
- **WHEN** 實踐含 30 則 Check-in（每則含最多 3 張圖片）並觸發 PDF 導出
- **THEN** 從按下導出按鈕到瀏覽器觸發下載 SHALL 不超過 3 秒（測試環境：穩定 Wi-Fi + 中階裝置）

---

### Requirement: PDF 跨裝置可讀性
導出的 PDF SHALL 在行動裝置與桌機瀏覽器均保持高度可讀性，圖片不發生跑版。

#### Scenario: 行動裝置閱讀
- **WHEN** 使用者在行動裝置上開啟導出的 PDF
- **THEN** 文字字級 SHALL 不小於 10pt，圖片 SHALL 不超出頁面邊界
