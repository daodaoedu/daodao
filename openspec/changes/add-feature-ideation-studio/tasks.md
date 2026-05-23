## 1. DB Migration（daodao-storage）

- [ ] 1.1 [daodao-storage] 新增 feature ideation migration SQL，建立 9 張 table：`feature_idea_projects`（`owner_id`、`title`、`description`、`base_repo`、`base_branch`、`status`）、`feature_idea_workspaces`（`project_id`、`branch_ref`、`base_commit`、`workspace_location`、`status`）、`feature_idea_conversations`（`project_id`）、`feature_idea_messages`（`conversation_id`、`role`、`content`）、`feature_idea_versions`（`project_id`、`version_no`、`diff`、`build_status`、`build_log`、`cost_usd`、`latency_ms`）、`feature_idea_preview_builds`（`version_id`、`preview_url`、`status`、`expires_at`）、`feature_idea_share_links`（`version_id`、`token` unique、`visibility`、`expires_at`、`revoked_at`）、`feature_idea_share_link_views`（`share_link_id`、`viewed_at`、`viewer_hint`）、`feature_idea_handoffs`（`version_id`、`created_by`、`reference_branch_ref`、`issue_url`、`issue_number`、`pr_url` nullable、`status`）
  - AC：migration 可正向執行，rollback 可刪除全部新 table 且不影響既有資料；`share_links.token` 有唯一索引

## 2. 架構脈絡 grounding 來源（daodao-f2e / daodao-server）

- [ ] 2.1 [daodao-f2e] 提供可被 grounding 取用的元件目錄與設計 token 來源（可用元件清單 + 用法摘要 + design token），以結構化檔案或 endpoint 形式暴露
  - AC：可列出主要可用元件與設計 token；不含祕密；可被 ai-backend 讀取
- [ ] 2.2 [daodao-f2e] 支援以 mock 資料啟動的 preview build 模式（不連線生產 API）
  - AC：以 preview 模式建置啟動時，資料來自 mock，不發出生產 API 請求
- [ ] 2.3 [daodao-server] 維護資料實體 schema 摘要（practices / users / challenges / badges / 推薦 等）供 grounding 注入
  - AC：回傳實體與欄位形狀摘要，供 agent 構造 mock 資料；不暴露真實資料

## 3. daodao-ai-backend — Coding Agent

- [ ] 3.1 [daodao-ai-backend] 新增 codebase 工具集：`read_file`、`list_dir`、`search_code`、`edit_file`、`run_build`、`run_lint_typecheck`，作用域限定於指定工作區
  - AC：工具只能存取該工作區路徑；無法讀取祕密或工作區外檔案
- [ ] 3.2 [daodao-ai-backend] 新增 `POST /internal/feature-ideas/agent`，接收需求、工作區位置、架構脈絡，跑 ReAct loop（探索 → 規劃 → 改檔 → 建置 → 自我檢查），回傳 `{ diff, build_status, build_log, cost_usd, latency_ms }`
  - AC：復用既有 sandbox runtime 與 `max_iterations` / dead-loop detection；build 失敗時於 budget 內嘗試修復，仍失敗則回傳 `build_status=failed` 與 log
- [ ] 3.3 [daodao-ai-backend] grounding 注入：改動前將元件目錄、設計 token、頁面結構、實體 schema 摘要載入 agent context
  - AC：agent prompt 含架構脈絡；單元測試驗證脈絡有被注入
- [ ] 3.4 [daodao-ai-backend] 記錄 cost / latency 並送既有 observability（Langfuse / PostHog），與 skill-call 一致
  - AC：每次 agent 執行可回報 cost_usd / latency_ms；observability key 未設定時靜默跳過

## 4. daodao-infra — 隔離工作區與暫時性 Preview 環境

- [ ] 4.1 [daodao-infra] 工作區管理：從 base branch 建立隔離工作區（worktree / 暫時性分支），記錄 base_commit；專案封存時可清理
  - AC：可建立 / 清理工作區；工作區分支不會被 push 到 main
- [ ] 4.2 [daodao-infra] 暫時性 preview 環境：將建置產物部署成可拋棄的 preview deploy，回傳 preview_url，支援 TTL 回收
  - AC：成功建置版本可取得可互動 preview_url；閒置超過 TTL 後回收
- [ ] 4.3 [daodao-infra] 分享連結 domain / routing：公開連結經穩定 URL 對應到釘選版本的 preview，不暴露內部位址
  - AC：`/api/share/:token` 可轉發到對應 preview；撤銷 / 到期後回傳對應狀態
- [ ] 4.4 [daodao-infra] preview 沙箱隔離：preview 環境無生產連線字串與祕密，僅 mock 資料
  - AC：preview 環境環境變數不含生產祕密；網路政策限制不可達生產 API

## 5. daodao-server — Feature Idea API

- [ ] 5.1 [daodao-server] 實作 `GET/POST /api/admin/feature-ideas` 與 `GET/PATCH/DELETE /api/admin/feature-ideas/:id`，建立時協調 infra 切出工作區並建立 conversation
  - AC：CRUD 正常；建立時產生 workspace 記錄；DELETE 連動清理工作區與 preview
