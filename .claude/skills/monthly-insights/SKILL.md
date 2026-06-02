---
name: monthly-insights
description: Use when asked to summarize or analyze monthly user activity and interaction data. Queries DB for MAU, DAU trends, check-in counts, reactions, comments, follows, retention rate, and top users/practices. Generates narrative insights via daodao-ai-backend LLM and outputs a markdown report or writes to Notion.
---

# Monthly User Insights

查詢指定月份的用戶活躍與互動資料，透過 LLM 撰寫洞察摘要，輸出報告或寫入 Notion。

## Instructions

### 步驟 1：確認參數

若使用者未指定，用 AskUserQuestion 確認：
- **月份**：YYYY-MM 格式（預設：當月）
- **輸出方式**：markdown 印出 / 寫入 Notion / 兩者都要

### 步驟 2：查詢核心活躍指標

用 `daodao-pg-prod::query` 依序執行（可並行）：

1. **MAU**（本月至少打卡 1 次的不重複用戶數）
2. **DAU 趨勢**（每日不重複打卡用戶，用於觀察趨勢）
3. **打卡總數與人均**
4. **新用戶數**（本月 created_at）
5. **新建實踐數 vs 完成實踐數**

詳細 SQL 見 `docs/agent/skills/monthly-insights.md`。

### 步驟 3：查詢互動指標

1. **按讚 / 留言 / 新追蹤** 總數
2. **熱門實踐 Top 10**（被按讚最多）
3. **最活躍用戶 Top 10**（打卡次數最多，顯示 display_name + user_id，不顯示 email）

### 步驟 4：計算留存率

上月活躍用戶中，本月仍活躍的比例。

```sql
WITH prev AS (SELECT DISTINCT user_id FROM practice_checkins WHERE created_at >= '{PREV_START}' AND created_at < '{PREV_END}'),
     curr AS (SELECT DISTINCT user_id FROM practice_checkins WHERE created_at >= '{START}' AND created_at < '{END}')
SELECT COUNT(p.user_id) AS prev_mau,
       COUNT(c.user_id) AS retained,
       ROUND(COUNT(c.user_id)::numeric / NULLIF(COUNT(p.user_id),0) * 100, 1) AS retention_rate
FROM prev p LEFT JOIN curr c ON c.user_id = p.user_id;
```

### 步驟 5：LLM 生成洞察摘要

整理所有數字後，呼叫 daodao-ai-backend `LLMClient.generate()`，backend 使用 `gemini`。

要求輸出 JSON：
```json
{
  "summary": "整體摘要（80 字以內）",
  "highlights": ["亮點 1", "亮點 2", "亮點 3"],
  "concerns": ["需關注 1", "需關注 2"],
  "recommendations": ["建議行動 1", "建議行動 2", "建議行動 3"],
  "narrative": "完整洞察敘述（400-600 字，分段落）"
}
```

不要只重述數字——要解讀趨勢、找出因果關係、給出具體建議。

### 步驟 6：組裝並輸出

**若 output = markdown**：在終端機輸出完整報告（含數據總覽表格 + 洞察敘述 + 建議行動 + Top N 清單）

**若 output = notion**：
1. 用 `mcp__claude_ai_Notion__notion-search` 找到月報頁面
2. 若已存在則 `notion-update-page`，否則 `notion-create-pages`
3. 回報 Notion 頁面連結

**若 output = both**：兩者皆執行

## 注意事項

- 詳細 SQL 和 prompt 見 `docs/agent/skills/monthly-insights.md`
- 輸出報告不含 email、phone 等個資
- Top N 只顯示 display_name + user_id
- 本 Skill 僅讀取資料，無任何寫入 DB 的操作
