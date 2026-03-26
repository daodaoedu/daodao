# 系統架構設計

## 整體架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                      apps/admin (前端)                          │
│                      Next.js 15 + React 19                      │
│                      Port: 3002                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────────────┐             ┌───────────────────────┐
│    daodao-server      │             │   daodao-ai-backend   │
│    (Express/Prisma)   │             │   (FastAPI)           │
│    Port: 3000         │             │   Port: 8000          │
│                       │             │                       │
│  /api/v1/admin/*      │             │  /api/v1/admin/*      │
└───────────┬───────────┘             └───────────┬───────────┘
            │                                     │
     ┌──────┼──────┐                       ┌──────┼──────┐
     │      │      │                       │      │      │
     ▼      ▼      ▼                       ▼      ▼      ▼
┌──────┐┌──────┐┌───────┐            ┌──────┐┌──────┐┌───────┐
│ PG   ││Redis ││MongoDB│            │ PG   ││Redis ││Qdrant │
│      ││Server││       │            │(共享)││ AI   ││       │
└──────┘└──────┘└───────┘            └──────┘└──────┘└───────┘
   │                                    │
   └──────────────┬─────────────────────┘
                  ▼
         ┌───────────────┐
         │ daodao-storage│
         │ (PostgreSQL)  │
         │ Port: 5432    │
         └───────────────┘
```

## 設計原則

### 1. 各服務管理自己的資源

每個後端服務只提供它所連接資源的管理 API：

| 服務 | 管理的資源 |
|------|-----------|
| daodao-server | PostgreSQL, MongoDB, Redis (Server) |
| daodao-ai-backend | Redis (AI), Qdrant, ClickHouse |

### 2. 前端負責聚合顯示

Admin 前端應用從兩個後端服務獲取數據，統一呈現給管理員。

### 3. 權限控制

- 使用現有的 JWT 認證系統
- 新增 `admin` 角色權限
- Admin API 需驗證用戶具有管理員權限

## 技術選型

### 前端 (apps/admin)

```yaml
框架: Next.js 15 (App Router)
UI 庫: @daodao/ui (shadcn/ui)
狀態管理: SWR + React Context
圖表: Recharts
表格: @tanstack/react-table
API 客戶端: openapi-fetch (型別安全)
```

### 後端擴展

```yaml
daodao-server:
  - 新增 /src/routes/admin/ 路由模組
  - 新增 /src/services/admin/ 服務層
  - 新增 /src/middleware/admin-auth.ts 權限中介層

daodao-ai-backend:
  - 新增 /src/routers/admin/ 路由模組
  - 新增 /src/services/admin/ 服務層
  - 複用現有的 JWT 驗證中介層
```

## 網路配置

### 開發環境

```yaml
daodao-server: http://localhost:3000
daodao-ai-backend: http://localhost:8000
admin-frontend: http://localhost:3002
postgresql: localhost:5432
redis-server: localhost:6379
redis-ai: localhost:6380
mongodb: localhost:27017
qdrant: localhost:6333
```

### 生產環境

```yaml
daodao-server: https://dao-server.daoedu.tw
daodao-ai-backend: https://dao-server-ai.daoedu.tw
admin-frontend: https://admin.daoedu.tw
# 資料庫透過內網連接
```

## 安全考量

### API 安全

1. **認證**: JWT Token 驗證
2. **授權**: 檢查用戶角色為 `Admin` 或 `SuperAdmin`
3. **限流**: Admin API 設定較低的請求限制
4. **審計**: 記錄所有 Admin 操作日誌

### 資料庫查詢安全

1. **唯讀模式**: SQL 查詢工具預設只允許 SELECT
2. **查詢限制**: 限制返回行數 (最多 1000 行)
3. **敏感欄位**: 隱藏密碼、Token 等敏感欄位
4. **查詢超時**: 設定 30 秒查詢超時

### 前端安全

1. **路由保護**: 所有 Admin 頁面需登入
2. **角色檢查**: 非管理員重定向到首頁
3. **CSRF 保護**: 使用 SameSite Cookie

## 目錄結構

### daodao-f2e/apps/admin

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard
│   │   ├── (dashboard)/
│   │   ├── services/
│   │   │   ├── page.tsx
│   │   │   ├── daodao-server/
│   │   │   └── ai-backend/
│   │   ├── database/
│   │   │   ├── postgresql/
│   │   │   ├── redis/
│   │   │   │   ├── server/
│   │   │   │   └── ai-backend/
│   │   │   ├── mongodb/
│   │   │   └── qdrant/
│   │   ├── api-docs/
│   │   └── users/
│   ├── components/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── database/
│   │   └── services/
│   ├── lib/
│   │   ├── api/
│   │   └── utils/
│   └── hooks/
├── package.json
├── next.config.ts
└── tailwind.config.ts
```

### daodao-server Admin 模組

```
src/
├── routes/
│   └── admin/
│       ├── index.ts
│       ├── database.routes.ts
│       ├── redis.routes.ts
│       ├── mongodb.routes.ts
│       ├── services.routes.ts
│       └── users.routes.ts
├── services/
│   └── admin/
│       ├── database.service.ts
│       ├── redis.service.ts
│       ├── mongodb.service.ts
│       └── services.service.ts
├── middleware/
│   └── admin-auth.ts
└── validators/
    └── admin/
```

### daodao-ai-backend Admin 模組

```
src/
├── routers/
│   └── admin/
│       ├── __init__.py
│       ├── redis.py
│       ├── qdrant.py
│       ├── clickhouse.py
│       ├── llm.py
│       └── tasks.py
├── services/
│   └── admin/
│       ├── __init__.py
│       ├── redis_admin.py
│       ├── qdrant_admin.py
│       └── llm_admin.py
└── schemas/
    └── admin/
```
