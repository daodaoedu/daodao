/**
 * Pure helpers for the GitHub board pipeline (no I/O — unit-testable).
 */
import {
  CENTRAL_REPO,
  HIGH_RISK_REPOS,
  OWNER,
  SUB_REPOS,
  type AutoMode,
  type Scope,
  type SubRepo,
  type TaskSection,
} from "./types.js";

const OPENSPEC_RE = /OpenSpec:\s*`?(?:openspec\/changes\/)?([a-z0-9][a-z0-9-]*)\/?`?/i;
const PARENT_RE = new RegExp(`Parent:\\s*${OWNER}/${CENTRAL_REPO}#(\\d+)`, "i");
const CLOSING_RE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;

/** Extract the OpenSpec change slug from a central issue body. */
export function parseOpenSpecSlug(body: string): string | null {
  return OPENSPEC_RE.exec(body)?.[1] ?? null;
}

/** Extract the central issue number from a mirror issue body ("Parent: daodaoedu/daodao#N"). */
export function parseParentIssue(body: string): number | null {
  const m = PARENT_RE.exec(body);
  return m ? parseInt(m[1]!, 10) : null;
}

/** Extract issue numbers referenced with closing keywords in a PR body. */
export function parseClosingIssues(body: string): number[] {
  const nums = new Set<number>();
  let m: RegExpExecArray | null;
  CLOSING_RE.lastIndex = 0;
  while ((m = CLOSING_RE.exec(body)) !== null) nums.add(parseInt(m[1]!, 10));
  return Array.from(nums);
}

/** Parse tasks.md into "## section" groups of unchecked tasks. Completed tasks are dropped. */
export function parseTasksMd(content: string): TaskSection[] {
  const sections: TaskSection[] = [];
  let current: TaskSection | null = null;
  for (const line of content.split("\n")) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      if (current && current.tasks.length > 0) sections.push(current);
      current = { title: heading[1]!.trim(), tasks: [] };
      continue;
    }
    if (/^\s*-\s+\[ \]\s+/.test(line)) {
      if (!current) current = { title: "Tasks", tasks: [] };
      current.tasks.push(line.replace(/^\s*-\s+\[ \]\s+/, "").trim());
    }
  }
  if (current && current.tasks.length > 0) sections.push(current);
  return sections;
}

/**
 * Rule-based section → repo assignment:
 * - a section belongs to the first sub-repo mentioned in its title, else in its task lines;
 * - a section with no mention falls back to the card's single repo:* label;
 * - with multiple repo labels and no mention, the section is unassignable.
 */
export function assignSectionsToRepos(
  sections: TaskSection[],
  repoLabels: SubRepo[]
): { assigned: Map<SubRepo, TaskSection[]>; unassigned: TaskSection[] } {
  const assigned = new Map<SubRepo, TaskSection[]>();
  const unassigned: TaskSection[] = [];

  const firstMention = (text: string): SubRepo | null => {
    let best: { repo: SubRepo; idx: number } | null = null;
    for (const repo of SUB_REPOS) {
      const idx = text.indexOf(repo);
      if (idx !== -1 && (best === null || idx < best.idx)) best = { repo, idx };
    }
    return best?.repo ?? null;
  };

  for (const section of sections) {
    const repo =
      firstMention(section.title) ??
      firstMention(section.tasks.join("\n")) ??
      (repoLabels.length === 1 ? repoLabels[0]! : null);
    if (!repo) {
      unassigned.push(section);
      continue;
    }
    if (!assigned.has(repo)) assigned.set(repo, []);
    assigned.get(repo)!.push(section);
  }
  return { assigned, unassigned };
}

/** Read scope from labels ("scope:M" → "M"), defaulting to M. */
export function scopeFromLabels(labels: string[]): Scope {
  const l = labels.find((x) => x.startsWith("scope:"));
  const v = l?.slice("scope:".length);
  return v === "XS" || v === "S" || v === "M" || v === "L" ? v : "M";
}

/** Read auto mode from labels, defaulting to plan-only. High-risk repos are always plan-only. */
export function autoModeFor(labels: string[], repo: SubRepo): AutoMode {
  if (HIGH_RISK_REPOS.includes(repo)) return "plan-only";
  return labels.includes("auto:auto-pr") ? "auto-pr" : "plan-only";
}

export function buildMirrorTitle(centralTitle: string, sectionTitle: string): string {
  return `${centralTitle} — ${sectionTitle}`;
}

/** Mirror issue body. The "Parent:" line is the board-sync back-reference — do not reformat. */
export function buildMirrorIssueBody(opts: {
  centralIssueNumber: number;
  sectionTitle: string;
  tasks: string[];
  scope: Scope;
  autoMode: AutoMode;
  specSlug: string;
  repo: SubRepo;
}): string {
  const highRiskNote = HIGH_RISK_REPOS.includes(opts.repo)
    ? "\n> ⚠️ high-risk repo，自動執行限制為 plan-only\n"
    : "";
  const taskList = opts.tasks.map((t) => `- [ ] ${t}`).join("\n");
  return `<!-- managed by pipeline-dispatch -->
${highRiskNote}
## Description

${opts.sectionTitle}

## Tasks

${taskList}

## Scope Notes

**Scope**: ${opts.scope}
**Auto mode**: ${opts.autoMode}
**Spec**: \`openspec/changes/${opts.specSlug}/\`

## Links

Parent: ${OWNER}/${CENTRAL_REPO}#${opts.centralIssueNumber}

---
*Auto-created by pipeline-dispatch (Routine A)*
`;
}

export function buildMirrorLabels(scope: Scope, autoMode: AutoMode): string[] {
  return ["auto", `auto:${autoMode}`, `scope:${scope}`];
}

export const NEEDS_SPEC_COMMENT = (reason: string): string => `📋 此卡已標記 \`Ready for Dev\` + \`auto\`，但 pipeline 無法 dispatch：

${reason}

請補齊後移除 \`needs-spec\` label，下輪 pipeline-dispatch 會重新處理。`;

export function buildDispatchedComment(
  mirrors: Array<{ repo: string; url: string; title: string; scope: Scope; autoMode: AutoMode }>
): string {
  const list = mirrors
    .map((m) => `- [ ] ${m.url} — ${m.title}（scope:${m.scope}, ${m.autoMode}）`)
    .join("\n");
  return `🚀 已 dispatch 到 sub-repo：

${list}

Board Status → In Progress。進度由 pipeline-board-sync 回報。`;
}

export function buildProgressComment(done: number, total: number): string {
  return `⏳ Sub-repo 進度：${done}/${total}`;
}

export function buildAllDoneComment(mirrorUrls: string[]): string {
  return `✅ 所有 sub-repo 任務完成：
${mirrorUrls.map((u) => `- ${u}`).join("\n")}

Board 已移 Done，待驗收後請手動 close。`;
}
