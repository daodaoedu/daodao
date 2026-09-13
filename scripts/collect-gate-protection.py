#!/usr/bin/env python3
"""Collect read-only GitHub protection evidence; unknown is not unprotected."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import sys


REPOSITORIES = (
    ('daodao', 'main'),
    ('daodao-server', 'dev'),
    ('daodao-f2e', 'dev'),
    ('daodao-admin-ui', 'dev'),
    ('daodao-worker', 'main'),
    ('daodao-ai-backend', 'dev'),
    ('daodao-storage', 'dev'),
    ('daodao-infra', 'main'),
)


def api(endpoint, *, paginate=False, allow_unprotected=False):
    command = ['gh', 'api', '--method', 'GET', endpoint]
    if paginate:
        command.extend(['--paginate', '--slurp'])
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as error:
        return {'status': 'unknown', 'endpoint': endpoint,
                'error': type(error).__name__}
    try:
        data = json.loads(result.stdout)
    except (ValueError, TypeError):
        data = None
    if result.returncode:
        absent = (allow_unprotected and isinstance(data, dict)
                  and data.get('message') == 'Branch not protected'
                  and (str(data.get('status')) == '404'
                       or '(HTTP 404)' in result.stderr))
        return {'status': 'absent' if absent else 'unknown',
                'endpoint': endpoint, 'data': data,
                'error': result.stderr.strip(), 'exit_code': result.returncode}
    if data is None:
        return {'status': 'unknown', 'endpoint': endpoint,
                'error': 'Invalid JSON response'}
    return {'status': 'observed', 'endpoint': endpoint, 'data': data}


def invalid(result, message):
    result.update(status='unknown', error=message)


def collect():
    report = {'schema_version': 1,
              'collected_at': datetime.now(timezone.utc).isoformat(),
              'complete': True, 'repositories': []}
    for name, branch in REPOSITORIES:
        repository = f'daodaoedu/{name}'
        prefix = f'repos/{repository}'
        branch_result = api(f'{prefix}/branches/{branch}')
        sha = None
        if branch_result['status'] == 'observed':
            data = branch_result['data']
            commit = data.get('commit') if isinstance(data, dict) else None
            sha = commit.get('sha') if isinstance(commit, dict) else None
            if not isinstance(sha, str) or not sha:
                invalid(branch_result, 'Missing branch commit SHA')
                sha = None
        protection = api(f'{prefix}/branches/{branch}/protection',
                         allow_unprotected=True)
        if protection['status'] == 'observed' and not isinstance(protection['data'], dict):
            invalid(protection, 'Expected protection object')
        rulesets = api(f'{prefix}/rulesets?includes_parents=true', paginate=True)
        details = []
        if rulesets['status'] == 'observed':
            pages = rulesets['data']
            if not isinstance(pages, list) or not all(isinstance(page, list) for page in pages):
                invalid(rulesets, 'Expected paginated ruleset arrays')
            else:
                for page in pages:
                    for ruleset in page:
                        identifier = ruleset.get('id') if isinstance(ruleset, dict) else None
                        if type(identifier) is not int or identifier <= 0:
                            invalid(rulesets, 'Missing or invalid ruleset ID')
                            continue
                        detail = api(f'{prefix}/rulesets/{identifier}')
                        if detail['status'] == 'observed' and not isinstance(detail['data'], dict):
                            invalid(detail, 'Expected ruleset object')
                        details.append(detail)
        complete = all(item['status'] != 'unknown'
                       for item in [branch_result, protection, rulesets, *details])
        report['repositories'].append({
            'repository': repository, 'branch': branch, 'sha': sha,
            'complete': complete, 'branch_response': branch_result,
            'classic_protection': protection,
            'rulesets': rulesets, 'ruleset_details': details,
        })
        report['complete'] = report['complete'] and complete
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        with args.output.open('x', encoding='utf-8') as stream:
            report = collect()
            json.dump(report, stream, indent=2)
            stream.write('\n')
    except OSError as error:
        print(f'Cannot create evidence output: {error}', file=sys.stderr)
        return 2
    print(f'Evidence saved to {args.output}; complete={report["complete"]}')
    return 0 if report['complete'] else 1


if __name__ == '__main__':
    sys.exit(main())
