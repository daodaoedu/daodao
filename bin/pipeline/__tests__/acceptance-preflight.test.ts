import { mkdtempSync, writeFileSync, readFileSync, linkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { checkPracticeResources, runAcceptancePreflight, acceptancePreflightContractSchema } from "../acceptance-preflight.js";

const accountEmail = "pm@example.com";
const practiceId = "3d9995e3-ec8e-4199-9078-2cc02842f13d";
const ownerId = "4707bee9-6918-4705-beb0-daa1d56d5a99";
const contract = { kind: "practice-resources", accountEmail, practiceId, resourceDays: [2, 5, null], requireUnlocked: true } as const;
const me = { id: ownerId, email: accountEmail };
const detail = (resources: unknown[] = [2, 5, null].map(dayNumber => ({ dayNumber, isLocked: false }))) => ({ id: practiceId, user: { id: ownerId }, resources });
const parsed = () => acceptancePreflightContractSchema.parse(contract);
const checks = (value: unknown, actor: unknown = me) => checkPracticeResources(parsed(), actor, value);
const passes = (value: unknown, actor: unknown = me) => checks(value, actor).every(result => result.status === "PASS");
const fetcher = (responses: {status: number; data?: unknown}[]) => vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => { const r = responses.shift(); if (!r) throw new Error("unexpected request"); return new Response(JSON.stringify({ data: r.data }), {status:r.status}); });

describe("acceptance fixture contract", () => {
  it("requires a strict bounded practice contract and explicit unlocked requirement", () => {
    expect(acceptancePreflightContractSchema.safeParse(contract).success).toBe(true);
    for (const changed of [{...contract, endpoint:"https://evil.example"}, {...contract, practiceId:"x"}, {...contract, requireUnlocked:undefined}, {...contract, requireUnlocked:false}, {...contract, resourceDays:[]}, {...contract, resourceDays:[0]}, {...contract, resourceDays:[1.5]}]) {
      expect(acceptancePreflightContractSchema.safeParse(changed).success).toBe(false);
    }
  });
  it("accepts exactly the required unlocked resources regardless of order", () => {
    expect(passes(detail([{dayNumber:null,isLocked:false},{dayNumber:5,isLocked:false},{dayNumber:2,isLocked:false}]))).toBe(true);
  });
  it("rejects the original #332 fixture without day 5", () => {
    expect(passes(detail([null,2,null].map(dayNumber => ({dayNumber,isLocked:false}))))).toBe(false);
  });
  it("does not substitute another unlocked resource for a locked or missing-lock resource", () => {
    for (const first of [{dayNumber:2,isLocked:true},{dayNumber:2}]) expect(passes(detail([first,{dayNumber:5,isLocked:false},{dayNumber:null,isLocked:false}]))).toBe(false);
  });
  it("distinguishes missing day 5 from a locked day 5 in bounded observations", () => {
    const missing = checks(detail([2,null,null].map(dayNumber=>({dayNumber,isLocked:false})))).find(x=>x.check==="resource-2");
    const locked = checks(detail([{dayNumber:2,isLocked:false},{dayNumber:5,isLocked:true},{dayNumber:null,isLocked:false}])).find(x=>x.check==="resource-2");
    expect(missing?.status).toBe("BLOCKED");
    expect(locked?.status).toBe("BLOCKED");
    expect(missing?.actual).toEqual([{dayNumber:null,isLocked:false},{dayNumber:null,isLocked:false}]);
    expect(locked?.actual).toEqual([{dayNumber:5,isLocked:true},{dayNumber:null,isLocked:false}]);
  });
  it("projects at most 100 resources and never copies names, URLs or invalid field values", () => {
    const values = [{name:"private-name",url:"https://secret.example",dayNumber:"private-value",isLocked:{token:"secret-token"}},{}, ...Array.from({length:101},()=>({dayNumber:5,isLocked:true}))];
    const failed = checks(detail(values)).find(x=>x.check==="resource-1");
    expect((failed?.actual as unknown[]).length).toBe(100);
    expect((failed?.actual as unknown[]).slice(0,2)).toEqual([{dayNumber:"invalid",isLocked:"invalid"},{dayNumber:"missing",isLocked:"missing"}]);
    expect(JSON.stringify(failed?.actual)).not.toMatch(/private|secret/);
  });
  it("does not treat an absent dayNumber as null", () => {
    expect(passes(detail([{dayNumber:2,isLocked:false},{dayNumber:5,isLocked:false},{isLocked:false}]))).toBe(false);
  });
  it("rejects wrong actor account, wrong owner, missing owner and wrong practice id", () => {
    expect(passes(detail(), {...me,email:"other@example.com"})).toBe(false);
    expect(passes({...detail(), user:{id:"other"}})).toBe(false);
    expect(passes({...detail(), user:undefined})).toBe(false);
    expect(passes({...detail(), id:"other"})).toBe(false);
  });
  it("matches duplicate days one-for-one and enforces exact resource count", () => {
    const twice = acceptancePreflightContractSchema.parse({...contract,resourceDays:[2,2,null]});
    expect(checkPracticeResources(twice,me,detail()).every(x=>x.status==="PASS")).toBe(false);
    expect(checkPracticeResources(twice,me,detail([2,2,null].map(dayNumber=>({dayNumber,isLocked:false})))).every(x=>x.status==="PASS")).toBe(true);
    expect(passes(detail([...detail().resources,{dayNumber:5,isLocked:false}]))).toBe(false);
  });
});

