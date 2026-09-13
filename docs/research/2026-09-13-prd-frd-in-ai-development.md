# AI 開發是否仍使用 PRD／FRD：公開證據核對

查核日：2026-09-13。問題：採用 AI 開發的軟體公司是否仍使用 PRD／FRD，而非僅查文件模板是否存在。使用 Groundlane web_search／web_fetch；未修改原 benchmark 或正式流程。

## 結論

有直接案例證明 AI 開發仍使用 PRD。文件可由 AI 協助分析、起草並由團隊確認，再交給 coding agent。此次未找到足以證明「每個功能固定拆 PRD＋FRD」是 AI 公司共同慣例的證據；也不能由未提 FRD 推論它已被淘汰。

## 證據與可支持的範圍

### 1. CodeRabbit：實際公司案例，明確使用 PRD

來源：[How CodeRabbit used Claude to build an agent orchestration system](https://claude.com/blog/how-coderabbit-used-claude-to-build-an-agent-orchestration-system)。Anthropic 刊登，包含 CodeRabbit VP of AI David Loker 的直接說明。搜尋索引標示 2026-06-21；本次抓取正文未顯示日期，因此此日期不視為獨立核實。

正文明確稱規劃產物為 collaborative product requirements document（PRD）：分析需求、揭露假設，團隊在實作前確認，Claude Code 再據此產生細部實作計畫。團隊也建立計畫品質 eval，比較有無規劃步驟的結果，避免計畫太細易過期或太粗讓 agent 猜測。

這是具名客戶訪談的實際做法，不只模板推薦；仍是公司／供應商自述，沒有獨立成效驗證，也不證明所有 CodeRabbit 任務都必經相同流程。

### 2. Anthropic：官方仍提供 PRD 工作流程

來源：[Product Management plugin](https://claude.com/plugins/product-management)、[PRD from a problem statement](https://academy.claude.com/use-cases/prd-from-a-one-pager)。本次讀取頁面未見明確發布日。

官方 `/write-spec` 從問題或功能想法產生結構化 PRD；教學建議先訪談使用者、參考團隊模板及範例，確認目標／不做什麼／未決問題，再交付 review。

可支持「PRD 仍是官方 AI 產品工作流的一種產物」，不能據此斷言 Anthropic 內部每個 PM 都使用 PRD，或全公司已廢除 PRD。搜尋中的『Anthropic 不寫 PRD』二手文章未用作公司制度證據。

### 3. Atlassian：想法與 codebase 形成可共同編輯的 spec

來源：[Introducing Jira Planner](https://www.atlassian.com/blog/jira/introducing-jira-planner)。搜尋索引標示 2026-08-20；正文明列 Early Access，未在此查核帳號實際可用性。

公開描述流程：粗略想法 → 補問範圍與成功條件 → 讀取多 repo codebase／團隊上下文 → 產生 Confluence Live Docs → PM、設計、工程共同編輯 → 找出模糊與缺漏 → 拆成含 AC 與依賴的 Jira work items。

這是供應商產品能力與設計方向，不是具名客戶實際採用的證據。對 daodao 的價值是具體支持先描述、再查核及起草的可行流程設計，而非要求另採購產品。

### 4. Linear：仍把 PRD 與 coding agents 放在同一工作流

來源：[Linear Enterprise](https://linear.app/enterprise)。本次讀取頁面未見明確發布日。

官方頁面描述 agent 彙整客戶回饋、草擬 PRD、委派 issues，再把工作交給 coding agents，同時保留專案與優先序上下文。這證明產品仍支援此用法，不代表所有客戶或 Linear 內部一致採用。

## 對本專案的建議（推論）

補充具名從業者案例：

- [Branch International 工程師 Gagandeep Singh，2026-01-18](https://gagan93.me/blog/2026/01/18/how-cursor-boosted-my-productivity-in-2025.html)：本人回顧 2025 年以 Cursor 做功能與重構，並描述從 PRD／設計文件拆詳細任務給 AI、串接 Linear 與 GitHub PR。員工第一手做法，不等於全公司規定。原文抓取有截斷，但相關完整段落已讀取。
- [Chime PM Dennis Yang 訪談，2025-10-27](https://www.lennysnewsletter.com/p/cursor-is-a-much-better-product-manager)：節目摘要及章節明列用 Cursor 建立 PRD、發布文件、由 PRD 產生 Jira tickets。支持 PM 實際工作流，不代表 production code 全自動；未觀看影音或核對逐字稿。兩者為金融科技公司的軟體團隊。

保留一份人與 AI 共用、可更新的需求基準，不要求提出者手動填完 PRD＋FRD。由 skill 根據問題與 codebase 整理問題、範圍、流程、規則及 AC，再請提出者確認。

- 小改動／bug：Issue 內即可完整表達。
- 一般功能：一份 PRD 或功能規格即可，名稱沿用團隊習慣。
- 大型多功能計畫：PRD 管目標與範圍，各 FRD 管功能細節，避免同義內容重複維護。

此分級是針對團隊需求的設計建議，不是來源宣稱的全業界標準。AI 起草也不能代替產品決策，CI 通過也不能證明符合未記錄的期待。
