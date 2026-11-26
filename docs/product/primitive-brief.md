# Primitive brief for 島島阿學（daodao）

- Date — 2026-11-26
- Author — Claude（依 primitive-first-design Skill 產出，待人審）
- Mode — ideal-first（再用 daodao-server Prisma schema 與 service 做材料驗證）
- System reviewed — daodao-server `claude/stoic-gauss-7jvnxa`；讀 `prisma/schema.prisma`、`practice-checkin.service.ts`、feature-map；未讀 daodao-f2e 與 daodao-storage 內容（本機 checkout 為空）

## Core job

學習者把想學的事變成一個持續進行的實踐，用打卡累積，並被同伴或帶領者看見與回應；講師與團主以期（cohort）組織一群人一起做。

## Candidate inventory

| Candidate | Level | Treatment |
|---|---|---|
| practices | Object | 保留為 Practice |
| practice_checkins | Object | 保留為 Checkin |
| practice_templates | Object | 併為 Practice 的來源（`template_id`） |
| 共同挑戰、活動課程、燈塔場次 | Object（疑似 Practice 加 cohort 的變體） | 視為 Practice 的組合，不是新物件 |
| cohorts、spaces、programs、organization、chat_rooms | Object | 合併為 Group 的種類（候選） |
| cohort_enrollments、space_members、organization_members、user_join_group | Object | 合併為 Membership |
| space_blocks、space_block_links | Object | 保留為 Block（已像 Notion block） |
| reactions、comments、likes、chat_message_likes、follows、connections | Object | 合併為 Reaction 與 Relationship |
| interaction_events、entity_stats、interaction_counts | Derived information | 由事件與 Reaction 推導，是快取 |
| future_letters、cohort_messages、chat_messages、notifications、checkin_encouragements | Object | 候選合併為有收件人與投遞時間的 Message |
| progress_percentage、streak | State／Derived | 見 Derived information |
| project、milestone、task、marathon | Object | **仍在使用，不是已淘汰**；與 Practice 的關係待釐清 |
| surveys、questions、roadmap_items、wishes | Object | 屬獨立功能，暫不納入 |
| persona_questions／answers、ideas | Object | 屬人物誌，暫不納入 |

## Primitives

| Primitive | Definition | Concepts it subsumes |
|---|---|---|
| **Practice** | 一個人要持續做的事，有期間、頻率、狀態；可選擇性屬於某個 cohort 或來自某模板或某個被複製的 Practice | 個人實踐、共同挑戰實踐、活動課程實踐、燈塔場次實踐、複製實踐 |
| **Checkin** | Practice 底下某一天的一次紀錄（心情、文字、圖片） | 打卡 |
| **Group** | 有成員、有時間或狀態的容器 | cohort、space、program、organization、聊天室 |
| **Membership** | 人與 Group 的關係，帶角色與狀態 | enrollments、space_members、organization_members |
| **Reaction** | 人對一個目標的回應 | reactions、likes、留言、鼓勵、follow（部分） |
| **Message** | 有收件對象與投遞時間的文字 | future_letters、cohort_messages、通知（部分） |

## Derived information

| Derived item | Derivation rule |
|---|---|
| 進度 | 由 Checkin 數量計算；目前 `progress_percentage` 是**儲存值**，在 `practice-checkin.service.ts` 的交易內與打卡一起寫入，並另有一處重算路徑（約 1103 行），所以已有一致性處理，但仍是快取 |
| 連續打卡（streak） | 由 Checkin 日期推導；**已經是推導，沒有儲存欄位**（schema 中無 streak 欄位，service 內即時計算） |
| 實踐狀態 | draft → active 由首次打卡觸發；是否可打卡由 `canCheckIn(status)` 判斷，並受共同挑戰與燈塔期間限制 |
| 成員是否在期內 | `cohort_enrollments.status = 'joined'` 且 cohort 未刪除 |
| 統計數字 | `entity_stats`、`interaction_counts` 由事件與 Reaction 聚合的快取 |

## Invariants

- Checkin 屬於且僅屬於一個 Practice，並屬於同一位使用者。
- 共同挑戰在開始日前不可打卡，也不位移開始日；燈塔場次同樣鎖開始日。
- 同一使用者對同一目標只有一筆 Reaction（`UNIQUE(target_type, target_id, user_id)`）。
- cohort 與 enrollment 以 `(cohort_id, email)` 唯一。

