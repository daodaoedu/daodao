# OpenSpec 規格 vs `dev` 程式碼 稽核報告

- **日期**：2026-06-02
- **基準**：各 repo `origin/dev`（worker 無 dev → `origin/main`），未切換分支、未動工作區
- **範圍**：`openspec/specs/` 全部 **81** 個 capability，逐條 requirement（509）/逐個 scenario（1178）對照程式碼
- **方法**：11 個並行稽核 subagent，每個 spec 一份明細：`/.omc/openspec-audit/specs/<name>.md`（含 `repo:path:line` 證據）

> ⚠️ 計數說明：各明細的 ✅/⚠️/❌ 有的以 requirement、有的以 scenario 為單位，**故下方以「分類」判讀為準，不要對數字加總**。

---

## 一、總結（一句話）

**規格庫嚴重超前實作。** 81 個 spec 中只有 **10 個完全符合**、29 個大致符合；**有 19 個 spec 對應的程式碼幾乎/完全不存在（純規劃文件 / 幽靈規格）**，另有 23 個存在明顯落差。最危險的不是「沒做」，而是有幾個 spec **看起來做了、實際是空殼或契約不符**（trust-automod、audit-log、user-tags、professional-social-proof、communication）。

| 分類 | 數量 | 意義 |
|---|---|---|
| 🟢 A 完全符合 | 10 | 每條 requirement 都有對應程式碼，無落差 |
| 🟡 B 大致符合（小落差） | 29 | 主功能到位，差在命名/邊界/文案/單一 scenario |
| 🟠 C 部分落差 | 23 | 有實作但明顯缺塊，或後端有、前端沒接 |
| 🔴 D 幾乎/完全未實作 | 19 | spec 已進 `specs/` 但程式碼查無對應（幽靈規格） |

---

## 二、🔴 D 類：幽靈規格（spec 存在，程式碼幾乎/完全沒有）— 最該處理

這些 spec 已被當成「已完成」收進 `openspec/specs/`，但 `dev` 上找不到任何對應實作。建議：**要嘛降級回 `changes/`（未完成），要嘛標 `superseded`，不要留在 specs/ 當真相。**

### 群組 1：整套 AI 服務管理（對應已被刪除的 `add-ai-service-management` change）
- `ai-assistant`（14 reqs 全 ❌）— 後台 AI 助理 / 知識庫 / RAG / 共享收件匣，全無；只有 Qdrant 連線與泛用 LLM client
- `ai-workflow-builder`（8 reqs 全 ❌）— workflow 資料表 / API / UI / skill-call 全無
- `ai-workflow-nlp-generator`（6 reqs 全 ❌）
- `ai-workflow-ab-test`（3 reqs 全 ❌）
- `ai-data-source-config`（4 reqs 全 ❌）
- `workflow-skill-manager`（6 reqs 全 ❌）— Skill CRUD / Agent 對話 / runtime 4 repo 皆 0 命中

> 註：`openspec/changes/` 下這些 change 目錄已被 `git rm`（見 git status 的大量 D），但 delta 已落進 `specs/`，造成 specs 留下無主規格。

### 群組 2：統一分析追蹤層（重構未落地）
- `analytics-core`（✅0 ❌8）— 無 `AnalyticsAdapter`/`initTracker`/`trackUnifiedEvent`/`registerAdapter`，`package.json` 無 `./core` export
- `analytics-event-catalog`（✅0 ❌9）— `EventMap`/18 事件只存在於 docs 計畫文件
- `analytics-web-adapters`（✅0 ❌5）— `ga4/posthog/clarityAdapter` 不存在，仍是舊扁平 `trackEvent/posthogCapture`
- `feed-composition-algorithm`（✅0）— spec 要後端 1:1:3 slot 演算法 + `slot_type`，實作只有前端 client-side 1:1:1 reorder

### 群組 3：使用者端「挑戰（Challenge）」功能整片空白
server 只有 admin 端 gamification CRUD（`challenges`/`challenge_progress`），**使用者端報名/完成/動態全無**，f2e `useChallenges()` 是寫死 mock。
- `challenge-completion`（✅0 ❌13）、`challenge-conversion`（✅0 ❌8）、`challenge-discovery`（✅0 ❌9）、`challenge-enrollment`（✅0 ❌5）、`challenge-feed`（✅0 ❌3）、`challenge-permissions`（✅0 ❌4）
- ⚠️ spec 假設的 `challenge_participants` 表 + `challengeRole` ACL **從未建置**，與現有 `challenges`/`challenge_progress` 是不同概念模型。

