## ADDED Requirements

### Requirement: 本期動態牆 feed

系統 SHALL 為每個期（Cohort）提供本期動態牆，其內容 MUST 為該 cohort 底下所有 practices 的 checkins 聚合 feed。本期動態牆 MUST 定位為打卡與回應的平權空間，MUST NOT 定位為單向公告欄。可見範圍 MUST 限定為本期，MUST NOT 混入其他期或公共靈感牆的內容。

#### Scenario: 聚合本期所有練習的打卡

- **WHEN** 使用者開啟某 cohort 的本期動態牆
- **THEN** 系統 SHALL 回傳該 cohort 底下所有 `cohort_id` 綁定之 practices 的 checkins，依時間排序組成 feed

#### Scenario: 不含其他期內容

- **WHEN** 系統組本期動態牆的 feed
- **THEN** 系統 SHALL 只納入該 cohort 綁定 practices 的 checkins，MUST NOT 納入其他 cohort 或未綁定任何 cohort 的 checkins

#### Scenario: 練習解除期綁定後退出動態牆

- **WHEN** 一則 practice 的 `cohort_id` 被清除（解除本期綁定）
- **THEN** 系統 SHALL 使該 practice 的 checkins 不再出現在本期動態牆

### Requirement: 教練視角動態牆

教練（本期 `role=owner` 的組織成員）在燈塔（`/lighthouse`）內 SHALL 能檢視本期全部學員的打卡動態。教練 MUST 能對任一則打卡快速回應與留言。教練在動態牆中 MUST 與學員平權，其身分不改變回應機制，只擴大可見範圍為全期。

#### Scenario: 教練檢視全期打卡

- **WHEN** 一位本期教練在 `/lighthouse` 內開啟該期動態牆
- **THEN** 系統 SHALL 顯示本期所有學員（含教練自身）的打卡動態

#### Scenario: 教練快速回應打卡

- **WHEN** 教練對一則本期打卡送出快速回應
- **THEN** 系統 SHALL 複用既有快速回應機制建立該回應，並歸屬於教練的 user_id

#### Scenario: 教練留言

- **WHEN** 教練對一則本期打卡送出留言
- **THEN** 系統 SHALL 複用既有留言機制建立該留言，並歸屬於教練的 user_id

### Requirement: 學員視角動態牆

學員在 product app 內 SHALL 能檢視同期所有學員（含教練）的打卡動態，可見範圍限定為本期。學員 MUST 能對任一則本期打卡回應與留言，使用與既有靈感牆相同的機制。

#### Scenario: 學員檢視同期打卡

- **WHEN** 一位本期學員在 product app 內開啟本期動態牆
- **THEN** 系統 SHALL 顯示本期所有學員（含教練）的打卡動態，且範圍限定為本期

#### Scenario: 學員回應與留言

- **WHEN** 學員對一則本期打卡送出回應或留言
- **THEN** 系統 SHALL 複用既有快速回應/留言機制建立紀錄，並歸屬於該學員的 user_id

#### Scenario: 非本期成員無法檢視本期動態牆

- **WHEN** 一位非本期 enrollment 的使用者嘗試存取該期動態牆
- **THEN** 系統 SHALL 拒絕請求，因其不在本期可見範圍內

### Requirement: AI 鼓勵草稿一鍵回應

系統 SHALL 提供教練對本期打卡以 AI 產生鼓勵文字草稿的能力，複用 server 既有 `checkin-encouragements` 機制。教練點「AI 草稿」後系統 MUST 產出鼓勵文字並置於可編輯狀態，MUST NOT 未經教練確認即送出。教練 SHALL 能在編輯後送出，送出的回應歸屬於教練本人。

#### Scenario: 教練產出 AI 鼓勵草稿

- **WHEN** 教練對一則本期打卡點「AI 草稿」
- **THEN** 系統 SHALL 經 `checkin-encouragements` 機制產出鼓勵文字，並以可編輯草稿呈現給教練

#### Scenario: 草稿需教練確認才送出

- **WHEN** 系統產出 AI 鼓勵草稿
- **THEN** 系統 SHALL NOT 自動送出該草稿，MUST 等待教練確認送出的動作

#### Scenario: 教練編輯後送出

- **WHEN** 教練修改 AI 鼓勵草稿內容後送出
- **THEN** 系統 SHALL 以編輯後的內容建立回應，並歸屬於教練的 user_id

### Requirement: 本期內容預設不公開

本期動態牆的打卡內容 SHALL 預設不進入公共靈感牆，可見範圍限定為本期。學員 MUST 能自選將其打卡內容公開至公共靈感牆。

#### Scenario: 本期打卡預設僅本期可見

- **WHEN** 學員在本期練習中完成一則打卡而未主動設定公開
- **THEN** 系統 SHALL 使該打卡僅於本期動態牆可見，MUST NOT 進入公共靈感牆

#### Scenario: 學員自選公開

- **WHEN** 學員將一則本期打卡設定為公開
- **THEN** 系統 SHALL 允許該打卡進入公共靈感牆
