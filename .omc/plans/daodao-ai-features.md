# DAODAO AI 功能規劃

> 創建日期：2026-05-15
> 狀態：草案 v1.0
> 負責人：待定

---

## 一、現狀總覽

### 1.1 現有 AI 基礎設施

| 組件 | 技術棧 | 狀態 | 說明 |
|------|--------|------|------|
| **daodao-ai-backend** | FastAPI + SQLAlchemy (Python) | 🟢 運行中 | 推薦引擎、搜索建議、練習摘要 |
| **daodao-worker** | Cloudflare Workers + Hono (TS) | 🟢 運行中 | Action Maker (生成/精煉)，使用 Qwen3-30B-A3B-FP8 |
| **daodao-f2e** | Next.js 15 + React 19 | 🟡 部分實現 | AI 推薦卡片、練習摘要、搜索建議 |
| **daodao-server** | Express + Prisma (TS) | ⚪ 未接入 AI | 管理後台用戶、通知、社交功能 |
| **daodao-storage** | PostgreSQL + Qdrant + Redis | 🟡 部分配置 | Qdrant/ClickHouse 已配置但未啟用 |
| **Langfuse** | LLM 觀察平臺 | 🟢 已集成 | Worker 層 AI 調用追蹤 |
| **Multi-provider Key Harness** | Gemini/OpenAI/Groq | 🟡 階段 1-2 | 多提供商密鑰管理 |

### 1.2 已上線的 AI 功能

1. **AI 主題推薦** (`/api/v1/recommendation/topic_cards`)
   - 基於用戶行為的練習主題推薦
   - 支持 like/dislike 反饋循環
   - 前端：`RecommendationSection` + `ExploreTopicsSection`

2. **Action Maker** (`worker.daodao.so/action-maker/`)
   - `/generate`：根據主題生成 3 個層級的行動建議（初學/中級/進階）
   - `/refine`：精煉用戶的已有行動想法
   - 模型：Qwen3-30B-A3B-FP8（Cloudflare Workers AI）
   - Langfuse 追蹤 + 內部 API 日誌

3. **練習摘要生成** (`getPracticeSummary`)
   - 結合練習詳情、打卡記錄和鼓勵語句
   - 觸發 `usePracticeSummary` hook

4. **搜索建議** (`/api/v1/users/practices/suggestions`)
   - AI 驅動的熱門關鍵詞和興趣標籤推薦

### 1.3 存在的差距與瓶頸

| 問題 | 嚴重程度 | 說明 |
|------|---------|------|
| 無對話式 AI | 🔴 高 | 無聊天機器人、無語音交互 |
| 無 AI 驅動的學習路徑 | 🔴 高 | 用戶無法獲得個性化的持續學習計劃 |
| Qdrant 向量搜索未啟用 | 🟡 中 | 基於語義的練習發現能力缺失 |
| 無流式響應 | 🟡 中 | AI 回覆等待體驗差 |
| 多提供商未完全推出 | 🟡 中 | 僅 Phase 1-2 上線 |
| 無背景任務隊列 | 🟡 中 | 所有 AI 工作同步執行，無法處理長時間任務 |
| 無 AI 內容生成 | 🟡 中 | 無 AI 寫作、無智能回覆 |
| 智能通知缺失 | 🟠 低 | 通知時機完全靜態，無 AI 優化 |

---

## 二、規劃原則

1. **漸進式演進**：優化現有功能 → 增強型 AI → 突破性 AI 功能
2. **用戶價值驅動**：每個 AI 功能都應解決實際問題，而非技術炫技
3. **穩定性優先**：AI 功能需要 fallback 機制和人工兜底
4. **隱私保護**：用戶數據最小化收集，推薦可解釋
5. **可觀察性**：所有 AI 調用必須有 Langfuse 追蹤和效果評估
6. **成本可控**：設置調用頻率上限和成本監控

---

## 三、AI 功能路線圖

### Phase 1：基礎優化（1-2 個月）

#### 1.1 AI 推薦系統升級
- **目標**：提升推薦準確率和用戶參與度
- **範圍**：
  - [ ] 完善 `useExploreTopics()` 與 AI backend 的真實數據連接（目前是 mock）
  - [ ] 增加推薦理由可解釋性（顯示 `matchReason` 標籤）
  - [ ] 基於用戶歷史打卡記錄的個性化加權
  - [ ] A/B test framework for recommendation algorithms
