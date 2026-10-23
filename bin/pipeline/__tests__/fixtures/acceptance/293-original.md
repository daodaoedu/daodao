PR 已 merge 並部署到 dev，2026-10-10 dev 冒煙通過，交 PM 驗收。

## 🙋 請驗收：關注的人或實踐被刪掉後，「關注設定」的列表和總筆數不再對不上

@peggy1213-create 修正已部署到 dev，AI 在 2026-10-10 冒煙 8/8 通過（6 條正常操作＋2 條錯誤情境），請幫忙驗收。

- 測試網址：
  - [關注設定](https://app-dev.daodao.so/zh-TW/settings/following)
  - [小許的關注列表（系統回傳的原始資料，瀏覽器直接打開就能看）](https://server-dev.daodao.so/api/v1/users/58b915af-c361-4900-a6af-53b082a7f62c/following)
  - [同上，每頁只顯示 1 筆](https://server-dev.daodao.so/api/v1/users/58b915af-c361-4900-a6af-53b082a7f62c/following?limit=1&page=1)
- 測試帳號：第 1、2 步不用登入。第 3～6 步需要兩個帳號：用「Peggy test2」當實踐擁有者、「peggytest」當關注者（都是你平常登入 app-dev 的 Google 帳號）。
- 驗收步驟：
  1. 打開[小許的關注列表](https://server-dev.daodao.so/api/v1/users/58b915af-c361-4900-a6af-53b082a7f62c/following)。小許在 dev 上其實有 4 筆關注紀錄，其中 3 筆的對象已經被刪掉了。畫面上的文字裡應該只有 1 筆（名字是「小安」），而且最後面 `"totalItems":1`（總筆數＝1，不是 4）（對應 AC-01）。
  2. 打開[每頁 1 筆的版本](https://server-dev.daodao.so/api/v1/users/58b915af-c361-4900-a6af-53b082a7f62c/following?limit=1&page=1)，應該看到 `"totalPages":1`、`"hasNext":false`（總頁數只算還存在的對象，不會出現點下一頁卻是空白的情況）（對應 AC-01）。
  3. 用「Peggy test2」登入 app-dev，建立一個實踐，名稱取「QA #293 可刪」，設成公開。
  4. 登出，改用「peggytest」登入，打開這個實踐，按右上角「⋯」→「關注」。再打開[關注設定](https://app-dev.daodao.so/zh-TW/settings/following)，切到「關注的實踐」，應該看到「QA #293 可刪」。
  5. 登出，改回「Peggy test2」，把「QA #293 可刪」這個實踐刪掉。
  6. 再用「peggytest」打開[關注設定](https://app-dev.daodao.so/zh-TW/settings/following)，切到「關注的實踐」：「QA #293 可刪」應該不見了，也不會留下空白卡片或空白位置；如果你原本沒有關注其他實踐，會顯示「尚未關注任何實踐」（對應 AC-02：關注設定顯示的數量和列表一致）。
- 對照的 AC：本 issue 內文「驗收條件」
  - AC-01：關注目標已刪除的紀錄不出現在 following 回應，總筆數／總頁數與實際回傳的可顯示筆數一致
  - AC-02：關注設定頁顯示的數量與列表一致
- AI 驗證報告：[merge 後 dev 冒煙報告](https://docs.google.com/document/d/1oj2PqxB2M_Mzd2jLaeHHsHeNDWeuAmbq9C-8_Brwgeg/edit)（含截圖，email 已模糊）
- 已知限制／這次沒做的：
  - dev 上沒有任何帳號同時關注 2 個以上「還存在」的對象，所以「翻到第 2 頁」AI 只在本機驗過；第 2 步只能看到 1 頁的情況。
  - 前台關注設定頁這次沒有改程式，只是後端回傳的資料變正確了。
  - 網址帶錯格式的用戶 ID 回 500 的問題由 [#250](https://github.com/daodaoedu/daodao/issues/250) 一起修，請在那張卡驗收。

✅ 通過 → 直接關掉這張 issue，卡片會自動移到 Done
❌ 有問題 → 留言寫「哪一條 AC 沒過、看到什麼」，再把卡片移到 Need Fix

