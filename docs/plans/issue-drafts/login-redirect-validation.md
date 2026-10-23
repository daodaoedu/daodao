## 發生什麼事

登入頁 `/auth/login?redirect=...` 在使用者**已登入**時，直接跳轉到 `redirect` 參數指定的網址，沒有檢查它是不是站內網址。任何人都能做出一條島島網域開頭的連結，已登入的使用者點下去就被帶到外部網站，例如偽造的登入頁（open redirect，可用於釣魚）。

同一問題已由自動 code review 開過多張卡，但都沒有排進開發，至今（2026-10-23）仍未修：

- [daodao-f2e#663](https://github.com/daodaoedu/daodao-f2e/issues/663)（2026-05-17，含多次自動評估）
- [daodao-f2e#816](https://github.com/daodaoedu/daodao-f2e/issues/816)、[daodao-f2e#899](https://github.com/daodaoedu/daodao-f2e/issues/899)：同一問題的重複卡
- [daodao-f2e#983](https://github.com/daodaoedu/daodao-f2e/issues/983)：OAuth 回跳時前端也未驗證 `state.redirectUrl`（風險較低，見下方）

## 當時怎麼操作

1. 使用者已登入島島。
2. 開啟 `https://<網站>/auth/login?redirect=https://example.com`。
3. 頁面直接跳轉到 `https://example.com`。

- 實際結果：跳到站外網址。
- 期待結果：只接受站內相對路徑（`/` 開頭、不是 `//` 開頭）；其他值一律改回首頁。符合 [OWASP Unvalidated Redirects and Forwards Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html) 的建議。
- 發生情況：依程式碼每次都會發生；尚未在 dev 實際操作重現。

## 證據與補充

f2e `apps/product/src/app/[locale]/auth/login/page.tsx:31-35`：

```ts
if (!isLoading && isAuthenticated) {
  const redirectUrl = searchParams.get("redirect") || "/";
  window.location.href = redirectUrl;
}
```

## 待釐清

- `redirect` 為 `javascript:` 開頭時，`window.location.href` 是否會在島島網域執行程式碼（DOM XSS）：尚未實測，修復時一併以測試覆蓋。

## 技術查核（由 skill 補充）

- 判斷：已確認 bug（安全性），依據為程式碼靜態查核。
- 查核範圍：daodao-f2e `origin/dev` @ `6034e986`；daodao-server `origin/dev`（2026-10-23 fetch）。檔案：f2e `auth/login/page.tsx`、`packages/auth/src/hooks/use-redirect-after-login.ts`、`packages/auth/src/lib/auth-client.ts`；server `src/utils/redirect-validation.ts`、`src/services/auth/oauth.service.ts`、`src/controllers/auth.controller.ts`。
- 重現結果：尚未執行。
- 現況與需求：
  - **有漏洞**：登入頁「已登入 → 直接跳轉」分支（`page.tsx:33-34`），完全沒有驗證。
  - **已有保護**：走 Google OAuth 的路徑，server 以 `isValidRedirectUri` 只允許站內相對路徑或 `daodao://`，不合法就導到 `/auth/error?reason=invalid_redirect_uri`（`oauth.service.ts:251,278`）；前端回跳時也核對 localStorage 的 nonce。因此 #983 的實際風險較低，但前端 `use-redirect-after-login.ts:87-90` 本身仍未驗證，建議一併套用同一個驗證函式。
- 重複卡查核：搜尋 daodaoedu/daodao、daodao-f2e、daodao-server 的 open／closed issues（關鍵字 redirect）；f2e 有上列 4 張，daodao 無中央卡。本卡作為中央卡統一追蹤。
- 原因與已嘗試處理：自動修復曾推出 `fix/code-review-663`、`fix/code-review-663-v2` 分支（含 `isSafeRedirect`），但未建立 PR，現已落後 dev 514 個 commit；建議參考後重做，不直接合併。
- 修復驗收方向：
  - 共用一個「只接受站內相對路徑」的驗證函式，登入頁與 OAuth 回跳都使用；拒絕 `https://`、`//`、`\\`、`javascript:` 等值，改導首頁。
  - 附 regression test：上述惡意值修復前會通過（測試失敗）、修復後被拒絕；正常站內路徑（含 query，例如 `/lighthouse/programs?edit=1`）仍可正常返回。
  - 修好後將 f2e#816、#899 以重複關閉，#663、#983 連結本卡 PR 後關閉。

## AI 交審摘要

- 已檢核與主要依據：f2e 登入頁程式碼、OAuth 前後端驗證、既有重複卡與遺留分支。
- 已修正事項：原先推測 OAuth 路徑也可被利用，查核後確認 server 已擋，改列為低風險並保留前端一致化建議。
- 未驗證限制／需人決策：`javascript:` 是否可執行未實測；尚未在 dev 操作重現。
