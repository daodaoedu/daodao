# 2D 空間：共同挑戰與活動情境

> 2026-09-12 使用者補充需求：「應用情境之一希望能讓共同挑戰或是活動使用」。
> 狀態：納入 P0 原型；正式成員授權與產品入口尚未實作。
> 主 PRD：[2D 空間小島](./2d-spatial-island-prd.md)。工程 source：`island-2d-spatial` OpenSpec。

## 背景與定位

共用 2D engine 同時服務個人島、共同挑戰與活動。個人島呈現一個人的累積；
共學空間呈現一群人的共同目標、當期內容與集合地點。參與者由既有挑戰／活動入口進入，
不用先與發起人建立私人 connection。

首版預設先做可隨時進入的共學空間。指定時間的活動會場使用同一底層，
但主持流程、時段限制與大型會議能力不由「Gather-like」一詞自動推定。

## 目前程式碼與可沿用能力

| 情境 | 現有資料與權限 | 整合限制 |
| --- | --- | --- |
| 個人島 | islandData、self/connection/visitor | 沿用原本隱私與 owner/connections realtime policy |
| 共同挑戰 | `challenge.service.ts` 使用 cohort，`cohort_enrollments.status='joined'` 是參與者依據 | `/spaces/challenge` 目前仍有 placeholder；不可用這個全站虛擬入口當唯一房間 |
| 活動 cohort | 具體 cohort 場次及其報名／管理權限 | 不可把同 program 的不同場次合成同一房間 |
| 邀請制活動空間 | `spaces.external_id`、`space_members` 的 host/member | 不可假設 spaces 與 cohorts 已有一對一映射；公開分享 token 不等於 realtime 成員資格 |

以上是當前 checkout 的 source evidence，不代表本輪已驗證 production。詳細路徑見
`openspec/changes/island-2d-spatial/evidence/shared-scope.md`。

## 目標與 User Stories

- 參與者可由既有挑戰／活動入口，進入正確場次的共學空間並打開當期任務。
- 主持人可讓具備資格的參與者集合、看見彼此與揮手，並關閉房間或移除 presence。
- 沒有人在線或 realtime 斷線時，仍可閱讀有權查看的任務、公告與活動資料。

驗證指標：入口到首次開啟當期任務的成功率／時間、共學空間回訪率、同時在線時 wave 使用率。
先記錄基線再設定產品門檻；沿用原 PRD 的技術效能與 20 人 beta 上限。

## 功能與場景對照

| 空間 | 主要互動物件 | DOM 等價入口 |
| --- | --- | --- |
| 個人島 | 實踐營地、人物誌、碼頭 | 實踐、個人介紹、目的島 |
| 共同挑戰 | 今日任務板、共同營火、挑戰說明 | 當期任務、挑戰進度、參與資訊 |
| 活動 | 議程告示牌、集合點、資源桌 | 活動資訊、議程、已授權資源 |

P0 使用清楚標示的本地 mock data。正式資料透過 server 授權後生成 typed objects；
不能把所有參與者的私人實踐或打卡內容攤在公共地圖上。聚合進度也需有明確可見性規則。
空間互動沿用 Canvas/鍵盤/touch/DOM 同一個 action contract。

## 流程與權限

1. 從個人島、特定挑戰或特定活動入口取得帶 scope 的 bootstrap。
2. Server 解析成 canonical room identity：`island:<ownerExternalId>`、`cohort:<cohortId>` 或 `space:<spaceExternalId>`。
3. 依對應業務 ACL 過濾內容與 actions；cohort/space 不使用個人島 connection policy。
4. Realtime 開啟且使用者有資格時，取得綁定 scope/id、角色與 capabilities 的短效 ticket。
5. 在固定地圖移動、看內容、wave；切換情境時先離開舊 room，再進入新 room。
6. 活動取消、空間封存、退團或權限撤銷後拒絕新票；既有 session 依 60 秒 reauth、75 秒上限失效。

主持能力由 server 對應現有業務管理權限，不接受前端宣稱的 host/owner。
「移除目前 presence」不等於永久封鎖；永久 ban 與會員異動不在 prototype 中模擬為成功。

## 驗收條件與邊界

- Given 相同 program 下兩個 cohort，When 分別進入空間，Then room keys 不同且互不收到 presence。
- Given 已報名的挑戰成員不是發起人的 connection，When 申請已啟用的 room，Then 依 cohort membership 判斷，不因未加好友拒絕。
- Given 公開活動連結的匿名訪客，When 開啟資訊，Then 只見授權公開內容，不能因此取得 realtime ticket。
- Given 參與者離開 cohort 或 space，When refresh ticket，Then 立即拒絕，舊 session 在 75 秒內失效。
- Given realtime 滿 20 人或斷線，When 進入空間，Then 保留內容瀏覽並明示非同步模式，不靜默分房。
- Given 活動結束但資料仍可閱讀，When 回訪，Then 顯示已結束狀態；room 是否開啟由明確設定決定，不刪除學習紀錄。
- Given 無權查看個別實踐，When 看共學進度，Then bootstrap、DOM 與 Worker 不含該私人內容。

## 補洞與工程影響

| 視角 | 已處理的缺口 | 待正式接線驗證 |
| --- | --- | --- |
| PM | 共享空間成為本 change 的明確情境 | 共學與指定時段會場的優先次序 |
| UX | 每個情境有固定物件、DOM 導覽、空房／斷線狀態 | 真實參與者任務理解與手機操作 |
| Backend | room scope、membership、host capabilities 分開 | cohort 管理者 resolver、活動 lifecycle 與 settings migration |
| Frontend | engine 接受場景內容，不硬編碼島主語意 | 真正的 challenge/cohort/space 入口及已授權 bootstrap |
| QA | 跨場次隔離、非好友成員、撤權、滿房與私密資料案例 | 多 client 和真實 preview 執行證據 |

沿用既有報名與成員資料，不新增第二份會員清單。共享空間的 renderer/realtime settings
由獨立 scope-aware contract 保存；不能把活動設定塞進某個人的 `user_island_settings`。
沒有既有來源的進度欄位與活動主持能力，需以明確 API/task 補齊。

## 風險與範圍

20 人是此 beta 的 realtime 上限，不是挑戰／活動可報名的人數上限。大型活動、語音視訊、
螢幕分享、一般聊天、分組分房、主持人廣播與自由地圖編輯另行規劃。
同一 engine 不代表共用 ACL；個人島與活動成員資料不得交叉混用。
