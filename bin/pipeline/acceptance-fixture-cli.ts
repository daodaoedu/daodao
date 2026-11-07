#!/usr/bin/env node
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { newFixtureManifest, runFixture, fixtureManifestSchema, type FixtureManifest, type FixtureCredentials } from './acceptance-fixture.js';

type Command = 'prepare' | 'check' | 'rebuild' | 'cleanup';
type Runner = typeof runFixture;
const commands = ['prepare', 'check', 'rebuild', 'cleanup'];
const flags = ['--run-dir', '--credentials-file'];
function privateRegular(path: string): void {
  const stat = lstatSync(path);
  if (!stat.isFile() || (stat.mode & 0o077) || stat.uid !== process.getuid?.()) throw new Error('private-file-required');
}
function safeDirectory(path: string): void {
  const parent = dirname(path);
  if (parent !== path) {
    const stat = lstatSync(parent);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('directory-required');
    // Check every ancestor, including paths reached through a symlinked parent.
    for (let current = parent; dirname(current) !== current; current = dirname(current)) {
      if (lstatSync(current).isSymbolicLink()) throw new Error('directory-required');
    }
  }
  if (!existsSync(path)) mkdirSync(path, { mode: 0o700 });
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) || stat.uid !== process.getuid?.()) throw new Error('private-directory-required');
}
/** CLI entrypoint is injectable for offline tests; no endpoint overrides exist in user input. */
export async function fixtureCli(args: string[], runner: Runner = runFixture): Promise<{ code: number; message: string }> {
  let lock: number | undefined;
  let lockPath: string | undefined;
  try {
    if (args.length !== 5 || !commands.includes(args[0]) || !flags.includes(args[1]) || !flags.includes(args[3]) || args[1] === args[3]) throw new Error('arguments');
    const value = (flag: string) => args[args.indexOf(flag) + 1];
    const directory = resolve(value('--run-dir'));
    const credentialPath = resolve(value('--credentials-file'));
    privateRegular(credentialPath);
    const credentialFd = openSync(credentialPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    let credentials: FixtureCredentials;
    let credentialStat;
    try {
      credentialStat = fstatSync(credentialFd);
      if (!credentialStat.isFile() || (credentialStat.mode & 0o077) || credentialStat.uid !== process.getuid?.() || credentialStat.size > 65536) throw new Error('credentials');
      const raw: unknown = JSON.parse(readFileSync(credentialFd, 'utf8'));
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('credentials');
      const record = raw as Record<string, unknown>;
      if (Object.keys(record).sort().join(',') !== 'adminToken,applicantToken,recipientEmail' || ['adminToken','applicantToken','recipientEmail'].some(key => typeof record[key] !== 'string' || !(record[key] as string).trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.recipientEmail as string)) throw new Error('credentials');
      credentials = { adminToken: record.adminToken as string, applicantToken: record.applicantToken as string, recipientEmail: record.recipientEmail as string };
    } finally { closeSync(credentialFd); }
    safeDirectory(directory);
    const manifestPath = join(directory, 'manifest.json');
    const journalPath = join(directory, 'journal.json');
    const reportPath = join(directory, 'report.json');
    lockPath = join(directory, '.lock');
    for (const path of [manifestPath, journalPath, reportPath, lockPath]) {
      if (path === credentialPath) throw new Error('input-overwrite');
      if (existsSync(path) || (() => { try { lstatSync(path); return true; } catch { return false; } })()) {
        privateRegular(path);
        const stat = lstatSync(path);
        if (stat.dev === credentialStat.dev && stat.ino === credentialStat.ino) throw new Error('input-overwrite');
      }
    }
    // A stale lock requires manual PID review; never remove another operation's lock.
    lock = openSync(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    writeFileSync(lock, JSON.stringify({ pid: process.pid }));
    fsyncSync(lock);
    const atomic = (path: string, data: unknown) => {
      const temporary = join(directory, `.write-${randomUUID()}`);
      const fd = openSync(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
      try { writeFileSync(fd, `${JSON.stringify(data, null, 2)}\n`); fsyncSync(fd); } finally { closeSync(fd); }
      try { renameSync(temporary, path); } finally { if (existsSync(temporary)) unlinkSync(temporary); }
      const directoryFd = openSync(directory, constants.O_RDONLY);
      try { fsyncSync(directoryFd); } finally { closeSync(directoryFd); }
    };
    const command = args[0] as Command;
    // Invalidate earlier readiness before any state parsing or remote operation can fail.
    atomic(reportPath, { command, ready: false, checkedAt: new Date().toISOString(), findings: ['operation in progress or interrupted'] });
    if (command !== 'prepare' && !existsSync(manifestPath) && !existsSync(journalPath)) throw new Error('manifest-required');
    for (const path of [manifestPath, journalPath]) {
      if (existsSync(path) && lstatSync(path).size > 32 * 1024 * 1024) throw new Error('state-too-large');
    }
    // Journal is written first, so a crash between the two writes can recover its latest snapshot.
    const history: FixtureManifest[] = existsSync(journalPath) ? JSON.parse(readFileSync(journalPath, 'utf8')) : [];
    if (!Array.isArray(history) || history.length > 10_000 || (existsSync(journalPath) && history.length === 0)) throw new Error('journal');
    let manifest: FixtureManifest = history.at(-1) ?? (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : newFixtureManifest(randomUUID(), new Date()));
    manifest = fixtureManifestSchema.parse(manifest);
    const save = async (next: FixtureManifest) => {
      next = fixtureManifestSchema.parse(next);
      history.push(structuredClone(next));
      atomic(journalPath, history);
      atomic(manifestPath, next);
    };
    if (command === 'prepare') await save(manifest);
    const result = await runner(command, manifest, credentials, { fetch: globalThis.fetch, now: () => new Date(), id: randomUUID, save });
    manifest = result.manifest;
    await save(manifest);
    const redact = (text: string) => Object.values(credentials).reduce((value, secret) => value.split(secret).join('[redacted]'), text).slice(0, 500);
    atomic(reportPath, { command, ready: result.ready, checkedAt: new Date().toISOString(), findings: result.findings.slice(0, 100).map(redact) });
    const completed = command === 'cleanup' || result.ready;
    const status = command === 'cleanup' ? 'CLEANUP_COMPLETE' : result.ready ? (command === 'check' ? 'READY' : 'PREPARED') : 'BLOCKED';
    return { code: completed ? 0 : 1, message: `acceptance-fixture: ${status} (inspect private report)` };
  } catch {
    return { code: 2, message: 'acceptance-fixture: BLOCKED (invalid input, private files, lock, or operation; inspect private run state)' };
  } finally {
    if (lock !== undefined) { closeSync(lock); if (lockPath) unlinkSync(lockPath); }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await fixtureCli(process.argv.slice(2));
  console.log(result.message);
  process.exitCode = result.code;
}
