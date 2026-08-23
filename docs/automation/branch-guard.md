# Root Branch Guard

`.github/workflows/branch-guard.yml` 檢查所有以 daodao monorepo root
為目標的 pull request。

## 規則

- Head branch 必須使用 `type/description` 前綴，例如 `feat/`、`fix/`、
  `docs/`、`chore/`、`ci/`、`build/`、`auto/`、`claude/` 或 `codex/`。
- PR base 必須是 `main`。
- 變更超過 60 個檔案時顯示警告，但不會只因檔案數量而擋下 PR。

Enforcement workflow 使用 `pull_request_target`，因此 workflow definition 來自
repository 的 trusted default branch。它只 checkout default branch 並執行其中的
`.github/scripts/check-branch-guard.sh`，不會 checkout 或執行 PR code；checkout
所需的 `contents: read` token 也不會持久化到 git config。

`.github/workflows/branch-guard-regression.yml` 是獨立的 PR regression workflow。
它執行 PR 版本的測試，但使用 `permissions: {}`、不保留 checkout credentials，
且 check 名稱不是 `Branch flow rules`。不可把這個 untrusted regression check
設成 enforcement workflow 的替代品。

## 啟用守門

Workflow merge 到 default branch 後，Organization 管理員需建立 branch ruleset：

1. 到 organization **Settings → Rules → Rulesets → New branch ruleset**。
2. Repository targeting 選擇 `daodaoedu/daodao`。
3. Target branches 選 **Include all branches**，不可只選 `main`；否則以 `dev`
   或其他 branch 為 base 的錯誤 PR 不受規則約束。
4. 啟用 **Require workflows to pass before merging**，source repository 選
   `daodaoedu/daodao`，workflow 選 default branch 上的
   `.github/workflows/branch-guard.yml`。
5. 將 Enforcement status 設為 **Active**，儲存後用兩個測試 PR 核驗：
   `feature/invalid → main` 與 `feat/valid → dev` 都必須被 required workflow 擋下。

這裡要求的是由 source repository + workflow file 識別的 **required workflow**，
不是只按 job 名稱比對的 required status check；後者可能被 PR 內另一個 workflow
產生同名 check 冒充。GitHub 官方設定說明見
[Require workflows to pass before merging](https://docs.github.com/en/enterprise-cloud@latest/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets#require-workflows-to-pass-before-merging)
與
[建立 organization ruleset](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-organization-settings/creating-rulesets-for-repositories-in-your-organization)。

本 PR 只涵蓋 root monorepo。各 sub-repo 有不同的 `dev`／`main` 政策，
需要各自的 workflow 與 PR。
