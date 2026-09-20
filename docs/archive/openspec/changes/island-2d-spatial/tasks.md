## 1. P0 Baseline 與可行性 Gate

進行中證據：[P0 progress](./evidence/p0-progress.md)。部分實作與未通過的環境／產品驗收分開記錄；只有整項驗收成立才勾選。

- [ ] 1.1 [daodao-f2e][2–4h] 為既有 3D `/island/[identifier]` 建立 empty/full/owner/connection/visitor 五組 deterministic fixture 與 baseline screenshots；驗收：既有 route、practice drawer、換島與隱私畫面可在 CI 重現，結果保存為 2D 對照基線。
- [ ] 1.2 [daodao-f2e][2–4h] 製作同一張小島的 pixel art 與島島品牌插畫兩種 2D 可操作 mock；驗收：桌機與 390px mobile 各有可檢視畫面，產品明確記錄採用方案、sprite/tile 規格與淘汰方案。
- [ ] 1.3 [daodao-f2e][2–4h] 建立 Phaser + Tiled 技術 spike，載入一張固定地圖、1 個 avatar、collision、鍵盤與 tap-to-walk；驗收：目標桌機達 60fps、中階手機達 30fps，首次可操作時間與 bundle bytes 有可重跑量測。
- [ ] 1.4 [daodao-f2e][2–4h] 以同一 spike 比較 PixiJS fallback 的必要性；驗收：若 Phaser 達預算則記錄不採 Pixi，若未達則以相同場景量測兩者並回寫 framework 決策，不得只憑主觀選型。
- [ ] 1.5 [daodao-worker][2–4h] 建立 preview-only Durable Object WebSocket spike，驗證一 room 兩 client join/move/leave 與 hibernation 後 attachment 恢復；驗收：`@cloudflare/vitest-pool-workers` 測試與 preview 真實 handshake 都通過，未通過則停止 P2 排程並記錄 blocker。
- [ ] 1.6 [daodao][2–4h] 彙整 P0 品牌、mobile、bundle、realtime、成本與風險證據並做 go/no-go gate；驗收：`design.md` Open Questions 有決議紀錄，P1/P2 是否分開上線與 3D cleanup 門檻明確，未過 gate 不得勾選後續正式實作。

## 2. P1 2D Engine 地基

共享空間補充見第 11 節；P0 先做 11.1–11.2，scope 正式接線依 P0 gate 推進。

