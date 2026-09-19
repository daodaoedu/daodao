## ADDED Requirements

### Requirement: 個人島、共同挑戰與活動共用空間互動核心
系統 SHALL 使用同一 2D 移動、碰撞、互動與 DOM 導覽核心呈現個人島、共同挑戰與活動。
場景内容 SHALL 由已授權 bootstrap 決定，不得在 renderer 內假設所有物件或權限屬於個人島主。

#### Scenario: 共同挑戰呈現當期任務
- **WHEN** 參與者進入共同挑戰空間
- **THEN** 系統 SHALL 提供有權查看的當期任務、共同目標與挑戰資訊入口，並可透過 Canvas 或 DOM 開啟同一內容

#### Scenario: 活動呈現議程與集合點
- **WHEN** 參與者進入活動空間
- **THEN** 系統 SHALL 提供有權查看的活動資訊、議程與集合點，不要求改走個人島的實踐營地流程

### Requirement: 共享空間依具體業務 Scope 隔離
系統 MUST 使用 server 解析的 scope 與識別碼決定 room。個人島 SHALL 使用 island scope，
特定共同挑戰或活動場次 SHALL 使用 cohort scope，邀請制活動空間 SHALL 使用 space scope。
Ticket MUST 綁定 scope、canonical room key 與使用者；不同 scope 或場次不得接收彼此 presence。

#### Scenario: 同一課程的不同場次
- **WHEN** 兩位參與者分別進入相同 program 下不同 cohort 的空間
- **THEN** 系統 SHALL 使用不同 room，且雙方不會收到對方 snapshot、move 或 wave

#### Scenario: 虛擬挑戰總覽不是全站房間
- **WHEN** 使用者從共同挑戰總覽進入某個挑戰
- **THEN** 系統 SHALL 解析到具體挑戰 cohort，不以總覽 URL 建立全站共用 room

#### Scenario: 跨 Scope 使用 Ticket
- **WHEN** client 將 cohort ticket 用於 space 或 island room
- **THEN** realtime service SHALL 拒絕驗證且不傳送 snapshot

### Requirement: 共享空間使用既有成員與主持權限
Server MUST 以對應 cohort enrollment／管理權限或 space membership 判定存取與主持 capabilities。
個人島的 connection 條件 SHALL NOT 套用到具備資格的共享空間成員。公開資訊可見性與 realtime
加入資格 MUST 分開判斷；前端情境選擇與 client role MUST NOT 取得權限。

#### Scenario: 非好友的已報名成員
- **WHEN** 已有效加入挑戰的使用者不是發起人的 connection，且該空間 realtime 已啟用
- **THEN** 系統 SHALL 依挑戰會員資格判定進場，不因未建立私人 connection 而拒絕

#### Scenario: 一般參與者宣稱自己是主持人
- **WHEN** 一般成員在 client frame 宣稱 host 並要求 kick 或 close
- **THEN** 系統 SHALL 依已驗證 capabilities 拒絕該操作

#### Scenario: 共同挑戰沒有既有主持人角色
- **WHEN** 共同挑戰只有 member enrollment，且尚無明確 moderator 授權
- **THEN** 系統 MUST NOT 由 program organization owner 或 client 自報角色推定 host 能力；所有成員維持已驗證的 member capabilities

#### Scenario: 公開分享的匿名訪客
- **WHEN** 匿名使用者開啟活動公開資訊或 space 公開連結
- **THEN** 系統 SHALL 只提供授權公開內容，不因此授予 realtime membership

### Requirement: 共學內容維持成員資料隱私
系統 MUST 在 server 過濾共享空間的物件、任務與進度資料。參與同一活動不代表可讀取其他成員
所有私人實踐。Worker MUST NOT 接收實踐詳情、打卡內容或完整報名／成員清單。

#### Scenario: 成員有私人實踐
- **WHEN** 共學空間呈現共同目標與進度
- **THEN** 未授權的個別實踐標題、識別碼與打卡內容 SHALL 不出現在 bootstrap、DOM 或 Worker

### Requirement: 共享空間處理撤權、結束與滿房
系統 SHALL 在活動取消、空間封存或成員資格撤銷後立即拒絕新 room ticket，並在最長 75 秒內
終止不再有權的 session。正常結束後的內容閱讀依既有 domain lifecycle 決定。Beta SHALL
維持最多 20 個 realtime presence；滿房或連線失敗時 MUST 保留有權的非同步內容入口。

#### Scenario: 成員退出活動
- **WHEN** 在線成員退出 cohort 或被移除 space membership
- **THEN** 新 ticket SHALL 立即拒絕，既有 session 在 75 秒內失效

#### Scenario: 活動已結束但成果仍可讀
- **WHEN** 使用者回訪仍有閱讀權限的已結束活動
- **THEN** 系統 SHALL 顯示結束狀態並保留授權內容，不因 realtime 關閉刪除學習紀錄

#### Scenario: 超過 Beta 即時人數上限
- **WHEN** 第 21 位合法成員進入同一空間
- **THEN** 系統 SHALL 明示滿房並提供非同步瀏覽，不靜默建立另一個 instance

### Requirement: 共享空間入口與跨房切換有明確來源
系統 SHALL 從具體挑戰／活動／space 的現有內容入口導向對應空間。
切換來源時 SHALL 先結束舊 realtime session，取消舊 bootstrap 回應的套用，再進入新 room。

#### Scenario: 從個人島切換到活動
- **WHEN** 使用者選擇進入一個有權存取的活動空間
- **THEN** 系統 SHALL 清除舊島 presence 並載入正確活動 scope，不能同時保留兩個 room session
