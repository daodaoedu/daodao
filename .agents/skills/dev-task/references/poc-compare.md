# POC 並排比對 — 操作細節

verify 階段第 3 步「與 POC 比對」的具體流程。適用於 `$TASK/poc/` 有 `.dc.html` 或靜態 HTML 設計稿的任務。

## 前置條件

- `$TASK/poc/` 已有 POC 檔案（phase 1.1 下載，見 [poc-download.md](poc-download.md)）
- dev server 已起（見 [browser-verify.md](browser-verify.md) 步驟 1）

## 步驟

### 1. 起 POC 靜態 server

POC 的 `.dc.html` 引用相對路徑的資源（`packages/assets/images/...`），必須從 f2e repo 根目錄 serve 才能解析。**不用 `file://`**（CORS 會擋 JS）。

```bash
# 複製 POC 到 worktree 的 f2e 根目錄（資源路徑才對得上）
cp "$TASK/poc/"*.dc.html "$TASK/daodao-f2e/"
cp "$TASK/poc/support.js" "$TASK/daodao-f2e/" 2>/dev/null

# 找一個空閒 port 起靜態 server
POC_PORT=8766
cd "$TASK/daodao-f2e" && python3 -m http.server $POC_PORT &

# 驗證
curl -s -o /dev/null -w "%{http_code}" "http://localhost:$POC_PORT/packages/assets/images/dashboard/blue.svg"
# 應回 200；若 404 代表 CWD 不對
```

### 2. 截圖比對

對每個 FRD 檢查點，分別在 POC 頁和實作頁截圖，存進 `$TASK/evidence/`：

```
evidence/
├── poc-user-view.png          ← POC 使用者視圖全頁
├── poc-guest-view.png         ← POC 訪客視圖（若有）
├── ui-user-view.png           ← 實作使用者視圖全頁
├── ui-guest-view.png          ← 實作訪客視圖
├── compare-card-detail.png    ← 局部放大：卡片對比
└── ...
```

用 `playwright_screenshot`（`savePng` 參數）或 `claude-in-chrome` 的 `computer` action（`save_to_disk`）。

### 2.5 用範本跑（建議）

不要每個任務從零寫腳本。範本在 [poc-compare/](poc-compare/)：

```bash
# 1. 複製 runner 與 report 到 app 的 scratch 目錄（@playwright/test 在 apps/<app>/node_modules）
mkdir -p "$TASK/daodao-f2e/apps/product/e2e-scratch"
cp plugin/skills/dev-task/references/poc-compare/poc-compare.mjs "$TASK/daodao-f2e/apps/product/e2e-scratch/"
# 2. 依 config.example.mjs 寫 $TASK/notes/poc-compare/config.mjs（checkpoints：flow + probes；probe key 前綴 = 類別）
cp plugin/skills/dev-task/references/poc-compare/config.example.mjs "$TASK/notes/poc-compare/config.mjs"
# 3. 重啟 dev server（HMR 會卡舊碼）後跑兩邊
cd "$TASK/daodao-f2e/apps/product" && CONFIG="$TASK/notes/poc-compare/config.mjs" SIDE=both node e2e-scratch/poc-compare.mjs
# 4. 產差異表、coverage.json、並排合成圖 evidence/compare-<cp>.png
python3 plugin/skills/dev-task/references/poc-compare/poc-report.py --task "$TASK"
```

- probe key 第一段是類別（`shell.` `card.` `button.` `input.` `dialog.` `table.` `badge.` `filter.` `empty.`），`coverage.json` 缺任何 required 類別，`pre-pr-gate.sh` 會擋；任務真的沒有的類別在 config `categories.na` 寫理由
- `dialog.body` 這類 probe 會量到 `scrollable`：原型不內捲而實作內捲會直接標 ❌
- 並排合成圖已同寬、頂端對齊，Google 文件直接嵌 `compare-*.png`，不要各放一張

### 3. 量測比對（必做）

截圖只做視覺留證。**間距、尺寸、圓角等數值用 JS probe 量測**，不要用肉眼看截圖判斷：