- [ ] 2.1 [daodao-f2e][2–4h] 新增 `packages/features/island-world-2d` package、Phaser/Tiled dependencies、build/test/dev scripts 與 typed public exports；驗收：package 可獨立 typecheck/test/build，且非 island app route 不載入 Phaser chunk。
- [ ] 2.2 [daodao-f2e][2–4h] 定義 `WorldBootstrap`、grid point、direction、runtime object、renderer events 與 adapter types；驗收：禁止 `any`，Zod/TypeScript 型別覆蓋 invalid mapVersion、座標與 object action。
- [ ] 2.3 [daodao-f2e][2–4h] 建立 Tiled map/tileset asset 管線與固定 layer contract（background/decoration/collision/spawn/portal/interaction-zone）；驗收：缺 layer、重複 spawn、越界 object 與未知 map version 會回可分類錯誤，不白屏。
- [ ] 2.4 [daodao-f2e][2–4h] 實作 versioned seeded random 與 deterministic placement 核心；驗收：相同 seed/data/version 輸出逐欄相同，版本變更可與舊 fixture 並存，單元測試覆蓋空/少量/大量資料。
- [ ] 2.5 [daodao-f2e][2–4h] 實作 practice → 帳篷營火/小屋的 runtime entity mapper 與 theme color normalization；驗收：只映射 active/completed，未知或不合法顏色安全 fallback，點擊 payload 對應正確 practice id。
- [ ] 2.6 [daodao-f2e][2–4h] 實作 checkin → 植栽/生態 mapper 與 rendering budget 聚合；驗收：相同 checkin ids 結果恆定，超量時 sprite 有上限但總數正確，未打卡不產生枯萎/警示狀態。
- [ ] 2.7 [daodao-f2e][2–4h] 實作 persona avatar/theme 與 neutral/empty-island layout；驗收：五人格與 null persona 均有明確輸出，島主/訪客空島 CTA 權限分支有單元測試。
- [ ] 2.8 [daodao-f2e][2–4h] 實作鍵盤連續移動、collision grid、safe spawn fallback 與 camera follow；驗收：角色不穿越 blocking tile、不離開 bounds，首選 spawn 被占用時使用下一安全點。
- [ ] 2.9 [daodao-f2e][2–4h] 實作 tap-to-walk A*、不可達目的地處理與取消/改道；驗收：desktop pointer 與 touch 使用同一路徑核心，不可達點不移動、不卡住，快速重點以最後一次為準。
- [ ] 2.10 [daodao-f2e][2–4h] 實作 interaction radius、點擊/E/Enter 統一事件與 portal lifecycle；驗收：三種輸入回相同 payload，換島前送出 leave/destroy，目的島失敗可回原島或個人頁。
- [ ] 2.11 [daodao-f2e][2–4h] 實作 quality tiers、sprite atlas、viewport culling、reduced-motion 與完整 destroy cleanup；驗收：低效能模式關閉非必要動畫，重複 mount/unmount 不殘留 RAF、listener、canvas 或 texture reference。
- [ ] 2.12 [daodao-f2e][2–4h] 補齊 2D engine unit suite 與 dev fixture page；驗收：placement、mapping、collision、spawn、A*、interaction、versioning 與 cleanup 測試全綠，fixture 可切換 empty/full/persona/大量打卡。

## 3. P1 Server Bootstrap 與 Renderer Rollout

- [ ] 3.1 [daodao-server][2–4h] 擴充 island Zod/OpenAPI schema，additive 新增 `world` 與 `capabilities`，保留既有欄位；驗收：舊 payload consumer 測試維持綠，新欄位拒絕未知 renderer/mapVersion/非法 spawn。
- [ ] 3.2 [daodao-server][2–4h] 實作以 owner external id + `ISLAND_2D_ROLLOUT_PERCENT` 穩定分桶的純函式；驗收：0/100 邊界、相同島不同 viewer 同結果、不同 process 重跑一致，非法 env fail closed 到 3D。
- [ ] 3.3 [daodao-server][2–4h] 將 versioned world bootstrap 與 renderer bucket 接入 `getUserIslandData`；驗收：owner/connection/visitor 回傳相同 map metadata，既有 deny-first practice 過濾 15 項 regression test 全過。
- [ ] 3.4 [daodao-server][2–4h] 為 island bootstrap 加入 no-store/cache 行為與 renderer rollout telemetry；驗收：切換 rollout 後新請求不讀到舊 renderer，log 不含 private practices 或 auth token。
- [ ] 3.5 [daodao-server][2–4h] 重生 OpenAPI 與 server generated artifacts；驗收：diff 只包含預期 island contract，`pnpm run lint`、`pnpm run typecheck` 與 island tests 全綠。
- [ ] 3.6 [daodao-f2e][2–4h] 同步 server OpenAPI generated types 並更新 `getUserIsland` typed contract；驗收：不手改 generated type，缺 world/capabilities 有明確 backward-compatible fallback，API service tests 全綠。

## 4. P1 Renderer-neutral React Shell 與介面

