---
name: migration-safety
description: 你觀察到以下任一狀態時載入：正要在 daodao-storage 新增/修改任何 SQL migration；schema 變更部署失敗；migration_history 出現 success=false；要重建 CHECK constraint；prisma schema 與 DB 疑似不一致；準備 merge storage 的 dev 進 main
---

# Migration 安全手冊

> 最後校準：2026-07-14。storage 是全系統事故密度最高的 repo，本檔的每條規則背後都有一次部署失敗或一次登入全斷。

## R1. 三處同步規則（本 repo 最貴的教訓）

- 觸發：任何欄位/表/約束變更。
- 步驟：一次 schema 變更 = **三個檔案**：
  1. `daodao-storage/migrate/sql/{下一序號}_{描述}.sql` —— 給既有 DB
  2. `daodao-storage/schema/` 對應檔 —— 給全新環境（initdb 只跑 schema/，不跑 migrate/）。找對應檔：`grep -rln "<table_name>" /home/user/daodao-storage/schema/`（檔名帶序號前綴，如 630_create_table_temp_users.sql）
  3. `daodao-server/prisma/schema.prisma` —— 給 ORM（改完跑 `pnpm run prisma:generate`；若 ai-backend 有對應 ORM model 也要同步 `src/models/`）
- 完成定義：三處都改；storage 跑 `make check-schema` 綠；server 跑 `pnpm run schema:drift` 綠。
- ✅ 正例：`2566b9a`（#162）——migration 069 + schema/630 同步改，commit 內文明言「全新環境首次 init 會依 schema/ 建表，若不同步…問題會復發」；server 端 `78e6e1c` 同晚補 prisma。
- ❌ 反例（觀察到的合理化）：「先修 migration 讓 prod 好起來，schema/ 之後再說」——photo_url 之所以成為事故，正是因為 `contacts.photo_url` 早改成 TEXT 而 `temp_users.photo_url` 留在 VARCHAR(255)：不同步的那一處就是下一次事故的位置。

## R2. 取序號：先看尾巴，防撞號

- 觸發：要開新 migration 檔。
- 步驟：`ls /home/user/daodao-storage/migrate/sql/*.sql | sort | tail -1`（別用裸 `tail`——目錄尾是 README.md）。序號 = 最大號 +1。注意：**068 是空號（067→069）**，不要「補洞」——runner 按檔名排序，晚加的小號會在已跑過大號的 DB 上亂序。撞號是**系統性**的既成事實：目前樹上就有三個 039（survey #98、user_onboarding #100、fix_email_type #108）、十餘組重複對（033/033a、040-046 各×2、051/051b、057×2）——撞號後排序只看字母，行為難以推理，所以你的新檔絕不可再撞。
- 完成定義：新檔名嚴格大於現存最大序號。

## R3. 冪等格式：DO $$ + 存在性檢查

- 觸發：寫 migration 內文。
- 步驟：所有變更包在 `DO $$ ... $$` 並先查 information_schema / pg_catalog 再動作（參考 067：以 `character_maximum_length = 300` 為 guard；069：以 `data_type = 'character varying'` 為 guard）。**Postgres 沒有 `ADD CONSTRAINT IF NOT EXISTS`**——這個非法語法上過線（`b92a996`）。
- 完成定義：migration 連跑兩次不報錯。

## R4. 重建 CHECK constraint：枚舉 prod 真實資料，不是抄程式碼常量

- 觸發：migration 需要 DROP + ADD 某個 CHECK（尤其 email_logs.email_type）。
- 步驟：先對 prod 查 `SELECT DISTINCT <col> FROM <table>`，新 CHECK 清單必須是「程式碼常量 ∪ prod 既有值」。用 NOT VALID + VALIDATE 降低鎖成本可以，但 VALIDATE 會拿 prod 資料驗你的清單——清單缺值就當場炸，而且**炸掉的 migration 會連鎖擋掉其後所有 migration**（`99e3ed4`：039 壞掉連帶 059、062 全失敗）。
- 完成定義：清單經 prod DISTINCT 查詢核對；`check_schema_sync.py --ci` 綠（它會比對 server `EMAIL_TYPES` / ai-backend 常量的三層一致性）。
- ❌ 反例（觀察到的合理化）：「程式碼裡的 enum 就是完整清單」——email_type 三連環的每一環都是這句話造成的。

## R5. Runner 語義：改舊檔 = 靜默無效；失敗檔 = 自動重跑

