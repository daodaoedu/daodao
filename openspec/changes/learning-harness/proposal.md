## Why

島島阿學的核心定位不是線上課程平台，不是內容提供者。島島提供的是一套讓自主學習者能有效運作的基礎設施——**Learning Harness**。

這個概念借鏡 AI Agent Harness 的架構思維（參考 Phil Schmid《The Importance of Agent Harness in 2026》）：

| AI Agent 系統 | 島島學習系統 |
|---|---|
| **Model（CPU）** — 原始運算能力 | **學習者的大腦與動機** — 原始學習能力 |
| **Harness（OS）** — 讓 model 變成可用 agent 的基礎設施 | **島島（Harness）** — 讓學習者變成有效自學者的基礎設施 |
| **Agent（App）** — 跑在 harness 上的具體任務 | **學習旅程** — 在島島上實踐的具體學習 |

核心翻轉：**學習者不是來「消費內容」的，學習者是一個需要基礎設施才能有效運作的 agent。** 島島不告訴你學什麼，島島讓你能學好任何東西。

目前島島已經有許多 harness 子系統的雛形（Buddy-Ember、Learner Persona、鼓勵語、打卡），但缺乏一個統一的框架把它們串起來。更關鍵的是，「學習方法（Tools）」在目前系統中是隱含的——學習者在 Practice 裡打卡，但系統不知道他用了什麼方法、哪種方法對他有效。

## What Changes

本提案是一個**框架性提案**，定義島島 Learning Harness 的整體架構，並盤點現有子系統的對應關係與缺口。具體實作會拆成多個獨立的 change 推進。

### 1. 定義 Learning Harness 架構

建立 harness 子系統的完整對照：

| Harness 子系統 | 功能 | 島島對應 | 狀態 |
|---|---|---|---|
| **Tools** | 學習方法（影片、文字、專案、社群、一對一、遊戲化） | Practice 中隱含 | **缺口：需顯性化** |
| **Skills** | 學習策略（費曼技巧、間隔重複、番茄鐘、康乃爾筆記），按需載入 | 不存在 | **缺口** |
| **Memory** | 學習紀錄、學習者特質、反思日誌 | Persona ✅ 已設計 / 打卡紀錄 ✅ 已存在 / 互動足跡 ✅ 已設計 | 部分就緒 |
| **Learning Loop** | 內在動機 ⇄ 外在動機交互驅動的學習循環 | 打卡系統 ✅ 已存在 | 核心存在，需強化 |
| **Context Durability** | 防止學習者遺忘初心、認知負荷管理 | 「寫信給未來的自己」📋 已提案 / 週報 ✅ 已存在 / 里程碑 📋 已設計 | 部分就緒 |
| **Drift Detection** | 偵測學習者偏離目標，以社會連結而非系統警告介入 | 火苗衰退 📋 已設計 / 守望相助 📋 已設計 | 已設計，但僅偵測「人不見了」，缺「方法不對」的偵測 |
| **Hooks & Lifecycle** | 學習前後的儀式、定期觸發 | 打卡提醒 📋 已提案 / 鼓勵語 ✅ 已存在 / 每日聚合通知 📋 已設計 / 社群鼓勵語池 📋 已提案 | 部分就緒 |
| **Multi-Agent** | 社群學習——學伴、讀書會、導師、同儕 | Buddy 配對 📋 已設計 / 共鳴機制 📋 已設計 / 卡片傳送 📋 已設計 | 已設計，缺學習小組與 Mentor |
| **Observability** | 追蹤哪個方法有效、學習成效觀察 | 打卡連續天數 ✅ 已存在 / 陪伴值 📋 已設計 | 缺「哪個 tool 最有效」的追蹤（需 Tools 先顯性化） |

### 2. Learning Loop 定義

Learning Loop 不是單一迴圈，是兩個動力源交替推動的飛輪：

**內在動機（Intrinsic）**：好奇心、成就感、意義感、心流
**外在動機（Extrinsic）**：社群認同、Buddy 陪伴、火苗維持、里程碑慶祝

兩者交替驅動行動（打卡），行動產生反饋，反饋同時滋養兩種動機：

