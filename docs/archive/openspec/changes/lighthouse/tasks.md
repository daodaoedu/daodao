## 1. DB Migration（daodao-storage）

- [x] 1.1 建立 `organization` 與 `organization_members` 表（含 index）— **storage** — 驗收：migration 跑過、Prisma db pull 產出對應 model
- [x] 1.2 建立 `programs` 表（含 `deleted_at` 軟刪）— **storage** — 驗收：FK 到 organization 正確、軟刪欄位可 NULL
- [x] 1.3 建立 `cohorts` 表（含 slug/display_name/join_token/join_deadline/capacity/status/UNIQUE）— **storage** — 驗收：gen_random_uuid() 預設、UNIQUE(program_id, slug) 生效
- [x] 1.4 建立 `cohort_enrollments` 表（含 invite_token/status 狀態機/role/UNIQUE/index）— **storage** — 驗收：UNIQUE(cohort_id, email)、index on user_id 與 (cohort_id, status)
- [x] 1.5 建立 `cohort_templates` 表（綁定關係、unbound_at）— **storage** — 驗收：UNIQUE(cohort_id, template_id)
- [x] 1.6 建立 `cohort_stat_snapshots` 表（JSONB metrics、UNIQUE(cohort_id, kind, period_start)）— **storage** — 驗收：kind enum 為 weekly/final
- [x] 1.7 ALTER `practice_templates` 加 `organization_id` nullable FK — **storage** — 驗收：既有資料不動、NULL＝官方模板
- [x] 1.8 ALTER `practices` 加 `cohort_id` nullable FK＋index＋草稿冪等 partial unique index — **storage** — 驗收：ON DELETE SET NULL、partial unique index WHERE creation_source='cohort_template' 生效

## 2. Server — 組織與系列期 CRUD（daodao-server）

- [x] 2.1 Prisma db pull + generate + schema:drift — **server** — 驗收：Prisma model 與 migration 一致、型別可 import
- [x] 2.2 實作 `requireOrganizationMember` middleware（EXISTS organization_members WHERE user_id = ?）— **server** — 驗收：非成員回 403、成員放行；單測覆蓋
- [x] 2.3 實作組織 CRUD API（`/api/v1/lighthouse/organizations`）— **server** — 驗收：建立/讀取/更新 name/bio/external_link；Zod input/output validation
- [x] 2.4 實作組織成員管理 API（新增/移除成員）— **server** — 驗收：新增回 201、移除回 204、UNIQUE 衝突回 409；審計 hook
- [x] 2.5 實作系列 CRUD API（`/api/v1/lighthouse/programs`）— **server** — 驗收：建立/編輯/封存；有 cohort 時擋刪除回 409
- [x] 2.6 實作期 CRUD API（`/api/v1/lighthouse/programs/:programId/cohorts`）— **server** — 驗收：建立/編輯/封存；status 只存 draft/published/archived；物件級歸屬驗證 cohort→program→organization→members

## 3. Server — Enrollment 與模板（daodao-server）

- [x] 3.1 實作邀請連結/QR 加入 API（`/api/v1/cohorts/join/:joinToken`）— **server** — 驗收：join_deadline 與 capacity 檢查、同意畫面資訊回傳、加入後建 enrollment(status='joined')
- [x] 3.2 實作 email 名單上傳邀請 API（單筆＋CSV 批次）— **server** — 驗收：預覽/錯誤原因回傳、enrollment 建列(status='invited')、BullMQ 觸發邀請信 job、審計 hook 記上傳者/筆數/錯誤數
- [x] 3.3 實作邀請信 email 發送 job（BullMQ＋既有 email template）— **server** — 驗收：信件含邀請連結、變數化模板、重寄 API
- [x] 3.4 實作自助退出/轉個人實踐 API — **server** — 驗收：practices.cohort_id SET NULL、enrollment status='exited'、exited_at 寫入
- [x] 3.5 實作教練移除成員 API — **server** — 驗收：enrollment status='removed'、practices 轉個人、中性通知觸發、審計記操作者
- [x] 3.6 實作 join_token rotate（重設）與暫停加入 API — **server** — 驗收：rotate 產新 UUID、暫停＝SET NULL、審計 hook
- [x] 3.7 實作組織私有模板 API（CRUD＋綁定/解綁期）— **server** — 驗收：organization_id 過濾、cohort_templates 綁定/解綁(unbound_at)、組織內成員全可見
- [x] 3.8 實作學員加入期時草稿自動建立邏輯 — **server** — 驗收：每個綁定模板建 practice(status='draft', cohort_id, creation_source='cohort_template')、冪等（重跑不重建）

