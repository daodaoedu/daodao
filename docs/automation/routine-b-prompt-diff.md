# Routine B — 改造指南（trig_01KATY prompt diff）

## 使用前設定

> **警告：複製貼上前，必須先在 Claude Code Console 的 Routine 環境變數設定中確認以下 env 已存在：**
>
> ```
> GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
> NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
> ```
>
> **不可把 API key 直接寫進 prompt 文字。**

---

## Sub-repo 清單（共 8 個，取代原本 4 個）

```
daodao-server / daodao-f2e / daodao-ai-backend / daodao-storage /
daodao-admin-ui / daodao-infra / daodao-mcp / daodao-worker
```

高風險 repo（`daodao-storage`、`daodao-infra`）：不論 Notion `Auto Mode` 設定為何，
`state.ts` 規則 0 強制 plan-only，修改此規則需 PR review。

---

## Prompt 改造對照

### 移除段落（刪除既有 prompt 中的 issue 處理段）

```
❌ 刪除：掃描各 sub-repo（daodao-server / daodao-f2e / daodao-ai-backend / daodao-storage）
         的 open issue，依 label 處理…（原有的手工 dispatch 邏輯）
```

### 新增段落（貼在 PR 巡邏段之前）

```
階段 0：cd 到 daodao monorepo 根目錄。
        確認 .automation-paused 不存在；若存在則輸出「⏸️ paused」並 exit 0。

階段 1：跑 spec-merged-scan（cross-repo label sync）
        pnpm tsx bin/routine-dispatch/spec-merged-scan.ts
        掃 monorepo 自 last_scan_at 起所有 merged spec PR，
        解析 PR body 的 issue ref → 對應 sub-repo issue 加 spec-merged label。
        成功後 atomic 更新 state-store.json:last_scan_at。
        若失敗，不更新 timestamp（下輪自動重試），繼續執行階段 2。

階段 2：對每個 sub-repo 的 auto issue 跑 dispatch（最多 3 個）
        覆蓋 8 個 sub-repo：
          daodao-server / daodao-f2e / daodao-ai-backend / daodao-storage /
          daodao-admin-ui / daodao-infra / daodao-mcp / daodao-worker
        對每個 repo：
          gh issue list --repo daodaoedu/<repo> --label auto --state open \
            --json number,labels --limit 3
          對每個 issue：bash bin/routine-dispatch/main.sh <repo> <issue-num>
        注意：daodao-storage / daodao-infra 由 state.ts 規則 0 強制 plan-only，
              不論 issue 上的 auto:auto-pr 設定。
```

### 保留段落（verbatim，不改動）

```
階段 3（PR 巡邏）：【保留既有 trig_01KATY 的 PR 巡邏段落，原文不動】

  對每個 daodaoedu/<repo> open PR（含 auto/* branch）：
  - 若有 requested changes / failing CI → 讀 review feedback，修改並 push
  - 若 CI green + approved → 留 comment「✅ ready to merge」
  - 每輪最多回覆 3 個 PR（既有限制保留）
  - 若 PR 有 human-driving label → 跳過，不回覆
```

---

## --legacy flag fallback

緊急回退時，在 routine prompt 最前加一行：

```
若收到 --legacy 參數，跳過階段 0/1/2，直接執行既有 trig_01KATY 原版邏輯（不 touch 任何 bin/ script）。
```

平時不注入此行；上線初期若出現非預期行為，可暫時加入以快速回退。

---

## 完整改造後 prompt（可直接貼上 Console）

```
你是 daodao pipeline 自動化代理。

階段 0：cd 到 daodao monorepo 根目錄。
確認 .automation-paused 不存在；若存在則輸出「⏸️ paused」並 exit 0。

階段 1：跑 spec-merged-scan
pnpm tsx bin/routine-dispatch/spec-merged-scan.ts
掃 monorepo 自 last_scan_at 起所有 merged spec PR，
解析 PR body issue ref → 對應 sub-repo issue 加 spec-merged label。
成功後更新 state-store.json:last_scan_at；失敗則跳過 timestamp 更新並繼續。

階段 2：dispatch auto issue（最多 3 個）
對以下 8 個 sub-repo 依序掃描：
  daodao-server / daodao-f2e / daodao-ai-backend / daodao-storage /
  daodao-admin-ui / daodao-infra / daodao-mcp / daodao-worker
gh issue list --repo daodaoedu/<repo> --label auto --state open --json number,labels --limit 3
對每個 issue：bash bin/routine-dispatch/main.sh <repo> <issue-num>
（daodao-storage / daodao-infra 由 state.ts 規則 0 強制 plan-only）

階段 3（PR 巡邏，verbatim 保留）：
對每個 daodaoedu/<repo> open PR（含 auto/* branch）：
- 有 requested changes / failing CI → 讀 review feedback，修改並 push
- CI green + approved → 留 comment「✅ ready to merge」
- 每輪最多回覆 3 個 PR
- 有 human-driving label → 跳過
```

---

## 相關文件

- Routine A：`docs/automation/routine-a-prompt.md`
- 架構說明：`docs/automation/architecture.md`
- 故障排查：`docs/automation/troubleshooting.md`
