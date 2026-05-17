## 0. 前置依賴（外部 Issues，需先完成）

- [ ] 0.1 [daodao-ai-backend] 修復 #8：抽象化各 provider system prompt 傳遞方式，確保 Anthropic 使用專用 system 參數而非 prepend（`llm-call` 節點的前置依賴）
  - AC：所有 10 個 provider 的 system prompt 傳遞方式統一，Anthropic 不再有 prepend bug

- [ ] 0.2 [daodao-ai-backend] 完成 #12：實作 LLM Tool System（ToolDefinition registry + function calling）（`skill-call` Tool Registry 的前置依賴）
  - AC：`ToolDefinition` 可註冊；AnthropicBackend / OpenAIBackend 支援 `tools=` 參數；至少實作 `query_user_stats`、`search_practices` 兩個內建工具

## 1. DB Migration（daodao-storage）

- [ ] 1.1 [daodao-storage] 新增 workflow engine migration SQL，建立 14 張 table：`workflows`（含 `max_cost_usd`）、`workflow_nodes`、`workflow_edges`、`workflow_triggers`、`workflow_runs`（含 `total_cost_usd`、`total_latency_ms`、`pending_approval` / `circuit_open` status、`checkpoint_state` JSONB）、`workflow_node_runs`（含 `token_count`、`latency_ms`、`cost_usd`）、`workflow_ab_tests`、`workflow_approval_requests`、`workflow_run_evals`、`workflow_data_source_config`、`workflow_skills`、`workflow_skill_files`、`workflow_skill_conversations`、`workflow_skill_memories`
  - AC：migration 可正向執行，rollback 可刪除全部新 table 且不影響既有資料

## 2. daodao-ai-backend — Internal Endpoints

- [ ] 2.1 [daodao-ai-backend] 新增 `GET /internal/providers`，回傳所有 `_LLM_BACKEND_DEFAULTS` 的 key、defaultModel、是否有 api_key
  - AC：回傳 JSON 列表，不對外暴露 api_key 值

- [ ] 2.2 [daodao-ai-backend] 新增 `POST /internal/execute/llm-call`，接收 provider、model_override、system_prompt、prompt（已代入變數後的字串），回傳 output 字串
  - AC：呼叫指定 provider LLM 並回傳結果；provider 不存在時回傳 400

- [ ] 2.3 [daodao-ai-backend] 在 2.2 基礎上支援 `fallback_provider`（對應 #10）：primary 失敗時自動切換 fallback provider 重試一次
  - AC：primary 失敗時 log warning 並以 fallback 重試，兩者皆失敗才回傳 500

- [ ] 2.4 [daodao-ai-backend] 新增 `POST /internal/execute/skill-call`，接收 skill_id、provider、model_override、input；從 DB 讀取 Skill 的 skill_md（system prompt），組合 Tool Registry 內建工具（依賴 #12）與 scripts/ 自定義工具，以 ReAct agent loop 執行後回傳 output
  - AC：Skill 不存在時回傳 404；LLM 工具呼叫迴圈超過 10 步時中止並回傳 500；#12 未完成時退化為純 system prompt 執行（不帶 tools）

- [ ] 2.5 [daodao-ai-backend] 新增 `POST /internal/workflow-skills/:skillId/chat`，接收對話歷史 + 新訊息 + provider；以 LLM 生成 Skill 修改建議，回傳 `{ reply: string, skill_md_diff?: string, file_diffs?: FileDiff[] }`
  - AC：回傳結構符合 schema；LLM 建議無法解析時回傳 reply 但不帶 diff

- [ ] 2.6 [daodao-ai-backend] 在 `/internal/execute/llm-call` 加入 guardrail 掃描（對應 #7）：偵測 prompt injection 並拒絕執行
  - AC：含明顯 injection pattern 的 prompt 回傳 400，正常 prompt 正常執行

- [ ] 2.7 [daodao-ai-backend] llm-call 執行完畢後發送 PostHog `$ai_generation` 事件（對應 #18），包含 provider、token 數、latency_ms
  - AC：執行後 PostHog 可收到事件；PostHog api_key 未設定時靜默跳過

- [ ] 2.8 [daodao-ai-backend] llm-call / skill-call 執行後，response 加入 `token_count`、`latency_ms`、`cost_usd` 欄位回傳給 daodao-server；cost_usd 依 provider pricing table 估算，無定價資料時回傳 null
  - AC：`/internal/execute/llm-call` 與 `/internal/execute/skill-call` response schema 包含三個 observability 欄位；單元測試涵蓋有 / 無定價資料的情境

