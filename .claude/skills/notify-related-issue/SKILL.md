# Skill: notify-related-issue

手動 PR 關聯 issue 留言（對應 `daodao-f2e#945 → daodao#164` 場景）。解析 PR body 的 `Closes` / `daodaoedu/daodao#xx`，預覽後 `gh issue comment`，可選同時 close。

## 何時用
- 手動 `git push` 後想在關聯 issue（如 `daodao#164`）回「已送 PR」或「已合併」
- 不想等 `related-issue-notify.yml` 的 merge 觸發，想先手動通知

## 用法
```
/notify-related-issue 945
/notify-related-issue 945 --dry-run
/notify-related-issue 945 --close --body "自訂文案"
```

## 步驟
1. 解析 PR 關聯 issue
   ```bash
   PR=945
   gh pr view $PR --json body --jq '.body' | grep -oE 'daodaoedu/daodao#[0-9]+|Closes #[0-9]+' | grep -oE '[0-9]+' | sort -u
   ```
   無匹配 → 提示請在 PR body 補 `Closes daodaoedu/daodao#164`

2. 預覽
   ```bash
   REPO=daodao-f2e
   SHA=$(git rev-parse --short HEAD)
   echo "將留言到：daodao#164"
   echo "文案：已修正（${REPO}#${PR} 已送審，commit ${SHA}）。"
   ```

3. 執行（需確認）
   ```bash
   for n in $ISSUES; do
     gh issue comment $n --repo daodaoedu/daodao --body "已修正（daodao-f2e#${PR} 已送審，commit ${SHA}）。PR: https://github.com/daodaoedu/daodao-f2e/pull/${PR}"
     # --close 時
     # gh issue close $n --repo daodaoedu/daodao
   done
   ```

4. 驗證
   ```bash
   gh issue view 164 --repo daodaoedu/daodao --json comments --jq '.comments[-1].body'
   ```

## 參數
- `PR`：`daodao-f2e` 的 PR number（預設取當前分支 `gh pr view --json number`）
- `--dry-run`：只印解析結果與文案，不發 `gh issue comment`
- `--close`：留言後同時 `gh issue close`
- `--body`：覆蓋預設文案
- `--repo`：中央 repo，預設 `daodaoedu/daodao`

## 權限
- 本機需 `gh auth login`（`gh auth status`），`--repo daodaoedu/daodao` 需有 `issues:write`
- 無需 Actions `GIT_HUB_ACCESS_TOKEN`，適合手動 PR

## 與自動化的關係
- 此 skill 為 **B（手動）**；對應 **A（合併自動）** 為 `.github/workflows/related-issue-notify.yml`（`on: pull_request: closed: merged` 同款正則，自動 `gh issue comment`）
- 建議先用本 skill 試跑 `daodao#165`，確認文案後再升為 A

## 範例
```bash
# 945 → 164，已在 PR body 含 Closes daodaoedu/daodao#164
/notify-related-issue 945
# 輸出：將留言到：164 → y → https://github.com/daodaoedu/daodao/issues/164#issuecomment-xxx
```
