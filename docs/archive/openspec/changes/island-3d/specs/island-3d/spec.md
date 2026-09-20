# island-3d Spec

## ADDED Requirements

### Requirement: 3D 島嶼頁可進入與走動
系統 SHALL 提供全螢幕路由 `/island/[identifier]` 渲染該使用者的 3D 島嶼；訪客與島主 SHALL 能以第三人稱角色在島上走動——桌機以 WASD/方向鍵移動、滑鼠拖曳視角、滾輪縮放；行動裝置以虛擬搖杆移動、單指拖曳視角、雙指縮放。

#### Scenario: 桌機進島走動
- **WHEN** 登入使用者在桌機瀏覽器開啟 `/island/[identifier]` 且 WebGL 可用
- **THEN** 播放可跳過的環島空拍 intro 後，使用者可用 WASD 操控角色在島上走動、滑鼠調整視角

#### Scenario: 手機進島走動
- **WHEN** 使用者在行動裝置開啟島嶼頁
- **THEN** 畫面左下顯示虛擬搖杆，可移動角色；單指拖曳旋轉視角、雙指縮放

#### Scenario: 操控角色為登入者的人格分身
- **WHEN** 已完成 quiz 的登入使用者進入任何島嶼頁
- **THEN** 操控角色使用其 quiz 人格對應的分身造型；未登入訪客則使用通用旅人造型

### Requirement: 實踐映射為島上營地建築
系統 SHALL 將島主的實踐渲染為島上建築：`active` 實踐為帳篷＋燃燒中營火、`completed` 實踐為小木屋；`draft`、`not_started`、`archived` 不渲染。建築配色 SHALL 對應實踐的 `theme_color`。使用者走近或點擊建築 SHALL 開啟該實踐的詳情面板（含最近打卡）。

#### Scenario: 進行中實踐顯示為帳篷營火
- **WHEN** 島主有一個 `active` 且訪客可見的實踐
- **THEN** 島上渲染一頂帳篷與燃燒中營火，配色取自該實踐 `theme_color`

#### Scenario: 完成實踐顯示為小木屋
- **WHEN** 島主有一個 `completed` 且訪客可見的實踐
- **THEN** 島上渲染一座小木屋

#### Scenario: 點擊建築看詳情
- **WHEN** 使用者點擊（或走近後按互動鍵）某實踐建築
- **THEN** 開啟 React 詳情面板，顯示實踐標題、進度與最近打卡

### Requirement: 打卡映射為植栽與生態
系統 SHALL 為每筆打卡在對應實踐建築周圍渲染一株植物，植物種類與位置以 checkin id 為種子 deterministic 決定；近 30 天全島打卡總量 SHALL 決定生態熱鬧度（小動物/氛圍粒子數量）。系統 SHALL NOT 渲染任何連續天數、斷卡衰敗或倒數計時視覺。

#### Scenario: 打卡長出植物
- **WHEN** 某實踐有 12 筆打卡
- **THEN** 該實踐建築周圍渲染 12 株植物，且同一使用者每次載入位置與種類一致

#### Scenario: 無壓力型視覺
- **WHEN** 島主連續多日未打卡
- **THEN** 島上既有植栽與建築不產生枯萎、變灰或警示視覺

### Requirement: 人格決定地形主題且生成恆定
系統 SHALL 依島主的 quiz 人格（五型）套用對應地形主題（島形、配色盤、環境物件組合），並以島主 `user_id` 為亂數種子 deterministic 生成——同一島主的島在任何裝置、任何觀看者眼中 SHALL 一致。未完成 quiz 的島主 SHALL 得到中性預設島與 quiz 導流入口。

#### Scenario: 地形恆定
- **WHEN** 島主與任一訪客分別載入同一島嶼頁
- **THEN** 兩者看到的地形、建築與植栽配置完全一致

#### Scenario: 未做 quiz 的島
- **WHEN** 島主未完成 quiz
- **THEN** 渲染中性預設地形，島上顯示「探索你的島嶼性格」入口導向 quiz

### Requirement: 訪客隱私過濾於伺服器端
系統 SHALL 在伺服器端組裝 islandData 時過濾實踐可見性：訪客僅收到 `visibility=public` 的實踐；`connections_only` 實踐僅在觀看者與島主為連結關係時包含；島主本人收到全部。私有實踐資料 SHALL NOT 出現在訪客收到的任何 payload 中。

#### Scenario: 訪客看不到私有實踐
- **WHEN** 島主有一個 `visibility=private` 的實踐，非連結關係的訪客載入其島嶼頁
- **THEN** 回應 payload 不含該實踐，島上亦無對應建築

#### Scenario: 連結者看到 connections_only 實踐
- **WHEN** 與島主具連結關係的使用者載入其島嶼頁
- **THEN** payload 包含 `connections_only` 實踐並渲染對應建築

### Requirement: 空島狀態
島主沒有任何可渲染實踐時，系統 SHALL 渲染空島狀態：一頂帳篷＋熄滅營火；島主本人視角 SHALL 顯示「開始第一個實踐，點燃營火」CTA 導向建立實踐。

#### Scenario: 新用戶空島
- **WHEN** 無任何 active/completed 實踐的島主進入自己的島
- **THEN** 島上僅有帳篷與熄滅營火，並顯示建立實踐 CTA

#### Scenario: 訪客看空島
- **WHEN** 訪客進入空島
- **THEN** 顯示空島場景但不顯示建立實踐 CTA

### Requirement: 效能預算與自動降級
島嶼頁 SHALL 以 dynamic import 載入（three.js 不進主站 bundle）；GLB 資產總量 SHALL 壓縮（Draco＋WebP）控制在約 3MB；系統 SHALL 於執行期採樣 fps，偵測低效能裝置時自動降低品質（陰影、pixel ratio）。目標：桌機 60fps、中階手機 30fps、可開始走動 < 5 秒。

#### Scenario: 低效能自動降級
- **WHEN** 進場後 fps 採樣持續低於門檻
- **THEN** 引擎自動切換低品質模式且不中斷走動

### Requirement: WebGL 不可用時優雅降級
WebGL 初始化失敗或不受支援時，系統 SHALL 顯示 2D fallback（島嶼插畫＋返回個人頁連結），SHALL NOT 白屏或阻斷其他功能。

#### Scenario: WebGL 失敗降級
- **WHEN** 瀏覽器不支援 WebGL 或 context 建立失敗
- **THEN** 顯示 2D fallback 頁面，包含返回 `/users/[identifier]` 的連結