- **依賴**：無
- **驗收標準**：推薦點擊率提升 20%+，反饋率提升 15%+

#### 1.2 Action Maker 擴展
- **目標**：覆蓋更多場景和類別
- **範圍**：
  - [ ] 新增 category：`relationship`、`creativity`、`mindfulness`
  - [ ] 增加 `adjust` 端點：基於用戶完成情況動態調整難度
  - [ ] 精煉支持多輪對話（session-based refinement）
  - [ ] Action 完成後的 AI 總結與下一步建議
- **依賴**：無
- **驗收標準**：Action 完成率提升，用戶平均使用 Action Maker 次數 ≥ 2 次/週

#### 1.3 練習摘要分享
- **目標**：讓用戶的學習成果可展示
- **範圍**：
  - [ ] 生成精美的練習完成卡片圖片
  - [ ] 支持分享到社交媒體
  - [ ] 連續打卡成就系統（AI 生成里程碑描述）
- **依賴**：圖片生成服務
- **驗收標準**：分享率 ≥ 5%，社群帶來新用戶增長

### Phase 2：突破性 AI 功能（2-3 個月）

#### 2.1 🔥 AI 學習伴侶（聊天機器人）
- **目標**：提供 7x24 小時的個性化學習輔導
- **範圍**：
  - [ ] 設計對話式 UI 組件（聊天界面、輸入框、快捷選項）
  - [ ] 後端對話管理服務（會話狀態、上下文記憶）
  - [ ] 集成多提供商 LLM（OpenAI GPT-4o + Gemini Pro 兜底）
  - [ ] 預設角色：學習指導、練習搭檔、反思助手
  - [ ] 支持文字 + 語音輸入
  - [ ] 敏感詞過濾和安全層
- **依賴**：
  - 多提供商 key harness 完整上線
  - 新建 `daodao-conversation` 服務或擴展 ai-backend
- **驗收標準**：DAU 提升 30%，用戶平均對話時長 ≥ 5 分鐘

#### 2.2 個性化學習路徑
- **目標**：基於用戶能力模型動態規劃學習計劃
- **範圍**：
  - [ ] 用戶能力建模（維度：頻率、持續時間、完成率、心情）
  - [ ] AI 生成 7/14/30 天學習計劃
  - [ ] 動態調整機制（根據實際完成情況自動修正）
  - [ ] 可視化學習進度和里程碑
- **依賴**：
  - 用戶行為數據聚合 pipeline
  - AI backend 新增 `/learning-path` 端點
- **驗收標準**：學習路徑使用率 ≥ 40%，7 日留存率提升 15%

#### 2.3 語義搜索（Qdrant 向量搜索）
- **目標**：實現「搜我想學，而非搜我所打」
- **範圍**：
  - [ ] 啟用 Qdrant 向量數據庫
  - [ ] 將練習模板和用戶生成內容向量化
  - [ ] 基於語義相似度的練習推薦
  - [ ] 混合搜索：關鍵詞匹配 + 語義相似度
- **依賴**：
  - daodao-storage 啟用 Qdrant
  - 向量化 pipeline（使用現有 LLM embeddings）
- **驗收標準**：搜索滿意度調查 ≥ 80%，搜索跳出率降低 25%

### Phase 3：高階 AI 能力（3-6 個月）

#### 3.1 智能通知系統
- **目標**：在最佳時機觸發用戶行動
- **範圍**：
  - [ ] AI 預測用戶最佳學習時段
  - [ ] 動態通知內容生成（而非靜態模板）
  - [ ] 倦怠檢測：用戶活躍度下降時觸發鼓勵
  - [ ] 連鎖反應通知：「你的一位朋友剛完成了一個挑戰」
- **依賴**：學習路徑模型、用戶活動預測
- **驗收標準**：通知打開率 ≥ 35%，推送銷退率降低 20%

#### 3.2 AI 輔助內容審核與生成
- **目標**：降低 UGC 審核成本，提升社區內容質量
- **範圍**：
  - [ ] 自動檢測不當內容（評論、打卡記錄）
  - [ ] AI 生成練習描述模板
  - [ ] 智能標籤和分類
  - [ ] 用戶生成內容的質量評分
