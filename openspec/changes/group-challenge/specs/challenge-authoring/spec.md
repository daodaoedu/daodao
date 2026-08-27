# challenge-authoring

## ADDED Requirements

### Requirement: 僅管理者可建立共同挑戰
共同挑戰的實踐 SHALL 僅能由平台管理者建立。前台實踐建立流程 SHALL 僅對管理者顯示「共同挑戰」選項；一般使用者 SHALL 看不到此選項。建立後 SHALL NOT 直接出現在探索共同挑戰頁。

#### Scenario: 管理者於前台建立
- **WHEN** 具管理者身分的使用者於前台建立實踐並勾選「共同挑戰」
- **THEN** 建立成功，該實踐出現在 admin 後台的挑戰管理清單，但不出現在探索共同挑戰頁

#### Scenario: 一般使用者看不到選項
- **WHEN** 一般使用者進入實踐建立流程
- **THEN** 介面不顯示「共同挑戰」選項，API 亦拒絕一般使用者以挑戰型態建立

### Requirement: admin 後台以 lighthouse 模式管理挑戰
admin 後台 SHALL 提供共同挑戰管理，模式比照 lighthouse：可設定主題（program），並在主題底下設期（cohort），為每一期指定使用模板與開始日。挑戰項目 SHALL 支援複製、刪除、修改（修改自動帶入現行編輯頁樣式）。

#### Scenario: 設定主題與期
- **WHEN** 管理者在 admin 後台建立挑戰主題，並在底下新增一期、指定模板與開始日
- **THEN** 該期以草稿狀態存在，尚未公開

### Requirement: 發佈至探索共同挑戰頁
管理者為期指定模板與開始日後，SHALL 可將其發佈；發佈後 SHALL 出現在探索共同挑戰頁。

#### Scenario: 發佈
- **WHEN** 管理者對已完成設定的期執行發佈
- **THEN** 探索共同挑戰頁出現該挑戰

### Requirement: 無發起人與位階
共同挑戰 SHALL NOT 有「發起人」欄位、「主揪」或「隊長」概念。所有參與者位階平等，僅以加入時間排序，SHALL NOT 對先加入者做顯目呈現。

#### Scenario: 參與者列表
- **WHEN** 任何人查看挑戰的參與者
- **THEN** 參與者僅以加入時間排序，無任何角色標記或突出樣式
