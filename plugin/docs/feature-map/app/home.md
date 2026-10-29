# 主頁（靈感／我的／人物誌）

使用者在 App 主頁瀏覽別人的實踐與打卡動態（靈感）、看自己的實踐清單與 AI 推薦主題（我的）、看學習人物誌。

- 介面：App（apps/mobile）
- dev 網址／取得方式：沒有網頁版；裝 dev App「Dao Dao (Dev)」（見 login.md）
- 主要程式位置：projects/daodao-f2e/apps/mobile/app/(tabs)/index.tsx、components/home/tab-switcher.tsx、components/showcase/*
- 依據版本：daodao-f2e 6034e986（2026-10-23）

## 子功能
- 上方切換：靈感（預設）／我的／人物誌
- 靈感：動態卡片（某人發布了新實踐、某人在某實踐打卡、表達了加油），點打卡卡片進打卡詳情
- 我的：自己的實踐清單（全部／草稿／未開始／進行中／已完成篩選）、「探索相關主題」AI 推薦（喜歡／不喜歡回饋）
- 下拉重新整理
- 右下 FAB「建立主題實踐」（只在主頁顯示）

## 怎麼到這頁（使用者視角）
1. 登入後預設就在底部分頁「主頁」。
2. 點上方「靈感」「我的」「人物誌」切換。

## 測試帳號與前置條件
- 角色：一般使用者。
- 「我的」要有實踐才會出現清單；沒有時顯示「還沒有任何實踐，快去建立第一個吧！」。
- 靈感動態依 dev 資料，內容會變動，不要斷言特定卡片。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 底部分頁 | 分頁標題「主頁」（`mobile.tabs.home`） | app/(tabs)/_layout.tsx:80 |
| 上方切換 | 文字「靈感」「我的」「人物誌」（`mobile.home.tab_inspire`／`tab_mine`／`tab_persona`）；Pressable 無 accessibilityLabel／role | components/home/tab-switcher.tsx:13-27 |
| FAB 建立實踐 | accessibilityLabel「建立主題實踐」（`mobile.tabs.createPractice`），role=button | app/(tabs)/_layout.tsx:160 |
| 靈感空狀態 | 文字「沒有找到相關實踐」（`mobile.home.empty_showcase`） | app/(tabs)/index.tsx:260 |
| 我的空狀態 | 文字「還沒有任何實踐，快去建立第一個吧！」（`mobile.home.empty_practices`） | components/showcase/PracticeTasksSection.tsx:54 |
| 推薦區 | 文字「探索相關主題」（`dashboard.section_title`） | components/showcase/RecommendationSection.tsx:76 |
| 推薦回饋 | accessibilityLabel「喜歡」「不喜歡」（`dashboard.feedback_like`／`feedback_dislike`） | components/showcase/RecommendationSection.tsx:154、165 |
| 打卡封面 | accessibilityLabel「打卡封面」（`common.checkin_cover`） | components/showcase/CheckInShowcaseCard.tsx:116 |
| 上方切換鈕、動態卡片 | 無穩定選擇器，建議補 testID（目前只能用文字） | — |

## 怎樣算成功（可觀察的結果與證據）
- 靈感分頁出現動態卡片或空狀態文字，不是一直「載入中...」。
- 「我的」顯示自己剛建立的實踐；篩選切換後清單數量變化合理。
- 點打卡動態卡片 → 進到「打卡詳情」頁（route `/practices/<id>/check-ins/<checkInId>`，index.tsx:144）。
- 證據：手機截圖／錄影。

## 陷阱
- FAB 只在 pathname 為 `/` 時顯示（_layout.tsx:30），其他分頁看不到是正常的。
- 「人物誌」分頁內容與「我的小島」裡的人物誌分頁類似，不要混淆。
- 本機 checkout 較舊（新手任務 TaskGuideWidget 在舊版出現在分頁層，origin/dev 已移除）；以安裝的 build／OTA 版本為準。
