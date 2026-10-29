# <功能名稱>

> 工程交接模板，由 skill／開發補充；提出者只需確認 PRD 中的需求與驗收。下文 AC 包含既有 FR／TP／AC ID，沿用來源編號，多文件同 ID 加文件 ID，不另訂條件。尚未開始的執行欄位依 README 標記。


schemaVersion: 1
templateVersion: 4

## 目標與範圍

- 使用者問題與完成後可觀察結果：<內容>
- 本次包含／不包含：<內容>
- 風險：<UI / API / i18n / migration / permissions / infra>
- 涉及 repo、相依與部署順序：<內容>

## 子卡

母卡才填；單張需求卡寫 none。每張子卡對應上面的 AC。

| 子卡 | 對應 AC | 狀態 |
|---|---|---|
| <daodaoedu/daodao#N> | <AC ID> | <實際狀態> |

## 驗收契約

| AC ID | Required | Given／When／Then | Repo | 測試資料／角色 | 必須證據 |
|---|---|---|---|---|---|
| AC-01 | yes | <前提／操作／結果> | <repo> | <seed、一般使用者與權限案例> | <截圖、API 回讀、測試> |

- 「必須證據」欄的 API 回讀、測試、log 由工程在冒煙與 PR 提供，PM 依畫面判定；只能用 API 或測試驗的 AC 在 Given／When／Then 後標「（工程驗收項）」，交 PM 驗收時不列入 PM 步驟。
- 每條 AC 的「必須證據」存在才能標 pass；只有測試通過不算驗證完成。
- 驗收方式：<PM（預設）／工程（掛 `acceptance:engineering`）＋一句理由：PM 在 dev 看不看得出改前改後的差別>
- Done 條件：<逐 repo merge、部署與 smoke；無部署需求須預先定義 N/A>

## 狀態

- Merge：人工；人工驗收：<pending / approved / rejected + GitHub 記錄>
- Ready 缺項：<none 或缺項、責任人>
- 阻塞與下一步：<none 或原因、責任人、成果位置>

## 附錄 A：需求來源

- 中央 Issue：<owner/repo#N + URL；建立後回填>
- 任務指派：<沿用 GitHub Assignees；未指派不阻擋 Todo>
- Google 需求文件：<URL、文件 ID、modified time>
- 核准需求快照：<artifact URL、版本、SHA-256 spec digest、核准人與時間>
- Acceptance snapshot：<直接填本卡驗收契約：路徑／URL、契約版本>
- POC：<來源 URL、ID／版本、快照 URL、SHA-256 POC digest；不適用附理由>
- Drive 任務資料夾／驗收群組：<URL／群組>

## 附錄 B：驗收環境

- 環境／語系／瀏覽器／viewport／DPR：<內容>
- POC 容差與差異決策：<核准基準、決策連結>
- 真實後端驗證：<API base URL、版本證明方式、寫入後 GET／DB 回讀及 reload；唯讀則 seed 對照>

## 附錄 C：交付紀錄

| Repo | 子 Issue | Base SHA | Head SHA | PR | 受驗後端 image／schema version | 狀態 |
|---|---|---|---|---|---|---|
| <repo> | <owner/repo#N + URL> | <完整 SHA> | <完整 SHA> | <URL> | <版本或 N/A 理由> | <實際狀態> |

- 驗收報告／manifest／acceptance key：<URL、digest／key>
- AC 結果：<pass X/Y；fail、blocked、not-run 清單>
- 回報同步狀態：<pending / synced / report-pending + 回讀確認時間>