- **依賴**：多提供商 key harness、內容策略定義
- **驗收標準**：人工審核量減少 60%，內質質量評分提升

#### 3.3 預測性分析與見解
- **目標**：將用戶數據轉化為可操作的見解
- **範圍**：
  - [ ] 每周 AI 生成的個人學習報告
  - [ ] 習慣模式識別（何時、何類練習最有效）
  - [ ] 預測性放棄警報
  - [ ] 與好友的學習對比（可選）
- **依賴**：ClickHouse 分析引擎、用戶數據聚合
- **驗收標準**：報告打開率 ≥ 50%，用戶主動分享率 ≥ 10%

#### 3.4 多模態 AI
- **目標**：支持圖片、語音等多種交互方式
- **範圍**：
  - [ ] 語音打卡（語音轉文字 + AI 分析）
  - [ ] 圖片識別式打卡（辨識用戶實踐內容）
  - [ ] AI 生成學習視頻摘要
- **依賴**：多模態模型 API、錄音/錄屏基礎設施
- **驗收標準**：多模態功能採用率 ≥ 15%

---

## 四、技術架構實施路線

### 4.1 短期架構變更

```
┌─────────────────────────────────────────┐
│              daodao-f2e                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ AI 推薦  │ │ Action   │ │ 聊天機器人│ │
│  │ 組件     │ │ Maker    │ │ (NEW)    │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ │
└───────┼────────────┼────────────┼────────┘
        │            │            │
        ▼            ▼            ▼
┌─────────────────────────────────────────┐
│         API Gateway / BFF               │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐ ┌────────┐ ┌──────────────┐
│ai-     │ │Worker  │ │daodao-       │
│backend │ │(CF)    │ │server (NEW)  │
│FastAPI │ │        │ │AI proxy      │
└───┬────┘ └───┬────┘ └──────┬───────┘
    │          │             │
    ▼          ▼             ▼
┌─────────────────────────────────────────┐
│           數據層                         │
│  PostgreSQL | Qdrant | Redis | ClickHouse│
└─────────────────────────────────────────┘
```

### 4.2 關鍵技術決策

| 決策 | 選項 A (推薦) | 選項 B | 決定因素 |
|------|--------------|--------|---------|
| 聊天後端 | 擴展 ai-backend FastAPI | 獨立 Node.js 服務 | 現有團隊 Python 熟悉度 (A) vs Type Safety (B) |
| LLM 提供商 | Workers AI (Qwen) + OpenAI | 多提供商自動路由 | 成本 (A) vs 穩定性 (B) |
| 會話存儲 | PostgreSQL JSONB | Redis + 定期持久化 | 成本 (A) vs 性能 (B) |
| 流式響應 | Server-Sent Events | WebSocket | 兼容性 (A) vs 雙向通信 (B) |
| Embedding 模型 | Workers AI text-embedding | OpenAI embeddings | 延遲 (A) vs 質量 (B) |

**推薦**：選項 A 為主，關鍵路徑保留 B 的 fallback

### 4.3 數據模型變更

