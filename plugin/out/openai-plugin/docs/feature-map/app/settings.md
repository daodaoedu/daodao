# 設定（帳號、公開資訊、通知、偏好、社交）

使用者在設定分頁管理公開資訊、帳號、通知、領域偏好、互動與關注、連結的夥伴、已封存內容，切換語言或登出。

- 介面：App（apps/mobile）
- dev 網址／取得方式：沒有網頁版；裝 dev App「Dao Dao (Dev)」（見 login.md）
- 主要程式位置：projects/daodao-f2e/apps/mobile/app/(tabs)/settings.tsx、app/settings/*.tsx、app/me/footprints.tsx
- 依據版本：daodao-f2e 6034e986（2026-10-23）

## 子功能
- 個人設定完整度提示
- 社交群組：我的足跡（/me/footprints）、互動設定（/settings/interaction）、關注設定（/settings/following）、連結的夥伴（/settings/connections）、學習資源（/resource）
- 設定群組：領域偏好設定（/settings/preferences）、帳號設定（/settings/account）、公開資訊設定（/settings/public-info）、通知設定（/settings/notifications）、已封存的內容（/settings/archived）
- 語言切換（zh-TW／en）
- 登出

## 怎麼到這頁（使用者視角）
1. 底部分頁「設定」。
2. 點列表項目進子頁；子頁左上「返回」。
3. 公開資訊設定：改名稱／自訂 ID／一句話／自我介紹／頭像 → 右上「儲存」。

## 測試帳號與前置條件
- 角色：一般使用者。
- 改帳號／公開資訊會改到 dev 真實資料（網頁版同步）；冒煙後改回。
- 自訂 ID 可能與他人衝突，存檔失敗會顯示欄位錯誤。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 底部分頁 | 分頁標題「設定」（`mobile.tabs.settings`） | app/(tabs)/_layout.tsx:118 |
| 頁面標題 | 文字「設定」（`mobile.settings.title`） | app/(tabs)/settings.tsx:115 |
| 選單項目 | 文字「我的足跡」「互動設定」「關注設定」「連結的夥伴」「學習資源」「領域偏好設定」「帳號設定」「公開資訊設定」「通知設定」「已封存的內容」（`mobile.settings.items.*`）；Pressable 無 accessibilityLabel | app/(tabs)/settings.tsx:41-93、166-195 |
| 語言切換 | 文字「語言切換」（`mobile.settings.language`），點選項直接 setLocale | app/(tabs)/settings.tsx:221、234 |
| 登出 | 文字「登出」→ Alert「確定要登出嗎？」→「登出」 | app/(tabs)/settings.tsx:258-281 |
| 子頁返回 | accessibilityLabel「返回」（`common.back`） | app/settings/public-info.tsx:440、app/settings/account.tsx:203 等 |
| 公開資訊儲存 | 文字「儲存」（儲存中「儲存中...」，`mobile.publicInfoSettings.save`） | app/settings/public-info.tsx:456 |
| 選擇頭像 | accessibilityLabel「選擇頭像」 | app/settings/public-info.tsx:485 |
| 公開資訊欄位 | placeholder「輸入你的名稱」「輸入自訂 ID」「寫下一句代表你的話」「介紹你的學習旅程」 | app/settings/public-info.tsx:512、532、618、638 |
| 公開資訊成功 | Alert「成功」／「公開資訊已更新」 | app/settings/public-info.tsx:406 |
| 未儲存離開 | Alert「尚未儲存變更」「離開前要放棄這些變更嗎？」 | app/settings/public-info.tsx:320 |
| 帳號設定儲存 | 文字「儲存」；成功 Alert「已儲存」／「帳號設定已更新。」 | app/settings/account.tsx:218、172 |
| 設定列表項目、開關類控制 | 無穩定選擇器，建議補 testID | — |

## 怎樣算成功（可觀察的結果與證據）
- 每個項目都能進到對應子頁、顯示標題、返回鍵可回設定。
- 公開資訊改名稱 → Alert「公開資訊已更新」→ 回「我的小島」名稱已變；app-dev 網頁版個人頁同步。
- 語言切到 English 後分頁標題改英文。
- 登出後回登入頁。

## 陷阱
- 「學習資源」放在設定的社交群組裡（settings.tsx:65），不是獨立分頁。
- 「我的足跡」的 route 是 `/me/footprints`，不在 `/settings` 底下。
- following／preferences／account／public-info 四個子頁在本機 checkout 與 origin/dev 之間有改動；驗收以安裝的 build／OTA 版本為準。
