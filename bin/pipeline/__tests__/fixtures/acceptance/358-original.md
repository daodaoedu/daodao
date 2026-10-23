## ✅ dev 冒煙通過（server-dev a7a114ca、app-dev 8b90bf40）

PR：[daodao-server#555](https://github.com/daodaoedu/daodao-server/pull/555)、[daodao-f2e#1093](https://github.com/daodaoedu/daodao-f2e/pull/1093)。驗證報告（含截圖）：[dev 冒煙報告 #333 #358 #359](https://docs.google.com/document/d/12Wb1YMh6ALtbAWkYsPbJZTIniWRuhgdspJS8AlVdJjw/edit?usp=drivesdk)

| AC | 結果 |
|---|---|
| AC-02.1 | ✅ 詳情 API 回 `privacyStatus`：public／delayed／private 各一筆皆正確；非擁有者讀公開實踐回 `public`；未登入讀公開 200、私人 403 |
| AC-02.2 | ✅ App 編輯頁開公開實踐，隱私選中「公開」；延遲公開實踐選中「延遲公開」 |
| AC-02.3 | ✅ App 不改直接存：PUT body `privacyStatus:"public"` → 200，回讀仍 `public`（延遲公開同理回讀 `delayed`） |
| AC-02.4 | ✅ App 改選「私人」存 → 200，回讀 `private` |
| AC-02.5 | ✅ 網頁 app-dev 編輯頁選中「即時公開」，不改直接存 → 200，回讀 `public`；未登入開實踐頁可見 |
| 結果頁提示 | ✅ 已結束的公開實踐開結果頁出現「你的實踐打卡內容已公開／已顯示在靈感廣場…／不再顯示」；私人實踐不出現 |

- App 以 Expo web 執行 daodao-f2e 8b90bf40 的 apps/mobile 連 server-dev（無實機，同 #333 做法）；帳號為驗收 fixture 學員，測試實踐為本次新建，測完已刪除並回讀 404。
- 範圍外觀察（未開卡）：App 選項顯示未翻譯 key（#360）；結果頁另有 `GET /checkins?limit=200` 回 400（server 上限 100）；結果頁 toast 說「已顯示在靈感廣場」，同頁仍有「公開至靈感廣場」按鈕，文案可能讓人困惑。

## 🙋 請驗收：App／網頁編輯公開實踐，沒改隱私就存檔，仍維持公開

@peggy1213-create 開發完成，已部署到 dev，AI 冒煙也通過了，請幫忙驗收。

- 測試網址：https://app-dev.daodao.so （網頁）；App 用 dev 版（已推送更新）
- 測試帳號：自己的 dev 帳號，或驗收 fixture 學員帳號
- 驗收步驟：
  1. 建一個隱私選「公開」的實踐，在 App 打開它 → 編輯，應該看到隱私設定選的是「公開」（AC-02.2）
  2. 什麼都不改直接按儲存，登出後再打開這個實踐，應該仍看得到（AC-02.3）
  3. 再編輯改成「私人」儲存，重新打開編輯頁應該選的是「私人」（AC-02.4）
  4. 在網頁編輯一個公開實踐，不改直接儲存，仍是公開（AC-02.5）
- 對照的 AC：本 issue 內文「驗收契約」
- AI 驗證報告：[dev 冒煙報告 #333 #358 #359](https://docs.google.com/document/d/12Wb1YMh6ALtbAWkYsPbJZTIniWRuhgdspJS8AlVdJjw/edit?usp=drivesdk)
- 已知限制／這次沒做的：App 選項文字顯示未翻譯 key，另見 [#360](https://github.com/daodaoedu/daodao/issues/360)

✅ 通過 → 直接關掉這張 issue，卡片會自動移到 Done
❌ 有問題 → 留言寫「哪一條 AC 沒過、看到什麼」，再把卡片移到 Need Fix

