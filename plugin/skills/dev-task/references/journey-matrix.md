# 核心旅程矩陣 — 「使用者能完成任務」的驗收單位

## 為什麼要有這張表

#171 Phase A 的驗證清單全是畫面（列表 menu、pill tab、卡片連動），沒有一條是「填表送出，建立一個場次」。四天後 #188「無法建立場次」：前端 slug 的 HTML `pattern` 是無效正則被瀏覽器整個忽略、server 400 被吞成通用訊息、失敗後表單清空。這三個問題只要**用真實輸入送出一次、用錯誤輸入送出一次**就會露出來。POC 量測比對做得再細，行為驗收沒做等於沒驗。

核心旅程矩陣是 verify 階段的**必填產物**，發 PR 閘門（`pre-pr-gate.sh`）會檢查；CI 的 `pr-evidence-gate` 會檢查 PR body 帶了它的摘要。

## 什麼是「核心旅程」

任務改到的每一條**會寫入資料或觸發後端動作**的使用者路徑：建立、編輯、刪除、送出報名、切換旗標、上傳……。純展示（列表、tab 切換、樣式）不算旅程，走一般檢查清單即可。

判斷方法：看 diff 裡有沒有碰到 `<form`、form `action=`、mutation／POST／PATCH／DELETE 呼叫、server 的 controller／DTO／schema。碰到就有旅程。

## 表格格式（寫在 task.md「## 驗證」底下）

```markdown
### 核心旅程矩陣
| ID | 旅程 | 類型 | 輸入 | FE 規則來源 | BE 規則來源 | 預期結果 | 實際 | 證據 |
|---|---|---|---|---|---|---|---|---|
| J-01 | 建立場次 | 正常 | slug `2026-summer`、名稱含中文與 emoji、日期跨年 | programs-manager.tsx:67（引 openapi pattern） | cohort.schema.ts:42 `^[a-z0-9]+(?:-[a-z0-9]+)*$` | 201，列表出現新場次 | ✅ 201 | evidence/verify-j01.png |
| J-02 | 建立場次 | 錯誤路徑 | slug `26-Summer`（大寫） | 同上 | 同上 | 瀏覽器攔下不發 API，欄位下顯示規則說明 | ✅ 未發請求 | evidence/verify-j02.png |
| J-03 | 建立場次 | 錯誤路徑 | slug 與既有場次重複 | — | cohort.service.ts:88 409 | 顯示 server 訊息「同一系列下不可使用重複 slug」，欄位內容保留 | ✅ 409 訊息可見 | evidence/verify-j03.png |
| J-04 | 編輯場次 | 正常 | 改名稱＋切私密 | … | … | PATCH 200，重整後保留 | ✅ 200 | evidence/verify-j04.png |
```

欄位規則：

- **類型**只有兩種值：`正常`、`錯誤路徑`。**每條旅程至少一列正常、一列錯誤路徑**；錯誤路徑必須是 server 會拒絕的輸入（不是只有前端擋），並確認 server 回的訊息真的顯示在畫面上、失敗後使用者輸入沒被清掉。
- **輸入**寫實際用的值，不寫「合法資料」。從下面的輸入目錄挑，至少包含一種「使用者真的會打的東西」（中文、大寫、空白、貼上來的網址）。
- **FE 規則來源／BE 規則來源**寫 `檔案:行號`。FE 規則若是手寫 regex 常數，必須能對到 server 的同一條規則（`openapi.json` 的 `pattern`／`minLength`／`enum` 或 server schema 檔）；對不到就是缺口，先修再驗。沒有前端規則的旅程 FE 欄寫 `—`。見 [benchmark-gates.md](benchmark-gates.md) 的「驗證規則對齊 signal」。
- **實際**必須帶 HTTP 狀態碼或「未發請求」，來源是攔截到的 response（不是猜的）。
- **證據**是 `evidence/` 截圖檔名；截圖要看得到結果狀態（成功列表／錯誤訊息），錯誤路徑的截圖要能看到訊息文字。
- 只准寫 ✅／❌。❌ 列不能發 PR；修不掉走 Phase 3 的失敗處理。
- **角括號的保留用法**：閘門把 `<…>` 內含非 ASCII 的文字（如模板的 `<建立 X>`、`<輸入>`）和 `<file:line>` 視為未填的佔位列。真實輸入含 `<script>`、`<b>` 這類 ASCII 標籤不受影響；輸入真的要寫中文角括號時改用全形 `〈〉` 或放進反引號外再說明，不要寫 `<測試>`。

## 輸入目錄（每條旅程從這裡挑）

| 類別 | 例子 | 抓到過的 bug |
|---|---|---|
| 真實文字 | 中文、全形標點、emoji、前後空白、連續空白 | 前端 trim 與後端不一致 |
| 大小寫／格式 | slug 大寫、底線、中文；email 大寫；URL 沒有 https:// | #188 slug 無效 pattern |
| 邊界長度 | 剛好 maxLength、超過 1 字、空字串 | 前端沒 maxLength，後端 400 |
| 重複／衝突 | 同名、同 slug、重複報名 | 409 被吞成通用錯誤 |
| 日期／數字 | 結束早於開始、跨年、負數、0、小數 | 前端只擋了其中一種 |
| 選項組合 | 互斥旗標同時開、收費類型免費但填金額 | 連動規則只在 UI 層 |
| 權限／狀態 | 非擁有者、已封存、未登入 | 403 顯示成 500 |

## 怎麼攔 response

- Playwright MCP：送出前 `playwright_expect_response`（url pattern 對 API path），送出後 `playwright_assert_response` 讀 status 與 body。
- claude-in-chrome：送出後 `read_network_requests` 過濾 API path。
- 純後端：curl 的 `-w '%{http_code}'` 加 response body，貼進 task.md。
- 攔到的狀態碼寫進「實際」欄。錯誤路徑還要對照畫面：訊息有沒有出現、和 server body 的 message 是否一致。

## 不適用的情況

任務沒有任何寫入路徑（純樣式、純文件、純重構且行為不變）時，在 task.md「## 驗證」底下寫一行：

```
核心旅程不適用：<原因，例如「純 CSS 對齊，diff 未碰任何 form／mutation／controller」>
```

閘門會放行並留痕。原因寫具體，不能只寫「不適用」。

## 這張表之後的去向

1. **PR body**：`## 驗證證據` 區塊放驗證報告連結 + 矩陣（可省略證據欄）。CI `pr-evidence-gate` 讀這段。
2. **issue comment**：finish 階段的「瀏覽器驗證」摘要引用 J-ID。
3. **合併後冒煙**：`post-merge-wrapup` 在部署後的 dev 環境重跑所有正常列 + 至少一列錯誤路徑，結果寫成「dev 冒煙」表。task.md 刪除前先把矩陣抄進 issue comment，冒煙才有依據。
