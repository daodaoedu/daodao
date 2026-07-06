## 1. 資料層（daodao-storage）

- [x] 1.1 在 `migrate/sql/` 新增 `agent_threads` 表 migration（id、user_id、status、created_at、updated_at；支援 resume / fork / archive）
- [x] 1.2 新增 `agent_skills` 表 migration（name、description、skill_md、status：draft/active/archived、created_at）
- [x] 1.3 新增 `agent_memory` 表 migration（key、value、scope、updated_at）供動態行為參數
- [ ] 1.4 撰寫 migration 的 rollback / drop 腳本並於 dev DB 驗證套用（rollback SQL 已寫，待 dev DB 實際套用）

## 2. 設定與 provider（daodao-ai-backend）

- [x] 2.1 更新 `config.py`：`openrouter.model` 改為 `deepseek/deepseek-v4-flash`
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

- [x] 11.1 Harness 單元測試（context 注入、AppState 跨 Turn、Model Drift 觸發）— test_context.py 5 cases
- [x] 11.2 Approval Flow 測試（暫停、allow、deny 三路徑）— test_approval.py 4 cases
- [x] 11.3 Skill registry 測試（合併、漸進式載入、升格）— test_skill_registry.py 5 cases
- [ ] 11.4 兩個 Skill 的 dry-run 端到端驗證（不實際發送 / 不寫 Notion）— 需接入 LLMClient mock
- [x] 11.5 安全規範 regression（prod 寫入被拒、批次 >500 二次確認、PII 不出庫）— test_security.py 5 cases
- [ ] 11.6 開放 dry_run=false 前的人工驗收

## 12. 會議決議增補（2026-07）

- [ ] 12.1 DB 唯讀擴及 dev：工具層對 `daodao-pg-dev::query` 同樣只允許 SELECT，並補 regression 測試
- [ ] 12.2 審批雙模式：實作 normal / auto 模式與 allowlist / denylist 設定（config > db > env）；排程執行採 auto + 明確 allowlist
- [ ] 12.3 第三方憑證供裝：connector token 統一由設定層解析（config > db > env），拒用對話中提供的 token；可用 connector 依角色 / 組織綁定管理
- [ ] 12.4 資源容量護欄：session / turn 啟動前與執行中檢查記憶體與磁碟餘裕，不足時拒絕或降級（壓縮 / 分批 / 截斷）
- [ ] 12.5 Trace / Audit：daodao-storage 新增 `agent_audit_log` migration，記錄 LLM 呼叫、tool_call、approval 決策、Skill 觸發；支援依 thread / user / 時間查詢
- [ ] 12.6 Citation：Agent 回覆與報告附資料來源引用（DB 查詢摘要、API 端點、外部 URL）
- [ ] 12.7 檔案暫存 30 天 TTL：檔案工具記錄建立時間，逾 30 天由清理任務移除
- [ ] 12.8 可重用程式碼沉澱：任務完成後評估沉澱為腳本 / Dynamic Skill，走 draft → active → 升格 review 流程後才可掛排程
- [x] 12.9 第三方開源方案調研（AnythingLLM / Open WebUI / LibreChat 等）— 已調研，無特別進展，不採用，維持自建
