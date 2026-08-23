import { describe, it, expect, vi, beforeEach } from "vitest";
import { routeModel, buildAdrFragment, MODEL_MAP, type Stage } from "../model-router.js";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    readdirSync: vi.fn().mockReturnValue([]),
    readFileSync: vi.fn().mockImplementation(actual.readFileSync),
  };
});

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

describe("routeModel", () => {
  const cases: [Stage, string][] = [
    ["dispatch", "claude-haiku-4-5-20251001"],
    ["handler",  "claude-sonnet-4-6"],
    ["spec",     "claude-opus-4-7"],
    ["reviewer", "claude-sonnet-4-6"],
    ["judge",    "claude-haiku-4-5-20251001"],
  ];

  for (const [stage, expectedModel] of cases) {
    it(`routes ${stage} → ${expectedModel}`, () => {
      expect(routeModel(stage)).toBe(expectedModel);
    });
  }

  it("throws for unknown stage", () => {
    expect(() => routeModel("unknown" as Stage)).toThrow();
  });
});

describe("MODEL_MAP", () => {
  it("dispatch and judge use Haiku", () => {
    expect(MODEL_MAP.dispatch).toContain("haiku");
    expect(MODEL_MAP.judge).toContain("haiku");
  });

  it("handler and reviewer use Sonnet", () => {
    expect(MODEL_MAP.handler).toContain("sonnet");
    expect(MODEL_MAP.reviewer).toContain("sonnet");
  });

  it("spec uses Opus", () => {
    expect(MODEL_MAP.spec).toContain("opus");
  });
});

describe("buildAdrFragment", () => {
  beforeEach(() => {
    vi.mocked(spawnSync).mockReset();
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readdirSync).mockReturnValue([]);
  });

  it("returns empty string when no context found", () => {
    const result = buildAdrFragment({ repo: "daodao-f2e" });
    expect(result).toBe("");
  });

  it("includes OpenSpec proposal when changeId provided and file exists", () => {
    vi.mocked(readFileSync as ReturnType<typeof vi.fn>).mockImplementation(
      (path: string) => {
        if (String(path).includes("proposal.md")) return "# Proposal content";
        throw new Error("not found");
      }
    );
    vi.mocked(existsSync).mockReturnValue(false);

    // We need the file to "exist" for the proposal path
    const result = buildAdrFragment({
      repo: "daodao-f2e",
      changeId: "f2e-123-test-feature",
    });
    // proposal path read attempted — if it returns content, fragment is built
    // since readFileSync is mocked to return content for proposal.md:
    expect(result).toContain("Proposal content");
  });

  it("includes ADR files that mention the repo", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readdirSync).mockReturnValue(["001-auth.md", "002-storage.md"] as ReturnType<typeof readdirSync>);
    vi.mocked(readFileSync as ReturnType<typeof vi.fn>).mockImplementation(
      (path: string) => {
        if (String(path).includes("001-auth.md")) return "# Auth ADR\ndaodao-f2e auth decisions";
        if (String(path).includes("002-storage.md")) return "# Storage ADR\ndaodao-storage decisions";
        throw new Error("not found");
      }
    );

    const result = buildAdrFragment({ repo: "daodao-f2e" });
    expect(result).toContain("001-auth.md");
    expect(result).not.toContain("002-storage.md");
  });

  it("includes issue body area spec when gh returns area annotation", () => {
    vi.mocked(spawnSync).mockReturnValue({
      stdout: JSON.stringify({ body: "<!-- area: auth -->\nFix login" }),
      stderr: "",
      status: 0,
      pid: 0,
      output: [],
      signal: null,
    });
    vi.mocked(readFileSync as ReturnType<typeof vi.fn>).mockImplementation(
      (path: string) => {
        if (String(path).includes("openspec/specs/auth/spec.md")) return "# Auth Spec";
        throw new Error("not found");
      }
    );

    const result = buildAdrFragment({
      repo: "daodao-f2e",
      issueNum: "42",
    });
    expect(result).toContain("Auth Spec");
  });

  it("skips issue area lookup gracefully when gh fails", () => {
    vi.mocked(spawnSync).mockReturnValue({
      stdout: "",
      stderr: "gh not found",
      status: 1,
      pid: 0,
      output: [],
      signal: null,
    });
    const result = buildAdrFragment({ repo: "daodao-f2e", issueNum: "99" });
    expect(result).toBe("");
  });
});
