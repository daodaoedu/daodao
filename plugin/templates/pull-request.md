## 問題與變更

<具體使用者問題，以及本 PR 改變的行為。>

schemaVersion: 1
templateVersion: 1

- 中央 Issue：<owner/repo#N + URL>
- 子 Issue：<owner/repo#N + URL；避免自動關閉中央卡>
- 本 PR 負責 AC／不包含範圍：<AC IDs／內容>
- 需求／POC／驗收報告／manifest：<URLs>
- Run ID／acceptance key／spec digest／POC digest：<值>

## 受驗組合與驗證

| Repo | Base SHA | Head SHA | Patch digest | PR／依賴 | Backend image／schema version |
|---|---|---|---|---|---|
| <repo> | <完整 SHA> | <完整 SHA> | <digest> | <URL／順序> | <值或 N/A> |

| AC ID | 結果 | 真實後端 request／回讀／reload | 截圖／POC 對照 | 測試／CI 證據 |
|---|---|---|---|---|
| AC-01 | <狀態> | <URL> | <URL> | <URL> |

- 翻譯／API contract／migration 檢查：<結果與證據；不適用附理由>
- POC 未解差異／核准例外：<none 或差異 ID、批准 record 與版本>
- 獨立 review／finding disposition：<reviewer、目前 SHA、連結、未解 blocker>
- 額度或 auth 限制：<Claude/Codex 狀態、時間、影響；未知明寫 unknown>

## 合併與交付

- 人工驗收：<pending/approved/rejected、批准者、時間、GitHub record、acceptance key>
- 未完成／阻塞／責任人／下一步：<none 或內容>
- 部署順序／向後相容／回復計畫／smoke：<內容>
- 中央及子 Issue 回寫／報告可讀性：<URLs、回讀時間、pending/synced/report-pending>
- 合併：人工；本 PR 合併不代表中央任務 Done，須完成契約中的部署與產品驗收。

新增 commit、rebase 或規格／POC 異動後，更新證據與人工簽核；不要沿用舊圖片而只換 SHA。
