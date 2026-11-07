#!/usr/bin/env node
/** Read-only fixture check; credentials are read from a private file and never printed. */
import { readFileSync, writeFileSync, existsSync, realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { runActorPreflight, type ActorPreflightReport } from "./acceptance-actor-preflight.js";

const args = process.argv.slice(2);
const flags = ["--contract", "--token-file", "--output"];
if (args.length !== 6 || flags.some(flag => args.filter(value => value === flag).length !== 1) || args.some((value, index) => index % 2 === 0 && !flags.includes(value))) {
  console.error("usage: acceptance-actor-preflight-cli.ts --contract <contract.json> --token-file <private-token-file> --output <report.json>");
  process.exit(2);
}
const value = (flag: string) => args[args.indexOf(flag) + 1];
const canonicalPath = (path: string) => existsSync(path) ? realpathSync(path) : resolve(path);
const sameFile = (input: string, output: string): boolean => {
  if (canonicalPath(input) === canonicalPath(output)) return true;
  if (!existsSync(input) || !existsSync(output)) return false;
  const inputStat = statSync(input);
  const outputStat = statSync(output);
  return inputStat.dev === outputStat.dev && inputStat.ino === outputStat.ino;
};
if (["--contract", "--token-file"].some(flag => sameFile(value(flag), value("--output")))) {
  console.error("acceptance-actor-preflight: output must not overwrite an input file");
  process.exit(2);
}
let report: ActorPreflightReport;
try {
  const contract: unknown = JSON.parse(readFileSync(value("--contract"), "utf8"));
  const token = readFileSync(value("--token-file"), "utf8");
  report = await runActorPreflight(contract, token);
} catch {
  report = { googleLogin: "NOT_VERIFIED", accountActive: "NOT_VERIFIED", organizationRole: "NOT_VERIFIED", cohortCoachRole: "NOT_VERIFIED", checkedAt: new Date().toISOString(), contractDigest: null, status: "BLOCKED", results: [{ check: "input-readable-json-and-token", status: "BLOCKED" }] };
}
try {
  writeFileSync(value("--output"), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
} catch {
  console.error("acceptance-actor-preflight: BLOCKED (report could not be written)");
  process.exit(2);
}
console.log(`acceptance-actor-preflight: ${report.status}`);
for (const check of report.results) console.log(`${check.status} ${check.check}`);
process.exit(report.status === "PASS" ? 0 : 1);
