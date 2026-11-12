#!/usr/bin/env python3
"""Local, content-bound CI repair evidence. This is not a security boundary."""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import time


def fail(message):
    raise ValueError(message)


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.PIPE).decode().strip()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fingerprint(repo):
    paths = subprocess.check_output(['git', '-C', str(repo), 'ls-files', '-z', '--cached', '--others', '--exclude-standard']).split(b'\0')
    staged = subprocess.check_output(['git', '-C', str(repo), 'ls-files', '--stage', '-z']).split(b'\0')
    gitlinks = {}
    for entry in staged:
        if entry.startswith(b'160000 '):
            meta, raw = entry.split(b'\t', 1)
            gitlinks[raw] = meta.split()[1].decode()
    entries = []
    for raw in sorted(set(paths) - {b''}):
        path = repo / os.fsdecode(raw)
        if raw in gitlinks:
            pinned = gitlinks[raw]
            actual = pinned
            if (path / '.git').exists():
                if git(path, 'status', '--porcelain', '--untracked-files=all'):
                    fail('Dirty submodule: ' + str(path))
                actual = git(path, 'rev-parse', 'HEAD')
            value = ('gitlink:' + pinned + ':' + actual).encode()
        elif path.is_symlink():
            value = b'link:' + os.fsencode(os.readlink(path))
        elif path.is_file():
            value = b'file:' + str(path.stat().st_mode & 0o111).encode() + b':' + path.read_bytes()
        elif path.is_dir():
            fail('Nested repositories/submodules are unsupported: ' + str(path))
        else:
            continue
        entries.append(raw + b'\0' + digest(value).encode())
    return digest(b'\0'.join(entries))


def save(path, state):
    tmp = path.with_suffix('.tmp')
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as stream:
        json.dump(state, stream, indent=2)
    os.replace(tmp, path)
    os.chmod(path, 0o600)


def failure_streak(state):
    failures = []
    for run in state['runs']:
        if run['phase'] == 'after' and run['scope'] == 'full':
            if run['returncode'] == 0:
                failures = []
            else:
                failures.append(run['id'])
    return failures


def valid_observation(state, number, pair):
    return any(r['id'] == number and r['id'] > pair[-1] and r['scope'] == 'probe' and r['returncode'] == 0 and r['source_before'] == r['source_after'] for r in state['runs'])


def verify_artifacts(state, evidence):
    for run in state['runs']:
        name = run['artifact']
        if not isinstance(name, str) or Path(name).name != name or name in ('', '.', '..'):
            fail('Invalid artifact basename')
        artifact = evidence / name
        if artifact.is_symlink(): fail('Symlink evidence artifact rejected')
        if digest(artifact.read_bytes()) != run['sha256']:
            fail('Evidence artifact hash mismatch')
        if run['scope'] == 'full' and run['argv'] != state['argv']:
            fail('Full run command differs from bound command')


def audit_needed(state):
    failures = failure_streak(state)
    if len(failures) < 2:
        return
    pair = failures[-2:]
    if not any(a['failures'] == pair and valid_observation(state, a.get('observation_run'), pair) for a in state['audits']):
        fail('Two failed full repairs require audit before another run or publication')


def verify_publish(repo, state, evidence):
    audit_needed(state)
    verify_artifacts(state, evidence)
    after = [r for r in state['runs'] if r['phase'] == 'after' and r['scope'] == 'full']
    if not after or after[-1]['returncode'] != 0:
        fail('Latest full after attempt must pass')
    passing = after[-1]
    if passing['source_before'] != passing['source_after'] or passing['source_after'] != fingerprint(repo):
        fail('Passing evidence does not match current source')
    if not any(r['phase'] == 'before' and r['scope'] == 'full' and r['returncode'] not in (0, 124, 127) and not r.get('blocked', False) and r['id'] < passing['id'] for r in state['runs']):
        fail('A prior failing full before run is required')


