# Dao Dao Agent 設計文件

> 版本：v1.0 | 日期：2026-05-31 | 狀態：設計中

---

## 1. 定位

Dao Dao Agent 是一個**通用型對話式代理服務**，預計整合至 `daodao-ai-backend`。

使用者透過自然語言對話，Agent 存取島島的資料與服務，完成任意業務需求——不預設用途，由對話內容決定做什麼。

### 1.1 模型層

Agent 的推理與內容生成透過 `daodao-ai-backend` 現有的 `LLMClient` 驅動，支援多 provider，對話中可任意切換：

以開源模型為主，透過 OpenRouter / Groq / Cloudflare 等推論服務存取，不依賴 Anthropic / OpenAI：

| 指令範例 | 模型 | 來源 | 定位 |
|---------|------|------|------|
| 「用 deepseek flash」（預設）| `deepseek/deepseek-v4-flash` | OpenRouter | 284B MoE / 13B 激活，Agent 首選，$0.10/$0.20 per M |
| 「用 deepseek pro」 | `deepseek/deepseek-v4-pro` | OpenRouter | 1.6T MoE / 49B 激活，複雜推理與長任務 |
| 「用 hy3」/ 「用騰訊」 | `tencent/hy3-preview` | OpenRouter | MoE，可調推理深度，$0.063/$0.21 per M |
| 「用 mimo」 | `xiaomi/mimo-v2.5-pro` | OpenRouter | SWE-bench 頂尖，支援千次工具呼叫，1M context |
| 「免費模式」 | `nvidia/nemotron-3-super` | OpenRouter | 120B MoE / 12B 激活，開權重，完全免費 |
| 「用 gemini flash」 | `google/gemini-3-flash-preview` | Gemini API | Near Pro 推理，$0.50/$3 per M |
| 「本地」 | `qwen3:32b` / `deepseek-r1:70b` | Ollama | 本地離線，無費用 |

預設 provider：`openrouter`，模型：`deepseek/deepseek-v4-flash`。

> **config.py 需更新**：將 `openrouter.model` 改為 `deepseek/deepseek-v4-flash`，並確認各 provider API key 已設定。

### 1.2 Skill

