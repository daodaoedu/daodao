const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const net = require('node:net');
const { initWorkspace, getPaths, portsForOffset, readState, readPrivate, writeJson } = require('../paths.cjs');
const { requireFree, inspectProcess, assertOwnedProcess, stopOwned, clockNodeOptions, pollReadiness } = require('../runtime.cjs');
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'verify product tests ')));
test.after(() => fs.rmSync(root, { recursive: true, force: true }));
function checkouts(name) {
  const dirs = Object.fromEntries(['server', 'product', 'infra', 'storage'].map(key => [key, path.join(root, name, key)]));
  const required = { server: ['package.json', 'src/server.ts'], product: ['apps/product/package.json', 'packages/config/package.json'], infra: ['scripts/journeys/bootstrap.py', 'e2e/compose.yml'], storage: ['scripts/acceptance_fixtures/manifest.json', 'schema/.fixture'] };
  for (const [key, files] of Object.entries(required)) for (const file of files) { fs.mkdirSync(path.dirname(path.join(dirs[key], file)), { recursive: true }); fs.writeFileSync(path.join(dirs[key], file), '{}'); }
  return dirs;
}
function initialize(name, extra = []) {
  const dirs = checkouts(name), workspace = path.join(root, name, 'workspace with spaces');
  const args = Object.entries(dirs).flatMap(([key, value]) => [`--${key}`, value]);
  return initWorkspace([...args, ...extra], { DAODAO_VERIFY_WORKSPACE: workspace });
}
test('explicit init preserves all checkout paths, isolates artifacts and writes no secrets', () => {
  const paths = initialize('init', ['--port-offset', '10']);
  const config = JSON.parse(fs.readFileSync(paths.configPath, 'utf8'));
  assert.equal(config.server, paths.server); assert.equal(config.product, paths.product);
  assert.equal(paths.ports.api, 4175); assert.equal(paths.ports.redis, 63175);
  assert.equal(paths.evidence, path.join(paths.workspace, 'evidence'));
  assert.equal(fs.existsSync(paths.privatePath), false); assert.equal(fs.existsSync(paths.statePath), false);
  assert.equal(fs.existsSync(paths.runtime), false);
  assert.deepEqual(Object.keys(config).sort(), ['infra', 'kind', 'portOffset', 'ports', 'product', 'server', 'storage', 'version']);
  const loaded = getPaths({ DAODAO_VERIFY_WORKSPACE: paths.workspace }); assert.equal(loaded.configDigest, paths.configDigest);
  assert.equal(fs.existsSync(paths.runtime), false, 'resolving paths must not start or provision anything');
});
test('runtime help/list and clock help need no workspace and create no artifacts', () => {
  const absent = path.join(root, 'must-not-exist');
  for (const [file, argument] of [['runtime.cjs', '--help'], ['runtime.cjs', 'list'], ['clock.cjs', '--help']]) {
    const output = cp.execFileSync(process.execPath, [path.join(__dirname, '..', file), argument], { encoding: 'utf8', env: { ...process.env, DAODAO_VERIFY_WORKSPACE: absent } });
    assert.match(output, /init|advance-to/); assert.equal(fs.existsSync(absent), false);
  }
});
test('init refuses an unrelated nonempty external directory without chmod or overwriting its files', () => {
  const dirs = checkouts('unrelated'); const workspace = path.join(root, 'unrelated', 'existing directory'); fs.mkdirSync(workspace, { mode: 0o755 });
  const configPath = path.join(workspace, 'config.json'), keepPath = path.join(workspace, 'keep.txt');
  fs.writeFileSync(configPath, '{"purpose":"unrelated application"}\n'); fs.writeFileSync(keepPath, 'do not touch\n');
  const beforeConfig = fs.readFileSync(configPath, 'utf8'), beforeMode = fs.statSync(workspace).mode & 0o777;
  const args = Object.entries(dirs).flatMap(([key, value]) => [`--${key}`, value]);
  assert.throws(() => initWorkspace(args, { DAODAO_VERIFY_WORKSPACE: workspace }), /nonempty unrecognized directory/);
  assert.equal(fs.readFileSync(configPath, 'utf8'), beforeConfig); assert.equal(fs.readFileSync(keepPath, 'utf8'), 'do not touch\n'); assert.equal(fs.statSync(workspace).mode & 0o777, beforeMode);
  assert.equal(fs.existsSync(path.join(workspace, 'runtime')), false);
});
test('missing workspace, relative paths, missing checkout contracts and unknown init options fail before state creation', () => {
  assert.throws(() => getPaths({}), /explicit absolute path/);
  assert.throws(() => getPaths({ DAODAO_VERIFY_WORKSPACE: 'relative' }), /absolute/);
  const dirs = checkouts('bad'); const workspace = path.join(root, 'bad', 'workspace');
  const args = Object.entries(dirs).flatMap(([key, value]) => [`--${key}`, value]);
  assert.throws(() => initWorkspace([...args, '--guess', 'yes'], { DAODAO_VERIFY_WORKSPACE: workspace }), /Usage/);
  fs.unlinkSync(path.join(dirs.server, 'src/server.ts'));
  assert.throws(() => initWorkspace(args, { DAODAO_VERIFY_WORKSPACE: workspace }), /missing src\/server.ts/);
  assert.equal(fs.existsSync(workspace), false);
});
test('port offset validates the complete six-port range including the Redis upper bound', () => {
  assert.equal(portsForOffset(2370).redis, 65535);
  assert.throws(() => portsForOffset(2371), /between1 and65535/);
  assert.throws(() => portsForOffset(-3165), /between1 and65535/);
  for (const value of ['1.2', '', '1x', Infinity]) assert.throws(() => portsForOffset(value), /integer/);
});
test('workspace inside a non-ignored Git checkout is rejected, while an explicitly ignored workspace is allowed', () => {
  const dirs = checkouts('git'); const git = path.join(root, 'git', 'repo'); fs.mkdirSync(git);
  cp.execFileSync('git', ['init', '-q', git]);
  const args = Object.entries(dirs).flatMap(([key, value]) => [`--${key}`, value]);
  const workspace = path.join(git, 'private-runtime');
  assert.throws(() => initWorkspace(args, { DAODAO_VERIFY_WORKSPACE: workspace }), /secrets inside a non-ignored Git/);
  fs.writeFileSync(path.join(git, '.gitignore'), 'private-runtime/\n');
  assert.equal(initWorkspace(args, { DAODAO_VERIFY_WORKSPACE: workspace }).workspace, workspace);
});
test('existing runtime cannot silently be repointed to another configuration', () => {
  const paths = initialize('repoint'); writeJson(paths.statePath, { configDigest: paths.configDigest });
  const args = ['--server', paths.server, '--product', paths.product, '--infra', paths.infra, '--storage', paths.storage, '--port-offset', '1'];
  assert.throws(() => initWorkspace(args, { DAODAO_VERIFY_WORKSPACE: paths.workspace }), /different configuration/);
  writeJson(paths.statePath, { configDigest: 'different' }); assert.throws(() => readState(paths), /does not match/);
});
test('private config rejects group-readable secrets', () => {
  const paths = initialize('private'); writeJson(paths.privatePath, { jwtSecret: 'local-fixture' });
  assert.equal(readPrivate(paths).jwtSecret, 'local-fixture'); fs.chmodSync(paths.privatePath, 0o644);
  assert.throws(() => readPrivate(paths), /0600/);
});
test('runtime state cannot redirect the driver to a remote API or a shared Redis', () => {
  const paths = initialize('state-guard');
  const valid = { configDigest: paths.configDigest, project: 'journey-verify-product-123456abcdef', apiBase: `http://localhost:${paths.ports.api}`, productBase: `http://localhost:${paths.ports.product}`, mailpitBase: `http://localhost:${paths.ports.mailpit}`, privatePath: paths.privatePath, fixturePath: paths.fixturePath, clockPath: paths.clockPath, redis: { host: '127.0.0.1', port: paths.ports.redis, db: 1 } };
  writeJson(paths.statePath, valid); assert.equal(readState(paths).apiBase, valid.apiBase);
  writeJson(paths.statePath, { ...valid, apiBase: 'https://remote.invalid' }); assert.throws(() => readState(paths), /endpoints or paths/);
  writeJson(paths.statePath, { ...valid, redis: { ...valid.redis, port: 6379 } }); assert.throws(() => readState(paths), /endpoints or paths/);
});
test('port guard detects a real listener without replacing or terminating it', async () => {
  const listener = net.createServer(); await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  try { await assert.rejects(requireFree(port), /already owned/); assert.equal(listener.listening, true); }
  finally { await new Promise(resolve => listener.close(resolve)); }
  await requireFree(port);
});
test('readiness budget expires for a hung check using monotonic time, without depending on a shifted wall clock', async () => {
  const originalNow = Date.now; const started = performance.now(); Date.now = () => 1;
  try { await assert.rejects(pollReadiness(() => new Promise(() => {}), 35, 5), /within35ms readiness budget/); }
  finally { Date.now = originalNow; }
  assert.ok(performance.now() - started < 500, 'hung readiness must not turn a35ms budget into an unbounded wait');
});
test('readiness failure reports the last actual doctor reason rather than an iteration count', async () => {
  await assert.rejects(pollReadiness(async () => { throw new Error('API readiness returned503: Redis unavailable'); }, 25, 5), /API readiness returned503: Redis unavailable/);
});
test('clock preload works with spaces, changes only wall clock, preserves explicit dates, and observes later offsets', () => {
  const paths = initialize('clock'); writeJson(paths.clockPath, { offsetMs: 86400000 });
  const helperDir = path.join(root, 'clock helpers with spaces'); fs.mkdirSync(helperDir);
  for (const file of ['clock.cjs', 'paths.cjs']) fs.copyFileSync(path.join(__dirname, '..', file), path.join(helperDir, file));
  const script = `const assert=require('node:assert/strict'),fs=require('node:fs');const before=performance.now();assert.ok(Math.abs(Date.now()-new Date('1970-01-01').getTime()-Number(process.env.REAL_NOW)-86400000)<3000);assert.equal(new Date('2026-01-01').toISOString(),'2026-01-01T00:00:00.000Z');assert.equal(typeof Date(),'string');assert.ok(new Date() instanceof Date);fs.writeFileSync(process.env.CLOCK_FILE,JSON.stringify({offsetMs:2*86400000}));assert.ok(Math.abs(Date.now()-Number(process.env.REAL_NOW)-2*86400000)<3000);setTimeout(()=>{assert.ok(performance.now()-before<2000);console.log('clock-pass')},10);`;
  const result = cp.execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', env: { ...process.env, DAODAO_VERIFY_WORKSPACE: paths.workspace, NODE_OPTIONS: clockNodeOptions(path.join(helperDir, 'clock.cjs')), CLOCK_FILE: paths.clockPath, REAL_NOW: String(Date.now()) } });
  assert.match(result, /clock-pass/);
  const before = fs.readFileSync(paths.clockPath, 'utf8');
  assert.throws(() => cp.execFileSync(process.execPath, [path.join(__dirname, '../clock.cjs'), 'advance-to', new Date(Date.now()).toISOString()], { stdio: 'pipe', env: { ...process.env, DAODAO_VERIFY_WORKSPACE: paths.workspace } }), /Command failed/);
  assert.equal(fs.readFileSync(paths.clockPath, 'utf8'), before, 'rejected backwards jump must not change clock');
});
test('cleanup refuses a real process with mismatched start identity or actual cwd, then stops only the owned group', async () => {
  const cwd = path.join(root, 'owned process'); const elsewhere = path.join(root, 'other process'); fs.mkdirSync(cwd); fs.mkdirSync(elsewhere);
  const child = cp.spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { cwd, detached: true, stdio: 'ignore' }); child.unref();
  try {
    let record;
    for (let n = 0; n < 30; n++) { record = inspectProcess(child.pid); if (record?.cwd === fs.realpathSync(cwd)) break; await new Promise(resolve => setTimeout(resolve, 50)); }
    assert.ok(record); assert.equal(record.pgid, child.pid);
    await assert.rejects(stopOwned({ ...record, startIdentity: 'stale-pid-reuse' }, cwd), /identity\/cwd\/group mismatch/);
    assert.ok(inspectProcess(child.pid), 'rejected cleanup must leave the actual process alive');
    await assert.rejects(stopOwned({ ...record, cwd: fs.realpathSync(elsewhere) }, elsewhere), /identity\/cwd\/group mismatch/);
    assert.ok(inspectProcess(child.pid));
    assert.throws(() => assertOwnedProcess({ ...record, pgid: record.pgid + 1 }, record, cwd), /identity\/cwd\/group mismatch/);
    await stopOwned(record, cwd); assert.equal(inspectProcess(child.pid), null);
  } finally { if (inspectProcess(child.pid)) process.kill(-child.pid, 'SIGKILL'); }
});
