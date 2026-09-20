# 島島阿學開發流程規劃進度

日期：2026-09-12。範圍：流程提案與文件入口，不實作 runner、修改遠端設定或發布文件。

追加交付：`docs/automation/development-workflow-diagrams.md`，以六張 Mermaid 圖說明現況、資料分工、開發主流程、驗收版本、Issue 回寫與導入階段；不改變既有提案或宣稱部署完成。

- [x] 讀取雙訂閱 v2、automation 索引、skills 現況與 README。
- [x] 讀取 product-status-check / prd-generation，檢查現有 pipeline、驗收 references。
- [x] 查核本機 CLI 與官方訂閱 CI 文件；Groundlane 搜尋與抓取成功。
- [x] 整合 CI / hooks 的唯讀盤點結果。
- [x] 寫入共用雙入口、需求版本、驗收契約、merge gate 與導入階段。
- [x] 補入自動回寫中央／子 Issue、狀態區分、outbox 與舊 run 防覆蓋。
- [x] 查核官方計量方式；新增額度政策，記錄使用者確認 Max US$100／Codex Pro／Cloudflare Paid。
- [x] 新增 templates/development 的六份範本與 README，整合 budget 欄位。
- [x] 更新四份文件入口並檢查 diff / 連結。

已知：工作區含大量既有修改；僅新增流程提案與在四個既有入口追加連結。訂閱用量、遠端 ruleset、runner、Drive 分享權限尚未實測。

交付：docs/automation/issue-to-acceptance-workflow.md、agent-budget-policy.md、templates/development/（7 檔）。

驗證：9 份新文件／模板、15 個本地連結、Markdown fence 配對、版本欄位與 whitespace 檢查皆通過；git diff --check 通過。純文件變更，未執行產品測試。沒有 commit、發布 Issue／Google 文件或修改 CI／遠端設定。

後續要求「開 issue skill」：更新 canonical gh-card 接共用模板、初始 Todo 缺項、查重、授權與發布回讀；新增 Codex 薄入口、AGENTS 路由。補正中央 auto label gate 尚未落實的文件落差，未修改 pipeline 程式。兩個 skill 均通過 quick_validate；6 個本地連結存在；git diff --check 通過。未呼叫 GitHub 寫入，client 自動發現尚未重載驗證。
