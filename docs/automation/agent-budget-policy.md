# Claude Code、Codex 與 Workers AI 額度分配政策

> 2026-09-12；Draft。這是待實作的 admission／budget policy，未讀取個人帳號餘額，也未變更付費設定。
> 搭配[共用開發與驗收流程](issue-to-acceptance-workflow.md)及[雙訂閱 v2](dual-subscription-development-workflow.md)。

已確認的方案：**Claude Max US$100、Codex Pro、Cloudflare Workers Paid**（使用者提供）。Codex Pro 的帳號實際用量 window／倍率與目前剩餘量仍以 dashboard 為準，不根據方案名稱推算每日可跑張數。Cloudflare Paid 已啟用，因此工程 limiter 必須自行阻止超出政策預算的呼叫；不假設平台會在免費量耗盡自動停止。

## 1. 分工：把額度花在需要判斷的地方

| 工作 | 預設執行者 | 額度原則 |
|---|---|---|
| 缺欄位、labels、路由、locks、狀態、Issue 回寫 | deterministic scripts | 不呼叫模型；狀態取 manifest |
| 需求摘要、repo 分類建議、AC 初稿、翻譯草稿 | Workers AI | 短輸入、固定 JSON、非權威草稿；規格仍由人核准 |
| 明確功能、bug、測試與局部重構 | Claude Code 或 Codex 其中一個 writer | 不讓兩者同時各做一版相同功能 |
| 架構、跨 repo 契約、難查的 bug | 指派 provider 的高能力模型 | 只在任務風險需要時使用，不整輪強制最高 effort |
| 獨立實作 review | 另一 provider | 每個受驗版本一次；必要修復後 review 新完整 diff |
| Workers AI PR review | advisory／pilot 抽樣 | 不成為第三輪必跑深度 review，不取代 verified reviewer |
| lint、翻譯 key、migration、API、截圖、POC 尺寸 | scripts / tests / browser runner | 不用 LLM 判斷能確定計算的規則 |
| Google 報告與 Issue 完成摘要 | template renderer | 從 evidence JSON 填入；不可讓模型重新編造結果 |

初期維持 v2 的可行任務奇偶分流；只在兩 provider 都有可用餘額且滿足 repo 限制時派工。pilot 後根據「每張被接受成果的用量、退回與 regression」調整分流，避免僅憑品牌印象認定某模型永遠適合 UI 或 backend。

Workers AI 的分類只是建議，不能改 allowed paths、核准 migration、簽收 AC 或生成成功狀態。機密需求只經已核准的 provider 路徑傳輸，去敏後才加入摘要輸入。

## 2. 訂閱額度如何保留

