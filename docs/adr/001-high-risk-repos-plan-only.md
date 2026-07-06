# ADR-001：高風險 repo 強制 plan-only

日期：2026-07-06

## 狀態

已採用

## 背景

`daodao-storage`（SQL migration，錯了無法輕易回滾，零容忍）與 `daodao-infra`（IaC、ops，影響全環境）的錯誤成本遠高於一般程式碼。讓自動化在這兩個 repo 開 code PR 的風險不對稱：收益小、災難大。

## 決策

高風險 repo 永遠 plan-only——自動化最多產出計畫/spec，**永不自動開 code PR**。

- 清單維護在 `bin/pipeline.config.json` 的 `highRiskRepos`（唯一定義處，修改需 PR review）
- 三層獨立防護，任何一層被繞過仍有下一層：
  1. **Routine A（`bin/notion-sync/sync.ts`）**：建 issue 時直接鎖 `auto:plan-only` label
  2. **state.ts Rule 0**：dispatch 推導狀態時，`target-repo` 屬於 highRiskRepos 一律強制降級為 plan-only
  3. **verify.sh**：高風險 repo 在 config 中無品質指令、scope caps 擋下任何 code diff

## 後果

- 高風險 repo 的變更一定經過人手，pipeline 對它們只提供規劃輔助
- 若需自動化擴及新 repo 或縮減清單，只改 config 一處，且留下 PR review 紀錄
- 代價：這兩個 repo 的任務吞吐量受限於人力，屬有意的取捨
