import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixtureCli } from '../acceptance-fixture-cli.js';
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
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
