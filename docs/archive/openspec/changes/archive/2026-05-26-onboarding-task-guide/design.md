## Context

目前平台已有 `onboarding-flow`（引導式註冊 + 帳號設定），但用戶完成註冊後缺乏持續引導。本 change 在註冊後階段新增：

- **In-app 浮動進度組件**（Floating Widget）：顯示任務清單，根據 `user_source` 提供不同任務順序
- **任務自動偵測**：當用戶在任何頁面完成對應動作時，即時更新進度
- **階梯式 Email 序列**：完成任務才觸發下一封信
- **Early User Badge**：完成全部任務後一次性發放

影響子專案：`daodao-f2e`（product app）、`daodao-server`、`daodao-storage`

> **注意**：daodao-worker 為 Cloudflare Workers 邊緣服務（Hono），用於 AI proxy，不具備 BullMQ / Node.js email runtime，本 change **不涉及** daodao-worker。

## Goals / Non-Goals

**Goals:**
- 根據 `user_source`（S1/S2/S3）提供適性化任務序列，支援跨裝置狀態同步（基於 UID）
- 任務完成後即時更新浮動組件狀態，無需用戶手動刷新
- Email 觸發與 in-app 進度保持一致，避免重複傳送
- Badge 僅通知一次

**Non-Goals:**
- 不在本 change 內修改 `onboarding-flow`（引導式註冊流程）的邏輯
- 不實作 mobile app（React Native）版的浮動組件（僅 product web app）
- 不做 A/B 測試框架，任務序列固定不可動態配置

## Decisions

### 1. Onboarding 狀態儲存 → PostgreSQL（`user_onboarding` 表）

**選擇**：在 `daodao-storage` 新增 `user_onboarding` 表，以 JSONB 欄位 `task_states` 存各任務狀態。

**理由**：
- 需跨裝置同步（mobile / desktop 共用 UID），client-side storage 無法滿足
- Redis 可做快取但不宜作為唯一來源；任務完成是持久狀態，需落地至 DB
- JSONB 讓任務結構保持靈活，不需為每個任務建獨立欄位

**Schema（`migrate/sql/040_create_user_onboarding.sql`）：**
```sql
CREATE TABLE user_onboarding (
  id               SERIAL PRIMARY KEY,
  user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_source      VARCHAR(10) NOT NULL, -- 'S1' | 'S2' | 'S3'
  task_states      JSONB NOT NULL DEFAULT '{}',
  -- e.g. {"A": "done", "B": "done", "C": "pending", "D": "pending", "E": "pending"}
  email_states     JSONB NOT NULL DEFAULT '{}',
  -- e.g. {"L0": "sent", "C": "sent"}
  creation_method  VARCHAR(20), -- 'self_created' | 'copied' | 'action_generator'（任務 C 完成時寫入）
  badge_granted    BOOLEAN NOT NULL DEFAULT FALSE,
  badge_granted_at TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  days_to_complete INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ON user_onboarding(user_id);
```

> **重要**：`users.id` 為 `INT @id @default(autoincrement())`（非 UUID）。SQL migration 執行後，需在 daodao-server 執行 `prisma db pull` + `prisma generate` 以更新 Prisma schema。daodao-storage 的 SQL runner 為 forward-only，無 down migration。

---

### 2. 任務自動偵測 → Server-side Hook wrapper

**選擇**：在 `daodao-server` 各業務 handler 完成後，呼叫 `onboardingService.checkAndAdvance(userId, taskKey)` 更新任務狀態。建議以 `withOnboardingHook(taskKey, handler)` wrapper 包裝各 route，讓遺漏可被 grep 發現。

**理由**：
- 前端輪詢會造成不必要的請求且不即時
- WebSocket / SSE 過重，任務完成是低頻事件
- Server-side hook 最簡單：業務邏輯完成後同步更新 onboarding 狀態，API 回應附帶 `meta.onboardingUpdate` 欄位（擴展現有 `ApiSuccessResponse.meta`），Widget 即可反應

**實際 API 路徑與觸發點（已對齊 codebase）：**
| 任務 | 實際路由 | 觸發條件 |
|------|----------|----------|
| A 測驗 | `POST /api/v1/quiz` | 測驗結果成功寫入 |
| B 帳號設定 | `PUT /api/v1/users/me` | 必填欄位（公開資訊、帳號設定、領域偏好）全部完整 |
| C 建立實踐 | `POST /api/v1/practices` | 實踐建立且狀態為「未開始」 |
| D 打卡 | `POST /api/v1/practices/:id/checkins` | 用戶的第一次打卡 |
| E 留言 | `POST /api/v1/comments` | `target_type` 屬於「靈感」類型（需與產品確認具體 target_type 值） |

---

### 3. Widget 前端架構 → SWR + OnboardingProgressContext

**選擇**：在 `daodao-f2e/apps/product` 建立 `OnboardingProgressContext`（命名避免與現有 `onboarding/` 登錄流程衝突），以 `useSWR("/api/v1/onboarding/status")` 管理資料；API mutation 回應的 `meta.onboardingUpdate` 觸發 SWR `mutate()` 做樂觀更新。

