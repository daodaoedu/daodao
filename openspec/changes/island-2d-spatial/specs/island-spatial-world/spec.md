## ADDED Requirements

### Requirement: 既有島嶼路由提供可回滾的 2D 空間世界
系統 SHALL 於既有 `/island/[identifier]` 路由提供 2D top-down 空間小島，且 SHALL 以島主識別碼穩定決定 rollout renderer，使同一座島的島主與所有訪客在同一 rollout 設定下看見相同 renderer。系統 MUST 保留 3D renderer 作為觀察期 rollback，切換 renderer SHALL NOT 改變 URL、分享連結或要求資料 migration rollback。

#### Scenario: 同一島穩定使用相同 renderer
- **WHEN** 島主與不同訪客在相同 rollout 設定下開啟同一個 `/island/[identifier]`
- **THEN** 系統為所有觀看者選擇相同的 2D 或 3D renderer

#### Scenario: 緊急切回 3D
- **WHEN** 營運端將 2D rollout 關閉
- **THEN** 既有 island URL SHALL 重新載入 3D renderer，且既有 islandData 與公開分享連結仍可使用

### Requirement: 2D 地圖與資料配置具版本且可重現
系統 SHALL 以島主穩定 seed、人格、已授權 islandData、地圖模板與 map version 產生固定大小的 2D 地圖。相同輸入與相同 map version MUST 產生相同的 spawn、實踐物件、植栽、人物誌與 portal 配置；會改變配置結果的演算法或模板異動 MUST 更新 map version。

#### Scenario: 不同觀看者看到相同配置
- **WHEN** 島主與有相同內容權限的訪客載入同一座島及相同 map version
- **THEN** 兩者看見相同的地形、spawn 與互動物件位置

#### Scenario: 地圖演算法發生 breaking change
- **WHEN** 新版 placement algorithm 會改變既有物件位置
- **THEN** 系統 SHALL 使用新的 map version，且舊版 renderer 不得把新版配置誤判為舊版

### Requirement: 桌機與手機皆可移動及互動
系統 SHALL 支援桌機 WASD／方向鍵移動、點地尋路及 `E`／Enter 互動；行動裝置 SHALL 以 tap-to-walk 提供等價探索與互動，虛擬搖杆 MAY 作為額外輸入但 MUST NOT 是唯一輸入。角色 SHALL 遵守靜態 collision grid，且 spawn MUST 位於可行走格。

#### Scenario: 桌機鍵盤探索
- **WHEN** 使用者以鍵盤進入 2D 小島並按 WASD 或方向鍵
- **THEN** 角色在可行走範圍內移動，且走近互動物件後可按 `E` 或 Enter 執行主要動作

#### Scenario: 手機點地移動
- **WHEN** 使用者在行動裝置點選一個可到達的地圖位置
- **THEN** 系統 SHALL 尋找可行走路徑並移動角色，不要求使用者操作虛擬搖杆

#### Scenario: 不可行走的目的地
- **WHEN** 使用者點選 collision grid 外或無路徑可達的位置
- **THEN** 角色 SHALL 保持在最後合法位置，且介面不得卡死或把角色放進阻擋物

#### Scenario: 預設出生點被占用
- **WHEN** runtime 物件占用首選 spawn 周邊
- **THEN** 系統 SHALL 從安全 spawn 清單選擇下一個可行走格；若清單皆不可用則使用固定安全 fallback

### Requirement: 實踐映射為可互動營地
系統 SHALL 將島主可見的 `active` 實踐映射為帳篷與燃燒營火，將 `completed` 實踐映射為小屋，並 SHALL NOT 渲染 `draft`、`not_started`、`archived` 或觀看者無權查看的實踐。走近、點擊或從 DOM 導覽選擇營地 SHALL 開啟同一份 React 詳情介面。

#### Scenario: 顯示進行中與已完成實踐
- **WHEN** islandData 含一個 active 與一個 completed 實踐
- **THEN** 2D 地圖 SHALL 分別顯示可互動的帳篷營火與小屋，並保留實踐主題色識別

#### Scenario: 開啟實踐詳情
- **WHEN** 使用者走近後互動、點擊營地或從 DOM 地點清單選擇同一實踐
- **THEN** 系統 SHALL 開啟相同的實踐詳情，包含標題、進度與最近打卡

### Requirement: 打卡映射維持無壓力成長語意
系統 SHALL 以打卡識別碼 deterministic 決定植栽或生態裝飾，並以近 30 天打卡量增加環境熱鬧度。系統 MUST NOT 因未連續打卡、停止打卡或時間經過而讓既有物件枯萎、消失、變灰或顯示倒數警告。當打卡數超過 rendering budget 時，系統 SHALL 聚合視覺但 MUST 保留正確總數與成長語意。

#### Scenario: 相同打卡產生相同裝飾
- **WHEN** 同一座島以相同 map version 重複載入相同 checkin ids
- **THEN** 植栽種類與配置 SHALL 保持一致

#### Scenario: 長時間未打卡
- **WHEN** 島主一段時間沒有新增打卡
- **THEN** 既有營地、植栽與生態 SHALL 維持，不呈現懲罰或羞恥視覺

