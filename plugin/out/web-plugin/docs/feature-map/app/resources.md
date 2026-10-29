# 學習資源

使用者瀏覽、搜尋、依分類篩選學習資源（課程、工具、書籍、社群材料），並查看單筆資源詳情與評價。

- 介面：App（apps/mobile）
- dev 網址／取得方式：沒有網頁版；裝 dev App「Dao Dao (Dev)」（見 login.md）
- 主要程式位置：projects/daodao-f2e/apps/mobile/app/resource/index.tsx、app/resource/[resourceId].tsx、app/resource/categories/*、components/resource/ResourceListScreen.tsx
- 依據版本：daodao-f2e 6034e986（2026-10-23）

## 子功能
- 資源列表：探索分類、子分類、搜尋、共 N 筆、載入更多、重新整理
- 分類頁 `/resource/categories/...`
- 資源詳情：分類、「查看資源」（開外部連結）、介紹、更新日期、評價、標籤、分享者

## 怎麼到這頁（使用者視角）
1. 底部分頁「設定」→ 社交群組「學習資源」。
2. 輸入關鍵字按搜尋，或點分類 → 點資源卡進詳情。
3. 詳情頁「查看資源」開外部網址。

## 測試帳號與前置條件
- 角色：一般使用者。
- dev 需要有資源資料；搜尋結果依 dev 資料而變，不要斷言固定筆數。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 入口 | 設定分頁文字「學習資源」（`mobile.settings.items.resources`） | app/(tabs)/settings.tsx:64-65 |
| 列表標題 | 文字「學習資源」（`mobile.resources.title`） | components/resource/ResourceListScreen.tsx:110 |
| 返回 | accessibilityLabel「返回」（`common.back`） | components/resource/ResourceListScreen.tsx:157 |
| 重新整理 | accessibilityLabel「重新整理」（`mobile.resources.refresh`） | components/resource/ResourceListScreen.tsx:175 |
| 搜尋框 | placeholder「搜尋資源名稱、介紹或標籤」（`mobile.resources.search_full_placeholder`） | components/resource/ResourceListScreen.tsx:244 |
| 搜尋鈕 | accessibilityLabel「搜尋」（`mobile.resources.search`） | components/resource/ResourceListScreen.tsx:255 |
| 筆數 | 文字「共 {count} 筆資源」 | components/resource/ResourceListScreen.tsx:263 |
| 空結果 | 文字「沒有找到符合條件的資源。」 | components/resource/ResourceListScreen.tsx:296 |
| 載入更多 | 文字「載入更多」 | components/resource/ResourceListScreen.tsx:381 |
| 詳情標題 | 文字「資源詳情」；返回 accessibilityLabel「返回」 | app/resource/[resourceId].tsx:75、69 |
| 查看資源 | 文字「查看資源」（`mobile.resources.open_resource`） | app/resource/[resourceId].tsx:265 |
| 找不到 | 文字「找不到資源」 | app/resource/[resourceId].tsx:108 |
| 分類 chip、資源卡片 | 無穩定選擇器，建議補 testID（目前用名稱文字定位） | — |

## 怎樣算成功（可觀察的結果與證據）
- 列表載入後顯示「共 N 筆資源」與卡片；搜尋關鍵字後筆數變化、卡片符合關鍵字，或顯示空結果文字。
- 點卡片 → 「資源詳情」顯示該資源名稱與介紹；「查看資源」開出外部瀏覽器。
- 與 app-dev 網頁版同一資源內容一致。

## 陷阱
- 隱藏分頁 `explore`（探索，有「學習資源」「瀏覽靈感」入口）在底部導覽被設成 `href: null`（_layout.tsx:141-143），程式中也找不到導向 `/explore` 的地方，使用者實際上只能從設定進資源頁（推測 explore 為孤兒頁）。
- 「靈感」頁 `/showcase` 也只有 explore 會導過去（explore.tsx:243）。
