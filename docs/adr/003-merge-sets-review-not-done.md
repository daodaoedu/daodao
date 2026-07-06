# ADR-003：Merge 只推到 Review，Done 由人類收尾

日期：2026-07-06

## 狀態

已採用

## 背景

code PR merged 之後，直覺做法是讓 Routine C 直接把 Notion Status 設為 `Done`。但「PR merged」不等於「需求完成」：merge 可能只是部分實作、可能還沒部署、可能上線後才發現不符需求。若自動標 `Done`，Notion 看板會宣稱完成了實際未驗收的工作，PM 失去最後把關點。

## 決策

- Routine C 掃到 `tracked` PR merged 時，只把 Notion Status 推到 **`Review`**
- `Done` 永遠由**人類**在確認產出符合需求後手動標記
- 自動化的責任邊界在「送到人類面前」，驗收環節不自動化

## 後果

- 每張卡都有一次人工驗收，`Done` 代表真正的完成而非機器推斷
- 人類保有 pipeline 的最終控制權（與 kill switch、spec review 同屬人類把關點）
- 代價：`Review` 欄可能堆積等待驗收的卡，需要 PM 定期清理；此為有意設計，堆積本身就是「驗收落後」的可視訊號
