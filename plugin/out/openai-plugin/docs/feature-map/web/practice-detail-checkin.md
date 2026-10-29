# 實踐詳情、打卡與互動

使用者打開一個實踐，看內容與打卡紀錄；擁有者在這裡打卡、編輯、封存或看總結，其他人可以按心情回應、留言、關注或複製。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/practices/<practiceId>（另 `/practices/<id>/check-ins/<checkInId>`、`/practices/<id>/edit`、`/practices/<id>/summary`；host 依據 daodao-infra/README.md:39）
- 主要程式位置：apps/product/src/app/[locale]/practices/[id]/、apps/product/src/components/practice/detail/practice-detail-shell.tsx、apps/product/src/components/check-in/
- 依據版本：daodao-f2e 70155dce（2026-10-29）

> 以下路徑皆相對 projects/daodao-f2e；i18n 字串依 namespace 分檔於 `packages/i18n/src/locales/zh-TW/<namespace>.json`。

## 子功能

- 詳情頁：標題、更多資訊、心情回應統計、三個分頁（留言／打卡紀錄／使用資源），`?tab=comments|checkins|resources` 可直接指定分頁（apps/product/src/components/practice/detail/practice-detail-shell.tsx:143-146、361-368）。
- 打卡（擁有者）：頁底固定按鈕開打卡 sheet：心情、標籤（至少 1 個）、想法、照片（apps/product/src/app/[locale]/practices/[id]/page.tsx:518-533；apps/product/src/components/check-in/form/schema.ts:22）。
- 提早開始：今天早於開始日時會先跳確認對話框（apps/product/src/components/check-in/form/check-in-sheet.tsx:219-232）；共同挑戰在開始日前按鈕直接 disable「開始日再一起打卡」（apps/product/src/components/check-in/form/check-in-sheet.tsx:204-208）。
- 打卡成功對話框：顯示進度變化與鼓勵句（apps/product/src/hooks/use-check-in-success-dialog.tsx:336-354）。
- 單筆打卡頁：`/practices/[id]/check-ins/[checkInId]`，擁有者可編輯該筆打卡，頁底同樣有打卡按鈕（apps/product/src/app/[locale]/practices/[id]/check-ins/[checkInId]/page.tsx:268-345）。
- 回應與留言：心情回應（ReactionPickerButton，長按/點擊）、留言、回覆、@提及、編輯／刪除自己的留言（apps/product/src/components/check-in/reactions/）。
- 擁有者選單：編輯、建立複本、封存、看瀏覽活動、刪除（apps/product/src/components/practice/detail/practice-detail-shell.tsx:495-564）。
- 非擁有者選單：檢舉、關注／取消關注、看瀏覽活動（apps/product/src/components/practice/detail/practice-detail-shell.tsx:567-606）；以及「我也想實踐」複製鈕（apps/product/src/components/practice/detail/practice-detail-shell.tsx:634-657）。
- 編輯頁：`/practices/[id]/edit`，四段表單（沿用 manual steps）。共同挑戰實踐鎖名稱、期間與隱私（頻率仍可改）；已有打卡紀錄的實踐鎖期間與頻率（apps/product/src/app/[locale]/practices/[id]/edit/page.tsx:92-104、286-334）。
- 總結頁：`/practices/[id]/summary`，只有擁有者且實踐已到期才看得到（apps/product/src/app/[locale]/practices/[id]/summary/page.tsx:94-113）。

## 怎麼到這頁（使用者視角）

1. 擁有者：首頁「你的今天」或 `/mine` 點自己的實踐卡 → `/practices/<id>`（apps/product/src/components/dashboard/your-today.tsx:80、apps/product/src/components/dashboard/in-progress-task-card.tsx:73）；或建立完成後「看看我的實踐」回首頁再點進去。
2. 訪客／他人：首頁動態牆的實踐卡或打卡卡（apps/product/src/app/[locale]/(with-layout)/page.tsx 的 PracticeShowcaseCard / CheckInShowcaseCard）、或分享連結直接開。
3. 打卡：詳情頁底部「打卡」→ 選心情 → 選/加標籤 → 寫想法 →「完成打卡」→ 成功對話框「完成」。
4. 實踐到期後，同一顆按鈕變「觀看總結」→ `/practices/<id>/summary`（apps/product/src/components/check-in/form/check-in-sheet.tsx:211-214）。
5. 右上「⋯」→「編輯」→ `/practices/<id>/edit` → 「儲存」回詳情頁。

