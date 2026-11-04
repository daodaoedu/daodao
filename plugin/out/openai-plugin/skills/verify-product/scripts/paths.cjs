const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const WORKSPACE_KIND = 'daodao-verify-product-workspace';

const DEFAULT_PORTS = Object.freeze({ api: 4165, product: 3165, postgres: 56165, redis: 63165, smtp: 10265, mailpit: 8165 });
const REQUIREMENTS = Object.freeze({
  server: ['package.json', 'src/server.ts'], product: ['apps/product/package.json', 'packages/config/package.json'],
  infra: ['scripts/journeys/bootstrap.py', 'e2e/compose.yml'], storage: ['schema', 'scripts/acceptance_fixtures/manifest.json'],
});
function absolute(value, name) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || /[\0\r\n]/.test(value)) throw new Error(`${name} must be an explicit absolute path without control characters`);
  return path.resolve(value);
}
function portsForOffset(value = 0) {
  if (!/^-?\d+$/.test(String(value))) throw new Error('--port-offset must be an integer');
  const offset = Number(value);
  if (!Number.isSafeInteger(offset)) throw new Error('--port-offset must be a safe integer');
  const ports = Object.fromEntries(Object.entries(DEFAULT_PORTS).map(([key, port]) => [key, port + offset]));
  if (Object.values(ports).some(port => !Number.isInteger(port) || port < 1 || port > 65535)) throw new Error('Configured port must be between1 and65535');
  return ports;
}
function workspaceFromEnv(env = process.env) {
  const requested = absolute(env.DAODAO_VERIFY_WORKSPACE, 'DAODAO_VERIFY_WORKSPACE');
  let existing = requested; const tail = [];
  while (!fs.existsSync(existing)) { tail.unshift(path.basename(existing)); existing = path.dirname(existing); }
  return path.join(fs.realpathSync(existing), ...tail);
}
function assertPrivateWorkspace(workspace) {
  let existing = workspace;
  while (!fs.existsSync(existing)) existing = path.dirname(existing);
  try {
    const root = cp.execFileSync('git', ['-C', existing, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    try { cp.execFileSync('git', ['-C', root, 'check-ignore', '-q', '--', workspace + path.sep], { stdio: 'ignore' }); }
    catch { throw new Error('Workspace would contain secrets inside a non-ignored Git checkout; choose an external or explicitly ignored workspace'); }
  } catch (error) {
    if (error.message.includes('Workspace would')) throw error;
  }
}
function validateConfig(config) {
  if (config.kind !== WORKSPACE_KIND || config.version !== 1) throw new Error('Unrecognized verification workspace config kind/version');
  const result = { kind: WORKSPACE_KIND, version: 1 };
  for (const [key, required] of Object.entries(REQUIREMENTS)) {
    result[key] = absolute(config[key], `--${key}`);
    if (!fs.existsSync(result[key])) throw new Error(`Configured ${key} checkout does not exist`);
    result[key] = fs.realpathSync(result[key]);
    for (const relative of required) if (!fs.existsSync(path.join(result[key], relative))) throw new Error(`Configured ${key} is missing ${relative}`);
  }
  result.ports = portsForOffset(config.portOffset ?? 0);
  result.portOffset = Number(config.portOffset ?? 0);
  return result;
}
function parseInitArgs(args) {
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]; const value = args[i + 1];
    if (!['--server', '--product', '--infra', '--storage', '--port-offset'].includes(key) || value === undefined || values[key] !== undefined) throw new Error('Usage: runtime.cjs init --server ABS --product ABS --infra ABS --storage ABS [--port-offset N]');
    values[key] = value;
  }
  return validateConfig({ kind: WORKSPACE_KIND, version: 1, server: values['--server'], product: values['--product'], infra: values['--infra'], storage: values['--storage'], portOffset: values['--port-offset'] ?? 0 });
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode }); fs.chmodSync(file, mode);
}
function configDigest(config) { return crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex'); }
function initWorkspace(args, env = process.env) {
  const workspace = workspaceFromEnv(env); assertPrivateWorkspace(workspace);
  const config = parseInitArgs(args); const configPath = path.join(workspace, 'config.json');
  if (fs.existsSync(workspace)) {
    if (!fs.statSync(workspace).isDirectory()) throw new Error('Workspace path must be a directory');
    if (fs.readdirSync(workspace).length && (!fs.existsSync(configPath) || readJson(configPath).kind !== WORKSPACE_KIND)) throw new Error('Refusing to initialize a nonempty unrecognized directory; choose a fresh dedicated workspace');
  }
  if (fs.existsSync(configPath) && configDigest(validateConfig(readJson(configPath))) !== configDigest(config) && fs.existsSync(path.join(workspace, 'runtime/state.json'))) throw new Error('Existing runtime belongs to a different configuration; use a new workspace');
  fs.mkdirSync(workspace, { recursive: true, mode: 0o700 }); fs.chmodSync(workspace, 0o700);
  writeJson(configPath, config);
  return getPaths(env);
}
function getPaths(env = process.env) {
  const workspace = workspaceFromEnv(env); assertPrivateWorkspace(workspace);
  const configPath = path.join(workspace, 'config.json');
  if (!fs.existsSync(configPath)) throw new Error('Workspace config missing; run runtime.cjs init with explicit checkout paths first');
  const config = validateConfig(readJson(configPath));
  const runtime = path.join(workspace, 'runtime');
  return { ...config, workspace, configPath, configDigest: configDigest(config), runtime,
    evidence: path.join(workspace, 'evidence'), statePath: path.join(runtime, 'state.json'),
    privatePath: path.join(runtime, 'private.json'), productPath: path.join(runtime, 'product.json'),
    clockPath: path.join(runtime, 'clock.json'), fixturePath: path.join(runtime, 'fixtures.json') };
}
function readState(paths = getPaths()) {
  if (!fs.existsSync(paths.statePath)) throw new Error('Runtime state missing; run runtime.cjs launch first');
  const state = readJson(paths.statePath);
  if (state.configDigest !== paths.configDigest) throw new Error('Runtime state does not match workspace config');
  const expected = { apiBase: `http://localhost:${paths.ports.api}`, productBase: `http://localhost:${paths.ports.product}`, mailpitBase: `http://localhost:${paths.ports.mailpit}`, privatePath: paths.privatePath, fixturePath: paths.fixturePath, clockPath: paths.clockPath };
  if (Object.entries(expected).some(([key, value]) => state[key] !== value) || state.redis?.host !== '127.0.0.1' || state.redis?.port !== paths.ports.redis || state.redis?.db !== 1 || !/^journey-verify-product-[a-f0-9]{12}$/.test(state.project)) throw new Error('Runtime endpoints or paths do not match owned workspace config');
  return state;
}
function readPrivate(paths = getPaths()) {
  if ((fs.statSync(paths.privatePath).mode & 0o077) !== 0) throw new Error('Private runtime config must be0600');
  return readJson(paths.privatePath);
}
module.exports = { WORKSPACE_KIND, DEFAULT_PORTS, absolute, portsForOffset, workspaceFromEnv, assertPrivateWorkspace, validateConfig, parseInitArgs, initWorkspace, getPaths, readJson, writeJson, readState, readPrivate };