- [ ] 2.9 [daodao-ai-backend] llm-call / skill-call 執行時送 Langfuse trace：執行前建立 span（`trace_id = node_run_id`），執行後結束 span 並附 token / cost metadata
  - AC：Langfuse api_key 已設定時可在 Langfuse dashboard 看到 span；api_key 未設定時靜默跳過，不影響執行結果

## 3. daodao-server — Zod Schemas

- [ ] 3.1 [daodao-server] 定義各 node_type 的 config Zod schema：`llmCallConfigSchema`、`skillCallConfigSchema`、`dataFetchConfigSchema`、`dataTransformConfigSchema`、`toolCallConfigSchema`、`outputConfigSchema`
  - AC：合法 config 通過驗證；缺少必填欄位或 node_type 不合法時回傳 422

- [ ] 3.2 [daodao-server] 定義 `{{nodes.<id>.output}}` 變數解析工具函式：給定 node_runs map 與 template 字串，回傳代入後的字串
  - AC：單元測試涵蓋：正常代入、引用不存在 nodeId（回傳空字串 + warning）、巢狀 template

## 4. daodao-server — Workflow CRUD API

- [ ] 4.1 [daodao-server] 實作 `GET/POST /api/admin/workflows` 與 `GET/PATCH/DELETE /api/admin/workflows/:id`
  - AC：CRUD 正常運作；DELETE 聯級刪除 nodes / edges / triggers

- [ ] 4.2 [daodao-server] 實作 `GET/POST /api/admin/workflows/:id/nodes` 與 `PATCH/DELETE /api/admin/workflows/:id/nodes/:nodeId`
  - AC：新增時 config 通過對應 Zod schema 驗證；刪除 node 同時刪除相關 edges

- [ ] 4.3 [daodao-server] 實作 `GET/POST /api/admin/workflows/:id/edges` 與 `DELETE /api/admin/workflows/:id/edges/:edgeId`
  - AC：新增 edge 時驗證 source / target node 均屬於同一 workflow；拖拉排序可批次重建 edges

- [ ] 4.4 [daodao-server] 實作 `GET/POST /api/admin/workflows/:id/triggers` 與 `PATCH/DELETE /api/admin/workflows/:id/triggers/:triggerId`（Phase 1 只允許 `manual` trigger_type）
  - AC：嘗試建立非 `manual` trigger 時回傳 422 並說明「Phase 2 開放」

## 5. daodao-server — Execution Engine

- [ ] 5.1 [daodao-server] 實作 workflow 靜態分析：拓撲排序 + 懸空引用檢測（`{{nodes.<id>.output}}` 引用不存在的 nodeId）
  - AC：有懸空引用時回傳具體 nodeId 與錯誤位置；無環且所有節點可達才通過

- [ ] 5.2 [daodao-server] 實作 `data-fetch` node 執行：根據 scope（single_user / all_users）與 allowed_fields 白名單查 Prisma，回傳結構化資料
  - AC：只回傳白名單內的欄位；白名單為空時拒絕並回傳錯誤

- [ ] 5.3 [daodao-server] 實作 `data-transform` node 執行：支援 filter / limit 操作
  - AC：各操作有單元測試；不合法 operation type 跳過並 log warning

- [ ] 5.4 [daodao-server] 實作 `llm-call` node 執行：代入 `{{nodes.<id>.output}}` 變數後，呼叫 `POST /internal/execute/llm-call`（daodao-ai-backend）
  - AC：變數代入正確；ai-backend 回傳 4xx/5xx 時將 node_run 標記 failed

- [ ] 5.5 [daodao-server] 實作 `skill-call` node 執行：代入 input_template 變數後，呼叫 `POST /internal/execute/skill-call`（daodao-ai-backend）
  - AC：Skill 不存在時將 node_run 標記 failed；ai-backend 回傳 4xx/5xx 時同樣標記 failed

- [ ] 5.6 [daodao-server] 實作 `tool-call` node 執行：代入 body_template 變數後，發送 HTTP 請求
  - AC：HTTP 4xx/5xx 將 node_run 標記 failed；timeout 設定 30 秒

- [ ] 5.7 [daodao-server] 實作 `output` node 執行：寫回 DB（Prisma）或發通知；dry-run 時跳過寫回
  - AC：dry-run 模式下 output node status 為 `skipped`，不寫入任何業務資料

- [ ] 5.8 [daodao-server] 實作主執行流程：建立 `workflow_runs`，依拓撲順序逐一執行 nodes，每個 node 前後建立 `workflow_node_runs` 記錄，整個 run 完成後更新 status
  - AC：某 node 失敗時後續 nodes 標記 `skipped`，run 標記 `failed`

