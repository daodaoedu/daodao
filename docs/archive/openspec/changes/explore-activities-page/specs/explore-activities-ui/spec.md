# explore-activities-ui

> 探索活動課程頁（`/activities`）的前端行為。資料契約見 `activity-discovery`。每條 requirement 標註對應的 FRD #152 編號（FR-EX／TP-EX）。

## ADDED Requirements

### Requirement: 使用者視圖頁面結構
已登入使用者開啟 `/activities` 時，頁面 SHALL 渲染左側導覽列（`Sidebar`）且「空間」項目為高亮（`aria-current="page"`），頂部 `PageHeader` 左側「返回」與右側「關閉」皆導向 `/spaces`，置中標題「探索活動課程」；主內容最大寬度 760px 水平置中，由上而下為搜尋列、篩選列、區段標題、卡片區、底部 CTA。（FR-EX-01；TP-EX-01、02）

#### Scenario: 側欄高亮空間
- **WHEN** 登入者位於 `/activities`
- **THEN** 側欄「空間」為 `aria-current="page"`，其餘項目非高亮

#### Scenario: 返回與關閉
- **WHEN** 登入者點擊標頭「返回」或「關閉」
- **THEN** 導向 `/spaces`

### Requirement: 訪客視圖頁面結構
未登入訪客開啟 `/activities` 時，頁面 SHALL NOT 渲染左側導覽列；SHALL 渲染黏性頂部導覽列（`position: sticky; top: 0`，背景模糊），左側 logo＋「島島阿學」、右側「登入」連結＋「免費加入」實心按鈕，兩者皆導向 `/auth/login?redirect=/activities`；導覽列下方為白底置中標頭：H1「探索活動課程」＋副標「島民自己發起的活動與課程，來看看大家都在做什麼！」；主內容結構與使用者視圖相同。auth 狀態未就緒時 SHALL 顯示骨架，不得先閃訪客列再切換。（FR-EX-02；TP-EX-03、04、05）

#### Scenario: 訪客看到頂部導覽列
- **WHEN** 未登入訪客開啟 `/activities` 並向下捲動
- **THEN** 無側欄；頂部導覽列固定於頂部並顯示背景模糊；H1 與副標正確顯示

#### Scenario: 訪客點擊免費加入
- **WHEN** 訪客點擊「免費加入」或「登入」
- **THEN** 導向 `/auth/login?redirect=/activities`，登入後回到探索頁

### Requirement: 關鍵字搜尋
搜尋列 SHALL 為圓角膠囊輸入框，左側搜尋 icon，placeholder「搜尋活動名稱、介紹或發起人」；輸入即時（onChange）過濾，比對範圍為 `displayName`、`tagline`、`description`、`host.name`、`organizationName`、`location`，不區分大小寫；有輸入時右側 SHALL 顯示圓形清除按鈕，點擊清空並恢復當前篩選的完整結果；無輸入時不顯示清除按鈕。搜尋 SHALL 與狀態、費用篩選疊加。（FR-EX-03；TP-EX-06～09、15）

#### Scenario: 即時過濾
- **WHEN** 使用者輸入「阿哲」
- **THEN** 只顯示名稱、簡介、系列說明、發起人名稱、組織名或地點含「阿哲」的卡片，區段計數同步更新

#### Scenario: 不分大小寫
- **WHEN** 有活動名稱含「AI」，使用者輸入「ai」
- **THEN** 該活動出現在結果

#### Scenario: 清除搜尋
- **WHEN** 搜尋框有內容且使用者點擊清除按鈕
- **THEN** 搜尋框清空、清除按鈕消失，列表恢復為當前狀態＋費用篩選的完整結果

### Requirement: 狀態篩選
狀態篩選 SHALL 為水平排列的四個 pill：「全部」「開放報名」「進行中」「已結束」，單選互斥，預設「全部」；選中樣式為 `#16B9B3` 實心底＋白字，未選中為白底＋灰字＋`#DCEBEA` 邊框。邏輯：全部＝所有活動（含已結束）；開放報名＝`canJoin=true` 且 `runStatus≠'ended'`；進行中＝`runStatus='ongoing'`；已結束＝`runStatus='ended'`。「已結束」下若 `meta.endedTruncated=true`，列表底部 SHALL 顯示「僅顯示最近 24 筆」提示。（FR-EX-04；TP-EX-10～13）

