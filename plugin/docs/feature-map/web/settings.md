# 設定（Settings）

使用者管理自己的偏好、帳號、公開資訊、通知與互動開關、已封存內容、關注／連結名單，並回報錯誤與登出。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/settings （host 依據 `daodao-infra/README.md:39`）
- 主要程式位置：`apps/product/src/app/[locale]/(with-layout)/settings/`、`apps/product/src/components/settings/`、`apps/product/src/components/layout/sidebar/account-menu.tsx`、`apps/product/src/components/layout/sidebar/mobile-bottom-sheet.tsx`
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- `/settings`：設定完整度提示（「個人設定完整度 X/Y」，未完成的項目旁有警示 icon）＋清單（領域偏好設定、帳號設定、公開資訊設定、通知設定）＋登出（`apps/product/src/components/settings/settings-list.tsx:18-46,76-104,107-118`）
- `/settings/preferences`：領域偏好，儲存後回 `/settings`（`apps/product/src/components/settings/preferences/preferences-form.tsx:205-211,319-324`）
- `/settings/account`：帳號設定（身分、專業領域、探索領域、教育階段），儲存後回 `/settings`（`apps/product/src/components/settings/account/account-form.tsx:146-152,229-234`）
- `/settings/public-info`：頭像、公開名稱、使用者 ID、簡介、社群連結（`apps/product/src/components/settings/public-info/*.tsx`，submit 在 `apps/product/src/components/settings/public-info/public-info-form.tsx:268-273`）
- `/settings/notifications`：通知總開關＋email 各類開關（`apps/product/src/components/settings/notifications/notification-settings.tsx:78,196,211`）
- `/settings/interaction`：「公開我的實踐」開關（`apps/product/src/components/settings/interaction/interaction-settings.tsx:21,67`）；目前程式內找不到任何連到此頁的入口，只能直接輸入網址
- `/settings/archived`：已封存實踐，可取消封存（toast 附復原）或刪除（警告 Dialog 確認）（`apps/product/src/components/settings/archived-content-list.tsx:55-106,170-186`）
- `/settings/bug-report`：選問題區域、描述、截圖（最多 3 張）、連結後送出；成功後顯示感謝畫面與「再回報一則」（`apps/product/src/components/settings/bug-report/bug-report-form.tsx:71-126`）
- `/settings/follow-hub`：「關注與連結」中繼頁，連到 `/settings/following` 與 `/settings/connections`（`apps/product/src/app/[locale]/(with-layout)/settings/follow-hub/page.tsx:9-22`）
- `/settings/following`、`/settings/connections`：關注名單取消關注、連結請求接受／忽略／撤回／解除（設定端操作；關注／連結本身的社交功能請見 profile-follow）

## 怎麼到這頁（使用者視角）
- 桌機（md 以上）：左側 sidebar 底部點「帳號選單」→ 彈出選單選「設定」／語言切換／「關注與連結」／「Roadmap & 建議」／「錯誤回報」／「封存」／「登出」（`apps/product/src/components/layout/sidebar/account-menu.tsx:41-57,72-134`）。
- 手機（md 以下）：底部導覽列點頭像「帳號選單」→ bottom sheet 同樣項目（`apps/product/src/components/layout/sidebar/mobile.tsx:149-155`、`apps/product/src/components/layout/sidebar/mobile-bottom-sheet.tsx:95-144`）。
- `/settings` 頁內點清單項進入各子頁；實踐詳情頁封存後也會導到 `/settings/archived`（`apps/product/src/app/[locale]/practices/[id]/page.tsx:281`），封存成功 toast 也附 `/settings/archived` 連結（`apps/product/src/hooks/use-archive-practice-dialog.tsx:65`）。

## 測試帳號與前置條件
- 角色：一般使用者（已完成註冊、email 已驗證）。所有 `/settings*` 不在 publicPattern 中（`apps/product/src/app/global-provider.tsx:61-82`），未登入會被導到 `/auth/login?redirect=...`；temp 用戶會被導到 `/auth/onboarding`。
- 前置資料：
  - archived：帳號需有已封存的實踐，否則只看到「尚無已封存的內容」。
  - following：需有關注中的使用者／實踐。
  - connections：需另一個帳號送出連結請求（才會出現「待處理請求」區塊）。
