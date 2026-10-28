<!-- schemaVersion: 1; templateVersion: 1; template: child-issue -->
<!-- 中央子卡：開在 daodaoedu/daodao、掛母卡、上 board。規則見 docs/automation/github-issue-management.md §4。發布前跑 python3 scripts/check-issue-draft.py --template child <草稿>。 -->

# <要做的事，用動詞開頭，例如「讓學習者在挑戰頁看到自己的打卡紀錄」>

Parent: daodaoedu/daodao#<母卡號碼>

## 依賴

<相依的子卡 owner/repo#N 與原因；沒有寫 none>

## 範圍

- 對應母卡 AC：<AC ID，直接引用母卡，不另訂條件>
- 包含：<內容>
- 不包含：<內容>
- 會動到的 repo：<repo 清單；同一張子卡動多個 repo 就開多個 PR>

## 要做

- [ ] <一項改動，寫出 repo 與位置>

## 做完會看到

PM 在 dev 照著做就能驗收。每一框寫地點、操作、看到的結果。

- [ ] 在 <dev 頁面> <操作>，看到 <結果>（<AC ID>）

## 驗證

每一框寫出證據；證據存在才能打勾，只有測試通過不算驗證完成。

- [ ] 測試：<測試檔與新增的案例>，執行 `<指令>`。證據：<執行結果連結或尚未產生>
- [ ] 真實串接：<寫入後 GET／reload 回讀；唯讀寫 seed 對照；不適用寫 n/a 與理由>。證據：<request／response 或尚未產生>
- [ ] UI：<尺寸、語系、截圖；不適用寫 n/a 與理由>。證據：<截圖連結或尚未產生>

## 驗收方式

<PM（預設）／工程（掛 `acceptance:engineering`）＋一句理由：PM 在 dev 看不看得出改前改後的差別>

## 附錄：交付紀錄

由開發補充，開卡時填「尚未開始」。

| Repo | Base SHA | Head SHA | PR | 狀態 |
|---|---|---|---|---|
| <repo> | <完整 SHA> | <完整 SHA> | <URL> | <實際狀態> |

- 獨立 review：<reviewer、受驗 SHA、finding 處理>
- 阻塞與下一步：<none 或原因、責任人>
