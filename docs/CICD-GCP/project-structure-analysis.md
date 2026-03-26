# DaoDao 專案結構分析報告

> 生成日期: 2025-12-19
> 用途: GCP + Kubernetes + ArgoCD 遷移規劃

---

## 專案概覽

**DaoDao** 是一個全端教育學習平台專案，由多個獨立的服務模組組成，採用現代化的微服務架構。專案總大小約 **2.4GB**，包含前端、後端、AI服務和儲存四個主要系統。

---

## 1. 前端專案 (daodao-f2e)

**位置**: `/Users/xiaoxu/Projects/daodao/daodao-f2e`
**大小**: 1.1GB
**主要語言**: TypeScript + React

### 框架和技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| **Next.js** | ^15.5.2 | 全端React框架 |
| **React** | ^19.1.1 | UI框架 |
| **TypeScript** | 5.7.2 | 型別系統 |
| **Tailwind CSS** | ^3.4.14 | CSS框架 |
| **shadcn/ui** | 最新 | UI元件庫 |
| **React Hook Form** | ^7.56.4 | 表單管理 |
| **Zod** | ^3.25.42 | 資料驗證 |
| **SWR** | ^2.3.6 | 資料獲取與快取 |
| **Radix UI** | ^1.x | 基礎元件庫 |
| **next-intl** | ^4.5.0 | 國際化 (i18n) |
| **next-themes** | ^0.4.6 | 主題管理 |
| **next-pwa** | ^5.6.0 | PWA支援 |

### 專案結構

```
daodao-f2e/
├── app/                          # Next.js 13+ App Router
│   ├── [language]/              # 動態語言路由
│   ├── api/                     # API端點
│   ├── global-error.tsx         # 全域錯誤處理
│   ├── global.css               # 全域樣式
│   └── not-found.tsx            # 404頁面
├── components/                   # UI元件
│   ├── atoms/                   # 原子元件
│   ├── molecules/               # 分子元件
│   └── (legacy)                 # 遷移中的MUI元件
├── entities/                     # 業務實體
├── features/                     # 功能模組（Feature-Sliced Design）
├── contexts/                     # React Context
├── services/                     # API服務層
│   ├── _shared/                 # 共享Schema
│   └── resources/               # 資源相關API
├── constants/                    # 常數定義
├── layout/                       # 佈局元件
├── public/                       # 靜態資源
├── shared/                       # 共享工具和設定
├── tsconfig.json                # TypeScript設定
├── next.config.js               # Next.js設定
├── tailwind.config.js           # Tailwind設定
├── package.json                 # 相依性管理 (pnpm@10.15.0)
└── Dockerfile                   # 不存在（Cloudflare Pages部署）
```

### 部署和建置

- **建置指令**: `pnpm build`
- **開發指令**: `pnpm dev -p 5438`
- **當前部署**: **Cloudflare Pages**
- **部署方式**:
  - `pnpm cf:build` - 為Cloudflare建置
  - `pnpm deploy` - 部署到Cloudflare Pages
- **PWA支援**: 完整的漸進式Web應用支援
- **國際化**: Google Sheets + Google App Script管理翻譯
- **套件管理**: pnpm@10.15.0（Node 20.19.4）

### 關鍵特性

- **原子設計**: Atomic Design原則
- **Feature-Sliced Design**: 功能隔離架構
- **SSG/SSR**: 支援靜態生成和伺服器端渲染
- **線上遷移**: 從Material-UI逐步遷移到shadcn/ui + Tailwind
- **TypeScript優先**: 嚴格型別檢查
- **效能最佳化**: 套件分析、bundle最佳化、Cloudflare Workers限制（3MB）

---

## 2. 後端服務 (daodao-server)

**位置**: `/Users/xiaoxu/Projects/daodao/daodao-server`
**大小**: 767MB
**主要語言**: TypeScript（混合JavaScript）

### 框架和技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| **Express.js** | ^4.21.2 | Web框架 |
| **Node.js** | 20.19.4+ | 執行環境 |
| **TypeScript** | ^5.8.3 | 型別系統 |
| **Prisma** | ^6.16.2 | ORM (PostgreSQL) |
| **Mongoose** | ^7.2.3 | ODM (MongoDB) |
| **Redis** | ioredis ^5.4.1 | 快取/會話儲存 |
| **JWT** | jsonwebtoken ^9.0.2 | 身份認證 |
| **Passport.js** | ^0.6.0 | 認證框架 |
| **Google OAuth** | passport-google-oauth20 | 第三方認證 |
| **Multer** | ^1.4.5-lts.1 | 檔案上傳 |
| **AWS SDK** | @aws-sdk/client-s3 | 檔案儲存 |
| **Zod** | ^4.1.5 | 資料驗證 |
| **Winston** | ^3.17.0 | 日誌系統 |
| **Jest** | ^29.7.0 | 單元/整合測試 |
| **Swagger/OpenAPI** | swagger-ui-express | API文件 |
| **PM2** | ^5.4.1 | 程序管理 |
| **Helmet** | ^8.1.0 | 安全防護 |

