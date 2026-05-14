# 本機開發 AI Backend 推薦 API 回傳空資料

**問題期間：** 2026-04-19
**影響範圍：** 本機開發時，`GET /api/v1/recommendation/topic_cards` 回傳空陣列
**症狀：** 已登入狀態下呼叫推薦 API，資料庫有資料，但 response 固定為 `{ success: true, data: [] }`
**狀態：** 已釐清根本原因，尚待選擇修法方向

---

## 問題描述

本機開發時，前端呼叫 AI backend 推薦 API，雖然使用者已登入且資料庫有資料，但 API 始終回傳空陣列。

**環境：**
- 前端：`http://localhost:3001`
- AI backend：`http://localhost:8002`（本機）
- 主後端：`https://server-dev.daodao.so`（遠端 dev server）

---

## 根本原因分析

### 問題鏈

```
瀏覽器送 request 到 localhost:8002
→ fetchAiBackend 只用 credentials: "include"（帶 cookie）
→ auth_token cookie 是由 server-dev.daodao.so 設的
→ 瀏覽器 cookie domain 隔離：該 cookie 只送回 server-dev.daodao.so
→ localhost:8002 收不到 auth_token
→ dependencies.py get_current_user() 回傳 None
→ recommendation.py 第 90 行 if not user_id: return []
```

### 各層細節

| 層 | 檔案 | 說明 |
|---|------|------|
| **前端 fetcher** | `daodao-f2e/packages/api/src/services/showcase-hooks.ts:62` | `fetchAiBackend` 只設 `credentials: "include"`，沒有主動帶 Authorization header |
| **Cookie 設定** | `daodao-server/src/utils/cookie-config.ts:31-33` | `auth_token` 設定 `httpOnly: true, secure: true, sameSite: 'none'`，domain 綁定到發 cookie 的 host（`server-dev.daodao.so`）|
| **瀏覽器規則** | — | Cookie 只會被送回設定它的 domain，不會跨 domain 送到 `localhost:8002` |
| **AI backend 驗證** | `daodao-ai-backend/src/dependencies.py:22-48` | 優先讀 Authorization header，fallback 讀 `auth_token` cookie；兩者都沒有時回傳 `None` |
| **API 早期回傳** | `daodao-ai-backend/src/routers/recommendation.py:90-91` | `if not user_id: return build_success_response(data=[])` |

### 為何其他 API 正常

呼叫 `https://server-dev.daodao.so/api/v1/...` 的 request 正常有帶 `auth_token`，因為目標 domain 跟 cookie domain 相同。問題只發生在前端直連本機 AI backend 的情況。

---

## 可行修法

### 方案 A：本機也跑 daodao-server（最根本）

把 `daodao-server` 在本機起起來，前端 `NEXT_PUBLIC_API_URL` 改指向 `http://localhost:3000`。
登入後 `auth_token` 由 `localhost` 發出，就能被送到 `localhost:8002`。

- 優點：完全符合真實架構，本機環境自給自足
- 缺點：需要多跑一個 service，setup 較繁瑣

### 方案 B：Next.js API Route 代理 AI backend（推薦的長期解）

前端不直連 `localhost:8002`，改打 `/api/ai/...`（Next.js API Route），
由 server-side 轉發請求到 AI backend，並從 cookie 取出 `auth_token` 後加到 `Authorization: Bearer` header。

```
瀏覽器 → Next.js API Route（same domain，能讀 cookie）
       → AI backend（server-to-server，加上 Authorization header）
```

- 優點：前端不直接曝露 AI backend URL，auth 流程乾淨
- 缺點：需要新增 proxy layer

### 方案 C：AI backend 改由 daodao-server 轉發（server proxy）

在 `daodao-server` 新增 `/api/ai/*` proxy route，轉打 AI backend 並帶上 auth。
前端只打一個 server 即可。

---

## 相關檔案

- `daodao-f2e/packages/api/src/services/showcase-hooks.ts` — `fetchAiBackend` 實作
- `daodao-f2e/packages/api/src/services/recommendation-hooks.ts` — `useTopicRecommendations` hook
- `daodao-ai-backend/src/dependencies.py` — `get_current_user` 依賴注入
- `daodao-ai-backend/src/routers/recommendation.py` — topic_cards endpoint
- `daodao-server/src/utils/cookie-config.ts` — `auth_token` cookie 設定
