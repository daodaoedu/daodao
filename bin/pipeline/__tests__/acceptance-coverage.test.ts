import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const cli = resolve("bin/pipeline/acceptance-lint.ts");
const draft = `<!-- daodao:acceptance-request -->
## 🙋 請驗收：邀請
@peggy1213-create
## 驗收步驟
1. 建立邀請，應看到待加入（AC-02）。
## 工程證據（已驗，PM 不需重做）
AC-03 沿用既有帳號真Google工程證據。
## 驗完收尾
保留資料。
`;

describe("acceptance-lint coverage entry point", () => {
  it("rejects a marked handoff that only checks admin steps without original AC coverage", () => {
    const dir = mkdtempSync(join(tmpdir(), "acceptance-coverage-"));
    try {
      const file = join(dir, "draft.md"); writeFileSync(file, draft);
      const result = spawnSync(process.execPath, ["--import", "tsx", cli, file, "--no-locale"], { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("coverage-required");
    } finally { rmSync(dir, { recursive: true }); }
  });
});

import { acceptanceDigest, acceptanceStepLines, lintAcceptanceClosure, lintAcceptanceCoverage, requiredAcceptanceIds } from "../acceptance-coverage.js";
const source = {
  url: "https://github.com/daodaoedu/daodao/issues/463",
  body: `## 驗收契約\n| AC ID | Required | Given／When／Then |\n|---|---|---|\n| AC-02 | yes | 未註冊Email收邀請 |\n| AC-03 | yes | 新收件者同Email Google註冊、接受並看到組織 |\n| AC-06 | yes | 使用過顯示已使用（工程驗收項：另以 API 驗證外流不授權） |\n| AC-99 | no | optional |\n`,
};
const completeDraft = draft.replace("## 工程證據", "2. 同 Email 註冊並接受，應看到燈塔組織（AC-03）。\n3. 換另一帳號開舊連結，應看到已使用（AC-06）。\n## 工程證據");
const ledger = (body = completeDraft) => ({
  schemaVersion: 1,
  issue: source.url,
  source_sha256: acceptanceDigest(source.body),
  draft_sha256: acceptanceDigest(body),
  scope: "full",
  dispositions: ["AC-02", "AC-03", "AC-06"].map((ac, index) => ({ ac, kind: "pm-steps", steps: [{ number: index + 1, sha256: acceptanceDigest(acceptanceStepLines(body).get(index + 1) ?? "missing") }] })),
});
const pmReport = { id: 200, issue_url: "https://api.github.com/repos/daodaoedu/daodao/issues/463", user: { login: "peggy1213-create" }, body: "<!-- daodao:acceptance-report spec=100 result=PASS -->\n| AC | 結果 |\n|---|---|\n| AC-02 | PASS |\n| AC-03 | PASS |\n| AC-06 | PASS |" };

describe("original Required AC coverage", () => {
  it("accepts full mapped PM plan while excluding optional AC", () => {
    expect(lintAcceptanceCoverage(source, completeDraft, ledger())).toEqual({ findings: [], fullCoverage: true, required: ["AC-02", "AC-03", "AC-06"] });
  });
  it("rejects the incident pattern: admin steps plus reused engineering prose cannot cover first-registration AC", () => {
    const value = ledger(draft); value.dispositions = value.dispositions.slice(0, 1);
    expect(lintAcceptanceCoverage(source, draft, value).findings).toContain("missing disposition AC-03");
  });
  it("cannot map first-registration AC onto an unrelated admin step", () => {
    const value = ledger(); value.dispositions[1].steps = value.dispositions[0].steps;
    expect(lintAcceptanceCoverage(source, completeDraft, value).findings.join("\n")).toContain("AC-03 must be explicitly mapped");
  });
  it.each(["source_sha256", "draft_sha256"] as const)("rejects stale %s", (field) => {
    const value = ledger(); value[field] = "0".repeat(64);
    expect(lintAcceptanceCoverage(source, completeDraft, value).findings.length).toBeGreaterThan(0);
  });
  it("rejects a step whose input or expected result changed after review", () => {
    const value = ledger();
    const body = completeDraft.replace("應看到燈塔組織", "只要能登入"); value.draft_sha256 = acceptanceDigest(body);
    expect(lintAcceptanceCoverage(source, body, value).findings).toContain("AC-03 PM step 2 missing or changed");
  });
  it("rejects duplicate, missing and unknown dispositions", () => {
    const value = ledger(); value.dispositions = [value.dispositions[0], value.dispositions[0], { ...value.dispositions[1], ac: "AC-77" }];
    const findings = lintAcceptanceCoverage(source, completeDraft, value).findings;
    expect(findings).toEqual(expect.arrayContaining(["duplicate disposition AC-02", "unknown or nonrequired AC AC-77", "missing disposition AC-03", "missing disposition AC-06"]));
  });
  it("allows explicitly partial repair handoff, never full approval", () => {
    const value = { ...ledger(), scope: "partial", dispositions: [ledger().dispositions[0], ...["AC-03", "AC-06"].map(ac => ({ ac, kind: "pending", reason: "尚未實跑" }))] };
    expect(lintAcceptanceCoverage(source, completeDraft, value)).toMatchObject({ findings: [], fullCoverage: false });
    expect(lintAcceptanceClosure(source, completeDraft, value, pmReport, { id: 100, body: completeDraft }, { reportId: 200, specId: 100 })).toContain("partial or incomplete coverage cannot close the issue");
  });
  it("rejects pending AC in full-scope handoff", () => {
    const value = { ...ledger(), dispositions: [ledger().dispositions[0], { ac: "AC-03", kind: "pending", reason: "尚未驗" }, ledger().dispositions[2]] };
    expect(lintAcceptanceCoverage(source, completeDraft, value).findings).toContain("AC-03 remains pending; cannot hand off as full issue");
  });
  it.each(["engineering", "prior-pm-pass"])("does not accept self-declared %s as required PM coverage", kind => {
    const value = { ...ledger(), dispositions: [ledger().dispositions[0], { ac: "AC-03", kind, evidence: "https://example.com/report" }, ledger().dispositions[2]] };
    expect(lintAcceptanceCoverage(source, completeDraft, value).fullCoverage).toBe(false);
  });
  it("does not downgrade mixed PM/API AC06 to engineering-only", () => {
    const value = { ...ledger(), dispositions: [...ledger().dispositions.slice(0, 2), { ac: "AC-06", kind: "engineering" }] };
    expect(lintAcceptanceCoverage(source, completeDraft, value).fullCoverage).toBe(false);
  });
  it.each([source.body.replace("| yes |", "| maybe |"), source.body.replace("AC-03", "AC-02"), source.body + source.body, source.body.replace("|---|---|---|", "| AC-01 | yes | skipped |"), "no contract"])("fails closed on unparseable source", body => {
    expect(() => requiredAcceptanceIds(body)).toThrow();
  });
});

describe("full-issue closure against fetched PM evidence", () => {
  const check = (report = pmReport, spec = { id: 100, body: completeDraft }, latest = { reportId: 200, specId: 100 }) => lintAcceptanceClosure(source, completeDraft, ledger(), report, spec, latest);
  it("accepts actual PM PASS rows for every Required AC and exact latest spec", () => expect(check()).toEqual([]));
  it("rejects prose PASS outside an exact result column", () => {
    expect(check({ ...pmReport, body: "<!-- daodao:acceptance-report spec=100 result=PASS -->\n| AC | 預期 | 結果 |\n|---|---|---|\n| AC-03 | Expected PASS | 未執行 |" })).toContain("AC-03 has no complete PM PASS rows");
    expect(check({ ...pmReport, body: "<!-- daodao:acceptance-report spec=100 result=PASS -->\n| AC-03 | PASS |" })).toContain("AC-03 has no complete PM PASS rows");
  });
  it("rejects a six-step subset PASS as full issue acceptance", () => expect(check({ ...pmReport, body: pmReport.body.replace("| AC-03 | PASS |", "") })).toContain("AC-03 has no complete PM PASS rows"));
  it.each(["FAIL", "BLOCKED"])("rejects any %s row despite overall PASS", status => expect(check({ ...pmReport, body: pmReport.body + `\n| AC-03 | ${status} |` })).toContain("AC-03 has no complete PM PASS rows"));
  it("rejects contradictory multiple report markers", () => {
    expect(check({ ...pmReport, body: pmReport.body + "\n<!-- daodao:acceptance-report spec=100 result=FAIL -->" })).toContain("PM report must PASS this exact spec");
  });
  it("rejects another issue, another author, and changed spec", () => {
    expect(check({ ...pmReport, issue_url: "https://api.github.com/repos/daodaoedu/daodao/issues/1", user: { login: "vincentxuu" } }, { id: 100, body: draft })).toEqual(expect.arrayContaining(["PM report belongs to another issue", "closure requires the actual PM report author", "PM report spec differs from the frozen handoff draft"]));
  });
  it("rejects old PASS after a newer report or handoff", () => {
    expect(check(pmReport, { id: 100, body: completeDraft }, { reportId: 201, specId: 101 })).toEqual(expect.arrayContaining(["a newer acceptance report supersedes this result", "a newer acceptance request supersedes this spec"]));
  });
});

describe("engineering-only source classification", () => {
  const engineeringSource = { ...source, body: "| AC ID | Required | Given／When／Then | 驗收方式 |\n|---|---|---|---|\n| AC-01 | yes | 私有回應不洩漏 | 僅工程驗收 |\n" };
  const value = { ...ledger(), source_sha256: acceptanceDigest(engineeringSource.body), dispositions: [{ ac: "AC-01", kind: "engineering-only", commentId: 50 }] };
  const evidence = { 50: { issue_url: pmReport.issue_url, permission: "write", body: `<!-- daodao:engineering-evidence source_sha256=${acceptanceDigest(engineeringSource.body)} -->\n| AC | 結果 |\n|---|---|\n| AC-01 | PASS |` } };
  it("accepts source explicitly classified engineering-only with fetched authorized and source-bound evidence", () => {
    expect(lintAcceptanceCoverage(engineeringSource, completeDraft, value, evidence)).toMatchObject({ findings: [], fullCoverage: true });
  });
  it("rejects missing evidence, another issue/permission/source, and failed rows", () => {
    expect(lintAcceptanceCoverage(engineeringSource, completeDraft, value).fullCoverage).toBe(false);
    for (const change of [{ issue_url: "other" }, { permission: "read" }, { body: "| AC-01 | PASS |" }, { body: evidence[50].body.replace("PASS", "FAIL") }]) {
      expect(lintAcceptanceCoverage(engineeringSource, completeDraft, value, { 50: { ...evidence[50], ...change } }).fullCoverage).toBe(false);
    }
  });
  it("requires PM rows for mixed source even when engineer evidence exists", () => {
    const mixed = { ...ledger(), dispositions: [...ledger().dispositions.slice(0, 2), { ac: "AC-06", kind: "engineering-only", commentId: 50 }] };
    expect(lintAcceptanceCoverage(source, completeDraft, mixed, evidence).findings).toContain("AC-06 is not explicitly engineering-only in original source");
  });
});

function runCli(options: { body?: string; coverage?: unknown; report?: typeof pmReport; latestReport?: number; args?: string[]; reportComment?: boolean }) {
  const dir = mkdtempSync(join(tmpdir(), "acceptance-coverage-cli-"));
  try {
    writeFileSync(join(dir, "draft.md"), options.body ?? completeDraft);
    writeFileSync(join(dir, "coverage.json"), JSON.stringify(options.coverage ?? ledger()));
    const ghScript = `#!/usr/bin/env node
const a=process.argv.slice(2); const source=${JSON.stringify(source)}; const report=${JSON.stringify(options.report ?? pmReport)};
if(a[0]==='issue') process.stdout.write(JSON.stringify(source));
else if(a[1].includes('?per_page=')) process.stdout.write(JSON.stringify([[{id:100,created_at:'2026-11-08T00:00:00Z',body:${JSON.stringify(completeDraft)}},{id:${options.latestReport ?? 200},created_at:'2026-11-08T00:01:00Z',user:{login:'peggy1213-create'},body:report.body}]]));
else if(a[1].endsWith('/200')) process.stdout.write(JSON.stringify(report));
else if(a[1].endsWith('/100')) process.stdout.write(JSON.stringify({id:100,body:${JSON.stringify(completeDraft)}}));
else process.exit(2);
`;
    writeFileSync(join(dir, "gh"), ghScript, { mode: 0o755 });
    return spawnSync(process.execPath, ["--import", "tsx", cli, join(dir, "draft.md"), "--no-locale", ...(options.args ?? ["--issue", "463", "--coverage", join(dir, "coverage.json")]), ...(options.reportComment ? ["--report-comment", "200"] : [])], { encoding: "utf8", env: { ...process.env, PATH: `${dir}:${process.env.PATH}` } });
  } finally { rmSync(dir, { recursive: true }); }
}

describe("real CLI coverage behavior using controlled read-only gh boundary", () => {
  it("explicit text-only mode succeeds without claiming complete acceptance", () => {
    const result = runCli({ args: ["--text-only"] });
    expect(result.status).toBe(0); expect(result.stdout).toContain("AC coverage unchecked; not closure-ready");
  });
  it("accepts complete live-source-bound handoff plan but does not claim PM execution", () => {
    const result = runCli({}); expect(result.status).toBe(0); expect(result.stdout).toContain("PM execution pending; not closure-ready");
  });
  it("rejects reused engineering prose when first-registration disposition is missing", () => {
    const value = ledger(); value.dispositions.splice(1, 1);
    const result = runCli({ coverage: value }); expect(result.status).toBe(1); expect(result.stderr).toContain("missing disposition AC-03");
  });
  it("checks actual report/spec reads before reporting closure-ready", () => {
    const result = runCli({ reportComment: true }); expect(result.status).toBe(0); expect(result.stdout).toContain("closure-ready (manual GitHub bypass remains possible)");
  });
  it("refuses an older PASS after a newer report", () => {
    const result = runCli({ reportComment: true, latestReport: 201 }); expect(result.status).toBe(1); expect(result.stderr).toContain("newer acceptance report");
  });
  it("rejects malformed CLI switches instead of interpreting values as files", () => {
    expect(runCli({ args: ["--issue", "--coverage", "missing"] }).status).toBe(2);
    expect(runCli({ args: ["--text-only", "--issue", "463"] }).status).toBe(2);
  });
});


describe("documented coverage generator", () => {
  it.each([
    { name: "complete realistic PM handoff", body: completeDraft, scope: "full", pending: [] },
    { name: "admin-only handoff missing first-registration", body: draft, scope: "partial", pending: ["AC-03", "AC-06"] },
  ])("executes the canonical fenced JavaScript for $name", ({ body, scope, pending }) => {
    const reference = readFileSync(resolve("plugin/skills/test-acceptance/references/ac-coverage.md"), "utf8");
    const example = reference.match(/<<'JS'\n([\s\S]*?)\nJS\n/);
    expect(example).not.toBeNull();
    const dir = mkdtempSync(join(tmpdir(), "acceptance-reference-"));
    try {
      const sourceFile = join(dir, "source.json");
      const draftFile = join(dir, "handoff.md");
      const outputFile = join(dir, "coverage.json");
      writeFileSync(sourceFile, JSON.stringify(source));
      writeFileSync(draftFile, body);
      // Execute only the checked-in trusted reference, never commands from issue/source data.
      const run = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-", sourceFile, draftFile, outputFile], { input: example![1], encoding: "utf8" });
      expect(run.status, run.stderr).toBe(0);
      const output = JSON.parse(readFileSync(outputFile, "utf8"));
      expect(output.scope).toBe(scope);
      expect(output.dispositions.filter((item: { kind: string }) => item.kind === "pending").map((item: { ac: string }) => item.ac)).toEqual(pending);
      expect(output.dispositions.find((item: { ac: string }) => item.ac === "AC-02")).toMatchObject({ kind: "pm-steps", steps: [{ number: 1, sha256: acceptanceDigest(acceptanceStepLines(body).get(1)!) }] });
      expect(lintAcceptanceCoverage(source, body, output)).toMatchObject({ findings: [], fullCoverage: scope === "full" });
    } finally { rmSync(dir, { recursive: true }); }
  });
});

describe("normative Markdown versus examples", () => {
  it("does not let an unrelated earlier row override the normative PM classification", () => {
    const normative = { ...source, body: "| AC-01 | yes | sample | 僅工程驗收 |\n\n| AC ID | Required | Given／When／Then | 驗收方式 |\n|---|---|---|---|\n| AC-01 | yes | PM可見畫面 | PM |\n" };
    const value = { ...ledger(), source_sha256: acceptanceDigest(normative.body), dispositions: [{ ac: "AC-01", kind: "engineering-only", commentId: 50 }] };
    const evidence = { 50: { issue_url: pmReport.issue_url, permission: "write", body: `<!-- daodao:engineering-evidence source_sha256=${acceptanceDigest(normative.body)} -->\n| AC | 結果 |\n|---|---|\n| AC-01 | PASS |` } };
    expect(lintAcceptanceCoverage(normative, completeDraft, value, evidence).findings).toContain("AC-01 is not explicitly engineering-only in original source");
  });
  it.each([
    (text: string) => `\n\x60\x60\x60markdown\n${text}\n\x60\x60\x60\n`,
    (text: string) => `\n~~~markdown\n${text}\n~~~\n`,
    (text: string) => `\n<!--\n${text}\n-->\n`,
  ])("ignores source, steps and result tables inside examples/comments", wrap => {
    expect(() => requiredAcceptanceIds(wrap(source.body))).toThrow();
    expect(acceptanceStepLines(wrap(completeDraft.replace(/<!--[\s\S]*?-->/g, ""))).size).toBe(0);
    const sampleResults = pmReport.body.slice(pmReport.body.indexOf("\n") + 1);
    const result = lintAcceptanceClosure(source, completeDraft, ledger(), { ...pmReport, body: "<!-- daodao:acceptance-report spec=100 result=PASS -->" + wrap(sampleResults) }, { id: 100, body: completeDraft }, { reportId: 200, specId: 100 });
    expect(result).toContain("AC-03 has no complete PM PASS rows");
  });
});


describe("review regressions for Required AC classification", () => {
  it("does not waive a PM-mapped engineering AC without any actual PASS", () => {
    const classified = { ...source, body: "| AC ID | Required | 驗收方式 |\n|---|---|---|\n| AC-02 | yes | 僅工程驗收 |" };
    const value = { ...ledger(), source_sha256: acceptanceDigest(classified.body), dispositions: ledger().dispositions.slice(0, 1) };
    const report = { ...pmReport, body: "<!-- daodao:acceptance-report spec=100 result=PASS -->" };
    expect(lintAcceptanceClosure(classified, completeDraft, value, report, { id: 100, body: completeDraft }, { reportId: 200, specId: 100 })).toContain("AC-02 has no complete PM PASS rows");
  });
  it("accepts a PM-mapped engineering AC when it actually has a PM PASS", () => {
    const classified = { ...source, body: "| AC ID | Required | 驗收方式 |\n|---|---|---|\n| AC-02 | yes | 僅工程驗收 |" };
    const value = { ...ledger(), source_sha256: acceptanceDigest(classified.body), dispositions: ledger().dispositions.slice(0, 1) };
    expect(lintAcceptanceClosure(classified, completeDraft, value, pmReport, { id: 100, body: completeDraft }, { reportId: 200, specId: 100 })).toEqual([]);
  });
  it("rejects unsupported table continuation instead of dropping a Required AC", () => {
    expect(() => requiredAcceptanceIds("| AC ID | Required | Details |\n|---|---|---|\n| AC-01 | yes | a |\nAC-02 | yes | b |")).toThrow();
  });
  it.each(["`AC-02`", "AC-X"])("rejects unsupported table-like continuation %s without silently ending the AC table", identifier => {
    expect(() => requiredAcceptanceIds(`| AC ID | Required | Details |\n|---|---|---|\n| AC-01 | yes | a |\n${identifier} | yes | b |`)).toThrow();
  });
  it("preserves canonical whole-AC engineering suffix without excluding a mixed subbranch", () => {
    const classified = { ...source, body: "| AC ID | Required | Given／When／Then |\n|---|---|---|\n| AC-02 | yes | API拒絕錯誤輸入（工程驗收項） |" };
    const value = { ...ledger(), source_sha256: acceptanceDigest(classified.body), dispositions: [{ ac: "AC-02", kind: "engineering-only", commentId: 50 }] };
    const evidence = { 50: { issue_url: pmReport.issue_url, permission: "write", body: `<!-- daodao:engineering-evidence source_sha256=${acceptanceDigest(classified.body)} -->\n| AC | 結果 |\n|---|---|\n| AC-02 | PASS |` } };
    expect(lintAcceptanceCoverage(classified, completeDraft, value, evidence).fullCoverage).toBe(true);
    const mixed = { ...classified, body: classified.body.replace("（工程驗收項）", "（工程驗收項：另以API驗證）") };
    expect(lintAcceptanceCoverage(mixed, completeDraft, { ...value, source_sha256: acceptanceDigest(mixed.body) }, evidence).fullCoverage).toBe(false);
  });
});
