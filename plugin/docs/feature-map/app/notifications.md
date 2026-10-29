# 最新通知

使用者在 App 看別人對自己的反應、留言、提及、關注、打卡、連結請求等通知，點通知跳到對應頁，並處理連結請求。

- 介面：App（apps/mobile）
- dev 網址／取得方式：沒有網頁版；裝 dev App「Dao Dao (Dev)」（見 login.md）
- 主要程式位置：projects/daodao-f2e/apps/mobile/app/(tabs)/notifications.tsx、services/notifications.ts
- 依據版本：daodao-f2e 6034e986（2026-10-23）

## 子功能
- 通知列表分「最新」（未讀）與已讀區，未讀有橘點
- 通知類型文案：反應、留言、回覆留言、提及、關注你、關注你的實踐、連結請求／同意／忽略、打卡、完成實踐、發起新實踐、更新實踐、夥伴邀請／接受
- 點通知：標為已讀並跳到對應頁（`getNotificationHref`）
- 「全部標為已讀」（有未讀才出現）
- 連結請求通知上的「同意」／「忽略」

## 怎麼到這頁（使用者視角）
1. 底部分頁「最新通知」。
2. 點任一通知跳到該實踐／用戶頁；連結請求直接按「同意」或「忽略」。

## 測試帳號與前置條件
- 角色：一般使用者。
- 要有通知就需要另一個帳號對這個帳號互動（例如用第二個 dev 帳號在 app-dev 網頁版對他的實踐按反應、留言或送連結請求）。
- 推播通知（expo-notifications）與站內通知是兩回事；這頁只驗站內通知列表。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 底部分頁 | 分頁標題「最新通知」（`mobile.tabs.notifications`） | app/(tabs)/_layout.tsx:92 |
| 頁面標題 | 文字「最新通知」（寫死字串，非 i18n） | app/(tabs)/notifications.tsx:372 |
| 全部標為已讀 | 文字「全部標為已讀」（寫死字串；locale 另有 `mobile.notifications.markAllRead` 但未使用） | app/(tabs)/notifications.tsx:375-377 |
| 空狀態 | 文字「目前沒有通知」（寫死字串） | app/(tabs)/notifications.tsx:403 |
| 未讀區標題 | 文字「最新」 | app/(tabs)/notifications.tsx:418 |
| 同意／忽略 | 文字「同意」「忽略」（`mobile.notifications.accept`／`ignore`） | app/(tabs)/notifications.tsx:241、257 |
| 通知文字 | 例：「{name} 回覆了你的主題實踐「{title}」：{content}」（`mobile.notifications.text_comment`） | app/(tabs)/notifications.tsx:83-126 |
| 同意成功 | Alert「你同意了 {name} 的連結請求！」 | app/(tabs)/notifications.tsx:314 |
| 單則通知列 | 無穩定選擇器（Pressable 無 accessibilityLabel），建議補 testID；目前用通知文字定位 | app/(tabs)/notifications.tsx:170 |

## 怎樣算成功（可觀察的結果與證據）
- 另一帳號互動後，下拉重新整理或重開分頁能看到新通知在「最新」區、有橘點。
- 點通知 → 跳到對應頁；回來後該通知移到已讀區、橘點消失。
- 「全部標為已讀」後按鈕消失、所有通知移到已讀區。
- 同意連結請求 → Alert 成功；在「設定 → 連結的夥伴」看到對方。

## 陷阱
- 標題、「全部標為已讀」、「目前沒有通知」、「最新」是寫死的中文，切英文語系也不會變；用文字定位時不受語系影響，但要知道這是 i18n 缺口。
- 標為已讀的 API 失敗會被吞掉（`markNotificationRead(...).catch(() => {})`，:293），畫面先樂觀更新；要驗證已讀有存下來，需重開 App 再看。
