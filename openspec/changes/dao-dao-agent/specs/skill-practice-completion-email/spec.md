## ADDED Requirements

### Requirement: 觸發與參數

`practice-completion-email` Skill SHALL 可由「對完成實踐的用戶寄慶賀信」類自然語言觸發，並接受參數：`time_range`（必填，如 `today` / `this_week` / 指定日期）、`dry_run`（必填，預設 `true`）、`preview_count`（選用，預設 3）、`email_template`（選用，預設 `practice`）、`extra_data_fields`（選用）。

#### Scenario: 觸發並使用預設參數
- **WHEN** 用戶說「幫我對今天完成實踐的用戶寄慶賀信」
- **THEN** Skill SHALL 以 `time_range=today`、`dry_run=true`、`preview_count=3`、`email_template=practice` 啟動

### Requirement: 查詢完成實踐的用戶

Skill SHALL 透過 `daodao-pg-prod::query` 查詢指定時間範圍內 `status = 'completed'` 的實踐，並 JOIN users 取得 email、display_name、加入時間、完成時間、打卡次數與最後心情，且僅納入 `email IS NOT NULL` 的用戶。

#### Scenario: 撈出時間範圍內的完成實踐
- **WHEN** `time_range` 對應的起訖時間確定
- **THEN** 查詢 MUST 只回傳 `updated_at` 落於該範圍且 `status = 'completed'` 且 email 非空的記錄

### Requirement: 取得用戶完整脈絡（控量）

Skill SHALL 可針對每位用戶呼叫 `daodao-pg-prod::get_user_full_context` 以豐富 LLM 上下文。當用戶數 > 50 時，MUST 改為只取 `checkin_count` + `streak_days` 並跳過 full_context 以控制 token 用量。

#### Scenario: 大量用戶時降級
- **WHEN** 完成實踐的用戶數超過 50
- **THEN** Skill MUST 跳過 get_user_full_context，僅取最小化欄位

### Requirement: LLM 生成個人化信件

Skill SHALL 對每位用戶以 LLMClient 生成信件，輸出 JSON 欄位 `subject`、`greeting`、`body`、`cta_text`、`next_step`。內文 MUST 為 150–250 字繁體純文字、提及實踐名稱，並依打卡次數調整口吻（< 5 次為起步鼓勵；≥ 30 次為長期堅持讚賞）。

#### Scenario: 依打卡次數調整口吻
- **WHEN** 某用戶累計打卡次數 ≥ 30
- **THEN** 生成內容 SHALL 採用對長期堅持的讚賞語氣

### Requirement: 預覽先行

互動情境下，在 `dry_run=true` 或首次執行時，Skill MUST 輸出前 `preview_count` 封完整內容並等待人工確認（「確認發送」或「調整後重試」），不得直接發送。排程（無人值守）執行時 SHALL 改將樣本寫入執行報告與 audit log 供事後查驗，不等待確認（見 agent-security 預覽先行）。

#### Scenario: dry_run 僅預覽
- **WHEN** Skill 以 `dry_run=true` 執行
- **THEN** 系統 MUST 只輸出樣本內容，且不呼叫任何發信 API

#### Scenario: 排程執行不等待確認
- **WHEN** Skill 由排程以 auto 模式觸發，且排程定義已明確設定 `dry_run=false`
- **THEN** Skill SHALL 將前 `preview_count` 封樣本寫入執行報告後續行發送，不等待人工確認

### Requirement: 去重檢查

發送前 Skill MUST 查 `email_logs`，確認同一 `practice_id` + `user_id` + `emailType=practice` 在近 30 天未發過；已發過者計入 skipped。

#### Scenario: 近期已發過則跳過
- **WHEN** 某 practice_id + user_id 的 practice 信件在 30 天內已發送
- **THEN** Skill MUST 跳過該用戶並計入 skipped_count

### Requirement: 批次發送

在 `dry_run=false` 且已確認後，Skill SHALL 對每位用戶呼叫 `POST /api/email/send`（emailType=`practice`），每封發送後等待 200ms 避免頻率限制。email 為 null 或 `notification_unsubscribed = true` 的用戶 MUST 跳過並計入 skipped。

#### Scenario: 退訂用戶跳過
- **WHEN** 某用戶 `notification_unsubscribed = true`
- **THEN** Skill MUST 跳過該用戶並計入 skipped，不發送

### Requirement: 回報結果

Skill SHALL 在結束時回報 success_count、skipped_count、failed_count 與失敗清單（含 email 與錯誤訊息）。

#### Scenario: 結束回報統計
- **WHEN** 批次發送結束
- **THEN** 系統 SHALL 輸出成功、跳過、失敗數量及失敗明細
