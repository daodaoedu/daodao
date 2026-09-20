# social-connect
- 涉及 repo: server (connection service/controller/queue) / storage (connection_requests/connections/interaction_counts) / f2e (connect button + modal)
- 對應 archived change: 2026-05-26-social-follow-connect / 2026-05-26-social-interactions
- 總計: 9 條 requirement / 22 個 scenario | ✅12 ⚠️6 ❌1 ❓3

## Requirement: 發送連結請求（標準門檻）→ ✅
證據: daodao-server:src/services/connection.service.ts:105-115 — `bypass = hasFamiliarityBypass(...)`，`if (!bypass && (!intent || trim.length===0)) throw`；intent 限 50 字（validators sendRequestBodySchema `max(50)`）
- Scenario: 互動不足強制填寫原因 → ⚠️ — 後端強制 intent；f2e modal (user-info-card.tsx:243-268) 有 textarea maxLength=50，但**無條件**開啟 modal，未依 hasBypass 決定是否顯示
- Scenario: 未填寫原因阻擋送出 → ✅ — connection.service.ts:107-115 拋 BadRequestError；前端 trim()||undefined 傳 undefined 則後端擋
- Scenario: 填寫原因後成功送出 → ✅ — 建立 status:'pending' 請求並通知（connection.service.ts:150,236 區段）

## Requirement: 信任豁免機制（Familiarity Bypass）→ ⚠️
證據: interaction-count.service.ts:72-77 `hasFamiliarityBypass` 回 `count >= 3`；connection.service.ts:106 套用
- Scenario: 達到互動門檻可跳過 Modal → ⚠️ — 後端 bypass 時 intent 非必填可直接建立；但 f2e 仍會彈出 modal（未用 hasBypass 跳過），UI 行為與 spec「不跳出 Modal」不符
- Scenario: 跨實踐累計互動計算 → ✅ — interaction_counts 以 (min,max) pair 單筆累計（migrate/sql/025），不分實踐；comment.service.ts:125 對每則留言 increment
- Scenario: 對話環正確計數 → ✅ — 每則 comment/reply 只要 userId≠owner 即 +1（comment.service.ts:124-126），A 留言/B 回覆/A 再回覆各計一次

## Requirement: 互動計數範圍 → ⚠️
證據: interaction-count.service.ts:29-40 increment 以 normalizePair (min,max) 雙向對稱累計（migrate/sql/025 chk_interaction_counts_id_order）
- Scenario: 留言計入互動 → ✅ — comment.service.ts:125 createComment 流程 increment
- Scenario: 回覆留言計入互動 → ✅ — 同一 createComment 路徑（parent_id 不為空時亦走 increment 判斷）
- Scenario: @ 標記計入互動 → ❌ — mention 路徑（comment.service.ts:202-253）只送 mention 通知，**未呼叫 interactionCountService.increment** 對 A↔被標記者 pair 計數；僅留言者↔內容擁有者會計數

## Requirement: 自我連結防護 → ✅
證據: connection.service.ts:92-93 `if (requesterId === receiverId) throw new BadRequestError('無法連結自己')`
- Scenario: 自我連結被攔截 → ✅ — 直接拋錯拒絕

## Requirement: 並發連結請求處理 → ✅
證據: connection.service.ts:117-159 — 查 reverseRequest（B→A），`if (reverseRequest.status==='pending')` 走自動 accept 分支而非新建
- Scenario: 雙向並發請求自動合併 → ✅ — B→A pending 時自動接受建立連結，不新建第二筆（service:127 區段）

## Requirement: 情境化連結請求 → ⚠️
證據: validators sendRequestBodySchema 有 `contextPracticeExternalId` 欄位；f2e connection.ts:52 型別含 contextPracticeExternalId
- Scenario: 實踐頁預帶實踐名稱 → ⚠️ — 後端/型別支援 contextPractice 欄位，但 grep 不到 product UI 實際從實踐頁帶入並「預填實踐名稱至 intent textarea」的實作；user-info-card modal 的 textarea 無 prefill，且未傳 contextPracticeExternalId

## Requirement: 連結請求狀態管理 → ✅
證據: connection_requests.status pending/accepted/rejected（migrate/sql/023）；service acceptRequest/rejectRequest/withdrawRequest（connection.service.ts:220,261,288）
- Scenario: 發起方看到等待中狀態 → ⚠️ — f2e setOptimisticConnectionStatus('pending') 後按鈕顯示 pending（user-info-card.tsx:277），文案由 i18n 控制，未逐字驗證「等待回應」
- Scenario: 受邀方接受請求 → ✅ — acceptRequest 建立 connections 並通知 requester（connection.service.ts:220-236）
- Scenario: 受邀方忽略請求 → ✅ — rejectRequest 設 status:'rejected'，**不**對 requester 發新通知（僅改 receiver 自己的通知為 connect-rejected，connection.service.ts:275-283），符合「A 不收到拒絕通知」
- Scenario: 發起方撤回請求 → ⚠️ — withdrawRequest `prisma.connection_requests.delete`（connection.service.ts:303）刪除該筆；雙方清單因查 pending 而同步消失，但無明確程式碼證據顯示同步移除受邀方「收到清單」快取（依賴前端重抓）

## Requirement: 解除連結 → ❓
證據: connection.service.ts:311-328 disconnect 刪除 connections 列；isConnected helper（service:547）存在
- Scenario: 解除連結後隱私同步失效 → ❓ — disconnect 確實刪除 connection row，但 `isConnected` helper **grep 不到任何 practice/content 讀取路徑呼叫它**（唯一外部 isConnected 命中為 prisma.service 內部旗標，無關），無法證實「僅限夥伴」內容存取確實依連結狀態即時 gate
- Scenario: 非連結者無法存取夥伴內容 → ❓ — 同上，找不到以連結關係作為「僅限夥伴」內容權限檢查的程式碼，無法判定 URL 直接存取會被拒

## 關鍵落差
1. @mention 不計入互動：comment.service.ts 只在「留言者↔內容擁有者」increment，mention 通知路徑未對被標記者 pair 計數，違反「@ 標記計入互動」requirement（❌）。
2. f2e bypass UX 未實作：connect modal 無條件彈出 intent textarea，未依後端 hasBypass 跳過 Modal，且未從實踐頁預帶實踐名稱（情境化連結請求 ⚠️）。
3. 「僅限夥伴」內容存取 gate 未驗證：disconnect 會刪 connection row，但 isConnected helper 無任何內容讀取路徑使用，解除後隱私同步失效/非連結者擋存取兩個 scenario 無法以程式碼證實（❓）。
