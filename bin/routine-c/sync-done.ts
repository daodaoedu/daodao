#!/usr/bin/env node
/**
 * Routine C: PR merge → Notion Status = Done
 *
 * Usage:
 *   pnpm tsx bin/routine-c/sync-done.ts [--dry-run] [--hours <n>]
 *
 * Env:
 *   NOTION_API_KEY  — Notion integration token
 *   NOTION_DB_ID    — Notion database ID
 *   GITHUB_TOKEN    — consumed by gh CLI
 *
 * Flow:
 *   1. For each sub-repo, list PRs merged in the last N hours with `auto` label
 *   2. Find the linked issue (via PR body "Closes #<num>" or PR --json closingIssuesReferences)
 *   3. Extract Notion page ID from issue body (pattern: Notion page ID: `<id>`)
 *   4. Update Notion page Status → "Done"
 */

import { execSync } from "child_process";
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

interface MergedPR {
  repo: string;
  prNumber: number;
  title: string;
  mergedAt: string;
}

function getMergedPRs(repo: string, sinceIso: string): MergedPR[] {
  try {
    const output = execSync(
      `gh pr list --repo daodaoedu/${repo} --state merged --label auto \
        --json number,title,mergedAt \
        --jq '[.[] | select(.mergedAt >= "${sinceIso}")]'`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const prs = JSON.parse(output.trim()) as Array<{ number: number; title: string; mergedAt: string }>;
    return prs.map((pr) => ({ repo, prNumber: pr.number, title: pr.title, mergedAt: pr.mergedAt }));
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

async function markNotion(
  client: ReturnType<typeof createNotionClient>,
  pageId: string,
  context: string
): Promise<void> {
  if (DRY_RUN) {
    log(`[dry-run] would set Status=Done on Notion page ${pageId} (${context})`);
    return;
  }
  await updatePageProperty(client, pageId, {
    Status: { select: { name: "Done" } },
  });
  log(`✅ Status=Done on ${pageId} (${context})`);
}

async function main(): Promise<void> {
  if (DRY_RUN) log("dry-run mode enabled");

  try {
    execSync("test -f /Users/xiaoxu/Projects/daodao/.automation-paused", { stdio: "ignore" });
    log("⏸️ .automation-paused present — exiting");
    process.exit(0);
  } catch { /* not paused */ }

  if (!NOTION_API_KEY) {
    warn("NOTION_API_KEY not set — exiting");
    process.exit(0);
  }

  const client = createNotionClient(NOTION_API_KEY);

  const sinceDate = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000);
  const sinceIso = sinceDate.toISOString();
  log(`scanning PRs merged since ${sinceIso} (last ${LOOKBACK_HOURS}h)`);

  let totalUpdated = 0;

  for (const repo of SUB_REPOS) {
    const mergedPRs = getMergedPRs(repo, sinceIso);
    if (mergedPRs.length === 0) continue;
    log(`${repo}: ${mergedPRs.length} merged PR(s) found`);

    for (const pr of mergedPRs) {
      const issueNums = getLinkedIssueNumbers(repo, pr.prNumber);
      if (issueNums.length === 0) {
        log(`  PR #${pr.prNumber} has no linked issues — skipping`);
        continue;
      }

      for (const issueNum of issueNums) {
        const body = getIssueBody(repo, issueNum);
        const pageId = extractNotionPageId(body);
        if (!pageId) {
          log(`  issue #${issueNum} has no Notion page ID in body — skipping`);
          continue;
        }

        try {
          await markNotion(client, pageId, `${repo}#${issueNum} via PR #${pr.prNumber}`);
          totalUpdated++;
        } catch (err) {
          warn(`failed to update Notion page ${pageId}: ${err}`);
        }
      }
    }
  }

  log(`done — updated ${totalUpdated} Notion page(s) to Done`);
}

main().catch((err) => {
  process.stderr.write(`[routine-c] unexpected error: ${err}\n`);
  process.exit(1);
});
