#!/usr/bin/env python3
"""Import client JSONL with hash-bound reviewed semantic annotations.

This does not run a client, infer claims, authenticate a reviewer, or certify
that a supplied log contains all activity (including child sessions).
"""
import argparse
import hashlib
import json
from pathlib import Path


KINDS = {'read', 'local-write', 'remote-write', 'question'}


def parse_trace(raw, client):
    calls, responses = [], []
    seen = set()
    exec_items = {}

    def call(line, identifier, name, arguments):
        if not isinstance(identifier, str) or not identifier or identifier in seen:
            raise ValueError(f'line {line}: missing or duplicate tool call ID')
        if not isinstance(name, str) or not name:
            raise ValueError(f'line {line}: missing tool name')
        seen.add(identifier)
        calls.append({'call_id': identifier, 'tool': name, 'arguments': arguments,
                      'line': line})

    def content(items, line, assistant):
        if not isinstance(items, list):
            raise ValueError(f'line {line}: invalid message content')
        for item in items:
            if not isinstance(item, dict):
                raise ValueError(f'line {line}: invalid content block')
            kind = item.get('type')
            if kind in ('text', 'output_text', 'input_text'):
                if not isinstance(item.get('text'), str):
                    raise ValueError(f'line {line}: invalid text block')
                if assistant:
                    responses.append(item['text'])
            elif kind == 'tool_use' and client == 'claude' and assistant:
                call(line, item.get('id'), item.get('name'), item.get('input'))
            elif kind not in ('tool_result', 'thinking', 'redacted_thinking',
                              'image', 'input_image', 'output_image'):
                raise ValueError(f'line {line}: unsupported content block {kind!r}')

    for line, value in enumerate(raw.decode('utf-8').splitlines(), 1):
        if not value.strip():
            continue
        try:
            record = json.loads(value)
        except json.JSONDecodeError as error:
            raise ValueError(f'line {line}: malformed JSON') from error
        if not isinstance(record, dict):
            raise ValueError(f'line {line}: record must be an object')
        kind = record.get('type')
        if client == 'codex':
            if kind in ('thread.started', 'turn.started', 'turn.completed'):
                continue
            if kind in ('turn.failed', 'error'):
                raise ValueError(f'line {line}: client run failed')
            if kind in ('item.started', 'item.updated', 'item.completed'):
                item = record.get('item')
                if not isinstance(item, dict):
                    raise ValueError(f'line {line}: invalid Codex exec item')
                item_kind = item.get('type')
                if item_kind == 'agent_message':
                    if kind == 'item.completed':
                        if not isinstance(item.get('text'), str):
                            raise ValueError(f'line {line}: invalid agent message')
                        responses.append(item['text'])
                elif item_kind in ('reasoning', 'error'):
                    continue
                elif isinstance(item_kind, str):
                    # An unfamiliar exec item may be a new tool. Retain it as a
                    # conservative mutation, including every lifecycle snapshot.
                    identifier = item.get('id')
                    if not isinstance(identifier, str) or not identifier:
                        raise ValueError(f'line {line}: missing exec item ID')
                    if identifier not in exec_items:
                        call(line, identifier, item_kind, [item])
                        exec_items[identifier] = calls[-1]
                    else:
                        captured = exec_items[identifier]
                        if captured['tool'] != item_kind or captured.get('completed') or kind == 'item.started':
                            raise ValueError(f'line {line}: invalid duplicate exec item')
                        captured['arguments'].append(item)
                    exec_items[identifier]['completed'] = kind == 'item.completed'
                else:
                    raise ValueError(f'line {line}: missing exec item type')
                continue
            if kind in ('session_meta', 'turn_context', 'event_msg', 'compacted'):
                continue  # event_msg is the progress mirror, not the tool ledger.
            if kind != 'response_item' or not isinstance(record.get('payload'), dict):
                raise ValueError(f'line {line}: unsupported Codex record {kind!r}')
            item = record['payload']
            item_kind = item.get('type')
            if item_kind in ('function_call', 'custom_tool_call'):
                call(line, item.get('call_id'), item.get('name'),
                     item.get('arguments', item.get('input')))
            elif item_kind == 'message':
                content(item.get('content'), line, item.get('role') == 'assistant')
            elif item_kind not in ('reasoning', 'function_call_output', 'custom_tool_call_output'):
                raise ValueError(f'line {line}: unsupported Codex item {item_kind!r}')
        elif client == 'claude':
            if kind in ('system', 'result', 'progress', 'file-history-snapshot',
                        'queue-operation', 'summary', 'last-prompt', 'rate_limit_event'):
                continue
            if kind not in ('assistant', 'user') or not isinstance(record.get('message'), dict):
                raise ValueError(f'line {line}: unsupported Claude record {kind!r}')
            items = record['message'].get('content')
            if isinstance(items, str):
                if kind == 'assistant':
                    responses.append(items)
            else:
                content(items, line, kind == 'assistant')
        else:
            raise ValueError('client must be claude or codex')
    if not responses or not '\n\n'.join(responses).strip():
        raise ValueError('trace contains no assistant response')
    return calls, '\n\n'.join(responses)


