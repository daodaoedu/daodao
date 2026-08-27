# challenge-witnessing

## ADDED Requirements

### Requirement: 全公開的見證動態
挑戰內所有參與者的打卡紀錄 SHALL 對所有人（含未登入）公開可讀。

#### Scenario: 外部觀察者瀏覽
- **WHEN** 未參加挑戰的使用者（或未登入訪客）開啟挑戰頁
- **THEN** 可閱讀所有參與者的打卡紀錄

### Requirement: 僅參與者可留言
挑戰打卡的留言 SHALL 僅限挑戰參與者；非參與者與未登入者 SHALL NOT 可留言。後端 SHALL 以參與記錄為準做校驗，前端隱藏不得作為唯一防線。

#### Scenario: 參與者留言
- **WHEN** 挑戰參與者對挑戰內任一打卡留言
- **THEN** 留言成功

#### Scenario: 非參與者嘗試留言
- **WHEN** 非參與者對挑戰內打卡呼叫留言 API
- **THEN** API 以權限不足拒絕