#### Scenario: 預設全部
- **WHEN** 頁面載入完成
- **THEN** 「全部」為選中，列表含未結束與已結束活動，區段標題「活動與課程」

#### Scenario: 切到開放報名
- **WHEN** 使用者點擊「開放報名」
- **THEN** 只顯示 `canJoin=true` 且未結束的活動；暫停加入、額滿、報名截止者不顯示

#### Scenario: 切到已結束且被截斷
- **WHEN** 使用者點擊「已結束」且 `meta.endedTruncated=true`
- **THEN** 只顯示 `runStatus='ended'` 的活動，列表底部顯示「僅顯示最近 24 筆」

### Requirement: 費用篩選
費用篩選 SHALL 位於狀態篩選右側，以 1px×18px 灰色分隔線區隔，含「免費」「付費」兩個 pill，為 toggle（點擊選中、再點取消），互斥（選付費時免費取消）；「免費」只顯示 `feeType='free'`，「付費」只顯示 `feeType='paid'`；可與狀態篩選及搜尋疊加。（FR-EX-05；TP-EX-14、15）

#### Scenario: toggle 行為
- **WHEN** 使用者點擊「免費」再點擊一次
- **THEN** 第一次後只顯示免費活動，第二次後恢復無費用篩選

#### Scenario: 三者疊加
- **WHEN** 搜尋「阿哲」＋狀態「全部」＋費用「免費」
- **THEN** 只顯示發起人（或名稱／簡介／地點）含「阿哲」且免費的活動

### Requirement: 區段標題與計數
卡片區上方 SHALL 顯示區段標題，隨狀態篩選切換：全部→「活動與課程」、開放報名→「開放報名」、進行中→「進行中」、已結束→「已結束」；標題右側以淺灰小字顯示當前（搜尋＋狀態＋費用）過濾後的活動數。（FR-EX-06；TP-EX-16）

#### Scenario: 計數反映過濾結果
- **WHEN** 狀態「進行中」＋費用「付費」後剩 2 筆
- **THEN** 標題為「進行中」，右側顯示「2」

### Requirement: 卡片佈局與導向
卡片 SHALL 以兩欄 grid（`repeat(2, minmax(0,1fr))`，gap 16px）排列，窄螢幕降為單欄；每張卡片整體為 `<a>`：`isJoined=true` 導向 `/cohorts/{id}`，其餘導向 `/activities/{id}`；hover 時邊框變色、投影、向上位移 3px。卡片色帶顏色 SHALL 由 `id % 4` 對應 `blue/green/yellow/pink` 派生，同一活動每次載入顏色相同。（FR-EX-07、FR-EX-08 色帶；TP-EX-17、26、27）

#### Scenario: 點擊卡片
- **WHEN** 使用者點擊卡片非發起人名稱的區域
- **THEN** 導向該活動的詳情頁（或已加入時的學員頁）

#### Scenario: 色帶穩定
- **WHEN** id 為 5 的活動在兩次載入間
- **THEN** 兩次皆為 `green`（5 % 4 = 1）

### Requirement: 卡片資訊結構——未結束活動
每張未結束卡片由上而下 SHALL 包含：34px 色帶（右上角白底半透明膠囊「N 個主題實踐」，`N=templateCount`；`runStatus='ongoing'` 時左上角「進行中」badge）、場次名稱（16px/600）、簡介（`tagline`，最多 4 行截斷，最小高度 85px；`tagline` 為 null 時以 `description` 代替）、日期區間（日曆 icon＋`YYYY/MM/DD-YYYY/MM/DD`）、地點列（`interactionModes` 只含線上（sync／async）→ 地球 icon＋「線上」；只含 physical → 定位 icon＋`location`；混合 → 定位 icon＋「{location}・線上」；空陣列 → 隱藏此列）、底部分隔線下的發起人列（20px 圓形頭像＋名稱；`host.userId` 非空時名稱為 `role="button"` 可點）、費用 badge（`feeType='free'` → 灰底「免費」；`paid` → 淺綠底粗體「NT$X,XXX」千分位，`feeAmount` 為 null 時顯示「付費」）、右側圓形箭頭 icon。進行中活動的發起人列後方 SHALL 顯示「・N 位島民」（`participantCount`）。（FR-EX-08；TP-EX-18～21、24、25、28）

