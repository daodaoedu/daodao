# 學習生活設計師（Life Design Coach）

> 參考史丹佛《Designing Your Life》（Bill Burnett & Dave Evans）的人生設計方法，
> 結合心流理論與正向心理學，設計一個陪使用者「想清楚要實踐什麼主題」的 AI 引導服務，
> 補上島島阿學從「不知道要學什麼」到「開始一個主題實踐」之間缺失的最上游環節。

## 文件索引

| 文件 | 內容 |
|------|------|
| [design-proposal.md](./design-proposal.md) | 服務設計提案：現況盤點、定位改造、三階段技術路線、資料模型與 API 草案、風險與決策點 |
| [coach-prompt.md](./coach-prompt.md) | 改造版「學習生活設計師」system prompt（Phase 2 多輪對話完整版） |
| [phase1-single-shot-prompt.md](./phase1-single-shot-prompt.md) | Phase 1 精靈式單次生成 prompt（結構化輸入 → JSON 三版本＋原型行動） |

## TL;DR

- **為什麼**：島島現有入口（Action Maker、推薦卡）都假設使用者已經知道自己想學什麼。
  對「還不知道要實踐什麼主題」的使用者，目前沒有任何服務接住——這是漏斗最上游的洞。
- **方法論契合度高**：島島已擁有人生設計課的後半段零件——主題實踐＝原型（Prototype）、
  打卡 mood＝能量地圖原始資料、完成後 AI insight＝失敗免疫與反思、buddy＝人生設計訪談雛形。
  缺的只是前半段「看清現況 → 分辨重力問題 → 產生多個版本」的引導。
- **關鍵技術現實**：daodao-ai-backend **完全沒有多輪對話基礎設施**（無 conversation/message 表，
  唯一的 chat 是 admin playground 單次無狀態呼叫）；但 LLM 治理層完備
  （SystemPrompt DB 動態管理、AIServiceConfig、AIQueryLog、UserTokenQuota、guardrail）。
- **路線**：
  - **Phase 1**（1–2 週）：精靈式結構化問答＋單次 LLM 生成，複用 Action Maker 模式，驗證需求。
  - **Phase 2**：真正的多輪 AI 教練（新增 coach_sessions / coach_messages / learning_blueprints 表）。
  - **Phase 3**：閉環——用打卡 mood 與 insight 回灌教練，做出島島獨有的「看得見原型結果」差異化。

## 狀態

- 2026-07-10：完成 codebase 盤點（daodao-server / daodao-f2e / daodao-ai-backend）、
  設計提案與兩版 prompt 草稿。待決策：起始 Phase、反向推演保留程度、藍圖篇幅。
- 2026-07-16：決定先在 admin playground 試行驗證 prompt 品質，
  開立 OpenSpec change [`life-design-coach-admin-trial`](../../../openspec/changes/life-design-coach-admin-trial/proposal.md)
  （ai-backend prompt seed ＋ playground 多輪對話、admin-ui 對話串 UI）。
