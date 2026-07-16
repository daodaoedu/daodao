## 1. Prompt 檔案與 Seed（daodao-ai-backend）

- [x] 1.1 從 daodao repo `docs/product/life-design-coach/coach-prompt.md` 抽出 prompt 正文（code block 內文），建立 `src/services/prompts/life_design_coach_system.txt`；從 `phase1-single-shot-prompt.md` 的 System Prompt 段建立 `src/services/prompts/life_design_system.txt`
  - **AC**: 兩檔內容與設計文件 prompt 正文一致（無 markdown fence）；UTF-8；`make check` 通過

- [x] 1.2 `src/services/admin/prompt_service.py` 的 `_SEED_PROMPTS` 新增 `"life_design_coach": "life_design_coach_system.txt"` 與 `"life_design": "life_design_system.txt"`
  - **AC**: 本地啟動 app 後 `system_prompts` 出現兩筆新紀錄，`is_active=False`、`version=1`；重啟不重複、不覆蓋；`insight`/`rag` 的 is_active 不變

## 2. Playground 多輪對話 API（daodao-ai-backend）

- [x] 2.1 `src/schemas/admin/playground.py`：新增 `ChatTurn`（`role: Literal["user","assistant"]`、`content: str`，max_length=8000）；`PlaygroundChatRequest` 新增 `history: Optional[list[ChatTurn]]`（max_length=60）；`message` 加 max_length=8000
  - **AC**: 超過 60 則或單則超長回 422；不帶 history 的舊 payload 驗證通過

- [x] 2.2 `src/routers/admin/playground.py`：抽出 prompt 組裝函式 `_build_chat_prompt(system_content, history, safe_message)`——有 history 時依 design.md D1 模板攤平（user→「使用者：」、assistant→「設計師：」，結尾以「設計師：」引導）；無 history 時維持現行 `system + "\n\n---\n" + message`；history 中 user 內容逐則過 `GuardrailLayer.sanitize_user_input`，assistant 不清洗
  - **AC**: 帶 history 呼叫時 LLM 收到含對話紀錄的 prompt；history 中 user 訊息違規回 400；不帶 history 的行為與現行位元級一致；quota 429 與 query log（context=`playground`）行為不變

- [x] 2.3 測試：`tests/routers/` 新增 playground 多輪案例——(a) 攤平模板正確性（含順序、結尾引導）(b) history 上限 422 (c) history user 違規 400 (d) 無 history 向後相容 (e) assistant 內容不被清洗
  - **AC**: `make test` 全綠；`make check` 通過

- [x] 2.4 確認 OpenAPI 反映新欄位（FastAPI 自動生成），並在 PR 說明註記：admin-ui types 為手動同步（無自動鏈）
  - **AC**: `/openapi.json` 的 PlaygroundChatRequest 含 history

## 3. Admin-UI 對話串介面（daodao-admin-ui）

- [x] 3.1 `src/api/types.ts`：`PlaygroundChatRequest` 新增 `history?: { role: 'user' | 'assistant'; content: string }[]`（手動同步）
  - **AC**: `pnpm run typecheck` 通過

- [x] 3.2 `PlaygroundPage.tsx` chat 功能改對話模式：訊息串 state（含每輪 token/cost/latency 顯示）、送出時帶完整 history、「清除對話」按鈕、對話進行中鎖定 system prompt 選擇（模型與參數仍可調）、sessionStorage 快取還原（比照既有 `STORAGE_KEY` 模式）
  - **AC**: 連續多輪對話脈絡正確延續；清除後下一輪 request 不含 history；重新整理後對話串還原；lint + typecheck 通過

- [x] 3.3 stage_summary 摺疊元件：util 以 regex 抽出 `<stage_summary stage="...">...</stage_summary>`，訊息卡片顯示乾淨正文＋預設收合的「階段小結」區；**送回 API 的 history 保留原文**
  - **AC**: 含標籤的回應正確分離顯示；無標籤回應不受影響；Vitest 覆蓋 util 的抽取（含多區塊、無區塊、跨行）

## 4. 試行驗證（人工，非程式）

- [ ] 4.1 dev 環境部署後，admin 以 `life_design_coach` prompt 對 2–3 個模型各走完一場完整對話（四階段＋藍圖輸出），記錄：追問品質、重力問題判斷正確性、stage_summary 是否如格式產出、單場總 token 成本
  - **AC**: 產出試行紀錄（可記於本 change 目錄 `trial-notes.md` 或 Notion），含「是否進入 Phase 1」與模型選擇建議

- [ ] 4.2 以 `life_design` prompt 測單次生成：貼一份模擬問卷輸入，驗證 JSON 輸出合規（三版本、六字標題、prototype_practices 欄位齊全）
  - **AC**: 至少 1 個模型能穩定輸出可解析 JSON；缺陷記入試行紀錄

- [ ] 4.3 追蹤項確認：試行 admin 的月配額是否需調高（`PUT /api/v1/admin/users/{id}/quota`）；`system_prompts` 全局單一 active 的設計與 Phase 1 `ai_service_configs` 整合的疑問（design.md Open Questions）記入 Phase 1 規劃
  - **AC**: 兩項皆有明確結論並記錄
