# 島島阿學開發流程圖解

> 註（2026-09-20，#241）：自動派工 Routine A／B 與 merge 回寫 Routine C 皆已退役，board 由 skill 呼叫 `bin/pipeline/board.ts` 回寫；下文提到 Routine A 派工、`dispatch.ts`、雙 gate 之處為歷史規劃，現行以人工 `/dev-task` 為準。

> 註（2026-09-20）：OpenSpec 已退役，下文提及 OpenSpec change／tasks.md 之處已不適用；規格以 docs/product 與 Issue 驗收契約為準。舊 `openspec/` 已封存於 `docs/archive/openspec/`。

> 日期：2026-09-12。定位：以 Mermaid 說明目前成果、目標流程與待實作範圍。
> **規劃與模板已建立，不代表自動化已完成。** 本文依本次對話與工作區盤點整理，未新增 GitHub、runner 或部署驗證。

詳細規則以[共用開發流程](issue-to-acceptance-workflow.md)為準；額度見[分配政策](agent-budget-policy.md)，可複製格式見[模板索引](../../templates/development/README.md)。圖中的狀態是目標語意，不表示 GitHub Board 已有相同欄位。

Issue 欄位、labels、Board 狀態及中央／子卡／PR 關聯統一見 [GitHub Issue 管理規範](github-issue-management.md)，適用一般需求與下方 Bug 流程。

## 1. 現在完成到哪裡？

```mermaid
flowchart TB
    ROOT["島島阿學開發流程"]
    ROOT --> DOC["已建立：文件與本機 skill"]
    ROOT --> OLD["已有部分機制：仍需校準"]
    ROOT --> TODO["待實作與驗證"]

    DOC --> D1["Issue／PR 管理與驗收規劃"]
    DOC --> D2["六份可複用模板"]
    DOC --> D3["gh-card 更新與 Codex 入口"]
    DOC --> D4["三種 AI 服務的額度政策"]

    OLD --> O1["Routine A 派工／Routine C 回寫"]
    OLD --> O2["dev-task 本機工作流程"]
    OLD --> O3["CI、hooks 與 advisory AI review"]

    TODO --> T1["雙訂閱 runner、共用執行器與任務鎖"]
    TODO --> T2["可靠的 Issue 回寫與額度阻擋"]
    TODO --> T3["版本化驗收與 required checks"]
    TODO --> T4["真實任務端到端演練"]

    classDef documented fill:#e8f5e9,stroke:#2e7d32,color:#163c19;
    classDef partial fill:#fff3e0,stroke:#e65100,color:#663300;
    classDef planned fill:#eef2ff,stroke:#4338ca,color:#24205b;
    class DOC,D1,D2,D3,D4 documented;
    class OLD,O1,O2,O3 partial;
    class TODO,T1,T2,T3,T4 planned;
```

「已建立」只表示檔案／skill 存在及已做對應格式檢查，沒有宣稱遠端部署完成。可以依文件人工執行；可靠的全自動閉環仍需下方待辦落地。

## 2. Issue、PR、Google 文件各管什麼？

```mermaid
flowchart TD
    DOC["Google Docs：需求討論與核准內容"] --> SNAP["凍結需求版本／OpenSpec／AC"]
    POC["Drive／設計來源：指定版本 POC"] --> SNAP
    SNAP --> MAIN["中央 Issue：一個使用者目標"]
    MAIN --> BOARD["Planning Board：整體進度"]
    MAIN --> S1["server 子 Issue：後端責任與 AC"]
    MAIN --> S2["f2e 子 Issue：前端責任與 AC"]
    S1 --> PR1["server PR：明確範圍與版本"]
    S2 --> PR2["f2e PR：明確範圍與版本"]
    PR1 --> MAN["同一組受驗版本 manifest"]
    PR2 --> MAN
    MAN --> EVID["Drive：截圖、POC 並排、API 與測試證據"]
    EVID --> REPORT["Google Docs：人可閱讀的驗收報告"]
    REPORT --> MAIN
    MAN --> MAIN
```

