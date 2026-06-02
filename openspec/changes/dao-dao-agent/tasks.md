## 1. 資料層（daodao-storage）

- [ ] 1.1 在 `migrate/sql/` 新增 `agent_threads` 表 migration（id、user_id、status、created_at、updated_at；支援 resume / fork / archive）
- [ ] 1.2 新增 `agent_skills` 表 migration（name、description、skill_md、status：draft/active/archived、created_at）
- [ ] 1.3 新增 `agent_memory` 表 migration（key、value、scope、updated_at）供動態行為參數
- [ ] 1.4 撰寫 migration 的 rollback / drop 腳本並於 dev DB 驗證套用

## 2. 設定與 provider（daodao-ai-backend）

- [ ] 2.1 更新 `config.py`：`openrouter.model` 改為 `deepseek/deepseek-v4-flash`
- [ ] 2.2 確認 OpenRouter / Gemini / Ollama 等 provider API key 設定與讀取
- [ ] 2.3 驗證 `LLMClient` 可依指令切換 provider，並可回退預設

## 3. Harness 核心（src/services/agent/）

- [ ] 3.1 `context.py`：脈絡注入（當前日期、用戶權限、DB schema 摘要、provider 與 dry_run 狀態、先前操作摘要）
- [ ] 3.2 `state.py`：AppState 跨 Turn 狀態（provider、dry_run、active thread、已執行工具清單、approval 記錄）
- [ ] 3.3 `engine.py`：QueryEngine 任務循環（注入脈絡 → 識別意圖 → 選 Skill / 臨時組合 → 執行工具 → 回流）
- [ ] 3.4 Context 耐久性：早期 turns 摘要、大型查詢結果壓縮、核心指令重注入
- [ ] 3.5 Model Drift 偵測：每 Turn 結束檢查執行路徑是否仍在原始意圖內，偏離則中斷重新確認

## 4. 對話模型（Thread / Turn / Item）

- [ ] 4.1 Thread 持久化：create / resume / fork / archive，跨 session 還原狀態
- [ ] 4.2 Turn 工作週期：完整週期管理與 Approval 暫停／續行
- [ ] 4.3 Item 生命週期：user_message / agent_message / tool_call / approval_request / result，`started → delta → completed`
- [ ] 4.4 streaming 通道：以 delta 即時推送 agent_message 與工具進度

## 5. Approval Flow

- [ ] 5.1 `approval.py`：批次寫入前推出 approval_request 並暫停 Turn
- [ ] 5.2 SSE 下行串流推送 Item / approval_request；allow/deny 走 REST 上行（`POST /threads/{id}/turns/{tid}/approvals/{aid}`），支援 Last-Event-ID 重連
- [ ] 5.3 allow → 續行並回報；deny → 取消所有寫入並回報

## 6. Skill 系統

- [ ] 6.1 `skills/` 載入器：解析 SKILL.md 的 YAML frontmatter（name / description）與步驟
- [ ] 6.2 Dynamic Skill：讀取 `agent_skills` 中 status=active，支援對話中以 draft 建立
- [ ] 6.3 啟動時合併 Static + active Dynamic 的 metadata 為單一 registry
- [ ] 6.4 漸進式載入：觸發時才讀取完整 SKILL.md 內容
- [ ] 6.5 Memory 層：Skill 執行時從 Redis / agent_memory 讀取偏好參數
- [ ] 6.6 升格流程：active Dynamic Skill 匯出為 SKILL.md → commit → 從 DB 移除

## 7. 工具層（src/services/agent/tools/）

- [ ] 7.1 資料查詢封裝：MCP pg query / describe_schema / get_user_full_context、admin statistics / users、ai-backend insights / recommendation
- [ ] 7.2 通訊整合封裝：email/send、email/bulk（admin token）、notifications、Notion MCP
- [ ] 7.3 通用工具封裝：stealth_fetch、web_search、python_repl、read/write_file、bash、cron_create/list/delete
- [ ] 7.4 安全護欄：prod DB 只允許 SELECT、批次上限 500（超過二次確認）、PII 不出庫、dry_run 預設

## 8. 對話 API（src/routers/agent.py）

- [ ] 8.1 設計對話端點與 Zod/Pydantic schema（送出輸入、resume thread、回傳 approval）
- [ ] 8.2 串接 QueryEngine 與 streaming 輸出
- [ ] 8.3 OpenAPI 文件與權限（綁定 daodao 用戶身分 / admin 角色）

## 9. Skill：practice-completion-email

- [ ] 9.1 撰寫 SKILL.md（觸發語句、參數、步驟）
- [ ] 9.2 Step 1 查詢：completed 實踐 + JOIN users（email 非空、打卡次數、最後心情）
- [ ] 9.3 用戶數 > 50 時降級為最小欄位，跳過 get_user_full_context
- [ ] 9.4 LLM 生成 subject/greeting/body/cta_text/next_step，依打卡次數調整口吻
- [ ] 9.5 預覽先行：dry_run / 首次輸出 preview_count 封並等待確認
- [ ] 9.6 去重：查 email_logs 近 30 天同 practice+user+practice 型未發過
- [ ] 9.7 批次發送：email/send（每封間隔 200ms），退訂 / 無 email 跳過
- [ ] 9.8 回報 success / skipped / failed 與失敗明細

## 10. Skill：monthly-insights

- [ ] 10.1 撰寫 SKILL.md（觸發語句、參數、步驟）
- [ ] 10.2 由 month 推導 START / END / PREV_START / PREV_END 區間
- [ ] 10.3 活躍指標查詢：MAU、DAU 趨勢、打卡分布、新用戶、新建/完成實踐
- [ ] 10.4 互動指標查詢：按讚/留言/追蹤總數、熱門實踐 Top N、最活躍用戶 Top N（LIMIT）
- [ ] 10.5 留存計算（include_cohort）：prev_mau / retained / retention_rate
- [ ] 10.6 LLM 撰寫洞察：summary / highlights / concerns / recommendations / narrative
- [ ] 10.7 組裝輸出：markdown / notion（notion-search 找頁面再寫入）/ both，PII 不出庫

## 11. 測試與驗證

- [ ] 11.1 Harness 單元測試（context 注入、AppState 跨 Turn、Model Drift 觸發）
- [ ] 11.2 Approval Flow 測試（暫停、allow、deny 三路徑）
- [ ] 11.3 Skill registry 測試（合併、漸進式載入、升格）
- [ ] 11.4 兩個 Skill 的 dry-run 端到端驗證（不實際發送 / 不寫 Notion）
- [ ] 11.5 安全規範 regression（prod 寫入被拒、批次 >500 二次確認、PII 不出庫）
- [ ] 11.6 開放 dry_run=false 前的人工驗收
