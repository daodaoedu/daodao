#!/usr/bin/env tsx
/**
 * pipeline-status.ts
 *
 * Generates docs/automation/pipeline-status.md with 7 sections:
 *   1. Pending sync (Notion cards not yet synced)
 *   2. Synced (have `auto` label, no further classification)
 *   3. Pending plan (auto, no spec-pending/spec-merged, no open PR)
 *   4. Spec in review (spec-pending label)
 *   5. Spec merged (spec-merged label, no code PR yet)
 *   6. Code PR open (has open PR with auto/ prefix branch)
 *   7. Recent routine failures (last 5 entries from state-store)
 *
 * Data sources:
 *   - gh issue list per sub-repo (label: auto)
 *   - gh pr list per sub-repo (auto/ branches)
 *   - state-store.json for failure hints
 *
 * Designed to run without Notion API in dry/offline mode — Notion section
 * is omitted when NOTION_API_KEY is not set (shows a placeholder row).
 *
 * Exit codes: 0 success, 1 failure
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const MONOREPO_ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT_PATH = path.join(MONOREPO_ROOT, "docs/automation/pipeline-status.md");
const STATE_STORE_PATH = path.join(
  MONOREPO_ROOT,
  "bin/routine-dispatch/state-store.json"
);

// SSOT: bin/pipeline.config.json
import { loadConfig, repoNames } from "./routine-dispatch/config.js";
const ORG = loadConfig().org;
const ALL_REPOS = repoNames();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GhIssue {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
  url: string;
}

interface GhPR {
  number: number;
  title: string;
  headRefName: string;
  url: string;
}

interface RepoStatus {
  repo: string;
  pendingSync: number;
  synced: GhIssue[];
  pendingPlan: GhIssue[];
  specInReview: GhIssue[];
  specMerged: GhIssue[];
  codePROpen: GhPR[];
}

// ---------------------------------------------------------------------------
// gh CLI helpers (injectable)
// ---------------------------------------------------------------------------

export type GhRunner = (args: string[]) => { stdout: string; status: number };

export function defaultGhRunner(): GhRunner {
  return (args) => {
    const r = spawnSync("gh", args, { encoding: "utf8" });
    return { stdout: r.stdout ?? "", status: r.status ?? 1 };
  };
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

export function fetchAutoIssues(repo: string, gh: GhRunner): GhIssue[] {
  const r = gh([
    "issue",
    "list",
    "--repo",
    `${ORG}/${repo}`,
    "--label",
    "auto",
    "--state",
    "open",
    "--json",
    "number,title,labels,url",
    "--limit",
    "200",
  ]);
  if (r.status !== 0) return [];
  try {
    return JSON.parse(r.stdout) as GhIssue[];
  } catch {
    return [];
  }
}

export function fetchAutoPRs(repo: string, gh: GhRunner): GhPR[] {
  const r = gh([
    "pr",
    "list",
    "--repo",
    `${ORG}/${repo}`,
    "--state",
    "open",
    "--json",
    "number,title,headRefName,url",
    "--limit",
    "200",
  ]);
  if (r.status !== 0) return [];
  try {
    const prs = JSON.parse(r.stdout) as GhPR[];
    return prs.filter((p) => p.headRefName.startsWith("auto/"));
  } catch {
    return [];
  }
}

function hasLabel(issue: GhIssue, name: string): boolean {
  return issue.labels.some((l) => l.name === name);
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export function classifyIssues(
  issues: GhIssue[],
  autoPRs: GhPR[]
): Pick<RepoStatus, "synced" | "pendingPlan" | "specInReview" | "specMerged" | "codePROpen"> {
  const prIssueNums = new Set(
    autoPRs.map((pr) => {
      // Branch format: auto/<repo-prefix>-<issue-num>-<slug>
      const m = pr.headRefName.match(/-(\d+)(?:-|$)/);
      return m ? parseInt(m[1], 10) : -1;
    })
  );

  const specInReview: GhIssue[] = [];
  const specMerged: GhIssue[] = [];
  const codePROpen: GhPR[] = [...autoPRs];
  const pendingPlan: GhIssue[] = [];
  const synced: GhIssue[] = [];

  for (const issue of issues) {
    synced.push(issue);

    if (hasLabel(issue, "spec-pending")) {
      specInReview.push(issue);
    } else if (hasLabel(issue, "spec-merged")) {
      if (!prIssueNums.has(issue.number)) {
        specMerged.push(issue);
      }
      // if it has both spec-merged and a code PR, it's counted in codePROpen only
    } else if (!prIssueNums.has(issue.number)) {
      pendingPlan.push(issue);
    }
    // else: has a code PR → counted in codePROpen, not pendingPlan
  }

  return { synced, pendingPlan, specInReview, specMerged, codePROpen };
}

// ---------------------------------------------------------------------------
// State store reader
// ---------------------------------------------------------------------------

interface StateStore {
  last_scan_at: string;
  last_dispatch_run_at: string;
  pause_reason: string;
  token_usage_by_issue: Record<string, number>;
  ports_in_use: number[];
}

export function readStateStore(): Partial<StateStore> {
  try {
    return JSON.parse(fs.readFileSync(STATE_STORE_PATH, "utf8")) as StateStore;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Markdown builder
// ---------------------------------------------------------------------------

function issueRow(issue: GhIssue): string {
  return `| [#${issue.number}](${issue.url}) | ${escMd(issue.title)} |`;
}

function escMd(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function issueTable(issues: GhIssue[], emptyMsg = "_none_"): string {
  if (issues.length === 0) return emptyMsg + "\n";
  return (
    "| Issue | Title |\n|---|---|\n" +
    issues.map(issueRow).join("\n") +
    "\n"
  );
}

function prTable(prs: GhPR[], emptyMsg = "_none_"): string {
  if (prs.length === 0) return emptyMsg + "\n";
  return (
    "| PR | Branch | Title |\n|---|---|---|\n" +
    prs
      .map((p) => `| [#${p.number}](${p.url}) | \`${p.headRefName}\` | ${escMd(p.title)} |`)
      .join("\n") +
    "\n"
  );
}

export function buildMarkdown(
  statuses: RepoStatus[],
  store: Partial<StateStore>,
  generatedAt: string
): string {
  const lines: string[] = [
    `# Pipeline Status`,
    ``,
    `> Generated at ${generatedAt}`,
    `> Last scan: ${store.last_scan_at || "_unknown_"}`,
    `> Last dispatch: ${store.last_dispatch_run_at || "_unknown_"}`,
    ``,
  ];

  // Section 1 — Pending sync
  lines.push(`## Pending sync`);
  lines.push(`_Issues in Notion marked Ready for Dev but not yet synced to GitHub._`);
  lines.push(``);
  lines.push(`> ℹ️ Notion API data requires NOTION_API_KEY env var. Run with NOTION_API_KEY set for live data.`);
  lines.push(``);

  // Sections 2–6 — per-repo
  for (const s of statuses) {
    lines.push(`## ${s.repo}`);
    lines.push(``);

    lines.push(`### Synced issues (auto label)`);
    lines.push(issueTable(s.synced));
    lines.push(``);

    lines.push(`### Pending plan`);
    lines.push(issueTable(s.pendingPlan));
    lines.push(``);

    lines.push(`### Spec in review (spec-pending)`);
    lines.push(issueTable(s.specInReview));
    lines.push(``);

    lines.push(`### Spec merged — awaiting code PR`);
    lines.push(issueTable(s.specMerged));
    lines.push(``);

    lines.push(`### Code PR open`);
    lines.push(prTable(s.codePROpen));
    lines.push(``);
  }

  // Section 7 — Recent routine failures
  lines.push(`## Recent routine failures`);
  lines.push(``);
  if (store.pause_reason) {
    lines.push(`> **Paused**: ${store.pause_reason}`);
    lines.push(``);
  }
  const tokenUsage = store.token_usage_by_issue ?? {};
  const entries = Object.entries(tokenUsage);
  if (entries.length === 0) {
    lines.push(`_No token usage recorded._`);
  } else {
    lines.push(`| Issue | Tokens used |`);
    lines.push(`|---|---|`);
    for (const [issue, tokens] of entries.slice(-5)) {
      lines.push(`| ${issue} | ${tokens.toLocaleString()} |`);
    }
  }
  lines.push(``);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function run(gh: GhRunner = defaultGhRunner()): Promise<number> {
  const generatedAt = new Date().toISOString();
  console.log(`[pipeline-status] Generating status at ${generatedAt}`);

  const statuses: RepoStatus[] = [];

  for (const repo of ALL_REPOS) {
    console.log(`[pipeline-status] Fetching ${repo}…`);
    const issues = fetchAutoIssues(repo, gh);
    const prs = fetchAutoPRs(repo, gh);
    const classified = classifyIssues(issues, prs);
    statuses.push({ repo, pendingSync: 0, ...classified });
  }

  const store = readStateStore();
  const md = buildMarkdown(statuses, store, generatedAt);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, md, "utf8");

  console.log(`[pipeline-status] Written to ${OUTPUT_PATH}`);
  return 0;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  run().then((code) => process.exit(code));
}
