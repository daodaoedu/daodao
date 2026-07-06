import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// We'll import the module under test with a dynamic path so we can control
// the STATE_STORE_PATH via a temp dir trick. Instead, we directly test the
// exported functions with injected dependencies.
import {
  parseIssueRefs,
  sinceTimestamp,
  fetchMergedSpecPRs,
  addSpecMergedLabel,
  readStateStore,
  writeStateStore,
  run,
  type GhRunner,
} from "../spec-merged-scan.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePR(overrides: {
  number?: number;
  title?: string;
  body?: string;
  mergedAt?: string;
  headRefName?: string;
}) {
  return {
    number: overrides.number ?? 1,
    title: overrides.title ?? "test PR",
    body: overrides.body ?? "",
    mergedAt: overrides.mergedAt ?? "2026-05-08T00:00:00Z",
    headRefName: overrides.headRefName ?? "openspec/changes/test",
  };
}

function mockGh(responses: Array<{ stdout: string; status: number }>): GhRunner {
  let callIndex = 0;
  return (_args: string[]) => {
    const r = responses[callIndex] ?? { stdout: "", status: 0 };
    callIndex++;
    return r;
  };
}

// ---------------------------------------------------------------------------
// parseIssueRefs
// ---------------------------------------------------------------------------

describe("parseIssueRefs", () => {
  it("parses the v3 Spec-For ref (does not trigger GitHub auto-close)", () => {
    const body = "Spec-For: daodaoedu/daodao-server#7";
    expect(parseIssueRefs(body)).toEqual([{ repo: "daodao-server", issueNum: 7 }]);
  });

  it("parses a single Closes ref", () => {
    const body = "Closes daodaoedu/daodao-f2e#42";
    expect(parseIssueRefs(body)).toEqual([{ repo: "daodao-f2e", issueNum: 42 }]);
  });

  it("parses multiple refs", () => {
    const body =
      "Closes daodaoedu/daodao-server#10\nFixes daodaoedu/daodao-f2e#20";
    const refs = parseIssueRefs(body);
    expect(refs).toHaveLength(2);
    expect(refs[0]).toEqual({ repo: "daodao-server", issueNum: 10 });
    expect(refs[1]).toEqual({ repo: "daodao-f2e", issueNum: 20 });
  });

  it("returns empty array when no refs", () => {
    expect(parseIssueRefs("No references here.")).toEqual([]);
  });

  it("is case-insensitive for the keyword", () => {
    const body = "CLOSES daodaoedu/daodao-storage#99";
    expect(parseIssueRefs(body)).toEqual([{ repo: "daodao-storage", issueNum: 99 }]);
  });

  it("handles Resolves keyword", () => {
    const body = "Resolves daodaoedu/daodao-worker#7";
    expect(parseIssueRefs(body)).toEqual([{ repo: "daodao-worker", issueNum: 7 }]);
  });
});

// ---------------------------------------------------------------------------
// sinceTimestamp
// ---------------------------------------------------------------------------

describe("sinceTimestamp", () => {
  it("returns stored value when present", () => {
    const ts = "2026-01-01T00:00:00.000Z";
    expect(sinceTimestamp(ts)).toBe(ts);
  });

  it("returns ~24h ago when empty string (cold start)", () => {
    const before = Date.now();
    const result = sinceTimestamp("");
    const after = Date.now();
    const d = new Date(result).getTime();
    // should be approximately 24h before now
    expect(d).toBeGreaterThanOrEqual(before - 24 * 3600 * 1000 - 1000);
    expect(d).toBeLessThanOrEqual(after - 24 * 3600 * 1000 + 1000);
  });
});

// ---------------------------------------------------------------------------
// fetchMergedSpecPRs
// ---------------------------------------------------------------------------

