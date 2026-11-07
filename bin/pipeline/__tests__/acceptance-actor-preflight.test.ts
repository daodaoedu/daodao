import { describe, expect, it, vi } from "vitest";
import { actorPreflightContractSchema, checkActorAccess, checkActorMemberships, runActorPreflight } from "../acceptance-actor-preflight.js";

const accountId = "6a542fe3-7bba-42f7-844a-deb9489bd85e";
const contract = { kind: "actor-access", accountId, accountEmail: "pm@example.com", expectedRoles: ["User"] } as const;
const actor = { user: { id: accountId, email: "pm@example.com", roles: ["User"] } };
const parsed = () => actorPreflightContractSchema.parse(contract);
const pass = (checks: { status: string }[]) => checks.every(check => check.status === "PASS");
const scoped = () => actorPreflightContractSchema.parse({ ...contract, organizations: [{ organizationId: 17, status: "active" }], cohorts: [{ cohortId: 44, status: "published" }] });
const organizations = [{ id: 17, status: "active", name: "private organization" }];
const cohorts = [{ cohortId: 44, status: "published", displayName: "private cohort" }];
function fetcher(values: unknown[]) {
  return vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => {
    if (!values.length) throw new Error("unexpected request");
    return new Response(JSON.stringify({ data: values.shift() }));
  });
}

describe("actor contract and exact identity", () => {
  it("accepts bounded known-role expectations and rejects URL/method/credential injection", () => {
    expect(actorPreflightContractSchema.safeParse(contract).success).toBe(true);
    for (const value of [
      { ...contract, accountId: "../admin/users" }, { ...contract, expectedRoles: [] },
      { ...contract, expectedRoles: ["User", "User"] }, { ...contract, expectedRoles: ["user"] },
      { ...contract, origin: "https://evil.example" }, { ...contract, token: "secret" },
      { ...contract, method: "POST" }, { ...contract, organizations: [] },
      { ...contract, organizations: [{ organizationId: 17, status: "active", role: "owner" }] },
      { ...contract, cohorts: [{ cohortId: 44, status: "published", role: "coach" }] },
      { ...contract, cohorts: [{ cohortId: -1, status: "published" }] },
      { ...contract, organizations: [{ organizationId: 17, status: "active" }, { organizationId: 17, status: "active" }] },
    ]) expect(actorPreflightContractSchema.safeParse(value).success).toBe(false);
  });
  it("passes the intended User and blocks Admin substitution with the same email", () => {
    expect(pass(checkActorAccess(parsed(), actor))).toBe(true);
    for (const roles of [["Admin"], ["SuperAdmin"], ["User", "Admin"], ["User", "User"], [], undefined, "User"]) {
      expect(pass(checkActorAccess(parsed(), { user: { ...actor.user, roles } }))).toBe(false);
    }
  });
  it("requires both stable external UUID and exact account email", () => {
    for (const user of [
      { ...actor.user, id: "4707bee9-6918-4705-beb0-daa1d56d5a99" },
      { ...actor.user, email: "other@example.com" },
      { ...actor.user, id: undefined }, { ...actor.user, email: undefined },
    ]) expect(pass(checkActorAccess(parsed(), { user }))).toBe(false);
    expect(pass(checkActorAccess(parsed(), actor.user))).toBe(false);
    expect(pass(checkActorAccess(parsed(), null))).toBe(false);
  });
  it("compares roles as an exact set independently of response order", () => {
    const multi = actorPreflightContractSchema.parse({ ...contract, expectedRoles: ["User", "Admin"] });
    expect(pass(checkActorAccess(multi, { user: { ...actor.user, roles: ["Admin", "User"] } }))).toBe(true);
  });
});

