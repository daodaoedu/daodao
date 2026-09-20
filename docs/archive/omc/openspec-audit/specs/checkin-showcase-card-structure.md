# checkin-showcase-card-structure
- 涉及 repo: daodao-f2e (apps/product)
- 對應 archived change: 2026-05-26-showcase-and-search
- 總計: 4 條 requirement / 8 個 scenario | ✅5 ⚠️3 ❓0

> 元件: daodao-f2e:apps/product/src/components/showcase/CheckInShowcaseCard.tsx

## Requirement: 封面區（Cover Area） → ⚠️
證據: CheckInShowcaseCard.tsx 封面 div bg-logo-cyan，圖片分支 h-[240px]，內容分支 max-h-[240px]
- Scenario: 有封面圖片(顯示第一張,object-cover) → ✅ — image_urls[0] + className object-cover h-[240px]
- Scenario: 無封面圖片(渲染 CheckInCard 預覽,pointer-events:none,overflow hidden) → ⚠️ — 有 hasContent 時渲染 <CheckInCard> 預覽 pointer-events-none overflow-hidden(符合)；但**無任何內容時改走第三分支**(縮短封面+心情 emoji+印章)，非 spec 描述的固定 240px CheckInCard 預覽，spec 僅定義有圖/無圖兩種，實作多了「無內容」變體且高度非 240px
- Scenario: 封面漸層遮罩(transparent→logo-cyan) → ✅ — absolute bottom bg-gradient-to-b from-transparent to-logo-cyan

## Requirement: 社群資訊區（Community Info Area） → ⚠️
證據: CheckInShowcaseCard.tsx bg-white 區塊，含頭像 size-16、日期 text-light-gray、note line-clamp-2、分隔線、互動列、留言預覽
- Scenario: 心情 emoji badge 疊在頭像右下角 → ✅ — MoodEmoji absolute left-[45px] top-[40px] size-6 z-10(頭像 size-16 右下)
- Scenario: 打卡摘要截斷(最多2行) → ✅ — note <p className="line-clamp-2">
- Scenario: 留言預覽數量(最多2則,頭像24x24,名稱加粗,內容單行截斷) → ⚠️ — 留言者頭像 size-6(24px)✅、名稱 font-semibold✅、內容 line-clamp-1✅；但 comment_preview.map 渲染**全部**項目，元件端**未 slice 至 2**，是否限 2 則依後端供應(server grep 不到 comment_preview slice/limit=2)，未確認

## Requirement: 互動行為 → ✅
證據: CheckInShowcaseCard.tsx handleCardClick + onClick stopPropagation
- Scenario: 點擊卡片本體跳轉詳情頁 → ✅ — handleCardClick router.push(`/practices/${practice.id}/check-ins/${id}`)
- Scenario: 互動列與三點選單阻止跳轉 → ✅ — 互動列/選單/頭像容器 onClick={(e)=>e.stopPropagation()}，且 handleCardClick 對 closest('a,button') return

## Requirement: 互動效能 → ⚠️
證據: useCardReactions hook + handleOpenComments sheet
- Scenario: Reaction 計數更新 200ms 內 → ❓→⚠️ — 使用 useCardReactions(optimistic toggle via handleToggle + onReactionMutate)，有樂觀更新傾向，但無法靜態驗證 200ms 數值
- Scenario: 留言送出即時顯示 → ⚠️ — 留言透過 CheckInCommentSheetContent sheet 處理，即時顯示邏輯在該元件內，本卡片未直接驗證；無法確認「不重新載入即出現在留言列」
