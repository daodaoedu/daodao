# cohort-practice-linking

## Purpose

場次設定面板「連結實踐模版」區段：從組織模板庫搜尋並勾選要在此場次使用的實踐模版，為每個模版設定獨立開始日並依模版天數推算結束日（FRD #171 FR-PT-01～02、TP-PT-01～05）。資料基礎為既有的 `cohort_templates`（含 `start_date`）與 `practice_templates.duration_days`。

## ADDED Requirements

### Requirement: 模版搜尋與選取
區段 SHALL 顯示標題「連結實踐模版」、說明「從模板庫挑選這個場次要使用的實踐」與計數「已連結 N 個」；搜尋框 focus 或點擊展開按鈕 SHALL 展開下拉面板，以 checkbox 列出組織模板庫全部模版（來源 `GET /api/v1/lighthouse/organizations/{organizationId}/templates`），輸入關鍵字 SHALL 即時以模版名稱模糊過濾，無符合時顯示「找不到符合的模版」。勾選／取消勾選 SHALL 分別呼叫既有 `PUT`／`DELETE /organizations/{organizationId}/templates/{templateId}/cohorts/{cohortId}`。（FR-PT-01）

#### Scenario: 勾選模版
- **WHEN** 帶領人在下拉面板勾選「每日書寫 21 天」
- **THEN** 呼叫 `PUT .../templates/{templateId}/cohorts/{cohortId}`（不帶 `startDate`），已連結列表新增卡片，計數 +1（TP-PT-02）

#### Scenario: 取消勾選
- **WHEN** 取消勾選已連結模版
- **THEN** 呼叫 `DELETE`，卡片移除，計數 −1

#### Scenario: 模糊搜尋無結果
- **WHEN** 輸入不存在的關鍵字
- **THEN** 面板顯示「找不到符合的模版」（TP-PT-05）

#### Scenario: 模板庫為空
- **WHEN** 組織尚無任何模版
- **THEN** 面板顯示「找不到符合的模版」並提供前往模板庫的連結

### Requirement: 已連結實踐的獨立開始日與推算結束日
每個已連結模版 SHALL 以卡片列呈現：模版名稱、「開始日」date input、自動計算的「結束日 YYYY/MM/DD」、移除按鈕。開始日預設為綁定的 `startDate`（null 時顯示場次 `startDate` 作為預設值提示）；變更開始日 SHALL 呼叫 `PUT .../templates/{templateId}/cohorts/{cohortId}` 帶 `startDate`。結束日 SHALL 為「開始日 + `durationDays` − 1」（含頭尾，與加入時產生草稿的計算一致）；模版無 `durationDays` 時顯示「未設定天數」。無已連結模版時顯示「尚未連結任何實踐」。（FR-PT-02）

#### Scenario: 調整開始日
- **WHEN** 模版 `durationDays=21`，帶領人把開始日改為 2026-10-05
- **THEN** 結束日即時顯示「2026/10/25」，並送出 `PUT` 帶 `startDate: '2026-10-05'`（TP-PT-03）

#### Scenario: 開始日獨立於場次
- **WHEN** 場次 startDate 為 2026-10-01，模版 A 開始日設為 2026-10-08、模版 B 未設定
- **THEN** 加入的學員取得草稿 A 開始日 2026-10-08、草稿 B 開始日 2026-10-01

#### Scenario: 移除
- **WHEN** 點擊卡片 ✕
- **THEN** 呼叫 `DELETE` 解除綁定，計數更新（TP-PT-04）

### Requirement: 建立階段的模版選擇
新建場次時，「連結實踐模版」區段在建立前為 disabled；建立成功後帶領人 SHALL 可立即在該區段綁定模版。「尚未綁定模板」badge SHALL 在場次無有效綁定時顯示於場次列。

#### Scenario: 建立後尚未綁定
- **WHEN** 場次剛建立且未綁定任何模版
- **THEN** 場次列顯示「尚未綁定模板」badge，區段顯示「尚未連結任何實踐」
