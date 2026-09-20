# comments
- 涉及 repo: server (comment service/validator/route), storage (migration 011)
- 對應 archived change: 無（migration 011_add_comments_target_type_practice 對應）
- 總計: 4 條 requirement / 7 個 scenario | ✅3 ⚠️4 ❌0 ❓0

## Requirement: 擴充留言目標類型（practice） → ✅
證據: daodao-server:src/validators/comment.validators.ts:28 COMMENT_TARGET_TYPES 含 'practice'；types/comment.types.ts:20 'practice'；storage:migrate/sql/011_add_comments_target_type_practice.sql
- Scenario: 對實踐留言 → ✅ — targetType 'practice' 通過 enum，target_id 轉為內部 ID 存入 (comment.service.ts:96)

## Requirement: 二層留言結構 → ✅
證據: daodao-server:src/services/comment.service.ts:85 `if (parentComment.parent_id) throw BadRequestError('Replies cannot have their own replies')`
- Scenario: 建立頂層留言 → ✅ — parent_id 為 null 時建頂層 (comment.service.ts:102)
- Scenario: 建立回覆 → ✅ — parentId 指向頂層留言時建回覆 (comment.service.ts:102)
- Scenario: 阻止第三層留言 → ✅ — parent 已有 parent_id 時拋 BadRequestError(400) (comment.service.ts:85-87)

## Requirement: @mention 功能 → ⚠️
證據: daodao-server:src/services/comment.service.ts:203 mentionedUserIds 處理；getMentionCandidates (comment.service.ts:364)
- **重大落差**：spec 要求伺服器解析 `@custom_id` 文字並將 user_id 存入 `comments.mentions TEXT[]`。實作改為**前端傳 `mentionedUserIds` 數字陣列**（client 端用候選 API 解析），伺服器只做 token 數比對 (comment.service.ts:961 countMentionTokens) 並發通知。**未寫入 `comments.mentions` 欄位**（grep mentions: 在 service 與 migrate/sql 皆無該欄位）
- Scenario: 輸入 @ 觸發用戶選單 → ✅ — getMentionCandidates 回該 target 已參與用戶（含 custom_id、nickname） (comment.service.ts:364, validators:311)
- Scenario: 提交含 mention 的留言 → ⚠️ — 解析 mention 並通知被標記用戶 (comment.service.ts:202-230)，但 **mention 來自 mentionedUserIds 而非伺服器解析 @custom_id；且未存入 comments.mentions TEXT[]**（只觸發通知）

## Requirement: 留言數計數 → ⚠️
證據: daodao-server:src/services/idea.service.ts:38 getIdeaCommentCounts；admin-content.service.ts:96 COUNT(*) comments
- Scenario: 計數更新 → ⚠️ — 後端有 COUNT(*)（含回覆）查詢提供留言數 (idea.service.ts:38)，但 spec 強調「卡片即時更新」為前端行為；後端僅提供計數，無證據顯示 practice 卡片即時計數整合，標部分
