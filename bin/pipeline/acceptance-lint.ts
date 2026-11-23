#!/usr/bin/env node
/**
 * Lint a 「請驗收」 comment before posting it (verify-deploy §2.5 step 5).
 *
 * Usage:
 *   pnpm -s tsx bin/pipeline/acceptance-lint.ts <comment.md> --issue <n> --coverage <ledger.json> [--no-locale]
 *   pnpm -s tsx bin/pipeline/acceptance-lint.ts <comment.md> --text-only [--no-locale]
 *   cat comment.md | pnpm -s tsx bin/pipeline/acceptance-lint.ts - --issue <n> --coverage <ledger.json>
 *
 * Exit 0 = requested checks passed; text-only/partial never authorize whole-issue closure.
 * Exit 1 = findings (do not post/close), 2 = usage error.
 * Quoted copy missing from the f2e zh-TW locale is printed as a warning and does not change the
 * exit code; locale strings are read from projects/daodao-f2e at origin/dev (skip with --no-locale).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { lintAcceptanceComment, lintQuotedCopy } from "./acceptance.js";
import { acceptanceCoverageSchema, type EngineeringEvidence, lintAcceptanceCoverage, lintAcceptanceClosure } from "./acceptance-coverage.js";

const argv = process.argv.slice(2);
let file: string | undefined;
let issue: string | undefined;
let coverageFile: string | undefined;
let reportComment: string | undefined;
let textOnly = false;
let noLocale = false;
const usage = () => {
  console.error("usage: acceptance-lint.ts <comment.md | -> --issue <n> --coverage <coverage.json> [--report-comment <PM comment id>] [--no-locale] | --text-only");
  process.exit(2);
};
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--issue" || arg === "--coverage" || arg === "--report-comment") {
    const value = argv[++i];
    if (!value || value.startsWith("--")) usage();
    if (arg === "--issue") issue = value;
    else if (arg === "--coverage") coverageFile = value;
    else reportComment = value;
  } else if (arg === "--text-only") textOnly = true;
  else if (arg === "--no-locale") noLocale = true;
  else if (arg.startsWith("--") || file) usage();
  else file = arg;
}
if (!file || (textOnly && (issue || coverageFile || reportComment))) usage();
if ((issue && !/^[1-9]\d*$/.test(issue)) || (reportComment && !/^[1-9]\d*$/.test(reportComment))) usage();
const inputFile = file!;
const body = readFileSync(inputFile === "-" ? 0 : inputFile, "utf8");
const marked = /<!--\s*daodao:acceptance-request\s*-->/.test(body);
let coverageStatus = "wording-only; AC coverage unchecked; not closure-ready";
const coverageFindings: string[] = [];
if (!textOnly && (marked || issue || coverageFile || reportComment)) {
  if (!issue || !coverageFile) coverageFindings.push("coverage-required: marked handoff needs --issue and --coverage; --text-only checks wording only and never authorizes closure");
  else {
    try {
      const gh = (args: string[]) => JSON.parse(execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 8 << 20 }));
      const source = gh(["issue", "view", issue, "--repo", "daodaoedu/daodao", "--json", "url,body"]);
      const coverage: unknown = JSON.parse(readFileSync(coverageFile, "utf8"));
      const engineeringEvidence: Record<number, EngineeringEvidence> = {};
      const parsed = acceptanceCoverageSchema.safeParse(coverage);
      if (parsed.success) for (const item of parsed.data.dispositions) {
        if (item.kind !== "engineering-only") continue;
        const evidence = gh(["api", `repos/daodaoedu/daodao/issues/comments/${item.commentId}`]);
        const permission = gh(["api", `repos/daodaoedu/daodao/collaborators/${evidence.user.login}/permission`]);
        engineeringEvidence[item.commentId] = { body: evidence.body, issue_url: evidence.issue_url, permission: permission.permission };
      }
      const result = lintAcceptanceCoverage(source, body, coverage, engineeringEvidence);
      coverageFindings.push(...result.findings);
      coverageStatus = result.fullCoverage ? "full Required AC plan covered; PM execution pending; not closure-ready" : "partial handoff; not closure-ready";
      if (reportComment) {
        const report = gh(["api", `repos/daodaoedu/daodao/issues/comments/${reportComment}`]);
        const specId = report.body?.match(/<!--\s*daodao:acceptance-report spec=(\d+) result=(?:PASS|FAIL|BLOCKED)\s*-->/)?.[1];
        if (!specId) coverageFindings.push("PM report has no exact spec binding");
        else {
          const spec = gh(["api", `repos/daodaoedu/daodao/issues/comments/${specId}`]);
          const pages = gh(["api", `repos/daodaoedu/daodao/issues/${issue}/comments?per_page=100`, "--paginate", "--slurp"]);
          const comments = pages.flat().sort((a: { created_at: string; id: number }, b: { created_at: string; id: number }) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id);
          const latest = {
            reportId: comments.find((c: { body: string; user?: { login?: string } }) => c.user?.login === "peggy1213-create" && /<!--\s*daodao:acceptance-report\b/.test(c.body))?.id,
            specId: comments.find((c: { body: string }) => /<!--\s*daodao:acceptance-request\s*-->/.test(c.body))?.id,
          };
          coverageFindings.push(...lintAcceptanceClosure(source, body, coverage, report, spec, latest, engineeringEvidence));
          if (coverageFindings.length === 0) coverageStatus = "full Required AC PM PASS covered; closure-ready (manual GitHub bypass remains possible)";
        }
      }
    } catch {
      coverageFindings.push("coverage source/evidence unavailable or invalid; no full-issue approval");
    }
  }
}

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
const localeValues = noLocale ? null : loadLocaleValues();
const warnings = localeValues ? lintQuotedCopy(body, localeValues) : [];

for (const f of findings) console.error(`${file}:${f.line}: error [${f.rule}] ${f.message}`);
for (const w of warnings) console.error(`${file}:${w.line}: warn [${w.rule}] ${w.message}`);
if (!localeValues && !noLocale) {
  console.error("acceptance-lint: 讀不到 projects/daodao-f2e 的 locale（origin/dev），略過文案檢查");
}
for (const finding of coverageFindings) console.error(`${inputFile}: error [acceptance-coverage] ${finding}`);
if (findings.length === 0 && coverageFindings.length === 0) {
  console.log(`acceptance-lint: OK${warnings.length ? `（${warnings.length} 個文案警告，請確認）` : ""}; ${coverageStatus}`);
  process.exit(0);
}
console.error(`acceptance-lint: ${findings.length + coverageFindings.length} error(s)，修正後再發`);
process.exit(1);
