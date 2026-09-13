# Benchmark gate 實作追蹤

本輪沿用使用者「繼續」授權落地工程 gate，保留 shared dirty tree；不 commit／push／部署。研究文的全空白測試盤點已過時，完成狀態以本次實查為準。

## 本輪範圍

- [x] REVIEW.md：嚴重度、證據及架構／資料契約規則。
- [x] spec auditor 輸入同版 decisions／design 與驗收；增加可執行版本化 pack builder 和回歸測試。
- [x] test integrity diff scanner、版本綁定 review receipt、回歸測試及根 repo CI；Claude Write／Edit hook 已註冊，尚未實際客戶端觸發驗證。
- [x] skill behavioral eval fixtures／scorer／adapter 介面及離線 scorer CI。
- [x] Phase 2 schema drift／OpenAPI signal 指令及能力限制。
- [x] server 隔離 worktree HTTP wire contract／privacy pilot：兩端點，5 tests，typecheck／owned lint／OpenAPI generation 通過。
- [x] 本輪整合測試與 benchmark 狀態回填；遠端 CI／實際客戶端驗證仍未完成。

## 證據界線與後續

- Test integrity 是 heuristic，不能驗證所有語意弱化；receipt 不驗證真人身分，CI 尚未發布或設定 required check。
- Evals CI 驗 scorer，不跑模型；真實 Claude／Codex trace adapter 與模型 pass-rate baseline 未完成。
- server 已存在部分 negative／invariant tests；本輪補 response schema pilot，不宣稱覆蓋所有 API。
- 根 repo gate 不等同所有 sibling CI／hooks；監控閉環、PR 自動修正、各 repo 測試擴充尚未完成。DDD 僅在產品複雜度有需要時評估，不當本輪預設重構。

## 本輪驗證（本機）

- `python3 -m unittest discover -s scripts/__tests__ -p 'test_*.py'`：20 passed（audit pack 4、test integrity 9、hook 7）。
- `python3 scripts/__tests__/skill-evals-test.py`：9 passed；僅評分器，不是模型測試。
- `bash .github/scripts/test-code-review-contract.sh` 通過；4 份異動／新增 workflows 的 YAML 及內嵌 shell 語法通過。
- 修改的 dev-task／code-review skill 格式、diff whitespace 檢查通過；新 root 測試無 integrity scanner finding。
- Server pilot worktree：[任務證據](2026-09-13-server-contract-validation.md)。原來源 checkout 的 OpenAPI dirty 修改保留。
- 隔離 server `STORAGE_SCHEMA_PATH=<source-storage>/schema pnpm run schema:drift` 通過，檢查 136 SQL tables／122 Prisma models；只證明此工具支援的存在性範圍。
- REVIEW.md 已接本機 review input 與 CI，CI 只讀 base revision policy；首次尚未合併到 base 時明示不可用，不宣稱已驗證政策符合。

所有 CI／hook 均為本機新增或修改，未 push、未設定遠端 required check，沒有部署證據。

獨立整合 review 發現 CI review prompt 舊有「不確定不回報」與新規則衝突；已改為保留未驗證／限制並明確對應 P0–P3 與既有輸出嚴重度。workflow contract regression 重跑通過。
