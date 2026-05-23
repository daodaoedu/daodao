## Why

目前 daodao 的功能發想到驗證之間有一段斷層：PM / 設計師有了想法後，只能用文字、靜態 wireframe 或 Figma 來溝通，無法在「真實的 daodao 程式碼基礎」上直接看到功能跑起來的樣子。要看到可互動的成果，必須排進工程資源、開分支、實作、部署，週期長且成本高，導致很多想法在「能不能用、好不好用」尚未驗證前就被決定了。

`add-ai-service-management` 已經讓 admin 能在後台以對話建立 Workflow 並預覽其「結構」（trigger / nodes / edges）。本 change 把「對話 → 預覽」的能力從 Workflow 結構延伸到**真實產品 UI**：讓 PM / 設計師在後台用自然語言描述功能構想，由 AI coding agent **以 daodao 既有專案程式碼為基礎**做改動，建置出**可互動的 UI 原型預覽**，並能產生**唯讀分享網址**讓團隊、利害關係人或受測者直接點開試用。

核心定位：這是一個**內建於後台、以真實 codebase 為基礎的功能原型工坊**，不是憑空生成 mockup，而是「在現有 daodao app 上套用這個構想會長什麼樣、能不能互動」。

## What Changes

- **新增** Feature Ideation Studio（功能發想工坊）：PM / 設計師在 `daodao-admin-ui` 建立「想法專案」，用自然語言描述要發想的功能或改動
- **新增** 以真實 codebase 為基礎的改動：每個想法專案對應一個**隔離工作區**（從 daodao-f2e 指定 base branch 切出的暫時性分支 / worktree），AI coding agent 在此工作區讀取真實元件、頁面、設計系統與資料模型後產生實際 code diff，不影響 main 與生產環境
- **新增** AI coding agent 回合制改動：agent 規劃 → 編輯檔案 → 建置 → 自我檢查（lint / typecheck / build），失敗時自動修復或回報；保存每一回合的 diff 與建置結果
- **新增** 互動式 UI 原型預覽：將改動後的工作區建置成**暫時性 preview 環境**，在後台以沙箱 iframe 內嵌、可實際點擊互動操作，並提供桌機 / 行動裝置尺寸切換
- **新增** 多輪迭代：PM / 設計師可針對預覽結果繼續對話（「按鈕改放右上」「這頁加一個篩選器」），agent 在同一工作區增量改動並重建預覽，保存版本歷史
- **新增** 唯讀分享網址：可將任一版預覽 publish 成穩定的分享連結，預設**公開唯讀**（任何人有連結即可互動試用），可選**團隊限定**（需登入且為 daodao 成員）
- **新增** 分享連結治理：連結釘選特定預覽版本（後續迭代不影響已分享版本）、可設定到期時間、可隨時撤銷、記錄瀏覽次數
- **新增** 架構脈絡注入（grounding）：agent 取用 daodao 既有設計系統 token、元件目錄、頁面 / 路由結構與資料實體 schema 作為改動依據，使原型貼近真實產品而非通用樣板
- **新增** 安全沙箱：預覽一律使用 mock / 唯讀資料，不連線生產 API；分享連結不附帶後台 session；生成的程式碼僅能在隔離工作區與沙箱中執行
- **新增** 交棒工程（AI 接手開發）：PM / 設計師對採用版本人工觸發「交棒工程」，系統把原型分支以唯讀參考 ref push、並產生一個帶完整脈絡（構想原文 / diff / 分支 ref / preview / 邊界註記）的 GitHub issue 掛 `auto` label，流入既有 remote agent pipeline；AI 以原型為參考、**另起乾淨分支**正式實作並開自己的 PR，走既有人工驗收關卡
- **新增** 不可逆操作的人工關卡：原型分支永不自動合併進 main；交棒只開 issue + 唯讀參考分支，不針對原型分支開 PR、不自動合併
- **新增** 與既有能力的銜接（Phase 2）：若構想本質是自動化流程，可把原型交棒給 `ai-workflow-nlp-generator` 產生 Workflow draft；可把採用的 diff 升級成 OpenSpec proposal 草稿

## Capabilities

### New Capabilities

- `feature-ideation-studio`: 想法專案 CRUD、對話式需求描述、以真實 codebase 為基礎的 AI coding agent 回合制改動、隔離工作區管理、版本歷史與架構脈絡注入、採用版本交棒成 AI 開發任務（GitHub issue + auto label + 原型分支唯讀參考，參考重做）
- `prototype-preview-share`: 將改動後工作區建置成暫時性 preview 環境、後台沙箱互動預覽、唯讀分享網址 publish 與治理（版本釘選 / 到期 / 撤銷 / 瀏覽記錄）、存取權限（公開唯讀 / 團隊限定）

### Modified Capabilities

（無；本 change 復用 `add-ai-service-management` 既有的 ai-backend executor 與 admin-ui 後台框架，但不修改其既有 spec）

## Impact

- **daodao-admin-ui**：新增 Feature Ideation Studio 頁面（想法專案列表、對話面板、改動 diff 檢視、互動預覽 iframe + 裝置尺寸切換、版本歷史、分享連結管理、版本「交棒工程」動作與 issue / PR 追溯）
- **daodao-server**：新增 `/api/admin/feature-ideas` REST API（專案 CRUD、對話、版本、工作區生命週期協調）、`/api/admin/feature-ideas/:id/share-links` API（分享連結 CRUD / 撤銷 / 瀏覽統計）、`/api/share/:token` 公開唯讀預覽轉發端點、`/api/admin/feature-ideas/:id/versions/:vid/handoff` 交棒端點（push 原型分支為唯讀參考、建立帶脈絡的 GitHub issue 掛 `auto` label、記錄 handoff）
- **daodao-ai-backend**：新增 `/internal/feature-ideas/agent` coding agent endpoint（在隔離工作區讀檔 / 改檔 / 建置 / 自我修復的 ReAct loop，復用既有 sandbox runtime 與 LLM tooling），以及架構脈絡（設計系統 / 元件目錄 / 實體 schema）摘要供 grounding
- **daodao-f2e**：作為被改動的目標 codebase；需提供可被 grounding 取用的元件目錄與設計 token 來源，並支援以 mock 資料啟動的 preview build 模式
- **daodao-infra**：新增暫時性 preview 環境的建置與託管（每個想法版本一個隔離可拋棄的 preview deploy）、分享連結 domain / routing、TTL 回收
- **daodao-storage**：新增 `feature_idea_projects`、`feature_idea_conversations`、`feature_idea_messages`、`feature_idea_versions`、`feature_idea_workspaces`、`feature_idea_preview_builds`、`feature_idea_share_links`、`feature_idea_share_link_views`、`feature_idea_handoffs` tables（共 9 張）
- **daodao-worker**：Phase 1 暫不影響；Phase 2 可接 preview 環境 TTL 回收排程與分享連結到期清理
