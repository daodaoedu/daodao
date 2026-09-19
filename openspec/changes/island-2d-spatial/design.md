## Context

現有 `/island/[identifier]` 已完成大部分單人 3D 體驗：Next.js server component 取得 islandData、React 殼 dynamic import vanilla three.js engine、server 依 `self | connection | visitor` 過濾實踐，並已有個人頁入口、practice drawer、空島、群島目的地與換島流程。可沿用的是 route、資料聚合、隱私、React UI 與 renderer callback 邊界；3D terrain、GLB、BVH、第三人稱相機與船物理不適合硬改成 2D tile world。

目前各子專案沒有 production realtime room/presence 實作。`daodao-server` 有 Redis，但沒有 WebSocket/SSE handler；`daodao-worker` 是 Hono Worker，尚未設定 Durable Object binding；`/messages` 仍是 placeholder，`group-messages` 只有 OpenSpec、沒有可重用程式碼。因此本 change 分成「2D renderer」與「co-presence」兩條可獨立上線、獨立 rollback 的軌道。

主要限制：

- 不得把未授權 practice、人物誌或 connection 資料送進 client 或 Worker。
- 高頻 movement/presence 不能寫 PostgreSQL，也不能讓 client 成為位置權威。
- 個人島可能長時間只有一人；realtime 失效時，內容探索仍須完整可用。
- 前端 Canvas 不能成為鍵盤與輔助科技唯一入口。
- 既有 3D 尚缺完整 visual/mobile 驗收，替換前必須先建立可比較 baseline。
- `island-3d` 與本 change 同時存在；正式歸檔前需 reconciliation，不能讓過時的 3D requirement 進 main specs。

## Goals / Non-Goals

**Goals:**

- 在不改 island URL、公開分享與既有 islandData 隱私語意的前提下，新增可漸進切換的 2D top-down world。
- 使用 deterministic、versioned map 讓同一島的 owner、visitor 與所有 realtime client 看到一致空間。
- 讓登入且有權的使用者在同一島看見彼此、移動與 wave／emoji；支援斷線降級與有限重連。
- 把 durable product state、realtime coordination state、render state 分開，降低耦合與資料外洩面。
- 建立 mobile、accessibility、security、performance、multi-client 與 rollback 的可驗證 gate。

**Non-Goals:**

- proximity audio/video、screen share、WebRTC/SFU/TURN。
- 公開／nearby 文字聊天、永久訊息歷史與匿名發言。
- 完整 Mapmaker、任意 tileset／iframe／script、自由佈置或大型活動地圖。
- 讓 remote avatar 成為硬碰撞物，或精確同步每個 animation frame。
- 本輪刪除 3D package、GLB 或歷史 change。
- 在 `daodao-ai-backend` 新增能力。

## Decisions

> 2026-09-12 使用者補充共同挑戰／活動情境。D1–D10 的個人島細節保留；
> D11 定義共享空間的 scope、權限與設定，不能以個人島 owner/connections 規則替代。

### D1：新增 Phaser + Tiled 2D engine，不原地改寫 three.js engine

**決策**：在 `daodao-f2e/packages/features/island-world-2d/` 建立獨立 package，採 Phaser renderer 與 Tiled JSON map。沿用現有 React/engine 邊界：React 只傳 bootstrap 與呼叫命令，engine 只處理 scene/input/render，透過 callbacks 回拋 `onReady`、`onWalkable`、`onObjectClick`、`onPositionChanged`。

地圖採固定大小 orthogonal grid；Tiled 僅承載靜態 layer：

- `background` / `decoration`
- `collision`
- `spawn`
- `portal`
- `interaction-zone`

實踐、打卡、人物誌與目的島是 runtime entities，由 `seed + mapVersion + islandData` 的純函式決定位置。視覺 sprite 與 collision/interaction metadata 分離，換圖不改行為。

**理由**：Phaser 已提供 tilemap、camera、sprite animation 與統一 pointer/keyboard input；Tiled JSON 有明確 version、layer 與 object 格式，適合把美術地圖和程式邏輯分離。獨立 package 可避免破壞已通過 76 個測試的 3D engine，並保留即時 rollback。

**替代方案**：

