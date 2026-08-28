# challenge-authoring

## ADDED Requirements

### Requirement: 僅管理者可建立共同挑戰
共同挑戰 SHALL 僅能由平台管理者建立。建立入口 SHALL 位於 admin 後台（daodao-admin-ui），API SHALL 以 Admin／SuperAdmin 角色（requireAdmin）把關；前台實踐建立流程 SHALL NOT 提供「共同挑戰」選項（2026-08-28 決策：靈感卡與挑戰管理集中於 admin-ui，取代 FRD FR-CC-01 的前台建立描述）。建立後 SHALL NOT 直接出現在探索共同挑戰頁。

#### Scenario: 管理者於 admin 後台建立
- **WHEN** 具管理者身分的使用者於 admin 後台建立挑戰主題與期
- **THEN** 建立成功，該期以草稿狀態存在於挑戰管理清單，不出現在探索共同挑戰頁

#### Scenario: 非管理者呼叫管理 API
- **WHEN** 非 Admin／SuperAdmin 角色的使用者呼叫 `/api/v1/admin/challenges/*`
- **THEN** API 回應 403

### Requirement: admin 後台以 lighthouse 模式管理挑戰
admin 後台 SHALL 提供共同挑戰管理，模式比照 lighthouse：可設定主題（program），並在主題底下設期（cohort），為每一期指定使用模板與開始日。挑戰項目 SHALL 支援複製、刪除（封存）、修改。一期 SHALL 只綁定一個模板；模板有持續天數時，期的結束日 SHALL 由開始日 + 持續天數 − 1 推算，使加入時複製的實踐期間與挑戰一致。已有人加入的期 SHALL NOT 更改期間或模板；純改名稱／名額／截止日 SHALL NOT 改動日期。

#### Scenario: 已有人加入後修改
- **WHEN** 管理者對已有參與者的期修改開始日或模板
- **THEN** API 回應 409；修改名稱或名額則成功且日期不變

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
