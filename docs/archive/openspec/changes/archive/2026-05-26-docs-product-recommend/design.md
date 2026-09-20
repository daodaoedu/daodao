## Context

這次變更要把產品首頁的低互動固定區塊，替換成會隨使用者興趣與行為變化的「探索相關主題」推薦區塊。根據目前 repo 的邊界與靈感頁既有資料流，主要影響會落在 `projects/daodao-f2e` 與 `projects/daodao-ai-backend`；若後續確認需要新增持久化資料結構，才會再影響 `projects/daodao-storage`。

目前 `projects/daodao-ai-backend` 已有通用推薦能力與排序基礎，例如 `src/routers/recommendation.py`、`src/services/recommendation_service.py` 與 practice/feed ranking 邏輯，但它們偏向通用 feed 與 practice 排序，尚未直接提供首頁推薦卡片所需的：

- 固定數量的 dashboard 卡片輸出
- 可解釋的推薦理由
- 使用者對卡片的 👍 / 👎 / 隱藏持久化
- 根據負向回饋即時補卡與跨裝置隱藏

同時，前端首頁目前已有主題實踐區塊與篩選顯示邏輯，但沒有專門對應推薦卡片的資料 contract，也沒有推薦空狀態與回饋交互。根據 `daodao-f2e` 既有實作，靈感頁列表型資料是由 `projects/daodao-f2e/packages/api/src/services/showcase-hooks.ts` 透過 `NEXT_PUBLIC_AI_API_URL` 直接向 AI backend 取用；因此這次推薦功能也應優先沿用相同的列表資料流，而不是預設新增 `daodao-server` facade。

## Goals / Non-Goals

**Goals:**

- 定義一條穩定的首頁推薦資料流，讓 `daodao-f2e` 只需要透過單一 recommendation hook / contract 就能取得推薦卡片與回饋結果。
- 在 `daodao-ai-backend` 建立可落地的個人化推薦流程，先整合現有興趣、主題實踐、瀏覽與互動訊號，不引入過重的新基礎設施。
- 在 `daodao-ai-backend` 內建立可延伸的推薦結果與互動資料模型，並視需求決定是否需要進一步落到 `daodao-storage` 做持久化。
- 讓推薦卡片回傳可解釋的 `matchReason`，支援產品需求中的「為什麼推薦」顯示。
- 保持首頁主內容先渲染、推薦區塊後載入，避免 dashboard 核心體驗被 AI 推薦阻塞。

**Non-Goals:**

- 不在這次設計中導入即時 online learning、特徵平台或獨立向量召回服務。
- 不建立完整的推薦營運後台，也不提供手動 pin / blacklist 管理介面。
- 不重做「靈感」分頁的資料流與 UI，只提供從空狀態導流到既有分頁的能力。
- 不把推薦規則判斷放到前端；前端只負責呼叫 hook、呈現資料與處理互動狀態。

## Decisions

### 1. 推薦列表與互動邏輯優先收斂在 `daodao-f2e -> daodao-ai-backend` 邊界

**Decision**

首頁推薦列表由 `projects/daodao-f2e` 的 API hook 直接呼叫 `projects/daodao-ai-backend`，模式比照現有靈感頁 `showcase-hooks.ts`。建議新增：

- AI backend：`GET /api/v1/recommendation/topic_cards?limit=3&exclude_ids=...`
- AI backend：`POST /api/v1/recommendation/topic_cards/{recommendationId}/feedback`

`daodao-ai-backend` 負責推薦候選查詢、排序、卡片資料輸出，以及推薦 feedback 的驗證與處理；若 feedback 需要跨裝置或長期持久化，再由 `daodao-storage` 補上資料表與 migration。

**Rationale**

- 這符合 `daodao-f2e` 目前靈感頁的既有模式：列表資料直接從 AI backend 取得。
- 推薦邏輯放在 `daodao-ai-backend`，可以重用既有 ranking 程式碼與資料查詢能力，也避免在 `daodao-server` 再包一層轉送。
- 在目前需求邊界下，先把 recommendation read/write contract 收斂在 AI backend，比把責任拆到另一個 repo 更一致。

**Alternatives considered**

- 列表與互動都走 `daodao-server` facade：表面上 API 邊界較單純，但會偏離現有 `showcase-hooks` 模式，增加一層不必要的轉送與資料轉換。
- 列表走 AI backend、feedback 走 `daodao-server`：可沿用部分既有互動模式，但在目前需求沒有明確 server ownership 證據時，會把單一功能拆成兩個 repo 維護。

### 2. 推薦流程採「候選召回 + 規則加權排序 + 推薦理由映射」，先以 deterministic 策略上線

**Decision**

