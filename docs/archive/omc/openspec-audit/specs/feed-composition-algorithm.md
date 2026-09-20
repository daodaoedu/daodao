# feed-composition-algorithm
- 涉及 repo: f2e (apps/product home page reorder), ai-backend (rank_feed), server (feed?)
- 對應 archived change: 無（以程式碼為準）
- 總計: 5 條 requirement / 12 個 scenario | ✅0 ⚠️2 ❌2 ❓1

## Requirement: Feed 依固定 Slot Pattern 組裝回傳（A→B→C→C→C，含 slot_type 欄位） → ❌
證據: 無 `/api/v1/feed` slot 端點 / 無 `slot_type` 欄位（grep server 與 f2e 皆無 slot_type）。實際組裝在 daodao-f2e:apps/product/src/app/[locale]/(with-layout)/page.tsx:30 `reorderFeedItems`，為 client-side 重排，且 cycle 為 **1:1:1**（打卡:互動:實踐，line 24 註解「1:1:1」），非 spec 的 A→B→C→C→C（1:1:3）。
- Scenario: 正常 Feed 循環排列 → ❌ — 比例不符（1:1:1 vs 1:1:3），且無 slot_type 標示。
- Scenario: 分頁載入完整循環單位 → ❌ — reorder 是對已取回 items 整體重排，非「每頁回傳一完整 5~6 格循環單位」。

## Requirement: 打卡候選池定義（未看過 + Learning Out Loud 公開 + 個人化排序） → ❓
證據: 候選池/隱私篩選/「未看過」邏輯應在後端 feed 來源（daodao-ai-backend:src/services/rank_feed.py / feed_service.py 存在），但未取得「Learning Out Loud 公開過濾」「已看過排除」之明確程式碼證據。
- Scenario: 不公開打卡不進候選池 → ❓ — 未驗證隱私過濾。
- Scenario: 已看過的打卡不重複出現 → ❓ — 未驗證 seen 排除。

## Requirement: Slot A 打卡則數判斷邏輯（熱門 1 則 / 冷啟動 2 則不同 userId / 不足降級 / 空跳過） → ❌
證據: client reorderFeedItems 無「reactions≥1/comments≥1 → 1 則」「冷啟動 2 則不同 userId」之 Slot A 則數決策；checkins 以 bucket 順序逐一放入，無熱門/冷啟動判斷。
- Scenario: 熱門打卡 → ❌ — 無 reactions/comments 門檻判斷。
- Scenario: 冷啟動打卡（2 則不同 userId） → ❌ — 無此邏輯。
- Scenario: 候選池不足降級 → ❌ — 無降級規則。
- Scenario: 不得連續同 userId → ❌ — reorder 未做 userId 去連續。

## Requirement: Slot B ActivityCard 資料（Connection>Follow>熱門 優先序） → ⚠️
證據: daodao-f2e:apps/product/src/app/.../page.tsx 將 `type==="activity"` 歸入 interactions（reorder line 56-58），ActivityCard 元件存在（apps/product/src/components/showcase/ActivityCard.tsx）。但「Connection>Follow>社群熱門」優先序由後端決定，未取得明確證據。
- Scenario: 有追蹤對象且有近期活動 → ⚠️ — ActivityCard 會顯示，優先序邏輯未驗證。
- Scenario: 冷啟動以熱門補位 → ❓→⚠️ — 未見補位邏輯證據。
- Scenario: ActivityCard 含類型標籤 → ⚠️ — 有 FeedLabel import（page.tsx:17），標籤機制存在但未確認「學習動態」文案。

## Requirement: 內容不足時的降級策略（跳過 Slot、不連續同類型>4） → ⚠️
證據: reorderFeedItems 的 while 迴圈在某 bucket 耗盡時自然跳過該類（line 80-90），維持其餘順序。
- Scenario: 某 Slot 內容池不足 → ⚠️ — 會跳過空 bucket，但無「不連續同類型超過 4 則」之上限保護。
- Scenario: 循環節奏維持 → ✅→⚠️ — 剩餘 bucket 仍按固定順序輪流，順序不重排（符合），但整體 cycle 比例本就與 spec 不同。

備註：本 spec 規範的是後端 slot-based feed 演算法；origin/dev 僅有前端 1:1:1 client reorder，與 spec 的 1:1:3 slot pattern + 熱門/冷啟動 Slot A 邏輯顯著分歧。
