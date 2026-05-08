#!/usr/bin/env tsx
/**
 * spec-merged-scan.ts
 *
 * Pull-based scanner: finds merged monorepo spec PRs and writes
 * `spec-merged` label to corresponding sub-repo issues.
 *
 * Exit codes:
 *   0 — success (or nothing to do)
 *   1 — partial or full failure; last_scan_at NOT updated
 */

import { execSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const MONOREPO = "daodaoedu/daodao";
const STATE_STORE_PATH = path.resolve(
  import.meta.dirname,
  "state-store.json"
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StateStore {
  last_scan_at: string;
  last_dispatch_run_at: string;
  pause_reason: string;
  token_usage_by_issue: Record<string, number>;
  ports_in_use: number[];
}

interface MergedPR {
  number: number;
  title: string;
  body: string;
  mergedAt: string;
  headRefName: string;
}

interface IssueRef {
  repo: string;
  issueNum: number;
}

// ---------------------------------------------------------------------------
// State store helpers
// ---------------------------------------------------------------------------

export function readStateStore(): StateStore {
  try {
    const raw = fs.readFileSync(STATE_STORE_PATH, "utf8");
    return JSON.parse(raw) as StateStore;
  } catch {
    return {
      last_scan_at: "",
      last_dispatch_run_at: "",
      pause_reason: "",
      token_usage_by_issue: {},
      ports_in_use: [],
    };
  }
}

export function writeStateStore(store: StateStore): void {
  const tmp = STATE_STORE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2) + "\n", "utf8");
  // fsync via fs.fdatasyncSync requires a fd — open, sync, close
  const fd = fs.openSync(tmp, "r+");
  try {
    fs.fdatasyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, STATE_STORE_PATH);
}

// ---------------------------------------------------------------------------
// gh CLI helpers (injectable for testing)
// ---------------------------------------------------------------------------

export type GhRunner = (args: string[]) => { stdout: string; status: number };

export function defaultGhRunner(): GhRunner {
  return (args: string[]) => {
    const result = spawnSync("gh", args, { encoding: "utf8" });
    return {
      stdout: result.stdout ?? "",
      status: result.status ?? 1,
    };
  };
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

export function sinceTimestamp(lastScanAt: string): string {
  if (lastScanAt) return lastScanAt;
  const d = new Date();
  d.setUTCHours(d.getUTCHours() - 24);
  return d.toISOString();
}

export function parseIssueRefs(prBody: string): IssueRef[] {
  const refs: IssueRef[] = [];
  // Matches: Closes daodaoedu/<repo>#<num>  (case-insensitive, various forms)
  const pattern =
    /(?:closes|fixes|resolves)\s+daodaoedu\/([a-zA-Z0-9_-]+)#(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(prBody)) !== null) {
    refs.push({ repo: match[1], issueNum: parseInt(match[2], 10) });
  }
  return refs;
}

export function fetchMergedSpecPRs(
  since: string,
  gh: GhRunner
): MergedPR[] | null {
  const result = gh([
    "pr",
    "list",
    "--repo",
    MONOREPO,
    "--state",
    "merged",
    "--search",
    `openspec/changes/ merged:>${since}`,
    "--json",
    "number,body,mergedAt,headRefName,title",
    "--limit",
    "100",
  ]);

  if (result.status !== 0) {
    console.error(`[spec-merged-scan] gh pr list failed (exit ${result.status})`);
    return null;
  }

  try {
    return JSON.parse(result.stdout) as MergedPR[];
  } catch (e) {
    console.error("[spec-merged-scan] Failed to parse gh pr list output:", e);
    return null;
  }
}

export function addSpecMergedLabel(
  repo: string,
  issueNum: number,
  gh: GhRunner
): boolean {
  const result = gh([
    "issue",
    "edit",
    String(issueNum),
    "--repo",
    `daodaoedu/${repo}`,
    "--add-label",
    "spec-merged",
  ]);

  if (result.status !== 0) {
    console.error(
      `[spec-merged-scan] Failed to add spec-merged label to ${repo}#${issueNum} (exit ${result.status})`
    );
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function run(gh: GhRunner = defaultGhRunner()): Promise<number> {
  const store = readStateStore();
  const since = sinceTimestamp(store.last_scan_at);

  console.log(`[spec-merged-scan] Scanning merged spec PRs since ${since}`);

  const prs = fetchMergedSpecPRs(since, gh);
  if (prs === null) {
    return 1;
  }

  if (prs.length === 0) {
    console.log("[spec-merged-scan] No merged spec PRs found. Nothing to do.");
    store.last_scan_at = new Date().toISOString();
    writeStateStore(store);
    return 0;
  }

  console.log(`[spec-merged-scan] Found ${prs.length} merged spec PR(s).`);

  let allSuccess = true;

  for (const pr of prs) {
    const refs = parseIssueRefs(pr.body ?? "");
    if (refs.length === 0) {
      console.log(
        `[spec-merged-scan] PR #${pr.number} "${pr.title}": no issue refs found, skipping.`
      );
      continue;
    }

    for (const ref of refs) {
      console.log(
        `[spec-merged-scan] Adding spec-merged to ${ref.repo}#${ref.issueNum} (from PR #${pr.number})`
      );
      const ok = addSpecMergedLabel(ref.repo, ref.issueNum, gh);
      if (!ok) {
        allSuccess = false;
      }
    }
  }

  if (!allSuccess) {
    console.error(
      "[spec-merged-scan] One or more label writes failed. last_scan_at NOT updated."
    );
    return 1;
  }

  store.last_scan_at = new Date().toISOString();
  writeStateStore(store);
  console.log(
    `[spec-merged-scan] Done. last_scan_at updated to ${store.last_scan_at}`
  );
  return 0;
}

// Entry point when run directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  run().then((code) => process.exit(code));
}
