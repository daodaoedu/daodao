# 訊息（群組聊天室）

使用者在自己加入的群組（團／空間）聊天室裡看未讀、讀訊息、發訊息、回覆、置頂與搜尋。

- 介面：Web（apps/product）
- dev 網址：https://app-dev.daodao.so/messages 、https://app-dev.daodao.so/messages/<roomId>（daodao-infra/README.md:39；英文版加 `/en` 前綴）
- 主要程式位置：apps/product/src/app/[locale]/(with-layout)/messages/page.tsx、apps/product/src/app/[locale]/(with-layout)/messages/[roomId]/page.tsx、apps/product/src/components/chat/、packages/api/src/services/chat-hooks.ts
- 依據版本：daodao-f2e 70155dce（2026-10-29）

## 子功能
- 聊天室列表：左上返回鈕（連到 `/spaces`）、標題「訊息」、搜尋聊天室輸入框；每列顯示房名、時間（剛剛／昨天／時間）、最後一則訊息預覽（自己發的顯示「你：…」，他人顯示「名稱：…」）、未讀數（>99 顯示 99+；目前所在的聊天室不顯示）。列表內已不再顯示總未讀徽章（`messages.total_unread` key 仍在但沒有元件使用）。
- 對話頁：歷史訊息、5 秒輪詢增量訊息、進入後自動標記已讀（`markChatRoomRead`）
- 發訊息（Enter 送出、Shift+Enter 換行，輸入框下方有提示文字）、編輯自己的文字訊息、回覆某則訊息、按讚
- 頂部列：成員按鈕（頭像堆疊＋人數）、訊息搜尋、置頂面板（有置頂訊息時才出現）；手機版另有返回鈕；置頂橫幅
- 主持人（`viewerRole === "host"`）可置頂／取消置頂、刪除任何人的訊息；一般成員只能刪除自己的訊息。作者是主持人時名稱旁顯示盾牌徽章（aria-label「帶領人」）
- 側邊欄「訊息」項目旁的未讀徽章（只在桌機版，`ChatUnreadBadge` 讀 `totalUnread`）

## 怎麼到這頁（使用者視角）
1. 登入後，桌機左側邊欄點「訊息」→ `/messages`（右側顯示「選擇一個聊天室開始對話」）。
2. 在左欄點一間聊天室 → `/messages/<roomId>`。
3. 手機版：底部導覽沒有「訊息」入口（apps/product/src/components/layout/sidebar/mobile.tsx 只有主頁／最新通知／建立主題實踐／我的小島），需直接輸入網址；手機版 `/messages` 只顯示列表，`/messages/<roomId>` 只顯示對話（apps/product/src/components/chat/chat-layout.tsx:13-15）。

## 測試帳號與前置條件
- 角色：一般使用者（已完成註冊）。`/messages` 不在 publicPattern（apps/product/src/app/global-provider.tsx:61-82），未登入會被導到 `/auth/login?redirect=/messages`；temp 使用者會被導到 `/auth/onboarding`。
- 前置資料：帳號必須已是至少一個群組聊天室的成員（空狀態文案「還沒有聊天室／加入群組後，聊天室會出現在這裡」）。聊天室怎麼建立不在 product 前端（前端沒有「建立聊天室」入口，推測由加入團／空間時後端建立）。
- 驗證未讀需要第二個帳號在同一聊天室發訊息。
- 驗證置頂／刪除他人訊息需要該聊天室的主持人帳號。

