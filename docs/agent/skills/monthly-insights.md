# Skill：monthly-insights

> 查詢指定月份的用戶活躍與互動資料，透過 LLM 撰寫洞察摘要，輸出 Markdown 報告或寫入 Notion。

---

## 觸發語句

- "幫我整理這個月的使用者活躍資訊與互動資訊洞察"
- "產出 {month} 的月報"
- "這個月的 MAU / DAU / 互動趨勢"

## 前置參數

| 參數 | 必填 | 說明 | 範例 |
|------|------|------|------|
| `month` | ✅ | 目標月份 | `2026-05`（預設：當月）|
| `output` | ✅ | 輸出目標 | `markdown` / `notion` / `both` |
| `notion_page_id` | ❌ | 寫入的 Notion 頁面 ID | 若 output=notion 則必填 |
| `include_cohort` | ❌ | 是否計算留存率 | `true`（預設）|
| `top_n` | ❌ | 最活躍 Top N 用戶/實踐 | `10`（預設）|

---

## 步驟

### Step 1 — 定義時間範圍

```
START = {month}-01 00:00:00
END   = 下個月 01 00:00:00（不含）
PREV_START = 上個月 01
PREV_END   = 本月 01
```

### Step 2 — 查詢核心活躍指標

**2a. MAU / 活躍用戶數（本月至少打卡 1 次）**

```sql
SELECT COUNT(DISTINCT pc.user_id) AS mau
FROM practice_checkins pc
WHERE pc.created_at >= '{START}' AND pc.created_at < '{END}';
```

**2b. 每日活躍用戶趨勢（DAU）**

```sql
SELECT
  DATE(pc.created_at) AS day,
  COUNT(DISTINCT pc.user_id) AS dau
FROM practice_checkins pc
WHERE pc.created_at >= '{START}' AND pc.created_at < '{END}'
GROUP BY DATE(pc.created_at)
ORDER BY day;
```

**2c. 打卡總數 & 打卡次數分布**

```sql
SELECT
  COUNT(*) AS total_checkins,
  AVG(checkin_count) AS avg_checkins_per_user,
  MAX(checkin_count) AS max_checkins
FROM (
  SELECT user_id, COUNT(*) AS checkin_count
  FROM practice_checkins
  WHERE created_at >= '{START}' AND created_at < '{END}'
  GROUP BY user_id
) sub;
```

**2d. 新用戶數（本月註冊）**

```sql
SELECT COUNT(*) AS new_users
FROM users
WHERE created_at >= '{START}' AND created_at < '{END}';
```

**2e. 新建實踐數 vs 完成實踐數**

```sql
SELECT
  COUNT(*) FILTER (WHERE created_at >= '{START}') AS new_practices,
  COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= '{START}') AS completed_practices
FROM practices
WHERE created_at < '{END}';
```

### Step 3 — 查詢互動指標

**3a. 按讚 / 留言 / 追蹤**

```sql
SELECT
  (SELECT COUNT(*) FROM reactions WHERE created_at >= '{START}' AND created_at < '{END}') AS total_reactions,
  (SELECT COUNT(*) FROM comments WHERE created_at >= '{START}' AND created_at < '{END}') AS total_comments,
  (SELECT COUNT(*) FROM follows WHERE created_at >= '{START}' AND created_at < '{END}') AS new_follows;
```

**3b. 互動熱度：被按讚最多的實踐（Top N）**

```sql
SELECT
  p.title,
  p.user_id,
  u.display_name,
  COUNT(r.id) AS reaction_count
FROM reactions r
JOIN practices p ON p.id = r.target_id AND r.target_type = 'practice'
JOIN users u ON u.id = p.user_id
WHERE r.created_at >= '{START}' AND r.created_at < '{END}'
GROUP BY p.id, p.title, p.user_id, u.display_name
ORDER BY reaction_count DESC
LIMIT {top_n};
```

**3c. 最活躍用戶（打卡次數 Top N）**

```sql
SELECT
  u.display_name,
  u.id AS user_id,
  COUNT(pc.id) AS checkin_count
FROM practice_checkins pc
JOIN users u ON u.id = pc.user_id
WHERE pc.created_at >= '{START}' AND pc.created_at < '{END}'
GROUP BY u.id, u.display_name
ORDER BY checkin_count DESC
LIMIT {top_n};
```

### Step 4 — 計算留存率（include_cohort=true）

