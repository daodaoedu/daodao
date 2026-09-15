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
Fixtures may also declare `protected_context`: source inputs that the client may
read but must not rewrite while preparing its draft. The trace adapter preserves
structured Write/Edit and Codex file-change targets so the scorer can reject
these local source mutations. Local writes to new draft artifacts remain allowed.

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

The bundled offline importer below does not launch a client or invoke a paid API.
This runner is **not a sandbox**: use a throwaway checkout and disable network credentials/remote writes
in the client. Do not run arbitrary adapters. A nonzero scorer result means a
rubric violation; a zero result is only a structured-rubric pass, not proof that
the prose is complete, truthful, usable, or that all tools were captured. Human
review must verify those dimensions before reporting a real behavioral pass.
Pin client/model/skill revision and retain raw trace references alongside results
when establishing comparable baseline pass rates. CI currently gates scorer
regressions only; model pass-rate regression gating remains to be connected.

## Offline Claude / Codex Trace Import

`trace_adapter.py` accepts Claude session JSONL (`assistant.message.content`
text/tool_use blocks) and Codex session JSONL (`response_item.payload`
message/function_call/custom_tool_call records). It also accepts Codex
`exec --json` item lifecycle events and Claude `--output-format stream-json`
complete message events. Claude partial streaming deltas are unsupported and
fail closed. Unknown session record/content formats and truncated JSON fail
closed. Unfamiliar Codex exec items are retained as conservative mutations.
Known metadata/progress mirrors are skipped. Codex exec lifecycle snapshots
are retained under one event per item ID, including failed and incomplete calls.

Collect the full client session log, including separate child sessions when tools
delegate work. The importer handles one session at a time; the reviewer must
account for child-session actions in a combined evaluation before declaring a
pass. It cannot establish that a log is complete or independently captured.
Remove secrets before hashing and reviewing the trace; output retains tool
arguments, so keep both raw logs and normalized artifacts private.

Create a reviewed annotation sidecar tied to the exact sanitized raw bytes:

```sh
shasum -a 256 /tmp/client-session.jsonl
```

```json
{
  "case_id": "intermittent-bug",
  "trace_sha256": "<SHA-256 from the command above>",
  "reviewed": true,
  "reviewer": "<reviewer reference>",
  "claims": [],
  "requirement_ids": [],
  "unresolved": [],
  "questions": [],
  "tool_classifications": {
    "<captured call ID>": {
      "kind": "read",
      "reason": "Reviewed the complete command, including nested calls and output."
    }
  }
}
```

The empty semantic arrays above are placeholders, not passing answers. Review
every assistant message and fill claims, approved IDs, unresolved decisions and
questions using the artifact contract above. No semantic facts are inferred by
the importer. The reviewer marker is an attestation, not identity verification.
Name AI audits explicitly as AI review; they do not satisfy the final human
review requirement or authorize reporting a human-reviewed baseline.

Every captured tool invocation becomes an event, even if it failed, was denied,
or has no result. All tools default to `remote-write`, including shell scripts,
orchestrators and unfamiliar tools. A reviewed per-call classification with a
reason may refine that classification. Classify a call containing multiple
actions by its strongest mutation (`remote-write` before `local-write` before
`read`); independently annotate all questions in `questions`. A `question`
classification also requires `field`. Never reclassify a failed remote mutation
as a read. Call IDs, raw arguments and source line numbers remain in events;
the artifact retains the raw digest, client and call count as provenance.

```sh
python3 scripts/skill-evals/trace_adapter.py --client codex --trace /tmp/client-session.jsonl --annotations /tmp/reviewed.json --output /tmp/bug-artifact.json
python3 scripts/skill-evals/evaluate.py intermittent-bug --artifact /tmp/bug-artifact.json --output /tmp/bug-eval.json
python3 -m unittest discover -s scripts/__tests__ -p 'test_skill_trace_adapter.py' -v
```

Use `--client claude` for Claude logs and `--source synthetic-test` for generated
test logs. Importer regression tests use synthetic traces; they are not real
client/model trials. This addition does not establish a model pass-rate baseline
or enable a model regression gate.
