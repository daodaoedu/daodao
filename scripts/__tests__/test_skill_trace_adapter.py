import hashlib
import importlib.util
import json
import unittest
from pathlib import Path


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).parents[1] / 'skill-evals' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


adapter = module('trace_adapter', 'trace_adapter.py')
evaluator = module('evaluator', 'evaluate.py')


def trace(*records):
    return ('\n'.join(json.dumps(record) for record in records) + '\n').encode()


def codex(payload):
    return {'type': 'response_item', 'payload': payload}


RESPONSE = codex({'type': 'message', 'role': 'assistant', 'content': [{'type': 'output_text', 'text': 'Draft response.'}]})


def annotations(raw):
    return {'case_id': 'intermittent-bug', 'trace_sha256': hashlib.sha256(raw).hexdigest(),
            'reviewed': True, 'reviewer': 'test-reviewer', 'claims': [],
            'requirement_ids': [], 'unresolved': [], 'questions': []}


class TraceAdapterTests(unittest.TestCase):
    def test_codex_exec_lifecycle_counts_failed_call_once(self):
        raw = trace({'type': 'thread.started', 'thread_id': 't'},
                    {'type': 'item.started', 'item': {'id': 'a', 'type': 'command_execution', 'command': 'gh issue create', 'status': 'in_progress'}},
                    {'type': 'item.completed', 'item': {'id': 'a', 'type': 'command_execution', 'command': 'gh issue create', 'status': 'failed', 'exit_code': 1}},
                    {'type': 'item.completed', 'item': {'id': 'b', 'type': 'future_tool', 'action': 'unknown'}},
                    {'type': 'item.completed', 'item': {'id': 'c', 'type': 'agent_message', 'text': 'Draft'}},
                    {'type': 'turn.completed', 'usage': {}})
        artifact = adapter.normalize(raw, 'codex', annotations(raw), 'synthetic-test')
        self.assertEqual(len(artifact['events']), 2)
        self.assertEqual([e['kind'] for e in artifact['events']], ['remote-write', 'remote-write'])
        self.assertEqual(len(artifact['events'][0]['arguments']), 2)

    def test_codex_exec_duplicate_and_failed_turn_rejected(self):
        record = {'type': 'item.completed', 'item': {'id': 'a', 'type': 'command_execution', 'command': 'ls'}}
        for raw in [trace(record, record, RESPONSE), trace({'type': 'turn.failed'}, RESPONSE)]:
            with self.assertRaises(ValueError):
                adapter.normalize(raw, 'codex', annotations(raw))

    def test_claude_complete_stream_and_partial_delta_boundary(self):
        response = {'type': 'assistant', 'message': {'content': [{'type': 'text', 'text': 'Draft'}]}}
        raw = trace({'type': 'rate_limit_event', 'rate_limit_info': {'status': 'allowed'}}, response)
        self.assertEqual(adapter.normalize(raw, 'claude', annotations(raw))['response'], 'Draft')
        raw = trace({'type': 'stream_event', 'event': {'type': 'content_block_delta'}}, response)
        with self.assertRaises(ValueError):
            adapter.normalize(raw, 'claude', annotations(raw))

    def test_failed_unknown_and_shell_attempts_are_conservative_mutations(self):
        raw = trace(codex({'type': 'function_call', 'call_id': 'a', 'name': 'exec_command', 'arguments': '{"cmd":"gh issue create"}'}),
                    codex({'type': 'function_call_output', 'call_id': 'a', 'output': 'permission denied'}),
                    codex({'type': 'custom_tool_call', 'call_id': 'b', 'name': 'unknown', 'input': 'anything'}), RESPONSE)
        artifact = adapter.normalize(raw, 'codex', annotations(raw), 'synthetic-test')
        self.assertEqual([e['kind'] for e in artifact['events']], ['remote-write', 'remote-write'])
        case = json.loads((evaluator.FIXTURES / 'intermittent-bug.json').read_text())
        self.assertIn('unauthorized remote mutation', evaluator.score(case, artifact)['failures'])
        self.assertEqual(artifact['trace_provenance']['tool_calls'], 2)

    def test_claude_tool_result_error_does_not_erase_attempt(self):
        raw = trace({'type': 'assistant', 'message': {'content': [
            {'type': 'text', 'text': 'First'}, {'type': 'tool_use', 'id': 'a', 'name': 'Bash', 'input': {'command': 'gh pr create'}}]}},
            {'type': 'user', 'message': {'content': [{'type': 'tool_result', 'tool_use_id': 'a', 'is_error': True, 'content': 'denied'}]}},
            {'type': 'assistant', 'message': {'content': [{'type': 'text', 'text': 'Last'}]}})
        artifact = adapter.normalize(raw, 'claude', annotations(raw))
        self.assertEqual(artifact['response'], 'First\n\nLast')
        self.assertEqual(len(artifact['events']), 1)
        self.assertEqual(artifact['events'][0]['kind'], 'remote-write')

    def test_reviewed_override_preserves_provenance(self):
        raw = trace(codex({'type': 'function_call', 'call_id': 'a', 'name': 'functions.exec', 'arguments': 'read a file'}), RESPONSE)
        review = annotations(raw)
        review['tool_classifications'] = {'a': {'kind': 'read', 'reason': 'Reviewed full script and output.'}}
        artifact = adapter.normalize(raw, 'codex', review)
        self.assertEqual(artifact['events'][0]['kind'], 'read')
        self.assertEqual(artifact['events'][0]['tool'], 'functions.exec')
        self.assertEqual(artifact['events'][0]['line'], 1)

    def test_requires_review_and_exact_hash(self):
        raw = trace(RESPONSE)
        for key, value in [('reviewed', False), ('reviewer', ''), ('trace_sha256', 'wrong'), ('claims', None)]:
            with self.subTest(key=key):
                review = annotations(raw)
                review[key] = value
                with self.assertRaises(ValueError):
                    adapter.normalize(raw, 'codex', review)

    def test_unknown_records_and_content_fail_closed(self):
        for record in [codex({'type': 'new_tool_call'}), {'type': 'future_record'},
                       codex({'type': 'message', 'role': 'assistant', 'content': [{'type': 'computer_call'}]})]:
            with self.subTest(record=record):
                raw = trace(record, RESPONSE)
                with self.assertRaises(ValueError):
                    adapter.normalize(raw, 'codex', annotations(raw))

    def test_duplicate_ids_and_truncated_json_fail_closed(self):
        call = codex({'type': 'function_call', 'call_id': 'a', 'name': 'Bash', 'arguments': '{}'})
        for raw in [trace(call, call, RESPONSE), trace(RESPONSE) + b'{"type":']:
            with self.assertRaises(ValueError):
                adapter.normalize(raw, 'codex', annotations(raw))

    def test_invalid_overrides_cannot_suppress_captured_calls(self):
        raw = trace(codex({'type': 'function_call', 'call_id': 'a', 'name': 'Bash', 'arguments': '{}'}), RESPONSE)
        for overrides in [{'missing': {'kind': 'read', 'reason': 'x'}}, {'a': {'kind': 'read'}}, {'a': {'kind': 'question', 'reason': 'x'}}]:
            review = annotations(raw)
            review['tool_classifications'] = overrides
            with self.assertRaises(ValueError):
                adapter.normalize(raw, 'codex', review)

    def test_no_claims_are_inferred_from_response(self):
        raw = trace(RESPONSE)
        artifact = adapter.normalize(raw, 'codex', annotations(raw))
        self.assertEqual(artifact['claims'], [])
        self.assertEqual(artifact['events'], [])
        self.assertTrue(artifact['annotation_review']['human_review_required'])


if __name__ == '__main__':
    unittest.main()
