# product-topic-recommendation
- 涉及 repo: f2e (apps/product dashboard + packages/api hooks) + ai-backend (recommendation router/service/schema)
- 對應 archived change: 2026-05-26-docs-product-recommend
- 總計: 6 條 requirement / 12 個 scenario | ✅3 ⚠️3 ❌0 ❓0
- 整體：功能實作完整度高。前端 recommendation-section.tsx / explore-topics-section.tsx + packages/api/recommendation-hooks.ts，後端 ai-backend recommendation router + dashboard_recommendation_service。

## Requirement: Dashboard SHALL display personalized topic recommendations → ✅
證據: f2e:apps/product/src/app/[locale]/(with-layout)/mine/page.tsx:197 渲染 <RecommendationSection>；recommendation-section.tsx:231 useTopicRecommendations({ limit: 3 }) 最多 3 張。
- Scenario: Render initial recommendation cards → ✅ — limit:3，登入後抓 topic_cards 顯示
- Scenario: Exclude completed fixed section from occupying slot → ✅ — mine/page.tsx 僅 import/render RecommendationSection，未 render CompletedSection（CompletedSection 元件存在於 dashboard/index.ts 但未在該頁使用）

## Requirement: Recommendation cards SHALL expose explainable card data → ⚠️
證據: ai-backend:src/schemas/dashboard_recommendation.py:24 TopicCardItem 含 targetId/title/description/creator/tags/matchReasonCode/matchReasonText/feedbackState/isAiGenerated；f2e:packages/api/src/services/recommendation-hooks.ts:25 ITopicCard 同欄位。
- Scenario: Return required recommendation card fields → ⚠️ — spec 要求 `recommendationId` 與 `targetType` 兩欄位，但實作 schema/interface 只有 `practiceId`/`targetId`，**缺 recommendationId 與 targetType**（其餘 8 欄位齊全）
- Scenario: Show explainable recommendation reason → ✅ — matchReasonCode(ongoing_practice/tag_match/professional_field/popular_content) + matchReasonText，dashboard_recommendation_service.py:224 _build_match_reason_text 映射理由文案

## Requirement: Recommendation service SHALL rank cards from supported user signals → ✅
證據: ai-backend:src/services/dashboard_recommendation_service.py:114 professional_field 訊號、:119 cold-start 分支、:127 reason 文案；service 依專業領域/標籤/進行中實踐/熱門內容排序。
- Scenario: Rank with active user context → ✅ — professional_field / ongoing_practice / tag_match 訊號參與排序
- Scenario: Serve recommendation under cold start → ✅ — dashboard_recommendation_service.py:119 明確 cold-start 分支回傳 popular_content 候選

## Requirement: Recommendation section SHALL support asynchronous loading and refill → ✅
證據: f2e:apps/product/src/components/dashboard/recommendation-section.tsx:231 useTopicRecommendations(SWR 非同步)、:227 isLoadingMore、:331 refill 載入更多、fetchTopicCards on-demand(recommendation-hooks.ts:83) 帶 exclude_ids。
- Scenario: Load recommendations without blocking main content → ✅ — 區塊獨立 SWR 載入，主內容不被阻塞（isLoading 僅控制本區塊 skeleton）
- Scenario: Refill card after hide feedback → ✅ — hide 後 :331 onLoadMore 用 fetchTopicCards 排除已顯示/已隱藏 id 補卡；:342 無更多時 toast 提示

## Requirement: Recommendation section SHALL provide a defined empty state → ✅
證據: f2e:apps/product/src/components/dashboard/recommendation-section.tsx:203 RecommendationEmptyState（圖示+empty_title+empty_description+empty_cta），explore-topics-section.tsx:237 同樣空狀態。
- Scenario: Show empty state when no recommendation available → ✅ — :367 isLoading 結束且無卡片時 render EmptyState（含 icon/title/desc/CTA）
- Scenario: Redirect from empty state CTA → ✅ — onGoToInspire prop（empty_cta 導向「靈感」分頁）

## Requirement: Recommendation interactions SHALL be measurable → ⚠️
證據: f2e:apps/product/src/components/dashboard/recommendation-section.tsx 透過 @daodao/analytics posthogCapture：:244 recommendation_section_viewed、:99 recommendation_card_clicked、:68 recommendation_feedback_liked、:55 recommendation_feedback_disliked。
- Scenario: Track recommendation engagement events → ✅ — 曝光(section_viewed)/點擊(card_clicked)/喜歡/不喜歡事件皆有 posthog 埋點
- Scenario: Track join conversion from recommendation → ⚠️ — 未見明確「從推薦卡進入加入主題流程」的 join/conversion 專屬事件（grep join/conversion 0 結果）；card_clicked 可能涵蓋導向但無歸因到 join 轉換的獨立事件
