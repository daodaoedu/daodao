# daodao feature map

給驗證與驗收用的共用對照表：每個使用者看得到的功能，**怎麼到這頁、用什麼穩定的選擇器操作、要用哪個角色的測試帳號、看到什麼才算成功**。參考 pstack 的 feature map 做法，站在使用者視角寫，程式內部細節到實測時再查，不凍結在這裡。

誰會讀：

- **develop**（`skills/develop/SKILL.md`，未隨本包出貨） verify 階段：決定瀏覽器驗證怎麼走、用哪些選擇器（**browser-verify.md**（`skills/develop/references/browser-verify.md`，未隨本包出貨））。
- **test-acceptance**（`skills/test-acceptance/SKILL.md`，未隨本包出貨）：照請驗收留言實測時，補到達路徑、選擇器與前置條件。請驗收留言與這裡不一致時以留言為準，差異回報後再更新這裡。

## 使用規則

- **角色，不是帳號**：這裡只寫角色（未登入、一般使用者、temp 使用者、團主／講師、admin）。角色對應哪個帳號、怎麼登入，看 **test-acceptance 的 environment.md**（`skills/test-acceptance/references/environment.md`，未隨本包出貨）。不在這裡寫信箱、密碼或 token。
- **選擇器優先序**：`data-testid`／`testID` → role + accessible name（附 zh-TW 文字與 i18n key）→ `aria-label` → route。不用產生的 CSS class、hash、子元素索引或 DOM 位置。找不到穩定選擇器就寫「無穩定選擇器，建議補 data-testid」，不要硬湊。
- **每條選擇器附依據**（`path:line`，路徑相對子專案根目錄）。行號會漂移；對不上時以實測為準，順手更新。
- **前置條件不夠就回報，不降低驗證標準**：資料不足以走完旅程時，該旅程算失敗或受阻，原因寫進該功能的「陷阱」。
- **只有 dev 環境**：所有網址都是 dev；不在 prod 驗。
- **手機版只要改 viewport**（Web）：伺服器只用 User-Agent 決定第一次渲染，client 端會立刻依視窗寬度重判並跟著 resize 切換（daodao-f2e `packages/shared/src/providers/device-provider.tsx:46-67`），所以縮 viewport 就夠。要等 `networkidle` 再量，`DOMContentLoaded` 時側欄還沒渲染（2026-10-29 在 `/settings`、`/mine` 實測）。
- **先關「安裝島島阿學」橫幅**（Web）：新瀏覽器第一次開頁會在畫面底部出現，桌機寬度也會，常擋住精靈的「下一步」或編輯頁的「儲存」。它的關閉鈕跟頁面上的其他「關閉」同名，要限定在橫幅內點（2026-10-29 #141、#357 草稿實跑）。
- **讀最新的 dev 程式**：本機 `projects/` 底下的 checkout 可能落後 dev 很多，查選擇器時用 `git show origin/dev:<path>`，不要只看本機檔案。

## 功能索引

（依介面分組；每個功能一個檔案。各檔開頭的「依據版本」是撰寫時讀的程式版本，行號以那一版為準）

### Web（apps/product，`https://app-dev.daodao.so`）

一般瀏覽器即可操作。

