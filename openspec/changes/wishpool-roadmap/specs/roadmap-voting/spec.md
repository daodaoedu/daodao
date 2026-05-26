## ADDED Requirements

### Requirement: 投票與取消
登入使用者 SHALL 能對公開路線圖項目投票（支持）並可取消。投票端點 SHALL 採 `authenticate`。

#### Scenario: 投票
- **WHEN** 登入使用者對某項目 `POST .../supports`
- **THEN** 系統 SHALL 建立 `origin='vote'` 的 support 記錄，回傳 `{ support_count, voted: true }`

#### Scenario: 取消投票
- **WHEN** 已投票使用者 `DELETE .../supports`
- **THEN** 系統 SHALL 刪除該 support，回傳 `{ support_count, voted: false }`

#### Scenario: 重複投票冪等
- **WHEN** 已投票使用者再次投同一項目
- **THEN** 系統 SHALL 冪等處理，不建立重複記錄、不重複計數

#### Scenario: 未登入投票引導與還原
- **WHEN** 未登入使用者點投票
- **THEN** 系統 SHALL 回傳 401，前端 SHALL 引導登入並帶 `intent=vote:<externalId>`，登入返回後 SHALL 自動補完該票

### Requirement: 票數去重與一致性
系統 SHALL 以 DB UNIQUE(`roadmap_item_id`, `user_id`) 保證一人一項目一票，`support_count` SHALL 反映去重支持者數。

#### Scenario: 一人一票
- **WHEN** 同一使用者對同一項目的 support 記錄已存在
- **THEN** DB UNIQUE 約束 SHALL 阻擋第二筆

#### Scenario: 計數一致
- **WHEN** 投票或取消發生
- **THEN** 系統 SHALL 於同一 transaction 內對 `support_count` 進行 +1/-1，不漂移

#### Scenario: 歸併不重複計數
- **WHEN** 後台將某許願歸入項目，而該許願者先前已投過票
- **THEN** UNIQUE 衝突 SHALL 使該 `wish_link` 略過，`support_count` 不重複增加
