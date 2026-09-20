## Context

daodao-admin-ui 是一個獨立的 Vite + React SPA（非 monorepo），使用 react-router-dom 路由、axios + @tanstack/react-query 資料取得、自建 AuthContext (JWT) 認證。目前有 10 個頁面聚焦於 AI 服務管理。

本次改動要將其擴充為涵蓋 21 個 capability 的統一營運中心，頁面數從 10 增至 30+，同時需要遷移 daodao-f2e 的 admin 功能並大幅新增社群/教育/遊戲化等模組。

### 現有技術棧（daodao-admin-ui）
- React 18 + TypeScript + Vite 5
- react-router-dom 6（SPA routing）
- axios + @tanstack/react-query 5（資料取得）
- Radix UI + Tailwind CSS 3 + tailwind-merge（UI）
- Biome（lint/format）
- 自建 AuthContext（JWT token + ping 驗證）

### 相關子專案
- **daodao-server**（Express + Prisma + PostgreSQL + Redis + BullMQ）：提供所有 admin API
- **daodao-storage**（PostgreSQL 14 + SQL migrations）：資料庫 schema
- **daodao-ai-backend**（FastAPI + Qdrant）：AI 助手知識庫向量搜尋
- **daodao-f2e**（Next.js 15）：遷移來源，完成後移除 /admin 路由

## Goals / Non-Goals

**Goals:**
- 統一所有管理功能到 daodao-admin-ui，成為唯一的後台入口
- 保持既有 10 個頁面不受影響（non-breaking）
- 分階段交付，每個階段獨立可用
- 前後端 API 遵循既有 RESTful + Zod validation 慣例
- 所有數據頁面支援 CSV + Excel 匯出

**Non-Goals:**
- 不做多語言 i18n（admin 後台僅繁體中文）
- 不做 SSR/SSG（維持 SPA 架構）
- 不做即時協作（如多人同時編輯）
- 不做付費/訂閱管理（留給後續版本）
- 不做 Plugin 市集、Landing Page Builder（留給後續版本）
- 不遷移 daodao-f2e 的非 admin 功能

## Decisions

### D1: 前端路由架構 — Flat routes + layout wrappers

**選擇**：維持現有的 flat route 結構，用 layout component 包裝分組。

```
/dashboard
/users
/users/:userId
/user-analytics
/user-tags
/roles-permissions       ← 既有
/user-quotas             ← 既有
/query-logs              ← 既有
/models                  ← 既有
/system-prompts          ← 既有
/ai-configs              ← 既有
/playground              ← 既有
/practices
/notifications
/triggered-emails
/scheduled-reports
/custom-reports
/anomaly-alerts
/feedback
/faq
/system-monitor
/email-management
/trust-levels
/automod
/learning-progress
/drip-content
/quizzes
/certificates
/learning-paths
/badges
/challenges
/leaderboards
/onboarding-flows
/content-performance
/events
/audit-log
/member-directory
/ai-assistant
/user-management         ← 既有
```

**替代方案**：Nested routes（如 `/users/analytics`、`/reports/scheduled`）。  
**不選原因**：既有頁面都是 flat，改 nested 需重構所有路由和連結。30+ 頁面用 flat route 仍可管理，透過 Sidebar 分組提供導航結構。

### D2: 資料取得 — Custom hooks wrapping react-query + axios

**選擇**：為每個 API endpoint 建立 custom hook，封裝 react-query 的 useQuery/useMutation。

```typescript
// src/api/admin.ts — 新增 API functions
export const getSystemMonitor = () =>
  apiClient.get<ApiResponse<SystemMonitorData>>('/api/v1/admin/system/monitor')

// src/hooks/useSystemMonitor.ts — custom hook
export function useSystemMonitor(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['admin', 'system-monitor'],
    queryFn: () => getSystemMonitor().then(r => r.data),
    refetchInterval: options?.refetchInterval,
  })
}
```

**替代方案**：直接在元件內使用 useQuery + inline queryFn。  
**不選原因**：30+ 頁面會有大量重複的 queryKey 管理和 error handling。Custom hooks 提供統一的快取策略和型別安全。

### D3: API 層組織 — 按領域分檔

**選擇**：將 `src/api/admin.ts` 拆分為按領域的檔案。

