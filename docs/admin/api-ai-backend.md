# daodao-ai-backend Admin API 規格

## 概述

在 daodao-ai-backend 中新增 `/api/v1/admin/*` 路由，提供 AI 服務、向量庫和快取管理功能。

## 認證與授權

所有 Admin API 需要：
1. 有效的 JWT Token (Header: `Authorization: Bearer <token>`)
2. 用戶角色為 `Admin` 或 `SuperAdmin`

```python
# middleware/admin_auth.py
from fastapi import Depends, HTTPException, status
from src.dependencies import get_current_user

async def require_admin(user_id: str = Depends(get_current_user)):
    # 從資料庫查詢用戶角色
    user = await get_user_with_role(user_id)
    if user.role not in ['Admin', 'SuperAdmin']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user
```

---

## API 端點

### 1. 服務狀態

#### GET /api/v1/admin/service/status

獲取 AI Backend 服務狀態。

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "daodao-ai-backend",
    "version": "1.0.0",
    "status": "healthy",
    "uptime_seconds": 72000,
    "environment": "production",
    "python_version": "3.12.0",
    "memory": {
      "used_mb": 512,
      "total_mb": 2048,
      "percent": 25.0
    },
    "cpu_percent": 15.5,
    "workers": 4,
    "connections": {
      "postgresql": "connected",
      "redis": "connected",
      "qdrant": "connected"
    }
  }
}
```

#### GET /api/v1/admin/service/metrics

獲取 Prometheus 指標摘要。

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": {
      "total": 125000,
      "success": 124500,
      "errors": 500,
      "error_rate": 0.004
    },
    "latency": {
      "p50_ms": 45,
      "p95_ms": 120,
      "p99_ms": 250
    },
    "endpoints": [
      {
        "path": "/api/v1/recommendation/rank_feed",
        "requests": 80000,
        "avg_latency_ms": 35
      },
      {
        "path": "/api/v1/feedback/generate",
        "requests": 5000,
        "avg_latency_ms": 2500
      }
    ]
  }
}
```

---

### 2. Redis 管理 (AI Backend)

#### GET /api/v1/admin/redis/info

獲取 Redis (AI) 伺服器資訊。

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "7.2.0",
    "uptime_seconds": 72000,
    "connected_clients": 8,
    "used_memory_bytes": 134217728,
    "used_memory_human": "128 MB",
    "maxmemory_bytes": 536870912,
    "maxmemory_human": "512 MB",
    "memory_usage_percent": 25.0,
    "total_keys": 5678,
    "keyspace": {
      "db0": { "keys": 5678, "expires": 5000 }
    },
    "ops_per_sec": 85,
    "key_categories": {
      "recommendation_cache": 3500,
      "task_status": 1200,
      "rate_limit": 978
    }
  }
}
```

#### GET /api/v1/admin/redis/keys

獲取 Key 列表。

**Query:**
- `pattern` (string): 匹配模式，預設 `*`
- `cursor` (string): 游標
- `count` (number): 數量，預設 100

**Response:**
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "key": "rank_feed:user:123:idea",
        "type": "string",
        "ttl": 21600,
        "memory_bytes": 4096,
        "description": "用戶 123 的 idea 推薦快取"
      },
      {
        "key": "feedback_task:abc123",
        "type": "hash",
        "ttl": -1,
        "memory_bytes": 512,
        "description": "反饋生成任務狀態"
      }
    ],
    "cursor": "5678",
    "has_more": true
  }
}
```

#### DELETE /api/v1/admin/redis/key/{key}

刪除 Key。

#### POST /api/v1/admin/redis/clear-cache

清除特定類型的快取。

**Request:**
```json
{
  "cache_type": "recommendation",
  "user_id": null,
  "dry_run": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cache_type": "recommendation",
    "pattern": "rank_feed:*",
    "matched_count": 3500,
    "deleted_count": 0,
    "dry_run": true
  }
}
```

---

### 3. Qdrant 向量庫管理

#### GET /api/v1/admin/qdrant/collections

獲取所有 Collection 列表。

