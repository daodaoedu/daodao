# 後台登入與 Dashboard

管理員登入後台，看今日註冊、DAU/WAU/MAU、社群互動、活化率、AI 費用等營運指標。

- 介面：Admin UI（daodao-admin-ui）
- dev 網址／取得方式：https://admin-dev.daodao.so/admin/login → 登入後 /admin/dashboard（nginx 把 `/` 轉到 `/admin/`，vite `base: '/admin/'`）
- 主要程式位置：projects/daodao-admin-ui/src/pages/LoginPage.tsx、src/auth/AuthContext.tsx、src/pages/DashboardPage.tsx
- 依據版本：daodao-admin-ui c835bb3（2026-10-23）

## 子功能
- Google OAuth 登入（導向 `/daodao-server/api/v1/auth/google?redirectUrl=/dashboard&source=admin`，回 `/admin/auth/callback`）
- JWT Token 貼上登入（給 agent／冒煙用）
- Dashboard 指標卡：今日註冊（可展開看今日註冊用戶的活動紀錄）、DAU／WAU／MAU、DAU/MAU 黏著度、迴響／留言／追蹤／連結、Onboarding 完成率、測驗完成率、人物誌解鎖率、AI 總費用、系統健康
- 指標卡點擊開 DrillDownDrawer、ExportButton 匯出

## 怎麼到這頁（使用者視角）
1. 開 https://admin-dev.daodao.so/admin/ → 未登入自動導到 /admin/login。
2. 按「使用 Google 帳號登入」，或按「使用 JWT Token 登入」→ 貼 token →「驗證 Token」。
3. 成功後進 /admin/dashboard；左側欄第一項「Dashboard」。

## 測試帳號與前置條件
- 角色：admin。`/auth/me` 回傳的 roles 必須含 `admin`／`superadmin`／`Admin`／`SuperAdmin` 之一，且 `isTemporary=false`（src/auth/AuthContext.tsx:15、:66-70）。
- agent 最省事的方式：用 server-dev 的 `POST /api/v1/auth/dev-login`（`mode=user`，帶 superadmin 帳號 email；配方見 plugin/skills/develop/references/browser-verify.md:53-66）拿 token，再 `localStorage.setItem('daodao_admin_token', <token>)` 後重新整理（TOKEN_KEY 在 src/api/client.ts:4）。superadmin 是 pg-dev `users.role_id=6`（plugin/skills/develop/references/gotchas.md:25）。
- 本機：`pnpm dev` → http://localhost:5173/admin，`/daodao-server/*` 代理到 `SERVER_DEV_URL`（預設 localhost:4000，vite.config.ts:16-21）。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 登入頁標題 | role=heading name「島島 Admin」 | src/pages/LoginPage.tsx:35-37 |
| Google 登入鈕 | role=button name「使用 Google 帳號登入」 | src/pages/LoginPage.tsx:39-63 |
| 切換 JWT 登入 | role=button name「使用 JWT Token 登入」 | src/pages/LoginPage.tsx:72-78 |
| JWT 輸入框 | `#jwt-token`（label「JWT Token」） | src/pages/LoginPage.tsx:81-93 |
| 送出 Token | role=button name「驗證 Token」（送出中為「驗證中...」） | src/pages/LoginPage.tsx:95-102 |
| 登入失敗訊息 | 文字「驗證失敗：請確認 token 有效且具有 admin 權限」 | src/pages/LoginPage.tsx:19 |
| 側欄 Dashboard 連結 | role=link name「Dashboard」，href `/admin/dashboard` | src/components/layout/Sidebar.tsx:59 |
| 頁面標題 | 文字「Dashboard」（PageHeader title） | src/pages/DashboardPage.tsx:346 |
| 今日註冊用戶區塊 | role=heading name「今日註冊用戶」 | src/pages/DashboardPage.tsx:219 |
| 指標卡 | 卡片標題文字「DAU」「WAU」「MAU」「今日註冊」等 | src/pages/DashboardPage.tsx:421 起 |
| 隱藏側邊欄 | aria-label「隱藏側邊欄」 | src/components/layout/Sidebar.tsx:298 |
| 個別指標數值 | 無穩定選擇器，建議補 data-testid | — |

## 怎樣算成功（可觀察的結果與證據）
- 登入後 `location.pathname === '/admin/dashboard'`，畫面有「Dashboard」標題與指標卡，且 `localStorage.daodao_admin_token` 存在。
- 指標卡顯示數字而不是「載入失敗」。可對照 API：Network 裡 `/daodao-server/api/v1/admin/...` 為 200。
- 非 admin 帳號：callback 頁顯示「此帳號沒有管理員權限」（src/pages/AuthCallbackPage.tsx:16）、token 輸入顯示驗證失敗。

## 陷阱
- 任何 API 回 401／403 都會清掉 token 並強制導回 /admin/login（src/api/client.ts:26-33）；token 過期時頁面會「突然登出」，不是功能壞掉。
- `VITE_USE_PREVIEW_MOCK=true`（只在 dev build）會略過登入並用前端 mock，寫入請求一律擋下（src/config.ts、src/api/client.ts:8-17）；這時看到的數字不是真資料，不能當驗收證據。
- Google 登入在 dev 需要真的 Google 帳號且有 admin 角色，agent 走 JWT／localStorage 注入。
- 登入頁截圖不等於驗證到功能頁（browser-verify.md「登入牆截圖 = 該頁未驗證」）。
