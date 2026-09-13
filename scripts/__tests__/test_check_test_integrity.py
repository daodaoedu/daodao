import importlib.util
import unittest
import json
import subprocess
import sys
import tempfile
from pathlib import Path

MODULE = Path(__file__).parents[1] / 'check-test-integrity.py'
spec = importlib.util.spec_from_file_location('integrity', MODULE)
integrity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(integrity)


def patch(removed='', added='', filename='src/__tests__/unit.test.ts'):
    return f'diff --git a/{filename} b/{filename}\n--- a/{filename}\n+++ b/{filename}\n@@ -1 +1 @@\n' + ''.join('-' + s + '\n' for s in removed.splitlines()) + ''.join('+' + s + '\n' for s in added.splitlines())


class IntegrityTests(unittest.TestCase):
    def test_new_focus_blocks(self):
        result = integrity.scan(patch(added="test." + "only('works', () => {})"))
        self.assertEqual(result[0]['kind'], 'disabled-or-focused')

    def test_python_skip_blocks(self):
        self.assertEqual(integrity.scan(patch(added='@pytest.mark.' + 'skip(reason="later")', filename='tests/test_api.py'))[0]['kind'], 'disabled-or-focused')

    def test_assertion_deletion_requires_review(self):
        self.assertEqual(integrity.scan(patch(removed='expect(secret).toBeUndefined();'))[0]['kind'], 'removed-test-or-assertion')

    def test_replacement_still_requires_review(self):
        self.assertEqual(len(integrity.scan(patch(removed='assert x == 1', added='assert x == 2', filename='tests/test_api.py'))), 1)

    def test_normal_addition_passes(self):
        self.assertEqual(integrity.scan(patch(added="test('works', () => { expect(1).toBe(1); });")), [])

    def test_non_test_file_ignored(self):
        self.assertEqual(integrity.scan(patch(added='test.' + 'only()', filename='docs/example.md')), [])

    def test_review_must_match_diff_and_base(self):
        review = {'base': 'abc', 'test_diff_sha256': '123', 'reviewer': 'alice', 'reason': 'Replaced obsolete assertion', 'evidence': 'PR review URL'}
        self.assertTrue(integrity.valid_review(review, 'abc', '123'))
        self.assertFalse(integrity.valid_review(review, 'abc', '456'))
        self.assertFalse(integrity.valid_review(review, 'def', '123'))

    def test_empty_review_invalid(self):
        self.assertFalse(integrity.valid_review({}, 'abc', '123'))


    def test_cli_worktree_review_and_stale_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', *args], cwd=root, text=True, stderr=subprocess.DEVNULL)
            git('init')
            git('config', 'user.email', 'fixture@example.invalid')
            git('config', 'user.name', 'Fixture')
            target = root / 'test_example.py'
            target.write_text('def test_example():\n    assert 1 == 1\n')
            git('add', '.')
            git('commit', '-m', 'fixture baseline')
            target.write_text('def test_example():\n    assert 2 == 2\n')
            def run(*args):
                return subprocess.run([sys.executable, str(MODULE), '--base', 'HEAD', *args], cwd=root, capture_output=True, text=True)
            result = run()
            self.assertEqual(result.returncode, 2, result.stderr)
            report = json.loads(result.stdout)
            receipt = root / 'review.json'
            receipt.write_text(json.dumps({**report, 'reviewer': 'human', 'reason': 'Approved fixture change', 'evidence': 'fixture approval'}))
            self.assertEqual(run('--review', str(receipt)).returncode, 0)
            target.write_text('def test_example():\n    assert 3 == 3\n')
            self.assertEqual(run('--review', str(receipt)).returncode, 3)
            target.write_text('@pytest.mark.' + 'skip(reason="later")\ndef test_example():\n    assert 1 == 1\n')
            self.assertEqual(run().returncode, 1)


if __name__ == '__main__':
    unittest.main()
