## Why

目前 `/island/[identifier]` 已是可走動的單人 3D 學習展示，但操作、素材與裝置效能成本偏高，也缺少讓訪島者「同時在場」的社交感。現在改為 Gather-like 的 2D top-down 空間，可以保留既有學習資料映射與個人島定位，同時用較低門檻驗證 co-presence 是否真的提升內容探索與連結行為。

## What Changes

- **BREAKING**：既有 island URL 的預設體驗由第三人稱 3D renderer 改為 2D top-down tile world；API URL、個人頁入口與公開分享連結維持不變。
- 新增獨立 2D island engine，以 deterministic map 將人格、實踐、打卡、人物誌與目的島映射為地圖、營地、植栽、告示牌與 portal。
- 桌機支援 WASD／方向鍵與點地尋路；手機以 tap-to-walk 為預設；所有核心內容另提供鍵盤與輔助科技可操作的 DOM 導覽。
- 沿用 server-side islandData 隱私過濾與 React Drawer／Bottom Sheet；additive 擴充 world bootstrap 與 realtime capabilities。
- 新增登入使用者的同島 co-presence：遠端 avatar、移動狀態、wave／emoji、重連與離線降級；匿名訪客仍可非同步探索，但不能加入 realtime room。
- 同一引擎支援個人島、共同挑戰與活動：共享空間綁定具體 cohort 或 space，沿用既有報名／成員與主持權限，不要求參與者先成為發起人的 connection。P0 增加三情境原型，正式 scope/API/入口接線列為明確工作。
- 新增島主 realtime visibility 與訪客控制；room session 以短效、單一島 scope 的 ticket 授權。
- 2D renderer 與 realtime 分階段以 feature flag rollout；驗證期保留既有 3D engine 與資產作 rollback，不在本 change 直接刪除。
- MVP 不將一般聊天或影音會議混入 island protocol；未來若需要永久文字歷史，須先泛化共用 chat capability。

## Non-goals

- proximity audio/video、screen share、裝置權限與 WebRTC/SFU/TURN 基礎設施。
- 公開／nearby 文字聊天、永久訊息歷史與匿名發言。
- 完整 Mapmaker、任意 tileset、iframe 或 script 上傳。
- 百人活動地圖、自動 instance 分流、跨島無縫航行與 avatar 間物理碰撞。
- 本輪移除 `island-engine`、GLB 資產或直接歸檔尚未完整驗收的 `island-3d` change。
- `daodao-ai-backend` 的 AI 生成或推薦能力。

## Capabilities

### New Capabilities

- `island-spatial-world`: 2D top-down 島嶼的 deterministic 地圖、學習資料映射、角色移動、碰撞、互動物件、mobile 操作、DOM 等價導覽、載入／錯誤／低效能降級與 3D rollback 行為。
- `island-realtime-presence`: 島嶼 room session 授權、同島玩家 snapshot 與位置同步、wave／emoji、room isolation、斷線重連、同房上限、島主訪客控制及濫用防護。
- `shared-spatial-spaces`: 共同挑戰／活動使用相同 2D engine 的內容、入口、scope identity、成員授權、場次隔離與 lifecycle；個人島 connection policy 不套用到活動成員。

### Modified Capabilities

- `user-profile-page`: 「上島」入口仍導向既有 `/island/[identifier]`，但目的體驗由 3D 島嶼改為 2D 空間小島，並在 feature flag rollback 時保持相同入口。

## Impact

- **daodao-f2e（主要）**：新增 `packages/features/island-world-2d` 與 2D assets/map；抽出 renderer-neutral island shell；加入 realtime adapter、remote avatar interpolation、DOM 導覽、feature flag、visual/E2E 與 mobile 驗證。現有 `packages/features/island-engine` 暫時保留。
- **daodao-server**：保留並擴充 `GET /api/v1/users/{identifier}/island`；新增 island session/ticket endpoint、capability/ACL 檢查與 OpenAPI contract。既有 practice privacy 必須維持 deny-first，無權資料不得進 bootstrap 或 ticket。
- **daodao-worker**：新增一島一個 coordination room 的 Durable Object/WebSocket 能力，處理 join/snapshot/move/leave/wave、頻率與速度驗證、heartbeat、重連及 observability；高頻位置不寫入 PostgreSQL。
- **daodao-storage**：renderer replacement 無 schema 需求；co-presence beta 前新增 `user_island_settings` 保存 access level、realtime enabled、map template/version。自由佈置與 persistent layout 後置。
- **daodao-infra**：新增 Worker/DO preview 與 production bindings、origin/CORS、ticket secrets、WebSocket smoke、structured logging 與告警。
- **daodao-admin-ui**：只有在既有治理能力不足時才新增 report/ban 操作面；需以獨立 task 明確驗證範圍。
- **daodao-ai-backend**：無變更。
- **OpenSpec 協調**：本 change supersede `island-3d` 的 renderer requirements；兩個 change 在歸檔前必須先 reconciliation，避免 obsolete 3D requirement 進入 main specs。若後續加入 durable text chat，需先與尚未實作的 `group-messages` change 統一 scope 與 contract。
