# cohort-privacy

## Purpose

場次的四個隱私旗標（私密活動、參與者打卡預設私密、發起人留言預設私密、列在探索活動課程頁面）、其連動規則、`is_private` 對場次實踐隱私的強制效果，以及報名頁上的隱私說明（FRD #171 FR-PV-01～02、TP-PV-01～04）。

## ADDED Requirements

### Requirement: 四個隱私旗標
場次 SHALL 具備 `isPrivate`（預設 true）、`checkinDefaultPrivate`（預設 false）、`hostCommentDefaultPrivate`（預設 false）三個布林欄位；「列在探索活動課程頁面」SHALL 對應既有 `visibility`（`public`＝列出），不新增欄位。既有場次 migration 後 `isPrivate=true`、另兩者 false。面板「隱私」區段 SHALL 以四張 toggle 卡片呈現，開啟軌道 #16B9B3、關閉 #DDEFED，皆具備 aria-label。（FR-PV-01）

#### Scenario: 切換列在探索頁
- **WHEN** 開啟「列在探索活動課程頁面」並儲存
- **THEN** `PATCH` 帶 `visibility: 'public'`，場次出現在 `/activities`

#### Scenario: 公開列出但私密活動
- **WHEN** `visibility='public'` 且 `isPrivate=true`
- **THEN** 場次在探索頁可見，加入後的打卡僅場次內可見（兩旗標正交）

### Requirement: 私密活動關閉時的連動
`isPrivate=false` 時，server SHALL 把 `checkinDefaultPrivate` 與 `hostCommentDefaultPrivate` 正規化為 false（無論輸入為何），回應回傳正規化後的值；`isPrivate=true` 時兩者依輸入。前端 SHALL 在「私密活動」關閉時把兩個 toggle 設為關閉且 disabled，提示文字改為「公開活動無法將打卡或留言預設為私密」；重新開啟後恢復可操作。（FR-PV-02）

#### Scenario: 只送 isPrivate=false
- **WHEN** 既有場次 `checkinDefaultPrivate=true`，`PATCH { isPrivate: false }`
- **THEN** 回應 `isPrivate=false`、`checkinDefaultPrivate=false`、`hostCommentDefaultPrivate=false`

#### Scenario: 前端連動
- **WHEN** 關閉「私密活動」
- **THEN** 另外兩個 toggle 立即變為關閉、opacity 0.5、cursor not-allowed（TP-PV-02）；重新開啟後恢復（TP-PV-03）

### Requirement: 私密活動決定場次實踐的隱私
場次經模版產生的實踐（`creationSource='cohort_template'`）的 `privacyStatus` SHALL 由 `isPrivate` 決定：true → `private`、false → `public`。加入時依當下旗標寫入；`PATCH` 切換 `isPrivate` 時 SHALL 在同一交易內更新該場次所有仍屬於場次（`cohortId` 非 null）的上述實踐，回應附 `affectedPracticeCount`。學員對此類實踐 `PATCH /practices/{id}` 帶 `privacyStatus` SHALL 回 400（由場次統一設定）。場次動態牆（教練與同期學員）SHALL 不受 `privacyStatus` 影響，仍顯示全部打卡。

#### Scenario: 私密場次的打卡對外不可見
- **WHEN** `isPrivate=true`，學員加入並打卡
- **THEN** 該實踐 `privacyStatus='private'`，其打卡不出現在靈感牆與學員個人頁對他人的視圖，但出現在場次動態牆

#### Scenario: 切換為公開活動
- **WHEN** 場次有 12 位成員各 1 個模版實踐，帶領人關閉「私密活動」並確認
- **THEN** 12 個實踐 `privacyStatus` 變為 `public`，回應 `affectedPracticeCount=12`；退出者已轉個人的實踐不受影響

#### Scenario: 學員嘗試改隱私
- **WHEN** 學員對場次實踐 `PATCH { privacyStatus: 'public' }`
- **THEN** 回 400，訊息說明由場次統一設定

#### Scenario: 切換前確認
- **WHEN** 帶領人切換「私密活動」並點儲存
- **THEN** 前端先顯示確認對話框「將影響 N 個實踐的可見性」（N 由當前成員數推估），確認後才送出

### Requirement: 尚未強制的旗標需標示
`checkinDefaultPrivate` 與 `hostCommentDefaultPrivate` 在本能力範圍內 SHALL 只儲存、回傳與顯示，不改變任何打卡或留言的查詢行為；面板 SHALL 在這兩張卡片標示「設定將於打卡隱私功能上線後生效」。

#### Scenario: 開啟打卡預設私密
- **WHEN** 開啟「參與者打卡預設私密」並儲存
- **THEN** 值被儲存並回傳，卡片下方顯示上述標示，打卡行為不變

### Requirement: 報名頁隱私說明
`GET /api/v1/cohorts/join/{joinToken}` SHALL 回傳 `privacy: { isPrivate, checkinDefaultPrivate, hostCommentDefaultPrivate }`；報名頁 Step 1 的隱私說明 SHALL 依 `isPrivate` 顯示「你的打卡與留言僅場次內成員可見」或「你的打卡與留言將對所有人公開」，並保留既有「對教練與同期學員可見」的同意句。面板內的報名頁預覽 SHALL 即時反映隱私設定。（TP-PV-04）

#### Scenario: 公開活動的報名頁
- **WHEN** `isPrivate=false`
- **THEN** 報名頁隱私說明顯示公開文案，且「我已了解並同意」未勾選前報名按鈕 disabled
