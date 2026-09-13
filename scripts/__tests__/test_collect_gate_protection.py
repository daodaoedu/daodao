import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).parents[1] / 'collect-gate-protection.py'
SPEC = importlib.util.spec_from_file_location('protection', SCRIPT)
protection = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(protection)


def response(data, code=0, stderr=''):
    return subprocess.CompletedProcess([], code, json.dumps(data), stderr)


class ProtectionTests(unittest.TestCase):
    def test_only_explicit_unprotected_404_is_absent(self):
        for message, code, expected in (
            ('Branch not protected', 404, 'absent'),
            ('Not Found', 404, 'unknown'),
            ('Resource not accessible by integration', 403, 'unknown'),
            ('Branch not protected', 403, 'unknown'),
        ):
            with self.subTest(message=message, code=code), patch.object(
                protection.subprocess, 'run', return_value=response(
                    {'message': message, 'status': str(code)}, 1, f'gh: {message} (HTTP {code})')
            ):
                result = protection.api('endpoint', allow_unprotected=True)
                self.assertEqual(result['status'], expected)
                self.assertEqual(result['data']['message'], message)
                self.assertIn(message, result['error'])

    def test_absence_exception_does_not_apply_to_other_endpoints(self):
        with patch.object(protection.subprocess, 'run', return_value=response(
                {'message': 'Branch not protected', 'status': '404'}, 1)):
            self.assertEqual(protection.api('endpoint')['status'], 'unknown')

    def test_collects_parent_rulesets_and_preserves_detail_failures(self):
        replies = [response({'commit': {'sha': 'abc'}}), response({}),
                   response([[{'id': 1}], [{'id': 2}]]),
                   response({'id': 1, 'source_type': 'Organization'}),
                   response({'message': 'Forbidden', 'status': '403'}, 1, 'forbidden')]
        with patch.object(protection, 'REPOSITORIES', [('daodao', 'main')]), patch.object(
                protection.subprocess, 'run', side_effect=replies) as run:
            report = protection.collect()
        self.assertFalse(report['complete'])
        repo = report['repositories'][0]
        self.assertEqual(repo['sha'], 'abc')
        self.assertEqual(repo['ruleset_details'][0]['data']['id'], 1)
        self.assertEqual(repo['ruleset_details'][1]['status'], 'unknown')
        commands = [call.args[0] for call in run.call_args_list]
        for command in commands:
            self.assertEqual(command[:4], ['gh', 'api', '--method', 'GET'])
        self.assertEqual(commands[2][-2:], ['--paginate', '--slurp'])
        self.assertIn('includes_parents=true', commands[2][4])
        self.assertTrue(commands[4][4].endswith('/rulesets/2'))

    def test_unprotected_branch_and_empty_rulesets_are_complete_observations(self):
        with patch.object(protection, 'REPOSITORIES', [('daodao', 'main')]), patch.object(
            protection.subprocess, 'run', side_effect=[
                response({'commit': {'sha': 'abc'}}),
                response({'message': 'Branch not protected', 'status': '404'}, 1),
                response([[]]),
            ]
        ):
            self.assertTrue(protection.collect()['complete'])

    def test_malformed_response_and_missing_gh_are_unknown(self):
        for reply in (subprocess.CompletedProcess([], 0, 'not json', ''), response(None)):
            with patch.object(protection.subprocess, 'run', return_value=reply):
                self.assertEqual(protection.api('endpoint')['status'], 'unknown')
        with patch.object(protection.subprocess, 'run', side_effect=FileNotFoundError):
            self.assertEqual(protection.api('endpoint')['error'], 'FileNotFoundError')

    def test_malformed_page_is_not_treated_as_no_rulesets(self):
        with patch.object(protection, 'REPOSITORIES', [('daodao', 'main')]), patch.object(
            protection.subprocess, 'run', side_effect=[
                response({'commit': {'sha': 'abc'}}), response({}), response([{'id': 1}])
            ]
        ):
            self.assertFalse(protection.collect()['complete'])

    def test_output_is_exclusive_and_partial_report_returns_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'evidence.json'
            report = {'complete': False, 'repositories': [{'error': 'retained'}]}
            with patch.object(protection, 'collect', return_value=report) as collect:
                self.assertEqual(protection.main(['--output', str(output)]), 1)
                self.assertEqual(json.loads(output.read_text()), report)
                self.assertEqual(protection.main(['--output', str(output)]), 2)
                collect.assert_called_once()
                self.assertEqual(json.loads(output.read_text()), report)


if __name__ == '__main__':
    unittest.main()
