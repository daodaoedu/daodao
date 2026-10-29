# 信件管理（發送紀錄／手動發信／失敗重試）

管理員查看系統寄信歷史與狀態、手動寄信給指定對象、重送失敗的信。

- 介面：Admin UI（daodao-admin-ui）
- dev 網址／取得方式：https://admin-dev.daodao.so/admin/email-management?tab=history（`tab` 可為 `history`／`compose`／`retry`）
- 主要程式位置：projects/daodao-admin-ui/src/pages/EmailManagementPage.tsx、src/components/EmailHistoryTable.tsx、src/lib/email-history-status.ts
- 依據版本：daodao-admin-ui c835bb3（2026-10-23）

## 子功能
- 頁首 SMTP 連線狀態徽章；統計卡：總發送、成功率、退信率、佇列待發
- 發送紀錄：依收件人 email、郵件類型、狀態篩選；欄位 收件人／主旨／類型／狀態／發送時間／操作；失敗列可「重試」；分頁
- 手動發信：套用模板（選填）、收件對象三種模式（指定 Email／依標籤／搜尋用戶）、主旨、預約發送時間（選填）、內容 →「立即發送」或「排程發送」
- 失敗重試：一次重送佇列中所有失敗郵件（單次上限 50 封）

## 怎麼到這頁（使用者視角）
1. 登入後台 → 左側欄「信件」群組 →「信件管理」。
2. 預設在「發送紀錄」分頁；切「手動發信」或「失敗重試」。

## 測試帳號與前置條件
- 角色：admin。
- 手動發信會真的寄出：收件人只能用使用者指定的 QA 信箱（`~/.claude/projects/-Users-xiaoxu-Projects-daodao/qa-email.txt`，plus 別名），不可用 example.com 或不存在的地址（browser-verify.md:69）。「依標籤」可能一次寄給很多真實用戶，驗收不要用。
- 只想確認某封信有沒有寄出：看「發送紀錄」或打 `GET /api/v1/admin/email/history?limit=50`，不必真的寄。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 側欄入口 | role=link name「信件管理」，href `/admin/email-management` | src/components/layout/Sidebar.tsx:115 |
| 頁面標題 | 文字「郵件管理」 | src/pages/EmailManagementPage.tsx:211 |
| SMTP 狀態 | 文字「SMTP 已連線」／「SMTP 已斷線」 | src/pages/EmailManagementPage.tsx:225 |
| 分頁 | role=button name「發送紀錄」「手動發信」「失敗重試」；或直接用 URL `?tab=` | src/pages/EmailManagementPage.tsx:33-35 |
| 紀錄收件人搜尋 | placeholder「搜尋收件人 email」 | src/components/EmailHistoryTable.tsx:81 |
| 郵件類型篩選 | placeholder「郵件類型」 | src/components/EmailHistoryTable.tsx:117 |
| 紀錄表格欄 | columnheader「收件人」「主旨」「類型」「狀態」「發送時間」「操作」 | src/components/EmailHistoryTable.tsx:173-178 |
| 單筆重試 | 該列 role=button name「重試」 | src/components/EmailHistoryTable.tsx:223 |
| 狀態文字 | 「已發送」「失敗」「待發送」「略過」 | src/lib/email-history-status.ts:9-14 |
| 套用模板 | `#email-template` | src/pages/EmailManagementPage.tsx:311 |
| 收件模式 | role=button name「指定 Email」「依標籤」「搜尋用戶」 | src/pages/EmailManagementPage.tsx:345-347 |
| 收件 email | placeholder「user@example.com」 | src/pages/EmailManagementPage.tsx:372 |
| 搜尋用戶 | placeholder「搜尋用戶名稱或 Email（至少 2 字）...」 | src/pages/EmailManagementPage.tsx:432 |
| 主旨／預約／內容 | `#email-subject`、`#email-scheduled`、`#email-body` | src/pages/EmailManagementPage.tsx:490、506、523 |
| 送出 | role=button name「立即發送」（有預約時間時為「排程發送」） | src/pages/EmailManagementPage.tsx:552 |
| 失敗重試 | role=button name「重試失敗郵件」 | src/pages/EmailManagementPage.tsx:603 |
| 分頁 tab 的選中狀態 | 無穩定選擇器（沒有 role=tab／aria-selected，只靠 class），建議補 aria-selected 或 data-testid；以 URL `tab` 判斷 | — |

## 怎樣算成功（可觀察的結果與證據）
- 切分頁後 URL `?tab=` 改變，重新整理仍停在同一分頁。
- 手動發信給 QA 信箱：出現成功提示（ResultNotice），「發送紀錄」搜該 email 出現新一列、狀態「已發送」；QA 信箱收到信。
- 失敗重試：出現結果提示，紀錄中原本「失敗」的列狀態改變。
- `skipped` 狀態顯示為「略過」（#292 AC-02）。

## 陷阱
- 頁首標題是「郵件管理」，側欄叫「信件管理」，兩者不同字。
- server-dev 走真 SMTP，任何寄送都是真的；不存在地址的退信會灌進維運信箱。
- 「失敗重試」是全域動作，會重送所有失敗信（不只自己測的那封）。
