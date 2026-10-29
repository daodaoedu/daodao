# 意見回饋

管理員查看用戶送來的建議與問題回報，篩選、展開內容、回覆並變更處理狀態。

- 介面：Admin UI（daodao-admin-ui）
- dev 網址／取得方式：https://admin-dev.daodao.so/admin/feedback
- 主要程式位置：projects/daodao-admin-ui/src/pages/FeedbackPage.tsx、src/lib/feedback.ts、src/hooks/useFeedback.ts
- 依據版本：daodao-admin-ui c835bb3（2026-10-23）

## 子功能
- 統計卡：總回饋、待處理、本月新增
- 依狀態（全部狀態／待處理／已回覆／已關閉）與分類（全部分類／Bug／功能建議／問題／其他）篩選
- 點一筆展開全文 → 輸入回覆 →「送出回覆」
- 變更狀態下拉 →「確認」

## 怎麼到這頁（使用者視角）
1. 登入後台 → 左側欄「支援」群組 →「意見回饋」。
2. 點任一筆回饋展開；在展開區回覆或變更狀態。

## 測試帳號與前置條件
- 角色：admin。
- 需要 dev 有至少一筆回饋；沒有時先用一般使用者帳號從前台送一筆（前台入口不在本檔範圍）。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 側欄入口 | role=link name「意見回饋」，href `/admin/feedback` | src/components/layout/Sidebar.tsx:147 |
| 頁面標題 | 文字「意見回饋」 | src/pages/FeedbackPage.tsx:138 |
| 統計卡 | 標題文字「總回饋」「待處理」「本月新增」 | src/pages/FeedbackPage.tsx:160-162 |
| 狀態／分類篩選 | 下拉選項文字「全部狀態」「全部分類」等（trigger 無 aria-label） | src/pages/FeedbackPage.tsx:38-44、src/lib/feedback.ts:4-16 |
| 載入錯誤 | role=alert，文字「無法載入意見回饋，請稍後再試。」 | src/pages/FeedbackPage.tsx:176-179 |
| 回覆輸入框 | aria-label「回覆內容」（placeholder「輸入回覆內容...」） | src/pages/FeedbackPage.tsx:283-284 |
| 送出回覆 | role=button name「送出回覆」 | src/pages/FeedbackPage.tsx:302 |
| 變更狀態確認 | role=button name「確認」（旁邊標籤「變更狀態：」） | src/pages/FeedbackPage.tsx:307、332 |
| 操作結果 | 成功 role=status、失敗 role=alert（如「已送出回覆」、「狀態已變更為「已回覆」」） | src/pages/FeedbackPage.tsx:72、91、338 |
| 空結果 | 文字「沒有符合條件的回饋」 | src/pages/FeedbackPage.tsx:356 |
| 單筆回饋的展開鈕 | 無穩定選擇器（整列是 ghost Button，名稱是用戶名＋內容），建議補 data-testid 或 aria-expanded | — |
| 篩選下拉 trigger | 無穩定選擇器，建議補 aria-label | — |

## 怎樣算成功（可觀察的結果與證據）
- 送出回覆：展開區出現 role=status「已送出回覆」，輸入框清空；重新整理後該筆狀態變「已回覆」（若 server 自動改狀態）或回覆內容可見。
- 變更狀態：出現「狀態已變更為「X」」，該筆徽章文字更新；重新整理仍保留。
- 失敗時（例如 API 錯誤）出現 role=alert，已輸入的回覆內容保留（FeedbackPage.tsx:74 註解）。
- 載入中或失敗時統計卡不顯示 0（FeedbackPage.tsx:132 註解）。

## 陷阱
- 舊版本這頁的「送出回覆」「確認」只跳 `alert()`、沒存檔（#313，已關閉）。本機 checkout 若落後（例如停在 d8fe4b5）看到的仍是舊程式；以部署到 admin-dev 的版本為準，驗收時要重新整理確認真的有存下來，不能只看提示。
- 回覆是否會寄信給用戶未在前端程式中看到，需在 runtime 確認（推測：看 server 的 feedback reply 實作）。
