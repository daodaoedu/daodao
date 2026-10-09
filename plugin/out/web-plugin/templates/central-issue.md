# <功能名稱>

> 工程交接模板，由 skill／開發補充；提出者只需確認 PRD 中的需求與驗收。下文 AC 包含既有 FR／TP／AC ID，沿用來源編號，多文件同 ID 加文件 ID，不另訂條件。尚未開始的執行欄位依 README 標記。


schemaVersion: 1
templateVersion: 1

## 任務索引與責任

- 中央 Issue：<owner/repo#N + URL；建立後回填>
- 任務指派：<沿用 GitHub Assignees；未指派不阻擋 Todo>
- Google 需求文件：<URL、文件 ID、modified time>
- 核准需求快照：<artifact URL、版本、SHA-256 spec digest、核准人與時間>
- Acceptance snapshot：<直接填本卡驗收契約：路徑／URL、契約版本>
- POC：<來源 URL、ID／版本、快照 URL、SHA-256 POC digest；不適用附理由>
- Drive 任務資料夾／驗收群組：<URL／群組>

## 目標與範圍

- 使用者問題與完成後可觀察結果：<內容>
- 本次包含／不包含：<內容>
- 風險：<UI / API / i18n / migration / permissions / infra>
- 涉及 repo、相依與部署順序：<內容>

## 驗收契約

| AC ID | Required | Given／When／Then | Repo | 測試資料／角色 | 必須證據 |
|---|---|---|---|---|---|
| AC-01 | yes | <前提／操作／結果> | <repo> | <seed、一般使用者與權限案例> | <截圖、API 回讀、測試> |

- 環境／語系／瀏覽器／viewport／DPR：<內容>
- POC 容差與差異決策：<核准基準、決策連結>
- 真實後端驗證：<API base URL、版本證明方式、寫入後 GET／DB 回讀及 reload；唯讀則 seed 對照>
- Done 條件：<逐 repo merge、部署與 smoke；無部署需求須預先定義 N/A>

## 執行政策與狀態

- 模式／writer：<auto|local / auto|claude|codex>
- 已授權範圍：<repos、paths、publisher commit/push/Draft PR 權限與授權記錄>
- Merge：人工；人工驗收：<pending / approved / rejected + GitHub 記錄>
- Ready 缺項：<none 或缺項、責任人>
- Run ID／狀態／state version：<尚未開始或實際值>
- Lease owner／fencing token／期限：<未啟用則明列限制；不填假值>
- 額度：<Claude 與 Codex 各自狀態、觀測時間、恢復或人工接手方式>
- 預算政策版本／Workers AI reservation／paid fallback：<版本、預估 Neurons、false 或明確授權記錄>
- 阻塞與下一步：<none 或原因、責任人、成果位置>

## 跨 repo 交付索引

| Repo | 子 Issue | Base SHA | Head SHA | PR | 受驗後端 image／schema version | 狀態 |
|---|---|---|---|---|---|---|
| <repo> | <owner/repo#N + URL> | <完整 SHA> | <完整 SHA> | <URL> | <版本或 N/A 理由> | <實際狀態> |

- 驗收報告／manifest／acceptance key：<URL、digest／key>
- AC 結果：<pass X/Y；fail、blocked、not-run 清單>
- 回報同步狀態：<pending / synced / report-pending + 回讀確認時間>
