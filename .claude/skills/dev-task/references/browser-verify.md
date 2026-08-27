# 瀏覽器驗證 — 操作細節

## 1. 起 dev server

在任務資料夾的 worktree 內起（不是 `projects/`）：

```bash
cd "$TASK/daodao-f2e/apps/<product|mobile|website>"
pnpm dev   # port offset ≠ 0 時：pnpm dev --port <預設+offset>
```

- 起完先 curl 確認有回應再開瀏覽器
- 依賴後端的頁面：確認本地 docker（server/DB）在跑，或 task.md 備註要連哪個環境
- **任務本身有改 server**：必須跑「任務資料夾裡的 server worktree」，不是 `projects/daodao-server`——驗到舊版後端等於沒驗。先停掉 projects 版的 server container/process 再起任務版

## 2. 展開檢查清單

驗證前先把「要驗什麼」寫成清單，來源優先序：

1. FRD 的驗收條件（task.md 連結的 `docs/product/...`）
2. task.md 的 phases（每個 phase 至少一條）
3. 基本盤（每次都驗）：
   - console 無新增 error
   - 改動頁面在桌機 + 行動版寬度（390px）下版面正常
   - 主要互動路徑可完整走通（點擊、輸入、送出）

## 3. 工具選擇

| 用途 | 工具 |
|---|---|
| 互動操作、看真實登入狀態、讀 console | `claude-in-chrome` MCP（先 `tabs_context_mcp`，開新 tab，勿重用舊 tab id） |
| 存證據截圖到檔案 | `playwright` MCP 的 `playwright_screenshot`（`savePng` 存到 `$TASK/evidence/`） |
| 對照設計稿 | Figma MCP `get_screenshot`（task.md 的 Figma 連結） |

claude-in-chrome 不可用時全程用 playwright。注意：不要觸發 alert/confirm 對話框（會卡住 session）。

## 3a. 登入牆處理（碰到「要登入才能看」時，先自己解，不要直接丟回給使用者）

依序嘗試，走到哪一層記進 task.md 備註：

1. **沿用既有登入態**：`claude-in-chrome` 開的是使用者真實 Chrome——先直接開目標頁，localhost 可能本來就有活著的 session
2. **找 dev 用登入後門**：`rg -i "dev.*login|test.*login|bypass|impersonate" <server worktree>/src`——很多專案有 dev-only 登入 route 或環境變數開關
3. **自己鑄一個 session**：讀 server 的 auth 實作（`rg -i "cookie|session|jwt|token" src/`）搞清楚 session 機制，然後：
   - session 存 DB → 用 `daodao-pg-dev` MCP 查一個測試使用者（沒有就依 idempotent SQL 原則 seed 一個），照 server 的寫法插一筆 session row
   - JWT/簽名 cookie → 用 worktree `.env` 裡的 secret 照 server 的簽法鑄 token
   - 再把 cookie 注入瀏覽器：playwright 直接設；claude-in-chrome 用 `javascript_tool` 寫 `document.cookie`（HttpOnly cookie 則改用 playwright）
4. **直接打 auth API**：若有帳密/魔術連結等非 OAuth 途徑，curl 走完流程拿 Set-Cookie 再注入
5. **以上全部不通**（純 OAuth、無後門、session 機制碰不了）才請使用者手動登入一次——並在 task.md 記「建議：server 加 dev-only 登入 route」讓下次不再卡

原則：**「無法替你操作 OAuth」不是終點**——OAuth 只是取得 session 的其中一條路，工程師有 DB 和 secret，永遠有別條路。

## 4. 驗證迴圈

對清單每一項：

1. 操作 → 觀察結果
2. 截圖存 `$TASK/evidence/<phase>-<checkpoint>.png`
3. 與 POC / Figma 比對（版面、間距、狀態）
4. 讀 console（`read_console_messages`，用 pattern 過濾）確認無新 error
5. 記入 task.md「驗證」區塊：✅/❌ + 截圖檔名 + 備註

**失敗**：修復 → 只重驗該項。同一項修 2 次仍失敗 → 停下來，把現象（截圖 + console + 重現步驟）整理給使用者判斷。

## 5. 純後端任務的替代驗證

無 UI 變更時跳過瀏覽器，改為：

- 新/改 API：curl 實際打一輪（正常 + 邊界 + 錯誤輸入），記 request/response 到 task.md
- migration：在本地 DB 跑過 + rollback 測試（psql，遵守 idempotent 原則）
- 有整合測試就跑整合測試

## 6. 驗證結果的去向

- task.md「驗證」區塊 = 完整記錄（含失敗與修復過程）
- PR body 的 Test plan = 通過項目的摘要（勾選狀態）
- issue comment（finish 階段步驟 8）= 對外回報：PR 連結 + 驗證摘要 + known incomplete scope
- `evidence/` 截圖留在任務資料夾，cleanup 時隨資料夾刪除；需要留存的關鍵截圖由使用者拖進 PR/issue
