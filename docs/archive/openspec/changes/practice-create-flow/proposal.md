## Why

現行「新增實踐」表單把名稱、日期、頻率、天數與資源全部擠在同一頁，使用者必須先想名字再描述行動；天數只能從 7/14/21/30 四個固定值挑選（DB CHECK 約束鎖死），資源只能貼連結且名稱不可改。FRD v0.1（issue daodaoedu/daodao#141）重新設計為「先寫行動、再談節奏」的四步驟精靈：名稱由行動自動推導、開始日預設今天、天數可自訂到 90 天、超過 30 天可拆成多段一次建立，資源連結自動抓名稱且可改可無連結；同一套流程同時服務「個人實踐」與「建立模版（活動／共同挑戰）」兩個版本。

本 change 以 FRD v0.1 + 工程審閱定案（2026-08-27，PM 已回覆）為契約。

## What Changes

- **四步驟建立精靈**：Step 1 實踐行動與命名 → Step 2 節奏設定 → Step 3 標籤與資源 → Step 4 預覽；含進度指示、上一步／下一步、步驟切換捲動重設、逐步驗證與即時錯誤清除。
- **行動優先 + 名稱自動推導**：實踐行動為 Step 1 唯一必填（≤ 50 字）；名稱依子句切分規則自動推導（避開時間性子句、截 20 字），可手動覆寫、清空後恢復推導。
- **節奏設定放寬**：開始日預設今日、可選今日起 14 天內；天數預設按鈕 7/14/21/30 + 自訂 1–90（夾限）；每週頻率／每次執行時間／執行時機皆可自訂。**BREAKING（資料層）**：`practices.duration_days` 由 `IN (7,14,21,30)` 放寬為 `BETWEEN 1 AND 90`，個人與帶領人統一上限 90 天。
- **長天數拆段**：天數 > 30 顯示拆段詢問；拆段後段數 2–3，天數自動平均分配、日期接續，逐段可覆寫名稱／行動／天數／頻率／時間／時機；Step 4 一鍵建立 N 個實踐（單一 request、交易式）。
- **標籤與資源**：標籤抽屜新增／移除；資源連結自動擷取名稱（已知網域對照表 → 路徑推導 → 網域）、可純名稱不帶連結、卡片內編輯名稱與連結、拆段時可指派段落。
- **預覽與完成**：單段／多段兩種預覽；完成彈窗列出建立的實踐名稱；依入口（個人實踐／活動課程模版／共同挑戰）決定建立後去向。
- **模版版本**：建立模版時不設開始日期（Step 2 隱藏日期區塊），完成文案與去向與個人版不同。
- **順帶修正**：daodao-server 建立實踐時 `templateId` 因未列入 zod schema 被 `validation.middleware` 靜默丟棄的既有 bug，隨本 change 的 validator 重寫一併修正。

### 與 FRD v0.1 現行文字的差異（以本 change 為準，待 PM 回寫 FRD）

| 項目 | FRD 現行文字 | 本 change 採用（PM 定案） |
|---|---|---|
| 拆段段數上限 | FR-2.24 / TP-4.10：`min(12, 天數)` | **3** |
| 逐段行動字數 | FR-2.32：200 字，「刻意設計」 | **50 字，與 Step 1 相同** |
| 空值錯誤文案 | TP-2.8：「請寫下你想每天做的事」 | **「請寫下你想實踐的行動」**（FR-1.5 已改，TP-2.8 未同步） |
| FR-2.29 編號重複 | 「維持一個實踐」連結與逐段卡片同為 FR-2.29 | 後者視為 FR-2.29a |
| §5 Open Questions | 仍列 OQ-1/2/3 | 已定案：統一 90 天／3 段／同 Step 1 上限 |

## Capabilities

### New Capabilities

- `practice-create-wizard`：四步驟流程框架——步驟導航、進度指示、摘要區塊、逐步驗證、錯誤呈現、個人／模版兩版本切換
- `practice-action-naming`：Step 1 實踐行動輸入與名稱自動推導／手動覆寫
- `practice-rhythm-setting`：Step 2 開始日期、天數（1–90）、結束日推導、每週頻率、每次執行時間、執行時機及其正規化與驗證；資料層天數約束放寬
- `practice-segmentation`：長天數拆段——詢問卡、段數 2–3、天數配額、逐段欄位、批次建立 API
- `practice-tags-resources`：Step 3 標籤抽屜與資源（連結名稱擷取、純名稱資源、編輯、去重、段落指派）
- `practice-create-preview-completion`：Step 4 預覽、完成彈窗、建立後去向

### Modified Capabilities

（無——`openspec/specs/` 中沒有既有的實踐建立規格；`practice-copy-cta`、`practice-feed`、`practice-management` 不受影響）

## Impact

- **DB (daodao-storage)**：migration 放寬 `practices.duration_days` CHECK；資源表新增「可無連結」相容（`url` nullable 或等價作法，見 design）。高風險 repo，依 pipeline 規範 migration 需人工過目後才 apply。
- **後端 (daodao-server)**：重寫 `practice.validators.ts` 建立 schema（天數 1–90、頻率／時間／時機自訂值、資源 name-only、模版無開始日、補回 `templateId`）；新增批次建立端點（拆段一次建 N 筆，交易式）；新增連結名稱擷取端點（或前端純函式，見 design 決策）；`validation.middleware` 靜默丟棄行為不改，但 schema 必須完整列出欄位。
- **前端 (daodao-f2e)**：`apps/product` 新增實踐建立精靈取代現行單頁表單；`packages/api` 新增批次建立 service；名稱推導、頻率正規化、資源名稱推導為純函式並附單元測試。
- **後台 (daodao-admin-ui)**：共同挑戰／模版建立表單套用相同天數與資源規則（不需完整精靈 UI，但驗證需一致）。
- **AI (daodao-ai-backend) / Worker (daodao-worker)**：無改動。
- **既有資料**：現有 practices 全部落在 7/14/21/30，放寬約束不需回填。

## Non-goals

- 公開狀態設定（私人／即時公開／完成後分享）、困難與應對設定、執行時間滑桿——原型邏輯層有、畫面未引用，一律不做
- 模版建立後的編輯／刪除流程；發布後的加入、打卡、通知
- AI 輔助（行動建議、標籤推薦、名稱優化）
- 連結預覽圖、封面圖上傳、草稿自動儲存與續填
- 任何累積性計數、倒數、催促文案（反遊戲化稽核 TP-9.x）
