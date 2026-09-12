const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const script = readFileSync(resolve(__dirname, '../test-sync-claude-config-contract.sh'), 'utf8');
const workflow = readFileSync(resolve(__dirname, '../../workflows/sync-claude-config.yml'), 'utf8');

function runContract(skills) {
  const fixture = mkdtempSync(join(tmpdir(), 'daodao-sync-contract-'));
  try {
    mkdirSync(join(fixture, 'scripts'));
    mkdirSync(join(fixture, 'workflows'));
    writeFileSync(join(fixture, 'scripts/check.sh'), script);
    writeFileSync(join(fixture, 'workflows/sync-claude-config.yml'),
      workflow.replace(/for skill in [^;]+; do/, `for skill in ${skills}; do`));
    return spawnSync('bash', [join(fixture, 'scripts/check.sh')], { encoding: 'utf8' });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test('adding shared skills preserves the sync contract', () => {
  const result = runContract('collect-pr-feedback code-review format-commit pre-commit-check');
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('required shared skills remain mandatory', () => {
  for (const skills of ['collect-pr-feedback format-commit', 'code-review pre-commit-check', 'collect-pr-feedback fake-code-review']) {
    assert.notEqual(runContract(skills).status, 0, skills);
  }
});
