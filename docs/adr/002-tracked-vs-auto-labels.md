# ADR-002：`tracked` 與 `auto` label 語意分離

日期：2026-07-06

## 狀態

已採用

## 背景

早期只有 `auto` 一個 label，同時承擔兩種語意：「這個 issue/PR 由自動化處理」（dispatch trigger）與「這個 PR 的進度要回寫 Notion」。混用導致兩個問題：人工開的 PR 無法納入 Notion 追蹤（除非假裝是 auto）；而 spec PR 被 Routine C 誤掃、寫錯狀態。

## 決策

把兩種語意拆成兩個 label：

- `auto`：**dispatch trigger**——Routine B 是否處理此 issue/PR
- `tracked`：**Notion 回寫標記**——Routine C 是否掃此 PR 並回寫 Status（`PR Open` / `Review`）

規則：
- Routine B code PR：`auto` + `tracked`
- 人工 PR：可只加 `tracked`，即納入 Notion 追蹤而不受自動化管理
- Spec PR：`auto` + `spec-pending`，**不加 `tracked`**——spec 狀態由 verify.sh 直接呼叫 `update-status.ts` 寫回 `Spec Review`，不經 Routine C

## 後果

- 人工 PR 可加入進度追蹤，自動化與追蹤解耦
- Routine C 邏輯單純：只看 `tracked`，跳過 `spec-pending`
- 代價：多一個 label 要理解；已寫入 label 一覽表與 skill 規範
