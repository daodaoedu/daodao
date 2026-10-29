#!/usr/bin/env node
/**
 * Lint a 「請驗收」 comment before posting it (verify-deploy §2.5 step 5).
 *
 * Usage:
 *   pnpm -s tsx bin/pipeline/acceptance-lint.ts <comment.md> [--no-locale]
 *   cat comment.md | pnpm -s tsx bin/pipeline/acceptance-lint.ts -
 *
 * Exit 0 = OK to post, 1 = findings (do not post), 2 = usage error.
 * Quoted copy missing from the f2e zh-TW locale is printed as a warning and does not change the
 * exit code; locale strings are read from projects/daodao-f2e at origin/dev (skip with --no-locale).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { lintAcceptanceComment, lintQuotedCopy } from "./acceptance.js";

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("--") || a === "-");
if (!file) {
  console.error("usage: acceptance-lint.ts <comment.md | -> [--no-locale]");
  process.exit(2);
}
const body = readFileSync(file === "-" ? 0 : file, "utf8");

/** Every string value in packages/i18n/src/locales/zh-TW/*.json at origin/dev; null when unavailable. */
function loadLocaleValues(): string[] | null {
  try {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
    const f2e = path.join(root, "projects", "daodao-f2e");
    const git = (args: string[]) => execFileSync("git", ["-C", f2e, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 });
    const dir = "packages/i18n/src/locales/zh-TW/";
    const files = git(["ls-tree", "--name-only", "origin/dev", dir]).split("\n").filter((f) => f.endsWith(".json"));
    const values: string[] = [];
    const collect = (v: unknown): void => {
      if (typeof v === "string") values.push(v);
      else if (v && typeof v === "object") Object.values(v).forEach(collect);
    };
    for (const f of files) collect(JSON.parse(git(["cat-file", "-p", `origin/dev:${f}`])));
    return values.length ? values : null;
  } catch {
    return null;
  }
}

const findings = lintAcceptanceComment(body);
const localeValues = argv.includes("--no-locale") ? null : loadLocaleValues();
const warnings = localeValues ? lintQuotedCopy(body, localeValues) : [];

for (const f of findings) console.error(`${file}:${f.line}: error [${f.rule}] ${f.message}`);
for (const w of warnings) console.error(`${file}:${w.line}: warn [${w.rule}] ${w.message}`);
if (!localeValues && !argv.includes("--no-locale")) {
  console.error("acceptance-lint: 讀不到 projects/daodao-f2e 的 locale（origin/dev），略過文案檢查");
}
if (findings.length === 0) {
  console.log(`acceptance-lint: OK${warnings.length ? `（${warnings.length} 個文案警告，請確認）` : ""}`);
  process.exit(0);
}
console.error(`acceptance-lint: ${findings.length} error(s)，修正後再發`);
process.exit(1);
