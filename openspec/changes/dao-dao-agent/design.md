## Context

`daodao-ai-backend`（FastAPI + Python 3.12）已有 `LLMClient` 多 provider 抽象，以及每日洞察、推薦等寫死流程。本 change 在其上新增一個通用對話式代理 Dao Dao Agent：以自然語言為入口，即時組合島島既有資料與服務完成任意業務，並把重複流程沉澱為 Skill。

設計參考三個外部來源：Phil Schmid 的 Harness 理念（framework 與 Agent 之間的「作業系統」層）、OpenAI Codex App Server 的 Thread / Turn / Item 對話建模，以及 LangGraph Store / Mem0 的 Static + Dynamic + Memory 三層 Skill 儲存。

設計來源為 `docs/agent/`（README + 兩個 Skill 規格），本 change 將其正式化為可驗證的 capability spec。

## Goals / Non-Goals

**Goals:**
- 定義 Harness 六大職責（QueryEngine、Context、AppState、Approval、Context 耐久性、Model Drift）的契約與互動。
- 確立 Thread / Turn / Item 的持久化模型與 streaming 生命週期。
- 確立 Static / Dynamic / Memory 三層 Skill 儲存與升格流程。
- 沉澱 `practice-completion-email`、`monthly-insights` 兩個 Skill 為可驗證規格。
- 明確工具能力邊界與安全規範（DB 一律唯讀、預覽先行、批次上限、PII、dry-run、憑證供裝、trace / audit）。
- 定義審批雙模式（auto / normal）、資源容量護欄、產出物治理（檔案 30 天、可重用程式碼沉澱）與回覆 citation。

**Non-Goals:**
- 不實作前端對話 UI（僅定義後端與 API 契約）。
- 不支援語音輸入（會議決議：不需要）。
- 不修改既有 daodao-server REST 介面，僅以 admin token 呼叫。
- 不在本 change 內建立實際 cron 排程實例。
- 不將使用者 persona / DNA 注入 RAG（屬 `add-learner-persona`）。

## Decisions

### D1：Agent 落在 daodao-ai-backend，不另起服務
沿用既有 `LLMClient`、provider 設定與 Python 生態。新增 `src/services/agent/`（engine / state / context / approval / agent / skills / tools）與 `src/routers/agent.py`。
*替代方案*：獨立 microservice — 否決，會重複 LLMClient 與部署成本，且 Agent 需緊貼既有資料層。

### D2：Harness 為「作業系統」層，而非 framework 或 Agent
QueryEngine 作為調度核心而非對話框；意圖識別優先靠 prompt，不寫複雜 rule-based router。允許隨時拆掉「聰明」的部分（§2.4），因模型升級時 workaround 比新功能更易成為障礙。
*替代方案*：直接用 LangChain agent executor — 否決，過度封裝、難以細控 Approval 暫停與 Context 耐久性。

### D3：對話三 primitive（Thread / Turn / Item）
Thread 持久化於 PostgreSQL（`agent_threads`），支援 resume / fork / archive。Turn 為一次完整工作週期，可因 Approval 暫停。Item 有 `started → delta → completed` 生命週期以支援 streaming。
*替代方案*：僅存訊息列表 — 否決，無法表達 Turn 暫停、fork 與 Item 級 streaming。

### D4：Skill 三層儲存
Static（檔案 `skills/*/SKILL.md`，版本控制、可 review）+ Dynamic（`agent_skills` 表，`draft→active→archived`，對話中建立）+ Memory（Redis 或 `agent_memory`，動態行為參數）。啟動合併 metadata，觸發時才讀完整內容（漸進式載入）。升格＝匯出 SKILL.md → commit → 從 DB 移除。
*替代方案*：全部寫檔 — 否決，無法在對話中即時建立 Skill；全部進 DB — 否決，失去 code review 與版本控制。

