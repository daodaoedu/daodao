# Spec Drafter spike — Actions + Workers AI 自動起草最小 OpenSpec

> 2026-08-29。驗證「S 卡缺 OpenSpec 時，能否用現有 Actions + Workers AI 自動補一份過得了 Routine A spec gate 的最小 spec」。
> Workflow：[`.github/workflows/spec-drafter-spike.yml`](../../.github/workflows/spec-drafter-spike.yml)（`workflow_dispatch`，只出 artifact 與 job summary，不開 PR、不留言）。

## 測試

- 輸入：中央 issue [#169](https://github.com/daodaoedu/daodao/issues/169)（scope:S、只有 Description + References + Acceptance Criteria、無 OpenSpec）
- 脈絡：issue body 提到且存在於 repo 的 9 個檔案（15.8KB，每檔截 6KB）＋一段真實 `tasks.md`／`spec.md` 當格式樣板
- 模型：`@cf/google/gemma-4-26b-a4b-it`，`response_format: json_object`，temperature 0.2
- 成本：prompt 7,434 + completion 1,692 = **9,126 tokens**，單次 call，約 90 秒
- Run：[33229558122](https://github.com/daodaoedu/daodao/actions/runs/33229558122)

## 結果

| 檢查 | 結果 |
|---|---|
| JSON 可解析、四個 artifacts 齊全 | ✅ |
| `tasks.md` 依 `bin/pipeline/lib.ts parseTasksMd` 規則可拆 section、每 section 標題含 repo | ✅ 2 sections／4 tasks，repo=daodao |
| 每個 task 有驗收條件 | ✅ |
| specs 每條 Requirement 含 SHALL、Scenario ≥ Requirement | ✅ 2 specs／3 Requirements／4 Scenarios |
| `proposal` 有 Why／What Changes、寫了「不做什麼」 | ✅ |
| `design` 沒有編造依據不足的決策，待決寫成 OQ | ✅ 2 個 OQ 都是 issue 沒定的（grep 效能、identifier 精準度） |
| 內容忠於 issue、無捏造 | ✅ 逐項對照 issue body，沒有多出來的需求 |
| spec `name` 為 kebab-case | ❌ 用了中文（「verify 子命令實作」），validator 正確擋下 |

品質評價：對 S 卡（issue 已有清楚 AC）的翻譯品質**足以當人類 review 的起點**——design 的決策條列基本是把 issue 的描述結構化，沒有自作主張；tasks 的拆分與驗收條件可以直接進 Routine A。第二個 spec（測試與整合）偏薄，是 issue 本身對測試只寫了一行的緣故。

## 結論

可行。建議正式化為 **Routine A 前置步驟**（scope:M 卡）：

1. 觸發：Routine A 對 `scope:S`／`XS` 卡標 `needs-spec` 時觸發（L/M 仍走人工 OpenSpec，有 OQ 與跨 repo 定案不該由小模型決定）
2. 修正 spike 已知問題：spec name 強制 kebab-case（prompt 補例子 + validator 不合就用 slug 派生）；validator 不合格時重試一次並把錯誤回饋給模型（同 G-Research 的單次 repair）
3. 輸出走 PR 到 monorepo `dev`：`openspec/changes/<slug>/` + issue body 補 `OpenSpec: <slug>` 註記；中央卡留言「spec 草稿 PR #n，review 後 merge 即通過 gate」
4. 人類保留的判斷點只剩「spec PR 對不對」——正是 workflow.md Phase 2.4 的關卡
5. 契約測試：validator 抽成 `bin/pipeline/spec-drafter.ts` 並與 `lib.ts parseTasksMd` 共用；fixture 用本次 #169 的 draft.raw

## 未驗證

- 對 sub-repo 卡（`repo:daodao-server` 等）的表現——脈絡收集目前只讀 monorepo 內的檔案，sub-repo 的 route／schema 要另外 checkout 或用 Context Pack 的作法
- fallback 模型（`@cf/openai/gpt-oss-120b`）的 JSON 穩定性
- 同一張卡多次執行的一致性（temperature 0.2 但未測 n>1）
