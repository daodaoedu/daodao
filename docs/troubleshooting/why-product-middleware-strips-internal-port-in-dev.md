# 為什麼 `apps/product/src/middleware.ts` 要過濾 `:3001`

**最後更新：** 2026-05-09  
**問題範圍：** `daodao-f2e/apps/product/src/middleware.ts`  
**現況：** 已有治症狀 filter；根因仍偏向 runtime / proxy / request header 汙染，尚未完全釘死

---

## 結論先講

這段 filter 不是在修產品邏輯，也不是在修 OAuth 本身，而是在修 **i18n redirect response 的 `Location` header 偶發被帶入內部 listen port `:3001`**。

`product` app 跑在 Next.js standalone，容器內 listen `3001`。當某些 dev 環境請求進到 `next-intl` middleware 時，middleware 產出的 redirect `Location` 偶爾會變成：

```text
https://app-dev.daodao.so:3001/en/auth/login?redirect=%2F
```

對瀏覽器來說，這是外部不可達的 URL，最後就會導向 `ERR_CONNECTION_TIMED_OUT`。  
因此現在的 filter 只是把 **不應該暴露到外部的內部 port** 拿掉，避免使用者真的被送去 `:3001`。

---

## 這段 middleware 實際做了什麼

`[middleware.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/middleware.ts:1)` 先呼叫 `@daodao/i18n/middleware`，而這個 package 只是直接 re-export `next-intl/middleware`：

- `[packages/i18n/src/middleware.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/i18n/src/middleware.ts:1)`
- `[packages/i18n/src/routing.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/i18n/src/routing.ts:3)`

所以目前 `product` middleware 的職責其實是兩段：

1. 讓 `next-intl` 依 `localePrefix: "as-needed"` 補 locale redirect。
2. 如果 redirect `Location` 含 `:3001`，就在 response 出站前把它清掉。

也就是說，`filter` 攔的是 **middleware 已經生成好的 redirect header**，不是在改 router push、也不是在改 auth redirect。

---

## 為什麼會在這裡出現 `Location`

這個 app 的 middleware matcher 會攔所有非 `/api`、非 `/_next`、非靜態檔的頁面請求：

- `[middleware.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/middleware.ts:50)`

而 `routing.ts` 設的是：

```ts
localePrefix: "as-needed"
```

所以像 `/auth/login`、`/auth/error`、`/` 這些沒有 locale 前綴的請求，都可能先經過 `next-intl`，由它回一個 `307` 把路徑改成 `/en/...` 或其他 locale path。

換句話說，**會產生 `Location` 的不是 auth code，而是 i18n middleware 的 locale redirect**。  
這也和既有分析一致：看到的 `307` 是 locale redirect，不是 OAuth error 本身。

參考：

- `[google-oauth-stuck-on-account-chooser.md](/Users/xiaoxu/Projects/daodao/docs/troubleshooting/google-oauth-stuck-on-account-chooser.md:234)`
- `[auth-error/analysis.md](/Users/xiaoxu/Projects/daodao/docs/troubleshooting/auth-error/analysis.md:24)`

---

## 為什麼判斷這不是 app 邏輯自己組出來的

目前證據比較一致地指向：**是 request URL / forwarded headers 在 dev 偶發帶了內部 port，然後被 `next-intl` / Next.js 用來組 absolute redirect URL。**

### 1. `middleware.ts` 本身沒有主動組 `:3001`

目前檔案裡唯一跟 `3001` 有關的程式碼，就是後來加上的 cleanup regex：

- `[middleware.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/middleware.ts:16)`

它不是 source，只是補救。

### 2. `@daodao/i18n/middleware` 沒有自訂邏輯

`packages/i18n/src/middleware.ts` 只有一行：

```ts
export { default } from "next-intl/middleware";
```

所以真正生成 redirect 的是 `next-intl` / Next.js runtime，不是 DaoDao 自己手寫的 URL 組裝。

### 3. repo 內 dev / prod 的 app 程式碼與 compose 都是對稱的

`product` 的 dev/prod 都是：

- 容器內 `PORT=3001`
- `HOSTNAME=0.0.0.0`
- 只 `expose: "3001"`，不直接對外 publish

參考：

- `[daodao-f2e/docker-compose.yaml](/Users/xiaoxu/Projects/daodao/daodao-f2e/docker-compose.yaml:38)`
- `[daodao-f2e/docker-compose.yaml](/Users/xiaoxu/Projects/daodao/daodao-f2e/docker-compose.yaml:109)`

這代表 `:3001` 本來就只應存在於 **容器內部**，正常情況不該出現在外部使用者看到的 redirect URL。

### 4. repo 內 nginx product dev/prod 設定也是對稱的

git 版的 `daodao-infra/nginx/conf.d/product.conf`，prod / dev / feat 都有：

- `proxy_set_header Host $host`
- `proxy_set_header X-Forwarded-Proto https`

參考：

- `[product.conf](/Users/xiaoxu/Projects/daodao/daodao-infra/nginx/conf.d/product.conf:1)`
- `[proxy-headers-ws.conf](/Users/xiaoxu/Projects/daodao/daodao-infra/nginx/snippets/proxy-headers-ws.conf:1)`

所以若 prod 沒事、dev 有事，**更像是線上部署版本漂移、代理鏈差異、或某組 request headers 只在 dev 流程被打出來**，而不是 repo 內存在一段只對 dev 生效的商業邏輯。

---

## 為什麼只在 dev 被觀察到

目前比較合理的說法是「**只在 dev 被觀察到**」，不是「程式碼保證只在 dev 發生」。

### 高信心原因