- [ ] 4.1 [daodao-f2e][2–4h] 從現有 `IslandCanvas` 抽出 destination discovery、owner panel、practice card、loading/error 與 route orchestration；驗收：3D adapter 行為與 baseline screenshots 無非預期差異。
- [ ] 4.2 [daodao-f2e][2–4h] 實作共用 `IslandRendererAdapter` lifecycle 與 3D adapter；驗收：mount/focusObject/moveTo/setRemotePlayers/destroy 型別完整，3D 既有互動測試維持綠。
- [ ] 4.3 [daodao-f2e][2–4h] 實作 2D adapter 與 `IslandPageClient` dynamic renderer selection；驗收：同 URL 可依 server renderer 載入 2D/3D，兩種 engine 不同時進 bundle，renderer failure 有可重試降級。
- [ ] 4.4 [daodao-f2e][2–4h] 將 practice/owner/portal callbacks 接回既有 React Drawer、Bottom Sheet 與 navigation；驗收：走近、點擊、E/Enter、DOM 選擇同一物件皆開啟相同內容。
- [ ] 4.5 [daodao-f2e][2–4h] 建立等價 DOM 地點清單與 focus management；驗收：不用 Canvas 可到達所有可見實踐、人物誌、碼頭與社交動作，Esc 可離開 Canvas，無 keyboard trap。
- [ ] 4.6 [daodao-f2e][2–4h] 加入 `aria-live` 空間狀態、操作說明、非色彩狀態標記與 reduced-motion UI；驗收：screen reader 不逐 frame 播報，斷線/靠近物件/room 狀態可辨識，互動 target 達設計尺寸。
- [ ] 4.7 [daodao-f2e][2–4h] 完成 mobile tap-to-walk、Bottom Sheet、viewport/safe-area 與橫直向行為；驗收：390px 與目標實機可完成入島、移動、開詳情、換島、返回，不被固定 UI 遮擋。
- [ ] 4.8 [daodao-f2e][2–4h] 新增 zh-TW/en 2D island 文案與 analytics events；驗收：語系 key parity 通過，事件只記 renderer、timing、object kind 與結果，不含精確路徑或 private title。
- [ ] 4.9 [daodao-f2e][2–4h] 建立 2D owner/connection/visitor/empty/full visual E2E 與 user-profile entry regression；驗收：既有「上島」URL 不變，隱私 DOM/Canvas 一致，2D/3D rollback screenshots 可在 CI 比較。
- [ ] 4.10 [daodao-f2e][2–4h] 建立效能 gate 與 bundle comparison；驗收：p75 可操作時間桌機 <2.5s、目標手機 <4s，桌機 60fps、手機 ≥30fps，非 island shared bundle 無 Phaser regression。

## 5. P2 Storage：島嶼 Realtime 設定

- [ ] 5.1 [daodao-storage][2–4h] 新增下一合法序號 migration 建立 `user_island_settings`（user FK、realtime_enabled、connections_only/private CHECK、map template/version、timestamps）；驗收：預設 `false/connections_only`、FK cascade 與具名 constraint 符合 schema 慣例。
- [ ] 5.2 [daodao-storage][2–4h] 新增對應 clean schema 檔與註解/index；驗收：clean schema 與 migration 結果一致，不新增 presence/position/layout table。
- [ ] 5.3 [daodao-storage][2–4h] 建立 migration idempotency 與 schema parity 驗證；驗收：全 schema 後套 migration 兩次無錯，CHECK 拒絕 public/未知值，刪 user 會 cascade settings。

## 6. P2 Server：Settings、ACL 與 Room Ticket

