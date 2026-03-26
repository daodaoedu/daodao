# DaoDao 後台管理系統規劃

## 概述

建立統一的後台管理系統，用於監控和管理 DaoDao 平台的所有服務與資料庫。

## 文件目錄

| 文件 | 說明 |
|------|------|
| [architecture.md](./architecture.md) | 系統架構設計 |
| [api-daodao-server.md](./api-daodao-server.md) | daodao-server Admin API 規格 |
| [api-ai-backend.md](./api-ai-backend.md) | daodao-ai-backend Admin API 規格 |
| [frontend-pages.md](./frontend-pages.md) | 前端頁面設計規格 |
| [implementation-plan.md](./implementation-plan.md) | 實作計劃與任務清單 |

## 服務總覽

| 服務 | 技術棧 | 主要功能 |
|------|--------|----------|
| daodao-server | Express + Prisma | 核心業務 API |
| daodao-ai-backend | FastAPI + SQLAlchemy | AI 推薦、LLM 服務 |
| daodao-storage | PostgreSQL + Qdrant | 資料庫服務 |
| daodao-f2e | Next.js 15 + React 19 | 前端應用 (monorepo) |

## 資料庫總覽

| 資料庫 | 管理服務 | 用途 |
|--------|----------|------|
| PostgreSQL | daodao-server | 核心業務數據 (39 表) |
| MongoDB | daodao-server | 靈活文檔數據 |
| Redis (Server) | daodao-server | Session、快取、限流 |
| Redis (AI) | daodao-ai-backend | 推薦快取、任務佇列 |
| Qdrant | daodao-ai-backend | 向量搜索 |
| ClickHouse | daodao-ai-backend | 分析數據 (目前停用) |

## 快速開始

```bash
# 1. 啟動後端 Admin API (在各自的服務目錄)
cd daodao-server && pnpm dev
cd daodao-ai-backend && uv run uvicorn src.main:app --reload

# 2. 啟動前端 Admin 應用
cd daodao-f2e && pnpm --filter @daodao/admin dev
```

## 存取位置

- Admin 前端: `http://localhost:3002`
- daodao-server API Docs: `http://localhost:3000/api-docs`
- daodao-ai-backend API Docs: `http://localhost:8000/docs`
