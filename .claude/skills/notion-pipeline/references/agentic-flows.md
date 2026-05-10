# Agentic Implementation Flows

## scope:XS — 單一 PR（plan + code 合一）

**Token cap**: 50,000  
**Changed files cap**: ≤3

```
1. 讀 issue body → 理解 Description + Acceptance Criteria
2. 寫 test（test-first，最少 1 個 unit test）
3. 跑一次：確認 test 為 red（若 green → test 沒測到行為，重寫）
4. 實作讓 test 變 green
5. 跑 lint + test 全過
6. Commit pair：
   - commit 1: "test(xs): {describe test}"
   - commit 2: "feat/fix(xs): {describe impl}"
7. 開 PR，套用 XS/S PR body 模板
```

---

## scope:S — plan.md + code 一個 PR

**Token cap**: 200,000  
**Changed files cap**: ≤10

```
1. 讀 issue body
2. 在 branch 根建立 PLAN.md：
   - 要改的檔案清單（逐條）
   - 每個檔案改什麼（一句話）
   - 預計 test 範圍
3. Commit: "plan(s): {issue slug}"
4. 依 plan 逐區塊 TDD（test-first → red → impl → green）
5. 每個邏輯單元一個 commit pair：
   - "test({area}): ..."
   - "feat/fix({area}): ..."
6. pnpm lint && pnpm test 全過
7. 開 PR，套用 XS/S PR body 模板
```

---

## scope:M — 兩階段

**Token cap**: 800,000（兩階段共用）  
**Changed files cap**: ≤30

### Phase 1（state=needs-spec）

```
目標：寫 spec PR，不寫任何 production code。

1. bin/openspec-headless.ts 已由 m.sh 呼叫
2. 若 headless exit 2 → 在 issue 留 comment 說明缺什麼資訊，exit
3. PR body 套用 M spec PR 模板
4. 加 spec-pending label（m.sh 已處理）
```

### Phase 2（state=needs-code）

```
目標：依 spec 實作，不偏離 spec。

1. 讀 openspec/changes/{change_id}/ 全部檔案
2. 依 tasks.md 逐一 TDD 實作
3. 每個 task 一個 commit pair（test + code）
4. 不超出 spec 範圍；若發現 spec 不足 → 在 PR body 的 Implementation Notes 說明
5. PR body 套用 M code PR 模板，reference spec PR 號碼
```

---

## scope:L — 只寫 spec

**Token cap**: 1,500,000

```
目標：完整、可執行的 spec，讓人類接手 code。

1. 比 M scope spec 更詳細：
   - 每個 task 包含 given/when/then
   - 列出所有需要改的檔案 + 原因
   - 標注技術風險
2. PR body 套用 L spec PR 模板
3. 加 human-coding label
4. 不開 code PR
```

---

## Test-first 紀律（scope:S+，強制）

commit 順序必須是：
1. `test(...)`: 跑一次 → 必須 fail（若 pass 表示 test 無效，重寫）
2. `feat/fix(...)`: 跑一次 → 必須 pass

CI 或 verification-loop.sh 會驗證這個順序。違反時 handler 會 escalate。
