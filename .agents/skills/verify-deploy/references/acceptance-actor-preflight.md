# 帳號與情境唯讀前置檢查

工程在同帳號網頁重播之前執行；PM 正式驗收仍用 Google。此工具不建立帳號、不改角色、不加入組織／場次、不重設 seed。預期帳號名單見 [actors.json](../../test-acceptance/references/actors.json)，登入與角色規則見 [environment.md](../../test-acceptance/references/environment.md)。名單記錄 2026-11-07 查核結果；每次執行須重新讀即時 API，不能把名單當成權限快照。

## 契約

將本次指定的 PM 身分與情境存成 JSON。#480 一般使用者範例：

```json
{
  "kind": "actor-access",
  "accountId": "6a542fe3-7bba-42f7-844a-deb9489bd85e",
  "accountEmail": "tlshare123@gmail.com",
  "expectedRoles": ["User"]
}
```

管理員用 registry 的 `pm-admin`：UUID `99ce484c-d37d-488b-9e8d-080ba703864f`、`peichun1213@gmail.com`、`["Admin"]`。`wedialogbox@gmail.com` 目前為 Admin，不能填為 User；不符時 BLOCKED，不自動降權。角色集合必須完全相同，SuperAdmin 不代替 Admin，也不代替 User。

需要組織或已加入場次時，在同一份契約加入必要項目，例如：

```json
{
  "organizations": [{"organizationId": 900001, "status": "active"}],
  "cohorts": [{"cohortId": 900001, "status": "published"}]
}
```

以上數字與狀態僅展示格式，須替換為本次已準備並保留給 PM 的實際資料。`cohorts.status` 是場次狀態，不是 enrollment 狀態；`/me/cohorts` 本身只列 joined enrollment。沒有組織／場次需求才省略這兩欄，不以省略掩蓋必要前提。

## 執行

由已授權的工程登入流程取得**指定同一帳號**的 token，存在 repo 外的私人檔案（權限 0600），不要放進參數、報告或 Git。工具不提供登入、只讀取 token；完成後刪除私人檔案。

```sh
pnpm -s tsx bin/pipeline/acceptance-actor-preflight-cli.ts \
  --contract /private/path/actor-contract.json \
  --token-file /private/path/actor-token.txt \
  --output /private/path/actor-report.json
```

PASS exit 0，BLOCKED exit 1，參數／輸出檔錯誤 exit 2。保存契約、digest、檢查時間與報告，引用於工程驗收證據。輸出不能覆蓋契約或 token 檔。固定 dev origin、GET-only、禁止 redirect；輸入不接受自訂 URL 或 HTTP method。

## 判讀

- `/auth/me` 核對 external UUID、email 與完整全域角色集合。401、403、讀取失敗、缺欄位或契約不符皆 BLOCKED。
- `/lighthouse/organizations` 核對本人可列出的指定組織與組織狀態；`/me/cohorts` 核對本人已加入的指定場次及場次狀態。
- 組織 membership 不代表 owner，joined enrollment 不代表 coach。這兩種管理權限、私密內容可見性與實際操作仍須另附權限讀取／同帳號網頁證據；本工具不能代替。
- `googleLogin` 與 `accountActive` 不由此工具證明。工程 dev-login 成功不代表 PM 可 Google 登入；現有 auth/me active 欄位的 controller fallback 不足以可靠判斷停用狀態，不據此填 PASS。
- 新增的檢查是人工執行的交接步驟，未新增 hook 強制閘門。通過不等於瀏覽器重播、部署或正式 PM 驗收通過。

工程別名與固定 fixture 僅供已授權的工程情境；能收信不代表有相同 Google 身分。沿用其他任務帳號或資料前先確認占用。會消耗／破壞資料的情境，另列任務、資料 ID、保留期限、清理及重建方式；PM 驗收前不得套用共用 reset 清除其待驗資料。
