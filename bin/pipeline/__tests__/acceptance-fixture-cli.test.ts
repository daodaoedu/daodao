import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeAcceptanceStateDirectory, runScenarioOperation } from '../acceptance-scenario.js';
import { fixtureCli } from '../acceptance-fixture-cli.js';
const roots: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'fixture-cli-')); roots.push(root);
  const credentials = join(root, 'credentials.json');
  const secret = { adminToken: 'private-admin', applicantToken: 'private-applicant', recipientEmail: 'private@example.com' };
  writeFileSync(credentials, JSON.stringify(secret), { mode: 0o600 });
  const run = join(root, 'run');
  const args = (command = 'prepare') => [command, '--run-dir', run, '--credentials-file', credentials];
  const runner = vi.fn<NonNullable<Parameters<typeof fixtureCli>[1]>>(async (_command, manifest, _credentials, deps) => { await deps.save(manifest); return { manifest, ready: true, findings: ['private-admin'] }; });
  return { root, credentials, secret, run, args, runner };
}
describe('fixture CLI private lifecycle storage', () => {
  it('writes private state and history, accepts flag order, and redacts findings', async () => {
    const f = fixture();
    const result = await fixtureCli(['prepare', '--credentials-file', f.credentials, '--run-dir', f.run], f.runner);
    expect(result).toEqual({ code: 0, message: 'acceptance-fixture: PREPARED (inspect private report)' });
    expect(statSync(f.run).mode & 0o777).toBe(0o700);
    for (const file of ['manifest.json', 'journal.json', 'report.json']) expect(statSync(join(f.run, file)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(join(f.run, 'journal.json'), 'utf8')).length).toBeGreaterThan(1);
    expect(JSON.stringify(result)).not.toMatch(/private-admin|private-applicant|private@example/);
    expect(readFileSync(join(f.run, 'report.json'),'utf8')).not.toContain('private-admin');
    expect((await fixtureCli(f.args('check'), f.runner)).code).toBe(0);
  });
  it('readonly check ignores blank mutation reservation configuration', async () => {
    const f = fixture();
    vi.stubEnv('DAODAO_ACCEPTANCE_STATE_DIR', join(f.root, 'unused-reservations'));
    expect((await fixtureCli(f.args(), f.runner)).code).toBe(0);
    f.runner.mockClear(); vi.stubEnv('DAODAO_ACCEPTANCE_STATE_DIR', '');
    expect(await fixtureCli(f.args('check'), f.runner)).toEqual({ code: 0, message: 'acceptance-fixture: READY (inspect private report)' });
    expect(f.runner).toHaveBeenCalledTimes(1);
    expect(f.runner.mock.calls[0][0]).toBe('check');
    expect(f.runner.mock.calls[0][3].reservationStateDirectory).toBeUndefined();
  });
  it('rejects unknown, repeated, missing flags and endpoint overrides before running', async () => {
    const f = fixture();
    for (const args of [[], [...f.args(), '--origin', 'https://evil.example'], ['prepare','--run-dir',f.run,'--run-dir',f.run], f.args('unknown')]) expect((await fixtureCli(args, f.runner)).code).toBe(2);
    expect(f.runner).not.toHaveBeenCalled();
  });
  it('rejects readable or symlink credentials without exposing their contents', async () => {
    const f = fixture(); chmodSync(f.credentials, 0o644);
    expect((await fixtureCli(f.args(), f.runner)).code).toBe(2);
    chmodSync(f.credentials, 0o600); const alias = join(f.root, 'alias'); symlinkSync(f.credentials, alias);
    const result = await fixtureCli(['prepare','--run-dir',f.run,'--credentials-file',alias],f.runner);
    expect(result.code).toBe(2); expect(f.runner).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('private-admin');
  });
  it('rejects public run directories, symlinks and output hardlinks to credentials', async () => {
    const f = fixture(); mkdirSync(f.run, { mode: 0o755 });
    expect((await fixtureCli(f.args(),f.runner)).code).toBe(2); chmodSync(f.run,0o700);
    linkSync(f.credentials, join(f.run,'manifest.json'));
    expect((await fixtureCli(f.args(),f.runner)).code).toBe(2);
    expect(JSON.parse(readFileSync(f.credentials,'utf8'))).toEqual(f.secret);
    expect(f.runner).not.toHaveBeenCalled();
  });
  it('rejects dangling journal symlinks and preserves the target', async () => {
    const f = fixture(); mkdirSync(f.run,{mode:0o700}); symlinkSync(join(f.root,'absent'),join(f.run,'journal.json'));
    expect((await fixtureCli(f.args(),f.runner)).code).toBe(2); expect(f.runner).not.toHaveBeenCalled();
  });
  it('blocks a competing operation and releases its own lock even after exceptions', async () => {
    const f = fixture(); let competingCode: number | undefined;
    const runner: NonNullable<Parameters<typeof fixtureCli>[1]> = async (_command, manifest) => {
      competingCode = (await fixtureCli(f.args('cleanup'), f.runner)).code;
      throw new Error('private-admin');
    };
    const result = await fixtureCli(f.args(), runner);
    expect(competingCode).toBe(2); expect(f.runner).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('private-admin');
    expect((await fixtureCli(f.args('check'),f.runner)).code).toBe(0);
  });
  it('invalidates a prior READY report before an operation can fail', async () => {
    const f = fixture(); await fixtureCli(f.args(),f.runner);
    expect(JSON.parse(readFileSync(join(f.run,'report.json'),'utf8')).ready).toBe(true);
    const failed: NonNullable<Parameters<typeof fixtureCli>[1]> = async () => {throw new Error('private-admin');};
    expect((await fixtureCli(f.args('check'),failed)).code).toBe(2);
    const report = JSON.parse(readFileSync(join(f.run,'report.json'),'utf8'));
    expect(report.ready).toBe(false);
    expect(report.findings).toEqual(['operation in progress or interrupted']);
    expect(JSON.stringify(report)).not.toContain('private-admin');
  });
  it('reports completed cleanup separately from acceptance readiness', async () => {
    const f = fixture(); await fixtureCli(f.args(),f.runner);
    const runner: NonNullable<Parameters<typeof fixtureCli>[1]> = async (_command, manifest) => ({manifest,ready:false,findings:['Retired']});
    expect(await fixtureCli(f.args('cleanup'),runner)).toEqual({code:0,message:'acceptance-fixture: CLEANUP_COMPLETE (inspect private report)'});
  });
  it('rejects corrupt journal snapshots before invoking a runner', async () => {
    const f = fixture(); mkdirSync(f.run,{mode:0o700});
    writeFileSync(join(f.run,'journal.json'),JSON.stringify([{runId:'forged',origin:'https://evil.example'}]),{mode:0o600});
    expect((await fixtureCli(f.args('check'),f.runner)).code).toBe(2);
    expect(f.runner).not.toHaveBeenCalled();
  });
  it('requires recoverable state and resumes prepare from manifest or journal', async () => {
    const f = fixture(); expect((await fixtureCli(f.args('cleanup'),f.runner)).code).toBe(2);
    expect(f.runner).not.toHaveBeenCalled(); await fixtureCli(f.args(),f.runner);
    expect((await fixtureCli(f.args(),f.runner)).code).toBe(0);
    rmSync(join(f.run,'manifest.json'));
    expect((await fixtureCli(f.args('check'),f.runner)).code).toBe(0);
  });
});


