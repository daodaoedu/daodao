import { describe, it, expect } from "vitest";
import {
  fetchAutoIssues,
  fetchAutoPRs,
  classifyIssues,
  buildMarkdown,
  type GhRunner,
} from "../pipeline-status.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeIssue(
  number: number,
  title: string,
  labelNames: string[] = []
) {
  return {
    number,
    title,
    labels: labelNames.map((name) => ({ name })),
    url: `https://github.com/daodaoedu/daodao-f2e/issues/${number}`,
  };
}

function makePR(number: number, headRefName: string, title = "PR title") {
  return {
    number,
    title,
    headRefName,
    url: `https://github.com/daodaoedu/daodao-f2e/pull/${number}`,
  };
}

function mockGh(responses: Array<{ stdout: string; status: number }>): GhRunner {
  let i = 0;
  return (_args) => responses[i++] ?? { stdout: "[]", status: 0 };
}

// ---------------------------------------------------------------------------
// fetchAutoIssues
// ---------------------------------------------------------------------------

describe("fetchAutoIssues", () => {
  it("returns parsed issues on success", () => {
    const issues = [makeIssue(1, "Test issue", ["auto"])];
    const gh = mockGh([{ stdout: JSON.stringify(issues), status: 0 }]);
    expect(fetchAutoIssues("daodao-f2e", gh)).toHaveLength(1);
  });

  it("returns empty array on gh failure", () => {
    const gh = mockGh([{ stdout: "", status: 1 }]);
    expect(fetchAutoIssues("daodao-f2e", gh)).toEqual([]);
  });

  it("returns empty array on invalid JSON", () => {
    const gh = mockGh([{ stdout: "bad json", status: 0 }]);
    expect(fetchAutoIssues("daodao-f2e", gh)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchAutoPRs
// ---------------------------------------------------------------------------

describe("fetchAutoPRs", () => {
  it("returns only auto/ prefix PRs", () => {
    const prs = [
      makePR(10, "auto/f2e-5-my-feature"),
      makePR(11, "feature/some-other"),
      makePR(12, "auto/server-3-fix"),
    ];
    const gh = mockGh([{ stdout: JSON.stringify(prs), status: 0 }]);
    const result = fetchAutoPRs("daodao-f2e", gh);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.number)).toEqual([10, 12]);
  });

  it("returns empty array on gh failure", () => {
    const gh = mockGh([{ stdout: "", status: 1 }]);
    expect(fetchAutoPRs("daodao-f2e", gh)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// classifyIssues
// ---------------------------------------------------------------------------

describe("classifyIssues", () => {
  it("classifies spec-pending issues correctly", () => {
    const issues = [makeIssue(1, "Spec issue", ["auto", "spec-pending"])];
    const result = classifyIssues(issues, []);
    expect(result.specInReview).toHaveLength(1);
    expect(result.pendingPlan).toHaveLength(0);
  });

  it("classifies spec-merged issues correctly", () => {
    const issues = [makeIssue(2, "Spec merged", ["auto", "spec-merged"])];
    const result = classifyIssues(issues, []);
    expect(result.specMerged).toHaveLength(1);
  });

  it("pending-plan: no spec labels, no PR", () => {
    const issues = [makeIssue(3, "Plain auto", ["auto"])];
    const result = classifyIssues(issues, []);
    expect(result.pendingPlan).toHaveLength(1);
  });

  it("code PR open: issue has matching auto/ PR", () => {
    const issues = [makeIssue(5, "Feature", ["auto"])];
    const prs = [makePR(20, "auto/f2e-5-feature")];
    const result = classifyIssues(issues, prs);
    expect(result.codePROpen).toHaveLength(1);
    // issue with matching PR is NOT in pendingPlan
    expect(result.pendingPlan).toHaveLength(0);
  });

  it("synced always includes all issues", () => {
    const issues = [
      makeIssue(1, "A", ["auto", "spec-pending"]),
      makeIssue(2, "B", ["auto"]),
    ];
    const result = classifyIssues(issues, []);
    expect(result.synced).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// buildMarkdown
// ---------------------------------------------------------------------------

describe("buildMarkdown", () => {
  const baseStatus = {
    repo: "daodao-f2e",
    pendingSync: 0,
    synced: [],
    pendingPlan: [],
    specInReview: [],
    specMerged: [],
    codePROpen: [],
  };

  it("contains the 7 required section headers", () => {
    const md = buildMarkdown([baseStatus], {}, "2026-05-08T00:00:00.000Z");
    expect(md).toContain("## Pending sync");
    expect(md).toContain("## daodao-f2e");
    expect(md).toContain("### Synced issues");
    expect(md).toContain("### Pending plan");
    expect(md).toContain("### Spec in review");
    expect(md).toContain("### Spec merged");
    expect(md).toContain("### Code PR open");
    expect(md).toContain("## Recent routine failures");
  });

  it("includes generated timestamp", () => {
    const ts = "2026-05-08T12:00:00.000Z";
    const md = buildMarkdown([baseStatus], {}, ts);
    expect(md).toContain(ts);
  });

  it("renders issue rows", () => {
    const status = {
      ...baseStatus,
      synced: [makeIssue(42, "My feature", ["auto"])],
      pendingPlan: [makeIssue(42, "My feature", ["auto"])],
    };
    const md = buildMarkdown([status], {}, "2026-05-08T00:00:00.000Z");
    expect(md).toContain("#42");
    expect(md).toContain("My feature");
  });

  it("renders pause_reason in failures section", () => {
    const store = { pause_reason: "Manual pause by engineer" };
    const md = buildMarkdown([baseStatus], store, "2026-05-08T00:00:00.000Z");
    expect(md).toContain("Manual pause by engineer");
  });

  it("renders token usage table", () => {
    const store = {
      token_usage_by_issue: { "daodao-f2e#5": 12345 },
    };
    const md = buildMarkdown([baseStatus], store, "2026-05-08T00:00:00.000Z");
    expect(md).toContain("daodao-f2e#5");
    expect(md).toContain("12,345");
  });

  it("produces one section per repo when given 8 repos", () => {
    const repos = [
      "daodao-server", "daodao-f2e", "daodao-ai-backend", "daodao-storage",
      "daodao-admin-ui", "daodao-infra", "daodao-mcp", "daodao-worker",
    ];
    const statuses = repos.map((repo) => ({ ...baseStatus, repo }));
    const md = buildMarkdown(statuses, {}, "2026-05-08T00:00:00.000Z");
    for (const repo of repos) {
      expect(md).toContain(`## ${repo}`);
    }
  });
});
