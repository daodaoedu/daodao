# GitHub Issue 管理規範

> **退役註記（2026-09-20，#241）**：自動派工 Routine A／B 已退役，pipeline 只剩 Routine C（merged PR → Board Done）；OpenSpec 已於 #237 退役。本文已改寫為人工管理現況：`auto`／`auto:*`／`needs-spec`／`dispatched` 等派工 labels 不再使用（保留不刪），`human-driving` 仍是人工開工標記。

> 日期：2026-09-12，2026-09-20 依 #241 更新。適用於一般需求、bug 與跨 repo 任務的人工管理；Routine C 落差另列於本文末。
> 遠端現況依 GitHub CLI 唯讀查詢：中央 repo labels、Planning #10 fields；程式依本機 `bin/pipeline/`。子 repo labels、既有卡片關聯未逐一驗證。本文件不會修改遠端設定。

搭配[共用開發流程](issue-to-acceptance-workflow.md)、[Bug 流程圖](development-workflow-diagrams.md)及[模板索引](../../templates/development/README.md)使用。本文集中定義 Issue 欄位、labels、狀態與關聯；驗收與額度規則沿用共用流程。

## 1. 開在哪裡、填哪些內容

| 工作 | 開卡位置與格式 |
|---|---|
| 使用者目標／跨 repo 需求 | `daodaoedu/daodao` 中央 Issue，使用[中央模板](../../templates/development/central-issue.md)並加入 [Planning #10](https://github.com/orgs/daodaoedu/projects/10) |
| 中央目標的 repo 實作 | 對應子 repo，使用[子任務模板](../../templates/development/subtask-issue.md)，引用中央 AC |
| Bug／CI 錯誤 | 依 [file-bug-issue](../../.claude/skills/file-bug-issue/SKILL.md)確認目標 repo、預覽並依授權發布；跨 repo 才按目標拆中央／子卡 |
| 同 repo 小任務 | 可直接以一張 Issue 關聯 PR，不為形式另拆子卡 |

一般開卡使用 [gh-card](../../.claude/skills/gh-card/SKILL.md)。查找既有相關卡片後再建立，避免重複。開卡預設 Todo；設定 Ready 需有對應授權（Ready 只是管理狀態，不會觸發任何自動化）。

開卡時填目標與範圍、責任 repo／負責人、可驗收 AC、相依任務及 Done 條件。需求缺項填「待確認：原因／責任人／下一步」，執行後才產生的 SHA、run、PR、報告填「尚未開始／尚未產生」。不要為了開卡捏造版本或證據。

Bug 另外填錯誤原文、預期與實際行為、重現步驟、發生環境與版本、相關檔案及已嘗試方案；修復 AC 涵蓋原情境與受影響行為。邏輯 bug 先用失敗的 regression test 重現，再修復；純 UI layout／CSS 以可重現操作和修復前後瀏覽器證據驗證。不放憑證或個資。

Ready 前凍結適用規格／AC 與 POC 基準，確認驗收者及執行授權。L/M 需定稿 PRD，S 可依共用流程使用 AC 快照；body 不再寫 `OpenSpec:` 行。

## 2. Labels：分類、範圍與執行控制

下列 labels 已在中央 repo 查到。發布到子 repo 前仍須查該 repo 的 labels；缺少時依開卡授權建立，不假設各 repo 已同步。

| Label | 設定規則 | 維護者／作用 |
|---|---|---|
| `bug` | Bug／CI 錯誤通報 | 開卡者；工作類型 |
| `enhancement` | 新功能或功能改善 | 開卡者；工作類型 |
| `documentation` | 文件工作；必要時可與 bug 並用 | 開卡者；工作類型 |
| `repo:<子 repo 名稱>` | 中央卡標示涉及 repo，可複選 | 開卡者；board 篩選與人工判斷責任 repo |
| `scope:XS`／`scope:S`／`scope:M`／`scope:L` | 選一個規模；程式未指定時預設 M | 開卡者；不是優先順序 |
| `human-driving` | 本機／人工開發 | 執行者（`/dev-task` start 自動掛）；人工開工標記 |
| `auto`、`auto:plan-only`、`auto:auto-pr` | **不再使用**（Routine A／B 已退役） | label 保留不刪；不要再加到新卡 |
| `needs-spec`、`dispatched` | **不再使用**（原 Routine A 產出） | label 保留不刪；舊卡片仍可能帶有，清理與否不影響流程 |
| `duplicate`／`invalid`／`wontfix` | 重複、無效或決定不處理 | maintainer；附原因與相關 Issue |

`repo:*` 目前包含 server、f2e、ai-backend、storage、admin-ui、infra、mcp、worker 八個 `daodao-` 子 repo，供 board 篩選與人工判斷責任 repo。

中央另有 `manual`、`human-coding` 等 Routine B 時代 labels，同樣不再使用；不要拿它們替代 `human-driving`；本規範不刪除既有 labels。

沒有自動派工後，未準備好的卡保持 Todo 即可；人工任務加 `human-driving` 以便在 board 上辨識。

Priority 是 Board 欄位，與 scope 分開。查詢確認欄位存在，但未列出選項；填寫前查實際可選值。尚無適合選項時先在 body 記錄影響程度、處理順序與理由，不宣稱已有 P0–P3，也不自動新增 priority labels。

## 3. Issue state 與 Board Status

Issue 的 open／closed 和 Board Status 分別設定。下表 Status 名稱已存在於 Planning；進入條件是共用流程的管理規則，現有程式尚未完全落實。

| Board Status | 進入條件 | Issue state |
|---|---|---|
| `Todo` | 已開卡，尚未開始；可保留需求缺項 | open |
| `Ready for Dev` | 規格、AC、責任 repo 與執行授權齊備；管理狀態，不觸發自動化 | open |
| `In Progress` | 已開始實作（`/dev-task` start）；`Need Fix` 開修時也移回這裡 | open |
| `Review` | PR 已開（`/dev-task` finish）；merged 後仍留此欄，直到 post-merge-wrapup 冒煙通過 | open |
| `Need Fix` | post-merge-wrapup 的 dev 冒煙任一 ❌ 或未冒煙：驗收退回、待修 | open |
| `Done` | 全部必要 repo 合併 + dev 冒煙通過（post-merge-wrapup 設定）；無部署需求依事先定義的替代條件 | board 內建「Auto-close issue」workflow 隨 Done 自動 close |

移卡一律用 `pnpm -s tsx bin/pipeline/board.ts set <n> <status>`（六欄 option id 與別名在 `bin/pipeline/types.ts`），`board.ts audit` 定期列出 Status 與 issue／PR／labels 的落差；操作手冊見 [gh-pipeline](../../.claude/skills/gh-pipeline/SKILL.md)。Board 另開著七個 GitHub 內建 workflow（Item added → Todo、Item closed → Done、Auto-close issue、PR linked／merged、Auto-add），但只對**同 repo** closing-keyword 連結的 PR 生效，sub-repo `Refs` 不會觸發，不能依賴它們移卡。

目前沒有獨立的 Blocked、待部署或 Cancelled Status。處理方式如下：

- Todo 的需求缺項留 Todo；已開工後阻塞保留原階段，摘要填 `blocked`、原因、責任人、成果與下一步。禁止受阻任務繼續派工時另依實際 gate／執行控制處理，文字 blocked 本身不會停止 runner。
- Review 階段用摘要區分「待 code review／待人工驗收／待合併／待部署確認」，不要提早 Done。
- 取消、重複或不處理要寫明結案原因，必要時使用對應 label，close 後將卡片從活躍 Board 封存，避免把未交付任務標成 Done；中央相依範圍由驗收者重新確認。
- 已關閉 bug 若原情境仍失敗，重新開啟並回到 Todo（待調查）或 In Progress（已開始修正）；新問題另開卡並引用原卡。同步校正中央卡，不因其他子卡已完成而掩蓋未解問題。

用[狀態摘要模板](../../templates/development/issue-status-comment.md)記錄本次版本、AC 結果、PR、驗收／部署證據、阻塞與下一步；同一摘要持續更新。GitHub 更新後回讀確認。未來 manifest／durable event store 才是自動執行權威，目前人工操作不得捏造 run 或 lease。

## 4. 中央、子 Issue、PR 與相依關係

| 關係 | 必須記錄 | GitHub 操作與限制 |
|---|---|---|
| 中央 → 子 Issue | 中央交付表列 repo、子卡 URL、PR、版本與進度 | 在已授權拆卡範圍建立原生 sub-issue 關係；核對 Board 的 Parent issue／Sub-issues progress |
| 子 Issue → 中央 | 獨立一行 `Parent: daodaoedu/daodao#123`，並引用中央 AC IDs | Routine C（`lib.ts parseParentIssue`）解析此文字反查中央卡；原生父子關係不能代替它 |
| Issue → PR | Issue 交付表與 PR body 雙向記錄 URL、負責 AC、受驗 SHA | 一般參照可供追蹤；不保證自動填入 Linked pull requests 欄位 |
| 子卡 → 相依子卡 | 完整 `owner/repo#N`／URL、阻塞原因、API／schema 前提及部署順序 | 可加原生相依關係輔助，但現有 pipeline 不據此自動排程 |
| Bug → 原功能 | 原需求 Issue、相關 PR 與發生版本 | 只有屬於同一中央交付目標才設 Parent；一般關聯寫參照即可 |

`Parent:` 文字不會自行建立 GitHub 原生 sub-issue 關係。建立後應分別回讀 body 與原生父子關係；本次僅確認 Board 有相關欄位，未證明既有卡片已設定。

子卡相依仍由人確認順序，所有必要 repo 使用同組受驗版本。子卡完成不代表中央完成，中央交付表不能只用第一個 PR 的結果覆蓋整體狀態。

### PR 關聯與關閉時機

使用[PR 模板](../../templates/development/pull-request.md)列中央與子 Issue。需部署後驗證的卡片，預設以一般參照記錄，並在完成驗收後人工 close；避免以 closing keyword 在 merge 時提前結案。若任務契約明定 merge 即滿足全部 Done 條件，才使用自動關閉關聯。中央跨 repo 卡不由單一子 PR 自動關閉。

現有 `board-sync.ts` 透過 `lib.ts` 的 closing-keyword parser 辨識 PR 的同 repo `#N`，一般參照及完整跨 repo ref 不會由該 parser 辨識。因此採部署後關卡時，目前需要人工回寫 Issue／Board；不要為了觸發舊同步而提前關卡。parser 與同步流程的相容性屬待實作項。

## 5. 設定範例

以下號碼皆為示例，不是已建立的 Issue。

| 欄位 | 單一前端 bug，本機修復 | 跨 repo 功能中央卡，先開卡 |
|---|---|---|
| Repo | `daodaoedu/daodao-f2e` | `daodaoedu/daodao` |
| Labels | `bug`、`scope:S`、`human-driving`（先確認子 repo 存在） | `enhancement`、`scope:M`、`repo:daodao-f2e`、`repo:daodao-server` |
| Status | 納入 Planning 時先 Todo，開始修復後 In Progress | Todo |
| 責任 | 指定修復者與驗收者 | 指定目標負責人與各 repo 責任人 |
| 關聯 | Body 引用原功能；若無中央父任務，不填假 Parent | 建立子卡後回填交付表並設定原生父子關係 |
| 完成 | 回歸驗證、review、適用部署確認後 close | 所有必要子交付符合中央 AC 才 Done／close |

子卡 body 的機器辨識行示例（Routine C 反查中央卡用）：

```text
Parent: daodaoedu/daodao#123
```

## 6. 已知自動化落差與落地檢查

| 現況 | 管理方式／待實作 |
|---|---|
| 自動派工（Routine A／B）已退役 | 開卡與拆卡全由人工／`/publish-tasks`；要恢復自動派工需另開卡重新設計 |
| `types.ts` 已含六欄（含 Review／Need Fix）；`board.ts set／audit` 為人工移卡與稽核入口 | dev-task start／finish、post-merge-wrapup、gh-card 各自負責一步（2026-09-20 起）；未跑 skill 就沒人移卡 |
| Routine C 子卡全 closed 即設中央 Done | 只對 `auto` label PR 生效，人工流程幾乎不會觸發；人工核對並校正過早 Done；待改成合併＋驗收＋部署條件 |
| 內建「Pull request merged」workflow 目標欄位未知 | API 讀不到；到 board 設定頁確認為 Review，避免中央 repo PR merge 直接 Done + auto-close |
| `Parent:` 與原生父子關係分開 | 人工建立並回讀兩者；待補一致性檢查 |
| PR parser 只認同 repo closing refs | 部署後關卡流程先人工回寫；待支援一般關聯與延後完成 |
| 可靠回寫、共用任務鎖與完整驗收 gates 仍為目標設計 | 依共用流程分階段落地與演練，文件存在不等於自動化已完成 |

操作前可用下列唯讀命令刷新 labels 與欄位，子 repo 替換實際名稱。寫入時取 live IDs，不從本文複製舊 ID；操作後回讀。

```bash
gh label list --repo daodaoedu/daodao --limit 100 --json name,description
gh project field-list 10 --owner daodaoedu --format json
```
