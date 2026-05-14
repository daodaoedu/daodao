# daodao-f2e 打卡流程

本文從瀏覽器操作角度整理 `daodao-f2e/apps/product` 的打卡功能流程。

## 打卡入口總覽

```mermaid
flowchart TD
    U["使用者想要打卡"] --> E{"入口位置"}

    E -->|"實踐詳情頁"| PD["/practices/[id] 底部按鈕"]
    E -->|"打卡記錄頁"| CD["/practices/[id]/check-ins/[checkInId] 底部按鈕"]
    E -->|"首頁快捷"| HOME["首頁實踐卡片"]

    PD --> BTN["CheckInButton 元件"]
    CD --> BTN
    HOME --> BTN

    BTN --> STATUS{"實踐狀態檢查"}

    STATUS -->|"已完成/已封存"| DISABLED["按鈕禁用"]
    STATUS -->|"進行中"| COOLDOWN{"冷卻時間檢查"}

    COOLDOWN -->|"24h 內已打卡"| WARN["顯示警告: 距上次打卡不到 24h"]
    COOLDOWN -->|"可以打卡"| DATECHECK{"日期範圍檢查"}

    DATECHECK -->|"超出範圍"| OUTSIDE["顯示提示: 不在實踐期間"]
    DATECHECK -->|"在範圍內"| ENABLED["啟用打卡按鈕"]

    ENABLED --> CLICK["點擊打卡"]
    CLICK --> DIALOG["開啟打卡 Dialog"]
```

## 打卡 Dialog 流程

```mermaid
flowchart TD
    D["打卡 Dialog 開啟"] --> FORM["顯示打卡表單"]

    FORM --> STEP1["Step 1: 選擇心情"]
    STEP1 --> MOOD["選擇 mood: happy/neutral/sad"]

    MOOD --> STEP2["Step 2: 填寫內容"]
    STEP2 --> CONTENT["輸入打卡筆記 (選填)"]

    CONTENT --> STEP3["Step 3: 新增媒體"]
    STEP3 --> MEDIA{"是否上傳照片?"}

    MEDIA -->|"是"| UPLOAD["選擇/拍攝照片"]
    MEDIA -->|"否"| STEP4["Step 4: 選擇標籤"]

    UPLOAD --> PREVIEW["預覽照片"]
    PREVIEW --> STEP4

    STEP4 --> TAGS["選擇或建立標籤 (選填)"]

    TAGS --> SUBMIT["點擊完成打卡"]
    SUBMIT --> API["呼叫 createCheckIn API"]

    API --> |"成功"| SUCCESS["顯示成功動畫"]
    SUCCESS --> CALLBACK["執行 onComplete callback"]
    CALLBACK --> CLOSE["關閉 Dialog"]

    API --> |"失敗"| ERROR["toast.error"]
    ERROR --> STAY["留在 Dialog 繼續編輯"]

    FORM --> CANCEL["點擊取消"]
    CANCEL --> CONFIRM{"有填寫內容?"}
    CONFIRM -->|"是"| DISCARD["顯示捨棄確認"]
    CONFIRM -->|"否"| CLOSE2["關閉 Dialog"]
    DISCARD --> |"確認捨棄"| CLOSE2
    DISCARD --> |"繼續編輯"| STAY2["留在 Dialog"]
```

## 打卡日期選擇器流程

```mermaid
flowchart TD
    C["CheckInDateSelector 元件"] --> MOBILE{"裝置類型"}

    MOBILE -->|"Mobile"| M_INT["整合在標題列"]
    MOBILE -->|"Desktop"| D_SEP["獨立元件在標題列下方"]

    M_INT --> M_TOGGLE["點擊展開日期列表"]
    D_SEP --> D_SCROLL["水平捲動日期列表"]

    M_TOGGLE --> DATES["顯示日期列表"]
    D_SCROLL --> DATES

    DATES --> GENERATE["generateFullDateRange()"]
    GENERATE --> RANGE["從 startDate 到 endDate 的所有日期"]

    RANGE --> RENDER["渲染日期格子"]
    RENDER --> EACH["每個日期格子"]

    EACH --> HAS_CHECKIN{"該日期有打卡?"}
    HAS_CHECKIN -->|"是"| DOT["顯示打卡次數圓點"]
    HAS_CHECKIN -->|"否"| EMPTY["顯示空格子"]

    DOT --> COUNT["次數 > 1 顯示數字"]
    COUNT --> ACTIVE{"是當前選中?"}
    EMPTY --> ACTIVE

    ACTIVE -->|"是"| HIGHLIGHT["高亮樣式"]
    ACTIVE -->|"否"| NORMAL["一般樣式"]

    EACH --> CLICK_DATE["點擊日期"]
    CLICK_DATE --> NAV_CHECKIN{"有打卡記錄?"}

    NAV_CHECKIN -->|"是"| NAV_TO["router.push /practices/[id]/check-ins/[checkInId]"]
    NAV_CHECKIN -->|"否"| NO_ACTION["無動作 (停留在當前頁)"]
```

## 同日多筆打卡導航