- 中央 Issue 管目標與跨 repo 完成度；子 Issue 引用中央 AC，不另訂需求。
- PR 管程式變更與合併證據；單一子 PR 合併不代表中央目標完成。
- Google Docs 供討論／閱讀，執行使用已核准快照；manifest 記錄實際版本與驗證結果。
- 同 repo 的小任務可直接由中央 Issue 關聯 PR，不必為形式多拆一張子卡。

開卡使用 [gh-card](../../.claude/skills/gh-card/SKILL.md)。預設 Todo；「建立 Issue」與「啟動自動開發」是不同操作。

## 3. 完整目標流程：自動與本機共用驗收

```mermaid
flowchart TD
    START["gh-card：建立 Issue，預設 Todo"] --> SPEC{"需求、AC、POC 與規格齊備？"}
    SPEC -->|否| WAIT["回寫缺項、責任人與下一步"]
    WAIT --> SPEC
    SPEC -->|是| MODE{"選擇開發入口"}
    MODE -->|自動| AUTO["授權 Ready for Dev／auto，檢查額度"]
    MODE -->|本機| LOCAL["人工啟動／human-driving"]
    AUTO --> LOCK["共用任務鎖：同一子任務僅一個 writer"]
    LOCAL --> LOCK
    LOCK --> DEV["隔離 worktree／固定規格與 base SHA／實作"]
    DEV --> CHECK["品質、i18n、migration、API 契約檢查"]
    CHECK --> API["本次後端版本：真實 request、回讀、reload、權限案例"]
    API --> UI["適用 UI：瀏覽器截圖、POC 並排與量測"]
    UI --> REVIEW["獨立 code review"]
    REVIEW --> PASS{"必要檢查與 review 通過？"}
    PASS -->|否| REPAIR{"自動修復額度尚可用？"}
    REPAIR -->|是，最多一次| DEV
    REPAIR -->|否或需人工決策| BLOCK["保存成果／回寫阻塞／人工接手"]
    PASS -->|是| PR["依授權發布 Draft PR，CI 重驗目前版本"]
    PR --> REPORT["發布驗收報告／證據／回寫中央與子 Issue"]
    REPORT --> HUMAN{"人工產品驗收通過？"}
    HUMAN -->|退回| FIX["記錄未過 AC／修正並重新驗證"]
    FIX --> DEV
    HUMAN -->|通過| GATE{"目前版本 required checks 與批准齊全？"}
    GATE -->|否或證據過期| FIX
    GATE -->|是| MERGE["人工 merge"]
    MERGE --> DEPLOY["按跨 repo 相依順序部署／smoke"]
    DEPLOY --> DONE{"所有必要 repo 達到 Done 條件？"}
    DONE -->|否| FOLLOW["回寫待部署確認或阻塞／處理後重驗"]
    FOLLOW --> DEPLOY
    DONE -->|是| CLOSE["中央 Issue 完成／Board Done／歸檔與清理"]
```

本圖省略各階段通往阻塞回報的線：登入失效、額度不足、runner 離線、證據上傳失敗均須保存結果並回寫，不能當成功。人工修正可繼續，但不會重設同一自動 run 的修復上限。

私有 repo 的自動流程沿用雙 provider review；本機可採獨立 reviewer session 或人類 reviewer。Codex 訂閱 CI 的公開 repo 限制與 runner 設計見[雙訂閱 v2](dual-subscription-development-workflow.md)，不能把同一自動入口無條件套到所有 repos。

**現況提醒（2026-09-20 更新）：** 自動派工已退役（`dispatch.ts` 已刪除），圖中的雙 gate 與派工屬歷史目標政策；未準備好保持 Todo，人工任務加 `human-driving`。共用任務鎖與上述 required checks 也尚未完整實作。

## 4. Bug 通報與修復流程

Bug／CI 錯誤通報由 [gh-card](../../.claude/skills/gh-card/SKILL.md) 分流至 [file-bug-issue](../../.claude/skills/file-bug-issue/SKILL.md)。開發中可立即處理、且屬於目前任務的錯誤，可在原 Issue／PR 留下重現與修復證據；無法立即修復或需要獨立追蹤時，走 bug 開卡流程。

