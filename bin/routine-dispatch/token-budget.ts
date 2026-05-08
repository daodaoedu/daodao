#!/usr/bin/env tsx
// Per-issue token budget tracker (plan §5.4).
// Hard-coded caps — modifying requires PR review.
// Persists to state-store.json:token_usage_by_issue.

import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const STATE_STORE_PATH = join(SCRIPT_DIR, "state-store.json");

export const TOKEN_CAPS: Record<string, number> = {
  "scope:XS": 50_000,
  "scope:S": 200_000,
  "scope:M": 800_000,
  "scope:L": 1_500_000,
};

interface StateStore {
  last_scan_at: string;
  last_dispatch_run_at: string;
  pause_reason: string;
  token_usage_by_issue: Record<string, number>;
  ports_in_use: number[];
}

function readStore(): StateStore {
  try {
    return JSON.parse(readFileSync(STATE_STORE_PATH, "utf8")) as StateStore;
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

function writeStoreSync(store: StateStore): void {
  const tmp = STATE_STORE_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(store, null, 2) + "\n", "utf8");
  renameSync(tmp, STATE_STORE_PATH);
}

/** Returns current token usage for a given issue key (e.g. "daodao-f2e#42"). */
export function getTokenUsage(issueKey: string): number {
  const store = readStore();
  return store.token_usage_by_issue[issueKey] ?? 0;
}

/** Adds `count` tokens to the running total for `issueKey`. Returns updated total. */
export function incrementTokens(issueKey: string, count: number): number {
  const store = readStore();
  const current = store.token_usage_by_issue[issueKey] ?? 0;
  const updated = current + count;
  store.token_usage_by_issue[issueKey] = updated;
  writeStoreSync(store);
  return updated;
}

/**
 * Checks whether the issue is still within its scope budget.
 * Returns true if under cap, false if at/over cap.
 */
export function checkBudget(issueKey: string, scope: string): boolean {
  const cap = TOKEN_CAPS[scope];
  if (cap === undefined) {
    console.error(`token-budget: unknown scope "${scope}", defaulting to deny`);
    return false;
  }
  const used = getTokenUsage(issueKey);
  return used < cap;
}

/** Resets the token counter for an issue (e.g. after human takeover). */
export function resetTokens(issueKey: string): void {
  const store = readStore();
  delete store.token_usage_by_issue[issueKey];
  writeStoreSync(store);
}

// CLI entrypoint
const isMain =
  process.argv[1]?.endsWith("token-budget.ts") ||
  process.argv[1]?.endsWith("token-budget");

if (isMain) {
  const [, , cmd, issueKey, ...rest] = process.argv;
  if (cmd === "get") {
    console.log(getTokenUsage(issueKey!));
  } else if (cmd === "increment") {
    const count = parseInt(rest[0] ?? "0", 10);
    console.log(incrementTokens(issueKey!, count));
  } else if (cmd === "check") {
    const scope = rest[0] ?? "scope:S";
    const ok = checkBudget(issueKey!, scope);
    console.log(ok ? "ok" : "exceeded");
    process.exit(ok ? 0 : 1);
  } else if (cmd === "reset") {
    resetTokens(issueKey!);
    console.log("reset");
  } else {
    console.error(
      "Usage: token-budget.ts <get|increment|check|reset> <issueKey> [count|scope]"
    );
    process.exit(1);
  }
}
