# Proposal: island-3d 我的島嶼 3D 可走動學習世界

> 依據：`docs/product/island/3d-island-prd.md`（2026-07-18 定稿）
> 本 change 範圍：P0 素材 Spike + P1 核心閉環（P2 佈局微調/人物誌、P3 社交訪島另開 change）

## Why

自學者的學習累積不可見——進度隱形、無法對外展示與證明；learning-ecosystem E5「我的小島完整版」規劃已久但缺具體方案。本 change 把個人頁「我的小島」從靜態 2D banner 升級為可走動探索的 3D 島嶼：學習軌跡（實踐、打卡、人格）變成看得見、會長大的世界，服務「看見累積、對外展示、社交探索」三重意圖。

## What Changes

- 新增獨立全螢幕路由 `/island/[identifier]`：第三人稱可走動 3D 島嶼（桌機 WASD＋滑鼠視角；手機虛擬搖杆），操控角色為登入者的 quiz 人格分身
- 資料映射（P1）：active 實踐→帳篷＋營火、completed→小木屋；打卡→營地周圍植栽與生態熱鬧度；quiz 人格→五套地形主題（以 user_id 為種子 deterministic 生成）；空島狀態 CTA
- 技術地基：vanilla three.js `IslandEngine`（零 React 依賴）＋ React 薄殼（dynamic import、事件 callback），three-mesh-bvh 碰撞、不上物理引擎
- AI 圖轉 3D 素材管線：參考源限定 `packages/assets/images/{quiz,users,dialog,emotion,brand}`，GLB＋Draco/WebP 壓縮，總量 ~3MB
- 個人頁 IslandHeader 加「上島」入口按鈕
- 隱私過濾：訪客 islandData 於 server 端過濾（僅 `visibility=public`；`connections_only` 依關係）
- 降級策略：WebGL 不可用→2D fallback；低效能自動降品質
- **P0 Spike（實作前置）**：人格角色 image-to-3D 品質與 rigging 驗證、中階手機 30fps 基準

## Capabilities

### New Capabilities
- `island-3d`: 可走動 3D 島嶼頁——路由與進場、走動操作（桌機/手機）、資料→島嶼物件映射、deterministic 地形生成、隱私過濾、效能預算與降級、素材資產格式要求

### Modified Capabilities
- `user-profile-page`: 個人頁新增「上島」入口，導向該使用者的 3D 島嶼頁

## Non-goals

- 佈局微調編輯器、人物誌告示牌/NPC 對話、分享 OG image（P2，另開 change）
- 碼頭/小船訪島、訪客痕跡、ember 共有營火（P3，另開 change）
- 連續打卡天數、斷卡枯萎等壓力型視覺（learning-ecosystem 指標戒律，永久禁做）
- 即時多人同島（非目標，島是非同步空間）
- 新增 DB 表（P1 全部讀既有資料；`user_island_layouts` 屬 P2）

## Impact

- **f2e**（主要）：`apps/product` 新路由與 `IslandCanvas` client component；新 `IslandEngine` 模組（建議 `packages/features/island-engine` 或 app 內 `src/lib/island-engine/`）；新依賴 `three`、`three-mesh-bvh`（dynamic import 隔離，主站 bundle 零影響）；`packages/assets/models/island/` 新 GLB 資產
- **server**：新增（或擴充既有）islandData 聚合端點——實踐＋打卡統計、quiz 結果、關係判斷與隱私過濾
- **storage**：無 schema 變更（P1）
- **ai-backend / worker**：不受影響
- **素材製作流程**（repo 外）：Tripo/Meshy/Hunyuan3D 圖轉 3D ＋ Blender 清理 ＋ gltf-transform 壓縮