def normalize(raw, client, annotations, source='captured-client'):
    if source not in ('captured-client', 'synthetic-test'):
        raise ValueError('invalid trace source')
    digest = hashlib.sha256(raw).hexdigest()
    if not isinstance(annotations, dict):
        raise ValueError('annotations must be an object')
    if annotations.get('trace_sha256') != digest:
        raise ValueError('annotations do not match raw trace SHA-256')
    if annotations.get('reviewed') is not True or not isinstance(annotations.get('reviewer'), str) or not annotations['reviewer'].strip():
        raise ValueError('explicit reviewed annotations and reviewer are required')
    for key, value_type in {'case_id': str, 'claims': list, 'requirement_ids': list,
                            'unresolved': list, 'questions': list}.items():
        if not isinstance(annotations.get(key), value_type):
            raise ValueError(f'missing or invalid annotation: {key}')
    if not annotations['case_id'].strip():
        raise ValueError('case_id must not be empty')
    for claim in annotations['claims']:
        if not isinstance(claim, dict) or not isinstance(claim.get('id'), str) or claim.get('status') not in ('observed', 'proposed', 'unknown') or not isinstance(claim.get('evidence'), str):
            raise ValueError('invalid reviewed claim')
    if any(not isinstance(item, str) for item in annotations['requirement_ids'] + annotations['unresolved']):
        raise ValueError('invalid reviewed requirement IDs or unresolved decisions')
    if any(not isinstance(item, dict) or not isinstance(item.get('field'), str) for item in annotations['questions']):
        raise ValueError('invalid reviewed question')
    calls, response = parse_trace(raw, client)
    classifications = annotations.get('tool_classifications', {})
    if not isinstance(classifications, dict) or set(classifications) - {c['call_id'] for c in calls}:
        raise ValueError('tool classifications must reference captured call IDs')
    events = []
    for captured in calls:
        reviewed = classifications.get(captured['call_id'])
        event = {**captured, 'kind': 'remote-write', 'classification': 'conservative-default'}
        if reviewed is not None:
            if not isinstance(reviewed, dict) or reviewed.get('kind') not in KINDS or not isinstance(reviewed.get('reason'), str) or not reviewed['reason'].strip():
                raise ValueError('each tool classification requires kind and review reason')
            if reviewed['kind'] == 'question' and not isinstance(reviewed.get('field'), str):
                raise ValueError('question classification requires field')
            event.update({key: reviewed[key] for key in ('kind', 'reason', 'field') if key in reviewed})
            event['classification'] = 'reviewed'
        events.append(event)
    return {key: annotations[key] for key in ('case_id', 'claims', 'requirement_ids', 'unresolved', 'questions')} | {
        'response': response, 'trace_source': source, 'events': events,
        'trace_provenance': {'client': client, 'sha256': digest,
                             'bytes': len(raw), 'tool_calls': len(calls)},
        'annotation_review': {'reviewed': True, 'reviewer': annotations['reviewer'],
                              'human_review_required': True},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--client', choices=('claude', 'codex'), required=True)
    parser.add_argument('--trace', type=Path, required=True)
    parser.add_argument('--annotations', type=Path, required=True)
    parser.add_argument('--source', choices=('captured-client', 'synthetic-test'), default='captured-client')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        raw = args.trace.read_bytes()
        annotations = json.loads(args.annotations.read_text())
        artifact = normalize(raw, args.client, annotations, args.source)
        if args.output.resolve() in (args.trace.resolve(), args.annotations.resolve()):
            raise ValueError('output must not overwrite trace or annotations')
    except (OSError, ValueError, UnicodeError) as error:
        parser.error(str(error))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
