import { describe, expect, it } from "vitest";
import {
  acceptanceOverLimit,
  auditCards,
  businessDaysSince,
  resolveStatus,
  type AuditCard,
} from "../lib.js";
import { ACCEPTANCE_WIP_LIMIT, DEAD_LABELS, PM_LOGIN, STATUS_ALIASES } from "../types.js";

const NOW = new Date("2026-09-20T00:00:00Z");
const card = (over: Partial<AuditCard>): AuditCard => ({
  number: 1,
  title: "t",
  status: "Todo",
  issueState: "OPEN",
  labels: [],
  updatedAt: "2026-09-19T00:00:00Z",
  statusUpdatedAt: "2026-09-19T00:00:00Z",
  assignees: [],
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
    expect(resolveStatus("accept", STATUS_ALIASES)).toBe("Acceptance");
    expect(resolveStatus("Acceptance", STATUS_ALIASES)).toBe("Acceptance");
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
    for (const status of ["Todo", "Ready for Dev", "In Progress", "Review", "Acceptance", "Need Fix"]) {
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

  it("sends a Review card whose PRs all merged a while ago to post-merge-wrapup", () => {
    const merged = [pr("daodao-f2e#973", "merged")];
    const stale = card({ status: "Review", prs: merged, updatedAt: "2026-09-05T00:00:00Z" });
    const fresh = card({ status: "Review", prs: merged, updatedAt: "2026-09-19T00:00:00Z" });
    const waiting = card({ status: "Review", prs: [pr("daodao-f2e#974", "open")], updatedAt: "2026-09-05T00:00:00Z" });
    const f = auditCards([stale], DEAD_LABELS, NOW).find((x) => x.problem.startsWith("PR 全 merged"));
    expect(f?.suggest).toContain("post-merge-wrapup");
    expect(problems(fresh).some((x) => x.startsWith("PR 全 merged"))).toBe(false);
    expect(problems(waiting).some((x) => x.startsWith("PR 全 merged"))).toBe(false);
  });
});

describe("Acceptance column", () => {
  // 2026-09-20 is a Sunday; Taipei is UTC+8
  const accepted = (statusUpdatedAt: string, assignees = [PM_LOGIN]) =>
    card({ status: "Acceptance", statusUpdatedAt, assignees, prs: [pr("daodao-f2e#1", "merged")] });

  it("counts business days in Asia/Taipei, skipping weekends", () => {
    // Fri 09-18 10:00 Taipei → Sun 09-20: no business day has passed
    expect(businessDaysSince("2026-09-18T02:00:00Z", NOW)).toBe(0);
    // Wed 09-16 → Sun 09-20: Thu, Fri
    expect(businessDaysSince("2026-09-16T02:00:00Z", NOW)).toBe(2);
    // Mon 09-14 → Sun 09-20: Tue, Wed, Thu, Fri
    expect(businessDaysSince("2026-09-14T02:00:00Z", NOW)).toBe(4);
    // 23:30 UTC on Thu 09-17 is already Fri 09-18 in Taipei
    expect(businessDaysSince("2026-09-17T23:30:00Z", NOW)).toBe(0);
  });

  it("is quiet for an assigned card within the SLE", () => {
    expect(problems(accepted("2026-09-16T02:00:00Z"))).toEqual([]);
  });

  it("flags a card past the 2-business-day SLE", () => {
    const f = auditCards([accepted("2026-09-14T02:00:00Z")], DEAD_LABELS, NOW);
    expect(f.map((x) => x.problem)).toContain("Acceptance 已 4 個工作天未驗收（SLE 2）");
    expect(f[0].suggest).toContain(PM_LOGIN);
  });

  it("flags a card not assigned to the PM", () => {
    expect(problems(accepted("2026-09-18T02:00:00Z", ["vincentxuu"]))).toContain(
      `Acceptance 未指派 PM（${PM_LOGIN}）`
    );
  });

  it("does not apply Acceptance rules to other columns", () => {
    expect(problems(card({ status: "Review", statusUpdatedAt: "2026-09-01T00:00:00Z", prs: [pr("daodao-f2e#1", "open")] }))).toEqual([]);
  });

  it("reports when the column exceeds its WIP limit", () => {
    const n = (k: number) => Array.from({ length: k }, (_, i) => ({ ...accepted("2026-09-18T02:00:00Z"), number: i + 1 }));
    expect(acceptanceOverLimit(n(ACCEPTANCE_WIP_LIMIT))).toBeNull();
    expect(acceptanceOverLimit(n(ACCEPTANCE_WIP_LIMIT + 1))).toEqual({
      count: ACCEPTANCE_WIP_LIMIT + 1,
      limit: ACCEPTANCE_WIP_LIMIT,
    });
  });
});