### D5：Approval 採 SSE 下行 + REST 上行（已定案）
批次寫入前 server 主動推 `approval_request`，Turn 暫停等 allow/deny。**通訊採 SSE + REST 回傳通道，非 WebSocket**：
- **下行（server→client）**：以 SSE 串流推送所有 Item（agent_message delta、tool 進度、approval_request）。
- **上行（client→server）**：送輸入與 allow/deny 走普通 REST，如 `POST /threads/{id}/turns/{tid}/approvals/{aid}`。
- **關鍵洞察**：「Turn 在 Approval 暫停」是 **server 端會話狀態**（存於 `agent_threads` / AppState），不是連線層問題；連線斷開不影響暫停，重連後依 SSE `Last-Event-ID` 續流，天然對應 Thread resume。
*替代方案*：WebSocket — 否決，本案無高頻雙向需求，徒增 stateful 連線、心跳、水平擴展黏連與 Nginx WS upgrade 成本；client 輪詢 — 否決，延遲高且難表達「Turn 暫停」語意。SSE 亦對齊文件參考的 OpenAI Codex App Server 串流模型。

### D6：多 provider 預設開源模型
預設 `openrouter` + `deepseek/deepseek-v4-flash`，不依賴 Anthropic / OpenAI；對話中可切換。需更新 `config.py` 的 `openrouter.model`。
*替代方案*：綁定單一 provider — 否決，違背成本與可用性目標。

### D8：Memory 層分工——Redis（短期）+ `agent_memory` 表（持久）（已定案）
依資料性質分流，不二選一：
- **Redis（TTL）**：當前 provider、dry_run 開關、active turn 暫存、approval pending 狀態——高頻讀寫、可重建、隨 session 過期，放 DB 是浪費。
- **`agent_memory` 表**：用戶長期偏好（慣用模型、預設 top_n、語氣）、跨 session 的歷史操作摘要——需持久、需可查詢/稽核、會被 Skill 讀取當參數。

判準：能重建的、有時效的 → Redis；丟了會痛、要稽核的 → Postgres。對齊既有 stack（Redis + Postgres 皆在）。
*替代方案*：全 Redis — 否決，偏好與歷史會隨重啟遺失；全 Postgres — 否決，高頻 AppState 讀寫不適合 DB。

### D9：Thread 權限——owner-based + admin 角色雙層（已定案）
```
Thread.user_id = 建立者
────────────────────────────────────────────────
讀 / resume / fork / archive   → owner 或 admin
寫入型工具（發信/通知/批次）   → 必須 admin role
唯讀型工具（查 DB / 看統計）   → owner 即可
```
Fork 出的新 Thread `user_id` = fork 操作者，繼承歷史但權限依操作者角色重新判定（防低權用戶 fork 高權 Thread 越權）。`agent.py` 路由 MUST 在執行寫入型工具前檢核 admin role。
*替代方案*：全員可操作 — 否決，email/bulk 本就需 admin token；Thread 隔離無角色 — 否決，無法阻擋未授權寫入。

### D10：Dynamic Skill 安全邊界——工具白名單 + 升格才解鎖（已定案）
升格流程（Dynamic→Static 經 code review）本身即 security gate，不需額外容器沙箱：
- **Dynamic Skill 可用**：唯讀資料工具（pg SELECT、describe_schema）、通用唯讀工具（web_search、stealth_fetch、python_repl）
- **Dynamic Skill 禁用**：bash、write_file、cron_create、email/bulk、notifications（寫入型 / 系統型一律擋）
- **dry_run 強制 true**：Dynamic Skill 不可在 Skill 定義內覆寫 dry_run
- **Static Skill（升格後）**：解鎖寫入型工具，因已過人工 code review

工具層白名單 + dry_run 強制即為輕量能力沙箱，符合 §2.4 不過度工程化原則。python_repl 可加碼限資源/逾時作為實作細節。
*替代方案*：容器沙箱 — 否決，過重；全工具開放 — 否決，LLM 產生的 Skill 內容不可信。

### D11：DB 一律唯讀——prod 與 dev 皆唯讀（已定案）
原 proposal 僅規範 prod DB 唯讀；會議決議 dev DB 同樣唯讀。Agent 對資料的一切寫入 MUST 走 daodao-server REST API（admin token + Approval Flow），任何 DB 直寫（含 dev）一律由工具層在執行前攔截。
*理由*：dev 直寫會繞過 API 層驗證與 audit 記錄，且 dev / prod 共用 migration 結構，直寫容易養成危險路徑。
*替代方案*：dev 可寫方便測試 — 否決，測試寫入應走 API 或由工程師手動操作。

