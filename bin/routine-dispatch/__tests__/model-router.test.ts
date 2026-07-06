import { describe, it, expect, vi, beforeEach } from "vitest";
import { routeModel, buildAdrFragment, type Stage } from "../model-router.js";
import { loadConfig } from "../config.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
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

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

describe("routeModel", () => {
  // v3: model ID 來自 bin/pipeline.config.json（SSOT），測試驗證一致性而非硬編碼值
  const stages: Stage[] = ["dispatch", "reviewer", "judge"];

  for (const stage of stages) {
    it(`routes ${stage} → config.models.${stage}`, () => {
      expect(routeModel(stage)).toBe(loadConfig().models[stage]);
      expect(routeModel(stage)).toMatch(/^claude-/);
    });
  }

  it("throws for unknown stage", () => {
    expect(() => routeModel("unknown" as Stage)).toThrow();
  });

  it("v1 nested-claude stages (handler/spec) no longer exist", () => {
    expect(() => routeModel("handler" as Stage)).toThrow();
    expect(() => routeModel("spec" as Stage)).toThrow();
  });
});

describe("buildAdrFragment", () => {
  beforeEach(() => {
    vi.mocked(execSync).mockReset();
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
    vi.mocked(readdirSync).mockReturnValue(["001-auth.md", "002-storage.md"] as unknown as ReturnType<typeof readdirSync>);
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
    vi.mocked(execSync).mockReturnValue(
      JSON.stringify({ body: "<!-- area: auth -->\nFix login" })
    );
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
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("gh not found");
    });
    const result = buildAdrFragment({ repo: "daodao-f2e", issueNum: "99" });
    expect(result).toBe("");
  });
});
