#!/usr/bin/env python3
"""Launch the canonical hooks using Windows Python and Git for Windows."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

HOOKS_DIR = Path(__file__).resolve().parent
ALLOWED = {
    'session-start.sh', 'pre-write-guard.sh', 'test-integrity-guard.py',
    'pre-pr-gate.sh', 'post-write-format.sh', 'stop-quality-gate.sh',
}


def normalize_event(event):
    for key in ('cwd', 'workingDirectory'):
        if isinstance(event.get(key), str):
            event[key] = event[key].replace('\\', '/')
    for key in ('tool_input', 'toolInput'):
        inputs = event.get(key)
        if isinstance(inputs, dict):
            for field in ('file_path', 'filePath'):
                if isinstance(inputs.get(field), str):
                    inputs[field] = inputs[field].replace('\\', '/')
    return event


def file_events(event):
    """Translate Codex patches into the canonical hooks' per-file proposals.

    PreToolUse reads the current file and applies exact patch contexts in memory.
    Ambiguous/missing contexts fail closed rather than skipping policy checks.
    PostToolUse only needs the paths of files that have already been changed.
    """
    if event.get('tool_name') != 'apply_patch':
        return [event]
    patch = event.get('tool_input', {}).get('command')
    if not isinstance(patch, str) or not patch.startswith('*** Begin Patch\n'):
        raise ValueError('Cannot validate an apply_patch event without its patch command')
    lines = patch.splitlines()
    proposals = []
    index = 1
    while index < len(lines) and lines[index] != '*** End Patch':
        header = lines[index]
        kinds = ('*** Add File: ', '*** Update File: ', '*** Delete File: ')
        prefix = next((p for p in kinds if header.startswith(p)), None)
        if prefix is None:
            raise ValueError('Unrecognized patch file header')
        path = Path(header[len(prefix):])
        if not path.is_absolute():
            path = Path(event['cwd']) / path
        path = path.resolve()
        index += 1
        move_to = None
        if index < len(lines) and lines[index].startswith('*** Move to: '):
            move_to = Path(lines[index][len('*** Move to: '):])
            if not move_to.is_absolute():
                move_to = Path(event['cwd']) / move_to
            move_to = move_to.resolve()
            index += 1
        body = []
        while index < len(lines) and not lines[index].startswith(('*** Add File:', '*** Update File:', '*** Delete File:', '*** End Patch')):
            body.append(lines[index])
            index += 1
        target = move_to or path
        if event.get('hook_event_name') == 'PostToolUse':
            if prefix == kinds[2]:
                continue
            content = target.read_text(encoding='utf-8') if target.is_file() else ''
        elif prefix == kinds[0]:
            if any(not line.startswith('+') for line in body):
                raise ValueError('Invalid add-file patch')
            content = '\n'.join(line[1:] for line in body) + '\n'
        elif prefix == kinds[2]:
            content = ''
        else:
            source = path.read_text(encoding='utf-8')
            current = source.splitlines()
            cursor = 0
            offset = 0
            while offset < len(body):
                if not body[offset].startswith('@@'):
                    raise ValueError('Missing patch update context')
                offset += 1
                hunk = []
                while offset < len(body) and not body[offset].startswith('@@'):
                    if body[offset] != '*** End of File':
                        hunk.append(body[offset])
                    offset += 1
                if any(not line or line[0] not in ' +-' for line in hunk):
                    raise ValueError('Invalid update hunk')
                before = [line[1:] for line in hunk if line[0] in ' -']
                after = [line[1:] for line in hunk if line[0] in ' +']
                matches = [i for i in range(cursor, len(current) - len(before) + 1)
                           if current[i:i + len(before)] == before] if before else [len(current)]
                if len(matches) != 1:
                    raise ValueError('Patch context is missing or ambiguous; refresh the file')
                start = matches[0]
                current[start:start + len(before)] = after
                cursor = start + len(after)
            content = '\n'.join(current) + ('\n' if current else '')
        for guarded_path in ([path, target] if move_to else [target]):
            proposal = dict(event)
            proposal['tool_name'] = 'Write'
            proposal['tool_input'] = {'file_path': guarded_path.as_posix(), 'content': content}
            proposals.append(proposal)
    if index >= len(lines) or lines[index] != '*** End Patch':
        raise ValueError('Patch is missing its end marker')
    return proposals


def main():
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    if len(sys.argv) != 2 or sys.argv[1] not in ALLOWED:
        print('Expected one canonical Dao Dao hook filename.', file=sys.stderr)
        return 2
    hook = HOOKS_DIR / sys.argv[1]
    try:
        raw = sys.stdin.read()
        event = json.loads(raw) if raw.strip() else {}
        if not isinstance(event, dict):
            raise ValueError('Expected a hook event object')
        audit_dir = os.environ.get('DAODAO_HOOK_AUDIT_DIR')
        if audit_dir:
            audit = Path(audit_dir)
            audit.mkdir(parents=True, exist_ok=True)
            (audit / f'{os.getpid()}-{hook.name}.json').write_text(
                json.dumps(event, ensure_ascii=False, indent=2), encoding='utf-8')
        events = file_events(normalize_event(event))
        env = os.environ.copy()
        env['PYTHONUTF8'] = '1'
        if hook.suffix == '.py':
            command = [sys.executable, str(hook)]
        else:
            git = shutil.which('git')
            if not git:
                raise ValueError('Git for Windows is required')
            git_root = Path(git).resolve().parent.parent
            # A scoped MSYS build can use the container's private object namespace.
            # Prefer it when installed beside this checkout; retain ordinary Git
            # for Windows as the default on machines without that local runtime.
            private_bin = HOOKS_DIR.parents[2] / 'daodao-hook-runtime' / 'usr' / 'bin'
            configured_bash = os.environ.get('DAODAO_HOOK_BASH')
            bash = Path(configured_bash) if configured_bash else (
                private_bin / 'bash.exe' if (private_bin / 'bash.exe').is_file() else git_root / 'bin' / 'bash.exe')
            bash_bin = bash.parent
            if not bash.is_file():
                raise ValueError(f'Git Bash was not found at {bash}')
            tools = Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'tools' / 'daodao-hooks'
            env['PATH'] = os.pathsep.join([
                str(tools), str(bash_bin), str(git_root / 'bin'), str(git_root / 'usr' / 'bin'),
                str(Path(sys.executable).parent), env.get('PATH', ''),
            ])
            if not shutil.which('jq', path=env['PATH']):
                raise ValueError('jq is required; place jq.exe in ' + str(tools))
            # Windows Python need not provide python3.exe. Export the selected
            # interpreter as a function to canonical scripts and their children.
            env['DAODAO_HOOK_PYTHON'] = Path(sys.executable).as_posix()
            command = [str(bash), '-c',
                       'python3() { "$DAODAO_HOOK_PYTHON" "$@"; }; export -f python3; exec "$BASH" "$1"',
                       'daodao-hook', str(hook).replace('\\', '/')]
        for proposal in events:
            payload = json.dumps(proposal, ensure_ascii=False)
            result = subprocess.run(command, input=payload.encode('utf-8'), env=env, capture_output=True)
            if audit_dir:
                (audit / f'{os.getpid()}-{hook.name}-result.json').write_text(json.dumps({
                    'exit_code': result.returncode,
                    'stdout': result.stdout.decode('utf-8', errors='replace'),
                    'stderr': result.stderr.decode('utf-8', errors='replace'),
                }, ensure_ascii=False, indent=2), encoding='utf-8')
            sys.stderr.buffer.write(result.stderr)
            if hook.name == 'stop-quality-gate.sh' and result.returncode == 0:
                print(json.dumps({'systemMessage': result.stdout.decode('utf-8', errors='replace').strip()}, ensure_ascii=False))
            else:
                sys.stdout.buffer.write(result.stdout)
            if result.returncode:
                return result.returncode
        return 0
    except (OSError, ValueError) as error:
        print(f'Dao Dao Windows hook could not run: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
