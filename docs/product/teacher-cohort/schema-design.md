# 燈塔（teacher-cohort）DB Schema 設計

> 產出日：2026-07-21，由 schema 討論定案。落地時於 daodao-storage `migrate/sql/` 依序號建 migration，並同步回寫 `schema/`；daodao-server 走 `prisma db pull → prisma:generate → schema:drift`。
> 前置事實（2026-07-21 實查 daodao-server prisma/schema.prisma）：`practice_templates` 已存在且欄位與五步流程重合（無 owner 欄位＝平台官方模板）；`practices.status` 預設 `'draft'`；`practices` 已有 `template_id`、`source_practice_id`、`creation_source`。

## 設計總則

1. **草稿零新機制**：FRD 的「草稿」＝`practices` 一筆 `status='draft'` ＋ `cohort_id` ＋ `creation_source='cohort_template'`。啟用＝既有編輯流程轉 `in_progress`。
2. **歸屬是欄位不是表**：FRD 互斥原則（一 practice 至多一 cohort）→ `practices.cohort_id` nullable FK，互斥由結構保證；轉個人實踐＝set NULL，可見性即斷。
3. **模板不開新表**：`practice_templates` 加 `organizer_id`（NULL＝官方模板），避免兩套模板結構漂移。
4. **開營者是組織**（2026-07-21 定案）：支援多人共管品牌（如雙講師工作室）；個人講師＝單成員組織。登入門檻＝「是否為任一組織成員」。
5. **不硬刪**：programs/cohorts 一律 archive（收緊 FRD 7.8.2）；名冊層永久性靠此政策。`ON DELETE SET NULL` 僅為防禦。

## DDL

```sql
-- organizers：開營組織（燈塔的主體；個人講師＝單成員組織）
CREATE TABLE organizers (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,         -- 品牌名或個人名
  bio           TEXT,
  course_link   TEXT,                          -- 模板頁導流用
  status        VARCHAR(20) NOT NULL DEFAULT 'active',  -- active / suspended
  approved_by   INT REFERENCES users(id),      -- 人工開通紀錄（FRD 7.1.1）
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- organizer_members：組織成員（燈塔登入門檻＝EXISTS 此表）
CREATE TABLE organizer_members (
  id            SERIAL PRIMARY KEY,
  organizer_id  INT NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL DEFAULT 'owner',   -- MVP 全 owner；分權預留
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organizer_id, user_id)
);
CREATE INDEX idx_organizer_members_user ON organizer_members(user_id);

-- programs：系列（FRD 的 Event 改名；中文結構詞 2026-07-21 定為「系列」，不預設課程形態）
CREATE TABLE programs (
  id            SERIAL PRIMARY KEY,
  organizer_id  INT NOT NULL REFERENCES organizers(id),
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  deleted_at    TIMESTAMPTZ,                   -- 軟刪；有 cohort 時 API 層擋
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ
);

-- cohorts：期（中文結構詞 2026-07-21 定為「期」——營隊/諮詢包/讀書會一輪皆為一期；display_name 由開營者自由命名）
CREATE TABLE cohorts (
  id              SERIAL PRIMARY KEY,
  program_id      INT NOT NULL REFERENCES programs(id),
  slug            VARCHAR(50) NOT NULL,        -- 英數代碼（系統/網址用）
  display_name    VARCHAR(100) NOT NULL,       -- 自由文字（給人看）
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  join_token      UUID UNIQUE DEFAULT gen_random_uuid(),  -- 邀請連結/QR
  invite_message  TEXT,                        -- 邀請信自訂段（FRD 7.3.5）
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',   -- draft/published/archived
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ,
  UNIQUE (program_id, slug)
);

-- cohort_enrollments：參與關係（一等公民，Canvas Enrollment 式）
CREATE TABLE cohort_enrollments (
  id           SERIAL PRIMARY KEY,
  cohort_id    INT NOT NULL REFERENCES cohorts(id),
  email        VARCHAR(255) NOT NULL,          -- 聯絡紀錄，非身分
  user_id      INT REFERENCES users(id),       -- 受邀未註冊為 NULL；加入時回填
  invite_token UUID UNIQUE DEFAULT gen_random_uuid(),
  status       VARCHAR(20) NOT NULL DEFAULT 'invited',  -- invited/joined/exited
  role         VARCHAR(20) NOT NULL DEFAULT 'member',   -- member/assistant 預留
  invited_at   TIMESTAMPTZ DEFAULT now(),
  joined_at    TIMESTAMPTZ,
  exited_at    TIMESTAMPTZ,
  UNIQUE (cohort_id, email)
);
CREATE INDEX idx_enrollments_cohort_status ON cohort_enrollments(cohort_id, status);
CREATE INDEX idx_enrollments_user ON cohort_enrollments(user_id);

-- cohort_templates：模板↔梯次綁定（多對多）
CREATE TABLE cohort_templates (
  id           SERIAL PRIMARY KEY,
  cohort_id    INT NOT NULL REFERENCES cohorts(id),
  template_id  INT NOT NULL REFERENCES practice_templates(id),
  bound_at     TIMESTAMPTZ DEFAULT now(),
  unbound_at   TIMESTAMPTZ,                    -- 解綁不刪列（已產生草稿不受影響有據可查）
  UNIQUE (cohort_id, template_id)
);

-- cohort_stat_snapshots：聚合快照（週次 BullMQ job ＋ 期末一次）
CREATE TABLE cohort_stat_snapshots (
  id            SERIAL PRIMARY KEY,
  cohort_id     INT NOT NULL REFERENCES cohorts(id),
  period_start  DATE NOT NULL,
  kind          VARCHAR(20) NOT NULL DEFAULT 'weekly',  -- weekly / final
  metrics       JSONB NOT NULL,
  computed_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (cohort_id, kind, period_start)
);

-- 既有表修改（均為加欄位，不動既有資料）
ALTER TABLE practice_templates ADD COLUMN organizer_id INT REFERENCES organizers(id);
  -- NULL＝平台官方模板；有值＝組織私有（FRD 7.4.3，組織內成員共見）

ALTER TABLE practices ADD COLUMN cohort_id INT REFERENCES cohorts(id) ON DELETE SET NULL;
CREATE INDEX idx_practices_cohort_id ON practices(cohort_id);

-- 草稿冪等（模板綁定 fan-out 防重跑）：僅約束系統代生草稿，
-- 路徑 B 自建與個人重複用模板不受限
CREATE UNIQUE INDEX idx_draft_once
  ON practices(user_id, cohort_id, template_id)
  WHERE creation_source = 'cohort_template';
```

