# 最新通知（Notifications）

使用者查看別人對自己的互動（回應、留言、提及、關注、連結請求、打卡、完成實踐等），點通知跳到對應內容，並可處理連結請求、全部標為已讀。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/notifications （host 依據 `daodao-infra/README.md:39`）
- 主要程式位置：`apps/product/src/app/[locale]/(with-layout)/notifications/page.tsx`、`apps/product/src/components/notifications/`
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- 通知列表，分「最新」（未讀）「稍早」（已讀）兩區（`apps/product/src/components/notifications/notification-list.tsx:257-258`、`apps/product/src/components/notifications/notification-list.tsx:276-289`）
- 未讀橘點；點可點擊的通知 → 標為已讀（`markNotificationRead`）並 `router.push(buildNotificationDeepLink(...))`（`apps/product/src/components/notifications/notification-list.tsx:213-230`）
- 「全部標為已讀」，只在有未讀時出現（`apps/product/src/components/notifications/notification-list.tsx:263-273`）
- 連結請求通知的「更多選項」選單：同意連結／忽略，處理後顯示「已同意」／「已忽略」（`apps/product/src/components/notifications/notification-item.tsx:296-330`；呼叫端 `apps/product/src/components/notifications/notification-list.tsx:159-211`）
- 通知文案依類型組合（reaction、comment、mention、follow_user、follow_practice、connect_request、checkin、finish、buddy_request…）（`apps/product/src/components/notifications/notification-item.tsx:91-270`）
- sidebar 鈴鐺未讀數徽章（>99 顯示 99+）（`apps/product/src/components/notifications/notification-bell.tsx:13-15`）

## 怎麼到這頁（使用者視角）
- 桌機：左側 sidebar 點「最新通知」（含鈴鐺與未讀數）（`apps/product/src/components/layout/sidebar/constant.tsx:61-63`、`apps/product/src/components/layout/sidebar/desktop.tsx:82-97`）。
- 手機：底部導覽列點「最新通知」（`apps/product/src/components/layout/sidebar/mobile.tsx:110-113`）。
- 或直接開 `/notifications`。

## 測試帳號與前置條件
- 角色：一般使用者。`/notifications` 不在 publicPattern（`apps/product/src/app/global-provider.tsx:61-82`），未登入導到 `/auth/login?redirect=%2Fnotifications`。
- 前置資料：需要另一個帳號（B）對測試帳號（A）做出互動才會有通知，例如 B 關注 A、B 對 A 的打卡按回應／留言、B 對 A 送連結請求。沒有資料時只看到「目前沒有通知」。
- 測連結請求流程時需雙帳號；同意後 A、B 會互相連結（真實資料變更）。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|---|---|---|
| sidebar／底部導覽入口 | `getByRole('link', { name: '最新通知' })` | `app_product.nav_notifications` packages/i18n/src/locales/zh-TW/app-product.json:20；`apps/product/src/components/layout/sidebar/desktop.tsx:92`（aria-label=label）、`apps/product/src/components/layout/sidebar/mobile.tsx:112` |
| 入口目前頁狀態 | 同上 link 的 `aria-current="page"`（桌機與手機都有） | `apps/product/src/components/layout/sidebar/desktop.tsx:93`、`apps/product/src/components/layout/sidebar/mobile.tsx:113` |
| 未讀數徽章 | 無穩定選擇器，建議補 data-testid（`apps/product/src/components/notifications/notification-bell.tsx` 只渲染數字文字） | `apps/product/src/components/notifications/notification-bell.tsx:15` |
| 空狀態 | `getByText('目前沒有通知')` | `app_product.notifications_empty` packages/i18n/src/locales/zh-TW/app-product.json:77；`apps/product/src/components/notifications/notification-list.tsx:252` |
| 全部標為已讀 | `getByRole('button', { name: '全部標為已讀' })` | `app_product.notifications_mark_all_read` packages/i18n/src/locales/zh-TW/app-product.json:78；`apps/product/src/components/notifications/notification-list.tsx:263-273` |
| 區塊標題 | `getByText('最新')` / `getByText('稍早')` | packages/i18n/src/locales/zh-TW/app-product.json:79-80；`apps/product/src/components/notifications/notification-list.tsx:277,284` |
| 單則通知（可點） | `getByRole('button', { name: /<actor 名稱>.*<文案>/ })`，例如關注通知 `/關注了你/`（`notification.follow_user_text` packages/i18n/src/locales/zh-TW/notification.json:6；其他類型依 `notification.*_text`） | `apps/product/src/components/notifications/notification-item.tsx:375-376`（可點者才有 role=button、tabIndex=0） |
| 未讀橘點 | 無穩定選擇器，建議補 data-testid 或 aria-label（純裝飾 div） | `apps/product/src/components/notifications/notification-item.tsx:379` |
| 連結請求「更多選項」 | `getByRole('button', { name: '更多選項' })` | `notification.more_options` packages/i18n/src/locales/zh-TW/notification.json:24；`apps/product/src/components/notifications/notification-item.tsx:299` |
| 同意連結 / 忽略 | `getByRole('menuitem', { name: '同意連結' })` / `getByRole('menuitem', { name: '忽略' })` | `notification.agree_connect` packages/i18n/src/locales/zh-TW/notification.json:25、`notification.ignore` packages/i18n/src/locales/zh-TW/notification.json:26；`apps/product/src/components/notifications/notification-item.tsx:305-308` |
| 已同意標記 | `getByText('已同意')` | `notification.agreed` packages/i18n/src/locales/zh-TW/notification.json:27；`apps/product/src/components/notifications/notification-item.tsx:317` |
| 通知中的 actor 頭像連結 | `getByRole('link')` 指向 `/users/<customId 或 id>`（點了不觸發整則 click；actor 沒有 id 時不渲染連結） | `apps/product/src/components/notifications/notification-item.tsx:346`、`apps/product/src/components/notifications/notification-item.tsx:382-387`、`apps/product/src/utils/notification-link.ts:7-13` |