describe("organization and joined-cohort expectations", () => {
  it("matches the specified scope and status, ignoring unrelated response metadata", () => {
    expect(pass(checkActorMemberships(scoped(), organizations, cohorts))).toBe(true);
  });
  it("does not substitute a different organization or cohort with the same status", () => {
    expect(pass(checkActorMemberships(scoped(), [{ id: 18, status: "active" }], cohorts))).toBe(false);
    expect(pass(checkActorMemberships(scoped(), organizations, [{ cohortId: 45, status: "published" }]))).toBe(false);
  });
  it("blocks suspended organizations and draft cohorts when active/published was required", () => {
    expect(pass(checkActorMemberships(scoped(), [{ id: 17, status: "suspended" }], cohorts))).toBe(false);
    expect(pass(checkActorMemberships(scoped(), organizations, [{ cohortId: 44, status: "draft" }]))).toBe(false);
  });
  it("fails closed on missing lists, wrong shapes, duplicate scope rows and missing status", () => {
    for (const values of [undefined, {}, [], [{ id: 17 }], [{ id: 17, status: "active" }, { id: 17, status: "active" }]]) {
      expect(pass(checkActorMemberships(scoped(), values, cohorts))).toBe(false);
    }
    for (const values of [undefined, {}, [], [{ cohortId: 44 }], [{ cohortId: 44, status: "published" }, { cohortId: 44, status: "published" }]]) {
      expect(pass(checkActorMemberships(scoped(), organizations, values))).toBe(false);
    }
  });
  it("does not infer organization membership from an Admin global role", async () => {
    const admin = { ...scoped(), expectedRoles: ["Admin"] };
    const fetch = fetcher([{ user: { ...actor.user, roles: ["Admin"] } }, [], cohorts]);
    expect((await runActorPreflight(admin, "private-token", { fetch })).status).toBe("BLOCKED");
  });
});

describe("GET-only actor preflight", () => {
  it("reads fixed self endpoints with bounded requests, while preserving unverified capability boundaries", async () => {
    const fetch = fetcher([actor, organizations, cohorts]);
    const report = await runActorPreflight(scoped(), "private-token", { fetch, now: () => new Date("2026-11-07T00:00:00Z") });
    expect(report).toMatchObject({ status: "PASS", checkedAt: "2026-11-07T00:00:00.000Z", googleLogin: "NOT_VERIFIED", accountActive: "NOT_VERIFIED", organizationRole: "NOT_VERIFIED", cohortCoachRole: "NOT_VERIFIED" });
    expect(report.contractDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(fetch.mock.calls.map(args => args[0])).toEqual([
      "https://server-dev.daodao.so/api/v1/auth/me",
      "https://server-dev.daodao.so/api/v1/lighthouse/organizations",
      "https://server-dev.daodao.so/api/v1/me/cohorts",
    ]);
    for (const [, init] of fetch.mock.calls) {
      expect(init).toMatchObject({ method: "GET", redirect: "error" });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.body).toBeUndefined();
    }
    expect(JSON.stringify(report)).not.toMatch(/private-token|private organization|private cohort/);
  });
  it("only reads identity when the contract does not require membership", async () => {
    const fetch = fetcher([actor]);
    expect((await runActorPreflight(contract, "private-token", { fetch })).status).toBe("PASS");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("stops before membership reads if the token belongs to the wrong account", async () => {
    const fetch = fetcher([{ user: { ...actor.user, roles: ["Admin"] } }, organizations, cohorts]);
    expect((await runActorPreflight(scoped(), "private-token", { fetch })).status).toBe("BLOCKED");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects invalid contracts and missing tokens without any network request", async () => {
    const fetch = vi.fn();
    expect((await runActorPreflight({ ...contract, endpoint: "/admin/users" }, "private-token", { fetch })).status).toBe("BLOCKED");
    expect((await runActorPreflight(contract, "  ", { fetch })).status).toBe("BLOCKED");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 500, 302])("blocks HTTP %i and never copies response bodies", async status => {
    const fetch = vi.fn().mockResolvedValue(new Response("PRIVATE-TOKEN-ERROR", { status }));
    const report = await runActorPreflight(scoped(), "private-token", { fetch });
    expect(report.status).toBe("BLOCKED");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(report)).not.toMatch(/PRIVATE-TOKEN-ERROR|private-token/);
  });
  it("blocks invalid JSON, missing envelopes and token-bearing transport errors without disclosure", async () => {
    for (const fetch of [
      vi.fn().mockResolvedValue(new Response("PRIVATE JSON")),
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "PRIVATE envelope" }))),
      vi.fn().mockRejectedValue(new Error("PRIVATE transport private-token")),
    ]) {
      const report = await runActorPreflight(contract, "private-token", { fetch });
      expect(report.status).toBe("BLOCKED");
      expect(JSON.stringify(report)).not.toMatch(/PRIVATE|private-token/);
    }
  });
  it("stops when a required organization or cohort read fails", async () => {
    for (const failedStep of [1, 2]) {
      const values = [actor, organizations, cohorts];
      let index = 0;
      const fetch = vi.fn(async () => index++ === failedStep
        ? new Response("PRIVATE", { status: 403 })
        : new Response(JSON.stringify({ data: values[index - 1] })));
      const report = await runActorPreflight(scoped(), "private-token", { fetch });
      expect(report.status).toBe("BLOCKED");
      expect(fetch).toHaveBeenCalledTimes(failedStep + 1);
      expect(JSON.stringify(report)).not.toContain("PRIVATE");
    }
  });
});

