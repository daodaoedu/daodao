"""Closeout cannot silently stop at a clean, merged, engineering-only task."""
import hashlib
from datetime import datetime, timedelta, timezone
import importlib.util
import json
import os
import re
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'check-post-merge-closeout.py'
STOP = ROOT / 'stop-quality-gate.sh'
NOW = '2026-11-06T02:00:00Z'


class CloseoutTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.task = Path(self.tmp.name) / 'task'
        self.task.mkdir()
        self.env = {**os.environ, 'HOME': self.tmp.name,
                    'XDG_CACHE_HOME': str(Path(self.tmp.name) / 'cache'),
                    'CODEX_THREAD_ID': 'session-401'}
        subprocess.run(['git', 'init', '-q', str(self.task)], check=True)
        self.receipt = self.task / 'post-merge-closeout.json'

    def evidence(self, name, content):
        p = self.task / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content if isinstance(content, str) else json.dumps(content))
        return {'path': name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}

    def write(self, data):
        self.receipt.write_text(json.dumps(data))

    def run_cli(self, *args, input_text=None):
        return subprocess.run(['python3', str(SCRIPT), *args], env=self.env,
                              input=input_text, capture_output=True, text=True)

    def binding_path(self):
        key = hashlib.sha256(b'session-401').hexdigest()
        return Path(self.env['XDG_CACHE_HOME']) / 'daodao-harness/post-merge' / (key + '.json')

    def binding(self):
        p = self.binding_path()
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps({'receipt': str(self.receipt), 'began_at': '2026-11-06T00:59:00Z'}))
        return p

    def checker(self):
        spec = importlib.util.spec_from_file_location('closeout', SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def complete(self):
        account = 'pm@example.org'
        fixture = 'https://app-dev.daodao.so/practices/401'
        draft = self.evidence('notes/handoff.md', 'PM pm@example.org https://app-dev.daodao.so/practices/401\n## 驗收步驟\n1. Read the resource\n2. Edit then restore\n')
        baseline = self.evidence('evidence/baseline.json', {'resources': ['A', 'B']})
        step_proof = self.evidence('evidence/browser.txt', 'Actual UI read/edit/restored')
        common = {'accounts': [account], 'fixtures': [fixture]}
        replay = {**common, 'kind': 'pm-ui-replay', 'draft_sha256': draft['sha256'],
                  'started_at': '2026-11-06T01:00:00Z', 'finished_at': '2026-11-06T01:10:00Z',
                  'steps': [{'id': x, 'account': account, 'fixture': fixture,
                             'result': 'pass', 'evidence': step_proof} for x in ['1', '2']]}
        restore = {**common, 'kind': 'pm-restored-preflight', 'result': 'pass',
                   'baseline_sha256': baseline['sha256'], 'observed_at': '2026-11-06T01:11:00Z',
                   'evidence': self.evidence('evidence/restored.json', {'resources': ['A', 'B']})}
        return {'version': 1, 'task_dir': str(self.task), 'issue': 'https://github.com/daodaoedu/daodao/issues/401',
                'goal': 'pm-handoff', 'state': 'handed-off',
                'merged': self.evidence('evidence/merged.json', {'merged': True}),
                'deployed': self.evidence('evidence/deployed.json', {'revision': 'abc', 'environment': 'dev'}),
                'smoke': self.evidence('evidence/smoke.json', {'result': 'pass'}),
                'plan': {**common, 'draft': draft, 'baseline': baseline, 'steps': ['1', '2'],
                         'step_contexts': {x: {'account': account, 'fixture': fixture} for x in ['1', '2']}},
                'replay': self.evidence('evidence/replay.json', replay),
                'restore': self.evidence('evidence/restore.json', restore),
                'retention': {'fixtures': [{'url': fixture, 'retained': True}],
                              'expires_at': (max(datetime.now(timezone.utc), datetime.fromisoformat(NOW.replace('Z', '+00:00'))) + timedelta(days=7)).isoformat(),
                              'reset': self.evidence('evidence/reset.txt', 'Reset command run; baseline matched')},
                'lint': self.evidence('evidence/lint.json', {'draft_sha256': draft['sha256'], 'exit_code': 0, 'observed_at': '2026-11-06T00:59:00Z'}),
                'handoff': self.evidence('evidence/remote.json', {'draft_sha256': draft['sha256'],
                    'comment_url': 'https://github.com/daodaoedu/daodao/issues/401#issuecomment-123',
                    'board_status': 'Acceptance', 'issue_state': 'OPEN', 'pm_login': 'peggy1213-create', 'assignees': ['peggy1213-create'], 'labels': [], 'observed_at': '2026-11-06T01:12:00Z'})}

    def validate(self, data):
        self.write(data)
        return self.checker().validate(self.receipt, now=NOW)

    def lifecycle(self, *, timed=True):
        d = self.complete()
        d['version'] = 2
        d['retention']['expires_at'] = '2026-11-13T02:00:00Z'
        source = self.evidence('evidence/lifecycle-review.txt',
            'Reviewed required values against baseline and scheduler source; completion occurs only after expiry.')
        assessment = {'kind': 'pm-retention-lifecycle', 'version': 1,
            'draft_sha256': d['plan']['draft']['sha256'],
            'baseline_sha256': d['plan']['baseline']['sha256'],
            'observed_at': '2026-11-06T01:12:00Z',
            'fixtures': [{'url': d['plan']['fixtures'][0],
                'required_values': {'resources': ['A', 'B']}, 'time_dependent': timed,
                'reason': 'PM must read and edit the restored resources', 'evidence': source,
                'valid_until': '2026-11-13T02:00:00Z',
                'known_transitions': ([{'at': '2026-11-13T02:00:00Z',
                    'effect': 'Scheduled completion changes editable status', 'evidence': source}] if timed else [])}]}
        self.save_lifecycle(d, assessment)
        return d, assessment

    def save_lifecycle(self, d, assessment):
        d['retention']['lifecycle'] = self.evidence('evidence/lifecycle.json', assessment)

    def test_lifecycle_historical_active_expired_fixture_cannot_outlive_hourly_completion(self):
        d, assessment = self.lifecycle()
        d['version'] = 1  # Legacy receipts declaring lifecycle must enforce it too.
        assessment['fixtures'][0]['required_values'] = {'status': 'active', 'end_date': '2026-11-05'}
        assessment['fixtures'][0]['known_transitions'][0]['at'] = '2026-11-06T03:00:00Z'
        self.save_lifecycle(d, assessment)
        self.assertTrue(self.validate(d)[1], 'hourly completion before advertised retention must fail')

    def test_lifecycle_current_future_and_timeless_fixtures_pass(self):
        for timed in [True, False]:
            with self.subTest(timed=timed):
                d, _ = self.lifecycle(timed=timed)
                self.assertEqual(self.validate(d), ('handed-off', []))

    def test_lifecycle_exact_expiry_and_timezone_boundaries(self):
        d, a = self.lifecycle()
        f = a['fixtures'][0]
        f['valid_until'] = '2026-11-13T10:00:00+08:00'
        f['known_transitions'][0]['at'] = '2026-11-13T10:00:00+08:00'
        self.save_lifecycle(d, a)
        self.assertEqual(self.validate(d), ('handed-off', []))
        self.write(d)
        self.assertTrue(self.checker().validate(self.receipt, now='2026-11-13T02:00:00Z')[1])
        f['known_transitions'][0]['at'] = '2026-11-13T01:59:59Z'
        self.save_lifecycle(d, a)
        self.assertTrue(self.validate(d)[1])

    def test_lifecycle_missing_invalid_and_unbound_assessments_fail(self):
        cases = [('kind', 'other'), ('version', 2), ('draft_sha256', '0' * 64),
                 ('baseline_sha256', '0' * 64), ('observed_at', '2026-11-06T01:10:59Z'),
                 ('observed_at', '2026-11-06T02:00:01Z'), ('observed_at', '2026-11-06T01:12:00'),
                 ('fixtures', []), ('fixtures', None)]
        for key, value in cases:
            with self.subTest(key=key, value=value):
                d, a = self.lifecycle(); a[key] = value; self.save_lifecycle(d, a)
                self.assertTrue(self.validate(d)[1])
        d, _ = self.lifecycle(); del d['retention']['lifecycle']
        self.assertTrue(self.validate(d)[1])

    def test_lifecycle_fixture_exactcoverage_fields_and_source_evidence(self):
        cases = [('url', 'https://app-dev.daodao.so/practices/999'),
            ('required_values', {}), ('required_values', []), ('reason', ''),
            ('time_dependent', 'false'), ('time_dependent', 1), ('valid_until', '2026-11-13T01:59:59Z'),
            ('valid_until', '2026-11-13T02:00:00'), ('known_transitions', None),
            ('evidence', {'path': '../outside', 'sha256': '0' * 64}),
            ('evidence', {'path': 'evidence/missing.txt', 'sha256': '0' * 64})]
        for key, value in cases:
            with self.subTest(key=key, value=value):
                d, a = self.lifecycle(); a['fixtures'][0][key] = value; self.save_lifecycle(d, a)
                self.assertTrue(self.validate(d)[1])
        for change in ['duplicate', 'missing-evidence', 'tampered-source', 'timeless-transition']:
            with self.subTest(change=change):
                d, a = self.lifecycle()
                if change == 'duplicate': a['fixtures'].append(dict(a['fixtures'][0]))
                elif change == 'missing-evidence': del a['fixtures'][0]['evidence']
                elif change == 'tampered-source': (self.task / a['fixtures'][0]['evidence']['path']).write_text('changed')
                else: a['fixtures'][0]['time_dependent'] = False
                self.save_lifecycle(d, a)
                self.assertTrue(self.validate(d)[1])

    def test_lifecycle_required_fields_and_hash_binding_cannot_be_omitted(self):
        for key in ['url', 'required_values', 'time_dependent', 'reason', 'evidence',
                    'valid_until', 'known_transitions']:
            with self.subTest(missing=key):
                d, a = self.lifecycle(); del a['fixtures'][0][key]
                self.save_lifecycle(d, a); self.assertTrue(self.validate(d)[1])
        d, _ = self.lifecycle()
        (self.task / d['retention']['lifecycle']['path']).write_text('{}')
        self.assertTrue(self.validate(d)[1])
        d, a = self.lifecycle(timed=False)
        del a['fixtures'][0]['valid_until']
        self.save_lifecycle(d, a)
        self.assertEqual(self.validate(d), ('handed-off', []))

    def test_lifecycle_transition_requires_timestamp_effect_and_bound_source(self):
        for key, value in [('at', 'bad'), ('at', '2026-11-13T02:00:00'),
                           ('effect', ''), ('evidence', None),
                           ('evidence', {'path': '../source', 'sha256': '0' * 64})]:
            with self.subTest(key=key, value=value):
                d, a = self.lifecycle(); a['fixtures'][0]['known_transitions'][0][key] = value
                self.save_lifecycle(d, a); self.assertTrue(self.validate(d)[1])

    def test_lifecycle_does_not_override_consumed_baseline_guard(self):
        d, _ = self.lifecycle()
        restore = json.loads((self.task / d['restore']['path']).read_text())
        restore['evidence'] = self.evidence('evidence/restored.json', {'resources': ['consumed']})
        d['restore'] = self.evidence('evidence/restore.json', restore)
        self.assertTrue(self.validate(d)[1])

    def test_preflight_allows_pending_without_remote_handoff_but_check_does_not(self):
        d, _ = self.lifecycle(); d['state'] = 'pending'; del d['handoff']
        self.write(d)
        self.assertEqual(self.checker().validate(self.receipt, now=NOW, preflight=True), ('ready-to-handoff', []))
        self.assertTrue(self.validate(d)[1])

    def test_preflight_enforces_local_requirements_and_preserves_blocked_result(self):
        for missing in ['merged', 'deployed', 'smoke', 'replay', 'restore', 'lint']:
            with self.subTest(missing=missing):
                d, _ = self.lifecycle(); d['state'] = 'pending'; del d[missing]
                self.write(d)
                state, errors = self.checker().validate(self.receipt, now=NOW, preflight=True)
                self.assertEqual(state, 'incomplete'); self.assertTrue(errors)
        d = self.blocked(); d['version'] = 2; self.write(d)
        self.assertEqual(self.run_cli('preflight', '--receipt', str(self.receipt)).returncode, 3)

    def test_preflight_cli_and_version_upgrade_contract(self):
        d, _ = self.lifecycle()
        # CLI uses wall time, so preserve a safely future validity interval.
        future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        a = json.loads((self.task / d['retention']['lifecycle']['path']).read_text())
        d['retention']['expires_at'] = future
        a['fixtures'][0]['valid_until'] = future
        a['fixtures'][0]['known_transitions'][0]['at'] = future
        self.save_lifecycle(d, a)
        d['state'] = 'pending'; del d['handoff']; self.write(d)
        result = self.run_cli('preflight', '--receipt', str(self.receipt))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('ready-to-handoff', result.stdout)
        d = self.complete(); self.write(d)
        self.assertEqual(self.run_cli('check', '--receipt', str(self.receipt)).returncode, 0)
        self.assertEqual(self.run_cli('preflight', '--receipt', str(self.receipt)).returncode, 1)
        self.receipt.unlink()
        result = self.run_cli('begin', '--task-dir', str(self.task), '--issue', d['issue'])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(self.receipt.read_text())['version'], 2)

    def test_actual_skill_publication_shell_fails_closed_and_publishes_once(self):
        skill = SCRIPT.parents[1] / 'skills/verify-deploy/SKILL.md'
        blocks = re.findall(r'```bash\n(.*?)\n\s*```', skill.read_text(), re.S)
        blocks = [block for block in blocks if 'git fetch origin main' in block]
        self.assertEqual(len(blocks), 1)
        recipe = blocks[0].replace('<留言檔絕對路徑>.md', 'draft.md').replace(
            '<coverage絕對路徑>.json', 'coverage.json').replace('<n>', '401')
        fake_bin = self.task / 'fake-bin'; fake_bin.mkdir()
        log = self.task / 'calls.log'
        gate = self.task / 'gate'
        # All external commands are intercepted; the recipe itself is extracted unchanged.
        stub = '''#!/usr/bin/env python3
import json, os, pathlib, sys
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
with open(os.environ['CALL_LOG'], 'a') as stream:
    stream.write(json.dumps([name, *args]) + "\\n")
if name == 'git' and args == ['fetch', 'origin', 'main']:
    sys.exit(int(os.environ.get('FETCH_EXIT', '0')))
if name == 'git' and args[:1] == ['rev-parse']:
    print('abc123exactsha')
if name == 'mktemp':
    pathlib.Path(os.environ['FAKE_GATE']).mkdir(exist_ok=True)
    print(os.environ['FAKE_GATE'])
if name == 'python3' and 'preflight' in args:
    sys.exit(int(os.environ.get('PREFLIGHT_EXIT', '0')))
'''
        for name in ['git', 'pnpm', 'gh', 'python3', 'mktemp']:
            executable = fake_bin / name
            # Avoid env's python3 resolving to this stub recursively.
            executable.write_text(stub.replace('#!/usr/bin/env python3', '#!' + os.sys.executable))
            executable.chmod(0o755)
        for scenario, fetch_exit, preflight_exit in [('preflight-fail', '0', '1'),
                                                    ('fetch-fail', '1', '0'), ('valid', '0', '0')]:
            with self.subTest(scenario=scenario):
                log.write_text('')
                env = {**self.env, 'PATH': str(fake_bin) + ':' + os.environ['PATH'],
                    'TASK': str(self.task), 'CALL_LOG': str(log), 'FAKE_GATE': str(gate),
                    'FETCH_EXIT': fetch_exit, 'PREFLIGHT_EXIT': preflight_exit}
                result = subprocess.run(['bash', '-c', recipe], cwd=self.task, env=env,
                    input='\n', capture_output=True, text=True)
                calls = [json.loads(line) for line in log.read_text().splitlines()]
                publishes = [c for c in calls if c[:3] == ['gh', 'issue', 'comment']]
                boards = [c for c in calls if c[0] == 'pnpm' and any(x.endswith('/board.ts') for x in c)]
                if scenario == 'valid':
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(len(publishes), 1); self.assertEqual(len(boards), 1)
                    resolves = [c for c in calls if c == ['git', 'rev-parse', 'origin/main']]
                    self.assertEqual(len(resolves), 1)
                    self.assertIn(['git', 'worktree', 'add', '--detach', str(gate), 'abc123exactsha'], calls)
                    preflight = next(i for i, c in enumerate(calls) if c[0] == 'python3' and 'preflight' in c)
                    self.assertLess(preflight, calls.index(publishes[0]))
                    self.assertLess(preflight, calls.index(boards[0]))
                else:
                    self.assertNotEqual(result.returncode, 0)
                    self.assertEqual(publishes, []); self.assertEqual(boards, [])
                    if scenario == 'fetch-fail': self.assertEqual(calls, [['git', 'fetch', 'origin', 'main']])

    def test_publication_recipe_runs_real_checker_before_external_stubs(self):
        import re
        import sys
        skill = SCRIPT.parents[1] / 'skills/verify-deploy/SKILL.md'
        recipe = next(block for block in re.findall(r'```bash\n(.*?)\n\s*```', skill.read_text(), re.S)
                      if 'git fetch origin main' in block)
        recipe = recipe.replace('<留言檔絕對路徑>.md', 'draft.md').replace(
            '<coverage絕對路徑>.json', 'coverage.json').replace('<n>', '401')
        fake_bin = self.task / 'transport-bin'; fake_bin.mkdir()
        calls = self.task / 'transport-calls.jsonl'
        gate = self.task / 'pinned-checkout'
        stub = '''#!PYTHON
import json, os, pathlib, shutil, sys
name, args = pathlib.Path(sys.argv[0]).name, sys.argv[1:]
with open(os.environ['CALL_LOG'], 'a') as stream:
    stream.write(json.dumps([name, *args]) + "\\n")
if name == 'git' and args == ['rev-parse', 'origin/main']:
    print('fixed-candidate-sha')
elif name == 'git' and args[:3] == ['worktree', 'add', '--detach']:
    target = pathlib.Path(args[3]) / 'plugin/hooks/check-post-merge-closeout.py'
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(os.environ['CHECKER_SOURCE'], target)
elif name == 'mktemp':
    print(os.environ['FAKE_GATE'])
'''
        for name in ['git', 'pnpm', 'gh', 'mktemp']:
            path = fake_bin / name
            path.write_text(stub.replace('#!PYTHON', '#!' + sys.executable))
            path.chmod(0o755)
        for invalid in [True, False]:
            with self.subTest(invalid=invalid):
                d, assessment = self.lifecycle()
                future = datetime.now(timezone.utc) + timedelta(days=7)
                d['retention']['expires_at'] = future.isoformat()
                assessment['fixtures'][0]['valid_until'] = future.isoformat()
                assessment['fixtures'][0]['known_transitions'][0]['at'] = (
                    future - timedelta(seconds=1) if invalid else future).isoformat()
                self.save_lifecycle(d, assessment)
                d['state'] = 'pending'; del d['handoff']; self.write(d)
                calls.write_text('')
                env = {**self.env, 'PATH': str(fake_bin) + ':' + os.environ['PATH'],
                       'TASK': str(self.task), 'CALL_LOG': str(calls),
                       'FAKE_GATE': str(gate), 'CHECKER_SOURCE': str(SCRIPT)}
                result = subprocess.run(['bash', '-c', recipe], cwd=self.task, env=env,
                                        capture_output=True, text=True)
                commands = [json.loads(line) for line in calls.read_text().splitlines()]
                publishes = [c for c in commands if c[:3] == ['gh', 'issue', 'comment']]
                boards = [c for c in commands if c[0] == 'pnpm' and any(x.endswith('/board.ts') for x in c)]
                if invalid:
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('known fixture transition', result.stdout)
                    self.assertEqual(publishes, []); self.assertEqual(boards, [])
                else:
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertIn('ready-to-handoff', result.stdout)
                    self.assertEqual(len(publishes), 1); self.assertEqual(len(boards), 1)

    def test_401_clean_git_smoke_pass_without_handoff_cannot_stop(self):
        # This reproduces the original silent bypass, without mocking git or the Stop hook.
        self.write({'version': 1, 'task_dir': str(self.task), 'goal': 'pm-handoff', 'state': 'pending',
                    'smoke': {'result': 'pass'}, 'board_status': 'Review'})
        self.binding()
        subprocess.run(['git', '-C', str(self.task), 'add', '.'], check=True)
        subprocess.run(['git', '-C', str(self.task), '-c', 'user.name=QA', '-c',
                        'user.email=qa@example.org', 'commit', '-qm', 'fixture'], check=True)
        result = subprocess.run(['bash', str(STOP)], input=json.dumps({'cwd': str(self.task),
            'session_id': 'session-401'}), env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn('closeout', result.stderr.lower())

    def test_dirty_git_allowed_stop_has_one_official_json_object_on_stdout(self):
        self.write(self.complete()); self.binding()
        result = subprocess.run(['bash', str(STOP)], input=json.dumps({'cwd': str(self.task),
            'session_id': 'session-401'}), env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        message = json.loads(result.stdout)
        self.assertEqual(set(message), {'systemMessage'})
        self.assertIn('handed-off', message['systemMessage'])
        self.assertIn('變更統計', json.loads(result.stdout)['systemMessage'])
        self.assertIn('檔案就緒清單', json.loads(result.stdout)['systemMessage'])

    def test_unbound_dirty_git_stop_does_not_emit_plaintext_stdout(self):
        self.evidence('work.txt', 'Unrelated development work')
        result = subprocess.run(['bash', str(STOP)], input=json.dumps({'cwd': str(self.task),
            'session_id': 'unbound-session'}), env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(set(json.loads(result.stdout)), {'systemMessage'})
        self.assertIn('變更統計', json.loads(result.stdout)['systemMessage'])

    def test_heading_notes_cannot_hide_later_steps(self):
        self.assertEqual(self.checker().draft_steps('## 驗收步驟\n1.A\n- 說明\n  2.B\n## Evidence\n'), ['1', '2'])
        fixture = SCRIPT.parents[2] / 'bin/pipeline/__tests__/fixtures/acceptance/370-fixed.md'
        self.assertEqual(self.checker().draft_steps(fixture.read_text()), ['1', '2', '3', '4', '5'])

    def test_draft_cannot_name_different_accounts_or_fixtures(self):
        for old in ['pm@example.org', 'https://app-dev.daodao.so/practices/401']:
            d = self.complete()
            text = (self.task / d['plan']['draft']['path']).read_text().replace(old, old + '-other')
            # Replace with entirely different identity, not a containing literal.
            text = text.replace(old + '-other', 'different@example.net' if '@' in old else 'https://app-dev.daodao.so/practices/999')
            d['plan']['draft'] = self.evidence('notes/handoff.md', text)
            for key in ['replay', 'lint', 'handoff']:
                item = json.loads((self.task / d[key]['path']).read_text())
                item['draft_sha256'] = d['plan']['draft']['sha256']
                d[key] = self.evidence(d[key]['path'], item)
            self.assertIn('planned PM accounts and fixture URLs must appear literally in the frozen draft', self.validate(d)[1])

    def test_draft_identity_tokens_require_complete_boundaries(self):
        for original, replacement in [
                ('pm@example.org', 'pm@example.org.other'),
                ('pm@example.org', 'other-pm@example.org'),
                ('pm@example.org', 'other*pm@example.org'),
                ('pm@example.org', '**other*pm@example.org**'),
                ('pm@example.org', '__other_pm@example.org__'),
                ('https://app-dev.daodao.so/practices/401', 'https://app-dev.daodao.so/practices/4010'),
                ('https://app-dev.daodao.so/practices/401', 'https://app-dev.daodao.so/practices/401/other')]:
            with self.subTest(replacement=replacement):
                d = self.complete()
                text = (self.task / d['plan']['draft']['path']).read_text().replace(original, replacement)
                d['plan']['draft'] = self.evidence('notes/handoff.md', text)
                for key in ['replay', 'lint', 'handoff']:
                    item = json.loads((self.task / d[key]['path']).read_text())
                    item['draft_sha256'] = d['plan']['draft']['sha256']
                    d[key] = self.evidence(d[key]['path'], item)
                self.assertIn('planned PM accounts and fixture URLs must appear literally in the frozen draft', self.validate(d)[1])
        for rendered in ['pm@example.org https://app-dev.daodao.so/practices/401',
                         '**pm@example.org** https://app-dev.daodao.so/practices/401',
                         '__pm@example.org__ https://app-dev.daodao.so/practices/401',
                         '*pm@example.org* https://app-dev.daodao.so/practices/401',
                         '_pm@example.org_ https://app-dev.daodao.so/practices/401',
                         '`pm@example.org` [fixture](https://app-dev.daodao.so/practices/401)',
                         '帳號：pm@example.org，入口：https://app-dev.daodao.so/practices/401。']:
            d = self.complete()
            text = rendered + '\n## 驗收步驟\n1. Read\n2. Edit\n'
            d['plan']['draft'] = self.evidence('notes/handoff.md', text)
            for key in ['replay', 'lint', 'handoff']:
                item = json.loads((self.task / d[key]['path']).read_text())
                item['draft_sha256'] = d['plan']['draft']['sha256']
                d[key] = self.evidence(d[key]['path'], item)
            self.assertEqual(self.validate(d), ('handed-off', []))

    def test_blocked_stop_requires_new_attempt_each_time(self):
        d = self.blocked(); self.write(d); self.binding()
        self.assertEqual(self.run_cli('stop').returncode, 0)
        self.assertEqual(self.run_cli('stop').returncode, 2)
        d['blocker']['observed_at'] = datetime.now(timezone.utc).isoformat()
        self.write(d)
        self.assertEqual(self.run_cli('stop').returncode, 2)
        d['blocker']['attempts'][0]['observed_at'] = d['blocker']['observed_at']
        d['blocker']['attempts'][0]['evidence'] = self.evidence('evidence/fresh.json', {'observed_at': d['blocker']['observed_at'], 'http_status': 502})
        self.write(d)
        self.assertEqual(self.run_cli('stop').returncode, 0)

    def test_complete_evidence_chain_passes_and_tamper_fails(self):
        d = self.complete()
        self.assertEqual(self.validate(d), ('handed-off', []))
        (self.task / 'notes/handoff.md').write_text('Different steps')
        self.assertNotEqual(self.validate(d)[1], [])

    def test_failed_merge_deployment_or_smoke_cannot_hide_behind_valid_hash(self):
        for stage, content in [('merged', {'merged': False}),
                               ('deployed', {'environment': 'production', 'revision': 'abc'}),
                               ('deployed', {'environment': 'dev', 'revision': ''}),
                               ('smoke', {'result': 'failed'})]:
            with self.subTest(stage=stage, content=content):
                d = self.complete()
                d[stage] = self.evidence('evidence/' + stage + '.json', content)
                self.assertTrue(self.validate(d)[1])

    def test_false_restoration_and_missing_per_step_proof_fail(self):
        d = self.complete()
        restore = json.loads((self.task / d['restore']['path']).read_text())
        restore['evidence'] = self.evidence('evidence/actual.json', {'resources': ['wrong']})
        d['restore'] = self.evidence('evidence/restore.json', restore)
        self.assertTrue(self.validate(d)[1])
        d = self.complete()
        replay = json.loads((self.task / d['replay']['path']).read_text())
        del replay['steps'][0]['evidence']
        d['replay'] = self.evidence('evidence/replay.json', replay)
        self.assertTrue(self.validate(d)[1])

    def test_engineering_api_cannot_substitute_for_pm_replay(self):
        d = self.complete()
        replay = json.loads((self.task / d['replay']['path']).read_text())
        replay['kind'] = 'engineering-api-smoke'
        d['replay'] = self.evidence('evidence/replay.json', replay)
        self.assertTrue(self.validate(d)[1])

    def test_account_fixture_draft_and_step_binding_are_enforced(self):
        for field, value in [('accounts', ['engineer@example.org']), ('fixtures', ['https://app-dev.daodao.so/practices/other']),
                             ('draft_sha256', '0' * 64), ('steps', [])]:
            with self.subTest(field=field):
                d = self.complete()
                replay = json.loads((self.task / d['replay']['path']).read_text())
                replay[field] = value
                d['replay'] = self.evidence('evidence/replay.json', replay)
                self.assertTrue(self.validate(d)[1])

    def test_omitting_same_step_from_plan_and_replay_cannot_bypass_real_draft(self):
        d = self.complete()
        d['plan']['steps'] = ['1']
        del d['plan']['step_contexts']['2']
        replay = json.loads((self.task / d['replay']['path']).read_text())
        replay['steps'] = replay['steps'][:1]
        d['replay'] = self.evidence('evidence/replay.json', replay)
        self.assertTrue(self.validate(d)[1])

    def test_only_dedicated_pm_step_section_counts_and_must_be_unambiguous(self):
        checker = self.checker()
        for heading in ['## 驗收步驟', '- 驗收步驟（只看畫面）：']:
            text = '## 工程證據\n1. Unit test\n2. Curl\n' + heading + '\n1. Screen A\n2. Screen B\n' + ('## 工程證據' if heading.startswith('#') else '- 對照的 AC：TP-001') + '\n1. More engineering evidence\n'
            self.assertEqual(checker.draft_steps(text), ['1', '2'])
        for text in ['## Other\n1. Not a PM step\n',
                     '## 驗收步驟\n1. A\n1. B\n',
                     '## 驗收步驟\n1. A\n## 驗收步驟\n2. B\n',
                     '```\n## 驗收步驟\n1. Hidden example\n```',
                     '## 驗收步驟\n1. A\nB. Unknown step format\n']:
            with self.subTest(text=text), self.assertRaises(ValueError):
                checker.draft_steps(text)

    def test_indented_pm_numbered_steps_are_never_silently_omitted(self):
        checker = self.checker()
        for indent in [' ', '  ', '   ', '    ', '\t']:
            with self.subTest(indent=repr(indent)):
                self.assertEqual(checker.draft_steps('## 驗收步驟\n1. A\n' + indent + '2. B\n'), ['1', '2'])

    def test_fences_match_marker_and_length_and_are_forbidden_inside_pm_steps(self):
        checker = self.checker()
        self.assertEqual(checker.draft_steps('```python\n~~~\n## 驗收步驟\n1. Hidden\n```\n## 驗收步驟\n1. Visible\n'), ['1'])
        self.assertEqual(checker.draft_steps('````\n```\n## 驗收步驟\n1. Hidden\n````\n## 驗收步驟\n1. Visible\n'), ['1'])
        for text in ['```\n~~~\n## 驗收步驟\n1. Fake visible\n',
                     '````\n```\n## 驗收步驟\n1. Still fenced\n',
                     '## 驗收步驟\n1. A\n```\n2. B\n```\n',
                     '## 驗收步驟\n1. A\n~~~\n2. B\n~~~\n']:
            with self.subTest(text=text), self.assertRaises(ValueError):
                checker.draft_steps(text)

    def test_empty_expected_and_restored_baselines_do_not_prove_fixture_facts(self):
        d = self.complete()
        d['plan']['baseline'] = self.evidence('evidence/baseline.json', {})
        restore = json.loads((self.task / d['restore']['path']).read_text())
        restore['baseline_sha256'] = d['plan']['baseline']['sha256']
        restore['evidence'] = self.evidence('evidence/restored.json', {})
        d['restore'] = self.evidence('evidence/restore.json', restore)
        self.assertTrue(self.validate(d)[1])

    def test_step_account_or_fixture_swap_cannot_hide_inside_same_global_sets(self):
        for field in ['account', 'fixture']:
            d = self.complete()
            accounts = ['pm@example.org', 'second-pm@example.org']
            fixtures = ['https://app-dev.daodao.so/practices/401', 'https://app-dev.daodao.so/practices/402']
            d['plan'].update(accounts=accounts, fixtures=fixtures,
                step_contexts={str(i + 1): {'account': accounts[i], 'fixture': fixtures[i]} for i in range(2)})
            replay = json.loads((self.task / d['replay']['path']).read_text())
            restore = json.loads((self.task / d['restore']['path']).read_text())
            for item in [replay, restore]: item.update(accounts=accounts, fixtures=fixtures)
            for i, step in enumerate(replay['steps']):
                step.update(account=accounts[i], fixture=fixtures[i])
            d['retention']['fixtures'] = [{'url': x, 'retained': True} for x in fixtures]
            draft = self.evidence('notes/handoff.md', '\n'.join(accounts + fixtures) + '\n## 驗收步驟\n1. Read\n2. Edit\n')
            d['plan']['draft'] = draft
            replay['draft_sha256'] = draft['sha256']
            for key in ['lint', 'handoff']:
                item = json.loads((self.task / d[key]['path']).read_text())
                item['draft_sha256'] = draft['sha256']
                d[key] = self.evidence(d[key]['path'], item)
            d['replay'] = self.evidence('evidence/replay.json', replay)
            d['restore'] = self.evidence('evidence/restore.json', restore)
            self.assertEqual(self.validate(d), ('handed-off', []))
            replay['steps'][0][field], replay['steps'][1][field] = replay['steps'][1][field], replay['steps'][0][field]
            d['replay'] = self.evidence('evidence/replay.json', replay)
            self.assertTrue(self.validate(d)[1], field)

    def with_fixture(self, url):
        """Rebind the single planned fixture everywhere (draft, plan, replay, restore, retention)."""
        old = 'https://app-dev.daodao.so/practices/401'
        d = self.complete()
        draft = self.evidence('notes/handoff.md', (self.task / d['plan']['draft']['path']).read_text().replace(old, url))
        d['plan'].update(draft=draft, fixtures=[url],
                         step_contexts={k: {**v, 'fixture': url} for k, v in d['plan']['step_contexts'].items()})
        replay = json.loads((self.task / d['replay']['path']).read_text())
        replay.update(fixtures=[url], draft_sha256=draft['sha256'])
        for step in replay['steps']:
            step['fixture'] = url
        d['replay'] = self.evidence('evidence/replay.json', replay)
        restore = json.loads((self.task / d['restore']['path']).read_text())
        restore['fixtures'] = [url]
        d['restore'] = self.evidence('evidence/restore.json', restore)
        d['retention']['fixtures'] = [{'url': url, 'retained': True}]
        for key in ['lint', 'handoff']:
            item = json.loads((self.task / d[key]['path']).read_text())
            item['draft_sha256'] = draft['sha256']
            d[key] = self.evidence(d[key]['path'], item)
        return d

    def test_admin_dev_backoffice_fixture_is_a_deployed_dev_surface(self):
        # #451/#463: PM steps that happen in the dev admin back office must not force an incomplete receipt.
        self.assertEqual(self.validate(self.with_fixture('https://admin-dev.daodao.so/admin/feedback?id=13')), ('handed-off', []))

    def test_production_or_lookalike_fixture_hosts_are_rejected(self):
        for url in ['https://app.daodao.so/practices/401', 'https://admin.daodao.so/admin/feedback',
                    'http://admin-dev.daodao.so/admin/feedback', 'https://admin-dev.daodao.so.evil.example/admin',
                    'https://server-dev.daodao.so/api/v1/feedback/mine', 'https://evil-admin-dev.daodao.so/admin']:
            with self.subTest(url=url):
                self.assertIn('PM fixture URL must use the deployed dev product', self.validate(self.with_fixture(url))[1])

    def test_missing_or_extra_planned_step_context_is_rejected(self):
        for change in ['missing', 'extra']:
            d = self.complete()
            if change == 'missing': del d['plan']['step_contexts']['2']
            else: d['plan']['step_contexts']['3'] = d['plan']['step_contexts']['1']
            self.assertTrue(self.validate(d)[1])

    def test_restore_after_replay_and_exact_baseline_required(self):
        for field, value in [('observed_at', '2026-11-06T00:00:00Z'), ('baseline_sha256', '0' * 64), ('result', 'failed')]:
            d = self.complete()
            restore = json.loads((self.task / d['restore']['path']).read_text())
            restore[field] = value
            d['restore'] = self.evidence('evidence/restore.json', restore)
            self.assertTrue(self.validate(d)[1])

    def test_deleted_expired_or_missing_reset_fixture_is_incomplete(self):
        for change in ['deleted', 'expired', 'reset']:
            d = self.complete()
            if change == 'deleted': d['retention']['fixtures'][0]['retained'] = False
            elif change == 'expired': d['retention']['expires_at'] = '2026-11-05T00:00:00Z'
            else: del d['retention']['reset']
            self.assertTrue(self.validate(d)[1])

    def test_installed_plugin_uses_bound_task_monorepo_pm_config(self):
        import shutil
        d = self.complete()
        config = self.task.parent / 'bin/pipeline/types.ts'
        config.parent.mkdir(parents=True)
        config.write_text('export const PM_LOGIN = "peggy1213-create";')
        installed = self.task.parent / 'plugin-cache/version/hooks/check-post-merge-closeout.py'
        installed.parent.mkdir(parents=True)
        shutil.copy2(SCRIPT, installed)
        self.write(d)
        spec = importlib.util.spec_from_file_location('installed_closeout', installed)
        checker = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(checker)
        self.assertEqual(checker.validate(self.receipt, now=NOW), ('handed-off', []))
        config.write_text('export const PM_LOGIN = "another-pm";')
        self.assertTrue(checker.validate(self.receipt, now=NOW)[1])

    def test_rehandoff_requires_pm_assignment_and_cleared_blocker(self):
        for fields in [{'assignees': []}, {'labels': ['acceptance:blocked']}, {'labels': None}, {'labels': [{'name': 'acceptance:blocked'}]}, {'pm_login': 'vincentxuu', 'assignees': ['vincentxuu']}, {'board_status': 'Need Fix'}]:
            with self.subTest(fields=fields):
                d = self.complete()
                remote = json.loads((self.task / d['handoff']['path']).read_text())
                remote.update(fields)
                d['handoff'] = self.evidence('evidence/remote.json', remote)
                self.assertTrue(self.validate(d)[1])

    def test_remote_review_is_not_acceptance_and_lint_must_match_draft(self):
        d = self.complete()
        remote = json.loads((self.task / d['handoff']['path']).read_text())
        remote['board_status'] = 'Review'
        d['handoff'] = self.evidence('evidence/remote.json', remote)
        self.assertTrue(self.validate(d)[1])
        d = self.complete()
        d['lint'] = self.evidence('evidence/lint.json', {'draft_sha256': '0' * 64, 'exit_code': 0, 'observed_at': '2026-11-06T00:59:00Z'})
        self.assertTrue(self.validate(d)[1])

    def test_lint_must_pass_before_freezing_and_replaying_the_same_draft(self):
        for observed_at in [None, '2026-11-06T01:05:00Z', '2026-11-06T01:11:00Z']:
            d = self.complete()
            lint = json.loads((self.task / d['lint']['path']).read_text())
            lint['observed_at'] = observed_at
            d['lint'] = self.evidence('evidence/lint.json', lint)
            self.assertTrue(self.validate(d)[1], observed_at)

    def blocked(self):
        return {'version': 1, 'task_dir': str(self.task), 'issue': 'https://github.com/daodaoedu/daodao/issues/401',
                'goal': 'pm-handoff', 'state': 'blocked', 'last_begin_at': '2026-11-06T00:59:00Z',
                'blocker': {'kind': 'maintenance',
                'observed_at': '2026-11-06T01:00:00Z',
                'why_ai_cannot_resolve': 'Another authorized task stopped writers for migration; restarting old code is unsafe',
                'resume_condition': 'New writer deployed, readonly off and readiness200', 'next_action': 'Resume same-account replay',
                'attempts': [{'observed_at': '2026-11-06T01:00:00Z', 'action': 'Read readiness and maintenance manifest', 'result': 'failed',
                              'evidence': self.evidence('evidence/502.json', {'observed_at': '2026-11-06T01:00:00Z', 'http_status': 502, 'writers': 'stopped'})}]}}

    def test_external_blocker_is_not_completion_but_can_end_this_turn(self):
        d = self.blocked()
        self.assertEqual(self.validate(d), ('blocked', []))
        self.write(d); binding = self.binding()
        self.assertEqual(self.run_cli('check', '--receipt', str(self.receipt)).returncode, 3)
        stopped = self.run_cli('stop', input_text=json.dumps({'session_id': 'session-401'}))
        self.assertEqual(stopped.returncode, 0, stopped.stderr)
        self.assertIn('blocked', stopped.stdout)
        self.assertTrue(binding.exists())
        d['state'] = 'pending'
        self.write(d)
        self.assertEqual(self.run_cli('stop', input_text=json.dumps({'session_id': 'session-401'})).returncode, 2)
        self.assertTrue(binding.exists())

    def test_resumed_session_cannot_reuse_old_blocker_observation(self):
        d = self.blocked()
        d['blocker']['observed_at'] = '2000-01-01T00:00:00Z'
        self.write(d)
        before = json.loads(self.receipt.read_text())
        started = self.run_cli('begin', '--task-dir', str(self.task), '--issue', d['issue'])
        self.assertEqual(started.returncode, 0, started.stderr)
        after = json.loads(self.receipt.read_text())
        self.assertNotEqual(after.pop('last_begin_at'), before.pop('last_begin_at'))
        self.assertEqual(after, before)
        result = self.run_cli('stop', input_text=json.dumps({'session_id': 'session-401'}))
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('recheck external blocker', result.stderr)
        self.assertTrue(self.binding_path().exists())

    def test_unbound_resume_also_requires_a_fresh_external_observation(self):
        d = self.blocked()
        d.update(last_begin_at='2000-01-01T00:00:00Z')
        d['blocker']['observed_at'] = '2000-01-01T00:01:00Z'
        d['blocker']['attempts'][0]['observed_at'] = d['blocker']['observed_at']
        d['blocker']['attempts'][0]['evidence'] = self.evidence('evidence/old.json', {'observed_at': d['blocker']['observed_at'], 'http_status': 502})
        self.assertEqual(self.validate(d), ('blocked', []))
        result = self.run_cli('begin', '--task-dir', str(self.task), '--issue', d['issue'], '--no-bind')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.binding_path().exists())
        self.assertEqual(self.run_cli('check', '--receipt', str(self.receipt)).returncode, 1)
        current = json.loads(self.receipt.read_text())
        current['blocker']['observed_at'] = datetime.now(timezone.utc).isoformat()
        current['blocker']['attempts'][0]['observed_at'] = current['blocker']['observed_at']
        current['blocker']['attempts'][0]['evidence'] = self.evidence('evidence/current-502.json', {'observed_at': current['blocker']['observed_at'], 'http_status': 502, 'writers': 'still stopped'})
        self.write(current)
        self.assertEqual(self.run_cli('check', '--receipt', str(self.receipt)).returncode, 3)

    def test_missing_binding_activation_time_fails_closed(self):
        self.write(self.blocked())
        p = self.binding()
        p.write_text(json.dumps({'receipt': str(self.receipt)}))
        result = self.run_cli('stop', input_text=json.dumps({'session_id': 'session-401'}))
        self.assertEqual(result.returncode, 2)

    def test_missing_fixture_is_not_external_blocker(self):
        d = self.blocked(); d['blocker']['kind'] = 'fixture-not-prepared'
        self.assertTrue(self.validate(d)[1])
        d = self.blocked(); d['blocker']['attempts'] = []
        self.assertTrue(self.validate(d)[1])

    def test_only_bound_session_is_checked_and_bad_binding_fails_closed(self):
        self.assertEqual(self.run_cli('stop', input_text=json.dumps({'session_id': 'other'})).returncode, 0)
        p = self.binding(); p.write_text('{broken')
        self.assertEqual(self.run_cli('stop', input_text=json.dumps({'session_id': 'session-401'})).returncode, 2)
        p.write_text(json.dumps({'receipt': str(self.task / 'missing.json')}))
        self.assertEqual(self.run_cli('stop', input_text=json.dumps({'session_id': 'session-401'})).returncode, 2)

    def test_begin_resume_does_not_overwrite_existing_receipt(self):
        result = self.run_cli('begin', '--task-dir', str(self.task), '--issue', 'https://github.com/daodaoedu/daodao/issues/401')
        self.assertEqual(result.returncode, 0, result.stderr)
        d = json.loads(self.receipt.read_text()); d['marker'] = 'keep'
        self.write(d)
        self.assertEqual(self.run_cli('begin', '--task-dir', str(self.task), '--issue', d['issue']).returncode, 0)
        self.assertEqual(json.loads(self.receipt.read_text())['marker'], 'keep')

    def test_explicit_user_release_preserves_incomplete_receipt_and_other_sessions(self):
        self.write({'version': 1, 'task_dir': str(self.task), 'goal': 'pm-handoff', 'state': 'pending'})
        before = self.receipt.read_bytes()
        own = self.binding()
        other = own.with_name(hashlib.sha256(b'other-session').hexdigest() + '.json')
        other.write_text(json.dumps({'receipt': '/some/other/task/receipt.json'}))
        self.evidence('notes/user-stop.txt', 'User: pause this task now; finish the handoff later.')
        result = self.run_cli('release', '--reason', 'Explicit user pause', '--evidence', 'notes/user-stop.txt')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(own.exists()); self.assertTrue(other.exists())
        self.assertEqual(self.receipt.read_bytes(), before)
        audit = json.loads(Path(json.loads(result.stdout)['audit']).read_text())
        self.assertFalse(audit['completed'])
        self.assertEqual(self.run_cli('check', '--receipt', str(self.receipt)).returncode, 1)

    def test_release_without_task_owned_directive_keeps_binding(self):
        self.write({'state': 'pending'}); binding = self.binding()
        result = self.run_cli('release', '--reason', 'Convenience', '--evidence', '../outside.txt')
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(binding.exists())

    def test_no_bind_client_requires_manual_check_and_no_other_task_registration(self):
        result = self.run_cli('begin', '--task-dir', str(self.task), '--issue', 'https://github.com/daodaoedu/daodao/issues/401', '--no-bind')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(json.loads(result.stdout)['session_bound'])
        self.assertEqual(self.run_cli('check', '--receipt', str(self.receipt)).returncode, 1)
        self.assertEqual(self.run_cli('stop', input_text=json.dumps({'session_id': 'session-401'})).returncode, 0)

    def test_evidence_cannot_escape_task_or_use_symlink(self):
        d = self.complete(); outside = Path(self.tmp.name) / 'outside.txt'; outside.write_text('private')
        (self.task / 'evidence/link').symlink_to(outside)
        d['smoke'] = {'path': 'evidence/link', 'sha256': hashlib.sha256(outside.read_bytes()).hexdigest()}
        self.assertTrue(self.validate(d)[1])


if __name__ == '__main__':
    unittest.main()