1. `:3001` 就是 `product` 容器的內部 listen port。  
   這種值會出現在 `Location`，通常表示上游在組 absolute URL 時用了被污染的 request metadata。

2. 既有調查中，curl 很難重現，但瀏覽器完整流程會中。  
   這表示觸發條件可能和 cookie、`Sec-Fetch-*`、RSC request header、client navigation 有關，不是單純 path 決定。

3. dev 有 logging，prod 沒有。  
   `daodao-f2e/docker-compose.yaml` 中：
   - `dev_product` 用 `json-file`
   - `prod_product` 用 `logging: driver: "none"`

   所以 dev 比較容易看見這類偶發問題，prod 就算偶發，也缺少同等級證據。

### 中信心原因

1. 線上 nginx 版本曾經和 git 不一致。  
   既有 troubleshooting 已記錄：某次檢查時，線上 nginx 缺少 repo 內已有的 `X-Forwarded-Proto https`。這雖然不直接解釋 `:3001`，但證明 **dev/prod 實際部署狀態不一定完全等於 repo**。

2. dev 流程更常踩到未登入首頁 → client route guard → `/auth/login` → locale redirect。  
   這條路徑剛好最容易觸發 `next-intl` middleware 產生 `307 Location`，因此更容易看到問題。

---

## 為什麼 filter 寫在 `middleware.ts`

這個位置是目前最合理的止血點，原因有三個：

1. 問題就發生在 middleware redirect response。  
   `next-intl` 回完 response 後，這裡是最後一個能無侵入修正 `Location` 的地方。

2. 不需要 fork `next-intl` 或改 Next.js runtime。  
   先在自己 app 邊界層把錯誤 header 清掉，成本最低。

3. 可以順手記錄觸發上下文。  
   現在這段 patch 會在命中時記錄：
   - `host`
   - `x-forwarded-host`
   - `x-forwarded-port`
   - `x-forwarded-proto`
   - `referer`
   - `sec-fetch-*`
   - 是否帶 cookie
   - 是否帶 RSC header

   這些資訊正是後續要釘 root cause 最需要的資料。

---

## 目前最合理的根因假說

依目前證據，最可能是下面其中一種，且都屬於 **request metadata 被帶壞**：

1. `next-intl` middleware 在組 locale redirect 時，使用了帶內部 port 的 `request.nextUrl`。
2. Next.js standalone server 在某些 request header 組合下，把 container `PORT=3001` 混進 absolute redirect URL。
3. dev 代理鏈某一層把 `Host` / `X-Forwarded-*` 帶成了內部值，但只在特定瀏覽器 navigation / RSC fetch 發生。

目前沒有足夠證據證明是哪一個，但三者的共同點都一樣：  
**真正的 source 不在業務邏輯，而在 request URL 被組裝成 redirect URL 的那一層。**

---

## 為什麼 prod 沒這個文件中的 filter 問題

嚴格說，prod 不是「沒有這段 filter」，而是 `product` app 的同一份 `middleware.ts` 已經包含這段 filter。  
真正的差異是：

- 問題最早是在 dev 被觀察到
- 目前沒有證據顯示 prod 仍會產生 `Location: ...:3001`
- 即使 prod 偶發，prod logging 關閉，也很難像 dev 一樣留下可用證據

所以更精確的說法應該是：

> 這段 filter 是因為 dev 曾觀察到 `next-intl` redirect 暴露內部 port 而補上的保護；  
> prod 沒被觀察到同樣症狀，不代表理論上完全不可能，只是目前沒有證據。

---

## 後續如果要治本，下一步該看哪裡

1. 先抓 middleware 命中 log。  
   關鍵是 `original`、`host`、`x-forwarded-host`、`x-forwarded-port`、`x-forwarded-proto`、`hasRsc`。

2. 比對同一時間點的 nginx access log / reverse proxy header。  
   看送進 `dev_product` 容器前，`Host` 與 forwarded headers 是否已經帶錯。

3. 用命中的 header 組合重放請求。  
   一旦能穩定重現，就能確認是 nginx、Next.js 還是 `next-intl` 在組 URL 時出錯。

4. 若確認是 runtime 行為，再決定是否：
   - 在 proxy 明確補 `X-Forwarded-Port 443`
   - 在 app 前層統一覆寫 host/proto/port
   - 升級或 patch `next-intl` / Next.js

---

## 相關檔案

- `[daodao-f2e/apps/product/src/middleware.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/apps/product/src/middleware.ts:1)`
- `[daodao-f2e/packages/i18n/src/middleware.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/i18n/src/middleware.ts:1)`
- `[daodao-f2e/packages/i18n/src/routing.ts](/Users/xiaoxu/Projects/daodao/daodao-f2e/packages/i18n/src/routing.ts:1)`
- `[daodao-f2e/docker-compose.yaml](/Users/xiaoxu/Projects/daodao/daodao-f2e/docker-compose.yaml:38)`
- `[daodao-infra/nginx/conf.d/product.conf](/Users/xiaoxu/Projects/daodao/daodao-infra/nginx/conf.d/product.conf:1)`
- `[daodao-infra/nginx/snippets/proxy-headers-ws.conf](/Users/xiaoxu/Projects/daodao/daodao-infra/nginx/snippets/proxy-headers-ws.conf:1)`
- `[docs/troubleshooting/google-oauth-stuck-on-account-chooser.md](/Users/xiaoxu/Projects/daodao/docs/troubleshooting/google-oauth-stuck-on-account-chooser.md:217)`
- `[docs/troubleshooting/auth-error/analysis.md](/Users/xiaoxu/Projects/daodao/docs/troubleshooting/auth-error/analysis.md:1)`