```
src/api/
├── client.ts              ← 既有，不動
├── types.ts               ← 既有，擴充
├── admin.ts               ← 既有 AI 服務 API，不動
├── admin-users.ts         ← 用戶管理、標籤、分析
├── admin-content.ts       ← 主題實踐、內容績效
├── admin-communication.ts ← 通知、觸發式郵件
├── admin-reports.ts       ← 報表、警報
├── admin-support.ts       ← 回饋、FAQ
├── admin-system.ts        ← 系統監控、郵件管理
├── admin-trust.ts         ← 信任等級、AutoMod
├── admin-learning.ts      ← 學習進度、測驗、證書、路徑
├── admin-gamification.ts  ← 徽章、挑戰、排行榜
├── admin-community.ts     ← Onboarding、會員名錄
├── admin-events.ts        ← 活動管理
├── admin-audit.ts         ← 審計日誌
└── admin-ai-assistant.ts  ← AI 助手
```

**替代方案**：全部放在 `admin.ts`。  
**不選原因**：目前 `admin.ts` 已有 ~200 行，加入 21 個 capability 的 API 會超過 1000 行，難以維護。

### D4: 匯出功能 — 前端生成，xlsx 套件

**選擇**：使用 `xlsx`（SheetJS）在前端生成 CSV 和 Excel 檔案，不需後端 API。

```typescript
// src/components/ExportButton.tsx
// 接收 data: Record<string, unknown>[] 和 columns 定義
// 提供下拉選單讓用戶選 CSV 或 Excel
// 檔名格式：{pageName}_{yyyy-MM-dd}.csv/.xlsx
```

**替代方案**：後端生成檔案，前端下載。  
**不選原因**：小團隊資料量不大（萬筆以內），前端生成避免增加 server 負擔和 API endpoint。若未來資料量增大再改為後端生成。

### D5: Sidebar — 分組導航 + collapsible sections

**選擇**：Sidebar 分組用 collapsible section，每組有標題和分隔線。記住展開/收合狀態到 localStorage。

```
[Dashboard]
─── 用戶 ──────────
  [用戶管理]
  [用戶分析]
  [用戶標籤]
  [角色權限]
  [Token 配額]
─── AI 服務 ─────────
  [查詢日誌]
  ...
```

**替代方案**：Two-level sidebar（左邊 icon bar + 右邊展開選單）。  
**不選原因**：頁面數雖多但不需要 icon bar 的空間節省，collapsible 更直覺且實作簡單。

### D6: 即時資料 — Polling，不用 WebSocket

**選擇**：系統監控等需要即時更新的頁面使用 react-query 的 `refetchInterval`（如每 30 秒），不引入 WebSocket。

**替代方案**：WebSocket 推送即時更新。  
**不選原因**：admin 後台同時在線人數少（2-5 人），polling 的開銷微不足道。WebSocket 需要 server 端額外基礎設施（connection management、reconnection），投入產出比不划算。

### D7: 自訂報表拖拉 — @dnd-kit

**選擇**：使用 `@dnd-kit/core` + `@dnd-kit/sortable` 實作報表欄位的拖拉排列。

**替代方案**：react-beautiful-dnd。  
**不選原因**：react-beautiful-dnd 已停止維護，@dnd-kit 是目前 React 拖拉的主流選擇，bundle size 更小，支援更多互動模式。

### D8: 圖表 — 統一用 Recharts

**選擇**：所有圖表使用 `recharts`（已是既有依賴），包含：
- BarChart / LineChart：趨勢圖
- PieChart：分布圖
- 自訂 Heatmap component：Cohort 留存矩陣
- Funnel：用 stacked BarChart 模擬

**替代方案**：引入 ECharts 或 D3。  
**不選原因**：Recharts 已在 bundle 中，能力足夠覆蓋所有需求。自訂 Heatmap 用 CSS Grid + 色階即可，不需要 D3。

### D9: AI 社群助手 — 串接 daodao-ai-backend

**選擇**：知識庫上傳透過 admin API → daodao-server → daodao-ai-backend（Qdrant 向量化儲存）。即時回答走 daodao-server 代理呼叫 AI backend 的 chat endpoint。

```
Admin UI → daodao-server /api/v1/admin/ai-assistant/* → daodao-ai-backend
```

**替代方案**：Admin UI 直接呼叫 AI backend。  
**不選原因**：所有 admin API 統一走 daodao-server 做認證和權限檢查，不讓前端直連 AI backend。

### D10: 分階段交付策略

將 21 個 capability 分為 4 個交付階段，每階段獨立可用：

**Phase 1 — 遷移與基礎**（優先級最高）
- `unified-dashboard`、`grouped-sidebar`、`data-export`
- `user-detail-timeline`、`user-analytics`、`user-tags-segmentation`
- `practice-management`、`system-ops`