## 怎樣算成功（可觀察的結果與證據）
- B 對 A 互動後，A 開 `/notifications` 在「最新」區看到對應文案，鈴鐺未讀數 +1。
- 點通知：URL 變成 deep link 目標（實踐／打卡／使用者頁），返回後該則不再有橘點；網路上有 mark-read 請求成功。
- 「全部標為已讀」：按鈕消失（`hasUnread` 為 false），鈴鐺徽章消失（list 與 bell 兩個 SWR key 都會 revalidate，`apps/product/src/components/notifications/notification-list.tsx:232-236`）。
- 同意連結：toast「你同意了 {name} 的連結請求，你們現在可以有更多互動了！」（`app_product.notifications_connect_accepted_toast` packages/i18n/src/locales/zh-TW/app-product.json:81），該則顯示「已同意」；`/settings/connections` 的「已連結的夥伴」出現 B。
- 忽略：toast「已忽略 {name} 的連結請求」（`app_product.notifications_connect_ignored_toast` packages/i18n/src/locales/zh-TW/app-product.json:82；`apps/product/src/components/notifications/notification-list.tsx:201`），該則顯示「已忽略」。

## 陷阱
- 只有特定類型通知可點（`isClickable`：連結請求、已同意、已忽略三種不可點，`apps/product/src/components/notifications/notification-item.tsx:348-351`），不可點的通知沒有 role=button，不能用 role 定位。
- mark-read／mark-all 失敗會被 `.catch(() => {})` 吞掉（`apps/product/src/components/notifications/notification-list.tsx:220,233`），UI 仍顯示已讀（本地 override），要以重新整理後狀態或網路回應為證據。
- 多個同類互動會合併成「X 與其他 N 人」（`notification.and_others`「與其他 {count} 人」packages/i18n/src/locales/zh-TW/notification.json:2，`apps/product/src/components/notifications/notification-item.tsx:98`），文字比對要用正規式。
- 通知由後端非同步產生，B 互動後 A 端可能需等待或重新整理，斷言要加輪詢。
- 頁面標題為空字串（`PageShell` 的 `headerProps.title: ""`，`apps/product/src/app/[locale]/(with-layout)/notifications/page.tsx:8`），不能以 heading 判斷是否到達此頁，改用 URL＋列表內容。
