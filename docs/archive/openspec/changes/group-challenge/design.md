# Design: 共同挑戰（v2）

## Context

新版 FRD（FR-CC-02/04：「類似現在的 lighthouse 模式，設定主題並在底下設 cohort，指定使用模版和開始日」）明確指向複用燈塔基礎設施。既有可複用元件：

- **燈塔資料模型**：`organization` → `programs`（主題容器）→ `cohorts`（期：start/end date、join_deadline、capacity、draft/published/archived）→ `cohort_templates`（綁定模板＋開始日）→ `cohort_enrollments`（參與關係，即 ACL 依據）
- **加入自動建實踐**：cohort_templates 的「加入期時依有效綁定為學員建立實踐草稿」＝ FR-CC-06 的自動複製
- **打卡生態**：practices（已有 `cohort_id`、`creation_source='cohort_template'`）+ practice_checkins + comments + reactions
- **Email**：`email_templates`（slug 制）+ `email_logs`（email_type 查重）+ BullMQ

## Decisions

### D1：共同挑戰複用 lighthouse 資料模型，programs 加 `kind` 區分

**決策**：不新建 challenges/challenge_participants 表。共同挑戰主題 = `programs`（`kind='challenge'`，掛在島島官方 organization 下）；每一檔挑戰 = `cohorts`；模板與開始日 = `cohort_templates`；參與者 = `cohort_enrollments`（status='joined'）。

**理由**：FRD 明說「類似 lighthouse 模式」；加入自動複製、期日期、發佈狀態、容量、參與關係全部已有實作。dev/prod 的 046 gamification `challenges`/`challenge_progress` 表皆為 0 筆且未上線，不沿用也不刪除（留待另案清理）。

**替代方案**：獨立 challenges 表（v1 設計）─ 捨棄，會重複實作 enrollment/模板複製/狀態推導。

### D2：`kind` 欄位不加 DB CHECK，值域由 server TS 常量管控

沿用 daily-inspiration-card change 確立的慣例，避免 schema-sync-check 三 repo 常量比對的維護成本。`kind IN ('lighthouse','challenge')` 由 Zod/TS 常量守衛，DB 僅設 `NOT NULL DEFAULT 'lighthouse'`。

### D3：挑戰運行狀態由日期推導，不新增狀態欄位

沿用 cohorts 慣例（status 僅表編輯狀態 draft/published/archived）。卡片狀態對應：
- 現在加入 = published 且今日 < start_date（或在 join 規則內）
- 打卡 Disable = 已加入且今日 < start_date
- 打卡 Enable = start_date ≤ 今日 ≤ end_date
- 已完成 = 今日 > end_date；已結束的挑戰不接受新加入（FR-CC-04）

### D4：留言 ACL 以 cohort_enrollments 查詢實作 middleware

挑戰情境的 comment 建立前查詢 `cohort_enrollments`（cohort_id + user_id + status='joined'）。打卡紀錄全公開（practices 建立時強制 visibility='public' 且不可改，API 層鎖定）。前端隱藏不能替代後端校驗。

### D5：六節點 Email 以 BullMQ + email_logs 查重實作

- 模板：`email_templates` 新增六個 slug（`challenge_welcome`、`challenge_t48h`、`challenge_day1`、`challenge_first_checkin`、`challenge_end`；週摘要併入現有週報，不另立 slug）
- 排程：T-48h／Day 1／End 依 cohort 日期建 BullMQ delayed job；Welcome、First Check-in 為事件觸發（First Check-in 於打卡隔日 08:00 寄）
- 冪等：寄送前查 `email_logs`（user + email_type + cohort 關聯）確保同節點不重寄；`email_logs.email_type` CHECK 需擴充挑戰類型
- 時區：Asia/Taipei

### D6：靈感卡獨立四表，assign 對象為 cohort

- `inspiration_decks`（卡組：名稱、軟刪除）
- `inspiration_deck_cards`（卡片：純文字 ≤50 字）
- `inspiration_deck_assignments`（卡組 ↔ cohort 多對多；assign 後主題卡片顯示抽卡 icon）
- `inspiration_draws`（抽卡記錄：user、日期（Asia/Taipei）、抽到的卡、是否選定）；每日 3 抽與排除邏輯由 server 依此表計算
- Excel 匯入走 admin API（xlsx 解析在 server），不落地檔案
- 與 `daily-inspiration-card` change（每日書摘輪播）為不同功能，資料表不共用

### D7：探索共同挑戰頁為公開 standalone 頁

不登入可瀏覽（SSR），點「加入」才要求登入。列出 published 且未結束的挑戰；已結束挑戰保留歷史足跡頁可讀。

## Risks / Trade-offs

- **lighthouse 語意偏移**：cohort_enrollments 原為邀請制（invite_token/email），挑戰為公開加入 → 加入 API 直接建立 status='joined' 記錄，email 欄位留空；風險是 lighthouse 既有查詢混入挑戰資料 → 一律以 `programs.kind` 過濾
- **046 gamification 殘留表**：challenges/challenge_progress/badges 閒置 → 不動它，避免本 change 範圍膨脹
- **週摘要併入週報**：依賴既有週報基礎設施；若週報尚未涵蓋挑戰內容，擴充點在週報產生器而非新信件
- **零打卡使用者的 End 信處理**：FRD 標註待決議 → 先照常寄送，文案不提成果數字

## Migration Plan

1. **daodao-storage**（migration 083）：`programs` 加 `kind`；靈感卡四表；`email_logs.email_type` CHECK 擴充；島島官方 organization idempotent seed；同步回寫 schema/
2. **daodao-server**：kind 常量與 Zod、挑戰公開查詢/加入 API、comment ACL middleware、BullMQ email jobs、抽卡 API、admin 管理 API、Satori 不需要（v2 無分享圖卡）
3. **daodao-f2e**：探索頁、卡片狀態、抽卡 UI
4. **daodao-admin-ui**：挑戰管理（lighthouse 模式延伸）、卡組管理
5. **Rollback**：migration 皆為加法（新欄位/新表），feature flag 控制前端入口

## Open Questions

- 週摘要「併入現有週報」的具體位置與觸發（週報現況需盤點）
- 零打卡使用者的 End 信是否寄送（FRD 待決議）
- 「91 天內」是否需要後端驗證上限
- ~~admin 前台建立入口的「僅管理者可見」以何種角色判斷~~ → 2026-08-28 定案：挑戰建立/管理與卡組管理集中於 daodao-admin-ui，權限沿用 Admin／SuperAdmin 角色（requireAdmin），不做前台建立入口
- 挑戰期間受模板 duration_days（7/14/21/30，practice_templates CHECK）限制；FRD「91 天內」的自由期間若需 28 天等值，需另案放寬 CHECK