### 專案結構（混合架構）

```
daodao-server/
├── src/                          # TypeScript原始碼（現代化）
│   ├── app.ts                   # Express應用設定
│   ├── server.ts                # 伺服器進入點
│   ├── controllers/             # 業務邏輯（18個）
│   ├── routes/                  # 路由定義（18個）
│   ├── services/                # 業務服務（31個）
│   ├── middleware/              # 中介軟體（認證、驗證等）
│   ├── validators/              # Zod驗證Schema（25個）
│   ├── types/                   # TypeScript型別定義（28個）
│   ├── utils/                   # 工具函式
│   ├── constants/               # 常數定義（8個）
│   ├── config/                  # 設定檔案
│   └── swagger/                 # API文件設定
├── controllers/                  # 遺留JavaScript控制器
├── models/                       # 遺留Sequelize模型（遷移中）
├── routes/                       # 遺留JavaScript路由
├── services/                     # 遺留JavaScript服務
├── middlewares/                  # 遺留JavaScript中介軟體
├── utils/                        # 遺留JavaScript工具
├── prisma/                       # Prisma設定
│   └── schema.prisma            # 資料庫Schema（1220行）
├── migrations/                   # 資料庫遷移腳本
├── generated/                    # Prisma自動生成型別
├── dist/                         # 編譯輸出（TypeScript編譯後）
├── tests/                        # 測試檔案
├── index.js                      # 主進入點（整合TypeScript和JavaScript）
├── ecosystem.config.js           # PM2設定
├── Dockerfile                    # 多層建置（最佳化快取策略）
├── docker-compose.yaml           # 容器編排
├── package.json                  # 相依性管理 (pnpm@9.1.0+)
├── tsconfig.json                # TypeScript設定
└── .env                          # 環境設定
```

### 資料庫設定

#### PostgreSQL (主資料庫)
- **ORM**: Prisma
- **Schema**: 1220行，包含完整的使用者、專案、資源、馬拉松等資料模型
- **表格結構包括**:
  - `users` - 使用者資訊
  - `projects` - 學習專案
  - `resources` - 學習資源
  - `project_marathon` - 學習馬拉松
  - `categories` - 資源分類
  - `tags` - 標籤系統
  - `comments` - 評論系統
  - `reactions` - 反應系統（按讚等）
  - `groups` - 群組管理
  - `mentors` - 導師系統
  - 以及多個關聯表和中間表

#### MongoDB
- **ODM**: Mongoose
- **用途**: 彈性的文件儲存

#### Redis
- **用途**: 快取、會話管理、限流儲存
- **Client**: ioredis

### 部署和建置

**當前部署**: **Linode VPS**

**Docker多層建置策略**:
1. **基礎層**: Node 20 Alpine + corepack + pnpm@9.1.0
2. **相依性層**: 生產/開發相依性分離
3. **Prisma層**: 單獨的Prisma程式碼生成
4. **建置層**: TypeScript編譯 + OpenAPI生成
5. **Runtime層**: 最小化生產映像檔，使用PM2啟動

**編譯和啟動**:
- 編譯: `pnpm run build` → `dist/src/server.js`
- 啟動: PM2管理，叢集模式，最大記憶體1GB

**API文件**:
- Swagger UI: `/api-docs` 和 `/api/docs`
- OpenAPI JSON生成

### 關鍵特性

- **混合架構**: TypeScript（src/）+ JavaScript遺留程式碼
- **完整ORM**: Prisma處理PostgreSQL關聯資料
- **認證系統**: JWT + Google OAuth + Passport
- **檔案儲存**: Cloudflare R2（AWS S3相容）
- **API文件**: 自動生成Swagger/OpenAPI
- **日誌系統**: Winston分級日誌 + 日誌輪替
- **安全性**: Helmet、CORS、速率限制
- **監控**: 系統資訊監控、健康檢查
- **測試**: Jest單元/整合/E2E測試
- **郵件系統**: Nodemailer整合

---

## 3. AI後端服務 (daodao-ai-backend)

**位置**: `/Users/xiaoxu/Projects/daodao/daodao-ai-backend`
**大小**: 2.5MB
**主要語言**: Python

