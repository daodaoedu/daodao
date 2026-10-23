// review-knowledge.cjs verify（daodao#169）：A 類 absent-claim 的後置 grep 查證
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { test } = require('node:test');

const SCRIPT = path.resolve(__dirname, '../review-knowledge.cjs');
const {
  absentClaimKind, extractIdentifiers, makeGrep, verifyBody, verifyFindings, verifyNote,
} = require(SCRIPT);

function repo(tree) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rk-verify-test-'));
  for (const [p, content] of Object.entries(tree)) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), content);
  }
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { stdio: 'pipe' });
  git('init', '-q');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'fixture');
  return dir;
}

const TREE = {
  'src/routes/practice.routes.ts': "router.post('/templates/batch',\n  authenticate,\n  validate(batchCreatePracticeTemplateSchema, 'body'),\n  practiceController.batchCreateTemplates as RequestHandler);\nrouter.get('/open', practiceController.listOpenTemplates as RequestHandler);\n",
  'src/controllers/practice.controller.ts': 'export class PracticeController {\n  batchCreateTemplates = asyncHandler(async () => {});\n  listOpenTemplates = asyncHandler(async () => {});\n}\n',
  'src/validators/practice.validators.ts': "export const resourceSchema = z.object({\n  resourceUrl: z.string().url().optional().or(z.literal('')),\n});\n",
  'src/services/format.ts': 'export function formatDuration(days) { return days; }\n',
  'src/__tests__/practice.test.ts': 'requireCohortOwner();\n',
};
const HEADER = '| 嚴重度 | 檔案 | 問題 | 建議 |\n|---|---|---|---|\n';
const body = (...rows) => `## Code Review\n\n### 問題\n\n${HEADER}${rows.join('\n')}\n\n### 總結\n\nx`;

test('absentClaimKind 分存在型與檢查型，其他敘述不查', () => {
  assert.equal(absentClaimKind('找不到 formatDuration 的定義'), 'exist');
  assert.equal(absentClaimKind('formatDuration is not defined'), 'exist');
  assert.equal(absentClaimKind('handler 缺少身份驗證'), 'check');
  assert.equal(absentClaimKind('the route never checks req.user'), 'check');
  assert.equal(absentClaimKind('off-by-one：迴圈多跑一次'), null);
});

test('extractIdentifiers 抽反引號、member path、camelCase、snake_case，略過太短太泛與檔名', () => {
  const ids = extractIdentifiers('`batchCreateTemplates` 沒有檢查 req.query.organizationId 與 user_id，見 practice.controller.ts 的 data');
  assert.deepEqual(ids, ['batchCreateTemplates', 'organizationId', 'user_id']);
  // req.user 到處都有，查到也證明不了什麼；最後一段 user 太泛
  assert.deepEqual(extractIdentifiers('沒有檢查 req.user'), []);
  assert.deepEqual(extractIdentifiers('沒有檢查 cohortService.ensureOwner'), ['cohortService.ensureOwner', 'ensureOwner', 'cohortService']);
});

test('verify：route 掛了 middleware → drop，report 記 verified-absent-claim 與 path:line', () => {
  const dir = repo(TREE);
  const { body: out, report } = verifyBody(
    body('| 🔴 High | `src/controllers/practice.controller.ts:2` | batchCreateTemplates 缺少身份驗證 | 加檢查 |'),
    makeGrep(dir, 'HEAD'));
  assert.equal(report.dropped.length, 1);
  assert.equal(report.dropped[0].rule, 'verified-absent-claim');
  assert.deepEqual(report.dropped[0].evidence, [{ identifier: 'batchCreateTemplates', hits: ['src/routes/practice.routes.ts:4'] }]);
  assert.doesNotMatch(out, /batchCreateTemplates 缺少/);
  // 全部移除也不改寫成「沒有發現問題」
  assert.doesNotMatch(out, /沒有發現明顯問題/);
  assert.match(out, /verified-absent-claim/);
});

test('verify：schema 欄位有 .or(z.literal(\'\')) → drop；存在型斷言認定義處', () => {
  const dir = repo(TREE);
  const { report } = verifyBody(body(
    '| 🟡 Medium | `src/x.ts:1` | `resourceUrl` 空字串缺少驗證，會被拒絕 | 改 schema |',
    '| 🟡 Medium | `src/y.ts:1` | 找不到 formatDuration 的定義 | 補上 |',
  ), makeGrep(dir, 'HEAD'));
  assert.deepEqual(report.dropped.map((d) => d.evidence[0].hits[0]), ['src/validators/practice.validators.ts:2', 'src/services/format.ts:1']);
});

