## ADDED Requirements

### Requirement: 公開唯讀看板瀏覽
Roadmap 看板 SHALL 放在 product app 的公開免登入唯讀路由（`/roadmap`），任何人（含未登入、未註冊者）SHALL 能瀏覽公開項目。對外資源 SHALL 以 `external_id`（UUID）暴露，不得暴露序號主鍵。

#### Scenario: 未登入瀏覽
- **WHEN** 未登入使用者開啟 `/roadmap`
- **THEN** 系統 SHALL 回傳完整看板內容（非登入牆、非空白頁）

#### Scenario: 狀態分頁過濾
- **WHEN** 使用者切換分頁
- **THEN** 系統 SHALL 過濾：「排程中」=`planned`+`in_progress`、「討論中」=`discussing`、「已完成」=`done`、「全部」=所有 `is_public=true` 項目

#### Scenario: 排序規則
- **WHEN** 回傳看板項目列表
- **THEN** 系統 SHALL 依 `pinned DESC, support_count DESC, updated_at DESC` 排序

#### Scenario: 非公開項目不顯示
- **WHEN** 項目 `is_public=false`（如 `parked` 或內部項目）
- **THEN** 系統 SHALL 不在公開看板回傳該項目

### Requirement: 登入時顯示投票狀態
公開查詢端點 SHALL 採 `optionalAuth`；當請求帶有效登入時，每個項目 SHALL 標示當前使用者是否已投票（`voted`）。

#### Scenario: 登入回傳 voted
- **WHEN** 已登入使用者請求看板
- **THEN** 系統 SHALL 為每個項目回傳 `voted`（true/false）
- **WHEN** 未登入請求
- **THEN** `voted` SHALL 一律為 false

### Requirement: Hero 統計
看板 SHALL 顯示兩個動態統計：參與夥伴數（曾許願或投票的去重使用者數）與累積回饋數（許願總則數）。

#### Scenario: 統計口徑與快取
- **WHEN** 請求 `GET /api/v1/roadmap/stats`
- **THEN** 系統 SHALL 回傳 `{ partners, feedback }`，以「N+」呈現，且 SHALL 由 Redis 快取（1 小時），不要求即時精確

### Requirement: SEO 與分享 meta
公開路由 SHALL 輸出靜態 meta，利於爬蟲索引與社群分享預覽。

#### Scenario: 輸出 meta
- **WHEN** 爬蟲或社群預覽抓取 `/roadmap`
- **THEN** 系統 SHALL 透過 Next.js metadata 輸出標題、描述與 OG image

### Requirement: 訪客引導不空白
凡需登入才有資料的區塊（如「我的許願」「我支持的項目」），未登入時 SHALL 顯示引導內容，不得空白或僅顯示「請登入」。

#### Scenario: 需登入區塊未登入
- **WHEN** 未登入使用者進入需登入才有資料的區塊
- **THEN** 系統 SHALL 顯示價值說明 + 範例示意 + 註冊 CTA