### 框架和技術棧

| 技術 | 版本/描述 | 用途 |
|------|----------|------|
| **FastAPI** | 最新 | 高效能Web框架 |
| **Python** | 3.10+ | 執行環境 |
| **Uvicorn** | 標準 | ASGI伺服器 |
| **Pydantic** | >=2.11.3 | 資料驗證 |
| **SQLAlchemy** | 標準 | ORM |
| **PostgreSQL** | psycopg2-binary | 資料庫驅動 |
| **Redis** | redis / aioredis | 快取 |
| **Celery** | 5.3.0 | 任務佇列 |
| **Prometheus** | prometheus-fastapi-instrumentator | 監控指標 |
| **OpenTelemetry** | 完整套件 | 分散式追蹤 |
| **sentence-transformers** | 5.1.0 | 文字嵌入 |
| **Qdrant** | qdrant-client | 向量資料庫 |
| **ClickHouse** | clickhouse-connect + driver | 分析資料庫 |
| **PyTorch** | 2.9.1 (CPU) | ML框架 |
| **loguru** | 0.7.2 | 進階日誌 |
| **slowapi** | 0.1.8 | 限流 |

### 專案結構

```
daodao-ai-backend/
├── src/
│   ├── main.py                  # FastAPI應用進入點
│   ├── config.py                # 設定管理（Pydantic Settings）
│   ├── routers/                 # API路由（6個模組）
│   ├── middleware/              # 中介軟體（JWT、速率限制等）
│   ├── models/                  # SQLAlchemy ORM模型（37個）
│   ├── db/                      # 資料庫連線設定
│   ├── schemas/                 # Pydantic資料Schema
│   ├── services/                # 業務邏輯服務（17個）
│   ├── utils/                   # 工具函式
│   ├── logger.py                # 日誌設定
│   ├── dependencies.py          # 相依性注入
│   ├── response_template.py     # 回應格式化
│   └── verify_jwt.py            # JWT驗證
├── Dockerfile                   # 多層建置（Python 3.12）
├── docker-compose.dev.yml       # 開發環境
├── docker-compose.prod.yml      # 生產環境
├── pyproject.toml               # 專案設定 + 相依性聲明
├── uv.lock                      # 相依性鎖定檔案
├── .env.dev.sample              # 開發環境範例
├── .env.prod.sample             # 生產環境範例
├── Makefile                     # 任務腳本
└── Readme.md                    # 專案文件
```

### 資料庫整合

- **主資料庫**: PostgreSQL（與daodao-server共用）
- **向量資料庫**: Qdrant（相似度搜尋）
- **分析資料庫**: ClickHouse（時間序列和OLAP分析）
- **快取**: Redis（aioredis非同步客戶端）

### Docker支援

**當前部署**: **Linode VPS**

**建置階段**:
1. **Builder階段**: uv + Python 3.12，安裝CPU版PyTorch 2.9.1
2. **Runtime階段**: Python 3.12 slim，非root使用者執行

**健康檢查**: `/api/ping/health` 端點
**啟動**: `uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4`

### 關鍵特性

- **向量嵌入**: 使用sentence-transformers進行文字向量化
- **推薦引擎**: LLM整合用於智慧推薦
- **任務佇列**: Celery處理非同步任務
- **監控追蹤**: Prometheus + OpenTelemetry
- **限流保護**: slowapi實作API限流
- **分析查詢**: ClickHouse支援複雜分析
- **FastAPI現代化**: 完整的async/await支援

---

## 4. 儲存和資料庫服務 (daodao-storage)

**位置**: `/Users/xiaoxu/Projects/daodao/daodao-storage`
**大小**: 1.5MB
**主要語言**: SQL + Bash腳本

### 支援的資料庫服務

| 服務 | 映像檔 | 用途 | 埠號 |
|------|------|------|------|
| **PostgreSQL** | postgres:14 | 關聯式資料庫（主） | 5423 |
| **ClickHouse** | clickhouse/clickhouse-server:23.3 | 列式OLAP資料庫 | 8123/9000 |
| **Qdrant** | qdrant/qdrant:v1.7.3 | 向量資料庫 | 6333 |

### 專案結構

