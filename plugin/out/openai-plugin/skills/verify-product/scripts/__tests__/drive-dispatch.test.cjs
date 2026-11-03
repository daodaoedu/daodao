const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const cli = path.resolve(__dirname, '../drive.cjs');
function run(args, extra = {}) {
  const env = { ...process.env, ...extra };
  if (!Object.hasOwn(extra, 'DAODAO_VERIFY_WORKSPACE')) delete env.DAODAO_VERIFY_WORKSPACE;
  return spawnSync(process.execPath, [cli, ...args], { env, encoding: 'utf8', timeout: 10000 });
}

test('list exposes only implemented feature drivers and makes no passing-run claim without a workspace', () => {
  const result = run(['list']);
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.deepEqual(body.features.map(feature => feature.id), ['future-letter']);
  assert.equal(body.features[0].surface, 'ui');
  assert.ok(body.features[0].entryPoints.includes('received Email link/open'));
  assert.equal(body.features[0].capability, 'available-driver');
  assert.equal(body.features[0].result, undefined);
  assert.match(body.note, /not a verification result/);
});

test('unknown or path-traversal feature refuses before reading workspace or running a driver', () => {
  for (const feature of ['settings', '../features/future-letter.cjs', '__proto__']) {
    const result = run(['run', feature]);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /Unknown feature/);
    assert.doesNotMatch(result.stderr, /DAODAO_VERIFY_WORKSPACE/);
    assert.equal(result.stdout, '');
  }
});

test('implemented feature with missing workspace configuration fails without creating runtime or evidence', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'daodao-verify-drive-test-'));
  try {
    const result = run(['run', 'future-letter'], { DAODAO_VERIFY_WORKSPACE: workspace });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /config missing.*init/i);
    assert.equal(result.stdout, '');
    assert.deepEqual(fs.readdirSync(workspace), []);
  } finally { fs.rmSync(workspace, { recursive: true, force: true }); }
});

test('implemented feature requires an explicit workspace rather than falling back to developer state', () => {
  const result = run(['run', 'future-letter']);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /DAODAO_VERIFY_WORKSPACE.*explicit absolute path/);
  assert.equal(result.stdout, '');
});
