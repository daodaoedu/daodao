const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const REPO = resolve(__dirname, '../../..');
const script = readFileSync(resolve(__dirname, '../test-sync-claude-config-contract.sh'), 'utf8');
const workflow = readFileSync(resolve(REPO, '.github/workflows/sync-claude-config.yml'), 'utf8');
const settings = readFileSync(resolve(REPO, '.claude/settings.json'), 'utf8');

/**
 * 用真實的目錄結構建 fixture，讓 check.sh 的 ../workflows 與 ../../.claude 都解析得到。
 * 2026-09-21 起子專案的 skills 與 hooks 由 daodao plugin 提供，不再逐檔複製，
 * 所以契約守的是「settings.json 有啟用 plugin」＋「workflow 會清掉舊複本」。
 */
function runContract({ workflowText = workflow, settingsText = settings } = {}) {
  const fixture = mkdtempSync(join(tmpdir(), 'daodao-sync-contract-'));
  try {
    mkdirSync(join(fixture, '.github/scripts'), { recursive: true });
    mkdirSync(join(fixture, '.github/workflows'), { recursive: true });
    mkdirSync(join(fixture, '.claude'), { recursive: true });
    writeFileSync(join(fixture, '.github/scripts/check.sh'), script);
    writeFileSync(join(fixture, '.github/workflows/sync-claude-config.yml'), workflowText);
    writeFileSync(join(fixture, '.claude/settings.json'), settingsText);
    return spawnSync('bash', [join(fixture, '.github/scripts/check.sh')], { encoding: 'utf8' });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

function withSettings(mutate) {
  const parsed = JSON.parse(settings);
  mutate(parsed);
  return JSON.stringify(parsed, null, 2);
}

test('目前的 workflow 與 settings 通過契約', () => {
  const result = runContract();
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('settings.json 沒啟用 plugin 就不給過（子專案會少掉全部 skills 與閘門）', () => {
  const result = runContract({ settingsText: withSettings((s) => delete s.enabledPlugins) });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /enabledPlugins|daodao@daodao/);
});

test('settings.json 沒宣告 marketplace 就不給過（解析不到 plugin 來源）', () => {
  const result = runContract({ settingsText: withSettings((s) => delete s.extraKnownMarketplaces) });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /marketplace/);
});

test('enabledPlugins 寫成陣列（舊格式）不給過——Claude Code 會靜默忽略', () => {
  const result = runContract({ settingsText: withSettings((s) => { s.enabledPlugins = ['daodao@daodao']; }) });
  assert.notEqual(result.status, 0);
});

test('extraKnownMarketplaces 寫成陣列（舊格式）不給過', () => {
  const result = runContract({
    settingsText: withSettings((s) => { s.extraKnownMarketplaces = [{ name: 'daodao', url: 'https://github.com/daodaoedu/daodao' }]; }),
  });
  assert.notEqual(result.status, 0);
});

test('啟用了別的 plugin 但不是 daodao 也不給過', () => {
  const result = runContract({ settingsText: withSettings((s) => { s.enabledPlugins = { 'something-else@elsewhere': true }; }) });
  assert.notEqual(result.status, 0);
});

test('workflow 不清舊 hooks 複本就不給過（會與 plugin hooks 雙重觸發）', () => {
  const result = runContract({ workflowText: workflow.replace('rm -f target/.claude/hooks/*.sh', 'true') });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /hooks 複本/);
});

test('workflow 不清舊 skills 複本就不給過（project skills 會蓋掉 plugin skills）', () => {
  const result = runContract({ workflowText: workflow.replace('rm -rf "target/.claude/skills/$skill"', 'true') });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /skills 複本/);
});

test('回頭逐檔複製 hooks 的寫法不得復活', () => {
  const revived = workflow.replace(
    '          mkdir -p target/.claude\n',
    '          mkdir -p target/.claude/hooks\n          cp plugin/hooks/*.sh target/.claude/hooks/\n',
  );
  const result = runContract({ workflowText: revived });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /逐檔複製/);
});

test('合併 settings 後沒 del(.hooks) 不給過（子專案會指向已刪除的腳本）', () => {
  const result = runContract({ workflowText: workflow.replace("| del(.hooks)'", "'") });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /del\(\.hooks\)/);
});

test('不再監聽 plugin/ 變更就不給過（plugin 改了不會同步出去）', () => {
  const result = runContract({ workflowText: workflow.replace("      - 'plugin/**'\n", '') });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /plugin/);
});
