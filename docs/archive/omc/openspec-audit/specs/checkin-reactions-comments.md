# checkin-reactions-comments
- 涉及 repo: f2e (apps/product showcase + check-in components, packages/api hooks)
- 對應 archived change: 2026-05-26-social-interactions / 2026-05-26-batch-reactions-api / 2026-05-26-inspiration-feed-display-enhancement
- 總計: 6 條 requirement / 14 個 scenario | ✅9 ⚠️4 ❌0 ❓1

## Requirement: CheckInShowcaseCard 批次 Reaction 資料（useReactionsBatch）→ ✅
證據: apps/product/src/app/[locale]/(with-layout)/page.tsx:184-186 `useReactionsBatch({ targetType:'checkin', targetIds: checkinIds })`，第 355 行以 `batchReactionData={batchCheckinReactionsData?.data?.[checkin.id]}` 傳入各卡片；CheckInShowcaseCard.tsx:22,94 接收並用 useCardReactions
- Scenario: 一次批次取得所有打卡 Reaction → ✅ — 單一 useReactionsBatch 以 targetIds 陣列發 1 次請求
- Scenario: 新頁載入時 batch 更新 → ⚠️ — page.tsx:218-235 loadMore 觸發 feed 追加，checkinIds 隨之變化使 batch hook 重新涵蓋，但無明確證據顯示「追加進同一 batch 仍為一次請求」（取決於 useReactionsBatch 內部以 targetIds 重抓 vs 增量）— 機制存在但增量語意未逐行確認

## Requirement: CheckInShowcaseCard 互動列 → ✅
證據: CheckInShowcaseCard.tsx:294-348 互動列含 ReactionPickerButton（summary 模式）+ 留言計數圖示 + comment_count + comment_preview（最多取自 preview 陣列）
- Scenario: 互動列不觸發卡片跳轉 → ✅ — 互動列容器 onClick `e.stopPropagation()`（CheckInShowcaseCard.tsx:297），單一互動元素亦 stopPropagation（:138,258）
- Scenario: 點擊卡片本體跳轉詳情頁 → ✅ — router.push(`/practices/${practice.id}/check-ins/${id}`)（CheckInShowcaseCard.tsx:113）

## Requirement: 打卡詳情頁快速回應（Reactions）→ ⚠️
證據: apps/product/src/constants/reaction-type.ts:27-60 REACTION_CONFIG 每種 reaction 含 emoji + label + placeholder；check-in-detail.tsx 使用 upsertReaction/removeReaction
- Scenario: 點擊反應後留言框聚焦 → ✅ — comment-section.tsx:524-548 偵測 newlyAdded reaction → 將 REACTION_CONFIG[r].placeholder 文字加入 input → requestAnimationFrame 內 el.focus()+scrollIntoView
- Scenario: 每用戶只能選一種反應 → ⚠️ — check-in-detail.tsx:338-345 有 upsert/remove 行為，但 spec 描述「選 A 後選 B 取消 A」單選 upsert；前端 selectedReactions 為陣列（comment-section 支援多選累加 placeholder），與「每用戶只能選一種」描述不一致
- Scenario: 再次點擊同一反應取消 → ✅ — check-in-detail.tsx:338 `removeReaction({targetType:'checkin', targetId})`
- Scenario: 反應計數彙總顯示 → ⚠️ — reaction-picker-button.tsx:24,174 summary 模式呈「X 與其他 N 人」（i18n others_with_count），但 spec 範例文字「🙌 Anna 與其他 4 人加油了」的動詞尾（加油了）與實作泛用模板略異
- Scenario: API 使用 targetType: 'checkin' → ✅ — check-in-detail.tsx 多處 `targetType: "checkin"`（:170,224,338,341 等）

⚠️ 重大命名落差：spec 表列 4 種反應（Support🙌/Insightful💡/Relate🤝/Curious🔍），實作為 6 種且 emoji/key 不同（encourage🥰/touched💓/fire🔥/useful👍🏻/sameHere😳/curious🧐，reaction-type.ts:7-60）。機制符合但反應種類、emoji、英文標籤與 spec 表格不一致。

## Requirement: 打卡詳情頁留言系統（Comments）→ ✅
證據: comment-section.tsx 使用 MentionInput（features-mention），CommentBubble 以 isReply 控制層級
- Scenario: 留言層級限制（二層）→ ✅ — comment-section.tsx:408 `{!isReply && onReply && ...}`，僅非 reply 層顯示回覆，回覆層不再提供 onReply，限制為二層
- Scenario: @ 標記自動帶出用戶清單 → ✅ — MentionInput/useMentionInput + participants/mentionCandidates（comment-section.tsx:519-521 fallbackParticipants）帶出留言區用戶
- Scenario: 本人留言可編輯與刪除 → ✅ — comment-section.tsx:282-316 `isOwn` 顯示 comments_edit / comments_delete_confirm
- Scenario: 他人留言可回覆與 @ 標記 → ⚠️ — 非本人非 reply 顯示 onReply（:408）；@ 標記透過 MentionInput 全域可用，但無明確「他人留言操作選單含 @ 標記」獨立項，依賴輸入框 @ 機制
- Scenario: API 使用 targetType: 'checkin' → ✅ — comment-section createComment/updateComment 走 checkin target（check-in-detail.tsx:170,174 targetType checkin）

## Requirement: CheckInCard bottomActions prop 模式 → ✅
證據: apps/product/src/components/check-in/display/check-in-card.tsx:25 `bottomActions?: React.ReactNode`，:234 於卡片底部渲染 {bottomActions}，:88 依有無 bottomActions 調整 padding
- Scenario: bottomActions 解耦 → ✅ — 互動列由外部以 prop 注入，卡片本體不含硬編互動邏輯（check-in-card.tsx:45,234）

## 關鍵落差
1. 反應種類/emoji 與 spec 表格不符：spec 定義 4 種（Support🙌/Insightful💡/Relate🤝/Curious🔍），實作為 6 種不同 key/emoji（reaction-type.ts），且前端支援多選（selectedReactions 陣列）與「每用戶只能選一種」描述衝突。
2. 批次新頁增量語意未證實：loadMore 後 batch 仍為一次請求的「追加」行為無逐行證據，可能是隨 targetIds 變動重抓（功能可運作但與 spec「追加進 batch」措辭未完全對齊）。
3. 其餘核心機制（批次 reaction、互動列 stopPropagation、卡片跳轉、留言二層限制、@mention、本人編輯刪除、bottomActions 解耦、targetType:'checkin'）皆有明確程式碼實作，符合度高。
