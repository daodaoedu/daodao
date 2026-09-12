const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const workflow = readFileSync(resolve(__dirname, '../../workflows/branch-base-check.yml'), 'utf8');
// Exercise the checked-in shell body, not a reimplementation of the policy.
const run = workflow.split('        run: |\n')[1].split('\n').map(line => line.slice(10)).join('\n');
function check(head, base, defaultBranch, changed = '1') {
  return spawnSync('bash', ['-e', '-c', run], {
    encoding: 'utf8',
    env: { ...process.env, HEAD: head, BASE: base, DEFAULT_BRANCH: defaultBranch, CHANGED: changed },
  });
}

for (const [repo, defaultBranch] of Object.entries({
  daodao: 'main', 'daodao-infra': 'main', 'daodao-worker': 'main', 'daodao-mcp': 'main',
  'daodao-f2e': 'dev', 'daodao-server': 'dev', 'daodao-ai-backend': 'dev',
  'daodao-storage': 'dev', 'daodao-admin-ui': 'dev',
})) {
  test(`${repo}: shared config PR targets ${defaultBranch}`, () => {
    const result = check('chore/sync-claude-config-123-1', defaultBranch, defaultBranch);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
}

test('normal feature cannot bypass dev and target production', () => {
  for (const base of ['main', 'production', 'prod']) {
    assert.notEqual(check('feat/change', base, 'dev').status, 0);
  }
});
test('release/hotfix can target production branch names', () => {
  for (const base of ['main', 'production', 'prod']) {
    for (const prefix of ['release', 'hotfix']) {
      const result = check(`${prefix}/change`, base, 'dev');
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
  }
});
test('invalid name and missing default branch fail closed', () => {
  assert.notEqual(check('random-name', 'main', 'main').status, 0);
  assert.notEqual(check('feat/change', 'dev', '').status, 0);
});
test('large PR warns without failing', () => {
  const result = check('feat/change', 'dev', 'dev', '61');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /::warning::/);
});
test('every updated PR runs with the repository default branch', () => {
  assert.match(workflow, /types: \[opened, edited, reopened, synchronize\]/);
  assert.match(workflow, /DEFAULT_BRANCH: \$\{\{ github.event.repository.default_branch \}\}/);
});