```mermaid
flowchart TD
    FOUND["發現 bug：使用中／開發／CI／驗收／部署後"] --> INFO["收集錯誤原文、預期與實際行為、重現步驟、環境與版本"]
    INFO --> TRIAGE["判斷影響範圍、責任 repo 與優先順序，查找既有 Issue"]
    TRIAGE --> TRACK{"已有對應 Issue，或可在目前任務立即修復？"}
    TRACK -->|是| EXIST["在原 Issue／PR 記錄 bug 與證據"]
    TRACK -->|否| DRAFT["file-bug-issue：確認目標 repo、整理已嘗試方案與相關檔案、預覽內容"]
    DRAFT --> APPROVE{"使用者確認建立？"}
    APPROVE -->|否| KEEP["保留草稿，依回覆調整"]
    KEEP --> DRAFT
    APPROVE -->|是| ISSUE["建立 bug Issue；納入 Board 時預設 Todo"]
    EXIST --> READY{"重現資訊、修復 AC 與執行所需規格齊備？"}
    ISSUE --> READY
    READY -->|否| NEED["回寫缺項／無法重現原因、責任人與下一步"]
    NEED --> INFO
    READY -->|是| ENTRY["接第 3 節：選擇本機或已授權自動入口，取得任務鎖與隔離 worktree"]
    ENTRY --> RED["先寫會失敗的 regression test，確認重現原 bug"]
    RED --> FIX["修復根因，讓 regression test 通過並檢查受影響情境"]
    FIX --> VERIFY["接第 3 節：品質檢查、適用 API／UI 驗證、獨立 review 與 PR／CI"]
    VERIFY --> ACCEPT{"目前版本通過必要檢查與人工驗收？"}
    ACCEPT -->|否| RETRY["回寫失敗證據；沿用修復額度與人工接手規則"]
    RETRY --> FIX
    ACCEPT -->|是| DEPLOY["人工 merge；依相依順序部署／smoke，重跑原 bug 情境"]
    DEPLOY --> RESOLVED{"指定版本已確認修復且符合 Done 條件？"}
    RESOLVED -->|否| OPEN["保持未完成，回寫阻塞或重新開啟 bug Issue"]
    OPEN --> INFO
    RESOLVED -->|是| CLOSE["回寫修復版本、PR、回歸與驗收證據，關閉 bug Issue／同步關聯卡"]
```

- 重現資料包含發生環境、服務／commit 版本、錯誤訊息與已嘗試方案；移除憑證及個資。暫時無法重現時保留追蹤，不標記為已修復。
- 修復 AC 以原 bug 的預期行為與受影響情境為基準。跨 repo 問題沿用第 2 節的中央／子 Issue 與同組受驗版本；單一 repo 修好不代表整體完成。
- 純 UI layout／CSS 不要求 React unit test，改以可重現操作及修復前後瀏覽器證據驗證；邏輯 bug 依[共用開發流程](issue-to-acceptance-workflow.md)先留下失敗的 regression test，再修復。
- 開 bug 卡不會自動授權開發。自動入口仍須符合第 3 節的規格、額度與派工條件；阻塞任務未解除前不能繼續，人工接手也不重設同一自動 run 的修復上限。
- PR 合併後仍需確認部署與原 bug 情境；沒有部署需求時，依事先定義的替代完成條件驗收。若原 Issue 含其他 AC，修復此 bug 後仍須逐項確認才能關閉原 Issue。

**現況提醒：** 本節串接既有 bug 通報與 regression test 規則，以及第 3 節的目標驗收流程；不代表 bug 分類、派工、回寫或重新開啟 Issue 已自動化。

## 5. 合併前，如何確認驗收證據可信？

