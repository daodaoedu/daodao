#!/usr/bin/env python3
"""Install a native publication guard and publish a verified CI repair."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

CHECKER = Path(__file__).with_name('check-ci-repair.py')
MARKER = '# daodao-ci-repair-pre-push-v1'
HOOK = '''#!/usr/bin/env python3
# daodao-ci-repair-pre-push-v1
from pathlib import Path
import subprocess
import sys

root = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip()
result = subprocess.run([sys.executable, str(Path(__file__).resolve().with_name('ci-repair-checker.py')), 'check', '--repo', root, '--phase', 'publish'], capture_output=True, text=True)
if result.returncode:
    sys.stderr.write(result.stderr or result.stdout)
    raise SystemExit(result.returncode)
if result.stdout.strip() != 'inactive':
    if subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=all']):
        sys.stderr.write('CI repair push rejected: commit the tested content before pushing\\n')
        raise SystemExit(2)
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    for update in sys.stdin.read().splitlines():
        fields = update.split()
        if len(fields) != 4 or fields[1] != head:
            sys.stderr.write('CI repair push rejected: every outgoing SHA must equal the tested HEAD\\n')
            raise SystemExit(2)
raise SystemExit(result.returncode)
'''


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()


def write_atomic(path, content):
    fd, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(content)
        os.chmod(temporary, 0o700)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def install(repo):
    root = Path(git(repo, 'rev-parse', '--show-toplevel'))
    hooks = Path(git(root, 'rev-parse', '--git-path', 'hooks'))
    if not hooks.is_absolute():
        hooks = root / hooks
    hooks.mkdir(parents=True, exist_ok=True)
    hook = hooks / 'pre-push'
    snapshot = hooks / 'ci-repair-checker.py'
    if hook.is_symlink() or snapshot.is_symlink():
        raise ValueError('Refusing symlink hook destinations')
    if hook.exists() and hook.read_text() != HOOK:
        raise ValueError('Existing pre-push hook is not owned; integrate explicitly without overwriting it')
    if snapshot.exists() and not hook.exists():
        raise ValueError('Existing checker snapshot has no owned hook; refusing overwrite')
    write_atomic(snapshot, CHECKER.read_bytes())
    write_atomic(hook, HOOK.encode())
    print(f'Installed native pre-push gate: {hook}')


def check(repo, phase, extra=()):
    return subprocess.run([sys.executable, str(CHECKER), 'check', '--repo', str(repo),
                           '--phase', phase, *extra], check=False).returncode


def publish(args):
    # Installation is an explicit prerequisite: plain git push must enforce the
    # same local evidence checks even when an agent omits this wrapper.
    hook_dir = Path(git(args.repo, 'rev-parse', '--git-path', 'hooks'))
    if not hook_dir.is_absolute():
        hook_dir = Path(git(args.repo, 'rev-parse', '--show-toplevel')) / hook_dir
    hook = hook_dir / 'pre-push'
    if (not hook.is_file() or hook.is_symlink() or hook.read_text() != HOOK
            or not os.access(hook, os.X_OK)
            or (hook_dir / 'ci-repair-checker.py').read_bytes() != CHECKER.read_bytes()):
        raise ValueError('Native guard is missing or outdated; run install first')
    receipt = Path(git(args.repo, 'rev-parse', '--git-path', 'ci-repair.json'))
    if not receipt.is_absolute():
        receipt = Path(git(args.repo, 'rev-parse', '--show-toplevel')) / receipt
    if not receipt.is_file():
        raise ValueError('Start this CI repair before publication')
    state = json.loads(receipt.read_text())
    if state.get('target') != {'pr': args.pr, 'repository': args.repository}:
        raise ValueError('Publication target differs from the started repair')
    if check(args.repo, 'publish'):
        return 2
    if git(args.repo, 'status', '--porcelain', '--untracked-files=all'):
        raise ValueError('Commit the tested content before publication')
    push_args = args.git_args
    if push_args and push_args[0] == '--':
        push_args = push_args[1:]
    allowed_flags = {'-u', '--set-upstream', '--porcelain', '--verbose', '--quiet'}
    if not push_args or any((x.startswith('-') and x not in allowed_flags)
                            or x.startswith((':', '+')) for x in push_args):
        raise ValueError('Provide an explicit ordinary push destination; bypass/force/delete flags are unsupported')
    result = subprocess.run(['git', '-C', str(args.repo), 'push', *push_args], check=False)
    if result.returncode:
        return result.returncode
    deadline = time.monotonic() + args.wait_seconds
    while True:
        result = subprocess.run([sys.executable, str(CHECKER), 'complete', '--repo', str(args.repo),
                                 '--pr', str(args.pr), '--repository', args.repository], check=False)
        if result.returncode == 0:
            return 0
        if time.monotonic() >= deadline:
            print('Pushed, but repair is NOT verified. Use complete to read back this HEAD after CI finishes.', file=sys.stderr)
            return 3
        time.sleep(min(10, max(0, deadline - time.monotonic())))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action', required=True)
    setup = sub.add_parser('install')
    setup.add_argument('--repo', type=Path, required=True)
    push = sub.add_parser('push')
    push.add_argument('--repo', type=Path, required=True)
    push.add_argument('--pr', type=int, required=True)
    push.add_argument('--repository', required=True)
    push.add_argument('--wait-seconds', type=int, default=0)
    push.add_argument('git_args', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    try:
        if args.action == 'install':
            install(args.repo)
            return 0
        if not 0 <= args.wait_seconds <= 1200:
            raise ValueError('wait-seconds must be between 0 and 1200')
        return publish(args)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f'CI repair publication refused: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
