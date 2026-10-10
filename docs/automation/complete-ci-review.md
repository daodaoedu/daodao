# CI Code Review：完整輸入、有限預算、明確覆蓋

## 修正的問題

舊 workflow 把所有檔案的 diff 串成一份後，以 awk 截在 12,000 bytes。#303 的 Linux `_consume` 在截點附近，模型看到函式開頭卻看不到後續 filename decoding，因而提出不存在的缺漏。這是本專案的輸入策略，不是 Cloudflare 強制的 12,000 bytes 限制。

新流程不截取檔案前綴。每個 changed path 都有 manifest 記錄；可審查的完整 diff 與完整編號 source 作為不可拆分單位，再打包成批次。新增保留 HEAD，刪除保留 BEFORE，修改與改名保留 BEFORE 與 HEAD。單一完整單位放不下就明列未審查，不能根據缺少的片段判斷實作不存在。

## 依據與取捨

- [PR-Agent 的多批次實作](https://github.com/The-PR-Agent/pr-agent/blob/main/pr_agent/algo/pr_processing.py) 用有限 calls/token budget 打包，並保留 remaining/clipped files 與 coverage。本流程採用有限分批與未覆蓋清單；為避免函式中途斷裂，選擇完整檔案單位。大型檔案目前不做 AST／函式切分。
- [Cloudflare JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) 說明結構化輸出及相容性／錯誤處理。本流程仍在客戶端驗證 JSON schema、結束原因、檔案回執與來源行，不把 JSON mode 當作內容正確的保證。
- [GitHub Actions security](https://docs.github.com/en/actions/reference/security/secure-use) 要求最小權限與不可信輸入隔離。模型 runtime、review policy、context retriever 從事件的可信 base SHA 載入；PR source 只作為資料。provider secret 只給執行可信 runner 的步驟。

## 預算與證據

預設每批 source payload 上限 40,000 bytes，最多 12 批，總 source payload 上限 400,000 bytes。每次序列化後的完整 request 上限 128,000 bytes，包含 policy、Context Pack 與 JSON overhead；不適合用 bytes 精確代表 tokens，因此另外限制每次 completion 2,000 tokens、45 秒、response 128,000 bytes。每批主模型失敗最多再嘗試一次 fallback，最壞 24 次呼叫。限制可在 workflow 與腳本常數查核，不能透過截斷輸入繞過。

`review-plan/manifest.json` 保存 base/head/merge-base、各檔案狀態與原因、完整 source hash、批次 hash 與來源 byte ranges。`review-output/status.json` 保存成功批次、reviewed paths、unreviewed、limitations、errors 與 `complete`。hash 綁定此次輸入，不能證明模型理解、語意正確或資料收集者身分。

模型必須回覆該批全部 paths；finding 必須明列 `side: HEAD|BEFORE`，行號與引用只對所選版本核對，刪掉安全檢查也能引用 BEFORE 證據。finish reason 不完整、JSON 無效、漏檔案、越界行號或引用對不上來源行，都不發布該批 finding，也不能計為完成。收到有效 finding 仍須由 AI／人工查證；引用存在只證明來源位置可核對。來源按 Git 的 LF 邊界編號，不把 formfeed 或 Unicode line separator 改成新行。

歷史 false-positive DB 仍從可信 base 經 `prompt-block` 提供，原有 knowledge fixtures 保留。但新 CI 刻意不再跑舊 Markdown `filter`：它用文字樣態刪除／降級表格列，且全部刪掉後會改成「沒有發現明顯問題」。這不能充當覆蓋證據，也不相容新 structured findings 的 revision side 與來源驗證。新流程保留可核對 finding，由後續 review 查證；不因符合歷史文字樣態就自動隱藏。這是可觀察的行為改變，並非宣稱已用 schema 消除語意誤判；manual review 的既有 knowledge 流程保持不變。

binary、gitlink、平台產物、非 UTF-8、特殊控制字元檔名及超預算檔案都保留明確原因。產物不消耗模型預算，但整張 PR 的 `complete` 仍不會把這些路徑算成已審查。缺少 policy／Context Pack 或模型指出限制，同樣呈現 Review 未完成／有證據限制。

## 上線與限制

此修改第一次提出 PR 時，可信 base 尚無新 runtime，workflow 必須發出 `trusted_runtime_missing`，不執行 PR 自己新增的程式取得 secrets。首次採用由獨立本機 review 與測試承接；正常審核合併後，後續 PR 才可使用可信 base 中的新 runtime。shared-config sync 會同步腳本、測試與 workflow；修改尚未合併不代表其他 repo 已採用。

GitHub job 綠燈代表工作流程執行成功；必須讀 coverage comment／artifact 的 `complete`，不能把綠燈當作審查通過。本次不把尚未完成採用的模型審查新增為阻擋交付的閘門。靜態審查也不代表測試、部署或產品驗收。完整報告超過 50,000 字元時只縮短公開留言，保留完成狀態、數量與 workflow artifact 入口，原始輸入及完整報告不截斷。

檔案內脈絡完整不代表跨檔案依賴完整，仍受 Context Pack 範圍限制。大型完整檔案目前會未審查，需人工／本機查核，未來可另行實作與驗證具完整語法邊界的拆分。本文的 deterministic tests、mocked provider 測試與 #303 真實 Git 輸入重播不等於實際 Workers AI 呼叫成功。

## 驗證

```sh
bash .github/scripts/test-code-review-contract.sh
bash .github/scripts/test-sync-claude-config-contract.sh
python3 .github/scripts/build-review-batches.py \
  --repo . --base <base-sha> --head <head-sha> --out /tmp/review-plan
```

Regression tests 涵蓋舊截點後的完整函式與後續檔案、刪除／改名、UTF-8 byte budget、超大 base、batch count、binary／gitlink／產物、個別讀取失敗、SHA 不符、缺 credentials／context、provider fallback、輸出 schema、漏回 paths、截斷輸出與 evidence 行核對。Workflow contract 另外檢查可信 base runtime、secret 隔離與 head snapshot marker 由 workflow 持有。