- 會改真實資料的動作（刪除封存、解除連結、公開資訊改 ID、送出錯誤回報）請用拋棄式帳號。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| 帳號選單（桌機／手機） | `getByRole('button', { name: '帳號選單' })` | `app_product.account_menu` packages/i18n/src/locales/zh-TW/app-product.json:29；`apps/product/src/components/layout/sidebar/account-menu.tsx:49`（桌機另有 `aria-haspopup="menu"`）、`apps/product/src/components/layout/sidebar/mobile.tsx:153-154`（手機帶 `aria-expanded`） |
| 選單「設定」 | `getByRole('menuitem', { name: '設定' })`（手機 sheet 無 menuitem role，改 `getByRole('link', { name: '設定' })`） | `app_product.account_settings` packages/i18n/src/locales/zh-TW/app-product.json:30；`apps/product/src/components/layout/sidebar/account-menu.tsx:73-81`、`apps/product/src/components/layout/sidebar/mobile-bottom-sheet.tsx:96` |
| 選單「關注與連結」 | `getByRole('menuitem', { name: '關注與連結' })` | `app_product.account_follow_hub` packages/i18n/src/locales/zh-TW/app-product.json:577；`apps/product/src/components/layout/sidebar/account-menu.tsx:87-95` |
| 選單「錯誤回報」 | `getByRole('menuitem', { name: '錯誤回報' })` | `app_product.account_bug_report` packages/i18n/src/locales/zh-TW/app-product.json:34；`apps/product/src/components/layout/sidebar/account-menu.tsx:109-117` |
| 選單「封存」 | `getByRole('menuitem', { name: '封存' })` | `app_product.account_archived` packages/i18n/src/locales/zh-TW/app-product.json:578；`apps/product/src/components/layout/sidebar/account-menu.tsx:119-127` |
| 選單「登出」 | `getByRole('menuitem', { name: '登出' })` | `app_product.account_logout` packages/i18n/src/locales/zh-TW/app-product.json:58；`apps/product/src/components/layout/sidebar/account-menu.tsx:130-133` |
| 設定清單項 | `getByRole('link', { name: '領域偏好設定' })`／`'帳號設定'`／`'公開資訊設定'`／`'通知設定'` | aria-label=label，`apps/product/src/components/settings/settings-list.tsx:53-57`；keys `app_product.settings_preferences/account/public_info/notifications` packages/i18n/src/locales/zh-TW/app-product.json:88-91 |
| 設定完整度 | `getByText('個人設定完整度')` | `app_product.settings_completion_label` packages/i18n/src/locales/zh-TW/app-product.json:97；`apps/product/src/components/settings/settings-list.tsx:81-88` |
| 設定頁登出按鈕 | `getByRole('button', { name: '登出' })` | aria-label `app_product.settings_logout` packages/i18n/src/locales/zh-TW/app-product.json:99；`apps/product/src/components/settings/settings-list.tsx:107-118` |
| 登出確認 Dialog（只在設定頁登出出現） | `getByRole('button', { name: '登出' })`（Dialog 內，標題「確定要登出嗎？」） | `common.logout_title` packages/i18n/src/locales/zh-TW/common.json:104、`common.logout_confirm` packages/i18n/src/locales/zh-TW/common.json:106；`apps/product/src/hooks/use-logout-dialog.tsx:38-46` |
| 帳號／偏好／公開資訊 儲存 | `getByRole('button', { name: '儲存' })` | `account_settings.save` packages/i18n/src/locales/zh-TW/account-settings.json:4、`preferences_settings.save` packages/i18n/src/locales/zh-TW/preferences-settings.json:4、`app_product.save` packages/i18n/src/locales/zh-TW/app-product.json:6；`apps/product/src/components/settings/account/account-form.tsx:229`、`apps/product/src/components/settings/preferences/preferences-form.tsx:319`、`apps/product/src/components/settings/public-info/public-info-form.tsx:268` |
| 上傳頭像 | `getByRole('button', { name: '上傳頭像' })`（若非 button 改 `getByLabel('上傳頭像')`） | `app_product.avatar_upload` packages/i18n/src/locales/zh-TW/app-product.json:62；`apps/product/src/components/settings/public-info/avatar-upload-section.tsx:71` |
| 公開名稱 / 使用者 ID | `getByPlaceholder('請輸入公開顯示的名稱')` / `getByPlaceholder('請輸入使用者 ID')` | packages/i18n/src/locales/zh-TW/app-product.json:130、132；`apps/product/src/components/settings/public-info/basic-info-section.tsx:138,161` |
| 通知／互動開關 | 無穩定選擇器，建議補 data-testid 或 aria-label（`role="switch"` 但沒有可及名稱）；暫用 `getByText('通知總開關')` 所在列內的 `getByRole('switch')` | `apps/product/src/components/settings/notifications/notification-settings.tsx:78-79,196`；`apps/product/src/components/settings/interaction/interaction-settings.tsx:21-22,67`；`account_settings.notif_global_title` packages/i18n/src/locales/zh-TW/account-settings.json:79 |
| 封存：取消封存 / 刪除 | `getByRole('button', { name: '取消封存' })` / `getByRole('button', { name: '刪除' })` → Dialog `getByRole('button', { name: '確定刪除' })` | packages/i18n/src/locales/zh-TW/app-product.json:112、117、120；`apps/product/src/components/settings/archived-content-list.tsx:89-98,170-186` |
| 錯誤回報：區域 | `getByRole('button', { name: '介面顯示' })`（其他區域 `bug_area_performance/auth/data/other`） | `app_product.bug_area_ui` packages/i18n/src/locales/zh-TW/app-product.json:37；`apps/product/src/components/settings/bug-report/bug-report-form.tsx:14,134-149`；區域清單 `BUG_REPORT_AREAS` packages/api/src/services/feedback.ts:13 |
| 錯誤回報：描述 / 連結 | `getByLabel('詳細描述')` / `page.locator('#bug-link')` | `bug_description_label` packages/i18n/src/locales/zh-TW/app-product.json:42；`apps/product/src/components/settings/bug-report/bug-report-form.tsx:154-158,210-214` |
| 錯誤回報：送出 | `getByRole('button', { name: '送出回報' })` | `app_product.bug_submit` packages/i18n/src/locales/zh-TW/app-product.json:48；`apps/product/src/components/settings/bug-report/bug-report-form.tsx:224-229` |
| follow-hub 連結 | `getByRole('link', { name: '關注設定' })` / `getByRole('link', { name: '連結的夥伴' })` | `settings_following` packages/i18n/src/locales/zh-TW/app-product.json:85、`settings_connections` packages/i18n/src/locales/zh-TW/app-product.json:86；`apps/product/src/app/[locale]/(with-layout)/settings/follow-hub/page.tsx:9-22,34-39` |
| 關注分頁 | `getByText('關注的使用者')` / `getByText('關注的實踐')`（tab 元件 role 未確認） | packages/i18n/src/locales/zh-TW/app-product.json:101-102；`apps/product/src/components/settings/following/following-settings.tsx:63` |
| 取消關注 | `getByRole('button', { name: '取消關注' })` | `app_product.following_unfollow` packages/i18n/src/locales/zh-TW/app-product.json:105；`apps/product/src/components/settings/following/following-settings.tsx:100-106,145-151` |
| 連結請求：接受／忽略／撤回 | `getByRole('button', { name: '接受' })`／`'忽略'`／`'撤回'` | `account_settings.conn_accept_btn` packages/i18n/src/locales/zh-TW/account-settings.json:62、`conn_ignore_confirm` packages/i18n/src/locales/zh-TW/account-settings.json:66、`conn_withdraw_confirm` packages/i18n/src/locales/zh-TW/account-settings.json:70；`apps/product/src/components/settings/connections/connections-settings.tsx:144-157,193-199` |