## 測試帳號與前置條件

- `/practices/[id]`、`/practices/[id]/check-ins/*` 為公開路徑（apps/product/src/app/global-provider.tsx:68-69），未登入可看；按回應、留言、關注、「我也想實踐」會導去 `/auth/login?redirect=...`（apps/product/src/components/practice/detail/practice-detail-shell.tsx:396、453、642）。
- `/practices/[id]/edit`、`/practices/[id]/summary` 受保護（不在 publicPattern），需一般使用者登入。
- 打卡按鈕只在擁有者看得到（apps/product/src/app/[locale]/practices/[id]/page.tsx:519 `isOwner ? ... : null`；isOwner = 實踐 user.id === 目前使用者 id，apps/product/src/app/[locale]/practices/[id]/page.tsx:145）。
- 前置資料：
  - 擁有者帳號 + 一個進行中、未封存、未到期的實踐（可打卡）。
  - 另一個帳號（看他人視角：回應／留言／複製）。
  - 已到期（endDate 已過且非 archived）的實踐才能驗總結頁（apps/product/src/components/check-in/form/hooks/use-check-in-status.ts:39-43）。
  - 共同挑戰實踐（isChallenge）驗編輯鎖定與開始日前 disable。

## 穩定的選擇器

| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| 關閉詳情頁（回首頁 `/`） | `getByRole('button', { name: '關閉' })` | apps/product/src/app/[locale]/practices/[id]/page.tsx:392-394、413-415、443-445（`PRACTICE_DETAIL_CLOSE_PATH`，apps/product/src/constants/home-navigation.ts:8）；`practice.close` packages/i18n/src/locales/zh-TW/practice.json:66 |
| 找不到實踐 | `getByText('找不到此實踐')` | apps/product/src/app/[locale]/practices/[id]/page.tsx:423；`practice.not_found` packages/i18n/src/locales/zh-TW/practice.json:56 |
| 右上「⋯」選單鈕 | 無穩定選擇器（icon button 無 aria-label），建議補 aria-label 或 data-testid | apps/product/src/components/practice/detail/practice-detail-shell.tsx:485-493 |
| 選單：編輯 | `getByRole('button', { name: '編輯' })` | apps/product/src/components/practice/detail/practice-detail-shell.tsx:507；`practice.action_edit` packages/i18n/src/locales/zh-TW/practice.json:9 |
| 選單：建立複本 | `getByRole('button', { name: '建立複本' })` | apps/product/src/components/practice/detail/practice-detail-shell.tsx:528；packages/i18n/src/locales/zh-TW/practice.json:13 |
| 選單：封存 → 確認 | `getByRole('button', { name: '封存' })` → `getByRole('button', { name: '確定封存' })` | apps/product/src/components/practice/detail/practice-detail-shell.tsx:540；apps/product/src/hooks/use-archive-practice-dialog.tsx:46-51；packages/i18n/src/locales/zh-TW/practice.json:11、28 |
| 選單：刪除 → 確認 | `getByRole('button', { name: '刪除' })` → `getByRole('button', { name: '確定刪除' })` | apps/product/src/components/practice/detail/practice-detail-shell.tsx:554-562；確認框 apps/product/src/hooks/use-delete-practice-dialog.tsx:35-40；`practice.delete_confirm` packages/i18n/src/locales/zh-TW/practice.json:7 |
| 選單（他人）：檢舉／關注 | `getByRole('button', { name: '檢舉' })`、`{ name: '關注' }`（已關注時文字為 `action_unfollow`） | apps/product/src/components/practice/detail/practice-detail-shell.tsx:579、596；packages/i18n/src/locales/zh-TW/practice.json:14-15 |
| 我也想實踐（他人） | `getByRole('button', { name: '我也想實踐' })` | apps/product/src/components/practice/detail/practice-detail-shell.tsx:657；packages/i18n/src/locales/zh-TW/practice.json:17 |
| 更多資訊展開 | `getByRole('button', { name: '更多資訊' })` | apps/product/src/components/practice/detail/practice-detail-shell.tsx:663-666；packages/i18n/src/locales/zh-TW/practice.json:19 |
| 分頁 | `getByRole('button', { name: /^留言/ })`、`/^打卡紀錄/`、`/^使用資源/`（有數量時文字為「留言(3)」） | apps/product/src/components/practice/detail/practice-detail-shell.tsx:811-826；packages/i18n/src/locales/zh-TW/practice.json:2-4 |
| 留言數捷徑鈕 | 無穩定選擇器（只有 icon + 數字），建議補 aria-label | apps/product/src/components/practice/detail/practice-detail-shell.tsx:786-798 |
| 心情回應鈕 | 無穩定 aria-label（ReactionPickerButton），建議補 data-testid | apps/product/src/components/check-in/reactions/reaction-picker-button.tsx:214、300 |
| 留言輸入框 | `getByPlaceholder('寫下你的留言...')`（已選心情時 placeholder 會清空） | apps/product/src/components/check-in/reactions/comment-section.tsx:723；`app_product.comments_placeholder` packages/i18n/src/locales/zh-TW/app-product.json:277 |
| 留言送出 | 無 aria-label 的 icon 按鈕，建議補；替代：輸入框按 Enter（回覆框才支援 Enter，主輸入框需確認） | apps/product/src/components/check-in/reactions/comment-section.tsx:731-738、673-676 |
| 留言空狀態 | `getByText('尚未有留言')` | apps/product/src/components/check-in/reactions/comment-section.tsx:751；packages/i18n/src/locales/zh-TW/app-product.json:278 |
| 打卡按鈕 | `getByRole('button', { name: '打卡' })`；到期為「觀看總結」、封存為「實踐已完成」（disabled） | apps/product/src/components/check-in/form/check-in-sheet.tsx:248-256、apps/product/src/components/check-in/form/hooks/use-check-in-status.ts:54-65；packages/i18n/src/locales/zh-TW/check-in.json:114、111、112 |
| 共同挑戰未開始 | `getByRole('button', { name: '開始日再一起打卡' })` 應 disabled | apps/product/src/components/check-in/form/check-in-sheet.tsx:256；packages/i18n/src/locales/zh-TW/check-in.json:53 |
| 打卡：心情 | `getByRole('radio', { name: <心情名稱> })`（sr-only RadioGroupItem 帶 aria-label） | apps/product/src/components/check-in/form/components/mood-selector.tsx:54-58；題目「心情如何?」packages/i18n/src/locales/zh-TW/check-in.json:60 |
| 打卡：自訂標籤 | `getByRole('textbox', { name: '輸入自訂標籤' })` + `getByRole('button', { name: '加入標籤' })` | apps/product/src/components/check-in/form/components/tag-selector.tsx:162-179；packages/i18n/src/locales/zh-TW/check-in.json:70-71 |
| 打卡：想法 | `getByPlaceholder('簡單紀錄今天的發現，或卡關的地方')` | apps/product/src/components/check-in/form/components/description-field.tsx:45；packages/i18n/src/locales/zh-TW/check-in.json:59 |
| 打卡：上傳照片 | `getByText('上傳照片')`（搭配 `setInputFiles` 於其 input） | apps/product/src/components/check-in/form/components/media-upload-field.tsx:131；packages/i18n/src/locales/zh-TW/check-in.json:22 |
| 打卡：送出 | `getByRole('button', { name: '完成打卡' })` | apps/product/src/components/check-in/form/check-in-sheet.tsx:114-116；`check_in.submit_check_in` packages/i18n/src/locales/zh-TW/check-in.json:18 |
| 打卡成功對話框 | `getByText('打卡成功!')` + `getByRole('button', { name: '完成' })` | apps/product/src/hooks/use-check-in-success-dialog.tsx:344、354；packages/i18n/src/locales/zh-TW/check-in.json:42、46 |
| 單筆打卡頁標題 | `getByText('打卡紀錄')`（PageHeader） | apps/product/src/app/[locale]/practices/[id]/check-ins/[checkInId]/page.tsx:311；`practice.checkin_title` packages/i18n/src/locales/zh-TW/practice.json:67 |
| 編輯頁：名稱／行動 | `getByPlaceholder('例如：閱讀《原子習慣》')`、`getByPlaceholder('例如：圖書館借閱，每天閱讀 30 頁')` | apps/product/src/components/practice/create/manual/steps/step-1.tsx:40、68；packages/i18n/src/locales/zh-TW/practice.json:108、110 |
| 編輯頁：儲存／取消 | `getByRole('button', { name: '儲存' })`、`{ name: '取消' }` | apps/product/src/app/[locale]/practices/[id]/edit/page.tsx:320-334；packages/i18n/src/locales/zh-TW/practice.json:86、85 |
| 編輯頁：共同挑戰鎖定提示 | `getByText(/這是共同挑戰的實踐/)`（全文「這是共同挑戰的實踐：名稱、期間與隱私由挑戰統一設定，無法在這裡修改。」） | apps/product/src/app/[locale]/practices/[id]/edit/page.tsx:290-292；packages/i18n/src/locales/zh-TW/practice.json:80 |

