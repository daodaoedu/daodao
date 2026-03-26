## **Purpose**

本功能旨在提供一個「資產化前置界面」，讓使用者在正式導出前，能對其長期的實踐紀錄進行結構化的整理。

**Scope**

* **數據源：** 特定實踐主題的內容及所有Check-ins。  
* **格式支援：** PDF、Markdown

## **Functional Requirements**

### **格式支援**

* **PDF 渲染引擎 (PDF Rendering)**  
  * **生成內容：** 包含實踐內容、check-in、 使用者名稱、覆盤。  
  * **自適應分頁：** 圖片不應在頁面中斷處被切割，需具備內容偵測並自動跳頁。  
* **Markdown 結構化導出 (Markdown Export)**  
  * 提供包含 YAML front matter的標準格式。  
  * 圖片匯出至.JPG  
* **數位驗證連結 (Link Persistence & QR Code)**  
  * 在 PDF 結尾生成 QR Code，掃描後可導回該實踐頁面

### **使用限制**

* 於實踐狀態為完成時才可使用匯出功能  
* 狀態為非「封存」才可匯出為 pdf

**預設檔名**

* **PDF & Markdown 檔案命名規範：** 預設檔名為 `[DaoDao_主題實踐]_[主題名]_[使用者名]_[完成日期]`  
* `Markdown 圖片：[打卡日期-(數字)],如 2026–2-22(1)`

## **Test Points**

* **完整性：** 驗證包含超過 30 則圖文 Check-in 的長實踐，是否能 100% 完整顯示。  
* **順序性：** 確認 Check-in 排序是否嚴格遵守時間由舊到新（或由新到舊，依設定而定）。  
* PDF QR code: 確認 QR code 連回該實踐


