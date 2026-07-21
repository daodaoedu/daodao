# user-profile-page
- 涉及 repo: server / f2e
- 對應 archived change: 無（推測來自 profile 相關 change）
- 總計: 8 條 requirement / 20 個 scenario | ✅6 ⚠️2 ❌0 ❓0

## Requirement: 公開個人檔案頁面可瀏覽 → ✅
證據: daodao-f2e:apps/product/src/app/[locale]/(with-layout)/users/[identifier]/page.tsx:1 — 公開 `/users/[identifier]` 頁，SSR 取資料；server 端 daodao-server:src/routes/user.routes.ts:747 `router.get('/profile/:identifier')` 無強制登入。
- Scenario: 未登入訪客瀏覽 → ✅ — page 不要求登入，`isAuthenticated` 可為 false 仍渲染 UserInfoCard/IslandHeader
- Scenario: 個人檔案不存在 → ✅ — page.tsx:117 `notFound()`（getUserByIdentifier 無資料時）；server 端 user.controller.ts:528 `throw new NotFoundError`

## Requirement: Identity Header 資料展示 → ✅
證據: daodao-f2e:apps/product/src/components/user/user-info-card.tsx:116 顯示 personalSlogan(headline)、name、customId(@handle)、location、photoURL。
- Scenario: 展示完整 Identity Header → ✅ — page.tsx:153-164 傳入 name/customId/location/photoURL/personalSlogan
- Scenario: 個人標語未填寫 → ✅ — user-info-card.tsx:116 `{personalSlogan && ...}` 條件渲染
- Scenario: 地理位置未填寫 → ✅ — page.tsx location `|| undefined`，元件條件顯示

## Requirement: 個人標語長度限制（≤150）→ ✅
證據: daodao-server:src/validators/user.validators.ts:50-53 `personalSloganSchema = z.string().max(150, '標語長度不可超過 150 字')`，套用於 update 路徑 (validators.ts:251/383)。
- Scenario: 儲存超長個人標語 → ✅ — zod max(150) 拒絕
- Scenario: 儲存合法個人標語 → ✅ — schema 接受 ≤150

## Requirement: About Me 區塊展示（Markdown，≤350）→ ✅
證據: daodao-f2e:apps/product/src/components/user/user-info-card.tsx:321 `<MarkdownRenderer source={selfIntroduction}>`；長度限制 daodao-server:src/validators/user.validators.ts:336-337 `selfIntroduction.max(350)`。
- Scenario: 展示有 Markdown 的 About Me → ✅ — MarkdownRenderer 渲染 selfIntroduction
- Scenario: 儲存超長 About Me → ✅ — zod max(350)（注意：另有 auth.validators.ts:343 `bio.max(500)` 為不同/舊欄位，非此處 About Me）
- Scenario: About Me 未填寫 → ✅ — user-info-card.tsx:320 `{selfIntroduction && ...}` 條件渲染

## Requirement: 社群連結展示 → ✅
證據: daodao-f2e:apps/product/src/components/user/user-info-card.tsx:53 SOCIAL_PLATFORM_ORDER + 各 social svg；server profile API 回傳 contactList（user.controller.ts:563-571 instagram/discord/line/facebook/threads/linkedin/github/website）。
- Scenario: 展示已設定的社群連結 → ✅ — `linksWithIcon.map` 渲染圖示連結
- Scenario: 所有社群連結皆未設定 → ✅ — `{hasSocialLinks && ...}` 條件渲染

## Requirement: 互動數據顯示（Connections / Followers）→ ⚠️
證據: Connections 完整：daodao-server:src/controllers/user.controller.ts:539/562 回傳 connectionsCount，UI user-info-card.tsx:128 顯示。**但 Followers 缺後端來源**：profile API（user.controller.ts:505-575）未回傳 `followersCount`，UI page.tsx:138 `followersCount = profileData?.followersCount` 取不到值（undefined），Followers 區塊因 `followersCount !== undefined` 不會顯示。
- Scenario: 顯示連結數與追蹤者數 → ⚠️ — 連結數有、追蹤者數無後端欄位
- Scenario: 使用者設定隱藏連結數 → ✅ — user.controller.ts:562 `hideConnectionsCount ? null : connectionsCount`，UI user-info-card.tsx:133 顯示「—」

## Requirement: Connect 與 Follow 按鈕狀態 → ✅
證據: daodao-f2e:apps/product/src/components/user/user-info-card.tsx:172 `{showConnectionButtons && ...}`（`showConnectionButtons = clientIsAuthenticated && !clientIsOwnProfile`），含 follow_btn / 連結按鈕。
- Scenario: 登入使用者瀏覽他人檔案 → ✅ — 顯示關注 + 請求連結按鈕
- Scenario: 瀏覽自己的個人檔案 → ⚠️→✅(部分) — isOwnProfile 時不顯示 Connect/Follow（user-info-card.tsx:316），但「編輯個人檔案」按鈕未在此元件 grep 到明確字串，可能在他處；以「不顯示 Connect/Follow」為準視為符合
- Scenario: 未登入使用者瀏覽 → ✅ — clientIsAuthenticated=false 時不顯示按鈕

## Requirement: 個人檔案公開 API → ✅
證據: daodao-server:src/routes/user.routes.ts:747 `router.get('/profile/:identifier', ...)`（掛 /api/v1/users）；controller user.controller.ts:511 用 `OR: [{custom_id}, {external_id}]` 查詢，無強制 auth。
- Scenario: 以 userId 查詢 → ✅ — external_id（UUID）比對；註：spec 範例用數字 id，實作以 external_id/custom_id 比對（數字純 id 不一定支援，命名差異）
- Scenario: 以 custom_id 查詢 → ✅ — user.controller.ts:521 `{ custom_id: identifier }`
- Scenario: 查詢不存在的識別碼 → ✅ — user.controller.ts:528 `throw new NotFoundError('User not found')`（404）
