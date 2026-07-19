# P0 素材 Spike 計畫（island-3d 前置）

> 目的：在 P1 開工前驗證「AI 圖轉 3D」管線可行性——特別是人格角色的 rigging 與手機效能。
> 時程：1–2 天。Gate：任一驗收不過 → 回頭調整素材策略（fallback 見文末），不直接開工。
> 對應 OpenSpec tasks：`openspec/changes/island-3d/tasks.md` §1

## 1. 參考圖對照表（來源限定五目錄）

| 3D 物件 | 參考圖路徑（`daodao-f2e/packages/assets/images/`） | 備註 |
|---|---|---|
| 人格分身 ×5 | `quiz/role-a.webp`、`role-c.webp`、`role-d.webp`、`role-l.webp`、`role-o.webp` | 泡泡對話框造型角色；動態參考各人格 Lottie（`quiz/*-1.json`、`*-2.json`） |
| 島嶼地形/海灘 | `users/user-desktop-banner.png`、`user-mobile-banner.png` | 細沙、棕櫚樹、岩石、貝殼、海鳥 |
| 心情表情 | `emotion/{happy,fine,neutral,bored,frustrated,hopeless}.svg` | 打卡 mood 視覺；`celebrate.json` 慶祝動態 |
| 對話/提示 | `dialog/{info,success,warning}.png` | 對話 UI 風格參考 |
| 色盤 | `brand/` 全部 ＋ `packages/design-tokens/src/colors.ts` | 所有材質配色依據 |
| 無參考物件 | —（帳篷、小木屋、營火燃/熄、碼頭、小船、植栽組、小動物） | 文字 prompt 生成，掛風格護欄 |

**風格護欄 prompt 後綴（所有生成共用）**：low-poly、圓潤無銳角、卡通可愛、純色材質不用寫實貼圖、配色限定品牌色盤。

## 2. 工具評估（2026-07 查核）

| 工具 | 免費額度 | Rigging/動畫 | 幾何品質 | 適用 |
|---|---|---|---|---|
| **Tripo**（v3.x） | 300 credits/月（約 7 模型），免費層不可商用 | ✅ UniRig 多型態 rigging（雙足/四足/鳥/蛇型）＋11 組動畫 preset——**非人形泡泡角色的最佳選項** | 拓撲較乾淨，中度清理 | **角色首選** |
| **Meshy**（Meshy-6） | 100 credits/月（約 5 模型） | 標榜 auto-rig＋500 動畫 preset（第三方評測有出入，需實測驗證） | 拓撲評價較弱、清理量大 | 角色備選 |
| **Hunyuan3D**（hosted 3.1 / fal.ai） | fal.ai 註冊贈點；$0.16–0.48/模型 | ❌ 僅靜態 mesh | 重拓撲評測第一、幾乎免清理 | **靜態環境物件首選** |

- 建議組合：**角色走 Tripo（rig＋動畫）、環境物件走 Hunyuan3D（品質）**；Meshy 當角色備案。
- 授權：免費層皆不可商用——spike 驗證用免費層即可；正式量產需付費一個月（Tripo Pro 約 US$20/月）或用 fal.ai 按次計費。Hunyuan Community License 排除 EU/UK/KR，台灣可商用（<100 萬 MAU）。

## 2.5 混合路線（S2 對照組）：免費素材包＋品牌調色

社群主流做法（含兩篇靈感貼文）是直接用 CC0 素材包，只有品牌角色非 AI/自製不可。環境物件同時驗證兩條路，取風格與速度較優者：

| 來源 | 授權 | 對應物件 |
|---|---|---|
| Kenney（kenney.nl）Survival Kit / Nature Kit / Pirate Kit | CC0 | 帳篷、營火、樹、岩石、棕櫚樹、小船、碼頭 |
| KayKit（kaylousberg.itch.io）Forest Nature Pack | CC0 | 樹叢、草地、岩石；Adventurers 角色包當開發期角色替身（附 rig＋動畫） |
| Quaternius（quaternius.com）Animated Animals | CC0 | 生態小動物（含動畫） |
| Poly Pizza（poly.pizza） | CC0/CC-BY 混合 | 單件補缺（CC-BY 需署名） |
| Poly Haven（polyhaven.com） | CC0 | HDRI 環境光 |

做法：現成 GLB 進 Blender 換上品牌色純色材質（design tokens），確認與 AI 生成的角色同框不違和。

## 2.7 角色生成最佳實踐（2026-07-18 首輪實測後修訂）

首輪實測：`role-d.webp` 正面單圖直出 → 厚度足夠但呈「餅乾擠出」形（側面平直筒身）。修訂做法：