```
內在動機 ──┐          ┌── 外在動機
           ▼          ▼
         ┌──────────────┐
         │   行動（打卡） │
         └──────┬───────┘
                │
      ┌─────────┼─────────┐
      ▼         ▼         ▼
   反饋層     社群層     自我觀察
   鼓勵語     Buddy      進度
   里程碑     火苗       足跡
   慶祝       共鳴       
      │         │         │
      └─────────┼─────────┘
                │
                ▼
     同時滋養內在 & 外在動機
     ─────────────────────
     鼓勵語 → 外在 "有人支持" + 內在 "被理解"
     火苗旺 → 外在 "不能讓它熄" + 內在 "一起做到了"
     里程碑 → 外在 "大家看到了" + 內在 "真的成長了"
                │
                ▼
            回到行動
            飛輪加速
```

### 3. Drift Detection 的設計哲學

借鏡 agent harness 的 model drift 概念，但用社會連結取代系統警告：

| 傳統做法 | 島島做法 |
|---|---|
| "你今天還沒打卡"（罪惡感驅動） | "你的 Buddy 今天打卡了"（連結感驅動） |
| "你已經 5 天沒學了"（系統警告） | 火苗將熄 → Buddy 傳來卡片（人在想你） |
| "你的進度落後了"（焦慮） | "你和小明的火苗重燃了！"（成就 + 連結） |

目前已設計的 drift detection（buddy-ember）偵測的是「人不見了」（打卡中斷）。未來需補上「方法不對」的偵測——當 Tools 成為一等公民後，系統可以觀察到「用影片跟讀時你連續天數最長，但最近改用教材閱讀後就斷了」，從而建議切換方法。

### 4. The Bitter Lesson 原則

> 不要幫學習者做太多決定。提供工具和基礎設施，讓學習者自己探索什麼方法對他有效。

島島 harness 的設計應該：
- **提供多元 Tools**，但不強制使用任何一個
- **按需載入 Skills**，不一開始就灌方法論
- **觀察並回饋**（Observability），但不代替學習者判斷
- **允許拆卸**——如果某個 harness 機制對某個學習者沒用，他可以關掉

## Capabilities

### New Capabilities

- `learning-tools`：學習方法（Tools）的結構化定義、分類、與 Practice 的關聯。讓學習者在打卡時記錄使用的方法，使「怎麼學」從隱含變為顯性
- `learning-skills`：學習策略（Skills）的按需載入系統。當學習者選用某個 tool 時，可按需取得對應的方法論引導（如選了「影片學習」→ 載入「費曼技巧」建議）
- `tool-effectiveness-tracking`：追蹤不同 tools 對學習者的有效性。基於打卡連續性、反思品質等信號，觀察哪種方法最適合該學習者
- `method-drift-detection`：方法層的 drift 偵測。當學習者切換到對他成效較差的方法時，以非侵入方式提示

### Modified Capabilities

- `practice-management`：Practice 增加 tools 關聯，打卡記錄增加使用方法欄位
- `notifications`：增加方法建議相關通知類型

### Existing Capabilities（已是 Harness 子系統的一部分）

以下能力已存在或已設計，在 Learning Harness 框架下扮演明確角色：

- `buddy-pairing` / `buddy-ember` / `buddy-companion`：Multi-Agent 子系統 + Drift Detection
- `persona-questions` / `persona-answers` / `persona-carousel` / `persona-profile`：Memory 子系統
- `checkin-reactions-comments`：Learning Loop 的反饋層
- `notification-email`（週報 PE03-PE06）：Context Durability
- `checkin_encouragements`（30 句系統預設）：Hooks & Lifecycle

## Impact

本提案為框架性提案，不直接產生程式碼變更。後續拆分的 change 預計影響：

**核心缺口（需新建）**
- `learning-tools`：daodao-storage（新增 tools 相關表）、daodao-server（tools CRUD API）、daodao-f2e（打卡流程增加方法選擇 UI）
- `learning-skills`：daodao-server（skills 載入 API）、daodao-f2e（按需顯示方法論卡片）
- `tool-effectiveness-tracking`：daodao-server（分析服務）、daodao-f2e（個人 dashboard）

**已設計待實作（依序推進）**
- `buddy-ember`：已有完整 design.md 與 tasks.md
- `add-learner-persona`：已有完整 proposal 與 design
- `encouragement-messages`：已有 proposal

### 5. 成長地圖：Harness 的視覺化介面

成長地圖（Growth Map）不只是一個功能，它是 Learning Harness 多個子系統的視覺化匯流點，同時承擔三個角色：

**Observability**：看見數據
- 用了哪些 tools、每個 tool 的使用頻率與連續性
- 學習時間分佈、里程碑達成

