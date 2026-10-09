#!/usr/bin/env python3
"""Fail-closed pre-PR check of committed diff and hash-bound capture.

The capture must be independently collected. Hashes prevent unnoticed drift,
not fabrication by an actor who can rewrite both capture and manifest.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

spec = importlib.util.spec_from_file_location('handoff', Path(__file__).with_name('agent-handoff.py'))
handoff = importlib.util.module_from_spec(spec)
spec.loader.exec_module(handoff)


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.PIPE).decode().rstrip('\n')


def load_bound(directory, ref, digest):
    if not handoff.path_ok(ref) or not isinstance(digest, str) or len(digest) != 64:
        raise ValueError('invalid evidence ref/hash')
    path = directory / ref
    if path.is_symlink() or any(p.is_symlink() for p in path.parents if p.is_relative_to(directory)):
        raise ValueError('symlink evidence rejected')
    if not path.resolve().is_relative_to(directory.resolve()):
        raise ValueError('evidence outside artifact directory')
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != digest:
        raise ValueError('evidence hash mismatch')
    return raw


def check(repo, artifact, base, require_trace=False):
    if artifact.is_symlink():
        raise ValueError('symlink artifact rejected')
    data = json.loads(artifact.read_text())
    errors = handoff.validate(data)
    if errors:
        return errors
    head = git(repo, 'rev-parse', 'HEAD')
    resolved_base = git(repo, 'rev-parse', '--verify', base + '^{commit}')
    if data.get('head_revision') != head or data.get('base_revision') != resolved_base:
        errors.append('stale or mismatched base/head revision')
    git(repo, 'merge-base', '--is-ancestor', resolved_base, head)
    # --no-renames includes both old and new names; NUL delimiters preserve spaces.
    changed = set(filter(None, git(repo, 'diff', '--name-only', '-z', '--no-renames', resolved_base, head).split('\0')))
    if set(data['writes']) != changed:
        errors.append('writes must exactly match committed Git diff')
    if not changed.issubset(set(data['owned_paths'])):
        errors.append('Git diff outside owned files')
    # Evidence lives in task dir outside the repository, never silently excluded.
    if git(repo, 'status', '--porcelain', '--untracked-files=all'):
        errors.append('dirty repository: capture final committed head before delivery')
    capture = data.get('trace')
    if not isinstance(capture, dict):
        reason = data.get('trace_reason')
        if require_trace or data.get('trace_status') not in ('unavailable', 'partial') or not isinstance(reason, str) or not reason.strip():
            errors.append('missing independently captured trace or explicit unavailable reason')
        else:
            print('WARNING: operation trace unverified: ' + reason, file=sys.stderr)
    else:
        trace = json.loads(load_bound(artifact.parent, capture.get('ref'), capture.get('sha256')))
        if not isinstance(trace, dict) or trace.get('head_revision') != head or not isinstance(trace.get('events'), list):
            errors.append('invalid or stale trace')
            return errors
        if require_trace:
            if trace.get('source') != 'filesystem-observer' or trace.get('coverage') != 'monitored-repo-window' or trace.get('errors') != []:
                errors.append('strict trace requires healthy independent filesystem capture')
            start_revision = trace.get('start_revision')
            if not isinstance(start_revision, str):
                errors.append('strict trace lacks start revision')
            else:
                git(repo, 'merge-base', '--is-ancestor', start_revision, head)
                if git(repo, 'diff', '--name-only', resolved_base, start_revision):
                    errors.append('capture started after changes relative to PR base')
            journal_raw = load_bound(artifact.parent, trace.get('journal_ref'), trace.get('journal_sha256'))
            journal_events = [json.loads(line) for line in journal_raw.decode().splitlines() if line.strip()]
            journal_targets = set()
            for event in journal_events:
                if not isinstance(event, dict) or event.get('kind') != 'local-write' or not isinstance(event.get('targets'), list) or any(not handoff.path_ok(p) for p in event['targets']):
                    raise ValueError('invalid independent journal event')
                for target in event['targets']:
                    ignored = subprocess.run(['git', '-C', str(repo), 'check-ignore', '-q', '--', target], capture_output=True)
                    if ignored.returncode not in (0, 1):
                        raise ValueError('cannot classify journal target')
                    if ignored.returncode == 1 or target in changed:
                        journal_targets.add(target)
            if any(not isinstance(e, dict) or not isinstance(e.get('targets', []), list) for e in trace['events']):
                raise ValueError('invalid trace event')
            claimed_targets = {p for e in trace['events'] for p in e.get('targets', [])}
            if claimed_targets != journal_targets:
                errors.append('trace must account for every non-ignored journal write')
            if not journal_targets.issubset(set(data['owned_paths'])):
                errors.append('independent journal writes outside owned files')
        writes = set()
        question_count = 0
        for event in trace['events']:
            if not isinstance(event, dict) or event.get('kind') not in ('read', 'question', 'local-write'):
                errors.append('unsupported or remote trace event: manual review required')
                continue
            if event['kind'] == 'question':
                question_count += 1
            if event['kind'] == 'question' and data['mode'] == 'intake' and event.get('field') in handoff.FORBIDDEN:
                errors.append('forbidden intake question in trace')
            if event['kind'] == 'local-write':
                targets = event.get('targets')
                if not isinstance(targets, list) or not targets or any(not handoff.path_ok(p) for p in targets):
                    errors.append('trace write lacks relative targets')
                else:
                    writes.update(targets)
        if data['mode'] == 'intake' and question_count > 2:
            errors.append('too many intake questions in trace')
        if not changed.issubset(writes) or not writes.issubset(set(data['owned_paths'])):
            errors.append('trace omits Git changes or writes outside owned files')
    for claim in data['claims']:
        if claim['status'] == 'verified':
            proof = claim['evidence']
            if proof['revision'] != head:
                errors.append('claim evidence not bound to final head')
            load_bound(artifact.parent, proof['ref'], proof.get('sha256'))
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--artifact', type=Path, required=True)
    parser.add_argument('--base', required=True, help='trusted merge-base SHA supplied by caller')
    parser.add_argument('--require-trace', action='store_true', help='opt-in strict trace pilot; not enabled until real client capture is complete')
    args = parser.parse_args()
    try:
        errors = check(args.repo, args.artifact, args.base, args.require_trace)
    except (OSError, ValueError, subprocess.CalledProcessError, TypeError, KeyError) as exc:
        errors = [f'delivery cannot be verified: {exc}']
    print('\n'.join(errors) if errors else 'delivery manifest passed: Git diff and evidence bindings checked; operation trace is a separate pilot')
    return 2 if errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
