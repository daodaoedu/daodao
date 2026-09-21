# <功能名稱>：Run <ID> 驗收報告

> 工程交接模板，由 skill／開發補充；提出者只需確認 PRD 中的需求與驗收。下文 AC 包含既有 FR／TP／AC ID，沿用來源編號，多文件同 ID 加文件 ID，不另訂條件。尚未開始的執行欄位依 README 標記。


schemaVersion: 1
templateVersion: 1

## 結論與索引

- 開發結論：<完成／部分完成／阻塞>；人工驗收：<待處理／通過／退回>
- 中央 Issue／子 Issues／PRs：<完整 refs + URLs>
- 需求文件／POC／Drive 證據資料夾／manifest：<URLs>
- Run ID／acceptance key／契約版本：<值>
- Spec digest／POC digest／manifest digest／報告版本：<SHA-256 與版本>
- Writer／獨立 reviewer／verifier／驗收者：<人員或 provider、身份與角色>
- 額度：<Claude／Codex 狀態、觀測時間、auth 或 quota 錯誤、恢復／接手方式>
- 預算結果：<policy version、各 provider invocations、Workers AI estimated/actual Neurons（未知填 unknown）、repair used/limit、stop reason、next reset>

## 受驗版本與環境

| Repo | Base SHA | Head SHA | Patch digest | Backend image／啟動版本證據 | Schema migration version |
|---|---|---|---|---|---|
| <repo> | <完整 SHA> | <完整 SHA> | <SHA-256> | <digest／證據連結或 N/A> | <版本或 N/A> |

- Harness／profile version／測試資料版本：<值；未啟用明列限制>
- 前端 URL／API base URL／驗證日期：<內容>
- 測試角色／seed／登入取得方式：<不含憑證>
- 瀏覽器版本／語系／viewport／DPR／字型：<內容>
- 重現操作：<依序列出一般驗收者能執行的步驟>

## 逐項驗收

| AC ID | Required | Given／When／Then | 實際結果 | 狀態 | 截圖／API／測試證據及 digest |
|---|---|---|---|---|---|
| AC-01 | yes | <凍結契約內容> | <觀察結果> | <pass/fail/blocked/not-run/n/a> | <本次版本證據> |

## 真實後端串接

| AC | 瀏覽器操作 | Method／route／request ID | 去敏 payload／response | 同 ID 回讀／seed 對照 | Reload 持久化 | 後端版本證據 | 結果 |
|---|---|---|---|---|---|---|---|
| AC-01 | <操作> | <內容> | <artifact> | <GET／受控 DB 結果> | <artifact> | <連結> | <狀態> |

- 錯誤／空資料／validation／未登入／無權限／跨使用者／重複送出：<逐項證據或 N/A 理由>
- Mock／contract 測試：<分別標示，不作真實整合證據>
- 缺少版本證明或無法回讀：<blocked 原因、責任人、下一步；若無填 none>

## UI 與 POC 對照

| AC／畫面狀態／語系／尺寸 | POC 圖 | 實作單圖／前後圖 | 並排圖 | 量測 JSON／coverage | 結果 |
|---|---|---|---|---|---|
| <AC、成功/loading/空/error 等> | <artifact> | <artifact> | <artifact> | <artifact、digest> | <狀態> |

| 差異 ID | AC／屬性 | 基準／實際／預定容差 | 修復或例外處置 | 核准人／時間／GitHub record | Spec／POC digest、SHA 範圍 |
|---|---|---|---|---|---|
| <ID 或 none> | <內容> | <數值與目視觀察> | <內容> | <具權限人員> | <版本> |

## 品質與獨立 code review

| Check | 結果 | 本次 SHA／執行 URL | 證據或 N/A 理由 |
|---|---|---|---|
| quality | <狀態> | <內容> | <lint/typecheck/test/build> |
| i18n-contract | <狀態> | <內容> | <key、placeholder、語意與 UI 驗收> |
| api-contract | <狀態> | <內容> | <產生物 diff、相容性> |
| migration-safety | <狀態> | <內容> | <升級／ledger no-op／舊資料／回復計畫> |
| integration | <狀態> | <內容> | <真實資料流> |
| ui-poc-evidence | <狀態> | <內容> | <截圖／差異> |
| review-verdict | <狀態> | <內容> | <獨立 review record> |
| acceptance-signoff | <狀態> | <內容> | <批准 record> |
| delivery-report | <狀態> | <內容> | <回寫與存取回讀> |

以上是目標 check 名稱；尚未部署的 check 填 `not-run` 並附實際人工檢查，不能宣稱 GitHub required checks 已通過。

| Finding | 嚴重度／AC／path:line | 處置 | 修復 SHA／重驗 | 誤判或接受例外的批准證據 |
|---|---|---|---|---|
| <ID 或 none> | <內容> | <修復／阻塞／批准例外> | <內容> | <rule、SHA、範圍、record> |

## 未完成、發布與人工簽核

- 未完成／阻塞／風險：<none 或 AC、原因、責任人、成果位置與下一步>
- 部署相依／順序／回復計畫／deployment ID／smoke：<內容；未部署明列>
- 報告同步：<pending/synced/report-pending、Issue comment URLs、回讀確認時間>
- 證據存取群組／可讀性確認／保留期限：<內容>
- 人工決定：<pending/approved/rejected>；批准者／時間：<內容>
- 簽核範圍：<AC IDs、acceptance key、完整 SHA map、spec/POC digests>
- GitHub approval record：<可驗證身份的 URL；agent 摘要不是批准>
- 版本異動後重驗／重新簽核：<項目、記錄；未異動填 none>