#### Scenario: 進行中的付費實體活動
- **WHEN** 活動 `runStatus='ongoing'`、`templateCount=3`、`interactionModes=['physical']`、`location='台中'`、`feeType='paid'`、`feeAmount=1800`、`participantCount=12`
- **THEN** 卡片顯示「進行中」badge、「3 個主題實踐」、定位 icon＋「台中」、發起人後「・12 位島民」、淺綠底粗體「NT$1,800」

#### Scenario: 混合互動方式
- **WHEN** `interactionModes=['physical','async']`、`location='台北'`
- **THEN** 地點列顯示定位 icon＋「台北・線上」

#### Scenario: 簡介截斷
- **WHEN** `tagline` 渲染後超過 4 行
- **THEN** 以省略號截斷於第 4 行，不溢出卡片

### Requirement: 卡片資訊結構——已結束活動
`runStatus='ended'` 的卡片結構與未結束相同，但 SHALL：色帶套用 `filter: saturate(0.3); opacity: 0.65`；色帶左上角顯示白底「已結束」膠囊；場次名稱文字 85% 不透明度、簡介 55% 不透明度、費用 badge 降低不透明度；發起人列後方顯示「・N 位島民參與過」；不顯示「進行中」badge。（FR-EX-09；TP-EX-22、23）

#### Scenario: 已結束卡片
- **WHEN** 活動 `runStatus='ended'`、`participantCount=20`
- **THEN** 色帶低飽和、左上「已結束」、文字降透明、發起人後「・20 位島民參與過」

### Requirement: 發起人快覽彈窗
點擊卡片發起人名稱（`role="button"`）SHALL 阻止事件冒泡與預設導向並開啟快覽彈窗，資料來自 `GET /api/v1/activities/hosts/{userId}`（開啟時才請求，頁面內快取）。彈窗 SHALL 顯示：頭像、名稱、角色列「{organizationName}・發起人」、自我介紹（無則顯示「這位島民還沒寫自我介紹」）、三個統計（發起的活動＝`hostedActivityCount`、一起學過的島民＝`learnedWithCount`、加入島島＝`{joinedYear} 年`）、右上角關閉按鈕、行動按鈕「看看 TA 的小島」（導向 `/users/{identifier}`）與「傳訊息」。「傳訊息」本輪 SHALL 為停用：使用者視圖顯示「傳訊息」＋tooltip「私訊功能即將推出」；訪客視圖顯示「加入後可傳訊息」。點擊遮罩 SHALL 關閉彈窗，點擊彈窗內容不關閉。`host.userId` 為 null 時名稱不可點。（FR-EX-11；TP-EX-29～34）

#### Scenario: 開啟彈窗不導向
- **WHEN** 使用者點擊卡片中的發起人名稱
- **THEN** 彈窗開啟，頁面未導向詳情頁

#### Scenario: 彈窗內容
- **WHEN** 端點回 `hostedActivityCount=3`、`learnedWithCount=24`、`joinedYear=2024`
- **THEN** 彈窗顯示頭像、名稱、「{組織}・發起人」、自我介紹、「3」「24」「2024 年」三個統計

#### Scenario: 關閉方式
- **WHEN** 使用者點擊遮罩或右上角 ✕
- **THEN** 彈窗關閉；點擊彈窗內容區域不關閉

#### Scenario: 訪客的訊息按鈕
- **WHEN** 未登入訪客開啟彈窗
- **THEN** 行動按鈕為「看看 TA 的小島」（可點）＋「加入後可傳訊息」（停用）

#### Scenario: 載入失敗
- **WHEN** 端點回 404 或錯誤
- **THEN** 彈窗顯示「暫時無法載入發起人資訊」與關閉按鈕，不顯示假統計

### Requirement: 空狀態
搜尋＋篩選組合無任何活動時，卡片區 SHALL 顯示空狀態卡片：白底、虛線邊框、圓角 20px、上下 48px 內距，置中「找不到符合的活動」＋副文字「換個關鍵字，或把篩選條件放寬一點看看。」列表本身為空（無任何公開活動）時 SHALL 顯示同一張卡片但主文字為「目前沒有公開的活動課程」。（FR-EX-13；TP-EX-35、36）

