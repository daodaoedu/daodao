# ai-assistant
- 涉及 repo: ai-backend (qdrant/RAG), admin-ui (知識庫管理/共享收件匣), server
- 對應 archived change: 無
- 總計: 14 條 requirement / 29 個 scenario | ✅0 ⚠️0 ❌14 ❓0

整體判定：此 spec（後台 AI 助理：知識庫上傳、向量化、條目管理、個性設定、活躍空間、RAG 問答、引用來源、共享收件匣、對話狀態分類、管理員接手、指標、逐空間開關、備用訊息）在 origin/dev / origin/main 中**查無任何對應實作**。

證據（皆為「查無命中」）:
- daodao-ai-backend：grep `knowledge_base` / `upload.*document` / `shared.*inbox` / `escalat` / `resolved.*by.*ai` / `takeover` / `fallback.*message` 於 *.py 全無命中。雖有 src/services/qdrant/client.py + factory.py（Qdrant 連線基礎設施），但無「知識庫文件上傳→切割→嵌入→存 Qdrant」之 ingestion pipeline，亦無 RAG 問答 router。
- daodao-server：grep `knowledge.?base` / `ai.?assistant` / `shared.?inbox` / `rag` 於 src/** 全無命中。
- daodao-admin-ui（origin/main）：grep `knowledge` / `assistant` / `inbox` / `qdrant` / `rag` 僅命中 api/client.ts、auth、PlaygroundPage.tsx 等泛用檔，無知識庫管理頁、無共享收件匣 UI。

逐 requirement 結論（全部 ❌，scenario 同步 ❌）：
## Requirement: 上傳知識庫文件 → ❌ — 無上傳端點/UI 證據。
## Requirement: 文件向量化處理 → ❌ — 有 Qdrant client 但無文件 ingestion/向量化 pipeline。
## Requirement: 知識庫條目管理（檢視/編輯/刪除） → ❌ — 無管理頁/CRUD。
## Requirement: 設定 AI 助理個性（語氣/語言/範圍） → ❌ — 無 persona 設定（grep persona.*tone 無）。
## Requirement: 指定 AI 助理活躍空間 → ❌ — 無空間勾選邏輯。
## Requirement: RAG 問答能力 → ❌ — 無 RAG 問答 router。
## Requirement: 引用來源文件 → ❌ — 無 citation 實作。
## Requirement: 共享收件匣審閱 → ❌ — 無 inbox。
## Requirement: 對話狀態分類（resolved/escalated/human） → ❌ — 無狀態機。
## Requirement: 管理員接手對話 → ❌ — 無 takeover/handback。
## Requirement: AI 助理指標（對話數/解決率/回應時間/升級率） → ❌ — 無指標儀表板。
## Requirement: 逐空間開關 AI 助理 → ❌ — 無 per-space toggle。
## Requirement: 備用訊息設定 → ❌ — 無 fallback message。

註：spec 為純 ADDED requirements，整體屬尚未開發功能；僅 Qdrant 基礎連線與一般 LLM client（src/services/llm/client.py）存在，不足以對應任一 requirement。
