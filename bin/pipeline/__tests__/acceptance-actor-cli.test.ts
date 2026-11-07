import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, linkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "actor-cli-")); dirs.push(dir);
  const contract = join(dir, "contract.json"), token = join(dir, "token.txt"), output = join(dir, "report.json");
  writeFileSync(contract, "{}\n"); writeFileSync(token, "private-test-token-value", { mode: 0o600 });
  return { contract, token, output };
}
function run(contract: string, token: string, output: string) {
  return spawnSync(process.execPath, ["--import", "tsx", fileURLToPath(new URL("../acceptance-actor-preflight-cli.ts", import.meta.url)), "--contract", contract, "--token-file", token, "--output", output], { encoding: "utf8" });
}
describe("actor preflight CLI", () => {
  it("returns BLOCKED for an invalid contract without leaking credentials", () => {
    const p = setup(); const result = run(p.contract, p.token, p.output);
    expect(result.status).toBe(1);
    const report = readFileSync(p.output, "utf8");
    expect(JSON.parse(report).status).toBe("BLOCKED");
    expect(report + result.stdout + result.stderr).not.toContain("private-test-token-value");
  });
  it("does not overwrite a token or a hard link to it", () => {
    const p = setup(); linkSync(p.token, p.output);
    expect(run(p.contract, p.token, p.output).status).toBe(2);
    expect(readFileSync(p.token, "utf8")).toBe("private-test-token-value");
    expect(run(p.contract, p.token, p.contract).status).toBe(2);
    expect(readFileSync(p.contract, "utf8")).toBe("{}\n");
  });
  it("returns sanitized diagnostics for an unreadable input", () => {
    const p = setup(); const result = run(p.contract + ".missing", p.token, p.output);
    expect(result.status).toBe(1);
    expect(JSON.parse(readFileSync(p.output, "utf8")).results).toEqual([{ check: "input-readable-json-and-token", status: "BLOCKED" }]);
  });
});
