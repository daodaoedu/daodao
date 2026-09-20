# 信件寄送改讀後台模板：後台編輯與啟停真的影響寄出的信

> 工程交接模板，由 skill／開發補充；提出者只需確認需求摘要與驗收。AC 為本卡新訂（無既有 FRD）。尚未開始的執行欄位依 README 標記。

schemaVersion: 1
templateVersion: 1

## 需求摘要（白話）

**現況**：後台「信件管理 → 模板管理」可以編輯 24 個模板的 HTML、主旨，也有「啟用／停用寄送」按鈕（#216 已修好編輯器）。但實際寄出去的信**全部來自 daodao-server 程式碼裡的模板**（`src/services/email/*-template.ts`），後台改什麼都不會反映；「停用寄送」也沒有任何寄信路徑會看 `is_active`，照寄。DB 的 24 筆只是 migration 052–057 從程式碼抄進去的副本。

**要達成**：後台改了模板 HTML／主旨 → 下一封該類型的信就用新內容；後台停用 → 該類型不再寄出（記錄 skipped）；後台沒有對應模板或內容為空 → 維持程式碼模板照常寄，不能因為後台資料缺漏就斷信。

**不包含**：
- 觸發式郵件 worker（`email-trigger.worker.ts`）的實際寄送串接（目前是 TODO，只寫 log）——另開卡。
- 後台編輯器新功能（變數填值預覽、dataSource 選擇器）——#216 已決定移除，需要再另開。
- 通知 digest／共同挑戰／燈塔等「非 24 筆模板」的信件——先不納入，維持程式碼模板。

## 任務索引與責任

- 中央 Issue：daodaoedu/daodao#236 https://github.com/daodaoedu/daodao/issues/236
- 任務指派：沿用 GitHub Assignees；未指派不阻擋 Todo
- Google 需求文件：無；需求由本卡摘要 + 程式碼查證（daodao-server origin/dev 628cdbe、dev DB email_templates 24 筆）整理，**待確認：尚未經 prd-generation 定稿／若需正式 PRD 再補**
- 核准需求快照：尚未產生
- Acceptance snapshot：本卡「驗收契約」
- POC：n/a：純後端行為變更，無 UI；驗收以 email_logs／寄出內容為準
- Drive 任務資料夾／驗收群組：尚未產生
- 相關：#216（後台編輯器，已關）、#219（#216 重複卡，建議關閉）、#165（信件送達通知）

## 目標與範圍

- 使用者問題與完成後可觀察結果：營運可以不經工程改信件文案、暫停某類信；改完在 dev 觸發一封即可看到新內容。
- 本次包含：
  1. server 新增「模板解析」層：依 slug 查 `email_templates`，`is_active=false` → 不寄並記 `email_logs.status='skipped'`；有 body → 用 DB body/subject 做 `{{變數}}` 替換；查無或 body 空 → fallback 程式碼模板（行為與現在完全相同）。
  2. 每個 slug 的變數對照：程式碼模板吃 TS 資料物件（如 `WelcomeEmailData`、PE01 的 practice/user），需定義「資料物件 → 扁平 `{{key}}` map」，key 名以 DB `variables` 欄位為準（見交接附錄）。
  3. 24 筆模板全部要有 slug：目前 id 4（馬拉松）、5（許願採納）、6（共鳴）、7（4 小時摘要）、8（每週摘要）、24（測試用）**slug 為空**，需 storage migration 補 slug + unique index。
  4. DB 查詢加短 TTL cache（避免每封信打 DB），後台儲存後最多延遲 N 分鐘生效（N 由開發定，建議 ≤ 5 分鐘，AC-06 驗）。
- 本次不包含：見需求摘要。
- 風險：
  - **斷信**：DB body 被改壞（缺 `{{name}}`、HTML 損毀）會直接寄出壞信。緩解：未替換到的 `{{var}}` 保留原字串並 warn log；空 body 走 fallback；後台已有預覽。
  - migration：補 slug 屬 idempotent UPDATE + index，需在 server 上線前先跑。
  - 相容：fallback 路徑必須零行為差異，用現有 email 測試保護。
- 涉及 repo、相依與部署順序：daodao-storage（slug migration，先）→ daodao-server（解析層，後）。daodao-admin-ui 不改。

## 驗收契約

環境：dev（server-dev.daodao.so + pg-dev），SuperAdmin 帳號經 admin-dev 操作模板；觸發信件用既有 dev 流程（如新用戶註冊觸發歡迎信、建立實踐觸發 PE01）。寄出內容以 `email_logs` + dev 信箱／SMTP log 為證。

