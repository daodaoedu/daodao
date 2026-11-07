import { createHash } from "node:crypto";
import { z } from "zod";
import type { PreflightResult } from "./acceptance-preflight.js";

const id = z.number().int().positive().safe();
const globalRole = z.enum(["User", "Admin", "SuperAdmin"]);
const organizationExpectation = z.object({ organizationId: id, status: z.enum(["active", "suspended"]) }).strict();
const cohortExpectation = z.object({ cohortId: id, status: z.string().trim().min(1).max(64) }).strict();
const ownerExpectation = z.object({ organizationId: id }).strict();
const coachExpectation = z.object({
  organizationId: id, programId: id, cohortId: id,
  status: z.enum(["draft", "published", "archived"]),
  proof: z.enum(["organization-owner", "joined-enrollment"]),
}).strict();

/** No URLs, arbitrary request paths, credentials or inferred organization roles. */
export const actorPreflightContractSchema = z.object({
  kind: z.literal("actor-access"),
  accountId: z.string().uuid(),
  accountEmail: z.string().email(),
  expectedRoles: z.array(globalRole).min(1).max(3).refine(roles => new Set(roles).size === roles.length),
  organizations: z.array(organizationExpectation).min(1).max(50)
    .refine(items => new Set(items.map(item => item.organizationId)).size === items.length).optional(),
  cohorts: z.array(cohortExpectation).min(1).max(50)
    .refine(items => new Set(items.map(item => item.cohortId)).size === items.length).optional(),
  organizationOwners: z.array(ownerExpectation).min(1).max(50)
    .refine(items => new Set(items.map(item => item.organizationId)).size === items.length).optional(),
  cohortCoaches: z.array(coachExpectation).min(1).max(50)
    .refine(items => new Set(items.map(item => item.cohortId)).size === items.length).optional(),
}).strict();

export type ActorPreflightContract = z.infer<typeof actorPreflightContractSchema>;
export type ActorPreflightReport = {
  checkedAt: string;
  contractDigest: string | null;
  status: "PASS" | "BLOCKED";
  results: PreflightResult[];
  googleLogin: "NOT_VERIFIED";
  accountActive: "NOT_VERIFIED";
  organizationRole: "VERIFIED" | "NOT_VERIFIED";
  cohortCoachRole: "VERIFIED" | "NOT_VERIFIED";
};
export type ActorPreflightDependencies = { fetch?: typeof globalThis.fetch; now?: () => Date };

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}
function result(check: string, valid: boolean): PreflightResult {
  // Never copy arbitrary response values (including roles, PII or error bodies) into reports.
  return { check, status: valid ? "PASS" : "BLOCKED" };
}

/** auth/me returns data.user, not the users/me profile shape. */
export function checkActorAccess(contract: ActorPreflightContract, authData: unknown): PreflightResult[] {
  const actor = record(record(authData)?.user);
  const roles = actor?.roles;
  const exactRoles = Array.isArray(roles)
    && roles.length === contract.expectedRoles.length
    && new Set(roles).size === roles.length
    && contract.expectedRoles.every(role => roles.includes(role));
  return [
    result("account-id", actor?.id === contract.accountId),
    result("account-email", actor?.email === contract.accountEmail),
    result("global-roles", exactRoles),
  ];
}

/** Self-membership list schemas project only fields that the APIs actually expose. */
const organizationsSchema = z.array(z.object({ id, status: z.enum(["active", "suspended"]) })).max(5000);
const cohortsSchema = z.array(z.object({ cohortId: id, status: z.string().min(1).max(64) })).max(5000);
const membersSchema = z.array(z.object({ userId: id, role: z.string().min(1) })).max(5000);
const programsSchema = z.array(z.object({ id, organizationId: id })).max(5000);
const coachCohortSchema = z.object({ id, programId: id, status: z.enum(["draft", "published", "archived"]) });
const enrollmentsSchema = z.array(z.object({
  userId: id.nullable(), role: z.enum(["owner", "assistant", "member"]),
  status: z.enum(["invited", "joined", "exited", "removed"]),
})).max(5000);

/** Called only after this exact bearer was accepted by auth/me and matched the expected UUID/email/roles.
 * The server verifies the JWT; its issuer must pair id/_id consistently. Decoding is a row-key binding, not local signature verification.
 */
