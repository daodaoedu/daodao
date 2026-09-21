#!/usr/bin/env python3
"""Build a minimal offline workspace for a behavioral fixture."""

import argparse
import json
import shutil
from pathlib import Path, PurePosixPath


PROJECT_FILES = (
    'AGENTS.md',
    'CLAUDE.md',
    'plugin/docs/ai-human-review-workflow.md',
    'plugin/templates/README.md',
    'plugin/templates/bug-issue.md',
    'plugin/templates/requirements-doc.md',
)
SKILLS = ('file-bug-issue', 'gh-card', 'prd-generation', 'product-status-check')


def safe_relative(raw):
    if not isinstance(raw, str) or not raw:
        raise ValueError('context path must be a non-empty string')
    path = PurePosixPath(raw)
    if path.is_absolute() or '..' in path.parts or '.' in path.parts:
        raise ValueError(f'unsafe context path: {raw}')
    return path


# canonical 在 plugin/skills/；.agents/skills/ 是 build 產物，Codex 與 ChatGPT 桌面版讀它。
# 兩份都納入 eval workspace，確保產物真的跟著 canonical 一起更新。
SKILL_ROOTS = ('plugin/skills', '.agents/skills')


def project_paths():
    paths = list(PROJECT_FILES)
    for root in SKILL_ROOTS:
        paths.extend(f'{root}/{skill}/SKILL.md' for skill in SKILLS)
    return tuple(paths)


def read_regular(root, relative):
    source = root / relative
    if source.is_symlink() or not source.is_file():
        raise ValueError(f'missing or non-regular project input: {relative}')
    resolved = source.resolve()
    try:
        resolved.relative_to(root.resolve())
    except ValueError as error:
        raise ValueError(f'project input escapes repository: {relative}') from error
    return source.read_bytes()


def load_fixture(path):
    fixture = json.loads(path.read_text())
    if not isinstance(fixture, dict) or not isinstance(fixture.get('context'), dict):
        raise ValueError('fixture must be an object with a context object')
    context = {}
    for raw, value in fixture['context'].items():
        relative = safe_relative(raw)
        if not isinstance(value, str):
            raise ValueError(f'context value must be a string: {raw}')
        context[relative.as_posix()] = value.encode()
    return context


def prepare(repo_root, fixture_path, output):
    repo_root = repo_root.resolve()
    if output.exists() or output.is_symlink():
        raise FileExistsError(f'refusing to overwrite workspace: {output}')

    inputs = {relative: read_regular(repo_root, relative) for relative in project_paths()}
    context = load_fixture(fixture_path)
    collisions = sorted(set(inputs).intersection(context))
    if collisions:
        raise ValueError(f'fixture context collides with project instructions: {collisions[0]}')

    output.mkdir(parents=True, exist_ok=False)
    for relative, content in inputs.items():
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    for relative, content in context.items():
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-root', type=Path, required=True)
    parser.add_argument('--fixture', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        prepare(args.repo_root, args.fixture, args.output)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
