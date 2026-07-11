# **打卡紀錄展示與互動 FRD**

版本 1.1　｜　2026-04-22

> **狀態校準（2026-07-06）：✅ 已上線。** 本文件的需求與設計內容仍有效，但靈感牆（Inspire Feed）已實作於程式碼——規劃時請以程式碼為準，勿重做。實作位置：`daodao-ai-backend/src/routers/feed.py`、`daodao-f2e/packages/api/src/services/feed-hooks.ts`。狀態追蹤見 daodao 主 repo 的 `scripts/product_status_manifest.yml` 與 `.claude/skills/product-status-check`。

## **1\. Inspire Feed 組成演算法**

**Purpose**  
定義 Inspire Feed 的卡片類型排列規則，確保打卡紀錄、互動動態、主題實踐三種內容以固定節奏交替出現，維持 Feed 的新鮮感與內容深度。

**Scope**

* 適用頁面：Inspire Feed（/inspire 或 Dashboard 靈感 Tab）。  
* 三種卡片類型：CheckInShowcaseCard、ActivityCard、PracticeShowcaseCard / BrewingCard。

**Functional Requirements**

### **FR-1.1 循環排列規則（Slot Pattern）**

Feed 以下列順序為一個循環單位，不斷重複：

| Slot | 卡片類型 | Component | 數量 |
| :---- | :---- | :---- | :---- |
| A | 打卡（Check-in） | CheckInShowcaseCard | 1～2 則 |
| B | 互動（Activity） | ActivityCard | 1 則 |
| C | 實踐（Practice） | PracticeShowcaseCard / BrewingCard | 3 則 |

*循環示意：A → B → C → C → C → A → B → C → C → C → ...*

### **FR-1.2 打卡則數判斷邏輯（Slot A）**

| 條件（優先序由上到下） | 顯示則數 | 實作說明 |
| :---- | :---- | :---- |
| 打卡 reactions ≥ 1 或 comments ≥ 1 | 1 則 | 從候選池取 1 則熱門打卡 |
| 候選池有 ≥ 2 則打卡，皆為冷啟動（reactions \= 0 且 comments \= 0），且來自不同 userId | 2 則 | 從候選池各取 1 則，確保 userId 不重複 |
| 候選池可用打卡 \< 2（內容不足） | 1 則（降級） | 取候選池第 1 則；若候選池為空，跳過此 Slot |

* 「候選池」定義：目前使用者尚未看過、屬於「即時公開」主題實踐的打卡，依個人化排序（身份匹配 \+ 社交加權）排序後的佇列。

### **FR-1.3 互動動態卡片（ActivityCard，Slot B）**

* 類型 A（社群活動事件）：單一社群事件，例如：  
* 「Anna 對 Bob 的打卡說了加油」  
* 「Bob 開始了一個新的主題實踐《學 Rust》」  
* 「Carol 完成了她的主題實踐《B1 德語》」  
* 類型 B（追蹤動態彙整）：彙整使用者關注或連結的人的近期動態，例如：「你關注的 3 位學習者昨天各打了卡」。  
* 顯示優先序：已連結（Connection）動態 \> 關注（Follow）動態 \> 社群熱門事件。  
* 若無可用互動動態（追蹤對象無近期活動），以社群熱門事件補位。  
* 每則 ActivityCard 需標示類型標籤（如「學習動態」）以與打卡、實踐卡片視覺區分。

### **FR-1.4 冷啟動與降級策略**

* 新使用者（無關注/連結對象）：Slot B 僅顯示社群熱門事件。  
* 內容池不足時，循環中可跳過某 Slot，但不得連續出現同類型卡片超過 4 則。  
* 分頁載入（Pagination）：每次載入一個完整循環單位（5～6 格），確保節奏不被截斷。

## **2\. 靈感出現打卡紀錄（CheckInShowcaseCard）**

**Purpose**  
讓使用者的單次打卡紀錄出現在社群 Inspire Feed 中，讓即時的學習行動成為可被看見的學習足跡。

**Scope**

* 展示對象：所屬主題實踐隱私狀態為「即時公開（Learning Out Loud）」的打卡記錄。  
* 排除範圍：不公開主題實踐、封存主題實踐下的打卡；草稿狀態打卡。

**Functional Requirements**

### **FR-2.1 卡片結構**

* 封面區（上方，高度 240px）：  
* 有圖片：顯示第一張 image\_url，object-fit: cover。  
* 無圖片：渲染 CheckInCard 筆記本預覽（pointer-events: none，overflow hidden）。  
* 封面底部加 transparent → logo-cyan 漸層遮罩。  
* 社群資訊區（下方白色背景）：  
* 用戶頭像（64x64）+ 心情 emoji badge（疊在頭像右下角）。  
* 打卡日期（text-light-gray）、打卡內容摘要（最多 2 行截斷）。  
* 分隔線。  
* 互動列：ReactionPickerButton（彙總模式）+ 留言計數圖示 \+ 留言數字。  
* 留言預覽（最多 2 則）：留言者頭像（24x24）、名稱（加粗）、留言內容（單行截斷）。  
* 三點選單：他人打卡顯示「檢舉」；本人打卡不在展示卡片顯示（詳情頁才有完整選單）。  
* 點擊卡片本體 → router.push /practices/{practiceId}/check-ins/{checkInId}。  
* 三點選單、互動列需 stopPropagation，不觸發跳轉。