```
daodao-storage/
├── init-scripts/                # PostgreSQL初始化SQL腳本（13個）
│   ├── 01-create-type.sql      # 自訂型別
│   ├── 02-*-create-*.sql       # 各模組表格建立
│   ├── 02-98-insert-*.sql      # 初始資料匯入
│   └── 03-01-create-ai-feedback.sql  # AI回饋表
├── init-scripts-refactored/     # 重構後的腳本（56個）
├── migrate/                     # 資料遷移腳本
├── analytics-tables/            # 分析表定義（18個）
├── scripts/                     # 輔助腳本
├── sql-scripts/                 # SQL工具腳本
├── docker-compose.dev.yml       # 開發環境設定
├── docker-compose.prod.yml      # 生產環境設定
├── docker-compose.dev-ports.yml # 埠號映射版本
├── Makefile                     # 任務管理
├── .env.sample                  # 環境變數範例
└── README.MD                    # 文件
```

### 初始化腳本

**SQL腳本流程**:
1. **01-create-type.sql** - 建立自訂列舉和複合型別
2. **02-01 to 02-08** - 建立各業務模組的表格
   - 使用者表 (users, contacts, basic_info)
   - 群組表 (groups, group_members)
   - 專案表 (projects, project_tasks, project_milestones)
   - 馬拉松表 (project_marathon, marathon_participants)
   - 資源表 (resources, tags, entity_tags)
   - 反應表 (reactions, comments)
3. **02-98** - 插入基礎資料（城市、國家、權限）
4. **03-01** - AI回饋表

### Docker編排

**當前部署**: **Linode VPS**

**網路設定**:
- `dev-daodao-network` - 開發環境
- `prod-daodao-network` - 生產環境

**健康檢查**: 所有服務包含健康檢查設定
**資料持久化**: 命名卷 (postgres_data, clickhouse_data, qdrant_data)

### Makefile指令

```bash
make up       # 啟動所有容器
make down     # 停止所有容器
make clean    # 清理本地資料
make import   # 匯入備份資料
make migrate  # 執行資料遷移
```

---

## 5. 設定檔案總結

### 環境變數設定

**前端 (daodao-f2e)**:
```
NEXT_PUBLIC_API_URL=          # 後端API位址
NEXT_I18N_URL=                # Google App Script翻譯位址
```

**後端 (daodao-server)** - 範例來自 `.env`:
```
PORT=4000
NODE_ENV=prod
DATABASE_URL=postgresql://user:pass@host:5432/db
MONGO_URL=mongodb://localhost:27017/db
JWT_SECURITY=<hash>
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
FRONTEND_URL=http://localhost:5438
BACKEND_URL=http://localhost:4000
R2_BUCKET_NAME=daodao-server
EMAIL_ADDRESS=daodao@example.com
```

**AI後端 (daodao-ai-backend)** - `.env.prod.sample` 和 `.env.dev.sample`

**儲存 (daodao-storage)**:
```
DAO_POSTGRES_USER=
DAO_POSTGRES_PASSWORD=
DAO_POSTGRES_DB=
```

### Docker Compose網路

所有服務透過Docker Compose網路通訊：
- **prod-daodao-network** (外部網路) - 生產環境
- **dev-daodao-network** (外部網路) - 開發環境
- **dev_network** / **prod_network** (內部) - 服務通訊

---

## 6. CI/CD 流程

### 前端 (daodao-f2e)

**GitHub Actions工作流程**:
1. `continuous-integration.yml` - TypeScript檢查 + ESLint
2. `continuous-delivery.yml` - 建置並部署到Cloudflare Pages
3. `sync-openapi.yml` - 從後端同步OpenAPI規格
4. `update-i18n.yml` - 更新國際化翻譯
5. `pr-notification.yml` - PR狀態通知

**部署**: Cloudflare Pages
**觸發**: dev/prod分支推送

### 後端 (daodao-server)

**GitHub Actions工作流程**:
1. `continuous-integration.yml` - TypeScript編譯 + Jest測試
2. `continuous-delivery.yml` - Docker建置+推送+部署
3. `emergency-rebuild.yml` - 手動強制重建（清除快取）

**部署**: Docker容器
**映像檔儲存庫**: Docker Hub (變數化)
**快取策略**: 智慧偵測型別變更，自動停用快取

### AI後端 (daodao-ai-backend)

**GitHub Actions工作流程**:
1. `ci.yml` - Python單元測試
2. `cd.yml` - Docker建置+推送+部署

### 儲存 (daodao-storage)

**GitHub Actions**:
1. CI - PostgreSQL測試
2. CD - 部署到Linode VPS

---

## 7. 相依關係和通訊流程

