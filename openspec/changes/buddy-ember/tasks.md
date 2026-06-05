## 1. DB Migration（daodao-storage）

- [ ] 1.1 拍板 OQ2（per-practice vs. user-pair 火苗）與 OQ3（buddies list dedup 層級），更新 design.md 後再動手寫 migration；驗收：design.md Open Questions 標記為已決
- [ ] 1.2 新增 `buddy_embers` 表 migration SQL（SERIAL PK，`buddy_request_id INT REFERENCES practice_buddy_requests(id)`，last_checkin_at, consecutive_days, companion_score_a/b, watch_over_notified_at）；驗收：migration up/down 皆可乾淨執行
- [ ] 1.3 新增 `buddy_cards` 表 migration SQL（SERIAL PK，`buddy_request_id INT REFERENCES practice_buddy_requests(id)`，`sender_id INT REFERENCES users(id)`，card_type, preset_key, content）；驗收：card_type CHECK constraint 有效
- [ ] 1.4 新增 `practices.title_tsv` GENERATED STORED column 與 GIN index；驗收：FTS query 可正確命中中文標題

## 2. 後端：Buddy 配對 API（daodao-server）

- [ ] 2.1 實作 `GET /practices/:id/suggested-buddies`（FTS ts_rank 排序 + template_id 優先 + 排除已有關係者）；驗收：單元測試覆蓋排除邏輯與排序邏輯
- [ ] 2.2 實作 `GET /users/me/buddies`（回傳 Buddy 列表含 on-read ember 狀態，依里程碑 > 今日打卡 > N 天未出現排序）；驗收：integration test 驗證三種排序情境
- [ ] 2.3 新增兩個 endpoint 的 Zod request/response schema；驗收：輸入驗證錯誤回傳 400

## 3. 後端：Ember 狀態模型（daodao-server）

- [ ] 3.1 建立 ember service factory（on-read 狀態計算函式：d → active/fading/dying/dormant）；驗收：unit test 覆蓋所有邊界值（d=0,1,2,3,4,5,6）
- [ ] 3.2 修改打卡建立邏輯：寫入 `buddy_embers.last_checkin_at`、計算並更新 `consecutive_days`（含中斷重置為 1）；驗收：連續打卡 / 中斷後重燃兩種情境測試
- [ ] 3.3 修改打卡邏輯：清除 `watch_over_notified_at`（A 重新打卡後清除）；驗收：regression test 確認守望通知不重複

## 4. 後端：陪伴功能（daodao-server）

- [ ] 4.1 新增 4 種通知事件類型（BuddyDailyCheckinSummary / BuddyWatchOver / BuddyMilestone / BuddyCard）至通知分發管線；驗收：各類型可正確觸發 in-app 通知
- [ ] 4.2 實作 `POST /buddies/:id/cards`（建立 buddy_card 記錄 + companion_score +1 + 觸發 BuddyCard 通知）；驗收：unit test 驗證 preset/custom 兩種 card_type；驗收：非此 Buddy 成員呼叫回傳 403
- [ ] 4.3 實作里程碑偵測（打卡時同步判斷 Day 7/30/100 及完成實踐），觸發 BuddyMilestone 通知給所有 Buddy；驗收：unit test 覆蓋 4 個里程碑點與非里程碑天數
- [ ] 4.4 實作每日聚合打卡通知 BullMQ repeatable job（UTC 14:00，依接收方分組，最多 1 則）；驗收：dry-run 模式驗證分組邏輯；同一 Buddy 多次打卡只算一次
- [ ] 4.5 實作守望相助偵測 BullMQ repeatable job（UTC 02:00，5 天未打卡 + watch_over_notified_at 防重複）；驗收：dry-run 驗證不重複推送邏輯

## 5. 前端：API Client（daodao-f2e / packages/api）

- [ ] 5.1 新增 suggested-buddies、buddies list、buddy cards 的 client functions 與 Zod response schema；驗收：TypeScript 無 any，schema 與後端 response 對齊

## 6. 前端：配對流程 UX（daodao-f2e / product app）

- [ ] 6.1 實作實踐建立成功畫面的推薦 Buddy 卡片元件（頭像、名稱、實踐名稱、邀請按鈕、暫時跳過）；驗收：無推薦結果時不渲染卡片；API 失敗時靜默隱藏
- [ ] 6.2 實作打卡成功畫面的推薦 Buddy 卡片（僅對尚無 Buddy 的用戶顯示）；驗收：已有 Buddy 的用戶不顯示
- [ ] 6.3 實作主動邀請按鈕（實踐頁 + Profile 頁）；驗收：已是 Buddy → disabled「已是 Buddy」；有待處理請求 → disabled「邀請已送出」；自己的頁面不顯示

## 7. 前端：Buddy 列表頁（daodao-f2e / product app）

- [ ] 7.1 實作 BuddyCard 元件（頭像、名稱、實踐名稱、ember 狀態視覺、狀態文字）；驗收：三種狀態文字（今天在島上 / N 天未出現 / Day X 🎉）正確顯示
- [ ] 7.2 實作 `/buddies` 頁面（呼叫 buddies list API、渲染卡片列表、點擊進入對方實踐頁）；驗收：空狀態正確顯示

## 8. 前端：陪伴互動（daodao-f2e / product app）

- [ ] 8.1 實作每日聚合通知卡片元件（Buddy 列表 + 👋 reaction 按鈕 + 點擊進入詳情頁）；驗收：reaction 點擊後呈現已選取狀態
- [ ] 8.2 實作守望相助傳信畫面（3 張預設卡片 + 自由輸入欄 + 傳送按鈕）；驗收：傳送成功後按鈕 disabled 防重複送出
- [ ] 8.3 實作里程碑慶祝通知卡片（含導向里程碑打卡詳情頁 + reaction + 一句話祝賀留言入口）；驗收：留言送出後 A 收到慶祝通知回饋

## 9. 前端：火苗視覺元件（daodao-f2e / packages/ui）

- [ ] 9.1 實作 `EmberStatus` 元件（四態視覺：旺/微弱/將熄/餘燼），複用 `packages/assets/images/island/` 營火資產與 `emotion/` SVG；驗收：四態視覺可獨立渲染，無新增外部圖片資源
- [ ] 9.2 整合 EmberStatus 至 BuddyCard 元件（列表頁）；驗收：ember 狀態變化時視覺正確切換
- [ ] 9.3 實作重燃動畫（餘燼 → 旺），複用 `celebrate.json` Lottie；驗收：A 打卡重燃時動畫可觸發