- [ ] 5.9 [daodao-server] 實作 `POST /api/admin/workflows/:id/runs`（手動觸發）與 `GET /api/admin/workflow-runs/:runId`（含所有 node_runs）
  - AC：執行觸發回傳 run id；GET 回傳每個 node_run 的狀態、輸入、輸出、token_count、latency_ms、cost_usd

- [ ] 5.10 [daodao-server] 每個 node 執行完成後，將 ai-backend 回傳的 `token_count`、`latency_ms`、`cost_usd` 寫入 `workflow_node_runs`
  - AC：llm-call / skill-call node_run 有完整三個欄位；data-fetch / data-transform / tool-call / output 等非 LLM node 的 latency_ms 仍記錄（token_count / cost_usd 為 null）

- [ ] 5.11 [daodao-server] skill-call node 執行時，將 `max_iterations` 傳給 ai-backend；ai-backend 回傳「超過迴圈限制」錯誤時，node_run 標記 `failed` 並記錄原因，run 整體標記 `failed`
  - AC：`max_iterations` 預設值 10；超出時 error 欄位記錄「超過 max_iterations 限制（{n} 步）」

- [ ] 5.12 [daodao-server] 執行引擎每個 node 完成後，累加 `cost_usd`；若累計值超過 `workflow.max_cost_usd`（非 null），立即中止後續 node，run 標記 `failed`
  - AC：error 記錄「超過 max_cost_usd 限制（已花費 X USD，上限 Y USD）」；max_cost_usd 為 null 時跳過此檢查

- [ ] 5.13 [daodao-server] output node 遇到 `require_approval: true` 時，建立 `workflow_approval_requests`（preview 存擬寫入資料快照），將 run status 改為 `pending_approval`，暫停執行（不繼續後續 node）
  - AC：run status 正確變為 `pending_approval`；approval_request 記錄含正確的 run_id、node_run_id、preview

- [ ] 5.14 [daodao-server] run 完成（status 變為 `completed` 或 `failed`）時，彙總所有 node_run 的 `cost_usd` 與 `latency_ms`，更新 `workflow_runs.total_cost_usd` 與 `total_latency_ms`
  - AC：部分 node cost_usd 為 null 時，彙總只計算非 null 的值；total_latency_ms 為所有 node latency_ms 之和

## 6. daodao-server — Providers、Data Sources、A/B Tests

- [ ] 6.1 [daodao-server] 實作 `GET /api/admin/ai-providers`（轉發 `GET /internal/providers` 到 ai-backend）
  - AC：回傳 provider 清單；ai-backend 不可用時回傳 503

- [ ] 6.2 [daodao-server] 實作 `GET/PATCH /api/admin/workflow-data-sources`（操作 `workflow_data_source_config` singleton）
  - AC：PATCH 只更新 allowed_fields，其他欄位忽略；GET 白名單為空時回傳空陣列

- [ ] 6.3 [daodao-server] 實作 `POST /api/admin/workflow-ab-tests`：同時建立兩個 dry-run、建立 `workflow_ab_tests` 關聯
  - AC：兩個 run 同時非同步觸發；ab_test 記錄正確關聯兩個 run_id

- [ ] 6.4 [daodao-server] 實作 `GET /api/admin/workflow-ab-tests` 與 `GET /api/admin/workflow-ab-tests/:id`
  - AC：列表依時間倒序；詳情含兩個 run 的完整 node_runs

- [ ] 6.5 [daodao-server] 實作 `POST /api/admin/workflow-runs/:runId/approve`：將 `workflow_approval_requests` 的 status 改為 `approved`，run status 改回 `running`，繼續執行剩餘 node（output node 實際寫入）
  - AC：只有 status 為 `pending_approval` 的 run 可核准；核准後 run 繼續執行並最終 completed / failed；重複核准回傳 409

- [ ] 6.6 [daodao-server] 實作 `POST /api/admin/workflow-runs/:runId/reject`：將 `workflow_approval_requests` 的 status 改為 `rejected`，run status 改為 `failed`，node_run 標記 `failed` 並記錄「Admin 拒絕核准」
  - AC：只有 status 為 `pending_approval` 的 run 可拒絕；拒絕後 run 不再繼續執行

## 7. daodao-admin-ui — Workflow 列表與建立

- [ ] 7.1 [daodao-admin-ui] 建立 `/workflows` 列表頁，顯示所有 workflows（名稱、狀態、建立時間），頂部提供「新增 Workflow」按鈕
  - AC：列表正確顯示；點擊「新增 Workflow」開啟 Dialog

- [ ] 7.2 [daodao-admin-ui] 實作「手動建立」：Dialog 填入名稱 / 描述後呼叫 POST API，成功後導向 `/workflows/:id`
  - AC：名稱為空時顯示驗證錯誤；成功導向編輯頁

