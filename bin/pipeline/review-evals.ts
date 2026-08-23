#!/usr/bin/env node
/**
 * review-evals: AI code review 接受率週報
 *
 * Usage:
 *   pnpm tsx bin/pipeline/review-evals.ts [--days 7] [--dry-run]
 *
 * Env:
 *   GH_TOKEN / GITHUB_TOKEN — 需可讀所有 sub-repo（cross-repo 用 PAT）
 *
 * 對每個 repo 掃近 N 天有「## Code Review」comment 的 PR，把每條發現分類：
 *   fixed   — review 之後的 commit 動過被點名的檔案（視為被接受）
 *   replied — 沒改檔案，但作者在 review 之後有留言（視為被討論/反駁）
 *   silent  — 兩者皆無（被忽略）
 * 誤報率比攔截率重要：silent+replied 偏高就該回頭修 prompt 或濾噪。
 * 結果 append 到 docs/automation/evals.md 的 review-evals 區塊。
 */
import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { CENTRAL_REPO, OWNER, SUB_REPOS } from "./types.js";

const DRY_RUN = process.argv.includes("--dry-run");
const DAYS = parseDays(process.argv);

const REPOS = [CENTRAL_REPO, ...SUB_REPOS];
const BOT_LOGINS = new Set(["github-actions", "github-actions[bot]"]);
const REVIEW_MARKER = "<!-- daodao-ai-code-review -->";
const REVIEW_HEAD_RE = /<!-- daodao-ai-code-review-head:([0-9a-f]{40}) -->/;
const EVALS_PATH = join(process.cwd(), "docs", "automation", "evals.md");
const MARKER = "<!-- review-evals -->";

function log(msg: string): void {
  process.stdout.write(`[review-evals] ${msg}\n`);
}

