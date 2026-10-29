<!-- daodao:acceptance-request -->
## 🙋 請驗收：網頁實踐詳情／編輯頁支援自訂天數、頻率、每次時間

@peggy1213-create 開發完成，已部署到 dev，AI 冒煙也通過了，請幫忙驗收。

- 測試網址：https://app-dev.daodao.so/zh-TW/practices/create/manual
- 測試帳號：你平常的 dev 測試帳號
- 驗收步驟（只看畫面）：
  1. 用建立流程新增實踐：天數輸入 45、頻率輸入 1-3、每次時間輸入 25 分鐘、時機選「睡前」，完成建立
  2. 打開這筆實踐的詳情頁，應該顯示「一週 1-3 天、一次 25 分鐘」（AC-1）
  3. 按「⋯ → 編輯」，天數、頻率、分鐘欄位應該分別帶入 45、1-3、25，上面的預設選項都沒被選（AC-2）
  4. 只改名稱按「儲存」，重新打開詳情頁，天數、頻率、分鐘、時機都沒變（AC-3）
  5. 再進編輯頁改成別的天數／頻率／分鐘（點預設選項或自己輸入都試試），存檔後詳情頁顯示你選的值（AC-4）
- 對照的 AC：本 issue 內文「驗收契約」。請依畫面判定；「必須證據」欄的 API 回讀與測試由工程提供，見下方工程證據
- 工程證據（已驗，PM 不需重做）：
  - AC-3／AC-4 的 PUT body 與 GET 回讀：[dev 冒煙留言](https://github.com/daodaoedu/daodao/issues/370#issuecomment-6342530844)
  - AC-5 regression test：[daodao-f2e#1104](https://github.com/daodaoedu/daodao-f2e/pull/1104) 的 CI test job
  - 工程驗收項（畫面看不出，不列入上面步驟）：AC-5
- AI 驗證報告：[2026-10-22 dev 冒煙 #369／#297／#370](https://docs.google.com/document/d/1O0cn1UsQcudIed_JKIVQCtO6mUEVIc25_T-BdCC2aTE/edit?usp=drivesdk)
- 已知限制：App 端編輯頁是另一張卡，不在這次範圍

✅ 通過 → 直接關掉這張 issue，卡片會自動移到 Done
❌ 有問題 → 留言寫「哪一條 AC 沒過、看到什麼」，再把卡片移到 Need Fix