## 4. Server — 可見性與 API 防線（daodao-server）

- [x] 4.1 實作 `requireCohortRole` middleware（驗 enrollment role）— **server** — 驗收：owner/assistant 放行、member 依路由限制、非成員 403
- [x] 4.2 實作物件級歸屬檢查（打卡→practice→cohort 歸屬鏈驗證）— **server** — 驗收：跨期 ID 替換回 403/404；測試覆蓋 IDOR 場景
- [x] 4.3 實作 Zod response validator 白名單（學員只回 id/nickname/avatar/joined_at）— **server** — 驗收：email 永不出現在教練端回應；regression test
- [x] 4.4 實作 90 天唯讀 middleware（end_date + 90 推導）— **server** — 驗收：期內可寫、期滿唯讀、90 天後內容 API 回 410；測試覆蓋邊界日期
- [x] 4.5 實作學員退出時內容層即時消失邏輯 — **server** — 驗收：退出後教練端看不到該學員打卡、名冊層保留最小紀錄
- [x] 4.6 實作帳號刪除匿名化 hook — **server** — 驗收：enrollment 列保留但 email 清空/user_id 解除、快照統計不變

## 5. Server — 儀表板與成果（daodao-server）

- [x] 5.1 實作聚合快照 BullMQ weekly job — **server** — 驗收：每週產出 cohort_stat_snapshots(kind='weekly')、metrics 含 enrolled/activated/checkins/active_members/top_tags/exited/hour_histogram
- [x] 5.2 實作期結束時 final 快照 job — **server** — 驗收：end_date 當天產出 kind='final' 快照
- [x] 5.3 實作儀表板統計 API（節律熱度圖/標籤分佈/共同卡點/漏斗/時段節律）— **server** — 驗收：首次存取觸發即時計算＋寫入快照；後續讀快照；資料從 cohort→practices join，不以 user_id 起點
- [x] 5.4 實作今日焦點 API（需要鼓勵＋值得慶祝）— **server** — 驗收：流動中斷偵測＋最後一則打卡預覽；正向時刻偵測（卡關後回歸/首卡/滿月）
- [x] 5.5 實作成果報告 API — **server** — 驗收：正向指標（完成人數/持續參與比例）、資料源為 final 快照、不含缺勤/排名
- [x] 5.6 實作成果頁批次匯出 API（逐學員 opt-in）— **server** — 驗收：只匯出同意者、內容為暱稱＋打卡摘要＋心得節錄（不含 email）、審計 hook
- [x] 5.7 實作本期動態牆 API（教練與學員視角）— **server** — 驗收：feed 為該 cohort practices 的 checkins；教練視角看全期、學員視角看同期；可見範圍限定為本期
- [x] 5.8 實作 AI 鼓勵草稿 API（複用 checkin-encouragements）— **server** — 驗收：教練點擊產出草稿→可編輯→確認後送出為留言
- [x] 5.9 實作教練週報 digest BullMQ job — **server** — 驗收：每週排程、信件含打卡數/待回應/需關心名單＋直達連結、走既有 email template

## 6. Server — 通知與審計（daodao-server）

- [x] 6.1 新增 cohort 通知事件類型（邀請信 P1、加入確認 P1、移除通知 P1、週報 P2）— **server** — 驗收：notification_events 正確建列、防重複
- [x] 6.2 新增審計日誌操作類型（組織建立/成員異動/名單上傳/成員移除/成果匯出/連結重設）— **server** — 驗收：每個操作記正確欄位（操作者/目標/數量）

## 7. Frontend — 燈塔骨架（daodao-f2e）

- [x] 7.1 建立 `/lighthouse` route group 與自有 layout — **f2e** — 驗收：獨立 layout 不用 product 預設；navigation 含總覽/系列/模板庫/組織設定
- [x] 7.2 實作登入門檻 middleware（requireOrganizationMember）— **f2e** — 驗收：非組織成員訪問 /lighthouse 顯示引導頁面；成員正常進入
- [x] 7.3 新增 `cohort.ts` service + hooks（API client）— **f2e** — 驗收：型別與 server OpenAPI 同步、Zod validation
- [x] 7.4 新增 i18n keys（依詞彙定案：系列/期/教練/學員/燈塔）— **f2e** — 驗收：繁中 key 完整、不含「營」「班級」「老師」「學生」

