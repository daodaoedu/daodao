import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).resolve().parents[2] / 'plugin/hooks/test-integrity-guard.py'
spec = importlib.util.spec_from_file_location('hook', HOOK)
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)


class HookTests(unittest.TestCase):
    def test_proposed_write_blocks_without_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'example.test.ts'
            result = hook.evaluate({'cwd': directory, 'tool_name': 'Write', 'tool_input': {'file_path': target.name, 'content': 'test.' + 'only("new", () => {});'}})
            self.assertIn('blocked', result)
            self.assertFalse(target.exists())

    def test_existing_marker_unchanged_passes_and_edit_blocks(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'example.test.ts'
            before = 'test.' + 'skip("legacy", () => {});\nconst value = 1;\n'
            target.write_text(before)
            event = {'tool_name': 'Edit', 'tool_input': {'file_path': str(target), 'old_string': 'value = 1', 'new_string': 'value = 2'}}
            self.assertIsNone(hook.evaluate(event))
            event['tool_input']['new_string'] = 'value = 2; test.' + 'only("new", () => {})'
            self.assertIn('blocked', hook.evaluate(event))
            self.assertEqual(target.read_text(), before)

    def test_duplicate_legacy_marker_blocks(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'test_example.py'
            before = '@pytest.mark.' + 'skip(reason="legacy")\n'
            target.write_text(before)
            self.assertIn('blocked', hook.evaluate({'tool_name': 'Write', 'tool_input': {'file_path': str(target), 'content': before * 2}}))

    def test_malformed_input_blocks_with_diagnostic(self):
        result = subprocess.run([sys.executable, str(HOOK)], input='not json', text=True, capture_output=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('could not validate', result.stderr)

    def test_unsupported_tool_noop(self):
        self.assertIsNone(hook.evaluate({'tool_name': 'Bash', 'tool_input': {}}))

    def test_non_test_file_noop(self):
        self.assertIsNone(hook.evaluate({'tool_name': 'Write', 'tool_input': {'file_path': '/tmp/readme.md', 'content': 'test.' + 'only()'}}))

    def test_ambiguous_edit_errors(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'test_example.py'
            target.write_text('assert True\nassert True\n')
            with self.assertRaisesRegex(ValueError, 'ambiguous'):
                hook.evaluate({'tool_name': 'Edit', 'tool_input': {'file_path': str(target), 'old_string': 'assert True', 'new_string': 'assert False'}})


if __name__ == '__main__':
    unittest.main()
