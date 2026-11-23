/** Original Required AC coverage, separate from wording and evidence truth. */
import { createHash } from "node:crypto";
import { z } from "zod";

export const acceptanceDigest = (text: string): string => createHash("sha256").update(text).digest("hex");
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const pmStep = z.object({ number: z.number().int().positive(), sha256: digest }).strict();
const disposition = z.discriminatedUnion("kind", [
  z.object({ ac: z.string().regex(/^AC-\d+$/), kind: z.literal("pm-steps"), steps: z.array(pmStep).min(1) }).strict(),
  z.object({ ac: z.string().regex(/^AC-\d+$/), kind: z.literal("pending"), reason: z.string().trim().min(1) }).strict(),
  z.object({ ac: z.string().regex(/^AC-\d+$/), kind: z.literal("engineering-only"), commentId: z.number().int().positive() }).strict(),
]);
export const acceptanceCoverageSchema = z.object({
  schemaVersion: z.literal(1),
  issue: z.string().regex(/^https:\/\/github\.com\/daodaoedu\/daodao\/issues\/[1-9]\d*$/),
  source_sha256: digest,
  draft_sha256: digest,
  scope: z.enum(["full", "partial"]),
  dispositions: z.array(disposition).min(1),
}).strict();
export type AcceptanceCoverage = z.infer<typeof acceptanceCoverageSchema>;
export type CoverageSource = { url: string; body: string };
export type EngineeringEvidence = { body: string; issue_url: string; permission: string };
export type CoverageResult = { findings: string[]; fullCoverage: boolean; required: string[] };