- [ ] 6.1 [daodao-server][2–4h] 同步 `user_island_settings` Prisma model 並 regenerate client；驗收：schema drift 無新增未解差異，型別不使用手寫 cast。
- [ ] 6.2 [daodao-server][2–4h] 實作 island settings service 的安全預設、get/upsert 與 owner authorization；驗收：無 row 回 `false/connections_only`，只有 owner 可修改，public 值在 validator/service 皆拒絕。
- [ ] 6.3 [daodao-server][2–4h] 新增 `GET/PUT /api/v1/me/island/settings` 的 Zod validator、controller、route 與 OpenAPI；驗收：登入/temporary/owner 錯誤碼一致，更新 realtime 後 bootstrap capabilities 即時反映。
- [ ] 6.4 [daodao-server][2–4h] 實作獨立 island ticket keyring 與 active `kid` 讀取，支援 active+previous 驗證期；驗收：缺 keyring/active kid/過短 secret 在啟動或呼叫時 fail closed，secret 不出現在 log、config 或 test snapshot。
- [ ] 6.5 [daodao-server][2–4h] 實作 60 秒 room ticket signer，固定 algorithm/issuer/audience/purpose 並包含 sub/room/sid/jti/role/capabilities/mapVersion/time claims；驗收：clock、random UUID 與 keyring 可注入測試，claims/TTL/kid 有 deterministic unit tests。
- [ ] 6.6 [daodao-server][2–4h] 實作 island realtime ACL resolver（owner、active connection、visitor、anonymous、disabled）；驗收：只有 owner 與 connection 可拿票，非 connection/匿名/disabled 不透露 room presence，解除連結後立即拒絕新票。
- [ ] 6.7 [daodao-server][2–4h] 新增 `POST /api/v1/users/:identifier/island/session` 的 validator/controller/route、no-store 與 rate limit；驗收：回 roomId/websocketUrl/ticket/expiresAt/protocolVersion，無效 identifier/未登入/無權/限流測試覆蓋。
- [ ] 6.8 [daodao-server][2–4h] 加入 session reauth 契約與 ticket issued/denied reason telemetry；驗收：client 可每 60 秒取得新票，log 不含 ticket/user private data，denial reason 可聚合。
- [ ] 6.9 [daodao-server][2–4h] 重生 OpenAPI/generated artifacts 並跑 settings/session/privacy 整合測試；驗收：所有新 route 出現在 spec，existing island 15 tests 與完整 lint/typecheck/test 維持綠。
- [ ] 6.10 [daodao-f2e][2–4h] 同步 settings/session generated client types 與 API services/hooks；驗收：generated file 不手改，mutation 錯誤分支不樂觀偽造成功，service tests 全綠。

## 7. P2 Worker：Durable Object 與 Protocol

