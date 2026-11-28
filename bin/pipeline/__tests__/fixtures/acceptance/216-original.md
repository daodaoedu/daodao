這張之前由工程師關閉、未經 PM 驗收，依 [#290](https://github.com/daodaoedu/daodao/issues/290) 重新打開；2026-10-10 已在 dev 重新冒煙通過。

## 🙋 請驗收：後台「信件模板」編輯頁修好了（不再空白、預覽看得到、可停用寄送）

@peggy1213-create 修正已部署到 admin-dev，AI 在 2026-10-10 重新冒煙 11/11 通過（8 條正常操作＋3 條錯誤情境），請幫忙驗收。

- 測試網址：
  - [後台模板列表](https://admin-dev.daodao.so/admin/email-templates)
  - [「歡迎信」編輯頁](https://admin-dev.daodao.so/admin/email-templates/1/edit)
  - [「測試」模板編輯頁](https://admin-dev.daodao.so/admin/email-templates/24/edit)（專門給啟停測試用，沒有任何信會用到它）
- 測試帳號：用你平常登入 admin-dev 的管理員帳號（需要管理員權限）。
- ⚠️ 重要：自從 [#236](https://github.com/daodaoedu/daodao/issues/236) 上線後，後台模板是真的會影響寄出去的信。驗收時**只對「測試」模板按啟停**、**不要在其他模板按「儲存」**，也不要用「手動發信」寄給真實使用者。
- 驗收步驟：
  1. 先登出（或開無痕視窗），直接點[「歡迎信」編輯頁](https://admin-dev.daodao.so/admin/email-templates/1/edit)，應該被帶到登入頁，看不到模板（對應 issue「把登入加回去」）。
  2. 登入後打開[後台模板列表](https://admin-dev.daodao.so/admin/email-templates)，應該看到 24 個模板，每一列右側有啟用／停用寄送的按鈕（對應「新增信件模板『啟用／停用寄送』操作介面」）。
  3. 點[「歡迎信」編輯頁](https://admin-dev.daodao.so/admin/email-templates/1/edit)：HTML 編輯區有彩色語法標示、橫向撐滿整個寬度，拖右下角可以把它拉高拉矮；往下捲，預覽區在編輯區**下方**，看得到整封信的樣子（對應「修正編輯頁空白與預覽未顯示內容」「HTML 編輯區改為全寬、可垂直調整高度；預覽區移至下方」「信件預覽改用更穩定的 iframe 渲染方式」）。
  4. 在 HTML 編輯區上方，「本模板使用的變數」應該顯示 `{{name}}` 這樣的標籤（對應「預覽變數移到 HTML 區上方，顯示如 {{name}}、{{practiceUrl}} 的文字標籤」）。
  5. 在「搜尋全站變數」輸入 `practice`，下方多出「全站可用變數」列出 `{{practiceUrl}}`、`{{practiceTitle}}`；上面「本模板使用的變數」不會因此改變（對應「全站變數搜尋改為唯讀結果」）。
  6. 在 HTML 編輯區最後隨便打幾個字，預覽區應該立刻出現這幾個字；按預覽右上角的「手機」，預覽會變窄成手機寬度（對應「預覽會反映 HTML 內容」）。**做完直接按左上「返回」，不要按儲存。**
  7. 打開[「測試」模板編輯頁](https://admin-dev.daodao.so/admin/email-templates/24/edit)，按右上「停用寄送」→ 按鈕變成「啟用寄送」；再按一次「啟用寄送」→ 變回「停用寄送」。回到[後台模板列表](https://admin-dev.daodao.so/admin/email-templates)，在「測試」那一列的按鈕也做一次停用 → 啟用。**最後請確認「測試」是啟用狀態**（對應「啟用／停用寄送操作介面，不顯示額外的發送狀態欄位」）。
  8. 按左側選單上的「隱藏側邊欄」，側邊欄收起來，畫面上方出現「顯示側邊欄」按鈕；按它，側邊欄回來（對應「側邊欄可隱藏，並可從上方按鈕重新開啟」）。
- 對照的 AC：本 issue 內文「前端管理後台調整」八點（本卡沒有另外的驗收契約表，以內文條列為準）。
- AI 驗證報告：[Task 216／219／236 dev 冒煙報告 2026-10-10](https://docs.google.com/document/d/1IfqF1idicmexahkks2aDquhrVLmKHRT6qJccn8fDHAU/edit)（#216 段落）
- 已知限制／這次沒做的：
  - [#219](https://github.com/daodaoedu/daodao/issues/219) 是本卡的重複卡（標題與內容完全相同），這張驗收通過後 #219 可一起關閉。
  - 「預覽變數填值／從用戶選取」與資料來源選擇器依本卡內文移除，沒有還原；需要的話另開卡。
  - 編輯頁按「儲存」時，「本模板使用的變數」會以 HTML 裡偵測到的變數覆蓋後台原本登記的變數清單（例如歡迎信原本登記 3 個，存檔後只剩 `name`）。不影響寄信，但會改到資料；這次冒煙已還原，建議另開卡評估。
  - 「後台改了模板，寄出的信真的跟著變」屬於 [#236](https://github.com/daodaoedu/daodao/issues/236)，請在那張驗收。

✅ 通過 → 直接關掉這張 issue，卡片會自動移到 Done
❌ 有問題 → 留言寫哪一條 AC 沒過、看到什麼，再把卡片移到 Need Fix

