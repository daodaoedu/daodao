/**
 * Pure helpers for the Planning board CLI (no I/O — unit-testable).
 *
 * Routine A／B were retired on 2026-09-20 (#241) and Routine C (board-sync)
 * the same day: board status is now written by the
 * dev-task / post-merge-wrapup / gh-card skills through bin/pipeline/board.ts.
 * Historical prompts and templates live under docs/archive/automation/.
 */
import {
  ACCEPTANCE_SLE_BUSINESS_DAYS,
  ACCEPTANCE_WIP_LIMIT,
  CENTRAL_REPO,
  PM_LOGIN,
} from "./types.js";

// ── Board audit (pure) ──────────────────────────────────────────────────

export interface AuditCard {
  number: number;
  title: string;
  status: string | null;
  issueState: "OPEN" | "CLOSED";
  labels: string[];
  updatedAt: string; // ISO
  /** When the Status field was last set, i.e. when the card entered its column (ISO). */
  statusUpdatedAt: string | null;
  assignees: string[];
  /**
   * PRs referencing the card. `linked` marks a real GitHub link (ConnectedEvent:
   * closing keyword or manual Development link) as opposed to a body mention.
   */
  prs: Array<{ ref: string; state: "open" | "merged" | "closed"; linked: boolean }>;
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
/** Columns whose issue must still be open; Done is the only closed one. */
const OPEN_STATES = ["Todo", "Ready for Dev", "In Progress", "Review", "Acceptance", "Need Fix"];

const TAIPEI_OFFSET_MS = 8 * 3_600_000;

/**
 * Weekdays (Mon–Fri, Asia/Taipei calendar) that have fully started after `since`:
 * entering on Friday and checking on Sunday is 0, on Tuesday is 2.
 */
export function businessDaysSince(since: string, now: Date): number {
  const day = (t: number) => Math.floor((t + TAIPEI_OFFSET_MS) / 86_400_000);
  const start = day(new Date(since).getTime());
  const end = day(now.getTime());
  let count = 0;
  for (let d = start + 1; d <= end; d++) {
    const weekday = new Date(d * 86_400_000).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count;
}

/** The Acceptance column over its WIP limit, or null when within it. */
export function acceptanceOverLimit(
  cards: AuditCard[],
  limit = ACCEPTANCE_WIP_LIMIT
): { count: number; limit: number } | null {
  const count = cards.filter((c) => c.status === "Acceptance").length;
  return count > limit ? { count, limit } : null;
}

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
    // A central-repo PR counts as implementation only when it is genuinely linked;
    // docs PRs that merely mention several cards in their body must not look like
    // landed work. Sub-repo PRs use `Refs`, which is only ever a mention, so they
    // always count.
    const implements_ = (p: AuditCard["prs"][number]) =>
      !p.ref.startsWith(`${CENTRAL_REPO}#`) || p.linked;
    const open = c.prs.filter((p) => p.state === "open" && implements_(p));
    const merged = c.prs.filter((p) => p.state === "merged" && implements_(p));
    const ageDays = (now.getTime() - new Date(c.updatedAt).getTime()) / 86_400_000;

    if (c.status === null) {
      push(c, "卡片沒有 Status", "設 Todo，或從 board 移除");
    }
    if (status === "Done" && c.issueState === "OPEN") {
      push(c, "Done 但 issue 仍 open", "驗收後 close issue，或移回 Review");
    }
    // Done is the only column whose issue is expected to be closed (§Status 七欄)
    if (OPEN_STATES.includes(status) && c.issueState === "CLOSED") {
      push(c, `issue 已 close 但卡在 ${status}`, "移 Done（或 reopen issue）");
    }
    if (["Todo", "Ready for Dev", "In Progress"].includes(status) && open.length > 0) {
      push(c, `有 open PR（${open.map((p) => p.ref).join(", ")}）`, "移 Review");
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
    if (
      status === "Review" &&
      c.issueState === "OPEN" &&
      merged.length > 0 &&
      open.length === 0 &&
      ageDays >= staleDays
    ) {
      push(
        c,
        `PR 全 merged（${merged.map((p) => p.ref).join(", ")}）且 ${Math.floor(ageDays)} 天無活動`,
        "跑 post-merge-wrapup：dev 冒煙通過移 Acceptance，失敗移 Need Fix"
      );
    }
    if (status === "Acceptance" && c.issueState === "OPEN") {
      if (!c.assignees.includes(PM_LOGIN)) {
        push(c, `Acceptance 未指派 PM（${PM_LOGIN}）`, `assign ${PM_LOGIN} 並留交接留言`);
      }
      const waited = c.statusUpdatedAt ? businessDaysSince(c.statusUpdatedAt, now) : 0;
      if (waited > ACCEPTANCE_SLE_BUSINESS_DAYS) {
        push(
          c,
          `Acceptance 已 ${waited} 個工作天未驗收（SLE ${ACCEPTANCE_SLE_BUSINESS_DAYS}）`,
          `提醒 @${PM_LOGIN} 驗收，或協助準備驗收材料`
        );
      }
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
