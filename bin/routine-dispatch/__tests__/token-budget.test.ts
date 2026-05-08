import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = fileURLToPath(new URL("..", import.meta.url));
const STATE_STORE_PATH = join(SCRIPT_DIR, "state-store.json");
const STATE_STORE_BACKUP = STATE_STORE_PATH + ".bak";

function writeTestStore(data: object): void {
  writeFileSync(STATE_STORE_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// Backup and restore state-store.json around tests
beforeEach(() => {
  if (existsSync(STATE_STORE_PATH)) {
    const content = require("node:fs").readFileSync(STATE_STORE_PATH, "utf8");
    writeFileSync(STATE_STORE_BACKUP, content, "utf8");
  }
  writeTestStore({
    last_scan_at: "",
    last_dispatch_run_at: "",
    pause_reason: "",
    token_usage_by_issue: {},
    ports_in_use: [],
  });
});

afterEach(() => {
  if (existsSync(STATE_STORE_BACKUP)) {
    const content = require("node:fs").readFileSync(STATE_STORE_BACKUP, "utf8");
    writeFileSync(STATE_STORE_PATH, content, "utf8");
    unlinkSync(STATE_STORE_BACKUP);
  }
});

// Dynamic import after store is reset
async function getBudget() {
  // Force re-import by using cache-busting — vitest isolates modules
  return await import("../token-budget.js");
}

describe("TOKEN_CAPS", () => {
  it("has correct hard-coded caps", async () => {
    const { TOKEN_CAPS } = await getBudget();
    expect(TOKEN_CAPS["scope:XS"]).toBe(50_000);
    expect(TOKEN_CAPS["scope:S"]).toBe(200_000);
    expect(TOKEN_CAPS["scope:M"]).toBe(800_000);
    expect(TOKEN_CAPS["scope:L"]).toBe(1_500_000);
  });
});

describe("getTokenUsage", () => {
  it("returns 0 for unknown issue", async () => {
    const { getTokenUsage } = await getBudget();
    expect(getTokenUsage("daodao-f2e#99")).toBe(0);
  });
});

describe("incrementTokens", () => {
  it("accumulates tokens across calls", async () => {
    const { incrementTokens, getTokenUsage } = await getBudget();
    incrementTokens("daodao-f2e#1", 10_000);
    incrementTokens("daodao-f2e#1", 20_000);
    expect(getTokenUsage("daodao-f2e#1")).toBe(30_000);
  });

  it("persists to state-store.json", async () => {
    const { incrementTokens } = await getBudget();
    incrementTokens("daodao-server#5", 5_000);
    const stored = JSON.parse(
      require("node:fs").readFileSync(STATE_STORE_PATH, "utf8")
    ) as { token_usage_by_issue: Record<string, number> };
    expect(stored.token_usage_by_issue["daodao-server#5"]).toBe(5_000);
  });
});

describe("checkBudget", () => {
  it("returns true when under cap", async () => {
    const { incrementTokens, checkBudget } = await getBudget();
    incrementTokens("daodao-f2e#10", 30_000);
    expect(checkBudget("daodao-f2e#10", "scope:XS")).toBe(true);
  });

  it("returns false when at/over cap (XS cap=50k, used=60k)", async () => {
    const { incrementTokens, checkBudget } = await getBudget();
    incrementTokens("daodao-f2e#10", 60_000);
    expect(checkBudget("daodao-f2e#10", "scope:XS")).toBe(false);
  });

  it("returns false for unknown scope", async () => {
    const { checkBudget } = await getBudget();
    expect(checkBudget("daodao-f2e#10", "scope:UNKNOWN")).toBe(false);
  });

  it("allows scope:M up to 800k", async () => {
    const { incrementTokens, checkBudget } = await getBudget();
    incrementTokens("daodao-f2e#20", 799_999);
    expect(checkBudget("daodao-f2e#20", "scope:M")).toBe(true);
    incrementTokens("daodao-f2e#20", 2);
    expect(checkBudget("daodao-f2e#20", "scope:M")).toBe(false);
  });
});

describe("resetTokens", () => {
  it("clears the counter for an issue", async () => {
    const { incrementTokens, resetTokens, getTokenUsage } = await getBudget();
    incrementTokens("daodao-f2e#7", 10_000);
    resetTokens("daodao-f2e#7");
    expect(getTokenUsage("daodao-f2e#7")).toBe(0);
  });
});
