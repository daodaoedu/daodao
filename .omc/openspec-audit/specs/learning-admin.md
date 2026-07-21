# learning-admin
- 涉及 repo: server (admin-learning controller/service/routes) + storage (045 migration) + admin-ui (前端，未實作)
- 對應 archived change: 無直接對應（admin-panel-overhaul 系列相關，但無同名 spec）
- 總計: 18 條 requirement / 35 個 scenario | ✅5 ⚠️10 ❌1 ❓2
- 註：spec 多以「頁面 SHALL 顯示/視覺化」描述，但 daodao-admin-ui(origin/main) 無任何 learning/course/quiz/certificate 頁面（grep 0 結果）。後端 API 大致存在，前端展示層幾乎全缺。下列「頁面」類 requirement 均因前端缺失標 ⚠️。

## Requirement: 課程進度總覽指標 → ⚠️
證據: daodao-server:src/services/admin-learning.service.ts:30 (listCourses 計算 enrollment_count/avg_progress/completion_rate/avg_completion_time)；route daodao-server:src/routes/admin.routes.ts:1350 GET /learning/courses。前端頁面缺失。
- Scenario: 檢視課程進度總覽 → ⚠️ — 後端回傳四項指標，但無 admin-ui 表格頁面
- Scenario: 依完成率排序 → ❓ — service 固定 ORDER BY p.id，排序需前端做；無前端證據

## Requirement: 課程流失點分析 → ❌
證據: daodao-server:src/services/admin-learning.service.ts:78 getCourseDropOff 為 stub，註解「Drop-off analysis requires lesson-level tracking which is not yet in the schema」，回傳空陣列；listCourses 中 drop_off_lesson 亦寫死 NULL (service.ts:54)。
- Scenario: 檢視流失點 → ❌ — 無 lesson 級追蹤、無條狀/漏斗圖
- Scenario: 無明顯流失點 → ❌ — 無 5% 門檻判斷邏輯

## Requirement: 停滯使用者清單 → ⚠️
證據: daodao-server:src/services/admin-learning.service.ts:88 getStalledUsers，用 make_interval(days => stalledDays) 篩 last_activity_at；route admin.routes.ts:1352。N 由 query stalledDays 帶入。
- Scenario: 檢視停滯使用者 → ⚠️ — 回傳 userName/courseName/progress/stalledDays，但「目前停留的課堂(lesson)」僅有 courseName 課程層級，無課堂層級；前端頁面缺失
- Scenario: 修改停滯天數門檻 → ⚠️ — API 接受 stalledDays 參數可重查，但即時 UI 行為無前端證據

## Requirement: 同梯次比較 → ❌
證據: daodao-server:src/services/admin-learning.service.ts:122 getCohortComparison，註解「Cohort comparison requires cohort metadata not yet tracked」，回傳空陣列。
- Scenario: 比較兩個梯次 → ❌ — 無梯次 metadata、無並排圖表
- Scenario: 單一梯次無資料 → ❌ — 無實作

## Requirement: 滴灌式內容排程 → ✅
證據: daodao-server:src/services/admin-learning.service.ts:188 INSERT INTO drip_schedules (unlock_type, unlock_value)；storage migrate/sql/045_create_learning_tables.sql:56 drip_schedules 表；route admin.routes.ts:1355 POST /learning/drip-schedules。
- Scenario: 設定依註冊天數解鎖 → ⚠️ — 支援 unlock_type/unlock_value 儲存，但「7 天後自動解鎖」的自動觸發排程器未見實作（僅有 manual-unlock 與 drip_unlocks 表）
- Scenario: 設定指定日期解鎖 → ⚠️ — unlock_type 可存 date 模式，但自動開放邏輯無證據

## Requirement: 滴灌排程總覽 → ⚠️
證據: daodao-server:src/services/admin-learning.service.ts:135 listDripSchedules LEFT JOIN drip_unlocks 統計解鎖數。前端時間軸/表格頁面缺失。
- Scenario: 檢視排程總覽 → ⚠️ — 後端回傳排程+解鎖計數，無前端
- Scenario: 使用者分佈於不同階段 → ❓ — 統計 unlocked 數，但已/未解鎖人數細分需確認；無前端

## Requirement: 手動解鎖內容 → ⚠️
證據: daodao-server:src/controllers/admin-learning.controller.ts:109 manualUnlock；service.ts:225 INSERT INTO drip_unlocks；route admin.routes.ts:1357 POST /learning/drip-schedules/:id/manual-unlock。
- Scenario: 為特定使用者解鎖 → ✅ — 單一 userId 解鎖有實作
- Scenario: 批次解鎖 → ❓ — 需確認 manualUnlock 是否接受多 userId；單筆 INSERT，批次未明確

## Requirement: 測驗建立與管理 → ⚠️
證據: daodao-server:src/services/admin-learning.service.ts:288 createQuiz / createQuestion；storage 045:118 quizzes、045:146 quiz_questions。
- Scenario: 建立單選題測驗 → ⚠️ — 有 createQuestion，但題型(single/boolean/short)欄位驗證需確認 validator
- Scenario: 建立是非題 → ❓ — 題型枚舉未在 service grep 到明確 single/boolean/short_answer 分支
- Scenario: 建立簡答題（需人工批改） → ❓ — 無「人工批改」流程證據