**Context Durability**：不忘初心
- 回顧第一天寫下的話
- 看見旅程的起點到現在的距離
- 參考 `encouragement-messages` 的「寫信給未來的自己」概念

**動機引擎**：飛輪燃料
- 看見自己的成長軌跡 → 內在成就感 → 繼續行動
- 這是 intrinsic motivation 最強的來源之一
- 參考 `execution-over-planning` 研究：讓用戶「看見積累」比給用戶「更多計畫」重要

```
成長地圖 = Observability + Context Durability + 動機引擎

  ┌──────────────────────────────────────────────────────────┐
  │                    我的成長地圖                            │
  │                                                          │
  │  學英語口說                                    Level 3   │
  │                                                          │
  │  W1        W2        W3        W4        W5              │
  │  🎬        🎬        🎬👥      👥        👥🔨            │
  │  影片跟讀   影片跟讀   加入社群   轉社群    社群+專案        │
  │  5/7       6/7       7/7       6/7       7/7             │
  │                                                          │
  │  🔥 35 天  │  最有效: 👥 社群  │  Day 30 ✓               │
  │                                                          │
  │  📝 第 1 天：「希望三個月後能跟外國人聊天不卡」              │
  │                                                          │
  │  💡 AI：「W3 加入社群後連續性明顯提升。                     │
  │         影片打底，社群互動是你的加速器。」                   │
  └──────────────────────────────────────────────────────────┘
```

成長地圖同時也是 `practice-journey-export` 的資料來源——PDF/Markdown 導出的內容本質上就是成長地圖的快照。

### 6. 與 AI Guided Journey 的關係

`ai-guided-journey-design` 規劃了 AI 引導的學習旅程（快問、引導式 Check-in、成就卡），本質上是 Learning Loop 的 AI 強化版。在 Harness 框架下，AI Guided Journey 負責的是：

- **AI 快問**（3 題）→ 快速初始化 Memory（Persona 的輕量版）
- **引導式 Check-in** → Hooks（取代空白表單，降低摩擦力到一鍵確認）
- **成就卡 + 分享** → Context Durability + 外在動機
- **成長地圖** → Observability 的視覺化

AI Guided Journey 與 Learning Harness 的分工：
- **Harness** 定義子系統的架構與職責
- **AI Guided Journey** 是這些子系統的具體 UX 實作之一

### 7. 與 Learning Agent Platform 的關係

`daodao-learning-agent-platform` 規劃了完整的 AI Agent 工作流平台（Agent Workflow Engine、Learning Agent、三層記憶）。在 Harness 框架下，Learning Agent Platform 是 harness 的 **AI 底層引擎**：

| Harness 子系統 | Learning Agent Platform 對應 |
|---|---|
| Memory | 三層記憶架構（Working / Episodic / Semantic） |
| Skills 按需載入 | Learning Agent 的動態路徑規劃 + 學習風格識別 |
| Drift Detection | Insight Agent 的模式發現 + 動機引擎 |
| Observability | Insight Agent 的週報/月報 + 成長地圖數據 |
| Learning Loop | Agent Workflow Engine 的核心迴圈 |

重要原則：**Harness 可以在沒有 AI 的情況下運作**。AI 是加速器，不是必要條件。Phase 1-2 的 harness 用人工策展 + 簡單規則驅動，Phase 3+ 才接入 AI Agent 能力。

### 8. 設計哲學：系統取代意志力

參考 `execution-over-planning` 研究的核心洞察：

> 用戶不缺方向和計畫，缺的是「真的做下去」。不要讓用戶「努力堅持」，而是設計一個「不堅持會很奇怪」的系統。

這直接指導 harness 的設計：

| 原則 | Harness 的實踐 |
|---|---|
| 降低摩擦力到趨近於零 | 打卡一鍵確認，自動帶入上次的學習方法 |
| 預設行為設計 | 不是「選一個方法」，而是「繼續上次的方法？✓」 |
| 讓「不做」比「做」更難 | 火苗會熄、Buddy 在等、成長地圖斷掉 |
| 不依賴意志力 | harness 的所有機制都是系統層面的，不需要學習者自律 |
| 不打雞血 | 不是「加油你可以的」，而是「你的 Buddy 今天打卡了」 |
| 即時滿足 | 打卡後立即看到：鼓勵語、火苗旺、成長地圖更新 |

## 後續拆分方向

