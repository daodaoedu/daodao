# 我的島嶼 3D — 可走動的學習世界 PRD

> 狀態：規劃中（spec 定稿，未實作）
> 日期：2026-07-18
> 靈感來源：Threads vibe coding 案例（@nekogato 森林探索、@annatt00 森林速食派對）——用 three.js + 免費 3D 素材快速做出可走動的網頁場景
> 相關文件：[island/prd.md](./prd.md)（我的小島完整版藍圖）、[buddy/ember-design.md](../buddy/ember-design.md)（營火視覺語彙）、[prd/learning-ecosystem.md](../prd/learning-ecosystem.md)（E5 + 指標戒律）

---

## 1. 使用者意圖

不是「看一個 3D 頁面」，而是三個真實意圖，同一座島同時服務：

1. **看見自己的累積**（島主自己）：自學進度隱形、無法被看見 → 島嶼把學習軌跡變成看得見、會長大的世界，成為回訪動力。
2. **對外展示身份**（島主對外）：學習軌跡散落無法證明 → 島嶼是可分享的學習歷程名片（發 Threads/IG、面試前出示）。
3. **社交探索誘因**（訪客）：拜訪別人的島、看別人在學什麼 → 促成連結／buddy／團，島嶼是社交入口。

## 2. 現況與缺口

- 個人頁 `/users/[identifier]` 已定名「我的小島」，但目前是 2D banner（沙灘插畫）+ 人格 Lottie，靜態、不可探索。
- 學習歷程呈現只有列表式（`me/footprints` 足跡、`mine` dashboard 統計卡），無空間化視覺。
- `learning-ecosystem.md` E5「我的小島完整版」本就規劃中；本功能是它的 3D 化路線。
- 前端無任何 three.js/WebGL 基礎，3D 是全新地基。

## 3. 產品決策記錄

| 決策點 | 結論 |
|---|---|
| 定位 | 產品內功能，獨立全螢幕頁 `/island/[identifier]` |
| 互動深度 | 角色可走動探索（第三人稱），桌機＋手機都要完整走動 |
| 素材 | 品牌素材與人格角色做成 3D，AI 圖轉 3D 生產 |
| 素材參考源 | 僅限 `packages/assets/images/` 下五個目錄：`quiz/`、`users/`、`dialog/`、`emotion/`、`brand/`（使用者指定） |
| 佈局 | 資料自動生成（deterministic）＋島主可微調 |
| 手機 | 虛擬搖杆完整走動，不降級為盤景 |

## 4. 資料映射（學習資料 → 島嶼物件）

### 4.1 實踐 → 建築/營地
- `active` 實踐＝帳篷＋燃燒中營火；`completed`＝小木屋（從紮營到定居的儀式感）。
- `draft`/`not_started`/`archived` 不上島（不做羞恥感視覺）。
- `theme_color` → 帳篷/屋頂/旗幟配色。
- 走近或點擊 → React Drawer 顯示實踐詳情＋最近打卡。
- **隱私過濾**：訪客只渲染 `visibility=public`（`connections_only` 依關係判斷）；過濾在 server 撈資料時完成，私有實踐不進訪客的 islandData。

### 4.2 打卡 → 植栽/生態（量流動、不量耐力）
- 每筆打卡在對應營地周圍長一株植物（種類以 checkin id 為種子、位置 deterministic）。
- 近 30 天全島打卡量 → 生態熱鬧度（小動物、蝴蝶、螢火蟲）。
- 打卡 `mood` 可對應 `emotion/` 表情元素。
- **禁做**：連續天數、斷卡枯萎、倒數計時等壓力視覺（learning-ecosystem 指標戒律）。

### 4.3 quiz 人格 → 地形主題
- 五種人格（active-shaper／community-connector／deep-explorer／order-builder／liquid-integrator）→ 五套地形參數（島形起伏、配色盤、環境物件組合）。
- 地形以 `user_id` 為亂數種子 deterministic 生成：同一人的島永遠長一樣，島主與訪客所見一致。
- 未做 quiz → 中性預設島＋「探索你的島嶼性格」入口（導流 quiz）。

### 4.4 社交 → 碼頭/訪島
- 島邊碼頭停靠小船＝連結/關注的人（最近互動 8–10 位＋「更多」名單）。
- 上船 → 確認彈窗「航向 ○○ 的島？」→ 出航過場 → 路由跳對方島（過場動畫吸收載入時間）。
- 訪客痕跡（腳印/留言）延後 P3 再議。

