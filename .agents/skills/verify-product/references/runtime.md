# 隔離產品 runtime

以下命令從 daodao checkout 執行；`SKILL_DIR` 指本 skill 的實際目錄。從 plugin 安裝位置使用時也相同，不能假定使用者的 repo在固定路徑。

## 輸入

先定位四個任務擁有的 checkout：
- server：欲驗證的變更版本；需要其實際依賴與Prisma client。
- product：daodao-f2e 的產品App版本，需要Playwright與前端依賴。
- infra：已有 `scripts/journeys/bootstrap.py` 的版本。
- storage：同版schema與 `scripts/acceptance_fixtures`。

保留來源checkouts及其他任務。缺依賴就在隔離checkout依其package scripts安裝；不把「已安裝」算產品成功。目前支援 macOS／Linux，需 bash、ps、lsof、Docker、pnpm、Node、Python及Playwright Chromium實際可用。

```sh
SKILL_DIR="$PWD/plugin/skills/verify-product"
export DAODAO_VERIFY_WORKSPACE="$PWD/worktrees/product-verification-run"
node "$SKILL_DIR/scripts/runtime.cjs" init \
  --server "$SERVER_CHECKOUT" --product "$PRODUCT_CHECKOUT" \
  --infra "$INFRA_CHECKOUT" --storage "$STORAGE_CHECKOUT"
node "$SKILL_DIR/scripts/runtime.cjs" launch
node "$SKILL_DIR/scripts/runtime.cjs" doctor
node "$SKILL_DIR/scripts/drive.cjs" list
node "$SKILL_DIR/scripts/drive.cjs" run future-letter
node "$SKILL_DIR/scripts/runtime.cjs" cleanup
```

這些變數是呼叫介面，由實際checkout查得，不是待填的產品條件。`--port-offset` 可選另一組本機ports；被占用時拒絕，不接管別人的服務。

## 啟動與邊界

runtime以既有infra bootstrap在新專屬PostgreSQL套storage schema與完整fixture，啟真正server／workers及Next產品App，SMTP指本機Mailpit。Next以 `--hostname localhost` 啟動：此產品的default-locale rewrite在bind127.0.0.1而URL為localhost時曾出現self-redirect，Doctor必須驗真正畫面可達。

workspace內保存config、owned-process狀態及evidence；私密runtime資料保持本機。Date preload僅作用於這個server；未來信driver在原排程讀回後才加速時鐘並明列替換。不可把時間加速結果說成七天真實等待。

`runtime.cjs restart-server` 只重啟自己server，保留資料及clock。命令存在或無pending的重啟成功，不證明pending跨restart修復。此入口尚未驗證未加速的每小時掃描 cadence 或 pending 跨重啟恢復。

## 重跑與清理

單輪driver結束不代表runtime停止。最終及失敗迭代後執行cleanup，再確認result／trace／video／screenshots存在。重跑使用cleanup→launch以恢復空DB與初始clock，避免上輪已排程的信干擾。若helper拒絕ownership或port檢查，保留診斷，不改為按processname清理。

真正server啟動可能產生OpenAPI檔。停止服務後先看diff，僅還原本輪確定生成的檔案，不reset整個checkout。
