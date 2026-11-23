import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

CHECKER = Path(__file__).resolve().parents[1] / 'check-ci-repair.py'

class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name)
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.com')
        self.git('config', 'user.name', 'Test')
        (self.repo / 'source').write_text('before')
        self.git('add', '.')
        self.git('commit', '-qm', 'initial')
        self.argv = ['python3', '-c', 'from pathlib import Path; import sys; print("actual output"); sys.exit(0 if Path("source").read_text()=="after" else 1)']
    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], text=True).strip()
    def call(self, *args, code=0, env=None):
        result = subprocess.run(['python3', str(CHECKER), args[0], '--repo', str(self.repo), *(['--pr', '1190', '--repository', 'example/repo'] if args[0] == 'start' else []), *args[1:]], capture_output=True, text=True, env=env)
        self.assertEqual(result.returncode, code, result.stdout + result.stderr)
        return result
    def start(self):
        self.call('start', '--case', 'case-1', '--environment', 'test', '--command-json', json.dumps(self.argv))
    def ready(self):
        self.start(); self.call('run', '--phase', 'before', '--scope', 'full', code=1)
        (self.repo / 'source').write_text('after')
        self.call('run', '--phase', 'after', '--scope', 'full')
    def state(self):
        receipt = Path(self.git('rev-parse', '--git-path', 'ci-repair.json'))
        if not receipt.is_absolute(): receipt = self.repo / receipt
        return json.loads(receipt.read_text())
    def test_missing_before_rejected(self):
        self.start(); (self.repo / 'source').write_text('after')
        self.call('run', '--phase', 'after', '--scope', 'full')
        self.call('check', '--phase', 'publish', code=2)
    def test_inactive_and_overwrite(self):
        self.call('check', '--phase', 'publish')
        self.start()
        self.call('start', '--case', 'same', '--environment', 'test', '--command-json', json.dumps(self.argv), code=2)
    def test_capture_and_commit_stability(self):
        self.ready()
        state = self.state()
        artifact = self.repo / '.git/ci-repair-evidence' / state['runs'][0]['artifact']
        self.assertEqual(artifact.read_text(), 'actual output\n')
        self.assertEqual(artifact.stat().st_mode & 0o777, 0o600)
        self.call('check', '--phase', 'publish')
        self.git('add', '.'); self.git('commit', '-qm', 'repair')
        self.call('check', '--phase', 'publish')
    def test_changed_untracked_and_deleted_content(self):
        self.ready()
        extra = self.repo / 'extra'; extra.write_text('new')
        self.call('check', '--phase', 'publish', code=2)
        extra.unlink(); (self.repo / 'source').unlink()
        self.call('check', '--phase', 'publish', code=2)
    def test_artifact_tampering(self):
        self.ready()
        state = self.state()
        (self.repo / '.git/ci-repair-evidence' / state['runs'][0]['artifact']).write_text('invented')
        self.call('check', '--phase', 'publish', code=2)
    def test_probe_cannot_authorize(self):
        self.start(); self.call('run', '--phase', 'before', '--scope', 'full', code=1)
        (self.repo / 'source').write_text('after')
        self.call('run', '--phase', 'after', '--scope', 'probe')
        self.call('check', '--phase', 'publish', code=2)
    def test_audit_binds_latest_failures(self):
        self.start(); self.call('run', '--phase', 'before', '--scope', 'full', code=1)
        for _ in range(2): self.call('run', '--phase', 'after', '--scope', 'full', code=1)
        self.call('run', '--phase', 'after', '--scope', 'full', code=2)
        self.call('run', '--phase', 'after', '--scope', 'probe', '--probe-command-json', '["python3", "-c", "print(123)"]')
        self.call('audit', '--observation-run', '4', '--assumption', 'bad setup', '--observation', 'same failure', '--decision', 'repair setup')
        self.call('run', '--phase', 'after', '--scope', 'full', code=1)
        self.call('run', '--phase', 'after', '--scope', 'full', code=2)
        self.call('run', '--phase', 'after', '--scope', 'probe', '--probe-command-json', '["python3", "-c", "print(123)"]')
        self.call('audit', '--observation-run', '6', '--assumption', 'content', '--observation', 'still failed', '--decision', 'fix content')
        (self.repo / 'source').write_text('after')
        self.call('run', '--phase', 'after', '--scope', 'full')
        self.call('check', '--phase', 'publish')
    def test_branch_mismatch(self):
        self.start(); self.git('checkout', '-qb', 'other')
        self.call('check', '--phase', 'publish', code=2)
    def gh_env(self, checks, head=None):
        directory = Path(self.tmp.name) / '.git/fake-bin'; directory.mkdir(exist_ok=True)
        script = directory / 'gh'
        script.write_text('#!/usr/bin/env python3\nimport json,os\nprint(os.environ["FAKE_GH"])\n')
        script.chmod(0o700)
        return dict(os.environ, PATH=str(directory) + os.pathsep + os.environ['PATH'], FAKE_GH=json.dumps({'headRefOid': head or self.git('rev-parse', 'HEAD'), 'statusCheckRollup': checks}))
    def test_remote_checks_and_stale_head(self):
        self.ready(); self.git('add', '.'); self.git('commit', '-qm', 'repair')
        for checks in [[], [{'name': 'test', 'status': 'IN_PROGRESS', 'conclusion': ''}], [{'name': 'test', 'status': 'COMPLETED', 'conclusion': 'FAILURE'}], [{'name': 'test', 'status': 'COMPLETED', 'conclusion': 'NEUTRAL'}], [{'name': 'EAS Build Check', 'status': 'COMPLETED', 'conclusion': 'SKIPPED'}]]:
            self.call('complete', '--pr', '1190', '--repository', 'example/repo', env=self.gh_env(checks), code=2)
        checks = [{'name': 'test', 'status': 'COMPLETED', 'conclusion': 'SUCCESS'}]
        self.call('complete', '--pr', '1190', '--repository', 'example/repo', env=self.gh_env(checks, 'stale'), code=2)
        self.call('complete', '--pr', '1190', '--repository', 'example/repo', env=self.gh_env(checks))
        self.call('check', '--phase', 'complete', env=self.gh_env([]), code=2)
        self.git('commit', '--allow-empty', '-qm', 'new head')
        self.call('check', '--phase', 'complete', env=self.gh_env(checks, 'old-head'), code=2)
    def test_explicit_expected_skip(self):
        self.call('start', '--case', 'skip', '--environment', 'test', '--command-json', json.dumps(self.argv), '--allow-skipped', 'EAS Build Check')
        self.call('run', '--phase', 'before', '--scope', 'full', code=1)
        (self.repo / 'source').write_text('after')
        self.call('run', '--phase', 'after', '--scope', 'full')
        self.git('add', '.'); self.git('commit', '-qm', 'repair')
        checks = [{'name': 'EAS Build Check', 'status': 'COMPLETED', 'conclusion': 'SKIPPED'}]
        self.call('complete', '--pr', '1190', '--repository', 'example/repo', env=self.gh_env(checks))
    def test_real_linked_worktree_isolation(self):
        self.start()
        linked = self.repo / '.git/linked'
        self.git('worktree', 'add', '-qb', 'linked', str(linked))
        original = self.repo
        self.repo = linked
        self.call('check', '--phase', 'publish')
        self.start()
        self.assertEqual(self.state()['root'], str(linked.resolve()))
        self.repo = original
        self.assertEqual(self.state()['branch'], self.git('branch', '--show-current'))
    def test_latest_failed_after_blocks_old_pass(self):
        self.ready()
        (self.repo / 'source').write_text('before')
        self.call('run', '--phase', 'after', '--scope', 'full', code=1)
        (self.repo / 'source').write_text('after')
        self.call('check', '--phase', 'publish', code=2)
    def test_deleted_source_stable_across_commit(self):
        (self.repo / 'obsolete').write_text('old')
        self.git('add', '.'); self.git('commit', '-qm', 'obsolete file')
        self.start(); self.call('run', '--phase', 'before', '--scope', 'full', code=1)
        (self.repo / 'source').write_text('after'); (self.repo / 'obsolete').unlink()
        result = self.call('run', '--phase', 'after', '--scope', 'full')
        self.assertNotIn('actual output', result.stdout)
        self.git('add', '-A'); self.git('commit', '-qm', 'remove obsolete')
        self.call('check', '--phase', 'publish')
    def test_artifact_escape_and_malformed_state(self):
        self.ready(); state = self.state()
        state['runs'][0]['artifact'] = '../escape'
        receipt = self.repo / '.git/ci-repair.json'
        receipt.write_text(json.dumps(state))
        self.call('check', '--phase', 'publish', code=2)
        receipt.write_text('[]')
        result = self.call('check', '--phase', 'publish', code=2)
        self.assertNotIn('Traceback', result.stderr)
    def test_audit_streak_resets_after_pass(self):
        self.ready()
        (self.repo / 'source').write_text('before')
        self.call('run', '--phase', 'after', '--scope', 'full', code=1)
        (self.repo / 'source').write_text('after')
        self.call('run', '--phase', 'after', '--scope', 'full')
        (self.repo / 'source').write_text('before')
        self.call('run', '--phase', 'after', '--scope', 'full', code=1)
        (self.repo / 'source').write_text('after')
        self.call('run', '--phase', 'after', '--scope', 'full')
        self.call('check', '--phase', 'publish')
    def test_timeout_is_not_failure_reproduction(self):
        self.argv = ['python3', '-c', 'from pathlib import Path; import time; time.sleep(2 if Path("source").read_text()=="before" else 0)']
        self.start()
        self.call('run', '--phase', 'before', '--scope', 'full', '--timeout', '0.01', code=124)
        self.assertTrue(self.state()['runs'][0]['blocked'])
        (self.repo / 'source').write_text('after')
        self.call('run', '--phase', 'after', '--scope', 'full')
        self.call('check', '--phase', 'publish', code=2)
    def test_clean_initialized_and_uninitialized_submodule(self):
        child = self.repo / '.git/child-source'; child.mkdir()
        subprocess.run(['git', 'init', '-q', str(child)], check=True)
        subprocess.run(['git', '-C', str(child), 'config', 'user.email', 'test@example.com'], check=True)
        subprocess.run(['git', '-C', str(child), 'config', 'user.name', 'Test'], check=True)
        (child / 'child').write_text('child')
        subprocess.run(['git', '-C', str(child), 'add', '.'], check=True)
        subprocess.run(['git', '-C', str(child), 'commit', '-qm', 'child'], check=True)
        self.git('-c', 'protocol.file.allow=always', 'submodule', 'add', str(child), 'module')
        self.git('commit', '-qam', 'submodule')
        self.ready(); self.call('check', '--phase', 'publish')
        (self.repo / 'module/child').write_text('dirty')
        self.call('check', '--phase', 'publish', code=2)
        subprocess.run(['git', '-C', str(self.repo / 'module'), 'checkout', '--', 'child'], check=True)
        self.git('submodule', 'deinit', '-f', 'module')
        self.call('check', '--phase', 'publish')
    def test_launcher_error_is_not_failure_reproduction(self):
        launcher = self.repo / '.git/launcher'
        self.argv = [str(launcher)]
        self.start()
        self.call('run', '--phase', 'before', '--scope', 'full', code=127)
        launcher.write_text('#!/bin/sh\nexit 0\n'); launcher.chmod(0o700)
        self.call('run', '--phase', 'after', '--scope', 'full')
        self.call('check', '--phase', 'publish', code=2)
    def test_observation_requires_new_successful_probe(self):
        self.start()
        self.call('run', '--phase', 'before', '--scope', 'full', code=1)
        self.call('run', '--phase', 'after', '--scope', 'probe', '--probe-command-json', '["python3", "-c", "print(1)"]')
        for _ in range(2): self.call('run', '--phase', 'after', '--scope', 'full', code=1)
        prose = ['--assumption', 'setup', '--observation', 'observed', '--decision', 'retry']
        self.call('audit', *prose, code=2)
        self.call('audit', '--observation-run', '2', *prose, code=2)
        self.call('run', '--phase', 'after', '--scope', 'probe', code=1)
        self.call('audit', '--observation-run', '5', *prose, code=2)
        self.call('run', '--phase', 'after', '--scope', 'probe', '--probe-command-json', '["python3", "-c", "print(1)"]')
        self.call('audit', '--observation-run', '6', *prose)
        self.call('run', '--phase', 'after', '--scope', 'full', '--probe-command-json', '["true"]', code=2)
        (self.repo / 'source').write_text('after')
        self.call('run', '--phase', 'after', '--scope', 'full')
        self.call('check', '--phase', 'publish')
    def test_completion_target_is_bound_at_start(self):
        self.ready(); self.git('add', '.'); self.git('commit', '-qm', 'repair')
        checks = [{'name': 'test', 'status': 'COMPLETED', 'conclusion': 'SUCCESS'}]
        self.call('complete', '--pr', '12', '--repository', 'other/repo', env=self.gh_env(checks), code=2)
        self.call('complete', '--pr', '1190', '--repository', 'other/repo', env=self.gh_env(checks), code=2)
        self.call('complete', '--pr', '12', '--repository', 'example/repo', env=self.gh_env(checks), code=2)
    def test_missing_completion_receipt_rejected(self):
        self.call('check', '--phase', 'complete', code=2)
