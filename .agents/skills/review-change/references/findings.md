# 整合與查證 findings（步驟 6～8.5、收尾）

前置：[engines.md](engines.md) 的四個引擎都已有輸出或記下未執行原因。

## 步驟 6：呈現結果

各引擎原始輸出存為 `$_REVIEW_TMP_DIR/<engine>.txt`，記錄引擎、實際模型、完成／失敗狀態與 review snapshot。Codex、OMP 與 OpenCode 有 fallback 鏈，**實際使用的模型**分別在 `$_CODEX_USED`、`$_OMP_USED` 與 `$_OPENCODE_USED`，呈現與寫入誤判知識庫時一律用這些值，不要寫鏈的第一個模型；有降級要在結果中標註。先保留 input 與輸出，完成過濾、證據查核及持久化報告後才清理暫存。

交人審閱時呈現合併後的已查證 findings、AI 已處理事項、驗證結果、未驗證限制與待決策問題。完整引擎原文作本機附件，不要求人逐份重新分析。

## 步驟 6.5：套用誤判知識庫的確定性過濾

（filter 一律用 base 版本的腳本與知識庫。PR 本身若改了過濾規則，它的新規則不會在自己的 review 生效；要看效果，另外拿 HEAD 版本對同一份輸出跑一次比對。）

對 OMP／OpenCode／Claude 的表格輸出各跑一次共用的 filter（Codex 是自由文字，由 AI 逐項比對證據）。
C 類（自承無法確認）直接 drop、G 類（「請確認／需同步」的提醒，沒指出具體過時位置）直接 drop、D 類（假設性）High/Medium 降為 Low。auth、權限、個資、migration／schema、金流、資料刪除、併發相關的列一律保留原樣（report 的 `exempted`），交人判斷。被動到的列在 report 裡，呈現時標註「已由知識庫過濾」：

```bash
if [ -f "$_KNOWLEDGE_SCRIPT" ]; then
  for engine in omp opencode claude; do
    [ -f "$_REVIEW_TMP_DIR/$engine.txt" ] || continue
    node "$_KNOWLEDGE_SCRIPT" filter --db "$_KNOWLEDGE_DB" --report "$_REVIEW_TMP_DIR/$engine.fp.json" \
      < "$_REVIEW_TMP_DIR/$engine.txt" > "$_REVIEW_TMP_DIR/$engine.filtered.txt"
  done
fi
```

接著對 filter 的輸出跑 `verify`（A 類 absent-claim 後置查證）：問題欄說「找不到／缺少／未實作 X」時，到 review snapshot（`$_REVIEW_HEAD`）用 `git grep` 查 X；存在型斷言（找不到／未定義）只認定義處；檢查型斷言先判缺的是權限、身份驗證還是輸入驗證，route 同一個註冊敘述掛了同一類 middleware，或（輸入驗證）validator／schema 檔有該欄位定義才算反證，查得到就移出表格，report 記 `verified-absent-claim` 與命中的 path:line。識別字太短（<4 字）或太泛（`data`、`user`…）不查；敘述點名的識別字在 tree 裡完全不存在、分不出缺哪一類檢查、或查不到反證，就原樣保留：

```bash
if [ -f "$_KNOWLEDGE_SCRIPT" ] && grep -Fq 'verifyBody' "$_KNOWLEDGE_SCRIPT"; then
  for engine in omp opencode claude; do
    [ -f "$_REVIEW_TMP_DIR/$engine.filtered.txt" ] || continue
    node "$_KNOWLEDGE_SCRIPT" verify --repo-root "$_REPO_ROOT" --rev "$_REVIEW_HEAD" \
      --report "$_REVIEW_TMP_DIR/$engine.verify.json" \
      < "$_REVIEW_TMP_DIR/$engine.filtered.txt" > "$_REVIEW_TMP_DIR/$engine.verified.txt"
  done
fi
```

呈現時以 `$engine.verified.txt` 為準，被 verify 移除的列逐條列出 identifier 與命中位置，標註「已由 verify 查到反證」，讓人能覆核。CI 也跑同一個 `verify`，但只在 review 留言末尾標註、不刪除 finding（#363 決定 CI 不依文字樣態隱藏 finding）。

（只處理實際存在的輸出；過濾與 verify 是輔助分類，AI 仍須以目前程式碼確認每項保留或排除的理由，不可把過濾結果直接當作無缺陷證據。grep 查到同名識別字不等於 finding 一定錯，被移除的列仍要看一眼命中位置。）

## 步驟 7：覆蓋表

四個引擎各看不同焦點，同意的數量不是重點，先確認每個焦點都有人看過：

```
COVERAGE:
  跨檔契約（Codex）:               完成／未執行（原因）／改由 <引擎> 重跑
  REVIEW.md 安全與資料契約（Claude）: 完成／未執行（原因）／改由 <引擎> 重跑
  diff 內邏輯（OMP、OpenCode）:      完成／未執行（原因）
  覆蓋缺口: [沒有任何引擎完成的焦點，或引擎完成了但讀不到該焦點需要的檔案；不能寫成通過]
```

