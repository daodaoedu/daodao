---
name: governance-and-sync
description: 你觀察到以下任一狀態時載入：想修改 .claude/hooks、.claude/settings.json、system-map、collect-pr-feedback skill、auto-pr-description.yml 或 code-review.yml；發現六個 repo 的共用檔 md5 不一致；子 repo 出現「chore: sync shared config」commit 且與你的變更衝突；文件說的和程式碼不一樣
---

# 治理與同步機制

> 最後校準：2026-07-14。本專案的 AI 治理制度（CLAUDE.md → skills → hooks）本身有同步機器在維護——改錯地方會被機器蓋掉。

## G1. 共用檔的正確修改路徑

- 事實：hub（daodao repo）的 `.github/workflows/sync-claude-config.yml` 在 push main（觸及共用路徑）或每週一 01:00 UTC，把以下檔案推向 **8 個子 repo**（f2e/server/ai-backend/storage/worker/infra/admin-ui/mcp），自動開 PR 並嘗試 admin squash merge：
  - `.claude/hooks/pre-write-guard.sh`、`post-write-format.sh`（覆寫）
  - `.claude/settings.json`（jq 深合併：**hub 值贏**，子 repo 獨有 key 存活）
  - `.claude/skills/collect-pr-feedback/SKILL.md`（覆寫）
  - `.github/workflows/auto-pr-description.yml`、`code-review.yml`（覆寫）
- 觸發：你要改上述任一檔。步驟：改 `daodao/.claude/` 或 `daodao/.github/workflows/` 的 hub 版 → merge 進 hub main → 同步機器分發。緊急時可用本地 `daodao/.claude/sync.sh <parent-dir>` 手動分發（注意：sync.sh 的 REPOS 清單只有 6 個 repo，**不含 admin-ui 與 mcp**——與 CI matrix 不一致，手動同步後這兩個要自己補）。
- 完成定義：`md5sum /home/user/daodao-*/.claude/hooks/pre-write-guard.sh` 全一致。
- ❌ 反例（觀察到的合理化）：「只有這個 repo 需要這條 hook 規則，直接在這裡改」——下週一 cron 就蓋掉，而且蓋掉前的一週你有六份分裂的「機械強制層」。
- ⚠️ 警世案例：`51bd7ea`（worker，2026-07）在單一 repo 修了 hook bug（含改用 exit 2）——但現行六份 hook 全是 exit 1 且 flag 機制不同，**該修復顯然被後來的 hub 同步蓋掉了**。這正是「在子 repo 改共用檔」的下場：即使修得對，也活不過下一次同步。修 hook 唯一存活路徑是改 hub 版。（此推斷列入 UNCERTAINTY.md，hub 端的 hook 演進史未考古。）
- 另注意：daodao-infra 與 daodao-mcp 目前**根本沒有 `.claude/` 目錄**——同步矩陣（8 repo）領先現實；「六份相同」指的是 f2e/server/ai-backend/storage/worker/admin-ui。

## G2. 非機器管但約定同步的檔

- `system-map/SKILL.md` 與 `.claude/README.md` 是**約定**六份相同（.claude/README.md 明文），但**不在** sync 機器的清單裡——改它們要手動改六份 + 更新「最後校準」日期。這是制度縫隙：機器只保證 hooks/settings/collect-pr-feedback/兩個 workflow。

## G3. 文件 vs 現實衝突：現實為準，並修文件

- 這是全 repo CLAUDE.md 的明文規則，而且有牙齒——已知的文件謊言清單見 doc-trust-map skill。
- 步驟：先用指令驗證現況 → 照現實做 → 同一 PR 修文件並在描述註記。
- ❌ 反例（觀察到的合理化）：「project-rules 說 checksum 會防篡改，所以改舊 migration 會被抓」——那句話是假的（`797c85c` 修正），信文件不驗證的下場是靜默 SKIP。

## G4. hooks 的實際能力邊界（別高估機械層）

- `pre-write-guard.sh` 現行為（2026-07-14 讀檔核實）：擋 .env/.pem/.key 寫入、擋 `migrate/sql/` 既有檔修改、session 首次寫檔時注入 project-rules。**violation 時 exit 1**。
- 注意：Claude Code 的 PreToolUse hook 慣例上以 exit 2 為硬阻斷語義；現行 exit 1 是否在所有 harness 版本都真正擋下寫入，**未驗證**（列入 UNCERTAINTY.md）。含義：不要把 hook 當唯一防線——migration 不可變等規則仍要靠你自律遵守。
- `post-write-format.sh`：寫檔後自動 format（Biome → ESLint → Black+Ruff 依 repo 偵測），永遠 exit 0。

## G5. 每個 repo 開工前的載入順序（給零上下文 session）

1. 讀該 repo `CLAUDE.md`（薄入口）。
2. 動手前讀 `.claude/skills/project-rules/`；不熟結構讀 `codebase-map`；跨 repo 影響讀 `system-map`。
3. 本 skill 庫（skills-staging）補的是它們沒有的層：事故史、跨 repo 驗證標準、營運。兩邊衝突時，先驗證 codebase，再依 G3 處理。
4. commit/push 流程照 CLAUDE.md：pre-commit-check → format-commit → 使用者確認才 commit；push 前問「要 review 嗎」。**這些流程 skill 有互動節點（詢問使用者），自動化情境下不可跳過改成自答**。

## G6. AGENTS.md 與 CLAUDE.md 的已知分工

- 有 AGENTS.md 的 repo 中，AGENTS.md 多含「PR Feedback 流程」節、CLAUDE.md 多含「工作守則」節——結構性分工非矛盾。兩份都改時保持各自的節；別「統一」它們（那是刻意的雙入口：CLAUDE.md 給 Claude Code、AGENTS.md 給其他 agent）。（此分工的「刻意」程度未見成文——若要合併先問使用者。）

---
重新驗證：`md5sum /home/user/daodao-*/.claude/hooks/pre-write-guard.sh | awk '{print $1}' | sort -u | wc -l  # 輸出必須是 1` 然後 `grep -n "daodao-mcp\|daodao-admin-ui" /home/user/daodao/.github/workflows/sync-claude-config.yml /home/user/daodao/.claude/sync.sh`
