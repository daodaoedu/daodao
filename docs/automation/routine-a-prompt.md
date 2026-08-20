# Routine A — Board → Sub-repo Dispatch（Actions script 運維手冊）

> 2026-08 二次改版：Routine A 不再由 Claude 執行，改為 GitHub Actions 跑純 script。
> Notion 版（notion-sync）與 cloud routine 版皆已退役，見 git 歷史。

## 組成

| 元件 | 位置 |
|---|---|
| Workflow | `.github/workflows/pipeline-dispatch.yml`（每小時 `:07` UTC + `workflow_dispatch`） |
| 入口 | `bin/pipeline/dispatch.ts` |
| 判斷邏輯（純函式） | `bin/pipeline/lib.ts`（vitest：`bin/pipeline/__tests__/lib.test.ts`） |
| gh CLI 封裝 | `bin/pipeline/gh.ts` |
| Secret | `GIT_HUB_ACCESS_TOKEN`（PAT，需 `repo` + `project` scope） |

## 行為摘要

1. `.automation-paused` 存在 → 直接退出
2. 掃 Planning board（project 10）`Status=Ready for Dev` 的中央卡；需有 `auto` label、無 `dispatched`/`needs-spec`/`human-driving`
3. Spec gate：body `OpenSpec: <slug>` + `openspec/changes/<slug>/tasks.md` 存在，否則標 `needs-spec` + comment 退回
4. 規則化拆卡：每個 `## section` 一張鏡像 issue；repo 判定順序 = section 標題提及 → task 內文提及 → 卡片唯一 `repo:*` label；判不出 → `needs-spec`
5. 鏡像 issue（labels: `auto` + `auto:<mode>` + `scope:*`，storage/infra 強制 plan-only）掛為中央卡 sub-issue；中央卡 `dispatched` + comment；board → In Progress
6. 每輪最多 3 張卡；冪等（以 title + `Parent:` 反查），部分失敗不標 `dispatched`

## 手動操作

```bash
# 本機 dry-run（不改任何東西，印出會做什麼）
pnpm tsx bin/pipeline/dispatch.ts --dry-run

# 本機實跑
pnpm tsx bin/pipeline/dispatch.ts

# 從 GitHub 手動觸發（可勾 dry_run）
gh workflow run pipeline-dispatch.yml -R daodaoedu/daodao -f dry_run=true

# 看最近的 run log
gh run list -R daodaoedu/daodao --workflow pipeline-dispatch.yml --limit 5
gh run view <run-id> -R daodaoedu/daodao --log
```

## 除錯快查

| 症狀 | 檢查 |
|---|---|
| 卡在 Ready for Dev 沒被撿 | 有 `auto` label 嗎？有殘留 `dispatched`/`needs-spec` 嗎？ |
| 被標 needs-spec | body 的 `OpenSpec:` 註記與 tasks.md 是否存在；section 是否判得出 repo |
| board 操作 403 | `GIT_HUB_ACCESS_TOKEN` 缺 `project` scope |
| 鏡像 issue 重複 | 檢查 title 是否被人工改過（冪等以 title + `Parent:` 比對） |
