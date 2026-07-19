# Tasks: island-3d

## 1. P0 素材 Spike（實作前置，gate：不過則調整素材策略再開工）

- [ ] 1.1 [素材] 整理參考圖包：從 `packages/assets/images/{quiz,users,dialog,emotion,brand}` 挑出各 3D 物件的參考圖與色票清單。驗收：`docs/product/island/spike/` 內有分組參考圖與對照表
- [ ] 1.2 [素材] 選定 image-to-3D 工具（Tripo/Meshy/Hunyuan3D 各試 1–2 物件）並產出人格角色（role-*）至少 1 隻可 rig、可播 idle/走路動畫的 GLB。驗收：瀏覽器 three.js 範例頁可載入並播動畫
- [ ] 1.3 [素材] 產出環境物件測試組（帳篷、營火、棕櫚樹、岩石）並跑 gltf-transform 壓縮。驗收：單物件 <5k tris，測試組總量符合 3MB 預算推估
- [ ] 1.4 [f2e] 手機效能基準：以測試素材組一個粗略場景，於中階手機實測 fps。驗收：30fps 可達，或產出需下修的面數/貼圖預算數字

## 2. Server：islandData 聚合端點

- [ ] 2.1 [server] 新增 `GET /api/users/:identifier/island`：聚合 profile、quiz 人格、實踐（含各實踐打卡統計與 checkin id 種子）、近 30 天打卡總量、viewerRelation；Zod schema 驗證。驗收：端點回傳完整 islandData JSON
- [ ] 2.2 [server] 隱私過濾：依觀看者身分過濾 `visibility`（public / connections_only 依關係 / 島主全見）。驗收：單元測試覆蓋三種觀看者情境，私有實踐不出現在訪客 payload（spec「訪客隱私過濾」情境全過）

## 3. f2e：IslandEngine 核心（純 three.js，零 React 依賴）

- [ ] 3.1 [f2e] 建立 engine 模組骨架（core/terrain/entities/controls/physics/assets）與 renderer、render loop、resize、品質分級。驗收：空場景可在測試頁渲染
- [ ] 3.2 [f2e] terrain：以 user_id 為種子的 deterministic 地形生成，五套人格主題參數＋中性預設。驗收：純函式單元測試——同種子輸出恆定、五主題參數各異
- [ ] 3.3 [f2e] assets：GLB 載入器（Draco/Meshopt）＋ manifest、載入失敗以簡單幾何體替代。驗收：缺檔時場景仍完整可玩
- [ ] 3.4 [f2e] controls：第三人稱角色控制器（桌機 WASD＋滑鼠視角＋滾輪縮放）＋ three-mesh-bvh 貼地與碰撞。驗收：桌機可流暢走動、不穿模
- [ ] 3.5 [f2e] controls：手機虛擬搖杆＋單指視角＋雙指縮放。驗收：實機可走動操作
- [ ] 3.6 [f2e] entities：實踐→建築映射（active 帳篷＋營火／completed 小木屋、theme_color 配色）＋走近/點擊發出 `onObjectClick`。驗收：單元測試映射規則；點擊觸發 callback
- [ ] 3.7 [f2e] entities：打卡→植栽（checkin id 種子、InstancedMesh）＋近 30 天打卡量→生態熱鬧度。驗收：單元測試位置/種類 determinism；數百株植栽 draw call 個位數
- [ ] 3.8 [f2e] 進場環島空拍 intro（可跳過）＋資產分批 lazy load。驗收：可走動時間 < 5 秒（本機量測）

## 4. f2e：頁面整合與 React 殼

- [ ] 4.1 [f2e] 新路由 `app/[locale]/island/[identifier]/page.tsx`（(with-layout) 外、全螢幕）：server component 撈 islandData → `<IslandCanvas>` dynamic import（ssr:false）。驗收：主站 bundle 體積不變（build 比對）
- [ ] 4.2 [f2e] React 殼：實踐詳情 Drawer（接 `onObjectClick`）、載入畫面、i18n 文案。驗收：點建築開 Drawer 顯示實踐與最近打卡
- [ ] 4.3 [f2e] 空島狀態（帳篷＋熄滅營火；島主見「點燃營火」CTA、訪客不見）＋未做 quiz 的中性島與 quiz 導流入口。驗收：spec 空島兩情境通過
- [ ] 4.4 [f2e] WebGL 偵測與 2D fallback、fps 採樣自動降品質、islandData 失敗錯誤頁＋重試。驗收：強制關 WebGL 顯示 fallback；模擬低 fps 觸發降級
- [ ] 4.5 [f2e] 個人頁 IslandHeader 加「上島」按鈕（i18n）。驗收：user-profile-page delta spec 情境通過

## 5. 素材正式產線

- [ ] 5.1 [素材] 依 Spike 選定工具量產 P1 全套素材（五人格角色＋通用旅人、帳篷、小木屋、營火燃/熄、植栽組、小動物、地形環境組）。驗收：manifest 齊全、壓縮後總量 ≤ 3MB
- [ ] 5.2 [素材][f2e] 素材入庫 `packages/assets/models/island/` 並接上 engine manifest。驗收：完整島嶼以正式素材渲染

## 6. 測試與驗收

- [ ] 6.1 [f2e] Playwright 煙霧測試：空島／滿島／訪客視角三狀態截圖比對。驗收：CI 可跑
- [ ] 6.2 [f2e][server] 對照 spec 全情境驗收清單逐項驗證（含實機手機測試），未過項回修。驗收：spec 所有 scenario 勾稽完成