## 怎樣算成功（可觀察的結果與證據）

- 打卡：loading toast「打卡中...」→ 成功對話框「打卡成功!」顯示新進度與鼓勵句（apps/product/src/components/check-in/form/hooks/use-check-in-submit.ts:39、60-79）；`POST` 打卡 API（useCreatePracticeCheckIn）回 2xx；關閉後「打卡紀錄」分頁數量 +1、新紀錄在最上面。失敗 toast「打卡失敗，請稍後再試」（或 server 錯誤訊息），且不關閉打卡 sheet（apps/product/src/components/check-in/form/hooks/use-check-in-submit.ts:33-36、55-58；packages/i18n/src/locales/zh-TW/check-in.json:103）。
- 未選標籤送出會顯示 `validation_tags_required` 錯誤（apps/product/src/components/check-in/form/schema.ts:22），不應送出 API。
- 留言：送出後 toast `comment_success`（apps/product/src/app/[locale]/practices/[id]/page.tsx:327），留言出現在列表、「留言(n)」數字 +1；以另一帳號或未登入重整仍看得到。
- 編輯：toast「實踐已成功更新」並導回 `/practices/<id>`（apps/product/src/app/[locale]/practices/[id]/edit/page.tsx:241-242；packages/i18n/src/locales/zh-TW/practice.json:84），詳情頁顯示新內容。
- 封存：確認後導到 `/settings/archived`（apps/product/src/app/[locale]/practices/[id]/page.tsx:265-281）；刪除：確認後 toast `delete_success` 並導到 `/`（apps/product/src/app/[locale]/practices/[id]/page.tsx:289-303），再開原網址顯示「找不到此實踐」。
- 複製：導到 `/practices/copy-success?practiceId=<新 id>`（apps/product/src/components/practice/detail/practice-detail-shell.tsx:517、648）。
- 總結：擁有者 + 已到期 → 看到 PracticeSummaryPage；非擁有者或未到期會 `router.replace` 回詳情頁（apps/product/src/app/[locale]/practices/[id]/summary/page.tsx:94-104）。首次顯示 toast「你的實踐打卡內容已公開」（apps/product/src/app/[locale]/practices/[id]/summary/page.tsx:75；packages/i18n/src/locales/zh-TW/practice.json:76）。

