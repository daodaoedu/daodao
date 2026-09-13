import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / 'build-spec-audit.py'
spec = importlib.util.spec_from_file_location('audit', MODULE)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class AuditPackTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Fixture')
        (self.repo / 'app.txt').write_text('before\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'base')
        self.base = self.git('rev-parse', 'HEAD').strip()
        (self.repo / 'app.txt').write_text('after\n')
        self.git('commit', '-qam', 'change')
        self.task = self.root / 'task.md'
        self.task.write_text('## 驗收契約\n- doc-A/TP-1: response omits secret\n')
        self.decisions = self.root / 'decisions.md'
        self.decisions.write_text('## Product Decisions\nD1\n## Implementation Constraints\nAtomic write; never expose secret\n')
        self.review = self.root / 'REVIEW.md'
        self.review.write_text('Review transaction boundary.\n')

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], text=True)

    def build(self):
        return audit.build_pack(self.repo, self.base, self.task, [self.decisions], self.review)

    def test_preserves_constraints_original_ids_and_exact_versions(self):
        pack = self.build()
        self.assertEqual(pack['base'], self.base)
        self.assertEqual(pack['head'], self.git('rev-parse', 'HEAD').strip())
        self.assertIn('doc-A/TP-1', pack['documents'][0]['content'])
        self.assertIn('Atomic write; never expose secret', pack['documents'][2]['content'])
        self.assertIn('+after', pack['diff'])
        old_hash = pack['documents'][2]['sha256']
        self.decisions.write_text('changed decision')
        self.assertNotEqual(old_hash, self.build()['documents'][2]['sha256'])

    def test_rejects_uncommitted_and_untracked_changes(self):
        for name in ['app.txt', 'untracked.txt']:
            path = self.repo / name
            path.write_text('new\n')
            with self.assertRaisesRegex(ValueError, 'uncommitted'):
                self.build()
            if name == 'app.txt':
                self.git('restore', name)
            else:
                path.unlink()

    def test_missing_decisions_or_acceptance_fails(self):
        self.decisions.unlink()
        with self.assertRaises(FileNotFoundError):
            self.build()
        self.decisions.write_text('constraint')
        self.task.write_text('status verified')
        with self.assertRaisesRegex(ValueError, '驗收契約'):
            self.build()

    def test_cli_requires_explicit_decisions_and_preserves_existing_output(self):
        output = self.root / 'pack.json'
        command = ['python3', str(MODULE), '--repo', str(self.repo), '--base', self.base,
                   '--task', str(self.task), '--review', str(self.review), '--output', str(output)]
        self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)
        command += ['--decisions', str(self.decisions)]
        self.assertEqual(subprocess.run(command, capture_output=True).returncode, 0)
        before = output.read_bytes()
        self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)
        self.assertEqual(output.read_bytes(), before)
