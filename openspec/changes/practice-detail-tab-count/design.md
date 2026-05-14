## Context

主題實踐詳細頁面有三個 tab：留言、打卡紀錄、使用資源。目前 web 版完全沒有數字 badge；mobile 版只有留言 tab 有 `commentCount` badge，其他兩個 tab 沒有。

需要統一兩個平台，讓三個 tab 都顯示數量。

### 現有資料來源

| Tab | Web 資料 | Mobile 資料 |
|-----|---------|------------|
| 留言 | `commentCount` prop (已有) | `commentCount` prop (已有，已顯示) |
| 打卡紀錄 | `checkInsData.length` (已有) | 需傳入 |
| 使用資源 | `practice.resources.length` (已有) | 需傳入 |

所有計數資料前端已可取得，不需新增 API。

## Goals / Non-Goals

**Goals:**
- 三個 tab 標籤都顯示「標籤名(N)」格式的數量
- Web 和 Mobile 行為一致

**Non-Goals:**
- 不新增 API 端點
- 不做數字動畫或即時更新機制
- 不修改 tab 樣式結構（只改 label 文字）

## Decisions

### 1. 數字格式：直接內嵌在 label 文字中

格式為 `留言(2)`，數量為 0 時只顯示文字標籤，不顯示括號和數字。

**理由**: 截圖中的設計就是文字旁加數字，不需要獨立的 badge 元件。與 mobile 版現有的 commentCount 顯示方式一致。

**替代方案**: 獨立 badge 元件 — 過度設計，三個 tab 的顯示需求相同。

### 2. Web 版：擴展 TABS 定義，加入 count 映射

在 tab 渲染時根據 tab id 查找對應的 count 值，組合成 `label(count)` 顯示。

**理由**: 最小變動，不需改動 TABS 常數結構或 props interface。

### 3. Mobile 版：擴展 PracticeTabBar props

新增 `checkinCount` 和 `resourceCount` props，與現有的 `commentCount` 對齊。

**理由**: 保持與現有 `commentCount` prop 相同的模式，一致性最高。

## Risks / Trade-offs

- **[計數可能不精確]** → `checkInsData` 使用 limit=30 的分頁查詢，數量可能不是總數。但 `commentCount` 來自 stats 是精確的。可接受，因為目的是讓使用者知道「有沒有內容」而非精確統計。
- **[0 不顯示]** → 數量為 0 時隱藏數字，避免視覺雜訊。與 mobile 版現有 commentCount 的行為一致（`commentCount > 0` 才顯示）。