test('verify 反例：真正缺少、只在測試檔、route 沒掛 middleware、非 absent 敘述 → 全部保留', () => {
  const dir = repo(TREE);
  const rows = [
    '| 🔴 High | `src/c.ts:1` | deleteCohort 缺少 `requireCohortOwner` 檢查 | 加上 |',
    '| 🔴 High | `src/c.ts:3` | listOpenTemplates 缺少身份驗證 | 加上 authenticate |',
    '| 🟡 Medium | `src/c.ts:4` | 檢查型斷言但只出現在 controller：沒有檢查 formatDurationX | 加上 |',
    '| 🟡 Medium | `src/c.ts:5` | batchCreateTemplates 的迴圈 off-by-one | 修正 |',
  ];
  const { body: out, report } = verifyBody(body(...rows), makeGrep(dir, 'HEAD'));
  assert.equal(report.dropped.length, 0);
  assert.equal(report.kept, 4);
  for (const row of rows) assert.ok(out.includes(row));
});

test('verify 反例（獨立 review 的重現）：類別不符、只是用到名字、schema SQL 都不算反證', () => {
  const dir = repo({
    'src/routes/cohort.routes.ts': "router.delete('/:id', authenticate, cohortController.deleteCohort);\nrouter.get('/export', authenticate, reportController.exportReports);\n",
    'src/controllers/cohort.controller.ts': 'export class CohortController {\n  deleteCohort = asyncHandler(async () => {});\n  updateTask = asyncHandler(async () => {});\n}\n',
    'schema/tasks.sql': 'CREATE TABLE "tasks" ( "userId" INT );\n',
    'src/validators/task.validators.ts': 'export const taskSchema = z.object({ title: z.string() });\nconst userId = 1;\n',
  });
  const rows = [
    // route 掛了 authenticate，但說缺的是擁有者檢查，且 requireCohortOwner 不存在
    '| 🔴 High | `src/c.ts:2` | deleteCohort 缺少 `requireCohortOwner` 檢查 | 加上 |',
    // 擁有者檢查（權限類），authenticate 不算
    '| 🔴 High | `src/c.ts:2` | deleteCohort 沒有檢查擁有者權限 | 加上 |',
    // userId 只出現在 SQL 與 validator 的非 schema 行
    '| 🟡 Medium | `src/c.ts:3` | updateTask 沒有檢查 userId 是否為擁有者 | 加上 |',
    // 存在型：route 只是用到 exportReports，沒有定義
    '| 🔴 High | `src/r.ts:1` | route 引用的 `exportReports` 未定義 | 補上 |',
  ];
  const { report } = verifyBody(body(...rows), makeGrep(dir, 'HEAD'));
  assert.deepEqual(report.dropped, []);
  assert.equal(report.kept, 4);
});

test('CI structured findings：只標註不刪除，note 與 log 不帶反引號、換行或 workflow command', () => {
  const dir = repo(TREE);
  const status = {
    findings: [
      { path: 'src/controllers/practice.controller.ts', side: 'HEAD', line: 2, severity: 'P1', description: 'batchCreateTemplates 缺少身份驗證', evidence: 'x' },
      { path: 'src/a.ts', side: 'HEAD', line: 1, severity: 'P2', description: '迴圈 off-by-one', evidence: 'x' },
    ],
    carried_findings: [],
  };
  const before = JSON.stringify(status);
  const report = verifyFindings(status, makeGrep(dir, 'HEAD'));
  assert.equal(JSON.stringify(status), before, 'status.json 的 findings 不得被改動');
  assert.equal(report.mode, 'annotate');
  assert.equal(report.annotated.length, 1);
  assert.match(verifyNote(report), /src\/routes\/practice\.routes\.ts:4/);
  const evil = verifyNote({ annotated: [{ file: 'a`b\n::set-output name=x::1', severity: 'P1', evidence: [{ identifier: 'fooBar', hits: ['x.ts:1'] }] }] });
  assert.doesNotMatch(evil, /a`b/);
  assert.doesNotMatch(evil, /::set-output/);

  const statusFile = path.join(dir, 'status.json');
  const note = path.join(dir, 'note.md');
  const reportFile = path.join(dir, 'report.json');
  fs.writeFileSync(statusFile, before);
  const sha = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const run = spawnSync('node', [SCRIPT, 'verify', '--repo-root', dir, '--rev', sha, '--findings', statusFile, '--report', reportFile, '--note', note], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stderr, /^verified-absent-claim src\/controllers\/practice\.controller\.ts:2 batchCreateTemplates -> src\/routes\/practice\.routes\.ts:4$/m);
  assert.match(run.stdout, /verified-absent-claim: 1 筆/);
  assert.equal(JSON.parse(fs.readFileSync(reportFile, 'utf8')).annotated.length, 1);
  assert.match(fs.readFileSync(note, 'utf8'), /verify 標註，未刪除/);
});

test('verify 只看指定 revision 的 tree，不看工作目錄', () => {
  const dir = repo(TREE);
  fs.writeFileSync(path.join(dir, 'src/validators/extra.validators.ts'), 'export const s = z.object({ ghostField: z.string() });\n');
  const { report } = verifyBody(body('| 🟡 Medium | `src/x.ts:1` | ghostField 缺少驗證 | 加 |'), makeGrep(dir, 'HEAD'));
  assert.equal(report.dropped.length, 0);
});
