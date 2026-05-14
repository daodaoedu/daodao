# daodao-f2e 實踐 CRUD 流程

本文從瀏覽器操作角度整理 `daodao-f2e/apps/product` 的實踐建立、編輯、刪除、封存流程。

## 實踐建立流程總覽

```mermaid
flowchart TD
    U["使用者點擊建立實踐"] --> T{"建立方式"}

    T -->|"從模板"| TPL["/practices/create/template/[templateId]"]
    T -->|"手動建立"| M["/practices/create/manual"]

    TPL --> PT["預填模板資料"]
    PT --> S1["進入 5 步驟表單"]

    M --> D{"有暫存資料?"}
    D -->|"是"| RESTORE["顯示恢復對話框"]
    D -->|"否"| S1

    RESTORE --> |"選擇恢復"| R1["載入暫存 + 恢復步驟"]
    RESTORE --> |"選擇捨棄"| CLR["清除暫存"]

    R1 --> S1
    CLR --> S1

    S1 --> STEP1["Step 1: 名稱 + 行動描述"]
    STEP1 --> NEXT1["驗證 name, actionDescription"]
    NEXT1 --> |"通過"| STEP2["Step 2: 日期 + 天數 + 頻率"]

    STEP2 --> NEXT2["驗證 startDate, durationDays, frequency"]
    NEXT2 --> |"通過"| STEP3["Step 3: 時長 + 執行時段"]

    STEP3 --> NEXT3["驗證 durationMinutes, executionTiming"]
    NEXT3 --> |"通過"| STEP4["Step 4: 標籤 + 資源"]

    STEP4 --> NEXT4["驗證 tags, resources"]
    NEXT4 --> |"通過"| STEP5["Step 5: 預覽 + 隱私設定"]

    STEP5 --> SUBMIT["提交表單"]
    SUBMIT --> API["呼叫 createPractice API"]

    API --> |"成功"| CLEAR["清除暫存"]
    CLEAR --> SUCCESS["Redirect /practices/create/success"]

    API --> |"失敗"| ERR["顯示錯誤"]
    ERR --> JUMP["跳轉到對應步驟"]
```

## 手動建立 5 步驟詳解

```mermaid
flowchart LR
    subgraph Step1["Step 1: 基本資訊"]
        N["name 實踐名稱"] --> A["actionDescription 行動描述"]
    end

    subgraph Step2["Step 2: 時間規劃"]
        SD["startDate 開始日期"] --> DD["durationDays 7/14/21/30 天"]
        DD --> FREQ["frequency 頻率"]
    end

    subgraph Step3["Step 3: 執行細節"]
        DM["durationMinutes 每次時長"] --> ET["executionTiming 時段"]
        ET --> CT["customTiming 自訂時段"]
    end

    subgraph Step4["Step 4: 標籤資源"]
        TAGS["tags 標籤"] --> RES["resources 資源連結"]
    end

    subgraph Step5["Step 5: 預覽確認"]
        PREVIEW["顯示所有欄位"] --> PRIV["privacyStatus 公開/私人"]
        PRIV --> BTN["完成新增按鈕"]
    end

    Step1 --> Step2 --> Step3 --> Step4 --> Step5
```

## 實踐詳情頁面流程

```mermaid
flowchart TD
    P["/practices/[id] 載入"] --> L{"載入狀態"}

    L -->|"載入中"| LOADING["顯示載入中 + 關閉按鈕"]
    L -->|"載入完成"| C{"isOwner?"}

    LOADING --> CLOSE_L["點擊關閉 → router.back()"]

    C -->|"是 (擁有者)"| OWNER["顯示完整功能"]
    C -->|"否 (訪客)"| VISITOR["顯示有限功能"]

    OWNER --> ACTIONS["操作選項"]
    ACTIONS --> |"編輯"| EDIT["router.push /practices/[id]/edit"]
    ACTIONS --> |"封存"| ARCHIVE["顯示封存對話框"]
    ACTIONS --> |"刪除"| DELETE["顯示刪除對話框"]

    ARCHIVE --> |"確認"| DO_ARCHIVE["archivePractice API"]
    DO_ARCHIVE --> ARCHIVED["Redirect /settings/archived"]

    DELETE --> |"確認"| DO_DELETE["deletePractice API"]
    DO_DELETE --> DELETED["Redirect /"]

    OWNER --> CHECKIN["底部打卡按鈕"]
    VISITOR --> FOLLOW["關注/追蹤功能"]

    OWNER --> CLOSE_O["點擊關閉"]
    VISITOR --> CLOSE_V["點擊關閉"]

    CLOSE_O --> FROM{"from=copy?"}
    FROM -->|"是"| MINE["router.push /?tab=mine"]
    FROM -->|"否"| BACK["router.back()"]

    CLOSE_V --> BACK_V["router.back()"]
```

## 實踐編輯流程