- [ ] 7.1 [daodao-worker][2–4h] 核對並更新 Wrangler、Workers types、compatibility date/flags 與 Vitest pool 相容版本；驗收：以當前官方 schema 驗證 config，`wrangler types` 產生 Env，typecheck/test 綠且無手寫 Env 漂移。
- [ ] 7.2 [daodao-worker][2–4h] 在 root/preview/production 設定 `ISLAND_ROOM` binding 與 `new_sqlite_classes` migration，export `IslandRoom`；驗收：三環境 binding 名稱一致、migration tag 唯一，既有 AI/KV route 不受影響。
- [ ] 7.3 [daodao-worker][2–4h] 定義 protocol v1 client/server Zod discriminated unions、limits、error/close codes 與 golden frames；驗收：auth/move/wave/ping/reauth 及 ready/join/move/wave/leave/kicked/closed/error/pong 全部 round-trip，未知 type/field/version 拒絕。
- [ ] 7.4 [daodao-worker][2–4h] 建立 `IslandRoom` SQLite migration 與 `used_tickets` replay store；驗收：constructor 只在 `blockConcurrencyWhile` 做 schema init，jti insert 原子且重複失敗，過期資料可 opportunistic cleanup。
- [ ] 7.5 [daodao-worker][2–4h] 實作 gateway origin allowlist、room path validation、`getByName(island:<ownerId>)` 與 WebSocket upgrade；驗收：未知 origin/非法 room/非 upgrade 拒絕，不建立 global DO，route tests 覆蓋 preview/prod/local origins。
- [ ] 7.6 [daodao-worker][2–4h] 實作 ticket keyring 驗證與 5 秒 first-auth timeout；驗收：expired/wrong alg/aud/purpose/room/kid/replayed jti 均不得取得 snapshot，ticket 不出現在 URL 或 log。
- [ ] 7.7 [daodao-worker][2–4h] 實作 authenticated WebSocket attachment、hibernation restore 與 close cleanup；驗收：identity/capabilities/session 可在 hibernation 後重建，離線會廣播 leave，module-level state 不作權威來源。
- [ ] 7.8 [daodao-worker][2–4h] 實作 join snapshot、同 user supersede 與 20-presence room limit；驗收：同 room 玩家互見、不同 room 完全隔離、新 session 關閉舊 session、第 21 人收到 room-full 且不進 snapshot。
- [ ] 7.9 [daodao-worker][2–4h] 實作 move sequence/rate/frame/finite/speed/bounds/static-collision 驗證與 canonical broadcast；驗收：合法 10Hz 流程收斂，teleport/NaN/Infinity/舊 seq/越界不廣播，重複違規會關閉。
- [ ] 7.10 [daodao-worker][2–4h] 實作 allowlist wave/emoji、expiry 與 rate limit；驗收：合法 wave 同 room 可見且自動消失，任意文字/未知欄位/超頻 payload 被拒絕且不持久化。
- [ ] 7.11 [daodao-worker][2–4h] 實作 60 秒 reauth、75 秒 grace、owner kick 與 room close；驗收：reauth 不重複 joined，過期 connection 準時離線，非 owner 指令拒絕，close 通知所有 socket。
- [ ] 7.12 [daodao-worker][2–4h] 加入 structured telemetry 與資料最小化 helper；驗收：active room/connection/auth failure/room full/move rejected/unexpected close 可聚合，測試證明 log 不含 ticket、JWT、private data 或完整路徑。
- [ ] 7.13 [daodao-worker][2–4h] 完成 direct DO、`SELF.fetch` 與 WebSocket integration suite；驗收：ticket replay、room isolation、hibernation、supersede、capacity、move、wave、reauth、kick/close 全綠，`pnpm run typecheck && pnpm test` 通過。

## 8. P2 Frontend：Realtime Adapter 與介面

- [ ] 8.1 [daodao-f2e][2–4h] 定義 renderer-independent `RealtimeAdapter` 與 connection state machine；驗收：idle/connecting/authenticated/reconnecting/offline/room-full/kicked/closed 狀態與合法轉移有純函式測試。
- [ ] 8.2 [daodao-f2e][2–4h] 實作 session ticket 取得、URL 無 token、first auth frame、60 秒 refresh/reauth 與 destroy；驗收：ticket 不進 browser URL/analytics/error log，離開或換島會取消 timer、關 socket、忽略 late response。
- [ ] 8.3 [daodao-f2e][2–4h] 實作 bounded exponential backoff、重新取票與 snapshot reconciliation；驗收：暫時斷線可恢復、重複/已離線玩家被清理，達上限停止重試且內容探索不中斷。
- [ ] 8.4 [daodao-f2e][2–4h] 實作 local move 10Hz throttle、sequence 與 server canonical correction；驗收：render loop 不逐 frame 發 socket，非法/被拒位置平滑回最後 canonical state，unmount 不再送 frame。
- [ ] 8.5 [daodao-f2e][2–4h] 實作 remote avatar join/move/leave 與 interpolation；驗收：20 avatar 達 FPS gate、不外插超過最後合法位置、avatar 彼此不碰撞，同 user 不重複渲染。
- [ ] 8.6 [daodao-f2e][2–4h] 實作 wave/emoji picker、bubble expiry 與 accessibility label；驗收：只可選 allowlist、超頻錯誤不製造本地假成功、reduced motion 下仍能辨識 wave。
- [ ] 8.7 [daodao-f2e][2–4h] 實作島主 realtime settings、目前在線名單、kick 與 close room UI；驗收：只有 owner 看得到管理動作，server/worker 拒絕時 UI 回復，關閉後所有使用者降級非同步模式。
- [ ] 8.8 [daodao-f2e][2–4h] 實作 connecting/reconnecting/offline/room-full/kicked/superseded 狀態文案與 DOM live region；驗收：每種狀態有 zh-TW/en、可恢復動作明確、Canvas 與內容 Drawer 不被 connection error 阻塞。
- [ ] 8.9 [daodao-f2e][2–4h] 完成 realtime adapter/reducer/protocol unit tests；驗收：out-of-order、duplicate、late snapshot、unknown version、destroy race、reauth 與 rollback 分支全綠。
- [ ] 8.10 [daodao-f2e][2–4h] 建立兩 browser contexts 的 join/move/wave/leave/reconnect E2E 與不同 room isolation E2E；驗收：測試使用 preview-compatible transport，不以同頁 mock 代替，失敗保留 trace/screenshot。

