# community-onboarding
- 涉及 repo: server / storage
- 對應 archived change: 無
- 總計: 11 條 requirement / 22 個 scenario | ✅3 ⚠️3 ❌5 ❓0

## Requirement: 建立引導流程（多步驟+問題） → ⚠️
證據: daodao-server:src/controllers/admin-community.controller.ts:42/52 POST/PUT /admin/community/onboarding/flows；service createFlow/updateFlow；daodao-storage:migrate/sql/058_create_onboarding_flow_tables.sql（onboarding_flows + onboarding_steps）。
- 差異：schema 為「flow → steps(=問題)」扁平結構，**step 即問題**（onboarding_steps 直接含 question_text/type/options），無規格的「步驟內含一或多問題」兩層結構
- Scenario: 建立新流程 → ⚠️ — 可建 flow + steps，但步驟=問題，非「步驟含多問題」
- Scenario: 編輯現有流程 → ✅ — updateFlow 載入並修改 steps（service:164）

## Requirement: 問題類型支援（單選/多選/自由文字） → ✅
證據: daodao-storage:migrate/sql/058...:question_type DEFAULT 'single' -- single|multi|text；daodao-server:src/services/onboarding-flow.service.ts:6 `'single' | 'multi' | 'text'`。
- Scenario: 新增不同類型問題 → ✅ — question_type single/multi/text
- Scenario: 設定選項內容 → ✅ — onboarding_steps.options JSONB（createFlow service:117 寫入 options）

## Requirement: 答案對應動作設定（標籤/角色/推薦） → ❌
證據: 無。onboarding_steps 僅有 field_key（maps to interests/professional_fields/referral），無 per-option action（assign tag/role/recommend）schema 或邏輯。grep assignTag/assignRole/recommend content 於 onboarding 程式碼皆無。
- Scenario: 設定答案觸發標籤指派 → ❌ — 無 answer→tag 動作
- Scenario: 設定答案觸發角色指派 → ❌ — 無 answer→role 動作
- Scenario: 設定答案推薦內容 → ❌ — 無 answer→content/space 動作

## Requirement: 新用戶首次登入觸發引導流程 → ⚠️
證據: daodao-server:src/services/onboarding-flow.service.ts:18 getActiveFlow（GET /onboarding/flows/active, onboarding.controller.ts:22）；middleware onboarding-gate.middleware.ts:14 requireOnboardingComplete。
- Scenario: 新用戶首次登入 → ⚠️ — 有 active flow 查詢 + gate middleware，但「首次登入自動呈現第一步」的前端觸發未驗
- Scenario: 用戶中途離開（記錄進度，下次續接） → ❌ — recordResponse 逐步寫入 onboarding_responses（ON CONFLICT upsert），但無「resume from last step / next step」的進度續接邏輯實作

## Requirement: 自動指派標籤與角色 → ❌
證據: 無。recordResponse（onboarding-flow.service.ts:54-63）僅寫入 answer，無依答案即時指派 tag/role 的邏輯。field_key 對應 user record 但非 tag/role 指派。
- Scenario: 完成含標籤指派的問題 → ❌ — 無即時 tag 指派
- Scenario: 完成含角色指派的問題 → ❌ — 無即時 role 指派

## Requirement: 設定引導式首要行動（guided first actions） → ❌
證據: 無。grep guided action / first action 於 onboarding 程式碼皆無。schema 無首要行動表。
- Scenario: 新增引導式行動 → ❌ — 無
- Scenario: 用戶查看首要行動清單 → ❌ — 無

## Requirement: 追蹤每步驟完成率 → ⚠️
證據: daodao-server:src/services/admin-community.service.ts:219 getFlowAnalytics — 依 onboarding_responses 計 total_started/total_completed + per-step response_count/dropRate。
- Scenario: 用戶完成某步驟 → ✅ — onboarding_responses 含 completed_at（service.ts:62 recordResponse 寫入），可計數
- Scenario: 管理員查看步驟完成率 → ⚠️ — getFlowAnalytics 提供 dropOffSteps dropRate，但呈現為流失率非規格「完成率百分比」（語意近似）

## Requirement: 完成引導流程後頒發徽章 → ❌
證據: 無。grep badge 於 onboarding service/controller/migration 058 皆無。無完成徽章設定欄位或頒發邏輯。
- Scenario: 用戶完成所有步驟 → ❌ — 無徽章頒發
- Scenario: 管理員設定完成徽章 → ❌ — onboarding_flows 無 badge 欄位

## Requirement: 預覽引導流程 → ❌
證據: 無。controller 無 preview endpoint。
- Scenario: 預覽引導流程 → ❌ — 無預覽功能（純後端，admin-ui 未驗）

## Requirement: 啟用與停用引導流程 → ✅
證據: daodao-storage:migrate/sql/058...:onboarding_flows.is_enabled DEFAULT false + idx_onboarding_flows_is_enabled；getActiveFlow 取 is_enabled flow。
- Scenario: 停用引導流程 → ✅ — is_enabled=false 後 active flow 不回該流程（updateFlow 可改 is_enabled）
- Scenario: 啟用引導流程 → ✅ — is_enabled=true 後 getActiveFlow 回傳

## Requirement: 引導流程分析數據（完成率/流失點/最常見回答） → ⚠️
證據: daodao-server:src/services/admin-community.service.ts:219 getFlowAnalytics（controller:73）。
- Scenario: 查看分析儀表板 → ⚠️ — 提供 totalStarted/totalCompleted/dropOffSteps（流失點），但**缺「每問題最常見的回答統計」**；漏斗圖為前端呈現
- Scenario: 篩選時間範圍 → ❌ — getFlowAnalytics 無日期範圍參數

## 關鍵落差
僅實作「扁平問卷 flow（single/multi/text）+ 啟停 + 基礎完成/流失分析」。**答案→動作對應（tag/role/推薦）、自動指派、完成徽章、引導式首要行動、預覽、進度續接、最常見回答統計**全缺——規格的「智慧引導」核心未實作。