| AC ID | Required | Given／When／Then | Repo | 測試資料／角色 | 必須證據 |
|---|---|---|---|---|---|
| AC-01 | yes | 後台將 `welcome-letter` body 加上可辨識字串並儲存／觸發一封歡迎信／寄出的 HTML 含該字串、`{{name}}` 已替換成收件人名 | daodao-server | SuperAdmin + 新 temp 用戶 | 後台儲存截圖、寄出信 HTML（SMTP log 或收件截圖）、email_logs 該筆 |
| AC-02 | yes | 後台將 `practice-created`（PE01）停用／建立一個實踐／不寄出 PE01，email_logs 記一筆 status=skipped，其他類型照寄 | daodao-server | SuperAdmin + 一般用戶 | email_logs 查詢結果、server log |
| AC-03 | yes | 後台將某模板 body 清空或 DB 無該 slug／觸發該類型信／寄出內容與現在程式碼模板逐字相同 | daodao-server | 同上 | 寄出 HTML diff（與 fallback 快照比對）= 0 差異 |
| AC-04 | yes | DB body 含 `variables` 欄位列出的每個 `{{key}}`／觸發 PE01（11 個變數）／全部替換，無殘留 `{{` | daodao-server | 一般用戶 + 有打卡的實踐 | 寄出 HTML、單元測試 |
| AC-05 | yes | DB body 含未定義變數 `{{unknownVar}}`／觸發／信照寄、該字串原樣保留、server 記 warn | daodao-server | 同上 | server log、寄出 HTML |
| AC-06 | yes | 後台儲存後／等待 cache TTL／下一封信用新內容；TTL 內可能舊內容需在後台或文件明示 | daodao-server | SuperAdmin | 時間戳對照（儲存時間、寄出時間、內容版本） |
| AC-07 | yes | 6 筆缺 slug 的模板跑 migration 後皆有唯一 slug，且與 server 端 slug 常數一一對應 | daodao-storage | pg-dev | `SELECT id, slug FROM email_templates` 全 24 筆非空、unique index 存在 |
| AC-08 | yes | 現有 email 相關 jest 測試全數通過；解析層新增單元測試覆蓋 active／inactive／fallback／變數替換 | daodao-server | CI | CI 綠、測試檔路徑 |

- 環境／語系／瀏覽器／viewport／DPR：n/a：後端行為；後台操作用 admin-dev 桌機即可
- POC 容差與差異決策：n/a：無 UI 變更
- 真實後端驗證：server-dev.daodao.so；寫入後以 `GET /api/v1/admin/email-templates/:id` 回讀 + pg-dev `email_logs` 查詢
- Done 條件：storage migration 在 dev 跑過 → server PR merge 並部署 server-dev → AC-01～08 在 dev 全 pass → 24 筆模板哪些已接 DB、哪些仍為程式碼 fallback 列表寫進 issue comment

## 執行政策與狀態

- 模式／writer：local / claude（人工驅動；不設 auto）
- 已授權範圍：尚未授權開發；本卡僅需求確認
- Merge：人工；人工驗收：pending
- Ready 缺項：待確認：(1) 變數對照表由開發起草後需提出者確認 key 名是否要改；(2) cache TTL 數值；(3) 是否需要 PRD 正式文件
- Run ID／狀態／state version：尚未開始
- Lease owner／fencing token／期限：未啟用
- 額度：not-checked
- 預算政策版本／Workers AI reservation／paid fallback：n/a：不使用 Workers AI；paid fallback false
- 阻塞與下一步：none；下一步為提出者確認需求摘要與 AC，再決定是否拆 storage／server 子卡

## 跨 repo 交付索引

| Repo | 子 Issue | Base SHA | Head SHA | PR | 受驗後端 image／schema version | 狀態 |
|---|---|---|---|---|---|---|
| daodao-storage | 尚未建立 | 尚未開始 | 尚未開始 | 尚未開始 | 尚未產生 | todo |
| daodao-server | 尚未建立 | 尚未開始 | 尚未開始 | 尚未開始 | 尚未產生 | todo |

- 驗收報告／manifest／acceptance key：尚未產生
- AC 結果：not-run 0/8
- 回報同步狀態：pending

## 交接附錄（工程，由查證整理）

**現況查證（daodao-server origin/dev 628cdbe）**
- 所有寄送路徑：`template.service.ts`（歡迎／驗證／密碼／馬拉松／聯絡）、`practice-email.service.ts`（PE01–08，`base-template.ts` 組裝）、`onboarding-email.service.ts`（入門 A–E）、各 `*-template.ts`。**無任何路徑讀 `email_templates` 表或 `is_active`。**
- 唯一讀表處：`queues/email-trigger.worker.ts:126`，但寄送為 `// TODO: 串接 emailService.sendEmail`，只寫 `email_execution_logs`（本卡不包含）。
- `email_logs.email_type` 用 `EMAIL_TYPES` 常數（`auth_register`、`practice_created`…），與 DB `slug`（`welcome-letter`、`practice-created`…）命名不同，解析層需一張對照表。

**dev DB `email_templates` 24 筆 slug 現況**：1 welcome-letter、2 auth-email-verify、3 auth-password-reset、**4／5／6／7／8／24 空**、9–16 practice-created／practice-first-checkin／practice-weekly-pe03～pe06／practice-final-pe07～pe08、17–21 onboarding-a～e、22 welcome-letter-social、23 welcome-letter-community。

**建議設計（開發可調整）**
- `EmailTemplateResolver.resolve(slug, data): { subject, html } | { skipped: true }`：DB 查詢（TTL cache）→ inactive 則 skipped → body 非空則 `renderDbTemplate(body, flatten(slug, data))` → 否則 `codeTemplate(data)`。
- `flatten(slug, data)`：每 slug 一個 mapper，輸出 key 對齊 DB `variables`；未知 key 保留 `{{key}}` 並 `logger.warn`。
- 呼叫端只改一行：`templateService.generateXxx(data)` → `resolver.resolve('slug', data)`，並處理 skipped（寫 email_logs status=skipped，不丟錯）。
- storage：`migrate/sql/0NN_email_templates_slug_backfill.sql`（idempotent UPDATE 6 筆 + `CREATE UNIQUE INDEX IF NOT EXISTS`）。
