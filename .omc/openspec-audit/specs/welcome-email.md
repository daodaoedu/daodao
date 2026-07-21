# welcome-email
- 涉及 repo: server (auth/email controller, email.service, welcome-template), storage (migration 015/016)
- 對應 archived change: 無（migration 015_add_welcome_letter_email_type / 016_add_unique_welcome_letter_per_user）
- 總計: 1 條 requirement / 5 個 scenario | ✅5 ⚠️0 ❌0 ❓0

## Requirement: 依來源管道寄送歡迎信 → ✅
證據: daodao-server:src/services/email/welcome-template.ts:29 REFERRAL_GROUP_MAP（instagram/facebook/linkedin→social-media；discord/friend_referral→community）；getReferralGroup (welcome-template.ts:40)；auth.controller.ts:467,539 verifyEmail/verifyEmailGet 呼叫 sendWelcomeEmailWithLog；storage:migrate/sql/015_add_welcome_letter_email_type.sql + 016_add_unique_welcome_letter_per_user.sql
- Scenario: 來源為社群媒體 → ✅ — instagram/facebook/linkedin → 'social-media'，welcome-template.ts:66 case 'social-media' generateSocialMediaContent；email_type WELCOME_LETTER (email.service.ts:197)
- Scenario: 來源為社群或口碑 → ✅ — discord/friend_referral → 'community'，welcome-template.ts:74 case 'community' generateCommunityContent
- Scenario: 來源為其他或未知 → ✅ — getReferralGroup 對 null/未知 fallback 'default' (welcome-template.ts:41-42)，welcome-template.ts:82 default generateDefaultContent
- Scenario: 歡迎信不重複發送（冪等保護） → ✅ — email.service.ts:194 hasEmailBeenSent 查 email_logs，已發則 return ALREADY_SENT；另有 DB partial unique index (016)。檢查失敗採保守策略拒發 (email.service.ts:204)
- Scenario: 發送失敗不阻斷驗證 → ✅ — auth.controller.ts:467 fire-and-forget `.catch()` 記錄錯誤，不影響 verifyEmail 200 回應 (auth.controller.ts:471-483)
