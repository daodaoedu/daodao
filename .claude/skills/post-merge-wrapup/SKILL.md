---
name: post-merge-wrapup
description: PR merge 後由 AI 查核合併、驗收與部署證據，更新適用文件並自審，交人審閱未完成事項。
---

# Post-Merge Wrap-up

AI 完成適用的證據查核、文件修訂與自審，人審核結果及尚待決策事項。合併、部署與功能可用是不同事實，不能互相替代。

## 1. 確認合併與範圍

- 使用 `gh pr view` 或實際可用的 GitHub MCP 查 PR state、mergedAt、merge commit、base 與相關 Issue。Claude／Codex 依 callable inventory 使用等效工具，不依賴特定 hooks 或提問工具。
- 使用者說已 merged 可作為查核線索；無法讀遠端時標示「使用者回報，未遠端驗證」，先整理本機候選修訂，不宣稱已驗證合併或進行不可逆收尾。
- 未 merged 就不執行 merge 收尾；可回報目前證據與待完成項目。
- 讀取目前工作樹狀態及此次 PR 的實際 diff，保留他人修改；需要合併後程式時用唯讀 ref 或隔離 checkout，不強制切換／重設共享工作樹。

## 2. AI 核對需求與證據

- 從 PR／Issue 連結找已確認 PRD、既有 FRD、開發計畫與驗收紀錄，保留原 FR／TP／AC ID。
- 核對此次合併涵蓋哪些需求、哪些仍未完成。依目前 commit 分列程式實作、測試、部署、目標環境操作證據；未執行就記未驗證。
- 自動部署 workflow 成功只能支持該工作實際完成的步驟；確認環境與 revision 後才能更新部署狀態。功能可用仍需相應驗收證據。
- 部分完成、驗收失敗或缺少環境證據，不勾選整份需求完成，也不直接把中央 Issue 標 Done。

## 2.5 目標環境冒煙（有寫入路徑的變更必做）

合併與部署都不證明使用者能完成任務：#179 是 server 合併後 dev DB 缺欄位，任何建立場次都 500，由使用者在 dev 撞到。這一步用 PR 自己承諾的核心旅程，在部署後的環境再走一次。

1. **取得矩陣**：從 PR body「## 驗證證據」或 task.md「### 核心旅程矩陣」取全部旅程列（格式見 dev-task 的 [journey-matrix.md](../dev-task/references/journey-matrix.md)）。PR 寫 `核心旅程不適用` 的，記「不適用：<原因>」後跳過。
2. **確認部署 revision**：查該 repo CD run 是否已部署合併後 commit（run URL、環境、revision）；跨 repo 依 storage → server → f2e 順序全部到位才算環境就緒。未到位就停在「已合併，待部署」，不冒煙、不回報可用。
3. **重跑旅程**：在部署後環境（dev 前端 + server-dev，或 PR 標明的目標環境）用瀏覽器或 curl 重跑**全部正常列 + 至少一列錯誤路徑**，攔 response 記狀態碼；登入與工具選擇沿用 dev-task 的 [browser-verify.md](../dev-task/references/browser-verify.md)。測試資料用完清掉或用明顯的測試命名。
4. **回寫**：在對應 issue comment 追加「dev 冒煙」表：

```markdown
## 🔥 dev 冒煙（<環境>，revision <sha>，<日期>）
| ID | 旅程 | 類型 | 實際 | 證據 |
|---|---|---|---|---|
| J-01 | 建立場次 | 正常 | ✅ 201 | <截圖／curl 輸出連結> |
| J-03 | 建立場次 | 錯誤路徑 | ✅ 409 訊息可見 | ... |
```

   全部 ✅ 才能在 docs/product 標「已驗收」。任一 ❌ → 走 `file-bug-issue` 開卡、comment 標「已合併，dev 冒煙未過」，中央 Issue 不標 Done。冒煙工具或環境不可用時記「未冒煙：<原因>」，同樣不算可用。

## 3. 更新適用文件與歸檔

1. 在可存取的 daodao `docs/product` 找對應需求與 roadmap，按證據更新「已合併／已測試／已部署／已驗收」等適用狀態，附日期與 PR／run／驗收來源；沒有部署證據不寫已上線。
2. 若有對應 `openspec/changes/`，確認確切 change 及任務完成狀況。只有現有 archive skill／CLI 或 repo 文件明確支援時，讀取該流程並在授權範圍內歸檔；不可依賴已刪除的 skill，也不憑資料夾存在就歸檔所有 change。
3. 沒有 OpenSpec 就用現有開發文件記錄完成與剩餘事項，不要求另建 OpenSpec。工具缺失或未完成任務保留原檔，報告尚未歸檔的原因。
4. 結構、入口或 build 流程有變更時更新適用 codebase-map；服務依賴／schema 流程有變更時，先查 canonical system-map 與實際同步機制，再同步可確認的副本，不假定固定有六份。
5. 相關 repo／文件不可存取時留下具體路徑、建議修訂與限制；不宣稱跨 repo 已同步。不相關項目標為不適用。

## 4. AI 自審後交人審閱

- 檢查文件間狀態一致性、來源連結、FR／TP 對應、未完成項目及 diff；按變更執行適用文件檢查。
- 報告每項「已完成／未驗證／待決策／不適用」、實際修改文件及證據。人只需審閱修訂與產品／發布決策，不必重新手動搜尋合併證據。
- 報告第一行寫明「已合併／已部署／dev 冒煙通過」三個事實各自的狀態；三者不齊不寫「功能完成」。
- 本機文件修訂不等於 commit、push、部署、關閉 Issue 或修改 Project 狀態。這些動作依既有明確授權及目標 repo 流程進行；不因 PR merged 自動發布或 merge 其他 PR。
- 遠端動作如已授權，執行後讀回確認；部分失敗保留成功項目與待處理項目，避免重複操作。
