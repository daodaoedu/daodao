# task.md 模板

```markdown
# Task <issue#>: <標題>

## 連結
- Issue: <中央或鏡像 issue URL>
- PRD／既有 FRD: <文件連結與來源 ID；沿用現有文件>
- POC / 設計稿: <Figma / Google Drive / prototype branch 連結>
- 產品決策／實作約束: <已確認 decisions.md／既有 design.md 及確認記錄；無另立文件附具體原因>
- Audit pack: <尚未產生或 notes 中同版 pack 位置>

## 來源基準（AI 填寫）
- 已確認需求版本／快照: <版本、digest 或快照位置與確認紀錄>
- 參考分支／POC: <repo、ref、HEAD；mock／未確認行為另列>
- 目標實作基準: <各 repo 的 ref、HEAD、base／merge-base、dirty 狀態>
- 來源變更: <差異與決策紀錄；不覆寫原基準>

## 範圍
- Repos: <daodao-f2e, daodao-server, ...>
- Branch: feat/<slug>
- 隔離模式: worktree | clone
- Port offset: <0 = 預設 port；其他任務同時跑 dev server 時 +10/+20>

## Phases
- [ ] <phase 1 描述>
- [ ] <phase 2 描述>
- [ ] <phase 3 描述>

## 驗收契約
<!-- 沿用已確認來源 FR／TP／AC ID；跨文件以文件 ID 區分。新增產品條件先交審，不自行批准 -->
- [ ] <文件 ID>#TP-01（對應 FR-01）：<已確認的可驗收條件>
  - 驗證方式：<操作／測試與預期結果>
  - 證據：<尚未執行／結果連結>

## AI 自審與交審
- 已檢核：<來源對齊、行為、例外、回歸等適用檢查>
- 已修正：<AI 發現並處理的問題>
- 未驗證限制：<原因、影響、還需的證據；不能當成通過>
- 待人決策：<產品取捨、建議與影響；沒有則寫無>
- 審核結果：<已確認決策與日期；待審不得填為已確認>

## 驗證
<!-- verify 階段填寫，UI 任務必填；格式：狀態 檢查項（截圖檔名） -->
- 驗證報告: <Google 文件連結，verify 步驟 6 產出>
- [ ] <檢查項 1>（evidence/<phase>-<checkpoint>.png）
- [ ] console 無新增 error
- [ ] 行動版寬度版面正常
<!-- 每一項發 PR 前都要打勾；使用者明確放過的寫「（豁免：<原因>）」。不要另開「需要手動驗證」清單——需登入的頁面用 dev-login 驗 -->

### 版面探針
<!-- UI 任務必填：layout-probe.mjs 產出的表整段貼進來（references/browser-verify.md §4a）；全 ✅ 才能發 PR -->
<!-- diff 沒碰任何頁面／版面時刪掉表格，改寫一行：版面探針不適用：<具體原因> -->
| 寬度 | route | 落點 | scrollWidth / viewport | 結果 | 問題 | 截圖 |
|---|---|---|---|---|---|---|

### 核心旅程矩陣
<!-- 每條會寫入資料的旅程至少一列「正常」+ 一列「錯誤路徑」；實際欄要有攔到的 HTTP 狀態碼；規則見 references/journey-matrix.md -->
<!-- 沒有寫入路徑時刪掉表格，改寫一行：核心旅程不適用：<具體原因> -->
| ID | 旅程 | 類型 | 輸入 | FE 規則來源 | BE 規則來源 | 預期結果 | 實際 | 證據 |
|---|---|---|---|---|---|---|---|---|
| J-01 | <建立 X> | 正常 | <實際輸入值，含中文／大寫／空白等真實資料> | <file:line 或 —> | <file:line> | <狀態碼 + 畫面結果> | ⬜ | evidence/verify-j01.png |
| J-02 | <建立 X> | 錯誤路徑 | <server 會拒絕的輸入> | <file:line 或 —> | <file:line> | <狀態碼 + 畫面顯示的訊息，輸入保留> | ⬜ | evidence/verify-j02.png |

## Deferred items
<!-- 本次刻意不做、或驗證中發現但範圍外的項目。發 PR 前每一項都要有子 issue 連結，格式：
     - 驗證紅框取代 toast：#201
     - 模版獨立開始日：（待開卡：需 PM 拍板是否進 Phase B）
     沒有就留 - none -->
- none

## Status
<planning | implementing | verified | in-review | merged>

## PR
- <repo>: <PR URL>（發 PR 後補）

## 備註
<實作中的重要決策、發現的限制、known incomplete scope>
```

## 填寫原則

- **Phases 從已確認的 Issue／PRD／既有 FRD 拆**，一個 phase 是一個可獨立 commit 的邏輯單元
- 相對日期一律轉絕對日期
- 「備註」記的是**接手的人需要知道、但 code 看不出來**的事：為什麼選 A 不選 B、哪些 edge case 刻意不做、依賴哪個還沒 merge 的 PR
- 「核心旅程矩陣」是 verify 的必填產物：⬜ 代表未驗，發 PR 時不能有 ⬜／❌；填法與輸入目錄見 [journey-matrix.md](journey-matrix.md)
- 「Deferred items」不是備忘錄，是**要離開這台機器的東西**：task.md 會被刪，只有開成子 issue 的項目才會回到 board 上
- 每完成一個 phase 立即更新 checkbox——task.md 是斷線重連的唯一依據
