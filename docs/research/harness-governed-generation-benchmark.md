# Harness-Governed Code Generation：薄 Spec + 厚 Gate 的開發流程設計

> 2026-09-13 實作更新：本文保留研究與當時盤點；部分「完全不存在」已不能作為目前狀態。新增 REVIEW 規則、決策輸入 audit pack、測試完整性 scanner／Claude hook、離線 eval scorer CI，以及 server 兩端點 wire contract 試點。詳見 [實作追蹤與驗證限制](../plans/2026-09-13-benchmark-gate-implementation.md)。整體 benchmark 尚未完成：模型行為回歸、全 repo gate 覆蓋、自動修正及監控閉環仍待做；不得據此刪除尚無 gate 覆蓋的約束。


> 2026-09-13 — 根據外部四模型實驗數據、[AI-Native SDLC Playbook](https://quidproquo.cc/series/ai-native-sdlc-playbook/) 系列文章、以及 Stripe/Spotify/Coinbase/Ramp 的內部 coding agent 實踐，整理出 AI 輔助開發流程的通用設計原則，並以 daodao 專案為具體案例。
>
> **適用範圍**：本文的原則（薄 spec + 厚 gate、四層 gate 架構、decisions.md 格式）適用於任何 coding agent（Claude Code、Codex、Cursor、Goose、Devin 等）。daodao 的實作使用 Claude Code 的 hooks/skills 機制，但每個模式都有對應的 agent-agnostic 實現方式，見 §7.6 的對照表。

## 1. 實驗摘要

四個 Claude 模型在相同條件下，依據 10 個 Problem Frames 規格，從頭生成完整後端系統：

- **產出架構**：DDD + Clean Architecture + CQRS + Event Sourcing + Design by Contract + REST API + 測試
- **流程**：Specification → 生成 → Gate 判決 → 修補 → 再判決 → … → PASS

|  | Sonnet | Opus | Fable | Haiku |
|---|---|---|---|---|
| 修補輪 (+STALL) | 8 (+6) | 3 | 3 | 40 (+7) |
| 生成（分鐘） | 252 | 299 | 256 | 148 |
| 修補（分鐘） | 40 | 15 | 17 | 218 |
| 判決（分鐘） | 41 | 29 | 36 | 79 |
| 一輪過的 PF | 5/10 | 8/10 | 9/10 | 1/10 |
| output / cache read | 373k/59M | 303k/45M | 322k/29M | 1.01M/177M |

核心發現：**便宜的模型不一定便宜。** Haiku 單價最低、初始生成最快（148 分鐘），但需要 40 輪修補，最終消耗 1.01M output + 177M cache read tokens。真正的成本公式是：`模型單價 × 完成整個受治理生成過程所消耗的 tokens`。

## 2. daodao 現有架構與流程

### 2.1 Server 架構：Express MVC 三層

```
routes → controllers → services → Prisma ORM → PostgreSQL
         (zod 驗證)    (業務邏輯)
```

- 沒有 Domain layer（Aggregate / Entity / Value Object）
- 沒有 Repository 抽象（service 直接操作 Prisma）
- 沒有 CQRS（讀寫混在同一個 service）
- 沒有 Event Sourcing（DB 直接 mutate）
- 沒有 Design by Contract（有 zod input validation，但沒有 domain invariant）
- Business rule 散落在 utility 和 service 裡（`practice-status.ts`、`challenge-acl.service.ts` 等）

### 2.2 Gate / Harness 設計

daodao 的 dev-task 流程有多層 gate，但治理目標不同於實驗：

| 階段 | Gate | 驗什麼 |
|---|---|---|
| Phase 2 每個 phase | typecheck + lint + 瀏覽器/curl + `stop-quality-gate.sh` | 編譯正確、style 規範、功能行為 |
| Phase 3 verify | POC probe checklist + getComputedStyle 量測 + 並排截圖 | 視覺還原度 |
| Phase 4 finish | clean-context spec auditor（隔離 subagent） | 驗收契約逐條 PASS/FAIL |
| Phase 4 finish | 4-engine code review（Codex CLI + OMP + OpenCode + Haiku） | 程式品質、安全、效能 |
| Phase 4 finish | `pre-pr-gate.sh` hook | task.md 狀態 + POC 比對完成 |

## 3. 對照分析：兩套 harness 在治理什麼

| 面向 | 實驗 | daodao |
|---|---|---|
| **Spec 類型** | Problem Frames（定義架構約束） | FRD Test Points + 驗收契約（定義行為需求） |
| **Gate 驗什麼** | 結構正確性：aggregate boundary、event schema、contract invariant | 行為正確性：功能對不對、畫面對不對 |
| **測試層** | 架構合規測試 | 103 個 integration/unit/e2e，測 API 行為（BL-1~4），不測架構約束 |
| **修補迴路** | 無限重試直到通過 | 同一項失敗 2 次就人工介入（circuit breaker） |
| **UI 驗證** | 無 | POC probe checklist、getComputedStyle、瀏覽器截圖——這是實驗沒有的強項 |
| **架構治理** | 核心（Problem Frames 定義結構） | **不存在**——架構靠開發者自律 |

**結論**：daodao 的 harness 很強在「做出來的東西行為對不對、長得對不對」，但完全沒有治理架構層。business logic 散落在哪、分層有沒有被遵守、domain rule 有沒有集中管理，目前沒有任何 gate 在檢查。

## 4. 可借鏡的改進方向

### 4.1 Specification 驅動生成，不只驅動驗收

**現狀**：FRD 只定義「要什麼行為」，gate 也只驗行為。

**借鏡**：實驗的 Problem Frames 同時定義「結構約束」——哪些東西是 aggregate、boundary 在哪、哪些操作必須經過 aggregate root。

**做法**：在 FRD 或 OpenSpec change 中加入架構約束區塊。例如：

```markdown
## 架構約束
- Cohort 是 aggregate root，setup / chat / member 操作必須經過 CohortService
- Practice 狀態轉換規則集中在 practice-status.ts，controller 不直接判斷狀態
- 新增的 domain rule 必須有對應的 unit test 驗 invariant
```

這樣 Phase 4 的 spec auditor 就能驗結構，不只驗功能。

### 4.2 漸進引入 Design by Contract

**現狀**：business rule 散落在 utility（`canEdit`、`determineNewStatus`）和 service（`assertChallengePracticeCopyable`）。有 zod 做 input validation，但沒有 domain-level invariant。

**借鏡**：不用一步到 DDD 全套，但可以把已有的散落 business rule 收斂：

1. **辨識既有的隱式 contract**：server 裡已經有 `canEdit`、`determineNewStatus`、`checkHasPassedEndDate`、`assertChallengePracticeCopyable`、`assertCohortPracticeUpdatable` 這些 function，它們就是 domain rule，只是沒有被當作 contract 管理
2. **集中管理**：將同一 aggregate 的 rule 搬進專屬檔案（例 `domain/practice.rules.ts`），每條 rule 是一個可獨立測試的 pure function
3. **補 invariant 測試**：現有 103 個測試驗 API response，但沒有測「給定非法狀態轉換，rule 本身會不會擋」。補上 rule-level unit test，成本低、回報高

### 4.3 架構合規 gate 加進 code review

**現狀**：4-engine code review 只看程式品質、安全、效能，不看架構遵循。

**借鏡**：實驗用 gate suite 跑架構檢查。daodao 可以零成本把架構 rule 加進 review：

1. **review prompt 加入架構規則**：在 `.github/review-knowledge/` 或 code review skill 的 prompt 中加入：
   - controller 不應直接操作 Prisma
   - business rule 不應散在 route handler 或 controller
   - 新增的狀態轉換必須經過對應的 rule function
   - service 之間的呼叫方向（不允許循環依賴）
2. **成本幾乎為零**：review 本來就跑，多幾條 rule 不增加 token 消耗

### 4.4 修補迴路的成本意識

**現狀**：dev-task Phase 2 已有「同一項失敗 2 次就停」的 circuit breaker。

**借鏡**：實驗數據清楚顯示修補輪數與總成本的非線性關係（Haiku 40 輪 → 177M cache read）。daodao 的 circuit breaker 是對的設計，但目前只在 Phase 2 有。

**做法**：
- Phase 4 的 spec auditor 如果連續 2 次 FAIL 同一條 AC，也應停下來而不是讓 model 反覆修
- 4-engine code review 的 finding 如果修了又被同一引擎報同樣問題，標記為可能是 harness 誤判（走 review-knowledge 記錄），而不是繼續 fix loop

## 5. 優先順序建議

| 順序 | 項目 | 成本 | 效益 |
|---|---|---|---|
| 1 | 架構規則加進 code review prompt | 低（改 prompt） | 立即開始抓架構違規 |
| 2 | 辨識並集中既有 business rule | 中（重構） | domain 知識不再散落 |
| 3 | 補 rule-level invariant 測試 | 中（寫測試） | 狀態轉換 bug 在 unit test 就抓到 |
| 4 | OpenSpec / FRD 加入架構約束區塊 | 低（改模板） | spec auditor 能驗結構 |
| 5 | 全面 DDD 重構 | 高 | 目前 daodao 規模不需要 |

---

## 附錄：為什麼不直接搬 DDD + CQRS + Event Sourcing

實驗的 Product Aggregate 是一個受控的學術場景——單一 aggregate、固定 boundary、明確的 event schema。daodao 是一個活的產品，有 20+ 進行中任務、跨 6 個 repo、UI 驅動的開發節奏。全面導入 DDD 的成本（改架構 + 改測試 + 改 migration + 改所有 service）遠超收益。

正確的借鏡不是搬架構，而是搬**治理方法**：用 specification 定義約束、用 gate 驗約束、用 harness 讓 model（和人）無法繞過約束。daodao 已經在行為層做到了，補上架構層就完整了。

---

## 6. 參照 AI-Native SDLC Playbook 的優化方向

[AI-Native SDLC Playbook](https://quidproquo.cc/series/ai-native-sdlc-playbook/) 是 Anthropic Claude Academy 的 14 堂課系列，定義了完整的 AI-native 開發生命週期。以下逐階段對照 daodao 現有流程，標出「已做到」「部分做到」「還沒做」。

### 6.1 對照總表

| SDLC 階段 | Playbook 要求 | daodao 現狀 | 缺口 |
|---|---|---|---|
| **Plan** (L2) | intent.md：需求發起人跟 Claude 對話產出結構化 proto-spec，版控追溯 | **已做到且超越**：OpenSpec proposal.md = 問題陳述 + FRD 缺口分析 + 已確認產品決策，版控在 `openspec/changes/<slug>/` | Playbook 的 intent.md 只有「問題 + 預期結果 + 限制」；OpenSpec proposal 還包含「現況程式碼實查 vs FRD 逐條對照」 |
| **Design** (L3) | 需求與設計合併成單一 session，套用 skill 載入組織標準，產出 spec.md | **已做到且超越**：OpenSpec design.md = 完整設計決策（資料模型、API contract、正規化規則、migration SQL），單一 session 從 proposal 推導 | 沒有標準化的組織規範 skill（品牌、資安、合規、UX）供 design session 載入 |
| **Build** (L4) | Plan mode 先寫 plan.md，commit 後才進 auto mode 實作 | **已做到且超越**：OpenSpec tasks.md = 分 Phase 的實作計畫，每個 task 有涉及檔案、驗收條件、工時預估；dev-task Phase 1 再轉成 task.md manifest | Playbook 的 plan.md 只列檔案和順序；OpenSpec tasks.md 細到每個 task 的 AC |
| **Build** (L5) | CLAUDE.md 記錄慣例、架構、常見錯誤 | **已做到**：monorepo 有 CLAUDE.md，各 skill 有參考文件 | 架構約束沒寫進去（見 §4.1） |
| **Build** (L6) | Skills 編碼組織規範 | **已做到且超越**：dev-task、code-review、gh-card、gh-pipeline、pre-commit-check 等 30+ skills | — |
| **Build** (L7) | 平行 session + worktree 隔離 + subagent | **已做到且超越**：dev-task 的 worktree 隔離是核心設計，Phase 4 用 clean-context subagent 做 spec audit | — |
| **Test** (L8) | Feedback loop：agent 每一步自我驗證，hook 保護迴圈不被弱化 | **已做到**：Phase 2 每個 phase 的自動驗證序列（起 dev server → 瀏覽器/curl → pre-commit-check → commit） | 缺「測試失敗時修 code 不修 test」的 hook 保護（L8 的核心治理） |
| **Test** (L9) | CI Evals：收集真實任務做回歸測試，CLAUDE.md/skill 改動時自動跑，pass rate 掉了擋 merge | **沒做到** | 完全缺失——CLAUDE.md 和 skill 的改動目前沒有行為回歸驗證 |
| **Deploy** (L10) | AI PR review + REVIEW.md + review comment 自動修正迴圈 | **部分做到**：4-engine code review（本地 push 前跑）+ CI code-review.yml；但沒有 REVIEW.md，沒有 PR comment → 自動修正迴圈 | 缺 REVIEW.md（定義 review pass 和嚴重程度分類）；review 只在本地跑，PR 上沒有自動修正迴圈 |
| **Deploy** (L11) | Hooks 作為確定性閘門 | **已做到**：`pre-pr-gate.sh`（攔 `gh pr create`）、`stop-quality-gate.sh`；PreToolUse hook 機制完備 | 缺 deploy 階段的 production gate（daodao 目前沒有自動化部署管線，手動 merge dev → main） |
| **Deploy** (L12) | CI/CD 整合：Claude 接進 pipeline，按環境分層授權 | **部分做到**：CI 有 code-review.yml、pipeline-dispatch.yml、pipeline-board-sync.yml | Claude 沒有接進部署流程；Routine B（agentic 實作）是唯一的 CI agent 環節 |
| **Maintain** (L13) | 監控閉環：偵測腳本 → Claude 產出 intent.md → 走完整個管線 | **沒做到** | 完全缺失——沒有自動化的監控 → 回饋迴路 |

### 6.2 三個高 ROI 的缺口

#### 缺口 A：spec auditor 沒有交叉比對 OpenSpec design.md（L4 延伸）

**問題**：daodao 有完整的 OpenSpec 流程（proposal.md → design.md → tasks.md），比 Playbook 的 intent.md → spec.md → plan.md 更詳盡。但 Phase 4 的 clean-context spec auditor **只拿 diff + task.md 驗收契約**，沒有拿 OpenSpec 的 design.md 來比對。也就是說：設計決策寫好了，但實作有沒有遵守設計，目前沒有 gate 在驗。

**Playbook 的啟發**：L4 建議 PR review 時比對 diff 跟 plan.md 是否一致。daodao 已經有比 plan.md 更好的東西（OpenSpec design.md 有資料模型、API contract、正規化規則），只是沒有接進審計迴圈。

**做法**：
1. Phase 4 spec auditor 的 prompt 增加一份輸入：`openspec/changes/<slug>/design.md` 的 Decisions 區塊
2. Auditor 除了逐條比對 AC，也比對「diff 有沒有偏離 design 決策」——例如 design 說 `tagline VARCHAR(80)`，但 diff 裡沒有長度驗證
3. task.md 已經記錄了 OpenSpec 路徑（Phase 1 收集的），所以 auditor 可以自動找到對應的 design.md

**成本**：低（改 spec auditor prompt，加一份輸入）
**效益**：OpenSpec design.md 從「寫了就放著」變成有 gate 驗證的活文件

#### 缺口 B：CI Evals 回歸測試（L9）

**問題**：daodao 有 30+ skills、CLAUDE.md、多個 hook——這些「agent 設定」控制 agent 的行為，但改動時沒有回歸驗證。改了一個 skill 的觸發條件，可能導致它在某些場景不觸發；改了 CLAUDE.md 的規則，可能讓 agent 開始違反已建立的慣例。

**Playbook 的做法**：收集 20-50 個真實任務（prompt + 驗收條件），CLAUDE.md 或 `.claude/` 改動時在 CI 自動跑一輪，pass rate 掉了擋 merge。每個線上事故變成永久的 eval。

**daodao 落地方式**：
1. 從最近 20 個已完成的 dev-task 中，取 task.md 的 prompt + 驗收契約當 eval 案例
2. 寫 `evals/check.sh`：用 `claude -p` 非互動式跑每個案例，比對產出是否滿足 AC
3. 在 CI 加一個 job：當 PR 改到 `CLAUDE.md`、`.claude/skills/`、`.claude/hooks/` 時觸發
4. 先手動跑幾次驗證鑑別力，確認有效後設為 merge check

**成本**：中（需要收集案例 + 寫 check script + CI 設定；每次跑消耗 API tokens）
**效益**：agent 設定的改動有回歸保護——目前這是完全裸露的

#### 缺口 C：REVIEW.md + PR comment 自動修正迴圈（L10）

**問題**：daodao 的 code review 在本地 push 前跑（4-engine），CI 也跑一次。但 review 的標準散在 code-review skill 的 prompt 裡，不是團隊可見的共識文件。PR 上收到 review comment 後，修正 → push → 再 review 是手動迴圈。

**Playbook 的做法**：
- REVIEW.md 放在 repo 根目錄，定義 review pass（Bug / Security / Spec compliance）、嚴重程度分類、nit 上限、不需報告的排除範圍
- PR 上 tag `@claude`，Claude 讀 comment → 修正 → push commit，完整對話留在 PR thread

**daodao 落地方式**：
1. 為每個 sub-repo 寫 REVIEW.md（可以從 code-review skill 的 prompt 抽出，變成團隊可見的文件）
2. 啟用 `claude-code-action` 或等效的 CI review（已有 code-review.yml 基礎）
3. 在 CI review comment 加上 `@claude` 自動修正迴圈——reviewer 留 comment，Claude 自動修並推 commit
4. REVIEW.md 中加入架構規則（§4.3 的內容）

**成本**：低-中（寫 REVIEW.md 低成本；自動修正迴圈需要 CI 設定）
**效益**：review 標準從 skill prompt 變成團隊共識文件；PR 的修正迴圈從手動變自動

### 6.3 已做到且超越 Playbook 的部分

daodao 在幾個面向比 Playbook 走得更遠，值得保留和強化：

| 面向 | Playbook 教的 | daodao 實際做的 | 超越之處 |
|---|---|---|---|
| **OpenSpec 三件套** (L2+L3+L4) | intent.md → spec.md → plan.md，三份獨立文件 | proposal.md（問題 + FRD 缺口逐條對照 + 產品決策）→ design.md（資料模型 + API contract + 正規化規則 + migration SQL）→ tasks.md（分 Phase 實作計畫，每個 task 帶 AC + 工時預估） | 比 Playbook 更深——design.md 細到 SQL 欄位型別和 Zod schema；tasks.md 每個 task 有可判定的驗收條件 |
| **Phase 級自我驗證** (L8) | 把驗證步驟收攏成單一命令，commit 前跑 | Phase 2 每個 phase 有獨立的驗證序列（瀏覽器/curl + `stop-quality-gate.sh` + `pre-commit-check`），不是一次跑完所有 | 分層更細——早發現早修，不累積到最後 |
| **視覺驗證** (L8) | 提供瀏覽器工具讓 Claude 截圖 | Phase 3 的 POC probe checklist + getComputedStyle 量測 + 並排截圖 + Google 文件驗證報告 | 不只截圖比對，還有量化的 CSS 屬性差異表 |
| **Clean-context 審計** (L10) | 寫程式的 agent 不能自己批准自己的 PR | Phase 4 的 spec auditor 是一個全新的 subagent，只看 diff + 驗收契約，完全看不到開發對話 | Playbook 講的是「不同身份」，daodao 做的是「不同 context」——更強的隔離 |
| **Worktree 隔離** (L7) | 多個 session 用 git worktree 隔離 | dev-task 完整的 worktree 管理（防撞檢查、clone mode fallback、port offset、env 複製、跨 repo 統一 branch） | 生產級的隔離方案，不只是 `git worktree add` |
| **Hook 治理** (L11) | PreToolUse hook 擋危險操作 | `pre-pr-gate.sh` 攔 `gh pr create` 驗 task.md 狀態 + POC 比對；`stop-quality-gate.sh` 每個 phase 跑 | Hook 跟 dev-task 流程深度整合，不只是通用防護 |
| **誤判管理** (L10) | 建立 nit 上限 | `.github/review-knowledge/false-positives.jsonl` 誤判知識庫，CI 和本地 review 共用 | 系統化的誤判記錄和回饋，不只是上限控制 |

### 6.4 完整優先順序（合併實驗借鏡 + Playbook 缺口）

| 順序 | 項目 | 來源 | 成本 | 效益 |
|---|---|---|---|---|
| 1 | 架構規則加進 code review prompt + REVIEW.md | 實驗 §4.3 + L10 | 低 | 架構違規開始被抓；review 標準可見 |
| 2 | spec auditor 交叉比對 OpenSpec design.md | L4 延伸 | 低 | 設計決策有 gate 驗證，不再「寫了就放著」 |
| 3 | 辨識並集中既有 business rule | 實驗 §4.2 | 中 | domain 知識不再散落 |
| 4 | 「修 test 不修 code」hook 保護 | L8 | 低 | feedback loop 不被弱化 |
| 5 | 補 rule-level invariant 測試 | 實驗 §4.2 | 中 | 狀態轉換 bug 在 unit test 抓到 |
| 6 | OpenSpec design.md 加入架構約束區塊 | 實驗 §4.1 | 低 | spec auditor 能驗結構 |
| 7 | CI Evals 回歸測試 | L9 | 中 | agent 設定改動有回歸保護 |
| 8 | PR comment 自動修正迴圈 | L10 | 中 | PR 修正週期從手動變自動 |
| 9 | 監控閉環（Stage 6） | L13 | 高 | 前置：L8/L9 成熟後才有意義 |
| 10 | 全面 DDD 重構 | 實驗 | 高 | daodao 目前規模不需要 |

### 6.5 導入順序建議

```
現在就做（改 prompt / 改 skill）
├── #1 REVIEW.md + 架構規則
├── #2 spec auditor 接 OpenSpec design.md
└── #4 hook 保護 feedback loop

下個 sprint（需要寫 code）
├── #3 集中 business rule
├── #5 invariant 測試
└── #6 OpenSpec design.md 加架構約束

季度目標（需要 CI 設定 + API 預算）
├── #7 CI Evals
└── #8 PR 自動修正迴圈

長期（等前置到位）
├── #9 監控閉環
└── #10 DDD（如果產品複雜度到了再考慮）
```

---

## 7. OpenSpec 文件量問題：薄 spec + 厚 gate 才是業界收斂方向

### 7.1 四個參考系統的 spec 厚度比較

| 系統 | Spec 層 | Gate / Harness 層 | 文件量 |
|---|---|---|---|
| **四模型實驗** | 10 個 Problem Frames（可執行約束） | Gate suite 直接驗結構 | 極薄——spec 本身就是 gate 的輸入 |
| **Playbook** | intent.md → spec.md → plan.md | Hooks + CI evals + PR review | 薄——intent.md 範例只有十幾行 |
| **Stripe Minions** | Slack emoji 一句話 | Blueprint（確定性節點 + Agent 節點交替）+ CI 最多修 2 輪 | **零文件** |
| **Spotify Honk** | 自然語言描述（Git 版控的 prompt） | Verification loop + formatter/linter/build/test | 一段文字 |
| **Coinbase Cloudbot** | Slack 一句話 | Agent council 交叉審 + auto-merge | **零文件** |
| **daodao OpenSpec** | proposal.md + design.md + tasks.md | dev-task 五階段 + 多層 gate | **中位數 ~400 行，最大 1517 行** |

Stripe 的原話：**"The walls matter more than the model"**——護牆（harness）比模型重要。但這裡可以延伸：**護牆也比文件重要。**

四個參考系統都把品質保證的責任放在 gate/harness 上，不是放在 spec 文件上。daodao 的 OpenSpec 反過來——design.md 寫到 SQL 欄位型別、Zod schema、API contract，是因為**怕 agent 做錯所以先寫好答案**。但 Stripe/Spotify 的做法是：不寫答案，讓 agent 自己決定，用 gate 來抓錯。

### 7.2 OpenSpec 為什麼會膨脹

回溯 OpenSpec 的設計動機：daodao 是一人團隊，沒有 PM、沒有 tech lead review、沒有 QA。OpenSpec 三件套同時扮演了這些角色的產出——proposal 是 PM 的需求文件、design 是 tech lead 的設計決策、tasks 是 PM 的驗收標準。

膨脹的根因是：**文件在補償 gate 的不足。**

- design.md 寫 SQL 欄位型別 → 因為沒有 gate 驗「欄位型別是否合理」
- design.md 寫 Zod schema → 因為沒有 gate 驗「validation 是否完整」
- tasks.md 每個 task 寫 AC → 因為 Phase 4 spec auditor 只看 AC，不看 code 結構

如果 gate 夠強，這些東西不用先寫好——agent 做了之後 gate 會告訴它對不對。

### 7.3 結論：OpenSpec 從三件套變成一件

逐件拆解每份文件的存廢理由：

#### proposal.md → 合併進 issue body，不再獨立存檔

proposal 做的是「FRD 要什麼 vs code 現在有什麼」的缺口分析。這個工作有價值，但：
- dev-task Phase 1 本來就會讀 issue + FRD + grep code 做同樣的事
- Stripe/Spotify 讓 agent 在執行時自己做分析，不預先寫文件
- 預先寫的好處是「分析結果被 review 過，錯了可以在動手前修正」——但 daodao 是一人團隊，review 的人就是自己

**處置**：關鍵的缺口發現和產品決策寫進 issue body（gh-card 開卡時帶入），不再開獨立的 proposal.md。agent 在 Phase 1 自己做完整的 code 實查。

#### design.md → 只留產品決策，砍掉實作細節

design.md 裡混了三種內容：

| 類型 | 範例 | Gate 能驗嗎？ |
|---|---|---|
| **產品決策** | 「付費→強制外部報名」「翻案 spaces 閒置決策」 | **不能**——業務規則，不是從 code 推導得出 |
| **實作約束** | 「封存場次跟寫 deleted_at 要同一交易」「草稿建立時即加密」「join info 不含 meetingUrl」 | **不能**——transaction boundary、加密、資訊曝露邊界，gate 無法自動驗證 |
| **實作細節** | SQL DDL、Zod schema、完整 API contract | **能**——typecheck、schema drift、integration test |

實作細節佔了 design.md 80%+ 的行數，但 gate 能驗。產品決策和實作約束加起來只佔 ~20%，但 gate 都抓不到。

**處置**：design.md 改名 `decisions.md`，只寫產品決策和實作約束，砍掉所有實作細節。

#### tasks.md → 砍掉，由 dev-task Phase 1 的 task.md 取代

dev-task Phase 1 已經會從 issue + FRD 建 task.md manifest（含 phases、驗收契約）。tasks.md 和 task.md 是重複的——一個在 OpenSpec 裡，一個在 worktree 裡。

**處置**：砍掉。dev-task Phase 1 從 issue + FRD + decisions.md 自己拆 phase 和 AC。

#### 最終形態：一份 decisions.md（~50-80 行）

```
之前：proposal.md + design.md + tasks.md（中位數 ~400 行，最大 1517 行）
之後：decisions.md（~50-80 行）
```

`decisions.md` 寫四件事：

```markdown
# Decisions: <slug>

> <issue 連結> | <FRD 連結>

## Why
<問題陳述，5-10 行>

## Product Decisions
### D1：收費連動規則
付費 → signupMethod 強制 external；免費 → 清 feeAmount 和 externalSignupUrl。
理由：FRD FR-BS-04 要求，且避免使用者設了付費又選站內報名造成矛盾。

### D2：區塊系統掛 cohort
翻案 2026-09-02「spaces 閒置」決策，因為 FRD 要求區塊功能。

### D3：隱私連動
isPrivate=false → checkinDefaultPrivate 和 commentDefaultPrivate 強制 false。

## Implementation Constraints
<!-- Gate 驗不到、但做錯會造成資料損壞或安全問題的實作約束 -->
- D9 封存：場次 archived + program deleted_at 必須在同一 transaction（非原子會造成孤兒場次）
- D11 曝露邊界：join info 不得回傳 meetingUrl（僅 member home 可見）
- 加密：future letter 草稿建立時即套用 authenticated encryption，不得延遲到排程
- tagline 長度限制 80 字：migration 用 CHECK constraint 強制，不只靠 Zod

## Non-Goals
- 不做金流
- 不引入逐則打卡隱私軸（另案）
```

不再寫：缺口對照表、SQL DDL、Zod schema、API contract、分 Phase 計畫、工時預估、驗收條件細節。

**以 `cohort-setup-panel` 為例**：proposal 110 行 + design 413 行 + tasks 187 行 = 710 行 → decisions.md ~60 行。減少 91%。

### 7.4 前提：gate 要先補到位（經實際驗證）

砍文件的前提是 gate 能接住被砍掉的內容。**實際檢查後發現，四個計畫 gate 的能力比預期弱：**

| Gate | 計畫接住什麼 | 實際驗證結果 | 要做什麼 |
|---|---|---|---|
| schema drift | SQL 欄位型別 | ⚠️ `check_schema_sync.py` **只驗表/欄位存在和 CHECK 值域，不驗欄位型別、nullability、default** | 接進 Phase 2 自動跑（現有能力）；產品決策的長度限制（如 tagline ≤80）用 CHECK constraint 編碼到 DB，讓 sync 腳本能抓 |
| OpenAPI diff | API contract | ⚠️ 只能看「有沒有變」，**無法判斷「對不對」或「有沒有漏」**——沒有參考 spec 就沒有比對基準 | 接進 Phase 2 當 smoke signal；完整性靠 response schema 測試補 |
| response schema 測試 | Zod schema | ❌ **完全不存在。** 103 個 test 只做 field 抽查（`response.body.data.title`），沒有任何一個用 Zod parse 驗完整 response shape | **這是最大的缺口**——必須在砍 design.md 之前補上，否則 agent 回傳錯的 field name/型別沒人抓 |
| spec auditor 接 decisions.md | 產品決策 + 實作約束 | Phase 4 auditor 只看 AC | prompt 加兩份輸入：decisions.md 的 Product Decisions + Implementation Constraints |

另外，`review-evals.yml` 不是 Playbook L9 的 CI Evals——它是 review 接受率統計（週報），不做 agent 行為回歸測試。CI Evals 要從零建。

#### Gate 接不住的五個漏洞

即使四個 gate 全部補到位，以下內容仍然沒有自動 gate 能驗，必須留在 decisions.md 的 `## Implementation Constraints`：

| 漏洞 | 嚴重度 | 為什麼 gate 抓不到 | 處置 |
|---|---|---|---|
| **Transaction boundary** | 高 | integration test 驗結果正確性，不驗原子性（concurrent write 下才會壞） | 寫進 decisions.md + spec auditor 比對 |
| **加密/安全 pattern** | 高 | integration test mock crypto layer | 寫進 decisions.md + security review |
| **資訊曝露邊界**（該回什麼 + 不該回什麼） | 中 | 現有 test 只驗 field 存在，不驗 field 不存在 | 寫進 decisions.md + 補 negative assertion test（`expect(body.meetingUrl).toBeUndefined()`） |
| **正規化邏輯落在哪一層** | 中 | typecheck 不管邏輯放 controller 還是 service | 架構規則加進 code review（§4.3） |
| **子資源 vs 平面欄位選擇** | 低 | schema drift 只驗存在，不驗為什麼用 table 而非 JSONB | 低風險，可不管 |

### 7.5 更新後的優先順序

```
現在就做（改 prompt / 改 skill）
├── #1 REVIEW.md + 架構規則
├── #2 spec auditor 接 decisions.md（Product Decisions + Implementation Constraints）
├── #4 hook 保護 feedback loop
└── schema drift + openapi diff 接進 Phase 2 自動跑

下個 sprint（gate 補強是 OpenSpec 瘦身的前置）
├── #3 集中 business rule
├── ⚠️ response schema 測試（最大缺口——不補這個就不能砍 design.md 的 Zod 細節）
├── #5 invariant 測試
├── negative assertion test（資訊曝露邊界）
└── 產品決策的長度限制改用 DB CHECK constraint（讓 schema drift 能抓）

OpenSpec 瘦身（gate 到位的 repo 先做，分 repo 走）
├── Phase 1: f2e + server（gate 最厚，補完 response schema 測試後即可）
├── Phase 2: storage + ai-backend + admin-ui（各自補完 L4 test 後）
└── infra / worker 不需要 OpenSpec（改動頻率低，code review 足夠）

季度目標
├── #7 CI Evals（從零建，review-evals.yml 是別的東西）
└── #8 PR 自動修正迴圈

長期
├── #9 監控閉環
└── #10 DDD（如果產品複雜度到了再考慮）
```

關鍵順序：**先補 gate，再砍文件。** 反過來做（先砍文件、gate 還沒到位）會讓 agent 的 fix loop 暴增——就像實驗裡 Haiku 在弱 gate 下跑 40 輪一樣。

### 7.6 Gate 四層架構（Agent-Agnostic）

任何 coding agent 的 harness 都可以用四層模型組織 gate。每層的時機和信任邊界不同：

```
┌──────────────────────────────────────────────────────────────────┐
│  Layer 1: Pre/Post-Action Gate（確定性，毫秒級，agent 動作前後） │
│  作用：在 agent 執行檔案寫入、git 操作、shell 命令前後攔截       │
│  觸發：每次 tool call                                            │
│  性質：確定性腳本，exit ≠ 0 就擋下，不依賴 LLM 判斷             │
├──────────────────────────────────────────────────────────────────┤
│  Layer 2: Workflow Gate（流程內嵌，每個 phase 結束時）            │
│  作用：phase 級驗證——改完跑測試、起 dev server 看畫面、diff 檢查 │
│  觸發：開發流程中的 checkpoint（commit 前、phase 完成後）         │
│  性質：可以包含 LLM 判斷（如 spec auditor）+ 確定性檢查          │
├──────────────────────────────────────────────────────────────────┤
│  Layer 3: CI Gate（PR 觸發，分鐘級，跨 session）                 │
│  作用：PR 級驗證——code review、行為回歸測試、merge check          │
│  觸發：PR 建立或更新                                              │
│  性質：獨立於寫 code 的 agent，不同 context                       │
├──────────────────────────────────────────────────────────────────┤
│  Layer 4: Repo Tooling（被上面三層呼叫的基礎設施）               │
│  作用：test suite、linter、schema checker、OpenAPI generator      │
│  觸發：被其他層呼叫                                               │
│  性質：agent-agnostic，任何 coding agent 都能跑                   │
└──────────────────────────────────────────────────────────────────┘
```

#### Agent 實現方式對照

| 層 | 通用概念 | Claude Code | Codex | Cursor / 其他 |
|---|---|---|---|---|
| L1 | Pre/Post-action gate | `.claude/hooks/` PreToolUse / PostToolUse / Stop | Codex sandbox + `codex.md` 裡的 approval 規則 | git hooks（pre-commit / pre-push）+ editor extensions |
| L2 | Workflow gate | `.claude/skills/` 內嵌驗證步驟 | Codex task instruction 裡寫驗證步驟 | `.cursorrules` / Makefile targets / script |
| L3 | CI gate | `.github/workflows/` + `claude -p` | `.github/workflows/` + `codex --quiet` | `.github/workflows/`（agent-agnostic） |
| L4 | Repo tooling | test / lint / schema check | 同左 | 同左 |

**關鍵觀察**：Layer 4（repo tooling）完全 agent-agnostic——test suite 不管是誰跑的。Layer 3（CI）也幾乎 agnostic——workflow 裡呼叫哪個 agent 只是一行指令的差別。真正 agent-specific 的只有 Layer 1 和 Layer 2，但它們做的事情（攔危險操作、流程內嵌驗證）概念上完全通用，只是實現語法不同。

因此，**投資 Layer 4（補測試、補 schema check）的 ROI 最高**——不管之後換什麼 agent 都能用。Layer 1/2 的投資跟著 agent 走，但概念可以帶著換。

#### daodao 具體落點（Claude Code 實現）

```
Layer 1: .claude/hooks/
├── pre-pr-gate.sh        ← 攔 gh pr create
├── stop-quality-gate.sh  ← 每個 phase 結束跑
├── pre-write-guard.sh    ← 檔案寫入前攔截
└── [NEW] test-protection  ← bug fix branch 攔 test 編輯

Layer 2: .claude/skills/
├── dev-task/  ← Phase 2 快篩 + Phase 3 verify
│   ├── [NEW] storage phase 後跑 check_schema_sync.py
│   ├── [NEW] server phase 後跑 openapi:generate + diff
│   └── Phase 4 spec auditor [UPGRADE] 接 decisions.md
├── code-review/ [UPGRADE] 加入架構規則 + REVIEW.md
└── pre-commit-check/

Layer 3: .github/workflows/
├── code-review.yml
├── [NEW] ci-evals.yml ← Playbook L9，從零建
└── [NEW] PR comment 自動修正迴圈

Layer 4: Repo Tooling（agent-agnostic，最高 ROI）
├── server: 103 test files
│   ├── [NEW] response schema assertions（最大缺口）
│   └── [NEW] negative assertions（曝露邊界）
├── server: openapi:generate
├── storage: check_schema_sync.py
└── [NEW] CHECK constraints 編碼產品決策的長度限制
```

所有新 gate 都是在既有四層上加厚，不需要新架構。

### 7.7 各 Repo 的 Gate 覆蓋率（2026-09-13 實查）

「厚 gate」不是 monorepo 層級一句話就成立的——每個 sub-repo 的 gate 基礎設施差異很大：

| Repo | L1 Hooks | L2 Skills | L3 CI review | L3 review-knowledge | L4 Tests | CLAUDE.md | Gate 厚度 |
|---|---|---|---|---|---|---|---|
| **daodao-f2e** | 7 | 9 | ✓ | ✓ | 119 | ✓ | **厚** |
| **daodao-server** | 2 | 17 | ✓ | ✓ | 151 | ✓ | **厚** |
| **daodao-storage** | 7 | 7 | ✓ | ✓ | 0 | ✓ | 中（CI review 有，但零 test） |
| **daodao-ai-backend** | 7 | 7 | ✓ | ✓ | 0 | ✓ | 中（有業務邏輯但零 test） |
| **daodao-infra** | 7 | 2 | ✓ | ✓ | 0 | **✗** | **薄**（無 test、無 CLAUDE.md） |
| **daodao-worker** | **✗** | 4 | ✓ | **✗** | 3 | ✓ | **薄**（無 hooks、無誤判知識庫） |
| **daodao-admin-ui** | 7 | 7 | ✓ | ✓ | 1 | ✓ | 中（hooks 有，test 幾乎沒有） |

**一致的**：所有 7 個 repo 都有 `code-review.yml`（L3 CI review）——這是唯一全覆蓋的 gate。

**不一致的（gate 真空地帶）**：
- **storage / ai-backend / infra / admin-ui 的 L4 幾乎為零**：沒有 test suite，Layer 2 的 workflow gate 呼叫不到任何 repo tooling
- **worker 缺 L1 hooks + review-knowledge**：agent 可以不受攔截地寫任何檔案，review 誤判也不會被記錄
- **infra 缺 CLAUDE.md**：agent 拿不到這個 repo 的慣例，只靠 monorepo 根的 CLAUDE.md

#### 對 OpenSpec 瘦身的影響

**不能一刀切全部 repo 同時瘦身。** 「先補 gate 再砍文件」必須分 repo 走：

```
可以先瘦身（gate 夠厚）
├── daodao-f2e    — 119 tests + 7 hooks + 9 skills
└── daodao-server — 151 tests + 17 skills（補 response schema 測試後）

補 gate 後才能瘦身
├── daodao-storage     — 需要：L4 migration 驗證測試
├── daodao-ai-backend  — 需要：L4 基本 integration test
└── daodao-admin-ui    — 需要：L4 基本 test

gate 太薄，暫不瘦身（或不需要 OpenSpec）
├── daodao-infra   — config-only，改動走 review 足夠
└── daodao-worker  — 先補 hooks + review-knowledge
```

#### 各 repo 需要補的 gate（優先順序）

| Repo | 最缺什麼 | 要補什麼 | 優先度 |
|---|---|---|---|
| **daodao-server** | L4 response schema 測試 | integration test 加 response shape assertion | **最高**——瘦身的 blocker |
| **daodao-server** | L4 negative assertion | `expect(body.meetingUrl).toBeUndefined()` 類測試 | 高 |
| **daodao-ai-backend** | L4 完全空白 | 至少補 API endpoint 的 smoke test | 中 |
| **daodao-admin-ui** | L4 幾乎空白 | 至少補 build + 關鍵路由 test | 中 |
| **daodao-storage** | L4 無 test（但有 schema-sync-check） | migration idempotency test（套用兩次無錯） | 中 |
| **daodao-worker** | L1 hooks 全缺 | 從 f2e/server 複製 hooks 基礎骨架 | 低（改動頻率低） |
| **daodao-infra** | CLAUDE.md | 補基本的 repo 慣例文件 | 低（config-only） |

其中 **response schema 測試是最關鍵的 blocker**：目前 server 的 151 個 test 沒有任何一個驗完整 response shape。如果砍掉 design.md 的 Zod schema 細節但不補這個 gate，agent 回傳錯的 field name 或多出不該曝露的 field，完全沒有自動化手段能抓到。

---

## 附錄 B：AI-Native SDLC Playbook 系列文章索引

| # | 標題 | SDLC 階段 | daodao 相關度 |
|---|---|---|---|
| L1 | [課程導讀](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-course-guide) | Intro | 全局框架 |
| L2 | [intent.md](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-02-capture-intent) | Plan | 低（OpenSpec proposal.md 已超越） |
| L3 | [需求與設計合併](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-03-requirements-design) | Design | 低（OpenSpec design.md 已超越） |
| L4 | [Plan Mode](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-04-plan-mode) | Build | 中（OpenSpec tasks.md 已超越 plan.md，但 **缺口 A**：spec auditor 沒有交叉比對 design.md） |
| L5 | [CLAUDE.md](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-05-claude-md) | Build | 低（已做到） |
| L6 | [Skills](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-06-skills) | Build | 低（已超越） |
| L7 | [平行 Session](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-07-parallel-sessions) | Build | 低（已超越） |
| L8 | [Feedback Loop](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-08-feedback-loop) | Test | 中（主體已做，缺 hook 保護） |
| L9 | [CI Evals](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-09-ci-evals) | Test | **高（缺口 B）** |
| L10 | [PR Review](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-10-pr-review) | Deploy | **高（缺口 C）** |
| L11 | [Hooks](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-11-hooks) | Deploy | 低（已做到） |
| L12 | [CI/CD 整合](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-12-ci-cd) | Deploy | 中（部分做到） |
| L13 | [監控閉環](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-13-metrics-loop) | Maintain | 高但需前置 |
| L14 | [總結](https://quidproquo.cc/posts/ai/2026-09-12-ai-native-sdlc-playbook-14-closing) | Closing | 資源清單 |

## 附錄 C：其他參考資料

| 文章 | 與本文的關聯 |
|---|---|
| [從 Stripe 到 Meta：矽谷一線公司如何用 AI Agent 取代鍵盤](https://quidproquo.cc/posts/ai/2026-04-04-internal-ai-coding-agents/) | Stripe Blueprint「確定性 + Agent 節點交替」= 薄 spec + 厚 gate 的生產級實證；CI 修 2 輪上限 = circuit breaker；"The walls matter more than the model" |
| [Agentic Engineering：讓 AI Agent 像真實工程團隊一樣協作](https://quidproquo.cc/posts/ai/2026-04-20-agentic-engineering-intro/) | Worker + Leader 架構的 spec 層只有自然語言 intent，品質由 LangGraph checkpoint + LangSmith trace 保證 |
| [把 AI Agent 接進開發流程：從 SDLC 五大階段看怎麼做](https://quidproquo.cc/posts/ai/2026-04-18-agentic-ai-sdlc-workflow/) | SDLC 五階段全景，daodao 流程的上位框架 |
| [一個人的全端團隊：從 OpenSpec 到自動部署的 AI 驅動開發流程](https://quidproquo.cc/posts/ai/2026-03-27-ai-driven-dev-workflow-openspec-to-deploy/) | OpenSpec 三件套的原始設計文件，§7 的瘦身建議是對這篇的回顧與修正 |
| [模型只是元件，harness 才是系統](https://quidproquo.cc/posts/ai/2026-08-10-model-component-harness-system/) | 「便宜模型不一定便宜」的理論框架——實驗數據是這個論點的定量證據 |
| [小模型能寫程式嗎——能力邊界與 eval 紀律](https://quidproquo.cc/posts/ai/2026-08-25-coding-agent-small-model-coding/) | Haiku 40 輪修補 = 小模型能力邊界的定量案例 |
| [LLM 開發流程全景：瓶頸從寫程式移到驗證程式之後](https://quidproquo.cc/posts/ai/2026-09-03-llm-dev-workflow-landscape/) | 實驗數據印證的核心論點：瓶頸不在生成，在驗證 |
| [Harness Engineering：讓 AI Agent 穩定交付的工程方法論](https://quidproquo.cc/posts/tech/2026-09-05-ai-native-agent-2026-harness-engineering/) | CLAUDE.md + hooks + skills 的實戰設計，daodao harness 的理論基礎 |