describe("read-only preflight runner", () => {
  it("only sends fixed-origin GET requests and returns bounded report without secrets", async () => {
    const fetch = fetcher([{status:200,data:me},{status:200,data:detail()}]);
    const report = await runAcceptancePreflight(contract,"secret-token",{fetch, now:()=>new Date("2026-11-01T00:00:00Z")});
    expect(report.status).toBe("PASS");
    expect(report.checkedAt).toBe("2026-11-01T00:00:00.000Z");
    expect(report.contractDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(fetch.mock.calls.map(args => args[0])).toEqual(["https://server-dev.daodao.so/api/v1/users/me",`https://server-dev.daodao.so/api/v1/practices/${practiceId}`]);
    for (const args of fetch.mock.calls) expect(args[1]).toMatchObject({method:"GET",redirect:"error"});
    expect(JSON.stringify(report)).not.toContain("secret-token");
  });
  it("reports HTTP failures without exposing response content or continuing", async () => {
    const fetch = fetcher([{status:403,data:{token:"DO-NOT-PRINT"}}]);
    const report = await runAcceptancePreflight(contract,"secret-token",{fetch});
    expect(report.status).toBe("BLOCKED");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(report)).not.toContain("DO-NOT-PRINT");
  });
  it("blocks invalid JSON and missing data envelopes without leaking response bodies", async () => {
    for (const response of [new Response("not-json-sensitive"),new Response(JSON.stringify({secret:"hidden"}))]) {
      const report = await runAcceptancePreflight(contract,"token",{fetch:vi.fn().mockResolvedValue(response)});
      expect(report.status).toBe("BLOCKED");
      expect(JSON.stringify(report)).not.toContain("sensitive");
      expect(JSON.stringify(report)).not.toContain("hidden");
    }
  });
  it("never follows redirects or attempts a caller-selected endpoint", async () => {
    const fetch = fetcher([{status:302}]);
    const report = await runAcceptancePreflight(contract,"token",{fetch});
    expect(report.status).toBe("BLOCKED");
    expect(fetch.mock.calls[0][1]?.redirect).toBe("error");
    const forbidden = vi.fn();
    expect((await runAcceptancePreflight({...contract, origin:"https://evil.example"},"token",{fetch:forbidden})).status).toBe("BLOCKED");
    expect(forbidden).not.toHaveBeenCalled();
  });
  it("reports failed practice reads and transport errors", async () => {
    const fetch = fetcher([{status:200,data:me},{status:404}]);
    expect((await runAcceptancePreflight(contract,"token",{fetch})).status).toBe("BLOCKED");
    expect((await runAcceptancePreflight(contract,"token",{fetch:vi.fn().mockRejectedValue(new Error("secret-token"))})).status).toBe("BLOCKED");
  });
  it("rejects invalid contracts before network access and reports missing token", async () => {
    const fetch = vi.fn();
    expect((await runAcceptancePreflight({...contract,practiceId:"../evil"},"token",{fetch})).status).toBe("BLOCKED");
    expect((await runAcceptancePreflight(contract,"",{fetch})).status).toBe("BLOCKED");
    expect(fetch).not.toHaveBeenCalled();
  });
});


describe("preflight CLI input protection", () => {
  it("refuses an output hardlink to the token before reading or truncating credentials", () => {
    const directory = mkdtempSync(join(tmpdir(),"acceptance-preflight-hardlink-"));
    try {
      const contractPath = join(directory,"contract.json");
      const tokenPath = join(directory,"token.txt");
      const outputPath = join(directory,"report.json");
      writeFileSync(contractPath,JSON.stringify({...contract,practiceId:"invalid-before-network"}));
      writeFileSync(tokenPath,"fake-test-token-never-send");
      linkSync(tokenPath,outputPath);
      const cli = fileURLToPath(new URL("../acceptance-preflight-cli.ts",import.meta.url));
      const run = spawnSync(process.execPath,["--import","tsx",cli,"--contract",contractPath,"--token-file",tokenPath,"--output",outputPath],{encoding:"utf8"});
      expect(run.status).toBe(2);
      expect(run.stderr).toContain("output must not overwrite an input file");
      expect(readFileSync(tokenPath,"utf8")).toBe("fake-test-token-never-send");
      expect(readFileSync(outputPath,"utf8")).toBe("fake-test-token-never-send");
      expect(run.stdout+run.stderr).not.toContain("fake-test-token-never-send");
    } finally { rmSync(directory,{recursive:true,force:true}); }
  });
});