**Phase 2 — 溝通與報表**
- `communication`、`report-center`、`user-support`、`audit-log`

**Phase 3 — 社群與教育**
- `trust-automod`、`learning-admin`、`gamification`
- `community-onboarding`、`content-performance`

**Phase 4 — 進階功能**
- `event-management`、`member-directory`、`ai-assistant`

### 各子專案實作方式

**daodao-admin-ui（前端）**
- 新增頁面元件到 `src/pages/`
- 新增 API functions 到 `src/api/admin-*.ts`
- 新增 types 到 `src/api/types.ts`（或拆分為 `types/` 目錄）
- 新增 custom hooks 到 `src/hooks/`
- 新增共用元件到 `src/components/`
- 更新 `App.tsx` 路由和 `Sidebar.tsx` 導航

**daodao-server（後端）**
- 新增 admin route handlers，遵循既有 factory pattern + const object
- 新增 Zod schemas 做 request validation
- 新增 Prisma models 或直接 SQL queries
- 排程報表用 BullMQ scheduled jobs
- 觸發式郵件用 BullMQ 定期掃描 + 發信

**daodao-storage（資料庫）**
- 每個 capability 需要的新資料表以 SQL migration 新增
- 主要新增表：`user_tags`、`tag_rules`、`notifications`、`email_trigger_rules`、`email_templates`、`scheduled_reports`、`alert_rules`、`feedback`、`faq_items`、`trust_levels`、`trust_level_history`、`automod_rules`、`automod_actions`、`learning_progress`、`drip_schedules`、`quizzes`、`quiz_questions`、`quiz_attempts`、`certificates`、`learning_paths`、`badges`、`user_badges`、`challenges`、`challenge_progress`、`leaderboard_configs`、`onboarding_flows`、`onboarding_responses`、`events`、`event_rsvps`、`audit_logs`、`member_profiles`、`ai_knowledge_entries`、`ai_conversations`

**daodao-ai-backend（AI 服務）**
- 新增知識庫 CRUD endpoint（向量化儲存到 Qdrant）
- 新增 RAG-based chat endpoint 供 AI 社群助手使用

**daodao-f2e（遷移來源）**
- Phase 1 完成後移除 `apps/product/src/app/[locale]/admin/` 和 `src/components/admin/`

## Risks / Trade-offs

**[範圍過大]** → 21 個 capability 工作量巨大，可能拖延交付。  
↳ 緩解：嚴格分 4 phase，Phase 1 聚焦遷移和核心功能，每個 phase 獨立可用。

**[API 未實作]** → 遷移頁面的 API 已實作，但新功能（信任等級、遊戲化、AI 助手等）的 API 尚未實作。  
↳ 緩解：前端先用 mock data 開發，API 就緒後切換。前後端可平行開發。

**[資料庫 migration 風險]** → 新增 30+ 資料表，migration 失敗可能影響現有服務。  
↳ 緩解：每個 capability 獨立 migration 檔案，可逐一 apply/rollback。新表不修改既有表結構。

**[前端 bundle size]** → 30+ 頁面 + xlsx + @dnd-kit 會增加 bundle 大小。  
↳ 緩解：所有新頁面使用 React.lazy() 動態載入，xlsx 和 @dnd-kit 僅在使用時載入。

**[Polling 延遲]** → 系統監控和通知用 polling 會有 30 秒延遲。  
↳ 緩解：小團隊可接受，未來需要可升級為 WebSocket/SSE。

**[AutoMod ML 模型]** → ML 垃圾偵測需要訓練資料和模型。  
↳ 緩解：Phase 3 先做關鍵字過濾（rule-based），ML 偵測標記為實驗功能，可後續補充。

## Open Questions

1. **信任等級閾值**：Lv0→Lv3 的具體升級條件（閱讀數、發文數、天數）需要和團隊討論決定。
2. **AI 助手模型選擇**：使用 daodao-ai-backend 現有的 LLM 配置，還是需要獨立的 AI 助手專用模型配置？
3. **排程報表寄送**：用 daodao-server 的 BullMQ，還是 daodao-worker (Cloudflare Workers) 的 cron trigger？
4. **活動管理的直播整合**：Phase 4 是否需要內建直播功能，還是僅支援外部連結（YouTube Live、Google Meet）？
5. **證書模板**：使用 HTML/CSS 模板 + Puppeteer 生成 PDF，還是用現成的 PDF 生成服務？