```mermaid
flowchart TD
    P["/practices/[id]/edit 載入"] --> L{"載入狀態"}

    L -->|"載入中"| LOADING["顯示載入中"]
    L -->|"錯誤"| ERROR["顯示錯誤訊息"]
    L -->|"成功"| FORM["顯示編輯表單"]

    LOADING --> CLOSE_L["PageHeader rightActionTo=/"]

    ERROR --> CLOSE_E["PageHeader rightActionTo=/"]

    FORM --> PRELOAD["預填現有資料"]
    PRELOAD --> EDITING["使用者編輯"]

    EDITING --> DIRTY["formState.isDirty = true"]
    DIRTY --> BLOCK["useNavigationBlockerEffect 啟用"]

    BLOCK --> NAV{"嘗試離開"}
    NAV --> |"App 內導航"| DIALOG["顯示未儲存變更對話框"]
    NAV --> |"瀏覽器操作"| BEFOREUNLOAD["beforeunload 提示"]

    DIALOG --> |"繼續編輯"| STAY["留在頁面"]
    DIALOG --> |"確定離開"| LEAVE["執行導航"]

    EDITING --> SUBMIT["提交表單"]
    SUBMIT --> API["呼叫 updatePractice API"]

    API --> |"成功"| TOAST["toast.success"]
    TOAST --> DETAIL["Redirect /practices/[id]"]

    API --> |"失敗"| ERR["顯示錯誤訊息"]

    FORM --> CLOSE["PageHeader 關閉"]
    CLOSE --> RIGHT{"rightActionTo?"}
    RIGHT --> |"有"| PRIGHT["router.push /practices/[id]"]
    RIGHT --> |"無 (載入/錯誤)"| PHOME["router.push /"]
```

## 打卡記錄詳情流程

```mermaid
flowchart TD
    P["/practices/[id]/check-ins/[checkInId]"] --> L{"載入狀態"}

    L -->|"載入中"| LOADING["顯示載入中 + 日期選擇器"]
    L -->|"錯誤/找不到"| ERROR["顯示錯誤訊息"]
    L -->|"成功"| DATA["顯示打卡詳情"]

    LOADING --> CLOSE_L["PageHeader rightActionTo=/practices/[id]"]
    ERROR --> CLOSE_E["PageHeader rightActionTo=/practices/[id]"]

    DATA --> SELECTOR["日期選擇器 (mobile 整合標題列)"]
    DATA --> HEADER["PageHeader (desktop)"]

    SELECTOR --> DATES["完整日期列表 (含空缺)"]
    DATES --> CLICK["點擊日期"]

    CLICK --> HAS{"該日期有打卡?"}
    HAS -->|"是"| NAV["router.push /practices/[id]/check-ins/[newId]"]
    HAS -->|"否"| NONE["無動作"]

    DATA --> SAMEDAY["同日多筆打卡導航"]
    SAMEDAY --> |"上一筆/下一筆"| SWITCH["切換到同日其他打卡"]

    DATA --> EDIT["編輯打卡 (isOwner)"]
    EDIT --> UPDATE["呼叫 updateCheckIn API"]
    UPDATE --> |"成功"| TOAST["toast.success"]
    UPDATE --> |"失敗"| ERR["toast.error"]

    DATA --> FOOTER["底部打卡按鈕 (isOwner)"]
    FOOTER --> NEWCHECK["新增打卡"]

    DATA --> CLOSE["PageHeader rightActionTo=/practices/[id]"]
```

## 封存與刪除對話框流程

```mermaid
flowchart TD
    subgraph Archive["封存流程"]
        A_START["點擊封存"] --> A_DIALOG["開啟封存對話框"]
        A_DIALOG --> A_CONFIRM{"使用者確認?"}
        A_CONFIRM --> |"是"| A_API["archivePractice API"]
        A_CONFIRM --> |"否"| A_CANCEL["取消"]

        A_API --> A_SUCCESS["成功 → Redirect /settings/archived"]
        A_API --> A_FAIL["失敗 → toast.error"]
    end

    subgraph Delete["刪除流程"]
        D_START["點擊刪除"] --> D_DIALOG["開啟刪除對話框"]
        D_DIALOG --> D_CONFIRM{"使用者確認?"}
        D_CONFIRM --> |"是"| D_API["deletePractice API"]
        D_CONFIRM --> |"否"| D_CANCEL["取消"]

        D_API --> D_SUCCESS["成功 → Redirect /"]
        D_API --> D_FAIL["失敗 → toast.error"]
    end

    subgraph Restore["復原流程 (已封存)"]
        R_START["點擊復原"] --> R_DIALOG["開啟封存對話框 (顯示復原)"]
        R_DIALOG --> R_CONFIRM{"使用者確認?"}
        R_CONFIRM --> |"是"| R_API["restorePractice API"]
        R_CONFIRM --> |"否"| R_CANCEL["取消"]

        R_API --> R_SUCCESS["成功 → toast.success"]
        R_API --> R_FAIL["失敗 → toast.error"]
    end
```

## 相關程式位置

- `daodao-f2e/apps/product/src/app/[locale]/practices/create/manual/page.tsx`
- `daodao-f2e/apps/product/src/app/[locale]/practices/[id]/page.tsx`
- `daodao-f2e/apps/product/src/app/[locale]/practices/[id]/edit/page.tsx`
- `daodao-f2e/apps/product/src/app/[locale]/practices/[id]/check-ins/[checkInId]/page.tsx`
- `daodao-f2e/apps/product/src/hooks/use-archive-practice-dialog.ts`
- `daodao-f2e/apps/product/src/hooks/use-delete-practice-dialog.ts`
- `daodao-f2e/apps/product/src/components/practice/create/manual/steps/step-*.tsx`