## 8. daodao-admin-ui — Node / Edge Builder

- [ ] 8.1 [daodao-admin-ui] 實作 Node 卡片元件：各 node_type 顯示對應 badge 顏色與 config 重點預覽（llm-call 顯示 provider/model、skill-call 顯示 Skill 名稱、data-fetch 顯示欄位數量等）
  - AC：7 種 node_type 均有對應視覺樣式

- [ ] 8.2 [daodao-admin-ui] 實作各 node_type 的 inline 設定表單（react-hook-form + Zod），含欄位驗證
  - AC：送出前通過前端 Zod 驗證；切換 provider 自動帶入預設 model

- [ ] 8.3 [daodao-admin-ui] 實作 Provider / Model 下拉選單元件，呼叫 `GET /api/admin/ai-providers` 取得清單
  - AC：provider 清單正確顯示；無可用 provider 時顯示提示並禁用 llm-call

- [ ] 8.4 [daodao-admin-ui] 實作拖拉排序（@dnd-kit/core），排序後批次更新 edges
  - AC：拖拉後順序即時反映；PATCH API 更新成功

- [ ] 8.5 [daodao-admin-ui] 實作 `{{nodes.<id>.output}}` 引用提示：在 prompt template 輸入框旁顯示可用前驅節點清單（含 node label 與 id）
  - AC：第一個 node 不顯示 `{{nodes...}}` 提示；引用不存在 node 時顯示警告

- [ ] 8.6 [daodao-admin-ui] 實作 `skill-call` Node 設定表單：Skill 下拉清單（呼叫 GET /api/admin/workflow-skills）、provider/model 選擇、input template 輸入
  - AC：無 Skill 時顯示「請先建立 Skill」提示並附跳轉連結；選擇 Skill 後卡片顯示 Skill 名稱

## 9. daodao-admin-ui — Trigger 設定

- [ ] 9.1 [daodao-admin-ui] 實作 Trigger 設定區塊（在 Workflow 詳情頁），Phase 1 只顯示「新增手動觸發」；非 manual 類型顯示「Phase 2 開放」說明
  - AC：manual trigger 建立後 Workflow 詳情頁出現「執行」按鈕

## 10. daodao-admin-ui — 執行 & 結果

- [ ] 10.1 [daodao-admin-ui] 實作執行 Dialog：選擇 scope（single_user 填 user ID / all_users），呼叫 POST runs API
  - AC：送出後顯示執行中狀態；API 錯誤顯示錯誤訊息

- [ ] 10.2 [daodao-admin-ui] 實作執行狀態 polling（每 3 秒 GET /api/admin/workflow-runs/:runId），run 完成後停止 polling
  - AC：每個 node 的狀態即時更新；failed node 顯示紅色標示

- [ ] 10.3 [daodao-admin-ui] 實作執行結果頁：依 node 順序展示每個 node_run 的輸入 / 輸出（可展開 / 收合）；頁頭顯示 run 的 `total_cost_usd` 與 `total_latency_ms`；每個 node_run 展開後顯示 `token_count`、`latency_ms`、`cost_usd`
  - AC：completed node 顯示輸出；failed node 顯示錯誤訊息與「重試」按鈕；LLM node（llm-call / skill-call）顯示 token/cost/latency；非 LLM node 僅顯示 latency_ms（token/cost 為 null 時隱藏）；total_cost_usd 為 null 時頁頭不顯示成本區塊

## 11. daodao-admin-ui — A/B 測試

- [ ] 11.1 [daodao-admin-ui] 實作 A/B 測試建立頁：選 Workflow A、Workflow B、scope，呼叫 POST /api/admin/workflow-ab-tests
  - AC：未選兩個 Workflow 時顯示驗證錯誤

- [ ] 11.2 [daodao-admin-ui] 實作 A/B 測試結果頁：左右並排顯示兩組每個 Node 的輸出，3 秒 polling 直到兩組完成
  - AC：任一 run 失敗時對應欄位顯示錯誤，另一欄位正常顯示

- [ ] 11.3 [daodao-admin-ui] 實作 A/B 測試歷史列表，點擊可重新查看並排結果
  - AC：依時間倒序排列；顯示兩個 Workflow 名稱與各組狀態

## 12. daodao-server — Workflow Skill API

- [ ] 12.1 [daodao-server] 實作 `GET/POST /api/admin/workflow-skills` 與 `GET/PATCH/DELETE /api/admin/workflow-skills/:skillId`
  - AC：POST 名稱為空時回傳 422；DELETE 聯級刪除 skill_files 與 skill_conversations