### 群組 4：實踐歷程匯出 / 驗證章
- `practice-markdown-export`（✅0 ❌7）、`practice-pdf-export`（✅0 ❌8）— `generatePracticeMarkdown`/`usePracticeExportMarkdown`/export 端點 / PDF / QR 全 0
- `verification-badge`（✅0 ❌7）— practice journey export + 驗證章在 dev 不存在
  - 對應 archived `tasks.md` 內這些任務本來就 `[ ]` **未勾選**，規格卻已 ADDED 進 specs。

---

## 三、🟠 C 類：部分落差（有做但缺塊）— 重點摘錄

完整每條對照見各 `specs/<name>.md`。以下為每個 spec 最關鍵的缺口：

| spec | 關鍵落差 |
|---|---|
| `social-connect` | 後端連結邏輯完整；但 @mention 未計入互動、f2e 未依 bypass 跳過 Modal、「僅限夥伴」gate 無法證實 |
| `practice-copy-cta` | copy API 回傳缺 `title`；`CommunityChallengeCard`、`/dev/template-preview` 不存在 |
| `report-center` | 缺「預覽端點」、自訂報表拖拉排序未實作、警報啟停 toggle 前端未接線 |
| `follow-connect` | **資料模型與 spec 背離**：無 `cancelled` 狀態、reason 規則改成動態互動門檻；關注非公開實踐**缺 403 隱私檢查** |
| `gamification` | 後端徽章完整，但**個人檔案徽章展示前端缺失**；自動徽章僅 checkin_streak/likes_received |
| `onboarding-registration` | 實作是單一表單 client stepper，非 spec 的逐步 `onboarding_step` API |
| `unified-dashboard` | 缺「近期異常警報」區塊、KPI 缺本月新增/成長率、無刷新失敗頂部警示 |
| `event-management` | 週期性活動僅手動產 1 筆（非自動提前 4 週）、無 QR 簽到、無討論串自動建立 |
| `learning-admin` | 後端 + migration 045 大致在，但 **admin-ui 無對應前端頁面**；drop-off/cohort 為 stub |
| `trust-automod` | ⚠️ **CRUD 齊全但完全無 enforcement**；且 service/worker 讀 `promotion_criteria` jsonb，該欄位不存在（晉升條件 runtime 會壞） |
| `user-analytics` | 缺註冊趨勢圖、標籤篩選、快捷日期、漏斗流失人數、熱力圖 tooltip；漏斗轉換率口徑不符 |
| `member-directory` | 後端欄位 CRUD 在，但前台名錄頁/搜尋/私訊/審核隱藏全缺（完成度 ~30-40%） |
| `system-ops` | 門檻警示未差異化、批次發信至區段 + 匯出缺失 |
| `user-support` | **FeedbackPage 回覆/狀態變更只 `alert()` 未接 API**，回覆不真的寄信 |
| `audit-log` | ⚠️ **「假完整」**：表/查詢/全文搜尋在，但 `createAuditLog` 無任何呼叫點（不會自動記錄）、保留政策更新是 no-op |
| `community-onboarding` | 僅扁平問卷；答案→動作對應、自動指派 tag/role、完成徽章、首要行動全缺 |
| `user-detail-timeline` | AI 使用統計 / AI 查詢時間軸 / 日期範圍篩選 / GDPR 匯出全缺 |
| `user-tags-segmentation` | ⚠️ **自動標籤是空殼**：規則 CRUD 在，但無任何 cron/job 真正評估規則套用；admin-ui 多處 `alert('功能開發中')`；API 契約不一致 |
| `cheer-engagement` | 架構性背離：spec 的 `practice_reactions` 表 + `/practices/:id/react` 改成泛用 `reactions`；唯一鍵語意相反；delayed 通知未過濾 |
| `communication` | 通知/觸發信「新增」按鈕皆 `alert('功能開發中')`；**admin-ui `/email/trigger-rules` 與 server `/email-triggers` 路徑不一致（接了也 404）** |
| `content-performance` | 僅 2 條後端路由；歸因/置頂/排程精選/合輯 CRUD/匯出全缺 |
| `professional-social-proof` | ⚠️ **孤立 service**：`practice-social-proof.service.ts` 寫好但無任何 route/controller 呼叫，export 端點全缺 |

---

## 四、跨領域重大主題（決策用）