const tokenFor = (payload: unknown = { id: 295, _id: accountId, isTemp: false }) =>
  `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.server-validated-signature`;
const ownerContract = () => ({ ...contract, organizationOwners: [{ organizationId: 17 }] });
const coachContract = (proof: "organization-owner" | "joined-enrollment" = "organization-owner") => ({
  ...contract, cohortCoaches: [{ organizationId: 17, programId: 22, cohortId: 44, status: "published", proof }],
});
const ownerMembers = [{ userId: 295, role: "owner", nickname: "PRIVATE owner" }];
const programs = [{ id: 22, organizationId: 17 }];
const coachDetail = { id: 44, programId: 22, status: "published", joinToken: "PRIVATE join link" };
const coachRows = [{ userId: 295, role: "assistant", status: "joined", email: "PRIVATE email" }];

describe("explicit scoped owner and coach authority", () => {
  it("requires explicit authority proof mode and rejects unbound or duplicate scopes", () => {
    for (const value of [
      { ...contract, organizationOwners: [] },
      { ...contract, organizationOwners: [{ organizationId: 17, userId: 295 }] },
      { ...contract, organizationOwners: [{ organizationId: 17 }, { organizationId: 17 }] },
      { ...contract, cohortCoaches: [{ organizationId: 17, programId: 22, cohortId: 44, status: "published" }] },
      { ...contract, cohortCoaches: [{ organizationId: 17, programId: 22, cohortId: 44, status: "published", proof: "global-admin" }] },
    ]) expect(actorPreflightContractSchema.safeParse(value).success).toBe(false);
  });
  it("proves the authenticated actor's owner row, rather than any other owner's presence", async () => {
    const fetch = fetcher([actor, organizations, ownerMembers]);
    const report = await runActorPreflight(ownerContract(), tokenFor(), { fetch });
    expect(report).toMatchObject({ status: "PASS", organizationRole: "VERIFIED", cohortCoachRole: "NOT_VERIFIED", googleLogin: "NOT_VERIFIED" });
    expect(fetch.mock.calls.map(call => call[0])).toEqual([
      "https://server-dev.daodao.so/api/v1/auth/me",
      "https://server-dev.daodao.so/api/v1/lighthouse/organizations",
      "https://server-dev.daodao.so/api/v1/lighthouse/organizations/17/members",
    ]);
    expect(JSON.stringify(report)).not.toMatch(/PRIVATE|server-validated-signature/);
    for (const members of [
      [{ userId: 296, role: "owner" }], [{ userId: 295, role: "member" }],
      [{ userId: 295 }], [{ userId: 295, role: "owner" }, { userId: 295, role: "owner" }],
    ]) {
      const report = await runActorPreflight(ownerContract(), tokenFor(), { fetch: fetcher([actor, organizations, members]) });
      expect(report).toMatchObject({ status: "BLOCKED", organizationRole: "NOT_VERIFIED" });
    }
  });
  it("does not treat global Admin as organization owner", async () => {
    const fetch = fetcher([{ user: { ...actor.user, roles: ["Admin"] } }, organizations, [{ userId: 296, role: "owner" }]]);
    expect((await runActorPreflight({ ...ownerContract(), expectedRoles: ["Admin"] }, tokenFor(), { fetch })).status).toBe("BLOCKED");
  });
  it("requires active scoped organization and a server-accepted permanent JWT row key", async () => {
    const suspended = fetcher([actor, [{ id: 17, status: "suspended" }], ownerMembers]);
    expect((await runActorPreflight(ownerContract(), tokenFor(), { fetch: suspended })).status).toBe("BLOCKED");
    expect(suspended).toHaveBeenCalledTimes(2);
    for (const token of ["opaque-token", tokenFor({ id: "295", _id: accountId, isTemp: false }), tokenFor({ id: 295, _id: accountId, isTemp: true }), tokenFor({ id: 0, _id: accountId, isTemp: false }), tokenFor({ id: 295 }), tokenFor({ id: 295, _id: "4707bee9-6918-4705-beb0-daa1d56d5a99", isTemp: false })]) {
      const fetch = fetcher([actor, organizations, ownerMembers]);
      expect((await runActorPreflight(ownerContract(), token, { fetch })).status).toBe("BLOCKED");
      expect(fetch).toHaveBeenCalledTimes(1);
    }
    const wrongIdentity = fetcher([{ user: { ...actor.user, id: "4707bee9-6918-4705-beb0-daa1d56d5a99" } }, organizations, ownerMembers]);
    expect((await runActorPreflight(ownerContract(), tokenFor(), { fetch: wrongIdentity })).status).toBe("BLOCKED");
    expect(wrongIdentity).toHaveBeenCalledTimes(1);
  });
  it("checks owner-derived effective coach in the exact organization/program/cohort", async () => {
    const fetch = fetcher([actor, organizations, programs, coachDetail, ownerMembers]);
    const report = await runActorPreflight(coachContract(), tokenFor(), { fetch });
    expect(report).toMatchObject({ status: "PASS", cohortCoachRole: "VERIFIED" });
    expect(report.results.some(row => row.check === "cohort-44-self-joined-coach")).toBe(false);
    expect(fetch.mock.calls.map(call => call[0])).toEqual([
      "https://server-dev.daodao.so/api/v1/auth/me",
      "https://server-dev.daodao.so/api/v1/lighthouse/organizations",
      "https://server-dev.daodao.so/api/v1/lighthouse/programs?organizationId=17",
      "https://server-dev.daodao.so/api/v1/lighthouse/programs/22/cohorts/44",
      "https://server-dev.daodao.so/api/v1/lighthouse/organizations/17/members",
    ]);
    expect(JSON.stringify(report)).not.toMatch(/PRIVATE|server-validated-signature/);
  });
  it("does not equate joined learner, invited coach or another actor's coach row with a joined coach", async () => {
    const joined = await runActorPreflight(coachContract("joined-enrollment"), tokenFor(), { fetch: fetcher([actor, organizations, programs, coachDetail, coachRows]) });
    expect(joined).toMatchObject({ status: "PASS", cohortCoachRole: "VERIFIED", organizationRole: "NOT_VERIFIED" });
    for (const rows of [
      [{ userId: 295, role: "member", status: "joined" }],
      [{ userId: 295, role: "assistant", status: "invited" }],
      [{ userId: 295, role: "owner", status: "exited" }],
      [{ userId: 296, role: "owner", status: "joined" }],
      [{ userId: 295, role: "owner" }],
      [coachRows[0], coachRows[0]],
    ]) expect((await runActorPreflight(coachContract("joined-enrollment"), tokenFor(), { fetch: fetcher([actor, organizations, programs, coachDetail, rows]) })).status).toBe("BLOCKED");
  });
  it("rejects parent, cohort and status substitution even when all endpoints return 200", async () => {
    for (const [programData, cohortData] of [
      [[{ id: 22, organizationId: 18 }], coachDetail],
      [[{ id: 23, organizationId: 17 }], coachDetail],
      [programs, { ...coachDetail, id: 45 }],
      [programs, { ...coachDetail, programId: 23 }],
      [programs, { ...coachDetail, status: "draft" }],
    ]) expect((await runActorPreflight(coachContract(), tokenFor(), { fetch: fetcher([actor, organizations, programData, cohortData, ownerMembers]) })).status).toBe("BLOCKED");
  });
  it("fails closed when the actor lacks the current management API prerequisite", async () => {
    const values = [actor, organizations, programs]; let index = 0;
    const fetch = vi.fn(async () => index < values.length
      ? new Response(JSON.stringify({ data: values[index++] }))
      : new Response("PRIVATE missing organization membership", { status: 403 }));
    const report = await runActorPreflight(coachContract("joined-enrollment"), tokenFor(), { fetch });
    expect(report).toMatchObject({ status: "BLOCKED", cohortCoachRole: "NOT_VERIFIED" });
    expect(JSON.stringify(report)).not.toContain("PRIVATE");
  });
});
