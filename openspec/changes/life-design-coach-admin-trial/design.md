## Context

「學習生活設計師」在投入使用者端開發前，先在 admin playground 試行驗證 prompt 品質。涉及子專案：`daodao-ai-backend`（prompt seed ＋ playground 多輪支援）、`daodao-admin-ui`（對話串 UI）。無 DB schema 變更。

現況關鍵事實（2026-07-16 盤點）：

- `POST /api/v1/admin/playground/chat` 單次無狀態：`system_content + "\n\n---\n" + message` 組成單一 prompt 丟給 `LoggingLLMClient.generate()`
- `BaseLLMBackend.generate(prompt: str, **kwargs)`——**所有 10 個 provider backend 都只吃單一 prompt 字串**，沒有 message-list 介面
- prompt seed：`_SEED_PROMPTS`（name → txt 檔名）在 lifespan 冪等寫入 `system_prompts`，`is_active=False`
- quota：`LoggingLLMClient` 呼叫前檢查 `user_token_quotas`，超限拋 `QuotaExceededError` → playground 回 429
- admin-ui `PlaygroundPage.tsx`（約 1350 行）已有 chat 與 insight 兩種功能，chat 呼叫 `playgroundChat`，含模型／prompt／參數選擇

## Goals / Non-Goals

**Goals:**
- admin 能在 playground 用任選模型與 `life_design_coach` prompt 走完一場多輪學習設計對話
- 兩個 prompt 進 `system_prompts`，admin 可用既有 CRUD 迭代內容（版本自動 +1）
- 對話輪次的 token / cost 全部落在既有 `ai_query_logs`（context 沿用 `playground`）
- 完全向後相容：不帶 `history` 的舊呼叫行為不變

**Non-Goals:**
- 使用者端功能、對話持久化資料表、backend message-list 介面、streaming（見 proposal Non-goals）

## Decisions

### D1：多輪對話用「歷史攤平進 prompt」，不改 backend 介面

**決定**：`PlaygroundChatRequest` 新增選填 `history: list[ChatTurn]`（`role: "user"|"assistant"`、`content: str`）。後端組 prompt：

```
{system_content}

---
以下是先前的對話紀錄：

使用者：{...}
設計師：{...}
...

---
使用者：{最新 message}
設計師：
```

**原因**：`BaseLLMBackend.generate()` 只收單一字串，10 個 provider 若要原生支援 message list 需全面改介面——對「試行驗證 prompt」的目標是過度工程。攤平法零 backend 變更、任何 provider 都能用，正是低成本原型精神。

**代價（接受）**：無法利用各家原生的 conversation 結構與 prompt caching；角色標記靠文字約定。試行結論若走到 Phase 2，屆時再做原生 message-list（屆時只需支援選定的 1–2 個 provider）。

**替代方案**：只改 OpenAIChatBackend 支援 messages（覆蓋 6/10 provider）→ 行為因 provider 而異、測試面擴大，放棄。

### D2：對話狀態存 admin-ui 前端，每輪送完整 history

**決定**：後端維持無狀態；admin-ui 以 React state 保存訊息串，每輪把完整 history ＋新訊息送出，「清除對話」只清前端 state。

**原因**：試行階段唯一的消費者是 admin 本人，單一瀏覽器分頁的 state 就夠；建表（coach_sessions）是 Phase 2 的事，現在建了反而在 schema 未定時製造遷移負債（且違反「不改已存在 migration」的守則）。

**代價（接受）**：重新整理頁面對話就消失。以 sessionStorage 快取緩解（PlaygroundPage 既有 `STORAGE_KEY` 模式可循）。

### D3：guardrail 只清洗 user 角色內容，長度雙上限

**決定**：
- `GuardrailLayer.sanitize_user_input` 套用於最新 `message` 與 history 中所有 `role="user"` 的 content；assistant 內容不清洗（是 LLM 自己的輸出，清洗會誤傷）
- Pydantic 驗證：`history` 最多 60 則、單則 content ≤ 8,000 字元、`message` ≤ 8,000 字元

**原因**：與現有單次 chat 的清洗策略一致；上限防止攤平後 prompt 無限膨脹（60 輪已遠超 6–9 主問題的教練流程需要）。token 面的最終防線仍是既有 quota 檢查。

### D4：prompt 內容以 docs 為 source of truth，txt 檔為部署載體

**決定**：`docs/product/life-design-coach/coach-prompt.md` 與 `phase1-single-shot-prompt.md` 中的 prompt 正文，複製為 ai-backend `src/services/prompts/life_design_coach_system.txt`、`life_design_system.txt`（只取 code block 內文，不含文件說明）。seed 後 admin 在 UI 編輯的版本存 DB，txt 僅作首次 seed 與 fallback。

**原因**：完全沿用 insight/rag 的既有機制（seed 冪等、name 唯一、`is_active=False` 預設），零新概念。

**注意**：既有 `deactivate_others` 是「全局只允許一個 active」——本次**不啟用**（`is_active=False`）即可避免與 insight 的 active prompt 互踩；playground chat 走 `system_prompt_id` 直接指定，不依賴 is_active。此全局互斥的既有設計在 Phase 1 正式接 `ai_service_configs` 時需重新檢視（記入 tasks 的追蹤項）。

### D5：`<stage_summary>` 在 admin-ui 摺疊顯示

**決定**：回應中的 `<stage_summary stage="...">...</stage_summary>` 區塊，UI 以可展開的折疊元件顯示（類似既有 `<think>` 的 `_split_thinking` 處理，但在前端做、不在後端剝除）。

**原因**：stage summary 是教練 prompt 的核心機制（Phase 2 續聊依賴它），試行時 admin 必須看得到才能驗證品質；但混在正文會干擾對話閱讀。後端不剝除是因為 history 回傳時需要原文（教練靠它記得前面階段）。

## Risks / Trade-offs

| 風險 | 緩解 |
|---|---|
| 攤平 prompt 隨輪次線性成長，單場對話可能吃掉數萬 tokens | history 上限 60 則；quota 429 護欄；營運上先調高試行 admin 的月配額 |
| 文字攤平的角色標記可能被某些模型混淆（自問自答） | prompt 模板明確以「設計師：」收尾引導；試行本身就是在挑選表現穩定的模型 |
| `history` 由前端回傳，理論上可被竄改偽造對話 | 僅 admin（JWT role 白名單）可呼叫，風險面等同其既有的 prompt override 能力，可接受 |
| coach prompt 的 stage_summary 約定若調整，前端解析 regex 需同步 | 解析規則集中一個 util，spec 明訂格式 |

## Migration Plan

無 DB migration。部署順序：ai-backend 先上（API 向後相容），admin-ui 後上。回滾即還原兩檔部署，無資料遺留（seed 的兩筆 prompt 為 inert 資料，`is_active=False`，可留可手動刪）。

## Open Questions

- 試行後若 prompt 表現需要 A/B 比較，是否要在 playground 加「雙 prompt 並排對話」？（暫不做，先人工輪流測）
- `system_prompts.name` 目前無 service 命名空間，Phase 1 接 `ai_service_configs` 時是否需要 `service` 欄位或命名慣例（`life_design/*`）？（追蹤項，本次以 `life_design_coach` / `life_design` 兩個 name 先行）
