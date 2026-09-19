## Context

島島目前零教練台程式碼。PRD（`docs/product/lighthouse/prd.md`）定案了完整產品規劃，schema-design（`docs/product/lighthouse/schema-design.md`）定案了 DB 結構，FRD review（`docs/product/lighthouse/frd-v0.4-review.md`）完成了業界對照與命名修訂。本設計文件將三份文件的技術決策收斂為可實作的架構。

既有可複用積木：practice CRUD、打卡、快速回應、留言＋@mention、追蹤/連結、通知系統、email template 系統、BullMQ 排程、`practice_templates`（已存在但無 owner 概念）。

## Goals / Non-Goals

**Goals:**

- 建立組織→系列→期三層資料模型，支撐教練台完整生命週期
- 以 cohort 關係制取代全域角色，實現範圍限定的權限控制
- 可見性模型在 API 層強制執行（路由範圍化＋物件級歸屬＋欄位白名單）
- 燈塔做在 product app `/lighthouse` route group，零新增部署單位
- 複用既有打卡/回應/留言/通知積木，不重寫

**Non-Goals:**

- 金流/訂閱（Phase 3）
- AI 週報摘要（Phase 3，ai-backend 不動）
- Mobile 原生燈塔頁面
- 全域 teacher/coach RBAC 角色
- LMS 功能（教材/考卷/成績）

## Decisions

### D1：身分模型——關係制，不加 RBAC 角色

**選擇**：`cohort_enrollments.role`（owner/assistant/member）＋`organization_members` 取代全域角色。

**替代方案**：在 RBAC `roles` 表加 teacher 角色。

**理由**：全域角色無法表達「只能看自己的期」的範圍限制，會產生「有角色沒期」的殭屍狀態。關係制與既有 `requireOwnership` middleware 模式一致，無需改動 auth 層。

### D2：組織模型——Organization ≠ User

**選擇**：`organization`＋`organization_members` 獨立表，個人講師＝單成員組織。

**替代方案**：直接用 `users` 當開營主體。

**理由**：支援多人共管品牌（如雙講師工作室）；登入門檻＝`EXISTS organization_members WHERE user_id = ?`，乾淨。MVP 人工開通（admin 審核建 organization），P3 自助化後配額制接替。

### D3：兩層容器——Program → Cohort

**選擇**：`programs`（系列，無時間）→ `cohorts`（期，有起訖日＋名單）兩層。

**替代方案**：單層 cohort。

**理由**：與 Maven 標準模式同構（業界實查驗證）。模板綁期不綁系列，期續開＝新 cohort 複製設定。`cohorts.status` 只存編輯狀態（draft/published/archived），進行中/已結束由日期推導，免 cron 翻狀態的不一致風險。

### D4：Practice 歸屬——欄位不是表

**選擇**：`practices.cohort_id` nullable FK，互斥由結構保證。

**替代方案**：`cohort_practices` join table。

**理由**：一個 practice 至多屬於一個 cohort（PRD 互斥原則）。轉個人實踐＝`SET NULL`，可見性即斷。join table 多一層 join 無對價。

### D5：模板擴充既有表

**選擇**：`practice_templates` 加 `organization_id`（NULL＝官方模板）。

**替代方案**：新開 `cohort_templates` 表。

**理由**：避免兩套模板結構漂移；模板↔期多對多綁定另用 `cohort_templates`（綁定關係表）。

### D6：Enrollment 一等公民

**選擇**：`cohort_enrollments` 獨立表，含狀態機（invited→joined→exited/removed）、invite_token、email。

**替代方案**：簡單 join table。

**理由**：Canvas LMS 模式驗證（業界實查）。需記邀請時間、加入時間、退出時間、操作者；email 降為聯絡紀錄（身分綁定靠 invite_token），解「報課 email ≠ 島島帳號 email」。

### D7：燈塔＝product app route group

**選擇**：f2e product app 內 `/lighthouse` route group，自有 layout＋`requireOrganizationMember` middleware。

