# ADR-008：`bin/pipeline.config.json` 為單一事實來源（SSOT）

日期：2026-07-06

## 狀態

已採用

## 背景

v1/v2 期間，同一份設定散落多處且互相矛盾：repo 清單與品質指令硬編碼在 handler 腳本裡、scope 上限寫在 prompt 散文裡、高風險 repo 清單 hard-coded 在 state.ts、model 名稱各檔各寫。任何調整都要改多處，漏改一處就產生行為分歧，且無法審計「現在生效的設定到底是什麼」。

## 決策

- `bin/pipeline.config.json` 是 pipeline 所有設定的**唯一事實來源**：
  - `org` / `monorepo` / `workRoot`
  - `repos`：8 個 sub-repo 的 defaultBranch、install、品質指令（fix/lint/typecheck/test）
  - `highRiskRepos`：強制 plan-only 清單
  - `scopeCaps`：per-scope maxFiles + maxDiffLines
  - `quotas`：fetchPerRepo / operatePerRound / prPatrolPerRound / verifyAttempts
  - `models`：dispatch / reviewer / judge
- 所有腳本（next.sh、verify.sh、state.ts、spec-merged-scan.ts、routine-c）、skill、文件一律**引用此檔，不得另行硬編碼**同類數值
- 文件或記憶與 config 衝突時，**以 config 為準**
- **修改此檔必須經 PR review**——config 變更等同行為變更

## 後果

- 設定調整（加 repo、改 quota、改 caps）只改一處，所有元件同步生效
- 生效中的設定可審計、有版本紀錄；operator（人或模型）有明確的查詢入口
- 代價：config schema 變更需同步更新讀取端（`config.ts`）；引用紀律靠 code review 維持
