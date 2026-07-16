---
name: failure-archaeology
description: 你觀察到以下任一狀態時載入：正要「改良」nginx/keepalive/DNS 設定；想沿用或刪除 repo 根目錄的孤兒檔（PLAN.md、plan.md、*.backup、ops-*.md）；想引用 docs/ 裡的 migration 機制文件；發現 dev 與 main 歷史分歧或 PR 出現幽靈 diff；打算重做一個「文件說還沒做」的功能
---

# 失敗考古（死路、revert、為什麼）

> 最後校準：2026-07-14。記載的是「試過而且失敗」的路，避免下一個 session 重走。全部有 commit 佐證。

## 1. nginx 520 saga（2026-03-15 → 03-17）：中間修復大多是死路

12 個 commit 的完整弧線（daodao-infra；下表列 10 個關鍵節點，另有兩個同日 CI/SSH 修）：

| 階段 | Commit | 嘗試 | 下場 |
|---|---|---|---|
| 症狀修 | `b1699f5` | 修 hardcoded `Connection: upgrade` | 有效，保留（改用 map） |
| 死路 | `4ed29cc` | `docker cp` 蓋設定進 container | 15 分鐘後被 `19fb26f` revert——bind mount 蓋不了 |
| 真因一 | `246aa32` | 發現 bind mount inode 陷阱 | 確立「restart 不 reload」 |
| 症狀修 | `76f9424` | upstream 加 `resolve` 背景解析 | 引發啟動失敗 |
| 補洞 | `090c320` | 加 `zone` | 保留；也確立「先本地 nginx -t 再 push」 |
| 症狀修 | `0b96df5` | `max_fails=0` | 保留 |
| 真因二 | `d405ec9` | 移除 8.8.8.8 resolver（NXDOMAIN 會把 upstream 踢出 pool） | 保留；但同 commit 把 valid 調到 300s—— |
| 反噬 | `3089aed` | 300s 快取讓重啟後 5 分鐘打舊 IP → 520；加 `proxy_next_upstream` 重試貼 OK 繃 | valid 調回 30s；重試指令同日約 2 小時後被拆 |
| **終局** | `6846ad3` | **刪掉 keepalive 整個功能**（CF origin keepalive 900s vs nginx 65s；「keepalive 連線池對目前流量規模無實際效益，TCP handshake 僅 ~1ms，卻引入大量連線管理複雜度」） | 現行狀態 |

**規則**：
- 觸發：你想對 daodao-infra 的 nginx 加 keepalive pool、`proxy_next_upstream`、外部 DNS、或調長 resolver `valid=`。
- 步驟：停。讀上表。這四樣每一個都被實測淘汰過。若流量規模真的變了要重新引入，必須在 PR 說明引用本節並解釋為何當年的失敗條件已不成立。
- 完成定義：不動，或 PR 內有明確的「當年 vs 現在」論證。
- ✅ 正例：`c0aebf6` 加 `client_max_body_size 10m`——新需求、新 directive，不觸舊傷。
- ❌ 反例（觀察到的合理化）：`3089aed` 的「加重試就能蓋掉 stale connection」——同日即被 `6846ad3` 承認是 OK 繃拆掉。「重試能蓋掉」在這個 codebase 是已證偽的思路。

尾聲：saga「結束」一週後，同一片設定面又產出新事故類（`c0aebf6` 的 413）。nginx 重構的爆炸半徑比事故本身長。

## 2. email_type：修了三次才學會的字段

- 第一次（2026-05-30 `0fec92b`）：程式碼 14 種 type、DB constraint 只允許 11 種，通知類 email log 靜默丟失。修完立刻建了三層一致性 CI（storage `75bace0`）+ server integration test（`88e7b10`）。
- 第二次（`067bc4f`）：又補了 6 個 onboarding email types。
- 第三次（2026-06-30 `99e3ed4`）：migration 039 用 NOT VALID + VALIDATE 重建 constraint，但它的 CHECK 清單是舊快照，prod 已有 3 個它不認識的值 → VALIDATE 炸，**連鎖擋掉不相關的 059、062**。
- 教訓：(a) 內嵌在 migration 裡的 CHECK 清單是「寫檔當下的快照」，部署時可能已過期——重建 constraint 前必須枚舉 prod 實際資料；(b) 一個壞 migration 會連鎖阻塞後面所有 migration；(c) 修一層必復發，見 migration-safety。
- 注意：`99e3ed4` 的修法是**直接改已存在的 migration 039**——表面違反鐵律。它能成立只因 039 在 `migration_history` 是 success=false（runner 會重跑失敗的）。**success=true 的 migration 改了會被靜默 SKIP，等於什麼都沒修**。這不是可模仿的先例，是 runner 語義的特例。

## 3. Squash-merge 分歧（storage，2026-06-30）

dev 累積 ~20 個 commit，被 squash 成 main 上單一 commit `3ccc306`（#151）→ 兩條分支內容相同、歷史零共同 commit → 之後 dev→main 的 PR 會出現幽靈 diff/衝突。12 分鐘後 hotfix `99e3ed4` 又直接落在 dev。解法：`3b5c062` 立刻把 main merge 回 dev。
- 規則：觸發＝你剛把 dev squash-merge 進 main（storage 或任何長壽 dev 分支的 repo）。步驟＝立即向使用者提議 main→dev back-merge，確認後執行（照常走 commit/push 流程）。完成定義＝`git log --graph` 上兩分支重新收斂。
- server 同型污染：dev/production 雙軌讓歷史充滿成對重複 commit（#288/#289、#291/#292 等）——看到成對 commit 不是 bug，是這個 promotion 模型的正常疤痕。

## 4. .env 部署策略翻車（ai-backend，2026-05）

