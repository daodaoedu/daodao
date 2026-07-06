# ADR-005：v3 工單模式——腳本驅動取代 v1 巢狀 CLI 與 v2 散文 prompt

日期：2026-07-06

## 狀態

已採用（取代 v1 handler 架構與 v2 prose-prompt 架構）

## 背景

pipeline 先後存在兩套互相矛盾的架構：

**v1 —— bash handler + 巢狀 `claude` CLI**：`main.sh` 依 scope dispatch 到 `handlers/{xs,s,m,l}.sh`，handler 內再呼叫 `claude` CLI 執行實作。護欄（tool allowlist、token budget、verification loop、policy/enforce.sh）都寫好了，**但不在實際執行路徑上**——CCR session 跑的是 prompt，不是 main.sh，這些護欄形同虛設。巢狀 CLI 也帶來認證、成本與可觀測性問題。

**v2 —— 散文 prompt**：把整套 dispatch 邏輯（約 280 行）寫進 CCR prompt，靠模型自律遵守。**沒有任何強制護欄**：scope caps 是提示、blocklist 定義了但沒接上、push/PR 由模型自由執行。行為完全依賴模型能力與服從度，小模型無法安全執行，大模型也可能漂移。

兩套並存導致文件、腳本、prompt 三方矛盾。

## 決策

合併為 v3「工單模式（ticket mode）」，核心原則：

1. **所有決策與防護放在確定性腳本，且必須在執行路徑上**
   - `next.sh`：deterministic driver——kill-switch、輪次 quota、spec-merged-scan、掃 auto issues、state 推導、工作區/branch 準備、印出 PIPELINE TICKET
   - `verify.sh`：唯一品質閘門——write-path blocklist、scope caps、spec-mode 邊界、per-repo 品質指令；通過才由它 push + 開 PR + 貼 label + 回寫 Notion；失敗重試 2 次後自動升級 `human-coding`
2. **模型只做一件事：照工單實作**。CCR session 模型親自寫 code/spec，不呼叫巢狀 `claude` CLI、不產生子代理
3. **prompt 縮到一個固定迴圈**（`next.sh` → 實作 → `verify.sh`），見 `docs/automation/routine-b-prompt-v3.md`
4. 設定集中在 `bin/pipeline.config.json`（見 ADR-008）

決策驅動因素：
- **未來要由更小的模型值班**：小模型無法可靠遵守 280 行散文規則，但能執行「跑腳本、照工單寫 code、照缺陷清單修」的固定迴圈
- **護欄必須是確定性的、模型繞不過的**：模型不可自行 push/開 PR，這些動作只存在於 verify.sh 內，護欄檢查與動作綁在同一步

同時刪除 v1 遺留（已不在執行路徑）：`main.sh`、`handlers/{xs,s,m,l}.sh`、`verification-loop.sh`、`policy/enforce.sh`、`policy/tool-allowlist.json`、`token-budget.ts`、`estimate-context.ts`、`openspec-headless.ts` 及其測試。

## 後果

- 護欄從「寫了但沒用」變成「在唯一的 push/PR 路徑上強制執行」
- 模型可替換（含降級到小模型），行為由腳本保證而非模型自律
- prompt 極短、可審計；每輪行為可由 run-state（`bin/routine-dispatch/runs/`）追溯
- 代價：新增能力（新檢查、新流程）都要改腳本 + PR review，迭代比改 prompt 慢——這是刻意的摩擦
- tool allowlist 隨 v1 移除：session-native 模式下無法攔截工具呼叫，改以 write-path blocklist + verify.sh 專責 push 取代其保護目標
