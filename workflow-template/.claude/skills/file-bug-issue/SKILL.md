---
name: file-bug-issue
description: 針對無法修復的錯誤開 GitHub issue，附帶完整重現步驟與除錯記錄
user_invocable: true
---

將當前對話中遇到的 bug / 錯誤開成 GitHub issue，讓團隊或未來的自己能追蹤處理。

**Input**: 可選指定 repo URL 和錯誤摘要。未指定則詢問。

**Steps**

1. **收集錯誤資訊**

   從當前對話上下文中整理：
   - **錯誤現象**：錯誤訊息、失敗的 command / test / CI step
   - **重現步驟**：怎麼觸發的（手動操作、CI pipeline、特定指令）
   - **已嘗試的修復**：列出對話中嘗試過但失敗的方案
   - **相關檔案**：涉及的程式碼、設定檔路徑
   - **環境資訊**：CI / local、OS、Docker image 版本等

   如果上下文不夠完整，用 **AskUserQuestion** 補問缺少的資訊。

2. **取得目標 repo**

   詢問使用者要開到哪個 GitHub repo（例如 `your-org/your-repo`）。
   用 `gh repo view <repo> --json name` 驗證存取權限。

3. **確保 label 存在**

   ```bash
   gh label create bug --repo <repo> --color D73A4A 2>/dev/null || true
   ```

4. **草擬 issue 內容**

   向使用者預覽 issue：

   ```
   Title: <簡潔描述錯誤>
   Labels: bug

   ## 錯誤描述
   <錯誤現象，包含完整錯誤訊息>

   ## 重現步驟
   1. ...
   2. ...

   ## 預期行為
   <應該發生什麼>

   ## 環境
   - 環境：CI / Local
   - 相關服務版本：...

   ## 已嘗試的方案
   - [ ] 方案 A — 結果：...
   - [ ] 方案 B — 結果：...

   ## 相關檔案
   - `path/to/file`

   ## 補充資訊
   <其他有助於除錯的上下文>
   ```

   用 **AskUserQuestion** 確認：「要建立這個 issue 嗎？可以先調整內容。」

5. **建立 issue**

   ```bash
   gh issue create --repo <repo> --title "<title>" --label "bug" --body "$(cat <<'EOF'
   <issue body>
   EOF
   )"
   ```

6. **回報結果**

   顯示建立的 issue 連結：
   ```
   已建立 issue:
   - #123 <title>
     <url>
   ```

**Important notes**:
- Issue 內容使用繁體中文（符合專案慣例）
- 錯誤訊息、指令、程式碼保持原文不翻譯
- Issue body 必須自足——讀者不需要存取本地檔案就能理解問題
- 如果對話中有明確的根因分析或修復方向，一併寫入 issue
