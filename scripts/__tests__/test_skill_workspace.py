import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/skill-evals/prepare_workspace.py'
SPEC = importlib.util.spec_from_file_location('prepare_workspace', SCRIPT)
workspace = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(workspace)


class WorkspaceTests(unittest.TestCase):
    def fixture(self, root, context):
        path = root / 'fixture.json'
        path.write_text(json.dumps({'id': 'case', 'prompt': 'private rubric must not leak',
                                    'forbidden_questions': ['repo'], 'context': context}))
        return path

    def test_copies_only_allowlisted_project_files_and_context(self):
        with tempfile.TemporaryDirectory() as temp:
            temp = Path(temp)
            output = temp / 'workspace'
            fixture = self.fixture(temp, {'prototype/app.ts': 'fixture source', 'notes': 'unknown'})
            workspace.prepare(ROOT, fixture, output)

            self.assertEqual((output / 'prototype/app.ts').read_text(), 'fixture source')
            self.assertEqual((output / 'notes').read_text(), 'unknown')
            self.assertTrue((output / 'AGENTS.md').is_file())
            self.assertTrue((output / 'CLAUDE.md').is_file())
            self.assertFalse((output / '.git').exists())
            self.assertFalse((output / 'scripts').exists())
            self.assertFalse((output / 'fixture.json').exists())
            self.assertFalse(any('private rubric must not leak' in p.read_text(errors='ignore')
                                 for p in output.rglob('*') if p.is_file()))

    def test_rejects_context_traversal_and_instruction_collision(self):
        with tempfile.TemporaryDirectory() as temp:
            temp = Path(temp)
            for index, context in enumerate(({'../escape': 'x'}, {'AGENTS.md': 'replace'})):
                with self.subTest(context=context):
                    with self.assertRaises(ValueError):
                        workspace.prepare(ROOT, self.fixture(temp, context), temp / f'out-{index}')

    def test_rejects_existing_output(self):
        with tempfile.TemporaryDirectory() as temp:
            temp = Path(temp)
            output = temp / 'workspace'
            output.mkdir()
            with self.assertRaises(FileExistsError):
                workspace.prepare(ROOT, self.fixture(temp, {'notes': 'x'}), output)

    def test_rejects_symlinked_required_project_input(self):
        with tempfile.TemporaryDirectory() as temp:
            temp = Path(temp)
            repo = temp / 'repo'
            shutil_root = temp / 'source'
            shutil_root.write_text('outside')
            repo.mkdir()
            for relative in workspace.project_paths():
                target = repo / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text('input')
            (repo / 'AGENTS.md').unlink()
            (repo / 'AGENTS.md').symlink_to(shutil_root)
            with self.assertRaises(ValueError):
                workspace.prepare(repo, self.fixture(temp, {'notes': 'x'}), temp / 'out')


if __name__ == '__main__':
    unittest.main()
