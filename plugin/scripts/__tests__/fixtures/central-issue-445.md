# Lighthouse 全功能頁面背景色統一為淺灰色

schemaVersion: 1
templateVersion: 4

## 目標與範圍

- 使用者問題與完成後可觀察結果：Lighthouse 各頁面（Overview、Programs & cohorts、Template library、Organization settings、Archive）目前背景為白色，與主題實踐不一致，視覺上較為刺眼。完成後所有 Lighthouse 頁面的最外層背景色改為 `bg-very-light-gray`（`#F4F6F6`，`--very-light-gray`），與主題實踐一致。
- 本次包含：Lighthouse admin UI 所有頁面 layout 背景色
- 本次不包含：卡片、彈窗、sidebar 本身的背景色（維持現有設計）；主題實踐或其他功能的改動
- 風險：UI — 需確認 sidebar 與 content 區域的邊界在淺灰背景下仍清晰可辨
- 涉及 repo：`daodao-admin-ui`；無 API 或部署順序相依

## 子卡

none

## 驗收契約

| AC ID | Required | Given／When／Then | Repo | 測試資料／角色 | 必須證據 |
|---|---|---|---|---|---|
| AC-01 | yes | Given 教學者登入 Lighthouse；When 進入 Overview、Programs & cohorts、Template library、Organization settings、Archive 任一頁面；Then 頁面最外層背景色為淺灰（視覺上與主題實踐相同，不為白色） | daodao-admin-ui | 教學者帳號（有 Lighthouse 存取權） | 改後各頁面截圖，主題實踐截圖對照 |

- 驗收方式：PM（PM 在 dev 環境直接比對畫面即可判斷）
- Done 條件：`daodao-admin-ui` PR merge 並部署至 dev；PM 截圖驗收通過

## 狀態

- Merge：人工；人工驗收：pending
- Ready 缺項：none（XS 改動，規格與 AC 齊備）
- 阻塞與下一步：none

## 附錄 A：需求來源

- 中央 Issue：daodaoedu/daodao#（建立後回填）
- 任務指派：未指派
- Google 需求文件：無
- 核准需求快照：不適用（UI 一致性小改）
- Acceptance snapshot：本卡驗收契約
- POC：不適用
- Drive 任務資料夾／驗收群組：待確認

## 附錄 B：驗收環境

- 環境／語系／瀏覽器／viewport：dev 環境、桌面版 Chrome、1440px
- POC 容差：不適用
- 真實後端驗證：不適用（純前端樣式）

## 附錄 C：交付紀錄

| Repo | 子 Issue | Base SHA | Head SHA | PR | 受驗後端 image／schema version | 狀態 |
|---|---|---|---|---|---|---|
| daodao-admin-ui | none | 尚未開始 | 尚未開始 | 尚未開始 | N/A | 尚未開始 |

- 驗收報告：pending
- AC 結果：pending
- 回報同步狀態：pending