## 穩定的選擇器
| 元素 | 選擇器（Playwright） | 依據 |
|------|---------------------|------|
| 側邊欄「訊息」入口（桌機） | `page.getByRole('link', { name: '訊息' })` | apps/product/src/components/layout/sidebar/desktop.tsx:92（aria-label=t(labelKey)）、apps/product/src/components/layout/sidebar/constant.tsx:45-47；key `app_product.nav_messages`「訊息」packages/i18n/src/locales/zh-TW/app-product.json:16 |
| 側邊欄未讀徽章（桌機） | 無穩定選擇器（span 無 aria/testid），暫用「訊息」link 內的數字／`99+` | apps/product/src/components/layout/sidebar/chat-unread-badge.tsx:5-16、apps/product/src/components/layout/sidebar/desktop.tsx:107 |
| 列表標題 | `page.getByRole('heading', { name: '訊息', level: 1 })` | apps/product/src/components/chat/chat-room-list.tsx:142-144；key `messages.title` packages/i18n/src/locales/zh-TW/messages.json:2 |
| 列表返回（到空間） | `page.getByRole('link', { name: '返回' })` | apps/product/src/components/chat/chat-room-list.tsx:138；key `messages.room_header_back` packages/i18n/src/locales/zh-TW/messages.json:9 |
| 搜尋聊天室 | `page.getByRole('textbox', { name: '搜尋聊天室' })` 或 `page.getByPlaceholder('搜尋聊天室')` | apps/product/src/components/chat/chat-room-list.tsx:148-151；key `messages.filter_placeholder` packages/i18n/src/locales/zh-TW/messages.json:54 |
| 搜尋無結果 | `page.getByText('沒有符合的聊天室')` | apps/product/src/components/chat/chat-room-list.tsx:182；key `messages.filter_no_results` packages/i18n/src/locales/zh-TW/messages.json:56 |
| 某間聊天室 | `page.locator('[data-chat-room-row="<roomId>"]')` 或 `page.getByRole('link', { name: /<聊天室名稱>/ })`；目前所在聊天室帶 `aria-current="page"` | apps/product/src/components/chat/chat-room-list.tsx:49-51 |
| 單間未讀數 | 無穩定選擇器（span 無 aria/testid），建議補 data-testid；暫用聊天室 row 內文字 `99+`／數字 | apps/product/src/components/chat/chat-room-list.tsx:79-83 |
| 未選聊天室提示 | `page.getByText('選擇一個聊天室開始對話')` | apps/product/src/app/[locale]/(with-layout)/messages/page.tsx:11；key `messages.empty_conversation` packages/i18n/src/locales/zh-TW/messages.json:58 |
| 空狀態 | `page.getByText('還沒有聊天室')` | apps/product/src/components/chat/chat-room-list.tsx:177；key `messages.empty` packages/i18n/src/locales/zh-TW/messages.json:4 |
| 訊息輸入框 | `page.getByPlaceholder('說點什麼，島民都在')` | apps/product/src/components/chat/chat-input.tsx:196；key `messages.input_placeholder` packages/i18n/src/locales/zh-TW/messages.json:10 |
| 送出按鈕 | `page.getByRole('button', { name: '送出' })`（icon 按鈕；編輯模式時名稱變「編輯」） | apps/product/src/components/chat/chat-input.tsx:210；key `messages.send` packages/i18n/src/locales/zh-TW/messages.json:12、`messages.edit_action` packages/i18n/src/locales/zh-TW/messages.json:45 |
| 返回列表（對話頁，只在手機版） | `page.getByRole('button', { name: '返回' })` | apps/product/src/components/chat/chat-header.tsx:57-66；key `messages.room_header_back` packages/i18n/src/locales/zh-TW/messages.json:9 |
| 成員按鈕（內含人數） | `page.getByRole('button', { name: '查看成員' })`，或 `page.locator('[data-chat-members-button]')`；開啟時 `aria-pressed="true"` | apps/product/src/components/chat/chat-header.tsx:86-111；key `messages.view_members` packages/i18n/src/locales/zh-TW/messages.json:62 |
| 訊息搜尋鈕 | `page.getByRole('button', { name: '搜尋訊息' })` | apps/product/src/components/chat/chat-header.tsx:113-127；key `messages.search_messages` packages/i18n/src/locales/zh-TW/messages.json:63 |
| 置頂面板鈕（有置頂訊息時才出現） | `page.getByRole('button', { name: '置頂訊息' })` | apps/product/src/components/chat/chat-header.tsx:129-145；key `messages.pin_panel_title` packages/i18n/src/locales/zh-TW/messages.json:31 |
| 訊息搜尋框（開啟後） | `page.getByPlaceholder('在這個聊天室搜尋')`（aria-label 為「搜尋訊息」） | apps/product/src/components/chat/search-bar.tsx:106-107；key `messages.search_placeholder` packages/i18n/src/locales/zh-TW/messages.json:23 |
| 某則訊息 | `page.locator('[data-chat-message="<messageId>"]')`；自己的訊息帶 `data-own-message` | apps/product/src/components/chat/chat-message-item.tsx:114-115 |
| 訊息的按讚／回覆／編輯／更多 icon 按鈕（hover 才顯示） | `getByRole('button', { name: '按讚' })`、`'回覆'`、`'編輯'`、`'更多'`（需先 hover 該則訊息；按讚帶 `aria-pressed`） | apps/product/src/components/chat/chat-message-item.tsx:211-254；keys `messages.like_action` packages/i18n/src/locales/zh-TW/messages.json:18、`messages.reply_action` packages/i18n/src/locales/zh-TW/messages.json:19、`messages.more_actions` packages/i18n/src/locales/zh-TW/messages.json:48 |
| 更多選單內「置頂」「取消置頂」「刪除」 | `page.getByRole('menuitem', { name: '置頂' })`／`'取消置頂'`／`'刪除'` | apps/product/src/components/chat/chat-message-item.tsx:271、283；keys `messages.pin_action` packages/i18n/src/locales/zh-TW/messages.json:34、`messages.unpin_action` packages/i18n/src/locales/zh-TW/messages.json:35、`messages.delete_action` packages/i18n/src/locales/zh-TW/messages.json:46 |
| 主持人徽章 | `page.getByRole('img', { name: '帶領人' })` | apps/product/src/components/chat/chat-message-item.tsx:135-144；key `messages.host_badge` packages/i18n/src/locales/zh-TW/messages.json:57 |
| 回覆中提示 | `page.getByText(/^回覆 /)` | apps/product/src/components/chat/chat-input.tsx:163；key `messages.reply_to` packages/i18n/src/locales/zh-TW/messages.json:14 |
| 發送失敗 toast | `page.getByText('發送失敗，請稍後再試')` | apps/product/src/components/chat/chat-input.tsx:82；key `messages.send_failed` packages/i18n/src/locales/zh-TW/messages.json:22 |

