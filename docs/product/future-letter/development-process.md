# 「寫信給未來的自己」跨專案開發流程紀錄

> 日期：2026-08-22
> 範圍：`daodao-storage`、`daodao-server`、`daodao-f2e`、root `daodao`
> 需求來源：[daodao#148](https://github.com/daodaoedu/daodao/issues/148) 與兩份 FRD
> 結果：OpenSpec 47/47、真實 Playwright 10/10、四個 Draft PR 已建立

這份文件記錄「寫信給未來的自己」從 UI prototype、FRD 校準、跨專案實作、隱私強化、真實瀏覽器驗證，到 commit／push／PR 的完整流程。目的不是只留下功能說明，而是把這次有效的方法與踩過的坑整理成下一個跨專案功能可以直接重用的 playbook。

## 最終交付

| 層級 | Commit | Pull request | 主要內容 |
|---|---|---|---|
| Storage | `204a04e` | [daodao-storage#196](https://github.com/daodaoedu/daodao-storage/pull/196) | 資料表、migration、密文 envelope、狀態約束、唯一草稿 |
| Server | `dc07fd5` | [daodao-server#423](https://github.com/daodaoedu/daodao-server/pull/423) | 加密 CRUD、BullMQ 送達、open/delete、timeline、OpenAPI |
| Frontend / E2E | `50a0dbb` | [daodao-f2e#938](https://github.com/daodaoedu/daodao-f2e/pull/938) | 寫信流程、足跡時間軸、API hooks、Playwright 10 cases |
| OpenSpec / orchestration | `f866ab6` | [daodao#155](https://github.com/daodaoedu/daodao/pull/155) | 最終規格、工作清單、驗證摘要、三個 submodule gitlinks |

建議合併順序：**Storage → Server → F2E → Root**。

## 流程總覽

```mermaid
flowchart LR
    A[盤點真實現況] --> B[校準 Issue / FRD / OpenSpec]
    B --> C[Storage schema + migration]
    C --> D[Server service / queue / API]
    D --> E[產生 OpenAPI types]
    E --> F[Frontend + timeline]
    F --> G[Unit / integration tests]
    G --> H[真實 Playwright + video]
    H --> I[多模型 review + regression fixes]
    I --> J[乾淨 worktree commit]
    J --> K[Push + cross-repo Draft PR]
    K --> L[CI triage + dependency merge order]
```

流程中最重要的原則是：**不能因為 UI 看得到，就把功能判定為完成。** 每次都要沿著 storage schema → server route/service → generated API types → frontend data flow → real browser verification 逐層確認。

## Phase 1：先盤點現況，不直接相信畫面

一開始前端已經看得到寫信 Modal、時間軸與成長對照卡，但稽核後確認它只是 UI prototype：

- 寄出與儲存 handler 只會關閉 Modal，沒有呼叫 API。
- timeline 與信件詳情使用 hardcoded data。
- custom date、驗證、錯誤處理、loading、刪除與 deep link 不完整。
- 後端沒有對應的 Future Letter service／routes／generated types。
- 前端 typecheck 與 SVG accessibility lint 仍有錯誤。

這一步的產出不是「做了幾成」的直覺百分比，而是一張可驗證的矩陣：

| 層級 | 要確認的證據 |
|---|---|
| Storage | table、欄位、索引、migration 編號與 constraint |
| Server | validator、service、route、queue／worker、ownership、OpenAPI |
| API client | canonical generated types、service、hooks |
| Frontend | 真實 query／mutation、loading/error、狀態生命週期 |
| Browser | request/response body、DOM、worker transition、DB／Redis cleanup |

### 可重用做法

```bash
# 優先找真實實作與 generated contract，不只找 UI 文案
rg -n "future-letter|future_letters|FutureLetter" \
  daodao-storage daodao-server daodao-f2e openspec

# 查看各 repo 的 branch 與未提交變更
git status --short --branch
```

## Phase 2：把 Issue、FRD 與 OpenSpec 衝突收斂成單一契約

本次輸入包含 GitHub issue、兩份 FRD，以及既有 OpenSpec。它們在以下項目互相衝突：

- 寄出需要兩欄都有內容，或任一欄非空即可。
- 最短送達日是 7 天，或 3 天。
- 是否顯示 2,000 字計數與限制。
- 信件送達要發 notification/email，或只在 timeline 安靜呈現。
- 草稿是否可用明文儲存。
- 送達後是可編輯 reflection，或只能閱讀首次開啟內容。

最後以 FRD v0.1 的隱私與低壓互動原則定案：

- 任一欄有非空白內容即可寄出。
- 自訂日期為 3–90 天。
- 不在介面施加字數壓力；API 不保留舊的 2,000 字契約。
- 草稿建立時就加密，scheduled 與 delivered-unopened 不回傳內容。
- 不建立含 preview 的 Future Letter notification/email side channel。
- 送達由 timeline marker 安靜呈現；首次閱讀呼叫 idempotent open API。
- 寄出時保存 practice title snapshot，避免原實踐刪除後顯示壞連結。

OpenSpec 中的舊 tasks 沒有刪除，而是明確標記為歷史紀錄，由新版 12–13 節與最終 spec 覆寫，避免 reviewer 把舊規則誤當成驗收條件。

相關文件：

- [Final Future Letter spec](../../archive/openspec/changes/future-letter/specs/future-letter/spec.md)
- [Design decisions](../../archive/openspec/changes/future-letter/design.md)
- [Implementation tasks](../../archive/openspec/changes/future-letter/tasks.md)

## Phase 3：依相依順序實作，而不是四個 repo 各做各的

### 3.1 Storage 先定義資料不變量

新增兩個 migration：

1. `081_create_future_letters.sql`：建立基礎資料表與索引。
2. `082_secure_future_letters.sql`：加入密文 envelope、`sent_at`、`opened_at`、practice snapshot 與單一草稿約束。

過程中先 fetch live `origin/dev`，才發現 remote 已有另一支 `080` migration；因此將原本的 Future Letter `080/081` 改成 `081/082`。這證明 migration 編號不能只依本機 branch 判斷。

隱私不能只靠 application code，DB 也要守住：

- ciphertext、IV、auth tag、key version 必須同時存在或同時為空。
- scheduled／delivered 狀態不得保留 plaintext。
- 每位使用者最多一封 draft。
- constraints 使用 migration-safe 方式處理既有 legacy rows，同時約束新的 INSERT／UPDATE。

### 3.2 Server 實作生命週期與可靠送達

Server 實作以下路徑：

- draft create/upsert/update/delete
- send：驗證內容與日期、保存 snapshot、加密並切換 scheduled
- BullMQ deterministic job：`future-letter-{id}`
- startup recovery：重新排入所有 scheduled letters，而不只處理 overdue rows
- deliver：retry-safe 地切換 delivered
- open：idempotent 記錄第一個 `opened_at` 並解密 owner 內容
- timeline：只回傳 metadata，使用穩定 composite cursor

內容使用版本化 AES-256-GCM keyring。部署前必須設定：

- `FUTURE_LETTER_ACTIVE_KEY_VERSION`
- `FUTURE_LETTER_ENCRYPTION_KEYS`

舊 key version 仍被資料引用時不可移除。

### 3.3 先產生 canonical OpenAPI，再讓前端使用

Server 路由與 schema 完成後才執行 canonical generation：

```bash
cd daodao-server
pnpm run prisma:generate
pnpm run openapi:generate
pnpm run openapi:generate-types
```

然後把產出的 `generated/openapi-types.ts` 同步到 F2E 的 `packages/api/src/types.ts`。generated types 不手改；每次 server contract 改動後都重新產生並確認兩檔 byte-identical。

### 3.4 Frontend 最後接上完整資料流

Frontend 實作：

- typed Future Letter／timeline services 與 SWR hooks
- 草稿 query 完成前停用 CTA，避免晚到資料覆蓋剛輸入的文字
- 關閉 Modal 自動儲存唯一草稿；清空既有草稿時刪除 server copy
- mutation 使用 `try/catch/finally`，避免 rejected promise 讓 UI 永久 busy
- scheduled／unopened 內容不進 DOM、timeline response 或 notification surface
- homepage 與完整足跡共用日期座標模型並載入完整分頁
- 保留原本 Footprints list，而不是用新時間軸取代既有功能
- client-side query 變更時立即隱藏舊信件 action，避免短暫操作到錯誤目標

## Phase 4：把隱私當成跨層不變量

本功能的核心不是「資料庫裡有 ciphertext」而已，而是內容在送達與首次開啟前不能從任何旁路洩漏。

驗證範圍包括：

- DB row 與 JSON serialization 不含 sentinel plaintext。
- scheduled list/get/timeline response 不含內容。
- owner DOM、另一個帳號、notification payload 都看不到內容。
- request/error/Prisma log 遮蔽 cookie、authorization 與敏感 body。
- `open` 之前只回 metadata；`open` 後才允許 owner 取得解密內容。
- React 會 escape 字串並不代表可以顯示 letter payload；preview 本身就是隱私洩漏。

建議每個隱私情境使用高熵 sentinel，並同時掃描 DOM、network response body、console、trace attachment、server log 與 raw DB row。

## Phase 5：測試策略

### 5.1 Server focused tests

覆蓋 validator、encryption service、Future Letter service、queue、timeline、logging middleware 與 routes。review 後額外補上的 regression 包含：

- PATCH／send／delete 的 stale-write race。
- PostgreSQL `timestamptz(6)` 微秒與 JavaScript Date 毫秒 CAS 差異。
- failed／completed／unknown BullMQ deterministic job recovery。
- enqueue 成功但 client 回應失敗時，不可錯誤 rollback 成 draft。
- startup recovery 單筆失敗不得阻斷其他信件。
- equal-timestamp timeline pagination 必須用 timestamp + stable key。
- distinct check-in dates 必須在 DB 端 `DISTINCT … LIMIT`，不能先讀完整歷史。

### 5.2 Frontend pure logic tests

只測純邏輯，不為 React layout/CSS 寫脆弱測試：

- 任一欄可寄出、全空白不可寄出。
- 3–90 天日期邊界。
- 草稿清空策略。
- past／today／future 座標排序與 marker state。
- homepage 與 full timeline 使用相同 mapping。

### 5.3 Playwright 真實整合測試

Playwright 不是額外螢幕錄影工具。它直接控制自己啟動的 Chromium，並由 browser context 產生 `video.webm`，因此不需要 macOS「螢幕錄製」權限。

最終測試環境：

- Next.js product：port 3001
- Server API + real Future Letter worker：port 4000
- disposable PostgreSQL container：loopback port 55432
- Redis：logical DB 15
- 兩個 disposable users 與一個 disposable practice
- one worker，video always on

最終 10 個情境：

1. 關閉後自動儲存唯一草稿，CTA 可還原。
2. 全空白關閉不建立草稿。
3. 清空既有草稿會刪除 stale server copy。
4. 初始 draft loading 時 CTA 保持 disabled。
5. cached draft revalidation 時 CTA 保持 disabled。
6. scheduled 內容不出現在 UI、API 或 cross-account response。
7. 真實 worker 送達後，首次 open 才解密，reload 後保持 opened。
8. scheduled delete 的安全預設焦點為取消，確認後 delayed job 消失。
9. practice relation 移除後仍顯示寄出時 title snapshot。
10. homepage／full timeline 共用完整、分頁後的日期座標與 focus routing。

結果：**10/10 passed，32.6 秒，10 支影片**。

E2E harness 自己也需要測試與防護：

- Product、API、DB、Redis 預設都只允許 loopback。
- 遠端執行需要四個彼此獨立的 explicit opt-in。
- DB 名稱必須包含獨立 `test`／`e2e` segment。
- Redis 必須使用非 0 logical DB。
- 測試前記錄 baseline IDs，teardown 刪除所有本次新增 rows，即使 response parsing 或 assertion 中途失敗也能清理。
- 非同步 response body evidence 必須等待完成，不能在 listener 還沒讀完時先宣告隱私通過。
- browser error allowlist 只能精確比對已知 path、status 與 message，不能忽略所有 404。

原始 HTML、JSON、logs 與影片未提交 Git，避免重複數 MB 資料與 disposable user context。Git 只保存精簡的[驗證摘要](../../../artifacts/future-letter-playwright/verification.md)；正式長期保存應改由 CI artifact 或受控外部儲存負責。

## Phase 6：Review 不是一次性關卡，而是修正迴圈

依 repo 規範，push 前使用 Codex、Gemini 與 Claude Haiku review。這次 Gemini CLI 因 interactive OAuth consent 無法完成，因此如實記錄為 blocked，沒有把它算成通過。

有效的 review 流程是：

1. 保存每個 engine 的完整輸出。
2. 對相同 finding 做 cross-model 比對。
3. 用實際 code path、library semantics 與 regression test 判斷是否成立。
4. 修正接受的 High／Medium。
5. 對修正範圍跑 targeted post-fix review。
6. 對不接受的 finding 留下具體理由，不只寫「false positive」。

本次 review 找到並修正的代表性問題：

- 草稿 query race 覆蓋使用者剛輸入的文字。
- 清空草稿後舊內容復活。
- notification renderer 可能顯示 sealed payload。
- 多 instance startup recovery 同時處理 failed job。
- PATCH／send 之間的 stale ciphertext race。
- BullMQ enqueue 結果不確定時留下 orphan job。
- timestamp-only cursor 漏掉同時間事件。
- E2E 遠端防護與 cleanup 不足。
- async network evidence 尚未完成就提前通過。

## Phase 7：共享 dirty worktree 下的安全 commit 流程

原始 workspace 同時存在其他人的 `.github`、automation、Lighthouse 與子專案變更，不能直接 `git add -A`。本次做法是：

1. fetch 每個 repo 的 live remote base。
2. 從 `origin/main` 或 `origin/dev` 建立獨立 feature branch。
3. 用四個 `/tmp` clean worktrees 隔離 root、storage、server、f2e。
4. 只複製／套用 Future Letter scope。
5. 在 clean worktree 重新 generate、lint、typecheck、test。
6. 明確列出 staged files、secret scan、large-file scan 與 `git diff --check`。
7. 產生四份 commit message，取得使用者確認後才 commit。

分支與 base：

| Repo | Branch | Base |
|---|---|---|
| daodao | `docs/future-letter-frd-v01` | `main` |
| daodao-storage | `feat/future-letter-storage` | `dev` |
| daodao-server | `feat/future-letter-frd-v01` | `dev` |
| daodao-f2e | `feat/future-letter-frd-v01` | `dev` |

Root commit 最後更新三個 submodule gitlinks，指向實際 push 的 storage/server/f2e commit，讓 root checkout 能重現驗證組合，而不是只在文件中宣稱「完成」。

## Phase 8：PR 與 CI 的跨 repo 依賴處理

四個 PR 都以 Draft 建立，body 中互相列出 dependencies 與部署順序。

CI 結果：

- Storage PostgreSQL CI 與 schema constraint sync 通過。
- Server main test job 通過。
- F2E test、lint/typecheck、CodeQL、SonarCloud、EAS、GitGuardian 通過。
- Server schema drift 暫時失敗，因 workflow 固定 checkout `daodao-storage/dev`，尚未包含 Storage PR；Storage 合併後重跑即可。
- 四個 repo 的 Auto PR Description／AI Code Review 同時在 Azure Models `curl` 以 exit 6 失敗，判定為共用 workflow／網路問題，不是 feature diff。
- Vercel preview 失敗，但本機 Vercel token 已失效，無法取得 deployment log；因此明確列為外部未驗證項目。

判讀 CI 時要先找「第一個真實失敗步驟」，並分成三類：

1. **Feature regression**：修 code，補 regression test，再 push。
2. **Cross-repo dependency**：在 PR body/comment 寫清 merge order，dependency 合併後重跑。
3. **External/baseline blocker**：保存 log 與限制，不把它說成功，也不要為了變綠加入錯誤 ignore。

## 完成定義

本次把「完成」定義為以下條件同時成立：

- [x] 最終 FRD/OpenSpec 無互相矛盾的驗收契約。
- [x] Storage、Server、generated API types、Frontend 串接完成。
- [x] sealed content 的 DB、API、DOM、notification、log 隱私不變量成立。
- [x] queue retry、startup recovery、open、delete 與 timeline pagination 有 regression coverage。
- [x] lint、typecheck、focused tests 與 schema drift 在正確的跨 branch 組合通過。
- [x] 真實 Playwright 使用 API、DB、Redis、worker 跑完並保存影片。
- [x] E2E teardown 證明 feature rows/jobs 為 0，temporary services 已關閉。
- [x] 接受的 review blocker 已修正並完成 post-fix review。
- [x] 四個 commit、branches、Draft PR 與 gitlinks 已建立。
- [x] 尚未驗證的外部項目有清楚標記。

## 下次可直接使用的檢查清單

### 開發前

- [ ] fetch live default branch，確認 migration 編號與 generated contract 沒有漂移。
- [ ] 盤點 UI 是否只是 mock，沿 storage → server → API types → frontend 查證。
- [ ] 把 PRD／FRD／OpenSpec 衝突寫成 decision list，先定案再開發。
- [ ] 為跨 repo 工作建立 filesystem plan 與各自 clean worktree。

### 實作中

- [ ] Storage 先建立 DB-level invariants，再同步 Prisma。
- [ ] Server route/schema 完成後用 canonical scripts 產生 OpenAPI。
- [ ] Frontend 只消費 generated types，不手改 contract。
- [ ] 每個 pure logic／service／validator 都有測試；每個 bug 都補 regression。
- [ ] 隱私資料以 sentinel 同時掃 DB、API、DOM、logs、trace。

### 發布前

- [ ] 跑各 repo lint、typecheck、focused tests、diff check。
- [ ] 用真實 worker 與 isolated DB/Redis 跑 Playwright；video 不等於功能證據，仍要收 network/DB/log。
- [ ] 驗證 cleanup，而不是在 result JSON 裡無條件寫 `cleaned: true`。
- [ ] review findings 逐項接受／駁回並附證據，修後再做 targeted review。
- [ ] selective stage、secret scan、large artifact scan。
- [ ] 取得 commit message 確認後才 commit。
- [ ] push 後開 Draft PR、交叉連結 dependency、確認 merge order 與 CI 真實失敗原因。

## 一句話總結

這次最有價值的不是「完成一個寫信功能」，而是建立了一條可重複的跨專案交付鏈：**規格先收斂、資料隱私下沉到 DB、契約由 server 生成、前端只消費真實 API、瀏覽器以隔離環境驗證整條生命週期，最後用 review 與乾淨 worktree 把結果安全地發布。**
