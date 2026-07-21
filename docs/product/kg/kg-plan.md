# 島島阿學 Knowledge Graph 規劃

> 目的：把散落在 GTM 文件、persona PRD、市場研究、BD 名單裡的知識，整理成一張可查詢、可累積、可被 agent 消費的圖。
> 視角：市場研究 × 問題 × 使用者 × 企業，四層互相連接，再掛回產品層。

---

## 1. 這張 KG 要回答什麼問題

| 使用場景 | KG 要能回答的問題 |
|---|---|
| GTM 內容產出（`gtm-content` skill） | 「A2 轉職者的痛點語言有哪些？有什麼證據（原文貼文）？對應哪個功能賣點？」 |
| 開團主題選擇 | 「哪個考期 × 哪個 persona 交集最肥？最近的 deadline 是哪場？」 |
| BD / 合作開發 | 「哪些課程品牌的學員輪廓 = A1？接觸到哪一步？他們的完課痛有多痛？」 |
| 產品優先級 | 「哪些痛點還沒有功能覆蓋？哪些功能沒有對到任何痛點（過度設計）？」 |
| 未來 AI 功能 | 「Buddy 配對、實踐推薦可以吃 persona–goal–skill 的邊」 |

**不是**要做一個學術完整的 ontology——每個節點、每條邊都必須至少服務上面一個場景，否則不建。

---

## 2. Ontology：四層 + 產品層

### 2.1 市場研究層（Market）

| 節點類型 | 說明 | 例子 |
|---|---|---|
| `Segment` 市場區隔 | 一塊可描述規模與動態的市場 | 語言檢定備考、轉職技能自學、線上課程完課服務 |
| `Competitor` 競品/替代方案 | 使用者現在用什麼解決問題（含非產品） | Notion 模板、LINE 讀書會群、Habitica、Discord 自習室 |
| `Channel` 通路 | 能觸及 TA 的地方 | Threads、Dcard 語言版、FB 考試社團、IG |
| `ExamEvent` 考期事件 | 免費的共同 deadline（GTM v2 的節拍器） | 2026-12 日檢、每月多益場次 |
| `Signal` 市場訊號 | 一則具體觀察（貼文、數據、報導） | Dcard「求 N2 讀書會」文、完課率統計 |

### 2.2 問題層（Problem）

| 節點類型 | 說明 | 例子 |
|---|---|---|
| `PainPoint` 痛點 | 用 TA 自己的語言描述的痛 | 一個人備考的孤獨、軌跡散落無法證明、學員完課率低靠 LINE 群手工救 |
| `JobToBeDone` | 痛點背後要完成的任務 | 需要節律的容器、需要可出示的學習證明、需要規模化的完課引擎 |

### 2.3 使用者層（User）

| 節點類型 | 說明 | 例子 |
|---|---|---|
| `Persona` | GTM 的 TA 單位 | A1 考期學習者、A2 轉職者、B1 社群經營者、B2 課程品牌 |
| `Goal` 目標 | persona 的具體目標 | N2 合格、多益 800 轉外商 |
| `PaymentMoment` 付費時刻 | 願意掏錢的瞬間 | 面試前匯出學習歷程、AI 額度用罄 |

### 2.4 企業層（Enterprise / B 端）

| 節點類型 | 說明 | 例子 |
|---|---|---|
| `Organization` | 具體的小 B / 合作對象 | 某日語線上課品牌、某 Threads 讀書會主 |
| `Offering` | 他們賣的東西 | NT$3,000 線上課、每期 NT$800 讀書會 |
| `Contact` 接觸紀錄 | BD 狀態機 | 候選 → 已接觸 → 洽談中 → design partner → 付費 |

### 2.5 產品層（Product，掛接點）

| 節點類型 | 說明 | 例子 |
|---|---|---|
| `Feature` 功能 | 已上線或規劃中的功能 | 打卡、靈感牆、衝刺團、匯出、火苗 |
| `ValueProp` 價值主張 | 對某 persona 的賣點敘事 | 「完課引擎」「學習歷程資產」 |
| `PracticeTemplate` | 實踐模板（DB 已有） | N2 90 天衝刺模板 |
| `ESCOSkill` | 技能分類（DB 已有，不重建，用 ID 引用） | javascript、日語 |

### 2.6 關係（邊）

```
Persona   —has_pain→        PainPoint
Persona   —belongs_to→      Segment
Persona   —pursues→         Goal
Persona   —pays_at→         PaymentMoment
Goal      —anchored_by→     ExamEvent
Goal      —requires→        ESCOSkill
PainPoint —solved_today_by→ Competitor      （現有替代方案）
PainPoint —addressed_by→    Feature | ValueProp
Channel   —reaches→         Persona
Signal    —evidences→       PainPoint | Segment | Channel   （所有主張都要有證據邊）
Organization —owns→         Offering
Offering  —targets→         Persona
Organization —has_pain→     PainPoint       （B 端的完課痛）
Organization —contact_state→ Contact
ValueProp —monetizes→       PaymentMoment
PracticeTemplate —teaches→  ESCOSkill
```

