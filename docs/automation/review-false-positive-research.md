# AI Code Review 誤判：未解問題的解法調研

> 2026-08-29。接續 [`.github/review-knowledge/README.md`](../../.github/review-knowledge/README.md) 建立的誤判知識庫。
> 知識庫解決了 C／D 類（自承看不到、假設性風險）與「同錯不二犯」；本文整理**它解不了的三個問題**在文獻與開源專案裡的對應解法，以及落地順序。

## 現況數字（2026-08-29，24 筆紀錄）

| 樣態 | 筆數 | 現行對策 | 夠不夠 |
|---|---|---|---|
| A absent-claim（對 diff 外程式碼做「找不到／缺少／未實作」斷言） | 11 | prompt-block 提醒 | **不夠**——結構性問題，reviewer 根本看不到 route／schema |
| C unverifiable（自承無法確認／被截斷） | 3 | filter drop | 夠 |
| D hypothetical（若未來／萬一） | 7 | filter 降 Low | 夠，但關鍵字會漏 |
| B deletion（刪舊碼即回歸） | 2 | prompt-block | 不夠 |
| F misattribution（行號指錯） | 1 | 只記錄 | 可接受 |

外部基準供對照：SWR-Bench（arXiv 2509.01494，1000 PR）現有工具最高 F1 19.4%，**主因是 precision**；AACR-Bench（arXiv 2601.19494）non-agent 方法的 recall 隨所需脈絡層級 diff→file→repo 遞減。我們的 CI reviewer（Workers AI 單次 call、12KB diff）就是典型 non-agent。

## 問題 1：A 類跨檔案否定斷言

### 文獻

