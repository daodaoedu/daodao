# content-performance
- 涉及 repo: server (admin-content.service/controller) + admin-ui (前端，未實作)
- 對應 archived change: 無同名（admin-panel-overhaul 相關）
- 總計: 11 條 requirement / 21 個 scenario | ✅1 ⚠️3 ❌6 ❓1
- 註：僅有兩條後端路由 daodao-server:src/routes/admin.routes.ts:1452 GET /content/performance、:1453 PATCH /content/:id/featured。許多 spec 功能（歸因、置頂、排程精選、合輯 CRUD、匯出、零互動標記）後端皆無端點，admin-ui 亦無對應頁面。

## Requirement: 顯示逐項內容指標 → ⚠️
證據: daodao-server:src/services/admin-content.service.ts:56 getContentPerformance 回傳 views、avg read depth(metadata->>'depth_percent', service.ts:106)、avg time(metadata->>'seconds', service.ts:116)、interactionRate=(reactions+comments)/views(service.ts:214)。
- Scenario: 查看內容指標列表 → ⚠️ — 後端有 views/閱讀深度/閱讀時間/互動率，但「不重複瀏覽者數」未見（只有 view_count，無 distinct viewer 計算）；前端表格頁缺失
- Scenario: 查看單一內容詳細指標（含趨勢圖表） → ❌ — 無單項 detail 端點、無趨勢圖

## Requirement: 依指標排序內容 → ⚠️
證據: daodao-server:src/services/admin-content.service.ts:101 ORDER BY view_count DESC（固定）。
- Scenario: 切換排序指標 → ❌ — 後端排序寫死 view_count，無可切換的排序參數；前端缺失
- Scenario: 預設排序（瀏覽由高到低） → ✅ — service.ts:101 預設 ORDER BY view_count DESC

## Requirement: 內容驅動新註冊歸因追蹤 → ❌
證據: grep attribution 在 admin-content 無結果（僅 roadmap 無關檔）。
- Scenario: 查看註冊歸因數據 → ❌ — 無每內容新註冊數
- Scenario: 歸因邏輯（24h 內註冊歸因） → ❌ — 無 24 小時歸因邏輯實作

## Requirement: 日期範圍篩選 → ⚠️
證據: daodao-server:src/services/admin-content.service.ts:56 getContentPerformance(days?) 以 days 套用 periodFilter/eventsFilter/quizFilter。
- Scenario: 設定自訂日期範圍 → ⚠️ — 僅支援 days（近 N 天）單一參數，無 start/end 自訂範圍
- Scenario: 快速選擇預設範圍 → ⚠️ — days 參數可達成近7/30天，但「本月」等預設與前端切換無證據

## Requirement: 編輯精選標記 → ⚠️
證據: daodao-server:src/routes/admin.routes.ts:1453 PATCH /content/:id/featured；service 用 p.is_featured(service.ts:97)。
- Scenario: 標記內容為編輯精選 → ⚠️ — 有 is_featured 切換，但 spec 的「editor's pick」與 is_featured 是否同一概念未明確；前台精選呈現無證據
- Scenario: 取消編輯精選 → ⚠️ — 同 PATCH featured 可設 false，前台呈現無證據

## Requirement: 置頂內容 → ❌
證據: 無 pinned/pin 相關欄位或端點（grep 0）。
- Scenario: 置頂內容 → ❌ — 無實作
- Scenario: 取消置頂 → ❌ — 無實作

## Requirement: 排程精選 → ❌
證據: 無 scheduled feature / feature_start / feature_end 欄位或排程到期邏輯（grep 0）。
- Scenario: 設定排程精選 → ❌ — 無實作
- Scenario: 精選到期自動取消 → ❌ — 無實作

## Requirement: 建立策展合輯 → ❌
證據: daodao-server:src/services/admin-content.service.ts:126 僅 SELECT content_collections（唯讀回傳 collections），無 createCollection/updateCollection/add/remove/reorder 端點（controller grep 0）。
- Scenario: 建立新合輯 → ❌ — 無建立端點
- Scenario: 管理合輯內容 → ❌ — 無新增/移除/排序端點

## Requirement: 匯出內容指標 → ❌
證據: 無 content export / CSV 端點（grep 0）。
- Scenario: 匯出指標報表 → ❌ — 無 ExportButton 後端
- Scenario: 匯出包含日期範圍 → ❌ — 無實作

## Requirement: 零互動內容標記 → ❌
證據: 無 zeroInteraction/needs_review 標記邏輯（grep 0）。
- Scenario: 系統自動標記零互動內容 → ❌ — 無 N 天零互動判斷
- Scenario: 管理員設定標記天數 → ❌ — 無設定

## Requirement: （隱含）合輯/精選前台呈現 → ❓
證據: 多數 requirement 描述「前台醒目呈現」，f2e/admin-ui 無對應元件證據，需執行時確認。
