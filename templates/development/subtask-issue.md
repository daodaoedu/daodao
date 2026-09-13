# <repo>：<子任務名稱>

> 工程交接模板，由 skill／開發補充；提出者只需確認 PRD 中的需求與驗收。下文 AC 包含既有 FR／TP／AC ID，沿用來源編號，多文件同 ID 加文件 ID，不另訂條件。尚未開始的執行欄位依 README 標記。


schemaVersion: 1
templateVersion: 1

OpenSpec: <slug>

Parent: daodaoedu/daodao#<中央號碼>

## 中央契約與範圍

- 中央 Issue：<owner/repo#N + URL>
- 本子 Issue：<owner/repo#N + URL；建立後回填>
- Target Repo：<repo>
- 任務指派：<沿用 GitHub Assignees；未指派不阻擋 Todo>
- 需求／AC snapshot／POC：<URLs、契約版本、spec/POC digests>
- 負責 AC IDs：<直接引用中央 AC，不重訂條件>
- 包含／不包含／允許修改 paths：<內容>
- 相依子 Issue／前後順序：<refs、必要契約與部署順序>

## 驗收與交付

| AC ID | 本 repo 責任 | 必須測試與證據 | 狀態 |
|---|---|---|---|
| AC-01 | <中央 AC 的本 repo 實作範圍> | <真實 API 回讀／reload、POC、回歸測試等> | <狀態> |

| Repo | Base SHA | Head SHA | PR | Backend image／schema version |
|---|---|---|---|---|
| <本 repo 與相依 repos> | <完整 SHA> | <完整 SHA> | <URL> | <值或 N/A 理由> |

- Run ID／acceptance key／patch digest：<值>
- 真實串接：<環境、seed、角色、request/response、同 ID 回讀、reload 證據>
- UI／POC：<尺寸、語系、截圖、並排圖、差異與核准記錄；不適用附理由>
- 翻譯／API／migration／品質檢查：<結果、執行 URLs>
- 獨立 review：<reviewer、受驗 SHA、finding disposition>
- 驗收報告／manifest／Drive 證據：<URLs 與 digests>
- 人工簽核：<pending/approved/rejected、批准者／時間／GitHub record／acceptance key>
- 額度：<Claude/Codex 狀態、觀測時間、耗盡影響與接手方式>
- 阻塞／未完成／下一步：<none 或原因、責任人、成果位置>
- Merge／部署／smoke：<實際階段與證據；本卡完成不代表中央 Done>
- 回報同步：<pending/synced/report-pending、中央／子卡摘要 URL、回讀時間>
