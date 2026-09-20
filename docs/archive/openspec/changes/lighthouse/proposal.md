## Why

課程講師的三大痛（課後全盲、回應費力、招生缺素材）目前無任何產品面回應——全系統零教練台程式碼。燈塔（Lighthouse）是給講師的陪跑教練台，讓教練看見學員課後的學習節律、在對的時機回應，同時承接 GTM B 軌策略（講師帶課程學員進島島 → 打卡 → 教練看節律 → 成果當招生素材）。

## What Changes

- 新增 **組織（Organization）** 實體與成員管理（人工開通，支援多人共管品牌）
- 新增 **系列（Program）→ 期（Cohort）** 兩層容器模型，含邀請連結/QR、email 名單、加入截止日、人數上限
- 新增 **Enrollment 一等公民物件**（invited → joined → exited/removed 狀態機），含自助退出/轉個人實踐
- 擴充 `practice_templates` 支援組織私有模板，模板綁定多期、學員一鍵複製並綁定期
- `practices` 新增 `cohort_id` nullable FK——歸屬是欄位不是表，解除綁定即斷可見性
- 新增 **本期動態牆**（教練與學員平權的打卡 feed＋快速回應＋AI 鼓勵草稿）
- 新增 **燈塔儀表板**（節律熱度圖、標籤分佈、共同卡點、今日焦點：需要鼓勵＋值得慶祝）
- 新增 **成果匯出**（逐學員 opt-in）與成果報告
- 新增 **教練週報 digest**（BullMQ 排程信）
- 前端新增 product app `/lighthouse` route group（自有 layout＋登入門檻 middleware）
- admin-ui 新增組織審核＋成員管理頁

## Non-goals

- **不是 LMS**：不做教材上傳、考卷、成績計算、滴灌內容
- **不做全域角色**：不在 RBAC 加 teacher/coach，權限全部基於 cohort 關係
- **不復活孤兒資產**：`mentor.routes.ts`、`groups`、`marathon`、`store` 均不沿用
- **不做個人級監控**：永不做排行榜、缺勤排名、連續天數、學習時長、個人 engagement 分數
- **不做訂閱/收費**：Phase 3 議題，本 change 不含金流
- **不做 mobile 原生**：燈塔永遠 web only；學員打卡經由 practice `cohort_id` 自動計入，mobile app 零改動

## Capabilities

### New Capabilities

- `organization-management`：組織 CRUD、成員管理、人工開通審核流程
- `program-cohort`：系列與期的 CRUD、生命週期（draft → published → archived）、連結時效、容量上限
- `cohort-enrollment`：邀請（連結/QR＋email 名單）、加入流程（含同意畫面）、狀態機（invited → joined → exited/removed）、自助退出/轉個人實踐、成員治理（移除/重設連結/暫停加入）
- `cohort-template`：組織私有模板、模板↔期多對多綁定、學員複製並綁定期產生草稿、草稿啟用
- `cohort-visibility`：資料可見性模型（期綁定×角色×關係存續三重 gating）、API 三道防線（路由範圍化＋物件級歸屬＋欄位白名單）、三層存續生命週期（名冊/內容/現況）
- `cohort-dashboard`：節律熱度圖、標籤分佈、共同卡點、enrolled/activated 漏斗、時段節律、今日焦點（需要鼓勵＋值得慶祝）、聚合快照（weekly/final）
- `cohort-activity-wall`：本期動態牆（教練與學員視角）、快速回應、留言、AI 鼓勵草稿一鍵回應
- `cohort-export`：成果報告（正向指標）、成果頁批次匯出（逐學員 opt-in）、回饋問卷
- `lighthouse-ui`：product app `/lighthouse` route group、layout、登入門檻 middleware、總覽頁、教練週報 digest

### Modified Capabilities

- `practice-management`：practices 新增 `cohort_id` nullable FK；`creation_source` 新增 `'cohort_template'` 值；草稿冪等約束
- `notification-events`：新增 cohort 相關通知事件（邀請信、加入確認、移除通知、週報 digest）
- `audit-log`：新增名單上傳、成果匯出、成員異動等審計事件

## Impact

**子專案影響**：

| 子專案 | 影響範圍 |
|---|---|
| **daodao-storage** | 新增 `organization`、`organization_members`、`programs`、`cohorts`、`cohort_enrollments`、`cohort_templates`、`cohort_stat_snapshots` 七張表；`practice_templates` 加 `organization_id`；`practices` 加 `cohort_id` |
| **daodao-server** | 新增 `/api/v1/lighthouse/*`（組織端）與 `/api/v1/cohorts/*`（參與者端）路由群組；`requireOrganizationMember` middleware；儀表板統計端點；BullMQ 週報排程 |
| **daodao-f2e** | product app 新增 `/lighthouse` route group（總覽/系列/期/模板庫/組織設定）；新增 `cohort.ts` service + hooks；參與者端加入流程/草稿區/本期動態/自助退出 |
| **daodao-admin-ui** | 新增組織設定入口，含組織列表／建立／開通／編輯／停權，以及組織成員查看／新增／移除 |
| **daodao-ai-backend** | Phase 3 才進場（本 change 不動） |
| **daodao-worker** | 不動 |
