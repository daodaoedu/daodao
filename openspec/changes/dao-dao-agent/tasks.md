> **實作狀態對帳（2026-07-06）**：本清單勾選狀態經與程式碼實際比對後修正——
> - **第 1 節**：`agent_*` migration 原不存在於 daodao-storage 任何分支（誤標已修正）；現已補齊於 storage 分支 `claude/ai-agent-architecture-nu5q51`（068）。
> - **第 2.1、3–10 節**：實作原僅存在於 `feat/agent` 分支（`6c06aae`，落後 dev、未合併）；現已 cherry-pick 至 ai-backend 分支 `claude/ai-agent-architecture-nu5q51`（基於 dev 最新）並在其上補齊測試與 12.x。合併進 dev 前仍不得視為交付。
> - **第 11.1–11.3、11.5 節**：測試檔原不存在於任何分支（誤標已修正）；現已補齊（tests/services/agent/ 共 57 cases 全數通過）。
> - 注意：3–8 節部分子項聲稱的檔案（persistence.py、memory.py、SSE Last-Event-ID、drift 偵測、_compress_context）**至今仍不存在**，該等子項的勾選仍屬高估，列入待補（見 13 節）。

## 1. 資料層（daodao-storage）

- [x] 1.1 在 `migrate/sql/` 新增 `agent_threads` 表 migration（id、user_id、status、created_at、updated_at；支援 resume / fork / archive）— `068_create_agent_tables.sql`（storage 分支 claude/ai-agent-architecture-nu5q51）
- [x] 1.2 新增 `agent_skills` 表 migration（name、description、skill_md、status：draft/active/archived、created_at）— 同 068
- [x] 1.3 新增 `agent_memory` 表 migration（key、value、scope、updated_at）供動態行為參數 — 同 068
- [ ] 1.4 撰寫 migration 的 rollback / drop 腳本並於 dev DB 驗證套用（rollback 已寫：`068_create_agent_tables_rollback.sql`；dev DB 實際套用需人工執行）

## 2. 設定與 provider（daodao-ai-backend）

- [x] 2.1 更新 `config.py`：`openrouter.model` 改為 `deepseek/deepseek-v4-flash`（僅在 feat/agent 分支；dev 仍為 `meta-llama/llama-3.3-70b-instruct:free`）
- [ ] 2.2 確認 OpenRouter / Gemini / Ollama 等 provider API key 設定與讀取
- [ ] 2.3 驗證 `LLMClient` 可依指令切換 provider，並可回退預設

## 3. Harness 核心（src/services/agent/）

- [x] 3.1 `context.py`：脈絡注入（當前日期、用戶權限、DB schema 摘要、provider 與 dry_run 狀態、先前操作摘要）
- [x] 3.2 `state.py`：AppState 跨 Turn 狀態（provider、dry_run、active thread、已執行工具清單、approval 記錄）
- [x] 3.3 `engine.py`：QueryEngine 任務循環（注入脈絡 → 識別意圖 → 選 Skill / 臨時組合 → 執行工具 → 回流）
- [x] 3.4 Context 耐久性：早期 turns 摘要、大型查詢結果壓縮、核心指令重注入（`_compress_context`，訊息 > 30 條自動壓縮）
- [x] 3.5 Model Drift 偵測：每 Turn 結束檢查執行路徑是否仍在原始意圖內，偏離則中斷重新確認（關鍵字比對：查詢意圖 + 寫入工具 → drift）

## 4. 對話模型（Thread / Turn / Item）

- [x] 4.1 Thread 持久化：create / resume / fork / archive，跨 session 還原狀態（persistence.py 完整實作）
- [x] 4.2 Turn 工作週期：完整週期管理與 Approval 暫停／續行（engine.py 主迴圈 + approval.py）
- [x] 4.3 Item 生命週期：user_message / agent_message / tool_call / approval_request / result，`started → delta → completed`
- [x] 4.4 streaming 通道：以 delta 即時推送 agent_message 與工具進度（SSE StreamingResponse）

## 5. Approval Flow

