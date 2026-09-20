## ADDED Requirements

### Requirement: 儀表板量流動不量壓力

系統 SHALL 提供燈塔儀表板，指標設計 MUST 以「量流動」為原則，MUST NOT 呈現任何量壓力的指標。系統 MUST NOT 提供排行榜、缺勤排名、連續天數、學習時長、個人 engagement 分數或個人級進度表。MVP 階段儀表板 SHALL 僅提供單期視角。

#### Scenario: 儀表板呈現流動類指標

- **WHEN** 一位教練開啟其所轄期的儀表板
- **THEN** 系統 SHALL 呈現流動類聚合指標，MUST NOT 呈現排行榜、缺勤排名、連續天數、學習時長、個人 engagement 分數或個人級進度表

#### Scenario: MVP 僅單期視角

- **WHEN** 一位教練於 MVP 階段檢視儀表板
- **THEN** 系統 SHALL 僅提供單一期的視角，MUST NOT 提供跨期彙整視角

### Requirement: 節律熱度圖

系統 SHALL 在儀表板呈現節律熱度圖，顯示全期打卡的時間分佈。熱度圖 MUST 為聚合呈現，MUST NOT 以個人身分作為主軸拆解。

#### Scenario: 呈現全期打卡分佈

- **WHEN** 一位教練檢視節律熱度圖
- **THEN** 系統 SHALL 以聚合方式呈現該期全期打卡的時間分佈

### Requirement: 標籤分佈

系統 SHALL 在儀表板呈現本期打卡的標籤分佈聚合。

#### Scenario: 呈現標籤分佈

- **WHEN** 一位教練檢視標籤分佈
- **THEN** 系統 SHALL 回傳本期打卡各標籤的聚合計數

### Requirement: 共同卡點聚合

系統 SHALL 在儀表板呈現本期學員的共同卡點聚合，協助教練辨識普遍性困難。此聚合 MUST 以群體層級呈現。

#### Scenario: 呈現共同卡點

- **WHEN** 一位教練檢視共同卡點
- **THEN** 系統 SHALL 以群體層級聚合方式呈現本期共同卡點

### Requirement: enrolled → activated 漏斗

系統 SHALL 在儀表板呈現本期由 enrolled 到 activated 的漏斗。漏斗 MUST 以計數呈現各階段人數。

#### Scenario: 呈現 enrolled 到 activated 漏斗

- **WHEN** 一位教練檢視漏斗
- **THEN** 系統 SHALL 呈現 enrolled 與 activated 兩階段的計數

### Requirement: 時段節律

系統 SHALL 在儀表板呈現 24 格的時段節律計數，讓教練辨識學員活躍時段以便在對的時機回應。時段節律 MUST 為聚合計數，MUST NOT 用於個人監控。

#### Scenario: 呈現 24 格時段節律

- **WHEN** 一位教練檢視時段節律
- **THEN** 系統 SHALL 以 24 格呈現各時段的聚合打卡計數

#### Scenario: 教練依時段節律挑選回應時機

- **WHEN** 一位教練依時段節律辨識出學員活躍時段
- **THEN** 系統 SHALL 支援教練據此選擇回應時機，該資料 MUST NOT 作為個人監控用途

### Requirement: 今日焦點——需要鼓勵分頁

系統 SHALL 在今日焦點提供「需要鼓勵」分頁，列出流動中斷的學員，附最後一則打卡預覽，並提供「送個鼓勵」按鈕。該動作 MUST 為「送個鼓勵」，MUST NOT 表述為「發提醒」。

#### Scenario: 列出流動中斷者並提供送個鼓勵

- **WHEN** 一位教練開啟「需要鼓勵」分頁
- **THEN** 系統 SHALL 列出流動中斷的學員，顯示最後一則打卡預覽，並提供「送個鼓勵」按鈕

#### Scenario: 動作語意為鼓勵而非提醒

- **WHEN** 一位教練對某學員觸發該分頁的正向動作
- **THEN** 系統 SHALL 以「送個鼓勵」語意呈現，MUST NOT 以「發提醒」語意呈現

### Requirement: 今日焦點——值得慶祝分頁

系統 SHALL 在今日焦點提供「值得慶祝」分頁，呈現正向時刻，包含卡關後回歸、首卡、滿月等。

#### Scenario: 呈現正向時刻

- **WHEN** 一位教練開啟「值得慶祝」分頁
- **THEN** 系統 SHALL 呈現卡關後回歸、首卡、滿月等正向時刻

### Requirement: 聚合快照資料模型

系統 SHALL 以 `cohort_stat_snapshots` 表儲存聚合快照，欄位包含 `cohort_id`、`period_start`、`kind`（`weekly` 或 `final`）、`metrics`（JSONB）、`computed_at`。`metrics` 的最小形狀 MUST 包含 `enrolled`、`activated`、`checkins`、`active_members`、`top_tags`、`exited`、`hour_histogram`。快照內容 MUST 全為計數與聚合，MUST NOT 含任何個人識別資訊。

#### Scenario: 建立聚合快照列

- **WHEN** 系統為某期計算並寫入一份聚合快照
- **THEN** 系統 SHALL 在 `cohort_stat_snapshots` 建立一列，含 `cohort_id`、`period_start`、`kind`、`metrics`（JSONB）與 `computed_at`

#### Scenario: metrics 具備最小形狀

- **WHEN** 系統寫入快照的 `metrics`
- **THEN** 系統 SHALL 至少包含 `enrolled`、`activated`、`checkins`、`active_members`、`top_tags`、`exited`、`hour_histogram`

#### Scenario: 快照不含個人識別

- **WHEN** 系統序列化快照 `metrics`
- **THEN** 系統 SHALL 僅含計數與聚合資料，MUST NOT 含任何個人識別資訊

### Requirement: 快照排程計算

系統 SHALL 以 BullMQ 排程 weekly job 定期產生 `kind='weekly'` 快照，並在期結束時產生 `kind='final'` 快照。

#### Scenario: weekly 排程產生週快照

- **WHEN** BullMQ weekly job 觸發
- **THEN** 系統 SHALL 為進行中的期計算並寫入 `kind='weekly'` 的快照

#### Scenario: 期結束產生 final 快照

- **WHEN** 一個期結束
- **THEN** 系統 SHALL 計算並寫入該期 `kind='final'` 的快照

### Requirement: 首次存取觸發即時計算

系統 SHALL 在儀表板指標尚無對應快照而被首次存取時，觸發即時計算並將結果寫入快照。

#### Scenario: 無快照時首次存取即時計算並寫入

- **WHEN** 一位教練首次存取某尚無對應快照的指標
- **THEN** 系統 SHALL 即時計算該指標並將結果寫入 `cohort_stat_snapshots`

### Requirement: 儀表板明確不做項目

系統 MUST NOT 提供排行榜、缺勤排名、連續天數、學習時長、個人 engagement 分數，以及個人級進度表。此約束 MUST 貫穿儀表板、今日焦點與聚合快照所有面向。

#### Scenario: 拒絕產生排行榜或個人分數

- **WHEN** 任何儀表板或快照計算過程中出現產生排行榜、缺勤排名、連續天數、學習時長、個人 engagement 分數或個人級進度表的需求
- **THEN** 系統 SHALL NOT 產生上述任何一項