**兩條鐵律**：
1. **證據優先**：任何 PainPoint / Segment 的主張，至少一條 `Signal —evidences→` 邊，Signal 帶原始出處 URL 與日期。沒證據的節點標 `confidence: hypothesis`。
2. **雙向覆蓋檢查**：`PainPoint` 沒有 `addressed_by` = 產品缺口；`Feature` 沒有反向被指到 = 過度設計候選。這是 KG 對產品決策最直接的價值。

---

## 3. 儲存形式：分兩階段

### Phase 1（現在）：repo 內 Markdown 檔案圖

- 位置：`docs/product/kg/`，一個節點一個檔案，frontmatter 記型別與屬性，內文用 `[[node-id]]` 連邊。
- 理由：git 版本化、grep/glob 可查（80% 查詢用 grep 就夠）、agent 直接讀寫、跟現有 docs/product 工作流無縫、零基礎設施。
- 目錄結構：

```
docs/product/kg/
  kg-plan.md            ← 本文件
  schema.md             ← ontology 定稿（節點型別、邊型別、必填欄位）
  market/    segment-*.md  competitor-*.md  channel-*.md  exam-*.md  signal-*.md
  problem/   pain-*.md  jtbd-*.md
  user/      persona-*.md  goal-*.md
  enterprise/ org-*.md
  product/   feature-*.md  valueprop-*.md
```

- 節點檔案格式範例：

```markdown
---
id: pain-lonely-exam-prep
type: PainPoint
severity: high
confidence: evidenced        # evidenced | hypothesis
personas: [persona-a1]
addressed_by: [feature-sprint-group, feature-inspire-feed]
evidence: [signal-dcard-n2-studygroup-2026-05]
updated: 2026-07-12
---
# 一個人備考的孤獨

TA 原話語言：「自己讀到懷疑人生」「求讀書會但都揪不成」…
```

### Phase 2（當產品功能要消費時）：進 Postgres

- 觸發條件：推薦、Buddy 配對、AI 生成內容需要即時查 KG 時。
- 做法：沿用 daodao-storage 的 migration 流程，建 `kg_nodes` / `kg_edges` 兩張表（JSONB 屬性），寫一支同步 script 從 markdown 灌入。ESCO 已在 DB，直接以外鍵掛接。
- **不要一開始就上 Neo4j**——現有查詢複雜度 pg + 遞迴 CTE 綽綽有餘，且團隊已有 pg 維運。

---

## 4. 建置路線

| 階段 | 工作 | 產出 |
|---|---|---|
| **P0 定 schema**（半天） | 把 §2 的 ontology 寫成 `schema.md`，定死必填欄位與命名規則 | schema.md |
| **P1 種子抽取**（1–2 天） | 從既有文件抽節點：`plg-gtm-strategy.md`（4 personas、痛點、通路、考期）、`retention-diagnosis.md`（痛點證據）、`persona PRD`、`threads-partner-candidates.md`（Organization 種子）、`推薦/buddy PRD`（Feature 節點）。可用 subagent 平行抽取 | 約 40–60 個種子節點 |
| **P2 補洞研究**（持續） | 跑覆蓋檢查找洞，針對洞做外部研究（stealth_fetch 抓 Threads/Dcard 訊號、競品官網、考期官網），每筆研究落成 Signal 節點 | 證據密度提升，hypothesis → evidenced |
| **P3 維運節律** | 每次訪談/BD 接觸/新研究 → 進 KG 而不是散落筆記；`gtm-content`、`notion-card` 等 skill 改為先查 KG | KG 成為單一事實來源 |
| **P4（選配）DB 化** | 見 Phase 2 觸發條件 | kg_nodes/kg_edges + 同步 script |

---

## 5. 第一批覆蓋檢查（P1 完成後立刻跑）

1. 每個 Persona 至少 3 個 evidenced PainPoint？
2. 每個 PainPoint 有 solved_today_by（競品）嗎？——沒有替代方案的痛通常是假痛。
3. A1×A2 交集（考期×轉職）的 Goal 節點建齊了嗎？（GTM v2 說這是最肥的一塊）
4. threads-partner-candidates 每個 Organization 有 targets→Persona 的邊嗎？——對不上 TA 的候選人直接降優先。
5. 哪些 Feature 沒被任何 PainPoint 指到？

---

## 6. 明確不做

- 不建學術式完整 ontology（ESCO 那種細度只留給 ESCOSkill，且直接引用不重建）。
- 不一開始上圖資料庫 / 向量資料庫。
- 不把使用者個資（個別 user 行為）放進這張 KG——這是市場與產品知識圖，不是 user profile 系統；個別用戶資料留在主 DB。