```mermaid
flowchart TD
    P["打卡詳情頁載入"] --> CALC["計算 sameDayCheckInIds"]

    CALC --> FILTER["篩選同日期的所有打卡"]
    FILTER --> SORT["按 createdAt 排序 (舊→新)"]

    SORT --> INDEX["計算 currentIndexInDay"]
    INDEX --> RENDER["渲染 SameDayCheckInNav"]

    RENDER --> |"count > 1"| NAV["顯示導航箭頭 + 計數"]
    RENDER --> |"count = 1"| HIDE["隱藏導航"]

    NAV --> LEFT["點擊左箭頭"]
    NAV --> RIGHT["點擊右箭頭"]

    LEFT --> HAS_PREV{"currentIndex > 0?"}
    HAS_PREV -->|"是"| PREV_ID["取得 sameDayCheckInIds[currentIndex - 1]"]
    HAS_PREV -->|"否"| DISABLED_L["左箭頭禁用"]

    PREV_ID --> NAV_PREV["router.push /practices/[id]/check-ins/[prevId]"]

    RIGHT --> HAS_NEXT{"currentIndex < count - 1?"}
    HAS_NEXT -->|"是"| NEXT_ID["取得 sameDayCheckInIds[currentIndex + 1]"]
    HAS_NEXT -->|"否"| DISABLED_R["右箭頭禁用"]

    NEXT_ID --> NAV_NEXT["router.push /practices/[id]/check-ins/[nextId]"]
```

## 打卡編輯流程

```mermaid
flowchart TD
    P["打卡詳情頁"] --> OWNER{"isOwner?"}

    OWNER -->|"是"| EDIT_BTN["顯示編輯按鈕"]
    OWNER -->|"否"| READONLY["唯讀模式"]

    EDIT_BTN --> CLICK["點擊編輯"]
    CLICK --> EDIT_MODE["進入編輯模式"]

    EDIT_MODE --> FORM["顯示編輯表單"]
    FORM --> FIELDS["可編輯欄位"]

    FIELDS --> MOOD_E["心情"]
    FIELDS --> CONTENT_E["筆記內容"]
    FIELDS --> MEDIA_E["照片 (新增/刪除)"]
    FIELDS --> TAGS_E["標籤"]

    MOOD_E --> CHANGE["修改內容"]
    CONTENT_E --> CHANGE
    MEDIA_E --> CHANGE
    TAGS_E --> CHANGE

    CHANGE --> SAVE["點擊儲存"]
    SAVE --> API["呼叫 updateCheckIn API"]

    API --> |"成功"| SUCCESS["toast.success: 打卡已更新"]
    SUCCESS --> REFETCH["重新取得打卡資料"]
    REFETCH --> VIEW["回到檢視模式"]

    API --> |"失敗"| ERROR["toast.error: 更新打卡失敗"]
    ERROR --> STAY["留在編輯模式"]

    EDIT_MODE --> CANCEL["點擊取消"]
    CANCEL --> DIRTY{"有修改?"}
    DIRTY -->|"是"| CONFIRM_C["確認捨棄變更?"]
    DIRTY -->|"否"| VIEW_C["回到檢視模式"]
    CONFIRM_C --> |"是"| VIEW_C
    CONFIRM_C --> |"否"| STAY_C["留在編輯模式"]
```

## 打卡狀態與限制

```mermaid
flowchart TD
    BTN["CheckInButton"] --> CHECK["檢查打卡條件"]

    CHECK --> STATUS_P{"practiceStatus?"}
    STATUS_P -->|"completed"| DONE["顯示: 已完成"]
    STATUS_P -->|"archived"| ARCH["顯示: 已封存"]
    STATUS_P -->|"active"| DATE_CHECK["檢查日期範圍"]

    DATE_CHECK --> TODAY{"today 在 startDate ~ endDate?"}
    TODAY -->|"否"| OUT["顯示: 不在實踐期間"]
    TODAY -->|"是"| COOL_CHECK["檢查冷卻時間"]

    COOL_CHECK --> LAST{"lastCheckInDate 存在?"}
    LAST -->|"否"| CAN_CHECK["可以打卡"]
    LAST -->|"是"| HOURS["計算距上次打卡時間"]

    HOURS --> COOL_24{"< 24 小時?"}
    COOL_24 -->|"是"| WARN_24["顯示警告 (仍可打卡)"]
    COOL_24 -->|"否"| CAN_CHECK

    WARN_24 --> WARN_MSG["提示: 距上次打卡不到 24 小時"]
    WARN_MSG --> STILL["仍可點擊打卡"]

    CAN_CHECK --> ENABLE_BTN["啟用打卡按鈕"]
    ENABLE_BTN --> CLICK_BTN["點擊開啟打卡 Dialog"]

    DONE --> DISABLE_BTN["按鈕禁用"]
    ARCH --> DISABLE_BTN
    OUT --> DISABLE_BTN
```

## 相關程式位置

- `daodao-f2e/apps/product/src/components/check-in/check-in-button.tsx`
- `daodao-f2e/apps/product/src/components/check-in/check-in-date-selector/`
- `daodao-f2e/apps/product/src/components/check-in/same-day-check-in-nav.tsx`
- `daodao-f2e/apps/product/src/components/check-in/check-in-detail.tsx`
- `daodao-f2e/apps/product/src/app/[locale]/practices/[id]/check-ins/[checkInId]/page.tsx`
- `daodao-f2e/packages/api/src/services/check-in.ts`
