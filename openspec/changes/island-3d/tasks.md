# Tasks: island-3d

## 1. P0 素材 Spike（實作前置，gate：不過則調整素材策略再開工）

- [x] 1.1 [素材] 整理參考圖包：從 `packages/assets/images/{quiz,users,dialog,emotion,brand}` 挑出各 3D 物件的參考圖與色票清單。驗收：`docs/product/island/spike/` 內有分組參考圖與對照表（見 `p0-spike-plan.md` §1）
- [x] 1.2 [素材] 人格角色產線驗證：image-to-3D（Tripo）二輪失敗後改走 Blender bpy 腳本建模（`build_role_d.py`），程式化動畫（彈跳＋squash & stretch）取代 rigging。驗收：`test-page/index.html` 可載入並播走路動畫（壓縮後 24KB）
- [x] 1.3 [素材] 環境物件測試組定案 B 路（Kenney CC0 素材包＋品牌調色，九件 396KB）並跑 gltf-transform Draco 壓縮（壓縮率 ~85%）。驗收：單物件 <5k tris，3MB 預算推估成立
- [ ] 1.4 [f2e] 手機效能基準：以測試素材組一個粗略場景，於中階手機實測 fps。驗收：30fps 可達，或產出需下修的面數/貼圖預算數字

## 2. Server：islandData 聚合端點

- [x] 2.1 [server] 新增 `GET /api/v1/users/:identifier/island`：聚合 profile、quiz 人格、實踐（含各實踐打卡統計與 checkin id 種子）、近 30 天打卡總量、viewerRelation；Zod schema 驗證。驗收：端點回傳完整 islandData JSON（branch `feat/island-3d`，OpenAPI contract 已重生成）
- [x] 2.2 [server] 隱私過濾：依觀看者身分過濾（雙欄位 deny 優先：`privacy_status` public/delayed/private ＋ `visibility` public/connections_only/private，connections_only 依關係）。驗收：單元測試 15 項全過，覆蓋 self/connection/visitor 三種觀看者情境，私有實踐不出現在訪客 payload（spec「訪客隱私過濾」情境全過）

## 3. f2e：IslandEngine 核心（純 three.js，零 React 依賴）

- [x] 3.1 [f2e] 建立 engine 模組骨架（core/terrain/entities/controls/physics/assets）與 renderer、render loop、resize、品質分級。驗收：空場景可在測試頁渲染（新 package `packages/features/island-engine`，測試頁 `pnpm dev:page`，headless 截圖驗證通過）
- [x] 3.2 [f2e] terrain：以 user_id 為種子的 deterministic 地形生成，五套人格主題參數＋中性預設。驗收：純函式單元測試——同種子輸出恆定、五主題參數各異（vitest 19 項全過）
- [x] 3.3 [f2e] assets：GLB 載入器（Draco/Meshopt）＋ manifest、載入失敗以簡單幾何體替代（永不 reject、同 key 快取）。驗收：缺檔時回傳 fallback 幾何體，單元測試覆蓋
- [x] 3.4 [f2e] controls：第三人稱角色控制器（桌機 WASD＋滑鼠視角＋滾輪縮放）＋ three-mesh-bvh 貼地與碰撞（水線邊界＋建築圓形擋牆）。驗收：headless 瀏覽器驗證走動、相機跟隨、擋牆；移動/碰撞純函式單元測試
- [ ] 3.5 [f2e] controls：手機虛擬搖杆＋單指視角＋雙指縮放。驗收：實機可走動操作（**實作完成**，pointer events＋pinch；實機驗證與 1.4 一併進行；spike 發現 tap-to-move 可能取代搖杆，實機測後定案）
- [x] 3.6 [f2e] entities：實踐→建築映射（active 帳篷＋營火／completed 小木屋、theme_color 配色）＋走近/點擊發出 `onObjectClick`。驗收：單元測試映射規則；瀏覽器實測點擊帳篷觸發 callback（raycast picking＋E/Enter 互動鍵）
- [x] 3.7 [f2e] entities：打卡→植栽（checkin id 種子、InstancedMesh 分 4 種類）＋近 30 天打卡量→生態熱鬧度（0–3 級氛圍光點，只加不減）。驗收：單元測試位置/種類 determinism；數百株植栽 draw call ≤4
- [x] 3.8 [f2e] 進場環島空拍 intro（可跳過，任何輸入或 `skipIntro()` 跳過；結束姿態與第三人稱相機共用純函式無縫接手）＋資產分批 lazy load（角色優先、建築逐棟進場、植栽同步）。驗收：本機量測可走動 669ms < 5 秒（`getTimeToWalkable()`＋`onWalkable` 事件供 React 殼使用）

## 4. f2e：頁面整合與 React 殼

- [x] 4.1 [f2e] 新路由 `app/[locale]/island/[identifier]/page.tsx`（(with-layout) 外、全螢幕）：server component 撈 islandData（SSR 手動轉發 auth_token cookie）→ `<IslandCanvas>` dynamic import（ssr:false）。驗收：build 比對——three.js 僅在 async chunk、不在任何 route 的 First Load JS，shared bundle 維持 103kB
- [x] 4.2 [f2e] React 殼：實踐詳情 Drawer（Sheet 接 `onObjectClick`，含最近打卡＋心情＋查看實踐連結）、載入畫面（onWalkable 收掉）、i18n 文案（新 `island` namespace，zh-TW/en）。驗收：typecheck/build 通過；點建築開 Drawer 的執行期驗證併入 6.1 煙霧測試
- [x] 4.3 [f2e] 空島狀態（engine 渲染帳篷＋熄滅營火；島主見「點燃營火」CTA、訪客不見）＋未做 quiz 的中性島與 quiz 導流入口。驗收：空島佈局單元測試通過；spec 情境執行期驗證併入 6.1
- [x] 4.4 [f2e] WebGL 偵測與 2D fallback（插畫＋返回個人頁）、fps 採樣自動降品質（<24fps 降一級至 low）、islandData 失敗錯誤頁＋重試。驗收：實作完成；強制關 WebGL / 模擬低 fps 的驗證併入 6.1
- [x] 4.5 [f2e] 個人頁 IslandHeader 加「上島」按鈕（i18n `app_product.user_enter_island`，全部觀看者可見）。驗收：導向 `/island/[identifier]`，user-profile-page delta spec 情境對應實作完成

## 5. 素材正式產線

- [ ] 5.1 [素材] P1 素材集（**部分完成**）：一鍵產線 `scripts/island-models/build.sh`——Kenney CC0（帳篷、營火×2、棕櫚×2、岩石、草皮）＋bpy 小木屋＋KayKit Mage rigged 角色替身（CC0，Idle/Walk 動畫接 AnimationMixer）。壓縮後 2.63MB ≤ 3MB。**未完**：五人格角色＋通用旅人待吉祥物設計定案（bpy 泡泡腳本保留）；角色 GLB 帶 90 支剪輯待裁剪
- [x] 5.2 [素材][f2e] 素材入庫 `packages/assets/models/island/` 並接上 engine manifest（apps/product 以 predev/prebuild 同步到 public）。驗收：完整島嶼以正式素材渲染（測試頁截圖驗證）

## 6. 測試與驗收

- [ ] 6.1 [f2e] Playwright 煙霧測試：空島／滿島／訪客視角三狀態截圖比對。驗收：CI 可跑
- [ ] 6.2 [f2e][server] 對照 spec 全情境驗收清單逐項驗證（含實機手機測試），未過項回修。驗收：spec 所有 scenario 勾稽完成
