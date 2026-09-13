#!/usr/bin/env python3
"""Diff heuristics, not semantic proof of test strength. See check-test-integrity.md."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

TEST_PATH = re.compile(r'(^|/)(__tests__|tests|test)/|(^|/)(test_[^/]+\.py|[^/]+(?:\.test|\.spec)\.[^/]+)$')
DISABLED = re.compile(r'\b(?:test|it|describe)(?:\s*\.\s*\w+)*\s*\.\s*(?:only|skip|todo)\b|\b(?:xtest|xit|xdescribe|fit|fdescribe)\s*\(|\b(?:pytest\.(?:mark\.)?(?:skip|skipif|xfail)|unittest\.(?:skip|skipIf|skipUnless|expectedFailure))\b')
REMOVED = re.compile(r'\b(?:test|it|describe)(?:\s*\.\s*\w+)*\s*\(|\b(?:expect|assert\w*)\s*\(|\bassert\s|\bdef\s+test_')


def scan(diff):
    findings = []
    filename = ''
    line_number = 0
    for line in diff.splitlines():
        if line.startswith('diff --git '):
            filename = ''
        elif line.startswith('--- a/'):
            filename = line[6:]
        elif line.startswith('+++ b/'):
            filename = line[6:]
        elif line.startswith('@@ '):
            match = re.search(r'\+(\d+)', line)
            line_number = int(match.group(1)) if match else 0
        elif TEST_PATH.search(filename) and line[:1] in ('+', '-'):
            text = line[1:]
            kind = None
            if line.startswith('+') and DISABLED.search(text):
                kind = 'disabled-or-focused'
            elif line.startswith('-') and REMOVED.search(text):
                kind = 'removed-test-or-assertion'
            if kind:
                findings.append({'path': filename, 'line': line_number, 'kind': kind, 'text': text})
            if line.startswith('+'):
                line_number += 1
        elif line.startswith(' '):
            line_number += 1
    return findings


def valid_review(review, base, digest):
    return (isinstance(review, dict) and review.get('base') == base
            and review.get('test_diff_sha256') == digest
            and all(isinstance(review.get(k), str) and review[k].strip()
                    for k in ('reviewer', 'reason', 'evidence')))


def git(*args):
    return subprocess.check_output(['git', '-c', 'core.quotePath=false', *args], text=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', required=True, help='Explicit base commit/ref; resolved to commit SHA')
    parser.add_argument('--head', help='Explicit head commit/ref; omitted means tracked working tree')
    parser.add_argument('--review', type=Path, help='Optional human review receipt JSON for removals')
    args = parser.parse_args()
    try:
        base = git('rev-parse', '--verify', args.base + '^{commit}').strip()
        refs = [base]
        if args.head:
            refs.append(git('rev-parse', '--verify', args.head + '^{commit}').strip())
        names = git('diff', '--no-ext-diff', '--no-renames', '--name-only', '-z', *refs, '--').split('\0')
        paths = [name for name in names if name and TEST_PATH.search(name)]
        diff = git('diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--unified=3', *refs, '--', *paths) if paths else ''
        digest = hashlib.sha256(diff.encode()).hexdigest()
        findings = scan(diff)
        reviewed = False
        if args.review:
            reviewed = valid_review(json.loads(args.review.read_text()), base, digest)
            if not reviewed:
                raise ValueError('Review receipt is incomplete or does not match this base and test diff')
        blocked = any(f['kind'] == 'disabled-or-focused' for f in findings)
        needs_review = any(f['kind'] == 'removed-test-or-assertion' for f in findings) and not reviewed
        print(json.dumps({'base': base, 'test_diff_sha256': digest, 'findings': findings,
                          'review_receipt_matches': reviewed, 'review_required': needs_review,
                          'status': 'blocked' if blocked else 'review-required' if needs_review else 'pass'}, ensure_ascii=False, indent=2))
        return 1 if blocked else 2 if needs_review else 0
    except (subprocess.CalledProcessError, OSError, ValueError) as error:
        print(f'Test integrity check failed: {error}', file=sys.stderr)
        return 3


if __name__ == '__main__':
    sys.exit(main())
