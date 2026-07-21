## Phase 1 前置確認

- [ ] 0.1 確認 Phase 1（practice-summary-core）全部上線——AI 洞察、總結頁、Public View、.txt 匯出
- [ ] 0.2 確認 `practices.reflection` 欄位已存在於 production DB
- [ ] 0.3 確認 `practice_social_proofs` 表已存在於 production DB

## 1. AI Backend：Model 補齊與品質門檻（daodao-ai-backend）

- [ ] 1.1 在 `src/models/Practice.py` 的 `Practice` class 新增 `reflection = Column(Text, nullable=True)`；驗收：`python -c "from src.models.Practice import Practice; assert hasattr(Practice, 'reflection')"` 通過
- [ ] 1.2 在 `src/services/insight/insight_service.py` 的 `get_pending_practices()` 新增品質門檻條件：`Practice.progress_percentage >= 80` + `AVG(LENGTH(PracticeCheckIn.note)) >= 50` correlated subquery；驗收：單元測試覆蓋以下情境——(a) 進度 80% + 平均字數 50 → 回傳、(b) 進度 79% → 不回傳、(c) 平均字數 49 → 不回傳、(d) 0 筆打卡 → 不回傳、(e) force=True 時仍回傳所有 completed
- [ ] 1.3 更新 `tests/services/test_insight_service.py` 補上品質門檻相關測試案例；驗收：`make check && make lint` 全部通過
- [ ] 1.4 更新 `tests/services/test_insight_scheduler.py` 確認 scheduler 使用新的 `get_pending_practices()` 不影響既有流程；驗收：既有測試不破壞

## 2. 後端：覆盤 PATCH API（daodao-server）

- [ ] 2.1 在 `src/validators/` 新增 `reflection.validators.ts`，定義 `reflectionUpdateSchema`（reflection: string, min 1, max 5000）與 response schema；驗收：Zod schema 能正確 parse 合法 / 拒絕非法 input
- [ ] 2.2 在 `src/services/practice.service.ts`（或適當位置）新增 `updateReflection(practiceId, userId, reflection)` function，驗證 practice 擁有者 + status=completed 後更新 `practices.reflection`；驗收：非擁有者回傳 403、非 completed 回傳 400
- [ ] 2.3 在 `src/controllers/practice.controller.ts` 新增 `updateReflection` handler，呼叫 service 並回傳標準 API 格式（`{ success, data: { id, reflection, updatedAt } }`）；驗收：成功更新回傳 200
- [ ] 2.4 在 `src/routes/practice.routes.ts` 註冊 `PATCH /api/v1/practices/:id/reflection`，加入 auth middleware 與 Zod validation middleware；驗收：未認證回 401、body 不合法回 400
- [ ] 2.5 撰寫 integration test：成功更新 reflection、非擁有者 403、status 非 completed 400、超過 5000 字 400；驗收：`pnpm test` 通過

## 3. 後端：見證指標 API Endpoints（daodao-server）

- [ ] 3.1 在 `src/validators/` 新增 `social-proof.validators.ts`，定義 toggle request schema（`type: z.enum(['insightful', 'referenced', 'witnessed'])`）與 status response schema；驗收：Zod schema 正確驗證
- [ ] 3.2 在 `src/controllers/practice.controller.ts` 新增 `toggleSocialProof` handler，呼叫既有 `toggleSocialProof()` service function，驗證不可對自己的實踐操作（403）；驗收：自我操作回 403、正常 toggle 回 200 + `{ action: 'added' | 'removed' }`
- [ ] 3.3 在 `src/controllers/practice.controller.ts` 新增 `getSocialProofStatus` handler，呼叫既有 `getSocialProofStatus()` + `getSocialProofCounts()` 合併回傳；驗收：回傳格式包含 `{ myStatus: { insightful, referenced, witnessed }, counts: { insightfulCount, referencedCount, witnessedCount } }`
- [ ] 3.4 在 `src/routes/practice.routes.ts` 註冊兩個路由：`POST /api/v1/practices/:id/social-proof`（auth）、`GET /api/v1/practices/:id/social-proof/status`（auth）；驗收：未認證回 401
- [ ] 3.5 撰寫 integration test：toggle 新增 / 移除 / 自我操作 403 / status 回傳格式正確；驗收：`pnpm test` 通過

## 4. 前端：API Client 與型別（daodao-f2e / packages/api）

- [ ] 4.1 在 `@daodao/api` 新增 `updatePracticeReflection(id, reflection)` function，對應 `PATCH /api/v1/practices/:id/reflection`；驗收：TypeScript 無 any
- [ ] 4.2 在 `@daodao/api` 新增 `togglePracticeSocialProof(id, type)` function，對應 `POST /api/v1/practices/:id/social-proof`；驗收：TypeScript 無 any
- [ ] 4.3 在 `@daodao/api` 新增 `getPracticeSocialProofStatus(id)` function，對應 `GET /api/v1/practices/:id/social-proof/status`；驗收：TypeScript 無 any
- [ ] 4.4 新增對應的 Zod response schema 與 TypeScript 型別定義（`ReflectionUpdateResponse`、`SocialProofToggleResponse`、`SocialProofStatusResponse`）；驗收：型別與後端 response 對齊

