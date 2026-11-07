import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { actorPreflightContractSchema } from "./acceptance-actor-preflight.js";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const reference = z.string().trim().min(1).max(2000);
const issue = z.string().regex(/^https:\/\/github\.com\/daodaoedu\/daodao\/issues\/[1-9]\d*$/);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidTypes = ["account", "practice", "survey"] as const;
const numericTypes = ["organization", "program", "cohort", "practice-template", "comment-template", "checkin", "owner-invitation", "invitation-request"] as const;
const namespaceTypes = ["survey-response", "cohort-comments", "comment-template-namespace", "ai-summary-generation", "rate-limit-bucket", "bug-report-namespace", "organization-namespace"] as const;
const resourceSchema = z.object({
  environment: z.literal("dev"),
  type: z.enum([...uuidTypes, ...numericTypes, ...namespaceTypes]),
  id: z.string().min(1).max(100),
  usage: z.enum(["read", "write", "consume"]),
}).strict().superRefine((resource, context) => {
  // One canonical ID form per table prevents an internal numeric alias bypassing a UUID claim.
  const valid = uuidTypes.some(type => type === resource.type) ? uuid.test(resource.id)
    : numericTypes.some(type => type === resource.type) ? /^[1-9]\d*$/.test(resource.id)
    : /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(resource.id);
  if (!valid) context.addIssue({ code: z.ZodIssueCode.custom, path: ["id"], message: "resource ID does not match its kind" });
}).transform(resource => ({ ...resource, id: resource.id.toLowerCase() }));
const resourcesSchema = z.array(resourceSchema).min(1).max(200)
  .refine(items => new Set(items.map(item => resourceKey(item))).size === items.length, "duplicate resource");
const procedure = z.object({ instructions: z.string().trim().min(1).max(10000), evidenceRef: reference }).strict();

/** A contract records expectations and procedures; it never executes references or proves readiness. */
export const acceptanceScenarioSchema = z.object({
  kind: z.literal("acceptance-scenario"), version: z.literal(1), issue,
  generation: slug, taskOwner: slug,
  actors: z.array(actorPreflightContractSchema).min(1).max(20)
    .refine(items => new Set(items.map(item => item.accountId.toLowerCase())).size === items.length, "duplicate actor"),
  resources: resourcesSchema,
  prerequisites: z.array(z.object({ description: z.string().trim().min(1).max(2000), evidenceRef: reference }).strict()).min(1).max(100),
  retention: z.object({ retainUntil: z.literal("pm-accepted"), reviewAt: z.string().datetime({ offset: true }) }).strict(),
  cleanup: procedure, rebuild: procedure,
}).strict();
export type AcceptanceScenario = z.infer<typeof acceptanceScenarioSchema>;
export type ScenarioOperation = "validate" | "acquire" | "check" | "release";
export type ReleaseRecord = { outcome: "accepted" | "cancelled"; outcomeEvidence: string; cleanupEvidence: string };
export type ScenarioReport = {
  checkedAt: string;
  status: "VALID" | "RESERVED" | "RETAINED" | "RELEASED" | "BLOCKED";
  readiness: "NOT_VERIFIED";
  contractDigest: string | null;
  reviewDue?: boolean;
  reason?: string;
  conflicts?: { issue: string; generation: string; resource: string }[];
};
const releaseSchema = z.object({
  outcome: z.enum(["accepted", "cancelled"]), outcomeEvidence: reference, cleanupEvidence: reference,
}).strict();
const reservationSchema = z.object({
  issue, generation: slug, taskOwner: slug, contractDigest: z.string().regex(/^[a-f0-9]{64}$/),
  resources: resourcesSchema, acquiredAt: z.string().datetime({ offset: true }), reviewAt: z.string().datetime({ offset: true }),
  state: z.enum(["retained", "released"]),
  release: releaseSchema.extend({ releasedAt: z.string().datetime({ offset: true }) }).strict().optional(),
}).strict().superRefine((row, context) => {
  if ((row.state === "released") !== (row.release !== undefined)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid release state" });
});
const ledgerSchema = z.object({
  version: z.literal(1), reservations: z.array(reservationSchema).max(100000),
}).strict().superRefine((ledger, context) => {
  const keys = ledger.reservations.map(row => `${row.issue}\n${row.generation}`);
  if (new Set(keys).size !== keys.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate generation" });
  const held = new Map<string, string[]>();
  for (const row of ledger.reservations.filter(item => item.state === "retained")) {
    for (const resource of row.resources) {
      const usages = held.get(resourceKey(resource)) ?? [];
      if (usages.length && (resource.usage !== "read" || usages.some(usage => usage !== "read"))) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "conflicting retained resources" });
      }
      usages.push(resource.usage); held.set(resourceKey(resource), usages);
    }
  }
});
type Ledger = z.infer<typeof ledgerSchema>;

