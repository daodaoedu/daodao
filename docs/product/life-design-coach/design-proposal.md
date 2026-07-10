# 「人生設計師 × 島島阿學主題實踐」服務設計提案

> 撰於 2026-07-10。基於對 daodao-server、daodao-f2e、daodao-ai-backend 的實地盤點
>（practice 資料模型與 API、AI backend 現況、onboarding 資料）。

## 一、問題定義

島島現有的實踐入口都假設使用者**已經知道**自己想學什麼：

- Action Maker 要求先輸入 topic 才生成行動
- Dashboard 推薦卡靠既有 tag / 專業領域匹配（matchReasonCode：ongoing_practice / tag_match / professional_field / popular_content）
- Onboarding 只收集「專業領域 + 興趣分類」的選項式資料，沒有開放式的學習目標探索

對「想改變學習生活、但不知道從哪裡開始」的使用者——很可能是最需要島島的一群人——目前沒有任何服務接住。本提案參考史丹佛《Designing Your Life》方法論，設計一個 AI 引導服務補上這個最上游環節，終點收斂到島島的核心單位：**主題實踐**。

## 二、現況盤點：島島已有的「人生設計課」零件

| 人生設計課概念 | 島島現有對應物 | 位置 |
|---|---|---|
| 原型（Prototype） | 主題實踐：`draft → not_started → active → completed` 狀態機，到期自動完成 | daodao-server `src/utils/practice-status.ts` |
| 低成本試錯 | 14 天起、每日打卡的輕量實踐；可複製他人實踐 | `POST /api/v1/practices/:id/copy` |
| 心流／能量訊號 | 打卡 `mood`（give_up/frustrated/bored/neutral/good/happy）＋ note | `practice_checkins` 表 |
| 失敗免疫／反思 | 完成後排程生成的 AI insight（「你做到了什麼／學到了什麼」）＋ `reflection` 欄位 | ai-backend `insight_service`、`GET /api/v1/users/insights` |
| 人生設計訪談（找同伴） | practice buddy 邀請機制 | `practice_buddy_requests` |
| 從想法到行動 | Action Maker 精靈（topic → category → actions → 一鍵建立實踐，`creation_source: action_generator`） | f2e `packages/features/action-maker` + worker |

**缺的是前半段**：「看清現況 → 分辨重力問題 → 產生多個版本 → 選一個做原型」的引導過程。

### 關鍵技術現實（ai-backend 盤點結論）

1. **完全沒有多輪對話能力**：40 個 ORM model 中不存在 conversation / message / chat session；
   唯一的 chat 是 `POST /api/v1/admin/playground/chat`（admin 專用、單次無狀態）。
2. **LLM 治理層完備，可直接沿用**：
   - `system_prompts` 表：prompt 可由 admin 動態編輯、版本化（改 content 自動 +1）
   - `ai_service_configs`：每個 service 綁 model + prompt + 生成參數，admin 可切換
   - `ai_query_logs`：全量記錄 token / cost / latency（只存字元數不存原文）
   - `user_token_quotas`：呼叫前檢查配額，超限回 429——多輪對話的成本護欄已內建
   - `GuardrailLayer.sanitize_user_input`：使用者輸入清洗
3. **有現成的非同步 LLM 模式可參考**：未掛載的 `feedback` router
   （background task + Redis 輪詢 + `AIReviewFeedback` 表）——長輸出（藍圖生成）應走此模式。

## 三、服務定位：從「人生設計師」收斂成「學習生活設計師」

直接照搬原 prompt 有三個問題，需先改造：

### 1. 範圍收斂

原版是完整人生設計（健康／工作／娛樂／愛、五年奧德賽、8000–12000 字藍圖）。島島語境是自主學習，且使用者可能只有 16 歲。調整：

- **四儀表板改為學習語境**：精力（身心狀態）、學習、玩（純粹快樂）、連結（同伴與被接住）
- **奧德賽計畫從「三個五年人生」縮成「三個完全不同的三個月學習生活版本」**——對齊實踐時間尺度，每版本直接落成 1–2 個主題實踐
- **反向推演降級**：拿掉「人生最後一天」，最多保留可選的「半年後的普通星期二」，且僅在使用者狀態穩定時進行

### 2. 產出減重

萬字藍圖在產品裡沒人讀完且 token 成本高。改為**一頁式藍圖（約 1500–2500 字）**：
你在這裡 → 真正的問題（重力 vs 可設計）→ 能量地圖 → 三個版本 → 本週第一步。
三個版本以**結構化卡片**呈現（非長文），每張附「一鍵建立實踐」。

### 3. 對話節奏產品化

原設計 6–9 主問題＋蘇格拉底追問，實際 15–25 輪。保留，但明確分四階段
（現況 → 指南針 → 能量 → 三版本），**每階段結束產出結構化 stage summary 存 DB**——
使用者中斷可續、藍圖生成不需完整逐字稿、控制 context 長度。

### 必須保留的方法論核心