### 4.5 角色與人物誌（persona_answers）
- **操控角色永遠是自己的分身**：以自己的 quiz 人格角色（`role-*.webp` 泡泡角色）為造型；去別人島也是開自己的分身拜訪。未登入訪客用通用旅人造型。
- **自己的島**：無島主 NPC；人物誌掛在營地告示牌/篝火旁日誌本，走近可翻閱＋「補寫人物誌」入口。
- **別人的島**：島主分身以 NPC 站在營地，走近對話＝人物誌答案**原文輪播**（不做 AI 改寫，真實性優先）。未答題則說預設台詞。

### 4.6 空島狀態（新用戶）
- 只有一頂帳篷＋熄滅的營火；島主視角 CTA「開始第一個實踐，點燃營火」。

## 5. 技術架構

**混合式：vanilla three.js 引擎核心 + React 薄殼**（參考 Hyperfy `src/core`/`src/client` 劃分、Mozilla Hubs、Sketchbook）。

選型理由：場景內邏輯（走動/碰撞/動畫）vanilla 對 AI 迭代最友善、bundle 最小、不被 React 版本綁架；場景外 UI（彈窗/編輯/i18n）React 最順。不用 R3F 全家桶，也不用遊戲引擎。

### 5.1 路由與資料流
- 新路由 `app/[locale]/island/[identifier]/page.tsx`，位於 `(with-layout)` 之外（全螢幕、無 sidebar）。
- 個人頁 IslandHeader 加「上島」按鈕導入；sidebar `nav_my_island` 維持指向個人頁。

```
Server Component（page.tsx）
  └─ 撈 islandData：實踐＋打卡統計、quiz 人格、人物誌答案、
     連結/關注清單、（P2）自訂佈局   ※ 隱私過濾在此完成
        ↓ JSON props
Client Component <IslandCanvas>（dynamic import, ssr:false）
  └─ new IslandEngine(canvas, islandData, callbacks)
        ↓ callbacks（單向回拋）
React 殼：實踐 Drawer、人物誌對話框、佈局編輯 UI、載入畫面
```

**邊界鐵律**：React 不直接碰場景物件；engine 不 render DOM。溝通只有 `islandData` 初始化與事件 callback（`onObjectClick`、`onNearNpc`、`onReady`…）。

### 5.2 IslandEngine 模組（純 three.js，零 React 依賴）
- `core/`：renderer、render loop、resize、品質分級
- `terrain/`：seeded 地形生成（user_id ＋人格參數）
- `entities/`：營地、植栽、碼頭、告示牌/NPC
- `controls/`：第三人稱控制器——桌機 WASD/方向鍵＋滑鼠視角；手機虛擬搖杆＋單指視角/雙指縮放
- `physics/`：不上物理引擎，three-mesh-bvh 做貼地與碰撞
- `assets/`：GLB 載入（Draco/Meshopt），素材放 `packages/assets/models/island/`

## 6. 素材管線（AI 圖轉 3D）

### 6.1 參考素材對應表（僅限使用者指定五目錄）

| 3D 物件 | 參考素材 |
|---|---|
| 分身/島主 NPC | `quiz/role-{a,c,d,l,o}.webp`（依人格）＋對應 Lottie |
| 島嶼地形/海/植被 | `users/user-desktop-banner.png`（沙灘、棕櫚樹、岩石、貝殼、海鳥） |
| 人格地形主題差異 | 五套 quiz 人格 SVG/Lottie 配色與元素 |
| 打卡心情/生態氛圍 | `emotion/*.svg`、`celebrate.json` |
| 對話/提示物件 | `dialog/*.png` |
| 色盤/材質 | `brand/` ＋ `packages/design-tokens/src/colors.ts` |

無對應插畫的物件（帳篷、營火、碼頭、小船等）以文字 prompt 生成，用風格護欄約束。

### 6.2 生產流程
1. 從上表挑參考圖 → 餵 Tripo / Meshy / Hunyuan3D（image-to-3D），每物件 2–3 版挑最佳
2. Blender 清理：減面（每物件 < 5k 三角面）、品牌色材質、統一 scale/pivot
3. 角色 auto-rigging ＋ idle/走路動畫
4. `gltf-transform` 壓縮（Draco + WebP）→ `packages/assets/models/island/` ＋ `manifest.json`

**風格護欄**：低面數、圓潤無銳角、只用品牌色盤、無寫實貼圖。

