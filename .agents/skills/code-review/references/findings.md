# 整合與查證 findings（步驟 6～8.5、收尾）

前置：[engines.md](engines.md) 的四個引擎都已有輸出或記下未執行原因。

## 步驟 6：呈現結果

各引擎原始輸出存為 `$_REVIEW_TMP_DIR/<engine>.txt`，記錄引擎、實際模型、完成／失敗狀態與 review snapshot。Codex、OMP 與 OpenCode 有 fallback 鏈，**實際使用的模型**分別在 `$_CODEX_USED`、`$_OMP_USED` 與 `$_OPENCODE_USED`，呈現與寫入誤判知識庫時一律用這些值，不要寫鏈的第一個模型；有降級要在結果中標註。先保留 input 與輸出，完成過濾、證據查核及持久化報告後才清理暫存。

交人審閱時呈現合併後的已查證 findings、AI 已處理事項、驗證結果、未驗證限制與待決策問題。完整引擎原文作本機附件，不要求人逐份重新分析。

## 步驟 6.5：套用誤判知識庫的確定性過濾

對 OMP／OpenCode／Claude 的表格輸出各跑一次共用的 filter（Codex 是自由文字，由 AI 逐項比對證據）。
C 類（自承無法確認）直接 drop、D 類（假設性）High/Medium 降為 Low；被動到的列在 report 裡，呈現時標註「已由知識庫過濾」：

```bash
if [ -f "$_KNOWLEDGE_SCRIPT" ]; then
  for engine in omp opencode claude; do
    [ -f "$_REVIEW_TMP_DIR/$engine.txt" ] || continue
    node "$_KNOWLEDGE_SCRIPT" filter --db "$_KNOWLEDGE_DB" --report "$_REVIEW_TMP_DIR/$engine.fp.json" \
      < "$_REVIEW_TMP_DIR/$engine.txt" > "$_REVIEW_TMP_DIR/$engine.filtered.txt"
  done
fi
```

（只處理實際存在的輸出；過濾是輔助分類，AI 仍須以目前程式碼確認每項保留或排除的理由，不可把過濾結果直接當作無缺陷證據。）

## 步驟 7：Cross-model 分析

比較四個引擎的發現：

```
CROSS-MODEL ANALYSIS:
  四者都發現: [所有引擎共同回報的問題]
  三者共識: [任三個引擎都回報的問題]
  兩者共識: [任兩個引擎都回報的問題]
  只有 Codex 發現: [Codex 獨有]
  只有 OMP 發現: [OMP 獨有]
  只有 OpenCode 發現: [OpenCode 獨有]
  只有 Claude 發現: [Claude 獨有]
  共識問題數: N / 總計 M
```

## 步驟 8：處理問題

- AI 對每個 finding 檢查目前程式碼、觸發條件、需求與測試；共識數只供排序，單一引擎也可能找到真實重大問題。
- 分為已確認缺陷、待產品決策、證據不足、誤判／不適用，附具體依據；不按模型數量或嚴重度自動接受／忽略。
- 有修復授權時，直接修正範圍內已確認缺陷並跑適用檢查；bug 先加 regression test。只有 review 授權時交付具體修正建議。
- 人審核 AI 已查核的結論與未定取捨，不固定逐條詢問「是否修」。修正後重新核對 diff 與原問題，舊 snapshot 的結論不視為新程式碼已通過。
- Commit、push、merge 及遠端留言仍遵守既有明確授權與目標 repo 流程，不因 review 完成自動執行。

### 步驟 8.5：把查證為誤判的 finding 記回知識庫（工具存在時）

確認可信來源的共用腳本與知識庫存在後，每一條用程式碼證據推翻的 finding（不只 High）記一筆。工具缺失時記在本機 review 報告，不阻擋其餘檢核；不直接執行 PR 引入或修改而未查核的腳本：

```bash
node "$_REPO_ROOT/../../.github/scripts/review-knowledge.cjs" record --db auto \
  --source local --engine <codex|omp|opencode|claude> --repo <repo> --pr <n> \
  --pattern <A-F> --severity <High|Medium|Low> --file '<path:line>' \
  --finding '<finding 原文摘要>' --why '<為什麼錯，附 path:line 證據>' \
  --evidence '<path:line>' --action <none|context|drop|downgrade> \
  [--sample '<那一列表格原文>' --expected <keep|drop|downgrade>]
```

- `--db auto` 會從 cwd 往上找 daodao monorepo 的 `.github/review-knowledge/false-positives.jsonl`（worktrees/ 與 projects/ 底下都找得到）；腳本路徑不在時改用 monorepo 內的絕對路徑
- 樣態定義與對策見 monorepo `.github/review-knowledge/README.md`
- 記錄先保留本機，commit／push 依既有明確授權與 repo 流程；不能為收集誤判自動 push main。同步是否發生需查當次 workflow 證據。
- 若 finding 觸發了新的確定性規則（改了 `UNVERIFIABLE_RE`／`HYPOTHETICAL_RE`），必須附 `--sample` + `--expected`，`node review-knowledge.cjs test` 要綠

## 收尾

先將 review 報告與必要證據存到本次工作紀錄位置，再移除本次建立的暫存目錄。清理前檢查路徑確為本次 `mktemp` 的輸出，不移除其他人的檔案。報告區分 AI 檢核完成、人已審核、程式修正、測試通過與遠端發布；未完成項目寫明原因。
