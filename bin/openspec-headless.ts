#!/usr/bin/env tsx
/**
 * Headless wrapper for openspec-ff-change.
 * Wraps the openspec fast-forward skill in a non-interactive, timeout-safe CLI.
 * Falls back to direct file-structure creation if the skill layer remains interactive.
 *
 * Exit codes:
 *   0 — success, spec structure created
 *   1 — missing info (issue body insufficient)
 *   2 — internal error or timeout
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// ── CLI args ──────────────────────────────────────────────────────────────────

export interface HeadlessArgs {
  issueNum: number;
  repo: string;
  slug: string;
}

export function parseArgs(argv: string[]): HeadlessArgs {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx !== -1 ? argv[idx + 1] : undefined;
  };
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
      "Usage: openspec-headless.ts --issue-num <N> --repo <repo> --slug <slug>\n\n" +
        "Options:\n" +
        "  --issue-num <N>   GitHub issue number\n" +
        "  --repo <repo>     Sub-repo name (e.g. daodao-f2e)\n" +
        "  --slug <slug>     Change slug (e.g. batch-reactions)\n" +
        "  --help, -h        Show this help\n"
    );
    process.exit(0);
  }

  const issueNumStr = get("--issue-num");
  const repo = get("--repo");
  const slug = get("--slug");

  if (!issueNumStr || !repo || !slug) {
    process.stderr.write(
      "Usage: openspec-headless.ts --issue-num <N> --repo <repo> --slug <slug>\n"
    );
    process.exit(2);
  }
  const issueNum = parseInt(issueNumStr, 10);
  if (isNaN(issueNum) || issueNum <= 0) {
    process.stderr.write(`Invalid --issue-num: ${issueNumStr}\n`);
    process.exit(2);
  }
  return { issueNum, repo, slug };
}

// ── Parse issue body ──────────────────────────────────────────────────────────

export interface IssueFields {
  description: string;
  acceptanceCriteria: string;
}

export function parseIssueBody(body: string): IssueFields {
  const section = (header: RegExp): string => {
    const m = body.match(
      new RegExp(`${header.source}\\s*([\\s\\S]*?)(?=##\\s|$)`, "i")
    );
    return m ? m[1].trim() : "";
  };
  return {
    description:
      section(/##\s*description/) ||
      section(/##\s*描述/) ||
      section(/##\s*Description/),
    acceptanceCriteria:
      section(/##\s*acceptance criteria/) ||
      section(/##\s*驗收條件/) ||
      section(/##\s*Acceptance Criteria/) ||
      section(/##\s*acceptance/),
  };
}

export function validateFields(
  fields: IssueFields,
  issueNum: number,
  repo: string
): void {
  if (!fields.description && !fields.acceptanceCriteria) {
    process.stderr.write(
      `Issue daodaoedu/${repo}#${issueNum} has insufficient body ` +
        "(missing Description and Acceptance Criteria sections). " +
        "Cannot generate spec without minimum content.\n"
    );
    process.exit(1);
  }
}

// ── GitHub issue body fetch ───────────────────────────────────────────────────

export function fetchIssueBody(repo: string, issueNum: number): string {
  const result = spawnSync(
    "gh",
    [
      "issue",
      "view",
      String(issueNum),
      "--repo",
      `daodaoedu/${repo}`,
      "--json",
      "body",
      "--jq",
      ".body",
    ],
    { encoding: "utf8", timeout: 15_000, env: process.env }
  );
  if (result.error || result.status !== 0) return "";
  return (result.stdout ?? "").trim();
}

// ── Attempt skill layer via claude CLI ────────────────────────────────────────

export function trySkillLayer(
  issueNum: number,
  repo: string,
  slug: string,
  fields: IssueFields,
  cwd: string = process.cwd()
): boolean {
  const prompt =
    `Run openspec-ff-change for issue daodaoedu/${repo}#${issueNum} slug=${slug}.\n` +
    `Description:\n${fields.description || "(see issue)"}\n\n` +
    `Acceptance Criteria:\n${fields.acceptanceCriteria || "(see issue)"}`;

  const result = spawnSync("claude", ["-p", prompt, "--output-format", "text"], {
    encoding: "utf8",
    timeout: 28_000,
    input: "",
    env: { ...process.env, OPENSPEC_NONINTERACTIVE: "1" },
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.error || result.status !== 0) {
    process.stderr.write(
      `Skill layer failed (status=${result.status}): ${
        result.stderr ?? result.error?.message ?? "unknown"
      }\n`
    );
    return false;
  }

  const repoPrefix = repo.replace(/^daodao-/, "");
  const changeDir = join(
    cwd,
    "openspec",
    "changes",
    `${repoPrefix}-${issueNum}-${slug}`
  );
  return existsSync(changeDir);
}

// ── Fallback: direct file-structure creation ──────────────────────────────────

export function fallbackCreateSpec(
  issueNum: number,
  repo: string,
  slug: string,
  fields: IssueFields,
  cwd: string = process.cwd()
): void {
  process.stderr.write(
    "⚠️ 用 fallback 路徑：skill 層無法完成，直接建立 openspec/changes/ 檔案結構。\n"
  );

  const repoPrefix = repo.replace(/^daodao-/, "");
  const changeDir = join(
    cwd,
    "openspec",
    "changes",
    `${repoPrefix}-${issueNum}-${slug}`
  );
  const specsDir = join(changeDir, "specs");

  mkdirSync(specsDir, { recursive: true });

  const proposal = [
    "## Why",
    "",
    fields.description || `See daodaoedu/${repo}#${issueNum}`,
    "",
    "## What Changes",
    "",
    "<!-- TODO: describe changes -->",
    "",
    "## Capabilities",
    "",
    "### New Capabilities",
    "",
    `- \`${slug}\`: <!-- describe capability -->`,
    "",
    "## Impact",
    "",
    `- **${repo}**: <!-- describe impact -->`,
  ].join("\n");

  const tasks = [
    `## Tasks — ${slug}`,
    "",
    fields.acceptanceCriteria
      ? `### Acceptance Criteria\n\n${fields.acceptanceCriteria}`
      : "<!-- TODO: fill in acceptance criteria -->",
    "",
    "## Implementation Tasks",
    "",
    "- [ ] 1.1 <!-- first task -->",
    "  - Acceptance: <!-- given/when/then -->",
  ].join("\n");

  writeFileSync(join(changeDir, "proposal.md"), proposal + "\n");
  writeFileSync(join(changeDir, "tasks.md"), tasks + "\n");
  writeFileSync(join(specsDir, ".gitkeep"), "");
}

// ── Main (only runs when executed directly, not during import/test) ───────────

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("openspec-headless.ts") ||
    process.argv[1].endsWith("openspec-headless.js"));

if (isMain) {
  const { issueNum, repo, slug } = parseArgs(process.argv.slice(2));
  const body = fetchIssueBody(repo, issueNum);
  const fields = parseIssueBody(body);
  validateFields(fields, issueNum, repo);

  const skillSucceeded = trySkillLayer(issueNum, repo, slug, fields);
  if (!skillSucceeded) {
    fallbackCreateSpec(issueNum, repo, slug, fields);
  }
  process.exit(0);
}
