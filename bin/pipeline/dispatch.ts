#!/usr/bin/env node
/**
 * Routine A: Planning board → sub-repo mirror issues
 *
 * Usage:
 *   pnpm tsx bin/pipeline/dispatch.ts [--dry-run]
 *
 * Env:
 *   GH_TOKEN / GITHUB_TOKEN — consumed by gh CLI; needs repo + project scope
 *
 * Flow (hourly via .github/workflows/pipeline-dispatch.yml):
 *   1. List board items with Status="Ready for Dev" on the central repo
 *   2. Gate: issue open, has `auto` label, no dispatched/needs-spec/human-driving
 *   3. Spec gate: body has "OpenSpec: <slug>" and openspec/changes/<slug>/tasks.md exists
 *   4. Rule-based split: each tasks.md "## section" → one mirror issue in its sub-repo
 *   5. Mirror issues become native sub-issues; central card gets `dispatched` + comment;
 *      board Status → In Progress
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  assignSectionsToRepos,
  autoModeFor,
  buildDispatchedComment,
  buildMirrorIssueBody,
  buildMirrorLabels,
  buildMirrorTitle,
  NEEDS_SPEC_COMMENT,
  parseOpenSpecSlug,
  parseParentIssue,
  parseTasksMd,
  scopeFromLabels,
} from "./lib.js";
import {
  addLabels,
  addSubIssue,
  commentIssue,
  createIssue,
  getIssue,
  listBoardItems,
  searchIssuesByParent,
  setBoardStatus,
  warn,
} from "./gh.js";
import { CENTRAL_REPO, SUB_REPOS, type SubRepo } from "./types.js";

const DRY_RUN = process.argv.includes("--dry-run");
const MAX_CARDS_PER_RUN = 3;

function log(msg: string): void {
  process.stdout.write(`[pipeline-dispatch] ${msg}\n`);
}

function markNeedsSpec(issueNumber: number, reason: string): void {
  if (DRY_RUN) {
    log(`[dry-run] would mark #${issueNumber} needs-spec: ${reason}`);
    return;
  }
  addLabels(CENTRAL_REPO, issueNumber, ["needs-spec"]);
  commentIssue(CENTRAL_REPO, issueNumber, NEEDS_SPEC_COMMENT(reason));
}

function main(): void {
  if (DRY_RUN) log("dry-run mode enabled");

  if (existsSync(join(process.cwd(), ".automation-paused"))) {
    log("⏸️ .automation-paused present — exiting");
    process.exit(0);
  }

  const items = listBoardItems();
  const ready = items.filter(
    (it) =>
      it.status === "Ready for Dev" &&
      it.issueNumber !== null &&
      it.repository === `daodaoedu/${CENTRAL_REPO}`
  );
  log(`board: ${ready.length} card(s) in Ready for Dev`);

  let dispatched = 0;

  for (const item of ready) {
    if (dispatched >= MAX_CARDS_PER_RUN) {
      log(`reached per-run limit (${MAX_CARDS_PER_RUN}) — remaining cards next run`);
      break;
    }

    const issue = getIssue(CENTRAL_REPO, item.issueNumber!);
    if (!issue || issue.state !== "OPEN") continue;
    if (!issue.labels.includes("auto")) {
      log(`#${issue.number} has no auto label — skip`);
      continue;
    }
    if (issue.labels.some((l) => ["dispatched", "needs-spec", "human-driving"].includes(l))) {
      log(`#${issue.number} labeled ${issue.labels.join(",")} — skip`);
      continue;
    }

    // Spec gate
    const slug = parseOpenSpecSlug(issue.body);
    if (!slug) {
      markNeedsSpec(issue.number, "- Issue body 缺 `OpenSpec: <slug>` 註記");
      continue;
    }
    const tasksPath = join(process.cwd(), "openspec", "changes", slug, "tasks.md");
    if (!existsSync(tasksPath)) {
      markNeedsSpec(issue.number, `- \`openspec/changes/${slug}/tasks.md\` 不存在`);
      continue;
    }

    const sections = parseTasksMd(readFileSync(tasksPath, "utf-8"));
    if (sections.length === 0) {
      markNeedsSpec(issue.number, `- \`openspec/changes/${slug}/tasks.md\` 沒有未完成的 task`);
      continue;
    }

    const repoLabels = issue.labels
      .filter((l) => l.startsWith("repo:"))
      .map((l) => l.slice("repo:".length))
      .filter((r): r is SubRepo => (SUB_REPOS as readonly string[]).includes(r));

    const { assigned, unassigned } = assignSectionsToRepos(sections, repoLabels);
    if (unassigned.length > 0) {
      markNeedsSpec(
        issue.number,
        `- 以下 section 無法判定 target repo（請在 section 標題註記 sub-repo 名稱，或給卡片唯一的 \`repo:*\` label）：\n` +
          unassigned.map((s) => `  - ${s.title}`).join("\n")
      );
      continue;
    }

    const scope = scopeFromLabels(issue.labels);

    // Existing mirrors (idempotency: partial failure in a previous run must not duplicate)
    const existing = new Map<string, string>(); // title → url
    for (const repo of assigned.keys()) {
      for (const m of searchIssuesByParent(repo, issue.number)) {
        if (parseParentIssue(m.body) === issue.number) existing.set(m.title, m.url);
      }
    }

    const mirrors: Array<{ repo: string; url: string; title: string; scope: typeof scope; autoMode: ReturnType<typeof autoModeFor> }> = [];
    let failed = false;

    for (const [repo, secs] of assigned) {
      const autoMode = autoModeFor(issue.labels, repo);
      for (const sec of secs) {
        const title = buildMirrorTitle(issue.title, sec.title);
        const existingUrl = existing.get(title);
        if (existingUrl) {
          log(`⏭️ mirror already exists: ${existingUrl}`);
          mirrors.push({ repo, url: existingUrl, title, scope, autoMode });
          continue;
        }
        if (DRY_RUN) {
          log(`[dry-run] would create in ${repo}: "${title}" (scope:${scope}, ${autoMode})`);
          continue;
        }
        const body = buildMirrorIssueBody({
          centralIssueNumber: issue.number,
          sectionTitle: sec.title,
          tasks: sec.tasks,
          scope,
          autoMode,
          specSlug: slug,
          repo,
        });
        const url = createIssue(repo, title, body, buildMirrorLabels(scope, autoMode));
        if (!url) {
          failed = true;
          continue;
        }
        log(`✅ ${repo} → ${url}`);
        mirrors.push({ repo, url, title, scope, autoMode });

        const mirrorNum = parseInt(url.split("/").pop() ?? "", 10);
        const mirror = Number.isFinite(mirrorNum) ? getIssue(repo, mirrorNum) : null;
        if (mirror && !addSubIssue(issue.nodeId, mirror.nodeId)) {
          warn("pipeline-dispatch", `sub-issue link failed for ${url} (comment list still records it)`);
        }
      }
    }

    if (DRY_RUN) {
      dispatched++;
      continue;
    }
    if (mirrors.length === 0) {
      warn("pipeline-dispatch", `#${issue.number}: no mirror issue created — leaving card untouched`);
      continue;
    }
    if (failed) {
      warn(
        "pipeline-dispatch",
        `#${issue.number}: some mirrors failed — NOT marking dispatched (next run resumes via idempotency)`
      );
      continue;
    }

    commentIssue(CENTRAL_REPO, issue.number, buildDispatchedComment(mirrors));
    addLabels(CENTRAL_REPO, issue.number, ["dispatched"]);
    setBoardStatus(item.itemId, "In Progress");
    log(`🚀 #${issue.number} dispatched (${mirrors.length} mirror issue(s)) — board → In Progress`);
    dispatched++;
  }

  log(`done — dispatched ${dispatched} card(s)`);
}

main();