#### Scenario: 打卡數超過 sprite 預算
- **WHEN** 某實踐的打卡數超過單一營地可渲染的裝飾上限
- **THEN** 系統 SHALL 使用聚合植栽或數量提示呈現完整累積，不無上限建立 sprite

### Requirement: 人格主題與空島狀態
系統 SHALL 依島主人格選擇 avatar、色盤與環境主題；未完成人格測驗時 SHALL 使用中性主題。島上沒有任何可渲染實踐時 SHALL 顯示熄滅營火的空島狀態；只有島主本人可看見建立第一個實踐的 CTA。

#### Scenario: 未完成人格測驗
- **WHEN** 島主的 personaType 為空
- **THEN** 系統 SHALL 顯示中性主題，並向島主提供人格探索入口

#### Scenario: 島主看見空島 CTA
- **WHEN** 島主本人進入沒有 active 或 completed 實踐的島
- **THEN** 系統 SHALL 顯示空島、熄滅營火及建立第一個實踐的 CTA

#### Scenario: 訪客瀏覽空島
- **WHEN** 訪客進入對其沒有任何可見實踐的島
- **THEN** 系統 SHALL 顯示空島，但 MUST NOT 顯示島主專用的建立 CTA

### Requirement: 島嶼內容隱私由 Server 端執行
系統 SHALL 在建立 island bootstrap 前，以 `privacy_status` 與 `visibility` deny-first 過濾實踐。島主可取得自己的全部可渲染實踐；connection 僅可取得 public 與其有權查看的 connections-only 實踐；一般或匿名訪客僅可取得 public 實踐。未授權資料 MUST NOT 出現在 Canvas、DOM 導覽、analytics payload 或 realtime service。

#### Scenario: 一般訪客看不到非公開實踐
- **WHEN** 非 connection 訪客載入含 private 或 connections-only 實踐的島
- **THEN** bootstrap、2D 地圖與 DOM 地點清單 SHALL 不含這些實踐

#### Scenario: Connection 解除後重新載入
- **WHEN** 使用者與島主解除 connection 後重新載入該島
- **THEN** 新 bootstrap SHALL 立即移除 connections-only 實踐，不等待前端快取過期

### Requirement: 碼頭 Portal 可前往有權瀏覽的目的島
系統 SHALL 將已授權的目的島映射為碼頭 portal。使用者啟動 portal 時 SHALL 清楚顯示目的島並導航至其既有 island URL；導航失敗時 SHALL 保留可恢復狀態，且不得讓舊島與新島同時維持 realtime session。

#### Scenario: 從碼頭換島
- **WHEN** 使用者確認前往一座可瀏覽的目的島
- **THEN** 系統 SHALL 離開目前 realtime room，再導航至目的島的 `/island/[identifier]`

#### Scenario: 目的島載入失敗
- **WHEN** 目的島 bootstrap 無法載入
- **THEN** 系統 SHALL 顯示可重試錯誤並提供回到原島或個人頁的動作

### Requirement: Canvas 具有等價 DOM 導覽與 reduced-motion 模式
系統 MUST 提供不依賴 Canvas 的 DOM 地點清單，涵蓋所有可見實踐、人物誌、碼頭與可用社交動作。Canvas 取得鍵盤 focus 時 SHALL 說明操作方式，Esc SHALL 可離開 Canvas；系統 SHALL 支援 `prefers-reduced-motion`，且互動狀態 MUST NOT 只以顏色表示。

#### Scenario: 只使用鍵盤開啟內容
- **WHEN** 使用者不操作 Canvas、只透過鍵盤導覽 DOM 地點清單
- **THEN** 使用者 SHALL 能開啟所有其有權查看的核心內容與動作，且不遭遇 keyboard trap

#### Scenario: 偏好減少動態效果
- **WHEN** 使用者啟用 `prefers-reduced-motion`
- **THEN** 系統 SHALL 關閉非必要 camera easing、粒子與環境動畫，但保留移動、定位和內容操作

#### Scenario: 重要空間狀態更新
- **WHEN** 使用者靠近互動物件、realtime 斷線或 room 狀態改變
- **THEN** 系統 SHALL 透過適量的可讀狀態訊息通知輔助科技，且 MUST NOT 逐 frame 播報位置

### Requirement: 2D 世界具效能預算與失敗降級
2D engine SHALL 以 dynamic import 載入並 SHALL NOT 進入非 island route 的主要 bundle。目標裝置上 p75 可操作時間 SHALL 為桌機小於 2.5 秒、中階手機小於 4 秒；穩態目標 SHALL 為桌機 60fps、中階手機至少 30fps。系統 SHALL 在低效能時降低非必要動畫；renderer 或 realtime 初始化失敗 MUST NOT 阻止使用者透過 DOM 瀏覽已授權內容。

#### Scenario: 低效能裝置自動降級
- **WHEN** 執行期 FPS 持續低於品質門檻
- **THEN** 系統 SHALL 降低粒子、環境動畫與遠端 avatar 動畫品質，且核心移動和內容互動仍可用

#### Scenario: 2D renderer 初始化失敗
- **WHEN** Canvas renderer、asset 或 map 初始化失敗
- **THEN** 系統 SHALL 顯示錯誤與重試，並保留 DOM 地點清單及返回個人頁的路徑，不得白屏
