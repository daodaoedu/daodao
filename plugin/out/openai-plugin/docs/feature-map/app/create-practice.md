# 建立主題實踐

使用者從提案模板或自己手動（5 步驟）建立一個新的主題實踐。

- 介面：App（apps/mobile）
- dev 網址／取得方式：沒有網頁版；裝 dev App「Dao Dao (Dev)」（見 login.md）
- 主要程式位置：projects/daodao-f2e/apps/mobile/app/practices/create/index.tsx、app/practices/create/[templateId].tsx、app/practices/create/manual/step1-5.tsx、app/practices/create/success.tsx、components/practice/create/manual/ManualStepShell.tsx
- 依據版本：daodao-f2e 6034e986（2026-10-23）

## 子功能
- 選類別 → 選提案（模板）→ 模板頁「換一個」／「看起來不錯」直接建立
- 「我想自己建立」→ 手動 5 步驟：
  1. 名稱、實踐行動
  2. 開始日期、想要持續多久、每週實踐頻率
  3. 每次執行時間、執行時機（多選、其他時段）
  4. 標籤、使用的資源（名稱＋https 網址）
  5. 預覽（我建立的實踐是…）→「完成新增」
- 成功頁「太棒啦！」：「開始主題實踐」或「回到主頁」，倒數後自動跳轉

## 怎麼到這頁（使用者視角）
1. 主頁右下圓形「＋」（FAB）→ 進 /practices/create。
2. 點一個類別，再點一個提案；或按「我想自己建立」。
3. 手動流程每步按「下一步」，最後一步「完成新增」。

## 測試帳號與前置條件
- 角色：一般使用者。
- 建立會寫進 dev 資料庫並可能觸發實踐提醒信；冒煙完要刪掉該實踐（browser-verify.md 清理步驟 3）。
- 資源網址必須是 https（step4.tsx:80）。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 入口 FAB | accessibilityLabel「建立主題實踐」（`mobile.tabs.createPractice`） | app/(tabs)/_layout.tsx:160 |
| 返回 | accessibilityLabel「返回」（`common.back`） | app/practices/create/index.tsx:120 |
| 選類別 | accessibilityLabel「選擇類別：{label}」（`practice.create_select_category_label`） | app/practices/create/index.tsx:191 |
| 選提案 | accessibilityLabel「選擇提案：{title}」（`practice.create_select_practice_label`） | app/practices/create/index.tsx:257 |
| 自己建立 | accessibilityLabel「我想自己建立」（`practice.create_manual`） | app/practices/create/index.tsx:298 |
| 模板頁換一個 | accessibilityLabel「換一個」（`practice.template_swap`） | app/practices/create/[templateId].tsx:490 |
| 模板頁建立 | accessibilityLabel「看起來不錯」（`practice.template_looks_good`）；建立中文字「建立中...」 | app/practices/create/[templateId].tsx:590、597 |
| 手動步驟關閉／上一步 | accessibilityLabel「關閉」（`common.close`）、「上一步」（`practice.manual_prev_step`） | components/practice/create/manual/ManualStepShell.tsx:126、207 |
| 下一步 | 文字「下一步」（`practice.manual_next_step`） | app/practices/create/manual/step1.tsx:47 |
| 名稱／行動輸入 | placeholder「例如：閱讀《原子習慣》」「例如：圖書館借閱，每天閱讀 30 頁」 | app/practices/create/manual/step1.tsx:69、118 |
| 開始日期 | placeholder「選擇日期」（`practice.form_start_date_placeholder`） | app/practices/create/manual/step2.tsx:106 |
| 其他時段 | placeholder「你特別想在什麼時候執行呢？」 | app/practices/create/manual/step3.tsx:172 |
| 標籤／資源 | placeholder「新增標籤」「資源名稱」「網址（選填），例如 https://www.google.com/」 | app/practices/create/manual/step4.tsx:150、197、207 |
| 完成新增 | 文字「完成新增」（`practice.manual_finish`） | app/practices/create/manual/step5.tsx:178 |
| 成功頁 | 文字「太棒啦！」「開始主題實踐」「回到主頁」（`mobile.practiceSuccess.*`） | app/practices/create/success.tsx:60、90、99 |
| 持續天數、頻率、時長滑桿 | 無穩定選擇器，建議補 testID | — |

## 怎樣算成功（可觀察的結果與證據）
- 出現成功頁「太棒啦！」；按「開始主題實踐」進 `/practices/<新 id>` 詳情頁（success.tsx:32），標題與輸入一致。
- 主頁「我的」與「我的小島 → 我的實踐」出現這筆實踐。
- 同一帳號在 app-dev.daodao.so 網頁版也看得到（同一份 dev 資料）。
- 失敗時跳 Alert「建立實踐失敗」。

## 陷阱
- 模板建立成功後用 `router.replace` 而不是 push（[templateId].tsx:164、235 註解），返回鍵行為跟一般頁不同。
- 有相關已知問題卡：app-practice-edit-custom-frequency、app-practice-edit-challenge-400（docs/plans/issue-drafts/），驗頻率／挑戰相關時先看卡片狀態。