### 6.3 開工前 Spike（1–2 天，P1 前置）
1. 人格角色轉 3D 品質可接受、可 rig 可播走路動畫——**全案最大風險**。fallback：角色手工建模/委外，其餘照常 AI 生。
2. 整島場景在中階手機 30fps——據此定面數/貼圖預算。

## 7. 操作、效能與降級

### 7.1 操作
- 桌機：WASD/方向鍵移動、滑鼠拖曳視角、滾輪縮放、`E`/點擊互動
- 手機：左下虛擬搖杆、單指視角、雙指縮放；近距離浮出互動按鈕
- 相機：第三人稱跟隨；進場環島空拍 intro（3 秒可跳過，兼作載入等待）
- 互動提示：可互動物件輕微發光＋頭頂圖示

### 7.2 效能預算
- 中階手機 30fps、桌機 60fps；可開始走動 < 5 秒
- GLB 總量 ~3MB；植栽/樹用 InstancedMesh；手機自動降陰影與 pixel ratio；資產 lazy load（地形角色先進，建築植栽逐批）
- 島嶼頁整包 dynamic import，主站 bundle 零影響

### 7.3 錯誤處理與降級
- WebGL 不可用 → fallback 2D 個人頁連結＋插畫（島嶼是加值層，不擋核心功能）
- islandData 失敗 → 錯誤頁＋重試；單一 GLB 失敗 → 簡單幾何體替代＋上報
- 低效能偵測（首 3 秒 fps 採樣）→ 自動低品質模式

### 7.4 測試
- Engine 核心（地形 determinism、資料映射、佈局序列化）：純函式單元測試，不需 WebGL
- 場景煙霧測試：Playwright 截圖比對（空島/滿島/訪客視角）
- **隱私過濾必測**：訪客看不到私有實踐（server 層單元測試）

## 8. 佈局微調（P2）

- 預設自動生成；島主進「整理小島」模式可移動建築位置、挑選展示哪些實踐。
- 佈局存 `user_island_layouts`（jsonb，daodao-storage migration 流程）；未自訂者用 deterministic 預設。
- 符合 Happy 心法：系統長出島（不用從零蓋）＋島主可微調（擁有感）。

## 9. 分期

| 期 | 內容 | 驗證什麼 |
|---|---|---|
| **P0 素材 Spike** | 五目錄素材餵 image-to-3D、角色 rig 驗證、手機效能基準 | 素材管線可行性 |
| **P1 核心閉環** | 走動探索自己的島：人格地形＋實踐營地＋打卡植栽，點擊看詳情；桌機＋手機操作；空島狀態 | 「看見累積」是否成立 |
| **P2 表達與擁有感** | 人物誌（告示牌/日誌本＋訪客對話 NPC）、佈局微調、分享（OG image/連結） | 「對外展示」與擁有感 |
| **P3 社交閉環** | 碼頭小船訪島、訪客痕跡、（未來）ember 共有營火上島 | 「社交探索」導流連結/團 |

## 10. 可控性檢查（agent-ux）

- [x] 不是 chat 介面——agent（自動生成島嶼）隱形融在體驗裡
- [x] 結果落在使用者預期內——deterministic 生成，資料↔物件映射明確可解釋
- [x] 可微調——P2 佈局編輯、挑選展示實踐
- [x] 成就感歸屬使用者——島上每個物件都對應使用者自己的行動（實踐、打卡、答題），AI 只負責擺盤
- [x] 人物誌原文呈現，不 AI 改寫

## 11. 相關既有程式與文件

- 前端：`daodao-f2e/apps/product/src/components/user/island-header.tsx`、`app/[locale]/(with-layout)/users/[identifier]/page.tsx`、`components/layout/sidebar/constant.tsx`
- 素材：`daodao-f2e/packages/assets/images/{quiz,users,dialog,emotion,brand}/`、`packages/design-tokens/src/colors.ts`
- Schema：`daodao-storage/schema/410_create_table_practices.sql`、`420_...checkins.sql`、`565_follows`/`567_connections`、`640_quiz_results`、`migrate/sql/040_create_persona_tables.sql`
- 架構參考：Hyperfy（`github.com/hyperfy-xyz/hyperfy`，three.js core + React 19 client）、Mozilla Hubs、swift502/Sketchbook、SimonDev 角色控制器教學、three.js 官方 `games_fps`

## 12. 下一步

- [ ] P0 素材 Spike（開工前必做）
- [ ] 轉 OpenSpec change（`openspec/changes/3d-island/`：proposal.md + design.md + tasks.md）
- [ ] 開 Notion 卡（`notion-card` skill）→ notion-pipeline 轉 Issue/PR
