import { describe, it, expect, vi } from 'vitest';
import { DEV_ORIGIN, newFixtureManifest, runFixture, fixtureManifestSchema, type FixtureManifest } from '../acceptance-fixture.js';
const now = new Date('2026-11-07T00:00:00Z');
const token = (id:number,role:string) => `x.${Buffer.from(JSON.stringify({id,_id:`uuid-${id}`,roles:[role],isTemp:false})).toString('base64url')}.x`;
const creds = {adminToken:token(301,'Admin'),applicantToken:token(328,'User'),recipientEmail:'controlled+qa463@example.com'};
function harness() {
  let next=50;
  const orgs:any[]=[]; const rows=new Map<number,any[]>(); const members=new Map<number,any[]>();
  const calls:{method:string;path:string;body:any}[]=[];
  const saves:FixtureManifest[]=[];
  let uncertain=false;
  const fetcher=vi.fn(async(input:any,init:any)=>{
    const path=String(input).replace(DEV_ORIGIN,''), method=init.method, body=init.body?JSON.parse(init.body):undefined;
    calls.push({method,path,body});
    expect(String(input).startsWith(DEV_ORIGIN+'/')).toBe(true);
    expect(path).not.toMatch(/accept|approve|resend|auth\/dev-login/);
    const applicant=init.headers.authorization.includes(creds.applicantToken);
    const reply=(data:any,status=200)=>new Response(JSON.stringify({data,...(status===403?{success:false}:{})}),{status});
    if(path==='/users/me') return reply({id:`uuid-${applicant?328:301}`,role:applicant?2:5});
    if(path==='/lighthouse/admin/organizations') {
      if(applicant)return reply(null,403);
      if(method==='GET')return reply(orgs);
      const o={id:next++,name:body.name,status:'active'};orgs.push(o);
      rows.set(o.id,[{id:next++,email:body.ownerEmail,status:'pending',deliveryStatus:'sent',expiresAt:'2026-11-09T00:00:00Z',requests:[]}]); members.set(o.id,[]);
      if(uncertain){uncertain=false;throw Error('network lost after commit')}
      return reply(o,201);
    }
    const id=Number(path.split('/')[4]), org=orgs.find(o=>o.id===id);
    if(path.startsWith('/lighthouse/organizations/'))return reply(null,403);
    if(path.endsWith('/members'))return reply(members.get(id));
    if(path.endsWith('/invitations'))return reply(rows.get(id));
    if(path.endsWith('/revoke')) { rows.get(id)!.find(i=>i.id===Number(path.split('/')[6])).status='revoked';return reply({}); }
    if(method==='PATCH'){org.status=body.status;return reply(org)}
    throw Error('Unexpected request');
  }) as typeof fetch;
  const deps={fetch:fetcher,now:()=>now,id:()=> 'replacement-run',save:async(m:FixtureManifest)=>{saves.push(structuredClone(m))}};
  return {orgs,rows,members,calls,saves,deps,setUncertain:()=>{uncertain=true}};
}
const initial=()=>newFixtureManifest('first-run',now);
async function prepared(h:ReturnType<typeof harness>) {return (await runFixture('prepare',initial(),creds,h.deps)).manifest}
describe('issue463 API-only fixture lifecycle',()=>{
  it('creates isolated cancel/approve orgs and waits for actual inbox requests without reading tokens',async()=>{
    const h=harness(),r=await runFixture('prepare',initial(),creds,h.deps);
    expect(r.ready).toBe(false);expect(r.findings).toHaveLength(2);
    expect(new Set(r.manifest.scenarios.map(s=>s.organizationId)).size).toBe(2);
    expect(JSON.stringify(r.manifest)).not.toContain(creds.recipientEmail);
    expect(JSON.stringify(r.manifest)).not.toContain(creds.adminToken);
    expect(h.saves.some(m=>m.journal?.action==='create')).toBe(true);
    const before=h.calls.length;await runFixture('prepare',r.manifest,creds,h.deps);
    expect(h.calls.slice(before).every(c=>c.method==='GET')).toBe(true);
  });
  it('check discovers real requests through GET only and rejects consumed/expiring fixtures',async()=>{
    const h=harness(),m=await prepared(h);
    for(const s of m.scenarios)h.rows.get(s.organizationId!)![0].requests=[{id:90+s.organizationId!,userId:328}];
    h.calls.length=0;const r=await runFixture('check',m,creds,h.deps);
    expect(r.ready).toBe(true);expect(r.manifest.scenarios.every(s=>s.requestId)).toBe(true);
    expect(h.calls.every(c=>c.method==='GET')).toBe(true);
    h.rows.get(m.scenarios[0].organizationId!)![0].status='accepted';
    expect((await runFixture('check',m,creds,h.deps)).ready).toBe(false);
    h.rows.get(m.scenarios[0].organizationId!)![0].status='pending';
    h.rows.get(m.scenarios[0].organizationId!)![0].expiresAt='2026-11-07T00:20:00Z';
    expect((await runFixture('check',m,creds,h.deps)).ready).toBe(false);
  });
  it('rejects wrong account roles before business writes',async()=>{
    const h=harness();await expect(runFixture('prepare',initial(),{...creds,applicantToken:token(328,'Admin')},h.deps)).rejects.toThrow(/role/);
    expect(h.calls.every(c=>c.method==='GET')).toBe(true);
    const bad=async(input:any,init:any)=>String(input).endsWith('/users/me')?new Response(JSON.stringify({data:{id:'uuid-301',role:2}})):h.deps.fetch(input,init);
    await expect(runFixture('prepare',initial(),creds,{...h.deps,fetch:bad as typeof fetch})).rejects.toThrow(/identity/);
  });
  it('rejects WAF HTML and denied responses containing organization data',async()=>{
    for(const payload of ['<html>Forbidden</html>',JSON.stringify({success:false,data:{id:1}})]) {
      const h=harness();const custom=async(input:any,init:any)=>init.headers.authorization.includes(creds.applicantToken)&&String(input).endsWith('/lighthouse/admin/organizations')?new Response(payload,{status:403}):h.deps.fetch(input,init);
      await expect(runFixture('prepare',initial(),creds,{...h.deps,fetch:custom as typeof fetch})).rejects.toThrow(/API response|without data/);
      expect(h.calls.every(c=>c.method==='GET')).toBe(true);
    }
  });
  it('validates all known ownership before creating an absent other scenario',async()=>{
    const h=harness(),m=initial();m.scenarios[1].organizationId=999;
    await expect(runFixture('prepare',m,creds,h.deps)).rejects.toThrow(/ownership/);
    expect(h.calls.every(c=>c.method==='GET')).toBe(true);
    await expect(runFixture('cleanup',m,creds,h.deps)).rejects.toThrow(/ownership/);
    expect(h.calls.every(c=>c.method==='GET')).toBe(true);
  });
  it('revokes before suspension, preserves accepted owners, and cleanup is idempotent',async()=>{
    const h=harness(),m=await prepared(h), approved=m.scenarios[1].organizationId!;
    h.rows.get(approved)![0].status='accepted';h.members.set(approved,[{userId:328,role:'owner'}]);h.calls.length=0;
    const r=await runFixture('cleanup',m,creds,h.deps);
    expect(r.status).toBe('retired');expect(h.members.get(approved)).toHaveLength(1);
    const writes=h.calls.filter(c=>c.method!=='GET');expect(writes.map(c=>c.method)).toEqual(['POST','PATCH','PATCH']);
    expect(writes[0].path).toMatch(/revoke$/);expect(h.orgs.every(o=>o.status==='suspended')).toBe(true);
    h.calls.length=0;await runFixture('cleanup',r.manifest,creds,h.deps);expect(h.calls.every(c=>c.method==='GET')).toBe(true);
  });
  it('journals ambiguous committed creates and reconciles without duplicate organization',async()=>{
    const h=harness();h.setUncertain();await expect(runFixture('prepare',initial(),creds,h.deps)).rejects.toThrow(/unknown/);
    const pending=h.saves.at(-1)!;expect(pending.journal?.action).toBe('create');
    const result=await runFixture('prepare',pending,creds,h.deps);expect(h.orgs).toHaveLength(2);expect(result.manifest.journal).toBeUndefined();
  });
  it('does not retry an ambiguous create with no matching organization',async()=>{
    const h=harness(),m=initial();m.journal={action:'create',scenario:'cancel'};
    await expect(runFixture('prepare',m,creds,h.deps)).rejects.toThrow(/Ambiguous/);expect(h.calls.every(c=>c.method==='GET')).toBe(true);
  });
  it('durable save failure blocks writes and rebuild retires before creating fresh IDs',async()=>{
    const h=harness();await expect(runFixture('prepare',initial(),creds,{...h.deps,save:async()=>{throw Error('disk')}})).rejects.toThrow('disk');
    expect(h.calls.every(c=>c.method==='GET')).toBe(true);
    const m=await prepared(h);h.calls.length=0;const r=await runFixture('rebuild',m,creds,h.deps);
    expect(r.manifest.runId).toBe('replacement-run');expect(r.manifest.predecessorRunId).toBe('first-run');
    expect(r.manifest.scenarios.every(s=>!m.scenarios.some(old=>old.organizationId===s.organizationId))).toBe(true);
    const writes=h.calls.filter(c=>c.method!=='GET');expect(writes.slice(-2).map(c=>c.body?.name)).toEqual(['QA463-replacement-run-cancel','QA463-replacement-run-approve']);
  });
  it.each(['revoke', 'suspend'] as const)('reconciles interrupted committed %s without repeating that write',async(action)=>{
    const h=harness(),m=await prepared(h),scenario=m.scenarios[0];
    const fetchWithLostResponse=async(input:any,init:any)=>{
      const response=await h.deps.fetch(input,init);
      if((action==='revoke'&&String(input).endsWith('/revoke'))||(action==='suspend'&&init.method==='PATCH'))throw Error('response lost after commit');
      return response;
    };
    await expect(runFixture('cleanup',m,creds,{...h.deps,fetch:fetchWithLostResponse as typeof fetch})).rejects.toThrow(/unknown/);
    const interrupted=h.saves.at(-1)!;
    expect(interrupted.journal?.action).toBe(action);
    expect(interrupted.journal?.scenario).toBe('cancel');
    h.calls.length=0;
    const result=await runFixture('cleanup',interrupted,creds,h.deps);
    expect(result.status).toBe('retired');expect(result.manifest.journal).toBeUndefined();
    const retried=h.calls.filter(c=>c.method!=='GET'&&c.path.startsWith(`/lighthouse/admin/organizations/${scenario.organizationId}`));
    expect(retried.filter(c=>action==='revoke'?c.path.endsWith('/revoke'):c.method==='PATCH')).toHaveLength(0);
  });
  it('blocks cleanup of an already suspended fixture with an unrevoked pending invitation',async()=>{
    const h=harness(),m=await prepared(h);h.orgs[0].status='suspended';h.calls.length=0;
    await expect(runFixture('cleanup',m,creds,h.deps)).rejects.toThrow(/Suspended organization has unrevoked/);
    expect(h.calls.every(c=>c.method==='GET')).toBe(true);
  });
  it('refuses readiness for a changed request or unexpected existing member',async()=>{
    for(const drift of ['request','member']) {
      const h=harness(),m=await prepared(h);
      for(const scenario of m.scenarios){
        const requestId=90+scenario.organizationId!;scenario.requestId=requestId;
        h.rows.get(scenario.organizationId!)![0].requests=[{id:requestId,userId:328}];
      }
      const first=m.scenarios[0];
      if(drift==='request') h.rows.get(first.organizationId!)![0].requests[0].id++;
      else h.members.set(first.organizationId!,[{userId:301,role:'owner'}]);
      h.calls.length=0;expect((await runFixture('check',m,creds,h.deps)).ready).toBe(false);
      expect(h.calls.every(c=>c.method==='GET')).toBe(true);
    }
  });
  it('accepts exactly one hour remaining and rejects one millisecond less',async()=>{
    const h=harness(),m=await prepared(h);
    for(const scenario of m.scenarios){const row=h.rows.get(scenario.organizationId!)![0];row.requests=[{id:90+scenario.organizationId!,userId:328}];row.expiresAt=new Date(now.getTime()+3_600_000).toISOString();}
    expect((await runFixture('check',m,creds,h.deps)).ready).toBe(true);
    h.rows.get(m.scenarios[0].organizationId!)![0].expiresAt=new Date(now.getTime()+3_599_999).toISOString();
    expect((await runFixture('check',m,creds,h.deps)).ready).toBe(false);
  });
  it('strictly rejects secret fields, malformed journal and overlapping scenario IDs before network',async()=>{
    const h=harness();for(const m of [{...initial(),token:'secret'},{...initial(),journal:{action:'accept',scenario:'cancel'}},{...initial(),scenarios:initial().scenarios.map(s=>({...s,organizationId:1}))}]){
      expect(fixtureManifestSchema.safeParse(m).success).toBe(false);
      await expect(runFixture('prepare',m as FixtureManifest,creds,h.deps)).rejects.toThrow(/manifest/);
    }expect(h.calls).toHaveLength(0);
  });
});
