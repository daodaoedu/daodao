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

const pr = (ref: string, state: "open" | "merged" | "closed", linked = false) => ({ ref, state, linked });

describe("auditCards", () => {
  it("is quiet for a consistent card", () => {
    expect(problems(card({ status: "Review", prs: [pr("daodao-f2e#1", "open")] }))).toEqual([]);
    expect(problems(card({ status: "Done", issueState: "CLOSED" }))).toEqual([]);
  });

  it("flags a card with no Status at all", () => {
    expect(problems(card({ status: null }))).toContain("卡片沒有 Status");
  });

  it("flags Done with open issue, and a closed issue in any open-state column", () => {
    expect(problems(card({ status: "Done" }))).toContain("Done 但 issue 仍 open");
    for (const status of ["Todo", "Ready for Dev", "In Progress", "Review", "Need Fix"]) {
      expect(problems(card({ status, issueState: "CLOSED" }))).toContain(
        `issue 已 close 但卡在 ${status}`
      );
    }
  });

  it("sends a card with an open PR to Review, per the dev-task finish contract", () => {
    const findings = auditCards(
      [card({ status: "Todo", prs: [pr("daodao-f2e#1008", "open")] })],
      DEAD_LABELS,
      NOW
    );
    const openPr = findings.find((f) => f.problem.startsWith("有 open PR"));
    expect(openPr?.suggest).toBe("移 Review");
  });

  it("flags merged-and-stale only after staleDays", () => {
    const merged = [pr("daodao-f2e#973", "merged")];
    const fresh = card({ status: "In Progress", prs: merged, updatedAt: "2026-09-19T00:00:00Z" });
    const stale = card({ status: "In Progress", prs: merged, updatedAt: "2026-09-05T00:00:00Z" });
    expect(problems(fresh).some((x) => x.startsWith("PR 全 merged"))).toBe(false);
    expect(problems(stale).some((x) => x.startsWith("PR 全 merged"))).toBe(true);
    // an open PR alongside merged ones means work is still flowing
    const mixed = card({ status: "In Progress", prs: [...merged, pr("daodao-server#9", "open")], updatedAt: "2026-09-05T00:00:00Z" });
    expect(problems(mixed).some((x) => x.startsWith("PR 全 merged"))).toBe(false);
  });

  it("ignores a central-repo PR that only mentions the card, but counts a linked one", () => {
    const mention = card({ status: "Todo", prs: [pr("daodao#215", "merged")], updatedAt: "2026-08-19T00:00:00Z" });
    expect(problems(mention)).toEqual([]);
    // root-only work (workflow/CLI changes) links its PR, so the card must still be caught
    const linked = card({ status: "Todo", prs: [pr("daodao#243", "merged", true)], updatedAt: "2026-08-19T00:00:00Z" });
    expect(problems(linked).some((x) => x.startsWith("PR 全 merged"))).toBe(true);
  });

  it("flags dead labels and human-driving left on Done", () => {
    expect(problems(card({ labels: ["needs-spec", "bug"] }))).toContain("死 label：needs-spec");
    expect(problems(card({ status: "Done", issueState: "CLOSED", labels: ["human-driving"] }))).toContain(
      "Done 仍掛 human-driving"
    );
  });
});