#### Scenario: 篩選無結果
- **WHEN** 搜尋「不存在的關鍵字」
- **THEN** 顯示虛線空狀態卡片與兩行文案，區段計數為 0

### Requirement: 底部行動呼籲
卡片區下方 SHALL 顯示白底虛線邊框、內容置中的 CTA 卡片。使用者視圖：「也想辦一場自己的活動嗎？」＋實心按鈕「開一個空間」，燈塔會員（`useLighthouseOrganizations` 有至少一個組織）導向 `/lighthouse/programs`，否則導向 `/spaces`。訪客視圖：「想報名或發起自己的活動嗎？」＋實心按鈕「免費加入島島」導向 `/auth/login?redirect=/activities`。（FR-EX-14、15；TP-EX-37、38）

#### Scenario: 燈塔會員的 CTA
- **WHEN** 登入者為某燈塔組織成員並點擊「開一個空間」
- **THEN** 導向 `/lighthouse/programs`

#### Scenario: 一般使用者的 CTA
- **WHEN** 登入者不屬於任何燈塔組織並點擊「開一個空間」
- **THEN** 導向 `/spaces`

#### Scenario: 訪客的 CTA
- **WHEN** 訪客點擊「免費加入島島」
- **THEN** 導向 `/auth/login?redirect=/activities`

### Requirement: 使用者與訪客視圖差異
除導覽列、頁面標頭、底部 CTA 外，使用者視圖與訪客視圖的搜尋、篩選、卡片內容與快覽彈窗（訊息按鈕文案除外）SHALL 完全相同。（TP-EX-39）

#### Scenario: 同一組資料兩種視圖
- **WHEN** 同一份列表分別以登入與未登入開啟
- **THEN** 卡片數量、內容、篩選結果一致，僅 `isJoined` 導向與訊息按鈕文案不同

### Requirement: 視覺規範
頁面背景 SHALL 為 `oklch(0.992 0.011 182.9)`；卡片白底、邊框 `#E4EAE9`、圓角 20px；強調色 `oklch(0.711 0.12 190.6)`（＝`#16B9B3`，沿用 `logo-cyan` token）；主標題色 `oklch(0.287 0.041 210.8)`、內文色 `oklch(0.445 0.056 192)`；字型 Noto Sans TC（400/500/600/700）；pill 選中／未選中樣式如狀態篩選所述。既有 Tailwind token 已相同者（`bg-logo-cyan`、`text-bg-dark`、`text-text-dark`、`#DCEBEA`）SHALL 直接沿用，不新增重複色值。（FR-EX-16）

#### Scenario: pill 樣式
- **WHEN** 檢視選中與未選中的 pill
- **THEN** 選中為 `#16B9B3` 底＋白字＋同色邊框；未選中為白底＋`oklch(0.445 0.056 192 / 0.75)` 文字＋`#DCEBEA` 邊框

### Requirement: 精簡活動詳情頁
`/activities/{cohortId}` SHALL 讀 `GET /api/v1/activities/{cohortId}`，顯示名稱、簡介、系列說明、日期區間、互動方式與地點、聚會時段（若有）、費用與報名方式、發起人列（可開快覽）、組織簡介與外部連結，以及 CTA：`isJoined` → 「前往學員頁」`/cohorts/{id}`；`canJoin` 且 `joinToken` → 「加入」`/cohorts/join/{joinToken}`；否則停用並顯示原因（額滿／暫停加入／報名截止／已結束）。頁面依登入狀態沿用探索頁的使用者／訪客外殼，返回導向 `/activities`。404 時顯示「找不到活動」。本頁為過渡版，活動詳情 FRD 到位後重做。

#### Scenario: 可加入的活動
- **WHEN** 訪客開啟 `canJoin=true` 的活動詳情
- **THEN** CTA「加入」導向 `/cohorts/join/{joinToken}`

#### Scenario: 已結束的活動
- **WHEN** 開啟 `runStatus='ended'` 的活動詳情
- **THEN** 資訊仍可讀，CTA 停用並顯示「已結束」

#### Scenario: 不存在或私密
- **WHEN** 開啟 `visibility='private'` 或不存在的 cohortId
- **THEN** 顯示「找不到活動」與回探索頁的連結
