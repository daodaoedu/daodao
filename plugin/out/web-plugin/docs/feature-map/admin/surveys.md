# 問卷管理

管理員建立與編輯問卷、變更狀態、預覽填寫頁、看回應與分析結果。

- 介面：Admin UI（daodao-admin-ui）
- dev 網址／取得方式：https://admin-dev.daodao.so/admin/surveys；填寫頁為 `${VITE_SURVEY_PUBLIC_BASE}/<id>`，dev 預設 https://app-dev.daodao.so/survey/r/...
- 主要程式位置：projects/daodao-admin-ui/src/pages/SurveyManagementPage.tsx、src/config.ts
- 依據版本：daodao-admin-ui c835bb3（2026-10-23）

## 子功能
- 列表：依狀態、關鍵字搜尋；每筆顯示匿名標記、建立者、回應數、瀏覽數
- 每筆操作：查看詳情、回應（列表／單筆內容／刪除回應）、分析（各題統計、平均填寫時長）、編輯、複製連結、預覽、更改狀態、刪除
- 新增問卷／編輯問卷表單

## 怎麼到這頁（使用者視角）
1. 登入後台 → 左側欄「問卷」群組 →「問卷管理」。
2. 「新增問卷」建立；列表上每筆的按鈕進各子功能。

## 測試帳號與前置條件
- 角色：admin。
- 要看回應／分析，需有人在前台填過；可用一般使用者在 app-dev 填寫頁送一筆。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 側欄入口 | role=link name「問卷管理」，href `/admin/surveys` | src/components/layout/Sidebar.tsx:130 |
| 頁面標題 | 文字「問卷管理」 | src/pages/SurveyManagementPage.tsx:176 |
| 新增問卷 | role=button name「新增問卷」 | src/pages/SurveyManagementPage.tsx:179-188 |
| 關鍵字搜尋 | aria-label「搜尋關鍵字」（placeholder「搜尋問卷標題 / 描述」） | src/pages/SurveyManagementPage.tsx:206-207 |
| 搜尋／清除 | role=button name「搜尋」「清除篩選」 | src/pages/SurveyManagementPage.tsx:216、230 |
| 筆數 | 文字「共 N 筆」 | src/pages/SurveyManagementPage.tsx:233 |
| 每筆操作 | role=button name「查看詳情」「分析」「編輯」「預覽」「刪除」 | src/pages/SurveyManagementPage.tsx:277、295、303、329、346 |
| 表單標題 | heading「新增問卷」／「編輯問卷」 | src/pages/SurveyManagementPage.tsx:1093 |
| 面板關閉 | role=button name「關閉」 | src/pages/SurveyManagementPage.tsx:436、567、825、1095 |
| 回應列表 | heading「問卷回應列表（共 N 筆）」；每筆「查看內容」「刪除」 | src/pages/SurveyManagementPage.tsx:565、598、607 |
| 分析 | heading「問卷分析」「各題統計」 | src/pages/SurveyManagementPage.tsx:823、856 |
| 空列表 | 文字「無符合的問卷」 | src/pages/SurveyManagementPage.tsx:240 |
| 狀態下拉（列表篩選與單筆更改狀態） | 只有 placeholder「狀態」／「更改狀態」，無 aria-label，建議補 | src/pages/SurveyManagementPage.tsx:202、336 |
| 單筆問卷卡片 | 無穩定選擇器，建議補 data-testid（目前以問卷標題文字定位） | — |

## 怎樣算成功（可觀察的結果與證據）
- 新增：表單送出後列表多一筆，標題相符；「共 N 筆」+1。
- 更改狀態：該筆狀態徽章更新；前台填寫頁可否填寫跟著改變。
- 預覽：開出前台填寫頁（app-dev），題目與後台詳情「題目列表（N 題）」一致。
- 分析：回應數、瀏覽數與列表數字一致。

## 陷阱
- 刪除問卷／刪除回應／更新狀態失敗只用 `alert()` 提示（:113、:120、:542）；自動化要處理 dialog。
- 填寫頁 base URL 來自 `VITE_SURVEY_PUBLIC_BASE`，未設時預設 prod（https://app.daodao.so/survey/r，src/config.ts:1）；dev 環境「預覽」若開到 prod 是設定問題。
