## Context

Dao Dao 目前有個人練習（Practice）、打卡（Check-in）、留言（Comment）、快速回應（Reaction）機制，但缺乏「官方發起的集體挑戰」。本次要在現有 Practice 打卡生態上疊加「共同挑戰」層，讓挑戰打卡共用現有 Practice/Check-in/Comment/Reaction 基礎設施，只需新增挑戰管理層、ACL 層與自動化結營邏輯。

**現有可複用基礎設施：**
- Practice + Check-in（打卡主體）
- Comment + Reaction（互動）
- Notification + Email 服務
- BullMQ（佇列 / 排程）
- Prisma ORM + daodao-storage migration

## Goals / Non-Goals

**Goals:**
- 建立 `challenges` 與 `challenge_participants` 資料模型
- 實作分層互動 ACL（參與者 vs 外部觀察者）
- 首頁卡片、彈挑視窗、Lurker Banner、Challenge Pulse 前端組件
- 承諾宣言報名流程 + Email 通知 + 分享圖卡
- BullMQ 結營排程：達標判斷 → Growth Map 勳章 / 未達標通知

**Non-Goals:**
- 管理後台（Admin UI）用於建立挑戰 ─ 本期以直接寫入 DB 或腳本操作為主
- 多期挑戰同時並行（本期假設同一時間只有一個活躍挑戰）
- 付費 / 收費挑戰機制

## Decisions

### D1：挑戰打卡複用 Practice 實體，而非建立新的打卡型別

**決策**：共同挑戰的「打卡」直接對應 Practice（加上 `challenge_id` FK）與 Check-in，不建立新資料表。

**理由**：Check-in 已有完整的公開/私密、媒體附件、留言、Reaction 機制。重建相同機制代價高且維護成本倍增。

**替代方案**：建立獨立的 `challenge_checkins` 表 ─ 捨棄，因為功能高度重疊。

---

### D2：挑戰專屬 Feed = 過濾 challenge_id 的 Practice Feed

**決策**：Challenge Feed 頁面直接呼叫現有 Practice Feed API，加上 `?challenge_id=<id>` query param 過濾。

**理由**：前端 Feed 渲染邏輯已成熟，僅需在 API 層增加過濾條件與 ACL 判斷。

---

### D3：ACL 以 Express middleware 實作，注入 `req.challengeRole`

**決策**：新增 `challengeParticipantMiddleware`，在 `/challenge/:id/*` 路由掛載，查詢 `challenge_participants` 後將 `role: 'participant' | 'observer' | 'anonymous'` 注入 `req`。Comment 建立 controller 在此基礎上做 guard。

**理由**：集中化權限邏輯，避免散落各 controller。

**替代方案**：前端隱藏輸入框即可 ─ 捨棄，因為前端隱藏不能替代後端校驗（可繞過）。

---

### D4：結營自動化以 BullMQ Delayed Job 實作

**決策**：挑戰建立時（或狀態切換為「進行中」時），在 BullMQ 新增一個 `challenge.complete` delayed job，執行時間為 `end_date + 1 day`。Job 掃描所有參與者打卡次數，分批寫入勳章 / 發送通知。

**理由**：現有 BullMQ 基礎設施已就緒，無需引入額外 cron 服務。Delayed job 可在挑戰取消時取消。

**替代方案**：Node-cron 每日掃描 ─ 捨棄，Delayed job 更精準且可追蹤。

---

### D5：即時數據（Pulse、Banner 人數）以輪詢取代 WebSocket

**決策**：Challenge Pulse 與 Lurker Banner 人數採用前端每 60 秒輪詢 `/api/challenges/:id/stats`，不引入 WebSocket。

**理由**：精準即時性對此場景非必要，輪詢實作成本極低且無狀態。

---

### D6：分享圖卡使用 Satori（server-side JSX → SVG → PNG）

**決策**：在 `daodao-server` 新增 `/api/challenges/:id/share-image` endpoint，使用 Satori 產生 PNG。

**理由**：現有系統無圖卡生成機制，Satori 無需 headless browser，部署簡單。

## Risks / Trade-offs

- **[只有一個活躍挑戰的假設]** → 若未來要多挑戰並行，`challenge_id` FK 設計已支援，但首頁卡片邏輯需擴展
- **[結營 Delayed Job 漂移]** → 若 BullMQ worker 當機，job 可能延遲執行 → Mitigation：job 冪等設計，重新執行安全
- **[Satori 渲染字型]** → 中文字型需打包進 server，增加約 10-20MB → Mitigation：僅打包子集字型（subset）
- **[彈挑視窗轉換率]** → 若頻率過高造成使用者厭煩 → Mitigation：localStorage 記錄「已關閉」狀態，每個 session 只出現一次

## Migration Plan

1. **daodao-storage**：新增 migration `020-challenges.sql`，建立 `challenges`、`challenge_participants` 資料表
2. **daodao-server**：
   - 新增 Prisma schema（或直接 raw SQL query，沿用現有 daodao-storage 慣例）
   - 新增 challenge routes / controllers / services
   - 新增 `challengeParticipantMiddleware`
   - 新增 BullMQ `challenge-completion` processor
   - 新增 Email 模板（報名確認、結營賀信）
   - 新增 `/api/challenges/:id/share-image` Satori endpoint
3. **daodao-f2e**：
   - 首頁挑戰卡片組件
   - 彈挑視窗（Modal）
   - `/challenge/[id]` Feed 頁面
   - Lurker Banner 組件
   - Challenge Pulse 組件
   - 報名承諾宣言 Modal
4. **Rollback**：migration 可 down（drop tables），feature flag `CHALLENGE_ENABLED` 控制前端入口顯示

## Open Questions

- **Growth Map 勳章 API**：Growth Map 是否已有「外部觸發新增勳章」的後端介面？若無，需先建立
- **彈挑視窗觸發條件**：是否有「已參加此挑戰的使用者不再顯示」的邏輯？還是永遠對所有人顯示（直到挑戰開始）？
- **私密打卡可見性**：FRD 提到「非挑戰成員無法看到私密打卡全文」─ 這是額外的 ACL 層，還是現有 Practice 私密機制已覆蓋？
- **Badge 達標門檻**：FRD 提到「如打卡 15 次」─ 此門檻是寫死在程式碼，還是存在 `challenges` 資料表的欄位？建議後者以利未來調整
