#!/usr/bin/env python3
"""Check post-merge handoff completeness, not browser truth or user authorization.

begin --task-dir TASK --issue URL [--session-id ID | --no-bind] creates/resumes
TASK/post-merge-closeout.json. Default session is CODEX_THREAD_ID. Populate the
receipt with task-relative {path, sha256} evidence; check --receipt PATH returns
0 handed-off, 1 incomplete, 3 genuinely blocked. stop reads the hook event JSON
from stdin and checks only the explicitly bound session. It never scans tasks.
The complete/blocked fixtures in __tests__/test_post_merge_closeout.py document
all structured evidence fields; the skill explains when to collect them.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

LIMITATION = 'Evidence bindings/completeness checked; browser actions and remote truth still require audit.'
BLOCKERS = {'maintenance', 'tool', 'auth', 'permission', 'product-decision'}


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError('timestamp must be ISO8601 with timezone')
    date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if date.tzinfo is None:
        raise ValueError('timestamp requires timezone')
    return date


def load(path):
    if path.stat().st_size > 4 * 1024 * 1024:
        raise ValueError('JSON evidence exceeds 4 MiB')
    data = json.loads(path.read_text())
    if not isinstance(data, dict):
        raise ValueError('JSON must be an object')
    return data


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for part in iter(lambda: stream.read(65536), b''):
            digest.update(part)
    return digest.hexdigest()


def draft_steps(text):
    # Hide actual fenced examples, but never let a mismatched/unfinished fence
    # create a fake visible heading or conceal PM steps.
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    lines, fence = [], None
    for line in text.splitlines():
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$', line)
        if fence:
            if marker and marker[1][0] == fence[0] and len(marker[1]) >= fence[1] and not marker[2].strip():
                fence = None
            continue
        if marker:
            fence = (marker[1][0], len(marker[1]))
            lines.append('\0CODE_FENCE')
        else:
            lines.append(line)
    if fence:
        raise ValueError('PM draft contains an unclosed code fence')
    section = re.compile(r'^(?:#{2,6}\s+|-\s+)驗收步驟(?:[（(：:]|\s|$)')
    starts = [i for i, line in enumerate(lines) if section.match(line)]
    if len(starts) != 1:
        raise ValueError('PM draft requires exactly one dedicated 驗收步驟 section')
    ids = []
    heading = lines[starts[0]].startswith('#')
    numbered = re.compile(r'^\s*([1-9][0-9]*)[.)、．]\s*\S')
    for line in lines[starts[0] + 1:]:
        if heading:
            if re.match(r'^(?:#{1,6}\s|[✅❌])', line):
                break
        elif line.strip() and not line[0].isspace() and not numbered.match(line):
            if line == '\0CODE_FENCE':
                raise ValueError('PM step section cannot contain code fences')
            break
        if line == '\0CODE_FENCE' or re.match(r'^\s*(`{3,}|~{3,})', line):
            raise ValueError('PM step section cannot contain code fences')
        step = numbered.match(line)
        if step:
            ids.append(step.group(1))
        elif line.strip() and not re.match(r'^\s*[-*]\s+', line):
            raise ValueError('PM draft step section contains unnumbered or unsupported content')
    if not ids or len(ids) != len(set(ids)):
        raise ValueError('PM draft step IDs must be present and unique')
    return ids


def draft_mentions(text, value):
    # Match entire literal identities, including URL suffix/query and email
    # local/domain characters. Markdown delimiters and Chinese punctuation are
    # boundaries; longer identities must never satisfy a shorter planned one.
    token = r"A-Za-z0-9.!#$%&'*+/=?^_`{|}~@-" if '@' in value else r"A-Za-z0-9._~:/?#\[\]@!$&'*+,;=%-"
    # Backticks delimit inline code rather than extending an email token.
    token = token.replace('`', '')
    left, right = r'(?<![' + token + '])', r'(?![' + token + '])'
    literal = re.escape(value)
    if re.search(left + literal + right, text):
        return True
    # Treat paired emphasis around the whole identity as Markdown. Keep the
    # same outside boundaries, so a star inside a longer local part is unsafe.
    return re.search(left + r'(\*\*|__|\*|_)' + literal + r'\1' + right, text) is not None


def validate(receipt, now=None):
    """Return (state, errors); invalid or missing evidence is always incomplete."""
    errors = []
    now = timestamp(now) if now is not None else datetime.now(timezone.utc)
    receipt = Path(receipt).resolve()
    try:
        data = load(receipt)
        task = Path(data['task_dir']).resolve(strict=True)
        if task != receipt.parent or not task.is_dir():
            raise ValueError('receipt must live directly inside its declared task_dir')
    except (OSError, ValueError, KeyError, TypeError):
        return 'incomplete', ['closeout receipt missing, malformed, or outside task_dir']

    def require(ok, label):
        if not ok:
            errors.append(label)
        return bool(ok)

    def proof(value, label, structured=False):
        try:
            if not isinstance(value, dict) or not isinstance(value.get('path'), str):
                raise ValueError('missing ref')
            relative = Path(value['path'])
            if relative.is_absolute() or '..' in relative.parts or not relative.parts:
                raise ValueError('unsafe path')
            file = task / relative
            if any((task / Path(*relative.parts[:i])).is_symlink() for i in range(1, len(relative.parts) + 1)):
                raise ValueError('symlink')
            if not file.is_file() or not file.resolve().is_relative_to(task):
                raise ValueError('outside task')
            if not isinstance(value.get('sha256'), str) or sha256(file) != value['sha256']:
                raise ValueError('digest mismatch')
            return load(file) if structured else value['sha256']
        except (OSError, ValueError, TypeError):
            errors.append(label + ': missing, changed, or unsafe task evidence')
            return {} if structured else None

    require(data.get('version') == 1, 'closeout version must be 1')
    require(data.get('goal') == 'pm-handoff', 'goal must explicitly remain pm-handoff; no inferred smoke-only completion')
    issue = data.get('issue', '')
    require(isinstance(issue, str) and bool(re.fullmatch(r'https://github\.com/[^/]+/[^/]+/issues/[1-9][0-9]*', issue)), 'issue must identify the central GitHub issue')
    if not isinstance(issue, str):
        issue = ''
    state = data.get('state')
    if state == 'blocked':
        block = data.get('blocker') or {}
        if not isinstance(block, dict):
            return 'incomplete', errors + ['blocker must be an object']
        require(block.get('kind') in BLOCKERS, 'blocker must be an external maintenance/tool/auth/permission/product-decision condition, not unprepared work')
        for field in ('why_ai_cannot_resolve', 'resume_condition', 'next_action'):
            require(isinstance(block.get(field), str) and bool(block[field].strip()), 'blocker lacks ' + field)
        observed_at = None
        try:
            began_at = timestamp(data.get('last_begin_at'))
            observed_at = timestamp(block.get('observed_at'))
            require(began_at <= observed_at <= now, 'recheck external blocker after latest begin/resume; old observations cannot release closeout')
        except (ValueError, TypeError):
            errors.append('blocker needs last_begin_at and observed_at timestamps')
        attempts = block.get('attempts')
        attempt_times = []
        if require(isinstance(attempts, list) and bool(attempts), 'blocker needs actual attempted paths and evidence'):
            for attempt in attempts:
                if not isinstance(attempt, dict):
                    errors.append('invalid blocker attempt'); continue
                require(isinstance(attempt.get('action'), str) and bool(attempt['action'].strip()) and attempt.get('result') in ('failed', 'unavailable'), 'blocker attempt must name its failed/unavailable observation')
                evidence = proof(attempt.get('evidence'), 'blocker attempt', True)
                try:
                    observed = timestamp(attempt.get('observed_at'))
                    require(evidence.get('observed_at') == attempt.get('observed_at'), 'blocker attempt timestamp must bind its actual evidence timestamp')
                    require(began_at <= observed <= now, 'blocker attempt must be fresh after begin/resume')
                    attempt_times.append(observed)
                except (ValueError, TypeError, UnboundLocalError):
                    errors.append('blocker attempt needs a valid evidence-bound observed_at')
        require(bool(attempt_times) and observed_at is not None and max(attempt_times) == observed_at, 'blocker observed_at must equal latest actual attempt')
        return ('blocked' if not errors else 'incomplete'), errors

    require(state == 'handed-off', 'closeout remains incomplete: PM fixture/replay/handoff is not optional unfinished work')
    merged = proof(data.get('merged'), 'merged', True)
    require(merged.get('merged') is True, 'merge evidence must confirm merged=true')
    deployed = proof(data.get('deployed'), 'deployed', True)
    require(deployed.get('environment') == 'dev'
            and isinstance(deployed.get('revision'), str) and bool(deployed['revision'].strip())
            and deployed.get('result', 'pass') in ('pass', 'success'),
            'deployment evidence must identify a successful dev revision')
    smoke = proof(data.get('smoke'), 'smoke', True)
    require(smoke.get('result') == 'pass', 'engineering smoke evidence must pass')
    plan = data.get('plan') or {}
    if not isinstance(plan, dict):
        return 'incomplete', errors + ['plan must be an object']
    accounts, fixtures, steps = (plan.get(k) for k in ('accounts', 'fixtures', 'steps'))
    valid_lists = True
    for label, values in [('accounts', accounts), ('fixtures', fixtures), ('steps', steps)]:
        ok = isinstance(values, list) and bool(values) and all(isinstance(x, str) and bool(x.strip()) for x in values)
        if ok:
            ok = len(values) == len(set(values))
        valid_lists &= require(ok, 'plan needs distinct nonempty ' + label)
    if valid_lists:
        for account in accounts:
            require(bool(re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', account)), 'PM account must be an explicit existing email')
        for url in fixtures:
            parsed = urlparse(url)
            require(parsed.scheme == 'https' and parsed.hostname == 'app-dev.daodao.so', 'PM fixture URL must use the deployed dev product')
    contexts = plan.get('step_contexts')
    valid_contexts = (valid_lists and isinstance(contexts, dict) and set(contexts) == set(steps))
    if valid_contexts:
        valid_contexts = all(isinstance(context, dict) and context.get('account') in accounts
                             and context.get('fixture') in fixtures for context in contexts.values())
    require(valid_contexts, 'plan needs an exact PM account and fixture context for every step')
    draft_hash = proof(plan.get('draft'), 'plan draft')
    if draft_hash:
        try:
            draft_text = (task / plan['draft']['path']).read_text()
            visible_draft = re.sub(r'<!--.*?-->', '', draft_text, flags=re.S)
            require(valid_lists and all(draft_mentions(visible_draft, value) for value in accounts + fixtures), 'planned PM accounts and fixture URLs must appear literally in the frozen draft')
            ids = draft_steps(draft_text)
            require(valid_lists and steps == ids, 'plan steps differ from the actual PM draft numbered steps')
        except (OSError, ValueError):
            errors.append('PM draft must use one dedicated 驗收步驟 section with unique numbered screen steps')
    baseline_hash = proof(plan.get('baseline'), 'plan baseline')
    replay = proof(data.get('replay'), 'PM replay', True)
    restore = proof(data.get('restore'), 'restored preflight', True)
    for label, item in [('replay', replay), ('restore', restore)]:
        require(valid_lists and item.get('accounts') == accounts and item.get('fixtures') == fixtures, label + ' must use the exact planned PM accounts and fixtures')
    require(replay.get('kind') == 'pm-ui-replay', 'engineering/API smoke cannot substitute for PM UI replay')
    require(bool(draft_hash) and replay.get('draft_sha256') == draft_hash, 'replay must bind the current handoff draft')
    actual_steps = replay.get('steps')
    if require(isinstance(actual_steps, list), 'PM replay needs per-step observations'):
        actual_ids = [x.get('id') if isinstance(x, dict) else None for x in actual_steps]
        require(valid_lists and actual_ids == steps, 'PM replay must cover every planned step once, in order')
        for step in actual_steps:
            if not isinstance(step, dict):
                errors.append('invalid replay step'); continue
            require(valid_lists and step.get('account') in accounts and step.get('fixture') in fixtures and step.get('result') == 'pass', 'replay step needs the planned PM identity, fixture, and PASS result')
            expected = contexts.get(step.get('id'), {}) if valid_contexts and isinstance(step.get('id'), str) else {}
            require(valid_contexts and step.get('account') == expected.get('account')
                    and step.get('fixture') == expected.get('fixture'),
                    'replay step identity/fixture differs from its planned context')
            proof(step.get('evidence'), 'replay step ' + str(step.get('id')))
    started = None
    try:
        started, finished = timestamp(replay.get('started_at')), timestamp(replay.get('finished_at'))
        restored = timestamp(restore.get('observed_at'))
        require(started <= finished <= restored <= now, 'restore/readback must follow UI replay, with nonfuture timestamps')
    except (ValueError, TypeError):
        errors.append('replay/restore need actual timezone-aware timestamps')
        restored = None
    require(restore.get('kind') == 'pm-restored-preflight' and restore.get('result') == 'pass', 'restored PM fixture preflight must pass')
    require(bool(baseline_hash) and restore.get('baseline_sha256') == baseline_hash, 'restored preflight must match the planned baseline')
    # A digest reference alone does not prove equality; compare the saved domain values too.
    expected_values = proof(plan.get('baseline'), 'expected fixture values', True)
    actual_values = proof(restore.get('evidence'), 'restored fixture values', True)
    require(bool(baseline_hash) and bool(expected_values) and bool(actual_values)
            and expected_values == actual_values,
            'restored fixture values differ from expected baseline')
    retention = data.get('retention') or {}
    if not isinstance(retention, dict):
        retention = {}
    retained = retention.get('fixtures')
    require(valid_lists and isinstance(retained, list) and retained == [{'url': url, 'retained': True} for url in fixtures], 'PM fixtures must be retained, not disposed by smoke cleanup')
    try:
        require(timestamp(retention.get('expires_at')) > now, 'PM fixtures are expired')
    except (ValueError, TypeError):
        errors.append('PM retention needs an expiry timestamp')
    proof(retention.get('reset'), 'executed reset/readback proof')
    lint = proof(data.get('lint'), 'handoff lint', True)
    require(bool(draft_hash) and lint.get('draft_sha256') == draft_hash and type(lint.get('exit_code')) is int and lint['exit_code'] == 0, 'handoff lint must pass on the same draft')
    try:
        linted_at = timestamp(lint.get('observed_at'))
        require(started is not None and linted_at <= started <= now,
                'handoff lint must pass before the same frozen draft UI replay starts')
    except (ValueError, TypeError):
        errors.append('handoff lint needs an observed_at timestamp before UI replay')
    handoff = proof(data.get('handoff'), 'remote handoff readback', True)
    require(bool(draft_hash) and handoff.get('draft_sha256') == draft_hash, 'published handoff must match the replayed draft')
    require(isinstance(handoff.get('comment_url'), str)
            and bool(re.fullmatch(re.escape(issue) + r'#issuecomment-[1-9][0-9]*', handoff['comment_url'])),
            'remote handoff needs this issue comment URL')
    require(handoff.get('board_status') == 'Acceptance' and handoff.get('issue_state') == 'OPEN', 'remote handoff must read back Acceptance and OPEN, not Review/Done')
    try:
        # Installed plugin hooks live outside the checkout; the bound task owns its config.
        roots = [task, *task.parents, Path(__file__).resolve().parents[2]]
        config_path = next((root / 'bin/pipeline/types.ts' for root in roots
                            if (root / 'bin/pipeline/types.ts').is_file()), None)
        config = config_path.read_text() if config_path else ''
        pm_match = re.search(r'export const PM_LOGIN = "([^"\n]+)";', config)
        pm_login = pm_match.group(1) if pm_match else None
    except OSError:
        pm_login = None
    assignees = handoff.get('assignees')
    labels = handoff.get('labels')
    require(isinstance(pm_login, str) and bool(pm_login.strip())
            and isinstance(assignees, list) and pm_login in assignees,
            'remote handoff must read back the configured PM assignment')
    require(isinstance(labels, list) and all(isinstance(label, str) for label in labels) and 'acceptance:blocked' not in labels,
            'remote handoff must read back cleared acceptance blockers')
    try:
        observed = timestamp(handoff.get('observed_at'))
        require(restored is not None and restored <= observed <= now, 'remote handoff readback must follow restored preflight')
    except (ValueError, TypeError):
        errors.append('remote handoff readback needs observed_at')
    return ('handed-off' if not errors else 'incomplete'), errors


def cache_binding(session):
    root = Path(os.environ.get('XDG_CACHE_HOME', str(Path.home() / '.cache')))
    return root / 'daodao-harness/post-merge' / (hashlib.sha256(session.encode()).hexdigest() + '.json')


def session_id(args=None, event=None):
    candidates = [getattr(args, 'session_id', None) if args else None,
                  (event or {}).get('session_id'), (event or {}).get('thread_id'),
                  os.environ.get('CODEX_THREAD_ID')]
    return next((value for value in candidates if isinstance(value, str) and value.strip()), None)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest='command', required=True)
    begin = commands.add_parser('begin', help='register this session/task before merge/deployment work')
    begin.add_argument('--task-dir', type=Path, required=True)
    begin.add_argument('--issue', required=True)
    begin.add_argument('--session-id')
    begin.add_argument('--no-bind', action='store_true', help='manual-check-only client; no automatic Stop claim')
    check = commands.add_parser('check', help='strict closeout: 0 handed-off / 1 incomplete / 3 blocked')
    check.add_argument('--receipt', type=Path, required=True)
    release = commands.add_parser('release', help='explicit user stop/scope-change only; unbind without claiming completion')
    release.add_argument('--session-id')
    release.add_argument('--reason', required=True)
    release.add_argument('--evidence', required=True, help='task-relative file containing the actual user directive')
    commands.add_parser('stop', help='read Stop event stdin; only the exact bound session can be blocked')
    args = parser.parse_args(argv)
    if args.command == 'begin':
        session = session_id(args)
        if not session and not args.no_bind:
            parser.error('no session ID; pass --session-id or --no-bind (manual checker only)')
        task = args.task_dir.resolve(strict=True)
        receipt = task / 'post-merge-closeout.json'
        if receipt.exists():
            receipt_data = load(receipt)
            same_task = isinstance(receipt_data.get('task_dir'), str) and Path(receipt_data['task_dir']).resolve() == task
            if not same_task or receipt_data.get('issue') != args.issue or receipt_data.get('goal') != 'pm-handoff':
                parser.error('existing receipt belongs to a different task/issue/goal; do not overwrite it')
        else:
            receipt_data = {'version': 1, 'task_dir': str(task), 'issue': args.issue,
                'goal': 'pm-handoff', 'state': 'pending', 'merged': None, 'deployed': None, 'smoke': None,
                'plan': None, 'replay': None, 'restore': None, 'retention': None, 'lint': None, 'handoff': None}
        if not args.no_bind:
            binding = cache_binding(session)
            binding.parent.mkdir(parents=True, exist_ok=True)
            if binding.exists() and Path(load(binding).get('receipt', '')).resolve() != receipt.resolve():
                parser.error('session already owns another pending closeout; finish it before rebinding')
        began_at = datetime.now(timezone.utc).isoformat()
        receipt_data['last_begin_at'] = began_at
        receipt.write_text(json.dumps(receipt_data, ensure_ascii=False, indent=2) + '\n')
        if not args.no_bind:
            binding.write_text(json.dumps({'receipt': str(receipt), 'began_at': began_at}) + '\n')
            binding.chmod(0o600)
        print(json.dumps({'receipt': str(receipt), 'session_bound': not args.no_bind}))
        return 0
    if args.command == 'release':
        session = session_id(args)
        if not session or not args.reason.strip():
            parser.error('release requires the exact session and user-directed reason')
        binding = cache_binding(session)
        try:
            receipt = Path(load(binding)['receipt']).resolve()
            task = receipt.parent
            relative = Path(args.evidence)
            if relative.is_absolute() or '..' in relative.parts or not relative.parts:
                raise ValueError('unsafe directive path')
            directive = task / relative
            if (not directive.is_file() or not directive.resolve().is_relative_to(task)
                    or any((task / Path(*relative.parts[:i])).is_symlink()
                           for i in range(1, len(relative.parts) + 1))
                    or not directive.read_text().strip()):
                raise ValueError('missing directive')
            audit = task / ('.closeout-release-' + hashlib.sha256(session.encode()).hexdigest() + '.json')
            audit.write_text(json.dumps({'released_at': datetime.now(timezone.utc).isoformat(),
                'reason': args.reason, 'directive': {'path': args.evidence, 'sha256': sha256(directive)},
                'receipt': str(receipt), 'completed': False}, ensure_ascii=False, indent=2) + '\n')
            binding.unlink(missing_ok=True)
        except (OSError, ValueError, KeyError, TypeError):
            parser.error('release needs an existing exact-session binding and task-owned user directive evidence')
        print(json.dumps({'released': True, 'completed': False, 'audit': str(audit)}))
        return 0
    if args.command == 'check':
        state, errors = validate(args.receipt)
        print(json.dumps({'state': state, 'errors': errors, 'limitation': LIMITATION}, ensure_ascii=False))
        return 3 if state == 'blocked' else (0 if state == 'handed-off' else 1)
    try:
        raw = sys.stdin.read()
        event = json.loads(raw) if raw.strip() else {}
        if not isinstance(event, dict):
            raise ValueError('hook input is not an object')
    except ValueError:
        event = {}
    session = session_id(event=event)
    if not session:
        return 0
    binding = cache_binding(session)
    if not binding.exists():
        return 0
    try:
        registration = load(binding)
        receipt = Path(registration['receipt'])
        began_at = timestamp(registration['began_at'])
        if began_at > datetime.now(timezone.utc):
            raise ValueError('future registration')
        state, errors = validate(receipt)
        if state == 'blocked' and timestamp(load(receipt)['blocker']['observed_at']) < began_at:
            state, errors = 'incomplete', ['recheck external blocker after this begin/resume; old observations cannot release the session']
    except (OSError, ValueError, KeyError, TypeError):
        state, errors = 'incomplete', ['closeout session binding is malformed or missing its receipt']
    if state in ('handed-off', 'blocked'):
        if state == 'handed-off':
            binding.unlink(missing_ok=True)
        else:
            registration['began_at'] = datetime.now(timezone.utc).isoformat()
            binding.write_text(json.dumps(registration) + '\n')
        print(json.dumps({'state': state, 'completed': state == 'handed-off', 'limitation': LIMITATION}, ensure_ascii=False))
        return 0
    print('post-merge closeout incomplete: ' + '; '.join(errors), file=sys.stderr)
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