## 5. 前端：覆盤 UI（daodao-f2e / product app）

- [ ] 5.1 新增覆盤模板常數定義檔（ORID 四區塊 + 簡單回顧三區塊），包含各區塊的 placeholder 文字與 i18n key；驗收：模板定義可被元件正確讀取
- [ ] 5.2 新增 `ReflectionTemplateSelector` 元件——兩張模板預覽卡片（ORID / 簡單回顧），點選後展開對應區塊表單；驗收：兩種模板切換時表單內容不互相覆蓋
- [ ] 5.3 新增 `ReflectionEditor` 元件——根據所選模板渲染多段 textarea，各段有對應 placeholder；送出時組裝 Markdown（`<!-- template: xxx -->` 標頭 + `## 區塊標題` 分隔）並呼叫 `updatePracticeReflection` API；驗收：送出成功後顯示覆盤內容、API 錯誤顯示 toast
- [ ] 5.4 實作覆盤觸發時機：實踐 status 變為 completed 時（偵測 status 變化或進入總結頁時），若 `reflection` 為 null 則彈出覆盤提示 sheet；驗收：已填寫覆盤不再彈出
- [ ] 5.5 實作覆盤置頂邏輯：根據 `updatedAt` 判定 72 小時內將覆盤區塊渲染於 AI 洞察之上；超過 72 小時恢復正常順序（AI 洞察在上）；驗收：兩種排列在對應時間範圍內正確呈現
- [ ] 5.6 實作 Check-in 快捷連結：覆盤頁面左側（或上方）提供打卡紀錄的錨點連結列表，方便使用者邊回顧邊寫覆盤；驗收：點擊連結可跳至對應 Check-in

## 6. 前端：Clarity Score（daodao-f2e / product app）

- [ ] 6.1 新增 `calcClarityScore(avgWordCount, progressPercentage, isEnded)` utility function；驗收：單元測試覆蓋——(a) 兩項達標且已結束 → 100、(b) 兩項達標未結束 → 99、(c) 字數不足 → 正確百分比、(d) 進度不足 → 正確百分比、(e) 0 筆打卡 → 0
- [ ] 6.2 新增 `ClarityScoreIndicator` 元件——環形進度條 + 百分比數字 + 簡短說明文字（如「打卡品質越高，解析度越高」）；驗收：0%~100% 各階段視覺正確
- [ ] 6.3 整合至實踐進行中頁面：在「洞察生成中」入口旁顯示 clarity score，每次打卡後 API 回傳最新 check-in 列表時重新計算；驗收：打一筆 50 字以上的卡後 clarity score 即時上升

## 7. 前端：見證指標 UI（daodao-f2e / product app）

- [ ] 7.1 新增 `SocialProofButton` 元件——三個按鈕（Insightful 💡 / Referenced 📚 / Witnessed 👁️），各自顯示計數與自己是否已標記（active 狀態）；驗收：載入時呼叫 status API 初始化狀態
- [ ] 7.2 實作 toggle 互動：點擊按鈕呼叫 toggle API，樂觀更新 UI（先變更 active 狀態 + 計數 ±1，API 失敗時 rollback）；驗收：API 失敗時狀態正確回滾
- [ ] 7.3 整合至總結頁（Public View + Owner View 皆顯示）：Owner View 的自己按鈕 disabled + tooltip「無法對自己的實踐操作」；Public View 需登入才可操作（未登入顯示計數但按鈕 disabled）；驗收：三種角色（Owner / 登入訪客 / 未登入）的 UI 狀態正確

## 8. 整合測試與收尾

- [ ] 8.1 端對端驗證覆盤流程：建立 completed 實踐 → 進入總結頁 → 彈出覆盤提示 → 選 ORID 模板 → 填寫送出 → 覆盤置頂顯示 → 72 小時後回到正常位置；驗收：全流程無錯誤
- [ ] 8.2 端對端驗證品質門檻：建立 completed 實踐（進度 50%、字數 20）→ 執行 insight cron → 確認 insight 仍為 null；建立另一個（進度 90%、字數 80）→ 執行 cron → 確認 insight 已生成；驗收：兩種情境結果正確
- [ ] 8.3 端對端驗證見證指標：以 User B 登入 → 進入 User A 的公開實踐總結頁 → 點擊 Insightful → 計數 +1 → 再點一次 → 計數 -1（toggle）；驗收：toggle 行為正確
- [ ] 8.4 驗證 clarity score 即時更新：在實踐進行中頁面觀察 clarity score → 新增一筆 80 字打卡 → 確認 score 上升；驗收：分數變化即時反映
- [ ] 8.5 確認 Phase 1 既有功能不受影響：AI 洞察顯示、公開分享頁、.txt 匯出仍正常運作；驗收：regression 無異常