Skill 是對**重複使用的業務邏輯**的封裝——一個 Python 工作流模組，包含資料查詢、LLM 生成、業務執行的完整流程。生命週期與現有清單見 [§3.4](#34-skill-生命週期)。

---

## 2. Harness 設計理念

> "Intelligence without infrastructure is just a demo." — Phil Schmid

### 2.1 Harness 的定位

Harness **不是 framework，也不是 Agent 本身**。

Framework（LangChain、Claude Agent SDK）提供的是零件——工具整合、agentic loop 的基本實作。Harness 在 framework 之上、Agent 之下，提供的是**組裝好的機器**：prompt 預設、工具呼叫的 opinionated handling、lifecycle hooks、context 管理、審批流程。

| 層級 | 電腦類比 | 在 Dao Dao 中的對應 |
|------|---------|-------------------|
| **Model** | CPU | LLMClient 後端（openrouter / gemini / ollama…）— 提供原始推理能力 |
| **Harness** | 作業系統 | Dao Dao Agent 核心 — 讓 Model 在島島業務脈絡下穩定運行的基礎設施 |
| **Agent** | 應用程式 | 具體業務邏輯（Skill 或臨時組合）— 跑在 Harness 上 |

### 2.2 Harness 核心職責

Dao Dao Agent Harness 負責六件事，缺一不可：

**① 任務循環引擎（QueryEngine）**
接收用戶輸入 → 注入 DaoDao 業務脈絡 → 識別意圖 → 選擇 Skill 或臨時組合工具 → 執行工具呼叫 → 回流結果到下一輪。這是整個 Agent 的大腦調度器，不是對話框。

**② 脈絡注入（Context）**
每個 Turn 開始前自動注入：
- 當前日期、用戶操作權限
- DB schema 摘要（讓 LLM 能寫出正確 SQL）
- 當前 provider 設定與 dry_run 狀態
- 前幾次操作的摘要（避免重複）

**③ 會話狀態管理（AppState）**
跨 Turn 保留的運行時狀態：當前 LLM provider、dry_run 開關、active thread ID、已執行工具清單、累積的 approval 記錄。

**④ Approval Flow（審批流程）**
批次寫入操作（發信、推播）觸發時，Harness 主動推出 approval_request，**Turn 在此暫停**，等待用戶回傳 `allow` 或 `deny` 後繼續。這是 server 向 client 發請求，方向與一般 request-response 相反——需要雙向通訊支撐。

**⑤ Context Durability（Context 耐久性）**
長對話後，context window 裡累積的中間查詢結果會開始干擾決策——這不是 context 不夠大，而是 context **品質退化**。Harness 主動管理 context 健康度：摘要化早期 turns、壓縮大型查詢結果、必要時重注入核心指令。

**⑥ Model Drift 偵測**
模型在連續多個工具呼叫後可能偏離初始意圖。Harness 在每個 Turn 結束時自我檢查：當前執行路徑是否仍在用戶原始指令範圍內？偏離時中斷並重新確認。

### 2.3 對話三基本單位

參考 OpenAI Codex App Server 的設計，以三個 primitive 明確建模對話結構：

```
┌─ Thread ─────────────────────────────────────────────────┐
│  持久化對話容器。支援 create / resume / fork / archive。   │
│  跨 session 保留狀態，重開瀏覽器或切換裝置可無縫繼續。    │
│                                                           │
│  ┌─ Turn ───────────────────────────────────────────┐    │
│  │  一次完整工作週期：從用戶輸入到所有工作完成。      │    │
│  │  Approval Flow 在 Turn 中途暫停、確認後繼續。      │    │
│  │                                                   │    │
│  │  Item: user_message  ← 用戶輸入                  │    │
│  │  Item: agent_message ← 模型規劃（支援 streaming） │    │
│  │  Item: tool_call     ← DB query / API / LLM gen  │    │
│  │  Item: tool_call     ← 可有多個，並行或串行       │    │
│  │  Item: approval_request ← 批次操作前暫停確認      │    │
│  │  Item: result        ← 最終執行摘要               │    │
│  └───────────────────────────────────────────────────┘    │
│  ┌─ Turn ───────────────────────────────────────────┐    │
│  │  ...                                              │    │
│  └───────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

每個 Item 有自己的生命週期：`started → delta（streaming）→ completed`，讓前端可以即時反映進度，不用等整個 Turn 完成。

### 2.4 不要過度工程化

> 2024 年需要複雜 hand-coded pipeline 才能做到的事，2026 年一個 context window prompt 就搞定了。— Phil Schmid

Harness 設計必須允許**隨時拆掉「聰明」的部分**：

- Skill 的步驟越少越好，能讓 LLM 自己判斷的邏輯就不要硬編碼
- 意圖識別盡量靠 prompt，不要寫複雜的 rule-based router
- 模型升級時，workaround 比新功能更容易成為障礙
- Harness 也是**驗證環境**：benchmark 測不到第 50 次工具呼叫後的行為，只有在真實業務脈絡下長時間跑才知道模型是否穩定

---

## 3. 架構

### 3.1 服務位置

```
daodao-ai-backend/
└── src/
    ├── services/
    │   └── agent/                        ← Dao Dao Agent 核心
    │       ├── engine.py                 — QueryEngine：任務循環引擎
    │       ├── state.py                  — AppState：跨 Turn 會話狀態
    │       ├── context.py                — 脈絡注入（schema 摘要、日期、權限）
    │       ├── approval.py               — Approval Flow：批次操作審批
    │       ├── agent.py                  — 意圖識別、Skill 調度
    │       ├── skills/                   — Skills（每個業務邏輯一個目錄）
    │       │   ├── practice-completion-email/
    │       │   │   ├── SKILL.md          ← 必要：name / description / 步驟說明
    │       │   │   └── execute.py        ← 選用：實際執行腳本
    │       │   └── monthly-insights/
    │       │       ├── SKILL.md
    │       │       └── queries.sql       ← 選用：SQL 參考
    │       └── tools/                    — 工具封裝（DB、API 呼叫）
    └── routers/
        └── agent.py                      ← 對話 API 端點
```

每個 Skill 的核心是 `SKILL.md`，包含 YAML frontmatter（`name`、`description`）與步驟說明。Agent 在啟動時載入所有 Skill 的 metadata，觸發時才讀取完整內容——這是漸進式載入，不會一次佔滿 context。

### 3.2 Skill 儲存設計

參考主流 agent 系統的做法（LangGraph Store、Mem0），Skill 定義本身保持靜態，動態行為靠 memory 層處理：

```
┌─ Static Skills（版本控制）───────────────────────────────┐
│  存放位置：src/services/agent/skills/*/SKILL.md          │
│  來源：開發者手寫 or 從 DB 升格後 commit 進 repo          │
│  特性：多實例共享（同一份 code）、可 code review          │
└──────────────────────────────────────────────────────────┘

┌─ Dynamic Skills（runtime 產生）──────────────────────────┐
│  存放位置：PostgreSQL agent_skills 資料表                 │
│  欄位：name, description, skill_md, status, created_at   │
│  status 流程：draft → active → archived                   │
│  特性：多實例共享（同一 DB）、對話中即時建立              │
│                                                           │
│  「升格」流程：                                            │
│  DB active skill → 匯出為 SKILL.md → commit 進 repo      │
│  → 成為 Static Skill，從 DB 移除                         │
└──────────────────────────────────────────────────────────┘

┌─ Memory / KV Store（動態行為）───────────────────────────┐
│  存放位置：Redis 或 agent_memory PostgreSQL 資料表        │
│  用途：不改 skill 定義本身，而是儲存偏好、歷史操作、      │
│        用戶選擇的 provider、dry_run 狀態等動態脈絡        │
│  Skill 執行時從 memory 讀取參數，讓同一 Skill 行為可調整  │
└──────────────────────────────────────────────────────────┘
```

Agent 啟動時合併兩個來源的 Skill metadata：
```python
# 啟動時
static_skills  = load_from_filesystem("src/services/agent/skills/")
dynamic_skills = db.query("SELECT * FROM agent_skills WHERE status = 'active'")
skill_registry = merge(static_skills, dynamic_skills)
```

### 3.3 Agent Flow 圖

```
  使用者輸入（自然語言）
           │
           ▼
  ┌─────────────────────────────────────────────────────────┐
  │                     Dao Dao Agent                        │
  │                                                         │
  │   解讀意圖  ──→  有 Skill？──→ 載入 Skill 執行           │
  │                     │ 否                                 │
  │                     ▼                                   │
  │              臨時組合工具執行                             │
  │                                                         │
  │   LLMClient（provider 可切換）負責所有 LLM 生成          │
  └──────┬────────────────┬─────────────────┬───────────────┘
         │                │                 │
         ▼                ▼                 ▼
  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐
  │  資料查詢層  │  │ 通訊 & 整合層 │  │   通用工具層    │
  │             │  │              │  │                 │
  │ MCP pg      │  │ Email API    │  │ web_search      │
  │ REST API    │  │ Notification │  │ stealth_fetch   │
  │             │  │ Notion       │  │ bash / cron     │
  └─────────────┘  └──────────────┘  └─────────────────┘
           │                │                 │
           └────────────────┼─────────────────┘
                            ▼
                    執行結果（依任務而定）
```

### 3.4 Skill 生命週期

```
  1. 臨時執行（Ad-hoc）
  ──────────────────────
  對話描述需求 → Agent 臨時組合工具完成
  適合：一次性任務、探索性查詢

  2. 封裝成 Skill
  ──────────────────────
  業務邏輯確認後 → 寫成 skills/*.py 模組
  → Dry-run 驗證 → 對話一句話觸發
  適合：重複執行的業務流程

  3. 升級為排程（Schedule）← 有需要才做
  ──────────────────────
  高頻 Skill → 包裝成排程任務
  → 設定執行週期（每日 / 每週 / 每月）
  適合：固定週期、無人值守的自動化
```

**現有 Skill**（放在 `daodao-ai-backend/src/services/agent/skills/`，Skill 會隨使用增長）：

| Skill                         | 觸發情境                       | 核心工具                         | 建議排程   |
| ----------------------------- | ------------------------------ | -------------------------------- | ---------- |
| `practice_completion_email` | 用戶完成實踐 → 寄個人化慶賀信 | DB query + LLMClient + Email API | 每日 09:00 |
| `monthly_insights`          | 整理指定月份用戶活躍與互動洞察 | DB query + LLMClient + Notion    | 每月 1 日  |

詳細規格（SQL、LLM prompt、欄位對應）：

- [`skills/practice-completion-email.md`](skills/practice-completion-email.md)
- [`skills/monthly-insights.md`](skills/monthly-insights.md)

---

## 4. 工具清單

Agent 能呼叫的所有工具。**工具定義能力邊界，具體做什麼由對話決定。**

### 4.1 資料查詢（Data Layer）

| 工具                                      | 來源              | 用途                         |
| ----------------------------------------- | ----------------- | ---------------------------- |
| `daodao-pg-dev::query`                  | MCP pg            | 開發 DB SQL 查詢（唯讀）     |
| `daodao-pg-prod::query`                 | MCP pg            | 生產 DB SQL 查詢（唯讀）     |
| `daodao-pg-dev::describe_schema`        | MCP pg            | 查詢資料表結構               |
| `daodao-pg-prod::get_user_full_context` | MCP pg            | 取得用戶完整學習脈絡         |
| `GET /api/admin/statistics/*`           | daodao-server     | 全站統計（實踐、活躍用戶）   |
| `GET /api/admin/users`                  | daodao-server     | 用戶清單查詢                 |
| `GET /v1/users/insights`                | daodao-ai-backend | 用戶 AI 洞察（每日排程生成） |
| `GET /v1/recommendation`                | daodao-ai-backend | 個人化推薦                   |

**關鍵資料表：**

```
practices          — 實踐 (id, user_id, title, status, created_at)
practice_checkins  — 打卡 (id, practice_id, created_at, mood, note)
users              — 用戶 (id, email, display_name, created_at)
reactions          — 按讚 (user_id, target_type, target_id, type)
comments           — 留言 (user_id, practice_id, content, created_at)
follows            — 追蹤 (follower_id, followee_id)
email_logs         — 信件記錄 (user_id, email_type, status, sent_at)
notifications      — 通知 (user_id, type, read_at, created_at)
```

### 4.2 通訊 & 整合（Communication & Integration Layer）

| 工具                        | 來源             | 用途                           |
| --------------------------- | ---------------- | ------------------------------ |
| `POST /api/email/send`    | daodao-server    | 發送單封 email（含追蹤）       |
| `POST /api/email/bulk`    | daodao-server    | 批次發送（需 admin token）     |
| `POST /api/notifications` | daodao-server    | 發送站內通知                   |
| Notion MCP                  | claude.ai Notion | 建立 / 更新 / 搜尋 Notion 頁面 |

**可用 Email 模板：** `welcome` / `onboarding` / `practice` / `notification-digest` / `marathon` / `wish-linked`

### 4.3 通用工具（Utility Layer）

不限業務情境，隨時可用：

| 工具                         | 用途                                      |
| ---------------------------- | ----------------------------------------- |
| `stealth_fetch`            | 抓取外部網頁（自動繞過反爬蟲）            |
| `web_search`               | 搜尋外部資訊、競品研究、查詢公開數據      |
| `python_repl`              | 資料計算、統計分析、格式轉換（本地執行）  |
| `read_file` / `write_file` | 讀寫本地檔案，適合產出報表或載入資料      |
| `bash`                     | 執行 shell 指令、跑腳本、環境操作         |
| `cron_create` / `cron_list` / `cron_delete` | 建立 / 查詢 / 刪除排程任務，Skill 升格為自動化的最後一步 |

---

## 5. 使用情境示範

### 情境 A：有對應 Skill 的任務

```
你：幫我對今天完成實踐的用戶寄慶賀信

Agent → 識別 skill: practice_completion_email
     → 查詢今日 completed 實踐（12 筆）
     → 逐一 LLM 生成個人化信件
     → 預覽 3 封樣本，請你確認
     → 確認後批次發送，回報結果
```

### 情境 B：臨時任務（無預建 Skill）

```
你：查一下上週新加入但還沒建立任何實踐的用戶有幾個

Agent → 臨時組合工具
     → query DB: users.created_at 上週 + LEFT JOIN practices IS NULL
     → 回報數量與名單（display_name）
     → 詢問：要對這些人做什麼？（寄信 / 通知 / 存成報告）
```

---

## 6. 安全規範

| 規則                   | 說明                                                   |
| ---------------------- | ------------------------------------------------------ |
| **prod DB 唯讀** | 只允許 SELECT，不允許任何寫入                          |
| **預覽先行**     | 批次操作（寄信、通知）執行前必須輸出樣本確認           |
| **批次上限**     | 單次發信不超過 500 封，超過需二次確認                  |
| **PII 保護**     | email、phone 等個資不得寫入 Notion 或外部服務          |
| **Dry-run 預設** | 所有 Skill 預設 `dry_run=True`，需明確切換才實際執行 |