## 9. Infra、Preview 與 Production Readiness

- [ ] 9.1 [daodao-infra][2–4h] 定義 preview/production Worker domain、allowed origins、DO bindings、ticket keyring/active kid 與 rotation runbook；驗收：secret 值不進 repo，兩環境完全分離，server/worker kid 對照可操作。
- [ ] 9.2 [daodao-infra][2–4h] 更新 CI/CD 以執行 Worker types/typecheck/tests、migration dry-run 與 preview deploy；驗收：任一 protocol/DO/config gate 失敗會阻止 deploy，既有 Worker health/action-maker smoke 維持。
- [ ] 9.3 [daodao-infra][2–4h] 新增 preview WebSocket smoke，實際完成 session→upgrade→auth→ready→move→close；驗收：使用短效測試帳號/secret、bounded timeout，失敗能區分 DNS/TLS/upgrade/auth/DO/protocol。
- [ ] 9.4 [daodao-infra][2–4h] 啟用 Worker structured observability 與基本 alert；驗收：auth failure、unexpected close、room full、move rejection、5xx/reconnect 指標可查，採樣與 retention 不保存精確軌跡。
- [ ] 9.5 [daodao-infra][2–4h] 撰寫 rollout/rollback 操作表；驗收：包含 2D percent 0→internal→small cohort→100、realtime owner→connections、緊急 0%、停止簽票、room close 與 key rotation 步驟。

## 10. 跨專案整合驗收與收尾

- [ ] 10.1 [daodao-f2e][2–4h] 執行完整品質 gate：`pnpm run lint`、`pnpm run typecheck`、`pnpm test`、production build 與 island visual E2E；驗收：全綠，2D chunk 不進非 island route，3D rollback baseline 無非預期 regression。
- [ ] 10.2 [daodao-server][2–4h] 執行完整品質 gate：`pnpm run lint`、`pnpm run typecheck`、`pnpm test`、OpenAPI regenerate 與 schema drift；驗收：全綠，generated artifacts 已同步，privacy/ticket/settings 測試可對應 spec scenarios。
- [ ] 10.3 [daodao-worker][2–4h] 執行完整品質 gate：`pnpm run typecheck`、`pnpm test`、Wrangler config validation 與 preview smoke；驗收：local runtime tests 與真實 preview handshake 都通過，不能以其中一個代替另一個。
- [ ] 10.4 [daodao-storage][2–4h] 執行全 schema、migration 重跑與 clean schema parity gate；驗收：無新漂移、無 presence/position table、forward deployment 對舊 server 安全。
- [ ] 10.5 [daodao][2–4h] 執行 spec traceability audit，將所有 requirements/scenarios（含共同挑戰／活動）對應到 unit/integration/E2E/preview 證據；驗收：每項有可重跑命令或明確人工實機紀錄，未驗證項不得標完成。
- [ ] 10.6 [daodao-worker][2–4h] 以 20 個已驗證 client 執行 preview soak，並驗證第 21 人降級；驗收：room isolation、CPU/error/reconnect/FPS 指標在門檻內，第 21 人仍能非同步瀏覽且不建立第二 instance。
- [ ] 10.7 [daodao-f2e][2–4h] 在目標中階手機完成入島、tap-to-walk、DOM 導覽、詳情、換島、斷線/滿房與 reduced-motion 實機驗收；驗收：保存裝置/瀏覽器/版本/FPS/可操作時間與問題證據。
- [ ] 10.8 [daodao][2–4h] 校準 `docs/product/island`、`scripts/product_status_manifest.yml` 與各 repo system-map；驗收：文件分別標示 local implementation、preview realtime、rollout 與 production evidence，不把部署路徑當成已上線證據。
- [ ] 10.9 [daodao][2–4h] Reconcile `island-3d` 與 `island-2d-spatial` 的衝突 requirement，再執行 `openspec validate island-2d-spatial`；驗收：main specs 不同時宣告互斥 3D/2D 預設，舊 change 的完成/取消/歸檔策略有書面紀錄。
- [ ] 10.10 [daodao][2–4h] 依 beta KPI 評估 2D renderer 與 co-presence 是否各自通過；驗收：以 baseline 比較互動率、效能、重連與安全指標，做保留/調整/rollback 決策，3D cleanup 必須另開 change。

