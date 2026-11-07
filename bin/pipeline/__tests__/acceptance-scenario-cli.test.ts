import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const paths: string[] = [];
afterEach(() => paths.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "scenario-cli-")); paths.push(dir);
  const contract = {
    kind: "acceptance-scenario", version: 1, issue: "https://github.com/daodaoedu/daodao/issues/480", generation: "first", taskOwner: "test-task",
    actors: [{ kind: "actor-access", accountId: "6a542fe3-7bba-42f7-844a-deb9489bd85e", accountEmail: "pm@example.com", expectedRoles: ["User"] }],
    resources: [{ environment: "dev", type: "cohort", id: "900001", usage: "consume" }],
    prerequisites: [{ description: "Check membership", evidenceRef: "evidence/preflight.json" }],
    retention: { retainUntil: "pm-accepted", reviewAt: "2026-11-08T00:00:00Z" },
    cleanup: { instructions: "DO NOT EXECUTE: $(touch forbidden)", evidenceRef: "cleanup.json" },
    rebuild: { instructions: "Keep text as data", evidenceRef: "rebuild.md" },
  };
  const file = join(dir, "contract.json"), state = join(dir, "state"); writeFileSync(file, JSON.stringify(contract));
  return { dir, contract, file, state };
}
const cli = fileURLToPath(new URL("../acceptance-scenario-cli.ts", import.meta.url));
const args = (operation: string, file: string, state: string) => ["--import", import.meta.resolve("tsx"), cli, operation, "--contract", file, "--state-dir", state];
function asyncRun(arguments_: string[]) {
  return new Promise<{ status: number | null; stdout: string }>((resolve, reject) => {
    const child = spawn(process.execPath, arguments_, { stdio: ["ignore", "pipe", "pipe"] }); let stdout = "";
    child.stdout.on("data", value => { stdout += value; }); child.on("error", reject);
    child.on("close", status => resolve({ status, stdout }));
  });
}
describe("scenario CLI", () => {
  it("serializes separate processes so two consumptions cannot both reserve the same scope", async () => {
    const p = setup(), second = join(p.dir, "second.json");
    writeFileSync(second, JSON.stringify({ ...p.contract, generation: "second" }));
    const results = await Promise.all([asyncRun(args("acquire", p.file, p.state)), asyncRun(args("acquire", second, p.state))]);
    expect(results.filter(value => value.status === 0)).toHaveLength(1);
    expect(results.filter(value => value.status === 1)).toHaveLength(1);
    expect(results.map(value => JSON.parse(value.stdout).status).sort()).toEqual(["BLOCKED", "RESERVED"]);
    expect(JSON.parse(readFileSync(join(p.state, "ledger.json"), "utf8")).reservations).toHaveLength(1);
  });
  it("requires explicit outcome and cleanup evidence to release, retaining audit history", () => {
    const p = setup();
    expect(spawnSync(process.execPath, args("acquire", p.file, p.state)).status).toBe(0);
    expect(spawnSync(process.execPath, args("release", p.file, p.state)).status).toBe(2);
    const result = spawnSync(process.execPath, [...args("release", p.file, p.state), "--outcome", "cancelled", "--outcome-evidence", "notes/cancellation.md", "--cleanup-evidence", "evidence/readback.json"], { encoding: "utf8" });
    expect(result.status).toBe(0); expect(JSON.parse(result.stdout).status).toBe("RELEASED");
    expect(JSON.parse(readFileSync(join(p.state, "ledger.json"), "utf8")).reservations[0].release).toMatchObject({ outcome: "cancelled", outcomeEvidence: "notes/cancellation.md", cleanupEvidence: "evidence/readback.json" });
  });
  it("does not execute manifest text or include actor email/text in reports", () => {
    const p = setup(); const result = spawnSync(process.execPath, args("acquire", p.file, p.state), { encoding: "utf8", cwd: p.dir });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).not.toMatch(/pm@example|touch forbidden|DO NOT EXECUTE/);
    expect(() => readFileSync(join(p.dir, "forbidden"))).toThrow();
  });
  it("sanitizes unreadable contract errors and refuses to use an input inside state storage", () => {
    const p = setup(); writeFileSync(p.file, "PRIVATE MALFORMED TOKEN");
    const bad = spawnSync(process.execPath, args("acquire", p.file, p.state), { encoding: "utf8" });
    expect(bad.status).toBe(2); expect(bad.stdout + bad.stderr).not.toContain("PRIVATE MALFORMED TOKEN");
    const same = spawnSync(process.execPath, args("acquire", p.file, p.dir), { encoding: "utf8" });
    expect(same.status).toBe(2); expect(readFileSync(p.file, "utf8")).toBe("PRIVATE MALFORMED TOKEN");
  });
});