describe("fetchMergedSpecPRs", () => {
  it("returns parsed PRs on success", () => {
    const prs = [makePR({ number: 1, body: "Closes daodaoedu/daodao-f2e#5" })];
    const gh = mockGh([{ stdout: JSON.stringify(prs), status: 0 }]);
    const result = fetchMergedSpecPRs("2026-05-01T00:00:00Z", gh);
    expect(result).toHaveLength(1);
    expect(result![0].number).toBe(1);
  });

  it("returns null when gh CLI fails", () => {
    const gh = mockGh([{ stdout: "", status: 1 }]);
    const result = fetchMergedSpecPRs("2026-05-01T00:00:00Z", gh);
    expect(result).toBeNull();
  });

  it("returns null on invalid JSON output", () => {
    const gh = mockGh([{ stdout: "not-json", status: 0 }]);
    const result = fetchMergedSpecPRs("2026-05-01T00:00:00Z", gh);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// addSpecMergedLabel
// ---------------------------------------------------------------------------

describe("addSpecMergedLabel", () => {
  it("returns true on success", () => {
    const gh = mockGh([{ stdout: "", status: 0 }]);
    expect(addSpecMergedLabel("daodao-f2e", 42, gh)).toBe(true);
  });

  it("returns false on gh failure", () => {
    const gh = mockGh([{ stdout: "", status: 1 }]);
    expect(addSpecMergedLabel("daodao-f2e", 42, gh)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// run() — integration-level tests with mocked gh
// ---------------------------------------------------------------------------

describe("run()", () => {
  const STORE = path.resolve(
    import.meta.dirname,
    "../state-store.json"
  );
  let originalStore: string;

  beforeEach(() => {
    try {
      originalStore = fs.readFileSync(STORE, "utf8");
    } catch {
      originalStore = JSON.stringify({
        last_scan_at: "",
        last_dispatch_run_at: "",
        pause_reason: "",
        token_usage_by_issue: {},
        ports_in_use: [],
      });
    }
  });

  afterEach(() => {
    fs.writeFileSync(STORE, originalStore, "utf8");
  });

  it("happy path: 3 merged PRs, 2 with valid refs → labels added, last_scan_at updated", async () => {
    const prs = [
      makePR({ number: 10, body: "Closes daodaoedu/daodao-f2e#1" }),
      makePR({ number: 11, body: "Closes daodaoedu/daodao-server#2" }),
      makePR({ number: 12, body: "No issue ref here" }),
    ];

    const gh = mockGh([
      { stdout: JSON.stringify(prs), status: 0 }, // pr list
      { stdout: "", status: 0 },                   // issue edit #1
      { stdout: "", status: 0 },                   // issue edit #2
    ]);

    const storeBefore = readStateStore();
    const code = await run(gh);
    const storeAfter = readStateStore();

    expect(code).toBe(0);
    expect(storeAfter.last_scan_at).not.toBe(storeBefore.last_scan_at);
    expect(new Date(storeAfter.last_scan_at).getTime()).toBeGreaterThan(
      Date.now() - 5000
    );
  });

  it("gh pr list exit 1 → last_scan_at NOT updated, exit code 1", async () => {
    const gh = mockGh([{ stdout: "", status: 1 }]);
    const storeBefore = readStateStore();
    const code = await run(gh);
    const storeAfter = readStateStore();

    expect(code).toBe(1);
    expect(storeAfter.last_scan_at).toBe(storeBefore.last_scan_at);
  });

  it("label write fails → last_scan_at NOT updated, exit code 1", async () => {
    const prs = [makePR({ number: 20, body: "Closes daodaoedu/daodao-f2e#5" })];
    const gh = mockGh([
      { stdout: JSON.stringify(prs), status: 0 }, // pr list ok
      { stdout: "", status: 1 },                   // issue edit FAILS
    ]);

    const storeBefore = readStateStore();
    const code = await run(gh);
    const storeAfter = readStateStore();

    expect(code).toBe(1);
    expect(storeAfter.last_scan_at).toBe(storeBefore.last_scan_at);
  });

  it("no merged PRs → last_scan_at updated, exit code 0", async () => {
    const gh = mockGh([{ stdout: "[]", status: 0 }]);
    const storeBefore = readStateStore();
    const code = await run(gh);
    const storeAfter = readStateStore();

    expect(code).toBe(0);
    expect(storeAfter.last_scan_at).not.toBe(storeBefore.last_scan_at);
  });

  it("re-run is idempotent (label already exists → gh returns 0)", async () => {
    const prs = [makePR({ number: 30, body: "Closes daodaoedu/daodao-worker#3" })];
    const ghSequence = [
      { stdout: JSON.stringify(prs), status: 0 },
      { stdout: "", status: 0 }, // first run label add
      { stdout: JSON.stringify(prs), status: 0 },
      { stdout: "", status: 0 }, // second run: gh --add-label is idempotent, still 0
    ];
    const gh = mockGh(ghSequence);

    const code1 = await run(gh);
    const code2 = await run(gh);
    expect(code1).toBe(0);
    expect(code2).toBe(0);
  });

  it("last_scan_at set to 7 days ago → scan uses that timestamp", async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const store = readStateStore();
    store.last_scan_at = sevenDaysAgo;
    writeStateStore(store);

    let capturedArgs: string[] = [];
    const gh: GhRunner = (args) => {
      capturedArgs = args;
      return { stdout: "[]", status: 0 };
    };

    await run(gh);
    const searchArg = capturedArgs.find((a) => a.startsWith("merged:>"));
    expect(searchArg).toContain(sevenDaysAgo.split("T")[0]);
  });
});