## 11. 共同挑戰與活動情境（2026-09-12 需求補充）

- [x] 11.1 [daodao][2–4h] 校準 challenge/cohort/space 的成員來源、房間識別與內容隱私，更新 PRD/proposal/design/spec；驗收：明訂個人島、cohort、space 的 scope/ACL，不把 challenge 虛擬總覽當全站房間，現況有 source evidence。
- [x] 11.2 [daodao-f2e][2–4h] P0 增加個人島／共同挑戰／活動三情境可操作 fixture，兩畫風共享互動核心；驗收：desktop/390px 可切換、DOM 內容對應情境、不殘留舊 Canvas，mock 與正式能力清楚標示。
- [ ] 11.3 [daodao-f2e][2–4h] 將 world bootstrap/action types 泛化為 scope-aware contract，保留 personal adapter；驗收：cohort/space 不依賴個人島 owner 資料，未知 scope/id/action 被驗證拒絕且有純函式測試。
- [ ] 11.4 [daodao-storage][2–4h] 為 cohort/space 新增獨立 scope settings migration 與 clean schema；驗收：綁定既有來源 FK/唯一約束、realtime 預設 false，不複製 membership 或新增位置表，migration/parity 測試通過。
- [ ] 11.5 [daodao-server][2–4h] 建立 cohort/space world ACL resolver 並映射既有成員／主持權限；驗收：非好友成員可依 membership 加入、匿名/public token 無 realtime 權限、一般成員無 host capabilities，覆蓋退出/移除/取消/封存。
- [ ] 11.6 [daodao-server][2–4h] 新增 cohort/space 的已授權 world bootstrap 與 settings/session endpoints；驗收：內容隱私與room ACL分開、scope key穩定rollout、公開/私有/未知來源矩陣通過，沿用短效ticket與no-store契約。
- [ ] 11.7 [daodao-server/daodao-f2e][2–4h] 重生共享空間 OpenAPI並同步generated client/services；驗收：不手改生成物、保留個人島相容、新增錯誤分支與service測試。
- [ ] 11.8 [daodao-worker][2–4h] Room routing/ticket verification擴充canonical scope key；驗收：同program不同cohort、同id不同scope隔離，跨scope ticket拒絕，host control與60/75秒reauth測試通過。
- [ ] 11.9 [daodao-f2e][2–4h] 從具體挑戰／活動／space頁接入2D空間，綁定任務板/議程/資源DOM actions；驗收：非好友成員可入、私密內容不渲染、切換取消舊請求與session，錯誤可返回原活動。
- [ ] 11.10 [daodao-f2e/daodao-worker][2–4h] 加入共享空間雙client與mobile驗收；驗收：同場互見、跨場隔離、撤權/取消/滿房/斷線/結束後閱讀都有可重跑證據，不以原型mock代替正式API。
