#!/usr/bin/env python3
"""Check post-merge handoff completeness, not browser truth or user authorization.

begin --task-dir TASK --issue URL [--session-id ID | --no-bind] creates/resumes
TASK/post-merge-closeout.json. Default session is CODEX_THREAD_ID. Populate the
receipt with task-relative {path, sha256} evidence; check --receipt PATH returns
0 handed-off, 1 incomplete, 3 genuinely blocked. New receipts are v2;
preflight --receipt PATH validates local lifecycle evidence before publication
and returns 0 ready-to-handoff without requiring a remote handoff. stop reads the hook event JSON
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
import struct
import zlib
import sys
from urllib.parse import urlparse, parse_qs, unquote

LIMITATION = 'Evidence bindings/completeness checked; browser actions and remote truth still require audit.'
BLOCKERS = {'maintenance', 'tool', 'auth', 'permission', 'product-decision'}
# PM steps run on the deployed dev product: the user-facing app and the internal admin back office.
DEV_PRODUCT_HOSTS = {'app-dev.daodao.so', 'admin-dev.daodao.so'}
PNG_MAX_FILE_BYTES = 32 * 1024 * 1024
PNG_MAX_PIXELS = 16_000_000
PNG_MAX_RASTER_BYTES = 64 * 1024 * 1024


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


def gmail_read_url(value, account):
    """Allow a mailbox read surface, never an authentication or compose surface."""
    try:
        if not isinstance(value, str) or any(ord(c) < 32 for c in value) or '\\' in value:
            return False
        parsed = urlparse(value)
        if (parsed.scheme != 'https' or parsed.hostname != 'mail.google.com'
                or parsed.username is not None or parsed.password is not None
                or parsed.port not in (None, 443)
                or not re.fullmatch(r'/mail/u/(?:[0-9]+/)?', parsed.path)):
            return False
        query = parse_qs(parsed.query, keep_blank_values=True)
        if set(query) - {'authuser'} or ('authuser' in query and query['authuser'] != [account]):
            return False
        fragment = unquote(parsed.fragment)
        if any(word in fragment.lower() for word in ('compose', 'settings', 'signin', 'login')):
            return False
        return not fragment or bool(re.fullmatch(r'(?:inbox|all)(?:/[A-Za-z0-9_-]+)?|search/[^?&]+', fragment))
    except (TypeError, ValueError):
        return False


def screenshot_file(path):
    """Validate the supported RGB/RGBA PNG subset, not screenshot truth."""
    try:
        # W3C PNG3: IHDR/IDAT/IEND and filtering/compression sections.
        # https://www.w3.org/TR/png-3/ ; supported subset only, not a general decoder.
        if path.stat().st_size > PNG_MAX_FILE_BYTES:
            return False
        blob = path.read_bytes()
        if not blob.startswith(b'\x89PNG\r\n\x1a\n'):
            return False
        offset, header, ended, idat_ended, idat_seen = 8, None, False, False, False
        compressed, palette = bytearray(), None
        while offset < len(blob):
            if offset + 12 > len(blob):
                return False
            length = int.from_bytes(blob[offset:offset + 4], 'big')
            kind = blob[offset + 4:offset + 8]
            end = offset + length + 12
            if end > len(blob) or not re.fullmatch(b'[A-Za-z]{4}', kind):
                return False
            data = blob[offset + 8:end - 4]
            if zlib.crc32(kind + data) != int.from_bytes(blob[end - 4:end], 'big'):
                return False
            if header is None and kind != b'IHDR':
                return False
            if kind == b'IHDR':
                if header is not None or length != 13:
                    return False
                header = struct.unpack('>IIBBBBB', data)
                width, height, depth, color, compression, filtering, interlace = header
                if (not width or not height or width * height > PNG_MAX_PIXELS
                        or depth != 8 or color not in (2, 6)
                        or compression or filtering or interlace):
                    return False
                channels = 3 if color == 2 else 4
                stride = (width * channels * depth + 7) // 8
                size = (stride + 1) * height
                if size > PNG_MAX_RASTER_BYTES:
                    return False
            elif kind == b'PLTE':
                if palette is not None or idat_seen or not length or length % 3 or length > 768:
                    return False
                palette = data
            elif kind == b'IDAT':
                if idat_ended:
                    return False
                idat_seen = True
                compressed.extend(data)
            elif kind == b'IEND':
                if length or not compressed or end != len(blob):
                    return False
                ended = True
            elif kind in (b'acTL', b'fcTL', b'fdAT'):
                return False  # Animated evidence is not a static UI screenshot.
            elif kind[0] & 32 == 0:  # Unknown critical chunks cannot be decoded safely.
                return False
            if idat_seen and kind not in (b'IDAT', b'IEND'):
                idat_ended = True
            offset = end
        if not ended or header is None:
            return False
        decoder = zlib.decompressobj()
        pixels = decoder.decompress(compressed, size + 1)
        return (len(pixels) == size and decoder.eof and not decoder.unused_data
                and not decoder.unconsumed_tail
                and all(pixels[row * (stride + 1)] <= 4 for row in range(height)))
    except (OSError, ValueError, struct.error, zlib.error):
        return False


def validate(receipt, now=None, preflight=False, publication_draft=None, publication_issue=None):
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

    version = data.get('version')
    require(type(version) is int and version in (1, 2), 'closeout version must be 1 or 2')
    if preflight:
        require(version == 2, 'preflight requires version 2 after a reviewed lifecycle upgrade')
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

    if preflight:
        require(state in ('pending', 'handed-off'), 'preflight state must be pending or handed-off')
    else:
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
            require(parsed.scheme == 'https' and parsed.hostname in DEV_PRODUCT_HOSTS, 'PM fixture URL must use the deployed dev product')
    external = plan.get('external_observations', [])
    has_external = 'external_observations' in plan
    valid_external = (isinstance(external, list) and (not has_external or bool(external))
                      and all(isinstance(o, dict) for o in external))
    require(valid_external, 'external observations must be a nonempty structured opt-in list')
    observations = {}
    for o in external if valid_external else []:
        oid, mids = o.get('id'), o.get('message_ids')
        ok = (set(o) == {'id', 'kind', 'url', 'account', 'related_fixture', 'message_ids'}
              and isinstance(oid, str) and bool(oid.strip()) and oid not in observations
              and o.get('kind') == 'mail-ui' and valid_lists and o.get('account') in accounts
              and o.get('related_fixture') in fixtures and gmail_read_url(o.get('url'), o.get('account'))
              and isinstance(mids, list) and bool(mids)
              and all(isinstance(mid, str) and bool(mid.strip()) for mid in mids)
              and len(set(mids)) == len(mids))
        require(ok, 'external observation needs a unique ID, exact account, Gmail read URL, dev fixture and message IDs')
        if ok:
            observations[oid] = o
    require(not has_external or version == 2, 'external UI observations require version 2')

    def observation_manifest(item, label):
        require(item.get('external_observations') == external if has_external
                else 'external_observations' not in item,
                label + ' must bind the exact planned external observations')

    contexts = plan.get('step_contexts')
    valid_contexts = (valid_lists and isinstance(contexts, dict) and set(contexts) == set(steps))
    if valid_contexts:
        valid_contexts = all(isinstance(c, dict) and c.get('account') in accounts and (
            (c.get('fixture') in fixtures and 'observation' not in c)
            or (set(c) == {'account', 'observation'} and isinstance(c.get('observation'), str) and c.get('observation') in observations
                and c.get('account') == observations[c['observation']]['account'])) for c in contexts.values())
    require(valid_contexts, 'plan needs an exact PM account and product fixture or external observation context for every step')
    if has_external:
        require(valid_contexts and {c.get('observation') for c in contexts.values()
                                   if 'observation' in c} == set(observations),
                'every external observation must be referenced by a planned step')
    draft_hash = proof(plan.get('draft'), 'plan draft')
    if draft_hash:
        try:
            draft_text = (task / plan['draft']['path']).read_text()
            visible_draft = re.sub(r'<!--.*?-->', '', draft_text, flags=re.S)
            require(valid_lists and all(draft_mentions(visible_draft, value) for value in accounts + fixtures), 'planned PM accounts and fixture URLs must appear literally in the frozen draft')
            require(all(draft_mentions(visible_draft, o['url']) and draft_mentions(visible_draft, o['account'])
                        and draft_mentions(visible_draft, o['related_fixture']) for o in observations.values()),
                    'external observation URLs, accounts and related fixtures must appear in the frozen draft')
            ids = draft_steps(draft_text)
            require(valid_lists and steps == ids, 'plan steps differ from the actual PM draft numbered steps')
        except (OSError, ValueError):
            errors.append('PM draft must use one dedicated 驗收步驟 section with unique numbered screen steps')
    if preflight and (publication_draft is not None or publication_issue is not None):
        try:
            publication = Path(publication_draft)
            require(publication.is_file() and bool(draft_hash) and sha256(publication) == draft_hash,
                    'publication draft must match the frozen plan draft digest')
        except (OSError, ValueError, TypeError):
            errors.append('publication draft must be a readable file matching the frozen draft')
        require(type(publication_issue) is int and publication_issue > 0
                and issue == f'https://github.com/daodaoedu/daodao/issues/{publication_issue}',
                'publication issue must match the receipt central issue')
    baseline_hash = proof(plan.get('baseline'), 'plan baseline')
    baseline_values = proof(plan.get('baseline'), 'external observation baseline', True) if has_external else {}
    if not require(isinstance(baseline_values, dict), 'external baseline must be a JSON object'):
        baseline_values = {}
    baseline_external = baseline_values.get('external_observations', [])
    expected_external = {}
    valid_baseline_external = isinstance(baseline_external, list) and all(isinstance(v, dict) for v in baseline_external)
    require(not has_external or valid_baseline_external, 'external baseline needs structured observation values')
    for value in baseline_external if valid_baseline_external else []:
        oid = value.get('id'); o = observations.get(oid, {}) if isinstance(oid, str) else {}
        values = value.get('required_values'); messages = values.get('messages') if isinstance(values, dict) else None
        valid_messages = isinstance(messages, list) and bool(messages) and all(isinstance(m, dict) for m in messages)
        require(bool(o) and all(value.get(k) == v for k, v in o.items())
                and set(value) == set(o) | {'required_values'} and oid not in expected_external
                and valid_messages and [m.get('id') for m in messages] == o.get('message_ids')
                and all(isinstance(m.get('labels'), list) and 'INBOX' in m['labels']
                        and isinstance(m.get('to'), str) and bool(re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', m['to']))
                        and m.get('summary_present') is True and type(m.get('reply_present')) is bool
                        for m in messages),
                'external baseline must bind exact planned messages, INBOX, To and summary/reply observations')
        if o and valid_messages:
            expected_external[oid] = values
    require(not has_external or set(expected_external) == set(observations),
            'external baseline must cover every observation exactly once')
    external_step_proofs = []
    replay = proof(data.get('replay'), 'PM replay', True)
    restore = proof(data.get('restore'), 'restored preflight', True)
    for label, item in [('replay', replay), ('restore', restore)]:
        require(valid_lists and item.get('accounts') == accounts and item.get('fixtures') == fixtures, label + ' must use the exact planned PM accounts and fixtures')
        observation_manifest(item, label)
    require(replay.get('kind') == 'pm-ui-replay', 'engineering/API smoke cannot substitute for PM UI replay')
    require(bool(draft_hash) and replay.get('draft_sha256') == draft_hash, 'replay must bind the current handoff draft')
    actual_steps = replay.get('steps')
    if require(isinstance(actual_steps, list), 'PM replay needs per-step observations'):
        actual_ids = [x.get('id') if isinstance(x, dict) else None for x in actual_steps]
        require(valid_lists and actual_ids == steps, 'PM replay must cover every planned step once, in order')
        for step in actual_steps:
            if not isinstance(step, dict):
                errors.append('invalid replay step'); continue
            expected = contexts.get(step.get('id'), {}) if valid_contexts and isinstance(step.get('id'), str) else {}
            external_step = has_external and 'observation' in expected
            key = 'observation' if external_step else 'fixture'
            require(valid_contexts and step.get('account') == expected.get('account')
                    and step.get(key) == expected.get(key) and step.get('result') == 'pass'
                    and ('fixture' not in step if external_step else 'observation' not in step),
                    'replay step needs the planned PM identity, fixture/observation, and PASS result')
            evidence = proof(step.get('evidence'), 'replay step ' + str(step.get('id')), external_step)
            if external_step:
                external_step_proofs.append((expected.get('observation'), evidence))
    started = None
    try:
        started, finished = timestamp(replay.get('started_at')), timestamp(replay.get('finished_at'))
        restored = timestamp(restore.get('observed_at'))
        require(started <= finished <= restored <= now, 'restore/readback must follow UI replay, with nonfuture timestamps')
    except (ValueError, TypeError):
        errors.append('replay/restore need actual timezone-aware timestamps')
        restored = None
    def image_evidence(ref, label):
        digest = proof(ref, label)
        require(bool(digest) and screenshot_file(task / ref['path']), label + ' must be a complete bound non-interlaced PNG UI screenshot')

    for oid, ui in external_step_proofs:
        if not require(isinstance(ui, dict), 'external UI step evidence must be structured JSON'):
            continue
        o = observations.get(oid, {}) if isinstance(oid, str) else {}
        require(ui.get('kind') == 'external-ui-observation' and ui.get('method') == 'native-ui'
                and ui.get('observation') == oid and ui.get('account') == o.get('account')
                and ui.get('url') == o.get('url') and ui.get('related_fixture') == o.get('related_fixture')
                and gmail_read_url(ui.get('observed_url'), o.get('account'))
                and ui.get('draft_sha256') == draft_hash and ui.get('baseline_sha256') == baseline_hash
                and bool(expected_external.get(oid)) and ui.get('required_values') == expected_external.get(oid),
                'external step must be actual native UI bound to its account, URLs, dev fixture, messages, draft and baseline')
        identity = ui.get('identity') or {}
        require(isinstance(identity, dict) and identity.get('method') == 'visible-ui-account'
                and identity.get('visible_account') == o.get('account')
                and gmail_read_url(identity.get('observed_url'), o.get('account')),
                'external step needs visible UI mailbox identity, not an API profile')
        image_evidence(identity.get('screenshot') if isinstance(identity, dict) else None, 'external account identity')
        messages = ui.get('messages')
        valid_messages = isinstance(messages, list) and all(isinstance(m, dict) for m in messages)
        require(valid_messages and [m.get('message_id') for m in messages] == o.get('message_ids'),
                'external UI screenshots must cover every planned message exactly once')
        for message in messages if valid_messages else []:
            require(message.get('page_state') in ('inbox', 'message')
                    and gmail_read_url(message.get('observed_url'), o.get('account')),
                    'external message evidence must show a Gmail read page, not a login/API/compose surface')
            image_evidence(message.get('screenshot'), 'external message screenshot')
        try:
            require(started is not None and started <= timestamp(ui.get('observed_at')) <= finished,
                    'external UI observation must occur during the same frozen replay')
        except (TypeError, ValueError, UnboundLocalError):
            errors.append('external UI observation needs a replay-bound timestamp')
    require(restore.get('kind') == 'pm-restored-preflight' and restore.get('result') == 'pass', 'restored PM fixture preflight must pass')
    require(bool(baseline_hash) and restore.get('baseline_sha256') == baseline_hash, 'restored preflight must match the planned baseline')
    # A digest reference alone does not prove equality; compare the saved domain values too.
    expected_values = proof(plan.get('baseline'), 'expected fixture values', True)
    actual_values = proof(restore.get('evidence'), 'restored fixture values', True)
    require(has_external or 'external_observations' not in expected_values, 'external baseline cannot be declared without an external plan')
    require(bool(baseline_hash) and bool(expected_values) and bool(actual_values)
            and expected_values == actual_values,
            'restored fixture values differ from expected baseline')
    retention = data.get('retention') or {}
    if not isinstance(retention, dict):
        retention = {}
    require(retention.get('external_observations') == [{'id': oid, 'retained': True} for oid in observations]
            if has_external else 'external_observations' not in retention,
            'external observations must be retained exactly as planned')
    retained = retention.get('fixtures')
    require(valid_lists and isinstance(retained, list) and retained == [{'url': url, 'retained': True} for url in fixtures], 'PM fixtures must be retained, not disposed by smoke cleanup')
    try:
        require(timestamp(retention.get('expires_at')) > now, 'PM fixtures are expired')
    except (ValueError, TypeError):
        errors.append('PM retention needs an expiry timestamp')
    proof(retention.get('reset'), 'executed reset/readback proof')
    # Legacy receipts remain readable; declared lifecycle evidence cannot bypass checks via v1.
    if version == 2 or 'lifecycle' in retention:
        lifecycle = proof(retention.get('lifecycle'), 'PM retention lifecycle', True)
        require(lifecycle.get('kind') == 'pm-retention-lifecycle'
                and type(lifecycle.get('version')) is int and lifecycle['version'] == 1,
                'retention lifecycle must identify version 1 of pm-retention-lifecycle')
        require(bool(draft_hash) and lifecycle.get('draft_sha256') == draft_hash
                and bool(baseline_hash) and lifecycle.get('baseline_sha256') == baseline_hash,
                'retention lifecycle must bind the same draft and baseline')
        try:
            reviewed = timestamp(lifecycle.get('observed_at'))
            require(restored is not None and restored <= reviewed <= now,
                    'retention lifecycle review must follow restored readback, with nonfuture time')
        except (ValueError, TypeError):
            errors.append('retention lifecycle needs an observed_at timestamp')
        entries = lifecycle.get('fixtures')
        valid_entries = (isinstance(entries, list) and all(isinstance(entry, dict) for entry in entries))
        urls = [entry.get('url') for entry in entries] if valid_entries else []
        require(valid_lists and valid_entries and all(isinstance(url, str) for url in urls)
                and len(urls) == len(fixtures) and set(urls) == set(fixtures),
                'retention lifecycle must cover every planned fixture exactly once')
        try:
            expires = timestamp(retention.get('expires_at'))
        except (ValueError, TypeError):
            expires = None
        external_entries = lifecycle.get('external_observations', [])
        valid_external_entries = isinstance(external_entries, list) and all(isinstance(e, dict) for e in external_entries)
        require((valid_external_entries and [e.get('id') for e in external_entries] == list(observations))
                if has_external else 'external_observations' not in lifecycle,
                'lifecycle must cover every planned external observation exactly once')
        for entry in external_entries if valid_external_entries else []:
            o = observations.get(entry.get('id'), {}) if isinstance(entry.get('id'), str) else {}
            require(bool(o) and all(entry.get(k) == v for k, v in o.items())
                    and bool(expected_external.get(entry.get('id')))
                    and entry.get('required_values') == expected_external.get(entry.get('id')),
                    'external lifecycle must bind its full plan and baseline required values')
        # Apply the exact existing time/source/expiry rules to both surfaces.
        for entry in (entries if valid_entries else []) + (external_entries if valid_external_entries else []):
            require(isinstance(entry.get('required_values'), dict) and bool(entry['required_values']),
                    'lifecycle fixture needs reviewed required_values')
            require(isinstance(entry.get('reason'), str) and bool(entry['reason'].strip()),
                    'lifecycle fixture needs a review reason')
            proof(entry.get('evidence'), 'lifecycle fixture review/source')
            timed = entry.get('time_dependent')
            require(type(timed) is bool, 'lifecycle time_dependent must be a boolean')
            transitions = entry.get('known_transitions')
            valid_transitions = isinstance(transitions, list) and all(isinstance(item, dict) for item in transitions)
            require(valid_transitions, 'lifecycle known_transitions must be a list of source-bound transitions')
            if timed is False:
                require(valid_transitions and not transitions,
                        'non-time-dependent lifecycle cannot declare known transitions')
            if timed is True or 'valid_until' in entry:
                try:
                    valid_until = timestamp(entry.get('valid_until'))
                    require(expires is not None and valid_until >= expires,
                            'required fixture state cannot expire before the PM retention deadline')
                except (ValueError, TypeError):
                    errors.append('time-dependent fixture needs a timezone-aware valid_until')
            for transition in transitions if valid_transitions else []:
                require(isinstance(transition.get('effect'), str) and bool(transition['effect'].strip()),
                        'known transition needs its effect on the required state')
                proof(transition.get('evidence'), 'known transition source')
                try:
                    at = timestamp(transition.get('at'))
                    require(expires is not None and at >= expires,
                            'known fixture transition occurs before the PM retention deadline')
                except (ValueError, TypeError):
                    errors.append('known transition needs a timezone-aware timestamp')
    lint = proof(data.get('lint'), 'handoff lint', True)
    require(bool(draft_hash) and lint.get('draft_sha256') == draft_hash and type(lint.get('exit_code')) is int and lint['exit_code'] == 0, 'handoff lint must pass on the same draft')
    try:
        linted_at = timestamp(lint.get('observed_at'))
        require(started is not None and linted_at <= started <= now,
                'handoff lint must pass before the same frozen draft UI replay starts')
    except (ValueError, TypeError):
        errors.append('handoff lint needs an observed_at timestamp before UI replay')
    if preflight:
        return ('ready-to-handoff' if not errors else 'incomplete'), errors
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


def lifecycle_status(receipt, state):
    """Disclose legacy compatibility without treating it as lifecycle protection."""
    try:
        data = load(Path(receipt))
        retention = data.get('retention')
        if data.get('version') == 1 and (not isinstance(retention, dict) or 'lifecycle' not in retention):
            return 'legacy-not-verified'
    except (OSError, ValueError, TypeError):
        return 'not-verified'
    return 'assessed' if state in ('handed-off', 'ready-to-handoff') else 'not-verified'


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
    pre = commands.add_parser('preflight', help='before publication: 0 ready / 1 incomplete / 3 blocked')
    pre.add_argument('--receipt', type=Path, required=True)
    pre.add_argument('--draft', type=Path, required=True, help='the actual file passed to gh issue comment')
    pre.add_argument('--issue', type=int, required=True, help='the actual central issue number being published to')
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
            receipt_data = {'version': 2, 'task_dir': str(task), 'issue': args.issue,
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
    if args.command in ('check', 'preflight'):
        state, errors = validate(args.receipt, preflight=args.command == 'preflight',
                                 publication_draft=getattr(args, 'draft', None),
                                 publication_issue=getattr(args, 'issue', None))
        print(json.dumps({'state': state, 'errors': errors, 'limitation': LIMITATION,
                          'lifecycle_validation': lifecycle_status(args.receipt, state)}, ensure_ascii=False))
        return 3 if state == 'blocked' else (0 if state in ('handed-off', 'ready-to-handoff') else 1)
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
        lifecycle_validation = lifecycle_status(receipt, state)
        limitation = LIMITATION
        if lifecycle_validation == 'legacy-not-verified':
            limitation += ' Retention lifecycle: legacy-not-verified.'
        print(json.dumps({'state': state, 'completed': state == 'handed-off', 'limitation': limitation,
                          'lifecycle_validation': lifecycle_validation}, ensure_ascii=False))
        return 0
    print('post-merge closeout incomplete: ' + '; '.join(errors), file=sys.stderr)
    return 2


if __name__ == '__main__':
    raise SystemExit(main())