- PixiJS + 自建 loop/grid/A*：bundle 與抽象更小，但輸入、camera、tile collision 與 scene lifecycle 都要自行維護；僅在 P0 實測 Phaser bundle/效能未達標時回退。
- 原地把 `island-engine` 改成 2D：短期檔案較少，但讓 3D rollback 和 regression 歸因失效，捨棄。
- DOM/CSS grid：可及性較直接，但大量 sprite、camera 與平滑移動成本高，捨棄；可及性改由平行 DOM 導覽提供。

### D2：Server bootstrap 是 durable content 權威，client 只做 deterministic placement

保留 `GET /api/v1/users/{identifier}/island`，以 additive 欄位擴充：

```ts
type IslandWorldBootstrap = {
  renderer: "3d" | "2d";
  templateKey: string;
  mapVersion: string;
  seed: string;
  spawn: { x: number; y: number };
};

type IslandCapabilities = {
  canJoinRealtime: boolean;
  realtimeAccess: "owner" | "connection" | "visitor" | "none";
};
```

現有 `profile/personaType/practices/recentCheckinCount/viewerRelation` 不改名、不改隱私規則。2D package 以 versioned pure functions 把資料映射成 runtime objects；相同 input 必須輸出相同位置。map template 與 placement algorithm 的任一 breaking change 都必須 bump `mapVersion`。

**理由**：server 繼續決定「可以看到什麼」，client 決定「如何排進已授權地圖」；Worker 完全不需要學習內容。這保住既有 OpenAPI consumer，也避免為每次位置微調新增 DB 寫入。

**替代方案**：server 回傳每個 object 完整座標——一致性直觀，但把 renderer 細節綁進 API、payload 變大；自由佈置以前不採用。

### D3：Renderer flag 由島主 id 穩定分桶，3D 保留為 rollback

server 以環境設定 `ISLAND_2D_ROLLOUT_PERCENT`（0–100）和 island owner external id 做 deterministic bucket，回 `world.renderer`。owner 與所有 visitor 對同一座島取得相同 renderer；不得按 viewer 分桶。緊急 rollback 將比例設為 0，無需 DB rollback。

前端 `IslandPageClient` 依 renderer dynamic import `IslandWorld2D` 或既有 `IslandCanvas`，兩者共用 renderer-neutral React shell。2D asset chunk 不進主站 shared bundle，3D GLB 與 package 在觀察期保留。

**理由**：repo 目前沒有共用 feature flag 平台；以 server-side stable bucket 可先支援 0/內測比例/100 rollout，且避免同一島不同訪客看到不同世界。

**替代方案**：`NEXT_PUBLIC` build-time boolean 無法細分流量且 rollback 需重建前端；query flag 容易被使用者繞過，只保留給受保護的內部 preview。

### D4：realtime ticket 由 server 簽發，WebSocket 第一個 frame 驗證

新增 REST endpoint：

```http
POST /api/v1/users/{identifier}/island/session
Authorization: existing cookie/session/bearer
Cache-Control: no-store
```

成功回應：

```ts
{
  roomId: string;
  websocketUrl: string;
  ticket: string;
  expiresAt: string;
  protocolVersion: "1";
}
```

Server 先解析 island owner、讀取 `user_island_settings`、檢查 self/connection 與 realtime flag，再簽發 60 秒 ticket。claims 至少包含：

- `iss=daodao-server`
- `aud=daodao-island-worker`
- `purpose=island-realtime`
- `sub=<viewerExternalId>`
- `room=<ownerExternalId>`
- `sid`、`jti`、`role`、`capabilities`
- `mapVersion`、`iat`、`nbf`、`exp`、`kid`

ticket 使用獨立、可輪替的 `ISLAND_REALTIME_TICKET_KEYS` 與 active key id，不重用登入 JWT secret。Server 與 Worker 各自透過 secrets 管理，不寫入 repo。Worker 嚴格驗證 algorithm、issuer、audience、purpose、time claims、kid 與 path room。

瀏覽器 WebSocket 無法設定任意 Authorization header，因此 URL 只含非敏感 room id；ticket 放在連線後第一個 `auth` frame。驗證完成前 DO 不傳 snapshot、不加入 authenticated connections，5 秒內沒通過即關閉。`jti` 在該 room DO 的 SQLite `used_tickets` 記錄到 exp，阻止短效票重放，過期資料在後續 join 時 opportunistic cleanup。

**理由**：避免 token 進 URL、proxy access log、analytics 或 Referer；獨立 purpose/audience/key 避免一般登入 token 被誤用成 room ticket。