### D12：Approval 雙模式 auto / normal（已定案）
參考 Claude Code 的 allowlist / deny action 模型，審批分兩種模式：
- **normal（預設）**：所有寫入型 action 逐一推 `approval_request`，等待 allow/deny。
- **auto**：allowlist 內的 action 直接放行不審批；denylist 內的 action 一律拒絕（auto 模式不可覆蓋 denylist）；不在兩清單內的 action 仍走審批。
allowlist / denylist 由設定層管理（解析優先序同 D13：config > db > env）。排程（無人值守）執行時 MUST 採 auto 模式並搭配明確 allowlist，否則 Turn 會永久卡在審批。
*替代方案*：一律審批 — 否決，排程任務無人可按 allow；一律放行 — 否決，等同關閉安全閥。

### D13：第三方憑證由開發者供裝，解析優先序 config > db > env（已定案）
Tools / connectors 所需的第三方 API token（Notion、email、外部 App 等）由開發人員預先供裝與管理，用戶 MUST NOT 在對話中提供自帶 token 接入任意外部應用（例如自行輸入自己公司的 Notion token）。這同時是防濫用與 prompt injection 的緩解手段之一——Agent 能觸及的外部服務面由開發者白名單決定，不受對話內容擴張。
- 憑證解析優先序：**config 檔 > DB 設定 > 環境變數**。
- 第三方 connector 的可用範圍依**角色與組織**綁定管理（哪個 role / 哪個組織可用哪些 connector）。
*替代方案*：允許用戶自帶 token — 否決，token 來源不可信且會把 Agent 變成任意外部服務的代理攻擊面。

### D14：資源容量護欄（已定案）
每次 session / thread 執行前，Harness MUST 評估所處 VM／容器的記憶體與磁碟餘裕；執行中的高耗用操作（python_repl、檔案寫入、大型查詢結果）MUST 持續檢查。餘裕不足時 SHALL 拒絕啟動或降級處理（結果壓縮、分批、截斷），MUST NOT 讓程序 OOM 或寫爆磁碟。
*替代方案*：交給 OS / container limit 兜底 — 否決，OOM kill 會讓 Turn 無法優雅回報與續行。

### D15：全程 Trace / Audit（已定案）
每個 Turn 的 LLM 呼叫、tool_call（工具名 + 參數摘要 + 結果摘要）、approval 決策（模式、allow/deny、操作者）、Skill 觸發與升格 MUST 寫入 audit log（新增 `agent_audit_log` 表），可依 thread / user / 時間區間查詢。audit 記錄本身遵循 PII 規範（不落 email / phone 明文），保留至少 180 天（暫定值，可依稽核需求調整，有別於暫存檔案 30 天 TTL）。
*替代方案*：只留應用 log — 否決，非結構化、難以稽核追溯。

### D16：產出物治理——檔案 30 天 TTL + 可重用程式碼沉澱（已定案）
- **檔案保留**：Agent 產生的暫存檔案（報告、匯出、腳本草稿）保留 **30 天**，逾期由清理任務移除；需長期保存者應升格進 repo 或寫入 Notion。
- **可重用程式碼沉澱**：任務完成後 Agent SHALL 評估該次流程是否值得沉澱為可重用腳本／Dynamic Skill（供下次排程復用、開發者 audit），避免一次性 ad-hoc 程式碼日積月累而雜亂。沉澱物走既有 `draft → active → 升格` 流程取得 review。

### D17：排程執行身分——綁定建立者（已定案）
無人值守排程以「建立該排程的 admin 用戶」身分執行：Thread 的 `user_id` 與 audit log 記錄該建立者，寫入型工具的 admin role 檢核（D9）同樣以該身分判定。建立者失去 admin 角色時，其排程 MUST 自動停用，不得以殘留權限續跑。排程定義中明確設定 `dry_run=false` 視為用戶明確授權（滿足 Dry-run 預設規範）；預覽先行在排程情境改為樣本寫入執行報告與 audit log 供事後查驗。
*替代方案*：以系統帳號執行 — 否決，稽核無法追溯到人、權限也無法隨人員異動收斂。