## 8. Frontend — 組織與系列期頁面（daodao-f2e）

- [x] 8.1 實作總覽頁（各期狀態卡＋本週待辦）— **f2e** — 驗收：顯示 N 則打卡待回應、M 位需要鼓勵；點擊可跳至對應期
- [x] 8.2 實作系列管理頁（建立/編輯/封存）— **f2e** — 驗收：CRUD 完整、有 cohort 時封存擋提示
- [x] 8.3 實作開期頁面（slug/display_name/起訖日/capacity/join_deadline/invite_message/發佈）— **f2e** — 驗收：表單驗證、發佈後產生邀請連結/QR
- [x] 8.4 實作名單頁（邀請/狀態/重寄/CSV 上傳預覽）— **f2e** — 驗收：invited/joined/exited/removed 狀態顯示、CSV 上傳含錯誤回饋
- [x] 8.5 實作成員治理（移除/連結重設/暫停加入）— **f2e** — 驗收：移除確認 dialog、連結重設後舊連結失效

## 9. Frontend — 儀表板與動態（daodao-f2e）

- [x] 9.1 實作儀表板頁（節律熱度圖/標籤分佈/共同卡點/漏斗/時段節律）— **f2e** — 驗收：圖表正確渲染、空狀態處理、僅單期視角
- [x] 9.2 實作今日焦點頁（需要鼓勵＋值得慶祝兩分頁）— **f2e** — 驗收：「送個鼓勵」按鈕（不是「發提醒」）、正向時刻卡片
- [x] 9.3 實作本期動態頁（教練視角：打卡 feed＋快速回應＋留言＋AI 草稿）— **f2e** — 驗收：feed 限本期、AI 草稿可編輯後送出
- [x] 9.4 實作模板庫頁（五步建立/編輯、綁定/解綁期、已產生草稿數顯示）— **f2e** — 驗收：組織內全可見全可編、綁定操作即時反映

## 10. Frontend — 成果與設定（daodao-f2e）

- [x] 10.1 實作成果報告頁（正向指標視覺化）— **f2e** — 驗收：量流動指標、不含缺勤/排名
- [x] 10.2 實作成果匯出功能（逐學員 opt-in 勾選＋下載）— **f2e** — 驗收：opt-in UI 明確、匯出內容不含 email
- [x] 10.3 實作組織設定頁（名稱/bio/external_link 編輯＋成員列表）— **f2e** — 驗收：儲存成功回饋、成員列表顯示角色
- [x] 10.4 實作模板頁組織資訊區塊（組織名稱＋簡介＋「了解更多」外連）— **f2e** — 驗收：有 organization_id 時顯示、無時不顯示；外連開新分頁

## 11. Frontend — 參與者端配套（daodao-f2e）

- [x] 11.1 實作邀請連結加入流程（含同意畫面）— **f2e** — 驗收：文案明講「對教練與同期學員可見」；加入後導向草稿區
- [x] 11.2 實作過期連結落地頁（組織簡介＋external_link＋「看看下一期」）— **f2e** — 驗收：過期 join_token 導向此頁而非 404
- [x] 11.3 實作草稿區塊與啟用流程 — **f2e** — 驗收：學員看到期產生的草稿、啟用轉 in_progress
- [x] 11.4 實作本期動態（學員視角：同期所有人打卡 feed）— **f2e** — 驗收：含教練打卡、可回應/留言
- [x] 11.5 實作自助退出/轉個人實踐 — **f2e** — 驗收：確認 dialog、退出後 practice 回個人、期動態不再可見

## 12. Admin UI 組織設定（daodao-admin-ui）

- [x] 12.1 實作 admin-ui 組織設定入口與組織管理頁（列表/建立/開通/編輯/停權）— **admin-ui** — 驗收：側欄可進入組織設定；開通記 approved_by/approved_at、停權切 status='suspended'
- [x] 12.2 在組織設定內實作組織成員管理（查看/新增/移除成員）— **admin-ui** — 驗收：可依組織進入成員設定，成員列表含角色顯示

## 13. 回饋問卷（daodao-server + f2e）

- [x] 13.1 實作期結束時自動發送回饋問卷 job — **server** — 驗收：複用既有問卷系統、問卷必含「打卡被看見的感受」題
- [x] 13.2 實作回饋問卷填寫頁面 — **f2e** — 驗收：學員可填寫、結果存入既有問卷資料
