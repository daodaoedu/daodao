## 🙋 請驗收：App 編輯公開實踐不改隱私存檔仍維持公開

@peggy1213-create 開發完成，已部署到 dev，AI 冒煙也通過了，請幫忙驗收。

- 測試網址：https://app-dev.daodao.so
- 測試帳號：驗收 fixture 學員帳號
- 驗收步驟：
  1. 在 App 編輯公開實踐，不改直接儲存，PUT body 應帶 `privacyStatus:"public"`（AC-02.3）
  2. 儲存後 GET 詳情回讀仍是 public（AC-02.3）
  3. 檢查 server 與 App mapping 的 regression test 輸出都通過（AC-02.6）
  4. 用 curl 打詳情確認 response 有 privacyStatus（AC-02.1）
- 對照的 AC：本 issue 內文「驗收契約」
- 工程證據（已驗，PM 不需重做）：none
- AI 驗證報告：[dev 冒煙報告](https://docs.google.com/document/d/x)
- 已知限制／這次沒做的：none
