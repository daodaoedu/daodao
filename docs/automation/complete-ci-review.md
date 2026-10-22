# CI Code Review：完整輸入、有限預算、明確覆蓋

## 修正的問題

舊 workflow 把所有檔案的 diff 串成一份後，以 awk 截在 12,000 bytes。#303 的 Linux `_consume` 在截點附近，模型看到函式開頭卻看不到後續 filename decoding，因而提出不存在的缺漏。這是本專案的輸入策略，不是 Cloudflare 強制的 12,000 bytes 限制。

新流程不截取檔案前綴。每個 changed path 都有 manifest 記錄；可審查的完整 diff 與完整編號 source 作為不可拆分單位，再打包成批次。新增保留 HEAD，刪除保留 BEFORE，修改與改名保留 BEFORE 與 HEAD。單一完整單位放不下就明列未審查，不能根據缺少的片段判斷實作不存在。

修改與改名的單位依序嘗試下列層級，前一層超過 `max_batch_bytes` 才降到下一層，manifest 以 `context_level` 記錄（#314）：

| 層級 | 內容 | 可引用 |
|---|---|---|
| `complete` | 完整 diff＋BEFORE 全文＋HEAD 全文 | HEAD、BEFORE 任一行 |
| `before-hunks` | 完整 diff＋HEAD 全文＋BEFORE 片段（diff 出現的舊行，保留原始行號） | HEAD 任一行；BEFORE 只限片段列出的行號 |
| `head-only` | 完整 diff＋HEAD 全文，標頭寫明 BEFORE SOURCE OMITTED | 只有 HEAD |
| `hunks` | 完整 diff＋兩側各 hunk 前後 20 行（再放不下改 0 行）的片段，保留原始行號 | HEAD、BEFORE 都只限片段列出的行號 |

原因：BEFORE＋HEAD＋diff 一起算時，約 13 KB 以上的檔案改一行就超過 40 KB，`pre-pr-gate.sh`、skill 正本這類最常改、改錯影響最大的檔案會一直被略過（#309 實例）。`before-hunks` 讓「刪掉安全檢查」仍能以被刪的那幾行當 BEFORE 證據；runner 驗證片段引用時只接受列出的行號，多行引用只能延續到連續的下一個行號。降級的檔案在 review 留言列為「部分脈絡」限制，整體不會標成覆蓋完整；仍放不下的非產物檔案在留言頂端列出數量與路徑。

單檔本身就超過 `max_batch_bytes` 時（f2e 的 `en.json`／`zh-TW.json` 約 450 KB，daodao-f2e#1073 實例），前三層都放不下，改走 `hunks`：片段外的行沒有送進模型，留言標明「片段外的行未審查」。連 diff 本身都放不下（例如整檔改寫）時以 `diff-exceeds-batch-budget` 列為未審查。只有 source 超過 `max_source_bytes`（預設 50 × `max_batch_bytes`）才在算 diff 之前以 `source-exceeds-batch-budget` 略過，避免 Git 為巨大檔案配置整份 diff。

### 檔案多的 PR：先打包、再降級、最後才列未審查

planner 先算出每個檔案可用的單位（由完整到片段），全部檔案都算完才裝批次，不再照 diff 順序裝到批次數用完就丟掉後面的檔案（daodao-f2e#1087：47 檔只審 12 檔，其餘 `batch-count-budget-exhausted`）。

1. **依大小打包**：first-fit decreasing，大的單位先放，每個放進第一個還有空間的批次。
2. **放不下才降級**：批次數或總量不夠時，把 `complete` 單位改成 `before-hunks`（HEAD 全文保留，被刪的行仍可引用），每次挑省最多 bytes 的檔案，降一個就重新打包。只做這一種降級；`head-only` 與 `hunks` 仍只用在單檔本身放不下的情況。manifest 以 `budget_downgraded_from` 記錄。
3. **仍放不下才列未審查**：原因寫 `batch-count-budget-exhausted` 或 `total-budget-exhausted`。

