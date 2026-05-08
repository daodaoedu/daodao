import { describe, it, expect } from "vitest";
import { deriveState, type DispatchState } from "../state.js";

// Helper: build label array
const labels = (...names: string[]) => names;

describe("deriveState — Rule 0: high-risk repo override", () => {
  it("daodao-storage + auto:auto-pr + scope:XS → stop-after-plan-done (not needs-code)", () => {
    const state = deriveState("daodao-storage", "42", labels("auto", "auto:auto-pr", "scope:XS"));
    expect(state).toBe("stop-after-plan-done");
    expect(state).not.toBe("needs-code");
  });

  it("daodao-infra + auto:auto-pr + scope:S → stop-after-plan-done (not needs-code)", () => {
    const state = deriveState("daodao-infra", "10", labels("auto", "auto:auto-pr", "scope:S"));
    expect(state).toBe("stop-after-plan-done");
    expect(state).not.toBe("needs-code");
  });

  it("daodao-storage + scope:XS + auto:plan-only → stop-after-plan-done (plan-only path)", () => {
    const state = deriveState("daodao-storage", "1", labels("auto", "auto:plan-only", "scope:XS"));
    expect(state).toBe("stop-after-plan-done");
  });

  // Fix-1 required fixtures: spec-merged must NOT yield needs-code for high-risk repos
  it("daodao-storage + spec-merged + scope:XS + auto:auto-pr → stop-after-plan-done (never needs-code)", () => {
    const state = deriveState("daodao-storage", "50", labels(
      "auto", "auto:auto-pr", "scope:XS", "spec-merged"
    ));
    expect(state).not.toBe("needs-code");
    expect(state).toBe("stop-after-plan-done");
  });

  it("daodao-infra + spec-merged + scope:S + auto:auto-pr → stop-after-plan-done (never needs-code)", () => {
    const state = deriveState("daodao-infra", "20", labels(
      "auto", "auto:auto-pr", "scope:S", "spec-merged"
    ));
    expect(state).not.toBe("needs-code");
    expect(state).toBe("stop-after-plan-done");
  });
});

describe("deriveState — §6 label precedence", () => {
  it("automation:hold → human-blocked (highest priority after Rule 0)", () => {
    const state = deriveState("daodao-f2e", "1", labels("auto", "automation:hold", "auto:auto-pr", "scope:XS"));
    expect(state).toBe("human-blocked");
  });

  it("human-driving → human-driving", () => {
    const state = deriveState("daodao-f2e", "2", labels("auto", "human-driving", "scope:S"));
    expect(state).toBe("human-driving");
  });

  it("manual → manual-mode", () => {
    const state = deriveState("daodao-f2e", "3", labels("manual", "scope:M"));
    expect(state).toBe("manual-mode");
  });

  it("no auto label → manual-mode", () => {
    const state = deriveState("daodao-f2e", "4", labels("scope:XS"));
    expect(state).toBe("manual-mode");
  });

  it("stop-after-plan with spec-pending → stop-after-plan-done", () => {
    const state = deriveState("daodao-f2e", "5", labels("auto", "stop-after-plan", "spec-pending", "scope:M"));
    expect(state).toBe("stop-after-plan-done");
  });

  it("stop-after-plan without spec labels → falls through to dispatch (needs-spec)", () => {
    const state = deriveState("daodao-f2e", "6", labels("auto", "stop-after-plan", "scope:M"));
    expect(state).toBe("needs-spec");
  });
});

describe("deriveState — standard dispatch", () => {
  it("scope:XS + auto:auto-pr → needs-code", () => {
    const state = deriveState("daodao-f2e", "10", labels("auto", "auto:auto-pr", "scope:XS"));
    expect(state).toBe("needs-code");
  });

  it("scope:S + auto:auto-pr → needs-code", () => {
    const state = deriveState("daodao-f2e", "11", labels("auto", "auto:auto-pr", "scope:S"));
    expect(state).toBe("needs-code");
  });

  it("scope:M + no spec labels → needs-spec", () => {
    const state = deriveState("daodao-f2e", "12", labels("auto", "auto:auto-pr", "scope:M"));
    expect(state).toBe("needs-spec");
  });

  it("scope:M + spec-pending → spec-in-review", () => {
    const state = deriveState("daodao-f2e", "13", labels("auto", "auto:auto-pr", "scope:M", "spec-pending"));
    expect(state).toBe("spec-in-review");
  });

  it("scope:M + spec-merged + auto:auto-pr → needs-code", () => {
    const state = deriveState("daodao-f2e", "14", labels("auto", "auto:auto-pr", "scope:M", "spec-merged"));
    expect(state).toBe("needs-code");
  });

  it("scope:M + spec-merged + auto:plan-only → stop-after-plan-done", () => {
    const state = deriveState("daodao-f2e", "15", labels("auto", "auto:plan-only", "scope:M", "spec-merged"));
    expect(state).toBe("stop-after-plan-done");
  });

  it("scope:L + no spec → needs-spec", () => {
    const state = deriveState("daodao-f2e", "16", labels("auto", "auto:auto-pr", "scope:L"));
    expect(state).toBe("needs-spec");
  });

  it("scope:L + spec-pending → stop-after-plan-done (L always stops after plan)", () => {
    const state = deriveState("daodao-f2e", "17", labels("auto", "auto:auto-pr", "scope:L", "spec-pending"));
    expect(state).toBe("stop-after-plan-done");
  });
});

describe("deriveState — precedence ordering", () => {
  it("automation:hold takes precedence over human-driving", () => {
    const state = deriveState("daodao-f2e", "20", labels(
      "auto", "automation:hold", "human-driving", "scope:XS"
    ));
    expect(state).toBe("human-blocked");
  });

  it("human-driving takes precedence over manual", () => {
    const state = deriveState("daodao-f2e", "21", labels(
      "auto", "human-driving", "manual", "scope:XS"
    ));
    expect(state).toBe("human-driving");
  });
});
