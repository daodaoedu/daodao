# practice-copy-cta
- 涉及 repo: server / f2e
- 對應 archived change: challenge-cta-and-template-style（被刪除中）
- 總計: 5 條 requirement / 13 個 scenario | ✅10 ⚠️2 ❌1 ❓0

## Requirement: 顯示「我也想實踐」CTA 按鈕（詳情頁）→ ✅
證據: daodao-f2e:apps/product/src/components/practice/detail/practice-detail-shell.tsx:615 `{!isOwner && <Button variant="outline" ...><Copy/>{t("action_also_practice")}</Button>}`（i18n zh-TW.json:4596「我也想實踐」），位於 PracticeOverviewCard 下方。
- Scenario: 非擁有者瀏覽詳情頁 → ✅ — `!isOwner`，outline + Copy icon、全寬（w-full）。註：按鈕在卡片 `px-4` 容器內（緊貼卡片下方），spec 寫「卡片外部」屬位置微差
- Scenario: 擁有者瀏覽自己詳情頁 → ✅ — `!isOwner` 條件，擁有者不顯示
- Scenario: 未登入點擊 → ✅ — :622 `if (!currentUserId) router.push('/auth/login?redirect=...')`

## Requirement: 顯示「我也想實踐」CTA 按鈕（列表卡片）→ ⚠️
證據: daodao-f2e:apps/product/src/components/dashboard/explore-topics-section.tsx:88-93 ExploreTopicCard 有 `onCopyPractice` 按鈕。**但 CommunityChallengeCard 不存在**（全 repo grep 無此元件），spec 列的兩張卡片只實作其一。
- Scenario: 探索頁列表卡片 → ⚠️ — ExploreTopicCard 有，CommunityChallengeCard 無
- Scenario: 卡片上按鈕點擊 → ✅ — onCopyPractice(topic.practiceId) 觸發相同複製流程

## Requirement: 複製實踐 API → ✅
證據: daodao-server:src/routes/practice.routes.ts:1367 `router.post('/:id/copy', authenticate, ...)`；controller practice.controller.ts:762 copyPractice → :772 `res.status(201)`；service practice.service.ts:1638 copyPractice。
- Scenario: 成功複製公開實踐 → ⚠️ — 回 201 但 body 只含 `{ id: external_id }`（service:1722），**未含 spec 要求的 `title`**
- Scenario: 複製欄位規則 → ✅ — service:1674-1697 帶入 title/practice_action/duration_days/session_duration_minutes/frequency_min/max/practice_time_periods/other_context/has_resources/theme_color/template_id；source_practice_id=sourceId；status='not_started'；progress=INITIAL_PROGRESS(=20, utils/practice-progress.ts:45)；start_date=today；end_date=today+duration-1；user_id=當前。未複製 reflection/comment/checkin（符合）。註：另複製 tags+resources（spec 未禁止 resources）
- Scenario: 複製非公開實踐 → ✅ — service:1657 `visibility !== 'public'` → `throw ForbiddenError`（403）。註：欄位名為 `visibility` 非 spec 的 `privacy_status`
- Scenario: 複製不存在/軟刪除 → ✅ — service:1650 `!source || deleted_at !== null` → NotFoundError（404）
- Scenario: 未登入呼叫 → ✅ — route authenticate middleware + controller:765 UnauthorizedError（401）

## Requirement: 複製成功慶祝畫面 → ✅
證據: daodao-f2e:apps/product/src/app/[locale]/practices/copy-success/page.tsx — ConfettiAnimation(:46)、Lottie(:70)、title(:87)、startDate(:95)、tags(:102)、copy_success_title(:56)；detail-shell:628 複製後 `router.push('/practices/copy-success?practiceId=${id}')`。
- Scenario: 複製成功後跳轉 → ✅ — copy-success 頁含 Confetti+Lottie+title+date+tags
- Scenario: 慶祝頁「馬上開始」→ ✅ — :124 `router.replace('/practices/${practiceId}?from=copy')`
- Scenario: 慶祝頁「編輯內容」→ ✅ — :131 `router.replace('/practices/${practiceId}/edit')`（copy_success_edit）

## Requirement: Template 預覽樣式調整 → ❌
證據: 無。`git ls-tree origin/dev | grep template-preview` 零結果，`/dev/template-preview` 頁面在 f2e 不存在。
- Scenario: Template 預覽頁載入 → ❌ — 無此頁面
