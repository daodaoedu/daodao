#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const cp = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { getPaths, initWorkspace, readJson, writeJson, readState, readPrivate } = require('./paths.cjs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function command(bin, args, options = {}) { return cp.execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000, ...options }); }
function withTimeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after${timeoutMs}ms`)), timeoutMs); })]).finally(() => clearTimeout(timer));
}
async function pollReadiness(check, budgetMs = 90000, intervalMs = 1000) {
  const deadline = performance.now() + budgetMs; let lastError;
  while (performance.now() < deadline) {
    const remaining = Math.max(1, Math.floor(deadline - performance.now()));
    try { return await withTimeout(check(remaining), remaining, 'Doctor readiness budget'); }
    catch (error) { lastError = error; }
    const left = deadline - performance.now(); if (left > 0) await pause(Math.min(intervalMs, left));
  }
  throw new Error(`Runtime not usable within${budgetMs}ms readiness budget: ${lastError?.message || 'no successful doctor result'}`);
}
function inspectProcess(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) throw new Error('Invalid process ID');
  try {
    const row = command('ps', ['-p', String(pid), '-o', 'pgid=', '-o', 'stat=', '-o', 'lstart=']).trim();
    const match = row.match(/^(\d+)\s+(\S+)\s+(.+)$/);
    if (!match || match[2].startsWith('Z')) return null;
    let cwd, startIdentity;
    if (process.platform === 'linux') {
      cwd = fs.realpathSync(`/proc/${pid}/cwd`);
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      startIdentity = `linux:${stat.slice(stat.lastIndexOf(')') + 2).split(/\s+/)[19]}`;
    } else {
      const line = command('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn']).split('\n').find(value => value.startsWith('n'));
      if (!line) throw new Error(`Cannot identify cwd of process${pid}`);
      cwd = fs.realpathSync(line.slice(1)); startIdentity = `ps:${match[3].trim()}`;
    }
    return { pid, pgid: Number(match[1]), cwd, startIdentity };
  } catch (error) {
    if (error.code === 'ENOENT' && error.path) throw new Error(`Required process ownership command unavailable: ${error.path}`);
    if (error.status === 1 || error.code === 'ENOENT' || error.code === 'ESRCH') return null;
    throw error;
  }
}
function groupProcesses(pgid) {
  return command('ps', ['-axo', 'pid=', '-o', 'pgid=']).trim().split('\n').map(line => line.trim().split(/\s+/).map(Number))
    .filter(([, group]) => group === pgid).map(([pid]) => inspectProcess(pid)).filter(Boolean);
}
function assertOwnedProcess(record, actual, expectedCwd) {
  const cwd = fs.realpathSync(expectedCwd);
  if (!actual || record.pid !== actual.pid || record.pgid !== record.pid || record.pgid !== actual.pgid || record.startIdentity !== actual.startIdentity || record.cwd !== cwd || actual.cwd !== cwd) throw new Error('Process identity/cwd/group mismatch; refusing to control an unproven process');
}
async function stopOwned(record, expectedCwd) {
  if (!record) return;
  const actual = inspectProcess(record.pid);
  if (!actual) {
    if (groupProcesses(record.pgid).length) throw new Error('Recorded leader disappeared while group remains; inspect residue before cleanup');
    return;
  }
  assertOwnedProcess(record, actual, expectedCwd);
  const before = groupProcesses(record.pgid);
  if (before.some(member => member.cwd !== fs.realpathSync(expectedCwd))) throw new Error('Process group includes an unexpected cwd; refusing group cleanup');
  process.kill(-record.pgid, 'SIGTERM');
  for (let n = 0; n < 50; n++) { if (!groupProcesses(record.pgid).length) return; await pause(100); }
  const remaining = groupProcesses(record.pgid);
  if (remaining.some(member => !before.some(owned => owned.pid === member.pid && owned.startIdentity === member.startIdentity && owned.cwd === member.cwd))) throw new Error('Process identity changed during cleanup; refusing SIGKILL');
  if (remaining.length) process.kill(-record.pgid, 'SIGKILL');
  for (let n = 0; n < 20; n++) { if (!groupProcesses(record.pgid).length) return; await pause(100); }
  throw new Error('Owned process group did not stop; cleanup incomplete');
}
async function requireFree(port) {
  await new Promise((resolve, reject) => { const test = net.createServer(); test.once('error', () => reject(new Error(`Port${port} is already owned; refusing to replace it`))); test.listen(port, '127.0.0.1', () => test.close(resolve)); });
}
function repoVersion(repo, sourcePaths) {
  const head = command('git', ['rev-parse', 'HEAD'], { cwd: repo }).trim();
  const hash = crypto.createHash('sha256').update(command('git', ['diff', 'HEAD', '--', ...sourcePaths], { cwd: repo }));
  const untracked = command('git', ['ls-files', '--others', '--exclude-standard', '--', ...sourcePaths], { cwd: repo }).trim().split('\n').filter(Boolean).sort();
  for (const file of untracked) hash.update(file).update(fs.readFileSync(path.join(repo, file)));
  return { head, sourceDiffSha256: hash.digest('hex') };
}
const serverPaths = ['src', 'prisma/schema.prisma', 'package.json', 'tsconfig.json'];
const productPaths = ['apps/product/src', 'packages', 'apps/product/next.config.ts', 'package.json', 'pnpm-lock.yaml'];
function clockNodeOptions(file) { return `--require=${JSON.stringify(file)}`; }
function createRuntime(paths) {
  const { runtime, evidence, server, product, infra, storage, ports, statePath, privatePath, productPath, clockPath, fixturePath } = paths;
  const composeOverridePath = path.join(__dirname, 'compose.yml');
  const composePath = path.join(runtime, 'compose.resolved.yml');
  const productCwd = path.join(product, 'apps/product');
  function initialize() {
    fs.mkdirSync(runtime, { recursive: true, mode: 0o700 }); fs.chmodSync(runtime, 0o700); fs.mkdirSync(evidence, { recursive: true, mode: 0o700 });
    if (!fs.existsSync(privatePath)) writeJson(privatePath, { dbPassword: crypto.randomBytes(24).toString('hex'), sessionSecret: crypto.randomBytes(32).toString('hex'), jwtSecret: crypto.randomBytes(32).toString('hex'), devLoginSecret: crypto.randomBytes(32).toString('hex'), letterKeys: { v1: crypto.randomBytes(32).toString('base64') } });
    const secret = readPrivate(paths); secret.databaseUrl = `postgresql://journey:${secret.dbPassword}@127.0.0.1:${ports.postgres}/journey_test`; writeJson(privatePath, secret);
    if (!fs.existsSync(statePath)) writeJson(statePath, { configDigest: paths.configDigest, project: `journey-verify-product-${crypto.randomBytes(6).toString('hex')}`, apiBase: `http://localhost:${ports.api}`, productBase: `http://localhost:${ports.product}`, mailpitBase: `http://localhost:${ports.mailpit}`, fixturePath, privatePath, clockPath, redis: { host: '127.0.0.1', port: ports.redis, db: 1 }, initialized: false });
    if (!fs.existsSync(clockPath)) writeJson(clockPath, { offsetMs: 0, updatedAt: new Date().toISOString() });
    return { state: readState(paths), secret };
  }
  function compose(state, secret, args, options = {}) {
    if (!/^journey-verify-product-[a-f0-9]{12}$/.test(state.project)) throw new Error('Refusing unowned compose project');
    return command('docker', ['compose', '-p', state.project, '-f', composePath, ...args], options);
  }
  function resolveCompose(state, secret) {
    if (state.initialized && fs.existsSync(composePath)) return;
    const env = { ...process.env, JOURNEY_DB_PASSWORD: secret.dbPassword, JOURNEY_SESSION_SECRET: secret.sessionSecret, JOURNEY_DEV_LOGIN_SECRET: secret.devLoginSecret, JOURNEY_LETTER_KEYS: JSON.stringify(secret.letterKeys), JOURNEY_SERVER_DIR: server, JOURNEY_F2E_DIR: product, JOURNEY_INFRA_DIR: infra, JOURNEY_API_PORT: String(ports.api), JOURNEY_PRODUCT_PORT: String(ports.product), VERIFY_POSTGRES_PORT: String(ports.postgres), VERIFY_REDIS_PORT: String(ports.redis), VERIFY_SMTP_PORT: String(ports.smtp), VERIFY_MAILPIT_PORT: String(ports.mailpit) };
    const config = command('docker', ['compose', '-p', state.project, '-f', path.join(infra, 'e2e/compose.yml'), '-f', composeOverridePath, 'config'], { env, timeout: 30000 });
    fs.writeFileSync(composePath, config, { mode: 0o600 }); fs.chmodSync(composePath, 0o600);
  }
  function serverEnv(secret, state) {
    return { ...process.env, NODE_ENV: 'development', PORT: String(ports.api), DATABASE_URL: secret.databaseUrl, REDIS_HOST: '127.0.0.1', REDIS_PORT: String(ports.redis), REDIS_DB: '0', REDIS_QUEUE_DB: '1', REDIS_PASSWORD: '', SESSION_SECRET: secret.sessionSecret, JWT_SECRET: secret.jwtSecret, DEV_LOGIN_SECRET: secret.devLoginSecret, FUTURE_LETTER_ACTIVE_KEY_VERSION: 'v1', FUTURE_LETTER_ENCRYPTION_KEYS: JSON.stringify(secret.letterKeys), EMAIL_ADDRESS: 'verify-product@example.invalid', EMAIL_PASSWORD: '', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(ports.smtp), SMTP_SECURE: 'false', FRONTEND_URL: state.productBase, BACKEND_URL: state.apiBase, COOKIE_DOMAIN: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GOOGLE_CALLBACK_URL: '', DAODAO_VERIFY_WORKSPACE: paths.workspace, NODE_OPTIONS: clockNodeOptions(path.join(__dirname, 'clock.cjs')) };
  }
  async function startProcess(cwd, args, log, env) {
    const fd = fs.openSync(log, 'a', 0o600); fs.chmodSync(log, 0o600);
    const child = cp.spawn('pnpm', args, { cwd, env, detached: true, stdio: ['ignore', fd, fd] }); child.unref(); fs.closeSync(fd);
    for (let n = 0; n < 30; n++) { const record = inspectProcess(child.pid); if (record?.cwd === fs.realpathSync(cwd) && record.pgid === record.pid) return record; await pause(50); }
    throw new Error('Cannot establish spawned process identity');
  }
  async function launchProduct(state) {
    if (fs.existsSync(productPath)) { const record = readJson(productPath); const actual = inspectProcess(record.pid); if (actual) { assertOwnedProcess(record, actual, productCwd); return record; } }
    await requireFree(ports.product);
    const env = { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_API_URL: state.apiBase, API_INTERNAL_URL: state.apiBase };
    command('pnpm', ['--filter', '@daodao/config', 'generate:env'], { cwd: product, env, timeout: 60000 });
    const record = await startProcess(productCwd, ['exec', 'next', 'dev', '--hostname', 'localhost', '--port', String(ports.product)], path.join(evidence, 'product.log'), env);
    Object.assign(record, { url: state.productBase, log: path.join(evidence, 'product.log'), version: repoVersion(product, productPaths) }); writeJson(productPath, record); return record;
  }
  async function boundedFetch(url, options) { try { return await fetch(url, { signal: AbortSignal.timeout(5000), ...options }); } catch (error) { throw new Error(`Request failed for ${url}: ${error.cause?.code || error.cause?.message || error.message}`); } }
  const localFetch = (url, options) => boundedFetch(url.replace('://localhost:', '://127.0.0.1:'), options);
  function verifyListener(port, record, cwd) {
    assertOwnedProcess(record, inspectProcess(record.pid), cwd);
    const listeners = command('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']).trim().split(/\s+/).filter(Boolean);
    if (!listeners.some(pid => { const actual = inspectProcess(Number(pid)); return actual?.pgid === record.pgid && actual.cwd === fs.realpathSync(cwd); })) throw new Error(`Port${port} is not owned by recorded process group and checkout`);
  }
  async function doctor() {
    const state = readState(paths), secret = readPrivate(paths);
    if (!state.serverProcess) throw new Error('Server process missing; launch first');
    verifyListener(ports.api, state.serverProcess, server);
    if (JSON.stringify(repoVersion(server, serverPaths)) !== JSON.stringify(state.serverVersion)) throw new Error('Server source/version changed after launch; restart owned server');
    const ready = await localFetch(`${state.apiBase}/api/v1/health/ready`), body = await ready.json();
    if (!ready.ok || !JSON.stringify(body).includes('"status":"ok"')) throw new Error('Live API DB/Redis readiness failed');
    const mailpit = await localFetch(`${state.mailpitBase}/api/v1/messages`); if (!mailpit.ok) throw new Error('Mailpit API unavailable');
    const fixture = readJson(fixturePath).users.find(user => user.key === 'learner');
    if (!fixture) throw new Error('Ordinary learner fixture missing');
    const login = await localFetch(`${state.apiBase}/api/v1/auth/dev-login`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-login-secret': secret.devLoginSecret }, body: JSON.stringify({ email: fixture.email, mode: 'user' }) });
    const token = (await login.json()).data?.token; if (!login.ok || !token) throw new Error('Fixture dev-login failed');
    const me = await localFetch(`${state.apiBase}/api/v1/auth/me`, { headers: { authorization: `Bearer ${token}` } }); if (!me.ok) throw new Error('Authenticated fixture auth/me failed');
    const { Queue } = require(path.join(server, 'node_modules/bullmq'));
    const IORedis = require(path.join(server, 'node_modules/ioredis'));
    const connections = ['future-letter', 'email-send'].map(() => { const connection = new IORedis({ ...state.redis, connectTimeout: 2000, maxRetriesPerRequest: 1, retryStrategy: () => null, lazyConnect: true, enableReadyCheck: false }); connection.on('error', () => {}); return connection; });
    const queues = ['future-letter', 'email-send'].map((name, index) => { const queue = new Queue(name, { connection: connections[index], skipMetasUpdate: true }); queue.on('error', () => {}); return queue; });
    let queueProof;
    try {
      const workerCounts = await withTimeout(Promise.all(queues.map(async queue => ({ name: queue.name, workers: (await queue.getWorkers()).length }))), 5000, 'Queue worker readiness');
      if (workerCounts.some(queue => queue.workers < 1)) throw new Error('Required application worker missing');
      const repeats = await withTimeout(queues[1].getRepeatableJobs(), 5000, 'Queue schedule readiness'); if (!repeats.some(job => job.name === 'retry-scan' && job.pattern === '30 * * * *')) throw new Error('Production retry-scan registration missing');
      queueProof = { workerCounts, retryScanRegistered: true, pattern: '30 * * * *' };
    } finally { await Promise.allSettled(queues.map((queue, index) => withTimeout(queue.close(), 1000, 'Doctor queue cleanup').finally(() => connections[index].disconnect()))); }
    if (!fs.existsSync(productPath)) throw new Error('Product process record missing');
    const productRecord = readJson(productPath); verifyListener(ports.product, productRecord, productCwd);
    const productVersion = repoVersion(product, productPaths); if (JSON.stringify(productVersion) !== JSON.stringify(productRecord.version)) throw new Error('Product source/version changed after launch');
    const envFile = fs.readFileSync(path.join(product, 'packages/config/generated/env.ts'), 'utf8');
    const configuredApi = envFile.match(/"NEXT_PUBLIC_API_URL"\s*:\s*"([^"]+)"/)?.[1];
    if (configuredApi !== state.apiBase) throw new Error('Generated browser API URL does not target owned server');
    let url = state.productBase, productStatus; const seen = new Set();
    for (let hop = 0; hop < 6; hop++) {
      if (seen.has(url)) throw new Error(`Product redirect loop at${url}`); seen.add(url);
      const response = await boundedFetch(url, { redirect: 'manual' }); const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) { url = new URL(location, url).href; continue; }
      if (!response.ok) throw new Error(`Product${url} returned HTTP${response.status}`); productStatus = response.status; break;
    }
    if (!productStatus) throw new Error('Product exceeded six redirects');
    const result = { result: 'READY', serverHead: state.serverVersion.head, serverSourceDiffSha256: state.serverVersion.sourceDiffSha256, productHead: productVersion.head, productSourceDiffSha256: productVersion.sourceDiffSha256, apiBase: state.apiBase, productBase: state.productBase, productStatus, authMeStatus: me.status, queueProof, mailpitBase: state.mailpitBase, project: state.project, checkedAt: new Date().toISOString(), clock: readJson(clockPath) };
    writeJson(path.join(evidence, 'doctor.json'), result); return result;
  }
  async function launch(resetClock = true) {
    const { state, secret } = initialize();
    resolveCompose(state, secret);
    if (!compose(state, secret, ['ps', '-q']).trim()) for (const port of [ports.postgres, ports.redis, ports.smtp, ports.mailpit]) await requireFree(port);
    compose(state, secret, ['up', '-d', '--wait', '--wait-timeout', '90', 'postgres', 'redis', 'mailpit'], { timeout: 180000 });
    if (!state.initialized) {
      const output = command('python3', [path.join(infra, 'scripts/journeys/bootstrap.py'), '--storage', storage, '--compose', composePath, '--project', state.project, '--manifest-output', fixturePath], { env: { ...process.env, JOURNEY_DB_PASSWORD: secret.dbPassword, VERIFY_POSTGRES_PORT: String(ports.postgres), VERIFY_REDIS_PORT: String(ports.redis), VERIFY_SMTP_PORT: String(ports.smtp), VERIFY_MAILPIT_PORT: String(ports.mailpit) }, timeout: 180000 });
      fs.writeFileSync(path.join(evidence, 'bootstrap.log'), output, { mode: 0o600 });
      const fixtures = readJson(fixturePath);
      if (fixtures.users.some(user => !Number.isInteger(user.id) || !/^[a-z][a-z0-9-]*$/.test(user.key))) throw new Error('Unexpected acceptance fixture identity');
      const clauses = fixtures.users.map(user => `WHEN ${user.id} THEN 'verify-${user.key}@example.invalid'`).join(' ');
      const ids = fixtures.users.map(user => user.id).join(',');
      compose(state, secret, ['exec', '-T', 'postgres', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'journey', '-d', 'journey_test', '-c', `UPDATE contacts c SET email=CASE u.id ${clauses} END FROM users u WHERE u.contact_id=c.id AND u.id IN (${ids});`]);
      fixtures.mailbox = 'verify-product@example.invalid'; for (const user of fixtures.users) user.email = `verify-${user.key}@example.invalid`;
      writeJson(fixturePath, fixtures); state.initialized = true; writeJson(statePath, state);
    }
    if (!state.serverProcess || !inspectProcess(state.serverProcess.pid)) {
      await requireFree(ports.api); if (resetClock) command(process.execPath, [path.join(__dirname, 'clock.cjs'), 'reset']);
      state.serverVersion = repoVersion(server, serverPaths); state.serverLog = path.join(evidence, 'server.log');
      state.serverProcess = await startProcess(server, ['exec', 'ts-node', '--transpile-only', '-r', 'tsconfig-paths/register', 'src/server.ts'], state.serverLog, serverEnv(secret, state));
      state.serverPid = state.serverProcess.pid; state.serverPgid = state.serverProcess.pgid; state.serverHead = state.serverVersion.head; writeJson(statePath, state);
    } else assertOwnedProcess(state.serverProcess, inspectProcess(state.serverProcess.pid), server);
    await launchProduct(state);
    return pollReadiness(async remaining => {
      if (!inspectProcess(state.serverProcess.pid)) throw new Error('Owned server exited; inspect private server.log');
      try { return JSON.parse(command(process.execPath, [__filename, 'doctor'], { env: { ...process.env, DAODAO_VERIFY_WORKSPACE: paths.workspace }, timeout: Math.max(1, Math.min(15000, remaining)) })); }
      catch (error) { throw new Error(error.stderr?.trim() || error.message); }
    });
  }
  async function cleanup() {
    const state = readState(paths), secret = readPrivate(paths);
    await stopOwned(state.serverProcess, server); if (fs.existsSync(productPath)) await stopOwned(readJson(productPath), productCwd);
    fs.writeFileSync(path.join(evidence, 'container.log'), compose(state, secret, ['logs', '--no-color']), { mode: 0o600 });
    compose(state, secret, ['down', '--volumes', '--remove-orphans', '--timeout', '10'], { timeout: 60000 });
    state.initialized = false; delete state.serverProcess; delete state.serverPid; delete state.serverPgid; writeJson(statePath, state);
    return { result: 'CLEANED', project: state.project, evidencePreserved: evidence };
  }
  async function restartServer() { const state = readState(paths); await stopOwned(state.serverProcess, server); delete state.serverProcess; delete state.serverPid; delete state.serverPgid; writeJson(statePath, state); return launch(false); }
  return { launch, doctor, cleanup, restartServer, status: () => { const state = readState(paths); return { ...state, serverAlive: Boolean(state.serverProcess && inspectProcess(state.serverProcess.pid)), clock: readJson(clockPath) }; } };
}
async function main() {
  const mode = process.argv[2] || 'status';
  if (['--help', '-h', 'help', 'list'].includes(mode) || process.argv.includes('--help')) { console.log(JSON.stringify({ commands: ['init --server ABS --product ABS --infra ABS --storage ABS [--port-offset N]', 'launch', 'doctor', 'status', 'restart-server', 'clock status|reset|advance-to ISO', 'cleanup'], workspace: 'Set DAODAO_VERIFY_WORKSPACE to an external or ignored absolute directory; help/list never provisions services.' }, null, 2)); return; }
  if (mode === 'init') { const paths = initWorkspace(process.argv.slice(3)); console.log(JSON.stringify({ result: 'CONFIGURED', configPath: paths.configPath, workspace: paths.workspace, ports: paths.ports })); return; }
  const paths = getPaths(); const runtime = createRuntime(paths);
  let result;
  if (mode === 'clock') result = JSON.parse(command(process.execPath, [path.join(__dirname, 'clock.cjs'), ...process.argv.slice(3)]));
  else if (mode === 'restart-server') result = await runtime.restartServer();
  else if (['launch', 'doctor', 'cleanup', 'status'].includes(mode)) result = await runtime[mode]();
  else throw new Error('Usage: runtime.cjs init --server ABS --product ABS --infra ABS --storage ABS [--port-offset N] | launch | doctor | status | restart-server | clock advance-to ISO | cleanup');
  console.log(JSON.stringify(result));
}
if (require.main === module) main().catch(error => {
  console.error(error.message);
  try { const paths = getPaths(); writeJson(path.join(paths.evidence, 'last-runtime-failure.json'), { command: process.argv.slice(2), error: error.message, recordedAt: new Date().toISOString() }); if (error.stderr) fs.writeFileSync(path.join(paths.evidence, 'last-command-error.log'), error.stderr, { mode: 0o600 }); } catch { /* Invalid workspace must not cause writes. */ }
  process.exitCode = 1;
});
module.exports = { inspectProcess, assertOwnedProcess, stopOwned, requireFree, repoVersion, clockNodeOptions, createRuntime, withTimeout, pollReadiness };
