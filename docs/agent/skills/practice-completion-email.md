# Skill：practice-completion-email

> 當用戶完成實踐，查詢相關資料，透過 LLM 生成個人化慶賀信並寄出。

---

## 觸發語句

- "幫我對完成實踐的用戶寄信"
- "今天/本週/本月完成實踐的用戶寄慶賀信"
- "用戶完成了實踐，寄一封 LLM 生成的鼓勵信"

## 前置參數

| 參數 | 必填 | 說明 | 範例 |
|------|------|------|------|
| `time_range` | ✅ | 查詢時間範圍 | `today` / `this_week` / `2026-05-31` |
| `dry_run` | ✅ | 是否僅預覽不實際發信 | `true`（預設）/ `false` |
| `preview_count` | ❌ | 實際發送前預覽幾封樣本 | `3`（預設） |
| `email_template` | ❌ | 使用哪個模板基底 | `practice`（預設）|
| `extra_data_fields` | ❌ | LLM 可參考的額外欄位 | `checkin_count, streak_days` |

---

## 步驟

### Step 1 — 查詢完成實踐的用戶

```sql
-- 查詢指定時間範圍內狀態變為 completed 的實踐
SELECT
  p.id           AS practice_id,
  p.title        AS practice_title,
  p.user_id,
  u.email,
  u.display_name,
  u.created_at   AS user_joined_at,
  p.updated_at   AS completed_at,
  -- 打卡次數
  (SELECT COUNT(*) FROM practice_checkins pc WHERE pc.practice_id = p.id) AS checkin_count,
  -- 最後一次打卡的心情
  (SELECT mood FROM practice_checkins pc
   WHERE pc.practice_id = p.id
   ORDER BY pc.created_at DESC LIMIT 1) AS last_mood
FROM practices p
JOIN users u ON u.id = p.user_id
WHERE p.status = 'completed'
  AND p.updated_at >= '{START_DATE}'
  AND p.updated_at < '{END_DATE}'
  AND u.email IS NOT NULL
ORDER BY p.updated_at DESC;
```

**工具：** `daodao-pg-prod::query`

### Step 2 — 取得每位用戶完整脈絡（選擇性，豐富 LLM 上下文）

針對每位用戶呼叫：

```
daodao-pg-prod::get_user_full_context(user_id: "{USER_ID}")
```

若用戶數 > 50，只取 `checkin_count` + `streak_days`，跳過 full_context 以控制 token 用量。

### Step 3 — LLM 生成個人化信件內容

對每位用戶，呼叫 LLMClient 生成：

**System Prompt：**
```
你是島島（DaoDao）的學習夥伴，負責撰寫真誠、溫暖、具體的慶賀信。
信件需符合以下要求：
- 語氣：真誠鼓勵，非過度誇張
- 長度：150-250 字（繁體中文）
- 必須提及用戶的實踐名稱
- 必須根據打卡次數調整口吻（< 5 次：剛起步的鼓勵；≥ 30 次：長期堅持的讚賞）
- 結尾附上一句具體的「下一步」建議
- 輸出純文字，不使用 Markdown 符號
```

**User Prompt：**
```
用戶名稱：{display_name}
完成的實踐：《{practice_title}》
累計打卡次數：{checkin_count} 次
最後打卡心情：{last_mood}
加入島島時間：{user_joined_at}

請生成以下欄位（JSON 格式）：
{
  "subject": "郵件主旨（含 emoji，25 字以內）",
  "greeting": "開頭問候語（1句）",
  "body": "信件主體（2-3段，合計 150-250 字）",
  "cta_text": "行動呼籲按鈕文字（10字以內）",
  "next_step": "一句具體建議（30字以內）"
}
```

### Step 4 — 預覽樣本（dry_run 或首次執行必做）

輸出前 `preview_count` 封的完整內容，格式：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━
收件人：{display_name} <{email}>
主旨：{subject}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
{greeting}

{body}

【{cta_text}】→ https://daodao.tw/practice
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

等待人工確認：「確認發送」或「調整後重試」

### Step 5 — 批次發送（dry_run=false 且已確認）

對每位用戶呼叫：

```bash
curl -X POST $DAODAO_API_BASE/api/email/send \
  -H "Authorization: Bearer $DAODAO_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "{email}",
    "subject": "{subject}",
    "html": "{rendered_html}",
    "emailType": "practice",
    "userId": "{user_id}"
  }'
```

每封發送後等待 200ms 避免頻率限制。

### Step 6 — 回報結果

```
📧 信件發送完成
━━━━━━━━━━━━━━━━━
✅ 成功：{success_count} 封
⚠️  跳過（已發過）：{skipped_count} 封
❌ 失敗：{failed_count} 封

失敗清單：
- {email}: {error_message}
```

---

## LLM 生成欄位對應表

| 欄位 | 資料來源 | LLM 參與 |
|------|---------|---------|
| `subject` | LLM 生成 | ✅ |
| `greeting` | LLM 生成 | ✅ |
| `body` | LLM 生成（依 DB 資料） | ✅ |
| `cta_text` | LLM 生成 | ✅ |
| `to` (email) | DB `users.email` | ❌ |
| `user_id` | DB `users.id` | ❌ |
| `practice_title` | DB `practices.title` | ❌ |
| `checkin_count` | DB COUNT | ❌ |
| `tracking_token` | email_log service 自動注入 | ❌ |

---

## 注意事項

- 發送前先查 `email_logs` 確認同一 `practice_id` + `user_id` + `emailType=practice` 未在近 30 天發過，避免重複。
- `practice-email.service.ts` 中已有 HTML 基礎模板可套用，LLM 生成的文字塞入 `{{body}}` 欄位即可。
- 若用戶 `email` 為 null 或 `notification_unsubscribed = true`，跳過並計入 skipped。
