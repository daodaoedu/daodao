# 共同挑戰管理（主題／期／實踐模板）

管理員建立共同挑戰主題、在主題底下開一期（cohort）、指定實踐模板與靈感卡卡組，發佈到前台探索共同挑戰頁並查看參與者。

- 介面：Admin UI（daodao-admin-ui）
- dev 網址／取得方式：https://admin-dev.daodao.so/admin/group-challenges；前台結果看 https://app-dev.daodao.so/challenges（apps/product `(with-layout)/challenges/page.tsx`）
- 主要程式位置：projects/daodao-admin-ui/src/pages/GroupChallengesPage.tsx
- 依據版本：daodao-admin-ui c835bb3（2026-10-23）

## 子功能
- 主題（program）：建立主題、編輯主題、複製主題、封存主題（需先封存底下所有挑戰）
- 期（cohort）：新增一期（名稱、使用模板、開始日、結束日由模板天數推算、加入截止日、名額上限）、發佈／下架、編輯、指派卡組、複製為草稿、封存、顯示已封存、看參與者（Sheet）
- 實踐模板：新模板（實踐名稱、具體行動、持續天數、每次時長、每週最少／最多天數、實踐時段）、編輯模板、刪除模板（已綁定過的不能刪）

## 怎麼到這頁（使用者視角）
1. 登入後台 → 左側欄「共同挑戰」群組 →「挑戰管理」。
2. 頁面左邊是主題列表，點某主題那一列即選取；右邊顯示該主題的「挑戰（期）」與「實踐模板」。
3. 「建立主題」→「新模板」→「新增一期」選模板與開始日 →「發佈」。

## 測試帳號與前置條件
- 角色：admin。
- 發佈前必須指定模板（選項「尚未指定（發佈前必須指定）」）。
- 已有人加入的期：期間與模板鎖定，只能改名稱、截止日與名額（GroupChallengesPage.tsx:702 提示文字）。
- 「指派卡組」需先在「靈感卡卡組」頁建立卡組。
- 發佈的期會出現在 app-dev 前台給所有 dev 使用者看到；驗收完記得下架或封存。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 側欄入口 | role=link name「挑戰管理」，href `/admin/group-challenges` | src/components/layout/Sidebar.tsx:93 |
| 頁面標題 | 文字「共同挑戰」 | src/pages/GroupChallengesPage.tsx:1331 |
| 建立主題 | role=button name「建立主題」（空狀態也有一顆） | src/pages/GroupChallengesPage.tsx:1354、1398 |
| 主題名稱欄 | `#program-name` | src/pages/GroupChallengesPage.tsx:212 |
| 主題列操作 | aria-label「編輯主題」「複製主題」「封存主題」 | src/pages/GroupChallengesPage.tsx:1440、1453、1466 |
| 新增一期 | role=button name「新增一期」 | src/pages/GroupChallengesPage.tsx:993 |
| 期表單欄位 | `#cohort-name`、`#cohort-template`、`#cohort-start`、`#cohort-end`、`#cohort-deadline`、`#cohort-capacity` | src/pages/GroupChallengesPage.tsx:604、617、642、656、675、687 |
| 期表單內新模板 | role=button name「新模板」 | src/pages/GroupChallengesPage.tsx:636 |
| 發佈／下架 | 該列 role=button name「發佈」或「下架」 | src/pages/GroupChallengesPage.tsx:1102 |
| 期列操作 | aria-label「編輯」「指派卡組」「複製」「封存」 | src/pages/GroupChallengesPage.tsx:1108、1122、1133、1144 |
| 參與者 Sheet | SheetTitle「參與者」、關閉 aria-label「關閉」 | src/pages/GroupChallengesPage.tsx:813、822 |
| 模板區新模板 | role=button name「新模板」 | src/pages/GroupChallengesPage.tsx:1226 |
| 模板表單 | `#template-title` 等 `template-*` id | src/pages/GroupChallengesPage.tsx:371 起 |
| 模板操作 | aria-label「編輯模板」「刪除模板」 | src/pages/GroupChallengesPage.tsx:1261、1270 |
| Dialog 關閉 | aria-label「關閉」 | src/pages/GroupChallengesPage.tsx:145 |
| 主題列（選取） | 無穩定選擇器（TableRow onClick，無 role／aria-selected），建議補 data-testid；目前以主題名稱文字定位 | — |

## 怎樣算成功（可觀察的結果與證據）
- 建立主題：主題列表多一列，名稱相符、期數 0。
- 新增一期：右側「挑戰（期）」表格多一列，狀態草稿、模板欄有模板名稱（未指定會顯示「未指定模板」）。
- 發佈：瀏覽器 confirm「確定要發佈「X」？」→ 確認 → 該列狀態徽章「已發佈」、按鈕變「下架」；app-dev /challenges 看得到該期。
- 下架有人參加的期：confirm 文字提到「已有 N 人加入」（:929），下架後前台不再顯示但參與者實踐保留。

## 陷阱
- 發佈／下架／封存／刪除模板都用 `window.confirm`（:928、:933、:944、:1204、:1310）；自動化要先註冊 dialog handler 接受，否則動作不會執行。
- 封存主題前必須先封存底下所有挑戰，否則會失敗。
- 已綁定過挑戰的模板無法刪除。
- 預設選取第一個主題（:1302），畫面右側內容依選取主題而變；先確認選對主題再操作。