預算由 12 批／400 KB 提高到 24 批／800 KB。用 f2e#1087 實際 diff 重跑：47 檔全部排入 21 批（796 KB），25 檔因預算降為 `before-hunks`；舊版同一份 diff 是 16 檔排入、31 檔未審查。代價是大 PR 的模型用量約為原本兩倍。

### 模型 transport 失敗

daodao-f2e#1091／#1092（2026-10-22 02:18 UTC 起，各 repo 同時）兩個模型都回 `HTTPError`，舊 runner 只記類名，查不到 status。現在：

- 錯誤記成 `transport_failed (HTTP 429, cf 4006)`：只放 HTTP status 與 Cloudflare 錯誤代碼整數，不放 URL、header、訊息內文。
- HTTP 429／5xx 與連線錯誤，同一模型等 2 秒、5 秒再試兩次（有 `Retry-After` 就照它，最多 20 秒）；其他錯誤直接換 fallback。45 秒 timeout 不重試。
- 連續 2 批兩個模型都因服務端原因失敗（429、5xx、401／403、連線錯誤或 timeout），視為服務中斷或額度用完，剩下的批次不再呼叫，原因寫 `provider-unavailable (…; last: …)`。400／413 是這批輸入被拒，不算中斷。
- 從開始呼叫算起超過 15 分鐘，就不再重試、不再換模型、不再開新批次，剩下的寫 `time-budget-exhausted`（job 上限 25 分鐘）。
- 已知限制：降級到底仍放不下時，已降級的檔案不會還原成完整脈絡。
- 兩個模型在同一個 Cloudflare 帳號，額度用完時 fallback 也會失敗；這種情況只能等額度恢復後 re-run。

### Check 狀態

`Flag incomplete review on the check` 在留言發出後才執行，依 `status.json` 判斷：

| 狀態 | 條件 | warn（預設） | block |
|---|---|---|---|
| none | 0 檔被審查，且有排入批次卻全部失敗（模型呼叫失敗），或 runtime 沒產生 status | job 失敗（`::error`） | job 失敗 |
| partial | 有非產物檔案未審查（含檔案大到放不進任何批次，re-run 也無法解決），或有檔案只審部分脈絡，或可信 base 尚無 runtime | `::warning`，`AI review coverage` check 為 neutral | 有未審查檔案時 job 失敗 |
| complete | 其他（含只有 policy／Context Pack 缺漏） | `AI review coverage` check 為 success（同一 head 重跑審完會蓋過先前的 neutral） | 同左 |

模式由 repo variable `AI_REVIEW_COVERAGE_MODE` 決定（`warn`｜`block`，未設定為 `warn`），照 `PR_EVIDENCE_GATE_MODE` 的先 warn 再升 block 慣例。「0 檔被審」兩種模式都讓 job 失敗：綠燈會被當成審過，但其實沒有審。`AI Code Review` 不在任何 ruleset 的 required checks，失敗不會擋 merge。annotation 與 neutral check 只放數字，不放 PR 控制的路徑。

## 依據與取捨

