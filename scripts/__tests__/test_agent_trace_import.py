import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('trace_import', Path(__file__).parents[2] / 'plugin/hooks/import-agent-trace.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def record(name, args):
    return dict(type='assistant', message=dict(content=[dict(type='tool_use', name=name, input=args)]))


class ImportTests(unittest.TestCase):
    def test_structured_write_preserves_client_target(self):
        data = module.convert([record('Edit', dict(file_path='/repo/src/a.py'))], Path('/repo'), 'head')
        self.assertEqual(data['events'][0]['targets'], ['src/a.py'])
        self.assertEqual(data['coverage'], 'structured-tools-only')

    def test_bash_heredoc_never_becomes_file_event(self):
        data = module.convert([record('Bash', dict(command='cat > src/a.py <<EOF\nhi\nEOF'))], Path('/repo'), 'head')
        self.assertEqual(data['coverage'], 'partial')
        self.assertEqual(data['opaque_events'], 1)
        self.assertNotIn('targets', data['events'][0])

    def test_mixed_writes_do_not_claim_complete_coverage(self):
        data = module.convert([record('Write', dict(file_path='/repo/a')), record('Bash', dict(command='python repair.py'))], Path('/repo'), 'head')
        self.assertEqual(data['coverage'], 'partial')

    def test_unknown_tool_is_opaque(self):
        data = module.convert([record('CustomMutation', {})], Path('/repo'), 'head')
        self.assertEqual(data['opaque_events'], 1)

    def test_bad_or_outside_targets_rejected(self):
        for path in ('relative', '/repo/../secret'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                module.convert([record('Edit', dict(file_path=path))], Path('/repo'), 'head')

    def test_external_task_notes_preserved_separately(self):
        data = module.convert([record('Write', dict(file_path='/task/notes/report.md')), record('Edit', dict(file_path='/repo/a.py'))], Path('/repo'), 'head')
        self.assertEqual(data['events'][0]['targets'], ['a.py'])
        self.assertEqual(data['external_events'][0]['target'], '/task/notes/report.md')

    def test_malformed_content_rejected(self):
        with self.assertRaises(ValueError):
            module.convert([dict(type='assistant', message={})], Path('/repo'), 'head')


if __name__ == '__main__':
    unittest.main()