- **OpenCodeReview**（Alibaba／南京大學，[arXiv 2608.09290](https://arxiv.org/abs/2608.09290)，開源 [alibaba/open-code-review](https://github.com/alibaba/open-code-review)）
  點名兩個病根：*context locality*（reviewer 只看得到 diff）與 *non-determinism*（給 agent 自由 bash 探索會不穩定又貴）。解法「deterministic engineering for uncertain agents」，在三個點注入確定性：
  1. Rule-Guided Dispatch：規則決定看哪些檔、套哪些準則，不讓 agent 挑
  2. Grounded File Review：一組**有界輸出的 review 專用工具**（設計依據是分析人類 reviewer 在真實 diff 上會去查什麼），檔案級平行 SubAgent，跨檔依賴按需取回
  3. Independent Reflection：見問題 3
  AACR-Bench 上 SEM-F1 比 Claude Code 高 2.17×（25.10% vs 11.57%），token 少 5–15×。
- **AACR-Bench**（[arXiv 2601.19494](https://arxiv.org/html/2601.19494v2)）：agent 方法在 repo 層級表現反而好，但 diff 層級極差（「contextual tunnel vision」）——兩種方法互補，不是取代。
- **cubic.dev**（[The False Positive Problem](https://www.cubic.dev/blog/the-false-positive-problem-why-most-ai-code-reviewers-fail-and-how-cubic-solved-it)）：51% FP 下降來自「先讀 type system、repo 結構、commit history 再評論」。
- **VulnAgent-R2**（[arXiv 2603.13384](https://arxiv.org/html/2603.13384v3)）：安全領域同一結論——跨檔資料流、framework 慣例、runtime guard 是 isolated classifier 誤報的主因；用「evidence-calibrated」累積證據再給分。

### 對我們的做法

1. **Context Pack 補脈絡**（改 `retrieve-context.sh`）：
   - diff 新增／修改的 controller handler → 列出 route 檔上掛的 middleware chain（`authenticate`、`validate(schema)`、`requireRole`…）
   - diff 新增的 DTO 欄位 → 列出對應 zod schema 定義（含 `.optional()`／`.or(literal(''))`）
   - diff 刪除的檔案 → 列出同 PR 新增、且 import 了相同 symbol 的檔案（B 類的替代者）
   這是 OpenCodeReview「grounded tool set」的預算版：我們預先算好塞進去，不給模型工具。
2. **後置查證**（`review-knowledge.cjs verify` 子命令）：finding 命中「找不到／缺少／未實作／missing／no … found」→ 抽 identifier → `git grep` head tree → 存在就 drop 並在 report 標 `verified-absent-claim`。這是 G-Research「treat LLM output as unverified input, validate against source of truth」的直接套用。
3. 遠期：CI reviewer 換成 OpenCodeReview 類 agent（它就是為此設計）。先用 jsonl 的 sample 做 eval 再決定。

## 問題 2：記錄靠人

### 文獻

- **CodeRabbit Learnings**（[docs](https://docs.coderabbit.ai/knowledge-base/learnings)）：作者在 PR 上回一句話，系統自動存成 self-instructive text＋metadata（PR、檔案、作者），之後 review 自動套用。與我們的 `/fp` 同構，差別是**零額外動作**——回覆本身就是紀錄。
- **Is Agentic Code Review Helpful?**（[arXiv 2607.03316](https://arxiv.org/pdf/2607.03316v1)，10,191 PR、31,073 對 CodeRabbit review／開發者回饋）：36.4% 接受、7.3% 討論、**56.3% 拒絕**；拒絕主因是 FP、重複、超出範圍、與意圖不符。用「開發者顯性回饋」當有效性指標——證明從 PR 回覆挖資料可行且有代表性。
- **G-Research**（[Building a code review tool](https://www.gresearch.com/news/building-a-code-review-tool-the-llm-patterns-that-actually-work/)）：FP 案例直接餵第二段 prompt；每條 finding 對照 rules index 驗證，模型「可以建議，不能定義」。

### 對我們的做法

- `/fp` 收割不等 `collect-pr-feedback`：接進 `review-evals.yml` 週跑，或加 `issue_comment` 觸發的小 workflow 直接 `record --source ci`。
- 更省力的來源：bot 留言上的 **👎 reaction** 就算一票；週報把 👎 的列拉出來讓人補樣態。
- 每筆只要求「一句為什麼」，六個欄位由腳本從 PR／表格推導——CodeRabbit 的教訓是格式越簡單記錄越多。

## 問題 3：關鍵字過濾脆弱

### 文獻

- **G-Research 兩段式**：單次 review 八條裡兩三條 FP → 加第二次 LLM call，把 findings＋FP 範例丟回去問「哪些是真的」。「拆開 recall 與 precision 比一個複雜 prompt 有效」，第二段可用便宜模型。Lineman 的 [CI/CD routing patterns](https://lineman.io/news/cd-review-routing-patterns-for-lower-llm-spend) 把它列為標準 pattern。
- **OpenCodeReview Independent Reflection**：falsification-first，且**反思者只看 diff、看不到 agent 的探索結果**（asymmetric information boundary），避免 self-critique 的 self-reinforcing bias。
- **Chain-of-Verification**（Meta，[arXiv 2309.11495](https://arxiv.org/abs/2309.11495)）：驗證問題要**獨立於草稿**回答。hidekazu-konishi 的[整理](https://hidekazu-konishi.com/entry/llm_output_verification_patterns.html)一句話總結：「看得到草稿的驗證步驟傾向背書草稿」。
- **Refute-or-Promote**（[arXiv 2604.19049](https://www.emergentmind.com/papers/2604.19049)）：安全領域極端版——對抗式 kill-mandate agent、跨模型家族 critic、冷啟動 reviewer、**強制實證閘門**。31 天 171 個候選 79% 在揭露前被自己殺掉；留下一個 80+ agent 一致同意卻是假的 OpenSSL Bleichenbacher 案例——**共識不等於正確**，只有實證能殺。
- **Are LLMs Reliable Code Reviewers?**（[arXiv 2603.00539](https://arxiv.org/html/2603.00539)）：LLM judge 有 systematic overcorrection；提出 Fix-guided Verification Filter——judge 說有 bug 就把它建議的 fix 真的跑測試，跑不過就否決。
- **Multi-Review 聚合**（SWR-Bench）：同模型跑 n 次取交集，F1 +43.67%，n=5–10 飽和；「只出現在一次 pass 的 finding 是噪音候選」。

### 對我們的做法

- 保留關鍵字過濾當第一層（零成本、確定性），**加第二層 precision pass**：另一次 Workers AI call，輸入＝diff＋findings 表格＋知識庫 known-FP 範例，輸出＝每列 keep/drop＋理由；**不給它第一段的推理文字**，只給結論。
- 本機四引擎已天然跨模型家族，步驟 7–8 改 Refute-or-Promote 式：單引擎獨報的 High 交另一家族引擎專門**反駁**，而不是「請使用者確認」。
- 判準是**證據**（path:line 存不存在、測試過不過），不是票數——今天 D 類 storage migration 假設風險 OMP 與 CI 都報，兩模型同意仍是誤判。

## 落地順序

| 步 | 做什麼 | 依據 | 成本 | 狀態 |
|---|---|---|---|---|
| 1 | Context Pack 補 route middleware／schema／刪檔替代者 | OpenCodeReview grounded tools、cubic | 改 `retrieve-context.sh`，一張卡 | [#168](https://github.com/daodaoedu/daodao/issues/168) Todo |
| 2 | `review-knowledge.cjs verify`：「找不到 X」類 finding 後置 grep | G-Research validate-against-source-of-truth | 半天 | [#169](https://github.com/daodaoedu/daodao/issues/169) Todo |
| 3 | 第二段 precision pass（另一次 call，看不到第一段推理） | G-Research 兩段式、OpenCodeReview Independent Reflection、CoVe | 改 workflow，一張卡；先用 jsonl sample 當 eval | 待開卡 |
| 4 | 👎／`/fp` 自動收割進 `review-evals.ts` 週報，加樣態比例 | CodeRabbit Learnings、arXiv 2607.03316 | 半天 | 待開卡 |
| 5 | 本機四引擎改對抗式：單引擎 High 交跨家族引擎反駁 | Refute-or-Promote | 改 skill 步驟 7–8 | 待開卡 |

## 衡量

- jsonl 累積到 ~50 筆後，用 [withmartian/code-review-benchmark](https://github.com/withmartian/code-review-benchmark) 的作法（golden comments＋LLM judge 算 precision／recall）對自己的 pipeline 做前後對照；每一步改動要有數字。
- G-Research 的門檻可直接借：MUST 級 recall 100%、無 FP、整體 precision > 85%；新模型要過同一套 fixture 才能換。
- `docs/automation/evals.md` 的「免費 reviewer 模型同場評測」待辦，現在有 fixture 了（jsonl 的 sample 就是 decoy 集），可以動。

## 其他參考

- [diffray: LLM Hallucinations in AI Code Review](https://diffray.ai/blog/llm-hallucinations-code-review/)——分層防禦（static analysis → RAG → 結構化輸出 → 驗證層 → 確定性 guardrail）的綜述
- [Zylos: Multi-Model AI Code Review](https://zylos.ai/research/2026-03-01-multi-model-ai-code-review-convergence/)——十條設計原則，特別是「measure resolution rate, not comment volume」與「filter findings by cross-pass consistency」
- [Survey of Code Review Benchmarks](https://arxiv.org/abs/2602.13377)、[Mitigating Agreeableness Bias in LLM Judge](https://arxiv.org/abs/2510.11822)
