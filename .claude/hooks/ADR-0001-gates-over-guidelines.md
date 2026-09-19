# ADR-0001: Gates over Guidelines

## 狀態
已接受（2026-09-12）

## 背景
將島島阿學的開發規範從「文件裡的建議」升級為「機器攔截的規則」。

## 決策

### Block 規則的門檻
Block（exit 2，拒絕編輯）只用於**高信心、低誤報**的規則：
- `no-any`：前端 `.ts/.tsx` 中的 `: any` 型別 — 零合理例外
- `no-ts-ignore-bare`：裸 `@ts-ignore` — 應改用 `@ts-expect-error` 並附說明
- `sensitive-file`：`.env` / `.pem` / `.key` 寫入 — 零例外
- `existing-migration`：修改已存在的 migration SQL — 零例外
- `credential-leak`：AWS key / GitHub PAT / Slack token — 零例外
- `pr-status-not-verified`（`pre-pr-gate.sh`，Bash `gh pr create`）：dev-task 任務 task.md Status 仍是 implementing 就發 PR — verify 沒跑完
- `pr-poc-compare-missing`（同上）：任務有可互動 HTML 原型（`poc/*.dc.html` 或 `index.html + support.js`）卻缺任一項就擋：`notes/poc-compare/report.md`、task.md「### POC 比對」、使用者確認行「POC 差異決策已確認」、`coverage.json` 的 required 類別缺漏（擋「做了但做得淺」）— 2026-09-12 #189 漏做 POC 量測比對、又把可見差異自行放過的教訓；逃生口 `DEV_TASK_SKIP_POC_GATE="<原因>"` 留痕
- `pr-journey-matrix-missing`（同上）：task.md「### 核心旅程矩陣」缺、沒有「正常」+「錯誤路徑」列、或有 ⬜／❌ 就擋；「核心旅程不適用：<具體原因>」放行並記 `pr-journey-matrix-na` — 2026-09-19 #171 Phase A 驗證全是畫面、四天後 #188「無法建立場次」的教訓：畫面像 POC ≠ 使用者能完成任務
- `pr-deferred-unlinked`（同上）：task.md「## Deferred items」有項目沒有子 issue `#n` 也沒寫「待開卡：<原因>」就擋 — #171 的「驗證紅框取代 toast」只留在 comment，變成 #188 的第二個根因
- `pr-body-evidence-missing`（同上）：PR body 缺「## 驗證證據」或裡面沒有報告連結／不適用聲明就擋；CI 版 `pr-evidence-gate.yml` 讀同一段，涵蓋 Codex／手動 gh／pipeline runner
- `pr-fe-pattern-invalid`（同上，f2e／admin-ui）：`scripts/check-validation-parity.py` 用 node 以 v flag 編譯手寫 HTML `pattern`，編不過就擋 — #188 根因 `[a-z0-9-]+` 被瀏覽器整個忽略；`UNMATCHED`（openapi 找不到同文規則）先 warn 記 `pr-fe-rule-unmatched`
- 以上 dev-task 閘門共用逃生口 `DEV_TASK_SKIP_GATE="<原因>"`（`DEV_TASK_SKIP_POC_GATE` 相容），一律留痕

### CI 側閘門
- `pr-evidence-gate.yml`（由 sync-claude-config 同步到各 sub-repo）：PR body「## 驗證證據」的 CI 版。預設 `warn`（advisory），repo variable `PR_EVIDENCE_GATE_MODE=block` 升為阻擋；升級後要加進 dev 的「Benchmark required checks」ruleset 才真的擋得住 merge — 2026-09-03 server PR #449 的 schema-drift 紅燈仍被 merge，「閘門存在但不 required」等於沒有

### Warn 規則的策略
其餘規則先做 Advisory（warn），用 Gate Ledger 累積數據：
- `console-log`：正式碼中的 console.log
- `hardcoded-localhost`：硬編碼本地 URL
- `inline-style`：React inline style
- `raw-sql-interpolation`：SQL 字串插值
- `as-any`：`as any` 型別斷言
- `todo-fixme`：未附負責人的 TODO
- `html-pattern-attr`：前端 `.tsx/.vue` 出現 HTML `pattern=` 屬性 — 提醒規則要與 server openapi 同源並跑 parity 檢查（#188）

### 升級策略
- 新規則先 warn 跑兩週
- 每月跑 `analyze-ledger.sh` 分析 gate ledger
- warn 兩週內觸發 10+ 次且從未被合理略過 → 升級 block
- 多次被合理略過 → 加入 known-false-positives 或降級

### 為什麼 backend 沒有 Block
後端規則大多有合理例外（如某些 context 下 `as any` 是必要的型別橋接），全部先做 Advisory。

## 影響
- 前端 Block 規則會即時拒絕編輯（exit 2）
- 所有事件記錄在 `~/.cache/daodao-harness/gate-ledger.jsonl`
- 規則靠數據自動演化，不靠人記
