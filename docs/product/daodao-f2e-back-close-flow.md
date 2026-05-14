# daodao-f2e 頁面返回與關閉邏輯

本文從瀏覽器操作角度整理 `daodao-f2e/apps/product` 目前的返回、關閉與離頁保護邏輯。內容以 `daodao-f2e` 遠端 `origin/dev` 最新狀態為準。

## 核心結論

- 頁面標題列主要由 `PageHeader` 控制。
- `PageHeader` 使用 `useSafeRouter()`，因此會先檢查是否有未儲存變更。
- `rightActionTo` 目前實作是 `router.replace(rightActionTo)`，符合「關閉目前任務」的 UX 語意。
- `PageHeader` 右上角關閉若沒有指定 `rightActionTo`，目前會 `router.replace("/")`，不再預設 `router.back()`。
- 瀏覽器工具列 Back/Forward 目前沒有自訂 `popstate` 攔截，會走瀏覽器/Next.js 原生 history 行為。
- 重新整理、關閉分頁、輸入新網址離開時，若 `NavigationBlockerProvider.isBlocked = true`，會觸發瀏覽器原生 `beforeunload` 提示。

## 瀏覽器操作總覽：使用者體驗版

這張圖以使用者心智模型整理：使用者不是在思考 `router.push` 或 `router.back`，而是在做「回上一層」、「放棄這個任務」、「離開網站」、「避免資料遺失」幾種行為。

```mermaid
flowchart TD
    Start["使用者在 daodao-f2e 頁面中"] --> Intent{"使用者想做什麼？"}

    Intent -->|"回到剛剛看的上一頁"| BackIntent["點返回或瀏覽器 Back"]
    Intent -->|"結束目前任務或關閉詳情"| CloseIntent["點右上角關閉"]
    Intent -->|"前往另一個 App 內頁面"| InAppIntent["點頁面連結或 CTA"]
    Intent -->|"離開網站或重整頁面"| LeaveIntent["重整、關閉分頁、輸入新網址"]

    BackIntent --> BackSource{"從哪裡觸發？"}
    BackSource -->|"App 內返回按鈕"| SafeCheck["檢查是否有未儲存變更"]
    BackSource -->|"瀏覽器 Back"| BrowserBack["瀏覽器直接移動 history"]

    CloseIntent --> CloseTarget{"此頁有明確關閉目的地？"}
    CloseTarget -->|"有，例如回首頁或回實踐詳情"| SafeCheck
    CloseTarget -->|"沒有，等同上一頁"| SafeCheck

    InAppIntent --> LinkType{"連結是否走保護機制？"}
    LinkType -->|"CustomLink 或 useSafeRouter"| SafeCheck
    LinkType -->|"一般 useRouter / Link"| DirectNav["直接切換頁面"]

    SafeCheck --> Dirty{"頁面內容是否已編輯但未儲存？"}
    Dirty -->|"否"| RouteDecision{"導航類型"}
    Dirty -->|"是"| UnsavedDialog["顯示未儲存變更確認"]

    UnsavedDialog -->|"繼續編輯"| Stay["留在目前頁面"]
    UnsavedDialog -->|"確定離開"| RouteDecision

    RouteDecision -->|"返回"| GoBack["回到 history 前一筆"]
    RouteDecision -->|"關閉到指定頁"| GoTarget["前往指定頁面"]
    RouteDecision -->|"App 內跳轉"| GoInApp["前往目標頁面"]

    BrowserBack --> BrowserRisk{"目前是否有未儲存變更？"}
    BrowserRisk -->|"否"| NativeBack["正常返回或前進"]
    BrowserRisk -->|"是"| NativeBackRisk["目前不會顯示 App 自訂確認，依瀏覽器 history 行為離開"]

    LeaveIntent --> BeforeUnload{"頁面內容是否已編輯但未儲存？"}
    BeforeUnload -->|"否"| Leave["正常離開或刷新"]
    BeforeUnload -->|"是"| NativePrompt["瀏覽器原生離頁確認"]
    NativePrompt -->|"取消"| Stay
    NativePrompt -->|"確認"| Leave
```

### UX 解讀

- 「返回」應讓使用者回到上一個看過的脈絡，適合使用 `router.back()`。
- 「關閉」應讓使用者結束目前任務，通常應回到穩定目的地，例如首頁、實踐詳情、設定首頁。
- 「關閉到指定頁」目前已使用 `replace`，使用者再按瀏覽器 Back 不會回到剛剛關閉的頁面，較符合「已離開這個任務」的直覺。
- 有未儲存變更時，App 內按鈕和 `CustomLink` 會顯示自訂確認；瀏覽器 Back/Forward 目前不會顯示同一套自訂確認。
- 關閉分頁、重新整理、輸入新網址時，只能顯示瀏覽器原生 `beforeunload` 提示，文案不可完全自訂。

