import { afterEach, describe, expect, it } from "vitest";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acceptanceScenarioSchema, initializeAcceptanceStateDirectory, runScenarioOperation } from "../acceptance-scenario.js";

const paths: string[] = [];
function directory() { const path = mkdtempSync(join(tmpdir(), "scenario-")); paths.push(path); initializeAcceptanceStateDirectory(path); return path; }
afterEach(() => paths.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));
const actor = { kind: "actor-access", accountId: "6a542fe3-7bba-42f7-844a-deb9489bd85e", accountEmail: "pm@example.com", expectedRoles: ["User"] };
function contract(generation = "first", usage = "read") {
  return {
    kind: "acceptance-scenario", version: 1, issue: "https://github.com/daodaoedu/daodao/issues/480",
    generation, taskOwner: "scenario-task", actors: [actor],
    resources: [{ environment: "dev", type: "organization", id: "900001", usage }],
    prerequisites: [{ description: "Existing organization membership verified separately", evidenceRef: "evidence/actor-check.json" }],
    retention: { retainUntil: "pm-accepted", reviewAt: "2026-11-08T00:00:00Z" },
    cleanup: { instructions: "Keep shared data unchanged; record readback", evidenceRef: "docs/cleanup.md" },
    rebuild: { instructions: "Use the issue-specific generation procedure", evidenceRef: "docs/rebuild.md" },
  };
}
const now = () => new Date("2026-11-07T00:00:00Z");
const release = { outcome: "accepted" as const, outcomeEvidence: "https://github.com/daodaoedu/daodao/issues/480#issuecomment-1", cleanupEvidence: "evidence/cleanup-readback.json" };