**Response:**
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "name": "daodao_collection",
        "status": "green",
        "vectors_count": 125000,
        "points_count": 125000,
        "segments_count": 4,
        "disk_size_bytes": 536870912,
        "ram_size_bytes": 134217728,
        "config": {
          "vector_size": 768,
          "distance": "Cosine",
          "on_disk": false
        }
      }
    ],
    "total_collections": 1
  }
}
```

#### GET /api/v1/admin/qdrant/collections/{name}

獲取 Collection 詳細資訊。

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "daodao_collection",
    "status": "green",
    "vectors_count": 125000,
    "config": {
      "vector_size": 768,
      "distance": "Cosine",
      "hnsw_config": {
        "m": 16,
        "ef_construct": 100
      },
      "quantization_config": null
    },
    "payload_schema": {
      "entity_type": "keyword",
      "entity_id": "integer",
      "content": "text",
      "created_at": "datetime"
    },
    "optimizer_status": "ok",
    "indexed_vectors_count": 125000
  }
}
```

#### GET /api/v1/admin/qdrant/collections/{name}/sample

獲取樣本向量點。

**Query:**
- `limit` (number): 數量，預設 10
- `with_vectors` (boolean): 是否包含向量，預設 false

**Response:**
```json
{
  "success": true,
  "data": {
    "points": [
      {
        "id": "abc123",
        "payload": {
          "entity_type": "idea",
          "entity_id": 456,
          "content": "學習 Python 程式設計",
          "created_at": "2024-01-15T10:00:00Z"
        },
        "vector": null
      }
    ],
    "total_count": 125000
  }
}
```

#### POST /api/v1/admin/qdrant/collections/{name}/search

執行向量搜索測試。

**Request:**
```json
{
  "query_text": "如何學習程式設計",
  "limit": 10,
  "filter": {
    "entity_type": "idea"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "abc123",
        "score": 0.92,
        "payload": {
          "entity_type": "idea",
          "entity_id": 456,
          "content": "學習 Python 程式設計入門"
        }
      }
    ],
    "search_time_ms": 15
  }
}
```

#### DELETE /api/v1/admin/qdrant/collections/{name}/points

刪除向量點（按條件）。

**Request:**
```json
{
  "filter": {
    "entity_type": "idea",
    "entity_id": 456
  },
  "dry_run": true
}
```

---

### 4. LLM 服務管理

#### GET /api/v1/admin/llm/status

獲取 LLM 後端狀態。

**Response:**
```json
{
  "success": true,
  "data": {
    "backends": [
      {
        "name": "gemini",
        "status": "available",
        "model": "gemini-1.5-pro",
        "last_check": "2024-01-15T10:30:00Z"
      },
      {
        "name": "openai",
        "status": "available",
        "model": "gpt-4",
        "last_check": "2024-01-15T10:30:00Z"
      },
      {
        "name": "ollama",
        "status": "unavailable",
        "model": "llama2",
        "error": "Connection refused",
        "last_check": "2024-01-15T10:30:00Z"
      }
    ],
    "default_backend": "gemini"
  }
}
```

#### GET /api/v1/admin/llm/usage

獲取 LLM 使用統計。

