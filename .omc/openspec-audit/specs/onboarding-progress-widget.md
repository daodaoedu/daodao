# onboarding-progress-widget
- 涉及 repo: daodao-f2e (apps/product) + daodao-server (onboarding status API)
- 對應 archived change: 無
- 總計: 4 條 requirement / 10 個 scenario | ✅8 ⚠️2 ❌0 ❓0

## Requirement: Widget 顯示於畫面右下角（預設展開、可收合為懸浮圖示）→ ✅
證據: daodao-f2e:apps/product/src/components/task-guide/task-guide-widget.tsx:18 `PANEL_POSITION = "fixed bottom-39 right-5 ..."`、:19 TRIGGER_POSITION；expanded state（:54）；未完成 + 無 sessionStorage 收合時 setExpanded(true)（:64-78）；收合後顯示 icon 觸發鈕（:137-142）。
- Scenario: 首次進入自動展開 → ✅ — autoExpandedRef + 無 collapsed sessionStorage 時 setExpanded(true)（:75-78）。
- Scenario: 收合後不再自動展開（直到下次登入）→ ✅ — SESSION_KEY="task-guide-collapsed" 寫 sessionStorage（handleCollapse :83），autoExpandedRef 防重複展開。
- Scenario: 不遮擋新增實踐按鈕 → ⚠️ — Widget 為 fixed bottom-right，AddTaskFAB 同為右下 FAB（page.tsx:448）；座標經 bottom-39/right-5 偏移避讓，但未實測無遮擋，記 ⚠️。

## Requirement: 適性化任務路由（依 user_source S1/S2/S3 排序）→ ✅
證據: daodao-server:src/types/onboarding.types.ts:38-42 `TASK_ORDER_BY_SOURCE`：S1=[B,A,C,E,D]、S2=[B,C,E,D]、S3=[C,B,D,A,E]，與 spec 表格完全一致；onboarding.service.ts 依 order 組 taskList（:173）；f2e widget 渲染 taskList（onboarding-progress-context.tsx:19,70）。
- Scenario: S1 任務順序 B→A→C→E→D → ✅ — types:39 完全吻合。
- Scenario: S2 僅 4 項 B→C→E→D（無 A）→ ✅ — types:40 吻合。
- Scenario: S3 順序 C→B→D→A→E → ✅ — types:41 吻合。

## Requirement: 任務自動偵測與即時更新 → ✅
證據: onboarding-progress-context.tsx:101-127 接收 update{taskKey, allCompleted} 即時將對應 taskList 項 done=true，並重算 completedTasks；server 側 onboarding-hook.middleware.ts 與 task 完成寫入（onboarding.service.ts:212 `taskPatch {taskKey:'done'}`）。狀態經 `/api/v1/onboarding/status`（onboarding.routes.ts:32）以 UID 同步。
- Scenario: 完成測驗後 A 自動勾選 → ✅ — taskKey 'A' update 即時標記。
- Scenario: 建立實踐後 C 自動勾選 → ✅ — 同機制（taskKey 'C'）。
- Scenario: 跨裝置進度同步（UID）→ ✅ — status API 依認證使用者查 user_onboarding，SWR 共用 key ONBOARDING_STATUS_KEY，跨裝置一致。

## Requirement: S2 用戶測驗任務預先完成 → ✅
證據: daodao-server:src/services/onboarding.service.ts:102-106 「S2 用戶 task_states.A 預設為 'done'」`userSource === UserSource.S2 ? {[OnboardingTask.A]:'done'} : {}`；deriveUserSource（utils/onboarding-source.ts:11-19）依 referral_source/quiz 判定 S2。
- Scenario: 從測驗導向路徑完成註冊 → ✅ — S2 初始化 task_states.A='done'。