def remote_check(repo, state, pr, repository):
    head = git(repo, 'rev-parse', 'HEAD')
    # Evidence may survive commits, but completion must describe committed content.
    if subprocess.check_output(['git', '-C', str(repo), 'status', '--porcelain', '--untracked-files=all']):
        fail('Completion requires a clean worktree')
    data = json.loads(subprocess.check_output(['gh', 'pr', 'view', str(pr), '--repo', repository, '--json', 'headRefOid,statusCheckRollup'], cwd=repo))
    if data.get('headRefOid') != head:
        fail('Remote PR head differs from current HEAD')
    checks = data.get('statusCheckRollup')
    if not isinstance(checks, list) or not checks:
        fail('Remote checks must be nonempty')
    for check in checks:
        name = check.get('name') or check.get('context')
        conclusion = check.get('conclusion') or check.get('state')
        terminal = check.get('status', 'COMPLETED') == 'COMPLETED'
        if not terminal or not (conclusion == 'SUCCESS' or (conclusion == 'SKIPPED' and name in state['allow_skipped'])):
            fail('Remote check not accepted: ' + str(name))
    return {'head': head, 'pr': pr, 'repository': repository, 'checks': checks, 'queried_at': time.time()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    for action in ['start', 'run', 'audit', 'check', 'complete']:
        p = sub.add_parser(action); p.add_argument('--repo', required=True)
        if action == 'start':
            for name in ['case', 'environment', 'command-json']:
                p.add_argument('--' + name, required=True)
            p.add_argument('--pr', type=int, required=True)
            p.add_argument('--repository', required=True)
            p.add_argument('--allow-skipped', action='append', default=[], choices=['EAS Build Check', 'notify-failure'])
        if action == 'run':
            p.add_argument('--phase', choices=['before', 'after'], required=True)
            p.add_argument('--scope', choices=['full', 'probe'], required=True)
            p.add_argument('--timeout', type=float, default=None)
            p.add_argument('--probe-command-json')
        if action == 'audit':
            p.add_argument('--observation-run', type=int, required=True)
            for name in ['assumption', 'observation', 'decision']:
                p.add_argument('--' + name, required=True)
        if action == 'check':
            p.add_argument('--phase', choices=['publish', 'complete'], required=True)
        if action == 'complete':
            p.add_argument('--pr', type=int, required=True); p.add_argument('--repository', required=True)
    args = parser.parse_args()
    repo = Path(git(args.repo, 'rev-parse', '--show-toplevel')).resolve()
    path = Path(git(repo, 'rev-parse', '--git-path', 'ci-repair.json'))
    if not path.is_absolute(): path = repo / path
    evidence = path.parent / 'ci-repair-evidence'
    branch = git(repo, 'symbolic-ref', '--quiet', '--short', 'HEAD')
    if args.action == 'start':
        if path.exists() and json.loads(path.read_text()).get('status') != 'complete':
            fail('Active receipt already exists')
        argv = json.loads(args.command_json)
        if not isinstance(argv, list) or not argv or not all(isinstance(v, str) and v for v in argv):
            fail('command-json must be a nonempty argv string array')
        if args.pr <= 0 or not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repository): fail('Valid positive PR and owner/name repository required')
        if not args.case.strip() or not args.environment.strip(): fail('Case and environment must be nonempty')
        state = dict(version=1, target={'pr': args.pr, 'repository': args.repository}, status='active', root=str(repo), branch=branch, case=args.case, environment=args.environment, argv=argv, allow_skipped=args.allow_skipped, runs=[], audits=[])
        evidence.mkdir(mode=0o700, exist_ok=True); os.chmod(evidence, 0o700)
        save(path, state); return 0
    if not path.exists():
        if args.action == 'check' and args.phase == 'publish': print('inactive'); return 0
        fail('No active repair receipt')
    state = json.loads(path.read_text())
    if state['root'] != str(repo) or state['branch'] != branch: fail('Receipt root or branch mismatch')
    if args.action == 'run':
        if args.scope == 'full':
            if args.probe_command_json is not None: fail('Probe command override requires scope probe')
            audit_needed(state)
        argv = state['argv']
        if args.probe_command_json is not None:
            argv = json.loads(args.probe_command_json)
            if not isinstance(argv, list) or not argv or not all(isinstance(v, str) and v for v in argv):
                fail('Probe command must be a nonempty argv string array')
        before = fingerprint(repo)
        try:
            result = subprocess.run(argv, cwd=repo, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=args.timeout)
            output, rc = result.stdout, result.returncode
        except subprocess.TimeoutExpired as exc:
            output, rc = (exc.stdout or b'') + b'\nCI repair command timed out\n', 124
        except OSError as exc:
            output, rc = str(exc).encode(), 127
        number = len(state['runs']) + 1
        name = str(time.time_ns()) + '-' + str(number) + '.log'
        fd = os.open(evidence / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as stream: stream.write(output)
        state['runs'].append(dict(id=number, argv=argv, phase=args.phase, scope=args.scope, returncode=rc, blocked=rc in (124, 127), artifact=name, sha256=digest(output), source_before=before, source_after=fingerprint(repo)))
        state['status'] = 'active'; save(path, state)
        print('CI repair run: returncode=' + str(rc) + ' artifact=' + str(evidence / name))
        return rc if rc >= 0 else 128 - rc
    if args.action == 'audit':
        values = [args.assumption, args.observation, args.decision]
        if not all(v.strip() for v in values): fail('Audit strings must be nonempty')
        failures = failure_streak(state)
        if len(failures) < 2: fail('Audit requires two failed full after runs')
        pair = failures[-2:]
        verify_artifacts(state, evidence)
        if not valid_observation(state, args.observation_run, pair): fail('Audit needs successful probe after latest failure pair')
        probe = next(r for r in state['runs'] if r['id'] == args.observation_run)
        if probe['source_after'] != fingerprint(repo): fail('Observation probe does not match current source')
        state['audits'].append(dict(failures=pair, observation_run=args.observation_run, assumption=args.assumption, observation=args.observation, decision=args.decision))
        save(path, state); return 0
    verify_publish(repo, state, evidence)
    if args.action == 'complete' or args.phase == 'complete':
        target = state['target']
        pr, repository = target['pr'], target['repository']
        if args.action == 'complete':
            if args.pr != pr or args.repository != repository: fail('Completion target differs from start target')
        elif not state.get('final'):
            fail('No final remote evidence; run complete')
        state['final'] = remote_check(repo, state, pr, repository)
        state['status'] = 'complete'; save(path, state)
    print('verified'); return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, KeyError, TypeError, AttributeError, UnicodeError, OSError, subprocess.SubprocessError) as exc:
        print('CI repair evidence rejected: ' + str(exc), file=sys.stderr)
        sys.exit(2)