function gh(args: string[]): string {
  return execFileSync("gh", args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function parseDays(args: string[]): number {
  const index = args.indexOf("--days");
  const raw = index === -1 ? "7" : args[index + 1];
  if (!raw || !/^\d+$/.test(raw)) {
    throw new Error("--days must be an integer between 1 and 90");
  }
  const days = Number(raw);
  if (days < 1 || days > 90) {
    throw new Error("--days must be an integer between 1 and 90");
  }
  return days;
}

export interface Finding {
  severity: "High" | "Medium" | "Low";
  file: string;
  incompleteScope: boolean;
}

/** 從「## Code Review」comment 的問題表格解析發現清單。 */
export function parseReviewFindings(body: string): Finding[] {
  const findings: Finding[] = [];
  for (const line of body.split("\n")) {
    const m = /^\|\s*(?:🔴|🟡|🟢)?\s*(High|Medium|Low)\s*\|(.+)$/.exec(line.trim());
    if (!m) continue;
    const rest = m[2]!;
    const fileCell = rest.split("|", 1)[0]!.trim();
    const quotedFile = /^`([^`]+)`$/.exec(fileCell);
    findings.push({
      severity: m[1] as Finding["severity"],
      file: quotedFile?.[1] ?? fileCell,
      incompleteScope: /incomplete scope/i.test(rest),
    });
  }
  return findings;
}

/** 完整 path 只做 exact；只有模型只寫 basename 且唯一命中時才視為 touched。 */
export function fileWasTouched(flagged: string, touched: string[]): boolean {
  if (!flagged) return false;
  const clean = flagged.replace(/^\.\//, "").split(":")[0]!; // 去掉可能的 :line
  if (clean.includes("/")) return touched.includes(clean);
  const base = clean.split("/").pop()!;
  const matches = new Set(touched.filter((t) => t === base || t.endsWith(`/${base}`)));
  return matches.size === 1;
}

interface Outcome {
  fixed: number;
  replied: number;
  silent: number;
}

export function classifyFindings(
  findings: Finding[],
  touchedAfterReview: string[],
  authorRepliedAfterReview: boolean
): Outcome {
  const out: Outcome = { fixed: 0, replied: 0, silent: 0 };
  for (const f of findings) {
    if (fileWasTouched(f.file, touchedAfterReview)) out.fixed++;
    else if (authorRepliedAfterReview) out.replied++;
    else out.silent++;
  }
  return out;
}

export function hasAuthorReply(
  comments: Array<{ createdAt: string; login: string }>,
  reviewCreatedAt: string,
  authorLogin: string
): boolean {
  return comments.some(
    (comment) =>
      comment.createdAt > reviewCreatedAt &&
      comment.login === authorLogin &&
      !BOT_LOGINS.has(comment.login)
  );
}

export interface ReviewComment {
  body: string;
  createdAt: string;
  updatedAt: string;
  login: string;
}

export interface ReviewSnapshot extends ReviewComment {
  headSha: string;
}

interface ApiIssueComment {
  body: string;
  created_at: string;
  updated_at: string;
  user: { login: string };
}

export function normalizeCommentPages(pages: ApiIssueComment[][]): ReviewComment[] {
  return pages.flat().map((comment) => ({
    body: comment.body,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    login: comment.user.login,
  }));
}

export function commitFilesFromPages(
  pages: Array<{ files?: Array<{ filename: string }> }>
): string[] {
  return pages.flatMap((page) => page.files ?? []).map((file) => file.filename);
}

/**
 * 只接受 lookback 內、本專案 bot 寫入的 per-head finding snapshot。
 * GitHub API 陣列順序不是 contract，所以明確依 updatedAt 取最新。
 */
export function selectLatestBotReview(
  comments: ReviewComment[],
  sinceIso: string
): ReviewSnapshot | undefined {
  return comments
    .flatMap((comment): ReviewSnapshot[] => {
      const headMatch = REVIEW_HEAD_RE.exec(comment.body);
      if (
        !BOT_LOGINS.has(comment.login) ||
        !comment.body.startsWith("## Code Review") ||
        !comment.body.includes(REVIEW_MARKER) ||
        !headMatch ||
        comment.updatedAt < sinceIso ||
        parseReviewFindings(comment.body).length === 0
      ) {
        return [];
      }
      return [{ ...comment, headSha: headMatch[1]! }];
    })
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .pop();
}

export function commitsAfterReviewedHead<T extends { oid: string }>(
  commits: T[],
  headSha: string
): T[] | undefined {
  const reviewedHeadIndex = commits.findIndex((commit) => commit.oid === headSha);
  if (reviewedHeadIndex === -1) return undefined;
  return commits.slice(reviewedHeadIndex + 1);
}

interface RepoStats {
  repo: string;
  prsWithReview: number;
  findings: number;
  high: number;
  incompleteScope: number;
  fixed: number;
  replied: number;
  silent: number;
}

function collectRepo(repo: string, sinceIso: string): RepoStats {
  const stats: RepoStats = {
    repo, prsWithReview: 0, findings: 0, high: 0, incompleteScope: 0,
    fixed: 0, replied: 0, silent: 0,
  };
  const prsJson = gh([
    "pr", "list",
    "--repo", `${OWNER}/${repo}`,
    "--state", "all",
    "--limit", "100",
    "--search", `updated:>=${sinceIso.slice(0, 10)}`,
    "--json", "number,author",
  ]);
  const prs = JSON.parse(prsJson) as Array<{ number: number; author: { login: string } }>;

  for (const pr of prs) {
    const commentsJson = gh([
      "api", "--paginate", "--slurp",
      `repos/${OWNER}/${repo}/issues/${pr.number}/comments`,
    ]);
    const comments = normalizeCommentPages(
      JSON.parse(commentsJson) as ApiIssueComment[][]
    );
    const review = selectLatestBotReview(comments, sinceIso);
    if (!review) continue;

    const findings = parseReviewFindings(review.body);

    // reviewed head 之後動過的檔案；不依賴 commit timestamp。
    const commitsJson = gh([
      "pr", "view", String(pr.number),
      "--repo", `${OWNER}/${repo}`,
      "--json", "commits",
      "--jq", "[.commits[] | {oid}]",
    ]);
    const commits = JSON.parse(commitsJson) as Array<{ oid: string }>;
    const commitsAfterReview = commitsAfterReviewedHead(commits, review.headSha);
    if (!commitsAfterReview) {
      log(`${repo}#${pr.number}: review head ${review.headSha} not found; skipping`);
      continue;
    }

    stats.prsWithReview++;
    stats.findings += findings.length;
    stats.high += findings.filter((f) => f.severity === "High").length;
    stats.incompleteScope += findings.filter((f) => f.incompleteScope).length;

    const touched: string[] = [];
    for (const c of commitsAfterReview) {
      const files = gh([
        "api", "--paginate", "--slurp",
        `repos/${OWNER}/${repo}/commits/${c.oid}`,
      ]);
      touched.push(...commitFilesFromPages(
        JSON.parse(files) as Array<{ files?: Array<{ filename: string }> }>
      ));
    }

    const authorReplied = hasAuthorReply(comments, review.updatedAt, pr.author.login);

    const outcome = classifyFindings(findings, touched, authorReplied);
    stats.fixed += outcome.fixed;
    stats.replied += outcome.replied;
    stats.silent += outcome.silent;
  }
  return stats;
}