### **FR-2.2 批次 Reaction 資料**

* 透過 useReactionsBatch 一次取得當前 Feed 中所有打卡的 Reaction 資料。  
* 傳入各卡片的 batchReactionData prop；禁止各卡片單獨發 Reaction 查詢（避免 N+1）。

## **3\. 互動動態（瀏覽活動 Browse Activity）**

**Purpose**  
讓打卡者在打卡詳情頁查看誰對自己的打卡進行了反應互動，形成正向回饋閉環。

**Functional Requirements**

### **FR-3.1 入口（三點選單）**

* 本人打卡：「編輯打卡」、「分享打卡」、「瀏覽活動」。  
* 他人打卡：「檢舉」、「瀏覽活動」。  
* 點擊「瀏覽活動」→ 開啟 BrowseActivityContent Bottom Sheet。

### **FR-3.2 互動動態列表**

* 資料來源：useReactionsList API（targetType: 'checkin', targetId）。  
* 列表項目：用戶頭像（32x32）+ 名稱 \+ 反應 emoji \+ 相對時間。  
* 排序：依 reactedAt 時間倒序。  
* 空狀態：「還沒有人互動，成為第一個給予回應的人吧！」  
* 隱私規則：僅顯示公開使用者及已連結者（Connection）的互動紀錄。

## **4\. 打卡紀錄可互動**

**Purpose**  
讓打卡詳情頁支援完整的快速回應（Reactions）與留言（Comments）互動流程。

**Functional Requirements**

### **FR-4.1 快速回應（Reactions）**

| 口語標籤 | 英文 | 留言框引導 Placeholder | Emoji |
| :---- | :---- | :---- | :---- |
| 加油 | Support | 「說點什麼鼓勵他吧！」 | 🙌 |
| 啟發 | Insightful | 「你從這篇得到了什麼靈感？」 | 💡 |
| 共嗚 | Relate | 「你也有同樣的感受嗎？」 | 🤝 |
| 好奇 | Curious | 「你想進一步了解什麼？」 | 🔍 |

* 觸發流程：點擊反應 → 計數即時更新 → 留言框自動聚焦 → Placeholder 更換為對應引導文字。  
* 每位用戶每則打卡只能選一種反應；再次點擊同一反應 → 取消。  
* 彙總顯示：「🙌 Anna 與其他 4 人加油了」；多種反應分別顯示。  
* API：upsertReaction / removeReaction（targetType: 'checkin', targetId）。

### **FR-4.2 留言系統（Comments）**

* 留言層級：最多二層（留言 \+ 回覆）。  
* @ 標記：輸入 @ 時自動帶出留言區用戶清單。  
* 本人留言操作：編輯、刪除。  
* 他人留言操作：回覆、@ 標記。  
* API：useComments / createComment / updateComment / deleteComment（targetType: 'checkin', targetId）。

### **FR-4.3 底部互動列（bottomActions prop）**

* CheckInCard 組件透過 bottomActions prop 注入互動列，保持卡片本體與互動邏輯解耦。  
* 互動列：ReactionPickerButton（展開模式）+ 留言圖示 \+ 留言計數。  
* 互動列需 stopPropagation，不觸發卡片跳轉。

## **Test Points**

**Feed 組成演算法**

* \[ \] 驗證 Feed 每 5～6 格的卡片類型順序符合 A→B→C→C→C 循環。  
* \[ \] 驗證熱門打卡（reactions ≥ 1 或 comments ≥ 1）Slot A 只顯示 1 則。  
* \[ \] 驗證冷啟動打卡 Slot A 顯示 2 則，且兩則來自不同 userId。  
* \[ \] 驗證打卡候選池 \< 2 時，Slot A 降級為 1 則。  
* \[ \] 驗證無關注/連結對象的新使用者，Slot B 以社群熱門事件補位。  
* \[ \] 驗證分頁載入時，每次載入完整循環單位，節奏不中斷。

**CheckInShowcaseCard**

* \[ \] 驗證「即時公開」打卡出現在 Feed；「不公開」打卡不出現。  
* \[ \] 驗證有圖片顯示封面；無圖片顯示筆記本預覽。  
* \[ \] 驗證 batchReactionsBatch：整頁 Feed 只發出 1 次 batch 請求。  
* \[ \] 驗證點擊卡片跳轉詳情頁；三點選單及互動列點擊不觸發跳轉。

**瀏覽活動**

* \[ \] 驗證本人/他人打卡選單選項正確。  
* \[ \] 驗證反應列表依 reactedAt 倒序排列；空狀態文案正確顯示。  
* \[ \] 驗證非公開用戶的反應不出現在列表中。

**打卡可互動**

* \[ \] 驗證各反應對應 Placeholder 正確，切換時無殘留。  
* \[ \] 驗證只送反應（未留言）頁面重整後計數正確。  
* \[ \] 驗證二層留言限制；@ 標記自動帶出用戶清單。  
* \[ \] 壓力測試：快速連續點擊多種反應，最終以最後一次為準。