import { describe, expect, it } from "vitest";
import { auditCards, resolveStatus, type AuditCard } from "../lib.js";
import { DEAD_LABELS, STATUS_ALIASES } from "../types.js";

const NOW = new Date("2026-09-20T00:00:00Z");
const card = (over: Partial<AuditCard>): AuditCard => ({
  number: 1,
  title: "t",
  status: "Todo",
  issueState: "OPEN",
  labels: [],
  updatedAt: "2026-09-19T00:00:00Z",
  prs: [],
  ...over,
});
const problems = (c: AuditCard) => auditCards([c], DEAD_LABELS, NOW).map((f) => f.problem);

describe("resolveStatus", () => {
  it("maps aliases case-insensitively with -/_/space interchangeable", () => {
    expect(resolveStatus("wip", STATUS_ALIASES)).toBe("In Progress");
    expect(resolveStatus("In-Progress", STATUS_ALIASES)).toBe("In Progress");
    expect(resolveStatus("need_fix", STATUS_ALIASES)).toBe("Need Fix");
    expect(resolveStatus("READY", STATUS_ALIASES)).toBe("Ready for Dev");
    expect(resolveStatus("bogus", STATUS_ALIASES)).toBeNull();
  });
});

describe("auditCards", () => {
  it("is quiet for a consistent card", () => {
    expect(problems(card({ status: "In Progress", prs: [{ ref: "daodao-f2e#1", state: "open" }] }))).toEqual([]);
    expect(problems(card({ status: "Done", issueState: "CLOSED" }))).toEqual([]);
  });

  it("flags Done with open issue, and closed issue stuck in an active column", () => {
    expect(problems(card({ status: "Done" }))).toContain("Done 但 issue 仍 open");
    expect(problems(card({ status: "In Progress", issueState: "CLOSED" }))).toContain(
      "issue 已 close 但卡在 In Progress"
    );
  });

  it("flags Todo with an open PR", () => {
    const p = problems(card({ status: "Todo", prs: [{ ref: "daodao-f2e#1008", state: "open" }] }));
    expect(p.some((x) => x.startsWith("有 open PR"))).toBe(true);
  });

  it("flags merged-and-stale only after staleDays", () => {
    const merged = [{ ref: "daodao-f2e#973", state: "merged" as const }];
    const fresh = card({ status: "In Progress", prs: merged, updatedAt: "2026-09-19T00:00:00Z" });
    const stale = card({ status: "In Progress", prs: merged, updatedAt: "2026-09-05T00:00:00Z" });
    expect(problems(fresh).some((x) => x.startsWith("PR 全 merged"))).toBe(false);
    expect(problems(stale).some((x) => x.startsWith("PR 全 merged"))).toBe(true);
    // an open PR alongside merged ones means work is still flowing
    const mixed = card({ status: "In Progress", prs: [...merged, { ref: "daodao-server#9", state: "open" }], updatedAt: "2026-09-05T00:00:00Z" });
    expect(problems(mixed).some((x) => x.startsWith("PR 全 merged"))).toBe(false);
  });

  it("ignores central-repo (docs) PRs for the merged-stale rule", () => {
    const c = card({ status: "Todo", prs: [{ ref: "daodao#215", state: "merged" }], updatedAt: "2026-08-19T00:00:00Z" });
    expect(problems(c)).toEqual([]);
  });

  it("flags dead labels and human-driving left on Done", () => {
    expect(problems(card({ labels: ["needs-spec", "bug"] }))).toContain("死 label：needs-spec");
    expect(problems(card({ status: "Done", issueState: "CLOSED", labels: ["human-driving"] }))).toContain(
      "Done 仍掛 human-driving"
    );
  });
});