同一焦點有兩個引擎時，可以參考兩邊是否都回報同一問題，但只用來排序。

## 步驟 8：處理問題

- AI 對每個 finding 檢查目前程式碼、觸發條件、需求與測試；共識數只供排序，單一引擎也可能找到真實重大問題。
- 分為已確認缺陷、待產品決策、證據不足、誤判／不適用，附具體依據；不按模型數量或嚴重度自動接受／忽略。
- 嚴重度對照 REVIEW.md：引擎的 High＝P0／P1、Medium＝P2、Low＝P3。**只有已確認、有觸發案例、而且違反意圖或 REVIEW.md 約束的 P0／P1 才阻擋交付**；提醒型與假設型最高 P3，不阻擋。
- 判成已確認的 P0／P1，要有**重跑過的**重現證據（參考 pstack `/interrogate`：一個 finding 只有在實跑證明時才算數）：
  - 主流程自己在 review snapshot（`$_REVIEW_HEAD`）上執行重現指令——失敗的測試、重現腳本、curl 或指令輸出——輸出存到 `$_REVIEW_TMP_DIR/repro-<編號>.txt`，看得到錯誤行為才算。引擎回覆裡貼的輸出不算證據，要重跑。
  - 重跑後看不到錯誤行為 → 改判「證據不足」或「誤判」，不阻擋。
  - 本機沒有工具可以重現（例如要 prod 資料、要真實金流）→ 標「靜態推論」。靜態推論的 P0／P1 只有屬於 REVIEW.md 高風險類別（auth、權限、個資、migration／schema、金流、資料刪除、併發）時才阻擋交付，並在交人時寫明為什麼無法重現；其他類別降為「待查證」，列在結論最前面，但不單獨造成 `BLOCKED`。
- 結論只用三種，依序判斷：`BLOCKED`（有覆蓋缺口；或有未解、已重跑證實的 P0／P1；或有高風險類別的靜態推論 P0／P1）→ `ISSUES`（沒有上述情形，但有已確認的 P2／P3 或待查證的 P0／P1，全部列出）→ `PASS`（每個焦點都完成，沒有任何已確認或待查證的問題）。
- **核對 PR 寫的安全前提**（develop finish 第 8 步、參考 pstack blast-radius）：每一條前提標的證據等級要跟實際證據相符（例如寫「第 4 級」就要有跑過的測試或腳本）；前提不成立或等級灌水，視同 finding 處理。改到高風險類別的變更，安全前提低於第 4 級又沒寫原因時，列為待查證。PR 沒寫安全前提時，主流程自己找出 1～2 件讓變更安全的事，至少做到第 2 級再交人。
- 交人時附**丟棄清單**：每個引擎原本回報幾筆、被 filter 拿掉或降級幾筆、被 verify 移除幾筆、AI 查證後判誤判或證據不足幾筆，各附一句原因（從 `*.fp.json`、`*.verify.json` 與本步驟的判定統計）。人可以推翻任何一筆丟棄或保留；被推翻的丟棄若是 filter 規則造成的，改規則並在知識庫加 fixture 與反例（見步驟 8.5），否則只寫進本次報告。
- 有修復授權時，直接修正範圍內已確認缺陷並跑適用檢查；bug 先加 regression test。只有 review 授權時交付具體修正建議。
- 人審核 AI 已查核的結論與未定取捨，不固定逐條詢問「是否修」。修正後重新核對 diff 與原問題，舊 snapshot 的結論不視為新程式碼已通過。
- Commit、push、merge 及遠端留言仍遵守既有明確授權與目標 repo 流程，不因 review 完成自動執行。

### 步驟 8.5：誤判不再記錄（2026-10-29 起）

不再把查證為誤判的 finding 記回知識庫，`review-knowledge.cjs record` 已退役。查證結論照步驟 8 寫進 review 報告與丟棄清單即可。

既有的 `.github/review-knowledge/false-positives.jsonl` 已全部變成 filter／verify 的回歸測試（或寫明不測的原因），繼續由步驟 0 的 prompt-block 與步驟 6.5 的 filter／verify 使用。只有在**改 filter 規則**（`UNVERIFIABLE_RE`／`HYPOTHETICAL_RE`／`REMINDER_RE`／`HIGH_RISK_RE`）時，才直接在 jsonl 加 `pr` 為 0、帶 `sample`＋`expected` 的 fixture，並同時加一筆 `expected: keep` 的反例，`node .github/scripts/review-knowledge.cjs test` 要綠。規則與欄位見 monorepo `.github/review-knowledge/README.md`。

## 收尾

先將 review 報告與必要證據存到本次工作紀錄位置，再移除本次建立的暫存目錄。清理前檢查路徑確為本次 `mktemp` 的輸出，不移除其他人的檔案。報告區分 AI 檢核完成、人已審核、程式修正、測試通過與遠端發布；未完成項目寫明原因。
