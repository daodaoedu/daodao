# Proposal: 今日靈感卡（每日書摘分享）

## Why

島島阿學的核心體驗是「習慣養成 × 學習實踐」，但首頁「靈感」tab 的內容全部來自 UGC（實踐、打卡、互動卡），平台自身沒有任何「官方策展內容」的觸點。社群早期或冷啟動時段，feed 內容量不足，首頁缺乏每天都值得回來看一眼的理由。

團隊已整理出 40+ 條與產品精神高度對齊的書摘素材（《原子習慣》、《執行長日記》、《Rewire-神經可塑性》等，主題涵蓋習慣養成、紀律、神經可塑性），希望以「每日一則」的形式出現在首頁，成為：

1. **每日回訪誘因**——今天的卡片跟昨天不一樣。
2. **產品價值觀載體**——書摘主題（微小改變、系統勝過目標、用好習慣取代壞習慣）與「主題實踐 + 打卡」的產品機制互相呼應，卡片的行動建議可自然導流到建立實踐。
3. **可營運的內容位**——素材庫由後台管理，營運可持續擴充、下架、調整主題配比，不需工程介入。

現有系統中最接近的先例是 `checkin_encouragements`（打卡鼓勵語錄表，30 句系統預設 + 隨機顯示），本提案沿用同樣的「靜態素材表 + 選取邏輯」模式，但補上完整的後台管理與出處欄位。

## What Changes

- 新增 `daily_inspirations` 表：書摘素材庫（引文、行動建議、書名、作者、主題、啟用開關）
- 新增公開 API `GET /api/v1/inspirations/today`：依日期決定性輪播，回傳當日一則素材
- 新增後台 API `/api/v1/admin/inspirations`：素材 CRUD + 啟用開關
- 前端首頁「靈感」tab 新增 `InspirationCard` 元件：顯示當日書摘（引文 + 出處 + 行動建議）
- admin-ui「內容」分組新增「每日靈感」管理頁
- Seed data：首批 40 條書摘素材（8 本書，經人工校對後匯入）

## Capabilities

### New Capabilities

- `daily-inspiration-rotation`：每日一則的決定性輪播——同一天所有使用者看到同一則（Asia/Taipei 時區），跨日自動切換，無需排程任務
- `inspiration-library-management`：後台素材庫管理——CRUD、啟用/停用、主題篩選、排序
- `inspiration-card-display`：首頁今日靈感卡——引文、書名出處、可選的行動建議（hint），視覺語言沿用 ResonanceCarousel 的引號卡片風格

### Modified Capabilities

- 無（首頁僅新增一個獨立區塊，不動既有 feed 組裝邏輯）

## Impact

**DB（daodao-storage）**
- 新增 migration：`daily_inspirations` 表 + 首批 seed data
- 同步回寫 `schema/` 對應檔

**後端（daodao-server）**
- `prisma/schema.prisma` 同步新表 + `prisma:generate`
- 新增 route/controller/service：`inspiration.routes.ts`（public today + admin CRUD）
- Zod validators + `registry.registerPath`（讓 f2e 的 sync-openapi 自動生成型別）

**前端（daodao-f2e / product app）**
- `packages/api/src/services/inspiration.ts` + `inspiration-hooks.ts`（SWR）
- `apps/product/src/components/showcase/inspiration-card.tsx`
- 首頁 `(with-layout)/page.tsx` 插入卡片（ResonanceCarousel 與 feed 列表之間）
- i18n keys

**管理後台（daodao-admin-ui）**
- 新增 `/inspirations` 管理頁（「內容」分組）
- `src/api/admin-inspirations.ts` + `src/hooks/useInspirations.ts`（react-query）

**AI 服務（daodao-ai-backend）**
- 本階段**不動**（feed 插卡為 Phase 2，見 Non-goals）

## Non-goals

- **Feed 插卡（Slot B）**：ai-backend feed 引擎的 `SlotType.B` 已預留但未使用，把靈感卡混入動態流屬 Phase 2，本次不做
- **個人化選卡**：依使用者 practice 標籤 / persona 挑主題相符的書摘，留待 Phase 2 與 feed 插卡一起評估
- **分享圖（og-image）**：名言卡轉發分享圖，Phase 3
- **推播/信件整合**：weekly digest、打卡鼓勵混入書摘，Phase 3
- **使用者投稿**：本素材庫為官方策展；社群投稿已有獨立提案（`encouragement-messages`），兩者不混用
- **多語系素材**：MVP 僅 zh-TW（表結構保留 `locale` 欄位以備擴充）
- **mobile app**：MVP 僅 product web，Expo app 不在範圍

## Risks / Notes

- **素材著作權與正確性**：首批素材為 AI 整理的重點詮釋，**非原書逐字引文**。上線前需人工校對；卡片出處文案一律用「整理自《書名》」而非直引格式，避免誤植為原文
- **輪播穩定性**：素材數量變動（新增/停用）會改變 `日序 % 總數` 的對應，某天的卡片可能因此跳動——MVP 接受此行為，營運端知悉即可