- 事實（sql_runner.py:54-62, 49-52）：跳過條件是 `migration_name + success=true`；checksum 記錄但**從不比對**。所以：
  - 改已成功的 migration → 下次部署**靜默 SKIP**，你的「修復」根本沒執行。
  - success=false 的 migration → 下次部署自動重跑。
- 部署失敗後的修正順位：(1) 首選**新增一個更高序號的修正 migration**；(2) 若壞的是 migration 檔本身的內容（如 `99e3ed4` 的 CHECK 清單錯誤，新檔修不了它自己）——**這是停下來問使用者的動作，不是你自行決定的動作**。「禁止修改已存在的 migration」在所有 repo 的 CLAUDE.md 都沒有例外條款，hook 也按「檔案已存在」攔（不看 success 狀態）；`99e3ed4` 是人類主導的一次性例外，僅因該檔 success=false 才有效，**不是可自行引用的先例**。
- 查詢狀態：`make migrate-sql-status-dev` / `make migrate-sql-status-prod`。
- 完成定義：你能說出目標 migration 在 migration_history 的 success 狀態；若結論指向「只能改舊檔」，已向使用者說明並取得同意。
- ❌ 反例（會出現的合理化）：「它 success=false，照 R5 我可以直接改」——攔你的 hook 不看 success；而且這個判斷（清單是否真的只能原地修）正是該由人類確認的部分。

## R6. 部署現實：prod migration 目前沒有自動前置備份

- 事實（scripts/deploy.sh）：dev 部署路徑會先 `backup_full pg-prod`；**prod 路徑的備份呼叫是註解掉的**——push main 直接跑 `make migrate-sql-prod`。CD 由 push dev/main 觸發（cd-postgres.yml，SSH 到 Linode `git reset --hard` 後跑 deploy.sh）。
- 觸發：你要出高風險 migration（DROP、大表 ALTER、資料回填）。
- 步驟：先手動備份——`ansible-playbook -i ansible/inventory.ini ansible/playbook.yml`（跑遠端 pg_dump 並 rsync 回本地 `./backup/{date}/`），或至少確認最近一次備份的日期。不要假設 CD 會幫你備。
- 完成定義：PR 描述載明備份狀態。此外自動化 pipeline 把 storage 列為 high-risk repo（強制 plan-only），migration 永遠由人類按下最後一鍵。

## R7. Squash-merge 之後立刻 back-merge

- 觸發：storage 的 dev 被 squash-merge 進 main（或你發現 dev→main PR 出現幽靈 diff）。
- 步驟：立即向使用者提議做 main→dev 的 back-merge（歷史案例 `3b5c062`），確認後才執行——merge commit 一樣走 repo 的 commit/push 流程（pre-commit-check → format-commit → 使用者確認；push 前問要不要 review）。長壽 dev + squash promotion 必然製造歷史分歧，back-merge 是唯一收斂法，但它本身是一次 push，不豁免流程。
- 完成定義：`git log --graph --oneline main dev | head -20` 顯示收斂點。

## R8. CI 的已知假象

- initdb 期間 `pg_isready` 會短暫回 ready 然後 shutdown——ci-postgres.yml 等的是 container log 的「init process complete」，改 CI 時別退回 pg_isready。
- `make quality_checks` 的 pylint 帶 `|| true`——真正會擋的只有 isort + black。
- `check_schema_sync.py` 的 `SKIP_TABLES`/`SKIP_COLUMNS` 白名單**就是已知漂移清單**（schema/ 落後 migrate/sql/ 的部分，約 70 張表）。動相關表時順手把該表移出白名單並補 schema/ = 還債；往白名單加新東西 = 舉債，要在 PR 說明。

## R9. server 端的漂移檢查只看名字

- 事實：`pnpm run schema:drift`（src/scripts/check-schema-drift.ts）比對的是 table/column **名稱**存在性，**不比對型別**——photo_url 的 VarChar/Text 不一致它看不見。型別層級的一致性只能靠 R1 的紀律。
- 完成定義：涉及型別變更時，人工核對 prisma 的 `@db.` 標註與 migration 的目標型別。

---
重新驗證：`ls /home/user/daodao-storage/migrate/sql/ | sort | tail -3 && grep -n "success = true" /home/user/daodao-storage/migrate/sql_runner.py && grep -n "backup_full" /home/user/daodao-storage/scripts/deploy.sh`
