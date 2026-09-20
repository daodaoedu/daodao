# professional-social-proof
- 涉及 repo: server（service 層）/ 缺 API/export 層
- 對應 archived change: 無
- 總計: 4 條 requirement / 7 個 scenario | ✅1 ⚠️1 ❌2 ❓0

## Requirement: 三項專業見證指標定義 → ✅
證據: daodao-server:src/services/practice-social-proof.service.ts:5 — `SocialProofType = 'insightful' | 'referenced' | 'witnessed'`；:10 `toggleSocialProof`、:41 `getSocialProofStatus`、:60 `getSocialProofCounts`。
- Scenario: 標記 Insightful（唯一） → ✅ — toggleSocialProof 以 (user, practice, type) 切換，model 唯一性由 toggle 語意保證
- Scenario: 標記 Referenced（單次計數） → ✅ — 同 service type='referenced'
- Scenario: 標記 Witnessed（唯一） → ✅ — 同 service type='witnessed'
- 註：service 層完整，但**未接到任何 controller/route**（grep 不到 toggleSocialProof 在 controllers/routes/app.ts 被呼叫），為孤立程式碼

## Requirement: 見證指標不含按讚與一般留言 → ⚠️
證據: practice-social-proof.service.ts 僅計 insightful/referenced/witnessed，本身不含 like/comment。
- Scenario: 導出文件無按讚資訊 → ⚠️ — 邏輯上 socialProof 不含 like，但**無導出文件實作可驗證**（見下）

## Requirement: 見證計數聚合 API → ❌
證據: 無。grep `practices/:id/export`、`/export` 練習端點、socialProof 於 controllers/routes 皆無結果。`getSocialProofCounts` 僅定義於 service，未被任何 endpoint 呼叫。
- Scenario: 導出資料包含見證計數 → ❌ — 不存在 `GET /api/v1/practices/:id/export`（唯一 /export 為 user-stats-routes.ts:503 後台統計匯出，與 practice 見證無關）
- Scenario: 無見證時計數為零 → ⚠️ — service `getSocialProofCounts` 用 `?? 0` 回 0（service:70-72），但無 API 暴露此行為

## Requirement: 見證指標顯示於導出文件 → ❌
證據: 無。grep 不到 PDF/Markdown 練習導出產生器（puppeteer/pdfkit/generateMarkdown 皆無），f2e 亦無 socialProof/insightful/witnessed export 程式碼。
- Scenario: PDF 見證區塊 → ❌ — 無 PDF 導出實作
- Scenario: Markdown 見證資訊 → ❌ — 無 Markdown 導出實作

## 關鍵落差
資料模型/service（toggle、status、counts）已實作，但**整條 API + 導出鏈缺失**：無 `GET /api/v1/practices/:id/export`、無 socialProof 物件回傳、無 PDF/Markdown 產生器，service 為未接線的孤立程式碼。