`daodao-ai-backend` 針對 dashboard 推薦新增專用 service，輸入 `user_id`、`limit` 與 `exclude_ids`，輸出推薦卡片資料。流程拆成三段：

1. 候選召回：從實踐主題 / 模板 / 相似用戶內容中抓候選集。
2. 特徵計分：整合使用者專業領域、想探索的領域、目前進行中的主題、瀏覽紀錄、相似用戶與 👍/👎 訊號。
3. 理由映射：從最高權重的命中特徵產生單一 `matchReasonCode` 與對應文案。

**Rationale**

- 需求已明確定義推薦依據與理由類型，先用 deterministic score 容易測試、容易回歸，也方便後續對照產品指標。
- 現有 AI backend 已有 ranking 基礎，擴充 feature weights 成本比引入 LLM/embedding-only 流程低。
- `matchReasonCode` + `matchReasonText` 可以同時滿足前端顯示與後續分析，不讓文案直接綁死在單一服務。

**Alternatives considered**

- 直接使用 LLM 生成推薦理由：可讀性高，但成本、延遲與可測試性都更差，不適合作為首頁同步互動。
- 只回傳 score 不回傳理由：實作簡單，但不符合 PRD/FRD 的核心要求。

### 3. 👎 隱藏與 👍 偏好需要明確的資料模型，並在推薦查詢時先過濾

**Decision**

若需求確認需要跨裝置保留 👎 隱藏與 👍 偏好，需新增推薦互動資料結構，建議至少包含：

- `user_id`
- `target_type`
- `target_id`
- `feedback_type` (`like` / `dislike`)
- `is_hidden`
- `source` (`dashboard_topic_recommendation`)
- `created_at` / `updated_at`

若現有 schema 無可復用結構，則在 `projects/daodao-storage/migrate/sql/` 補 migration SQL。推薦查詢時，AI backend 需先排除使用者已隱藏或已明確 👎 的目標，再進行候選排序與補卡。

**Rationale**

- 需求要求跨裝置隱藏與負向回饋不再立即出現；若這條需求維持不變，就不能只放前端 local state。
- 將 `is_hidden` 與 `feedback_type` 分開，可以保留「不喜歡且隱藏」和「只喜歡」兩種行為語意。
- 先過濾再排序，可避免浪費計分成本在已知不該出現的候選上。

**Alternatives considered**

- 只在快取或 Redis 暫存：速度快，但無法保證跨裝置一致與長期偏好累積。
- 只做前端 session 級隱藏：實作最快，但不符合 PRD / FRD 的跨裝置一致性要求。

### 4. 首頁採非同步載入與「補卡」機制，不阻塞主題實踐區塊

**Decision**

`daodao-f2e` 首頁先渲染既有主題實踐區塊，再單獨請求推薦 API。👎 後的流程如下：

1. 前端打開確認對話框。
2. 確認後 optimistically 將卡片移除。
3. 呼叫 feedback API 寫入 `dislike + hidden`。
4. 以前端當前已顯示卡片 + 新隱藏項目作為排除集合，重新請求 1 張補卡。
5. 若無補卡結果則切換到空狀態或縮短列表。

👍 則只更新按鈕狀態與回饋資料，不立即重排當前列表。

**Rationale**

- 推薦區塊不是首頁唯一關鍵資訊，延遲不應阻塞主流程。
- 👎 後補卡能維持版位穩定，符合 FRD「隱藏後立即補上一張」的要求。
- 👍 不即時重排可降低使用者認知負擔，也避免列表在互動後跳動。

**Alternatives considered**

- 首頁 SSR/首屏一起取推薦：資料整合較集中，但會把 AI 回應延遲帶進關鍵路徑。
- 每次 feedback 後整批重拉 3 張：實作簡單，但畫面抖動更大，也浪費 API 次數。

### 5. 推薦卡片 response contract 以「卡片展示資料 + 解釋欄位 + 回饋狀態」為核心

**Decision**

AI backend 回傳的每張卡片至少包含：

- `recommendationId`
- `targetType`
- `targetId`
- `title`
- `description`
- `creator`
- `tags`
- `matchReasonCode`
- `matchReasonText`
- `feedbackState` (`liked` / `disliked` / `neutral`)
- `isAiGenerated`

其中 `recommendationId` 為單次曝光或穩定 target key 的封裝識別，用於前端 feedback API；`targetType + targetId` 保持對 domain entity 的可追溯性。

**Rationale**

- 前端卡片渲染需要的是穩定結構，不該自行從多種 entity 組裝欄位。
- `feedbackState` 可支援後續已點讚狀態回填。
- `matchReasonCode` 讓 analytics 可以分析哪類理由帶來更高 CTR。

**Alternatives considered**

