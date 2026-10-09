#!/usr/bin/env python3
"""Validate normalized handoffs; this cannot authenticate evidence or prose."""
import argparse
import json
from pathlib import Path, PurePosixPath

STAGES = {'implementation', 'test', 'merge', 'deployment', 'usable'}
FORBIDDEN = {'repo', 'sha', 'owner', 'root-cause'}


def path_ok(value):
    return (isinstance(value, str) and bool(value.strip()) and '\\' not in value
            and not PurePosixPath(value).is_absolute()
            and '..' not in value.split('/') and value != '.')


def validate(data):
    errors = []
    if not isinstance(data, dict):
        return ['handoff must be an object']
    for key in ('claims', 'questions', 'owned_paths', 'writes', 'recurrences'):
        if not isinstance(data.get(key), list):
            errors.append(f'{key} must be a list')
    if errors:
        return errors
    if data.get('mode') not in ('intake', 'development'):
        errors.append('mode must be intake or development')
    for claim in data['claims']:
        if not isinstance(claim, dict) or not isinstance(claim.get('stage'), str) or claim.get('stage') not in STAGES or not isinstance(claim.get('status'), str) or claim.get('status') not in ('verified', 'unverified'):
            errors.append('invalid claim stage/status')
            continue
        if claim['status'] == 'verified':
            proof = claim.get('evidence', {})
            if not isinstance(proof, dict) or proof.get('stage') != claim['stage']:
                errors.append('evidence stage cannot substitute for claim stage')
                continue
            fields = ['ref', 'revision', 'observed_at']
            if claim['stage'] == 'test':
                fields += ['command', 'result']
            if claim['stage'] in ('deployment', 'usable'):
                fields += ['environment', 'result']
            if any(not isinstance(proof.get(k), str) or not proof[k].strip() for k in fields):
                errors.append('verified claim lacks evidence context')
    if any(not isinstance(q, dict) or not isinstance(q.get('field'), str) for q in data['questions']):
        errors.append('invalid question')
    elif data.get('mode') == 'intake':
        if len(data['questions']) > 2 or any(q['field'] in FORBIDDEN for q in data['questions']):
            errors.append('intake asks technical fields or more than two questions')
    owned = data['owned_paths']
    if any(not path_ok(p) for p in owned + data['writes']):
        errors.append('write scope requires relative file paths without traversal')
    elif any(p not in owned for p in data['writes']):
        errors.append('write outside explicit owned files')
    for item in data['recurrences']:
        if not isinstance(item, dict) or type(item.get('count')) is not int or item['count'] < 1:
            errors.append('invalid recurrence')
            continue
        if item['count'] >= 2:
            assessment = item.get('assessment', {})
            if not isinstance(assessment, dict) or any(not isinstance(assessment.get(k), str) or not assessment[k].strip() for k in ('lint', 'type', 'directory')):
                errors.append('second occurrence requires lint/type/directory assessment')
            if item.get('control') not in ('lint', 'type', 'directory', 'prompt') or not isinstance(item.get('regression_ref'), str) or not item['regression_ref'].strip():
                errors.append('second occurrence requires control and regression reference')
            if item.get('control') == 'prompt' and (not isinstance(item.get('why_not_mechanical'), str) or not item['why_not_mechanical'].strip()):
                errors.append('prompt fallback requires reason mechanical controls cannot apply')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('artifact', type=Path)
    args = parser.parse_args()
    try:
        errors = validate(json.loads(args.artifact.read_text()))
    except (OSError, ValueError) as exc:
        errors = [str(exc)]
    print('\n'.join(errors) if errors else 'handoff contract passed (evidence authenticity not checked)')
    return bool(errors)


if __name__ == '__main__':
    raise SystemExit(main())
