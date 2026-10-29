# 用戶管理與用戶詳情

管理員搜尋、篩選用戶，設定角色、上標籤、停用／啟用帳號，並點進單一用戶看活動、登入、實踐與人物誌。

- 介面：Admin UI（daodao-admin-ui）
- dev 網址／取得方式：https://admin-dev.daodao.so/admin/user-management；詳情 https://admin-dev.daodao.so/admin/users/:userId
- 主要程式位置：projects/daodao-admin-ui/src/pages/UserManagementPage.tsx、src/pages/UserDetailPage.tsx、src/components/UserLink.tsx
- 依據版本：daodao-admin-ui c835bb3（2026-10-23）

## 子功能
- 列表：搜尋名稱／Email、篩選（狀態、角色、人物誌、徽章、來源、註冊流程、實踐建立方式、日期區間）、排序；篩選狀態寫在 URL query（`search`、`page`、`status`、`roleId`、`datePreset`…）
- 快速篩選「已停用」、「清除篩選」、篩選 chip 移除
- 單筆操作：「標籤」、「設定角色」、「停用／啟用」（停用需確認）
- 多選後「批次上標籤」
- 詳情頁分頁：活動時間軸、活動統計、登入歷史、角色管理、實踐、人物誌；「停用帳號／啟用帳號」

## 怎麼到這頁（使用者視角）
1. 登入後台 → 左側欄「用戶」群組 →「用戶管理」。
2. 在搜尋框輸入名稱或 Email → 按「篩選」。
3. 點用戶名稱（UserLink）進入 /admin/users/:userId 詳情；詳情頁左上「回用戶列表」返回。

## 測試帳號與前置條件
- 角色：admin（登入方式見 dashboard.md）。
- 停用／改角色會影響真實 dev 帳號：只對冒煙用的 QA 帳號操作，做完要改回來。
- 「標籤」需先在「用戶標籤」頁建立標籤，否則彈窗顯示「尚無標籤，請先到「用戶標籤」頁面建立」。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 側欄入口 | role=link name「用戶管理」，href `/admin/user-management` | src/components/layout/Sidebar.tsx:64 |
| 頁面標題 | role=heading name「用戶管理」 | src/pages/UserManagementPage.tsx:627 |
| 搜尋框 | placeholder「搜尋名稱 / Email」 | src/pages/UserManagementPage.tsx:669 |
| 篩選鈕 | role=button name「篩選」 | src/pages/UserManagementPage.tsx:684 |
| 已停用快捷 | role=button name「已停用」 | src/pages/UserManagementPage.tsx:699 |
| 清除篩選 | role=button name「清除篩選」 | src/pages/UserManagementPage.tsx:710 |
| 日期區間 | aria-label「註冊起始日期」「註冊結束日期」「最後登入起始日期」「最後登入結束日期」「最後操作起始日期」「最後操作結束日期」 | src/pages/UserManagementPage.tsx:738、747、775、784、846、855 |
| 移除篩選 chip | aria-label「移除 {篩選名稱} 篩選」 | src/pages/UserManagementPage.tsx:947 |
| 批次上標籤 | role=button name「批次上標籤」（選取後才出現） | src/pages/UserManagementPage.tsx:965 |
| 空結果 | 文字「無符合條件的用戶」 | src/pages/UserManagementPage.tsx:1008 |
| 用戶名稱連結 | role=link，href `/admin/users/<id>` | src/components/UserLink.tsx:15、UserManagementPage.tsx:1027 |
| 設定角色 | 該列 role=button name「設定角色」；彈窗 `#role-select` | src/pages/UserManagementPage.tsx:1136、1204 |
| 停用／啟用 | 該列 role=button name「停用」或「啟用」 | src/pages/UserManagementPage.tsx:1151 |
| 停用確認 | heading「確定要停用此用戶？」+ 確認鈕 | src/pages/UserManagementPage.tsx:1367 |
| 分頁 | role=button name「上一頁」「下一頁」 | src/pages/UserManagementPage.tsx:1178、1188 |
| 詳情返回 | role=link name「回用戶列表」 | src/pages/UserDetailPage.tsx:791 |
| 詳情分頁 | role=button name「活動時間軸」「活動統計」「登入歷史」「角色管理」「實踐」「人物誌」 | src/pages/UserDetailPage.tsx:97、934 |
| 詳情改角色 | `#detail-role-select`（label「變更角色」） | src/pages/UserDetailPage.tsx:306 |
| 詳情停用／啟用 | role=button name「停用帳號」或「啟用帳號」 | src/pages/UserDetailPage.tsx:915、925 |
| 找不到用戶 | 文字「找不到該用戶資料」 | src/pages/UserDetailPage.tsx:776 |
| 表格某一列 | 無穩定選擇器，建議補 data-testid（目前只能以列內文字 email 篩） | — |

## 怎樣算成功（可觀察的結果與證據）
- 搜尋 QA 帳號 email → 表格只剩該列；URL 帶 `?search=...`，重新整理後仍保留。
- 停用：確認後該列按鈕從「停用」變「啟用」、狀態欄變停用；詳情頁徽章顯示「停用」（UserDetailPage.tsx:800）。API 證據：`PUT /api/v1/admin/users/<external_id>/status` 200。
- 設定角色：彈窗選角色後該列角色欄更新；重新整理仍在。
- 詳情頁各分頁切換後有內容或對應空狀態文字，不是空白。

## 陷阱
- 停用的用戶無法登入，冒煙後要「啟用」回來（或按 browser-verify.md 的清理步驟停用冒煙帳號）。
- 停用 API 吃 external_id UUID，不是列表顯示的 internalId（browser-verify.md 清理段落）。
- 列表很多篩選以 URL query 保存；從帶 query 的網址進來時畫面已是篩選後結果，先「清除篩選」再判斷。
- 本機 checkout 若落後 origin/dev，此檔行號以 origin/dev（c835bb3）為準。