function authenticatedInternalId(token: string, accountId: string): number | undefined {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return undefined;
    const header = record(JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")));
    const payload = record(JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")));
    if (typeof header?.alg !== "string" || header.alg.toLowerCase() === "none" || payload?.isTemp !== false || payload._id !== accountId) return undefined;
    const parsed = id.safeParse(payload.id);
    return parsed.success ? parsed.data : undefined;
  } catch { return undefined; }
}

export function checkOrganizationOwner(internalId: number, membersData: unknown): boolean {
  const parsed = membersSchema.safeParse(membersData);
  const self = parsed.success ? parsed.data.filter(member => member.userId === internalId) : [];
  return self.length === 1 && self[0].role === "owner";
}

export function checkJoinedCoach(internalId: number, enrollmentsData: unknown): boolean {
  const parsed = enrollmentsSchema.safeParse(enrollmentsData);
  const self = parsed.success ? parsed.data.filter(member => member.userId === internalId) : [];
  return self.length === 1 && self[0].status === "joined" && ["owner", "assistant"].includes(self[0].role);
}

export function checkActorMemberships(contract: ActorPreflightContract, organizationsData?: unknown, cohortsData?: unknown): PreflightResult[] {
  const checks: PreflightResult[] = [];
  if (contract.organizations) {
    const parsed = organizationsSchema.safeParse(organizationsData);
    checks.push(result("organizations-response", parsed.success));
    for (const expected of contract.organizations) {
      const matches = parsed.success ? parsed.data.filter(item => item.id === expected.organizationId) : [];
      checks.push(result(`organization-${expected.organizationId}-membership-status`, matches.length === 1 && matches[0].status === expected.status));
    }
  }
  if (contract.cohorts) {
    const parsed = cohortsSchema.safeParse(cohortsData);
    checks.push(result("cohorts-response", parsed.success));
    for (const expected of contract.cohorts) {
      // /me/cohorts selects only this actor's joined enrollments. Cohort status is not enrollment role.
      const matches = parsed.success ? parsed.data.filter(item => item.cohortId === expected.cohortId) : [];
      checks.push(result(`cohort-${expected.cohortId}-joined-status`, matches.length === 1 && matches[0].status === expected.status));
    }
  }
  return checks;
}

const API_ORIGIN = "https://server-dev.daodao.so/api/v1";

/** GET-only engineering preflight; explicit authority proofs are separate from simple memberships. */
export async function runActorPreflight(rawContract: unknown, token: string, dependencies: ActorPreflightDependencies = {}): Promise<ActorPreflightReport> {
  const parsed = actorPreflightContractSchema.safeParse(rawContract);
  const report: ActorPreflightReport = {
    checkedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    contractDigest: parsed.success ? createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex") : null,
    status: "BLOCKED", results: [],
    googleLogin: "NOT_VERIFIED", accountActive: "NOT_VERIFIED",
    organizationRole: "NOT_VERIFIED", cohortCoachRole: "NOT_VERIFIED",
  };
  if (!parsed.success) {
    report.results.push(result("contract-schema", false));
    return report;
  }
  if (!token.trim()) {
    report.results.push(result("authentication-token-present", false));
    return report;
  }
  const fetch = dependencies.fetch ?? globalThis.fetch;
  async function get(path: string, check: string): Promise<{ data: unknown } | undefined> {
    try {
      const response = await fetch(`${API_ORIGIN}${path}`, {
        method: "GET", headers: { Authorization: `Bearer ${token.trim()}`, Accept: "application/json" },
        redirect: "error", signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        report.results.push({ ...result(check, false), actual: response.status });
        return undefined;
      }
      const envelope = record(await response.json());
      if (!envelope || !("data" in envelope)) {
        report.results.push(result(check, false));
        return undefined;
      }
      report.results.push(result(check, true));
      return { data: envelope.data };
    } catch {
      report.results.push(result(check, false));
      return undefined;
    }
  }
  const actor = await get("/auth/me", "read-account");
  if (!actor) return report;
  report.results.push(...checkActorAccess(parsed.data, actor.data));
  // A wrong account must not continue reading memberships under an unintended identity.
  if (report.results.some(check => check.status === "BLOCKED")) return report;
  let organizations: { data: unknown } | undefined;
  let cohorts: { data: unknown } | undefined;
  if (parsed.data.organizations) {
    organizations = await get("/lighthouse/organizations", "read-organizations");
    if (!organizations) return report;
  }
  if (parsed.data.cohorts) {
    cohorts = await get("/me/cohorts", "read-cohorts");
    if (!cohorts) return report;
  }
  report.results.push(...checkActorMemberships(parsed.data, organizations?.data, cohorts?.data));
  if (report.results.some(check => check.status === "BLOCKED")) return report;
  if (parsed.data.organizationOwners || parsed.data.cohortCoaches) {
    const internalId = authenticatedInternalId(token.trim(), parsed.data.accountId);
    report.results.push(result("authority-authenticated-row-key", internalId !== undefined));
    if (internalId === undefined) return report;
    const activeOrganizations = organizations ?? await get("/lighthouse/organizations", "read-authority-organizations");
    if (!activeOrganizations) return report;
    const actorInternalId = internalId;
    const parsedOrganizations = organizationsSchema.safeParse(activeOrganizations.data);
    const memberCache = new Map<number, { data: unknown }>();
    async function owner(organizationId: number): Promise<boolean> {
      const matches = parsedOrganizations.success ? parsedOrganizations.data.filter(row => row.id === organizationId) : [];
      const active = matches.length === 1 && matches[0].status === "active";
      report.results.push(result(`organization-${organizationId}-authority-active`, active));
      if (!active) return false;
      let members = memberCache.get(organizationId);
      if (!members) {
        members = await get(`/lighthouse/organizations/${organizationId}/members`, `read-organization-${organizationId}-members`);
        if (members) memberCache.set(organizationId, members);
      }
      const valid = members !== undefined && checkOrganizationOwner(actorInternalId, members.data);
      report.results.push(result(`organization-${organizationId}-self-owner`, valid));
      return valid;
    }
    for (const expected of parsed.data.organizationOwners ?? []) {
      if (!await owner(expected.organizationId)) return report;
    }
    if (parsed.data.organizationOwners) report.organizationRole = "VERIFIED";
    for (const expected of parsed.data.cohortCoaches ?? []) {
      const orgs = parsedOrganizations.success ? parsedOrganizations.data.filter(row => row.id === expected.organizationId) : [];
      const active = orgs.length === 1 && orgs[0].status === "active";
      report.results.push(result(`cohort-${expected.cohortId}-organization-active`, active));
      if (!active) return report;
      const programs = await get(`/lighthouse/programs?organizationId=${expected.organizationId}`, `read-cohort-${expected.cohortId}-programs`);
      if (!programs) return report;
      const parsedPrograms = programsSchema.safeParse(programs.data);
      const matches = parsedPrograms.success ? parsedPrograms.data.filter(row => row.id === expected.programId) : [];
      const parentMatches = matches.length === 1 && matches[0].organizationId === expected.organizationId;
      report.results.push(result(`cohort-${expected.cohortId}-program-parent`, parentMatches));
      if (!parentMatches) return report;
      const cohort = await get(`/lighthouse/programs/${expected.programId}/cohorts/${expected.cohortId}`, `read-cohort-${expected.cohortId}-coach-detail`);
      if (!cohort) return report;
      const detail = coachCohortSchema.safeParse(cohort.data);
      const validScope = detail.success && detail.data.id === expected.cohortId && detail.data.programId === expected.programId && detail.data.status === expected.status;
      report.results.push(result(`cohort-${expected.cohortId}-coach-scope-status`, validScope));
      if (!validScope) return report;
      if (expected.proof === "organization-owner") {
        if (!await owner(expected.organizationId)) return report;
      } else {
        const roster = await get(`/lighthouse/programs/${expected.programId}/cohorts/${expected.cohortId}/enrollments`, `read-cohort-${expected.cohortId}-enrollments`);
        if (!roster) return report;
        const joined = checkJoinedCoach(internalId, roster.data);
        report.results.push(result(`cohort-${expected.cohortId}-self-joined-coach`, joined));
        if (!joined) return report;
      }
    }
    if (parsed.data.cohortCoaches) report.cohortCoachRole = "VERIFIED";
  }
  report.status = report.results.every(check => check.status === "PASS") ? "PASS" : "BLOCKED";
  return report;
}