**理由**：
- SWR 已是 product app 統一資料層（`SwrConfigProvider` 在 `global-provider.tsx`），revalidate-on-focus 自動處理跨裝置同步，無需手動監聽路由切換
- App Router 無 `router.events`（Pages Router API），使用 `usePathname()` 觸發 revalidate 或直接依賴 SWR revalidateOnFocus
- `OnboardingProgressContext` / `TaskGuideWidget` 命名，避免與現有 `src/app/[locale]/auth/onboarding/` 命名衝突

**Widget gating 條件**：
- `isTemporary === true`（註冊流程中）→ 不顯示
- `badge_granted === true` → 不顯示（Onboarding 已完成）

---

### 4. Email 序列 → 全部在 daodao-server（BullMQ）

**選擇**：Email 佇列與 Worker 全部在 `daodao-server`，對齊現有 `src/queues/practice-email.queue.ts` + `practice-email.worker.ts` 模式。

**理由**：
- daodao-worker 是 Cloudflare Workers 邊緣服務，無法執行 BullMQ / Node.js email runtime
- daodao-server 已有完整 email 基礎設施（`src/services/email/`、BullMQ queue/worker、`email_logs` table）
- `jobId` 使用 `${emailType}-${userId}` 達成 BullMQ 層級冪等；`email_states` JSONB 作為二次防護

**L0 可重用現有 `welcome-template.ts`** 的 `generateWelcomeEmail()` 結構，依 `user_source` 切換 CTA（S1 → 帳號設定；S2/S3 → 建立實踐）。

> **風險**：`email_logs` 表已有 `welcome_letter` email type 約束（`015_add_welcome_letter_email_type.sql`），L0 需確認是否與現有 welcome letter 重疊或取代。需在 migration SQL 中新增 onboarding email type 常數。

---

### 5. user_source 判斷 → 從 referral_source 推導（不新增 column）

**選擇**：在 daodao-server 建立 `deriveUserSource(referralSource, hasQuizResult)` helper，從現有 `users.referral_source` 欄位與是否有測驗結果推導出 S1/S2/S3，寫入 `user_onboarding.user_source`。

**理由**：
- `users.referral_source` 已在 signup 流程中捕捉（`user.service.ts:856`）
- 避免在 auth/signup 流程新增 `?source=` query param 處理（OAuth redirect 會丟失 param，修改 auth 流程超出本 change 範圍）
- 推導邏輯集中於一個 helper，可測試

**推導規則（待產品確認）：**
- `referral_source` 含 `quiz`/`test` 相關值，或 `hasQuizResult === true` → S2
- `referral_source` 含 `action`/`ai`/`generator` 相關值 → S3
- 其餘 → S1

## Risks / Trade-offs

- **任務偵測遺漏**：handler 忘記呼叫 `checkAndAdvance` 時任務不自動完成。→ `withOnboardingHook` wrapper 讓遺漏可被 grep 發現；整合測試覆蓋各觸發點
- **JSONB schema 無強型別**：任務 key 易打錯。→ `OnboardingTask` enum 集中管理，禁止 inline string
- **Widget 遮擋核心按鈕**：FRD 要求不得遮擋新增實踐按鈕。→ 需對主要路由（至少：首頁、實踐列表、靈感頁）逐一目視驗證
- **Email 重複發送**：BullMQ 重試可能觸發重複 job。→ `jobId` = `${emailType}-${userId}` 為冪等鍵；worker handler 進入後二次檢查 `email_states`
- **user_source 推導不準確**：`referral_source` 值由用戶填寫，可能不含預期關鍵字。→ helper 需有明確 fallback（預設 S1），並在日後補充映射表

## Migration Plan

1. `daodao-storage`：新增 `040_create_user_onboarding.sql`，執行 `make migrate-sql-dev`
2. `daodao-server`：執行 `pnpm run prisma:introspect` + `pnpm run prisma:generate`，確認 `user_onboarding` model 反映至 `schema.prisma`
3. `daodao-server`：新增 `onboardingService`、`withOnboardingHook`、BullMQ email queue/worker、`GET /api/v1/onboarding/status`
4. `daodao-f2e`：新增 `OnboardingProgressProvider`、`TaskGuideWidget`，掛載至 `global-provider.tsx`
5. 部署順序：storage migration → server → f2e
6. Rollback：`user_onboarding` 表可安全 DROP；server / f2e 功能關閉不影響現有功能

## Open Questions

- **「靈感留言」的 `target_type` 值**：`POST /api/v1/comments` 為 polymorphic，FRD 說「靈感中任一實踐留言」，需與產品確認觸發 E 的 target_type 白名單（`practice`？`checkin`？兩者都算？）
- **S2 測驗預完成**：從測驗連結完成註冊的用戶，任務 A 是否預設為 done？需產品決策
- **L0 與現有 welcome letter 的關係**：L0 是取代現有 welcome letter，還是額外發送？需確認 `email_logs` 約束
- **Badge UI 設計稿**：icon 樣式與動畫需設計師提供後才能實作 task 5.1
- **Email 文案範圍**：L0–E 文案是否在本 change scope？若否，tasks 3.x 使用 placeholder copy，真實文案另立 PR
