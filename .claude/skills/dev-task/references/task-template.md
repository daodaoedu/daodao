# task.md 模板

```markdown
# Task <issue#>: <標題>

## 連結
- Issue: <中央或鏡像 issue URL>
- FRD: <docs/product/... 路徑，沒有就寫 none>
- POC / 設計稿: <Figma / Google Drive / prototype branch 連結>
- OpenSpec: <openspec/changes/<slug>/，沒有就寫 none>

## 範圍
- Repos: <daodao-f2e, daodao-server, ...>
- Branch: feat/<slug>
- 隔離模式: worktree | clone
- Port offset: <0 = 預設 port；其他任務同時跑 dev server 時 +10/+20>

## Phases
- [ ] <phase 1 描述>
- [ ] <phase 2 描述>
- [ ] <phase 3 描述>

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

- **Phases 從 issue body 或 FRD 拆**，一個 phase 是一個可獨立 commit 的邏輯單元
- 相對日期一律轉絕對日期
- 「備註」記的是**接手的人需要知道、但 code 看不出來**的事：為什麼選 A 不選 B、哪些 edge case 刻意不做、依賴哪個還沒 merge 的 PR
- 每完成一個 phase 立即更新 checkbox——task.md 是斷線重連的唯一依據