```mermaid
flowchart LR
    KEY["驗收版本：spec／POC digest＋各 repo SHA＋後端／schema 版本"]
    KEY --> AC["AC：預期／實際／結果／證據連結"]
    KEY --> CODE["品質與獨立 review 結果"]
    AC --> E1["功能：主要與反面情境"]
    AC --> E2["串接：本次後端＋持久化回讀"]
    AC --> E3["UI：並排截圖＋量測＋差異批准"]
    E1 --> DECIDE{"證據完整且對應目前版本？"}
    E2 --> DECIDE
    E3 --> DECIDE
    CODE --> DECIDE
    DECIDE -->|否| STOP["阻擋：缺失／失敗／未驗／過期"]
    DECIDE -->|是| SIGN["具權限的人驗收並批准指定版本"]
    SIGN --> MERGE["其他 required checks 通過後可人工 merge"]
    CHANGE["新 commit／rebase／規格或 POC 改變"] --> INVALID["舊證據與批准失效"]
    INVALID --> KEY
```

截圖好看不等於後端串接成功，HTTP 200 不等於資料已持久化，測試通過不等於產品已驗收。純後端等不適用項可附理由 N/A；缺少必要證據不能以 N/A 放行。

## 6. 自動完成後，如何回到 Issue 更新？

```mermaid
sequenceDiagram
    participant W as 開發／驗證流程
    participant O as Durable outbox
    participant P as Trusted reporter
    participant D as Drive／Google 報告
    participant G as GitHub Issues／Board
    participant H as 人工驗收者

    W->>O: 保存 run、版本、結果與待回報事件
    O->>P: 發送最新狀態事件
    P->>P: 檢查 run、lease 與事件版本
    P->>D: 上傳去敏證據，產生報告並確認可讀
    alt 報告可讀且 GitHub 更新成功
        P->>G: Upsert 子 Issue 與中央摘要，更新進度
        G-->>P: 回讀 URL、內容與實際狀態
        P->>O: 記錄已同步
        H->>D: 閱讀報告、操作與 POC 差異
        H->>G: 對指定版本批准或退回
    else 上傳或回寫失敗
        P->>O: 保留待補事件，標 report-pending
        Note over O,G: Reconciler 有限退避補送；不同步成功就不進待合併
    end
```

每次更新包含：PR、報告、截圖、API／POC 結果、AC 通過數、未完成事項、阻塞原因與下一步。重試更新同一摘要，舊 run 不得覆蓋新狀態。失敗或部分完成也走回報流程。

這是**待實作的可靠回寫設計**。現有 Routine C 的「子 Issue 全 closed → Done」需改造；中央 Done 應以必要 PR 合併、產品驗收與部署確認為準。沒有部署需求的任務，在契約中先定義替代完成條件。

## 7. AI 額度與導入順序

方案已確認為 Claude Max US$100、Codex Pro、Cloudflare Paid；實際餘額尚未讀取。

| 工作 | 預設分配 |
|---|---|
| 開卡欄位、狀態、檢查、報告排版與回寫 | 腳本／模板，不耗模型推理 |
| 需求分類、摘要與翻譯初稿 | Workers AI，需有人或規則查核 |
| 實作與困難推理 | 一個 Claude Code 或 Codex writer |
| 獨立 review | 另一 provider，或本機人工 reviewer |
| 真實串接、截圖、migration 與翻譯結構檢查 | 測試與瀏覽器工具，模型不代替證據 |

訂閱人工保留水位、Workers AI 工程上限與 quota unknown 處理沿用[額度政策](agent-budget-policy.md)，不在圖解另訂一套數字。

```mermaid
flowchart LR
    P0["0：修基線<br/>CI 假綠／派工條件／權限"] --> P1["1：本機驗收<br/>一張 UI＋API 任務跑通模板與證據"]
    P1 --> P2["2：共用控制<br/>任務鎖／Issue 回寫／額度預算"]
    P2 --> P3["3：私有 repo<br/>手動 dispatch＋雙訂閱＋Draft PR"]
    P3 --> P4["4：自動啟動<br/>Ready 接派工／小型 pilot"]
    P4 --> P5["5：完整閉環<br/>跨 repo 合併阻擋／部署確認／Done"]
```

完成標準是實際跑過成功、驗收退回、額度不足、回報失敗重試與人工接手等路徑，證明版本、狀態與證據一致；不是只有流程圖畫到 Done。