- **重力問題的分辨**——學習者最常卡在「我沒有科系背景／年紀太大／沒時間」這類重力問題
- **「熱情是結果不是起點」**——這句話就是島島「先開始一個小實踐」產品哲學本身
- **三版本全部都是 A 計畫**、**一次只問一個問題**、**溫暖但犀利**（指出語言與行動的落差）
- **不替使用者做決定**

## 四、三階段技術路線

### Phase 1（MVP，約 1–2 週）：精靈式流程，單次 LLM 生成

複用 Action Maker 的精靈模式（f2e 已有完整多步驟 UI 可抄）：

- 四階段做成結構化問答：儀表板打分用滑桿、困擾用自由文字、能量經驗用引導填空
- 最後**一次** LLM 呼叫生成三版本＋原型行動（見 `phase1-single-shot-prompt.md`，強制 JSON 輸出）
- 每個行動接現有 `createPractice`，新增 `creation_source: 'life_design'`
- 不需對話基礎設施；結果可存 ai-backend 一個新表（或先不落地）
- 這本身就是方法論主張的低成本原型——先驗證「使用者要不要這個」

**觸點**：
- ai-backend：新 endpoint `POST /api/v1/life-design/generate`（同步或沿用 feedback 的非同步模式）
- prompt 放 `system_prompts`（`name='life_design'`），模型參數走 `ai_service_configs`（`service='life_design'`）
- f2e：product app 新頁 `/life-design`，入口放 dashboard explore-topics 區與建立實踐流程最上游（「還不知道要實踐什麼？」）
- server：`creation_source` 允許值加 `life_design`（注意 enum/CHECK 同步鏈：storage → server → ai-backend）

### Phase 2：多輪 AI 教練

- **daodao-storage** 新 migration：
  - `coach_sessions`：user_id、stage（you_are_here / compass / energy / odyssey / blueprint）、status、stage_summaries JSONB
  - `coach_messages`：session_id、role、content、created_at
  - `learning_blueprints`：session_id、user_id、藍圖全文＋三版本結構化 JSON（前端渲染卡片用）
- **ai-backend** 新 router `/api/v1/coach`：
  - `POST /coach/sessions`（建立）、`POST /coach/sessions/:id/messages`（對話）、
    `GET /coach/sessions/:id`（歷史）、`POST /coach/sessions/:id/blueprint`（生成藍圖，非同步）
  - 上下文策略：帶「各階段 summary ＋ 最近 N 輪」而非全量歷史
  - prompt 見 `coach-prompt.md`，經 admin playground 驗證後啟用
  - quota / query log / guardrail 全部沿用現有機制
- **f2e**：`/life-design` 升級為對話介面；藍圖頁渲染結構化卡片＋一鍵建立實踐

### Phase 3：閉環（島島獨有差異化）

原版人生設計課的原型驗證靠使用者自己記錄；島島有真實行為資料，教練「看得見原型結果」：

- 實踐 completed 後，InsightScheduler 的 insight 回灌 coach session：
  「你的原型『每天畫畫 15 分鐘』完成了，mood 多為 happy、note 常提到忘記時間——
  這是心流訊號，要不要把第三版本升級成一季的正式實踐？」
- 打卡 mood 連續 frustrated / give_up → 主動觸發「這不是失敗，是原型給你的資訊」重新設計對話
  （「失敗免疫」的產品化）
- 藍圖的「本週第一步」與「手機提醒練習」接現有 `checkin_encouragements` 機制

## 五、風險與注意事項

| 風險 | 對策 |
|---|---|
| 情緒安全：使用者可能低落、可能未成年（≥16） | prompt 內建狀態判斷（低落跳過重推演）、明示「不是心理諮商」、痛苦訊號時引導求助資源；反向推演僅保留半年尺度且可選 |
| 多輪對話 token 成本 | Phase 1 單次呼叫先驗證；Phase 2 靠 stage summary 壓 context ＋ `user_token_quotas` 硬上限 |
| 跨 repo 同步鏈 | `creation_source` 新值走 storage → server → ai-backend SOP；ai-backend 新 API 需 f2e `gen:ai-types` ＋ admin-ui 手動同步 |
| AI 免責與信任 | 沿用推薦卡既有 `ai_disclaimer` 模式；藍圖標示 AI 生成 |
| 教練「越界」替使用者做決定 | prompt 明訂角色邊界；三版本平等呈現、不標主副 |

## 六、待決策

1. **從 Phase 1 還是直接 Phase 2 開始？**（建議 Phase 1——本身就是低成本原型）
2. **反向推演保留程度？**（建議：拿掉「人生最後一天」，保留可選的「半年後星期二」）
3. **藍圖篇幅**：一頁式（1500–2500 字）＋結構化三版本卡片，是否可行？

## 七、下一步（決策後）

- Phase 1：開 OpenSpec change（ai-backend endpoint ＋ f2e 精靈頁 ＋ server enum 值）
- prompt 先種進 `system_prompts`（`is_active=False`），用 admin playground 實測對話品質再啟用
- 定 API contract 與 `learning_blueprints` JSON schema（三版本卡片結構）