**替代方案**：

- 主 JWT 放 query：實作最小但洩漏面大，捨棄。
- Worker 直接向 server REST introspection：每次 join 多一個跨 origin critical path；先採離線驗簽。
- cookie-only：Worker 使用獨立 domain，cookie scope與 CSRF/origin 管理更複雜，捨棄。

### D5：一座島一個 Durable Object，使用 WebSocket Hibernation API

`daodao-worker` 新增 `IslandRoom`，Worker gateway 依 `island:<ownerExternalId>` 使用 `getByName()` 取得同一 coordination atom。不得建立全站 global DO。Durable Object binding 與 `new_sqlite_classes` migration 在 root、preview、production 環境分別設定；更新 compatibility date、執行 `wrangler types`，Env 不手寫。

DO 的責任只有：

- accept/authenticate WebSocket
- join snapshot 與 authenticated connection 上限（beta 20）
- move/wave/leave 廣播
- sequence、rate、speed、bounds、static walkable grid 驗證
- owner kick／room close 指令
- structured telemetry

DO 不查 PostgreSQL、不保存 practice/profile、不處理 durable chat。critical ticket replay state 存 SQLite；連線 identity/capabilities 用 WebSocket attachment；活躍位置以記憶體為主並最多每秒 checkpoint 到 attachment。hibernation 後用 `getWebSockets()` + `deserializeAttachment()` 重建 presence；短暫位置誤差由 client snapshot/interpolation 吸收。

只有 constructor schema migration 可放在 `blockConcurrencyWhile()`；不得在每次 message 或外部 I/O 周圍使用。WebSocket 採 Cloudflare 建議的 Hibernation API，使 idle room 可休眠且連線不必斷開。

**理由**：一島正好是一個需要單點協調的 room；DO 提供同一 instance 內的有序處理與 WebSocket fan-out，不需要在 Node server 增加 sticky session/Redis adapter。

**替代方案**：

- Express + Socket.IO + Redis adapter：可沿用 server auth，但新增長連線 lifecycle、水平擴展與 deploy drain，且會讓既有 API server 承擔高頻移動。
- Redis polling/SSE：presence 可做，但雙向 move/wave 不自然且延遲/請求量較差。
- 單一 global DO：room isolation 差且形成瓶頸，禁止。

### D6：WebSocket protocol v1 採 versioned JSON + Zod，位置是低頻 intent/state

Client messages：

```ts
type ClientMessage =
  | { v: 1; type: "auth"; ticket: string }
  | { v: 1; type: "move"; seq: number; x: number; y: number; direction: Direction; state: "idle" | "move" }
  | { v: 1; type: "wave"; seq: number; emoji: AllowedEmoji }
  | { v: 1; type: "ping"; clientTime: number };
```

Server messages：

```ts
type ServerMessage =
  | { v: 1; type: "ready"; self: Player; players: Player[]; serverTime: number }
  | { v: 1; type: "player_joined" | "player_moved"; player: Player }
  | { v: 1; type: "player_wave"; userId: string; emoji: AllowedEmoji; expiresAt: number }
  | { v: 1; type: "player_left"; userId: string }
  | { v: 1; type: "kicked" | "room_closed"; reason: string }
  | { v: 1; type: "pong"; clientTime: number; serverTime: number }
  | { v: 1; type: "error"; code: ErrorCode; recoverable: boolean };
```

- 每個 frame 有 byte limit，JSON parse 與 Zod validation 失敗累積到門檻即 close。
- move 建議 client 最多 10 Hz；DO 依 monotonic `seq` 去重，限制每秒 frame、速度、座標有限值、map bounds 與 static collision grid。
- dynamic practice entities 不做硬碰撞，避免 Worker 載入私人 islandData；client 只在本地處理 interaction radius。
- remote client 以 interpolation 呈現，不外插超過最後合法位置；avatar 彼此不阻擋。
- wave/emoji 使用 allowlist、短暫顯示且無文字 payload，避免繞過 MVP moderation 邊界。
- Zod schema 在 f2e/worker 各自實作，OpenSpec spec 是 contract source；兩邊以相同 golden frames 跑 contract tests，任何 breaking change bump `v`。

**理由**：10 Hz 已足以支援社交空間移動，無須同步每個 render frame；精確限制可降低作弊、資源濫用與 NaN/Infinity 造成的 scene 破壞。