## 現況差異與優化方向

| 場景 | 最新現況 | 使用者感受 | 後續優化 | 優先級 |
|------|----------|------------|----------|--------|
| 右上角關閉到指定頁 | `rightActionTo` 已走 `router.replace()` | 關閉後按瀏覽器 Back 不會回到剛關閉的頁面 | 維持；文件與註解已一致 | 已完成 |
| 右上角關閉但沒有指定目的地 | 目前 `router.replace("/")` | 會穩定回首頁，不再依賴 history | 若某些頁面應回模組首頁，明確補 `rightActionTo` | 中 |
| 實踐詳情關閉 | 目前 `router.replace("/?tab=mine")` | 回到我的實踐脈絡，避免關閉後循環 | 檢查從公開頁、搜尋、通知進入時是否也都應回 mine | 中 |
| 返回上一頁 | 多數情境走 `router.back()` | 符合「回到剛剛看過的地方」 | 保留 `back()`，但避免拿它當「關閉任務」用 | 高 |
| 瀏覽器 Back 且有未儲存資料 | 目前不會顯示 App 自訂確認 | 可能直接離開編輯頁，資料保護感不一致 | 評估加入 history blocker 或在高風險表單避免依賴瀏覽器 Back | 中 |
| App 內連結 | `CustomLink` 會保護，一般 `useRouter` 不一定 | 同樣是跳頁，有些會提醒、有些不會 | 高風險頁面統一使用 `useSafeRouter` 或 `CustomLink` | 中 |
| 關閉分頁 / 重整 | 走瀏覽器原生 `beforeunload` | 有保護，但提示文案受瀏覽器限制 | 保留，並避免把它當主要 UX | 低 |
| 建立流程 Step 內返回 | Step 1 返回 history，Step 2-5 回上一步 | 大致合理 | 文案與 icon 可區分「上一步」和「離開建立」 | 中 |

## 建議優化後的 UX 流程

```mermaid
flowchart TD
    Start["使用者在頁面中"] --> Intent{"使用者意圖"}

    Intent -->|"回上一個瀏覽脈絡"| Back["返回"]
    Intent -->|"結束目前任務"| Close["關閉"]
    Intent -->|"流程內調整"| StepBack["上一步"]
    Intent -->|"離開或刷新網站"| Leave["離開網站"]

    Back --> SafeCheck["檢查未儲存變更"]
    Close --> SafeCheck
    StepBack --> InternalState["只改變流程 step，不動瀏覽器 history"]

    SafeCheck --> Dirty{"有未儲存變更？"}
    Dirty -->|"否"| NavType{"導航意圖"}
    Dirty -->|"是"| Confirm["顯示未儲存變更確認"]

    Confirm -->|"繼續編輯"| Stay["停留目前頁"]
    Confirm -->|"確定離開"| NavType

    NavType -->|"返回"| RouterBack["router.back()"]
    NavType -->|"關閉"| RouterReplace["router.replace(closeTarget)"]

    RouterBack --> Previous["回到上一個 history 頁面"]
    RouterReplace --> Stable["到穩定目的地，並移除目前頁 history"]

    Leave --> BrowserDirty{"有未儲存變更？"}
    BrowserDirty -->|"否"| Exit["正常離開"]
    BrowserDirty -->|"是"| NativePrompt["瀏覽器原生 beforeunload 提示"]
    NativePrompt -->|"取消"| Stay
    NativePrompt -->|"確認"| Exit
```

### 建議決策規則

| 使用者看到的動作 | 建議實作 | 原因 |
|------------------|----------|------|
| 返回 | `router.back()` | 回到上一個瀏覽脈絡，符合瀏覽器模型 |
| 關閉 | `router.replace(target)` | 結束目前任務，不應讓 Back 回到已關閉頁 |
| 上一步 | component state / form step state | 流程內移動，不應污染瀏覽器 history |
| 前往詳情 / 編輯 / 下一頁 | `router.push(target)` | 使用者是在新增一個瀏覽脈絡 |
| 儲存成功後離開表單 | `router.replace(successTarget)` 或清掉 dirty 後 `push` | 避免 Back 回到已提交的編輯狀態 |

### 剩餘建議改動

1. 檢查所有沒有指定 `rightActionTo` 的 `PageHeader`，確認預設回首頁是否符合該頁 UX。
2. 檢查 `/?tab=mine` 是否適合作為所有實踐詳情關閉落點；若從通知、公開頁、搜尋頁進入，可能需要保留來源脈絡。
3. 高風險表單頁面優先統一 App 內跳轉入口，避免部分按鈕繞過 `useSafeRouter`。
4. 若要處理瀏覽器 Back 的未儲存資料保護，需要另行設計 history blocker；這會影響瀏覽器原生行為，應單獨評估。

