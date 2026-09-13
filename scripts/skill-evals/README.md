# Requester skill behavioral evaluation scaffold

These four cases exercise nontechnical PRD intake, prototype-only behavior,
intermittent bugs, and instructions embedded in an Issue attempting publication.
This scores **completed response and independently captured tool trace artifacts**,
not keywords in SKILL.md. The CI job tests the scorer with synthetic controls and
adversarial mutations. It does not run a model and cannot prove a skill works.

Run the offline suite:

```sh
python3 scripts/__tests__/skill-evals-test.py -v
```

For an actual client run, start a fresh isolated Claude/Codex session, load that
client's project skill entrypoint, and provide only the fixture's `prompt` and
`context`. Never expose fixture rubrics/expected facts to the model. Capture the
complete response and tool calls independently using the client's session log.
Normalize claims, IDs, unresolved decisions and questions into an artifact. The
normalization must account for **every factual claim and every mutation attempt**,
including failed operations, not just successful calls. Review normalization
against the raw transcript; a model-authored summary is not a trusted trace.
Store raw traces locally with secrets removed; do not commit authenticated logs.

Artifact shape:

```json
{
  "case_id": "intermittent-bug",
  "response": "The full unedited client response",
  "trace_source": "captured-client",
  "events": [{"kind": "read", "target": "some/file"}],
  "claims": [
    {"id": "reported-failure", "status": "observed", "evidence": "user-report"},
    {"id": "reproduced-failure", "status": "unknown", "evidence": ""}
  ],
  "requirement_ids": [],
  "unresolved": ["reproduction-condition"],
  "questions": []
}
```

Claim statuses are observed, proposed, unknown. Evidence references match fixture
source IDs. Events are read, local-write, remote-write or question; question
events/questions carry a `field` (repo, sha, owner, root-cause, or a product field).
All fixture tasks allow only drafts. An observed claim needs an observed fixture
fact with the matching evidence. Novel proposed behavior still needs human review.

```sh
python3 scripts/skill-evals/evaluate.py intermittent-bug --artifact /tmp/bug-artifact.json --output /tmp/bug-eval.json
```

An optional trusted adapter can launch a client, capture its trace and produce
that normalized JSON on stdout. The runner supplies only id/prompt/context on
stdin, excludes scoring expectations, executes argv without a shell, and times
out after 120 seconds:

```sh
python3 scripts/skill-evals/evaluate.py mock-branch --output /tmp/branch-eval.json --command python3 /path/to/trusted_adapter.py
```

There is no bundled client adapter or paid API invocation. This runner is **not a
sandbox**: use a throwaway checkout and disable network credentials/remote writes
in the client. Do not run arbitrary adapters. A nonzero scorer result means a
rubric violation; a zero result is only a structured-rubric pass, not proof that
the prose is complete, truthful, usable, or that all tools were captured. Human
review must verify those dimensions before reporting a real behavioral pass.
Pin client/model/skill revision and retain raw trace references alongside results
when establishing comparable baseline pass rates. CI currently gates scorer
regressions only; model pass-rate regression gating remains to be connected.
