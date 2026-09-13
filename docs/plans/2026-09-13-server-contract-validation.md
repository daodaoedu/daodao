# Server HTTP contract 試點驗證

來源 commit：`6f067f3b6497658096f250b62fbcdd8a57a0c9ce`。提交分支：`daodaoedu/daodao-server` 的 `feat/benchmark-response-contracts`。

兩個端點：公開 cohort join info 與 member home。使用真實 router/controller/service，mock Prisma 和 auth；驗證完整 wire envelope、ISO 日期、公開資料不曝露 meetingUrl／內部欄位、成員內容與非成員 404。

- 修正前：2 failed／2 passed，HTTP JSON 日期字串無法通過內部 Date schema。
- 修正後：5 tests passed；新增 strict wire schemas，保留 controller 原有 Date schemas。
- commit 前全量 lint：通過（既有 warnings）；typecheck：通過。
- OpenAPI／types generation：通過；generated types 無異動。
- schema:drift：136 SQL tables／122 Prisma models，未發現工具支援範圍內的 drift。

限制：只涵蓋兩端點；不證明真實 auth、DB、部署或全站 contract coverage。原共享 server checkout 的 OpenAPI 未提交修改保留，試點在隔離 worktree 完成。

獨立 review 無阻塞缺陷。外層 success envelope 目前只核對必要欄位／型別，允許額外 key；strict 檢查適用 payload 與其巢狀物件。
