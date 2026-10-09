"""Exercise the delivery CLI against real, isolated Git repositories."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


CHECKER = Path(__file__).resolve().parents[2] / 'plugin/hooks/check-agent-delivery.py'


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.name', 'Delivery Test')
        self.git('config', 'user.email', 'delivery@example.invalid')
        (self.repo / 'changed.txt').write_text('before\n')
        self.git('add', 'changed.txt')
        self.git('commit', '-qm', 'base')
        self.base = self.git('rev-parse', 'HEAD').stdout.strip()
        (self.repo / 'changed.txt').write_text('after\n')
        self.git('add', 'changed.txt')
        self.git('commit', '-qm', 'change')
        self.head = self.git('rev-parse', 'HEAD').stdout.strip()
        self.artifact = self.root / 'handoff.json'
        self.trace = self.root / 'trace.json'
        self.data = dict(mode='development', claims=[], questions=[],
                         owned_paths=['changed.txt'], writes=['changed.txt'],
                         recurrences=[], base_revision=self.base,
                         head_revision=self.head)
        self.write_trace(['changed.txt'])

    def git(self, *args):
        return subprocess.run(['git', '-C', str(self.repo), *args],
                              check=True, capture_output=True, text=True)

    def write_trace(self, targets, head=None):
        event = dict(kind='local-write', targets=targets)
        journal = self.root / 'events.jsonl'
        journal.write_text(json.dumps(event) + '\n')
        self.trace.write_text(json.dumps(dict(
            head_revision=head or self.head, start_revision=self.base,
            source='filesystem-observer', coverage='monitored-repo-window', errors=[],
            journal_ref=journal.name, journal_sha256=hashlib.sha256(journal.read_bytes()).hexdigest(),
            events=[event])))
        self.data['trace'] = dict(ref='trace.json', sha256=hashlib.sha256(
            self.trace.read_bytes()).hexdigest())

    def run_gate(self, write_artifact=True, require_trace=True):
        if write_artifact:
            self.artifact.write_text(json.dumps(self.data))
        return subprocess.run([sys.executable, str(CHECKER), '--repo', str(self.repo),
                               '--artifact', str(self.artifact), '--base', self.base]
                              + (['--require-trace'] if require_trace else []),
                              capture_output=True, text=True)

    def assert_blocked(self, result):
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        # A crash or a missing checker is not evidence that the gate rejected a task.
        self.assertNotIn('Traceback (most recent call last)', result.stderr)
        self.assertNotIn("can't open file", result.stderr)
        self.assertNotIn("unrecognized arguments", result.stderr)

    def test_strict_rejects_partial_capture(self):
        data = json.loads(self.trace.read_text()); data['coverage'] = 'partial'
        self.trace.write_text(json.dumps(data))
        self.data['trace']['sha256'] = hashlib.sha256(self.trace.read_bytes()).hexdigest()
        self.assert_blocked(self.run_gate())

    def test_strict_rejects_modified_journal(self):
        (self.root / 'events.jsonl').write_text('{}\n')
        self.assert_blocked(self.run_gate())

    def test_strict_rejects_omitted_raw_journal_write(self):
        journal = self.root / 'events.jsonl'
        with journal.open('a') as stream:
            stream.write(json.dumps(dict(kind='local-write', targets=['outside.txt'])) + '\n')
        trace = json.loads(self.trace.read_text())
        trace['journal_sha256'] = hashlib.sha256(journal.read_bytes()).hexdigest()
        self.trace.write_text(json.dumps(trace))
        self.data['trace']['sha256'] = hashlib.sha256(self.trace.read_bytes()).hexdigest()
        self.assert_blocked(self.run_gate())

    def test_valid_committed_delivery_passes(self):
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def unavailable_trace(self, status='unavailable'):
        self.data.pop('trace')
        self.data['trace_status'] = status
        self.data['trace_reason'] = 'Client Bash writes have no structured targets'

    def test_standard_missing_trace_explicit_reason_passes_unverified(self):
        for status in ('unavailable', 'partial'):
            with self.subTest(status=status):
                self.data.pop('trace', None)
                self.data['trace_status'] = status
                self.data['trace_reason'] = 'Client Bash writes have no structured targets'
                result = self.run_gate(require_trace=False)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                self.assertIn('trace unverified', result.stdout + result.stderr)

    def test_standard_missing_trace_without_reason_blocks(self):
        self.unavailable_trace()
        self.data.pop('trace_reason')
        self.assert_blocked(self.run_gate(require_trace=False))

    def test_standard_missing_trace_without_status_blocks(self):
        self.unavailable_trace()
        self.data.pop('trace_status')
        self.assert_blocked(self.run_gate(require_trace=False))

    def test_standard_missing_trace_invalid_status_or_blank_reason_blocks(self):
        self.unavailable_trace()
        for status, reason in (('verified', 'no capture'), ('unavailable', ''), ('partial', '   ')):
            with self.subTest(status=status, reason=reason):
                self.data.update(trace_status=status, trace_reason=reason)
                self.assert_blocked(self.run_gate(require_trace=False))

    def test_strict_pilot_missing_trace_with_reason_blocks(self):
        self.unavailable_trace()
        self.assert_blocked(self.run_gate())

    def test_standard_absent_trace_still_checks_verified_evidence_hash(self):
        self.unavailable_trace()
        proof = self.root / 'proof.txt'
        proof.write_text('test passed')
        self.data['claims'] = [dict(stage='test', status='verified', evidence=dict(
            stage='test', ref=proof.name, sha256=hashlib.sha256(proof.read_bytes()).hexdigest(),
            revision=self.head, observed_at='2026-10-10T00:00:00Z', command='test', result='pass'))]
        result = self.run_gate(require_trace=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        proof.write_text('tampered')
        self.assert_blocked(self.run_gate(require_trace=False))

    def test_missing_artifact_blocks(self):
        self.assert_blocked(self.run_gate(write_artifact=False))

    def test_write_outside_owned_paths_blocks(self):
        self.data['owned_paths'] = ['other.txt']
        self.assert_blocked(self.run_gate())

    def test_omitted_git_change_blocks(self):
        self.data['writes'] = []
        self.write_trace([])
        self.assert_blocked(self.run_gate())

    def test_trace_targets_must_match_git_changes(self):
        self.write_trace(['other.txt'])
        self.assert_blocked(self.run_gate())

    def test_trace_digest_mismatch_blocks(self):
        self.trace.write_text('{}')
        self.assert_blocked(self.run_gate())

    def test_stale_handoff_head_blocks(self):
        self.data['head_revision'] = self.base
        self.assert_blocked(self.run_gate())

    def test_stale_trace_head_blocks(self):
        self.write_trace(['changed.txt'], head=self.base)
        self.assert_blocked(self.run_gate())

    def test_wrong_base_blocks(self):
        self.data['base_revision'] = self.head
        self.assert_blocked(self.run_gate())

    def test_dirty_tracked_repo_blocks(self):
        (self.repo / 'changed.txt').write_text('uncommitted\n')
        self.assert_blocked(self.run_gate())

    def test_staged_changes_block(self):
        (self.repo / 'changed.txt').write_text('staged\n')
        self.git('add', 'changed.txt')
        self.assert_blocked(self.run_gate())

    def test_untracked_file_blocks(self):
        (self.repo / 'unexpected.txt').write_text('untracked\n')
        self.assert_blocked(self.run_gate())

    def test_trace_unsafe_reference_blocks(self):
        for ref in (str(self.trace), '../trace.json'):
            with self.subTest(ref=ref):
                self.data['trace']['ref'] = ref
                self.assert_blocked(self.run_gate())

    def test_trace_symlink_blocks(self):
        link = self.root / 'linked-trace.json'
        link.symlink_to(self.trace)
        self.data['trace']['ref'] = link.name
        self.assert_blocked(self.run_gate())

    def test_rename_requires_both_paths(self):
        self.git('mv', 'changed.txt', 'renamed.txt')
        self.git('commit', '-qm', 'rename')
        self.head = self.git('rev-parse', 'HEAD').stdout.strip()
        self.data['head_revision'] = self.head
        self.data['owned_paths'] = ['changed.txt', 'renamed.txt']
        self.data['writes'] = ['changed.txt', 'renamed.txt']
        self.write_trace(self.data['writes'])
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.data['writes'] = ['renamed.txt']
        self.write_trace(self.data['writes'])
        self.assert_blocked(self.run_gate())


if __name__ == '__main__':
    unittest.main()