describe('fixture CLI reservation denial', () => {
  it('blocks the actual production runner before network and persists not-ready diagnostics', async () => {
    const f = fixture(), state = join(f.root, 'reservations');
    const contract = { kind: 'acceptance-scenario', version: 1, issue: 'https://github.com/daodaoedu/daodao/issues/463', generation: 'pending-cli', taskOwner: 'fixture-cli-test', actors: [{ kind: 'actor-access', accountId: '99ce484c-d37d-488b-9e8d-080ba703864f', accountEmail: 'pm@example.com', expectedRoles: ['Admin'] }], resources: [{ environment: 'dev', type: 'organization-namespace', id: 'qa463-fixture-lifecycle', usage: 'read' }], prerequisites: [{ description: 'Pending PM data', evidenceRef: 'test/source' }], retention: { retainUntil: 'pm-accepted', reviewAt: '2026-11-08T00:00:00Z' }, cleanup: { instructions: 'Retain data', evidenceRef: 'test/source' }, rebuild: { instructions: 'Use new generation', evidenceRef: 'test/source' } };
    initializeAcceptanceStateDirectory(state);
    expect(runScenarioOperation('acquire', contract, state).status).toBe('RESERVED');
    vi.stubEnv('DAODAO_ACCEPTANCE_STATE_DIR', state);
    const fetcher = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('must not reach network'));
    try {
      const result = await fixtureCli(f.args());
      expect(result).toEqual({ code: 2, message: 'acceptance-fixture: BLOCKED (reservation resource-retained; inspect shared reservation state)' });
      expect(fetcher).not.toHaveBeenCalled();
      const report = JSON.parse(readFileSync(join(f.run, 'report.json'), 'utf8'));
      expect(report.ready).toBe(false); expect(report.findings).toEqual(['reservation blocked: resource-retained']);
      expect(JSON.stringify(result) + JSON.stringify(report)).not.toMatch(/private-admin|private-applicant|private@example/);
    } finally { fetcher.mockRestore(); }
  });
});


