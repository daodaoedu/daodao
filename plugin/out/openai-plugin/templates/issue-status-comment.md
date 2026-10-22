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

<!-- 手動使用：將 marker 的 N 換為中央 Issue 號碼，更新同一摘要。子 Issue 留言也引用同一中央編號。未來 reporter 必須驗證最新 run/state version/fencing token 並回讀；本範本尚未提供 upsert/outbox/reconciler。 -->

---

## 交給 PM 驗收（post-merge-wrapup 移 Acceptance 時發）

給 PM 看的白話留言，不放 SHA、run ID 等工程欄位（那些留在上面的開發結果摘要）。每個 `<...>` 都要換掉。

**PM 步驟與工程證據分開寫**（#370、#358 都因為混在一起被 PM 判 BLOCKED 退回）：

- 「驗收步驟」只放 PM 在畫面上做得到、看得到的操作與預期：點哪裡、填什麼、重新打開後畫面顯示什麼。不寫 API、HTTP 方法（PUT／GET…）、送出內容（body／request／response）、回讀、regression test、log、curl、console，也不給 server-dev 或 `/api/` 網址。
- API 送出內容與回讀、regression test、CI、log 一律放「工程證據（已驗，PM 不需重做）」，每項附冒煙留言、PR 或 CI 連結。
- AC 只能用 API 或測試驗（畫面看不出差別）→ 標成工程驗收項，只列在工程證據，不寫進 PM 步驟；整張卡都看不出差別的應掛 `acceptance:engineering`，不進 Acceptance。
- issue 內文驗收契約的「必須證據」欄若寫了 API 回讀或測試，PM 會照著要；所以「對照的 AC」要寫明那些由工程提供、PM 依畫面判定。
- 發出前跑 `pnpm -s tsx bin/pipeline/acceptance-lint.ts <留言檔>`，有 error 不發。

```markdown
## 🙋 請驗收：<功能一句話>

@peggy1213-create 開發完成，已部署到 dev，AI 冒煙也通過了，請幫忙驗收。

- 測試網址：<直接點進對應頁面的 dev 網址>
- 測試帳號：<用哪個帳號／角色登入；不貼密碼>
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

✅ 通過 → 直接關掉這張 issue，卡片會自動移到 Done
❌ 有問題 → 留言寫「哪一條 AC 沒過、看到什麼」，再把卡片移到 Need Fix
```
