# 我的小島（個人頁）

使用者看自己的個人資訊、學習類型測驗結果、自己的主題實踐清單與學習人物誌，並進入編輯公開資訊。

- 介面：App（apps/mobile）
- dev 網址／取得方式：沒有網頁版；裝 dev App「Dao Dao (Dev)」（見 login.md）
- 主要程式位置：projects/daodao-f2e/apps/mobile/app/(tabs)/profile.tsx、components/practice/practice-section.tsx、components/user/user-info-card.tsx、app/users/[identifier].tsx（別人的個人頁）
- 依據版本：daodao-f2e 6034e986（2026-10-23）

## 子功能
- 個人資訊卡（頭像、名稱、社群連結）＋編輯入口（→ /settings/public-info）
- 學習類型：「立即測驗」／「重新測驗」／「觀看詳細說明」
- 分頁：我的實踐、人物誌（學習計劃、想法為停用狀態）
- 我的實踐：「包含已完成」勾選、依狀態（草稿／未開始／進行中／已完成）分組、點卡片進詳情、「繼續編輯」草稿、卡片上「打卡」
- 別人的個人頁 `/users/<identifier>`

## 怎麼到這頁（使用者視角）
1. 底部分頁「我的小島」。
2. 點「我的實踐」或「人物誌」切換；點實踐卡片進詳情。
3. 點個人資訊卡上的編輯鈕 → 公開資訊設定。

## 測試帳號與前置條件
- 角色：一般使用者。
- 要看實踐清單需至少一筆實踐；學習類型結果需做過測驗。

## 穩定的選擇器
| 元素 | 選擇器 | 依據 |
|------|--------|------|
| 底部分頁 | 分頁標題「我的小島」（`mobile.tabs.profile`） | app/(tabs)/_layout.tsx:106 |
| 頁面標題 | 文字「我的小島」（`mobile.profile.title`） | app/(tabs)/profile.tsx:144 |
| 學習類型按鈕 | 文字「立即測驗」或「觀看詳細說明」（`mobile.profile.start_quiz`／`view_details`）、「重新測驗」（`retake_quiz`） | app/(tabs)/profile.tsx:175、195 |
| 編輯個人資訊 | accessibilityLabel「公開資訊設定」（`mobile.publicInfoSettings.title`），role=button | components/user/user-info-card.tsx:160-165 |
| 社群連結 | role=link，accessibilityLabel 為平台名稱 | components/user/user-info-card.tsx:268-269 |
| 分頁切換 | accessibilityLabel「我的實踐」「人物誌」（`dashboard.practice_section_title`／`persona.tabLabelShort`），role=button；「學習計劃」「想法」為 disabled | components/practice/practice-section.tsx:46-49、75-76 |
| 包含已完成 | role=checkbox，accessibilityLabel「包含已完成」（`dashboard.practice_include_completed`），accessibilityState.checked | components/practice/practice-section.tsx:163-165 |
| 實踐列 | role=button，accessibilityLabel 為實踐標題 | components/practice/practice-section.tsx:223-224 |
| 空狀態 | 文字「還沒有進行中的實踐」（`dashboard.practice_empty_practices`） | components/practice/practice-section.tsx:207 |
| 載入失敗 | 文字「載入失敗，點擊重試」（`dashboard.load_failed_retry`） | components/practice/practice-section.tsx:198 |
| 實踐卡片上打卡 | accessibilityLabel「打卡 {title}」 | components/PracticeCard.tsx:508 |

## 怎樣算成功（可觀察的結果與證據）
- 打開分頁看到自己的名稱與實踐清單；剛建立的實踐出現在對應狀態分組。
- 勾「包含已完成」後 checked 狀態改變，已完成的實踐出現。
- 點實踐 → 進 `/practices/<id>` 詳情；編輯公開資訊存檔後回來，名稱／簡介更新。

## 陷阱
- 實踐清單需要 `user.id` 才渲染（profile.tsx:263）；登入資料不完整時這區是空的，不是沒有實踐。
- 「學習計劃」「想法」分頁是 disabled（practice-section.tsx:48-49），點了沒反應是設計如此。
