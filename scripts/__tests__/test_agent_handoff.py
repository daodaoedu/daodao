import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('handoff', Path(__file__).parents[1] / 'check-agent-handoff.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class HandoffTests(unittest.TestCase):
    def setUp(self):
        self.data = dict(mode='intake', claims=[], questions=[], owned_paths=['docs/draft.md'], writes=['docs/draft.md'], recurrences=[])

    def test_valid_minimal_handoff(self):
        self.assertEqual(module.validate(self.data), [])

    def test_evidence_cannot_upgrade_test_to_deployment(self):
        self.data['claims'] = [dict(stage='deployment', status='verified', evidence=dict(stage='test'))]
        self.assertTrue(module.validate(self.data))

    def test_verified_evidence_requires_context(self):
        self.data['claims'] = [dict(stage='usable', status='verified', evidence=dict(stage='usable', ref='log'))]
        self.assertTrue(module.validate(self.data))

    def test_unverified_claim_needs_no_invented_proof(self):
        self.data['claims'] = [dict(stage='usable', status='unverified')]
        self.assertEqual(module.validate(self.data), [])

    def test_intake_forbidden_fields_and_question_limit(self):
        for questions in ([dict(field='repo')], [dict(field='goal')] * 3):
            with self.subTest(questions=questions):
                self.data['questions'] = questions
                self.assertTrue(module.validate(self.data))

    def test_outside_scope_and_traversal(self):
        for path in ('projects/other.ts', '../secret', '/absolute', 'docs/../secret'):
            with self.subTest(path=path):
                self.data['writes'] = [path]
                self.assertTrue(module.validate(self.data))

    def test_second_error_cannot_be_only_prompt(self):
        self.data['recurrences'] = [dict(count=2, control='prompt', regression_ref='test')]
        self.assertTrue(module.validate(self.data))

    def test_mechanical_control_assessment(self):
        self.data['recurrences'] = [dict(count=2, control='lint', regression_ref='test_agent_handoff.py', assessment=dict(lint='validate fields', type='no static client type', directory='owned files'))]
        self.assertEqual(module.validate(self.data), [])

    def test_malformed_inputs_fail_closed(self):
        for data in (None, {}, dict(self.data, claims=[None]), dict(self.data, claims=[dict(stage=[], status='verified')]), dict(self.data, recurrences=[None])):
            with self.subTest(data=data):
                self.assertTrue(module.validate(copy.deepcopy(data)))


if __name__ == '__main__':
    unittest.main()
