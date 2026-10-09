---
name: product-status-check
description: 規劃或實作前查核相關 codebase 的行為與需求差異，區分實作、測試、部署及實際可用證據。
---

先讀 [AI 檢核與人工審核共用流程](../../docs/ai-human-review-workflow.md)，依當前客戶端可用工具執行；先完成適用檢核與修訂，再交人審核決策。


# 查核需求現況

產品文件和程式索引都可能過期。以此次可核對證據說明目前實作，保留產品需求作為預期行為；兩者衝突時呈現差異，不自行改寫產品決策。

1. 辨認本次情境與相關子專案。從 repo root、`projects/` 或實際 sibling checkout 定位，不因固定路徑找不到就宣稱功能不存在。記錄 repo、branch／HEAD 與相關未提交差異。
2. 用 `rg` 定位頁面、事件、服務與測試；只追蹤本需求涉及的資料流、權限、flag、mock、讀寫與錯誤行為。跨 repo 查必要依賴，不每次掃描全專案。
3. 將「目前行為／希望改動／影響與待確認」寫成白話，附關鍵檔案或版本依據。既有能力可重用，也可被新需求刻意改變。
4. 分開報告證據：程式存在只證明有實作；測試通過需版本、命令與結果；部署需環境及版本記錄；實際可用需該環境操作或資料回讀。未執行的檢查標未驗證。
5. 回傳結果給需求或開發流程。只讀查核不順手更改產品文件；獲授權更新時只修正有證據的狀態，保留尚待實作的產品意圖。

無法讀取 codebase 時仍可起草需求，標「現況未驗證」與缺少的來源。不以查無關鍵字證明功能不存在；純後端功能也不以缺少 UI 判未完成。參考原型與目標實作 checkout 分開查核。

## 定位線索

依專案指引追蹤前端／App、server API、AI backend、storage schema 與 migration、worker、admin UI 或 infra。檔名與地圖只能用來定位，結論回到實際檔案。

可讀 `scripts/product_status_manifest.yml`；需要整體漂移檢查時才執行 `scripts/check_product_status.py --verbose --projects-dir <各 repo 的實際上層目錄>`。先確認腳本介面與目錄。Manifest 和腳本結果是程式 signal，不是上線證據；workflow 檔存在也不代表執行成功。本次只是需求查核時不新增 manifest 項目或啟動部署。