/** Examples/comments are data, not normative tables, PM steps or observed results. */
function markdownLines(body: string): string[] {
  const lines = body.replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, text => text.replace(/[^\n]/g, " ")).split("\n");
  let fence: { char: string; length: number } | undefined;
  return lines.map(line => {
    const match = line.match(/^\s*(`{3,}|~{3,})/);
    if (match && !fence) { fence = { char: match[1][0], length: match[1].length }; return ""; }
    if (fence) {
      if (match && match[1][0] === fence.char && match[1].length >= fence.length && line.trim() === match[1]) fence = undefined;
      return "";
    }
    return line;
  });
}

/** Fail closed on missing/multiple contracts rather than guessing which prose is normative. */
export function requiredAcceptanceIds(body: string): string[] {
  const lines = markdownLines(body);
  const headers = lines.flatMap((line, index) => /^\|\s*AC ID\s*\|\s*Required\s*\|/i.test(line) ? [index] : []);
  if (headers.length !== 1) throw new Error("original issue needs exactly one AC ID / Required table");
  const headerCells = lines[headers[0]].split("|").slice(1, -1);
  const delimiterCells = (lines[headers[0] + 1] ?? "").split("|").slice(1, -1);
  if (delimiterCells.length !== headerCells.length || !delimiterCells.every(cell => /^\s*:?-{3,}:?\s*$/.test(cell))) throw new Error("original AC table needs a valid delimiter row");
  const ids: string[] = [];
  for (let i = headers[0] + 2; i < lines.length; i++) {
    if (!lines[i].trim().startsWith("|")) {
      if (lines[i].includes("|")) throw new Error("original AC table has unsupported continuation; retain leading pipes");
      break;
    }
    const cells = lines[i].split("|").map(cell => cell.trim());
    if (cells.length !== headerCells.length + 2) throw new Error("original AC row differs from header shape");
    if (!/^AC-\d+$/.test(cells[1] ?? "")) throw new Error("unrecognized AC identifier in original contract");
    if (/^yes$/i.test(cells[2])) ids.push(cells[1]);
    else if (!/^no$/i.test(cells[2])) throw new Error(`unrecognized Required value for ${cells[1]}`);
  }
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error("original contract needs unique Required ACs");
  return ids;
}

/** Only an explicit source classification is authoritative; prose mentions/API subbranches are not. */
function isEngineeringOnly(body: string, ac: string): boolean {
  const lines = markdownLines(body);
  const index = lines.findIndex(line => /^\|\s*AC ID\s*\|\s*Required\s*\|/i.test(line));
  if (index < 0) return false;
  const columns = lines[index].split("|").map(cell => cell.trim());
  const column = columns.indexOf("驗收方式");
  const givenColumn = columns.indexOf("Given／When／Then");
  for (let i = index + 2; i < lines.length && lines[i].trim().startsWith("|"); i++) {
    const row = lines[i].split("|").map(cell => cell.trim());
    if (row[1] === ac) {
      if (column >= 0) return row[column] === "僅工程驗收";
      return givenColumn >= 0 && /（工程驗收項）$/.test(row[givenColumn] ?? "");
    }
  }
  return false;
}

function passedAcRows(body: string, ac: string): boolean {
  const lines = markdownLines(body);
  const results: string[] = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].trim().startsWith("|")) continue;
    const cells = (line: string) => line.trim().split("|").slice(1, -1).map(cell => cell.trim());
    const header = cells(lines[i]);
    const acColumn = header.findIndex(cell => /\bAC\b/.test(cell));
    const resultColumn = header.findIndex(cell => cell === "結果");
    if (acColumn < 0 || resultColumn < 0) continue;
    const delimiter = cells(lines[i + 1]);
    if (delimiter.length !== header.length || !delimiter.every(cell => /^:?-{3,}:?$/.test(cell))) continue;
    i += 2;
    for (; i < lines.length && lines[i].trim().startsWith("|"); i++) {
      const row = cells(lines[i]);
      if (new RegExp(`\\b${ac}\\b`).test(row[acColumn] ?? "")) results.push(row.length === header.length ? row[resultColumn] : "invalid");
    }
    i--;
  }
  return results.length > 0 && results.every(result => result === "PASS");
}

/** Keep full numbered line bytes bound to coverage; the AC must also be visible in its PM step. */
export function acceptanceStepLines(body: string): Map<number, string> {
  const lines = markdownLines(body);
  const start = lines.findIndex(line => /^(?:#{1,6}\s+|\s*[-*]\s*)\**驗收步驟/.test(line));
  const result = new Map<number, string>();
  if (start < 0) return result;
  const heading = /^#{1,6}\s/.test(lines[start]);
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (heading ? /^(?:#{1,6}\s|[✅❌])/.test(line) : /^\S/.test(line) && !/^\d+[.)、．]/.test(line)) break;
    const m = line.match(/^\s*(\d+)[.)、．]\s*\S/);
    if (m) {
      const number = Number(m[1]);
      if (result.has(number)) throw new Error(`duplicate PM step ${number}`);
      result.set(number, line);
    }
  }
  return result;
}

export function lintAcceptanceCoverage(source: CoverageSource, body: string, value: unknown, engineeringEvidence: Record<number, EngineeringEvidence> = {}): CoverageResult {
  const parsed = acceptanceCoverageSchema.safeParse(value);
  if (!parsed.success) return { findings: ["coverage schema invalid: every AC needs pm-steps, explicit pending, or source-classified engineering-only evidence; prior PASS is not automatically accepted"], fullCoverage: false, required: [] };
  const coverage = parsed.data;
  const findings: string[] = [];
  if (coverage.issue !== source.url) findings.push("coverage issue differs from original issue");
  if (coverage.source_sha256 !== acceptanceDigest(source.body)) findings.push("original issue contract changed; review and regenerate coverage");
  if (coverage.draft_sha256 !== acceptanceDigest(body)) findings.push("handoff draft changed; review and regenerate coverage");
  let required: string[], steps: Map<number, string>;
  try { required = requiredAcceptanceIds(source.body); steps = acceptanceStepLines(body); }
  catch (error) { return { findings: [...findings, String(error)], fullCoverage: false, required: [] }; }
  const seen = new Set<string>();
  for (const item of coverage.dispositions) {
    if (seen.has(item.ac)) findings.push(`duplicate disposition ${item.ac}`);
    seen.add(item.ac);
    if (!required.includes(item.ac)) findings.push(`unknown or nonrequired AC ${item.ac}`);
    if (item.kind === "pending") {
      if (coverage.scope === "full") findings.push(`${item.ac} remains pending; cannot hand off as full issue`);
      continue;
    }
    if (item.kind === "engineering-only") {
      if (!isEngineeringOnly(source.body, item.ac)) findings.push(`${item.ac} is not explicitly engineering-only in original source`);
      const evidence = engineeringEvidence[item.commentId];
      const issueApi = source.url.replace("https://github.com/", "https://api.github.com/repos/");
      if (!evidence || evidence.issue_url !== issueApi || !["write", "maintain", "admin"].includes(evidence.permission)
        || !evidence.body.includes(`<!-- daodao:engineering-evidence source_sha256=${acceptanceDigest(source.body)} -->`)
        || !passedAcRows(evidence.body, item.ac)) findings.push(`${item.ac} needs fetched engineer PASS evidence bound to original source`);
      continue;
    }
    const usedSteps = new Set<number>();
    for (const step of item.steps) {
      if (usedSteps.has(step.number)) findings.push(`${item.ac} repeats PM step ${step.number}`);
      usedSteps.add(step.number);
      const line = steps.get(step.number);
      if (!line || acceptanceDigest(line) !== step.sha256) findings.push(`${item.ac} PM step ${step.number} missing or changed`);
      if (line && !new RegExp(`\\b${item.ac}\\b`).test(line)) findings.push(`${item.ac} must be explicitly mapped in PM step ${step.number}`);
    }
  }
  for (const ac of required) if (!seen.has(ac)) findings.push(`missing disposition ${ac}`);
  return { findings, fullCoverage: findings.length === 0 && coverage.scope === "full", required };
}

/** A fetched report is checked against the fetched spec; a URL alone is never prior PASS evidence. */
export function lintAcceptanceClosure(
  source: CoverageSource, body: string, value: unknown,
  report: { id?: number; body: string; user?: { login?: string }; issue_url?: string },
  spec: { body: string; id?: number },
  latest: { reportId: number; specId: number },
  engineeringEvidence: Record<number, EngineeringEvidence> = {},
): string[] {
  const result = lintAcceptanceCoverage(source, body, value, engineeringEvidence);
  const findings = [...result.findings];
  if (!result.fullCoverage) findings.push("partial or incomplete coverage cannot close the issue");
  if (latest.specId !== spec.id) findings.push("a newer acceptance request supersedes this spec");
  if (latest.reportId !== report.id) findings.push("a newer acceptance report supersedes this result");
  if (report.user?.login !== "peggy1213-create") findings.push("closure requires the actual PM report author");
  const expectedApiIssue = source.url.replace("https://github.com/", "https://api.github.com/repos/");
  if (report.issue_url !== expectedApiIssue) findings.push("PM report belongs to another issue");
  if (spec.body !== body) findings.push("PM report spec differs from the frozen handoff draft");
  const markers = [...report.body.matchAll(/<!--\s*daodao:acceptance-report spec=(\d+) result=(PASS|FAIL|BLOCKED)\s*-->/g)];
  const marker = markers.length === 1 ? markers[0] : undefined;
  if ([...spec.body.matchAll(/<!--\s*daodao:acceptance-request\s*-->/g)].length !== 1) findings.push("handoff spec must have exactly one request marker");
  if (!marker || Number(marker[1]) !== spec.id || marker[2] !== "PASS") findings.push("PM report must PASS this exact spec");
  const coverage = acceptanceCoverageSchema.safeParse(value);
  for (const ac of result.required) {
    if (coverage.success && coverage.data.dispositions.some(item => item.ac === ac && item.kind === "engineering-only")) continue;
    if (!passedAcRows(report.body, ac)) findings.push(`${ac} has no complete PM PASS rows`);
  }
  return findings;
}
