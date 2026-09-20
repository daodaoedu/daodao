# Design: island-3d

## Context

個人頁 `/users/[identifier]` 已定名「我的小島」，現為 2D banner（沙灘插畫）＋ quiz 人格 Lottie；學習歷程僅有列表式呈現（footprints、mine dashboard）。前端無任何 three.js/WebGL 基礎。完整產品脈絡與決策記錄見 `docs/product/island/3d-island-prd.md`。

## Goals / Non-Goals

**Goals:**
- P1 核心閉環：使用者能以自己的人格分身在自己的（或他人公開的）3D 島上走動，島上物件忠實映射實踐與打卡資料
- 建立可長期迭代的 3D 技術地基（engine/React 邊界）與素材管線
- 桌機 60fps／中階手機 30fps、可走動 < 5 秒、主站 bundle 零影響

**Non-Goals:**
- 佈局編輯、人物誌對話、訪島社交（P2/P3 另開 change）
- 即時多人同島
- 壓力型指標視覺（永久禁做）

## Decisions

### D1：混合式架構——vanilla three.js core ＋ React 薄殼
- **選擇**：`IslandEngine` 純 three.js class（零 React 依賴），React client component 掛載並以 callback 接事件。
- **替代方案**：R3F 全家桶（宣告式但多一層抽象、bundle 大、被 React reconciler 版本綁定）；遊戲引擎 Web 匯出（體積與整合成本壓倒優點）。
- **理由**：場景邏輯 vanilla 對 AI 迭代最友善；UI 邏輯留在 React。參考 Hyperfy `src/core`/`src/client`、Mozilla Hubs、Sketchbook。
- **邊界鐵律**：React 不碰場景物件；engine 不 render DOM；溝通僅 `islandData` 初始化＋事件 callback。

### D2：碰撞用 three-mesh-bvh，不上物理引擎
走路貼地＋擋牆不需要剛體模擬；省下 rapier/PhysX 的 wasm 體積與複雜度。

### D3：deterministic 生成
地形與植栽位置以 `user_id`／checkin id 為亂數種子——同一人的島恆定，島主與訪客所見一致，且純函式可單元測試。

### D4：隱私過濾在 server 端
訪客的 islandData 由 server component（呼叫 server API）過濾：僅 `visibility=public`（`connections_only` 依關係判斷）。私有實踐不進 payload，前端無從洩漏。

### D5：路由獨立於 (with-layout)
`app/[locale]/island/[identifier]/page.tsx` 全螢幕無 sidebar；島嶼頁整包 dynamic import（`ssr: false`），three.js 不進主站 bundle。

### D6：素材管線
參考源限定 `packages/assets/images/{quiz,users,dialog,emotion,brand}`；image-to-3D（Tripo/Meshy/Hunyuan3D）→ Blender 清理（<5k tris/物件、品牌色材質）→ gltf-transform 壓縮（Draco＋WebP）→ `packages/assets/models/island/` ＋ manifest。風格護欄：低面數、圓潤、品牌色盤、無寫實貼圖。

### D7：API 設計
新增聚合端點（RESTful，Zod 驗證）：`GET /api/users/:identifier/island` → `{ profile, personaType, practices[]（含打卡統計與植栽種子）, ecosystemLevel, viewerRelation }`。一次往返供齊 islandData，避免瀑布式請求。

## Risks / Trade-offs

- [人格角色 image-to-3D 品質不可用／無法 rig] → P0 Spike 先驗證；fallback：角色手工建模/委外，環境物件照常 AI 生
- [中階手機效能不達 30fps] → InstancedMesh、降陰影/pixel ratio、fps 採樣自動降品質；Spike 定面數預算
- [WebGL 不可用] → 2D fallback（個人頁連結＋插畫），島嶼是加值層不擋核心功能
- [GLB 載入慢] → 總量 ~3MB、lazy load 分批進場、環島空拍 intro 吸收等待
- [vanilla three.js 缺框架約束，程式碼易發散] → engine 模組邊界（core/terrain/entities/controls/physics/assets）寫入 tasks，核心邏輯純函式化並強制單元測試

## Migration Plan

純新增功能：新路由＋新端點，無 schema 變更、無既有行為修改（個人頁僅加入口按鈕）。上線可用 feature flag 或 soft launch（先不加入口、以直連 URL 內測）；rollback 即移除入口。

## Open Questions

- image-to-3D 工具選型與帳號（Tripo vs Meshy vs Hunyuan3D）——P0 Spike 決定
- `IslandEngine` 放 `packages/features/island-engine` 或 `apps/product/src/lib/`——實作時依 monorepo 慣例定
- islandData 端點做在既有 user API 擴充或新 controller——實作時看 server 結構
