# 實踐詳情、打卡與編輯

使用者打開自己的主題實踐，做今日打卡、看與編輯打卡紀錄、編輯／複製／封存／刪除實踐，完成後看實踐總結。

- 介面：App（apps/mobile）
- dev 網址／取得方式：沒有網頁版；裝 dev App「Dao Dao (Dev)」（見 login.md）
- 主要程式位置：projects/daodao-f2e/apps/mobile/app/practices/[id]/index.tsx、[id]/edit.tsx、[id]/check-ins/[checkInId].tsx、[id]/summary.tsx、[id]/calendar.tsx、components/check-in/form/check-in-sheet.tsx、components/practice/detail/PublicPracticeView.tsx
- 依據版本：daodao-f2e 6034e986（2026-10-23）

## 子功能
- 詳情：狀態徽章、說明、每週天數／每次分鐘、更多資訊、瀏覽活動、使用資源、打卡紀錄列表、留言
- 主按鈕三種狀態：「打卡」→ 開打卡表單；「今天已完成」（停用）；完成後「查看實踐總結」
- 打卡表單（Sheet）：心情（必選）、反思、標籤、媒體上傳 →「完成打卡」
- 右上選單：編輯實踐、建立複本、封存、瀏覽活動、刪除
- 打卡詳情：上一筆／下一筆（同一天）、編輯打卡（儲存）、檢舉、分享這篇打卡、留言
- 編輯實踐：實踐名稱、說明、每週頻率、持續天數、每次時長、標籤、隱私設定 →「儲存」
- 實踐總結：分享總結、儲存到相簿、回到主頁
- 打卡日曆 `/practices/<id>/calendar`：完成率、目前／最長連續、進度
- 從「靈感」點進別人的實踐 → 公開檢視（PublicPracticeView），沒有擁有者選單

## 怎麼到這頁（使用者視角）
1. 底部「我的小島」→「我的實踐」點一張卡片；或主頁「我的」點實踐；或卡片上的「打卡」直接打卡。
2. 詳情頁底部主按鈕「打卡」→ 選心情 →「完成打卡」。
3. 右上「⋯」選單 →「編輯實踐」→ 修改 →「儲存」。
4. 打卡紀錄列表點一筆 → 打卡詳情 →「編輯打卡」。

## 測試帳號與前置條件
- 角色：一般使用者，且是該實踐的擁有者（非擁有者看到公開檢視）。
- 打卡需要今天在實踐期間內且今天還沒打過；「查看實踐總結」要實踐已完成或完成天數達標（index.tsx:361 `canViewSummary`）。
- 刪除無法復原，冒煙只刪自己建立的測試實踐。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 實踐卡片 | accessibilityLabel「{title}，{status}，進度 {progress}%{streak}」（`mobile.practiceCard.accessibility_label`），hint「點擊查看詳情」 | components/PracticeCard.tsx:157、186 |
| 卡片上打卡 | accessibilityLabel「打卡 {title}」（`mobile.practiceCard.check_in_practice`） | components/PracticeCard.tsx:508 |
| 詳情關閉 | accessibilityLabel「關閉」（`common.close`） | app/practices/[id]/index.tsx:432 |
| 主按鈕 | 文字「打卡」／「查看實踐總結」／「今天已完成」（`practice.mobile_checkin_action`／`view_summary`／`mobile_today_completed`） | app/practices/[id]/index.tsx:368-374 |
| 選單項目 | 文字「編輯實踐」「建立複本」「封存」「瀏覽活動」「刪除」 | app/practices/[id]/index.tsx:458-482 |
| 選單開啟鈕 | 無穩定選擇器（circular chromeless Button，無 accessibilityLabel），建議補 accessibilityLabel／testID | components/layout/dropdown-menu.tsx:25 |
| 封存確認 | Alert「即將封存這個實踐」→「封存」 | app/practices/[id]/index.tsx:205 |
| 刪除確認 | Alert「確定刪除這個實踐？」→「刪除」 | app/practices/[id]/index.tsx:225 |
| 打卡心情 | 文字「心情如何？」（`mobile.checkIn.mood_question`） | components/check-in/form/components/mood-selector.tsx:28 |
| 完成打卡 | 文字「完成打卡」（送出中「打卡中...」，`mobile.checkIn.submit`） | components/check-in/form/check-in-sheet.tsx:178 |
| 打卡詳情 | 標題「打卡詳情」；accessibilityLabel「編輯打卡」「上一筆」「下一筆」「返回」 | app/practices/[id]/check-ins/[checkInId].tsx:468、526、627、641、463 |
| 打卡編輯儲存 | 文字「儲存」（`mobile.checkInDetail.save`） | app/practices/[id]/check-ins/[checkInId].tsx:208 |
| 分享打卡 | 文字「分享這篇打卡」 | app/practices/[id]/check-ins/[checkInId].tsx:704 |
| 編輯頁 | 返回 accessibilityLabel「返回」；placeholder「輸入實踐名稱」「描述你的實踐目標」「新增標籤」；「取消」「儲存」 | app/practices/[id]/edit.tsx:231、270、284、405、475、487 |
| 編輯成功 | Alert「實踐已成功更新」 | app/practices/[id]/edit.tsx:181 |
| 總結頁 | 標題「實踐總結」；「分享總結」「儲存到相簿」 | app/practices/[id]/summary.tsx:142、263、286 |
| 日曆頁 | 標題「打卡日曆」；返回 accessibilityLabel「返回」 | app/practices/[id]/calendar.tsx:83、77 |
| 心情選項、隱私選擇、頻率按鈕 | 無穩定選擇器，建議補 testID | — |

## 怎樣算成功（可觀察的結果與證據）
- 打卡：Sheet 關閉，主按鈕變「今天已完成」，打卡紀錄列表多一筆；卡片顯示「已完成」與打卡次數 +1。失敗會跳「打卡失敗」。
- 編輯：Alert「實踐已成功更新」，回詳情頁看到新標題／設定；網頁 app-dev 同一實踐也更新。
- 封存：實踐從清單消失，出現在「設定 → 已封存的內容」（index.tsx:213 導向 /settings/archived）。
- 刪除：回主頁（index.tsx:233），清單中不再出現。
- 證據：手機截圖／錄影；資料面可用 server-dev API 或網頁版對照。

## 陷阱
- 從「靈感」進來別人的實踐是公開檢視（index.tsx:299-304），沒有擁有者選單和打卡鈕；驗擁有者功能要從「我的」進。
- 打卡日曆頁在程式中找不到導向入口（只能直接開 route），可能是孤兒頁（推測）。
- 相關已知問題卡：app-practice-edit-privacy-reset、app-practice-edit-i18n-keys、f2e-mobile-edit-cohort-privacy-400、f2e-mobile-public-practice-progress-utc（docs/plans/issue-drafts/），驗編輯／隱私／進度時先看卡片狀態。