**Query:**
- `start_date` (string): 開始日期
- `end_date` (string): 結束日期
- `backend` (string): 篩選特定後端

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-15"
    },
    "total_requests": 5000,
    "total_tokens": {
      "input": 2500000,
      "output": 750000,
      "total": 3250000
    },
    "estimated_cost_usd": 45.50,
    "by_backend": [
      {
        "backend": "gemini",
        "requests": 4000,
        "tokens": 2600000,
        "cost_usd": 32.50
      },
      {
        "backend": "openai",
        "requests": 1000,
        "tokens": 650000,
        "cost_usd": 13.00
      }
    ],
    "by_day": [
      { "date": "2024-01-15", "requests": 350, "tokens": 250000 }
    ]
  }
}
```

#### POST /api/v1/admin/llm/test

測試 LLM 後端連接。

**Request:**
```json
{
  "backend": "gemini",
  "prompt": "Hello, this is a test."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backend": "gemini",
    "response": "Hello! I received your test message.",
    "latency_ms": 850,
    "tokens": {
      "input": 10,
      "output": 8
    }
  }
}
```

---

### 5. 任務隊列管理 (Celery)

#### GET /api/v1/admin/tasks/status

獲取任務隊列狀態。

**Response:**
```json
{
  "success": true,
  "data": {
    "broker": {
      "type": "redis",
      "connected": true,
      "url": "redis://redis-prod:6379/0"
    },
    "workers": [
      {
        "name": "celery@worker1",
        "status": "online",
        "active_tasks": 2,
        "processed": 15000,
        "uptime_seconds": 72000
      }
    ],
    "queues": [
      {
        "name": "default",
        "pending": 5,
        "active": 2
      },
      {
        "name": "feedback",
        "pending": 12,
        "active": 1
      }
    ]
  }
}
```

#### GET /api/v1/admin/tasks/history

獲取最近任務歷史。

**Query:**
- `limit` (number): 數量，預設 50
- `status` (string): 篩選狀態 (pending, running, done, error)
- `task_type` (string): 任務類型

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "task_id": "abc123",
        "task_type": "generate_feedback",
        "status": "done",
        "created_at": "2024-01-15T10:00:00Z",
        "started_at": "2024-01-15T10:00:01Z",
        "completed_at": "2024-01-15T10:00:35Z",
        "duration_seconds": 34,
        "result": "success",
        "error": null
      },
      {
        "task_id": "def456",
        "task_type": "generate_feedback",
        "status": "error",
        "created_at": "2024-01-15T09:55:00Z",
        "started_at": "2024-01-15T09:55:01Z",
        "completed_at": "2024-01-15T09:55:05Z",
        "duration_seconds": 4,
        "result": null,
        "error": "LLM rate limit exceeded"
      }
    ],
    "stats": {
      "total": 500,
      "done": 480,
      "error": 15,
      "pending": 5
    }
  }
}
```

#### POST /api/v1/admin/tasks/{task_id}/retry

重試失敗的任務。

**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": "def456",
    "new_task_id": "ghi789",
    "status": "pending"
  }
}
```

#### DELETE /api/v1/admin/tasks/{task_id}

取消任務。

---

### 6. ClickHouse 管理 (如果啟用)

#### GET /api/v1/admin/clickhouse/status

獲取 ClickHouse 狀態。

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "disabled",
    "message": "ClickHouse is currently disabled in configuration"
  }
}
```

#### GET /api/v1/admin/clickhouse/tables

獲取表列表（當啟用時）。

#### POST /api/v1/admin/clickhouse/query

執行查詢（當啟用時）。

---

## 錯誤碼

| 錯誤碼 | HTTP 狀態碼 | 說明 |
|--------|-------------|------|
| UNAUTHORIZED | 401 | 未提供或無效的 Token |
| FORBIDDEN | 403 | 無管理員權限 |
| COLLECTION_NOT_FOUND | 404 | Qdrant Collection 不存在 |
| KEY_NOT_FOUND | 404 | Redis Key 不存在 |
| TASK_NOT_FOUND | 404 | 任務不存在 |
| LLM_BACKEND_ERROR | 502 | LLM 後端連接失敗 |
| INTERNAL_ERROR | 500 | 內部錯誤 |

---

## 實作檔案

```
src/routers/admin/
├── __init__.py           # 路由註冊
├── service.py            # 服務狀態路由
├── redis.py              # Redis 路由
├── qdrant.py             # Qdrant 路由
├── llm.py                # LLM 管理路由
├── tasks.py              # 任務隊列路由
└── clickhouse.py         # ClickHouse 路由

src/services/admin/
├── __init__.py
├── redis_admin.py        # Redis 管理服務
├── qdrant_admin.py       # Qdrant 管理服務
├── llm_admin.py          # LLM 管理服務
└── task_admin.py         # 任務管理服務

src/schemas/admin/
├── __init__.py
├── service.py            # 服務狀態 Schema
├── redis.py              # Redis Schema
├── qdrant.py             # Qdrant Schema
├── llm.py                # LLM Schema
└── tasks.py              # 任務 Schema
```
