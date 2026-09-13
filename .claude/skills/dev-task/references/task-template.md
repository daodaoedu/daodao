# task.md 模板

```markdown
# Task <issue#>: <標題>

## 連結
- Issue: <中央或鏡像 issue URL>
- PRD／既有 FRD: <文件連結與來源 ID；沿用現有文件>
- POC / 設計稿: <Figma / Google Drive / prototype branch 連結>
- 產品決策／實作約束: <已確認 decisions.md／既有 design.md 及確認記錄；無另立文件附具體原因>
- Audit pack: <尚未產生或 notes 中同版 pack 位置>
- OpenSpec: <openspec/changes/<slug>/，沒有就寫 none>

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
- [ ] <檢查項 1>（evidence/<phase>-<checkpoint>.png）
- [ ] console 無新增 error
- [ ] 行動版寬度版面正常

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
- 每完成一個 phase 立即更新 checkbox——task.md 是斷線重連的唯一依據
