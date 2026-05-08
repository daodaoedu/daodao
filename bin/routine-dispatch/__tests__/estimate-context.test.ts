import { describe, it, expect, vi, beforeEach } from "vitest";
import { estimateTokens, estimateIssueTokens } from "../estimate-context.js";

// Mock child_process to avoid real gh calls
vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn(),
  };
});

import { execSync } from "node:child_process";

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates 4 chars = 1 token", () => {
    expect(estimateTokens("abcd")).toBe(1);
  });

  it("rounds up partial tokens", () => {
    expect(estimateTokens("abc")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });

  it("handles 5KB body (~1250 tokens, within ±20%)", () => {
    const body = "x".repeat(5000);
    const tokens = estimateTokens(body);
    expect(tokens).toBeGreaterThanOrEqual(1000); // -20%
    expect(tokens).toBeLessThanOrEqual(1500);    // +20%
  });
});

describe("estimateIssueTokens", () => {
  beforeEach(() => {
    vi.mocked(execSync).mockReset();
  });

  it("sums title + body + comments from gh output", () => {
    vi.mocked(execSync).mockReturnValue(
      JSON.stringify({
        title: "Fix login bug",       // 13 chars
        body: "x".repeat(400),        // 400 chars
        comments: [{ body: "y".repeat(200) }], // 200 chars
      })
    );
    const tokens = estimateIssueTokens("daodao-f2e", "42");
    // total chars = 13 + 400 + 200 = 613 → ceil(613/4) = 154
    expect(tokens).toBeGreaterThan(100);
    expect(tokens).toBeLessThan(300);
  });

  it("returns 0 when gh call fails", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("gh not found");
    });
    const tokens = estimateIssueTokens("daodao-f2e", "99");
    expect(tokens).toBe(0);
  });

  it("5KB issue body estimates ~1250 tokens (±20%)", () => {
    vi.mocked(execSync).mockReturnValue(
      JSON.stringify({
        title: "",
        body: "x".repeat(5000),
        comments: [],
      })
    );
    const tokens = estimateIssueTokens("daodao-server", "1");
    expect(tokens).toBeGreaterThanOrEqual(1000);
    expect(tokens).toBeLessThanOrEqual(1500);
  });
});