**替代方案**：(a) admin-ui 加 partner 角色；(b) monorepo 新 app `apps/partner`。

**理由**：(a) 內部後台不對外是紅線，且 Practice 五步流程在 admin-ui 技術棧（Vite）下需整段重寫；(b) 新 app 成本無對價，日後可抽出。product app 方案零新增部署單位，直接複用 Practice 元件與 `@daodao/*` packages。

### D8：聚合快照表

**選擇**：`cohort_stat_snapshots`（weekly/final），BullMQ 排程 job 產出。

**替代方案**：即時聚合查詢。

**理由**：(1)「學員退出後聚合保留歷史」是承諾規則，即時計算會默默違反；(2) 期滿只留聚合自動合規（個人內容消失、快照留下）；(3) 儀表板效能。metrics jsonb 最小形狀：`enrolled / activated / checkins / active_members / top_tags / exited / hour_histogram`，全為計數與聚合、零個人識別。

### D9：API 路由結構

**選擇**：

```
/api/v1/lighthouse/*    組織端（Programs/Cohorts/Templates/Enrollments/Stats）
                        middleware: requireOrganizationMember
/api/v1/cohorts/*       參與者端（join/本期動態/我的草稿）
```

**理由**：組織端以 `/lighthouse` 為 namespace，與既有 `/admin` 不衝突。參與者端用 `/cohorts` 因為學員不需要知道「燈塔」概念。所有組織端 endpoint 物件級驗證 cohort→program→organization→members 歸屬鏈。

### D10：三層存續生命週期

**選擇**：名冊層永久、內容層期滿唯讀 90 天後消失、現況層永不可見。

**理由**：教練需要服務紀錄（跨期名冊），不需要持續監看。帳號刪除＝名冊列匿名化不刪列，教練營運紀錄不破洞。90 天唯讀由 middleware 以 `end_date + 90` 推導，免 cron。

## Risks / Trade-offs

| 風險 | 影響 | 緩解 |
|---|---|---|
| 可見性模型漏洞（跨期 IDOR） | 學員隱私外洩 | API 三道防線＋測試必須覆蓋跨期 ID 替換；Zod response validator 白名單 |
| `practice_templates.organization_id` 加欄位影響既有模板 | NULL＝官方模板邏輯需全站一致 | Migration 只加 nullable column，既有資料不動；所有模板查詢加 `WHERE organization_id IS NULL OR organization_id = ?` |
| 儀表板冷啟動（快照尚未產出） | 新建期無資料可看 | 首次存取觸發即時計算＋寫入快照；後續走 BullMQ 排程 |
| 邀請 email 信賴（名單來源合法性） | 個資法風險 | 名單上傳時 UI 明文歸責教練；審計日誌記錄上傳事件 |
| 90 天後內容消失的使用者預期落差 | 教練抱怨 | 加入同意文案＋成果匯出 opt-in；期滿前推播提醒匯出 |

## Migration Plan

1. **daodao-storage**：依序號建 migration（7 張新表＋2 個 ALTER）。先跑 staging 驗證。
2. **daodao-server**：新增路由群組、middleware、service。Prisma `db pull → generate → schema:drift`。
3. **daodao-f2e**：product app 新增 `/lighthouse` route group、`cohort.ts` service + hooks、i18n keys。
4. **daodao-admin-ui**：組織審核頁（走 daodao-server API）。
5. **Rollback**：新表與新欄位為 additive，回滾＝前端移除路由＋後端移除路由，資料表可保留不影響既有功能。

## Open Questions

1. ~~組織審核流程的具體 admin-ui 頁面設計~~（待 UI 設計）
2. 教練週報 digest 的具體信件模板內容（待 copy）
3. AI 鼓勵草稿的 prompt 設計與 model 選擇（server 已有 `checkin-encouragements`，待確認是否直接複用）
4. 過期邀請 email 自動清除時機（schema-design 記為後續個資強化項）
