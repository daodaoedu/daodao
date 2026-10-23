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
  BLOCKED_ACCEPTANCE_LABEL,
  BLOCKED_ACCEPTANCE_MAX_HOURS,
  CENTRAL_REPO,
  ENGINEERING_ACCEPTANCE_LABEL,
  NEED_FIX_COMMENT_GRACE_HOURS,
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
  prs: Array<{
    ref: string;
    state: "open" | "merged" | "closed";
    linked: boolean;
    /** Central cards this PR explicitly targets (title `— daodao#N`, Refs/Closes/Fixes lines). */
    targets?: number[];
  }>;
  /** GitHub sub-issues of this card (parent cards only); total 0 = not a parent. */
  subIssues?: { total: number; completed: number };
  /** Parent issue number when this card is itself a sub-issue. */
  parent?: number | null;
  /** Sub-issues living outside the central repo, as `repo#n`. */
  foreignSubIssues?: string[];
  /** Recent issue comments; fetched for Need Fix cards only (the return-reason check). */
  comments?: Array<{ createdAt: string; body: string }>;
  /** Latest time each label was added (ISO), from LabeledEvent. */
  labelAddedAt?: Record<string, string>;
}

export interface AuditFinding {
  number: number;
  title: string;
  status: string | null;
  problem: string;
  suggest: string;
}

/**
 * Central-repo cards a PR explicitly targets: a `daodao#N` marker in the title, or
 * `Refs`/`Closes`/`Fixes`/`Resolves` lines naming `daodaoedu/daodao#N`, `daodao#N` or the
 * issue URL. Prose mentions (follow-up lists, 「另卡 #n」) are not targets.
 */
