# UNCERTAINTY.md — 未定案事項

2026-07-14 建立。三輪 review（factual / doctrine / usability）後仍無法在本 session 內定案的事項。每條附「怎麼查」。skill 檔內指向本檔的敘述以本檔為準。

## U1. pre-write-guard hook 的實際阻斷力

現行六份 hook 在違規時 `exit 1`；Claude Code 對 PreToolUse hook 的硬阻斷慣例是 exit 2，exit 1 是否在所有 harness 版本都真正擋下寫入**未驗證**。另一疑點：hook 讀 `$CLAUDE_TOOL_INPUT` 環境變數且腳本 `set -u`——若 harness 改以 stdin 傳入 hook input，變數未設時腳本可能在攔截前就先出錯（是 fail-open 還是 fail-closed 未測）。
**含義**：migration 不可變、secret 不落檔等規則要當「自律規則」執行，hook 只是輔助（governance-and-sync G4、architecture-contract C2 已如此措辭）。
**怎麼查**：在測試 repo 對 `migrate/sql/` 既有檔發起一次 Edit，觀察是否真被擋；並讀當前 harness 的 hook 文件確認 exit code 語義。修法（若確認失效）：hub 版 hook 改 exit 2 並確認 stdin/env 相容，走同步機制分發。

## U2. 51bd7ea 的 hook 修復是否被同步蓋掉

worker `51bd7ea`（2026-07-06）宣稱把 hook 改為 session-id flag + exit 2；但現行六份 hook 是 `$$` flag + exit 1。推斷：後續 hub 同步用舊版 hub hook 蓋掉了該修復（INFERRED，hub 端 hook 演進史未考古）。
**怎麼查**：`git -C /home/user/daodao log -p -- .claude/hooks/pre-write-guard.sh`，比對 51bd7ea 的 diff 與 hub 歷史，確認誰蓋了誰；若確為倒退，把 51bd7ea 的修法重新落在 hub 版。

## U3. f2e 被 revert 的 auth fixes 是否仍需要

`e4c91a6`（2026-05-06）把 dev 上一批 auth 修復（AuthNavigator、i18n router、logout redirect、isLoggingOutRef race guard）revert 回 prod 版本，commit 說「後續重新檢視」——**至今無後續 commit 引用此 revert**。那些 fix 針對的 bug（若真存在）可能還活著。
**怎麼查**：重讀 e4c91a6 的 diff，逐項確認被 revert 的行為在現行 codebase 是否已用其他方式修復；未修復的開 issue。

## U4. 打卡圖片 dev/prod bucket 錯置事故是否已解

`daodao-server/ops-2026-06-23-checkin-image-storage-audit.md` 凍結在「MCP 查詢 ECONNRESET，fallback investigation in progress」。repo 內無結案記錄。當年查不下去的 tunnel 問題後來修好了（socat / SSH_TUNNEL），但**事故本體（prod URL 404、物件在 dev bucket）是否處理過，未知**。
**怎麼查**：用 daodao-mcp pg server 查 2026-06-23 前後的 `practice_checkins.image_urls LIKE 'https://storage.daodao.so/checkins/%'`，抽樣 curl 是否 404；有 404 就把 dev bucket 同 key 物件補到 prod，並在該 ops 檔補結案。

## U5. infra 與 mcp 沒有 .claude/ 但在同步矩陣裡

`sync-claude-config.yml` 的 matrix 含 8 個 repo（含 infra、mcp），但這兩個 repo 目前沒有 `.claude/` 目錄。可能是同步 PR 從未成功 merge、或 workflow 對它們一直失敗。另外本地 `sync.sh` 的清單只有 6 個 repo（無 admin-ui、mcp）——兩份清單不一致。
**怎麼查**：翻 daodao-infra / daodao-mcp 的 closed PR 有無 "chore: sync shared config"；跑一次 workflow_dispatch 看該兩 repo 的 job 結果。修法：矩陣、sync.sh、現實三者對齊（要嘛補上 .claude/，要嘛從矩陣移除並記錄理由）。

## U6. worker.js（維護頁 Worker）的部署方式

daodao-infra/worker.js 無 wrangler 設定、無部署 workflow——推斷為 Cloudflare dashboard 手動管理（INFERRED）。改它之後如何上線、目前線上跑的版本是否等於 repo 版本，皆未知。
**怎麼查**：Cloudflare dashboard（user-must-provide 存取權）比對線上 Worker 內容與 repo 檔案。

## U7. f2e update-i18n.yml 疑似陳舊

workflow 寫入 `shared/config/locales`（現行樹中不存在；實際 locales 在 `packages/i18n`）。最後一次成功 run 未查（需 GitHub Actions 歷史）。
**怎麼查**：GitHub Actions 頁面看該 workflow 最近 run；若確認死亡，修路徑或刪 workflow。

## U8. AGENTS.md 與 CLAUDE.md 的分工是否刻意

多個 repo 呈現穩定模式（AGENTS.md 多「PR Feedback 流程」節、CLAUDE.md 多「工作守則」節），推斷為刻意雙入口，但未見成文依據。合併或統一前先問使用者。

## U9. 雜項（低風險）

- hub 根 package.json 有 `@radix-ui/react-checkbox` runtime dep，找不到使用者——疑似殘留。
- `setup-auto-labels.sh` header 註解寫 13 個 label、實際陣列 16 個——上游註解該修。
- 本 session 沙箱 node 為 v22，f2e 釘 20.19.4——本庫的 f2e 指令未在 20.19.4 下實跑（僅讀檔驗證）。
- storage 舊腳本 `fetch_data_vps_postgre.sh` 的檔名 glob 與現行 backup_pg.sh 輸出不符（INFERRED 為 pre-Ansible 遺留）——建議走 ansible playbook 路徑。
- workflow.md Phase 9（單一 Remote Agent，每 2 小時）與 docs/automation/（Routine A/B/C，每小時）並存，前者未標註已被取代——文件層面的收斂待做。
