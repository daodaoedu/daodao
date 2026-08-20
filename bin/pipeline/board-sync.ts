#!/usr/bin/env node
/**
 * Routine C: merged auto PRs → central card progress → board Done
 *
 * Usage:
 *   pnpm tsx bin/pipeline/board-sync.ts [--dry-run] [--hours <n>]
 *
 * Env:
 *   GH_TOKEN / GITHUB_TOKEN — consumed by gh CLI; needs repo + project scope
 *
 * Flow (hourly via .github/workflows/pipeline-board-sync.yml):
 *   1. Scan merged `auto` PRs in the 8 sub-repos (lookback window, default 48h)
 *   2. Ensure their closing mirror issues are closed
 *   3. Resolve central cards via "Parent: daodaoedu/daodao#N" in mirror bodies
 *   4. All mirrors closed → ✅ comment + board Status → Done (issue stays open for驗收)
 *      Some still open  → ⏳ progress comment (deduped per day)
 */
import { existsSync } from "fs";
import { join } from "path";
import {
  buildAllDoneComment,
  buildProgressComment,
  parseClosingIssues,
  parseParentIssue,
} from "./lib.js";
import {
  closeIssue,
  commentIssue,
  getIssue,
  getIssueComments,
  listBoardItems,
  listMergedAutoPRs,
  searchIssuesByParent,
  setBoardStatus,
  warn,
} from "./gh.js";
import { CENTRAL_REPO, SUB_REPOS } from "./types.js";

const DRY_RUN = process.argv.includes("--dry-run");
const HOURS_IDX = process.argv.indexOf("--hours");
const LOOKBACK_HOURS = HOURS_IDX !== -1 ? parseInt(process.argv[HOURS_IDX + 1] ?? "48", 10) : 48;

function log(msg: string): void {
  process.stdout.write(`[board-sync] ${msg}\n`);
}

function hasTodayComment(centralIssueNumber: number, text: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return getIssueComments(CENTRAL_REPO, centralIssueNumber).some(
    (c) => c.createdAt.slice(0, 10) === today && c.body.startsWith(text)
  );
}

function main(): void {
  if (DRY_RUN) log("dry-run mode enabled");

  if (existsSync(join(process.cwd(), ".automation-paused"))) {
    log("⏸️ .automation-paused present — exiting");
    process.exit(0);
  }

  const sinceIso = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString();
  const parents = new Set<number>();

  // Phase 1: merged auto PRs → close mirror issues, collect central cards
  log(`── Phase 1: merged auto PRs (last ${LOOKBACK_HOURS}h) ──`);
  for (const repo of SUB_REPOS) {
    const prs = listMergedAutoPRs(repo, sinceIso);
    if (prs.length === 0) continue;
    log(`${repo}: ${prs.length} merged PR(s)`);
    for (const pr of prs) {
      for (const num of parseClosingIssues(pr.body)) {
        const issue = getIssue(repo, num);
        if (!issue) continue;
        if (issue.state === "OPEN") {
          if (DRY_RUN) {
            log(`[dry-run] would close ${repo}#${num} (merged by PR #${pr.number})`);
          } else {
            closeIssue(repo, num, `✅ PR #${pr.number} merged — closed by pipeline-board-sync`);
            log(`closed ${repo}#${num} (PR #${pr.number})`);
          }
        }
        const parent = parseParentIssue(issue.body);
        if (parent) parents.add(parent);
      }
    }
  }

  if (parents.size === 0) {
    log("done — no central cards to update");
    return;
  }

  // Board item map: central issue number → {itemId, status}
  const boardMap = new Map<number, { itemId: string; status: string | null }>();
  for (const it of listBoardItems()) {
    if (it.issueNumber !== null && it.repository === `daodaoedu/${CENTRAL_REPO}`) {
      boardMap.set(it.issueNumber, { itemId: it.itemId, status: it.status });
    }
  }

  // Phase 2: per central card, check all mirrors
  log(`── Phase 2: ${parents.size} central card(s) ──`);
  for (const parent of parents) {
    const mirrors: Array<{ url: string; state: string }> = [];
    for (const repo of SUB_REPOS) {
      for (const m of searchIssuesByParent(repo, parent)) {
        if (parseParentIssue(m.body) === parent) mirrors.push({ url: m.url, state: m.state });
      }
    }
    if (mirrors.length === 0) {
      warn("board-sync", `#${parent}: no mirror issues found — skip`);
      continue;
    }

    const done = mirrors.filter((m) => m.state === "CLOSED").length;
    const boardEntry = boardMap.get(parent);

    if (done === mirrors.length) {
      if (boardEntry?.status === "Done") {
        log(`#${parent}: already Done — skip`);
        continue;
      }
      if (DRY_RUN) {
        log(`[dry-run] would mark #${parent} all-done (${done}/${mirrors.length}) + board → Done`);
        continue;
      }
      commentIssue(CENTRAL_REPO, parent, buildAllDoneComment(mirrors.map((m) => m.url)));
      if (boardEntry) {
        setBoardStatus(boardEntry.itemId, "Done");
        log(`✅ #${parent}: all mirrors closed — board → Done`);
      } else {
        warn("board-sync", `#${parent}: not on board — commented only`);
      }
    } else {
      const text = buildProgressComment(done, mirrors.length);
      if (hasTodayComment(parent, text)) {
        log(`#${parent}: same progress already commented today — skip`);
        continue;
      }
      if (DRY_RUN) {
        log(`[dry-run] would comment on #${parent}: ${text}`);
        continue;
      }
      commentIssue(CENTRAL_REPO, parent, text);
      log(`⏳ #${parent}: ${done}/${mirrors.length}`);
    }
  }

  log("done");
}

main();