describe("scenario expectations", () => {
  it("accepts explicit evidence/retention but does not call validity readiness", () => {
    const dir = directory(), report = runScenarioOperation("validate", contract(), join(dir, "absent"), { now });
    expect(report).toMatchObject({ status: "VALID", readiness: "NOT_VERIFIED", reviewDue: false });
    expect(report.contractDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(existsSync(join(dir, "absent"))).toBe(false);
  });
  it("rejects unspecified actors, duplicate scopes, credentials and inferred procedures", () => {
    const base = contract();
    for (const input of [
      { ...base, issue: "https://other.example/issues/480" }, { ...base, generation: "../other" },
      { ...base, actors: [] }, { ...base, actors: [actor, { ...actor, expectedRoles: ["Admin"] }] },
      { ...base, resources: [base.resources[0], base.resources[0]] },
      { ...base, resources: [{ ...base.resources[0], environment: "prod" }] },
      { ...base, resources: [{ ...base.resources[0], id: "../900001" }] },
      { ...base, resources: [{ ...base.resources[0], id: "future-object" }] },
      { ...base, resources: [{ ...base.resources[0], type: "template" }] },
      { ...base, resources: [{ ...base.resources[0], type: "survey-response", id: "cohort:113" }] },
      { ...base, resources: [{ ...base.resources[0], type: "survey-response", id: "../cohort-113" }] },
      { ...base, retention: { retainUntil: "date", reviewAt: "2026-11-08" } },
      { ...base, prerequisites: [] }, { ...base, cleanup: { instructions: "", evidenceRef: "missing" } },
      { ...base, token: "PRIVATE-TOKEN" }, { ...base, actors: [{ ...actor, password: "PRIVATE-TOKEN" }] },
    ]) expect(acceptanceScenarioSchema.safeParse(input).success).toBe(false);
  });
  it("uses stable namespaces for consumables that do not yet have remote row IDs", () => {
    const c = contract();
    c.resources = [{ environment: "dev", type: "survey-response", id: "cohort-113-actor-306", usage: "consume" }];
    expect(acceptanceScenarioSchema.safeParse(c).success).toBe(true);
  });
  it("rejects alternate internal/external ID representations that would bypass an existing resource reservation", () => {
    const dir = directory(), uuidAccount = contract("uuid-account", "write");
    uuidAccount.resources = [{ environment: "dev", type: "account", id: actor.accountId, usage: "write" }];
    expect(runScenarioOperation("acquire", uuidAccount, dir, { now }).status).toBe("RESERVED");
    const numericAccount = { ...uuidAccount, generation: "numeric-account", resources: [{ environment: "dev", type: "account", id: "295", usage: "write" }] };
    expect(runScenarioOperation("acquire", numericAccount, dir, { now })).toMatchObject({ status: "BLOCKED", reason: "invalid-contract" });
    const upperAccount = { ...uuidAccount, generation: "uppercase-account", resources: [{ environment: "dev", type: "account", id: actor.accountId.toUpperCase(), usage: "write" }] };
    expect(runScenarioOperation("acquire", upperAccount, dir, { now })).toMatchObject({ status: "BLOCKED", reason: "resource-conflict" });
    for (const type of ["account", "practice", "survey"]) {
      expect(acceptanceScenarioSchema.safeParse({ ...contract(), resources: [{ environment: "dev", type, id: actor.accountId, usage: "read" }] }).success).toBe(true);
    }
    for (const type of ["organization", "program", "cohort", "practice-template", "comment-template", "checkin", "owner-invitation", "invitation-request"]) {
      expect(acceptanceScenarioSchema.safeParse({ ...contract(), resources: [{ environment: "dev", type, id: "1", usage: "read" }] }).success).toBe(true);
    }
    for (const resource of [
      { environment: "dev", type: "practice", id: "467", usage: "read" },
      { environment: "dev", type: "survey", id: "1", usage: "consume" },
      { environment: "dev", type: "organization", id: actor.accountId, usage: "write" },
      { environment: "dev", type: "practice-template", id: actor.accountId, usage: "write" },
    ]) expect(acceptanceScenarioSchema.safeParse({ ...contract(), resources: [resource] }).success).toBe(false);
    expect(JSON.parse(readFileSync(join(dir, "ledger.json"), "utf8")).reservations).toHaveLength(1);
  });
});

describe("atomic local reservations", () => {
  it("allows read/read sharing and rejects both mutation and consumption against either reader", () => {
    const dir = directory();
    expect(runScenarioOperation("acquire", contract("first"), dir, { now }).status).toBe("RESERVED");
    expect(runScenarioOperation("acquire", contract("second"), dir, { now }).status).toBe("RESERVED");
    for (const usage of ["write", "consume"]) {
      const report = runScenarioOperation("acquire", contract(usage, usage), dir, { now });
      expect(report).toMatchObject({ status: "BLOCKED", reason: "resource-conflict" });
      expect(report.conflicts).toHaveLength(2);
    }
    expect(JSON.parse(readFileSync(join(dir, "ledger.json"), "utf8")).reservations).toHaveLength(2);
  });
  it("does not partially reserve nonconflicting resources when another claim conflicts", () => {
    const dir = directory(); runScenarioOperation("acquire", contract("first", "consume"), dir, { now });
    const attempted = contract("second"); attempted.resources.unshift({ environment: "dev", type: "cohort", id: "777", usage: "write" });
    expect(runScenarioOperation("acquire", attempted, dir, { now }).reason).toBe("resource-conflict");
    const third = contract("third"); third.resources = [{ environment: "dev", type: "cohort", id: "777", usage: "write" }];
    expect(runScenarioOperation("acquire", third, dir, { now }).status).toBe("RESERVED");
  });
  it("is idempotent only for an identical issue/generation contract and preserves its original owner", () => {
    const dir = directory();
    runScenarioOperation("acquire", contract(), dir, { now });
    const before = readFileSync(join(dir, "ledger.json"), "utf8");
    expect(runScenarioOperation("acquire", contract(), dir, { now }).status).toBe("RESERVED");
    expect(readFileSync(join(dir, "ledger.json"), "utf8")).toBe(before);
    expect(runScenarioOperation("acquire", { ...contract(), taskOwner: "different-owner" }, dir, { now }).reason).toBe("generation-contract-drift");
    const tampered = JSON.parse(before); tampered.reservations[0].resources[0].id = "900002";
    writeFileSync(join(dir, "ledger.json"), JSON.stringify(tampered));
    expect(runScenarioOperation("check", contract(), dir, { now }).reason).toBe("reservation-contract-mismatch");
  });
  it("keeps overdue PM fixtures retained and blocking until an explicit documented release", () => {
    const dir = directory(); const past = () => new Date("2030-01-01T00:00:00Z");
    runScenarioOperation("acquire", contract("first", "write"), dir, { now });
    expect(runScenarioOperation("check", contract("first", "write"), dir, { now: past })).toMatchObject({ status: "RETAINED", reviewDue: true });
    expect(runScenarioOperation("acquire", contract("second"), dir, { now: past }).reason).toBe("resource-conflict");
    expect(runScenarioOperation("release", contract("first", "write"), dir, { now: past }).reason).toBe("release-evidence-required");
    expect(runScenarioOperation("release", contract("first", "write"), dir, { now: past, release: { ...release, cleanupEvidence: "" } }).reason).toBe("release-evidence-required");
    expect(runScenarioOperation("release", contract("first", "write"), dir, { now: past, release }).status).toBe("RELEASED");
    expect(runScenarioOperation("acquire", contract("second"), dir, { now: past }).status).toBe("RESERVED");
    const ledger = JSON.parse(readFileSync(join(dir, "ledger.json"), "utf8"));
    expect(ledger.reservations[0]).toMatchObject({ state: "released", release: { ...release } });
    expect(runScenarioOperation("acquire", contract("first", "write"), dir, { now: past }).reason).toBe("generation-released");
    expect(runScenarioOperation("release", contract("first", "write"), dir, { now: past, release }).status).toBe("RELEASED");
    expect(runScenarioOperation("release", contract("first", "write"), dir, { now: past, release: { ...release, outcome: "cancelled" } }).status).toBe("BLOCKED");
  });
  it("does not create state during a missing reservation check or release", () => {
    const dir = join(directory(), "absent");
    expect(runScenarioOperation("check", contract(), dir, { now }).reason).toBe("reservation-not-found");
    expect(runScenarioOperation("release", contract(), dir, { now, release }).reason).toBe("reservation-not-found");
    expect(existsSync(dir)).toBe(false);
  });
  it("fails closed on corrupt, deleted or unexpectedly conflicting persisted state", () => {
    const dir = directory(); runScenarioOperation("acquire", contract(), dir, { now });
    const file = join(dir, "ledger.json"), before = readFileSync(file, "utf8");
    writeFileSync(file, "PRIVATE-CORRUPTION");
    const report = runScenarioOperation("acquire", contract("second"), dir, { now });
    expect(report).toMatchObject({ status: "BLOCKED", reason: "state-unreadable-or-unwritable" });
    expect(JSON.stringify(report)).not.toContain("PRIVATE-CORRUPTION");
    expect(readFileSync(file, "utf8")).toBe("PRIVATE-CORRUPTION");
    writeFileSync(file, before); const ledger = JSON.parse(before);
    ledger.reservations.push({ ...ledger.reservations[0], generation: "collision", resources: [{ ...ledger.reservations[0].resources[0], usage: "write" }] });
    writeFileSync(file, JSON.stringify(ledger));
    expect(runScenarioOperation("check", contract(), dir, { now }).reason).toBe("invalid-ledger");
    unlinkSync(file);
    expect(runScenarioOperation("acquire", contract("second"), dir, { now }).reason).toBe("ledger-missing-after-initialization");
  });
  it("never takes over a stale lock or follows a symlink ledger", () => {
    const dir = directory(); mkdirSync(join(dir, ".lock"));
    expect(runScenarioOperation("acquire", contract(), dir, { now }).reason).toBe("state-locked");
    expect(existsSync(join(dir, ".lock"))).toBe(true);
    rmSync(join(dir, ".lock"), { recursive: true });
    const outside = join(directory(), "untouched.txt"); writeFileSync(outside, "PRIVATE-TOKEN"); unlinkSync(join(dir, "ledger.json")); symlinkSync(outside, join(dir, "ledger.json"));
    expect(runScenarioOperation("acquire", contract(), dir, { now }).reason).toBe("unsafe-ledger-file");
    expect(readFileSync(outside, "utf8")).toBe("PRIVATE-TOKEN");
  });
  it("rejects a shared state directory or ledger/marker readable by other users", () => {
    const dir = directory(); runScenarioOperation("acquire", contract(), dir, { now });
    chmodSync(dir, 0o755);
    expect(runScenarioOperation("check", contract(), dir, { now }).reason).toBe("unsafe-state-directory");
    chmodSync(dir, 0o700); chmodSync(join(dir, "ledger.json"), 0o644);
    expect(runScenarioOperation("check", contract(), dir, { now }).reason).toBe("unsafe-ledger-file");
    chmodSync(join(dir, "ledger.json"), 0o600); chmodSync(join(dir, ".initialized"), 0o644);
    expect(runScenarioOperation("check", contract(), dir, { now }).reason).toBe("invalid-state-marker");
    unlinkSync(join(dir, ".initialized"));
    expect(runScenarioOperation("check", contract(), dir, { now }).reason).toBe("invalid-state-marker");
  });
  it("does not follow a direct state-directory symlink or oversized ledger", () => {
    const dir = directory(), link = join(directory(), "state-link"); symlinkSync(dir, link);
    expect(runScenarioOperation("acquire", contract(), link, { now }).reason).toBe("unsafe-state-directory");
    runScenarioOperation("acquire", contract(), dir, { now });
    writeFileSync(join(dir, "ledger.json"), " ".repeat(10 * 1024 * 1024 + 1));
    expect(runScenarioOperation("check", contract(), dir, { now }).reason).toBe("unsafe-ledger-file");
  });
});
