# Behavioral run manifests

`aggregate.py` re-scores reviewed artifacts and reports the number of completed
and failed client attempts. This does not run a model in CI or authenticate a
reviewer. Synthetic scorer controls cannot establish a model baseline.

Keep each manifest with its artifacts in a private local evidence directory.
Never commit authenticated raw logs. First use `trace_adapter.py` with reviewed
annotations. Account for every client attempt, including timeouts and failures;
the aggregator cannot detect omitted runs or falsified attestations.

```json
{
  "schema_version": 1,
  "identity": {
    "client": "codex",
    "client_version": "exact CLI version",
    "model": "exact model from the trace",
    "skill_revision": "commit plus dirty content digest if applicable"
  },
  "fixture_sha256": "SHA256 of sorted fixture stem + NUL + file bytes concatenated",
  "runs": [
    {
      "run_id": "unique-attempt-id",
      "case_id": "intermittent-bug",
      "status": "completed",
      "reviewed": true,
      "reviewer": "reviewer identity; explicitly identify AI review",
      "artifact": "codex-artifact.json",
      "artifact_sha256": "SHA256 of the exact artifact file bytes"
    },
    {
      "run_id": "another-attempt",
      "case_id": "mock-branch",
      "status": "error",
      "reason": "client timed out before completing"
    }
  ]
}
```

```sh
python3 scripts/skill-evals/aggregate.py /private/evidence/runs.json --output /private/evidence/report.json
python3 scripts/skill-evals/aggregate.py /private/current/runs.json --baseline /private/baseline/runs.json --output /private/current/comparison.json
```

Errors remain in the pass-rate denominator. Duplicate trace hashes, mismatched
client provenance, modified artifacts, unknown cases and changed fixture digests
are rejected. Comparison requires all four cases with equal per-case sample
counts and identical client version/model/fixture digest. Skill revision may
change because that is the variable under test. Any per-case decrease fails the
comparison (exit 1); invalid evidence exits 2. Small sample counts remain a smoke
check, not a statistically reliable model ranking.

Use a new output filename for each invocation. Existing output files are rejected
to protect evidence and previous reports from accidental overwrites.

The offline CI tests adapters and aggregation only. Real execution requires a
separately provisioned isolated client runner, captured traces and reviewed
annotations. A single-case smoke does not satisfy full baseline coverage, and a
trace parser does not prove normal project skill discovery or hook activation.
