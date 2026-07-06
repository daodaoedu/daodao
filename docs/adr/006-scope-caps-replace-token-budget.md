# ADR-006：檔案數 / diff 行數上限取代 token budget

日期：2026-07-06

## 狀態

已採用（取代 v1 的 per-scope token cap）

## 背景

v1 設計了 per-scope token budget（XS=50k / S=200k / M=800k / L=1.5M），由 `token-budget.ts` 記帳、超額則升級人類。實際運行後發現這是**死機制**：CCR session-native 模式下腳本量測不到模型的 token 用量，`state-store.json` 裡的 token 計數從未被遞增——cap 永遠不會觸發，只是給人「有控管」的錯覺。`estimate-context.ts` 的 context overflow 預測同樣建立在量不到的數字上。

## 決策

- 移除 token budget 與 context 估算整套機制（`token-budget.ts`、`estimate-context.ts` 已刪除）
- 改用**可強制執行的 proxy**：per-scope 檔案數與 diff 行數上限，定義在 `bin/pipeline.config.json` 的 `scopeCaps`：

| Scope | maxFiles | maxDiffLines |
|---|---|---|
| XS | 3 | 300 |
| S | 10 | 1200 |
| M | 30 | 4000 |
| L | 0 | 0（不允許自動 code）|

- 由 `verify.sh` 在 push 前實測 `git diff` 強制檢查，超限即 exit 4（缺陷清單要求縮小範圍）

## 後果

- 上限從「宣稱」變成「實測強制」：量測對象是 diff 本身，任何模型都繞不過
- scope label 有了明確、可驗證的操作語意（而非模糊的工作量描述）
- 代價：檔案數/行數不等於複雜度，可能誤擋合理的大 diff（如 lockfile）——處置方式是人工升級 scope label 或接手，而不是放寬檢查
- 教訓：**量測不到的護欄不是護欄**；只保留能在執行路徑上驗證的限制