```js
// 在 POC 頁面注入
const card = document.querySelector('a[style*="border-radius:20px"]');
const cs = getComputedStyle(card);
JSON.stringify({
  borderRadius: cs.borderRadius,
  maxWidth: cs.maxWidth,
  padding: cs.padding,
  rect: card.getBoundingClientRect()
});
```

```js
// 在實作頁面注入同一段，比對輸出
```

兩邊數字不一致的項目記入 task.md 的「驗證」區塊，標 ❌ 並附上 POC 值 vs. 實作值。

**判定規則**：❌ 只有兩種出路——修掉，或列進「### POC 差異決策」交給使用者（AskUserQuestion，附並排截圖）。不可以自行標成「設計系統」「刻意」就放過；FRD 明文寫的降級（例如成員新增 coming soon）才算已知刻意。使用者確認後在 task.md「驗證」區塊寫一行 `POC 差異決策已確認`，`pre-pr-gate.sh` 才會放行 UI repo 的 PR。

### 3.5 肉眼核對（必做）

probe 只量你想到的屬性。量完把每組並排截圖用 Read 打開看一遍，列出肉眼可見但表裡沒有的差異（遮罩深淺、按鈕實心／外框／ghost、modal 有沒有內捲、元件有無），補進差異表。probe 表最低涵蓋範圍見 [poc-probe-checklist.md](poc-probe-checklist.md)。

### 4. 差異清單

截完圖、量完數字後，在 task.md「驗證」區塊寫一張差異表：

```markdown
### POC 比對

| 項目 | POC | 實作 | 狀態 |
|---|---|---|---|
| 卡片圓角 | 20px | 12px | ❌ |
| 主內容寬度 | 760px | 640px | ❌ |
| 色帶高度 | 78px | 239px（滿版） | ❌ |
| hover 效果 | translateY(-3px) + shadow | opacity 變化 | ❌ |
| 發起人頭像大小 | 20px | 16px | ❌ |
```

### 5. 寫進驗證報告

驗證報告（Google 文件）新增一個「POC 並排比對」區段：
- 嵌入 POC 全頁截圖 + 實作全頁截圖
- 差異表（同上）
- 標注哪些差異是「刻意的 FRD 決策」vs.「實作遺漏」

### 6. 清理

驗證完畢後移除複製到 f2e 根的 POC 檔案（不要 commit 進去）：

```bash
rm "$TASK/daodao-f2e/"*.dc.html "$TASK/daodao-f2e/support.js" 2>/dev/null
```

## POC 是 `index.html + support.js`（從 prototype 分支抽出）時

跟 `.dc.html` 同一套 runtime，差別只在檔名：直接 `cd $TASK/poc && python3 -m http.server 4173` 從 poc/ 目錄 serve 即可（`_ds/`、`assets/` 都在同層）。仍然必做量測比對。

## 不適用的情況

- **Figma 連結**：用 Figma MCP `get_screenshot` 直接抓設計稿截圖，不需起 POC server
- **純後端任務**：無 UI，跳過本流程
- **POC 資料夾沒有 `.dc.html`**（只有截圖）：直接把截圖當 evidence 用，不起 server

## `.dc.html` POC 的已知陷阱

- 同一個 Drive 資料夾可能有多個版本檔（例：`Practice Create Flow.dc.html` 舊版、`Group space - …dc.html` 含全部功能的最終版）；先抽 text node diff 確認基準。
- 綁定文字 `{{ x }}` 渲染後包在 `<span class="sc-interp">`，用文字找元素要比 `textContent` 取最深匹配，碰到 `.sc-interp` 回 parentElement 再量。
- POC 預設 prefilled（`<x-dc data-props>` 的 `"prefilled":{"default":true}`），要走空白流程就複製一份把 default 改 false；預設值按鈕多為 toggle，再點會取消。
- 起 server 可用 `$TASK/poc/serve/` 放 symlink（html、support.js、`_ds`、`packages → ../../daodao-f2e/packages`），不必複製進 f2e。
- 兩邊各跑一支同 probe 表的 Playwright 腳本輸出 json 再產差異表，比手動 `playwright_evaluate` 逐項量快得多；範本在本目錄 `poc-compare/`（見 2.5）。
