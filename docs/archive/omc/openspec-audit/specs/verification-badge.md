# verification-badge
- 涉及 repo: server（export API + isVerified 計算）/ f2e（PDF/Markdown 導出）— 預期，但實際未實作
- 對應 archived change: 2026-05-26-practice-journey-export（archive 內有 spec/tasks，但程式碼未落地此驗證章功能）
- 總計: 3 條 requirement / 8 個 scenario | ✅0 ⚠️1 ❌7 ❓0

## Requirement: 高品質門檻判定 → ❌
spec: 導出時動態判定，持續天數 ≥14 天 且 Insightful ≥3 → isVerified
證據: grep `isVerified` 全 server 僅命中 admin-user 篩選（admin-user.service.ts:29,61-62 的 email verified 過濾），與「練習高品質驗證」無關；無任何 `insightfulCount >= 3 && durationDays >= 14` 計算
- Scenario: 同時符合兩項條件 → ❌ — 無門檻計算邏輯，無 isVerified 回傳
- Scenario: 僅持續天數符合但 Insightful 不足 → ❌ — 無實作
- Scenario: 僅 Insightful 足夠但持續天數不足 → ❌ — 無實作

備註: 存在 practice-social-proof.service.ts 的 `insightfulCount`（:62-70）可作為計數來源，但未串接到任何高品質/驗證判定。

## Requirement: 驗證章僅出現於 PDF → ❌
spec: 驗證章僅嵌 PDF，Markdown 以 front matter `verified: true` 標記
證據: grep `export.*pdf|markdown.*export|front matter|verified: true|驗證章` 於 server origin/dev 無練習導出相關結果（僅 auth 的 email verified）；f2e 亦無 practice journey export / generatePdf / 驗證章 實作（grep 僅命中無關 admin users「匯出」按鈕）
- Scenario: PDF 顯示驗證章 → ❌ — 無 PDF 導出與驗證章圖像嵌入
- Scenario: 不符合門檻的 PDF 無驗證章 → ❌ — 無實作
- Scenario: Markdown 以 front matter 標記 → ❌ — 無 Markdown 導出與 verified front matter

## Requirement: 驗證資格於導出時動態計算 → ❌
spec: 每次呼叫 `GET /api/v1/practices/:id/export` 即時計算，回應含 isVerified
證據: grep `practices/:id/export` 於 server routes 無結果（僅有 /practices/:id/like 與 admin user-stats/export）；無練習導出端點
- Scenario: 導出 API 回傳驗證狀態 → ❌ — 無 /practices/:id/export 端點，無 isVerified 欄位
- Scenario: 驗證狀態反映最新見證計數 → ⚠️ — insightful 計數來源存在（practice-social-proof.service.ts:62），理論上可即時查；但無導出端點、無 isVerified 計算串接，整體未實作

## 關鍵落差
1. 整個 practice journey export 功能在 origin/dev 程式碼中不存在：無 `GET /api/v1/practices/:id/export` 端點、無 PDF/Markdown 導出、無驗證章圖像。archive 內有 practice-journey-export 的 spec/tasks，但程式碼未落地。
2. isVerified 高品質門檻（≥14 天 且 Insightful ≥3）完全無計算邏輯；現有 isVerified 全屬 email/帳號驗證語意，與練習驗證章無關。
3. 唯一相關基礎是 practice-social-proof.service.ts 的 insightfulCount，可作為未來計數來源，但目前未串接到任何驗證/導出流程。
