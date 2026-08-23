---
name: gh-card
description: 在 daodaoedu/daodao 建立中央 feature issue 並掛上 org Planning board。Use when user says "開卡"、"開一張卡"、"新增任務"、"開 feature issue"、"記到 board"、"create card"。從對話或報告自動推斷欄位，互動確認後建立。取代已退役的 notion-card。
---

# gh-card

在中央 repo `daodaoedu/daodao` 建立 feature issue，掛上 org Project「Planning」board。

**Board**: https://github.com/orgs/daodaoedu/projects/10（project number `10`，owner `daodaoedu`）

## 常數（board IDs）

| 項目 | 值 |
|------|-----|
| Project ID | `PVT_kwDOBTLl0c4Bgxef` |
| Status field | `PVTSSF_lADOBTLl0c4Bgxefzhfvwto` |
| Status: Todo | `f75ad846` |
| Status: In Progress | `47fc9ee4` |
| Status: Ready for Dev | `c9e0e5d5` |
| Status: Done | `98236657` |

---

## 執行步驟

### Step 1：從 context 推斷欄位

從當前對話、報告、或使用者描述中自動推斷：

- **Title**：feature 名稱（中文為主，跟 board 上既有卡片同風格，如「實踐建立流程優化」）
- **Body**：依 body 模板（見下）
- **Status**：預設 `Todo`（安全；`Ready for Dev` 才會被 Routine A 撿走）
- **Target repo(s)**：提到了哪些 sub-repo → `repo:<name>` label
- **Scope**：根據複雜度估計 → `scope:XS|S|M|L` label
- **Auto mode**：預設 plan-only（不用掛 label）；要全自動開 PR 掛 `auto:auto-pr`；不想被 pipeline 碰掛 `human-driving`

### Step 2：互動確認

展示推斷結果，使用者可直接接受或修改：

```
📋 新增卡片到 Planning board

Title:        {推斷值}
Status:       Todo ← 預設（改 "Ready for Dev" 才會進 pipeline）
Labels:       {scope:M, repo:daodao-f2e, ...}
Auto:         plan-only ← 預設（Ready for Dev 即派工）；auto:auto-pr = 全自動開 PR；human-driving = 退出 pipeline
Body:         {摘要}
```

### Step 3：建立 issue + 掛 board

```bash
# 1. 開中央 issue
gh issue create -R daodaoedu/daodao --title "<title>" --body-file <body.md> \
  --label "scope:M" --label "repo:daodao-f2e"   # 依確認結果

# 2. 掛上 board（回傳 item-id 供第 3 步用）
gh project item-add 10 --owner daodaoedu --url <issue-url> --format json

# 3. 設 Status（非 Todo 時才需要；Todo 可省略，新 item 預設無 Status，建議一律設定）
gh project item-edit --project-id PVT_kwDOBTLl0c4Bgxef --id <item-id> \
  --field-id PVTSSF_lADOBTLl0c4Bgxefzhfvwto --single-select-option-id f75ad846
```

### Step 4：回報

- Issue URL + board 連結
- 若 Status=`Ready for Dev`（且無 `human-driving`）→ 提示「下次 Routine A 執行時（最慢 1 小時）會自動 dispatch 到 sub-repo」
- 若無 spec（issue body 沒有 OpenSpec change 連結、沒有 Acceptance Criteria）→ 提示「Routine A 會標 `needs-spec`，建議先跑 `prd-generation` / `openspec-ff-change` 產 spec」

---

## Body 模板

```markdown
## Description

{功能描述，2-5 句}

## References

- FRD: {Google Docs 連結，若有}
- POC / 設計稿: {連結，若有}
- OpenSpec: `openspec/changes/{slug}/`（若已有 spec，**必填**，Routine A 以此判斷 spec gate）

## Acceptance Criteria

- {條件 1}
- {條件 2}
```

---

## 快速模式

使用者一次給齊資訊（e.g.「開一張 S 卡，修 daodao-f2e 的 XXX，直接 ready for dev + auto-pr」）→ 填好欄位只確認一次。

## 注意

- Status 預設 `Todo`（安全），避免意外觸發 dispatch
- Scope 預設 `M`（保守）
- Auto mode 預設 plan-only；**Ready for Dev 即派工，掛 `human-driving` 的卡 Routine A 永遠不碰**
- 高風險 repo（`daodao-storage`、`daodao-infra`）：建立時提示「此 repo 為高風險，pipeline 強制 plan-only」
- Priority field 目前沒有 options，暫不設定
