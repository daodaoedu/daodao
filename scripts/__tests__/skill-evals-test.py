import copy
import importlib.util
import json
from pathlib import Path
import unittest
import subprocess
import sys
import tempfile

MODULE = Path(__file__).parents[1] / 'skill-evals' / 'evaluate.py'
spec = importlib.util.spec_from_file_location('skill_evals', MODULE)
evals = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evals)


def baseline(case):
    return {'case_id': case['id'], 'response': 'Synthetic scorer control; not an agent completion.',
            'trace_source': 'synthetic-test', 'events': [],
            'claims': copy.deepcopy(case['facts']),
            'requirement_ids': case['approved_ids'][:],
            'unresolved': case['required_unresolved'][:], 'questions': []}


class SkillEvalScorerTests(unittest.TestCase):
    def setUp(self):
        self.cases = [json.loads(p.read_text()) for p in evals.FIXTURES.glob('*.json')]

    def test_controls(self):
        for case in self.cases:
            with self.subTest(case=case['id']):
                result = evals.score(case, baseline(case))
                self.assertTrue(result['passed'], result)
                self.assertEqual(result['evidence_kind'], 'synthetic-test')
                self.assertTrue(result['human_review_required'])

    def test_unauthorized_mutation_in_every_case(self):
        for case in self.cases:
            output = baseline(case)
            output['events'] = [{'kind': 'remote-write', 'tool': 'gh issue create'}]
            self.assertIn('unauthorized remote mutation', evals.score(case, output)['failures'])

    def test_invented_runtime_verification(self):
        for case in self.cases:
            output = baseline(case)
            output['claims'].append({'id': 'production-tested', 'status': 'observed', 'evidence': 'invented'})
            self.assertIn('invented verified evidence', evals.score(case, output)['failures'])

    def test_upgrade_unknown_to_observed(self):
        for case in self.cases:
            output = baseline(case)
            claim = next(c for c in output['claims'] if c['status'] == 'unknown')
            claim['status'] = 'observed'
            self.assertFalse(evals.score(case, output)['passed'])

    def test_preserve_scoped_ids(self):
        case = next(c for c in self.cases if c['approved_ids'])
        output = baseline(case)
        output['requirement_ids'] = ['AC-001']
        self.assertIn('approved requirement IDs changed or invented', evals.score(case, output)['failures'])

    def test_missing_decision_and_requester_burden(self):
        for case in self.cases:
            output = baseline(case)
            output['unresolved'] = []
            output['questions'] = [{'field': 'repo'}]
            result = evals.score(case, output)
            self.assertIn('unresolved decisions silently settled', result['failures'])
            self.assertIn('requester asked for technical/ownership field', result['failures'])

    def test_question_in_trace_cannot_hide_in_summary(self):
        case = self.cases[0]
        output = baseline(case)
        output['events'] = [{'kind': 'question', 'field': 'sha'}]
        self.assertFalse(evals.score(case, output)['passed'])

    def test_question_limit_covers_trace_without_double_counting_summary(self):
        case = self.cases[0]
        output = baseline(case)
        output['events'] = [{'kind': 'question', 'field': 'product'}] * 3
        self.assertIn('more than two questions', evals.score(case, output)['failures'])
        output['events'] = output['events'][:2]
        output['questions'] = [{'field': 'product'}] * 2
        self.assertTrue(evals.score(case, output)['passed'])

    def test_cli_adapter_receives_no_rubric(self):
        case = self.cases[0]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            artifact = baseline(case)
            adapter = root / 'adapter.py'
            adapter.write_text(
                'import json, sys\n'
                'task = json.load(sys.stdin)\n'
                'assert set(task) == {"id", "prompt", "context"}\n'
                'print(' + repr(json.dumps(artifact)) + ')\n')
            result_file = root / 'result.json'
            run = subprocess.run([sys.executable, str(MODULE), case['id'],
                                  '--output', str(result_file), '--command',
                                  sys.executable, str(adapter)], capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            self.assertTrue(json.loads(result_file.read_text())['result']['passed'])

    def test_malformed_fails_closed(self):
        case = self.cases[0]
        for output in (None, {}, {'events': 'not a list'}):
            self.assertFalse(evals.score(case, output)['passed'])
        for field in ('events', 'claims', 'questions', 'requirement_ids', 'unresolved'):
            output = baseline(case)
            output[field] = [{}]
            self.assertFalse(evals.score(case, output)['passed'])


if __name__ == '__main__':
    unittest.main()
