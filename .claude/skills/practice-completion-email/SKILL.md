---
name: practice-completion-email
description: Use when sending personalized congratulation emails to users who completed a practice. Queries the DB for completed practices, generates personalized email content via daodao-ai-backend LLM, previews samples for confirmation, then sends via email API. Always runs in dry-run mode first.
---

# Practice Completion Email

查詢完成實踐的用戶，透過 LLM 生成個人化慶賀信並寄出。

## Instructions

### 步驟 1：確認參數

若使用者未指定，用 AskUserQuestion 確認：
- **時間範圍**：今天 / 本週 / 本月 / 自訂日期區間（預設：今天）
- **Dry-run**：是否僅預覽不實際發信（預設：是）

### 步驟 2：查詢完成實踐的用戶

用 `daodao-pg-prod::query` 執行：

```sql
SELECT
  p.id AS practice_id,
  p.title AS practice_title,
  p.user_id,
  u.email,
  u.display_name,
  p.updated_at AS completed_at,
  (SELECT COUNT(*) FROM practice_checkins pc WHERE pc.practice_id = p.id) AS checkin_count,
  (SELECT mood FROM practice_checkins pc WHERE pc.practice_id = p.id ORDER BY pc.created_at DESC LIMIT 1) AS last_mood
FROM practices p
JOIN users u ON u.id = p.user_id
WHERE p.status = 'completed'
  AND p.updated_at >= '{START_DATE}'
  AND p.updated_at < '{END_DATE}'
  AND u.email IS NOT NULL
ORDER BY p.updated_at DESC;
```

回報查詢結果筆數。若為 0 則結束並告知使用者。

### 步驟 3：過濾已寄過的用戶

```sql
SELECT user_id FROM email_logs
WHERE email_type = 'practice'
  AND created_at > NOW() - INTERVAL '30 days'
  AND user_id = ANY(ARRAY[{USER_IDS}]);
```

移除已在 30 天內收過同類信的用戶，計入 skipped 數量。

### 步驟 4：LLM 生成個人化信件

對每位用戶呼叫 daodao-ai-backend `LLMClient.generate()`，backend 使用 `gemini` 或 `anthropic`。

System prompt：
```
你是島島（DaoDao）的學習夥伴，撰寫真誠溫暖的慶賀信。
語氣真誠、不過度誇張。繁體中文，150-250 字。
必須提及實踐名稱；依打卡次數調整口吻（< 5 次：剛起步鼓勵；≥ 30 次：長期堅持讚賞）。
結尾給一句具體下一步建議。輸出 JSON。
```

User prompt 帶入：display_name、practice_title、checkin_count、last_mood

要求輸出：
```json
{
  "subject": "郵件主旨（含 emoji，25 字以內）",
  "greeting": "開頭問候語（1 句）",
  "body": "信件主體（2-3 段，150-250 字）",
  "cta_text": "按鈕文字（10 字以內）",
  "next_step": "下一步建議（30 字以內）"
}
```

### 步驟 5：預覽樣本

顯示前 3 封完整信件內容（收件人 + 主旨 + 內文），等待使用者確認：
- 「確認發送」→ 進入步驟 6
- 「調整重試」→ 回到步驟 4 修改 prompt
- 「取消」→ 結束

**Dry-run 模式下到此為止，不執行步驟 6。**

### 步驟 6：批次發送

確認後，對每位用戶呼叫：

```bash
curl -X POST $DAODAO_API_BASE/api/email/send \
  -H "Authorization: Bearer $DAODAO_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "{email}", "subject": "{subject}", "html": "{html}", "emailType": "practice", "userId": "{user_id}"}'
```

每封間隔 200ms。

### 步驟 7：回報結果

```
📧 發送完成
✅ 成功：N 封
⏭️  跳過（近期已寄）：M 封
❌ 失敗：K 封
```

失敗時列出 email 和錯誤原因。

## 注意事項

- 詳細 SQL 和 LLM prompt 規格見 `docs/agent/skills/practice-completion-email.md`
- 單次上限 500 封，超過需再次確認
- 不寄給 `email IS NULL` 或已取消訂閱的用戶