| 功能 | 用途 |
|---|---|
| [登入與註冊引導（Auth / Onboarding）](web/auth-onboarding.md) | 使用者用 Google 帳號登入島島阿學；第一次登入的新用戶（temp）會被帶去填個人資料完成註冊，email 未驗證者會被帶去驗證頁。 |
| [學員端：探索與加入活動／共同挑戰、本期內容](web/cohort-student.md) | 學員探索活動課程與共同挑戰，透過邀請連結加入團，加入後在本期頁面啟用實踐、看本期參與者的打卡動態並管理隱私與退出。 |
| [給未來的信（我的足跡時間軸）](web/future-letter.md) | 使用者寫一封信給未來的自己、選送達時間（可關聯一個實踐），信在送達前封存看不到內容，送達後在「我的足跡」時間軸上打開閱讀或永久刪除。 |
| [首頁動態牆與全站導覽](web/home-feed.md) | 使用者在首頁看別人的打卡、互動與新實踐（靈感動態牆），搜尋靈感，從「你的今天」接續自己的實踐，並透過側欄／底部導覽前往各主要功能；人物誌分頁可讀別人的學習故事並分享自己的。 |
| [燈塔（講師／團主管理端）](web/lighthouse-instructor.md) | 講師或團主在燈塔建立系列與場次、邀請成員、追蹤每場次的打卡節律與今日焦點、傳訊息給學員、產出成果報告，並管理模板庫與組織設定。 |
| [訊息（群組聊天室）](web/messages.md) | 使用者在自己加入的群組（團／空間）聊天室裡看未讀、讀訊息、發訊息、回覆、置頂與搜尋。 |
| [我的（學員首頁 /mine）](web/mine-dashboard.md) | 學員登入後在「我的」分頁看自己的實踐進度、參加中的活動，並從右下角「新增」選單開始建立實踐或活動。 |
| [最新通知（Notifications）](web/notifications.md) | 使用者查看別人對自己的互動（回應、留言、提及、關注、連結請求、打卡、完成實踐等），點通知跳到對應內容，並可處理連結請求、全部標為已讀。 |
| [建立實踐](web/practice-create.md) | 使用者從模板挑一個主題，或自己從頭填寫，建立一個新的個人實踐（也可複製別人的實踐）。 |
| [實踐詳情、打卡與互動](web/practice-detail-checkin.md) | 使用者打開一個實踐，看內容與打卡紀錄；擁有者在這裡打卡、編輯、封存或看總結，其他人可以按心情回應、留言、關注或複製。 |
| [個人頁、關注與夥伴連結](web/profile-follow.md) | 使用者看別人或自己的個人頁（我的小島），關注／取消關注使用者與實踐，送出與處理夥伴連結請求，並看學習足跡（未來信時間軸）。 |
| [公開內容頁（學習資源、Roadmap、問卷）](web/resources-content.md) | 訪客與使用者免登入瀏覽學習資源與分類、在 Roadmap 看島島的開發進度並支持／許願，以及透過分享連結填寫問卷。 |
| [設定（Settings）](web/settings.md) | 使用者管理自己的偏好、帳號、公開資訊、通知與互動開關、已封存內容、關注／連結名單，並回報錯誤與登出。 |
| [空間（Spaces）](web/spaces.md) | 使用者在「空間」列表看到自己的個人實踐、共同挑戰、活動課程空間；發起人可在活動課程空間編排空間首頁並分享公開連結給訪客。 |

### 管理後台（daodao-admin-ui，`https://admin-dev.daodao.so/admin/`）

全部頁面要 admin 角色。沒有 `data-testid`，靠表單 `id`、`aria-label`、按鈕文字與側欄連結；破壞性動作多用 `window.confirm`，自動化要先處理 dialog。

| 功能 | 用途 |
|---|---|
| [後台登入與 Dashboard](admin/dashboard.md) | 管理員登入後台，看今日註冊、DAU/WAU/MAU、社群互動、活化率、AI 費用等營運指標。 |
| [信件管理（發送紀錄／手動發信／失敗重試）](admin/email-management.md) | 管理員查看系統寄信歷史與狀態、手動寄信給指定對象、重送失敗的信。 |
| [信件模板管理與編輯](admin/email-templates.md) | 管理員新增、編輯、啟用／停用、刪除系統寄信用的 HTML 模板，並在編輯頁即時預覽桌機／手機版樣式與變數。 |
| [意見回饋](admin/feedback.md) | 管理員查看用戶送來的建議與問題回報，篩選、展開內容、回覆並變更處理狀態。 |
| [共同挑戰管理（主題／期／實踐模板）](admin/group-challenges.md) | 管理員建立共同挑戰主題、在主題底下開一期（cohort）、指定實踐模板與靈感卡卡組，發佈到前台探索共同挑戰頁並查看參與者。 |
| [主題實踐管理](admin/practices.md) | 管理員檢視全站使用者的主題實踐：統計、篩選、查看單筆詳情，並單筆或批次變更實踐狀態。 |
| [問卷管理](admin/surveys.md) | 管理員建立與編輯問卷、變更狀態、預覽填寫頁、看回應與分析結果。 |
| [用戶管理與用戶詳情](admin/user-management.md) | 管理員搜尋、篩選用戶，設定角色、上標籤、停用／啟用帳號，並點進單一用戶看活動、登入、實踐與人物誌。 |

