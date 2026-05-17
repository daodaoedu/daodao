## Why

島島阿學目前缺乏對使用者「學習心理特質」的系統性瞭解，AI Mentor 無法個性化回應，使用者之間也難以基於心理共鳴建立深層連結。透過「漸進式顯影」機制收集學習者人物誌，可同時解決 AI 冷啟動與社群行為冷啟動問題。

## What Changes

- 新增 **人物誌問題庫**：涵蓋選擇題型、完成句子型、具體情境型三種題型
- 新增 **靈感牆輪播（Resonance Carousel）**：在靈感分頁嵌入橫向滑動卡片組件，顯示問題與他人回應，頻率依新手期 / 一般用戶規則控制
- 新增 **閘門邏輯（Passport Gate）**：答題數 < 5 題為鎖定狀態，≥ 5 題為解鎖狀態，影響他人回應的可見度
- 新增 **個人學習人物誌頁面**：Profile 中新增「我的學習人物誌」分頁，自己可回答所有問題、訪客以卡片瀏覽已回答題目
- 新增 **對等揭露（Reciprocal Disclosure）**：查看他人特定問題詳細答案前，需先提交自己的答案
- 新增 **共鳴計數器**：顯示「X 位使用者對此有共鳴」
- 新增 **跳題記憶**：同一問題略過 3 次後，系統不再推播該題
- 新增 **Badge 獎勵**：完成一定數量問題回答可獲得 badge

## Capabilities

### New Capabilities

- `persona-questions`: 問題庫的 CRUD、題型定義、新手優先問題標記、略過次數追蹤
- `persona-answers`: 使用者答題的建立與查詢，含對等揭露權限檢核
- `persona-carousel`: 靈感牆輪播的出現邏輯（新手期 vs 一般用戶）、dismiss 機制、全數回答後永久隱藏
- `persona-profile`: Profile 人物誌分頁，含自己與訪客的不同視圖、鎖定狀態提示

### Modified Capabilities

- `env-config`: 無需求層級異動

## Impact

- **daodao-storage**：新增 `persona_questions`、`persona_answers`、`persona_user_state` 等資料表及對應 migration
- **daodao-server**：新增 persona 相關 REST API endpoints（問題列表、答題、略過、共鳴）
- **daodao-f2e / product app**：靈感牆新增 `ResonanceCarousel` 組件、Profile 新增 `PersonaTab` 分頁
- **daodao-f2e / mobile app**：同步支援行動端顯示
- **daodao-ai-backend**：後續可注入使用者 DNA 至 RAG 流程（本次 Not in scope）
- **無 breaking changes**：所有新增 API 為新路由，不修改既有介面