```sql
-- 上個月活躍 → 本月仍活躍（留存）
WITH prev_active AS (
  SELECT DISTINCT user_id FROM practice_checkins
  WHERE created_at >= '{PREV_START}' AND created_at < '{PREV_END}'
),
curr_active AS (
  SELECT DISTINCT user_id FROM practice_checkins
  WHERE created_at >= '{START}' AND created_at < '{END}'
)
SELECT
  COUNT(pa.user_id) AS prev_mau,
  COUNT(ca.user_id) AS retained,
  ROUND(COUNT(ca.user_id)::numeric / NULLIF(COUNT(pa.user_id), 0) * 100, 1) AS retention_rate
FROM prev_active pa
LEFT JOIN curr_active ca ON ca.user_id = pa.user_id;
```

### Step 5 — LLM 撰寫洞察摘要

將 Step 2~4 的數字整理成結構化 JSON，傳給 LLMClient：

**System Prompt：**
```
你是島島（DaoDao）的數據分析師，負責將原始數字轉化為有意義的產品洞察。
請用繁體中文撰寫，結構清晰，重點突出。
每個段落聚焦一個主題，不要只是重述數字——要解讀趨勢、找出亮點與隱憂、給出具體建議。
```

**User Prompt：**
```
以下是 {month} 的島島平台數據，請撰寫月度洞察報告：

【活躍指標】
- MAU：{mau} 人（上月：{prev_mau} 人，{mau_change}%）
- 打卡總次數：{total_checkins}（人均 {avg_checkins} 次）
- 新用戶：{new_users} 人
- 新建實踐：{new_practices}｜完成實踐：{completed_practices}

【互動指標】
- 按讚：{total_reactions}｜留言：{total_comments}｜新追蹤：{new_follows}

【留存】
- 上月留存率：{retention_rate}%（上月活躍 {prev_mau} 人，本月仍活躍 {retained} 人）

【熱門實踐 Top 5】
{top_practices_list}

【最活躍用戶 Top 5】
{top_users_list}

請輸出以下結構（JSON）：
{
  "summary": "一段 80 字以內的整體摘要",
  "highlights": ["亮點 1", "亮點 2", "亮點 3"],
  "concerns": ["需關注 1", "需關注 2"],
  "recommendations": ["建議行動 1", "建議行動 2", "建議行動 3"],
  "narrative": "完整洞察敘述（400-600 字，分段落）"
}
```

### Step 6 — 組裝並輸出報告

**Markdown 格式輸出：**

```markdown
# 島島 {month} 月度洞察報告

> 生成時間：{generated_at}

## 摘要
{summary}

## 亮點
{highlights 轉 bullet list}

## 需關注
{concerns 轉 bullet list}

## 數據總覽

| 指標 | 本月 | 上月 | 變化 |
|------|------|------|------|
| MAU  | {mau} | {prev_mau} | {change}% |
| 打卡總數 | {total_checkins} | - | - |
| 新用戶 | {new_users} | - | - |
| 留存率 | {retention_rate}% | - | - |
| 互動總數 | {total_interactions} | - | - |

## 詳細洞察
{narrative}

## 建議行動
{recommendations 轉 numbered list}

## 熱門實踐 Top {top_n}
{top_practices 表格}

## 最活躍用戶 Top {top_n}
{top_users 表格}
```

**若 output=notion：** 使用 `mcp__claude_ai_Notion__notion-update-page` 或 `notion-create-pages` 將報告寫入指定頁面。

---

## 輸出範例（摘要部分）

```
島島 2026-05 月度洞察報告
━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAU：1,243 人（↑ 8.2%）
打卡：8,921 次（人均 7.2 次）
留存率：61.3%

✨ 亮點
  • 完成實踐數創三個月新高（382 件）
  • 許願池功能上線帶動互動量 +34%

⚠️  需關注
  • DAU 在 5/15 後出現下滑，疑似功能更新造成使用流失
  • 新用戶 7 日留存率偏低（推估 23%）

💡 建議
  1. 調查 5/15 後的操作路徑變化
  2. 優化新用戶第 3-7 天的引導信流程
  3. 將許願池功能推送給低活躍用戶作為重新激活切入點
```

---

## 注意事項

- **prod DB 唯讀**：所有 SQL 均為 SELECT，透過 `daodao-pg-prod::query` 執行。
- **資料量控制**：Top N 查詢加 LIMIT，避免回傳過大結果集。
- **PII 保護**：報告輸出不含 email 或 phone，Top 用戶僅顯示 `display_name` 和 `user_id`。
- **Notion 寫入**：若為更新現有頁面，先用 `notion-search` 找到正確的頁面 ID，再 `notion-update-page`。
