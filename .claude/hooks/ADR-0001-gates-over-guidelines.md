# ADR-0001: Gates over Guidelines

## 狀態
已接受（2026-09-12）

## 背景
參考 Mai CLI Dev Harness 的設計理念，將島島阿學的開發規範從「文件裡的建議」升級為「機器攔截的規則」。

## 決策

### Block 規則的門檻
Block（exit 2，拒絕編輯）只用於**高信心、低誤報**的規則：
- `no-any`：前端 `.ts/.tsx` 中的 `: any` 型別 — 零合理例外
- `no-ts-ignore-bare`：裸 `@ts-ignore` — 應改用 `@ts-expect-error` 並附說明
- `sensitive-file`：`.env` / `.pem` / `.key` 寫入 — 零例外
- `existing-migration`：修改已存在的 migration SQL — 零例外
- `credential-leak`：AWS key / GitHub PAT / Slack token — 零例外

### Warn 規則的策略
其餘規則先做 Advisory（warn），用 Gate Ledger 累積數據：
- `console-log`：正式碼中的 console.log
- `hardcoded-localhost`：硬編碼本地 URL
- `inline-style`：React inline style
- `raw-sql-interpolation`：SQL 字串插值
- `as-any`：`as any` 型別斷言
- `todo-fixme`：未附負責人的 TODO

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
