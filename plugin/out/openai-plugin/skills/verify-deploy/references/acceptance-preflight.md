# 驗收資料前置檢查

交驗前，以指定 PM 帳號讀取**交接連結的同一筆資料**，確認每條 AC 必要前提。PASS 只代表當下資料可用，不能代替網頁逐步實跑，也不是正式 PM 驗收。

## 實踐資源（#332）

在 daodao checkout 根目錄執行。契約 JSON 放任務目錄或 repo 外；必要值由 AC 推導，不從被測結果反抄。以下 UUID 換成實際交接實踐 ID：

```json
{
  "kind": "practice-resources",
  "accountEmail": "wedialogbox@gmail.com",
  "practiceId": "00000000-0000-4000-8000-000000000001",
  "resourceDays": [2, 5, null],
  "requireUnlocked": true
}
```

`resourceDays` 是全部資源的精確天數多重集：順序不影響，重複天數需要不同資源；null 是未指定天數，缺欄位不當作 null。每筆 `isLocked` 必須明確為 false，不能用名稱、其他筆未鎖定資源或缺少欄位代替。

指定 PM 既有帳號的 dev token 存 repo 外、權限 0600 的暫存檔。取得方式見 develop 的 `references/browser-verify.md` §3a；不建新帳號、不把 token 貼留言、記 log 或放契約。工具不執行登入，正式 PM 發布的 Google 登入規則不變。

```bash
pnpm -s tsx bin/pipeline/acceptance-preflight-cli.ts \
  --contract /path/to/fixture-contract.json \
  --token-file /path/to/private-token.txt \
  --output /path/to/preflight-report.json
```

工具固定唯讀存取 server-dev 的 `/api/v1/users/me` 與指定實踐，不建立、修復或刪資料。查核實際登入 email、實踐擁有者與資源條件；HTTP／登入失敗或欄位缺失不可誤過。成功 exit 0，受阻 exit 非 0，報告列逐項結果與契約 digest。勿因受阻改用工程帳號或另一筆資料。用完清除暫存 token。

## 與網頁實跑一同交付

1. 先跑前置檢查，保存契約、時間、資料連結與結果。缺第 5 天、鎖定資源、錯擁有者等任一必要前提不符，先補資料，不交驗。
2. 瀏覽器確認同一 PM 帳號，從即將發出的留言連結開始，照順序跑每一步，留下可辨識資料與結果的截圖。API PASS 不證明畫面可操作；工程 dev-login 實跑不宣稱正式 PM Google 驗收。
3. 還原實跑變動後再跑前置檢查，確認 PM 接手原始狀態；保留資料至驗收完成。會到期或被共用 reset 修改時，附有效期限與已驗證的重設方式。
4. 工程證據附唯讀報告、網頁實跑報告、還原與保留說明；不把 JSON 欄位或指令放進 PM 步驟。留言仍跑 `acceptance-lint.ts`，它只驗文案。

其他類型先沿用現有對應工具；無工具時保存即時來源、人工核對的 expected／actual、時間、帳號與資料座標，明列未自動化範圍，不冒用本工具的 PASS。安裝在沒有 daodao checkout 的客戶端時，請工程在 checkout 跑工具提供報告，不能宣稱已自動執行。

## 收到 BLOCKED

逐項查證所述前提，保留觀察時間。任一必要前提不足就足以受阻，其他細節不準確不會使驗收變得可執行。今日狀態無法回推先前狀態。

補資料只代表「前置資料已補齊」。同帳號、同資料重跑原受阻與依賴步驟，確認預期結果並還原後，才寫「阻擋已排除」與重新請驗收；無法重跑就明記仍受阻，不讓 PM 再次代查資料能不能用。