- [PR-Agent 的多批次實作](https://github.com/The-PR-Agent/pr-agent/blob/main/pr_agent/algo/pr_processing.py) 用有限 calls/token budget 打包，並保留 remaining/clipped files 與 coverage。本流程採用有限分批與未覆蓋清單；為避免函式中途斷裂，選擇完整檔案單位。大型檔案目前不做 AST／函式切分。
- [Cloudflare JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) 說明結構化輸出及相容性／錯誤處理。本流程仍在客戶端驗證 JSON schema、結束原因、檔案回執與來源行，不把 JSON mode 當作內容正確的保證。
- [GitHub Actions security](https://docs.github.com/en/actions/reference/security/secure-use) 要求最小權限與不可信輸入隔離。模型 runtime、review policy、context retriever 從事件的可信 base SHA 載入；PR source 只作為資料。provider secret 只給執行可信 runner 的步驟。

## 預算與證據

預設每批 source payload 上限 40,000 bytes，最多 24 批，總 source payload 上限 800,000 bytes。每次序列化後的完整 request 上限 128,000 bytes，包含 policy、Context Pack 與 JSON overhead；不適合用 bytes 精確代表 tokens，因此另外限制每次 completion 2,000 tokens、45 秒、response 128,000 bytes。每批主模型失敗最多再嘗試一次 fallback；每個模型遇到 429／5xx／連線錯誤另可重試兩次，連續 2 批 transport 全失敗就停止呼叫，並有 15 分鐘的開批時間上限。限制可在 workflow 與腳本常數查核，不能透過截斷輸入繞過。

`review-plan/manifest.json` 保存 base/head/merge-base、各檔案狀態與原因、完整 source hash、批次 hash 與來源 byte ranges。`review-output/status.json` 保存成功批次、reviewed paths、unreviewed、limitations、errors 與 `complete`。hash 綁定此次輸入，不能證明模型理解、語意正確或資料收集者身分。

模型必須回覆該批全部 paths；finding 必須明列 `side: HEAD|BEFORE`，行號與引用只對所選版本核對，刪掉安全檢查也能引用 BEFORE 證據。finish reason 不完整、JSON 無效、漏檔案、越界行號或引用對不上來源行，都不發布該批 finding，也不能計為完成。收到有效 finding 仍須由 AI／人工查證；引用存在只證明來源位置可核對。來源按 Git 的 LF 邊界編號，不把 formfeed 或 Unicode line separator 改成新行。

歷史 false-positive DB 仍從可信 base 經 `prompt-block` 提供，原有 knowledge fixtures 保留。但新 CI 刻意不再跑舊 Markdown `filter`：它用文字樣態刪除／降級表格列，且全部刪掉後會改成「沒有發現明顯問題」。這不能充當覆蓋證據，也不相容新 structured findings 的 revision side 與來源驗證。新流程保留可核對 finding，由後續 review 查證；不因符合歷史文字樣態就自動隱藏。這是可觀察的行為改變，並非宣稱已用 schema 消除語意誤判；manual review 的既有 knowledge 流程保持不變。

binary、gitlink、平台產物、非 UTF-8、特殊控制字元檔名及超預算檔案都保留明確原因。產物不消耗模型預算，但整張 PR 的 `complete` 仍不會把這些路徑算成已審查。缺少 policy／Context Pack 或模型指出限制，同樣呈現 Review 未完成／有證據限制。

## 上線與限制

此修改第一次提出 PR 時，可信 base 尚無新 runtime，workflow 必須發出 `trusted_runtime_missing`，不執行 PR 自己新增的程式取得 secrets。首次採用由獨立本機 review 與測試承接；正常審核合併後，後續 PR 才可使用可信 base 中的新 runtime。shared-config sync 會同步腳本、測試與 workflow；修改尚未合併不代表其他 repo 已採用。

GitHub job 綠燈代表工作流程執行成功且至少審到部分檔案；必須讀 coverage comment／artifact 的 `complete`，不能把綠燈當作審查通過（見上方「Check 狀態」）。模型審查不列入 required checks，不阻擋交付。靜態審查也不代表測試、部署或產品驗收。完整報告超過 50,000 字元時只縮短公開留言，保留完成狀態、數量與 workflow artifact 入口，原始輸入及完整報告不截斷。

檔案內脈絡完整不代表跨檔案依賴完整，仍受 Context Pack 範圍限制。大型完整檔案目前會未審查，需人工／本機查核，未來可另行實作與驗證具完整語法邊界的拆分。本文的 deterministic tests、mocked provider 測試與 #303 真實 Git 輸入重播不等於實際 Workers AI 呼叫成功。

## 驗證

```sh
bash .github/scripts/test-code-review-contract.sh
bash .github/scripts/test-sync-claude-config-contract.sh
python3 .github/scripts/build-review-batches.py \
  --repo . --base <base-sha> --head <head-sha> --out /tmp/review-plan
```

Regression tests 涵蓋舊截點後的完整函式與後續檔案、刪除／改名、UTF-8 byte budget、超大 base、batch count、binary／gitlink／產物、個別讀取失敗、SHA 不符、缺 credentials／context、provider fallback、輸出 schema、漏回 paths、截斷輸出與 evidence 行核對。Workflow contract 另外檢查可信 base runtime、secret 隔離與 head snapshot marker 由 workflow 持有。
