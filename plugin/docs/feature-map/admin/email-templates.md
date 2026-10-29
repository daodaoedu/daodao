# 信件模板管理與編輯

管理員新增、編輯、啟用／停用、刪除系統寄信用的 HTML 模板，並在編輯頁即時預覽桌機／手機版樣式與變數。

- 介面：Admin UI（daodao-admin-ui）
- dev 網址／取得方式：列表 https://admin-dev.daodao.so/admin/email-templates；編輯 https://admin-dev.daodao.so/admin/email-templates/:id/edit
- 主要程式位置：projects/daodao-admin-ui/src/pages/EmailTemplatesPage.tsx、src/pages/EmailTemplateEditorPage.tsx
- 依據版本：daodao-admin-ui c835bb3（2026-10-23）

## 子功能
- 列表：模板名稱、主旨、變數、建立時間；每列「啟用發送／停用發送」切換、「編輯」、「刪除」（需確認）
- 新增模板彈窗：可「從現有模板帶入」、填模板名稱／主旨／內容（HTML，`{{variable}}`），自動列出偵測到的變數
- 編輯頁：主旨、預覽文字、HTML 內容（CodeMirror）、預覽變數（本模板使用的變數＋全站可用變數，可搜尋）、桌機／手機預覽、儲存

## 怎麼到這頁（使用者視角）
1. 登入後台 → 左側欄「信件」群組 →「模板管理」。
2. 新增：按「新增模板」→ 填欄位 → 送出。
3. 編輯：在某列按鉛筆圖示（title「編輯」）→ 進編輯頁 → 改內容 →「儲存」；左上「返回」回列表。

## 測試帳號與前置條件
- 角色：admin。
- 改到有 slug 的系統模板會影響 dev 真實寄出的信（寄信端依 slug 讀模板）。驗收時優先新增一個測試模板，或改完立刻還原。
- 不要為了看信而對不存在的信箱寄信（memory：smoke email never fake）；要看寄出結果改看「信件管理 → 發送紀錄」。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 側欄入口 | role=link name「模板管理」，href `/admin/email-templates` | src/components/layout/Sidebar.tsx:116 |
| 頁面標題 | 文字「信件模板」 | src/pages/EmailTemplatesPage.tsx:366 |
| 新增模板鈕 | role=button name「新增模板」 | src/pages/EmailTemplatesPage.tsx:376 |
| 彈窗標題 | role=heading「新增模板」／「編輯模板」 | src/pages/EmailTemplatesPage.tsx:117 |
| 帶入現有模板 | `#tpl-copy`；搜尋 placeholder「搜尋模板名稱或主旨…」 | src/pages/EmailTemplatesPage.tsx:133、149 |
| 模板名稱／主旨／內容 | `#tpl-name`、`#tpl-subject`、`#tpl-body` | src/pages/EmailTemplatesPage.tsx:195、211、227 |
| 啟用／停用發送 | aria-label「{模板名稱}停用發送」或「{模板名稱}啟用發送」 | src/pages/EmailTemplatesPage.tsx:458-459 |
| 編輯連結 | role=link title「編輯」，href `/admin/email-templates/<id>/edit` | src/pages/EmailTemplatesPage.tsx:464-466 |
| 刪除鈕 | title「刪除」（icon 按鈕，無 aria-label） | src/pages/EmailTemplatesPage.tsx:302 |
| 刪除確認 | 文字「確認刪除模板？」 | src/pages/EmailTemplatesPage.tsx:314 |
| 空列表 | 文字「尚無模板，點擊「新增模板」開始建立。」 | src/pages/EmailTemplatesPage.tsx:402 |
| 編輯頁返回 | role=button name「返回」 | src/pages/EmailTemplateEditorPage.tsx:147、163 |
| 儲存 | role=button name「儲存」 | src/pages/EmailTemplateEditorPage.tsx:207 |
| 儲存成功 | 文字「已儲存，最多 5 分鐘後生效」（有 slug）或「已儲存」 | src/pages/EmailTemplateEditorPage.tsx:193 |
| 預覽文字欄 | placeholder「郵件列表摘要（可選）」 | src/pages/EmailTemplateEditorPage.tsx:251 |
| 變數搜尋 | aria-label「搜尋全站變數」 | src/pages/EmailTemplateEditorPage.tsx:276 |
| HTML 編輯器 | aria-label「HTML 內容」 | src/pages/EmailTemplateEditorPage.tsx:316 |
| 桌機／手機預覽切換 | title「桌機」、「手機」 | src/pages/EmailTemplateEditorPage.tsx:334、342 |
| 預覽 iframe | `iframe[title="email-preview"]` | src/pages/EmailTemplateEditorPage.tsx:357 |
| 表格某一列 | 無穩定選擇器，建議補 data-testid（目前用列內模板名稱文字定位） | — |

## 怎樣算成功（可觀察的結果與證據）
- 新增：彈窗關閉、列表多一列，名稱與主旨相符；重新整理仍在。
- 編輯：按「儲存」後出現「已儲存…」，且一直留到下次編輯（EmailTemplateEditorPage.tsx:60 註解，#236）；重新進編輯頁內容是新的。
- 預覽：改 HTML 後 `iframe[title="email-preview"]` 內容同步更新；切「手機」寬度變窄。
- 停用發送：該列 aria-label 從「…停用發送」變「…啟用發送」。

## 陷阱
- 寄信端有 5 分鐘模板快取（EmailTemplateEditorPage.tsx:221-229）：存檔後立刻寄信可能仍是舊內容，不是 bug。
- 沒有 slug 的模板不會被寄信流程使用；改它不會影響任何寄出的信。
- 存檔會不會刪減「本模板使用的變數」清單：#292 已關閉（AC-01），驗收時可順手確認變數數量存檔前後一致。
- 刪除無法復原，且「使用此模板的觸發規則可能受影響」（EmailTemplatesPage.tsx:316）。