```
Phase 0: 框架確立（本提案）
         └── 定義 harness 架構、盤點現狀、確認缺口

Phase 1: 落地已設計的子系統
         ├── buddy-ember（Drift Detection + Multi-Agent）
         ├── add-learner-persona（Memory）
         └── encouragement-messages（Hooks + Context Durability）

Phase 2: Tools 顯性化 + 成長地圖（核心缺口）
         ├── 定義 learning-tools 資料模型（媒介級分類，6-10 個平台定義 tools）
         ├── 打卡流程增加方法記錄（建立時選，打卡時自動帶入，零摩擦）
         ├── 成長地圖 MVP（視覺化旅程 + tool 使用軌跡）
         └── 基礎 Observability

Phase 3: AI 強化
         ├── AI Guided Journey 接入（引導式 Check-in、AI 快問）
         ├── Skills 按需載入（AI Mentor 動態生成建議，靜態策展為 fallback）
         ├── tool-effectiveness-tracking（AI 分析哪個方法最有效）
         └── method-drift-detection（方法層的 drift 偵測）

Phase 4: 擴展 Multi-Agent + 開放生態
         ├── 學習小組
         ├── Mentor 機制
         ├── Tool schema 開放社群貢獻
         └── 接入 Learning Agent Platform 能力
```

## Open Questions（含初步方向）

### Q1: Tools 的顆粒度

**方向：媒介級（層級 1）為主體，形式級（層級 2）為可選標籤。**

Tool 定義在媒介級（影片、文字、專案、社群、一對一、遊戲化），數量控制在 6-10 個。層級 2（YouTube vs 線上課程）和層級 3（具體頻道/課程）不由島島管理——具體資源是學習者（agent）自己的決策。

可選的細分標籤在數據量足夠後再決定是否需要，先跑起來收集數據。

### Q2: Tools 是平台定義還是社群生長

**方向：先平台定義（封閉），schema 穩定後開放社群貢獻（混合模式）。**

每個 Tool 有 schema：名稱、描述、建議搭配的 Skills、打卡時的引導 prompts、成效觀察指標。MVP 階段由島島團隊定義基礎 tools，社群貢獻需等 schema 格式和品質標準確立。

### Q3: Skills 的內容來源

**方向：MVP 用人工策展的靜態 Skills → AI Mentor 上線後切換為動態生成。**

靜態 Skills 由島島團隊撰寫或引用外部方法論（費曼、間隔重複等），按需載入。當 AI Mentor 上線（Learner Persona RAG 注入完成後），Skills 可以變成 AI 根據 Persona + Tool 動態生成的個人化建議——不再是固定文件，而是活的教練。

### Q4: Learner Persona → Tool 推薦的匹配邏輯

**方向：不急著做推薦。先展示 → 收集數據 → 輕推 → 個人化推薦。**

- Phase 2：全部 tools 展示，讓學習者自己選，收集使用數據
- Phase 3：根據 Observability 數據輕推——「跟你特質相似的人也常搭配專案實作」
- Phase 4：數據量足夠後才做個人化推薦（AI 或規則匹配）

這符合 Bitter Lesson：不要過度工程化控制流，先讓 harness 跑起來。

### Q5: The Bitter Lesson 的邊界——Harness 應該多主動

**方向：預設被動（Netflix 模式），用「降低摩擦力」取代「主動建議」。**

參考 `execution-over-planning` 研究：核心不是「多主動 vs 少主動」，而是「降低摩擦力」。

- ❌ "你應該用影片學習" → 主動建議 = 增加選擇摩擦
- ✓ "繼續上次的影片跟讀？[✓]" → 預設行為 = 零摩擦

Netflix 模式：打開就自動播放，你要「主動」才能不看。
島島模式：打開就帶入上次的學習方法，你要「主動」才能換。

例外：新手期（前 2 週）可稍微主動引導選擇；drift 時透過 Buddy 社會連結介入，不透過系統警告。

### Q6: 打卡時記錄方法的 UX 負擔

**方向：建立 Practice 時選預設方法，打卡時自動帶入（零摩擦）。**

```
建立 Practice 時：選擇主要學習方法（可複選）
打卡時：自動帶入上次方法，一鍵完成
        想換？點「換一個方法」（次要動作）
```

這同時解決了數據收集和 UX 負擔的矛盾——每次打卡都有方法記錄（Observability 有數據），但學習者幾乎不需要額外操作（摩擦力趨近於零）。