### D7：PostgreSQL 只存島嶼設定，不存 presence 或位置

P1 renderer 不需要 schema。啟用 P2 前，`daodao-storage` 新增下一個合法序號 migration 與對應 clean schema：

```sql
CREATE TABLE user_island_settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  realtime_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  realtime_access_level VARCHAR(32) NOT NULL DEFAULT 'connections_only',
  map_template_key VARCHAR(64) NOT NULL DEFAULT 'default',
  map_version VARCHAR(32) NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_island_realtime_access
    CHECK (realtime_access_level IN ('connections_only', 'private'))
);
```

Beta 不開 public realtime；公開島仍可匿名非同步瀏覽。等 block/report/ban contract 完成後，另案評估把 `public` 加入 CHECK。Server 用 upsert 建立 settings；沒有資料列時使用安全預設 `realtime_enabled=false`、`connections_only`。

不新增 presence/position table。未來自由佈置另建 `user_island_layouts(revision, layout JSONB)`，不在本 change 偷渡。

**理由**：settings 是 durable user preference，應進 PostgreSQL；presence/movement 是連線生命週期狀態，寫 DB 只會製造高頻負載與 stale rows。

### D8：renderer-neutral React shell 與等價 DOM 導覽

將 `IslandCanvas` 內可重用的 destination discovery、owner panel、practice card、loading/error 與 navigation orchestration 抽到 renderer-neutral shell。3D/2D engine 只能透過 typed adapter 實作：

```ts
interface IslandRendererAdapter {
  mount(input: IslandData, events: IslandRendererEvents): Promise<void>;
  focusObject(id: string): void;
  moveTo(target: GridPoint): void;
  setRemotePlayers(players: readonly RemotePlayer[]): void;
  destroy(): void;
}
```

同一份已通過隱私過濾的 islandData 同時產生 Canvas scene 與 DOM 地點清單。DOM 提供實踐、人物誌、碼頭、附近人物與主要 action；不是只放「無障礙模式」的弱化副本。Canvas focus 說明鍵盤操作、Esc 可退出；`aria-live` 只宣告重要狀態，player movement 不逐 frame 播報。`prefers-reduced-motion` 關閉 camera easing、粒子與非必要動畫。

**理由**：長文與複雜 action 留在現有 React UI，降低 renderer 耦合；平行 DOM 也讓 mobile 使用者可跳過走路摩擦。

### D9：權限在 server 與 Worker 雙層 enforce

Server session endpoint 是 product ACL 權威：

- owner：可加入、kick、close realtime。
- connection：`realtime_enabled=true` 且 access=`connections_only` 時可加入。
- visitor/anonymous：MVP 不可加入，但可依既有 practice privacy 非同步瀏覽。
- owner 解除 connection 或關閉 realtime 後，新 ticket 立即拒絕；既有 connection 最晚在 ticket/session revalidation window 失效。

Worker 不自行查 connection；它只信任短效 ticket 中的 room/role/capabilities，並再次檢查 protocol action。owner control 必須驗證 attachment role，不能信 client payload 的 user id。Origin allowlist 僅允許正式、preview 與本機開發來源，但 origin 不是身份驗證替代品。

MVP 沒有完整 block/report/ban contract，因此不開 public realtime、不開文字 payload。若 product 要求陌生人 co-presence，必須先把治理 capability 加入 proposal/specs，而非只放前端按鈕。

### D10：測試與 observability 是上線 gate，不以本機雙分頁代替

**daodao-f2e**：

- 純函式：seed/map version、object placement、spawn fallback、A*、collision、protocol reducer。
- visual/E2E：empty/full/owner/connection/visitor、390px、reduced motion、DOM-only navigation、3D/2D flag。
- multi-context：兩個 browser contexts join/move/wave/leave/reconnect，不同 room 不互見。
- performance：p75 walkable time、asset bytes、FPS、20 remote avatars。

**daodao-server**：

- ACL matrix、settings default/upsert、ticket claims/kid/TTL、非登入/非 connection/disabled 拒絕。
- OpenAPI regenerate、generated client types、privacy regression 15 tests 保留。

**daodao-worker**：

- `@cloudflare/vitest-pool-workers` direct DO + `SELF.fetch` integration。
- room isolation、ticket replay、冒用 room/user、expired/wrong aud、frame size、NaN/Infinity、seq、rate、speed、bounds、20 人上限、kick。
- hibernation attachment restore、close cleanup、preview WebSocket smoke；本機 mock 不代替 preview handshake。

