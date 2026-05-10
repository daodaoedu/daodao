---
name: notion-card
description: 在 daodao 任務 Notion DB 建立新卡片。Use when user says "開 Notion 卡"、"建 notion 單"、"新增任務"、"create notion card"、"開一張卡"、"記到 notion"。從對話或報告自動推斷欄位，互動確認後建立。
---

# notion-card

在 daodao 任務 DB 建立 Notion 卡片，欄位互動確認後送出。

**DB ID**: `3549cc8126978036803af61048468bde`  
**Notion workspace**: daodaolearn

---

## 執行步驟

### Step 1：從 context 推斷欄位

從當前對話、報告、或使用者描述中自動推斷：
- Title（issue / 問題描述的第一行或最簡標題）
- Target Repo（提到了哪個 sub-repo）
- Scope（根據複雜度估計）
- Acceptance Criteria（若有明確的成功條件）

### Step 2：互動確認欄位

依序展示推斷結果，**每個欄位顯示預設值**，使用者可直接 Enter 接受或輸入修改：

```
📋 新增 Notion 卡片

Title:               {推斷值 或 空白}
Status:              Not started  ← 預設（改成 "Ready for Dev" 才會觸發 Routine A sync）
Sync to GitHub:      false ← 預設
Auto Mode:           plan-only ← 預設（保守）
Scope:               M ← 預設
Target Repo:         {推斷值 或 需選擇}
Acceptance Criteria: {推斷值 或 空白}

直接 Enter 接受預設，或輸入修改值。
```

欄位說明與合法值 → 見 `references/fields.md`

### Step 3：確認後建立

展示最終卡片摘要，確認後用 Notion MCP 建立：

```
mcp__claude_ai_Notion__notion-create-pages
```

建立成功後回報：
- Notion 頁面 URL
- 若 `Status=Ready for Dev` 且 `Sync to GitHub=true` → 提示「下次 Routine A 執行時（最慢 1 小時）會自動建立 GitHub issue」
- 若 `Status=Idea` → 提示「需手動改 Status 為 Ready for Dev + 勾選 Sync to GitHub 才會進入 pipeline」

---

## 快速模式

若使用者一次提供所有資訊（e.g., 「開一張 XS 卡，修 daodao-f2e 的 XXX，要 sync 到 GitHub」），直接填入欄位後只確認一次，不逐一詢問。

---

## 注意

- `Status` 預設 `Idea`（安全），避免意外觸發 sync
- `Scope` 預設 `M`（保守），避免低估複雜度
- `Auto Mode` 預設 `plan-only`，避免意外開 PR
- 高風險 repo（`daodao-storage`、`daodao-infra`）：建立時自動加提示「此 repo 為高風險，pipeline 強制 plan-only」
