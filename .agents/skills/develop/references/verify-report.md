# 驗證報告 → Google 文件 — 操作細節

verify 階段全部檢查點跑完、task.md「驗證」區塊寫好之後，額外產出一份 Google 文件版驗證報告，連結記入 task.md 並回寫 issue comment（finish 階段步驟 8）。

## 為什麼用腳本，不用 Drive connector

Google Drive 的 `create_file` MCP 工具只吃 inline `base64Content`，沒有「讀本機檔案路徑」這條路——截圖不管多小，都要整個讀進對話 context 才能塞給它，30 張截圖會非常浪費 token。而且只有 Claude Code 接了 Drive connector。改用 `upload-report.py`：截圖走 `rclone` 從硬碟同步，文件走 Drive API，全程不經過對話 context，只要能跑 shell 的平台（Claude Code、Codex）都用同一支。

## 一次性設定（每台機器只需做一次）

```bash
brew install rclone
rclone authorize "drive"   # 開瀏覽器走 OAuth，同意後把印出的 token JSON 存起來
rclone config create gdrive drive scope=drive.file token='<上一步印出的 token JSON>'
```

- `scope=drive.file` 讓這個 remote 只能存取自己建立的檔案，不會拿到使用者整個 Drive 的權限
- 用哪個 Google 帳號完成瀏覽器授權，之後上傳的檔案就屬於哪個帳號——確認跟平常開文件用的帳號一致，文件建立後就不用再分享
- rclone 會提示共用的 Google client_id 將於 2026 年內停用；看到這個提示就照 <https://rclone.org/drive/#making-your-own-client-id> 建自己的 client_id，再用 `rclone config` 更新 `gdrive`

## 每個 task 的操作

1. **寫報告 HTML**（例如 `$TASK/notes/report.html`）：依 task.md 的「驗證」區塊逐項轉成 `<h3>檢查點</h3><p>描述</p><p><img src="evidence/<檔名>" width="480"></p>`，截圖一律寫成 `evidence/<檔名>`，上傳時腳本會換成 Drive 網址。**核心旅程矩陣整表轉成 `<table>` 放在最前面**（ID、旅程、類型、輸入、預期、實際狀態碼），每列旅程的截圖跟在表後；讀報告的人第一眼要看到「使用者能不能完成任務」，不是版面像不像。
2. **上傳**：
   ```bash
   python3 plugin/skills/develop/references/verify-report/upload-report.py \
     --slug <task-slug> --evidence "$TASK/evidence" \
     --html "$TASK/notes/report.html" --title "Task <n> 驗證報告"
   ```
   腳本會把截圖傳到 `gdrive:dev-task-verify-reports/<task-slug>/evidence/`、替換 HTML 裡的截圖網址、建立 Google 文件，最後印出 `{"docUrl": ...}`。HTML 引用了 evidence/ 裡沒有的檔案會直接失敗並列出檔名，不會產出缺圖的報告。
3. **權限**：腳本預設把 task 資料夾與文件設成「知道連結的人都能看」（不會被搜尋索引，但連結外流就能被任何人開）——Google 文件轉檔伺服器要嵌入圖片必須能公開抓取到，沒有更窄的做法。**內容若明顯敏感（正式環境真實個資、機密商業資料）先跟使用者確認**；不公開就加 `--no-public`，代價是圖片嵌不進去。一般 dev 環境截圖預設可以直接做。
4. 把 `docUrl` 記進 task.md「驗證」區塊最上方，並帶進 finish 階段 issue comment。

## finish 階段 issue comment 範本追加

```
## ✅ 驗收完成，已發 PR
- PR: [<repo>#<n>](<url>)
- 驗證報告（Google 文件，含截圖）: [Task <n> 驗證報告](<doc url>)
- 瀏覽器驗證：<通過項目摘要>
- Known incomplete scope: <none 或列項目>
```
