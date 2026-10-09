#!/usr/bin/env python3
"""Observe a macOS task repo independently of agent tools (including Bash).

Native FSEvents capture names/actions, not contents or process attribution.
Start before edits. Artifacts must be outside repo. No targets come from diff.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import threading
import time
import uuid


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).rstrip('\n')


def record(repo, output, command, stop_file=None):
    if sys.platform != 'darwin':
        raise ValueError('native capture currently supports macOS only; no polling fallback')
    from watchdog.events import FileSystemEventHandler
    from watchdog.observers.api import BaseObserver
    from watchdog.observers.fsevents import FSEventsEmitter
    repo = repo.resolve()
    output = output.resolve()
    if output.is_relative_to(repo) or output.exists():
        raise ValueError('output must be new and outside monitored repo')
    if stop_file and (stop_file.exists() or stop_file.resolve().is_relative_to(repo)):
        raise ValueError('stop signal must be new and outside monitored repo')
    if git(repo, 'status', '--porcelain', '--untracked-files=all'):
        raise ValueError('start capture from clean task repo; cannot reconstruct previous edits')
    start_head = git(repo, 'rev-parse', 'HEAD')
    output.parent.mkdir(parents=True, exist_ok=True)
    journal = output.with_suffix(output.suffix + '.events.jsonl')
    ready_file = output.with_suffix(output.suffix + '.ready.json')
    if journal.exists() or ready_file.exists():
        raise ValueError('capture sidecar reuse rejected')
    run_id = uuid.uuid4().hex
    probe = repo / ('.agent-trace-probe-' + run_id)
    handshake = threading.Event()
    failures = []
    events = []
    ignored = []
    started = datetime.now(timezone.utc).isoformat()
    stream = journal.open('x')

    class CheckedEmitter(FSEventsEmitter):
        def queue_events(self, timeout, native_events):
            if any(e.is_kernel_dropped or e.is_user_dropped or e.must_scan_subdirs for e in native_events):
                failures.append('native event stream dropped events or requires rescan')
            super().queue_events(timeout, native_events)

    class Handler(FileSystemEventHandler):
        def on_any_event(self, event):
            try:
                if Path(event.src_path) == probe:
                    if event.event_type in ('created', 'modified'):
                        handshake.set()
                    return
                if event.is_directory or event.event_type not in ('created', 'modified', 'deleted', 'moved'):
                    return
                targets = []
                for name in [event.src_path] + ([event.dest_path] if event.event_type == 'moved' else []):
                    path = Path(name)
                    if not path.is_relative_to(repo):
                        failures.append('event outside watch root')
                        continue
                    relative = path.relative_to(repo).as_posix()
                    if relative == '.git' or relative.startswith('.git/'):
                        continue
                    targets.append(relative)
                if not targets:
                    return
                entry = dict(kind='local-write', action=event.event_type, targets=targets,
                             observed_at=datetime.now(timezone.utc).isoformat())
                stream.write(json.dumps(entry) + '\n')
                stream.flush()
                # Preserve ignored build/cache writes in the journal; separate
                # them from the source-file scope checked against owned_paths.
                source_targets = []
                for target in targets:
                    proc = subprocess.run(['git', '-C', str(repo), 'check-ignore', '-q', '--', target], capture_output=True)
                    if proc.returncode == 0:
                        ignored.append(dict(target=target, reason='git-ignore', observed_at=entry['observed_at']))
                    elif proc.returncode == 1:
                        source_targets.append(target)
                    else:
                        failures.append('cannot classify git-ignore path')
                if source_targets:
                    events.append(dict(entry, targets=source_targets))
            except Exception as exc:
                failures.append(f'event processing failed: {exc}')

    observer = BaseObserver(CheckedEmitter, timeout=0.1)
    observer.schedule(Handler(), str(repo), recursive=True)
    observer.start()
    child = None
    exit_code = 0
    try:
        # Probe delivery confirms native subscription before any agent runs.
        probe.write_text('start')
        if not handshake.wait(10):
            raise ValueError('observer readiness probe not received')
        probe.unlink()
        ready_file.write_text(json.dumps(dict(run_id=run_id, start_head=start_head, backend='FSEvents', started_at=started)))
        print(f'capture ready: {ready_file}', flush=True)
        if command:
            child = subprocess.Popen(command, cwd=repo)
        while (child and child.poll() is None) or (not child and stop_file and not stop_file.exists()):
            if not observer.is_alive() or any(not emitter.is_alive() for emitter in observer.emitters):
                raise ValueError('observer stopped during capture')
            time.sleep(0.1)
        if child:
            exit_code = child.returncode
        # A second native probe plus a quiet interval drains the event queue.
        handshake.clear()
        probe.write_text('drain')
        if not handshake.wait(10):
            raise ValueError('observer drain probe not received')
        time.sleep(1)
    except BaseException as exc:
        failures.append(str(exc))
        if child and child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait(timeout=10)
                failures.append('child required forced termination')
        exit_code = 2
    finally:
        probe.unlink(missing_ok=True)
        observer.stop()
        observer.join(timeout=10)
        if observer.is_alive():
            failures.append('observer failed to stop')
        stream.close()
    final_head = git(repo, 'rev-parse', 'HEAD')
    raw = journal.read_bytes()
    data = dict(head_revision=final_head, start_revision=start_head, run_id=run_id,
                source='filesystem-observer', backend='FSEvents', started_at=started,
                ended_at=datetime.now(timezone.utc).isoformat(),
                coverage='partial' if failures else 'monitored-repo-window',
                events=events, ignored_events=ignored, errors=failures,
                journal_ref=journal.name, journal_sha256=hashlib.sha256(raw).hexdigest(),
                child_exit_code=exit_code)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f"capture {data['coverage']}: {len(events)} events; {len(failures)} errors", flush=True)
    return 2 if failures else exit_code


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--stop-file', type=Path)
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    if bool(command) == bool(args.stop_file):
        parser.error('provide either --stop-file or a command after --')
    try:
        return record(args.repo, args.output, command, args.stop_file)
    except (ImportError, OSError, ValueError, subprocess.CalledProcessError) as exc:
        print(f'capture failed: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
