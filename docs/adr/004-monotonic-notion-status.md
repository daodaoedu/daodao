# ADR-004：Notion Status 單向推進、永不倒退

日期：2026-07-06

## 狀態

已採用

## 背景

多個 routine（A、B/verify.sh、C）與人類都會寫 Notion Status，且各自以不同 cron 週期執行。若無序寫入，可能發生倒退覆寫：例如人類已手動標 `Done`，下一輪 Routine C 掃到 merged PR 又寫回 `Review`；或 `PR Open` 覆蓋掉更後面的狀態。狀態抖動會破壞看板可信度，也會讓人類的手動修正被機器抹掉。

## 決策

Status 生命週期定義為全序：

```
Ready for Dev → In progress → Spec Review → PR Open → Review → Done
```

所有自動寫入方在寫入前**先讀取現有 Status**；若現有狀態已等於或晚於目標狀態，**跳過寫入**。狀態只能往前推，永不倒退。

## 後果

- 人類手動推進（尤其 `Done`）永遠不會被自動化覆寫回去
- routine 重複執行（重跑、cron 重疊）是冪等的，不會造成狀態抖動
- 代價：若真的需要把卡「退回」（例如 reopen），必須人工在 Notion 手動改；自動化不提供倒退路徑，屬有意限制
