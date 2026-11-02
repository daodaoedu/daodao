import { createHash } from "node:crypto";
import { z } from "zod";

/** Contracts contain no credentials and cannot select an API origin or request method. */
export const acceptancePreflightContractSchema = z.object({
  kind: z.literal("practice-resources"),
  accountEmail: z.string().email(),
  practiceId: z.string().uuid(),
  resourceDays: z.array(z.number().int().min(1).max(90).nullable()).min(1).max(100),
  requireUnlocked: z.literal(true),
}).strict();

export type AcceptancePreflightContract = z.infer<typeof acceptancePreflightContractSchema>;
export type PreflightResult = {
  check: string;
  status: "PASS" | "BLOCKED";
  expected?: unknown;
  actual?: unknown;
};
export type AcceptancePreflightReport = {
  checkedAt: string;
  contractDigest: string | null;
  practiceId?: string;
  status: "PASS" | "BLOCKED";
  results: PreflightResult[];
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}
function result(check: string, valid: boolean, expected?: unknown, actual?: unknown): PreflightResult {
  return { check, status: valid ? "PASS" : "BLOCKED", ...(expected !== undefined ? { expected } : {}), ...(actual !== undefined ? { actual } : {}) };
}

function resourceObservation(resource: Record<string, unknown> | undefined): { dayNumber: number | null | "missing" | "invalid"; isLocked: boolean | "missing" | "invalid" } {
  const hasDay = resource !== undefined && Object.hasOwn(resource, "dayNumber");
  const hasLock = resource !== undefined && Object.hasOwn(resource, "isLocked");
  const day = resource?.dayNumber;
  const lock = resource?.isLocked;
  return {
    dayNumber: !hasDay ? "missing" : day === null || (typeof day === "number" && Number.isFinite(day)) ? day : "invalid",
    isLocked: !hasLock ? "missing" : typeof lock === "boolean" ? lock : "invalid",
  };
}

/** Match exact day multiplicities, never treating missing/null/false as interchangeable. */
export function checkPracticeResources(contract: AcceptancePreflightContract, actorValue: unknown, detailValue: unknown): PreflightResult[] {
  const actor = record(actorValue);
  const detail = record(detailValue);
  const owner = record(detail?.user);
  const resources = Array.isArray(detail?.resources) ? detail.resources : [];
  const actorId = typeof actor?.id === "string" && actor.id.length > 0 ? actor.id : undefined;
  const checks = [
    result("account", actor?.email === contract.accountEmail),
    result("practice", detail?.id === contract.practiceId),
    result("owner", actorId !== undefined && owner?.id === actorId),
    result("resource-count", Array.isArray(detail?.resources) && resources.length === contract.resourceDays.length, contract.resourceDays.length, resources.length),
  ];
  const remaining = resources.map(value => ({ resource: record(value) }));
  for (const [index, day] of contract.resourceDays.entries()) {
    // Consume a matching resource once; duplicate required days require distinct entries.
    const match = remaining.findIndex(({resource}) => resource?.dayNumber === day && resource.isLocked === false);
    checks.push(result(
      `resource-${index + 1}`,
      match >= 0,
      { dayNumber: day, isLocked: false },
      match < 0 ? remaining.slice(0, 100).map(({resource}) => resourceObservation(resource)) : undefined,
    ));
    if (match >= 0) remaining.splice(match, 1);
  }
  return checks;
}

const API_ORIGIN = "https://server-dev.daodao.so/api/v1";
export type PreflightDependencies = { fetch?: typeof globalThis.fetch; now?: () => Date };

/** Read-only live check. Transport/auth failures are diagnostics, never product FAIL results. */
export async function runAcceptancePreflight(rawContract: unknown, token: string, dependencies: PreflightDependencies = {}): Promise<AcceptancePreflightReport> {
  const parsed = acceptancePreflightContractSchema.safeParse(rawContract);
  const report: AcceptancePreflightReport = {
    checkedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    contractDigest: parsed.success ? createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex") : null,
    ...(parsed.success ? { practiceId: parsed.data.practiceId } : {}),
    status: "BLOCKED",
    results: [],
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
        method: "GET",
        headers: { Authorization: `Bearer ${token.trim()}`, Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        report.results.push(result(check, false, "2xx", response.status));
        return undefined;
      }
      const envelope = record(await response.json());
      if (!envelope || !("data" in envelope)) {
        report.results.push(result(check, false, "data envelope"));
        return undefined;
      }
      report.results.push(result(check, true));
      return { data: envelope.data };
    } catch {
      // Do not persist response bodies, request headers, token values or transport exception text.
      report.results.push(result(check, false, "successful bounded JSON read"));
      return undefined;
    }
  }
  const actor = await get("/users/me", "read-account");
  if (!actor) return report;
  const detail = await get(`/practices/${parsed.data.practiceId}`, "read-practice");
  if (!detail) return report;
  report.results.push(...checkPracticeResources(parsed.data, actor.data, detail.data));
  report.status = report.results.every(check => check.status === "PASS") ? "PASS" : "BLOCKED";
  return report;
}
