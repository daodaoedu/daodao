#!/usr/bin/env tsx
// Estimates token count for a given repo+issue before running a handler.
// Heuristic: 4 chars ≈ 1 token (standard LLM rule of thumb).
// Reads issue body via gh CLI + estimates affected file sizes.
//
// Usage: pnpm tsx estimate-context.ts <repo> <issue_num>
// Output: token estimate (stdout, integer)

import { spawnSync } from "node:child_process";
import { statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateIssueTokens(repo: string, issueNum: string): number {
  let totalChars = 0;

  // Fetch issue body
  try {
    if (!/^\d+$/.test(issueNum)) throw new Error(`Invalid issueNum: ${issueNum}`);
    const result = spawnSync("gh", [
      "issue", "view", issueNum,
      "--repo", `daodaoedu/${repo}`,
      "--json", "body,title,comments",
    ], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
    const issue = JSON.parse(result.stdout) as {
      title: string;
      body: string;
      comments: Array<{ body: string }>;
    };
    totalChars += (issue.title ?? "").length;
    totalChars += (issue.body ?? "").length;
    for (const c of issue.comments ?? []) {
      totalChars += (c.body ?? "").length;
    }
  } catch {
    // gh not available or issue not found — use 0
  }

  // Estimate existing source file sizes in the target repo worktree if present
  const worktreePath = join(
    process.env["MONOREPO_ROOT"] ?? process.cwd(),
    ".git",
    "worktrees",
    `auto-${repo}-${issueNum}`
  );
  try {
    const entries = readdirSync(worktreePath, { recursive: true } as Parameters<typeof readdirSync>[1]);
    for (const entry of entries as string[]) {
      if (
        entry.endsWith(".ts") ||
        entry.endsWith(".tsx") ||
        entry.endsWith(".js") ||
        entry.endsWith(".py") ||
        entry.endsWith(".md")
      ) {
        try {
          const stat = statSync(join(worktreePath, entry));
          totalChars += stat.size;
        } catch {
          // ignore individual file errors
        }
      }
    }
  } catch {
    // worktree not yet created — only issue body contributes
  }

  return Math.ceil(totalChars / CHARS_PER_TOKEN);
}

// CLI entrypoint
if (process.argv[1]?.endsWith("estimate-context.ts") || process.argv[1]?.endsWith("estimate-context")) {
  const repo = process.argv[2];
  const issueNum = process.argv[3];
  if (!repo || !issueNum) {
    console.error("Usage: estimate-context.ts <repo> <issue_num>");
    process.exit(1);
  }
  const tokens = estimateIssueTokens(repo, issueNum);
  console.log(tokens);
}
