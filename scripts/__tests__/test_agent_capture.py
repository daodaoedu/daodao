"""Native capture integration; macOS requires watchdog, Linux uses inotify."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest


WATCHER = Path(__file__).resolve().parents[2] / 'plugin/hooks/record-agent-writes.py'


class CaptureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if sys.platform not in ('darwin', 'linux'):
            raise RuntimeError('Run native integration on a macOS or Linux runner')

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.name', 'Capture Test')
        self.git('config', 'user.email', 'capture@example.invalid')
        for name in ('restored.txt', 'rename.txt', 'delete.txt'):
            (self.repo / name).write_text('original\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'base')
        self.output = self.root / 'trace.json'

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], text=True).strip()

    def command(self, body):
        script = self.root / 'work.sh'
        script.write_text('set -eu\n' + body)
        return [sys.executable, str(WATCHER), '--repo', str(self.repo),
                '--output', str(self.output), '--', 'bash', str(script)]

    def assert_capture(self, result):
        if sys.platform == 'linux':
            return self.assert_linux_capture(result)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        data = json.loads(self.output.read_text())
        self.assertEqual(data['coverage'], 'monitored-repo-window')
        self.assertEqual(data['source'], 'filesystem-observer')
        self.assertEqual(data['backend'], 'FSEvents')
        self.assertEqual(data['errors'], [])
        self.assertEqual(data['head_revision'], self.git('rev-parse', 'HEAD'))
        raw = (self.output.parent / data['journal_ref']).read_bytes()
        self.assertEqual(data['journal_sha256'], hashlib.sha256(raw).hexdigest())
        entries = [json.loads(line) for line in raw.splitlines()]
        self.assertTrue(entries, 'capture must contain independently recorded events')
        return data, {p for e in data['events'] for p in e['targets']}

    def assert_linux_capture(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        data = json.loads(self.output.read_text())
        self.assertEqual(data['coverage'], 'monitored-repo-window')
        self.assertEqual(data['source'], 'filesystem-observer')
        self.assertEqual(data['backend'], 'inotify')
        self.assertEqual(data['errors'], [])
        self.assertEqual(data['head_revision'], self.git('rev-parse', 'HEAD'))
        raw = (self.output.parent / data['journal_ref']).read_bytes()
        self.assertEqual(data['journal_sha256'], hashlib.sha256(raw).hexdigest())
        entries = [json.loads(line) for line in raw.splitlines()]
        self.assertTrue(entries, 'capture must contain independently recorded events')
        return data, {p for e in data['events'] for p in e['targets']}

    def test_bash_heredoc_python_and_restored_write_observed(self):
        body = """cat > heredoc.txt <<'EOF'
heredoc content
EOF
""" + f"""'{sys.executable}' - <<'PYWORK'
from pathlib import Path
Path('python.txt').write_text('Python content')
Path('restored.txt').write_text('temporary content')
PYWORK
sleep 1.3
git restore restored.txt
sleep 1.3
"""
        result = subprocess.run(self.command(body), capture_output=True, text=True, timeout=35)
        _, targets = self.assert_capture(result)
        self.assertTrue({'heredoc.txt', 'python.txt', 'restored.txt'}.issubset(targets), targets)
        self.assertNotIn('restored.txt', self.git('diff', '--name-only').splitlines())
        self.assertEqual((self.repo / 'restored.txt').read_text(), 'original\n')

    def test_existing_nested_directory_write_observed(self):
        nested = self.repo / 'existing' / 'nested'
        nested.mkdir(parents=True)
        (nested / 'source.txt').write_text('base\n')
        self.git('add', 'existing')
        self.git('commit', '-qm', 'existing directory')
        result = subprocess.run(self.command("printf changed > existing/nested/source.txt\nsleep 1.3\n"),
                                capture_output=True, text=True, timeout=35)
        _, targets = self.assert_capture(result)
        self.assertIn('existing/nested/source.txt', targets)

    def test_rename_both_names_and_delete_observed(self):
        result = subprocess.run(self.command('mv rename.txt renamed.txt\nsleep 1.3\nrm delete.txt\nsleep 1.3\n'),
                                capture_output=True, text=True, timeout=35)
        _, targets = self.assert_capture(result)
        self.assertTrue({'rename.txt', 'renamed.txt', 'delete.txt'}.issubset(targets), targets)

    def test_dirty_start_and_internal_output_rejected(self):
        (self.repo / 'restored.txt').write_text('preexisting write')
        result = subprocess.run(self.command('touch must-not-run.txt\n'), capture_output=True, text=True, timeout=35)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn('cannot reconstruct previous edits', result.stderr)
        self.assertFalse(self.output.exists())
        self.assertFalse((self.repo / 'must-not-run.txt').exists())
        self.git('restore', 'restored.txt')
        self.output = self.repo / 'forbidden-trace.json'
        result = subprocess.run(self.command('touch must-not-run.txt\n'), capture_output=True, text=True, timeout=35)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn('outside monitored repo', result.stderr)
        self.assertFalse(self.output.exists())
        self.assertFalse((self.repo / 'must-not-run.txt').exists())

    def test_stop_file_monitor_ready_before_external_write(self):
        stop = self.root / 'stop'
        proc = subprocess.Popen([sys.executable, str(WATCHER), '--repo', str(self.repo),
                                 '--output', str(self.output), '--stop-file', str(stop)],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            deadline = time.monotonic() + 15
            ready = self.output.with_suffix('.json.ready.json')
            while not ready.exists() and proc.poll() is None and time.monotonic() < deadline:
                time.sleep(0.1)
            self.assertTrue(ready.exists(), 'monitor did not signal native readiness')
            (self.repo / 'external.txt').write_text('write after ready\n')
            time.sleep(1.3)
            stop.touch()
            out, err = proc.communicate(timeout=20)
            _, targets = self.assert_capture(subprocess.CompletedProcess(proc.args, proc.returncode, out, err))
            self.assertIn('external.txt', targets)
        finally:
            if proc.poll() is None:
                proc.terminate()
                proc.communicate(timeout=10)


if __name__ == '__main__':
    unittest.main()
