# Phase 3: verify — 瀏覽器驗證（總驗收）

有 UI 變更（f2e / admin-ui）的任務**必須**通過此階段才能發 PR；純後端任務改跑 API 驗證（curl / 整合測試）後跳到 finish。詳細操作見 [browser-verify.md](../browser-verify.md)。

驗證途中掉登入、量到被導走的頁面、toast 截不到、寄信或 DB 驗證卡住時，先查 [gotchas.md](../gotchas.md)「開發與瀏覽器驗證」。

與 dev 階段 phase 級快篩的分工：快篩只看「這個 phase 的改動有沒有壞」；verify 是**對完整驗收清單（PRD／既有 FRD 的 Test Points）的總驗收**，含跨 phase 整合、回歸、無障礙與窄螢幕——快篩過了不能跳過 verify。

1. **起 dev server** — 在任務資料夾的 worktree 內起，套用 task.md 的 Port offset
2. **逐 phase 驗收** — 從 task.md 的 phases + 已確認的驗收契約展開檢查清單，用瀏覽器實際走過每一條：
   - 使用當前客戶端可用且已讀取操作指引的瀏覽器工具；Claude 可用 `claude-in-chrome`，Codex 使用已掛載的瀏覽器入口。無可用工具時記錄未驗證，不以靜態檢查替代瀏覽器通過。公開網頁研究仍依專案 Groundlane 規則，不使用禁止的抓取工具
   - 對照 task.md 連結的 POC / Figma 設計稿比對版面
   - **POC 並排比對**（`$TASK/poc/` 有可互動的 HTML 原型時必做——`.dc.html`，或 `index.html + support.js` 這種從 prototype 分支抽出的 Claude Design 原型都算；只有 Figma 或純截圖才跳過）：起 POC 靜態 server、並排截圖、**用 getComputedStyle 量測產出差異表**，見 [poc-compare.md](../poc-compare.md)。行為驗收（Test Points）通過 ≠ 視覺對齊，兩者都要做完才能進 finish。三條硬規則：
     1. probe 表必須涵蓋 [poc-probe-checklist](../poc-probe-checklist.md) 的全部類別（遮罩、按鈕各變體、modal 高度／捲動、input、表格、膠囊…），不能只挑「骨架」量
     2. 量完**逐組並排截圖用眼睛看一遍**（用可用的圖片檢視工具），把肉眼可見但 probe 沒抓到的差異補進差異表——#189 的遮罩深淺、ghost vs 外框鈕、modal 內捲，都是 probe 表漏掉、截圖一眼就看得出的
     3. 差異表裡沒有「設計系統」這個免死金牌：每一條 ❌ 不是修掉，就是列進「### POC 差異決策」附上差異證據、建議與影響交使用者審核；用當前可用提問工具或直接提問；使用者確認後在 task.md 寫一行 `POC 差異決策已確認`（發 PR 閘門會檢查）。「用 @daodao/ui 元件」與「尺寸／顏色對齊原型」不衝突——元件照用，數值用 className 對齊
   - **登入牆不是證據、也不是跳過理由**：導頁後落在 `/auth/*` 的截圖等於這頁沒驗過（#166 的 `verify-bug-report.png` 就是登入頁）。需要登入的頁面走 [browser-verify.md §3a](../browser-verify.md) 的 dev-login 配方；task.md 不得留「需要手動驗證（需登入）」清單發 PR——每項不是驗掉，就是使用者明確豁免並記「（豁免：<原因>）」，發 PR 閘門 `pr-verify-unchecked` 會檢查
   - **版面探針**（UI repo 必做，發 PR 閘門 `pr-layout-probe-missing` 會檢查）：對任務碰到的每條 route，在 390／1024／1440 三個寬度跑 `references/layout-probe.mjs`，量被導離目標頁（目標頁本身在 `/auth/` 底下的不算）、`scrollWidth > innerWidth` 橫向溢出、`main` 內未被 overflow 裁切的出界元素；產出的「### 版面探針」表貼進 task.md「## 驗證」底下，有 ❌ 先修再重跑。**這一步是 #233 的直接對策：settings 十五頁 `w-screen` 疊在 `md:pl-[132px]` 上、每頁多 132px，肉眼看截圖六個月沒人發現，一行 `scrollWidth` 就抓到。** diff 沒碰任何頁面／版面時寫一行 `版面探針不適用：<具體原因>`
   - **版面 rect 對照**（零視覺差異的 refactor 必做）：抽共用元件／換 className／搬 DOM 時，layout-probe 只證明「沒有溢出」，不證明「版面沒變」。用 `references/rect-probe.mjs` 改前改後各量一次、`rect-diff.py` 比對 rect 與 computedStyle（見 [browser-verify.md §4b](../browser-verify.md)），差異表貼進 task.md。#240 抽 `PageShell` 就是這樣證明 15 頁 45 組零差異的
3. **核心旅程矩陣**（有任何寫入路徑就必做，發 PR 閘門會檢查）— 依 [journey-matrix.md](../journey-matrix.md) 把任務碰到的每條「建立／編輯／刪除／送出」旅程列成表：每條至少一列真實輸入成功、一列 server 拒絕的輸入失敗；「實際」欄要有攔到的 HTTP 狀態碼；FE／BE 規則來源要寫 `檔案:行號`，前端手寫的驗證規則對不到 server 規則就是缺口、先修再驗。**這一步是 #188 的直接對策：畫面像 POC 不等於使用者能建立場次。** 沒有寫入路徑的任務寫一行 `核心旅程不適用：<具體原因>`
4. **留證據** — 每個檢查點截圖存到 `$TASK/evidence/`，命名 `<phase>-<checkpoint>.png`；旅程列命名 `verify-jNN.png`
5. **記錄結果** — task.md 新增「驗證」區塊：檢查清單 + 通過/失敗 + 截圖檔名 + 核心旅程矩陣
6. **失敗處理** — 修復後重驗該項（沿用 pipeline 慣例：同一項失敗 2 次，停止重複相同嘗試；整理已查核原因、證據與阻塞，能繼續查明的技術問題由 AI 調查，不要交人猜根因或無限重試）
7. **產出 Google 文件驗證報告**（必做）— 把「驗證」區塊 + 核心旅程矩陣 + evidence/ 截圖整理成一份 Google 文件（截圖嵌圖，不是留在本機資料夾），連結記進 task.md「驗證」區塊第一行；操作細節與一次性 rclone 設定見 [verify-report.md](../verify-report.md)
8. 全部通過 → task.md Status → `verified`，進入 finish。「全部」包含：「## 驗證」沒有任何 `- [ ]` 未勾項目、沒有「需要手動驗證」清單、「### 版面探針」全 ✅

---

**完成條件**：上面第 8 步的「全部通過」成立，`task.md` Status 已改成 `verified`。

達成後才讀 [finish.md](finish.md) 發 PR。
