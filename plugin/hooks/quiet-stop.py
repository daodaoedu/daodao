#!/usr/bin/env python3
"""Keep Stop checks intact while making successful advisory output quiet."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.parent.chmod(0o700)
    fd, name = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(data, stream, ensure_ascii=False)
            stream.write('\n')
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        stream.reconfigure(encoding='utf-8', errors='replace')
    raw = os.environ.get('CLAUDE_TOOL_INPUT') or sys.stdin.read()
    try:
        event = json.loads(raw or '{}')
        if not isinstance(event, dict):
            event = {}
    except ValueError:
        event = {}
    args = ([sys.executable, str(Path(__file__).with_name('run-windows.py')), 'stop-quality-gate.sh']
            if os.name == 'nt' else ['bash', str(Path(__file__).with_name('stop-quality-gate.sh'))])
    result = subprocess.run(args, input=raw, capture_output=True, text=True, encoding='utf-8', errors='replace')
    session = event.get('session_id') or event.get('sessionId') or event.get('thread_id') or os.environ.get('CODEX_THREAD_ID')
    cwd = os.environ.get('CLAUDE_WORKING_DIRECTORY') or event.get('cwd') or event.get('workingDirectory') or os.getcwd()
    key = json.dumps([cwd, session], sort_keys=True)
    folder = Path(os.environ.get('XDG_CACHE_HOME', str(Path.home() / '.cache'))) / 'daodao-harness/stop-reports' / hashlib.sha256(key.encode()).hexdigest()
    report = folder / 'latest.json'
    warnings = []
    passthrough = False
    try:
        payload = json.loads(result.stdout) if result.stdout.strip() else {}
        message = payload.get('systemMessage', '')
        # Older Windows adapters envelope the canonical JSON as a string.
        if isinstance(message, str) and message.lstrip().startswith('{'):
            nested = json.loads(message)
            message = nested.get('systemMessage', message)
    except (ValueError, AttributeError):
        message = result.stdout
    if not isinstance(message, str):
        message = result.stdout
        passthrough = True
    # Success summaries and green file inventories are reports, not warnings.
    risk_section = False
    for line in message.splitlines():
        if not line.strip():
            risk_section = False
        if '🚨' in line:
            risk_section = True
        if (risk_section and line.strip()) or '⚠' in line or '🚨' in line or ('Post-merge closeout:' in line and 'completed=false' in line):
            warnings.append(line.strip())
    fingerprint = hashlib.sha256('\n'.join(warnings).encode()).hexdigest()
    try:
        previous = json.loads(report.read_text(encoding='utf-8'))
        if (not isinstance(previous, dict) or not isinstance(previous.get('warnings', []), list)
                or not isinstance(previous.get('notified', []), list)):
            previous = {}
    except (OSError, ValueError):
        previous = {}
    notified = [line for line in previous.get('notified', []) if line in warnings]
    if previous.get('returncode'):
        notified = []
    pending = [line for line in warnings if line not in notified]
    introduced = [line for line in pending if line not in previous.get('warnings', [])]
    backlog = [line for line in pending if line not in introduced]
    displayed = (introduced + backlog)[:2] if not result.returncode and not passthrough else []
    try:
        atomic_write(report, {'stdout': result.stdout, 'stderr': result.stderr,
                             'returncode': result.returncode, 'warnings': warnings,
                             'fingerprint': fingerprint, 'notified': notified + displayed})
    except OSError as error:
        # Never lose warnings or change a blocking result when report storage fails.
        sys.stderr.write(f'Stop report could not be saved: {error}\n')
        sys.stdout.write(result.stdout)
        sys.stderr.write(result.stderr)
        return result.returncode
    if result.returncode or passthrough:
        # Blocking feedback must remain actionable on every attempt.
        sys.stdout.write(result.stdout)
        sys.stderr.write(result.stderr)
        return result.returncode
    if displayed:
        summary = '\n'.join(line[:240] for line in displayed)
        print(json.dumps({'systemMessage': f'{summary}\n完整報告：{report}'}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