#### 新建表：`conversations`
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200),
  context JSONB DEFAULT '{}',  -- AI 會話上下文摘要
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  role VARCHAR(10) NOT NULL,  -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',  -- tokens, latency, model 等
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
```

#### 新建表：`learning_paths`
```sql
CREATE TABLE learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',  -- active, paused, completed, abandoned
  ai_metadata JSONB DEFAULT '{}',  -- AI 生成的路徑詳情
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE learning_path_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id UUID NOT NULL REFERENCES learning_paths(id),
  day_number INTEGER NOT NULL,
  practice_template_id UUID REFERENCES practice_templates(id),
  ai_prompt TEXT,  -- AI 生成該日練習的提示
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ
);
```

#### 新建表：`ai_generations` (已部分存在於 Worker)
```sql
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  feature VARCHAR(50) NOT NULL,  -- 'action-maker', 'recommendation', 'chat', 'path-planner'
  action_type VARCHAR(20) NOT NULL,  -- 'generate', 'refine', 'adjust', 'summarize'
  session_id VARCHAR(100),
  model VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_cost DECIMAL(12,6),
  latency_ms INTEGER,
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'success',  -- success, error, timeout
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_generations_user ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_feature ON ai_generations(feature);
CREATE INDEX idx_ai_generations_created ON ai_generations(created_at);
```

---

## 五、里程碑與排期

```
Week  1-2  ┃ Phase 1 開始：Explore topics 真實連接、Action Maker 擴展
Week  3-4  ┃ Phase 1：精煉多輪對話、摘要分享功能上線
Week  5-6  ┃ Phase 2 開始：聊天機器人 MVP（文字）
Week  7-8  ┃ Phase 2：個人化學習路徑 MVP
Week  9-10 ┃ Phase 2：Qdrant 語義搜索 MVP
Week 11-12 ┃ Phase 2：A/B 測試與數據驅動優化
Week 13-14 ┃ Phase 3 開始：智能通知
Week 15-18 ┃ Phase 3：AI 內容審核與生成
Week 19-22 ┃ Phase 3：預測性分析報告
Week 23-26 ┃ Phase 3：多模態 AI
```

---

## 六、風險與緩解

| 風險 | 概率 | 影響 | 緩解措施 |
|------|------|------|---------|
| LLM API 宕機 | 中 | 高 | 多提供商自動切換；靜態兜底內容 |
| AI 響應延遲高 | 中 | 中 | 本地緩存常見問題回答；異步處理 |
| 用戶數據隱私合規 | 低 | 高 | 數據最小化；GDPR/個資法合規審查 |
| AI 內容不當 | 低 | 高 | 多層過濾：prompt guard + output filter + 用戶回報 |
| 成本超支 | 中 | 中 | 設置日/月調用上限；自動降級到低成本模型 |
| 用戶依賴 AI 而非自主學習 | 中 | 中 | AI 輔助定位而非替代；保留手動模式 |

---

## 七、效果評估指標 (KPIs)

### 北極星指標
- **DAU（日活用戶）**：提升 30%（6 個月內）
- **7 日留存率**：提升 15%
- **平均練習次數/週**：提升 25%

### 功能指標
| 指標 | 基線（預估） | 目標 |
|------|-------------|------|
| AI 推薦點擊率 | 8% | 15% |
| Action Maker 使用率 | 12% DAU | 25% DAU |
| 聊天機器人均會話次數 | 0 | ≥ 2 次/週 (30% 用戶) |
| 學習路徑創建率 | 0 | 20% 用戶在首週創建 |
| 語義搜索使用率 | 0（關鍵詞搜索） | 15% 搜索為語義搜索 |
| AI 生成內容分享率 | 5% | 12% |

### 成本指標
| 指標 | 目標 |
|------|------|
| 每月 AI API 成本 | < NT$50,000 (Phase 1-2) |
| 每次 AI 調用成本 | < NT$0.5 |
| Token 使用效率 | 比 baseline 提升 20% (prompt engineering) |

---

## 八、開發規範

### 8.1 AI 調用規範
- 所有 AI 調用必須經過 Langfuse 追蹤
- 設置 timeout（默認 15s）和重試機制（最多 2 次）
- 所有用戶輸入需 sanitization，防 prompt injection
- 回應需有 fallback：若 AI 失敗，返回靜態兜底內容

### 8.2 前後端協作
- **前端**：處理 UI 狀態（loading, streaming, error, empty）
- **後端**：處理 prompt engineering、模型選擇、結果後處理
- **通信協議**：REST + SSE（流式場景）

### 8.3 監控與告警
- AI 調用成功率 < 95% → PagerDuty 告警
- 平均延遲 > 5s → 調用降級
- 成本超過日上限 → 自動關閉非核心 AI 功能

---

## 九、開放問題

1. **聊天機器人的角色設定**：是學習指導師？還是對話伴侶？需要用戶調研
2. **付費模式**：AI 高級功能是否收費？還是作為核心功能免费提供？
3. **模型選擇策略**：是否需要在不同場景使用不同模型（如推薦用 Gemini、對話用 GPT-4o）？
4. **離線 AI 能力**：是否需要考慮端側模型推理（如 ONNX）？
5. **用戶數據用於模型微調**：是否允許？如何取得授權？

---

*本文檔基於代碼庫全面審計後生成，所有建議均可在現有技術棧上實施。*