export function resourceKey(resource: z.infer<typeof resourceSchema>): string {
  return `${resource.environment}:${resource.type}:${resource.id}`;
}
export function scenarioDigest(contract: AcceptanceScenario): string {
  return createHash("sha256").update(JSON.stringify(contract)).digest("hex");
}

function regularFile(path: string): boolean {
  const stat = lstatSync(path);
  return stat.isFile() && !stat.isSymbolicLink();
}
function privateFile(path: string, maxBytes: number): boolean {
  const stat = lstatSync(path);
  return regularFile(path) && typeof process.getuid === "function" && stat.uid === process.getuid()
    && (stat.mode & 0o077) === 0 && stat.nlink === 1 && stat.size <= maxBytes;
}
function pathPresent(path: string): boolean {
  try { lstatSync(path); return true; }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return false; throw error; }
}

/** Local advisory coordination only: every participant must use this same state directory. */
export function runScenarioOperation(
  operation: ScenarioOperation,
  rawContract: unknown,
  stateDirectory: string,
  options: { now?: () => Date; release?: ReleaseRecord } = {},
): ScenarioReport {
  const now = (options.now?.() ?? new Date()).toISOString();
  const parsed = acceptanceScenarioSchema.safeParse(rawContract);
  const report: ScenarioReport = { checkedAt: now, status: "BLOCKED", readiness: "NOT_VERIFIED", contractDigest: null };
  if (!["validate", "acquire", "check", "release"].includes(operation)) return { ...report, reason: "invalid-operation" };
  if (!parsed.success) return { ...report, reason: "invalid-contract" };
  const contract = parsed.data;
  const digest = scenarioDigest(contract);
  report.contractDigest = digest;
  report.reviewDue = new Date(contract.retention.reviewAt).getTime() <= new Date(now).getTime();
  if (operation === "validate") return { ...report, status: "VALID" };
  const release = operation === "release" ? releaseSchema.safeParse(options.release) : undefined;
  if (release && !release.success) return { ...report, reason: "release-evidence-required" };
  const stateDir = resolve(stateDirectory);
  const ledgerFile = join(stateDir, "ledger.json"), marker = join(stateDir, ".initialized"), lock = join(stateDir, ".lock");
  let locked = false;
  let temporary: string | undefined;
  try {
    // Do not initialize an absent directory during check/release, or silently replace corrupt state.
    if (!existsSync(stateDir)) {
      if (operation !== "acquire") return { ...report, reason: "reservation-not-found" };
      mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    }
    const dirStat = lstatSync(stateDir);
    if (!dirStat.isDirectory() || dirStat.isSymbolicLink() || typeof process.getuid !== "function"
        || dirStat.uid !== process.getuid() || (dirStat.mode & 0o077) !== 0) return { ...report, reason: "unsafe-state-directory" };
    try { mkdirSync(lock, { mode: 0o700 }); locked = true; }
    catch { return { ...report, reason: "state-locked" }; }
    let ledger: Ledger = { version: 1, reservations: [] };
    if (pathPresent(marker) && (!privateFile(marker, 100) || readFileSync(marker, "utf8") !== "acceptance-reservations-v1\n")) {
      return { ...report, reason: "invalid-state-marker" };
    }
    if (pathPresent(ledgerFile)) {
      if (!privateFile(ledgerFile, 10 * 1024 * 1024)) return { ...report, reason: "unsafe-ledger-file" };
      if (!pathPresent(marker)) return { ...report, reason: "invalid-state-marker" };
      const content: unknown = JSON.parse(readFileSync(ledgerFile, "utf8"));
      const validated = ledgerSchema.safeParse(content);
      if (!validated.success) return { ...report, reason: "invalid-ledger" };
      ledger = validated.data;
    } else if (existsSync(marker)) return { ...report, reason: "ledger-missing-after-initialization" };
    else if (operation !== "acquire") return { ...report, reason: "reservation-not-found" };
    const current = ledger.reservations.find(row => row.issue === contract.issue && row.generation === contract.generation);
    if (current && current.contractDigest !== report.contractDigest) return { ...report, reason: "generation-contract-drift" };
    if (current && (current.taskOwner !== contract.taskOwner || current.reviewAt !== contract.retention.reviewAt
        || JSON.stringify(current.resources) !== JSON.stringify(contract.resources))) {
      return { ...report, reason: "reservation-contract-mismatch" };
    }
    if (current?.state === "released") {
      // Repeating the same documented release is safe; a retired generation cannot be reacquired.
      if (operation === "release" && release?.success && current.release?.outcome === release.data.outcome
          && current.release.outcomeEvidence === release.data.outcomeEvidence && current.release.cleanupEvidence === release.data.cleanupEvidence) {
        return { ...report, status: "RELEASED" };
      }
      return { ...report, reason: "generation-released" };
    }
    if (!current && operation !== "acquire") return { ...report, reason: "reservation-not-found" };
    if (current && operation !== "release") return { ...report, status: operation === "acquire" ? "RESERVED" : "RETAINED" };
    if (operation === "acquire") {
      const conflicts: NonNullable<ScenarioReport["conflicts"]> = [];
      for (const reservation of ledger.reservations.filter(row => row.state === "retained")) {
        for (const wanted of contract.resources) {
          const held = reservation.resources.find(item => resourceKey(item) === resourceKey(wanted));
          if (held && (held.usage !== "read" || wanted.usage !== "read")) conflicts.push({ issue: reservation.issue, generation: reservation.generation, resource: resourceKey(wanted) });
        }
      }
      if (conflicts.length) return { ...report, reason: "resource-conflict", conflicts };
      ledger.reservations.push({ issue: contract.issue, generation: contract.generation, taskOwner: contract.taskOwner,
        contractDigest: digest, resources: contract.resources, acquiredAt: now, reviewAt: contract.retention.reviewAt, state: "retained" });
    } else if (current && release?.success) {
      current.state = "released";
      current.release = { ...release.data, releasedAt: now };
    }
    temporary = join(stateDir, `.ledger-${randomUUID()}.tmp`);
    writeFileSync(temporary, JSON.stringify(ledger, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    // A missing ledger after initialization may mean data loss, never a fresh empty reservation set.
    if (!existsSync(marker)) writeFileSync(marker, "acceptance-reservations-v1\n", { mode: 0o600, flag: "wx" });
    renameSync(temporary, ledgerFile);
    temporary = undefined;
    return { ...report, status: operation === "acquire" ? "RESERVED" : "RELEASED" };
  } catch {
    // Do not echo arbitrary file contents, credentials or filesystem exception messages.
    return { ...report, reason: "state-unreadable-or-unwritable" };
  } finally {
    if (temporary) { try { unlinkSync(temporary); } catch { /* Preserve the original sanitized error. */ } }
    if (locked) { try { rmdirSync(lock); } catch { /* Never take over or recursively delete a lock. */ } }
  }
}