export function prTargets(title: string, body: string): number[] {
  const found = new Set<number>();
  const card = /(?:daodaoedu\/)?daodao(?:#|\/issues\/)(\d+)\b/g;
  for (const m of title.matchAll(card)) found.add(Number(m[1]));
  for (const line of body.split("\n")) {
    if (!/^\s*(?:[-*]\s*)?(?:refs?|closes?|fixes?|resolves?)\b/i.test(line)) continue;
    for (const m of line.matchAll(card)) found.add(Number(m[1]));
  }
  return [...found];
}

/**
 * What a comment says about a returned card (#338). Need Fix only takes "which AC failed +
 * what was seen"; a blocked acceptance (could not test: ERR_BLOCKED_BY_CLIENT, upload failed,
 * no account) stays in Acceptance with `acceptance:blocked`.
 *
 * An AC failure needs an AC ID and a fail word on the same line, and that line must not be a
 * blocked row: the PM tool's blocked report still lists the AC rows it could not run and says
 * 「尚未觀察到產品 FAIL」 elsewhere (#250). A mixed report with one real failing row is a failure.
 * The 「🙋 請驗收」 hand-off itself mentions AC IDs, ❌ and the label, so it is never a return.
 */
export type ReturnCommentKind = "ac-fail" | "blocked" | "other";

// `(?<![:\w])` keeps the label name `acceptance:blocked` from reading as a blocked report
const BLOCKED_WORDS = /受阻|測不了|無法測試|截圖(?:無法|傳不)上傳|截圖傳不上去|(?<![:\w])BLOCKED\b|ERR_BLOCKED/i;
const AC_ID = /\bAC-?\d+/i;
const FAIL_WORDS = /\bFAIL(?:ED)?\b|未通過|不通過|沒過|失敗|❌/i;
const HANDOFF = /請驗收：/;

export function classifyReturnComment(body: string): ReturnCommentKind {
  if (HANDOFF.test(body)) return "other";
  const failLine = body
    .split("\n")
    .some((l) => AC_ID.test(l) && FAIL_WORDS.test(l) && !BLOCKED_WORDS.test(l));
  if (failLine) return "ac-fail";
  if (BLOCKED_WORDS.test(body)) return "blocked";
  return "other";
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
    // A central-repo PR counts as implementation only when it is genuinely linked or
    // explicitly targets the card (`Refs daodaoedu/daodao#N`: closing keywords would
    // auto-close the card on merge and skip acceptance, #364); docs PRs that merely
    // mention several cards in their prose must not look like landed work. A sub-repo PR that explicitly targets other cards only mentions this one (e.g. #218's PRs
    // listing follow-up cards); PRs with no target marker predate the convention and still count.
    const implements_ = (p: AuditCard["prs"][number]) =>
      p.ref.startsWith(`${CENTRAL_REPO}#`)
        ? p.linked || !!p.targets?.includes(c.number)
        : p.linked || !p.targets?.length || p.targets.includes(c.number);
    const open = c.prs.filter((p) => p.state === "open" && implements_(p));
    const merged = c.prs.filter((p) => p.state === "merged" && implements_(p));
    const ageDays = (now.getTime() - new Date(c.updatedAt).getTime()) / 86_400_000;
    // Time in the current column: comments refresh issue updatedAt, the Status value's does not
    const columnDays = c.statusUpdatedAt
      ? (now.getTime() - new Date(c.statusUpdatedAt).getTime()) / 86_400_000
      : ageDays;
    // Parent cards: the whole requirement is accepted only after every sub-issue is closed
    const subOpen = c.subIssues ? c.subIssues.total - c.subIssues.completed : 0;
    const engineering = c.labels.includes(ENGINEERING_ACCEPTANCE_LABEL);

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
      columnDays >= staleDays
    ) {
      push(
        c,
        `PR 全 merged（${merged.map((p) => p.ref).join(", ")}）且已在 Review ${Math.floor(columnDays)} 天`,
        subOpen > 0
          ? `母卡：等 ${subOpen} 張子卡關閉後再跑 post-merge-wrapup 交 PM`
          : engineering
            ? "跑 post-merge-wrapup：dev 冒煙通過留證據並關 issue（工程驗收），失敗移 Need Fix"
            : "跑 post-merge-wrapup：dev 冒煙通過移 Acceptance，失敗移 Need Fix"
      );
    }
    if (status === "Acceptance" && c.issueState === "OPEN" && engineering) {
      push(c, `工程驗收卡（${ENGINEERING_ACCEPTANCE_LABEL}）不需進 Acceptance`, "dev 冒煙證據已在留言就關 issue（自動進 Done）；沒有就先跑 post-merge-wrapup");
    } else if (status === "Acceptance" && c.issueState === "OPEN") {
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
    if (subOpen > 0 && c.issueState === "CLOSED") {
      push(c, `母卡已 close，仍有 ${subOpen} 張子卡未關`, "reopen 移回 Review，子卡全關後再交 PM 驗收");
    }
    if (subOpen > 0 && status === "Acceptance" && c.issueState === "OPEN") {
      push(c, `母卡在 Acceptance，仍有 ${subOpen} 張子卡未關`, "移回 Review，子卡全關後再交 PM 驗收");
    }
    // Only two levels, and children live in the central repo (github-issue-management §4.3)
    if (c.parent && (c.subIssues?.total ?? 0) > 0) {
      push(c, `第三層：本卡是 #${c.parent} 的子卡，底下又有 ${c.subIssues!.total} 張子卡`, "後續改進移出成獨立卡；範圍內的工作改掛到母卡 #" + c.parent);
    }
    if ((c.foreignSubIssues ?? []).length > 0) {
      push(c, `子卡不在中央 repo：${c.foreignSubIssues!.join(", ")}`, "可驗收工作改開中央子卡；工程交接筆記移出子卡關係");
    }
    if (status === "Review" && c.prs.length === 0) {
      // Parents carry no PRs of their own (github-issue-management §4.3)
      if ((c.subIssues?.total ?? 0) === 0) {
        push(c, "Review 但沒有關聯 PR", "確認是否為子卡等驗收，否則移回 In Progress");
      }
    }
    // Need Fix only takes AC failures (#338): blocked acceptance and new requirements go elsewhere
    const columnHours = columnDays * 24;
    if (status === "Need Fix" && c.issueState === "OPEN" && columnHours >= NEED_FIX_COMMENT_GRACE_HOURS) {
      // The return comment may land just before or after the move
      const since = (c.statusUpdatedAt ? new Date(c.statusUpdatedAt).getTime() : 0) - NEED_FIX_COMMENT_GRACE_HOURS * 3_600_000;
      const kinds = (c.comments ?? [])
        .filter((m) => new Date(m.createdAt).getTime() >= since)
        .map((m) => classifyReturnComment(m.body));
      if (!kinds.includes("ac-fail")) {
        if (kinds.includes("blocked")) {
          push(
            c,
            "Need Fix 的退回是驗收受阻，不是 AC 失敗",
            `移回 Acceptance、加 ${BLOCKED_ACCEPTANCE_LABEL} 並 @ 工程排除受阻`
          );
        } else {
          push(
            c,
            `Need Fix 已 ${Math.floor(columnHours)} 小時，沒有「哪條 AC 失敗＋看到什麼」的退回留言`,
            "退回者補 AC 失敗留言；驗收時新增的要求另開卡（相關：#n）、原卡依原 AC 判定；同一 bug 指向一張卡"
          );
        }
      }
    }
    // Parent whose sub-issues are all closed: the whole requirement is ready for the PM walk-through
    const allSubsClosed = (c.subIssues?.total ?? 0) > 0 && subOpen === 0;
    if (
      allSubsClosed &&
      c.issueState === "OPEN" &&
      status !== "Acceptance" &&
      status !== "Done" &&
      open.length === 0
    ) {
      push(
        c,
        `母卡的 ${c.subIssues!.total} 張子卡已全關，母卡仍在 ${status}`,
        engineering
          ? "跑 post-merge-wrapup 重新冒煙：通過留證據並關 issue（工程驗收）"
          : "跑 post-merge-wrapup 重新冒煙：通過移 Acceptance 交 PM 整體驗收，失敗留 AC 失敗留言移 Need Fix"
      );
    }
    if (c.labels.includes(BLOCKED_ACCEPTANCE_LABEL) && c.issueState === "OPEN") {
      const since = c.labelAddedAt?.[BLOCKED_ACCEPTANCE_LABEL] ?? c.statusUpdatedAt ?? c.updatedAt;
      const hours = (now.getTime() - new Date(since).getTime()) / 3_600_000;
      if (hours >= BLOCKED_ACCEPTANCE_MAX_HOURS) {
        push(
          c,
          `${BLOCKED_ACCEPTANCE_LABEL} 已 ${Math.floor(hours)} 小時未排除`,
          "工程排除受阻（環境／帳號／權限／上傳）後拔 label 並 @PM 重驗"
        );
      }
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
