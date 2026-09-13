#!/usr/bin/env python3
"""Aggregate reviewed client runs; never treat scorer controls as model evidence."""
import argparse
import hashlib
import importlib.util
import json
import re
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('skill_evaluator', Path(__file__).with_name('evaluate.py'))
EVALUATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EVALUATOR)


def aggregate(manifest, directory):
    """Re-score artifacts and bind every run to the declared fixture revision."""
    if not isinstance(manifest, dict) or manifest.get('schema_version') != 1:
        raise ValueError('unsupported manifest schema_version')
    identity = manifest.get('identity', {})
    if not isinstance(identity, dict):
        raise ValueError('identity must be an object')
    for key in ('client', 'client_version', 'model', 'skill_revision'):
        if not isinstance(identity.get(key), str) or not identity[key].strip():
            raise ValueError(f'identity requires {key}')
    if identity['client'] not in ('claude', 'codex'):
        raise ValueError('unsupported client')
    fixtures = {p.stem: p for p in EVALUATOR.FIXTURES.glob('*.json')}
    digest = hashlib.sha256()
    for name, path in sorted(fixtures.items()):
        digest.update(name.encode() + b'\0' + path.read_bytes())
    if manifest.get('fixture_sha256') != digest.hexdigest():
        raise ValueError('fixture revision mismatch')
    runs = manifest.get('runs')
    if not isinstance(runs, list) or not runs:
        raise ValueError('runs must be a nonempty list')
    counts = {name: {'passed': 0, 'total': 0} for name in fixtures}
    seen = set()
    seen_traces = set()
    outcomes = []
    for run in runs:
        if not isinstance(run, dict) or run.get('case_id') not in fixtures:
            raise ValueError('unknown run case')
        run_id = run.get('run_id')
        if not isinstance(run_id, str) or not run_id or run_id in seen:
            raise ValueError('missing or duplicate run_id')
        seen.add(run_id)
        case_id = run['case_id']
        if run.get('status') == 'error':
            if not isinstance(run.get('reason'), str) or not run['reason'].strip():
                raise ValueError('error run requires reason')
            outcome = {'run_id': run_id, 'case_id': case_id, 'passed': False,
                       'failures': ['client error: ' + run['reason']]}
        elif run.get('status') == 'completed':
            if run.get('reviewed') is not True or not isinstance(run.get('reviewer'), str) or not run['reviewer'].strip():
                raise ValueError('completed run requires explicit review')
            relative = run.get('artifact')
            if not isinstance(relative, str):
                raise ValueError('artifact path required')
            path = (directory / relative).resolve()
            if not path.is_relative_to(directory.resolve()):
                raise ValueError('artifact must be inside manifest directory')
            raw = path.read_bytes()
            if hashlib.sha256(raw).hexdigest() != run.get('artifact_sha256'):
                raise ValueError('artifact digest mismatch')
            artifact = json.loads(raw)
            if not isinstance(artifact, dict):
                raise ValueError('artifact must be an object')
            if artifact.get('trace_source') != 'captured-client':
                raise ValueError('synthetic artifacts cannot establish a model baseline')
            provenance = artifact.get('trace_provenance')
            if (not isinstance(provenance, dict)
                    or provenance.get('client') != identity['client']
                    or not isinstance(provenance.get('sha256'), str)
                    or not re.fullmatch(r'[0-9a-f]{64}', provenance['sha256'])
                    or type(provenance.get('bytes')) is not int or provenance['bytes'] <= 0
                    or type(provenance.get('tool_calls')) is not int
                    or not isinstance(artifact.get('events'), list)
                    or provenance['tool_calls'] != len(artifact['events'])):
                raise ValueError('missing or inconsistent trace provenance')
            if provenance['sha256'] in seen_traces:
                raise ValueError('duplicate trace cannot count as an independent run')
            seen_traces.add(provenance['sha256'])
            case = json.loads(fixtures[case_id].read_text())
            outcome = dict(EVALUATOR.score(case, artifact), run_id=run_id, case_id=case_id)
        else:
            raise ValueError('run status must be completed or error')
        counts[case_id]['total'] += 1
        counts[case_id]['passed'] += int(outcome['passed'])
        outcomes.append(outcome)
    total = len(runs)
    passed = sum(value['passed'] for value in counts.values())
    return {'schema_version': 1, 'identity': identity,
            'fixture_sha256': digest.hexdigest(), 'cases': counts,
            'total': total, 'passed': passed, 'pass_rate': passed / total,
            'complete_case_coverage': all(value['total'] for value in counts.values()),
            'runs': outcomes, 'evidence_kind': 'reviewed-client-runs',
            'limitation': 'Reviewer attestations are not identity verification; structured rubrics do not prove prose quality.'}


def compare(current, baseline):
    for key in ('identity', 'fixture_sha256'):
        # Skill changes are the variable under test; client/model must stay fixed.
        left, right = current[key], baseline[key]
        if key == 'identity':
            left = {k: v for k, v in left.items() if k != 'skill_revision'}
            right = {k: v for k, v in right.items() if k != 'skill_revision'}
        if left != right:
            raise ValueError(f'incomparable {key}')
    if not current['complete_case_coverage'] or not baseline['complete_case_coverage']:
        raise ValueError('all fixtures required for regression comparison')
    regressions = []
    for name, now in current['cases'].items():
        before = baseline['cases'][name]
        if now['total'] != before['total']:
            raise ValueError('paired case sample counts must match')
        if now['passed'] < before['passed']:
            regressions.append(name)
    return regressions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--baseline', type=Path, help='A baseline run manifest, revalidated before comparison')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        result = aggregate(json.loads(args.manifest.read_text()), args.manifest.parent)
        if args.baseline:
            baseline = aggregate(json.loads(args.baseline.read_text()), args.baseline.parent)
            result['regressions'] = compare(result, baseline)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        # Exclusive creation also protects manifests, artifacts and trace files.
        with args.output.open('x') as output:
            output.write(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(2, f'Invalid behavioral evidence: {error}\n')
    print(json.dumps({key: result[key] for key in ('total', 'passed', 'pass_rate', 'complete_case_coverage')}))
    return 1 if result.get('regressions') else 0


if __name__ == '__main__':
    raise SystemExit(main())
