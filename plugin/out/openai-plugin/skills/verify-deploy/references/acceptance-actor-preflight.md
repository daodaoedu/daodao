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
- 只有 organizations／cohorts 時，membership 不代表 owner，joined enrollment 不代表 coach。需要 owner／coach 時使用下方明確權限契約；私密內容可見性與實際操作仍須同帳號網頁證據。
- `googleLogin` 與 `accountActive` 不由此工具證明。工程 dev-login 成功不代表 PM 可 Google 登入；現有 auth/me active 欄位的 controller fallback 不足以可靠判斷停用狀態，不據此填 PASS。
- 新增的檢查是人工執行的交接步驟，未新增 hook 強制閘門。通過不等於瀏覽器重播、部署或正式 PM 驗收通過。

工程別名與固定 fixture 僅供已授權的工程情境；能收信不代表有相同 Google 身分。沿用其他任務帳號或資料前先確認占用。會消耗／破壞資料的情境，另列任務、資料 ID、保留期限、清理及重建方式；PM 驗收前不得套用共用 reset 清除其待驗資料。

## 團主與教練權限

需要權限證據時，不能只填 organizations／cohorts 的成員資格。契約可額外指定：

```json
{
  "organizationOwners": [{"organizationId": 900001}],
  "cohortCoaches": [{
    "organizationId": 900001,
    "programId": 900001,
    "cohortId": 900001,
    "status": "published",
    "proof": "organization-owner"
  }]
}
```

組織必須 active，成員清單中必須有同一登入者的 `role: owner`。工具先以同一 bearer 的 `/auth/me` 核對 UUID、email 及全域角色；之後要求同一 JWT 的 `_id` 與預期 UUID 相同，再以 numeric id 比對成員列，不把自行解碼視為本機驗簽。這依賴現有 server issuer 一起簽入 id 與 external `_id` 的契約（`auth.controller.ts:145-197`）；auth/me 以 external UUID 查本人，管理 middleware 使用 numeric id，因此不是工具獨立查 DB 證明兩者對應。temporary／無 numeric id 的 token 無法提供此證據。

教練檢查核對 organization → program → cohort 的精確父子關係與場次狀態，再依指定 proof：

- `organization-owner`：同一帳號的組織 owner，代表現行產品授予的管理端有效教練存取，**不代表已加入的教練 enrollment**。
- `joined-enrollment`：同一帳號的 enrollment 必須 role=owner 或 assistant，status=joined。invited、exited、removed 或 member 都不算教練證據。

現有管理端 detail／roster API 本身仍要求組織成員資格；只有 enrollment、但無該組織成員資格的身分，這條安全讀取路徑可能 BLOCKED。工具不繞過現有 API 授權、不更改產品角色政策；這種情境需另附可用的實際畫面或經授權讀取證據。

有指定且全部符合的類別才回報 `organizationRole`／`cohortCoachRole: VERIFIED`；未指定維持 NOT_VERIFIED，總結果仍以每條必要檢查為準。Google 登入與 accountActive 仍是 NOT_VERIFIED。資料占用、保留、重建及清理另依[情境契約](acceptance-scenarios.md)。
