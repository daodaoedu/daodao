## ADDED Requirements

### Requirement: 成果報告

系統 SHALL 為教練提供本期成果報告，僅呈現正向指標（如完成練習人數、持續參與比例等）。成果報告 MUST 受「量流動不量壓力」原則約束，MUST NOT 呈現缺勤、排名、連續天數或任何個人級壓力指標。資料來源 MUST 為 `cohort_stat_snapshots` 的 final 快照。

#### Scenario: 教練檢視成果報告

- **WHEN** 一位本期教練開啟該期成果報告
- **THEN** 系統 SHALL 呈現完成練習人數、持續參與比例等正向指標，資料取自該 cohort 的 `cohort_stat_snapshots` final 快照

#### Scenario: 成果報告不呈現壓力指標

- **WHEN** 系統產生成果報告
- **THEN** 系統 SHALL NOT 呈現缺勤、排名、連續天數或個人 engagement 分數等壓力指標

#### Scenario: final 快照尚未產生

- **WHEN** 期尚未結束、`cohort_stat_snapshots` 尚無 final 快照
- **THEN** 系統 SHALL 不呈現完整成果報告，MAY 提示成果將於期滿後產生

### Requirement: 成果頁批次匯出

系統 SHALL 提供教練將本期成果批次匯出的能力，供離開系統作為招生素材之用。因匯出物離開系統，其可見標準 MUST 高於站內可見。匯出 MUST 採逐學員 opt-in，系統 MUST 只匯出已同意學員的內容。匯出內容 MUST 限於學員暱稱、打卡摘要與心得節錄，MUST NOT 包含 email 等個資。

#### Scenario: 只匯出已同意學員

- **WHEN** 教練對本期執行成果批次匯出
- **THEN** 系統 SHALL 只納入已 opt-in 同意匯出的學員內容，MUST NOT 納入未同意者

#### Scenario: 匯出內容不含個資

- **WHEN** 系統產生匯出物
- **THEN** 系統 SHALL 只包含學員暱稱、打卡摘要與心得節錄，MUST NOT 包含 email 或其他個資

#### Scenario: 無學員同意時的匯出

- **WHEN** 教練執行匯出但本期無任何學員 opt-in
- **THEN** 系統 SHALL 不產出任何學員內容，MAY 提示尚無可匯出的同意對象

#### Scenario: 匯出動作留審計

- **WHEN** 教練執行成果批次匯出
- **THEN** 系統 SHALL 記錄一筆匯出審計事件，含執行者、cohort 與匯出範圍

### Requirement: 回饋問卷

系統 SHALL 於期結束時自動發送本期回饋問卷，複用既有問卷系統。問卷 MUST 包含「打卡被看見的感受」題，作為「僅自己」緩議的規模化資料來源。

#### Scenario: 期結束自動發送問卷

- **WHEN** 一個 cohort 到達結束時點
- **THEN** 系統 SHALL 透過既有問卷系統自動向本期學員發送回饋問卷

#### Scenario: 問卷必含「打卡被看見的感受」題

- **WHEN** 系統組建本期回饋問卷
- **THEN** 系統 SHALL 包含「打卡被看見的感受」題項

#### Scenario: 複用既有問卷系統

- **WHEN** 系統建立與收集回饋問卷
- **THEN** 系統 SHALL 使用既有問卷系統，MUST NOT 另建平行問卷機制
