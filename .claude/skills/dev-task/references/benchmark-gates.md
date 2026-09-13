# 開發中的契約與測試 gate

依本 phase 的變更選適用檢查，從目標隔離 worktree 執行並保存命令、base／head、結果與限制；先確認腳本存在與介面。repo 無對應能力就記缺口，不假稱已通過或要求需求提出者處理。

## 測試完整性

```text
python3 <daodao-root>/scripts/check-test-integrity.py --base <explicit-base>
```

Claude root settings 另註冊 Write／Edit 的 `test-integrity-guard.py`，阻擋新增 skip／focus／todo；需在實際客戶端確認觸發。Shell 寫檔、Codex 與移除 assertion 不由此 hook 保護，仍依 CLI／CI 核對。

CLI 包含 tracked staged／unstaged；新增測試尚未 staged 時需另讀檔，完成已授權提交後再用 `--head HEAD` 核對。新增 skip／focus／todo 阻擋；刪除或替換 assertion／test 要查明原因並交人審核具體 diff。依 [工具說明](../../../../scripts/check-test-integrity.md) 記錄綁定 base 與 test diff digest 的審核依據，不自行製造人工 receipt。此 heuristic 不能抓所有語意弱化，仍需跑測試並檢查內容。

## Schema signal（涉及 server／storage／AI 資料定義時）

在 server worktree，使用實際 storage schema 路徑：

```text
STORAGE_SCHEMA_PATH=<absolute-storage>/schema pnpm run schema:drift
python3 <absolute-storage>/scripts/check_schema_sync.py --ci --verbose --server-dir <absolute-server> --ai-backend-dir <absolute-ai-backend>
```

第一個只查目前腳本支援的表／欄位存在；第二個可核對部分 IN CHECK 值域。兩者不證明一般欄位型別、nullable、default、長度 CHECK 或 migration 正確。新增限制需有實際 DB／service 測試，不能因 signal 通過刪除實作約束。

## OpenAPI signal（涉及 server API 時）

先保存工作樹狀態，僅在任務 worktree 執行：

```text
pnpm run openapi:generate
pnpm run openapi:generate-types
git diff <explicit-base> -- openapi.json openapi.yaml
```

生成器可能記錄 import 失敗後仍 exit 0，必須讀取輸出、確認本次 endpoint/schema 存在且無錯誤、比對實際變更。生成會改檔，保留必要產物，不覆蓋他人修改。OpenAPI 有 diff 只表示變動，不驗契約正確性。

HTTP contract 需測實際序列化 JSON、完整 envelope 與欄位型別；內部 Date schema 不等同 wire schema。權限／私密欄位另對 raw response 做 negative assertions，不依賴 Zod 預設 strip unknown。修正後跑對應 endpoint 與相鄰回歸測試。

## 證據交接

結果加入 task.md 驗證欄；需要的檢查未執行就保留未驗證。spec audit 按 [spec-audit.md](spec-audit.md) 納入決策與約束。根 repo CI 只檢查本 repo，不能宣稱子 repo 或 Claude／Codex 自動 hooks 已同步。
