# OpenSpec ↔ 程式碼 稽核協定（subagent 必讀）

## 任務
驗證 `openspec/specs/<capability>/spec.md` 中**每一條 requirement 與每一個 scenario** 是否真的在 `dev` 程式碼中實作。逐項追蹤，標記符合度，附程式碼證據。

## 真實程式碼基準：一律讀 `origin/dev`（worker 例外用 `origin/main`）
**不要**切換分支、不要動工作區。用 git ref 直接讀：
- 搜尋： `git -C <REPO> grep -n -i '<pattern>' origin/dev`
- 列檔： `git -C <REPO> ls-tree -r --name-only origin/dev | grep -i '<x>'`
- 讀檔： `git -C <REPO> show origin/dev:<path>`
- worker 用 `origin/main` 取代 `origin/dev`

## Repo 路徑與職責（絕對路徑，勿用 projects/ submodule）
- `/Users/xiaoxu/Projects/daodao/daodao-server` — Express 4 + Prisma + TS 後端：route/controller/service/validator/zod schema、OpenAPI。檔案多在 `src/`
- `/Users/xiaoxu/Projects/daodao/daodao-f2e` — Next.js 15 monorepo：`packages/api`(API function+SWR hook)、`apps/product`、`apps/website`、`packages/ui`、`packages/features/*`
- `/Users/xiaoxu/Projects/daodao/daodao-ai-backend` — FastAPI + Python 3.12：`app/` routers/services
- `/Users/xiaoxu/Projects/daodao/daodao-storage` — SQL migrations：`migrate/sql/`
- `/Users/xiaoxu/Projects/daodao/daodao-worker` — Hono + Cloudflare Worker（基準用 origin/main）
- `/Users/xiaoxu/Projects/daodao/daodao-admin-ui` — 後台 React 管理介面

## 流程（每個 spec）
1. 讀 `openspec/specs/<name>/spec.md`，列出所有 requirement + scenario。
2. 判斷該 spec 涉及哪些 repo（從 requirement 文字推斷：端點→server、hook/元件→f2e、migration→storage、AI→ai-backend、後台→admin-ui）。
3. 對每條 requirement：在相關 repo 的 `origin/dev` 用 grep 找對應實作（endpoint 路徑、function 名、component 名、欄位名、migration）。找到就記 `repo:path:line`。
4. 對每個 scenario：確認該行為路徑有對應程式碼（驗證邏輯、status code、edge case 處理）。能找到具體實作才算符合。
5. 若 spec 來自某個 archived change，可參考 `openspec/changes/archive/*/specs/<name>/spec.md` 與 `tasks.md` 對照，但**最終以程式碼為準**。

## 判定標準
- ✅ 符合：找到明確對應程式碼（附 `repo:path:line` 證據）
- ⚠️ 部分：有相關實作但與 spec 描述有落差（命名不同、缺 edge case、回傳結構不符）— 說明差異
- ❌ 缺失：grep 不到任何對應實作
- ❓ 無法判定：需執行時驗證或證據不足 — 說明原因

不確定就標 ⚠️/❓，**不要假設實作存在**。沒證據不要寫 ✅。

## 輸出：每個 spec 寫一個檔
路徑：`/Users/xiaoxu/Projects/daodao/.omc/openspec-audit/specs/<name>.md`
格式：

```
# <spec-name>
- 涉及 repo: server / f2e / ...
- 對應 archived change: <date-name 或 無>
- 總計: R 條 requirement / S 個 scenario | ✅a ⚠️b ❌c ❓d

## Requirement: <標題>  → ✅/⚠️/❌/❓
證據: daodao-server:src/.../x.ts:123 — <一句說明找到什麼>
- Scenario: <標題> → ✅/⚠️/❌/❓ — <證據或差異說明>
- Scenario: ...

## Requirement: ...
```

## 回傳給主控（最後訊息，精簡）
只回：每個 spec 一行 `<name>: ✅a ⚠️b ❌c ❓d — <最關鍵的1個發現>`，外加本批整體最值得注意的 2-3 個落差。不要貼長篇。
