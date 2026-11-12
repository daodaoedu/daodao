"""Exercise the guard through real git push, without a model/tool-hook mock."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

HOOKS = Path(__file__).resolve().parents[1]
CHECKER = HOOKS / 'check-ci-repair.py'
PUBLISH = HOOKS / 'ci-repair-publish.py'


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.repo = self.root / 'repo with spaces'
        self.remote = self.root / 'remote.git'
        self.env = {**os.environ, 'HOME': str(self.root), 'GIT_CONFIG_NOSYSTEM': '1'}
        for name in list(self.env):
            if name.startswith('GIT_CONFIG_') and name != 'GIT_CONFIG_NOSYSTEM':
                del self.env[name]
        self.call('git', 'init', '-q', str(self.repo), '-b', 'main')
        self.call('git', 'init', '-q', '--bare', str(self.remote))
        self.git('config', 'user.name', 'Test')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('remote', 'add', 'origin', str(self.remote))
        self.code = self.repo / 'value.txt'
        self.code.write_text('bad')
        self.git('add', '.')
        self.git('commit', '-qm', 'baseline')

    def call(self, *args, ok=True, **kwargs):
        result = subprocess.run(args, env=self.env, capture_output=True, text=True, **kwargs)
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        return result

    def git(self, *args, ok=True):
        return self.call('git', '-C', str(self.repo), *args, ok=ok)

    def cli(self, script, *args, ok=True):
        return self.call(sys.executable, str(script), *args, '--repo', str(self.repo), ok=ok)

    def install(self):
        self.cli(PUBLISH, 'install')

    def start(self):
        argv = [sys.executable, '-c', "from pathlib import Path; raise SystemExit(0 if Path('value.txt').read_text() == 'good' else 1)"]
        self.cli(CHECKER, 'start', '--case', 'same-path', '--environment', 'local-test',
                 '--command-json', json.dumps(argv), '--pr', '1190', '--repository', 'example/repo')

    def green(self):
        self.start()
        self.assertEqual(self.cli(CHECKER, 'run', '--phase', 'before', '--scope', 'full', ok=False).returncode, 1)
        self.code.write_text('good')
        self.cli(CHECKER, 'run', '--phase', 'after', '--scope', 'full')
        self.git('add', '.')
        self.git('commit', '-qm', 'fix')

    def test_native_push_blocks_missing_before_then_accepts_matching_green(self):
        self.install()
        self.start()
        blocked = self.git('push', 'origin', 'HEAD:refs/heads/main', ok=False)
        self.assertNotEqual(blocked.returncode, 0)
        self.assertEqual(self.git('ls-remote', 'origin').stdout, '')
        self.assertEqual(self.cli(CHECKER, 'run', '--phase', 'before', '--scope', 'full', ok=False).returncode, 1)
        self.code.write_text('good')
        self.cli(CHECKER, 'run', '--phase', 'after', '--scope', 'full')
        self.git('add', '.')
        self.git('commit', '-qm', 'fix')
        self.git('push', 'origin', 'HEAD:refs/heads/main')
        self.assertIn(self.git('rev-parse', 'HEAD').stdout.strip(), self.git('ls-remote', 'origin').stdout)

    def test_unrelated_git_push_remains_unaffected(self):
        self.install()
        self.git('push', 'origin', 'HEAD:refs/heads/main')

    def test_probe_green_does_not_authorize_native_push(self):
        self.install()
        self.start()
        self.cli(CHECKER, 'run', '--phase', 'before', '--scope', 'full', ok=False)
        self.code.write_text('good')
        self.cli(CHECKER, 'run', '--phase', 'after', '--scope', 'probe')
        result = self.git('push', 'origin', 'HEAD:main', ok=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.git('ls-remote', 'origin').stdout, '')

    def test_source_changed_after_green_blocks_native_push(self):
        self.install()
        self.green()
        self.code.write_text('regressed')
        self.assertNotEqual(self.git('push', 'origin', 'HEAD:main', ok=False).returncode, 0)
        self.assertEqual(self.git('ls-remote', 'origin').stdout, '')

    def test_green_uncommitted_content_cannot_publish_old_failing_commit(self):
        self.install()
        self.start()
        self.cli(CHECKER, 'run', '--phase', 'before', '--scope', 'full', ok=False)
        self.code.write_text('good')
        self.cli(CHECKER, 'run', '--phase', 'after', '--scope', 'full')
        result = self.git('push', 'origin', 'HEAD:main', ok=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.git('ls-remote', 'origin').stdout, '')

    def test_different_outgoing_commit_is_rejected_despite_clean_tested_head(self):
        self.install()
        self.green()
        self.git('branch', 'untested', 'HEAD^')
        result = self.git('push', 'origin', 'untested:main', ok=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.git('ls-remote', 'origin').stdout, '')

    def test_install_preserves_foreign_hook(self):
        path = self.repo / '.git/hooks/pre-push'
        original = '#!/bin/sh\nexit 42\n'
        path.write_text(original)
        self.assertEqual(self.cli(PUBLISH, 'install', ok=False).returncode, 2)
        self.assertEqual(path.read_text(), original)

    def test_marker_comment_does_not_authorize_overwriting_custom_hook(self):
        path = self.repo / '.git/hooks/pre-push'
        original = '#!/bin/sh\n# daodao-ci-repair-pre-push-v1\nexit 42\n'
        path.write_text(original)
        self.assertEqual(self.cli(PUBLISH, 'install', ok=False).returncode, 2)
        self.assertEqual(path.read_text(), original)

    def test_wrapper_requires_active_repair_before_push(self):
        self.install()
        result = self.call(sys.executable, str(PUBLISH), 'push', '--repo', str(self.repo),
                           '--pr', '1190', '--repository', 'example/repo', '--', 'origin', 'HEAD:main', ok=False)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(self.git('ls-remote', 'origin').stdout, '')

    def test_wrapper_rejects_other_pr_before_pushing(self):
        self.install()
        self.green()
        result = self.call(sys.executable, str(PUBLISH), 'push', '--repo', str(self.repo),
                           '--pr', '1191', '--repository', 'example/repo', '--', 'origin', 'HEAD:main', ok=False)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(self.git('ls-remote', 'origin').stdout, '')

    def test_pushed_pending_is_not_completion_then_live_green_can_complete(self):
        self.install()
        self.green()
        tools = self.root / 'tools'
        tools.mkdir()
        gh = tools / 'gh'
        gh.write_text(f'#!{sys.executable}\nimport os\nprint(os.environ["TEST_CHECKS"])\n')
        gh.chmod(0o700)
        self.env['PATH'] = str(tools) + os.pathsep + self.env['PATH']
        head = self.git('rev-parse', 'HEAD').stdout.strip()
        data = {'headRefOid': head, 'statusCheckRollup': [{'name': 'journeys', 'status': 'IN_PROGRESS', 'conclusion': ''}]}
        self.env['TEST_CHECKS'] = json.dumps(data)
        args = [sys.executable, str(PUBLISH), 'push', '--repo', str(self.repo), '--pr', '1190',
                '--repository', 'example/repo', '--', 'origin', 'HEAD:main']
        pending = self.call(*args, ok=False)
        self.assertEqual(pending.returncode, 3)
        self.assertIn('NOT verified', pending.stderr)
        data['statusCheckRollup'][0].update(status='COMPLETED', conclusion='SUCCESS')
        self.env['TEST_CHECKS'] = json.dumps(data)
        self.call(*args)


if __name__ == '__main__':
    unittest.main()