## 怎樣算成功（可觀察的結果與證據）
- 帳號設定儲存：toast「帳號設定已更新」（`account_settings.save_success` packages/i18n/src/locales/zh-TW/account-settings.json:53），URL 回 `/settings`。
- 偏好儲存：toast「偏好設定已儲存」（packages/i18n/src/locales/zh-TW/preferences-settings.json:7），URL 回 `/settings`。
- 公開資訊儲存：toast「公開資訊設定已更新」（packages/i18n/src/locales/zh-TW/app-product.json:152）；到 `/users/<customId>` 看得到新名稱。
- 互動開關：toast「已公開你的實踐」（packages/i18n/src/locales/zh-TW/app-product.json:127）或「已將實踐設為不公開」（packages/i18n/src/locales/zh-TW/app-product.json:128）；重新整理後 `aria-checked` 保持。
- 通知開關：toast「已開啟通知」／「已關閉通知」（packages/i18n/src/locales/zh-TW/account-settings.json:77-78）；重新整理後 `aria-checked` 保持。
- 取消封存：toast「實踐已成功取消封存」（packages/i18n/src/locales/zh-TW/app-product.json:113），列表少一筆。
- 取消關注：toast「已取消關注」（packages/i18n/src/locales/zh-TW/app-product.json:108）。
- 錯誤回報：表單呼叫 `submitBugReport`（`apps/product/src/components/settings/bug-report/bug-report-form.tsx:83`），以 multipart `POST` 到 server 的 `/api/v1/feedback/bug-report`（`packages/api/src/services/feedback.ts:49-50`，`getApiBaseUrl()` 絕對網址），2xx 後顯示「感謝你的回報！」（packages/i18n/src/locales/zh-TW/app-product.json:55；`apps/product/src/components/settings/bug-report/bug-report-form.tsx:115-126`）。2026-10-29 已在 app-dev 實測回 201 並出現此畫面。
- 登出：整頁導到 `/auth/login`（英文介面為 `/en/auth/login`）（`apps/product/src/hooks/use-logout-redirect.ts:26`、`apps/product/src/lib/auth/post-logout.ts`）。

