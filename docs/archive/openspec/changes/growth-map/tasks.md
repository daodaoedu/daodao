## 1. DB Migration（daodao-storage）

- [ ] 1.1 新增 `skills_nodes` 表 migration SQL（SERIAL PK，`user_id INT REFERENCES users(id) ON DELETE CASCADE`，`primary_pillar TEXT + CHECK 8 值`，`secondary_pillars TEXT[]`，`level4_subskills TEXT[]`，`status TEXT CHECK ('seed','solid')`，`is_manual_override BOOLEAN`，`pinned_footprint_id INT`）；驗收：migration up/down 皆可乾淨執行，CHECK constraint 拒絕非法 pillar 值
- [ ] 1.2 新增 `footprints` 表 migration SQL（SERIAL PK，`node_id INT REFERENCES skills_nodes(id) ON DELETE CASCADE`，`content TEXT NOT NULL`，`media_url VARCHAR(255)`）；驗收：刪除 skills_node 時 cascade 刪除關聯 footprints
- [ ] 1.3 新增 `practice_checkin_footprints` 橋接表 migration SQL（`checkin_id UNIQUE` 防止重複橋接）；驗收：同一 checkin_id 插入兩次觸發 unique violation
- [ ] 1.4 新增 `practices.default_pillar` 欄位（`TEXT DEFAULT NULL + CHECK 8 值 OR NULL`）；驗收：既有 practices 資料不受影響，新欄位預設為 NULL
- [ ] 1.5 新增 `skills_nodes.pinned_footprint_id` FK constraint（延遲建立，ON DELETE SET NULL）；驗收：刪除被 pin 的 footprint 後，pinned_footprint_id 自動設為 NULL

## 2. 後端：技能節點 CRUD API（daodao-server）

- [ ] 2.1 建立 `skill-node.service.ts`（factory pattern），實作 `getAll(userId)`——查詢使用者所有節點，on-read 計算 cooling 狀態（solid + updated_at > 30 天 → cooling）；驗收：unit test 覆蓋 seed/solid/cooling 三種狀態回傳
- [ ] 2.2 實作 `create(userId, data)` 與 `update(id, userId, data)` service functions；驗收：非本人節點操作回傳 403；`is_manual_override` 設為 true 時記錄覆寫
- [ ] 2.3 實作 `delete(id, userId)` service function（cascade 由 DB 處理）；驗收：刪除後關聯 footprints 與 practice_checkin_footprints 一併清除
- [ ] 2.4 實作 `merge(sourceId, targetId, userId)` service function——轉移 footprints、合併 secondary_pillars 與 level4_subskills（去重）、刪除 source 節點；驗收：unit test 驗證 footprints 轉移正確、陣列合併去重、source 節點已刪除
- [ ] 2.5 建立 `skill-node.controller.ts` + `skill-node.routes.ts`，註冊 5 個 endpoints（GET list / POST create / PATCH update / DELETE / POST merge），全部加 auth middleware；驗收：未認證 401、非擁有者 403
- [ ] 2.6 在 `skill-node.validators.ts` 建立 Zod request/response schemas（pillar enum、label 長度 1-50、level4_subskills 每項長度 ≤ 50）；驗收：非法 pillar 值回傳 400

## 3. 後端：足跡 CRUD API（daodao-server）

- [ ] 3.1 建立 `footprint.service.ts`，實作 `getByNodeId(nodeId, userId, pagination)`、`create(nodeId, userId, data)`、`delete(id, userId)`；驗收：分頁參數正確、新增第 3 筆 footprint 時觸發節點 seed → solid 升級
- [ ] 3.2 實作 seed → solid 自動升級邏輯：`create` 完成後計算該節點 footprint 總數，≥ 3 且 status='seed' 時 UPDATE 為 'solid'；驗收：unit test 覆蓋第 2 筆（不升級）與第 3 筆（升級）邊界
- [ ] 3.3 建立 `footprint.controller.ts` + `footprint.routes.ts`，註冊 3 個 endpoints（GET list / POST create / DELETE），auth middleware 驗證節點歸屬；驗收：操作他人節點的 footprint 回傳 403
- [ ] 3.4 建立 Zod schemas（content 長度 1-2000，media_url 可選 URL 格式）；驗收：空 content 回傳 400

## 4. 後端：Practice → Footprint 橋接（daodao-server）

- [ ] 4.1 建立 `checkin-bridge.service.ts`，實作橋接邏輯：查詢 Practice 是否有對應 skills_node → 有則直接新增 footprint → 無則呼叫分類引擎建立節點再新增 footprint；驗收：unit test 覆蓋「已有節點」與「需新建節點」兩條路徑
- [ ] 4.2 在打卡 service（`practice-checkin.service.ts`）寫入成功後，dispatch BullMQ job `bridge-checkin-to-footprint`；驗收：打卡成功後 job 被正確 enqueue，打卡失敗時不 enqueue
- [ ] 4.3 實作 BullMQ worker 處理 `bridge-checkin-to-footprint` job（retry 3 次 + dead letter queue）；驗收：job 失敗 3 次後進入 DLQ，不影響原始打卡記錄
- [ ] 4.4 在 `practice_checkin_footprints` 表插入橋接記錄，確保 `checkin_id` unique 防重複；驗收：同一 checkin 重複觸發橋接時不建立重複 footprint

## 5. AI 服務：技能分類端點（daodao-ai-backend）