## 怎樣算成功（可觀察的結果與證據）
- 發訊息：輸入唯一字串後按「送出」，輸入框清空、對話區出現該字串；網路面板有 `POST /api/v1/chat-rooms/{roomId}/messages` 2xx；重新整理後仍在（從 `GET /api/v1/chat-rooms/{roomId}/messages` 讀回）。
- 未讀：帳號 B 發訊息後，帳號 A 在 30 秒內（`useMyChatRooms` refreshInterval 30_000，packages/api/src/services/chat-hooks.ts:15）於 `/messages` 列表看到該聊天室未讀數、桌機側欄「訊息」出現未讀徽章；A 點進聊天室後未讀歸零（`markChatRoomRead`，apps/product/src/app/[locale]/(with-layout)/messages/[roomId]/page.tsx:87-92）。
- 即時更新：已在聊天室內時，對方新訊息約 5 秒內出現（packages/api/src/services/chat-hooks.ts:54 refreshInterval 5_000，分頁隱藏時不輪詢）。
- 證據：截圖（列表＋對話）、`GET /api/v1/me/chat-rooms` 回應中的 `totalUnread`／`unreadCount`。

## 陷阱
- 手機寬度（`useIsMobile`）列表與對話互斥顯示，且底部導覽沒有訊息入口；桌機才有側欄未讀徽章，對話頁的返回鈕也只在手機版出現。驗證要決定 viewport。
- 中文輸入法組字中按 Enter 不送出（apps/product/src/components/chat/chat-input.tsx:194-195 compositionProps）；Playwright `fill` 後按 Enter 可正常送出。
- 送出按鈕在內容只有空白或傳送中時是 disabled（apps/product/src/components/chat/chat-input.tsx:129、203）。
- 訊息的按讚／回覆／編輯／更多按鈕平常是 `invisible`，要先 hover 訊息或讓焦點進入才可點（apps/product/src/components/chat/chat-message-item.tsx:203-209）。
- 列表中目前所在的聊天室不顯示未讀數，斷言未讀要在列表頁或別的聊天室看。
- `roomId` 是數字（`Number(params.roomId)`）；無效或不是成員時顯示「還沒有聊天室」文案（apps/product/src/app/[locale]/(with-layout)/messages/[roomId]/page.tsx:157-159），不會轉址。
- 未讀計算有 30 秒延遲，斷言要用 `expect.poll`／`toBeVisible({ timeout })`，不要立即斷言。
- 頁面容器高度固定為視窗（桌機 `md:h-dvh`，手機 `h-[calc(100dvh-68px)]`，apps/product/src/components/chat/chat-layout.tsx:19），訊息區要在內層捲動，全頁截圖拍不到完整歷史；聊天頁也不渲染全站 Footer（apps/product/src/utils/footer-visibility.ts:2）。
