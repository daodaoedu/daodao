"""User-facing Stop reminders stay quiet without weakening blocking checks."""
import json
import os
import shlex
import shutil
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


WRAPPER = Path(__file__).resolve().parents[1] / 'quiet-stop.py'


class QuietStopTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.hook = self.root / 'fixture-hook'
        hooks = self.root / 'hooks'
        hooks.mkdir()
        self.wrapper = hooks / 'quiet-stop.py'
        shutil.copyfile(WRAPPER, self.wrapper)
        (hooks / 'stop-quality-gate.sh').write_text(
            '#!/usr/bin/env bash\nexec ' + shlex.quote(sys.executable) + ' ' +
            shlex.quote(str(self.hook)) + '\n')
        self.env = {**os.environ, 'XDG_CACHE_HOME': str(self.root / 'cache')}
        for key in ('DAODAO_STOP_COMMAND', 'CLAUDE_TOOL_INPUT',
                    'CLAUDE_WORKING_DIRECTORY', 'CODEX_THREAD_ID'):
            self.env.pop(key, None)

    def fixture(self, message='', stderr='', code=0):
        self.hook.write_text(
            '#!/usr/bin/env python3\nimport sys\n'
            f'sys.stdout.write({json.dumps({"systemMessage": message}, ensure_ascii=False)!r})\n'
            f'sys.stderr.write({stderr!r})\n'
            f'sys.exit({code})\n')
        self.hook.chmod(0o700)

    def run_stop(self, session='session-a', event=None):
        if event is None:
            event = {'cwd': str(self.root), 'session_id': session}
        return subprocess.run([sys.executable, str(self.wrapper)],
                              input=json.dumps(event),
                              env=self.env, text=True, capture_output=True)

    def reports(self):
        return list((self.root / 'cache' / 'daodao-harness' / 'stop-reports').glob('*/latest.json'))

    def assert_warning(self, result):
        self.assertEqual(result.returncode, 0, result.stderr)
        output = json.loads(result.stdout)
        self.assertIn('systemMessage', output)
        self.assertLess(len(output['systemMessage']), 1000)
        return output['systemMessage']

    def test_codex_thread_ids_isolate_reports(self):
        self.fixture('⚠️ shared warning')
        for thread in ('thread-a', 'thread-b'):
            self.assert_warning(self.run_stop(event={'cwd': str(self.root), 'thread_id': thread}))
        self.assertEqual(len(self.reports()), 2)

    def test_utf8_gate_output_survives_ascii_locale(self):
        self.fixture('⚠️ 中文警告', '中文阻擋診斷\n', 2)
        self.env.update({'PYTHONUTF8': '0', 'PYTHONCOERCECLOCALE': '0',
                         'LC_ALL': 'C', 'PYTHONIOENCODING': 'utf-8'})
        result = self.run_stop()
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('中文警告', result.stdout)
        self.assertIn('中文阻擋診斷', result.stderr)
        report = json.loads(self.reports()[0].read_text(encoding='utf-8'))
        self.assertIn('中文警告', report['stdout'])

    def test_working_directory_alias_isolates_reports(self):
        self.fixture('⚠️ source.ts — 500 行')
        for directory in ('project-a', 'project-b'):
            self.assert_warning(self.run_stop(event={
                'workingDirectory': str(self.root / directory), 'session_id': 'same'}))
        self.assertEqual(len(self.reports()), 2)

    def test_environment_working_directory_isolates_reports(self):
        self.fixture('⚠️ source.ts — 500 行')
        for directory in ('project-a', 'project-b'):
            self.env['CLAUDE_WORKING_DIRECTORY'] = str(self.root / directory)
            self.assert_warning(self.run_stop(event={'session_id': 'same'}))
        self.assertEqual(len(self.reports()), 2)

    def test_sessionless_warning_is_quiet_per_working_directory(self):
        self.fixture('⚠️ source.ts — 500 行')
        for directory in ('project-a', 'project-b'):
            event = {'cwd': str(self.root / directory)}
            self.assert_warning(self.run_stop(event=event))
            result = self.run_stop(event=event)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout, '')
        self.assertEqual(len(self.reports()), 2)

    def test_nonstring_message_preserves_original_output_and_exit(self):
        for message in (None, 42, [], {'warning': '⚠️ source.ts'}):
            for code in (0, 2):
                with self.subTest(message=message, code=code):
                    self.fixture(message, 'original diagnostic\n', code)
                    result = self.run_stop()
                    self.assertEqual(result.returncode, code, result.stderr)
                    self.assertEqual(result.stdout, json.dumps(
                        {'systemMessage': message}, ensure_ascii=False))
                    self.assertIn('original diagnostic', result.stderr)

    def test_nonobject_cached_report_does_not_crash(self):
        self.fixture('⚠️ source.ts — 500 行')
        self.assert_warning(self.run_stop())
        self.reports()[0].write_text('[]')
        self.assertIn('source.ts', self.assert_warning(self.run_stop()))

    def test_environment_command_cannot_bypass_blocking_gate(self):
        bypass = self.root / 'bypass'
        bypass.write_text('#!/usr/bin/env bash\nexit 0\n')
        bypass.chmod(0o700)
        self.env['DAODAO_STOP_COMMAND'] = str(bypass)
        self.fixture('blocking gate', 'mandatory gate diagnostic\n', 2)
        result = self.run_stop()
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('mandatory gate diagnostic', result.stderr)
        self.assertEqual(json.loads(result.stdout)['systemMessage'], 'blocking gate')

    def test_green_file_inventory_is_silent_but_full_report_is_saved(self):
        full = '📊 變更統計：\n26 files changed\n📋 檔案就緒清單：\n  ✅ source.ts\n  ✅ .playwright-mcp/console.log\n'
        self.fixture(full)
        result = self.run_stop()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, '')
        self.assertEqual(result.stderr, '')
        self.assertEqual(len(self.reports()), 1)
        report = json.loads(self.reports()[0].read_text())
        self.assertEqual(json.loads(report['stdout'])['systemMessage'], full)

    def test_same_warning_is_silent_until_warning_changes(self):
        self.fixture('📋 檔案就緒清單：\n  ⚠️ source.ts — 500 行\n')
        self.assertIn('source.ts', self.assert_warning(self.run_stop()))
        again = self.run_stop()
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertEqual(again.stdout, '')
        self.fixture('📋 檔案就緒清單：\n  ⚠️ other.ts — 700 行\n')
        self.assertIn('other.ts', self.assert_warning(self.run_stop()))

    def test_new_risk_category_is_not_hidden_by_unchanged_heading(self):
        self.fixture('🚨 高風險變更偵測：\n  Auth (1 檔) — review\n')
        self.assertIn('Auth', self.assert_warning(self.run_stop()))
        self.fixture('🚨 高風險變更偵測：\n  Storage (1 檔) — review\n')
        self.assertIn('Storage', self.assert_warning(self.run_stop()))

    def test_new_warning_is_prioritized_over_existing_backlog(self):
        self.fixture('⚠️ first\n⚠️ second\n⚠️ third\n⚠️ fourth')
        self.assert_warning(self.run_stop())
        self.fixture('⚠️ first\n⚠️ second\n⚠️ third\n⚠️ fourth\n⚠️ newest')
        self.assertIn('newest', self.assert_warning(self.run_stop()))
        self.assertIn('fourth', self.assert_warning(self.run_stop()))
        self.assertEqual(self.run_stop().stdout, '')

    def test_warning_beyond_summary_limit_is_delivered_once_later(self):
        self.fixture('⚠️ first\n⚠️ second\n⚠️ third')
        self.assertIn('first', self.assert_warning(self.run_stop()))
        self.assertIn('third', self.assert_warning(self.run_stop()))
        self.assertEqual(self.run_stop().stdout, '')

    def test_changed_third_warning_is_visible(self):
        self.fixture('⚠️ first\n⚠️ second\n⚠️ third')
        self.assert_warning(self.run_stop())
        self.fixture('⚠️ first\n⚠️ second\n⚠️ changed-third')
        self.assertIn('changed-third', self.assert_warning(self.run_stop()))

    def test_same_warning_in_another_session_is_not_suppressed(self):
        self.fixture('⚠️ source.ts — 500 行')
        self.assert_warning(self.run_stop('session-a'))
        self.assert_warning(self.run_stop('session-b'))
        self.assertEqual(len(self.reports()), 2)

    def test_resolved_warning_is_reported_again_if_it_returns(self):
        self.fixture('⚠️ source.ts — 500 行')
        self.assert_warning(self.run_stop())
        self.fixture('✅ source.ts')
        self.assertEqual(self.run_stop().stdout, '')
        self.fixture('⚠️ source.ts — 500 行')
        self.assert_warning(self.run_stop())

    def test_unwritable_cache_preserves_original_warning_and_blocking_result(self):
        cache_file = self.root / 'not-a-directory'
        cache_file.write_text('occupied')
        self.env['XDG_CACHE_HOME'] = str(cache_file)
        for code in (0, 2):
            with self.subTest(code=code):
                self.fixture('⚠️ source.ts — 500 行', 'original diagnostic\n', code)
                result = self.run_stop()
                self.assertEqual(result.returncode, code)
                self.assertIn('source.ts', json.loads(result.stdout)['systemMessage'])
                self.assertIn('original diagnostic', result.stderr)

    def test_successful_external_blocker_is_reported_once(self):
        self.fixture('Post-merge closeout: blocked; completed=false. Evidence requires audit.\n'
                     '📋 檔案就緒清單：\n  ✅ source.ts\n')
        self.assertIn('blocked', self.assert_warning(self.run_stop()))
        self.assertEqual(self.run_stop().stdout, '')

    def test_blocking_exit_is_never_hidden_or_changed_on_repeat(self):
        self.fixture(stderr='post-merge closeout incomplete: missing handoff\n', code=2)
        for _ in range(2):
            result = self.run_stop()
            self.assertEqual(result.returncode, 2)
            self.assertIn('missing handoff', result.stderr)
        self.assertEqual(len(self.reports()), 1)
        self.assertIn('missing handoff', self.reports()[0].read_text())


if __name__ == '__main__':
    unittest.main()
