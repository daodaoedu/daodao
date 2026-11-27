這張之前由工程師關閉、未經 PM 驗收，依 [#290](https://github.com/daodaoedu/daodao/issues/290) 重新打開；2026-10-09 已在 dev 重新冒煙通過。

## 🙋 請驗收：拿掉「新手任務」，只保留註冊流程

@peggy1213-create 開發完成，已部署到 dev，AI 冒煙也通過了（23 項全部 ✅），請幫忙驗收。

- 測試網址：
  - [dev 首頁](https://app-dev.daodao.so)
  - [dev 註冊流程頁](https://app-dev.daodao.so/auth/onboarding)（新帳號第一次登入時會自動帶到這裡）
  - [admin-dev 的 Onboarding 流程頁](https://admin-dev.daodao.so/admin/onboarding-flows)
  - [admin-dev 的用戶管理頁](https://admin-dev.daodao.so/admin/user-management)
- 測試帳號：前台用你自己的 Google 帳號登入 dev 即可；要看「新帳號註冊」可以用一個還沒在 dev 註冊過的 Google 帳號。後台用你平常的 admin 帳號登入 admin-dev。
- 驗收步驟：
  1. 用還沒註冊過的帳號登入 dev，應該會進到三步驟的註冊表單（個人資料 → 專業與興趣 → 從哪裡知道島島），填完送出後看到註冊成功（對應「僅保留註冊流程」）
  2. 註冊完回到首頁，畫面右下角應該只有一個「＋」按鈕，**不會再跳出「新手任務」的小視窗或任務清單**（對應「刪除新手任務 onboarding」）
  3. 在首頁按「＋」建立一個實踐、打一次卡、在實踐頁留一則言，三個動作都要能成功，而且過程中**不會跳出「完成任務」之類的提示**（對應「刪除新手任務」：原本這三個動作會算任務進度）
  4. 打開「設定」頁，修改個人標語後儲存，應該儲存成功，設定頁的完整度提示照常顯示（對應「保留註冊後的個人資料功能」）
  5. 新帳號驗證 email 後，信箱應該收到一封「【島島阿學】歡迎來到島島阿學！」歡迎信，之後**不會再收到新手任務系列信**（對應「歡迎信繼續寄、任務信移除」）
  6. 用 admin 帳號打開 admin-dev 的「Onboarding 流程」頁，下方「註冊後追蹤分析」應該只剩 A 學習風格、B 人物誌、C 參與度三區，沒有 Badge 完成率、完成天數、Email 開信率、註冊來源分布（對應「後台移除新手任務分析」）
  7. 打開 admin-dev 的「用戶管理」頁，表格不應再有 Onboarding／Badge／註冊來源相關的欄位或篩選，也沒有「未完成 Onboarding」的快捷篩選（對應「後台移除新手任務欄位」）
- 對照的 AC：本 issue 標題「刪除新手任務 onboarding，僅保留註冊流程」，以及上方 2026-09-20「驗收完成，已發 PR」留言中的決策（拆新手任務彈窗與整條任務鏈、資料庫先不動、歡迎信改成驗證 email 後直接寄）
- AI 驗證報告：[Task 218 dev 冒煙驗證報告 2026-10-09](https://docs.google.com/document/d/1lb1ZZ-GKZ-mQO_aFhKKpoSLnpQtnSWSJCNTFMIrIHuQ/edit)
- 已知限制／這次沒做的：
  - admin「Onboarding 流程」頁上方的「目前啟用的流程」會顯示「目前沒有啟用的流程」，這是另一個既有問題，已開卡追蹤：[#245](https://github.com/daodaoedu/daodao/issues/245)（不影響本張驗收）
  - 後台頁名還叫「Onboarding」，改名「註冊流程」另卡處理：[#246](https://github.com/daodaoedu/daodao/issues/246)
  - 資料庫裡的舊新手任務資料還沒清，另卡處理：[#244](https://github.com/daodaoedu/daodao/issues/244)
  - 部分頁面在窄螢幕的既有版面出界問題另卡追蹤：[#247](https://github.com/daodaoedu/daodao/issues/247)
  - 手機 App 這次沒有在手機上實際操作驗證

✅ 通過 → 直接關掉這張 issue，卡片會自動移到 Done
❌ 有問題 → 留言寫「哪一條步驟沒過、看到什麼」，再把卡片移到 Need Fix