export function buildEvalsRow(dateIso: string, totals: RepoStats): string {
  const rate = totals.findings > 0 ? Math.round((totals.fixed / totals.findings) * 100) : 0;
  return `| ${dateIso.slice(0, 10)} | ${totals.prsWithReview} | ${totals.findings} | ${totals.high} | ${totals.incompleteScope} | ${totals.fixed} | ${totals.replied} | ${totals.silent} | ${rate}% |`;
}

const TABLE_HEADER = `## AI Review 接受率（weekly）${MARKER}

> fixed = review 後 commit 動過被點名檔案；replied = 未改但作者有回；silent = 被忽略。
> silent+replied 偏高 → 誤報太多，回頭修 prompt 或濾噪（狼來了兩次就沒人看）。

| 週 | 有 review 的 PR | 發現 | 🔴 | Incomplete scope | fixed | replied | silent | 接受率 |
|---|---|---|---|---|---|---|---|---|`;

export function insertEvalsRow(content: string, row: string): string {
  if (!content.includes(MARKER)) {
    return `${content.trimEnd()}\n\n${TABLE_HEADER}\n${row}\n`;
  }

  const lines = content.split("\n");
  const markerIndex = lines.findIndex((line) => line.includes(MARKER));
  const separatorIndex = lines.findIndex(
    (line, index) => index > markerIndex && line.startsWith("|---")
  );
  if (separatorIndex === -1) {
    throw new Error("review-evals marker exists without its table separator");
  }

  const rowDate = /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|/.exec(row)?.[1];
  if (!rowDate) {
    throw new Error("review-evals row must start with an ISO UTC date");
  }
  for (let index = separatorIndex + 1; index < lines.length; index++) {
    if (!lines[index]!.startsWith("|")) break;
    const existingDate = /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|/.exec(lines[index]!)?.[1];
    if (existingDate === rowDate) {
      lines[index] = row;
      return lines.join("\n");
    }
  }
  lines.splice(separatorIndex + 1, 0, row);
  return lines.join("\n");
}

function appendToEvals(row: string): void {
  const content = existsSync(EVALS_PATH)
    ? readFileSync(EVALS_PATH, "utf-8")
    : "# Pipeline Weekly Evals\n";
  writeFileSync(EVALS_PATH, insertEvalsRow(content, row), "utf-8");
}

function main(): void {
  const sinceIso = new Date(Date.now() - DAYS * 24 * 3600 * 1000).toISOString();
  const totals: RepoStats = {
    repo: "all", prsWithReview: 0, findings: 0, high: 0, incompleteScope: 0,
    fixed: 0, replied: 0, silent: 0,
  };

  for (const repo of REPOS) {
    const s = collectRepo(repo, sinceIso);
    if (s.prsWithReview > 0) {
      log(`${repo}: ${s.prsWithReview} PR, ${s.findings} findings (fixed ${s.fixed} / replied ${s.replied} / silent ${s.silent})`);
    }
    totals.prsWithReview += s.prsWithReview;
    totals.findings += s.findings;
    totals.high += s.high;
    totals.incompleteScope += s.incompleteScope;
    totals.fixed += s.fixed;
    totals.replied += s.replied;
    totals.silent += s.silent;
  }

  const row = buildEvalsRow(new Date().toISOString(), totals);
  log(`weekly row: ${row}`);
  if (DRY_RUN) {
    log("[dry-run] not writing evals.md");
    return;
  }
  appendToEvals(row);
  log(`written → ${EVALS_PATH}`);
}

const isDirectRun = process.argv[1]?.endsWith("review-evals.ts") ?? false;
if (isDirectRun) main();
