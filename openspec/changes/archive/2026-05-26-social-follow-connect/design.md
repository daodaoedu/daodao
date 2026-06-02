## Context

目前平台尚無社交關係機制。本次引入「關注（單向）」與「連結（雙向）」兩種關係，其中連結關係直接影響內容隱私存取權限。動態門檻設計需要跨實踐的互動次數累計查詢，是主要的技術複雜點。

**與其他 changes 的關係：**
- 本 change 取代 `social-interactions` change 中 tasks 6（Follow API）與 7（Connect API）的設計，`social-interactions` 中的這兩組任務不需實作
- 本 change 取代 `notification-system` change 中 tasks 1.4（follows 表）與 1.5（connections 表）的資料表設計，notification-system 應依賴本 change 建立的資料表
- Section 7（通知整合）依賴 `notification-system` change 的 task 3.1（`notification-event.service.ts`）完成後才能實作

## Goals / Non-Goals

**Goals:**
- 建立 Follow / Connection 兩張核心資料表
- 實作跨實踐互動計數，支援信任豁免判斷
- 連結狀態變更與隱私系統即時聯動
- 提供 REST API 給前端社交關係中心與個人足跡頁使用

**Non-Goals:**
- 推薦系統（基於關係的內容推薦）
- 封鎖/黑名單功能
- 匯出社交關係資料

## Decisions

### 1. 互動計數儲存方式
**決定**：維護 `interaction_counts` 計數表（`user_a_id`, `user_b_id`, `count`），每次互動事件即時更新。

**替代方案**：每次查詢時即時 COUNT 留言表。

**理由**：互動門檻判斷在每次「發送連結請求」前觸發，即時 COUNT 在留言量大時效能不佳。計數表以事件驅動更新，查詢 O(1)。缺點是需要保持計數與實際留言的一致性（透過資料庫 transaction 處理）。

---

### 2. 連結狀態機
**決定**：`connection_requests` 表儲存請求，`connections` 表儲存已接受的雙向關係。

| 狀態 | 儲存位置 |
|------|----------|
| Pending | `connection_requests.status = 'pending'` |
| Accepted | `connections` 新增一筆雙向記錄 |
| Rejected/Ignored | `connection_requests.status = 'rejected'` |
| 撤回 | 刪除 `connection_requests` 記錄 |

**理由**：將 Pending 請求與已接受連結分開儲存，避免 connections 表膨脹，且 Pending 記錄有明確的生命週期（接受後搬移、忽略/撤回後刪除）。

---

### 3. 隱私權限即時生效策略
**決定**：不使用快取層，連結狀態直接查詢 `connections` 表判斷。

**替代方案**：Redis 快取連結關係，解除連結時清除 key。

**理由**：初期用戶規模不需要快取，且需求明確要求「解除連結後立即失效」。引入 Redis 增加維護複雜度，待有效能問題再評估。

---

### 4. 互動計數的方向性
**決定**：互動計數為**雙向對稱**，以 `(min(a,b), max(a,b))` 的 pair 儲存，代表兩人之間跨彼此實踐的累計互動總次數。

**理由**：需求範例明確顯示「A 在 B 的實踐留言 + B 回覆 A + A 再留言 = 3 次」，其中包含雙方行為。需求文件也說明「雙方在彼此的實踐內容中互動」——應涵蓋 A 在 B 的實踐互動，以及 B 在 A 的實踐互動。儲存為對稱 pair 可避免 A→B 與 B→A 兩筆記錄不一致的問題。**連結請求門檻判斷查詢 `(min(requester, receiver), max(requester, receiver))` 的 count 值。**

**connections 表 ID 正規化**：`connections` 表以 `user_a_id < user_b_id` 確保唯一性，`connection.service` 在所有寫入與查詢時須先正規化順序（`a = min(id1, id2), b = max(id1, id2)`），包含從 `connection_requests` 接受後搬移的邏輯。

## Risks / Trade-offs

- **計數一致性風險**：若留言刪除後不調整計數，可能造成誤判（已達豁免門檻但留言已刪）。→ 暫時接受，留言刪除不回退計數（語意上互動已發生過）。
- **並發請求風險**：A、B 同時對彼此發送連結請求，兩筆 `connection_requests` 各有 `(A,B)` 與 `(B,A)`，唯一索引僅防止同向重複。→ `connection.service.sendRequest` 在建立前先查詢是否存在對方發給我的 pending request；若存在，直接接受該請求而非新建，避免雙向 pending 並存。
- **效能**：`interaction_counts` 表在高活躍度用戶下可能成為熱點。→ 初期可接受，後續考慮分片或 Redis 計數。
- **自我操作防護**：用戶對自己發起關注或連結請求應在 API 層攔截，不需資料庫層約束。

## Migration Plan

1. 建立資料表：`follows`、`connection_requests`、`connections`、`interaction_counts`
2. 新增互動計數觸發器（留言新增/刪除事件）
3. 部署 API endpoints
4. 前端功能旗標上線（Social Hub、Learning Footprints、Connect Modal）

無需資料遷移（全新功能）。Rollback：關閉功能旗標，資料表保留不刪。

## Open Questions

- 互動計數是否需要考慮「已刪除留言的回退」？目前決定不回退，需 PM 確認。
- `僅限夥伴` 內容的隱私層級**設定入口**是否在本次 scope 內？本次 spec 涵蓋**存取控制**邏輯，但「用戶如何將內容設為 connections_only」的 UI 設定暫不含括，需 PM 確認邊界。
- 通知整合順序：本 change 的 Section 7 依賴 `notification-system` change 完成。建議先完成本 change 的 Sections 2–6（資料表、後端 API、前端）並留 TODO 標記，待 notification-system 完成後再補通知觸發邏輯。此順序是否可接受？
- 關注私人（`connections_only`）實踐：非夥伴是否能關注？目前設計允許關注（關注是表達興趣的低承諾行為），但關注者不能看到實踐內容，僅在實踐公開後才會收到通知。需 PM 確認。