### App（apps/mobile）

**不能用瀏覽器操作**：沒有網頁版、Expo Go 打不開。要裝 dev build（EAS preview「Dao Dao (Dev)」或 iOS 模擬器），登入只有 Google／Apple。沒有 `testID`，靠 `accessibilityLabel`。沒有可安裝的測試版時，App 步驟一律受阻。

| 功能 | 用途 |
|---|---|
| [建立主題實踐](app/create-practice.md) | 使用者從提案模板或自己手動（5 步驟）建立一個新的主題實踐。 |
| [主頁（靈感／我的／人物誌）](app/home.md) | 使用者在 App 主頁瀏覽別人的實踐與打卡動態（靈感）、看自己的實踐清單與 AI 推薦主題（我的）、看學習人物誌。 |
| [App 登入／登出](app/login.md) | 使用者用 Google 或 Apple 帳號登入島島 App，之後才能使用所有分頁；在設定頁登出。 |
| [最新通知](app/notifications.md) | 使用者在 App 看別人對自己的反應、留言、提及、關注、打卡、連結請求等通知，點通知跳到對應頁，並處理連結請求。 |
| [實踐詳情、打卡與編輯](app/practice-detail.md) | 使用者打開自己的主題實踐，做今日打卡、看與編輯打卡紀錄、編輯／複製／封存／刪除實踐，完成後看實踐總結。 |
| [我的小島（個人頁）](app/profile.md) | 使用者看自己的個人資訊、學習類型測驗結果、自己的主題實踐清單與學習人物誌，並進入編輯公開資訊。 |
| [學習資源](app/resources.md) | 使用者瀏覽、搜尋、依分類篩選學習資源（課程、工具、書籍、社群材料），並查看單筆資源詳情與評價。 |
| [設定（帳號、公開資訊、通知、偏好、社交）](app/settings.md) | 使用者在設定分頁管理公開資訊、帳號、通知、領域偏好、互動與關注、連結的夥伴、已封存內容，切換語言或登出。 |

## 檢查 feature map 還準不準

```bash
pnpm -s tsx bin/pipeline/feature-map-audit.ts [--fetch] [--json]   # 在 daodao root 跑；唯讀
```

逐份檢查每個 `path:line` 在 dev（`origin/dev`）還存在、行號沒有超出檔案長度，以及每個 `data-testid` 在程式碼找得到；有失效引用就 exit 1。另外會列出「撰寫後引用的檔案被改過幾次」，數字大的那份內容可能過時，要抽查實際畫面。只查得到引用是否存在，查不到按鈕文字、行為是否還一樣——那要在瀏覽器實跑（2026-10-29 首次手動跑：30 份、0 個失效引用）。

## 新增或更新一個功能

複製下面的範本成 `<介面>/<slug>.md`，並把它加進上面的索引。改到 UI（路徑、按鈕文字、testid）的 PR 順手更新對應檔案。

```markdown
# <功能名稱>

<一句話：使用者用它做什麼>

- 介面：Web（apps/product）／App（apps/mobile）／Admin UI（daodao-admin-ui）
- dev 網址：<完整網址或取得方式>
- 主要程式位置：<path>

## 子功能
## 怎麼到這頁（使用者視角）
## 測試帳號與前置條件
## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|---|---|---|
## 怎樣算成功（可觀察的結果與證據）
## 陷阱
```