## Six checks

| Check | Result |
|---|---|
| 1. Subtraction | 拿掉 Practice 或 Checkin，產品就不再是島島。Group、Reaction、Message 是社群層，不能拿掉，但種類可以統一。 |
| 2. Same underlying behavior | **Membership 證據最強**：`cohort_enrollments` 有 `status`（invited／joined…）、`role`、`invited_at`、`joined_at`、`exited_at`；`space_members` 只有 `role` 與 `joined_at`，沒有狀態；`organization_members` 只有 `role`。三者是同一個概念，欄位語意不一致，所以「已退出」只在 cohort 表達得出來。另一處：`space_blocks.scheduled_at`／`publish_status` 與 `cohort_messages` 的排程是同一類行為。 |
| 3. Three-layer alignment | 資料層：Practice 的分化靠欄位而不是子類別，是好的。介面層：「我的」與「空間」與「燈塔」把同一個 Practice 以不同入口呈現。斷裂：`likes` 在 service 內**沒有任何引用**（`prisma.likes` 0 個檔案），看起來是廢表；`reactions` 一人一目標只能一種反應。 |
| 4. Emergence | 「週報」＝Checkin 的週聚合。「連續打卡徽章」＝streak 推導。「寄給夥伴的信」＝Message 加收件人（目前 `future_letters` 只給自己）。「共同挑戰也能開成空間」＝Group 互相包含，需要 Group 的父子關係。 |
| 5. Work with real materials | 已確認 `practice-checkin.service.ts` 的進度與狀態邏輯、cohort 與 space 與 organization 的 schema、feature-map。 |
| 6. Swan | 使用者面對的是「我的實踐、本期、空間、訊息」，內部確有 5 種容器，但介面已隱藏這個差異，方向正確。 |

## Product decisions to confirm

| Question | Suggested default | Decision, date, and decision-maker |
|---|---|---|
| Membership 要不要統一？ | 先統一欄位語意（`status`、`role` 取值與 `joined_at`／`exited_at`），再談合併表 | |
| `project`／`milestone`／`task` 與 Practice 的關係？ | 先確認它們服務哪些功能（導師、marathon 相關），再決定是否把 `milestone`／`task` 視為 Practice 的結構 | |
| `likes` 表是否可以移除？ | 先確認 daodao-f2e 與 daodao-ai-backend 沒有直接查詢，再列入 migration 清單 | |
| Reaction 允許同一目標多種反應？ | 暫維持一人一種，等有產品需求再評估 | |
| 空間與共同挑戰是否要有父子關係？ | 先蒐集需求，不預先設計 | |

## Design implications

- 新的「有人的集合」功能先問：是不是 Group 加 Membership？不要再開第六種容器。
- 任何排程發佈（空間區塊、訊息）共用同一組 `scheduled_at`／`published_at` 語意。
- 進度與 streak 不要在前端自行計算，維持由 Checkin 推導的單一來源。

## Mapping to the real system

| Primitive | Current implementation | Gap | Decision owner |
|---|---|---|---|
| Practice | `practices` | 無；分化方式良好 | 待確認 |
| Checkin | `practice_checkins` | 無 | 待確認 |
| Group | cohorts、spaces、programs、organization、chat_rooms | 5 種各自一套 | 待確認 |
| Membership | enrollments、space_members、organization_members、user_join_group | 欄位語意不一致 | 待確認 |
| Reaction | reactions、comments、follows、interaction_*；`likes` 似乎無人使用 | 統計表 3 張並行 | 待確認 |
| Message | future_letters、cohort_messages、chat_messages、notifications | 收件模型不一致 | 待確認 |

## Unverified hypotheses

- `project`／`milestone`／`task` 的實際使用範圍：`prisma.project` 在 7 個檔案、`prisma.task` 1 個、`marathon` 主要在 mentor 與 email；仍需讀 controller 與 f2e 確認是否為導師功能。
- `likes` 是否為廢表：需要確認 f2e 與 ai-backend 的查詢。
- Group 是否能統一：需讀 daodao-storage 與 f2e 的容器相關頁面。
- `progress_percentage` 與 Checkin 數量是否真的一致：需讀 `calculateProgress()` 與刪除打卡的路徑。
