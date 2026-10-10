#!/usr/bin/env python3
"""Import structured Claude client writes; never infer targets from Bash or diff.

Any Bash/unknown mutation yields a partial capture and exit 2. This importer is
not a filesystem monitor and cannot establish complete write coverage alone.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def convert(records, repo, head):
    events = []
    external_events = []
    opaque = 0
    for record in records:
        if not isinstance(record, dict):
            raise ValueError('invalid client record')
        if record.get('type') != 'assistant':
            continue
        message = record.get('message')
        if not isinstance(message, dict) or not isinstance(message.get('content'), list):
            raise ValueError('invalid assistant content')
        for block in message['content']:
            if not isinstance(block, dict):
                raise ValueError('invalid content block')
            if block.get('type') != 'tool_use':
                continue
            name = block.get('name')
            args = block.get('input')
            if not isinstance(args, dict):
                raise ValueError('invalid tool input')
            if name in ('Write', 'Edit', 'MultiEdit'):
                target = args.get('file_path')
                if not isinstance(target, str) or not Path(target).is_absolute():
                    raise ValueError('client write must include absolute file_path')
                path = Path(target)
                # Lexical mapping preserves symlink paths for later scope review.
                if '..' in path.parts:
                    raise ValueError('client path traversal rejected')
                if not path.is_relative_to(repo):
                    external_events.append(dict(kind='external-write', target=target))
                    continue
                events.append(dict(kind='local-write', targets=[path.relative_to(repo).as_posix()]))
            elif name in ('Read', 'Grep', 'Glob'):
                events.append(dict(kind='read'))
            else:
                # Includes Bash, patch tools and unknown plugins. Never guess.
                opaque += 1
                events.append(dict(kind='opaque', tool=name))
    return dict(head_revision=head, binding='import-time', events=events,
                coverage='partial' if opaque else 'structured-tools-only', opaque_events=opaque, external_events=external_events)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--session', type=Path, required=True)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--head', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.session.is_symlink() or args.output.exists():
            raise ValueError('source symlink or output reuse rejected')
        head = subprocess.check_output(['git', '-C', str(args.repo), 'rev-parse', 'HEAD'], text=True).strip()
        if head != args.head:
            raise ValueError('HEAD changed before import')
        raw = args.session.read_bytes()
        records = [json.loads(line) for line in raw.decode().splitlines() if line.strip()]
        data = convert(records, args.repo.resolve(), head)
        data['source_sha256'] = hashlib.sha256(raw).hexdigest()
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
        print(f"capture {data['coverage']}; opaque events: {data['opaque_events']}; not proof of complete filesystem coverage")
        return 2 if data['opaque_events'] else 0
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print(f'import failed: {exc}')
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
