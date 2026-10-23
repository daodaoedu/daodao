#!/usr/bin/env node
/**
 * Lint a 「請驗收」 comment before posting it (post-merge-wrapup §2.5 step 5).
 *
 * Usage:
 *   pnpm -s tsx bin/pipeline/acceptance-lint.ts <comment.md>
 *   cat comment.md | pnpm -s tsx bin/pipeline/acceptance-lint.ts -
 *
 * Exit 0 = OK to post, 1 = findings (do not post), 2 = usage error.
 */
import { readFileSync } from "node:fs";
import { lintAcceptanceComment } from "./acceptance.js";

const file = process.argv[2];
if (!file) {
  console.error("usage: acceptance-lint.ts <comment.md | ->");
  process.exit(2);
}
const body = readFileSync(file === "-" ? 0 : file, "utf8");
const findings = lintAcceptanceComment(body);
if (findings.length === 0) {
  console.log("acceptance-lint: OK");
  process.exit(0);
}
for (const f of findings) console.error(`${file}:${f.line}: error [${f.rule}] ${f.message}`);
console.error(`acceptance-lint: ${findings.length} error(s)，修正後再發`);
process.exit(1);
