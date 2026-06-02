## Why

目前團隊在測試 AI 功能時，常被單一供應商 API key 綁定，導致：
- 無法快速切換不同模型供應商做比較
- Demo 時受限於開發環境既有憑證
- 測試與除錯流程難以重現（每個人本地 key 不同）

需要一個可插拔的 harness，讓使用者貼上不同家的 API key 後即可立即使用同一套功能流程，降低整合與驗證成本。

同時必須**明確區分兩種設定責任**：
- **使用者端設定（User Scope）**：終端使用者自行貼上的 key，只影響自己的 session，且其用量/費用歸屬於使用者 key
- **服務管理員設定（Admin Scope）**：平台管理員維護的 provider 預設設定與平台基礎額度，影響整個服務的 fallback 與治理

## What Changes

- 新增「Multi-provider key harness」能力：同一介面支援 OpenAI、Anthropic、Google 等供應商金鑰輸入與切換
- 新增 provider 抽象層（adapter interface），統一 chat/completions 呼叫入口
- 新增 key 驗證與錯誤分類（invalid key / quota exceeded / model not found）
- 新增 session 層級 key 暫存策略（預設不落地）與安全清除機制
- 新增最小可用觀測：provider、model、latency、error code
- 新增雙軌設定模型：User Scope 與 Admin Scope 的欄位、權限與路由分離

## Capabilities

### New Capabilities

- `provider-key-harness-user-scope`: 使用者可貼入不同供應商 API key 並即時切換，僅作用於自己的 session
- `provider-config-admin-scope`: 管理員可設定平台預設 provider、可用模型白名單與 fallback policy
- `provider-adapter-runtime`: 以 adapter 方式統一供應商呼叫流程與參數映射
- `credential-safety-guard`: key 輸入、暫存、清除與 redaction 安全防護
- `provider-observability`: 基礎請求與錯誤指標追蹤（含 user/admin 來源標記）

### Modified Capabilities

- `ai-request-flow`: 既有 AI 呼叫流程改為透過 provider adapter 進行路由，不再硬編碼單一供應商

## Quota & Usage Model

- **平台基礎額度（Admin Quota）**：由管理員設定預設 provider 與月/日配額，供未提供 user key 的請求使用。
- **使用者自帶額度（User BYOK Quota）**：使用者提供自己的 key 後，請求優先走 user key，使用量計入使用者 key，不占用平台基礎額度。
- **回退策略**：若 user key 不可用（驗證失敗、配額不足、封鎖），依策略可選擇回退到 admin quota 或直接拒絕。
- **可觀測性**：每筆請求記錄 `config_source` 與 `billing_source`（user/admin）以利對帳與治理。


## Repository Grounding

本規劃已對照目前 monorepo 結構（`projects/`）：
- 已存在：`projects/daodao-f2e`、`projects/daodao-server`、`projects/daodao-ai-backend`、`projects/daodao-storage`、`projects/daodao-admin-ui`、`projects/daodao-worker`
因此本 change 可直接在對應子專案落地，不需要以「規格保留」處理。

## Impact

- **前端（`projects/daodao-f2e`）**：新增使用者端 harness（provider 選擇、key 輸入、session 清除）。
- **管理後台（`projects/daodao-admin-ui`）**：實作管理員設定頁（provider 預設值、白名單、fallback policy）。
- **AI 服務（`projects/daodao-ai-backend`）**：新增 adapter 介面、provider client、錯誤映射與 source-aware metrics hook。
- **後端 API（`projects/daodao-server`）**：新增 admin 設定 API 與 RBAC 控制。
- **Worker（`projects/daodao-worker`）**：同步 edge 推理路徑的 user/admin 設定分流協議。
- **安全性**：log 與 telemetry 禁止輸出完整 key；僅允許 masked 片段；admin 與 user 權限分離
