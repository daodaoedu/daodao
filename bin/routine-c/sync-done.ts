#!/usr/bin/env node
/**
 * Routine C: PR state → Notion Status sync
 *
 * Usage:
 *   pnpm tsx bin/routine-c/sync-done.ts [--dry-run] [--hours <n>]
 *
 * Env:
 *   NOTION_API_KEY  — Notion integration token
 *   NOTION_DB_ID    — Notion database ID
 *   GITHUB_TOKEN    — consumed by gh CLI
 *
 * Flow (runs hourly):
 *   1. Open auto PRs  → Notion Status = "In Review" + write GitHub PR URL
 *   2. Merged auto PRs (last N hours) → Notion Status = "Done" + write GitHub PR URL
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { createNotionClient, updatePageProperty } from "../notion-sync/notion-client.js";

const DRY_RUN = process.argv.includes("--dry-run");
const HOURS_IDX = process.argv.indexOf("--hours");
const LOOKBACK_HOURS = HOURS_IDX !== -1 ? parseInt(process.argv[HOURS_IDX + 1] ?? "48", 10) : 48;

const NOTION_API_KEY = process.env["NOTION_API_KEY"] ?? "";
const NOTION_DB_ID = process.env["NOTION_DB_ID"] ?? "3549cc8126978036803af61048468bde";

const SUB_REPOS = [
  "daodao-server",
  "daodao-f2e",
  "daodao-ai-backend",
  "daodao-admin-ui",
  "daodao-mcp",
  "daodao-worker",
  "daodao-storage",
  "daodao-infra",
];

const PAGE_ID_RE = /Notion page ID: `([0-9a-f-]{36})`/i;

function log(msg: string): void {
  process.stdout.write(`[routine-c] ${msg}\n`);
}

function warn(msg: string): void {
  process.stderr.write(`[routine-c] WARN: ${msg}\n`);
}

interface PR {
  repo: string;
  prNumber: number;
  title: string;
  url: string;
}

function getOpenAutoPRs(repo: string): PR[] {
  try {
    const output = execSync(
      `gh pr list --repo daodaoedu/${repo} --state open --label auto \
        --json number,title,url`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const prs = JSON.parse(output.trim()) as Array<{ number: number; title: string; url: string }>;
    return prs.map((pr) => ({ repo, prNumber: pr.number, title: pr.title, url: pr.url }));
  } catch {
    return [];
  }
}

function getMergedAutoPRs(repo: string, sinceIso: string): PR[] {
  try {
    const output = execSync(
      `gh pr list --repo daodaoedu/${repo} --state merged --label auto \
        --json number,title,mergedAt,url \
        --jq '[.[] | select(.mergedAt >= "${sinceIso}")]'`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const prs = JSON.parse(output.trim()) as Array<{ number: number; title: string; mergedAt: string; url: string }>;
    return prs.map((pr) => ({ repo, prNumber: pr.number, title: pr.title, url: pr.url }));
  } catch {
    return [];
  }
}

function getLinkedIssueNumbers(repo: string, prNumber: number): number[] {
  try {
    const output = execSync(
      `gh pr view ${prNumber} --repo daodaoedu/${repo} \
        --json closingIssuesReferences \
        --jq '[.closingIssuesReferences[].number]'`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return JSON.parse(output.trim()) as number[];
  } catch {
    return [];
  }
}

function getIssueBody(repo: string, issueNumber: number): string {
  try {
    return execSync(
      `gh issue view ${issueNumber} --repo daodaoedu/${repo} --json body --jq '.body'`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
  } catch {
    return "";
  }
}

function extractNotionPageId(issueBody: string): string | null {
  const match = PAGE_ID_RE.exec(issueBody);
  return match?.[1] ?? null;
}

async function syncPRs(
  client: ReturnType<typeof createNotionClient>,
  prs: PR[],
  status: "In Review" | "Done"
): Promise<number> {
  let updated = 0;

  for (const pr of prs) {
    const issueNums = getLinkedIssueNumbers(pr.repo, pr.prNumber);
    if (issueNums.length === 0) {
      log(`  PR #${pr.prNumber} has no linked issues — skipping`);
      continue;
    }

    for (const issueNum of issueNums) {
      const body = getIssueBody(pr.repo, issueNum);
      const pageId = extractNotionPageId(body);
      if (!pageId) {
        log(`  issue #${issueNum} has no Notion page ID in body — skipping`);
        continue;
      }

      const context = `${pr.repo}#${issueNum} via PR #${pr.prNumber}`;
      if (DRY_RUN) {
        log(`[dry-run] would set Status=${status} + GitHub PR=${pr.url} on ${pageId} (${context})`);
        updated++;
        continue;
      }

      try {
        await updatePageProperty(client, pageId, {
          Status: { status: { name: status } },
          "GitHub PR": { url: pr.url },
        });
        log(`✅ Status=${status} + GitHub PR written (${context})`);
        updated++;
      } catch (err) {
        warn(`failed to update Notion page ${pageId}: ${err}`);
      }
    }
  }

  return updated;
}

async function main(): Promise<void> {
  if (DRY_RUN) log("dry-run mode enabled");

  if (existsSync(join(process.cwd(), ".automation-paused"))) {
    log("⏸️ .automation-paused present — exiting");
    process.exit(0);
  }

  if (!NOTION_API_KEY) {
    warn("NOTION_API_KEY not set — exiting");
    process.exit(0);
  }

  const client = createNotionClient(NOTION_API_KEY);
  const sinceDate = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000);
  const sinceIso = sinceDate.toISOString();

  let totalUpdated = 0;

  // Phase 1: open PRs → In Review
  log("── Phase 1: open auto PRs → In Review ──");
  for (const repo of SUB_REPOS) {
    const openPRs = getOpenAutoPRs(repo);
    if (openPRs.length === 0) continue;
    log(`${repo}: ${openPRs.length} open PR(s)`);
    totalUpdated += await syncPRs(client, openPRs, "In Review");
  }

  // Phase 2: merged PRs → Done
  log(`── Phase 2: merged auto PRs (last ${LOOKBACK_HOURS}h) → Done ──`);
  for (const repo of SUB_REPOS) {
    const mergedPRs = getMergedAutoPRs(repo, sinceIso);
    if (mergedPRs.length === 0) continue;
    log(`${repo}: ${mergedPRs.length} merged PR(s)`);
    totalUpdated += await syncPRs(client, mergedPRs, "Done");
  }

  log(`done — updated ${totalUpdated} Notion page(s)`);
}

main().catch((err) => {
  process.stderr.write(`[routine-c] unexpected error: ${err}\n`);
  process.exit(1);
});
