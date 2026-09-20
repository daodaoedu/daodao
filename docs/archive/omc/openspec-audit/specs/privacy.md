# privacy
- 涉及 repo: server
- 對應 archived change: add-privacy-bridge（推測）
- 總計: 2 條 requirement / 5 個 scenario | ✅3 ⚠️2 ❌0 ❓0

## Requirement: 夥伴關係隱私橋接（Privacy Bridge）→ ✅
證據: daodao-server:src/services/privacy.service.ts:27-60 canAccessContent（visibility='connections_only' 時查 prisma.connections.findUnique(user_a_id_user_b_id) 判定，:50-55）；使用處 practice.service.ts:43,354 `throw new ForbiddenError('此實踐僅限夥伴可見')`；comment.service.ts:45 亦 import。
- Scenario: 夥伴可存取非公開內容 → ✅ — connection 存在則回 true（service.ts:50-55，雙向以 min/max 正規化）。
- Scenario: 非夥伴無法存取 → ⚠️ — 回 403 ForbiddenError（practice.service.ts:354），但訊息為「此實踐僅限夥伴可見」，spec 寫「需要連結才能查看此內容」，文案不符。
- Scenario: 非夥伴 URL 直接存取被攔截（不洩漏存在與否）→ ⚠️ — 有 403 攔截，但回 403 ForbiddenError 而非 404，理論上洩漏「內容存在」；spec 要求「不洩漏內容存在與否」未滿足。

## Requirement: 解除連結即時撤銷隱私權限 → ✅
證據: daodao-server:src/services/connection.service.ts:308-328 解除連結 prisma.connections.delete（無快取）；privacy.service.ts 每次 access 即時查 connections，故刪除後立即失效。
- Scenario: 解除後立即失去存取權 → ✅ — connections.delete（connection.service.ts:324）+ canAccessContent 即時查詢（無快取），下次存取即回 false。