- [ ] 12.2 [daodao-server] 實作 `GET/POST /api/admin/workflow-skills/:skillId/files` 與 `DELETE /api/admin/workflow-skills/:skillId/files/:fileId`
  - AC：category 不屬於 scripts / references / assets 時回傳 422；同一 skill 同 category 同 filename 時覆寫

- [ ] 12.3 [daodao-server] 實作 `GET /api/admin/workflow-skills/:skillId/conversations`，回傳依時間正序的對話記錄
  - AC：Skill 不存在時回傳 404

- [ ] 12.4 [daodao-server] 實作 `POST /api/admin/workflow-skills/:skillId/chat`：儲存 user 訊息，轉發到 `POST /internal/workflow-skills/:skillId/chat`（ai-backend），儲存 assistant 回覆，回傳 `{ reply, skill_md_diff?, file_diffs? }`
  - AC：ai-backend 不可用時回傳 503；對話記錄正確儲存雙方訊息

- [ ] 12.5 [daodao-server] 實作 `POST /api/admin/workflow-skills/:skillId/apply`：接收 `{ skill_md?, file_diffs? }`，寫回 skill_md 與相關檔案
  - AC：只更新有差異的欄位；寫入後回傳更新後的 Skill 完整資料

## 13. daodao-admin-ui — Skill 管理

- [ ] 13.1 [daodao-admin-ui] 建立 `/workflow-skills` 列表頁，顯示所有 Skill（名稱、描述、更新時間），頂部提供「新增 Skill」按鈕
  - AC：列表正確顯示；點擊 Skill 進入詳情頁

- [ ] 13.2 [daodao-admin-ui] 實作「新增 Skill」Dialog：填入名稱與描述後建立，成功後導向 `/workflow-skills/:skillId`
  - AC：名稱為空時驗證錯誤

- [ ] 13.3 [daodao-admin-ui] 實作 Skill 詳情頁分頁結構：「SKILL.md」、「Scripts」、「References」、「Assets」、「Agent 協助」五個分頁
  - AC：分頁切換正確；URL 帶 tab query param 以便直接連結

- [ ] 13.4 [daodao-admin-ui] 實作「SKILL.md」分頁：textarea 編輯器 + 「儲存」按鈕，儲存後顯示 toast
  - AC：內容為空時允許儲存（清空）；API 失敗時顯示錯誤訊息

- [ ] 13.5 [daodao-admin-ui] 實作「Scripts / References / Assets」分頁：檔案列表 + 上傳按鈕 + 刪除確認
  - AC：上傳成功後檔案立即出現在清單；文字檔（scripts / references）可展開預覽內容

- [ ] 13.6 [daodao-admin-ui] 實作「Agent 協助」分頁：對話氣泡列表 + 輸入框 + 送出按鈕；送出中禁用輸入
  - AC：Agent 回覆含 diff 時在氣泡下方顯示差異預覽（現有 vs 建議）與「套用」「忽略」按鈕

- [ ] 13.7 [daodao-admin-ui] 實作「套用 Agent 建議」：點擊「套用」呼叫 POST /apply，成功後更新 SKILL.md 分頁內容，對話記錄標記已套用
  - AC：套用成功顯示「已套用至 SKILL.md」toast；套用失敗顯示錯誤且不清除對話

## 14. daodao-admin-ui — 資料來源設定

- [ ] 14.1 [daodao-admin-ui] 實作 `/workflow-data-sources` 設定頁：列出所有可選欄位，以 Switch 切換啟用狀態，儲存後顯示 toast
  - AC：已啟用欄位在 data-fetch Node 設定表單中可被選取；儲存成功顯示「設定已更新」

## 15. Evals

- [ ] 15.1 [daodao-server] 實作 `POST /api/admin/workflow-runs/:runId/eval`（儲存 `rating` + `notes` 到 `workflow_run_evals`）與 `GET /api/admin/workflow-run-evals`（支援 query param `workflow_id`、`rating` 篩選，依時間倒序）
  - AC：rating 不為 `good` / `bad` 時回傳 422；run 不存在時回傳 404；同一 run 可有多筆 eval（多人標記）；GET 列表含關聯的 workflow_id 與 run status

- [ ] 15.2 [daodao-admin-ui] 在執行結果頁底部加「評分」區塊：👍 / 👎 兩個按鈕 + 備註欄（textarea）+ 「送出評分」按鈕；送出後顯示 toast「評分已記錄」；run status 不為 `completed` / `failed` 時隱藏此區塊
  - AC：送出成功後按鈕保持選中狀態；API 失敗時顯示錯誤訊息且不清除輸入內容；同一 run 可重複送出（多筆記錄）

## 16. Approval Gate UI