describe('private terminal cleanup authorization file', () => {
  const authorization = { issue: 'https://github.com/daodaoedu/daodao/issues/463', generation: 'pending-cli', contractDigest: 'a'.repeat(64), operation: 'cleanup', outcome: 'accepted', outcomeEvidence: 'test/formal-pm-pass' };
  it('passes a validated authorization only to cleanup/rebuild, independent of flag order', async () => {
    const f = fixture(); await fixtureCli(f.args(), f.runner); f.runner.mockClear();
    const file = join(f.root, 'authorization.json'); writeFileSync(file, JSON.stringify(authorization), { mode: 0o600 });
    const result = await fixtureCli(['cleanup', '--cleanup-authorization-file', file, '--credentials-file', f.credentials, '--run-dir', f.run], f.runner);
    expect(result.code).toBe(0);
    expect(f.runner.mock.calls[0][3].cleanupAuthorization).toEqual(authorization);
    for (const command of ['prepare', 'check']) {
      expect((await fixtureCli([...f.args(command), '--cleanup-authorization-file', file], f.runner)).code).toBe(2);
    }
    expect(f.runner).toHaveBeenCalledTimes(1);
  });
  it('rejects public, symlink, oversized or schema-invalid authorization before running', async () => {
    for (const bad of ['public', 'symlink', 'oversized', 'schema']) {
      const f = fixture(), file = join(f.root, 'authorization.json');
      writeFileSync(file, JSON.stringify(bad === 'schema' ? { ...authorization, token: 'private-admin' } : authorization), { mode: 0o600 });
      let input = file;
      if (bad === 'public') chmodSync(file, 0o644);
      if (bad === 'symlink') { input = join(f.root, 'alias'); symlinkSync(file, input); }
      if (bad === 'oversized') writeFileSync(file, 'x'.repeat(65537));
      const result = await fixtureCli([...f.args('cleanup'), '--cleanup-authorization-file', input], f.runner);
      expect(result.code).toBe(2); expect(f.runner).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toMatch(/private-admin|private-applicant|private@example/);
    }
  });
  it('never overwrites an authorization aliased to an output or credentials', async () => {
    for (const alias of ['path', 'hardlink', 'credentials']) {
      const f = fixture(); await fixtureCli(f.args(), f.runner); f.runner.mockClear();
      const file = alias === 'path' ? join(f.run, 'report.json') : join(f.root, 'authorization.json');
      writeFileSync(file, JSON.stringify(authorization), { mode: 0o600 });
      if (alias === 'hardlink') { rmSync(join(f.run, 'report.json')); linkSync(file, join(f.run, 'report.json')); }
      const input = alias === 'credentials' ? f.credentials : file;
      const before = readFileSync(input, 'utf8');
      expect((await fixtureCli([...f.args('cleanup'), '--cleanup-authorization-file', input], f.runner)).code).toBe(2);
      expect(readFileSync(input, 'utf8')).toBe(before); expect(f.runner).not.toHaveBeenCalled();
    }
  });
});
