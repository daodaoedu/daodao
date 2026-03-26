# 實作計劃

## 概述

本文件定義後台管理系統的實作階段、任務清單和優先順序。

---

## 階段規劃

### Phase 1: 基礎架構

**目標:** 建立後端 Admin API 和前端應用骨架

#### 1.1 daodao-server Admin API

```
檔案位置: daodao-server/src/

任務清單:
├── [ ] 建立 routes/admin/ 目錄結構
├── [ ] 實作 admin-auth 中介層 (角色驗證)
├── [ ] 實作 services.routes.ts (服務狀態)
│       └── GET /admin/services/status
├── [ ] 實作 database.routes.ts (PostgreSQL)
│       ├── GET /admin/db/tables
│       ├── GET /admin/db/tables/:name
│       ├── GET /admin/db/stats
│       └── POST /admin/db/query
├── [ ] 實作 redis.routes.ts
│       ├── GET /admin/redis/info
│       ├── GET /admin/redis/keys
│       ├── GET /admin/redis/key/:key
│       └── DELETE /admin/redis/key/:key
├── [ ] 實作 mongodb.routes.ts
│       ├── GET /admin/mongo/collections
│       └── GET /admin/mongo/collections/:name
└── [ ] 更新 OpenAPI spec
```

#### 1.2 daodao-ai-backend Admin API

```
檔案位置: daodao-ai-backend/src/

任務清單:
├── [ ] 建立 routers/admin/ 目錄結構
├── [ ] 實作 admin 權限驗證 (複用現有 JWT)
├── [ ] 實作 service.py (服務狀態)
│       ├── GET /admin/service/status
│       └── GET /admin/service/metrics
├── [ ] 實作 redis.py
│       ├── GET /admin/redis/info
│       ├── GET /admin/redis/keys
│       └── DELETE /admin/redis/key/{key}
├── [ ] 實作 qdrant.py
│       ├── GET /admin/qdrant/collections
│       ├── GET /admin/qdrant/collections/{name}
│       └── POST /admin/qdrant/collections/{name}/search
├── [ ] 實作 llm.py
│       ├── GET /admin/llm/status
│       └── GET /admin/llm/usage
└── [ ] 實作 tasks.py (Celery)
        ├── GET /admin/tasks/status
        └── GET /admin/tasks/history
```

#### 1.3 前端 apps/admin 骨架

```
檔案位置: daodao-f2e/apps/admin/

任務清單:
├── [ ] 初始化 Next.js 應用
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── tsconfig.json
├── [ ] 設定 monorepo 依賴
│       ├── @daodao/ui
│       ├── @daodao/api
│       └── @daodao/auth
├── [ ] 建立基礎 Layout
│       ├── Sidebar
│       ├── Header
│       └── Breadcrumb
├── [ ] 設定路由結構
├── [ ] 設定 API 客戶端
│       ├── serverAdminApi
│       └── aiAdminApi
└── [ ] 實作登入/權限驗證
```

---

### Phase 2: 核心功能

**目標:** 實作 Dashboard 和資料庫管理功能

#### 2.1 Dashboard 頁面

```
任務清單:
├── [ ] 服務狀態卡片元件
├── [ ] 關鍵指標卡片元件
├── [ ] 請求量趨勢圖表 (Recharts)
├── [ ] 資料庫統計區塊
├── [ ] 最近錯誤日誌列表
└── [ ] 自動刷新機制 (SWR)
```

#### 2.2 PostgreSQL 管理

```
任務清單:
├── [ ] 表列表頁面
│       ├── 搜尋過濾
│       ├── 排序功能
│       └── 分頁
├── [ ] 表詳情頁面
│       ├── 結構 Tab (欄位、索引、外鍵)
│       ├── 數據 Tab (預覽表格)
│       └── 關聯 Tab (ER 關係)
└── [ ] SQL 查詢工具
        ├── 程式碼編輯器 (Monaco/CodeMirror)
        ├── 執行查詢
        ├── 結果表格
        └── 匯出 CSV
```

#### 2.3 Redis 管理

```
任務清單:
├── [ ] Redis 總覽頁 (兩個實例)
├── [ ] Key 瀏覽器
│       ├── 搜尋 (支援萬用字元)
│       ├── Key 列表
│       └── 分頁 (SCAN cursor)
├── [ ] Key 詳情 Modal
│       ├── 顯示值 (JSON 格式化)
│       ├── TTL 資訊
│       └── 刪除功能
└── [ ] 批量清除快取對話框
```

---

### Phase 3: 進階功能

**目標:** 完成所有資料庫管理和服務監控

#### 3.1 MongoDB 管理

```
任務清單:
├── [ ] Collection 列表頁
├── [ ] Collection 詳情頁
│       ├── 文檔預覽
│       └── 索引資訊
└── [ ] 查詢工具 (JSON filter)
```

#### 3.2 Qdrant 管理

```
任務清單:
├── [ ] Collection 列表頁
├── [ ] Collection 詳情頁
│       ├── 向量統計
│       └── 設定資訊
├── [ ] 向量搜索測試工具
└── [ ] 樣本向量查看
```

#### 3.3 服務監控

