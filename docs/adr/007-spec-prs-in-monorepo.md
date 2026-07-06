# ADR-007：Spec PR 集中在 monorepo，用 Spec-For 標記對應 issue

日期：2026-07-06

## 狀態

已採用（取代 v2 的 sub-repo spec PR）

## 背景

v2 把 spec PR 開在各 sub-repo。這造成一個死結：`spec-merged-scan.ts` 掃的是 monorepo 的 merged PR，sub-repo 的 spec PR 永遠掃不到，`spec-merged` label 永遠不會回貼——**M scope 任務卡死在 spec 階段，spec merge 之後永遠不會進入 code 階段**。此外 spec PR body 若用 `Closes #<num>`，GitHub 會在 spec merge 時自動關閉 issue，任務在 code 都還沒寫時就被標記完成。

## 決策

- Spec 內容一律寫在 **monorepo** 的 `openspec/changes/<repo>-<num>-<slug>/`（必含 `proposal.md` + `tasks.md`），branch 命名 `auto/spec-<repo>-<num>-<slug>`
- Spec PR 開在 monorepo，標題 `[spec] <repo>#<issue-num> <issue-title>`，labels `auto` + `spec-pending`
- PR body 用 **`Spec-For: daodaoedu/<repo>#<num>`** 標記對應 issue，**不用** `Closes`——跨 repo 引用本就不會 auto-close，且語意上 spec merge 不代表 issue 完成
- `spec-merged-scan.ts` 解析 `Spec-For:`（同時保留 Closes/Fixes/Resolves 相容），merge 後 cross-repo 回貼 `spec-merged` label 到 sub-repo issue
- `verify.sh` 的 spec-mode 邊界檢查：spec ticket 只允許改動 `openspec/changes/<change_id>/` 內的檔案

## 後果

- 修復 v2 死結：spec merged → `spec-merged` label → 下一輪自動進入 code 階段，M scope 流程走得通
- 所有 spec 集中一處，與 monorepo 既有 OpenSpec 結構一致，人類 review spec 只需盯一個 repo
- sub-repo issue 不會被 spec merge 誤關，生命週期由 code PR 的 `Closes` 正常收尾
- 代價：spec 與 code 分屬兩個 repo，追溯需靠 `Spec-For:` 標記與 issue comment 串接