**daodao-storage**：

- migration 套用兩次、clean schema parity、CHECK/default/FK cascade。

Structured metrics 至少包含：ticket issued/denied reason、WS auth failure、active rooms/connections、room full、move rejected reason、reconnect success、unexpected close、2D walkable time、practice interaction funnel。log 不記 ticket、JWT、private islandData 或精確長期軌跡。

### D11：共用引擎支援個人島、共同挑戰與活動，Room Identity 與 ACL 隨 Scope 決定

P0 原型支援 `personal | challenge | event` 三種展示情境，採相同移動、碰撞與 DOM 互動核心。
情境是呈現選擇，不是授權來源；正式 bootstrap 必須包含 server 解析的 scope。

| 業務來源 | Canonical room key | 權限來源 |
| --- | --- | --- |
| 個人島 | `island:<ownerExternalId>` | 既有島主／connection policy 與 user island settings |
| 特定共同挑戰或活動場次 | `cohort:<cohortId>` | 既有 cohort enrollment 與管理權限 resolver |
| 邀請制活動空間 | `space:<spaceExternalId>` | `space_members` 的 host/member 及 space lifecycle |

`/spaces/challenge` 是虛擬總覽，不能作全站唯一 realtime room。同 program 的不同 cohort
必須隔離。現有 spaces/cohorts 並非已驗證的一對一關係，不自動合併兩者房間。
原 D3 的 owner 分桶只適用個人島；共享空間 rollout 以 canonical scope key 穩定分桶。

原 D4 的個人島 endpoint 保留；共同挑戰／活動以各 domain 的 world bootstrap/session
endpoint 取得 server-filtered objects 與 capabilities。Ticket 新增 scope kind/id，`room`
綁定完整 canonical key，Worker 驗證 scope、path 與 ticket 一致，不能跨個人島／活動重放。
所有 viewer 的 room 靜態地圖一致；私人動態內容仍僅在授權後送到 client。

原 D7 的 `user_island_settings` 只存個人島。共享空間 settings 在 storage 以獨立、
具 FK/唯一約束的 scope-specific rows 保存（cohort 與 space 分開綁定既有資料），
不複製 enrollment/member，也不保存 presence/position。具體 migration 先校準現有 schema。

原 D9 的 owner control 在共學情境映射為 server 授予的 host capabilities。不能以「認識島主」
代替成員資格，也不能讓一般參與者以 client role 自行取得 kick/close 權限。
目前共同挑戰的加入邏輯只有 member，沒有 host/coach；不能自動把 program organization owner
視為挑戰主持人。挑戰主持能力需另定可驗證的 moderator 授權；在此之前只開 member 能力。
活動 cohort 的 enrollment owner/assistant 與 organization fallback 需抽共用 resolver，
space 使用 membership role，不能只相信清單的 owner_user_id/isHost 顯示。
個人島 external id 在 schema 可為 null；缺少穩定 id 時不得簽票或使用空字串共用 room，
保持非同步／3D fallback 並記錄完整性問題。
取消、封存、退出或移除成員時立即停止新票；使用同一 60 秒 reauth／75 秒撤權界線。
結束後的內容可讀性依原 domain lifecycle；不把活動結束當成刪除學習資料的理由。

第一版仍是最多 20 個 realtime presence；滿房者保留有權內容瀏覽。
沒有新增語音視訊、文字聊天、主持人廣播或大型會場分房。
詳細情境與驗收見 `shared-spatial-spaces` spec 及 `docs/product/island/shared-space-use-cases.md`。

## Risks / Trade-offs