- 只回 domain entity，前端自行拼出卡片：前端耦合太深，且理由與回饋狀態會散落。
- 只回純展示資料，不帶 target id：短期簡單，但會削弱追蹤與回饋寫入能力。

### 6. 測試策略以 service-level regression 為主，UI 不新增元件測試

**Decision**

依專案規範，本次主要補以下測試：

- `projects/daodao-ai-backend/tests/services`：推薦排序、理由映射、排除已隱藏內容、根據 👍/👎 調整分數的測試。
- `projects/daodao-storage`：若新增 migration，需驗證必要欄位與索引存在。

前端不針對推薦卡片 UI 外觀補測，但需要確保行為可由手動驗證與 E2E 覆蓋。

**Rationale**

- 這次風險點主要在推薦邏輯與持久化，不在視覺元件本身。
- service-level regression 能精準防止「已 👎 的卡片重新出現」這類高風險回歸。

## Risks / Trade-offs

- [推薦來源資料不足，新用戶結果品質不穩] → 先明確定義 cold-start 權重，優先用專業領域、想探索領域與相似用戶內容補足。
- [前端與 AI backend 的卡片 contract 演化造成耦合] → 透過 schema 測試與型別定義鎖定欄位，避免 UI 直接依賴隱含結構。
- [隱藏列表增加後查詢效能下降] → 對 `user_id + source + is_hidden`、`user_id + target_type + target_id` 建索引，並限制 dashboard 單次排除集合大小。
- [推薦理由與實際排序依據不一致，降低信任] → 只從最高權重且已命中的特徵生成理由，不用額外文案推測。
- [首頁因推薦 API 慢而影響體驗] → 推薦區塊非同步載入並設定超時 fallback，超時時顯示 skeleton 或空狀態，不阻塞主內容。
- [👍/👎 行為語意後續擴充困難] → feedback API 保留 enum 與 source 欄位，未來可擴充更多互動型別而不破壞現有資料。

## Migration Plan

1. 在 `daodao-ai-backend` 新增 dashboard recommendation service 與對應 router，先串接現有排序能力，再補特定特徵與理由映射。
2. 在 `daodao-f2e` 新增對應 hook，接入新 API，完成首頁區塊、空狀態、👍/👎 互動與查看更多入口。
3. 若確認需要跨裝置持久化，在 `daodao-storage` 新增推薦互動資料表 migration SQL。
4. 補 service / integration tests，驗證已隱藏內容不會再次出現、👍/👎 能正確影響排序或持久化。
5. 灰度部署時先以低流量或內部帳號驗證指標與資料正確性，再全面開放。

Rollback 策略：

- 前端可透過 feature flag 或版位條件快速關閉推薦區塊，回退到舊首頁排版。
- AI backend 若推薦 API 不穩，可回傳空列表，前端直接走空狀態，不影響首頁主要功能。
- migration 採新增表與新增 API 的方式，不覆蓋既有核心資料；回滾時只需停止讀寫新表與關閉入口。

## Open Questions

- 推薦目標只包含 `practice`，還是第一版就要同時納入 `idea` / `project` / `template`？
- `recommendationId` 是否需要對單次曝光做 event 級追蹤，或以 `targetType + targetId + source` 即可滿足需求？
- 使用者瀏覽內容的資料來源是否已在 AI backend 有穩定事件表，若沒有需先定義最小可用的瀏覽訊號來源。
- 「查看更多推薦內容」要導向現有頁面、同頁展開，還是需要新的推薦列表 API。

---

## 手動驗證清單

### 載入行為
- [ ] 進入首頁，主內容先渲染，推薦區塊後出現（skeleton → cards）
- [ ] 無網路時推薦區塊靜默 fail，不影響主要內容顯示

### 空狀態
- [ ] 沒有推薦時顯示空狀態訊息
- [ ] 空狀態「前往靈感頁」按鈕可點擊，且切換到 inspire tab

### 卡片互動
- [ ] 點擊卡片主體區域可導向對應 practice 頁面
- [ ] 點擊 👍 後，卡片 thumbs-up 圖示變綠（liked 狀態）
- [ ] 再次點擊 👍 → 圖示恢復灰色（toggle 回 neutral）
- [ ] 點擊 👎 → 卡片立即消失（optimistic remove）
- [ ] 若仍有候選，👎 後自動補上一張新卡片
- [ ] 沒有候選時 👎 後顯示空狀態

### 重整後 hidden 不回來
- [ ] 對某張卡片 👎 後重整頁面，該卡片不再出現

### 版面
- [ ] 桌機（md+）：3 欄 grid 顯示
- [ ] 行動版：horizontal scroll carousel
- [ ] 推薦區塊位於 in-progress 區塊下方
- [ ] 推薦區塊不影響首頁其他 tab（inspire、completed）的行為

