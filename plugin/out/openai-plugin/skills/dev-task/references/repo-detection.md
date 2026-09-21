# Repo 判定 — 從需求推導涉及哪些 repo

「issue 有標 `repo:*` label」只是捷徑，不是判定。正確流程：**逐條需求分類 → 用程式碼查證 → 產出有依據的 repo 清單**。

## Repo 清單與職責

| Repo | 職責 | 備註 |
|---|---|---|
| daodao-f2e | 前端（apps: product / mobile / website） | UI 任務主戰場 |
| daodao-admin-ui | 後台管理介面 | 「出現在島島 admin」類需求 |
| daodao-server | 後端 API（NestJS） | endpoint、DTO、驗證規則、商業邏輯 |
| daodao-storage | DB schema + migration（`migrate/sql/`，非 Prisma） | ⚠️ 強制 plan-only |
| daodao-ai-backend | AI 服務（Python） | LLM 生成、推薦類需求 |
| daodao-worker | 背景任務 | 排程、信件、非同步處理 |
| daodao-infra | 基礎設施 | ⚠️ 強制 plan-only |

依賴順序：`storage → server → ai-backend → worker → f2e / admin-ui`

## Step 1: 逐條需求分類

把 FRD 的每條 FR（或 issue 的每個修改點）丟進三類：

| 分類 | 判斷問句 | 對應 repo |
|---|---|---|
| **純 UI** | 只改畫面呈現/互動，資料進出不變？ | f2e 或 admin-ui |
| **API 行為** | 驗證規則、預設值、回傳內容、批次操作有變？ | server（+ f2e 接） |
| **資料欄位** | 要存以前沒存過的東西？欄位型別/上限有變？ | storage（+ server + f2e） |

常見訊號詞：
- 「自動帶入」「可自訂」「上限 N」→ 查驗證在前端還是後端 → 可能 server
- 「新增欄位」「可修改名稱」「可不填」→ 查 schema 有沒有這欄位 → 可能 storage
- 「一次建立多個」→ 批次 API → server
- 「出現在 admin」→ 查是 admin-ui 要新頁面，還是資料自然流過去
- 「AI 建議/生成」→ ai-backend
- 「寄信」「排程」「事後通知」→ worker

## Step 2: 程式碼查證（每個「可能」都要變成「確定」或「排除」）

用 Explore subagent 或直接 grep，證據標準：

```bash
# 前端目前打哪些 API（找到功能入口後追 fetch/service 層）
rg "practices|practice" projects/daodao-f2e/apps/product/src --files-with-matches

# server 端對應的 DTO / validation（上限、必填在這裡看）
rg "class.*Dto|@Max|@IsOptional" projects/daodao-server/src/<module>/

# schema 有沒有這個欄位（兩種管道）
rg "<欄位名>" projects/daodao-storage/migrate/sql/
# 或 daodao-pg-dev MCP 的 describe_schema
```

判定規則：
- FRD 說上限 90，DTO 寫 `@Max(30)` → **server 確定**
- FRD 要存資源自訂名稱，schema 沒這欄位 → **storage 確定**（提醒 plan-only）
- FRD 的欄位/驗證後端全都有了 → **只有 f2e**

## Step 3: 產出

寫進 task.md 的 Repos 欄，每個 repo 附一行依據：

```markdown
- Repos:
  - daodao-f2e — 主要，四步驟 UI 全部重做
  - daodao-server — DTO days 上限 30→90（src/practices/dto/create.dto.ts:42）
  - ~~daodao-storage~~ — 排除：resources 表已有 name 欄位可覆寫
```

- 查證後仍不確定的：把兩邊證據列出來**問使用者**，不要猜
- 涉及 storage / infra：提醒使用者這兩個 repo 是 plan-only，migration 需人工把關
- 跨 repo 時在 task.md 記依賴順序，PR 依此標 merge 順序
