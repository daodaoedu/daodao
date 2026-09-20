# social-hub
- 涉及 repo: server / f2e
- 對應 archived change: add-social-relationship-center（推測）
- 總計: 4 條 requirement / 12 個 scenario | ✅10 ⚠️2 ❌0 ❓0

## Requirement: 連結請求管理——收到的請求 → ✅
證據: daodao-server:src/routes/connection.routes.ts:123 GET /api/v1/connections/requests/incoming；service connection.service.ts:401-411（含 interactionCount）；f2e social-hub.tsx、connections-settings.tsx。
- Scenario: 顯示待處理的收到請求 → ✅ — incoming 回傳含 interactionCount（service.ts:401,411）對應「互動次數 2/3」、連結原因（reason 門檻 service.ts:6,108）。
- Scenario: 接受後清單更新 → ✅ — POST request/{requestId} 接受（routes:58）。
- Scenario: 忽略後清單更新 → ✅ — 同 action 端點 reject。

## Requirement: 連結請求管理——發出的請求 → ✅
證據: daodao-server:connection.routes.ts:137 GET requests/outgoing；DELETE request/{requestId} 撤回（routes:78）。
- Scenario: 顯示已發出的請求 → ✅ — outgoing 端點。
- Scenario: 撤回後同步消失 → ✅ — DELETE /connections/request/{requestId}（撤回）。

## Requirement: 夥伴清單管理 → ✅
證據: daodao-server:connection.routes.ts:109 GET /api/v1/connections（含 connectionQuerySchema 分頁）；DELETE /connections/{userId} 解除（routes:94，service.ts:308-328 prisma.connections.delete）。
- Scenario: 顯示夥伴清單 → ✅。
- Scenario: 夥伴清單分頁 → ✅ — connectionQuerySchema page/limit（routes:112）。
- Scenario: 解除連結後即時更新 → ✅ — connections.delete（service.ts:324）。

## Requirement: 關注管理 → ✅
證據: daodao-server:src/routes/follow.routes.ts:32 GET/POST /api/v1/follows、:55 DELETE /follows/{targetType}/{targetId}、:98 /users/{userId}/followers、:103 /following；f2e following-settings.tsx。
- Scenario: 顯示我關注的列表 → ✅ — following 端點（含人與主題 practice，targetType）。
- Scenario: 顯示關注我的列表 → ✅ — followers 端點。
- Scenario: 列表分頁 → ⚠️ — follows GET 有 query，但 followers/following 是否帶 page/limit 與總數需確認 validator（未逐一核對）。
- Scenario: 一鍵取消關注 → ✅ — DELETE /follows/{targetType}/{targetId}（routes:55）。
