"""Linux-native integration and explicit decoder fault injection (not kernel overflow proof)."""
import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest import mock

MODULE = Path(__file__).resolve().parents[2] / 'plugin/hooks/linux-agent-observer.py'


class LinuxObserverTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if sys.platform != 'linux':
            raise RuntimeError('Run Linux observer tests on the dedicated Linux runner')
        spec = importlib.util.spec_from_file_location('linux_agent_observer', MODULE)
        cls.native = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.native)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name) / 'repo'
        self.repo.mkdir()
        self.failures = []
        self.events = []
        class Handler:
            def on_any_event(_, event):
                self.events.append(event)
        self.observer = self.native.LinuxObserver(Handler(), self.repo, self.failures)
        self.addCleanup(self.stop)

    def stop(self):
        if self.observer.ident is not None:
            self.observer.stop()
            self.observer.join(5)
            self.assertFalse(self.observer.is_alive())

    def wait_for(self, predicate):
        deadline = time.monotonic() + 5
        while not predicate() and time.monotonic() < deadline:
            time.sleep(0.02)
        self.assertTrue(predicate(), (self.failures, self.events))

    def test_overflow_decoder_marks_lost_events_without_fabricating_targets(self):
        self.observer._event(-1, self.native.IN_Q_OVERFLOW, 0, '')
        self.assertTrue(any('overflow' in e for e in self.failures))
        self.assertEqual(self.events, [])

    def test_real_kernel_queue_overflow_is_reported(self):
        limit = int(Path('/proc/sys/fs/inotify/max_queued_events').read_text())
        self.assertLessEqual(limit, 1048576, 'runner queue exceeds bounded overflow test budget')
        self.observer.fd = self.observer.libc.inotify_init1(os.O_NONBLOCK | os.O_CLOEXEC)
        self.assertGreaterEqual(self.observer.fd, 0)
        try:
            self.observer._watch_tree(self.repo)
            # No reader runs while the real kernel queue fills. Each unique
            # create/unlink pair emits multiple events and cannot coalesce.
            for index in range(limit // 3 + 2):
                path = self.repo / f'overflow-{index}'
                fd = os.open(path, os.O_CREAT | os.O_WRONLY, 0o600)
                os.close(fd)
                path.unlink()
            while True:
                try:
                    raw = os.read(self.observer.fd, 262144)
                except BlockingIOError:
                    break
                self.observer._consume(raw)
            self.assertTrue(any('event queue overflow' in reason for reason in self.failures), self.failures)
            self.assertTrue(all(Path(event.src_path).name.startswith('overflow-') for event in self.events))
        finally:
            os.close(self.observer.fd)
            self.observer.fd = -1

    def test_truncated_native_event_is_rejected(self):
        with self.assertRaises(ValueError):
            self.observer._consume(b'\x00')
        raw = self.native.HEADER.pack(1, self.native.IN_CREATE, 0, 8) + b'ab'
        with self.assertRaises(ValueError):
            self.observer._consume(raw)

    def test_unexpected_watch_removal_marks_coverage_partial(self):
        self.observer.watches[1] = self.repo
        self.observer._event(1, self.native.IN_IGNORED, 0, '')
        self.assertTrue(any('unexpectedly removed' in e for e in self.failures))
        self.assertNotIn(1, self.observer.watches)

    def test_dead_reader_reports_failure(self):
        with mock.patch.object(self.native.select, 'select', side_effect=OSError('reader fault')):
            self.observer.start()
            self.observer.join(5)
        self.assertFalse(self.observer.is_alive())
        self.assertTrue(any('observer failed: reader fault' in e for e in self.failures))

    def test_remote_filesystem_rejected(self):
        mountinfo = '1 0 0:1 / / rw - nfs server:/repo rw\n'
        with mock.patch.object(Path, 'read_text', side_effect=lambda path: 'mnt_id: 1\n' if str(path).startswith('/proc/self/fdinfo/') else mountinfo, autospec=True):
            with self.assertRaisesRegex(ValueError, 'found nfs'):
                self.native.require_local_filesystem(self.repo)

    def test_stacked_mount_uses_actual_directory_mount_id(self):
        mountinfo = '1 0 0:1 / / rw - ext4 device rw\n2 0 0:2 / / rw - nfs server:/repo rw\n'
        with mock.patch.object(Path, 'read_text', side_effect=lambda path: 'mnt_id: 2\n'
                               if str(path).startswith('/proc/self/fdinfo/') else mountinfo, autospec=True):
            with self.assertRaisesRegex(ValueError, 'found nfs'):
                self.native.require_local_filesystem(self.repo)

    def test_startup_failure_writes_partial_trace_and_does_not_launch_child(self):
        import json
        import subprocess
        from types import SimpleNamespace
        spec = importlib.util.spec_from_file_location('recorder', MODULE.with_name('record-agent-writes.py'))
        recorder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(recorder)
        for args in [('init', '-q'), ('config', 'user.name', 'Trace Test'),
                     ('config', 'user.email', 'trace@example.invalid')]:
            subprocess.run(['git', '-C', str(self.repo), *args], check=True, capture_output=True)
        (self.repo / 'baseline.txt').write_text('base')
        subprocess.run(['git', '-C', str(self.repo), 'add', '.'], check=True)
        subprocess.run(['git', '-C', str(self.repo), 'commit', '-qm', 'base'], check=True)
        class RejectedObserver:
            def __init__(_, *args):
                pass
            def start(_):
                raise ValueError('inotify requires supported local filesystem; found nfs')
            def stop(_):
                pass
            def is_alive(_):
                return False
        backend = SimpleNamespace(LinuxObserver=RejectedObserver)
        fake_spec = SimpleNamespace(loader=SimpleNamespace(exec_module=lambda _: None))
        output = Path(self.temp.name) / 'failed-trace.json'
        with mock.patch.object(recorder.importlib.util, 'spec_from_file_location', return_value=fake_spec), \
             mock.patch.object(recorder.importlib.util, 'module_from_spec', return_value=backend):
            result = recorder.record(self.repo, output, ['sh', '-c', 'touch must-not-run.txt'])
        self.assertEqual(result, 2)
        trace = json.loads(output.read_text())
        self.assertEqual(trace['coverage'], 'partial')
        self.assertTrue(any('found nfs' in reason for reason in trace['errors']))
        self.assertFalse((self.repo / 'must-not-run.txt').exists())
        self.assertFalse(output.with_suffix('.json.ready.json').exists())

    def test_new_directory_is_conservatively_partial(self):
        self.observer.start()
        (self.repo / 'new').mkdir()
        (self.repo / 'new' / 'racy.txt').write_text('may precede watch subscription')
        self.wait_for(lambda: any('directory created' in e for e in self.failures))
        # Do not assert that the initial file write is observed: that race is the reason for partial.

    def test_transient_directory_does_not_stop_later_root_capture(self):
        self.observer.start()
        for index in range(100):
            transient = self.repo / f'transient-{index}'
            transient.mkdir()
            transient.rmdir()
        later = self.repo / 'later.txt'
        later.write_text('write after transient directory')
        self.wait_for(lambda: any(e.src_path == str(later) for e in self.events))
        self.assertTrue(self.observer.is_alive())
        self.assertTrue(any('directory created' in e for e in self.failures))

    def test_moved_in_directory_is_conservatively_partial(self):
        incoming = Path(self.temp.name) / 'incoming'
        incoming.mkdir()
        (incoming / 'source.txt').write_text('written outside watch')
        self.observer.start()
        incoming.rename(self.repo / 'imported')
        self.wait_for(lambda: any('directory moved in' in e for e in self.failures))

    def test_recorder_marks_dynamic_directory_trace_partial(self):
        import json
        import subprocess
        watcher = MODULE.with_name('record-agent-writes.py')
        for args in [('init', '-q'), ('config', 'user.name', 'Trace Test'),
                     ('config', 'user.email', 'trace@example.invalid')]:
            subprocess.run(['git', '-C', str(self.repo), *args], check=True, capture_output=True)
        (self.repo / 'baseline.txt').write_text('base')
        subprocess.run(['git', '-C', str(self.repo), 'add', '.'], check=True)
        subprocess.run(['git', '-C', str(self.repo), 'commit', '-qm', 'base'], check=True)
        output = Path(self.temp.name) / 'trace.json'
        result = subprocess.run([sys.executable, str(watcher), '--repo', str(self.repo),
                                 '--output', str(output), '--', 'sh', '-c',
                                 'mkdir new; echo content > new/source.txt'],
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        trace = json.loads(output.read_text())
        self.assertEqual(trace['coverage'], 'partial')
        self.assertTrue(any('directory created' in reason for reason in trace['errors']))

    def test_non_utf8_filename_round_trips_through_recorder(self):
        import json
        import subprocess
        for args in [('init', '-q'), ('config', 'user.name', 'Trace Test'),
                     ('config', 'user.email', 'trace@example.invalid')]:
            subprocess.run(['git', '-C', str(self.repo), *args], check=True, capture_output=True)
        (self.repo / 'baseline.txt').write_text('base')
        subprocess.run(['git', '-C', str(self.repo), 'add', '.'], check=True)
        subprocess.run(['git', '-C', str(self.repo), 'commit', '-qm', 'base'], check=True)
        output = Path(self.temp.name) / 'trace.json'
        script = "import os; fd=os.open(b'name-\\xff.txt', os.O_WRONLY|os.O_CREAT, 0o600); os.write(fd,b'content'); os.close(fd)"
        result = subprocess.run([sys.executable, str(MODULE.with_name('record-agent-writes.py')),
                                 '--repo', str(self.repo), '--output', str(output), '--',
                                 sys.executable, '-c', script], capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        trace = json.loads(output.read_text())
        self.assertEqual(trace['coverage'], 'monitored-repo-window')
        targets = {target for event in trace['events'] for target in event['targets']}
        self.assertIn(os.fsdecode(b'name-\xff.txt'), targets)

    def test_non_utf8_filename_preserves_native_name(self):
        self.observer.start()
        raw = os.fsencode(self.repo) + b'/name-\xff.txt'
        descriptor = os.open(raw, os.O_CREAT | os.O_WRONLY, 0o600)
        os.write(descriptor, b'content')
        os.close(descriptor)
        expected = os.fsdecode(raw)
        self.wait_for(lambda: any(e.src_path == expected for e in self.events))
        self.assertEqual(self.failures, [])

    def test_existing_nested_directory_rename_and_delete(self):
        nested = self.repo / 'existing' / 'nested'
        nested.mkdir(parents=True)
        original = nested / 'original.txt'
        original.write_text('baseline')
        self.observer.start()
        destination = nested / 'renamed.txt'
        original.rename(destination)
        self.wait_for(lambda: any(e.event_type == 'moved' and e.src_path == str(original)
                                 and e.dest_path == str(destination) for e in self.events))
        destination.unlink()
        self.wait_for(lambda: any(e.event_type == 'deleted' and e.src_path == str(destination)
                                 for e in self.events))
        self.assertEqual(self.failures, [])


if __name__ == '__main__':
    unittest.main()
