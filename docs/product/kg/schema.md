# KG Schema v1

> 本文件是 `docs/product/kg/` 知識圖的 schema 定稿。所有節點檔案必須符合此規範。
> 修改 schema 請直接改本文件並在 git history 留下理由。

---

## 1. 通用規則

### 檔案與 ID

- 一個節點 = 一個 markdown 檔，放在所屬層的目錄（見 §3）。
- `id` = 檔名去掉 `.md`，全小寫 kebab-case，帶型別前綴：`pain-lonely-exam-prep`、`persona-a1`。
- ID 一旦建立不改名（其他檔案用 `[[id]]` 引用）；節點作廢時 frontmatter 加 `status: deprecated`，不刪檔。

### Frontmatter 必填欄位（所有型別）

```yaml
id: <與檔名一致>
type: <節點型別，見 §2>
confidence: evidenced | hypothesis   # 有 Signal 證據支持才能標 evidenced
updated: YYYY-MM-DD
```

### 邊（關係）

- 邊寫在 frontmatter 的陣列欄位裡，值是目標節點 id（不含 `[[]]`）。
- 內文中可用 `[[id]]` 補充敘述性連結，但**機器查詢只認 frontmatter**。
- 邊方向固定（見各型別定義），不建反向欄位——反向查詢用 grep。

### 內文

- 第一段：一句話定義這個節點。
- PainPoint / Signal 類節點必須保留 **TA 原話語言**（照抄，不改寫成產品語言）。
- 品牌用詞：用「團／團友／衝刺團／揪團」，不用「同梯」。

---

## 2. 節點型別定義

### 市場研究層 `market/`

| type | 檔名前綴 | 專屬欄位 |
|---|---|---|
| `Segment` | `segment-` | `size_note`（規模描述，可為文字） |
| `Competitor` | `competitor-` | `serves: [segment-*]`、`kind: product \| diy`（diy = LINE 群、Notion 模板等非產品替代方案） |
| `Channel` | `channel-` | `reaches: [persona-*]` |
| `ExamEvent` | `exam-` | `date: YYYY-MM-DD`（下一場）、`cadence`（頻率描述）、`registration_window` |
| `Signal` | `signal-` | `source_url`、`observed_date: YYYY-MM-DD`、`evidences: [任意節點 id]` |

### 問題層 `problem/`

| type | 檔名前綴 | 專屬欄位 |
|---|---|---|
| `PainPoint` | `pain-` | `severity: high \| medium \| low`、`personas: [persona-* \| org 也可]`、`solved_today_by: [competitor-*]`、`addressed_by: [feature-* \| valueprop-*]`、`evidence: [signal-*]` |
| `JobToBeDone` | `jtbd-` | `derived_from: [pain-*]` |

### 使用者層 `user/`

| type | 檔名前綴 | 專屬欄位 |
|---|---|---|
| `Persona` | `persona-` | `track: A \| B`、`belongs_to: [segment-*]`、`pursues: [goal-*]`、`pays_at: [payment-*]` |
| `Goal` | `goal-` | `anchored_by: [exam-*]`（可空）、`requires_skills`（文字或 ESCO id） |
| `PaymentMoment` | `payment-` | `willingness_note`（付費力描述）、`monetized_by: [valueprop-*]` |

### 企業層 `enterprise/`

| type | 檔名前綴 | 專屬欄位 |
|---|---|---|
| `Organization` | `org-` | `kind: course_brand \| community_host \| other`、`owns`（offering 描述或子清單）、`targets: [persona-*]`、`has_pain: [pain-*]`、`contact_state: candidate \| contacted \| talking \| design_partner \| paying \| excluded`、`contact_note`（excluded 必須寫排除理由，避免重複評估） |

（Offering 與 Contact 併入 Organization 欄位，量大到需要獨立節點時再拆。）

### 產品層 `product/`

| type | 檔名前綴 | 專屬欄位 |
|---|---|---|
| `Feature` | `feature-` | `status: live \| building \| planned`、`doc`（docs/product 對應文件相對路徑） |
| `ValueProp` | `valueprop-` | `for: [persona-* \| org-*]`、`monetizes: [payment-*]`、`built_on: [feature-*]` |

（`PracticeTemplate`、`ESCOSkill` 存在主 DB，KG 內以文字引用，不建節點檔。）

---

## 3. 目錄結構

```
docs/product/kg/
  kg-plan.md  schema.md
  market/  problem/  user/  enterprise/  product/
```

---

## 4. Canonical ID 清單

跨檔案引用必須用以下固定 ID，不得自創同義節點。

### Personas（來源：plg-gtm-strategy.md v2）

| id | 名稱 |
|---|---|
| `persona-a1` | A1 考期學習者（日檢／英檢） |
| `persona-a2` | A2 轉職者 |
| `persona-a3` | A3 自我成長型讀者（陪伴型讀書會受眾） |
| `persona-a4` | A4 Build-in-public Builder（創世聚落原型用戶） |
| `persona-b1` | B1 學習型社群經營者／讀書會發起人 |
| `persona-b2` | B2 自有課程品牌擁有者 |

### 核心 Features

| id | 名稱 | status |
|---|---|---|
| `feature-checkin` | 打卡 | live |
| `feature-practice` | 實踐（模板／建立／追蹤） | live |
| `feature-inspire-feed` | 靈感牆 | live |
| `feature-quick-response` | 快速回應 | live |
| `feature-sprint-group` | 衝刺團／揪團機制 | planned |
| `feature-export` | 學習歷程匯出 | building |
| `feature-buddy` | Buddy | planned |
| `feature-ember` | 火苗 | planned |
| `feature-recommend` | 推薦 | building |
| `feature-weekly-report` | 週報 | live |
| `feature-ai-actions` | AI 生成行動／AI 額度 | live |
| `feature-b-dashboard` | B 端進度儀表板 | planned |

（status 以 `product-status-check` 驗證為準，抽取時如與文件矛盾，以程式碼／實際上線狀態為準並註記。）

---

## 5. 品質守則

1. **證據優先**：`confidence: evidenced` 必須有 `evidence`／`Signal` 支撐；沒有就標 `hypothesis`，不禁止假設，禁止假裝。
2. **覆蓋檢查**（定期跑）：
   - PainPoint 缺 `addressed_by` → 產品缺口清單
   - Feature 未被任何 PainPoint 指到 → 過度設計候選
   - Persona 少於 3 個 evidenced PainPoint → 研究欠債
   - Organization 缺 `targets` → BD 降優先（`contact_state: excluded` 者豁免此規則）
3. **單一事實來源**：新研究、訪談、BD 進展寫進 KG，不散落在一次性筆記。