## PageHeader 返回與關閉

`PageHeader` 的左側返回與右側關閉目前邏輯如下：

```mermaid
flowchart TD
    P["PageHeader 按鈕點擊"] --> S{"點哪一側？"}

    S -->|"左側返回"| L{"有 onLeftAction？"}
    L -->|"有"| L1["執行 onLeftAction()"]
    L -->|"無"| L2["useSafeRouter().back()"]

    S -->|"右側關閉"| R{"有 onRightAction？"}
    R -->|"有"| R1["執行 onRightAction()"]
    R -->|"無"| RT{"有 rightActionTo？"}
    RT -->|"有"| R2["useSafeRouter().replace(rightActionTo)"]
    RT -->|"無"| R3["useSafeRouter().replace('/')"]

    L2 --> H["瀏覽器 history 往前一筆"]
    R2 --> N["以目標頁取代目前 history"]
    R3 --> N
```

### History 效果

```mermaid
flowchart LR
    subgraph Back["router.back()"]
        B1["/previous"] --> B2["/current"]
        B2 -->|"back"| B3["回到 /previous"]
    end

    subgraph OldPush["舊行為：router.push(rightActionTo)"]
        P1["/previous"] --> P2["/current"]
        P2 -->|"close: push /target"| P3["/target"]
        P3 -->|"瀏覽器 Back"| P4["回到 /current"]
    end

    subgraph Replace["最新行為：router.replace(rightActionTo)"]
        R1["/previous"] --> R2["/current"]
        R2 -->|"replace /target"| R3["/target"]
        R3 -->|"瀏覽器 Back"| R4["回到 /previous"]
    end
```

## 未儲存變更保護

目前會設定 `useNavigationBlockerEffect(form.formState.isDirty)` 的表單包含：

- 建立實踐手動流程：`/practices/create/manual`
- 編輯實踐：`/practices/[id]/edit`
- 帳號設定表單
- 公開資訊設定表單
- 領域偏好設定表單

```mermaid
flowchart TD
    F["表單 formState.isDirty"] --> E["useNavigationBlockerEffect(isDirty)"]
    E --> C["NavigationBlockerProvider.isBlocked"]

    C -->|"App 內 useSafeRouter / CustomLink 導航"| A["顯示自訂 Dialog"]
    A -->|"繼續編輯"| S["不導航"]
    A -->|"確定離開"| N["執行原本導航"]

    C -->|"重新整理 / 關閉分頁 / 外部離開"| B["beforeunload"]
    B --> W["瀏覽器原生確認提示"]

    C -->|"瀏覽器 Back / Forward"| P["目前未接到自訂 Dialog"]
    P --> H["依瀏覽器 history 行為切頁"]
```

## 主要頁面行為對照

```mermaid
flowchart TD
    Home["首頁 / 列表"] --> Create["/practices/create"]
    Create -->|"關閉 PageHeader rightActionTo='/'"| Home
    Create -->|"選模板"| Template["/practices/create/template/[templateId]"]
    Create -->|"手動建立"| Manual["/practices/create/manual"]

    Template -->|"返回 leftAction"| Create
    Template -->|"關閉預設 back"| Create

    Manual -->|"PageHeader 關閉 rightActionTo='/'"| Home
    Manual -->|"Step 1 底部返回"| Prev["history 前一頁"]
    Manual -->|"Step 2-5 底部返回"| ManualPrev["流程內 previous step"]

    Home --> Practice["/practices/[id]"]
    Practice -->|"關閉 replace"| Mine["/?tab=mine"]

    Practice --> Edit["/practices/[id]/edit"]
    Edit -->|"關閉 rightActionTo='/practices/[id]'"| Practice
    Edit -->|"載入/錯誤狀態關閉 rightActionTo='/'"| Home

    Practice --> CheckIn["/practices/[id]/check-ins/[checkInId]"]
    CheckIn -->|"關閉 replace closeActionTo / rightActionTo"| Practice
    CheckIn -->|"同日打卡切換"| OtherCheckIn["push 到另一個 check-in detail"]
```

## 相關程式位置

- `daodao-f2e/apps/product/src/components/layout/page-header.tsx`
- `daodao-f2e/packages/ui/src/hooks/use-safe-router.tsx`
- `daodao-f2e/packages/ui/src/hooks/navigation-blocker.tsx`
- `daodao-f2e/packages/ui/src/hooks/use-unsaved-changes-confirm.tsx`
- `daodao-f2e/packages/ui/src/components/custom-link.tsx`
- `daodao-f2e/apps/product/src/components/check-in/date-selector/mobile.tsx`
- `daodao-f2e/apps/product/src/app/[locale]/practices/create/manual/page.tsx`
- `daodao-f2e/apps/product/src/app/[locale]/practices/[id]/edit/page.tsx`
