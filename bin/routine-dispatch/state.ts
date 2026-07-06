#!/usr/bin/env tsx
/**
 * State machine for routine-dispatch (plan §8 Phase 3.1).
 *
 * Given (repo, issue_num), derives the unique dispatch state.
 * Rule 0 (high-risk repo) is checked FIRST before label precedence.
 *
 * High-risk repo list lives in bin/pipeline.config.json (SSOT).
 *
 * Usage: pnpm tsx bin/routine-dispatch/state.ts <repo> <issue_num>
 * Output: state string on stdout
 */

import { execSync } from "node:child_process";
import { highRiskRepos } from "./config.js";

// Rule 0: high-risk repos come from bin/pipeline.config.json (SSOT) —
// modifying that file requires PR review
const HIGH_RISK_REPOS: readonly string[] = highRiskRepos();

export type DispatchState =
  | "needs-spec"        // M scope, no spec PR yet
  | "spec-in-review"   // M scope, spec PR open but not merged
  | "needs-code"       // spec merged or XS/S ready for code PR
  | "done"             // already has merged code PR
  | "human-blocked"    // automation:hold
  | "manual-mode"      // manual label (no auto)
  | "human-driving"    // human took over permanently
  | "human-coding"     // verification failed, escalated to human
  | "stop-after-plan-done"; // stop-after-plan already executed

interface IssueLabels {
  labels: { name: string }[];
}

function getLabels(repo: string, issueNum: string): string[] {
  // Prefer pre-fetched labels from main.sh (bash gh auth is more reliable in CCR cloud)
  const envLabels = process.env["ISSUE_LABELS"];
  if (envLabels !== undefined) {
    return envLabels ? envLabels.split(",").filter(Boolean) : [];
  }
  try {
    const out = execSync(
      `gh issue view ${issueNum} --repo daodaoedu/${repo} --json labels`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const parsed = JSON.parse(out) as IssueLabels;
    return parsed.labels.map((l) => l.name);
  } catch {
    return [];
  }
}

function hasLabel(labels: string[], label: string): boolean {
  return labels.includes(label);
}

function hasLabelPrefix(labels: string[], prefix: string): boolean {
  return labels.some((l) => l.startsWith(prefix));
}

function getLabelValue(labels: string[], prefix: string): string | null {
  const match = labels.find((l) => l.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

export function deriveState(repo: string, issueNum: string, labels?: string[]): DispatchState {
  const lbls = labels ?? getLabels(repo, issueNum);

  // Rule 0: high-risk repo → always plan-only regardless of auto:auto-pr
  const isHighRisk = HIGH_RISK_REPOS.includes(repo);

  // §6 Label precedence (checked in order)

  // 1a. auto-pr-open → code PR already created, skip
  if (hasLabel(lbls, "auto-pr-open")) return "done";

  // 1. automation:hold → temporary pause
  if (hasLabel(lbls, "automation:hold")) return "human-blocked";

  // 2. human-driving → permanent handoff
  if (hasLabel(lbls, "human-driving")) return "human-driving";

  // 2b. human-coding → verification failed, escalated to human
  if (hasLabel(lbls, "human-coding")) return "human-coding";

  // 3. manual mode → no auto dispatch
  if (hasLabel(lbls, "manual")) return "manual-mode";

  // 4. stop-after-plan → check if plan already done
  if (hasLabel(lbls, "stop-after-plan")) {
    // If spec-merged or spec-pending exists, plan phase is done → stop
    if (hasLabel(lbls, "spec-merged") || hasLabel(lbls, "spec-pending")) {
      return "stop-after-plan-done";
    }
    // Otherwise fall through to dispatch (will run plan, then stop)
  }

  // 5. Standard dispatch — derive scope and auto mode
  const scope = getLabelValue(lbls, "scope:");
  const autoMode = getLabelValue(lbls, "auto:");

  // No auto label → skip
  if (!hasLabel(lbls, "auto")) return "manual-mode";

  // auto:plan-only or high-risk repo → plan-only path
  const isPlanOnly = autoMode === "plan-only" || isHighRisk;

  if (!scope) {
    // Default to M if no scope label
    return isPlanOnly ? "needs-spec" : "needs-spec";
  }

  if (scope === "XS" || scope === "S") {
    // XS/S: single PR path
    // High-risk repos must never reach needs-code (defense-in-depth at state layer)
    if (isHighRisk) return "stop-after-plan-done";
    if (!isPlanOnly) return "needs-code";
    return "needs-spec";
  }

  if (scope === "M") {
    // M: two-phase
    if (hasLabel(lbls, "spec-merged")) {
      if (isPlanOnly) return "stop-after-plan-done";
      return "needs-code";
    }
    if (hasLabel(lbls, "spec-pending")) {
      return "spec-in-review";
    }
    return "needs-spec";
  }

  if (scope === "L") {
    // L: spec only, human does code
    if (hasLabel(lbls, "spec-pending") || hasLabel(lbls, "spec-merged")) {
      return "stop-after-plan-done";
    }
    return "needs-spec";
  }

  return "needs-spec";
}

// CLI entrypoint
const isMain =
  process.argv[1]?.endsWith("state.ts") ||
  process.argv[1]?.endsWith("state");

if (isMain) {
  const [, , repo, issueNum] = process.argv;
  if (!repo || !issueNum) {
    process.stderr.write("Usage: state.ts <repo> <issue_num>\n");
    process.exit(1);
  }
  const state = deriveState(repo, issueNum);
  process.stdout.write(state + "\n");
}