```
┌─────────────────────────────────────┐
│      前端 (daodao-f2e)              │
│   Next.js + React 19 + TypeScript   │
│     Cloudflare Pages部署            │
└────────────────┬────────────────────┘
                 │ HTTP(S)
                 ▼
┌──────────────────────────────────────┐
│  後端服務 (daodao-server)            │
│  Express + TypeScript + Prisma       │
│  Docker + PM2 + PostgreSQL/MongoDB   │
└──────────┬─────────────────┬─────────┘
           │                 │
    資料庫交互        │ 呼叫
           │                 ▼
           │    ┌────────────────────────┐
           │    │  AI後端 (Python)       │
           │    │  FastAPI + Celery      │
           │    │  向量/推薦引擎         │
           │    └────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  儲存層 (daodao-storage)             │
│  PostgreSQL + ClickHouse + Qdrant    │
│  Docker Compose編排                  │
└──────────────────────────────────────┘
```

---

## 8. 技術棧總結表

| 層級 | 技術 | 框架/函式庫 | 資料庫 | 部署 |
|------|------|--------|-------|------|
| **前端** | TypeScript | Next.js 15 + React 19 | 無 | Cloudflare Pages |
| **後端** | TypeScript | Express 4 + Prisma | PostgreSQL + MongoDB + Redis | Docker + PM2 (Linode VPS) |
| **AI** | Python | FastAPI | PostgreSQL | Docker (Linode VPS) |
| **儲存** | SQL | - | PostgreSQL + ClickHouse + Qdrant | Docker Compose (Linode VPS) |
| **套件管理** | pnpm (前) / uv (AI) | - | - | - |
| **測試** | Jest (後端) / pytest (AI) | - | - | - |
| **監控** | Winston (後端) / Prometheus | - | - | - |
| **文件** | Swagger/OpenAPI | - | - | - |

---

## 9. 關鍵特性和架構亮點

### 前端特性
- Feature-Sliced Design架構
- 原子設計模式
- SSG/SSR混合渲染
- PWA支援
- Google Sheets國際化管理
- 從MUI到shadcn/ui的漸進式遷移

### 後端特性
- 完整的ORM (Prisma) + 傳統ODM (Mongoose)
- 混合TypeScript + JavaScript架構
- 多層Docker建置最佳化
- 自動OpenAPI/Swagger生成
- 完整的認證系統 (JWT + Google OAuth)
- 檔案儲存整合 (Cloudflare R2)

### AI服務特性
- 向量嵌入和相似度搜尋
- LLM整合推薦引擎
- 分散式任務佇列 (Celery)
- OpenTelemetry可觀測性
- 非同步處理和非阻塞I/O

### 儲存特性
- 多資料庫支援 (關聯式/向量/分析)
- 完整的SQL初始化腳本
- 資料遷移流程
- Docker網路隔離 (dev/prod)
- 健康檢查和故障轉移

---

## 10. 當前部署狀態總結

### 現況
- **前端**: Cloudflare Pages（已雲端化）
- **後端**: Linode VPS + Docker + PM2
- **AI服務**: Linode VPS + Docker
- **資料庫**: Linode VPS + Docker Compose
  - PostgreSQL
  - MongoDB
  - Redis
  - ClickHouse
  - Qdrant

### 遷移目標
將所有服務（除前端外）從 Linode VPS 遷移到 **GCP + Kubernetes + ArgoCD**

---

## 11. 開發環境指令速查

### 前端
```bash
pnpm dev              # 啟動開發伺服器 (port 5438)
pnpm build            # 生產建置
pnpm cf:build         # Cloudflare建置
pnpm lint             # 程式碼檢查
pnpm ts:check         # TypeScript檢查
```

### 後端
```bash
pnpm run dev          # 啟動開發伺服器 (port 3000)
pnpm run build        # TypeScript編譯
pnpm run typecheck    # 型別檢查
pnpm test             # 執行測試
pnpm run prisma:generate  # 生成Prisma客戶端
```

### AI後端
```bash
make up-dev           # 啟動開發環境
make up-prod          # 啟動生產環境
uvicorn src.main:app  # 直接啟動 (port 8000)
```

### 儲存
```bash
make up               # 啟動所有容器
make import           # 匯入備份資料
make migrate          # 執行遷移
```

---

## 總結

**DaoDao** 是一個成熟的全端教育平台，採用現代微服務架構：

1. **前端**: 使用最新的Next.js 15和React 19，部署在Cloudflare Pages
2. **後端**: Express.js + TypeScript，混合Prisma和Mongoose，Docker容器化
3. **AI服務**: 獨立的FastAPI微服務，整合向量資料庫和推薦引擎
4. **儲存層**: 多資料庫支援，PostgreSQL+ClickHouse+Qdrant的組合

整個專案透過Docker容器編排、GitHub Actions CI/CD、詳細的型別定義和文件確保了生產級別的品質和可維護性。目前後端、AI服務和資料庫均部署在Linode VPS上，準備遷移到GCP Kubernetes叢集。
