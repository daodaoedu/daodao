# 原始 Required AC 覆蓋與關卡前檢查

最新請驗收留言定義「這次怎麼測」，不能自行減少原 issue 的 Required AC。局部修復可以驗收，但局部 PASS 不得關閉整張 issue。這個 CLI 檢查來源、逐 AC 對應及正式結果的完整性；不能判斷步驟文字是否真正測到需求、證據是否誠實，也不能禁止人工繞過 GitHub 操作。

## 交驗前

先在可信的 daodao clone 執行以下準備，成功後在該最新隔離 checkout 執行後續命令；不要使用可能過期的共享 root。舊 linter 會忽略新參數，exit 0 本身不能證明覆蓋檢查已執行。

```bash
git fetch origin main
COVERAGE_GATE_DIR=$(mktemp -d /tmp/daodao-coverage-gate.XXXXXX)
git worktree add --detach "$COVERAGE_GATE_DIR" origin/main
pnpm -C "$COVERAGE_GATE_DIR" install --ignore-workspace --frozen-lockfile
git -C "$COVERAGE_GATE_DIR" rev-parse HEAD  # 保存 gate revision
cd "$COVERAGE_GATE_DIR"
```

以下產生的是待審的覆蓋草稿，不是通過證據；先寫好帶 AC 編號的 PM 步驟，再逐條核對原始前提與終態。首次註冊不能由既有帳號登入替代，本機／mock 不能冒稱 dev 或真 Google。

```bash
ISSUE_NUMBER=463
HANDOFF_DRAFT=/tmp/463-handoff.md
COVERAGE_FILE=/tmp/463-coverage.json
gh issue view "$ISSUE_NUMBER" --repo daodaoedu/daodao --json url,body > /tmp/463-source.json
node --import tsx --input-type=module - /tmp/463-source.json "$HANDOFF_DRAFT" "$COVERAGE_FILE" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { acceptanceDigest, acceptanceStepLines, requiredAcceptanceIds } from './bin/pipeline/acceptance-coverage.ts';
const [sourceFile, draftFile, outputFile] = process.argv.slice(2);
const source = JSON.parse(readFileSync(sourceFile, 'utf8'));
const draft = readFileSync(draftFile, 'utf8');
const steps = acceptanceStepLines(draft);
const dispositions = requiredAcceptanceIds(source.body).map(ac => {
  const mapped = [...steps].filter(([, line]) => line.match(/\bAC-\d+\b/g)?.includes(ac));
  return mapped.length
    ? { ac, kind: 'pm-steps', steps: mapped.map(([number, line]) => ({ number, sha256: acceptanceDigest(line) })) }
    : { ac, kind: 'pending', reason: '尚未提供本 AC 的 PM 操作與預期；不得用舊工程敘述代替' };
});
writeFileSync(outputFile, JSON.stringify({
  schemaVersion: 1, issue: source.url,
  source_sha256: acceptanceDigest(source.body), draft_sha256: acceptanceDigest(draft),
  scope: dispositions.some(item => item.kind === 'pending') ? 'partial' : 'full', dispositions,
}, null, 2) + '\n');
JS
pnpm -s tsx bin/pipeline/acceptance-lint.ts "$HANDOFF_DRAFT" --issue "$ISSUE_NUMBER" --coverage "$COVERAGE_FILE"
```

- schemaVersion 固定 1；issue 是中央 issue URL；source_sha256 是當下原 issue body 的 SHA-256；draft_sha256 綁定完整留言原文。
- `pm-steps` 每項保存 numbered step 的完整行 SHA-256，且該行必須明列 AC ID。digest 只防止審核後文字漂移，不能代替語意審查。
- `pending` 必須寫原因。`scope: partial` 可完成局部修復的交接格式檢查，但輸出明示 `not closure-ready`；PM 報告要列出原始未完成 AC，不能關 issue。
- `scope: full` 每個 Required AC 都要有有效對應。來源／步驟變動後，先重新審查，再重建 coverage；不可只改 hash 掩蓋範圍漂移。
- schema v1 不自動沿用先前 PM PASS，也不把工程區「已驗」當作 PM PASS。要減少重測，另行設計可信且保留原前提的證據沿用機制；本版保持 pending。
- 僅工程驗收的 AC 必須由**原始契約表**明列：`驗收方式` 欄恰為 `僅工程驗收`，或依 canonical issue 模板在完整 `Given／When／Then` 欄末尾標 `（工程驗收項）`。有明列 `驗收方式` 時以該欄為準；`（工程驗收項：另以 API…）` 這類子分支或 prose 提到 API 不會把混合 AC 整條排除。不可為通過 checker 擅改需求分類。
- 真正僅工程項可用 `{ "ac": "AC-01", "kind": "engineering-only", "commentId": 123 }`；CLI 會讀取同 issue 的實際 GitHub 留言與作者權限，必須是 write/maintain/admin，含 `<!-- daodao:engineering-evidence source_sha256=<原始契約hash> -->` 與該 AC 的 PASS 表格列。沒有既有合法證據就 pending；網址或自填成功不能直接通過。
- 純檢查文案可明確加 `--text-only`；輸出一律為 wording-only／AC coverage unchecked／not closure-ready。不可拿 text-only exit0 當完整交驗或關卡許可。

## 正式 PM 關卡之前

先重新執行上方準備區塊，fetch 最新 origin/main 並保存新 gate revision，再用實際發布的同一份交接原文與已審 coverage，逐 AC 確認本次實測結果；不得沿用忽略新參數的舊 checker。所有 Required PM AC 都要在報告表格有 PASS；未執行仍列 BLOCKED／未完成，不能放進「已知限制」讓整體 PASS。

發布報告、回讀身分與圖片後，在關 issue **之前**：

```bash
PM_REPORT_COMMENT_ID=123456789
pnpm -s tsx bin/pipeline/acceptance-lint.ts "$HANDOFF_DRAFT" \
  --issue "$ISSUE_NUMBER" --coverage "$COVERAGE_FILE" \
  --report-comment "$PM_REPORT_COMMENT_ID"
```

CLI 讀取真實 PM 留言與其 spec，核對作者 `peggy1213-create`、同 issue、`result=PASS`、原始 Required AC 的 PASS 列、最新 handoff／最新 PM report、spec 全文等於 coverage 綁定稿。較新 FAIL／BLOCKED／新交接會讓舊 PASS 失效。讀不到來源或證據就不給 closure-ready。CLI 不發布、不關卡、不移 board。

`full Required AC plan covered` 只表示計畫完整，仍需執行；只有 `full Required AC PM PASS covered; closure-ready` 才通過此結構關卡。仍須依 skill 核對證據真實、PM 身分、正式環境與資料。

沒有 shell／gh 能力時：逐 Required AC 做相同對照，保留來源與報告版本，明列「未跑機械覆蓋檢查」。無法證明完整時保留未完成，不以局部 PASS 關卡。