- [ ] 16.1 [daodao-admin-ui] 實作 Approval 通知：run status polling 到 `pending_approval` 時，停止一般 polling，改以明顯的「等待核准」提示覆蓋執行結果頁，並展示 `workflow_approval_requests.preview` 的擬寫入內容（JSON 格式可展開）
  - AC：`pending_approval` 狀態下顯示醒目的橘色提示區塊；preview 內容以格式化 JSON 呈現；若 approval_request 不存在則顯示「無法取得預覽資料」

- [ ] 16.2 [daodao-admin-ui] 實作「核准」與「拒絕」按鈕（在 16.1 的提示區塊內）：核准呼叫 `POST /api/admin/workflow-runs/:runId/approve`，拒絕呼叫 `POST /api/admin/workflow-runs/:runId/reject`；操作後恢復 3 秒 polling 直到 run 最終完成
  - AC：核准 / 拒絕操作中顯示 loading 狀態，防止重複點擊；操作成功後提示區塊消失，恢復正常執行結果頁；操作失敗顯示錯誤訊息

## 17. Phase 2 — Observability（OpenTelemetry + Langfuse Evals）

### 17a. Infrastructure Metrics（OpenTelemetry）

- [ ] 17.1 [daodao-server] 安裝 `@opentelemetry/sdk-node`、`@opentelemetry/auto-instrumentations-node`；初始化 OTLP exporter，自動 instrument Express routes
  - AC：每個 API endpoint 的 latency / error rate 可在 OTLP 接收端看到；不影響現有 API 行為

- [ ] 17.2 [daodao-server] 新增自訂 metrics：`workflow_active_runs`（gauge）、`workflow_node_execution_duration_ms`（histogram by node_type）、`workflow_run_cost_usd`（histogram）
  - AC：每次 node 執行後 record 對應指標；Grafana 可查到各 node_type 的 latency 分佈

- [ ] 17.3 [daodao-ai-backend] 安裝 `opentelemetry-sdk`、`opentelemetry-instrumentation-fastapi`；初始化 OTLP exporter，自動 instrument FastAPI routes
  - AC：LLM call endpoint 的 latency 可在 OTLP 接收端看到

- [ ] 17.4 [daodao-ai-backend] 新增自訂 metrics：`llm_call_duration_ms`（histogram by provider）、`react_loop_steps`（histogram）、`guardrail_triggered_total`（counter）
  - AC：每次 llm-call / skill-call 後 record 對應指標；guardrail 觸發可計數

- [ ] 17.5 [infra] 部署 OpenTelemetry Collector + Grafana（self-hosted docker-compose 或 Grafana Cloud）；建立 Workflow Engine dashboard：active runs、node latency P95 by type、total cost/day、error rate
  - AC：dashboard 可即時查到上述四個指標

### 17b. Langfuse Evals 整合

- [ ] 17.6 [daodao-server] 在 `POST /api/admin/workflow-runs/:runId/eval` 成功後，非同步將 rating 同步 push 到 Langfuse Trace score annotation（`trace_id = node_run_id`，score = 1.0 for good / 0.0 for bad）
  - AC：Langfuse api_key 未設定時靜默跳過；push 失敗不影響本地 eval 儲存

- [ ] 17.7 [daodao-server] 實作 LLM-as-judge 自動評估：run 完成後，若 workflow 有設定 `eval_prompt`，呼叫 ai-backend 以 LLM 對 run output 評分（0–1），結果寫入 `workflow_run_evals.auto_score` 並 push 到 Langfuse
  - AC：`eval_prompt` 未設定時跳過；auto_score 在 workflow_run_evals 可查；push 到 Langfuse 的 score name 為 `auto_judge`

- [ ] 17.8 [daodao-server] 實作 Trajectory Evaluation：skill-call node 執行時，記錄每步 ReAct loop 的 tool_name 與 LLM reasoning 到 `workflow_node_runs.trajectory`（JSONB）；run 完成後可選擇以 LLM-as-judge 評估工具選擇正確率
  - AC：trajectory 欄位需在 DB migration 中加入 `workflow_node_runs`；GET /workflow-runs/:runId 回傳 trajectory

- [ ] 17.9 [daodao-admin-ui] 在執行結果頁的 skill-call node_run 展開區塊，顯示 trajectory（每步工具呼叫 + reasoning 的時間軸），並顯示 `auto_score`（若有）
  - AC：trajectory 以時間軸樣式呈現，每步顯示工具名稱、輸入、輸出；auto_score 顯示為百分比

## 18. Output Guards（Phase 1）

- [ ] 18.1 [daodao-ai-backend] llm-call 執行後，若 node config 有 `output_schema`，用 JSON Schema 驗證 LLM 輸出；不符合時回傳 422 含驗證錯誤細節（哪個欄位、哪個規則不符合）
  - AC：有效 output_schema 且 LLM 輸出符合 schema 時正常回傳；LLM 輸出不符合 schema 時回傳 422，body 含 `{ error: "output_schema_violation", details: [...] }`；未設定 output_schema 時跳過驗證，行為不變

