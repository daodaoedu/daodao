# 主題實踐管理

管理員檢視全站使用者的主題實踐：統計、篩選、查看單筆詳情，並單筆或批次變更實踐狀態。

- 介面：Admin UI（daodao-admin-ui）
- dev 網址／取得方式：https://admin-dev.daodao.so/admin/practices（篩選與頁碼寫在 URL query，例如 `?page=2`）
- 主要程式位置：projects/daodao-admin-ui/src/pages/PracticesPage.tsx
- 依據版本：daodao-admin-ui c835bb3（2026-10-23）

## 子功能
- 統計卡：總實踐數、活躍中、已完成、平均完成率、總打卡次數、平均打卡/實踐；狀態分布、分類分布圖
- 篩選：搜尋、狀態、隱私、期間（天數）、標籤、開始日期／結束日期、每頁顯示
- 列表：標題（連到前台實踐頁）、狀態、隱私、建立者、建立日期、實踐期間、打卡次數、瀏覽數、迴響數、留言數、「查看」
- 詳情 Sheet：實踐目標、時間設定、進度追蹤、社群互動、標籤、系統資訊、「變更狀態」
- 多選後批次變更狀態 →「套用」

## 怎麼到這頁（使用者視角）
1. 登入後台 → 左側欄「內容」群組 →「主題實踐」。
2. 用上方篩選縮小範圍 → 列表某列按「查看」開右側詳情。

## 測試帳號與前置條件
- 角色：admin。
- 改狀態會改到真實使用者的實踐；只對冒煙帳號自己的實踐操作，做完改回。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 側欄入口 | role=link name「主題實踐」，href `/admin/practices` | src/components/layout/Sidebar.tsx:86 |
| 頁面標題 | 文字「主題實踐管理」 | src/pages/PracticesPage.tsx:829 |
| 搜尋 | `#practice-search`（placeholder「搜尋實踐...」） | src/pages/PracticesPage.tsx:898、905 |
| 狀態／隱私／期間／標籤篩選 | `#practice-status`、`#practice-privacy`、`#practice-duration`、`#practice-tag` | src/pages/PracticesPage.tsx:914、933、950、968 |
| 日期篩選 | `#date-from`、`#date-to` | src/pages/PracticesPage.tsx:983、995 |
| 每頁顯示 | `#practice-page-size` | src/pages/PracticesPage.tsx:1009 |
| 查看詳情 | 該列 role=button name「查看」 | src/pages/PracticesPage.tsx:1170-1176 |
| 標題連結（前台） | role=link，href `https://app-dev.daodao.so/practices/<id>`（依 VITE_SURVEY_PUBLIC_BASE 推得） | src/pages/PracticesPage.tsx:1104、src/config.ts |
| 詳情變更狀態 | 文字「變更狀態」旁的下拉（草稿／尚未開始／活躍／已完成／已封存） | src/pages/PracticesPage.tsx:568-580 |
| 批次套用 | role=button name「套用」（處理中「套用中...」），旁邊「已選 N 筆」 | src/pages/PracticesPage.tsx:298、322 |
| 列表勾選框、狀態下拉 trigger | 無穩定選擇器，建議補 aria-label／data-testid | — |

## 怎樣算成功（可觀察的結果與證據）
- 篩選後列表與「第 X / Y 頁」更新，URL query 同步；重新整理後保留。
- 詳情改狀態後，Sheet 與列表該列狀態更新；前台實踐頁（標題連結）狀態一致。
- 批次套用後，所選各列狀態一起改變，「已選 N 筆」清除。

## 陷阱
- 詳情的「變更狀態」下拉一選就送出（onValueChange 直接呼叫 onStatusChange，:571），沒有確認鈕。
- 標題連結會開前台 app-dev（非後台），需要前台登入才看得到私人實踐。