## 陷阱

- 「⋯」選單與留言送出鈕沒有可存取名稱，只能靠 DOM 位置，這是目前最大的自動化缺口。暫行做法：在詳情頁找標題列右側沒有文字也沒有 aria-label 的按鈕（2026-10-29 實測時是頁面上第 2 個 button），點開後再 `getByRole('button', { name: '編輯' })`；畫面改版就會失效，先截圖確認。
- 打卡按鈕在 `position: fixed` 的 footer，手機寬度可能蓋住頁底內容；sheet 是否為 Drawer/Dialog 依裝置（SheetManagerProvider）不同，選擇器請以 role/文字為主。
- 非擁有者看不到打卡按鈕，用錯帳號會以為「按鈕壞了」。
- 開始日在未來的個人實踐：按打卡會先跳「提早開始」確認，確認後後端會改起迄日——這是寫入，測試要用可丟棄的實踐。
- 共同挑戰實踐（isChallenge）沒有「我也想實踐」，編輯頁名稱與期間 disabled（apps/product/src/app/[locale]/practices/[id]/edit/page.tsx:295-298）。
- 編輯頁沒有在前端檢查是否為擁有者（apps/product/src/app/[locale]/practices/[id]/edit/page.tsx 無 isOwner 判斷），他人直接開 `/edit` 的行為要看後端回應（推測 403 → toast「edit_save_failed」）。
- 刪除確認對話框的「確定刪除」是 outline 樣式、「先不要」是主色（apps/product/src/hooks/use-delete-practice-dialog.tsx:39-40），別依顏色判斷。
- 打卡沒有冷卻（isCheckInLocked = false，apps/product/src/components/check-in/form/hooks/use-check-in-status.ts:36），同一天可重複打卡，重複執行測試會累積資料。
- `?from=copy` 由複製成功頁帶入，`?tab=` 可直接切分頁，方便截圖證據。