## Requirement: 測驗及格門檻 → ⚠️
證據: daodao-server:src/services/admin-learning.service.ts:290 quizzes.pass_threshold 寫入；getQuizStats(service.ts:258) 用 score >= pass_threshold 算 pass_rate。
- Scenario: 設定及格門檻 → ✅ — pass_threshold 儲存並用於判定
- Scenario: 修改門檻不影響/重算既有成績 → ⚠️ — pass_rate 為查詢時即時計算（自然反映新門檻），但無顯式「重新計算既有成績狀態」的更新流程，與 spec「重新計算所有既有成績」語意略有差異

## Requirement: 測驗成績統計 → ✅
證據: daodao-server:src/services/admin-learning.service.ts:411 getQuizStats 回傳 totalAttempts/avgScore/passRate/questionStats(每題 correctRate)；route admin.routes.ts /learning/quizzes/:quizId/stats。
- Scenario: 檢視測驗統計 → ⚠️ — 後端有每題正確率/平均/及格率，長條圖屬前端，無前端證據
- Scenario: 辨識困難題目（<30% 紅標） → ❌ — 30% 門檻標示屬前端，無證據

## Requirement: 測驗預覽 → ❓
證據: 未在 controller/service grep 到 preview 端點。
- Scenario: 預覽測驗 → ❌ — 無「以學員身分預覽」實作；預覽不計入統計亦無證據

## Requirement: 證書模板管理 → ⚠️
證據: daodao-server:src/controllers/admin-learning.controller.ts:205 createTemplate；service certificate_templates；storage 045:215。
- Scenario: 建立證書模板 → ⚠️ — 有 createTemplate，自訂欄位/logo 上傳細節未確認
- Scenario: 預覽證書模板 → ❌ — 無 preview 端點證據

## Requirement: 證書發放條件 → ❓
證據: 有 issueCertificate(controller:225) 但未見「自動依條件(完成課堂+測驗≥X%)發放」的條件引擎。
- Scenario: 設定發放條件 → ❌ — 無條件設定/儲存欄位證據
- Scenario: 使用者部分達標不發放 → ❌ — 無自動條件判斷

## Requirement: 證書驗證連結 → ✅
證據: daodao-server:src/services/admin-learning.service.ts:550 verifyUrl=`https://daodao.co/certificates/verify/${id}`；verifyCertificate(service.ts:611)；route /learning/certificates/:id/verify。
- Scenario: 產生驗證連結 → ✅ — 每張證書產生唯一 verifyUrl
- Scenario: 外部驗證 → ⚠️ — 後端 verifyCertificate 回傳 valid+certificate，但對外公開驗證頁(顯示姓名/課程/日期)屬前端，無證據

## Requirement: 批次發放證書 → ⚠️
證據: daodao-server:src/controllers/admin-learning.controller.ts:235 bulkIssueCertificate。
- Scenario: 批次發放 → ⚠️ — 有 bulk-issue 端點，但「依梯次選取」依賴 cohort（未實作）；發放結果摘要需確認
- Scenario: 部分使用者不符資格 → ❓ — 條件判斷與未符清單回傳無證據（發放條件本身未實作）

## Requirement: 證書清單與查詢 → ⚠️
證據: daodao-server:src/controllers/admin-learning.controller.ts:245 listIssuedCertificates。
- Scenario: 搜尋特定使用者的證書 → ⚠️ — 有 list 端點，但依名稱/課程/日期的搜尋篩選參數未見，前端缺失
- Scenario: 依日期篩選 → ❌ — 無日期範圍篩選參數證據

## Requirement: 學習路徑建立 → ⚠️
證據: daodao-server:src/services/admin-learning.service.ts:716 createPath INSERT learning_paths + learning_path_courses(sort_order)；storage 045:276/297。
- Scenario: 建立學習路徑 → ✅ — 依序加入課程並存 sort_order
- Scenario: 設定前置條件 → ⚠️ — 有 learning_path_courses 順序，但顯式「前置條件擋存取」的 ACL 未見
- Scenario: 循環相依檢查 → ❌ — createPath 無任何 cycle/circular 偵測邏輯（grep 0 結果），不會拒絕循環相依

## Requirement: 學習路徑視覺化課程地圖 → ⚠️
證據: 後端 listPaths/getPathAnalytics 提供資料，但 DAG 視覺化屬前端，admin-ui 無此頁。
- Scenario: 檢視課程地圖 → ❌ — 無 DAG 前端
- Scenario: 課程地圖互動 → ❌ — 無前端

## Requirement: 學習路徑分析 → ⚠️
證據: daodao-server:src/controllers/admin-learning.controller.ts getPathAnalytics；route /learning/paths/:id/analytics。
- Scenario: 檢視路徑進度統計 → ⚠️ — 後端有 analytics 端點，漏斗/前端缺失，回傳結構未細查
- Scenario: 識別路徑瓶頸 → ❌ — 瓶頸視覺標示屬前端，無證據