`practice_checkins`、留言、reaction 均不動——可見性沿 `practices.cohort_id` 推導；營內動態牆＝該 cohort 底下 practices 的 checkins feed，複用既有互動機制。

## 已定的微決策與理由

| # | 決策 | 理由 |
|---|---|---|
| 1 | 模板擴充 `practice_templates`，不開新表、不用 practices 冒充模板 | 避免結構漂移；practices 冒充會污染統計/feed/搜尋語意（2026-07-21 使用者確認） |
| 2 | 快照表進 MVP | 「學員退出後聚合保留歷史」已是承諾規則，即時計算會默默違反；兼解儀表板效能與期滿只留聚合（使用者確認） |
| 3 | 逾期邀請 email 自動清除：**暫不做** | 使用者決定先不處理；記為後續個資強化項 |
| 4 | `cohorts.status` 只存編輯狀態（draft/published/archived），進行中/已結束由日期推導 | 免 cron 翻狀態的資料不一致風險；90 天唯讀同理以 `end_date+90` 推導 |
| 5 | 身分綁定以 enrollment 的 `invite_token` 為準，email 降級為聯絡紀錄 | 解「報課 email ≠ 島島帳號 email」的真實邊角；夥伴名單頁顯示不受影響 |
| 6 | `metrics` jsonb 最小形狀：`enrolled / activated / checkins / active_members / top_tags / exited` | 全為計數與聚合、零個人識別——期滿只留快照自動合規 |
| 7 | 開營者採組織模型（organizers ＋ organizer_members） | 支援多人共管品牌；個人＝單成員組織；登入門檻＝成員資格（使用者定案） |

## Server 層對應（摘要）

```
/api/v1/lighthouse/*   組織端：programs/cohorts/templates/enrollments/stats
                       middleware: requireOrganizerMember（EXISTS organizer_members）
                                 ＋物件級 ownership（cohort→program→organizer→members）
/api/v1/cohorts/*      參與者端：join（invite_token 或 join_token）、營內牆、我的草稿
邀請信：enrollment 建列 → BullMQ → 既有 email 系統
90 天唯讀：middleware 以 end_date+90 推導
types 鏈：storage → server（db pull＋zod＋openapi）→ f2e 自動同步；admin-ui 手補（組織審核頁）
```
