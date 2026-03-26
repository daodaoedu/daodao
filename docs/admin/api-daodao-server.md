# daodao-server Admin API 規格

## 概述

在 daodao-server 中新增 `/api/v1/admin/*` 路由，提供資料庫和服務管理功能。

## 認證與授權

所有 Admin API 需要：
1. 有效的 JWT Token (Header: `Authorization: Bearer <token>`)
2. 用戶角色為 `Admin` 或 `SuperAdmin`

```typescript
// middleware/admin-auth.ts
export const requireAdmin = async (req, res, next) => {
  const user = req.user;
  if (!user || !['Admin', 'SuperAdmin'].includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
```

---

## API 端點

### 1. 服務狀態

#### GET /api/v1/admin/services/status

聚合所有服務的健康狀態。

**Response:**
```json
{
  "success": true,
  "data": {
    "daodao_server": {
      "status": "healthy",
      "uptime": 86400,
      "version": "1.0.0",
      "memory": {
        "used": 156000000,
        "total": 512000000
      }
    },
    "ai_backend": {
      "status": "healthy",
      "uptime": 72000,
      "version": "1.0.0"
    },
    "databases": {
      "postgresql": { "status": "connected", "latency_ms": 2 },
      "mongodb": { "status": "connected", "latency_ms": 3 },
      "redis": { "status": "connected", "latency_ms": 1 }
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. PostgreSQL 管理

#### GET /api/v1/admin/db/tables

獲取所有資料表列表。

**Response:**
```json
{
  "success": true,
  "data": {
    "tables": [
      {
        "name": "users",
        "schema": "public",
        "row_count": 15234,
        "size_bytes": 2048000,
        "last_modified": "2024-01-15T10:00:00.000Z"
      },
      {
        "name": "projects",
        "schema": "public",
        "row_count": 8521,
        "size_bytes": 1024000,
        "last_modified": "2024-01-15T09:30:00.000Z"
      }
    ],
    "total_tables": 39,
    "total_size_bytes": 52428800
  }
}
```

#### GET /api/v1/admin/db/tables/:tableName

獲取單一資料表的詳細資訊。

**Parameters:**
- `tableName` (path): 資料表名稱

**Query:**
- `include_sample` (boolean): 是否包含樣本數據，預設 false
- `sample_limit` (number): 樣本數據筆數，預設 10

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "users",
    "schema": "public",
    "row_count": 15234,
    "columns": [
      {
        "name": "id",
        "type": "integer",
        "nullable": false,
        "default": "nextval('users_id_seq')",
        "is_primary": true
      },
      {
        "name": "email",
        "type": "varchar(255)",
        "nullable": false,
        "default": null,
        "is_primary": false
      },
      {
        "name": "created_at",
        "type": "timestamp",
        "nullable": false,
        "default": "now()",
        "is_primary": false
      }
    ],
    "indexes": [
      {
        "name": "users_pkey",
        "columns": ["id"],
        "is_unique": true,
        "is_primary": true
      },
      {
        "name": "users_email_key",
        "columns": ["email"],
        "is_unique": true,
        "is_primary": false
      }
    ],
    "foreign_keys": [
      {
        "column": "role_id",
        "references_table": "roles",
        "references_column": "id"
      }
    ],
    "sample_data": [
      { "id": 1, "email": "user1@example.com", "created_at": "2024-01-01" },
      { "id": 2, "email": "user2@example.com", "created_at": "2024-01-02" }
    ]
  }
}
```

#### POST /api/v1/admin/db/query

執行 SQL 查詢（只允許 SELECT）。

**Request:**
```json
{
  "sql": "SELECT id, email, created_at FROM users WHERE created_at > $1 LIMIT 100",
  "params": ["2024-01-01"],
  "timeout_ms": 30000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "columns": ["id", "email", "created_at"],
    "rows": [
      [1, "user1@example.com", "2024-01-15T10:00:00.000Z"],
      [2, "user2@example.com", "2024-01-15T11:00:00.000Z"]
    ],
    "row_count": 2,
    "execution_time_ms": 15
  }
}
```

**錯誤回應 (非 SELECT 語句):**
```json
{
  "success": false,
  "error": {
    "code": "QUERY_NOT_ALLOWED",
    "message": "Only SELECT statements are allowed"
  }
}
```

#### GET /api/v1/admin/db/stats

獲取資料庫統計資訊。

**Response:**
```json
{
  "success": true,
  "data": {
    "database_size": "256 MB",
    "database_size_bytes": 268435456,
    "total_tables": 39,
    "total_rows": 125000,
    "active_connections": 12,
    "max_connections": 100,
    "cache_hit_ratio": 0.985,
    "top_tables_by_size": [
      { "name": "users", "size_bytes": 52428800, "row_count": 15234 },
      { "name": "resources", "size_bytes": 31457280, "row_count": 8521 }
    ]
  }
}
```

---

### 3. Redis 管理 (Server)

#### GET /api/v1/admin/redis/info