- [ ] 18.2 [daodao-server] `llmCallConfigSchema` 加入 `output_schema?: object`（JSON Schema 格式）；更新 Zod schema 以 `z.object({}).passthrough().optional()` 接受任意合法 JSON Schema 物件；節點 config 驗證通過後將 output_schema 傳給 ai-backend
  - AC：設定 output_schema 的 llm-call node 可正常建立並通過 Zod 驗證；未設定時 schema 驗證亦通過；ai-backend 回傳 422 時 node_run 標記 `failed`，error 記錄驗證失敗細節

## 19. Dead Loop Detection + Circuit Breaker（Phase 1）

- [ ] 19.1 [daodao-ai-backend] skill-call ReAct loop 中，對每步 `tool_name + JSON.stringify(tool_input)` 計算 hash；連續 3 步 hash 相同時立即中止 loop 並回傳 `{ error: "dead_loop_detected", step: N }` (500)
  - AC：連續 3 步完全相同的工具呼叫觸發中止；不同工具呼叫或不同 input 不觸發；回傳 500 且 body 含 error 與 step 欄位

- [ ] 19.2 [daodao-server] 接收 ai-backend 回傳的 `dead_loop_detected` 錯誤時，node_run 標記 `failed`，error 欄位記錄「偵測到死迴圈（第 N 步重複）」
  - AC：error 訊息包含步數；run 整體標記 `failed`；後續 node 標記 `skipped`

- [ ] 19.3 [daodao-server] Circuit Breaker：node 執行失敗後，記錄失敗時間戳到 Redis（或 in-memory 快取），key 為 `circuit:${nodeId}`；30 分鐘內同一 node 連續失敗 3 次時，run 標記 `circuit_open`，node_run 標記 `failed`，error 記錄「Circuit Breaker 啟動，冷卻至 {時間}」（冷卻 10 分鐘）；冷卻期間對同 node 的新 run 直接標記 `circuit_open` 而不執行
  - AC：同一 node 連續失敗 2 次時仍正常執行；第 3 次失敗觸發 circuit_open；冷卻 10 分鐘後可再次執行；`workflow_runs.status` CHECK constraint 包含 `circuit_open`

- [ ] 19.4 [daodao-admin-ui] Circuit Breaker 狀態顯示：run status 為 `circuit_open` 時，在執行結果頁頂部顯示橘色警告區塊「執行被 Circuit Breaker 中止」並顯示冷卻結束時間
  - AC：`circuit_open` 狀態有明顯橘色視覺區分（不同於一般 `failed` 的紅色）；顯示冷卻結束時間（格式：YYYY-MM-DD HH:mm）；冷卻時間從 error 訊息解析

## 20. Context Compression（Phase 1）

- [ ] 20.1 [daodao-ai-backend] skill-call ReAct loop 中，每步執行前計算累積 context token 數；超過 `context_compress_threshold`（來自 node config，預設 8000）時，呼叫 LLM 對第 4 步以前的歷史做摘要壓縮，保留最新 3 步 + 壓縮摘要，繼續 loop
  - AC：累積 token 數未超過閾值時不壓縮；超過閾值時自動壓縮且 loop 繼續執行（不中止）；壓縮後的 context token 數低於閾值；壓縮後最終輸出品質不因壓縮明顯下降（整合測試以 smoke test 覆蓋）

- [ ] 20.2 [daodao-ai-backend] 壓縮事件記錄到 trajectory：新增 step type `"context_compressed"`，記錄壓縮前後 token 數、被壓縮的步數範圍
  - AC：trajectory 中可查到 `type: "context_compressed"` 的步驟記錄；該記錄含 `tokens_before`、`tokens_after`、`compressed_steps` 欄位

## 21. Checkpoint-Resume（Phase 2）

- [ ] 21.1 [daodao-server] 每個 node 執行完成後，將該 node 的 output 快照 upsert 進 `workflow_runs.checkpoint_state`（JSONB，格式 `{ [nodeId]: output }`）
  - AC：node 完成時 checkpoint_state 立即更新；run 中途失敗時 checkpoint_state 保留已完成 node 的 output；checkpoint_state 為 null 的 run 表示尚未完成任何 node

