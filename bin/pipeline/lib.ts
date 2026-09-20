/**
 * Pure helpers for the Planning board CLI (no I/O — unit-testable).
 *
 * Routine A／B were retired on 2026-09-20 (#241) and Routine C (board-sync)
 * the same day: board status is now written by the
 * dev-task / post-merge-wrapup / gh-card skills through bin/pipeline/board.ts.
 * Historical prompts and templates live under docs/archive/automation/.
 */
import { CENTRAL_REPO } from "./types.js";

// ── Board audit (pure) ──────────────────────────────────────────────────

export interface AuditCard {
  number: number;
  title: string;
  status: string | null;
  issueState: "OPEN" | "CLOSED";
  labels: string[];
  updatedAt: string; // ISO
  /** Linked PRs across repos, e.g. "daodao-f2e#973" */
  prs: Array<{ ref: string; state: "open" | "merged" | "closed" }>;
}

export interface AuditFinding {
  number: number;
  title: string;
  status: string | null;
  problem: string;
  suggest: string;
}

/** Match the alias table without importing types at runtime (keeps lib.ts I/O-free). */
export function resolveStatus(
  input: string,
  aliases: Record<string, string>
): string | null {
  const key = input.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  return aliases[key] ?? null;
}

/**
 * Flag cards whose board Status disagrees with issue state / linked PRs / labels.
 * `now` is injectable for tests; `staleDays` = how long a merged-but-unmoved card
 * may sit before we call it out.
 */
export function auditCards(
  cards: AuditCard[],
  deadLabels: readonly string[],
  now: Date = new Date(),
  staleDays = 3
): AuditFinding[] {
  const out: AuditFinding[] = [];
  const push = (c: AuditCard, problem: string, suggest: string) =>
    out.push({ number: c.number, title: c.title, status: c.status, problem, suggest });

  for (const c of cards) {
    const status = c.status ?? "(none)";
    const open = c.prs.filter((p) => p.state === "open");
    // Central-repo PRs are docs/pipeline changes that merely mention the card;
    // only sub-repo merges count as "implementation landed".
    const merged = c.prs.filter(
      (p) => p.state === "merged" && !p.ref.startsWith(`${CENTRAL_REPO}#`)
    );
    const ageDays = (now.getTime() - new Date(c.updatedAt).getTime()) / 86_400_000;

    if (status === "Done" && c.issueState === "OPEN") {
      push(c, "Done 但 issue 仍 open", "驗收後 close issue，或移回 Review");
    }
    if (["Todo", "Ready for Dev", "In Progress"].includes(status) && c.issueState === "CLOSED") {
      push(c, `issue 已 close 但卡在 ${status}`, "移 Done（或 reopen issue）");
    }
    if (["Todo", "Ready for Dev"].includes(status) && open.length > 0) {
      push(c, `有 open PR（${open.map((p) => p.ref).join(", ")}）`, "移 In Progress");
    }
    if (
      ["Todo", "Ready for Dev", "In Progress"].includes(status) &&
      c.issueState === "OPEN" &&
      merged.length > 0 &&
      open.length === 0 &&
      ageDays >= staleDays
    ) {
      push(
        c,
        `PR 全 merged（${merged.map((p) => p.ref).join(", ")}）且 ${Math.floor(ageDays)} 天無活動`,
        "移 Review 等驗收"
      );
    }
    if (status === "Review" && c.prs.length === 0) {
      push(c, "Review 但沒有關聯 PR", "確認是否為子卡等驗收，否則移回 In Progress");
    }
    const dead = c.labels.filter((l) => deadLabels.includes(l));
    if (dead.length > 0) {
      push(c, `死 label：${dead.join(", ")}`, "移除");
    }
    if (status === "Done" && c.labels.includes("human-driving")) {
      push(c, "Done 仍掛 human-driving", "移除");
    }
  }
  return out;
}
