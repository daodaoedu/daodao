## ADDED Requirements

### Requirement: 個人島 Realtime 預設關閉且僅限島主與 Connections
個人島系統 SHALL 將既有使用者的 realtime 設定預設為關閉；島主啟用後，MVP 僅允許島主本人與有效 connection 加入。一般登入訪客與匿名訪客 MUST NOT 取得個人島 realtime session，但仍可依 island 內容隱私規則進行非同步瀏覽。共同挑戰與活動 SHALL 使用 `shared-spatial-spaces` 的成員權限要求，不套用此個人島 connection 限制。

#### Scenario: 尚未啟用 Realtime
- **WHEN** 島主沒有設定資料或 realtime_enabled 為 false
- **THEN** 所有觀看者 SHALL 以非同步模式探索，且 server MUST NOT 簽發 room ticket

#### Scenario: Connection 加入已啟用島嶼
- **WHEN** 島主已啟用 realtime，且已連結使用者申請加入
- **THEN** server SHALL 簽發只適用該島與該使用者的短效 session ticket

#### Scenario: 一般或匿名訪客申請加入
- **WHEN** 非 connection 或匿名訪客申請 realtime session
- **THEN** server SHALL 拒絕申請，且不得透露 room 內成員或狀態

### Requirement: Room Ticket 短效、專用且不得出現在 WebSocket URL
系統 SHALL 使用與登入憑證分離的簽章 key 簽發最長 60 秒的 room ticket。Ticket MUST 綁定 issuer、audience、purpose、使用者、島嶼 room、session、唯一 jti、role、capabilities、map version 與 key id；MUST NOT 放在 WebSocket URL。Realtime service MUST 驗證完整 claims 並拒絕 expired、wrong audience、wrong purpose、wrong room、未知 key 或已使用 jti。

#### Scenario: 合法 Ticket 驗證
- **WHEN** client 在 ticket 到期前以第一個 auth frame 送出與 path room 相符的 ticket
- **THEN** realtime service SHALL 驗證成功、消耗 jti，並只授予 ticket 內的 capabilities

#### Scenario: Ticket 重放
- **WHEN** 第二個連線再次使用已消耗的 jti
- **THEN** realtime service SHALL 拒絕該連線，且不得傳送 room snapshot

#### Scenario: Ticket 不出現在 URL
- **WHEN** client 建立 WebSocket 連線
- **THEN** WebSocket URL SHALL 只包含非敏感 room routing 資訊，ticket MUST 透過 auth frame 傳送

### Requirement: 驗證完成前不得加入 Presence
Realtime service SHALL 要求 WebSocket 開啟後 5 秒內收到合法 auth frame；驗證完成前 MUST NOT 將該 socket 計入 room、廣播 join 或傳送 snapshot。驗證逾時或失敗時 SHALL 以可分類錯誤關閉連線。

#### Scenario: 未驗證連線逾時
- **WHEN** WebSocket 開啟後 5 秒內沒有收到合法 auth frame
- **THEN** realtime service SHALL 關閉連線，其他玩家不會收到 joined 事件

#### Scenario: 驗證後取得 Snapshot
- **WHEN** 合法 auth 完成
- **THEN** client SHALL 收到自己的 canonical player 與該 room 已驗證玩家 snapshot，其他玩家 SHALL 收到一次 joined 事件

### Requirement: Presence 僅在同一座島同步
系統 SHALL 只在相同 island room 內同步已驗證玩家的顯示名稱、avatar、合法位置、方向、idle/move 與 availability。不同 room MUST NOT 收到彼此的 snapshot、move、wave 或 leave 事件，Worker MUST NOT 接收 practice、checkin、人物誌或 connection 清單。

#### Scenario: 同島玩家互相可見
- **WHEN** 兩位已驗證使用者加入同一 room
- **THEN** 雙方 SHALL 在 snapshot 或 joined 事件中看見對方，並可收到後續合法移動

#### Scenario: 不同島 Room 隔離
- **WHEN** 兩位使用者分別加入不同 island room
- **THEN** 任一方的 presence、移動與 wave MUST NOT 傳到另一 room

### Requirement: 移動事件必須驗證且可收斂
Client SHALL 以 versioned protocol、monotonic sequence 與有限頻率送出位置狀態；realtime service MUST 驗證 schema、finite coordinates、sequence、frame/rate limit、速度、map bounds 與靜態可行走區。無效事件 MUST NOT 廣播，重複違規 SHALL 關閉連線。Remote client SHALL 以最後合法 canonical state 插值，且 avatar 彼此 SHALL NOT 阻擋。

#### Scenario: 合法移動同步
- **WHEN** 已驗證 client 在限制內送出下一個合法 sequence 與位置
- **THEN** service SHALL 更新 canonical state 並向同 room 其他玩家廣播

#### Scenario: Client 嘗試 Teleport
- **WHEN** client 送出超過允許速度、地圖邊界或靜態 collision 的位置
- **THEN** service SHALL 拒絕事件、保留最後合法位置並記錄不含 ticket 或私密資料的拒絕原因

#### Scenario: 非有限數字或過期 Sequence
- **WHEN** client 送出 NaN、Infinity 或不大於最後接受值的 sequence
- **THEN** service SHALL 拒絕事件，且其他玩家不得看到該位置

