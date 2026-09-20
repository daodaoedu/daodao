# 驗證報告 → Google 文件 — 操作細節

verify 階段全部檢查點跑完、task.md「驗證」區塊寫好之後，額外產出一份 Google 文件版驗證報告，連結記入 task.md 並回寫 issue comment（finish 階段步驟 8）。

## 為什麼不直接把截圖塞進對話讓 AI 上傳

Google Drive 的 `create_file` MCP 工具只吃 inline `base64Content`，沒有「讀本機檔案路徑」這條路——截圖不管多小，都要整個讀進對話 context 才能塞給它，30 張截圖會非常浪費 token。改用 `rclone` 直接從硬碟同步到 Drive，全程不經過對話 context。

## 一次性設定（每台機器只需做一次）

```bash
brew install rclone
rclone authorize "drive"   # 開瀏覽器走 OAuth，同意後把印出的 token JSON 存起來
rclone config create gdrive drive scope=drive.file token='<上一步印出的 token JSON>'
```

- `scope=drive.file` 讓這個 remote 只能存取自己建立的檔案，不會拿到使用者整個 Drive 的權限
- 用哪個 Google 帳號完成瀏覽器授權，之後上傳的檔案就屬於哪個帳號——確認跟平常開文件用的帳號一致，不然文件建立後還要多一步分享

## 每個 task 的操作

1. **上傳截圖**（zero token cost）：
   ```bash
   rclone mkdir "gdrive:dev-task-verify-reports/<task-slug>/evidence"
   rclone copy "$TASK/evidence/" "gdrive:dev-task-verify-reports/<task-slug>/evidence/" --progress
   ```
2. **拿檔案 ID**：
   ```bash
   rclone lsjson "gdrive:dev-task-verify-reports/<task-slug>/evidence/" > evidence_ids.json
   ```
3. **開放內嵌用的權限**（一次設在 task 資料夾即可，cascade 到裡面所有檔案）：
   ```bash
   TOKEN=$(python3 -c "import json,re; c=open('$HOME/.config/rclone/rclone.conf').read(); print(json.loads(re.search(r'token = (\{.*\})', c).group(1))['access_token'])")
   curl -s -X POST "https://www.googleapis.com/drive/v3/files/<task資料夾ID>/permissions?sendNotificationEmail=false" \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"role":"reader","type":"anyone"}'
   ```
   這步把截圖從「僅上傳者本人」改成「知道連結的人都能看」（不會被搜尋索引，但連結外流就能被任何人開）——Google 文件轉檔伺服器要嵌入圖片必須能公開抓取到，沒有更窄的做法。**內容若明顯敏感（正式環境真實個資、機密商業資料）先跟使用者確認要不要做這步**；一般 dev 環境截圖預設可以直接做。
4. **產生 HTML 內容**：依 task.md 的「驗證」區塊逐項轉成 `<h3>檢查點</h3><p>描述</p><p><img src="https://drive.google.com/uc?export=view&id=<檔案ID>" width="480"></p>`，純文字生成、不含任何圖片位元組，所以就算轉出上百張截圖的內容也只有幾十 KB。**核心旅程矩陣整表轉成 `<table>` 放在最前面**（ID、旅程、類型、輸入、預期、實際狀態碼），每列旅程的截圖跟在表後；讀報告的人第一眼要看到「使用者能不能完成任務」，不是版面像不像。
5. **建立文件**：HTML 小（< 20KB）時可呼叫 Google Drive MCP 的 `create_file`（`title` 用 `Task <n> 驗證報告`，`textContent` 放 HTML，`contentMimeType: text/html`，會自動轉成 Google 文件）。HTML 大（並排截圖多、附量測表）時不要經 MCP，改用 rclone 的 token 直接打 Drive API multipart 上傳並轉檔，全程不經對話 context：
   ```bash
   rclone lsd gdrive: >/dev/null   # 讓 token 刷新
   TOKEN=$(python3 -c "import json,re; c=open('$HOME/.config/rclone/rclone.conf').read(); print(json.loads(re.search(r'token = (\{.*\})', c).group(1))['access_token'])")
   curl -s -X POST "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink" \
     -H "Authorization: Bearer $TOKEN" \
     -F "metadata={\"name\":\"Task <n> 驗證報告\",\"mimeType\":\"application/vnd.google-apps.document\",\"parents\":[\"<task資料夾ID>\"]};type=application/json" \
     -F "file=@report.html;type=text/html"
   ```
   （`rclone copyto --drive-import-formats html` 會報 can't convert .html to .docx，不可用；權限 API 碰到 403 rateLimitExceeded 等 20 秒重試。）
6. **確認擁有者 + 分享**：回傳的 `owner` 欄位如果不是使用者自己平常登入的帳號（例如是連接這個 MCP 的組織帳號），用 `share_file` 分享給使用者本人 email（`vincent.xu.work@gmail.com`），`role: writer`。
7. **設定文件公開**：用 rclone 刷新後的 token 呼叫 Drive API 設定 `{"role":"reader","type":"anyone"}` 權限（同步驟 3 相同做法），讓知道連結的人可看。若 rclone 共用 client 被 rate limit，改由使用者手動在 Google 文件 Share 設定。
8. 把文件連結記進 task.md「驗證」區塊最上方，並帶進 finish 階段 issue comment。

## finish 階段 issue comment 範本追加

```
## ✅ 驗收完成，已發 PR
- PR: [<repo>#<n>](<url>)
- 驗證報告（Google 文件，含截圖）: [Task <n> 驗證報告](<doc url>)
- 瀏覽器驗證：<通過項目摘要>
- Known incomplete scope: <none 或列項目>
```
