#!/usr/bin/env python3
"""Claude PreToolUse guard for newly introduced test skip/focus markers."""
import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path

SCANNER = Path(__file__).resolve().parents[2] / 'scripts' / 'check-test-integrity.py'
spec = importlib.util.spec_from_file_location('test_integrity', SCANNER)
integrity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(integrity)


def evaluate(event):
    if not isinstance(event, dict) or not isinstance(event.get('tool_name'), str):
        raise ValueError('Expected a hook event with tool_name')
    tool = event['tool_name']
    if tool not in ('Write', 'Edit'):
        return None
    inputs = event.get('tool_input')
    if not isinstance(inputs, dict) or not isinstance(inputs.get('file_path'), str):
        raise ValueError('Write/Edit requires tool_input.file_path')
    path = Path(inputs['file_path'])
    if not path.is_absolute():
        cwd = event.get('cwd')
        if not isinstance(cwd, str) or not Path(cwd).is_absolute():
            raise ValueError('Relative file_path requires an absolute event cwd')
        path = Path(cwd) / path
    if not integrity.TEST_PATH.search(path.as_posix()):
        return None
    before = path.read_text() if path.exists() else ''
    if tool == 'Write':
        after = inputs.get('content')
        if not isinstance(after, str):
            raise ValueError('Write requires string content')
    else:
        old, new = inputs.get('old_string'), inputs.get('new_string')
        if not isinstance(old, str) or not isinstance(new, str) or not old:
            raise ValueError('Edit requires nonempty old_string and string new_string')
        occurrences = before.count(old)
        replace_all = inputs.get('replace_all', False)
        if not isinstance(replace_all, bool):
            raise ValueError('Edit replace_all must be boolean')
        if occurrences == 0 or (occurrences > 1 and not replace_all):
            raise ValueError('Edit target is missing or ambiguous; refresh file before retrying')
        after = before.replace(old, new, -1 if replace_all else 1)
    # Compare complete marker-bearing lines as a multiset, so unchanged/moved
    # legacy lines are accepted while newly added occurrences remain blocked.
    def markers(text):
        return Counter(line.strip() for line in text.splitlines() if integrity.DISABLED.search(line))
    introduced = markers(after) - markers(before)
    if introduced:
        return ('Test integrity blocked newly introduced skip/focus/todo marker(s) in '
                + str(path) + '. Keep these tests executable and rerun the edit. '
                'Existing unchanged markers are allowed. This hook cannot accept review receipts; '
                'removed assertions are checked separately by the CLI/CI gate.')
    return None


def main():
    try:
        reason = evaluate(json.load(sys.stdin))
        if reason:
            print(reason, file=sys.stderr)
            return 2
        return 0
    except (ValueError, OSError, TypeError) as error:
        print(f'Test integrity hook could not validate the proposed edit: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