### Requirement: Wave 與 Emoji 不得承載任意文字
已驗證玩家 SHALL 能送出 allowlist 中的 wave／emoji；realtime service MUST 拒絕任意文字、未知 emoji、超頻事件或超過 frame limit 的 payload。Wave SHALL 在短暫顯示後自動消失，且不得形成永久訊息歷史。

#### Scenario: 合法 Wave
- **WHEN** 玩家在頻率限制內送出 allowlist wave
- **THEN** 同 room 玩家 SHALL 看見帶有效期限的 wave，期限後自動移除

#### Scenario: 嘗試夾帶文字
- **WHEN** 玩家在 wave payload 加入任意文字或未知欄位
- **THEN** realtime service SHALL 拒絕事件，且不得廣播或保存該內容

### Requirement: 同一使用者在同 Room 僅保留一個 Presence
系統 SHALL 以使用者識別碼在單一 room 去重 presence。當同一使用者以新 session 完成驗證時，最新 session SHALL 取代舊 session；舊連線 SHALL 收到 superseded 結果並關閉，其他玩家仍只看見一個 avatar。

#### Scenario: 同帳號開啟第二個分頁
- **WHEN** 同一使用者在同一 room 的新連線完成驗證
- **THEN** 新 session SHALL 成為 canonical connection，舊 session 被關閉，room 內不得出現重複 avatar

### Requirement: Room 上限與滿房降級
每座島的 realtime beta room SHALL 最多接受 20 個已驗證 presence。達上限後的新連線 SHALL 收到 room-full 結果並關閉，但使用者 MUST 仍能以非同步模式探索島嶼內容；系統 MUST NOT 靜默分流到看不見原房玩家的另一 instance。

#### Scenario: 第二十一位使用者加入
- **WHEN** room 已有 20 個已驗證 presence，另一位合法使用者嘗試加入
- **THEN** realtime service SHALL 拒絕 realtime join、顯示滿房降級，且 island 內容仍可瀏覽

### Requirement: 島主可管理 Realtime Room
島主 SHALL 能關閉 realtime 或 kick 指定 presence；realtime service MUST 以已驗證 session role 判斷權限，不得信任 client payload 宣稱的 owner 身分。一般 connection MUST NOT kick、close room 或修改島主設定。

#### Scenario: 島主 Kick 訪客
- **WHEN** 已驗證島主 kick room 內一位 connection
- **THEN** 目標 SHALL 收到 kicked 結果並斷線，其他玩家 SHALL 收到該使用者離開事件

#### Scenario: 一般成員嘗試 Kick
- **WHEN** connection 送出 kick 或 close-room 指令
- **THEN** realtime service SHALL 拒絕指令，目標連線與 room 狀態維持不變

#### Scenario: 島主關閉 Realtime
- **WHEN** 島主關閉 realtime
- **THEN** server SHALL 停止簽發新 ticket，既有 room SHALL 通知所有 presence 後關閉，非同步島嶼內容仍可瀏覽

### Requirement: Connection 撤銷須在有限時間內移除 Room 權限
系統 SHALL 對持續中的 realtime session 至少每 60 秒重新驗證 room ticket；connection 被解除或 realtime 被關閉後，server MUST 立即拒絕新 ticket，既有非 owner session MUST 在 75 秒內完成 reauth 或被 realtime service 關閉。

#### Scenario: Connection 被解除
- **WHEN** 使用者在 room 中時與島主解除 connection
- **THEN** 新 ticket SHALL 立即被拒絕，且該使用者的既有 realtime session MUST 在 75 秒內被關閉

#### Scenario: Reauth 成功
- **WHEN** connection 在期限內取得並送出新的合法 room ticket
- **THEN** realtime service SHALL 延續同一 canonical presence，不重複廣播 joined

### Requirement: Realtime 斷線不得阻塞島嶼內容
Client SHALL 區分 island content 與 realtime connection 狀態。非主動斷線後 SHALL 使用有上限的 exponential backoff 重連並重新取得 snapshot；重試期間與最終失敗後，使用者 MUST 仍能移動、使用 DOM 導覽及開啟已授權內容。

#### Scenario: 暫時網路中斷後恢復
- **WHEN** WebSocket 非主動中斷且網路在重試上限內恢復
- **THEN** client SHALL 重新取得 session、完成 auth 與 snapshot，移除重複或已離線玩家

#### Scenario: Realtime 長時間不可用
- **WHEN** 重連達到上限仍失敗
- **THEN** UI SHALL 清楚顯示離線模式、停止無限重試，且非同步探索功能維持可用

### Requirement: Presence 與移動不得成為長期軌跡資料
系統 MUST NOT 將 presence、逐步位置或 wave 寫入 PostgreSQL 或產品分析事件。Realtime service MAY 保存 ticket replay 防護與連線恢復所需的最小短期狀態；operational logs MUST 排除 ticket、登入 JWT、private islandData 與可重建精確長期軌跡的資料。

#### Scenario: 玩家離開 Room
- **WHEN** 玩家連線正常關閉或被移除
- **THEN** room SHALL 廣播 leave 並清除 active presence，不建立永久位置歷史

#### Scenario: 記錄 Movement 拒絕
- **WHEN** realtime service 拒絕不合法移動
- **THEN** telemetry MAY 記錄 room 雜湊、錯誤分類與計數，但 MUST NOT 記錄 ticket、私人內容或完整精確路徑
