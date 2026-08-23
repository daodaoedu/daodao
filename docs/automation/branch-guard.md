# Root Branch Guard

`.github/workflows/branch-guard.yml` 檢查所有以 daodao monorepo root
為目標的 pull request。

## 規則

- Head branch 必須使用 `type/description` 前綴，例如 `feat/`、`fix/`、
  `docs/`、`chore/`、`ci/`、`build/`、`auto/`、`claude/` 或 `codex/`。
- PR base 必須是 `main`。
- 變更超過 60 個檔案時顯示警告，但不會只因檔案數量而擋下 PR。

Workflow 會從 PR 的 base SHA 讀取 `.github/scripts/check-branch-guard.sh`
到 runner 暫存目錄後執行，避免執行 PR 可修改的 checkout 腳本。若 base revision
還沒有該腳本，則使用 workflow 內建的可信 bootstrap 規則。

## 啟用守門

Workflow 本身只會回報 check。Repository 管理員仍需在 `main` branch protection
或 ruleset 將 `Branch flow rules` 設成 required status check，才會成為實際的
merge gate。

本 PR 只涵蓋 root monorepo。各 sub-repo 有不同的 `dev`／`main` 政策，
需要各自的 workflow 與 PR。