Claude `/usage` 顯示方案使用情況；其 session 美元估算不是 Pro／Max 訂閱帳單。Codex `/status` 或 usage dashboard 用來查當前方案限制；本機與雲端共用 allowance，本機 review 計入一般用量，GitHub 原生 Code Review 有其使用分類。[Claude usage](https://code.claude.com/docs/en/costs)、[Codex pricing](https://developers.openai.com/codex/pricing)

因此不能把「CLI token × API 價格」當作剩餘訂閱額度，也不能把本機和 runner 各預留 100%。不假設每張 Issue 固定耗幾則訊息。

### 建議起始水位（專案政策，非官方額度）

以 provider 回報的每個適用 window 分別計算，短週期、週額度、模型專屬限制任一不足都不接新任務：

- 保留至少 **40%** 方案 window 容量給本機人工開發、驗收修正與緊急處理。
- 為自動任務的後續 review／唯一 repair 保留 **20%**；新 writer 的可用預算最多 **40%**。
- 本機實際使用也扣同一帳號用量；這些百分比是排程保留目標，不能在供應商帳號建立硬分區。
- 已知剩餘不足 40% 時停止接新 auto writer；不足 20% 時停止非必要模型工作，保存狀態、回寫 Issue，由人決定等 reset 或接手。
- Pilot 同時最多一張 auto feature，兩 provider 各一個 invocation；本機同帳號開始大量工作時暫停新派工。

啟動前同時檢查 writer 與 reviewer 的可用性，避免 writer 做完才發現另一個額度已用盡。任務中途不自動互換 writer；依 v2 進 handoff。新一輪改 provider 要記新 run／角色與重新驗證。

### 觀測缺失的處理

不預設個人方案提供正式可呼叫的剩餘百分比 API。以可用的官方 usage/status、reset timestamp 或人工填寫快照為來源，記 `observedAt` 與 `source`；tokens 只能做相對消耗分析。

快照超過 15 分鐘（起始預設）或來源不可用則 quota=`unknown`，不可冒充 0% 或 100%。全自動新任務排隊；人工 pilot 可由人明確啟動一張受 wall-time/repair 上限限制的任務。不要為了讀 quota 反覆發模型測試 prompt，也不抓取未公開 OAuth endpoint。

每個任務開始／結束記錄各 provider 的 usage window、reset、觀測來源與時間；若無精準數值，明寫 unknown。發生 rate limit 時直接採供應商回報 reset，狀態同步不呼叫 LLM。

## 3. Workers AI 的免費池與開發預算

截至查核日，Workers AI 官方列每天免費 **10,000 Neurons**，於 **00:00 UTC（台灣 08:00）**重置；Workers Paid 超出免費池為 **US$0.011 / 1,000 Neurons**，部分模型要求付費方式。以帳號 dashboard 與當下價目為準，不把每個 repo／workflow 當成獨立免費池。[Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

先查核自動化與正式產品是否用同一 Cloudflare account。若共用，產品優先；不能把所有 10,000 都交給 code review。

建議 pilot 配額（內部限制，非平台保證）：

| 用途 | 每日上限／保留 | 說明 |
|---|---:|---|
| 工程自動化所有 repos 合計 | 2,000 Neurons | 初始硬上限，根據一週實測調整 |
| 其中 intake / 規格草稿 | 600 Neurons | 模板與規則已能處理時不用模型 |
| 其中 advisory review / 摘要 | 1,000 Neurons | 同一版本去重，短 context |
| 其中失敗／格式修復預備 | 400 Neurons | 不是每次都自動花完 |
| 其餘免費池 | 8,000 Neurons | 留給產品與安全餘裕；不是獨立保證池 |

實際 admission 必須同時符合 engineering sub-budget 與全帳號免費池。先原子保留預估上界再送 request，完成後結算；併發不得各自看到同一餘額而一起超支。非工程服務若不經同一 limiter，無法保證整個帳號不超額，需帳號級觀測與額外餘裕。

預設不自動啟用 extra usage、credits、自動加值或 API fallback；若帳號已有付費／credits，要先確認能否限制自動化使用，不能只靠 prompt 宣告不收費。Workers Paid 不一定在免費量用完自動停，必須實作自己的 cap。

### 用目前模型估算，而非用 request 次數猜

現有 `.github/workflows/code-review.yml` 主模型為 `@cf/google/gemma-4-26b-a4b-it`，備援為 `@cf/openai/gpt-oss-120b`，輸出上限 1,800 tokens。官方目前每百萬 input/output token 的 Neurons 分別為 9,091/27,273 與 31,818/68,182。[模型費率](https://developers.cloudflare.com/workers-ai/platform/pricing/)

假設**實際計費 input 6,000、output 1,000 tokens**，且不計其他呼叫：

```text
Gemma 約 6,000 × 9,091 / 1,000,000 + 1,000 × 27,273 / 1,000,000 = 81.82 Neurons
gpt-oss-120b 約 6,000 × 31,818 / 1,000,000 + 1,000 × 68,182 / 1,000,000 = 259.09 Neurons
主模型後再叫備援：約 340.91 Neurons
```

這是情境計算，不是實測，也不是每次 review 固定費用。2,000 的工程池在此條件下約容納 24 次主模型呼叫，若每次都用備援則只約 5 組，還沒扣 intake 或其他預算；因此不能「便宜模型先試、失敗一律丟最大模型」。

改為：輸入／輸出 cap → 預算 reservation → 一次主模型 → 有餘額且屬可恢復錯誤才一次重試／allowlisted fallback。quota、auth、權限錯誤直接停止；格式與傳輸重試共用上限，不疊加成多層 retry。超大 diff 不靜默截斷後宣稱已 review；縮小任務或交正式 reviewer。

前 10 張私有 pilot 可保留 Workers AI advisory 作對照，仍受 2,000 cap；之後只有風險需要或約 20% 抽樣啟用，並在 Issue 標 `advisory skipped: budget`。它的缺席不冒充 required review 成功。

## 4. 控制上下文與重跑浪費

1. 先用 `rg`、AST、tests、schema validator 找範圍，只傳受影響檔案與必要 caller/context；沿用現有 `retrieve-context.sh`。
2. 同一 writer 工作保持同一任務 context，階段摘要落 `task.md`；跨任務不要沿用巨大歷史。reviewer 另開乾淨上下文，只收完整相關 diff、AC 與證據。
3. 一般任務先用帳號可用的日常模型與適中推理強度；升級需記錄具體原因，最高模型／fast mode 不作預設。模型 allowlist 在 pilot 按實際帳號可用性設定。
4. 圖片以截圖與並排工具產生；視覺判讀只讀相關圖，不用 image generation 製造驗收證據。
5. 格式修復、Google 文件排版、Issue 進度、CI 等待與 polling 不占訂閱推理。
6. Deterministic cache key：repo visibility + base/head SHA + spec/POC digest + profile/prompt/model version。驗證失敗不可快取成 pass；資料敏感性與存取權也納入 cache 隔離。
7. 新 commit 合併觸發做 debounce；取消被新版取代且尚未開始的 advisory run。required 驗證依 acceptance key 重新判定，不為省量沿用過期 approval。
8. 子 agent 只用於互不重複的工作，回傳檔案與短摘要；其用量計入同一 run，不當免費平行資源。額度 pilot 預設不開額外 writer swarm。

省量不得跳過真實 API、POC、migration、翻譯契約與人工驗收。應先減少重複模型工作，再調整模型深度。

## 5. 每張 Issue 的 budget 欄位

目標 run manifest 增加以下資訊（schema 待實作）：

```yaml
budget:
  policyVersion: 1
  billingMode: subscription-plus-workers-ai-free-budget
  quotaObservedAt: null
  quotaSource: unknown
  providerWindows: []  # provider/window/remainingPercent/resetAt/source/observedAt
  workersAiDailyLimitNeurons: 2000
  workersAiReservedNeurons: 0
  workersAiEstimatedNeurons: 0
  workersAiActualNeurons: null  # 未能觀測不得填 0
  modelInvocations: []  # provider/model/stage/tokens(if known)/duration/retry
  autoRepairLimit: 1
  autoRepairUsed: 0
  writerWallTimeLimitMinutes: 45
  reviewerWallTimeLimitMinutes: 15
  paidFallbackAllowed: false
  stopReason: null
```

45/15 分鐘是 XS/S pilot 的待校準起始值，驗證 runner 另有命令 timeout。時間限制不代表精準 token 或費用上限；writer 到限保存 patch 與未完成項目，不能把半成品推成完成。

Issue 摘要顯示「使用哪些 provider、是否遇到額度限制、Workers AI 已知／估算用量、下一次可排程時間」。不要公開個人完整帳號活動或憑證。

## 6. 導入與政策驗收

- 與共用流程 Phase 1 同時記 usage；Phase 2 在 router 前加 budget reservation；Phase 3 接 quota preflight；Phase 4 根據 10 張任務調整比例。
- 7 天看一次每張被接受成果的用量、重做次數、review 退回率、advisory 命中率、等待時間及本機被額度中斷的次數；不以「三個額度都花完」當成功指標。
- Given 未知／過期 quota，Then 自動新任務不啟動。
- Given provider 只剩人工保留水位，Then router 排隊，狀態回寫不耗模型。
- Given 多 repo 同時保留 Workers AI 預算，Then 總額不能超過 daily cap。
- Given 任務達 retry/wall-time cap，Then 保存成果、回寫 blocked，不新增隱藏重試。
- Given Workers AI advisory 跳過，Then required cross-provider/human review 仍必完成。
- Given 有付費 credits 或 API key 環境，Then preflight 證明所選模式符合政策，無法確認時不能宣稱 subscription-only／零額外費用。

仍需 pilot 查核：兩個訂閱帳號的實際 window／reset 與使用速度、Cloudflare 是否與產品共用 account、平日人工開發需求。使用者已確認 Max US$100／Codex Pro／Workers Paid；目前採以上排程，不估算每週保證可完成幾張 Issue。