- [ ] 5.2 [daodao-server] 實作 `POST /api/admin/feature-ideas/:id/messages`：寫入對話、呼叫 ai-backend agent、保存回傳的 version（diff / build_status / build_log / cost / latency）
  - AC：訊息與版本正確落庫；build 成功 / 失敗皆保存對應狀態
- [ ] 5.3 [daodao-server] build 成功後呼叫 infra 啟動 preview，保存 `feature_idea_preview_builds` 並回傳 preview_url
  - AC：成功版本有 preview_url；失敗版本無 preview 且 UI 可取得 build_log
- [ ] 5.4 [daodao-server] 實作 `GET /api/admin/feature-ideas/:id/versions` 與單一版本 diff 檢視
  - AC：可列出版本與各自 build_status / preview / cost / latency
- [ ] 5.5 [daodao-server] 實作 `GET/POST /api/admin/feature-ideas/:id/share-links` 與 `DELETE`（撤銷）：建立時釘選 version、設定 visibility 與 expires_at，拒絕為建置失敗版本建立
  - AC：成功版本可建連結並釘選；失敗版本被拒；撤銷寫入 revoked_at
- [ ] 5.6 [daodao-server] 實作 `GET /api/share/:token` 公開轉發端點：驗證 visibility / expiry / revoked，team 模式需登入且為團隊成員，記錄一筆 view
  - AC：public 唯讀可達；team 未授權被拒；過期 / 撤銷回傳對應狀態；每次有效存取寫入 view
- [ ] 5.7 [daodao-server] 分享連結瀏覽統計：`GET` 連結回傳 view 次數
  - AC：擁有者可取得每條連結瀏覽次數
- [ ] 5.8 [daodao-server] 實作 `POST /api/admin/feature-ideas/:id/versions/:vid/handoff` 交棒端點：拒絕建置失敗版本；將原型分支以 `feature-idea/<project>/<version>` ref push 為唯讀參考；建立 GitHub issue（內含構想原文 / diff / 分支 ref + base_commit / preview 連結 / 邊界註記）並掛 `auto` label；寫入 `feature_idea_handoffs`（issue_url / issue_number）
  - AC：成功版本可交棒並回傳 issue URL；失敗版本被拒；不針對原型分支開 PR、不合併 main；handoff 記錄可由版本追溯
- [ ] 5.9 [daodao-server] handoff 追溯：`GET` 版本回傳關聯 handoff（issue_url / pr_url / status）
  - AC：後台可由原型版本查到衍生的 issue 與（若有）PR

## 6. daodao-admin-ui — Feature Ideation Studio

- [ ] 6.1 [daodao-admin-ui] 想法專案列表頁：建立 / 列出 / 封存想法專案，顯示 base branch 與狀態
  - AC：可建立並進入專案；列表顯示狀態
- [ ] 6.2 [daodao-admin-ui] 對話面板：輸入功能構想、顯示多輪對話與 agent 進度 / 結果
  - AC：可送出訊息並看到對應版本產生；顯示 build 中 / 成功 / 失敗
- [ ] 6.3 [daodao-admin-ui] 互動預覽：沙箱 iframe 內嵌 preview_url，桌機 / 平板 / 手機尺寸切換
  - AC：成功版本可互動操作；iframe 套用 sandbox + CSP
- [ ] 6.4 [daodao-admin-ui] 版本歷史與 diff 檢視：列出版本、檢視 diff 與 build_log、可從某版繼續迭代
  - AC：可檢視 diff / log；可選版本繼續發想
- [ ] 6.5 [daodao-admin-ui] 分享連結管理：產生連結（選 public / team、設到期）、複製 URL、檢視瀏覽次數、撤銷
  - AC：可產生 / 複製 / 撤銷連結；顯示瀏覽次數；失敗版本無法產生連結
- [ ] 6.6 [daodao-admin-ui] 版本「交棒工程」動作：對成功版本觸發交棒、顯示產生的 issue 連結與 handoff 狀態（含後續 PR 連結）
  - AC：成功版本可交棒並看到 issue 連結；失敗版本無交棒入口；可追溯到衍生 issue / PR

## 7. 安全與驗收

- [ ] 7.1 [daodao-server / daodao-infra] 驗證工作區分支不會被合併或 push 到 main
  - AC：自動化測試 / 檢查確認原型分支與 main 隔離
- [ ] 7.2 [daodao-admin-ui / daodao-infra] 驗證 preview 沙箱：iframe sandbox + CSP 生效、preview 無法呼叫生產 API、分享連結不帶 session
  - AC：安全檢查通過；無生產資料外洩路徑
- [ ] 7.3 [daodao-server] 分享連結 token 不可猜測且唯一；過期 / 撤銷 / team 權限邊界測試
  - AC：token 具足夠熵；邊界情境皆有測試覆蓋
- [ ] 7.4 [daodao-server] 驗證交棒只開 issue + push 唯讀參考分支，不針對原型分支開 PR、不自動合併 main；建置失敗版本不可交棒
  - AC：交棒行為測試確認無 PR / 無合併；失敗版本被拒；issue 掛 `auto` label 且含必要脈絡欄位
