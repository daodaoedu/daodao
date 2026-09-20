## ADDED Requirements

### Requirement: CheckInShowcaseCard 批次 Reaction 資料（useReactionsBatch）

靈感頁面 Feed 中所有打卡卡片的 Reaction 資料 SHALL 透過 `useReactionsBatch` 一次批次取得，禁止各卡片單獨發 Reaction 查詢（避免 N+1）。

#### Scenario: 一次批次取得所有打卡 Reaction
- **WHEN** 靈感頁面載入含有 N 張 CheckInShowcaseCard 的 Feed
- **THEN** 系統 SHALL 只發出 1 次 batch 請求取得所有打卡的 Reaction 資料
- **AND** 各卡片透過 `batchReactionData` prop 接收對應資料，不單獨發請求

#### Scenario: 新頁載入時 batch 更新
- **WHEN** 用戶觸發 load more 載入新一頁 Feed
- **THEN** 新頁中打卡的 Reaction 資料 SHALL 追加進 batch，仍為一次請求

---

### Requirement: CheckInShowcaseCard 互動列

CheckInShowcaseCard 底部 SHALL 顯示互動列，包含 ReactionPickerButton（彙總模式）、留言計數圖示與留言數字，以及最多 2 則留言預覽。

#### Scenario: 互動列不觸發卡片跳轉
- **WHEN** 用戶點擊互動列上的 ReactionPickerButton 或留言計數圖示
- **THEN** 事件 SHALL stopPropagation，不觸發卡片本體跳轉

#### Scenario: 點擊卡片本體跳轉詳情頁
- **WHEN** 用戶點擊卡片本體（非互動列、非三點選單）
- **THEN** 系統 SHALL router.push 至 `/practices/{practiceId}/check-ins/{checkInId}`

---

### Requirement: 打卡詳情頁快速回應（Reactions）

打卡詳情頁 SHALL 支援 4 種快速回應，每種對應不同 emoji 與留言框引導文字。

| 口語標籤 | 英文 | Placeholder | Emoji |
|----------|------|-------------|-------|
| 加油 | Support | 「說點什麼鼓勵他吧！」 | 🙌 |
| 啟發 | Insightful | 「你從這篇得到了什麼靈感？」 | 💡 |
| 共嗚 | Relate | 「你也有同樣的感受嗎？」 | 🤝 |
| 好奇 | Curious | 「你想進一步了解什麼？」 | 🔍 |

#### Scenario: 點擊反應後留言框聚焦
- **WHEN** 用戶點擊一種快速回應
- **THEN** 計數 SHALL 即時更新 → 留言框 SHALL 自動聚焦 → Placeholder SHALL 替換為對應引導文字

#### Scenario: 每用戶只能選一種反應
- **WHEN** 用戶已選反應 A 後點擊反應 B
- **THEN** 系統 SHALL 取消 A 並設定 B（upsert 行為）

#### Scenario: 再次點擊同一反應取消
- **WHEN** 用戶點擊與目前相同的反應
- **THEN** 系統 SHALL 取消該反應（removeReaction）

#### Scenario: 反應計數彙總顯示
- **WHEN** 多位用戶對同一打卡有反應
- **THEN** 顯示格式 SHALL 為「🙌 Anna 與其他 4 人加油了」；多種反應分別顯示

#### Scenario: API 使用 targetType: 'checkin'
- **WHEN** 用戶對打卡進行 upsertReaction / removeReaction
- **THEN** API 呼叫的 `targetType` SHALL 為 `'checkin'`，`targetId` 為打卡 ID

---

### Requirement: 打卡詳情頁留言系統（Comments）

打卡詳情頁 SHALL 支援二層留言（留言 + 回覆），支援 @ 標記。

#### Scenario: 留言層級限制
- **WHEN** 用戶嘗試回覆一則已是「回覆」層級的留言
- **THEN** 系統 SHALL 限制為二層，不允許三層以上巢狀

#### Scenario: @ 標記自動帶出用戶清單
- **WHEN** 用戶在留言框輸入 `@`
- **THEN** 系統 SHALL 自動帶出留言區已出現的用戶清單供選擇

#### Scenario: 本人留言可編輯與刪除
- **WHEN** 用戶查看自己的留言
- **THEN** 操作選項 SHALL 包含「編輯」與「刪除」

#### Scenario: 他人留言可回覆與 @ 標記
- **WHEN** 用戶查看他人留言
- **THEN** 操作選項 SHALL 包含「回覆」與「@ 標記」

#### Scenario: API 使用 targetType: 'checkin'
- **WHEN** 用戶對打卡進行 createComment / updateComment / deleteComment
- **THEN** API 呼叫的 `targetType` SHALL 為 `'checkin'`

---

### Requirement: CheckInCard bottomActions prop 模式

CheckInCard 組件 SHALL 透過 `bottomActions` prop 注入互動列，保持卡片本體與互動邏輯解耦。

#### Scenario: bottomActions 解耦
- **WHEN** CheckInCard 被用於不同場景（展示卡片、詳情頁）
- **THEN** 卡片本體 SHALL 不包含硬編碼的互動邏輯，互動列透過 `bottomActions` prop 傳入