- [x] 5.1 `approval.py`：批次寫入前推出 approval_request 並暫停 Turn
- [x] 5.2 SSE 下行串流推送 Item / approval_request；allow/deny 走 REST 上行（`POST /threads/{id}/turns/{tid}/approvals/{aid}`），支援 Last-Event-ID 重連
- [x] 5.3 allow → 續行並回報；deny → 取消所有寫入並回報

## 6. Skill 系統

- [x] 6.1 `skills/` 載入器：解析 SKILL.md 的 YAML frontmatter（name / description）與步驟
- [x] 6.2 Dynamic Skill：讀取 `agent_skills` 中 status=active，支援對話中以 draft 建立（`load_from_db` / `create_dynamic`）
- [x] 6.3 啟動時合併 Static + active Dynamic 的 metadata 為單一 registry
- [x] 6.4 漸進式載入：觸發時才讀取完整 SKILL.md 內容
- [x] 6.5 Memory 層：Skill 執行時從 Redis / agent_memory 讀取偏好參數（memory.py：RedisMemory + set/get_user_pref）
- [x] 6.6 升格流程：active Dynamic Skill 匯出為 SKILL.md → commit → 從 DB 移除（`promote_to_static`）

## 7. 工具層（src/services/agent/tools/）

- [x] 7.1 資料查詢封裝：MCP pg query / describe_schema / get_user_full_context、admin statistics / users、ai-backend insights / recommendation
- [x] 7.2 通訊整合封裝：email/send、email/bulk（admin token）、notifications、Notion MCP
- [x] 7.3 通用工具封裝：stealth_fetch、web_search、python_repl、read/write_file、bash、cron_create/list/delete
- [x] 7.4 安全護欄：prod DB 只允許 SELECT、批次上限 500（超過二次確認）、PII 不出庫、dry_run 預設

## 8. 對話 API（src/routers/agent.py）

- [x] 8.1 設計對話端點與 Pydantic schema（送出輸入、resume thread、回傳 approval）
- [x] 8.2 串接 QueryEngine 與 streaming 輸出（TODO stub，待接入實際 LLMClient）
- [x] 8.3 OpenAPI 文件與權限（`require_admin` / `get_user_id` Depends，X-DaoDao-Role / X-DaoDao-User-Id header 檢核）

## 9. Skill：practice-completion-email

- [x] 9.1 撰寫 SKILL.md（觸發語句、參數、步驟）
- [x] 9.2 Step 1 查詢：completed 實踐 + JOIN users（email 非空、打卡次數、最後心情）
- [x] 9.3 用戶數 > 50 時降級為最小欄位，跳過 get_user_full_context
- [x] 9.4 LLM 生成 subject/greeting/body/cta_text/next_step，依打卡次數調整口吻
- [x] 9.5 預覽先行：dry_run / 首次輸出 preview_count 封並等待確認
- [x] 9.6 去重：查 email_logs 近 30 天同 practice+user+practice 型未發過
- [x] 9.7 批次發送：email/send（每封間隔 200ms），退訂 / 無 email 跳過
- [x] 9.8 回報 success / skipped / failed 與失敗明細

## 10. Skill：monthly-insights

- [x] 10.1 撰寫 SKILL.md（觸發語句、參數、步驟）
- [x] 10.2 由 month 推導 START / END / PREV_START / PREV_END 區間
- [x] 10.3 活躍指標查詢：MAU、DAU 趨勢、打卡分布、新用戶、新建/完成實踐
- [x] 10.4 互動指標查詢：按讚/留言/追蹤總數、熱門實踐 Top N、最活躍用戶 Top N（LIMIT）
- [x] 10.5 留存計算（include_cohort）：prev_mau / retained / retention_rate
- [x] 10.6 LLM 撰寫洞察：summary / highlights / concerns / recommendations / narrative
- [x] 10.7 組裝輸出：markdown / notion（notion-search 找頁面再寫入）/ both，PII 不出庫

## 11. 測試與驗證