1. **規格庫超前現實一大截**：19 個幽靈規格 + 23 個部分落差 = **約 52% 的 spec 與 dev 不一致**。`openspec/specs/` 目前不能當「系統真相」使用。

2. **「假完整」陷阱（最高風險）**：`trust-automod`、`audit-log`、`user-tags-segmentation`、`professional-social-proof` 都有資料表與 service，但**核心行為（enforcement / 自動記錄 / 規則評估 / 對外端點）是空的**。Code review 只看「有沒有檔案」會被騙過。

3. **後端有 API、前端沒接（admin 系）**：`user-support`、`communication`、`report-center`、`user-tags`、`member-directory`、`learning-admin` 共通模式 — server 端點齊但 admin-ui 用 `alert()` 佔位或路徑不一致。

4. **會造成 runtime bug 的契約 / 資料模型不一致**（建議優先修）：
   - `trust-automod`：service/worker 查不存在的 `promotion_criteria` 欄位
   - `communication`：admin-ui `/email/trigger-rules*` ↔ server `/email-triggers*` 路徑不符 → 404
   - `showcase-search`：後端回 `popular_keywords`，前端期望 `trending_keywords` → 取不到熱門關鍵字；多標籤是 OR 非 spec 要求的 AND
   - `user-tags-segmentation`：admin-ui `createTagRule` 送 `{name,condition}`，後端要 `{tagId,conditionType,...}`
   - `comments`：spec 要伺服器解析 `@custom_id` 寫入 `comments.mentions TEXT[]`，實際只用前端傳的 id、且該欄位不存在
   - `follow-connect` / `cheer-engagement`：唯一鍵 / 狀態機與 spec 不符

5. **archived changes 與 specs 不同步**：`git status` 顯示大量 `openspec/changes/...` 被刪除（含 `add-ai-service-management`、`admin-user-management-apis`、`batch-reactions-api` 等），但其 delta 已落進 `specs/`。其中 `add-ai-service-management` 的 6 個 spec 全是幽靈規格；而 `batch-reactions`、`admin-user-management` 則確實已實作。**刪 change ≠ 已實作**，需逐一回填狀態。

---

## 五、🟢🟡 已實作良好（A + B，供對照）

**A 完全符合（10）**：`admin-statistics`、`admin-user-management`、`browse-activity`、`comment-mention`、`comment-reaction-notification`、`notifications`、`practice-tab-count-badge`、`profile-activity-metrics`、`showcase-feed-mixed-items`、`welcome-email`

**B 大致符合（29）**：`batch-reactions`、`checkin-reactions-comments`、`checkin-showcase-card-structure`、`comment-reply-notification`、`comments`、`data-export`、`email-history`、`env-config`、`learning-footprints`、`notification-delivery`、`notification-email`、`notification-events`、`notification-preferences`、`onboarding-badge`、`onboarding-email-sequence`、`onboarding-progress-widget`、`practice-feed`、`practice-management`、`privacy`、`product-topic-recommendation`、`quick-reactions`、`recommendation-feedback-signals`、`settings-completion-guide`、`social-follow`、`social-hub`、`showcase-search`、`universal-view-tracking`、`user-avatar-upload`、`user-profile-page`

> B 類的小落差（命名/邊界/文案）已逐一記在各 `specs/<name>.md`，可當待辦清單。

---

## 六、建議下一步

1. **先處理第四節第 4 點的契約不一致**（6 項）— 這些是現在就會 404 / 讀錯欄位的 bug，成本低、影響真實使用者。
2. **D 類 19 個幽靈規格做狀態歸位**：能落地的移回 `changes/`，已被取代的標 `superseded`（如 `practice-feed` 已被 `showcase-feed-mixed-items` 取代、`cheer-engagement` 已被泛用 reactions 取代）。
3. **「假完整」4 項補 enforcement/呼叫點**，或在 spec 標註為「資料層 only」。
4. 若要讓 `openspec/specs/` 重新可信，建議把本報告的分類寫回各 spec 開頭的狀態標記。

---

## 附錄：明細檔案

- 每個 spec 的逐條對照（含證據）：`.omc/openspec-audit/specs/<spec-name>.md`（81 份）
- 分批清單：`.omc/openspec-audit/batches/batch-01..11.txt`
- 規格盤點：`.omc/openspec-audit/inventory.txt`
- 分類彙整：`.omc/openspec-audit/rollup.tsv`
- 稽核協定：`.omc/openspec-audit/PROTOCOL.md`
