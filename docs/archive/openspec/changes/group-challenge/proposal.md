# Proposal: 共同挑戰（v2）

> 2026-08-27 依 issue #138 連結的新版 FRD 全面改寫（docs/product/challenge/共同挑戰 FRD.md）。
> v1 的承諾宣言、彈挑視窗、Lurker Banner、Challenge Pulse、達標勳章等機制已全數移除。

## Why

Dao Dao 需要在 B2C 主題實踐之外提供「共同挑戰」——一種陪伴型集體實踐：由平台管理者集中建立，多位使用者在同一段固定期間內以個人節奏參與，透過互相被看見（witnessing）而非排名比較（comparing）形成連結。目標是讓尚未準備好長期承諾的使用者有輕量入口參與集體節奏，並強化「陪伴」與「見證」的品牌敘事。

## What Changes

- **新增** 共同挑戰建立與管理：管理者於前台建立共同挑戰實踐（僅管理者可見選項），admin 後台以 lighthouse 模式管理（主題 → 期 → 指定模板與開始日 → 發佈）
- **新增** 探索共同挑戰頁（standalone、公開）
- **新增** 參與流程：登入加入 → 自動複製實踐 → 卡片狀態（現在加入／打卡 Disable／打卡 Enable／已完成）；名稱與期間不可編輯；共同挑戰實踐不可被複製
- **新增** 見證機制：打卡全公開、僅參與者可留言；卡片顯示「xx 座島已加入」
- **新增** 六節點信件序列：Welcome、T-48h、Day 1、First Check-in、Weekly Summary（併入週報）、End
- **新增** 靈感卡入口：admin 建立卡組（可 Excel 匯入）、assign 給共同挑戰、每日最多 3 抽、排除已選

## Capabilities

### New Capabilities

- `challenge-authoring`: 管理者建立與管理共同挑戰（前台建立入口 + admin lighthouse 式主題/期/模板/發佈管理）
- `challenge-discovery`: 探索共同挑戰頁與主題實踐卡片的公開呈現
- `challenge-participation`: 加入流程、自動複製、卡片狀態流轉、欄位鎖定與打卡規則
- `challenge-witnessing`: 全公開打卡動態、參與者限定留言 ACL、參與人數顯示
- `challenge-emails`: 六節點信件序列的觸發、冪等與文案模板
- `challenge-inspiration-deck`: 靈感卡卡組管理與每日抽卡入口

### Modified Capabilities

（無——打卡、留言、複製實踐皆沿用既有機制，僅加上挑戰情境的 ACL 與旗標）

## Impact

- **daodao-storage**：`programs` 加 `kind` 欄位（challenge 主題複用 lighthouse programs/cohorts/cohort_templates/cohort_enrollments）；靈感卡新增卡組／卡片／指派／抽卡記錄資料表；email 模板 seed
- **daodao-server**：挑戰公開查詢與加入 API、留言 ACL、六節點 email 排程（BullMQ）、靈感卡抽卡 API、admin 挑戰管理 API
- **daodao-f2e**：探索共同挑戰 standalone 頁、主題實踐卡片挑戰樣式與狀態、抽卡 UI
- **daodao-admin-ui**：挑戰管理頁（lighthouse 模式延伸）、靈感卡卡組管理頁