獲取 Redis 伺服器資訊。

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "7.2.0",
    "uptime_seconds": 864000,
    "connected_clients": 12,
    "used_memory_bytes": 47185920,
    "used_memory_human": "45 MB",
    "maxmemory_bytes": 134217728,
    "maxmemory_human": "128 MB",
    "memory_usage_percent": 35.2,
    "total_keys": 1234,
    "keyspace": {
      "db0": { "keys": 1234, "expires": 856 }
    },
    "ops_per_sec": 150
  }
}
```

#### GET /api/v1/admin/redis/keys

獲取 Key 列表。

**Query:**
- `pattern` (string): 匹配模式，預設 `*`
- `cursor` (string): 游標，用於分頁
- `count` (number): 每頁數量，預設 100

**Response:**
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "key": "session:abc123",
        "type": "string",
        "ttl": 3600,
        "memory_bytes": 256
      },
      {
        "key": "rate_limit:192.168.1.1",
        "type": "string",
        "ttl": 60,
        "memory_bytes": 64
      }
    ],
    "cursor": "1234",
    "has_more": true,
    "total_matched": 856
  }
}
```

#### GET /api/v1/admin/redis/key/:key

獲取單一 Key 的值。

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "session:abc123",
    "type": "string",
    "value": "{\"userId\": 123, \"email\": \"user@example.com\"}",
    "ttl": 3600,
    "memory_bytes": 256,
    "encoding": "raw"
  }
}
```

#### DELETE /api/v1/admin/redis/key/:key

刪除 Key。

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "key": "session:abc123"
  }
}
```

#### POST /api/v1/admin/redis/flush-pattern

批量刪除匹配的 Keys。

**Request:**
```json
{
  "pattern": "cache:user:*",
  "dry_run": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pattern": "cache:user:*",
    "matched_count": 156,
    "deleted_count": 0,
    "dry_run": true
  }
}
```

---

### 4. MongoDB 管理

#### GET /api/v1/admin/mongo/collections

獲取所有 Collection 列表。

**Response:**
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "name": "users",
        "document_count": 15234,
        "size_bytes": 8388608,
        "avg_document_size": 550,
        "indexes_count": 3
      }
    ],
    "total_collections": 12,
    "total_size_bytes": 67108864
  }
}
```

#### GET /api/v1/admin/mongo/collections/:name

獲取 Collection 詳細資訊。

**Query:**
- `include_sample` (boolean): 是否包含樣本文檔
- `sample_limit` (number): 樣本數量

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "users",
    "document_count": 15234,
    "size_bytes": 8388608,
    "indexes": [
      { "name": "_id_", "keys": { "_id": 1 }, "unique": true },
      { "name": "email_1", "keys": { "email": 1 }, "unique": true }
    ],
    "sample_documents": [
      { "_id": "...", "email": "user@example.com", "name": "John" }
    ]
  }
}
```

#### POST /api/v1/admin/mongo/query

執行 MongoDB 查詢（只允許 find）。

**Request:**
```json
{
  "collection": "users",
  "filter": { "created_at": { "$gte": "2024-01-01" } },
  "projection": { "email": 1, "name": 1 },
  "limit": 100,
  "sort": { "created_at": -1 }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      { "_id": "...", "email": "user@example.com", "name": "John" }
    ],
    "count": 1,
    "execution_time_ms": 5
  }
}
```

---

### 5. 用戶管理

#### GET /api/v1/admin/users

獲取用戶列表（管理用）。

**Query:**
- `page` (number): 頁碼
- `limit` (number): 每頁數量
- `role` (string): 角色篩選
- `search` (string): 搜尋 (email, name)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "uuid": "abc-123",
        "email": "admin@example.com",
        "name": "Admin User",
        "role": "Admin",
        "status": "active",
        "created_at": "2024-01-01T00:00:00.000Z",
        "last_login": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_items": 100,
      "items_per_page": 10
    }
  }
}
```

#### PUT /api/v1/admin/users/:id/role

更新用戶角色。

**Request:**
```json
{
  "role": "Admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "role": "Admin",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 錯誤碼

| 錯誤碼 | HTTP 狀態碼 | 說明 |
|--------|-------------|------|
| UNAUTHORIZED | 401 | 未提供或無效的 Token |
| FORBIDDEN | 403 | 無管理員權限 |
| TABLE_NOT_FOUND | 404 | 資料表不存在 |
| KEY_NOT_FOUND | 404 | Redis Key 不存在 |
| QUERY_NOT_ALLOWED | 400 | 不允許的 SQL 語句 |
| QUERY_TIMEOUT | 408 | 查詢超時 |
| INTERNAL_ERROR | 500 | 內部錯誤 |

---

## 實作檔案

```
src/routes/admin/
├── index.ts              # 路由註冊
├── database.routes.ts    # PostgreSQL 路由
├── redis.routes.ts       # Redis 路由
├── mongodb.routes.ts     # MongoDB 路由
├── services.routes.ts    # 服務狀態路由
└── users.routes.ts       # 用戶管理路由

src/services/admin/
├── database.service.ts   # PostgreSQL 服務
├── redis.service.ts      # Redis 服務
├── mongodb.service.ts    # MongoDB 服務
└── services.service.ts   # 服務聚合

src/validators/admin/
├── database.validator.ts
├── redis.validator.ts
└── users.validator.ts
```