```
任務清單:
├── [ ] 服務總覽頁
├── [ ] daodao-server 詳情頁
│       ├── 健康狀態
│       ├── 資源使用率
│       └── 連線數據庫狀態
├── [ ] ai-backend 詳情頁
│       ├── 健康狀態
│       ├── LLM 使用統計
│       └── Celery 任務監控
└── [ ] API 延遲圖表
```

#### 3.4 LLM 管理

```
任務清單:
├── [ ] LLM 後端狀態頁
│       ├── 各後端連線狀態
│       └── 連線測試功能
└── [ ] 使用統計頁
        ├── Token 用量圖表
        ├── 成本估算
        └── 按時間/後端篩選
```

#### 3.5 Celery 任務監控

```
任務清單:
├── [ ] 任務隊列狀態
├── [ ] 任務歷史列表
│       ├── 篩選 (狀態、類型)
│       └── 分頁
├── [ ] 任務詳情 Modal
└── [ ] 重試/取消功能
```

---

### Phase 4: 用戶管理與優化

**目標:** 用戶管理功能和效能優化

#### 4.1 用戶管理

```
任務清單:
├── [ ] 用戶列表頁
│       ├── 搜尋 (email, name)
│       ├── 角色篩選
│       └── 分頁
├── [ ] 用戶詳情頁
│       ├── 基本資訊
│       └── 活動記錄
└── [ ] 角色管理
        ├── 角色更改對話框
        └── 操作確認
```

#### 4.2 API 文檔整合

```
任務清單:
├── [ ] Swagger UI 嵌入
│       ├── daodao-server
│       └── ai-backend
└── [ ] 服務切換 Tab
```

#### 4.3 效能優化

```
任務清單:
├── [ ] 數據快取策略 (SWR)
├── [ ] 懶加載 (動態 import)
├── [ ] 圖表效能優化
└── [ ] 大數據表格虛擬滾動
```

---

## 優先順序

| 優先級 | 功能 | 原因 |
|--------|------|------|
| P0 | Admin API 基礎架構 | 前端依賴 |
| P0 | 前端骨架 + 認證 | 基礎設施 |
| P1 | Dashboard | 快速掌握系統狀態 |
| P1 | PostgreSQL 管理 | 核心數據 |
| P1 | Redis 管理 | 快取問題排查 |
| P2 | 服務監控 | 運維需求 |
| P2 | MongoDB 管理 | 次要數據源 |
| P2 | Qdrant 管理 | AI 功能相關 |
| P3 | LLM 統計 | 成本監控 |
| P3 | Celery 監控 | 任務排查 |
| P3 | 用戶管理 | 管理需求 |

---

## 技術依賴

### 後端 (daodao-server)

```json
// 新增依賴
{
  "@types/ioredis": "latest"  // 如果需要
}
```

### 後端 (daodao-ai-backend)

```toml
# 新增依賴 (pyproject.toml)
# 大部分已有，可能需要:
# - qdrant-client (已有)
# - redis (已有)
```

### 前端 (apps/admin)

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "@daodao/ui": "workspace:*",
    "@daodao/api": "workspace:*",
    "@daodao/auth": "workspace:*",
    "@tanstack/react-table": "^8.0.0",
    "recharts": "^2.0.0",
    "@monaco-editor/react": "^4.0.0",
    "swr": "^2.0.0"
  }
}
```

---

## 開發命令

```bash
# 啟動所有服務 (開發環境)

# Terminal 1: daodao-server
cd daodao-server && pnpm dev

# Terminal 2: daodao-ai-backend
cd daodao-ai-backend && uv run uvicorn src.main:app --reload --port 8000

# Terminal 3: daodao-f2e admin
cd daodao-f2e && pnpm --filter @daodao/admin dev

# 資料庫服務
cd daodao-storage && docker compose up -d
```

---

## 驗收標準

### Phase 1 驗收
- [ ] 所有 Admin API 端點可正常回應
- [ ] 前端可成功載入並顯示 Layout
- [ ] 認證機制正常運作

### Phase 2 驗收
- [ ] Dashboard 顯示正確的服務狀態
- [ ] 可瀏覽所有 PostgreSQL 表
- [ ] SQL 查詢工具可執行 SELECT
- [ ] Redis Key 可正常瀏覽和刪除

### Phase 3 驗收
- [ ] MongoDB Collection 可正常瀏覽
- [ ] Qdrant 向量搜索測試功能正常
- [ ] LLM 使用統計正確顯示
- [ ] Celery 任務可查看和重試

### Phase 4 驗收
- [ ] 用戶列表和角色管理正常
- [ ] Swagger UI 正確嵌入
- [ ] 頁面載入速度 < 2 秒

---

## 風險與注意事項

### 安全性
- [ ] Admin API 必須驗證管理員權限
- [ ] SQL 查詢僅允許 SELECT
- [ ] 敏感欄位 (密碼、Token) 需隱藏
- [ ] 操作日誌記錄

### 效能
- [ ] 大表查詢需設定 LIMIT
- [ ] Redis SCAN 避免阻塞
- [ ] 前端大數據表格使用虛擬滾動

### 相容性
- [ ] 確保與現有認證系統整合
- [ ] API 版本管理 (v1)
- [ ] 錯誤處理統一格式
