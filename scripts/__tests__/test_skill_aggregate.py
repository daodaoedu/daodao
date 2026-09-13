import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import subprocess
import sys

MODULE = Path(__file__).parents[1] / 'skill-evals' / 'aggregate.py'
SPEC = importlib.util.spec_from_file_location('aggregate', MODULE)
aggregate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(aggregate)


class AggregateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        digest = hashlib.sha256()
        self.cases = []
        for path in sorted(aggregate.EVALUATOR.FIXTURES.glob('*.json')):
            digest.update(path.stem.encode() + b'\0' + path.read_bytes())
            self.cases.append(json.loads(path.read_text()))
        self.manifest = {'schema_version': 1, 'identity': {
            'client': 'codex', 'client_version': 'test-only', 'model': 'test-only',
            'skill_revision': 'test-revision'}, 'fixture_sha256': digest.hexdigest(),
            'runs': [{'run_id': 'failed-attempt', 'case_id': self.cases[0]['id'],
                      'status': 'error', 'reason': 'timeout'}]}

    def test_client_errors_remain_in_denominator(self):
        result = aggregate.aggregate(self.manifest, self.root)
        self.assertEqual(result['total'], 1)
        self.assertEqual(result['pass_rate'], 0)
        self.assertFalse(result['complete_case_coverage'])

    def test_rejects_nonobject_manifest_and_identity(self):
        for manifest in ([], None, dict(self.manifest, identity=[])):
            with self.assertRaises(ValueError):
                aggregate.aggregate(manifest, self.root)

    def test_cli_cannot_overwrite_input_evidence(self):
        self.completed()
        manifest = self.root / 'runs.json'
        manifest.write_text(json.dumps(self.manifest))
        for output in (manifest, self.root / 'artifact.json'):
            before = output.read_bytes()
            result = subprocess.run([sys.executable, str(MODULE), str(manifest),
                                     '--output', str(output)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(output.read_bytes(), before)

    def completed(self, source='captured-client'):
        case = self.cases[0]
        artifact = {'case_id': case['id'], 'response': 'Test fixture only',
                    'trace_source': source, 'events': [], 'claims': case['facts'],
                    'requirement_ids': case['approved_ids'],
                    'unresolved': case['required_unresolved'], 'questions': [],
                    'trace_provenance': {'client': 'codex', 'sha256': 'a' * 64,
                                         'bytes': 1, 'tool_calls': 0}}
        raw = json.dumps(artifact).encode()
        (self.root / 'artifact.json').write_bytes(raw)
        self.manifest['runs'] = [{'run_id': 'completed', 'case_id': case['id'],
            'status': 'completed', 'reviewed': True, 'reviewer': 'test-only',
            'artifact': 'artifact.json', 'artifact_sha256': hashlib.sha256(raw).hexdigest()}]

    def test_rescores_instead_of_trusting_supplied_pass(self):
        self.completed()
        self.manifest['runs'][0]['passed'] = False
        self.assertEqual(aggregate.aggregate(self.manifest, self.root)['passed'], 1)

    def test_rejects_duplicate_trace_even_with_distinct_run_ids(self):
        self.completed()
        repeated = dict(self.manifest['runs'][0], run_id='renamed')
        self.manifest['runs'].append(repeated)
        with self.assertRaisesRegex(ValueError, 'duplicate trace'):
            aggregate.aggregate(self.manifest, self.root)

    def test_rejects_mislabeled_client_and_malformed_artifact(self):
        self.completed()
        self.manifest['identity']['client'] = 'claude'
        with self.assertRaisesRegex(ValueError, 'provenance'):
            aggregate.aggregate(self.manifest, self.root)
        for value in ([], {'trace_source': 'captured-client'}):
            raw = json.dumps(value).encode()
            (self.root / 'artifact.json').write_bytes(raw)
            self.manifest['runs'][0]['artifact_sha256'] = hashlib.sha256(raw).hexdigest()
            with self.assertRaises(ValueError):
                aggregate.aggregate(self.manifest, self.root)

    def test_rejects_synthetic_and_unreviewed_artifacts(self):
        self.completed('synthetic-test')
        with self.assertRaisesRegex(ValueError, 'synthetic'):
            aggregate.aggregate(self.manifest, self.root)
        self.completed()
        self.manifest['runs'][0]['reviewed'] = False
        with self.assertRaisesRegex(ValueError, 'review'):
            aggregate.aggregate(self.manifest, self.root)

    def test_rejects_changed_artifact_and_fixture(self):
        self.completed()
        (self.root / 'artifact.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'digest'):
            aggregate.aggregate(self.manifest, self.root)
        self.manifest['fixture_sha256'] = 'stale'
        with self.assertRaisesRegex(ValueError, 'fixture'):
            aggregate.aggregate(self.manifest, self.root)

    def test_rejects_missing_runs_duplicates_and_escape(self):
        self.manifest['runs'] *= 2
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            aggregate.aggregate(self.manifest, self.root)
        self.manifest['runs'] = []
        with self.assertRaisesRegex(ValueError, 'nonempty'):
            aggregate.aggregate(self.manifest, self.root)
        self.completed()
        self.manifest['runs'][0]['artifact'] = '../escape.json'
        with self.assertRaisesRegex(ValueError, 'inside'):
            aggregate.aggregate(self.manifest, self.root)

    def test_comparison_requires_comparable_complete_paired_runs(self):
        result = aggregate.aggregate(self.manifest, self.root)
        with self.assertRaisesRegex(ValueError, 'all fixtures'):
            aggregate.compare(result, result)
        for count in result['cases'].values():
            count.update(passed=1, total=1)
        result['complete_case_coverage'] = True
        current = copy.deepcopy(result)
        current['identity']['skill_revision'] = 'new-revision'
        current['cases'][self.cases[0]['id']]['passed'] = 0
        self.assertEqual(aggregate.compare(current, result), [self.cases[0]['id']])
        current['identity']['model'] = 'different'
        with self.assertRaisesRegex(ValueError, 'incomparable'):
            aggregate.compare(current, result)
        current['identity']['model'] = result['identity']['model']
        current['cases'][self.cases[0]['id']]['total'] = 2
        with self.assertRaisesRegex(ValueError, 'sample counts'):
            aggregate.compare(current, result)


if __name__ == '__main__':
    unittest.main()
