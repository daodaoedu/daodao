## ADDED Requirements

### Requirement: 顯示「我也想實踐」CTA 按鈕（詳情頁）
非實踐擁有者在瀏覽他人實踐詳情頁時，SHALL 在 PracticeOverviewCard **外部**（卡片下方、獨立全寬）看到「我也想實踐」按鈕。

#### Scenario: 非擁有者瀏覽詳情頁
- **WHEN** 使用者瀏覽他人的實踐詳情頁（`/practices/:id`）
- **THEN** 在 PracticeOverviewCard 下方顯示全寬「我也想實踐」按鈕（outline 樣式，含複製 icon）

#### Scenario: 擁有者瀏覽自己的詳情頁
- **WHEN** 使用者瀏覽自己的實踐詳情頁
- **THEN** 不顯示「我也想實踐」按鈕

#### Scenario: 未登入使用者點擊按鈕
- **WHEN** 未登入使用者點擊「我也想實踐」
- **THEN** 導向登入頁或顯示登入提示

---

### Requirement: 顯示「我也想實踐」CTA 按鈕（列表卡片）
在探索/Feed 列表中，SHALL 在每張實踐卡片（CommunityChallengeCard、ExploreTopicCard）上顯示「我也想實踐」按鈕。

#### Scenario: 探索頁列表卡片
- **WHEN** 使用者在探索頁或 Feed 看到他人的實踐卡片
- **THEN** 卡片上顯示「我也想實踐」按鈕，無需進入詳情頁即可點擊

#### Scenario: 卡片上的按鈕點擊
- **WHEN** 使用者點擊列表卡片上的「我也想實踐」
- **THEN** 觸發複製實踐流程（與詳情頁相同邏輯）

---

### Requirement: 複製實踐 API
系統 SHALL 提供 `POST /api/v1/practices/:id/copy` endpoint，讓已登入使用者複製指定實踐到自己帳號。

#### Scenario: 成功複製公開實踐
- **WHEN** 已登入使用者呼叫 `POST /api/v1/practices/:id/copy`，目標實踐 `privacy_status = "public"`
- **THEN** 回傳 201，body 包含新實踐的 `id`（external_id）與 `title`

#### Scenario: 複製欄位規則
- **WHEN** 複製成功
- **THEN** 新實踐帶入 title、practice_action、duration_days、session_duration_minutes、frequency_min/max_days、practice_time_periods、other_context、has_resources、theme_color、template_id；source_practice_id 設為來源實踐的 id；status 設為 `"not_started"`、progress_percentage 設為 `INITIAL_PROGRESS`（20，與一般建立實踐一致）、start_date 設為今日、end_date 設為 today + duration_days - 1、user_id 設為當前使用者；不複製打卡、留言、心得（reflection）

> 設計依據：產品規格 `/docs/product/copy/複製.md` 明訂「進度仍需在複製後顯示 20%」、「開始日為複製日當天」，並要求「複製後可正常編輯、刪除」。為與一般建立實踐（`practice.service.ts:create`）一致，採用相同的 `INITIAL_PROGRESS` 常數與 `status: 'not_started'`。

#### Scenario: 複製非公開實踐
- **WHEN** 目標實踐 `privacy_status != "public"`
- **THEN** 回傳 403

#### Scenario: 複製不存在的實踐
- **WHEN** 指定 id 不存在或已軟刪除
- **THEN** 回傳 404

#### Scenario: 未登入呼叫 copy API
- **WHEN** 未帶認證 token 呼叫 copy endpoint
- **THEN** 回傳 401

---

### Requirement: 複製成功慶祝畫面
複製 API 成功後，系統 SHALL 顯示慶祝畫面，提供正向反饋並引導使用者下一步行動。

#### Scenario: 複製成功後跳轉
- **WHEN** copy API 回傳 201
- **THEN** 前端導向慶祝頁面，顯示「已複製到你的清單！」標題、Confetti 動畫、Lottie 吉祥物動畫，以及新實踐的 title、開始日期、tags

#### Scenario: 慶祝頁「馬上開始」
- **WHEN** 使用者點擊「馬上開始」
- **THEN** 導向新實踐的詳情頁（`/practices/:newId`）並觸發開始流程

#### Scenario: 慶祝頁「編輯內容」
- **WHEN** 使用者點擊「編輯內容」
- **THEN** 導向新實踐的編輯頁（`/practices/:newId/edit`）

---

### Requirement: Template 預覽樣式調整
`/dev/template-preview` 頁面 SHALL 按照設計稿更新視覺樣式，與複製成功畫面保持一致的設計語言。

#### Scenario: Template 預覽頁載入
- **WHEN** 使用者造訪 `/dev/template-preview`
- **THEN** 頁面依更新後樣式呈現，無版面破版或元件溢出
