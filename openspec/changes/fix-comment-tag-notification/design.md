## Context

目前留言系統有多個 UI 入口：

| 元件 | 位置 | 有 @mention UI | 傳送 mentionedUserIds |
|------|------|----------------|----------------------|
| CommentSection (check-in/reactions) | Product Web | ✅ MentionInput | ✅ |
| CommentInput (social) | Product Web | ❌ 純 textarea | ❌ |
| CommentSection | Mobile | ❌ 純 TextInput | ❌ |

後端 `comment.service.ts` 已有完整的 mention 通知邏輯：收到 `mentionedUserIds` 後建立 type='mention' 的 P1 notification event。但只有 practice detail web 頁面的 `CommentSection` 會傳送 `mentionedUserIds`，其他入口完全沒有 mention 解析。

## Goals / Non-Goals

**Goals:**
- 讓所有 web 留言入口的 @mention 都能觸發通知
- 統一 mention 解析邏輯，避免各元件重複實作

**Non-Goals:**
- Mobile app 的 @mention 支援（UI 互動模式不同，另案處理）
- 新增通知管道（email / push）
- 重構 DB `mentions` TEXT[] 欄位

## Decisions

### 1. 將 MentionInput 抽為共用元件

**選擇**：把現有 `CommentSection` 中的 MentionInput 邏輯抽取到 `@daodao/features` package（hook 含 API 呼叫，適合放 features 而非純 UI package），讓 `social/comment-input.tsx` 也能使用。

**替代方案**：在 `comment-input.tsx` 重新實作一份 mention 解析 → 違反 DRY，維護成本高。

**理由**：mention 解析（regex `/@[\w]+/g`）、使用者搜尋下拉、mentionedIds Map 管理都是通用邏輯，應集中維護。

### 2. mention 解析策略：前端傳 userId 陣列

**選擇**：維持現有架構 — 前端解析 @mention 後傳送 `mentionedUserIds: number[]` 到後端。

**替代方案**：後端從 content 自行解析 @handle → 需要額外查詢 handle 對應的 userId，且 handle 可能重複或變更。

**理由**：前端已有使用者搜尋 UI，能確保 userId 的正確性；後端只做防護驗證（mentionedUserIds 數量 ≤ content 中的 @ 數量）。

### 3. 修復範圍限定 web，mobile 另案

**選擇**：本次只修 web（product app）的兩個留言入口。

**理由**：mobile 的 @mention 需要 React Native 的特殊 UI 處理（如 suggestion list overlay），複雜度不同，不適合一起做。

## Implementation — 各子專案

### daodao-f2e（前端）

1. **抽取共用 mention hook**：從 `comment-section.tsx` 抽出 `useMentionInput()` hook，包含：
   - mentionedIds Map 管理
   - @mention regex 偵測
   - 使用者搜尋 API 呼叫
   - 提交時過濾有效 mention 的邏輯
2. **改造 `social/comment-input.tsx`**：整合 `useMentionInput()` hook + MentionInput 下拉 UI
3. **驗證 `check-in/reactions/comment-section.tsx`**：確認現有流程 end-to-end 正常運作

### daodao-server（後端）

1. **驗證 `comment.service.ts`**：確認 `mentionedUserIds` 正確觸發 `notificationEventService.createEvent()`
2. **驗證 notification worker**：確認 type='mention' 的 P1 event 被正確處理為 notification

## Risks / Trade-offs

- **[共用元件抽取影響範圍]** → 抽取 MentionInput 時需確保不影響現有 practice detail 的行為，用 regression test 覆蓋
- **[使用者搜尋效能]** → @mention 下拉需要即時搜尋使用者，確認現有 API 有 debounce 和分頁 → 已有實作，風險低
- **[mentionedUserIds 為 optional]** → 舊版前端不傳此欄位時後端不會 crash，向後相容 → 無需 migration

## Open Questions

- `social/comment-input.tsx` 目前使用的場景有哪些 target type？需確認所有使用處都適合加入 @mention UI