- [ ] 21.2 [daodao-server] 實作 `POST /api/admin/workflow-runs/:runId/resume`：讀取 checkpoint_state，將已完成 node 標記為 `skipped`（不重新執行），從第一個未完成 node 繼續執行；只有 status 為 `failed` 且 checkpoint_state 非空的 run 可 resume
  - AC：status 不為 `failed` 時回傳 422；checkpoint_state 為空時回傳 422 並說明「無可用斷點」；resume 後 run status 改回 `running`；已完成 node 的 output 從 checkpoint_state 還原而非重新執行；最終結果與正常執行一致

- [ ] 21.3 [daodao-admin-ui] failed run 詳情頁顯示「從斷點繼續」按鈕，僅在 status = `failed` 且 checkpoint_state 非空時顯示；點擊後呼叫 `POST /api/admin/workflow-runs/:runId/resume`，成功後恢復 3 秒 polling 直到 run 完成
  - AC：按鈕僅在條件滿足時顯示；點擊中顯示 loading；resume 成功後按鈕消失，恢復正常執行結果頁；API 失敗顯示錯誤訊息

## 22. Tool Registry 動態過濾（Phase 2）

- [ ] 22.1 [daodao-ai-backend] `ToolDefinition` 加 `tags: string[]` 欄位（現有工具補充 tags）；`POST /internal/execute/skill-call` 接收 `tool_tags?: string[]`，若已設定則只載入 tags 與 tool_tags 有交集的工具；新增 `GET /internal/tool-registry/tags` 回傳所有可用 tags 清單
  - AC：設定 tool_tags 時只有 tags 有交集的工具被載入；未設定 tool_tags 時全部工具載入（行為不變）；`GET /internal/tool-registry/tags` 回傳去重後的 tag 陣列

- [ ] 22.2 [daodao-admin-ui] skill-call Node 設定表單加 `tool_tags` 多選欄位，選項從 `GET /api/admin/tool-registry/tags`（轉發 ai-backend）取得；可多選或清空（清空表示載入全部）
  - AC：多選欄位正確顯示所有可用 tags；選擇後儲存到 node config；清空時 tool_tags 欄位不包含在 config 中（或為空陣列）

## 23. Memory Extractor（Phase 2）

- [ ] 23.1 [daodao-storage] 新增 `workflow_skill_memories` migration：欄位 `id`（UUID PK）、`skill_id`（FK → workflow_skills）、`run_id`（FK → workflow_runs）、`memory_type`（TEXT CHECK IN ('episodic', 'semantic')）、`content`（TEXT）、`created_at`（TIMESTAMPTZ）
  - AC：migration 可正向執行；rollback 刪除此 table 不影響其他資料

- [ ] 23.2 [daodao-ai-backend] 新增 `POST /internal/workflow-skills/:skillId/extract-memory`：接收 `{ trajectory, run_id }`，以 LLM 分析 trajectory，提取有長期價值的資訊（成功工具路徑、有用中間輸出），回傳 `{ memories: [{ type: "episodic" | "semantic", content: string }] }`
  - AC：回傳 memories 陣列（可為空）；LLM 無法解析時回傳空陣列而非 500；Skill 不存在時回傳 404

- [ ] 23.3 [daodao-server] run 完成後（status = `completed`），若有 skill-call node_run，非同步（fire-and-forget）呼叫 ai-backend `POST /internal/workflow-skills/:skillId/extract-memory`；將回傳的 memories 批次寫入 `workflow_skill_memories`
  - AC：非同步呼叫不阻塞 run 完成回應；extract-memory 失敗時 log warning 但不改變 run status；memory 寫入後可在 `workflow_skill_memories` 查到對應 skill_id 與 run_id

- [ ] 23.4 [daodao-ai-backend] skill-call 執行前，從 `workflow_skill_memories` 查詢同 skill 最近 10 筆 episodic memory（依 created_at 倒序），以 XML block 注入 system prompt（`<past_learnings>` 包裹），放在 SKILL.md 內容之後
  - AC：有 episodic memory 時 system prompt 含 `<past_learnings>` block；無記憶時不注入（不影響現有行為）；最多注入 10 筆

## 24. Phase 3 — Generator-Evaluator 即時迴圈（Phase 3，placeholder）

- [ ] 24.1 [Phase 3] skill-call 支援 `evaluator` config：每 N 步後獨立 LLM 評審輸出品質，低於 `min_score` 時繼續迭代，達到 `max_evals` 次評估後強制輸出
  - AC：Phase 3 規劃中，詳細 AC 待 Phase 3 設計階段定義

## 25. Phase 3 — Context Durability 監測（Phase 3，placeholder）

- [ ] 25.1 [Phase 3] skill-call 執行中，定期採樣輸出與初始指令的 embedding cosine similarity；低於閾值時注入 reminder prompt；每步的 `drift_score` 記錄到 trajectory
  - AC：Phase 3 規劃中，詳細 AC 待 Phase 3 設計階段定義
