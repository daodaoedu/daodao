# 桌面版「設定」及子頁面版面整體右偏 132px，右側內容被切、出現橫向捲軸

## 發生什麼事

桌面版（≥ md 斷點）打開「設定」與所有設定子頁面（帳號設定、錯誤回報、封存、關注與連結…），整個內容區比視窗寬 132px：內容不是以側邊欄右側的可視區置中，而是往右偏，右側 132px 被裁掉，頁面底部出現橫向捲軸。頁面本身仍可操作，但版面明顯跑掉，右對齊的元素（關閉 ✕、右側面板）視螢幕寬度可能被切到或壓到。

## 當時怎麼操作

1. 桌面瀏覽器登入 app-dev，側邊欄展開（132px）。
2. 從側邊欄頭像選單進入「設定」，或直接開 `/zh-TW/settings`、`/zh-TW/settings/bug-report`、`/zh-TW/settings/archived`。
3. 頁面載入後即可見。

- 實際結果：`document.documentElement.scrollWidth` = 視窗寬 + 132（1440→1572、1280→1412、1024→1156），內容區以「視窗寬 + 132」為中心置中，右緣 132px 被 `overflow-hidden` 裁掉並可橫向捲動。
- 期待結果：內容區以側邊欄右側的可視區置中，`scrollWidth` = 視窗寬，無橫向捲軸——同 `/zh-TW/home` 的表現（量測為 0 溢出）。
- 發生情況：每次；所有寬度 ≥ md 的桌面視窗皆重現。手機（390）不受影響。

## 證據與補充

- 量測表 + 14 張截圖（1440 / 1280 / 1024 / 390，含捲到最右的對照）：[設定頁 132px 橫向溢出 證據 2026-09-20](https://docs.google.com/document/d/1L5KX_4B3scGwciROlZgwHTEFommAwnhb-LXNuekpFQg)
- 量測環境：app-dev.daodao.so，2026-09-20，Playwright headless Chromium，dev-login 既有使用者。

| viewport | route | scrollWidth | 溢出 |
|---|---|---|---|
| 1440 | /settings | 1572 | 132 |
| 1440 | /settings/bug-report | 1572 | 132 |
| 1440 | /settings/archived | 1572 | 132 |
| 1440 | /notifications | 1572 | 132 |
| 1440 | /home（對照） | 1440 | 0 |
| 1280 | /settings | 1412 | 132 |
| 1024 | /settings | 1156 | 132 |
| 390 | /settings | 390 | 0 |

## 技術查核（由 skill 補充）

- 判斷：已確認 bug。溢出元素每頁唯一：`<div className="relative w-screen min-h-screen z-10 overflow-hidden overflow-y-auto">`，`getBoundingClientRect()` left=132、width=viewport。`(with-layout)/layout.tsx` 已用 `md:pl-[132px]` 為側邊欄留白，頁面再用 `w-screen`（100vw）就多出剛好側邊欄寬度。
- 查核範圍：daodao-f2e `dev` @ `cb266b84`（working tree 僅多一個未追蹤的 `packages/api/openapi.json`）。同一 wrapper 出現在 15 個 page.tsx：`settings/` 底下 11 個（含 `page.tsx`、`account`、`archived`、`bug-report`、`connections`、`follow-hub`、`following`、`interaction`、`notifications`、`preferences`、`public-info`）、`notifications/page.tsx`、`me/footprints/page.tsx`、`social/page.tsx`、`users/[identifier]/page.tsx`。實際量測的是 settings ×3 + notifications；其餘 wrapper 相同，預期同樣溢出但尚未逐頁量測。
- 重現結果：已重現（app-dev，見上表與證據文件）。
- 現況與需求：wrapper 自 2026-03-19 `e4f474a1`（設定頁路由搬進 with-layout）即存在；#166（PR daodao-f2e#985，2026-09-09 merge）新增的 `bug-report`、`follow-hub` 沿用同 wrapper。#166 的 FR-RWD-001 只規範主內容 max-w 448px，沒有規範外層置中基準；期待行為以既有 `/home` 表現與「內容在可視區置中」為準。
- 重複卡查核：daodao（`w-screen / 橫向 / 捲軸 / 側邊欄 設定`）與 daodao-f2e（`w-screen / 橫向捲軸 / overflow`）open+closed 皆無同一問題；#166 為功能卡，非同卡。
- 原因與已嘗試處理：原因如上（已驗證）。尚未嘗試修復。
- 修復驗收方向：
  1. 15 個 page.tsx 的 `w-screen` 改為 `w-full`（或抽共用 `SettingsPageShell` 收斂複製點，避免新頁再抄）。
  2. 驗收：1440 / 1280 / 1024 三寬度對每條受影響 route 量 `scrollWidth === innerWidth`，且 `main` 內元素 `right ≤ innerWidth`；390 手機版不變。
  3. 附三寬度截圖與量測表。

## AI 交審摘要

- 已檢核與主要依據：app-dev 實測 8 組 route×寬度、定位唯一溢出元素與 layout 的 `md:pl-[132px]`、git log 追到引入 commit、15 個檔案 grep 清單、重複卡查核。
- 已修正事項：初判「#166 引入」修正為「2026-03 既有 bug，#166 新增兩頁沿用且未驗證」；受影響檔案從 10 個補為 15 個（含 settings 以外 4 頁）。
- 未驗證限制／需人決策：settings 以外 4 頁（`notifications` 已量、`me/footprints`、`social`、`users/[identifier]` 未量）是否一併修；修法選 `w-full` 一行改或抽共用 shell。
