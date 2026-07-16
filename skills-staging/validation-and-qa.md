---
name: validation-and-qa
description: 你觀察到以下任一狀態時載入：準備宣告「改完了/測過了/可以 merge」；要評估某個 PR 的驗證是否充分；CI 綠了但你不確定綠代表什麼；要為變更決定該跑哪些測試；review 別人（或自動化 agent）的 PR
---

# 驗證與證據標準

> 最後校準：2026-07-14。核心事實：**這個系統的 CI 綠 ≠ 測試過**。每個 repo 的 gate 覆蓋差異巨大，宣告完成前先對表。

## PR gate 真相表（CI 實際執行的內容）

| Repo | CI 跑什麼 | CI **不跑**什麼 | 出處 |
|---|---|---|---|
| daodao-f2e | typecheck + lint + **test**（平行） | build 不在 CI（在 CD 才 build） | linode-ci.yml |
| daodao-server | typecheck + lint + **全套 jest** + schema-drift check | 型別層級 drift（檢查只比名字） | continuous-integration.yml、schema-drift.yml |
| daodao-ai-backend | black --check + ruff **而已**（bandit 帶 `|| true` 非阻斷） | **pytest 不在 CI**；pylint 完全不在 CI（只在本地 `make lint`） | ci.yml |
| daodao-worker | typecheck **而已** | **vitest 不在 CI**；不自動部署 | ci.yml |
| daodao-admin-ui | lint + tsc --noEmit | **vitest 不在 CI** | ci.yml |
| daodao-storage | schema validation + sync check | — | ci-postgres.yml、schema-sync-check.yml |
| daodao-mcp | **沒有 CI** | 一切 | 無 .github/ |
| daodao（hub） | product-status-drift（僅限相關路徑的 PR）、routine 排程 | **bin/ 的 vitest 不在任何 PR gate**（六個 workflow 中無測試 job） | .github/workflows/ |

## 規則

### V1. 「CI 綠」的宣告要按 repo 折算

- 觸發：你（或自動化 agent 的 PR）想以「CI 通過」作為完成證據。
- 步驟：對照上表。在 ai-backend / worker / admin-ui / mcp，CI 綠只證明格式/型別——**測試必須本地跑並在 PR 描述附結果**（`make test` / `pnpm test`）。
- 完成定義：PR 描述能回答「測試在哪裡跑的、結果如何」；沒跑就明說沒跑（.claude/README.md 作業守則：如實回報）。
- ❌ 反例（觀察到的合理化）：「CI 全綠所以可以 merge」——在 worker repo 這句話只代表 tsc 沒報錯，vitest 可能整包紅著。
- ✅ 正例：dashboard rework `043e9e6` 逐條回應 Gemini review 的 5 個問題並各自驗證。

### V2. 測試層級的真實意思（server）

- 事實：server 的 `test:unit` / `test:integration` / `test:e2e` 只是**目錄切分**，三層全部 mock prisma/BullMQ/logger（`jest.mock` 寫在各測試檔內；tests/setup.ts 只負責載 .env.test 與預設 env），走 supertest in-process app。它們驗證「API 通過 middleware 到 service 的邏輯」，**不驗證** DB 行為、SQL 正確性、queue 實際消費。
- 觸發：變更涉及真實 SQL、prisma query 行為、或 queue 消費。步驟：測試綠不構成證據；用 daodao-mcp pg server 對 dev DB 實測查詢，或在 PR 註明「僅 mock 層驗證」。
- 完成定義：證據種類與變更風險匹配。

### V3. schema 變更的證據標準

- 必跑三件套：storage `make check-schema`、server `pnpm run schema:drift`、且知道兩者盲區——前者有 ~70 表的 SKIP 白名單（= 已知漂移），後者只比名字不比型別。型別變更的證據只能是人工比對 prisma `@db.` 標註 vs migration 目標型別（photo_url 事故的教訓）。
- 完成定義：三件套結果 + 型別人工核對聲明。

### V4. 改 workflow / CI YAML 的證據標準

- 觸發：diff 觸及 `.github/workflows/`。
- 步驟：push 觸發與 workflow_dispatch 觸發**各實測一次**（server 的 skip bug 修兩輪、f2e 的 concurrency 取消 bug，全是只測了一種觸發路徑）。改 f2e 的 CD 還要確認 concurrency group 行為。
- 完成定義：兩種觸發的 run link 附在 PR。

### V5. 前端變更的最低證據

- f2e：`pnpm run typecheck && pnpm run lint && pnpm test` 之外，**跨 app 影響**要三個 app 都 build（barrel 事故：改 packages/* 時 website/product/mobile 任一可能是暗傷）。mobile 變更另需 `pnpm --filter @daodao/mobile typecheck`（mobile-ci 的 gate）+ 注意 vitest workspace **不含** website/mobile——這兩個 app 的「測試綠」不存在。
- admin-ui：只有 3 個測試檔；主要證據是 `pnpm build`（tsc && vite build）+ 手動走一次目標頁面（雙後端 proxy 需活著）。

### V6. AI review 的採信標準

- 事實：每個 PR 有最多三個 AI reviewer（GPT-4o-mini code-review workflow、Gemini Code Assist、本地 code-review skill）。歷史顯示它們抓得到真問題（`043e9e6` 的 5 修）也產 false positive。
- 步驟：用 collect-pr-feedback skill 的分級（必須修/建議修/可忽略）；🔴 High 必須處理或書面反駁，不可靜默忽略（merge 條件之一是無未處理 High）。
- 完成定義：每條 High/Medium 有處理或有理由。

### V7. 部署後驗證

- server/ai-backend：CD 內建 smoke test 打 `/api/v1/health`；merge 後確認 CD run 綠 + Discord 無失敗通知。
- storage：`make migrate-sql-status-prod` 看 success 欄位——**CD 綠不代表每個 migration success**（runner 失敗會記錄後繼續跑下一檔，見 migration-safety R5）。
- f2e mobile：OTA 只自動推 preview channel；production OTA 是刻意手動動作（af002b8 的安全設計），不要「幫忙」自動化它。

---
重新驗證：`grep -n "run:" /home/user/daodao-ai-backend/.github/workflows/ci.yml /home/user/daodao-worker/.github/workflows/ci.yml && { test ! -d /home/user/daodao-mcp/.github && echo "mcp 無 CI（符合本檔敘述）" || echo "警告：mcp 出現 .github——本檔 gate 表需重新校準"; }`