- [個人島同時在線密度低，realtime 投資無法轉化] → P1 renderer 與 P2 presence 分開量測；沒人在線時所有內容與 CTA 仍完整。
- [Phaser bundle 或低階手機表現未達標] → P0 量測 Phaser/Tiled 與 Pixi fallback；dynamic import、sprite atlas、viewport culling、30fps low mode。
- [現有 3D regression baseline 不完整] → 切換前補 owner/visitor/empty/full visual smoke；3D flag 保留到 2D 觀察期結束。
- [ticket 被竊或重放] → 不放 URL、60 秒 TTL、獨立 audience/purpose/key ring、DO 持久化 consumed jti、全程 TLS。
- [DO hibernation 清掉記憶體] → identity/capabilities/低頻位置 checkpoint 用 WebSocket attachment；constructor 只做 schema migration，醒來由 sockets 重建。
- [client teleport、刷 frame 或送惡意數字] → Zod、frame limit、finite/bounds/speed/rate/seq 驗證；多次違規 close 並記 telemetry。
- [跨 repo protocol 漂移] → OpenSpec scenarios + f2e/worker 相同 golden frames + `v`；breaking change 不覆寫 v1。
- [connection 撤銷後既有 socket 短暫存活] → ticket 短效只保護 join；P0 決定是否加入 server→Worker revocation hook，未做前明訂最長 session TTL/週期 reauth。
- [公開 realtime 缺治理] → Beta 僅 owner/connections；public、文字與匿名都保持關閉，直到 block/report/ban 有真實後端契約。
- [Cloudflare provider lock-in] → f2e 只依賴 `RealtimeAdapter` 與 versioned protocol；DO 細節留在 worker，server ACL/API 不綁 platform SDK。
- [觀察資料變成行為追蹤] → 只收 aggregate operational/funnel metrics，不保存精確移動軌跡；文件化 retention。

## Migration Plan

1. **Baseline gate**：補齊既有 3D owner/visitor/empty/full smoke、保存性能與互動 baseline；既有 route/API 不改。
2. **P0 2D spike**：新增 2D package、單一 Tiled map、1 avatar、3 類物件、桌機/mobile/DOM navigation；renderer flag 固定 0%。
3. **P1 renderer rollout**：擴充 bootstrap、抽 shell、部署 2D assets；內部指定島 → 小比例 stable bucket → 100%，每階段比較錯誤、walkable time 與互動率。
4. **P2 durable settings**：先部署 additive migration/clean schema，再部署 server settings read/write；default realtime disabled，舊使用者行為不變。
5. **P2 realtime backend**：更新 Worker toolchain/compatibility date，新增 DO binding + SQLite class migration + generated types；先 preview deploy 與真實 WebSocket/hibernation smoke。
6. **P2 session integration**：server 配置 ticket active/previous keys，部署 session endpoint；f2e 接 realtime adapter。先 owner-only，再 connections-only beta。
7. **觀察與收斂**：達 KPI、security/performance gate 且 rollback 觀察期完成後，另開 cleanup change 移除 3D；未達標則 renderer flag 回 0、realtime disabled。
8. **OpenSpec reconciliation**：本 change 歸檔前，處理 `island-3d` 的完成狀態與被 supersede requirements；不得把互相衝突的 3D/2D requirement 同時同步到 main specs。

Rollback 不刪資料：將 `ISLAND_2D_ROLLOUT_PERCENT=0`、關閉 realtime session 發放，保留 additive settings table 與 DO migration。已開 WebSocket 收到 `room_closed` 後關閉；舊 3D renderer 繼續使用原 islandData 欄位並忽略 additive fields。

## Open Questions

1. 2D 美術採 pixel art 還是島島既有向量／手繪品牌風格？建議借 Gather 的互動語法，不複製其畫風；P0 需各做一張代表畫面比較。
2. P1 2D renderer 與 P2 co-presence 要同一個公開版本推出，還是先驗證純 2D？建議分開，以免無法判斷 KPI 變化來源。
3. 已由 `island-realtime-presence` spec 決議：每 60 秒重新取得 room ticket 並 reauth；connection 撤銷後最長 75 秒內關閉既有非 owner session。新 ticket 立即拒絕，成功 reauth 不重複 joined；P0 不新增 server→Worker revocation channel。Owner 主動 close room 仍須通知現有 sockets 後關閉。
4. 是否要在 MVP 支援陌生登入訪客 realtime？目前設計刻意限制 owner/connections；若答案為是，block/report/ban 必須升為本 change 的前置 capability。
5. 3D cleanup 的量化門檻與觀察期多久？需在 rollout 前寫入 release checklist，不能只憑主觀「2D 看起來穩」。

## References

- [Cloudflare Durable Objects WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Phaser Input](https://docs.phaser.io/phaser/concepts/input)
- [Tiled JSON Map Format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)

> 研究工具註記：本次完整 callable inventory 未掛載 Groundlane；Cloudflare、Phaser 與 Tiled 官方資料透過可用 fallback 讀取，不作為 Groundlane 路徑已驗證的證據。
