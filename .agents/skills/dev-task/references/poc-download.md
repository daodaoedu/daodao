# POC 下載到本機 — 操作細節

Phase 1.1 收集素材時，如果 issue/使用者提供的 POC 連結是 **Google Drive 資料夾**，下載到任務資料夾本機，verify 階段才有東西可以直接開來比對，不用每次連線 Drive 現看。

## 固定資料夾位置

**一律存在 `$TASK/poc/`**（例：`worktrees/167-lighthouse-management/poc/`），不要放別的路徑——task.md 的「POC / 設計稿」欄位固定指向這裡，之後任何 session 接手都知道去哪找。跟 Drive 那邊的固定慣例對稱：

| 用途 | 位置 | 固定規則 |
|---|---|---|
| POC 下載（Drive → 本機） | `$TASK/poc/` | 每個任務資料夾底下固定這個名字 |
| 驗證截圖上傳（本機 → Drive） | `gdrive:dev-task-verify-reports/<issue#>-<slug>/evidence/`（見 [verify-report.md](verify-report.md)） | 根目錄固定 `dev-task-verify-reports/`，子路徑用跟 worktree 資料夾同名的 `<issue#>-<slug>` |

## 下載步驟

用 Google Drive MCP（`mcp__claude_ai_Google_Drive__*`，不是 rclone——POC 資料夾是設計端既有的檔案，rclone 的 `drive.file` scope 建不到、看不到別人建立的檔案，只有既有的 MCP 廣權限連線抓得到）：

1. **列出資料夾內容**：`search_files`，query 用 `parentId = '<POC 資料夾 ID>'`（ID 從使用者貼的 Drive 連結 URL 裡取，`/folders/<ID>`）
2. **遇到子資料夾就遞迴列**（例如 `screens/` 這種子資料夾單獨再 `search_files` 一次）
3. **逐檔下載**：`download_file_content`（fileId），拿到 base64 內容後用 Write/Bash 寫進 `$TASK/poc/<相對路徑>/<檔名>`，保留原始副檔名
4. **檔案數量把關**：POC 資料夾通常是幾張設計稿截圖 + 頂多一個互動原型（html/js），一般在 20 個檔案以內、每個幾百 KB——這種規模直接下載沒問題。若資料夾異常大（含影片、幾十張以上高解析度圖），先跟使用者確認要不要全下載，或只挑關鍵幾張，避免不必要的 context 消耗
5. **更新 task.md**：「POC / 設計稿」欄位寫成：
   ```
   - POC / 設計稿: poc/（Drive 資料夾 <原始連結>）
     - poc/<檔名>：<簡述內容，例如互動原型或哪些畫面截圖>
   ```
   若是互動原型（html + 依賴的 js/css），註明本機開啟方式：`cd $TASK/poc && python3 -m http.server <port>` 後開瀏覽器——不要用 `file://` 直接開，會被 CORS 卡住

## 不需要下載的情況

- **Figma 連結**：不下載，verify 階段直接用 Figma MCP 的 `get_screenshot` 現抓，Figma 本身就是即時可查的設計系統
- **單一 Google Doc/Slide 連結**（規格文件而非畫面稿）：不算 POC，直接讀線上版本即可
- **prototype branch**（code 形式的原型）：不算 Drive 資料夾，照一般 repo 處理