## 陷阱
- 錯誤回報失敗時（400／422 顯示出錯欄位或截圖限制，其他狀態顯示通用訊息）只跳 toast，表單內容保留（`apps/product/src/components/settings/bug-report/bug-report-form.tsx:92-101`）；截圖讀檔中「送出回報」會 disabled（`apps/product/src/components/settings/bug-report/bug-report-form.tsx:226`）。
- `/settings` 清單只列 4 項；archived、bug-report、follow-hub 只能從帳號選單進；`/settings/interaction` 程式內沒有入口連結。
- 帳號選單內的「Roadmap & 建議」連到寫死的 `https://app.daodao.so/roadmap`（prod），以新分頁開啟（`apps/product/src/components/layout/sidebar/account-menu.tsx:97-107`、`apps/product/src/components/layout/sidebar/mobile-bottom-sheet.tsx:110-119`），在 dev 點下去會離開 dev 環境。
- 只有設定頁的登出會先跳確認 Dialog；側欄帳號選單與手機 bottom sheet 的「登出」直接登出（`apps/product/src/components/layout/sidebar/account-menu.tsx:130`、`apps/product/src/components/layout/sidebar/mobile-bottom-sheet.tsx:136-139`）。
- 桌機用彈出選單 `role="menuitem"`，手機 bottom sheet 的項目是一般 link／button，選擇器要依 viewport 切換。
- 通知／互動開關沒有可及名稱，`getByRole('switch')` 會一次抓到多個；要先用文字定位到列。
- 刪除封存是警告 Dialog 二次確認；取消封存 toast 帶「復原」動作，若測試立刻離頁可能錯過。
- preferences／account 表單有 zod 驗證，未選必填時只跳 toast 不送出（`apps/product/src/components/settings/preferences/preferences-form.tsx:267-297`）。
