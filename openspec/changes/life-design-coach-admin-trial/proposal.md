## Why

「學習生活設計師」（參考史丹佛《Designing Your Life》方法論，設計文件見 `docs/product/life-design-coach/`）預計補上島島「不知道要實踐什麼主題」使用者的最上游引導。在投入使用者端開發（Phase 1 精靈式流程）前，需要先驗證 prompt 的對話品質：追問深度、重力問題判斷、三版本產出、stage summary 機制是否如預期運作。

現有 admin playground 是驗證 prompt 的天然場所（已有模型選擇、system prompt 選擇、參數調整、query log、quota），但它**只支援單次無狀態對話**（`POST /api/v1/admin/playground/chat` 只收一個 `message`），無法測試多輪教練流程。本 change 讓 admin 能在 playground 完整走完一場學習設計對話。

## What Changes

- **種入兩個 prompt**：`life_design_coach`（多輪教練版）與 `life_design`（Phase 1 單次生成版）加入 ai-backend 的 prompt seed 清單，啟動時冪等寫入 `system_prompts`（`is_active=False`，不影響現有 insight 流程）
- **playground chat 支援多輪對話**：`PlaygroundChatRequest` 新增選填 `history` 欄位（role/content 陣列），後端將歷史攤平組進 prompt——不改任何 LLM backend、不新增資料表，向後相容
- **admin-ui playground 對話模式**：chat 分頁改為對話串 UI（訊息列表、逐輪送出完整歷史、清除重來），並將回應中的 `<stage_summary>` 區塊摺疊顯示以便驗證機制
- **不含**任何使用者端功能

## Capabilities

### New Capabilities

- `playground-conversation`: playground chat 的多輪對話能力——history 傳遞、prompt 組裝、guardrail 清洗、長度上限、admin-ui 對話串介面
- `life-design-prompts`: 兩個學習生活設計 prompt 的 seed 與管理（沿用既有 `system_prompts` CRUD，可由 admin 編輯迭代）

### Modified Capabilities

- 無（`ai-assistant` 等既有 spec 不受影響；playground 原單次行為完全保留）

## Impact

- **daodao-ai-backend**：
  - `src/services/prompts/` 新增 `life_design_coach_system.txt`、`life_design_system.txt`
  - `src/services/admin/prompt_service.py` 的 `_SEED_PROMPTS` 加兩筆
  - `src/schemas/admin/playground.py` 的 `PlaygroundChatRequest` 加選填 `history`
  - `src/routers/admin/playground.py` 的 `playground_chat` 組 prompt 邏輯擴充
- **daodao-admin-ui**：`src/pages/PlaygroundPage.tsx` chat 分頁改對話串；`src/api/types.ts` 手動同步新欄位（admin-ui 無自動 types 同步）
- **無 DB schema 變更**、**無 breaking changes**（`history` 選填，舊呼叫行為不變）
- **營運注意**：多輪對話會快速消耗 admin 預設月配額（100,000 tokens）；試行期間可用既有 `PUT /api/v1/admin/users/{id}/quota` 調高，無需程式變更

## Non-goals

- 使用者端 API 與 UI（Phase 1 精靈式流程另開 change）
- `coach_sessions` / `coach_messages` / `learning_blueprints` 資料表（Phase 2 才建；本次對話狀態只存 admin-ui 前端）
- LLM backend 的原生 message-list 支援（10 個 provider 統一改介面成本高，試行用歷史攤平即可）
- streaming 回應
- 藍圖生成的獨立 endpoint（試行時由 admin 在對話中直接要求輸出藍圖）