1. **輸入圖用 3/4 側視角**：先以圖像模型拿 `role-*.webp` 當參考生「同角色 3/4 視角、不拿道具、圓潤立體」的圖，再餵 Tripo
2. **道具與本體分開生成**：放大鏡等道具單獨生，引擎內組裝（動畫可獨立、rig 不互相干擾）
3. **跳過 AI Texture**：Blender 上品牌色 flat material（色準、檔小、省 credits）
4. **不 rig，用程式化動畫**：泡泡角色走路＝程式做彈跳＋squash & stretch（無四肢角色的社群主流做法），零 rig 風險
5. 免費 retry 燒完再花 credits；正面單圖不行才用 Tripo Multi-Views 功能

## 3. 驗收清單

- [ ] **S1 角色可用（修訂）**：3/4 視角輸入圖 → Tripo 生成身體（側面圓潤、非擠出形）＋道具單獨生成 → Blender 品牌色 flat material → three.js 測試頁以程式化動畫（彈跳＋squash & stretch）呈現走路，造型辨識度可接受（找 1–2 位同事盲測「這是島島的角色嗎」）。~~auto-rig 驗證~~ 改為可選項，不再是 gate
- [ ] **S2 環境物件可用（兩路對照）**：帳篷、營火、棕櫚樹、岩石各做 A/B——A 路 Hunyuan3D 生成、B 路 Kenney/KayKit 現成模型換品牌色。同框比較風格一致性與工時，擇優定案（可分物件混用）
- [ ] **S3 壓縮預算**：上述測試組跑 `gltf-transform`（Draco＋WebP），單物件 <5k tris；據此外推 P1 全套 ≤3MB 是否成立
- [ ] **S4 手機效能**：測試素材組一個粗略場景（地形＋角色＋20 物件＋100 株 InstancedMesh 植栽），中階手機實測 ≥30fps
- [ ] **S5 工具定案**：記錄各工具實測結果與量產成本估算，更新本文件

## 3.5 實測結論（2026-07-19）

- **S1 角色**：AI 路線（Tripo）二輪失敗（餅乾擠出形、對稱腦補多長尾巴）→ **改走 Blender bpy 腳本建模**：球身＋尾巴＋眼睛＋放大鏡全為基本幾何，品牌色直接寫入 material，壓縮後 **24KB**、~6k 面，程式化動畫（彈跳＋squash & stretch）取代 rigging。腳本可參數化量產五隻人格角色。吉祥物擬真度暫緩深究（使用者決策），現版為開發替身。
- **S2 環境物件**：**B 路（CC0 素材包）定案**。Kenney Survival／Nature／Pirate Kit 下載即用，貼圖用 `gltf-transform copy` 內嵌進 GLB。注意：**各包比例不一致**（帳篷 0.49 高 vs 棕櫚 4.25 高），須以角色身高為基準逐件定 scale；`tent.glb` 是骨架、要用 `tent-canvas.glb`。九件模型合計 396KB。
- **S3 壓縮**：gltf-transform Draco 壓縮率約 85%（角色 159KB→24KB）。
- **S4 效能**：測試場景（9 模型＋150 株 InstancedMesh 草＋角色）23 draw calls／2.2 萬面；桌機實測待使用者回報，手機待測。
- **教訓**：動畫必須疊加在資產基準 transform 上（base + offset），不可覆寫 position——否則角色沉入地面。

## 3.6 Spike 產物（2026-07-19 收尾）

- `build_role_d.py`——角色 bpy 建模腳本（球身＋尾巴＋眼睛＋放大鏡，design tokens 品牌色，Body/Magnifier 雙節點）
- `test-page/index.html`——完整島嶼測試場景：14 半徑島、9 件 Kenney 模型、400 株 InstancedMesh 草、程式化角色動畫、**WASD＋點擊地面雙操作**、相機跟隨、ACES 色調、營火光/棕櫚搖曳/浪圈
- `fetch-assets.sh`——一鍵重建所有模型（下載 Kenney 包→內嵌貼圖→Blender 建角色→Draco 壓縮）；生成物不進 repo
- 追加發現：**點擊地面移動天然適配手機（tap-to-move）**，虛擬搖杆可能整個省掉，待實機驗證
- 追加發現：click-to-move 就是「點營地→走過去→開實踐詳情」的互動基礎，P1 直接沿用

## 4. Fallback 路線

- S1 不過（3/4 視角＋Multi-Views 仍生不出可用身形）→ 角色改手工建模或委外（泡泡幾何極簡，Blender 手工成本低），環境物件照常 AI 生
- S2 A 路不過（AI 生成風格不一致）→ 全面改走 B 路（CC0 素材包＋品牌調色），之後再逐步替換成品牌版
- S4 不過 → 下修面數/貼圖預算、砍陰影，重測；仍不過才考慮縮小島或降互動範圍