### D7：寫入操作復用 daodao-server
發信 / 通知走既有 `POST /api/email/send`、`/bulk`、`/api/notifications`，以 admin token 呼叫；不在 ai-backend 重做郵件邏輯（已有 `practice-email.service.ts` 模板）。

## Risks / Trade-offs

- **Context 品質退化** → 長對話累積中間結果干擾決策。Mitigation：Context 耐久性主動摘要早期 turns、壓縮大型查詢結果、重注入核心指令。
- **Model Drift** → 多次工具呼叫後偏離原始意圖。Mitigation：每 Turn 結束自我檢查執行路徑，偏離則中斷重新確認。
- **批次誤發 / 個資外洩** → 寄錯人或把 PII 寫入 Notion。Mitigation：dry-run 預設、預覽先行、批次上限 500、DB 一律唯讀（prod + dev）、PII 不出庫；去重查 email_logs。
- **開源模型穩定性** → 第 50 次工具呼叫後行為未必如 benchmark。Mitigation：Harness 本身即驗證環境，真實業務脈絡下長跑觀測；provider 可即時切換降級或升級。
- **Dynamic Skill 失控** → runtime 產生的 Skill 品質參差。Mitigation：`draft→active` 需顯式啟用，升格進 repo 才獲 code review。

## Migration Plan

1. **daodao-storage**：新增 `agent_threads`、`agent_skills`、`agent_memory`、`agent_audit_log` 的 SQL migration（`migrate/sql/`），皆為新增表，無既有資料遷移。
2. **daodao-ai-backend**：建立 `src/services/agent/` 骨架與 `src/routers/agent.py`；更新 `config.py` 的 `openrouter.model` 與 provider key。
3. **Skill 落地**：將 `practice-completion-email`、`monthly-insights` 以 SKILL.md + 執行腳本寫入 `skills/`。
4. **驗證**：以 dry-run 對兩個 Skill 端到端驗證，再開放 `dry_run=false`。
5. **Rollback**：移除 `agent` router 與 service 即停用；新增表可保留（無外鍵入侵既有表），或 drop migration 回退。

## Open Questions

- ~~雙向通訊採 WebSocket 還是 SSE + REST 回傳通道？~~ **已定案：SSE 下行 + REST 上行（見 D5）。**
- ~~Memory 層落在 Redis 還是 `agent_memory` 表，或兩者分工？~~ **已定案：Redis 短期 + `agent_memory` 持久（見 D8）。**
- ~~Thread 的權限模型：是否綁定 daodao 用戶身分與 admin 角色，誰能 fork / archive？~~ **已定案：owner-based + admin 角色雙層（見 D9）。**
- ~~Dynamic Skill 的安全邊界：runtime 產生的 Skill 可呼叫哪些工具、是否需沙箱？~~ **已定案：工具白名單 + dry_run 強制 + 升格才解鎖（見 D10）。**
- ~~dev DB 是否可寫？~~ **已定案：dev 與 prod 一律唯讀（見 D11）。**
- ~~Action 需要 approve 還是直接 pass？~~ **已定案：auto / normal 雙模式（見 D12）。**
- ~~第三方工具憑證誰供裝、如何避免用戶濫用？~~ **已定案：開發者供裝，config > db > env，依角色 / 組織管理（見 D13）。**
- ~~檔案可以保留多久？~~ **已定案：暫存 30 天（見 D16）。**
- ~~回答需要 citation 嗎？~~ **已定案：需要（見 agent-conversation spec）。**
- ~~需要 trace / audit 嗎？~~ **已定案：需要（見 D15）。**
- ~~是否需要語音輸入？~~ **已定案：不需要（列入 Non-Goals）。**
- ~~是否採用第三方開源方案（AnythingLLM、Open WebUI、LibreChat 等）作為對話前端或參考架構？~~ **已定案：調研後無特別進展，不採用，維持自建方向。**
- ~~排程無人值守執行時以誰的身分執行？~~ **已定案：綁定排程建立者，失去 admin 角色即自動停用（見 D17）。**
- ~~audit log 保留多久？~~ **已定案：至少 180 天，暫定值可依稽核需求調整（見 D15）。**
