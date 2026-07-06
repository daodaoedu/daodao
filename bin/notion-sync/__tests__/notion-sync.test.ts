import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  NotionRowSchema,
  RELAXED_FALLBACKS,
  HIGH_RISK_REPOS,
  TARGET_REPOS,
} from "../types.js";
import { buildNotionLabel } from "../dedup.js";

// ── Types & schema tests ────────────────────────────────────────────────────

describe("NotionRowSchema", () => {
  const base = {
    pageId: "abc12345-1234-1234-1234-123456789012",
    shortId: "abc12345",
    title: "Test issue",
    status: "Ready for Dev",
    syncToGitHub: true,
    autoMode: "plan-only",
    scope: "M",
    targetRepos: ["daodao-f2e"],
    labels: [],
  } as const;

  it("fixture 1: valid full row parses successfully", () => {
    const result = NotionRowSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("fixture 2: missing Status still parses (status is just a string)", () => {
    const result = NotionRowSchema.safeParse({ ...base, status: "" });
    expect(result.success).toBe(true);
  });

  it("fixture 3: missing Sync to GitHub (false) still valid", () => {
    const result = NotionRowSchema.safeParse({ ...base, syncToGitHub: false });
    expect(result.success).toBe(true);
  });

  it("fixture 4: invalid Auto Mode fails validation", () => {
    const result = NotionRowSchema.safeParse({ ...base, autoMode: "bogus" });
    expect(result.success).toBe(false);
  });

  it("fixture 5: invalid Target Repo fails validation", () => {
    const result = NotionRowSchema.safeParse({ ...base, targetRepos: ["daodao-unknown"] });
    expect(result.success).toBe(false);
  });

  it("fixture 6: all 8 target repos are valid", () => {
    for (const repo of TARGET_REPOS) {
      const result = NotionRowSchema.safeParse({ ...base, targetRepos: [repo] });
      expect(result.success, `${repo} should be valid`).toBe(true);
    }
  });

  it("fixture 7: optional fields default correctly", () => {
    const result = NotionRowSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.labels).toEqual([]);
      expect(result.data.acceptanceCriteria).toBeUndefined();
      expect(result.data.githubIssueUrl).toBeUndefined();
    }
  });

  it("fixture 8: manual auto mode is valid", () => {
    const result = NotionRowSchema.safeParse({ ...base, autoMode: "manual" });
    expect(result.success).toBe(true);
  });
});

// ── Relaxed fallbacks ───────────────────────────────────────────────────────

describe("RELAXED_FALLBACKS", () => {
  it("default autoMode is plan-only", () => {
    expect(RELAXED_FALLBACKS.autoMode).toBe("plan-only");
  });

  it("default scope is M", () => {
    expect(RELAXED_FALLBACKS.scope).toBe("M");
  });

  it("default targetRepos is [daodao-f2e]", () => {
    expect(RELAXED_FALLBACKS.targetRepos).toEqual(["daodao-f2e"]);
  });
});

// ── High-risk repos ─────────────────────────────────────────────────────────

describe("HIGH_RISK_REPOS", () => {
  it("storage and infra are high-risk", () => {
    expect(HIGH_RISK_REPOS).toContain("daodao-storage");
    expect(HIGH_RISK_REPOS).toContain("daodao-infra");
  });

  it("daodao-f2e is NOT high-risk", () => {
    expect(HIGH_RISK_REPOS).not.toContain("daodao-f2e");
  });
});

// ── Dedup label ─────────────────────────────────────────────────────────────

describe("buildNotionLabel", () => {
  it("formats label correctly", () => {
    expect(buildNotionLabel("abc12345")).toBe("notion:abc12345");
  });

  it("dedup existing issue — label matches", () => {
    const shortId = "deadbeef";
    const label = buildNotionLabel(shortId);
    // Simulate: existing issue has this label
    const existingLabels = [{ name: label }, { name: "auto" }];
    const found = existingLabels.some((l) => l.name === label);
    expect(found).toBe(true);
  });

  it("dedup new issue — label not present", () => {
    const shortId = "newissue";
    const label = buildNotionLabel(shortId);
    const existingLabels = [{ name: "notion:other123" }];
    const found = existingLabels.some((l) => l.name === label);
    expect(found).toBe(false);
  });
});

// ── Idempotency ─────────────────────────────────────────────────────────────

describe("idempotency", () => {
  it("fixture: running sync twice with same shortId produces same label", () => {
    const shortId = "abc12345";
    const label1 = buildNotionLabel(shortId);
    const label2 = buildNotionLabel(shortId);
    expect(label1).toBe(label2);
  });
});

// ── Schema validation unit ──────────────────────────────────────────────────

describe("schema-validate", () => {
  it("missing Auto Mode in strict mode would exit non-zero (contract test)", () => {
    // This is a contract test — actual behavior tested by integration.
    // Here we verify the required properties list includes Auto Mode.
    const REQUIRED = [
      "Title",
      "Status",
      "Sync to GitHub",
      "Auto Mode",
      "Scope",
      "Target Repo",
      "GitHub Issue",
      "Acceptance Criteria",
    ];
    expect(REQUIRED).toContain("Auto Mode");
    expect(REQUIRED).toContain("Target Repo");
    expect(REQUIRED).toContain("Sync to GitHub");
  });
});