- [ ] 5.1 新增 `POST /api/v1/skill-classification/classify` FastAPI 端點，接收 `{ text, context }`，回傳 `{ primary_pillar, confidence, level4_subskills }`；驗收：回傳 JSON 格式正確，primary_pillar 為 8 個合法值之一
- [ ] 5.2 撰寫 system prompt：包含 8 大支柱定義 + Level 4 微觀技能清單，要求嚴格 JSON 回應；驗收：手動測試 10 筆中文打卡文字，分類準確率 ≥ 80%
- [ ] 5.3 實作模型 fallback（GPT-4o-mini 主 → DeepSeek-Chat 備援），呼叫失敗時回傳 `{ primary_pillar: null, confidence: 0, level4_subskills: [] }` 而非 500；驗收：模擬主模型超時後正確切換備援
- [ ] 5.4 新增 Pydantic request/response models + 單元測試；驗收：非法 input 回傳 422

## 6. 前端：D3.js 力導向圖核心（daodao-f2e / product app）

- [ ] 6.1 安裝 `d3` 依賴（僅引入 `d3-force`、`d3-selection`、`d3-drag`、`d3-scale` 子模組以控制 bundle size）；驗收：`pnpm install` 無 peer dependency 衝突，tree-shaking 後 d3 相關 < 30KB gzip
- [ ] 6.2 建立 `GrowthMap` React component（`/components/growth-map/growth-map.tsx`），實作 SVG 容器 + 8 個引力錨點（θ_i = i × π/4 - π/8，r = 220px）+ `d3.forceSimulation` 初始化；驗收：空地圖渲染 8 個支柱標籤，simulation 穩定收斂
- [ ] 6.3 實作技能節點 SVG 圓形渲染——seed（虛線 stroke-dasharray）、solid（實線 + 外發光 filter）、cooling（降低 opacity 至 0.4）；驗收：三種狀態視覺可區分
- [ ] 6.4 實作 Hybrid Halo——有 `secondary_pillars` 時以 SVG `<linearGradient>` 渲染混色外圈（顏色對應次要支柱）；驗收：雙支柱節點顯示漸層外圈
- [ ] 6.5 實作 Tooltip——hover 節點時顯示 label + Level 4 微觀技能 tags；驗收：tags 正確顯示，離開節點後 Tooltip 消失
- [ ] 6.6 使用 `next/dynamic` 動態 import `GrowthMap` component，避免 SSR 與首屏 bundle 過大；驗收：首頁 bundle 不包含 d3 程式碼

## 7. 前端：節點互動操作（daodao-f2e / product app）

- [ ] 7.1 實作節點拖曳（`d3.drag`），拖曳時暫停 simulation alpha decay，放開後恢復；驗收：60fps 拖曳流暢，放開後節點回到引力平衡位置
- [ ] 7.2 實作節點合併互動——拖曳重疊 1.5 秒觸發合併確認 Modal（顯示兩節點資訊 + 不可逆警告 + 確認/取消按鈕）；驗收：1.5 秒計時器正確觸發；確認後呼叫 merge API 並更新圖形
- [ ] 7.3 實作節點右鍵/長按選單——編輯 label、手動覆寫分類、刪除節點；驗收：覆寫分類後 `is_manual_override` 正確設為 true

## 8. 前端：Growth Map 頁面與 API Client（daodao-f2e）

- [ ] 8.1 在 `@daodao/api` 新增 skill-nodes 與 footprints 的 client functions（getAll / create / update / delete / merge / getFootprints / createFootprint / deleteFootprint）+ Zod response schemas；驗收：TypeScript 無 any
- [ ] 8.2 建立 `/growth-map` 頁面（呼叫 getAll API → 傳入 GrowthMap component → 側邊欄顯示選中節點的 footprints 列表）；驗收：頁面載入後正確渲染使用者的技能地圖
- [ ] 8.3 實作「新增技能節點」UI 入口（按鈕 → 表單：label + 手動選擇 pillar 或留空讓 AI 分類）；驗收：手動選擇 pillar 時不呼叫 AI；留空時呼叫 AI 回填
- [ ] 8.4 實作「新增足跡」UI（選中節點後可在側邊欄輸入文字 + 可選圖片 URL）；驗收：新增後節點 footprint 數量更新，第 3 筆時節點視覺從 seed 變為 solid

## 9. 前端：分類引擎（前端 Regex 層）（daodao-f2e）

- [ ] 9.1 建立 `WEF_8_REGEX_DICTIONARY` 常數（8 組中英雙語 regex patterns），每組包含高權重與低權重 patterns；驗收：unit test 覆蓋 8 個支柱各至少 3 個正例與 1 個反例
- [ ] 9.2 實作 `classifyByRegex(text: string): { pillar: string; confidence: number } | null` utility function，累加計分後回傳最高分支柱（confidence > 0.7 採用，否則回傳 null）；驗收：unit test 驗證邊界值 0.7 的行為

## 10. 整合測試與收尾

- [ ] 10.1 端對端測試：手動建立技能節點 → 新增 3 筆 footprint → 確認 seed → solid 升級 → D3 圖上視覺正確切換；驗收：全流程無錯誤
- [ ] 10.2 端對端測試：打卡一筆 practice check-in → 確認 BullMQ bridge job 執行 → footprint 出現在 Growth Map 對應節點下；驗收：橋接延遲 < 5 秒
- [ ] 10.3 端對端測試：拖曳兩個節點合併 → 確認 footprints 轉移 → 圖上僅剩一個節點；驗收：合併後 footprint 數量 = 兩節點之和
- [ ] 10.4 效能測試：模擬 50 個節點 + 200 個 footprints 的力導向圖渲染，確認 simulation 收斂時間 < 2 秒、拖曳 60fps；驗收：Chrome DevTools Performance panel 無 long task > 50ms
- [ ] 10.5 （低優先級）在 Practice 總結頁的「下一步」區塊新增 Growth Map 連結入口；驗收：連結正確導向 `/growth-map`
