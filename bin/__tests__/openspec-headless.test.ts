import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock child_process so we never actually call gh or claude
vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from "node:child_process";
import {
  parseArgs,
  parseIssueBody,
  validateFields,
  fallbackCreateSpec,
  trySkillLayer,
} from "../openspec-headless.js";

const mockSpawn = vi.mocked(spawnSync);

// ── parseArgs ─────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("fixture 1: parses all required flags", () => {
    const result = parseArgs([
      "--issue-num", "42",
      "--repo", "daodao-mcp",
      "--slug", "test-headless",
    ]);
    expect(result).toEqual({ issueNum: 42, repo: "daodao-mcp", slug: "test-headless" });
  });

  it("fixture 2: exits with code 2 when --issue-num is missing", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit(2)");
    });
    expect(() =>
      parseArgs(["--repo", "daodao-f2e", "--slug", "some-slug"])
    ).toThrow("process.exit(2)");
    exitSpy.mockRestore();
  });

  it("fixture 3: exits with code 2 when issue-num is not a valid integer", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit(2)");
    });
    expect(() =>
      parseArgs(["--issue-num", "abc", "--repo", "daodao-f2e", "--slug", "slug"])
    ).toThrow("process.exit(2)");
    exitSpy.mockRestore();
  });
});

// ── parseIssueBody ────────────────────────────────────────────────────────────

describe("parseIssueBody", () => {
  it("fixture 4: extracts English section headers", () => {
    const body = `## Description\n\nAdd /health endpoint\n\n## Acceptance Criteria\n\n- [ ] Returns 200`;
    const fields = parseIssueBody(body);
    expect(fields.description).toBe("Add /health endpoint");
    expect(fields.acceptanceCriteria).toContain("Returns 200");
  });

  it("fixture 5: extracts Chinese section headers", () => {
    const body = `## 描述\n\n健康檢查端點\n\n## 驗收條件\n\n- [ ] 回傳 200`;
    const fields = parseIssueBody(body);
    expect(fields.description).toBe("健康檢查端點");
    expect(fields.acceptanceCriteria).toContain("回傳 200");
  });

  it("fixture 6: returns empty strings when no relevant sections", () => {
    const body = `## Other Section\n\nsome content`;
    const fields = parseIssueBody(body);
    expect(fields.description).toBe("");
    expect(fields.acceptanceCriteria).toBe("");
  });
});

// ── validateFields ────────────────────────────────────────────────────────────

describe("validateFields", () => {
  it("fixture 7: exits with code 1 when both fields are empty", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit(1)");
    });
    expect(() =>
      validateFields({ description: "", acceptanceCriteria: "" }, 1, "daodao-mcp")
    ).toThrow("process.exit(1)");
    exitSpy.mockRestore();
  });

  it("fixture 8: does not exit when description is present", () => {
    expect(() =>
      validateFields({ description: "Some desc", acceptanceCriteria: "" }, 1, "daodao-mcp")
    ).not.toThrow();
  });

  it("fixture 9: does not exit when acceptanceCriteria is present", () => {
    expect(() =>
      validateFields({ description: "", acceptanceCriteria: "- [ ] something" }, 1, "daodao-mcp")
    ).not.toThrow();
  });
});

// ── fallbackCreateSpec ────────────────────────────────────────────────────────

describe("fallbackCreateSpec", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `openspec-test-${Date.now()}`);
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  it("fixture 10: creates proposal.md and tasks.md in correct directory", () => {
    fallbackCreateSpec(
      99,
      "daodao-mcp",
      "test-slug",
      { description: "A test feature", acceptanceCriteria: "- [ ] works" },
      tmpDir
    );
    const changeDir = join(tmpDir, "openspec", "changes", "mcp-99-test-slug");
    expect(existsSync(join(changeDir, "proposal.md"))).toBe(true);
    expect(existsSync(join(changeDir, "tasks.md"))).toBe(true);
    expect(existsSync(join(changeDir, "specs"))).toBe(true);
  });

  it("fixture 11: proposal.md contains description text", () => {
    fallbackCreateSpec(
      7,
      "daodao-f2e",
      "my-feature",
      { description: "My feature description", acceptanceCriteria: "" },
      tmpDir
    );
    const proposal = readFileSync(
      join(tmpDir, "openspec", "changes", "f2e-7-my-feature", "proposal.md"),
      "utf8"
    );
    expect(proposal).toContain("My feature description");
    expect(proposal).toContain("daodao-f2e");
  });

  it("fixture 12: tasks.md contains acceptance criteria when provided", () => {
    fallbackCreateSpec(
      3,
      "daodao-server",
      "health-check",
      { description: "desc", acceptanceCriteria: "- [ ] GET /health returns 200" },
      tmpDir
    );
    const tasks = readFileSync(
      join(tmpDir, "openspec", "changes", "server-3-health-check", "tasks.md"),
      "utf8"
    );
    expect(tasks).toContain("GET /health returns 200");
  });
});

// ── trySkillLayer ─────────────────────────────────────────────────────────────

describe("trySkillLayer", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `openspec-skill-test-${Date.now()}`);
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  it("fixture 13: returns false when claude exits non-zero", () => {
    mockSpawn.mockReturnValue({ status: 1, stdout: "", stderr: "error", error: undefined } as any);
    const result = trySkillLayer(
      1, "daodao-mcp", "test",
      { description: "d", acceptanceCriteria: "a" },
      tmpDir
    );
    expect(result).toBe(false);
  });

  it("fixture 14: returns false when claude succeeds but change dir not created", () => {
    mockSpawn.mockReturnValue({ status: 0, stdout: "done", stderr: "", error: undefined } as any);
    // dir not created → should return false
    const result = trySkillLayer(
      1, "daodao-mcp", "test",
      { description: "d", acceptanceCriteria: "a" },
      tmpDir
    );
    expect(result).toBe(false);
  });

  it("fixture 15: returns true when claude succeeds and change dir exists", () => {
    mockSpawn.mockReturnValue({ status: 0, stdout: "done", stderr: "", error: undefined } as any);
    // Pre-create the expected change directory
    mkdirSync(join(tmpDir, "openspec", "changes", "mcp-5-my-slug"), { recursive: true });
    const result = trySkillLayer(
      5, "daodao-mcp", "my-slug",
      { description: "d", acceptanceCriteria: "a" },
      tmpDir
    );
    expect(result).toBe(true);
  });
});