`63d6a97`「每次 deploy 都用 .sample 重建 .env」→ 一週內 `2f9c61c` 反轉：「server 上手動加的 key 在下次 CD 後消失」。現行政策：**.env 不存在才從 .sample 初始化；.sample 不存在則 exit 1；絕不覆寫既有 .env**。
- ❌ 反例（觀察到的合理化）：「用 sample 重建保證環境一致」——代價是刪掉營運人員手加的 secret。「模板重建」與「伺服器上手改」互斥，本專案已選後者。
- 前傳：同一破口是 2026-05-03 一天五個 PR 的「fixed / fixed again / aoonedix fix」連環（#79–#83）——用 production deploy 當除錯迴圈。教訓已成文在各 repo 品質流程：先本地綠再 push。

## 5. 自動化改寫人管狀態（daodao hub，Routine C）

- `f733153`：Routine C 無條件覆寫 Notion Status，把人工設的 Done 蓋回 Review → 修成 forward-only 狀態機。
- `03acd22`：GitHub `closingIssuesReferences` API **只在 PR 目標是 default branch 時有值**；本專案 PR 都打 dev → 永遠空 → 改用 regex 解析 PR body 的 closes/fixes/resolves。
- `ce9ebf2`：handler 忘了貼 `tracked` label → Routine C 永遠找不到 PR，Notion 卡「In progress」。
- 規則：觸發＝寫任何會回寫 Notion/label/human 欄位的自動化。步驟＝狀態轉移只進不退；別依賴 closingIssuesReferences（dev-branch 環境下是空的）。完成定義＝dry-run 顯示不會降級任何人工狀態。

## 6. Revert 記錄（產品性 vs 技術性）

- f2e `e4c91a6`（2026-05-06）：dev 上累積的 auth fixes 造成 i18n redirect 回歸，整批 revert 回 prod 版本，「後續重新檢視」**沒有後續 commit**。→ auth 是 i18n routing + guard + logout 的交叉點；dev-only auth 修改堆疊未驗證就是這下場。那批被 revert 的 fix 是否還需要，至今無人回答（列入 UNCERTAINTY）。
- f2e `9bd139e`（#552/#554）：靈感頁混合 feed 被產品決策打回 showcase-only——**靈感頁只顯示實踐不是漏做，是刻意的**。別「順手」把 checkin 卡片加回去。
- admin-ui `167482b`：大型「一次接好全部 API」的 PR（+574/−918）merge 後 **2 分鐘**被 revert，之後以分階段 rework 落地。→ admin-ui 的 API 接線走小步提交。
- f2e `782f452`：用 eslint-disable 壓 deps array 被 review 打回——guard clause 優於 suppression。

## 7. 孤兒檔案地圖（別當成活文件）

| 檔案 | 真相 |
|---|---|
| `daodao-f2e/PLAN.md` | 自動化 pipeline 幫 issue #738 產的計畫，工作已在 `4cd94a4`（#773）落地。殘渣，可刪。 |
| `daodao-f2e/docker-compose.local.yml.backup` | `bc26ecb`（#731）誤入版控的本地備份；`docker-compose.local.yml` 本體**從未存在於 git**。參考價值僅限「當年有人本地這樣跑」。 |
| `daodao-server/plan.md` | Learning Resources Collector 計畫——**已實作**：`scripts/collect-learning-resources/`（collectors/、config.ts 等）在 `77499a8`（#245，2026-05-20）落地。plan.md 是留在根目錄的計畫殘渣，不是待辦；要用該工具先讀 scripts/collect-learning-resources/README.md 確認現況。 |
| `daodao-server/ops-2026-06-23-checkin-image-storage-audit.md` | 凍結中的調查（ECONNRESET 卡死），無結案記錄。是待辦不是歷史。 |
| `daodao-storage/docs/{migration-naming-conventions,developer-migration-guide,database-migration-strategy}.md` | **描述從未落地的機制**（日期前綴、rollback 檔、Flyway、migrations/ 目錄），2026-07-06 稽核已加過時警告 banner（`797c85c`）。migration 真實行為以 `migrate/sql_runner.py` 為準。 |
| `daodao-admin-ui/task.md` | **活的**（2026-07-08 更新）：Dashboard 指標 backlog，剩餘項目卡後端。改 Dashboard 前先讀。 |

- ❌ 反例（觀察到的合理化）：「docs/developer-migration-guide.md 說要建 rollback 檔，我照做」——那套機制從未存在，`797c85c` 就是為了阻止 AI agent 照它行事才加的 banner。

## 8. 其他一次性教訓（快查）

- Docker 服務缺 `restart: unless-stopped` → 主機重開機後全站不自起（server `98eab19` + storage `294a964`，同一次停電級事故雙修）。
- multipart FormData 陣列欄位 vs Zod：修了兩輪（`b714d99`→`e1451c4`）才抽成 middleware `0ffa88a`——動 FormData 解析先看 `src/middleware/parse-formdata`。
- Postgres 沒有 `ADD CONSTRAINT IF NOT EXISTS`——038 上線時帶著這個非法語法，`b92a996` 是事後修正；冪等要用 `DO $$` 存在性檢查。
- initdb 期間 `pg_isready` 會說謊（短暫接受連線再 shutdown）；CI 要等 container log 出現「init process complete」（`3ccc306` 內文、ci-postgres.yml）。
- 硬編碼 Docker 內部 IP（172.21.x.x）活不過 container 重啟（hub `325091b`）→ 用 Docker DNS 名稱或 socat。

---
重新驗證：`git -C /home/user/daodao-infra log --oneline 6846ad3 -1 && git -C /home/user/daodao-storage log --oneline 3b5c062 -1 && ls /home/user/daodao-server/plan.md`
