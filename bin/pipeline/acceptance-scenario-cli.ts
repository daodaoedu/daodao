#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { runScenarioOperation, type ScenarioOperation } from "./acceptance-scenario.js";

const args = process.argv.slice(2);
const operation = args.shift();
const operations = ["validate", "acquire", "check", "release"];
const flags = ["--contract", "--state-dir", "--outcome", "--outcome-evidence", "--cleanup-evidence"];
const valid = operation && operations.includes(operation) && args.length % 2 === 0
  && args.every((arg, index) => index % 2 !== 0 || (flags.includes(arg) && args.filter(value => value === arg).length === 1));
const value = (flag: string) => args[args.indexOf(flag) + 1];
if (!valid || !args.includes("--contract") || (operation !== "validate" && !args.includes("--state-dir"))
    || (operation === "release" && ["--outcome", "--outcome-evidence", "--cleanup-evidence"].some(flag => !args.includes(flag)))
    || (operation !== "release" && args.some(arg => ["--outcome", "--outcome-evidence", "--cleanup-evidence"].includes(arg)))) {
  console.error("usage: acceptance-scenario-cli.ts validate|acquire|check|release --contract <file> [--state-dir <shared-private-directory>] [--outcome accepted|cancelled --outcome-evidence <ref> --cleanup-evidence <ref>]");
  process.exit(2);
}
try {
  const contractFile = realpathSync(value("--contract"));
  const state = args.includes("--state-dir") ? resolve(value("--state-dir")) : "";
  if (state) {
    let canonicalState = state;
    try { canonicalState = realpathSync(state); } catch { /* acquire may initialize an absent state dir. */ }
    const location = relative(canonicalState, contractFile);
    if (location === "" || (!location.startsWith("..") && !isAbsolute(location))) {
      console.error("acceptance-scenario: contract must be outside the state directory");
      process.exit(2);
    }
  }
  const contract: unknown = JSON.parse(readFileSync(contractFile, "utf8"));
  const report = runScenarioOperation(operation as ScenarioOperation, contract, state, operation === "release" ? {
    release: { outcome: value("--outcome") as "accepted" | "cancelled", outcomeEvidence: value("--outcome-evidence"), cleanupEvidence: value("--cleanup-evidence") },
  } : {});
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.status === "BLOCKED" ? 1 : 0);
} catch {
  console.error("acceptance-scenario: input-unreadable-json");
  process.exit(2);
}