- [x] 11.1 Harness 單元測試（context 注入、AppState 跨 Turn）— tests/services/agent/test_context.py 9 cases（Model Drift 偵測尚未實作，對應測試待補）
- [x] 11.2 Approval Flow 測試（暫停、allow、deny 三路徑 + auto/normal 模式）— test_approval.py 7 cases
- [x] 11.3 Skill registry 測試（載入、合併、漸進式載入）— test_skill_registry.py 6 cases（升格 promote_to_static 尚未實作，對應測試待補）
- [ ] 11.4 兩個 Skill 的 dry-run 端到端驗證（不實際發送 / 不寫 Notion）— 需接入 LLMClient mock
- [x] 11.5 安全規範 regression（dev+prod 寫入被拒、批次 >500 二次確認、PII 遮罩）— test_security.py 17 cases + test_audit.py 10 cases
- [ ] 11.6 開放 dry_run=false 前的人工驗收

## 12. 會議決議增補（2026-07）

- [x] 12.1 DB 唯讀擴及 dev：`tools/db.py` assert_readonly_sql 涵蓋 dev+prod、擋多語句夾帶，regression 測試已補
- [x] 12.2 審批雙模式：`approval.py` ApprovalMode + ApprovalPolicy（denylist 恆勝）；`scheduling.py` 排程採 auto + 明確 allowlist（allowlist 設定值的 config > db > env 載入待接 12.3 設定層）
- [x] 12.3 第三方憑證供裝：`credentials.py` 解析優先序 config > db > env，connector 依角色綁定、未列出一律拒絕；無任何對話注入憑證的路徑
- [x] 12.4 資源容量護欄：`capacity.py` 記憶體/磁碟水位檢查，engine 於 Turn 啟動前拒絕帶病執行（執行中降級策略待後續接入工具層）
- [x] 12.5 Trace / Audit：`agent_audit_log` migration（storage 068）+ `audit.py` 寫入器（PII 遮罩、依 thread/user/時間查詢）；audit 呼叫點接入 router 待 8.2 一併處理
- [x] 12.6 Citation：context 指引 + AppState.sources 累積 + result item 附 sources
- [x] 12.7 檔案暫存 30 天 TTL：`tools/files.py` write_scratch_file + cleanup_expired_files（清理任務排程掛載待部署層）
- [x] 12.8 可重用程式碼沉澱：engine 於任務後偵測多工具組合並建議存為 draft Skill
- [x] 12.9 第三方開源方案調研（AnythingLLM / Open WebUI / LibreChat 等）— 已調研，無特別進展，不採用，維持自建
- [x] 12.10 排程執行身分：`scheduling.py` SchedulePrincipal 綁定建立者、validate_schedule_execution 於失去 admin 時要求停用、build_schedule_state 產出 auto 模式排程狀態（排程 runner 本體尚未存在，落地時 MUST 接上）
- [x] 12.11 處置 ai-backend `feat/agent` 分支：已 cherry-pick `6c06aae` 至 claude/ai-agent-architecture-nu5q51（基於 dev 最新、零衝突）並在其上補測試與 12.x；feat/agent 原分支保留未動，合併後可刪
- [x] 12.12 daodao-storage 補齊四張表 migration — `068_create_agent_tables.sql` + rollback（storage 分支 claude/ai-agent-architecture-nu5q51；dev DB 套用待人工）

## 13. 對帳後確認的實作缺口（3–8 節勾選高估部分）

- [ ] 13.1 Thread 持久化（persistence 層：create / resume / fork / archive 接 `agent_threads` 表）— 原勾選聲稱 persistence.py 完整實作，實際不存在
- [ ] 13.2 Memory 層（RedisMemory + `agent_memory` 讀寫）— 原勾選聲稱 memory.py 存在，實際不存在
- [ ] 13.3 Dynamic Skill DB 來源（load_from_db / create_dynamic / promote_to_static）— 現只有檔案系統 SkillLoader
- [ ] 13.4 SSE 串流與 Last-Event-ID 重連 — router 現況待驗證，engine 為 AsyncIterator 已可接
- [ ] 13.5 Context 耐久性（_compress_context 早期 turns 摘要）— 不存在
- [ ] 13.6 Model Drift 偵測 — 不存在
- [ ] 13.7 audit 呼叫點接入 router / engine（log_audit_event 已就緒，寫入點需 DB session）
- [ ] 13.8 允許清單設定載入：ApprovalPolicy 的 allowlist / denylist 從設定層（config > db > env）組裝
