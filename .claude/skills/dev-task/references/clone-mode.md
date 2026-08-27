# Clone 模式 — 完整隔離

預設用 worktree。符合以下任一條件才用 clone：

1. 任務會改 docker-compose / port 配置 / 本地 DB 初始化流程
2. 長期 prototype，生命週期比一般 feature branch 長
3. 需要與另一個任務**同時跑 dev server**，且不想管理 port offset

## 建立

```bash
ROOT=$(git rev-parse --show-toplevel)
TASK="$ROOT/worktrees/<issue#>-<slug>"
mkdir -p "$TASK"

# 從本地 submodule clone（快、省頻寬），再把 origin 指回 GitHub
git clone "$ROOT/projects/<repo>" "$TASK/<repo>"
cd "$TASK/<repo>"
git remote rename origin local-projects
git remote add origin https://github.com/daodaoedu/<repo>.git
git fetch origin dev
git checkout -b feat/<slug> origin/dev
```

之後的 env 複製、pnpm install、task.md 與 worktree 模式相同（task.md 的「隔離模式」欄寫 `clone`）。

## 與 worktree 的差異

| | worktree | clone |
|---|---|---|
| 磁碟 | 共享 object store，約數百 MB | 完整一份（f2e 約 2.1G） |
| branch 防撞 | git 強制（同 branch 不能掛兩個 worktree） | 無，靠人工注意 |
| git config / hooks | 共享 submodule 的 | 完全獨立 |
| 清理 | `git worktree remove` | 確認無未 push commit 後 `rm -rf` |

## 清理

```bash
cd "$TASK/<repo>"
git log origin/feat/<slug>..HEAD --oneline   # 必須為空（都推上去了）
git status --short                                      # 必須乾淨
cd "$ROOT" && rm -rf "$TASK"
```

## 歷史遺留

monorepo root 的 `daodao-f2e-mobile-product-i18n/`、`daodao-server-connection-status-pr/`
是此模式的前身（手動 clone）。任務結束後依上述清理流程移除；新任務一律放 `worktrees/` 下。
