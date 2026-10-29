<!-- daodao-delivery:central-<N> -->

## 開發結果：<目前語意狀態>

schemaVersion: 1
templateVersion: 1

- 中央 Issue／本子 Issue：<完整 refs + URLs>
- Run ID／run URL／stage／sequence／state version：<值>
- 事件 key：<issue + run + stage + sequence>；最後更新：<ISO 時間>
- 模式／writer／reviewer：<local|auto / provider / 獨立 reviewer>
- Lease owner／fencing token：<值；未啟用則明列限制>
- 契約版本／acceptance key／spec digest／POC digest：<值>
- 需求／POC／AC snapshot：<URLs>

| Repo | 子 Issue | Base／head SHA | PR／狀態 | 驗證與部署狀態 |
|---|---|---|---|---|
| <repo> | <URL> | <完整 SHAs> | <URL／狀態> | <結果、backend image/schema、smoke> |

- AC：<pass X/Y；fail、blocked、not-run、N/A 理由清單>
- 驗收報告／manifest／截圖與 POC 並排：<URLs、digests>
- 後端串接：<結果、request → response → 同 ID 回讀／reload 證據>
- 品質與獨立 review：<checks、finding disposition、未解 blocker>
- POC 差異：<none 或差異與具權限批准 record、適用版本>
- 人工驗收：<pending/approved/rejected、批准者／時間／GitHub record／acceptance key>
- 額度：<Claude／Codex 各自狀態、觀測時間、用盡錯誤與接手方式>
- Workers AI：<estimated/actual Neurons、unknown 則明列；budget stop／下次 reset／paid fallback 是否發生>
- 未完成／阻塞：<none 或原因、責任人、保留成果 URL、下一步>
- 回報同步：<pending/synced/report-pending；Issue/Drive 回讀確認時間>
- 下一步：<責任人、具體操作；不要把待驗收或已合併寫成 Done>

<!-- 手動使用：將 marker 的 N 換為中央 Issue 號碼，更新同一摘要。子 Issue 留言也引用同一中央編號。未來 reporter 必須驗證最新 run/state version/fencing token 並回讀；更新同一則留言的做法見 develop finish 步驟 10（marker 查找後 PATCH）。 -->

---

## 交給 PM 驗收（verify-deploy 移 Acceptance 時發）

給 PM 看的白話留言，不放 SHA、run ID 等工程欄位（那些留在上面的開發結果摘要）。每個 `<...>` 都要換掉。

**PM 步驟與工程證據分開寫**（#370、#358 都因為混在一起被 PM 判 BLOCKED 退回）：

- 「驗收步驟」只放 PM 在畫面上做得到、看得到的操作與預期：點哪裡、填什麼、重新打開後畫面顯示什麼。不寫 API、HTTP 方法（PUT／GET…）、送出內容（body／request／response）、回讀、regression test、log、curl、console，也不給 server-dev 或 `/api/` 網址。
- API 送出內容與回讀、regression test、CI、log 一律放「工程證據（已驗，PM 不需重做）」，每項附冒煙留言、PR 或 CI 連結。
- 預期值要寫出處：數量、顏色、文案這類預期結果，寫上從哪裡來（locale key、commit、哪天取的值）。預期值會隨共用資料變動時，改成相對寫法，例如「比原本多 1 筆」，不要寫死數字（#216、#152；寫法可參考 #386）。
- 要多個角色同時操作的步驟：寫明需要開幾個瀏覽器、各登入哪個帳號。PM 一次只有一個登入狀態時，把那一步改成工程證據，不列進 PM 步驟（#154、#344）。
- App 暫不驗收（2026-10-29 起，沒有可安裝測試版）：PM 步驟只寫網頁，App 步驟放「已知限制／這次沒做的」並註明「App 暫不驗收」；只改 App 的卡不交 PM，改走 `acceptance:engineering`（見 move-board-card「誰驗收」）。
- AC 只能用 API 或測試驗（畫面看不出差別）→ 標成工程驗收項，只列在工程證據，不寫進 PM 步驟；整張卡都看不出差別的應掛 `acceptance:engineering`，不進 Acceptance。
- issue 內文驗收契約的「必須證據」欄若寫了 API 回讀或測試，PM 會照著要；所以「對照的 AC」要寫明那些由工程提供、PM 依畫面判定。
- 第一行的隱藏標記 `<!-- daodao:acceptance-request -->`、標題 `## 🙋 請驗收：…` 與 `@peggy1213-create` 必須在同一則留言、不可改寫：PM 驗收工具（[test-acceptance](../skills/test-acceptance/SKILL.md)）靠標記找出這則留言，缺任一個就判 BLOCKED（#245、#346）。標記在 GitHub 上看不到，不影響 PM 閱讀。
- 發出前跑 `pnpm -s tsx bin/pipeline/acceptance-lint.ts <留言檔>`，有 error 不發。`warn [quoted-copy-not-in-locale]` 代表步驟用「」引用的文字在 f2e 的 zh-TW locale 找不到：是畫面文案就對照畫面改正（#346 全形「！」對半形「!」、#333 舊文案「帶領人」已改「教練」）；是使用者輸入的內容或步驟描述就忽略。

```markdown
<!-- daodao:acceptance-request -->
## 🙋 請驗收：<功能一句話>

@peggy1213-create 開發完成，已部署到 dev，AI 冒煙也通過了，請幫忙驗收。

- 測試網址：<直接點進對應頁面的 dev 網址>
- 測試帳號：<PM 的 admin 測試帳號或一般使用者測試帳號（見 test-acceptance environment.md）；要團主／團友身分就寫該帳號已加進哪個組織／場次。不指定 fixture 帳號（PM 只能 Google 登入，用不了 dev-login）；不貼密碼>
- 驗收步驟（只看畫面）：
  1. <操作>，應該看到 <結果>（對應 AC-01）
  2. <操作>，應該看到 <結果>（對應 AC-02）
- 對照的 AC：本 issue 內文「驗收契約」。請依畫面判定；「必須證據」欄的 API 回讀與測試由工程提供，見下方工程證據
- 工程證據（已驗，PM 不需重做）：
  - <AC-0x 的 API 送出內容／回讀>：[dev 冒煙留言](<留言連結>)
  - <AC-0x regression test>：[<repo>#<PR>](<PR 連結>) 的 CI test job
  - 工程驗收項（畫面看不出，不列入上面步驟）：<AC ID 與一句理由；沒有就寫 none>
- AI 驗證報告：[Task <n> 驗證報告](<Google 文件連結>)
- 已知限制／這次沒做的：<none 或清單，附子 issue 連結>
- 驗完收尾：<驗收會建立的資料（實踐、場次、邀請…）要怎麼處理：刪除或封存的畫面步驟，或「保留，工程會清」；不會建立資料就寫 none>

✅ 通過 → 直接關掉這張 issue，卡片會自動移到 Done
❌ 有 AC 沒過 → 留言寫「哪一條 AC 沒過、看到什麼」，再把卡片移到 Need Fix
⏸ 測不了（網址打不開、截圖傳不上去、帳號登不進去）→ 卡片留在 Acceptance、加 `acceptance:blocked` 標籤、留言 @vincentxuu 說卡在哪一步；不要移 Need Fix
➕ 想加新要求或改文案（原本的 AC 沒寫到）→ 另開一張卡，內文寫「相關：#<本卡號>」；這張依原本的 AC 判定通過或退回
```
