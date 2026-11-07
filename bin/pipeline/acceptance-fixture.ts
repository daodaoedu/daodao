/** API-only issue463 fixtures. Invitation tokens never enter this tool. */
import { z } from 'zod';
export const DEV_ORIGIN = 'https://server-dev.daodao.so/api/v1';
const ROOT = '/lighthouse/admin/organizations';
export type FixtureCommand = 'prepare' | 'check' | 'cleanup' | 'rebuild';
export interface FixtureCredentials { adminToken: string; applicantToken: string; recipientEmail: string }
export interface FixtureScenario { kind: 'cancel' | 'approve'; name: string; organizationId?: number; invitationId?: number; requestId?: number; retired?: boolean }
export interface FixtureManifest {
  version: 1; runId: string; createdAt: string; predecessorRunId?: string;
  scenarios: FixtureScenario[];
  journal?: { action: 'create' | 'revoke' | 'suspend'; scenario: 'cancel' | 'approve'; invitationId?: number };
}
export interface FixtureDependencies { fetch: typeof fetch; now: () => Date; id: () => string; save: (manifest: FixtureManifest) => Promise<void> }
export interface FixtureResult { manifest: FixtureManifest; ready: boolean; findings: string[]; status?: 'retired' }
type Org = { id: number; name: string; status: string };
type Invitation = { id: number; email: string; status: string; expiresAt: string; deliveryStatus: string; requests: { id: number; userId: number }[] };
function fail(message: string): never { throw new Error(message) }
export function newFixtureManifest(runId: string, now: Date): FixtureManifest {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(runId)) fail('Invalid unique run ID');
  return { version: 1, runId, createdAt: now.toISOString(), scenarios: ['cancel', 'approve'].map(kind => ({ kind: kind as FixtureScenario['kind'], name: `QA463-${runId}-${kind}` })) };
}
const positiveId = z.number().int().positive();
export const fixtureManifestSchema = z.object({
  version: z.literal(1), runId: z.string().regex(/^[a-zA-Z0-9-]{8,80}$/), createdAt: z.string().datetime(), predecessorRunId: z.string().regex(/^[a-zA-Z0-9-]{8,80}$/).optional(),
  scenarios: z.array(z.object({kind:z.enum(['cancel','approve']),name:z.string(),organizationId:positiveId.optional(),invitationId:positiveId.optional(),requestId:positiveId.optional(),retired:z.boolean().optional()}).strict()).length(2),
  journal: z.object({action:z.enum(['create','revoke','suspend']),scenario:z.enum(['cancel','approve']),invitationId:positiveId.optional()}).strict().optional()
}).strict().superRefine((m,ctx)=>{
  for(let n=0;n<2;n++) {
    const s=m.scenarios[n],kind=n===0?'cancel':'approve';
    if(s.kind!==kind || s.name!==`QA463-${m.runId}-${kind}`) ctx.addIssue({code:'custom',message:'Foreign fixture name'});
    if((s.invitationId!==undefined||s.requestId!==undefined||s.retired!==undefined)&&s.organizationId===undefined) ctx.addIssue({code:'custom',message:'Missing organization ID'});
  }
  if(m.scenarios[0].organizationId!==undefined&&m.scenarios[0].organizationId===m.scenarios[1].organizationId) ctx.addIssue({code:'custom',message:'Scenarios must use separate organizations'});
  if(m.journal) {
    const s=m.scenarios.find(s=>s.kind===m.journal!.scenario)!;
    if((m.journal.action==='revoke')!==(m.journal.invitationId!==undefined)|| (m.journal.action!=='create'&&!s.organizationId)) ctx.addIssue({code:'custom',message:'Invalid journal'});
  }
});
function validate(m: FixtureManifest) { if(!fixtureManifestSchema.safeParse(m).success) fail('Invalid fixture manifest'); }
/** Never echo response bodies: they may contain private identity data. */
export async function runFixture(command: FixtureCommand, source: FixtureManifest, credentials: FixtureCredentials, deps: FixtureDependencies): Promise<FixtureResult> {
  let manifest = structuredClone(source);
  validate(manifest);
  if (!['prepare', 'check', 'cleanup', 'rebuild'].includes(command)) fail('Unsupported command');
  if (!credentials.adminToken || !credentials.applicantToken || credentials.adminToken === credentials.applicantToken || !/^[^\s@]+@[^\s@]+$/.test(credentials.recipientEmail)) fail('Distinct real credentials and approved recipient required');
  const recipient = credentials.recipientEmail.trim().toLowerCase();
  async function api(method: string, path: string, body?: unknown, actor: 'admin' | 'applicant' = 'admin', expected = 200): Promise<any> {
    let response: Response;
    try { response = await deps.fetch(DEV_ORIGIN + path, { method, redirect: 'error', headers: { authorization: `Bearer ${actor === 'admin' ? credentials.adminToken : credentials.applicantToken}`, 'content-type': 'application/json', 'User-Agent':'Mozilla/5.0 DaodaoAcceptanceFixtures' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20_000) }); }
    catch { fail('Request outcome unknown; reconcile journal before another write') }
    if (response.status !== expected) fail(`API ${method} failed (${response.status})`);
    let envelope: any;
    try { envelope = await response.json(); } catch { fail('Invalid API response; reconcile journal') }
    if (expected === 403) {
      if (envelope?.success !== false || envelope.data != null) fail('Denial must be a product error without data');
      return null;
    }
    return envelope.data;
  }
  // Tokens are issued by the server; decoded claims are cross-checked with authenticated live reads.
  async function identity(token: string, id: number, role: string, actor: 'admin' | 'applicant') {
    let claims: any;
    try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); } catch { fail('Invalid identity token') }
    if (claims.id !== id || claims.isTemp || typeof claims._id !== 'string' || !Array.isArray(claims.roles) || !claims.roles.includes(role) || (actor === 'applicant' && claims.roles.some((r: string) => /admin/i.test(r)))) fail('Unexpected account identity or role');
    const me = await api('GET', '/users/me', undefined, actor);
    if (!me || me.id !== claims._id || me.role !== (actor === 'admin' ? 5 : 2)) fail('Authenticated identity mismatch');
  }
  await identity(credentials.adminToken, 301, 'Admin', 'admin');
  // Retirement needs only the live admin; expired/drifted applicant sessions must not strand fixtures.
  if (command !== 'cleanup') {
    await identity(credentials.applicantToken, 328, 'User', 'applicant');
    await api('GET', ROOT, undefined, 'applicant', 403);
  }
  async function organizations(): Promise<Org[]> {
    const rows = await api('GET', ROOT);
    if (!Array.isArray(rows)) fail('Invalid organization list');
    return rows;
  }
  await organizations();
  async function owned(s: FixtureScenario): Promise<Org> {
    const rows = await organizations(), matches = rows.filter(o => o.name === s.name);
    if (!s.organizationId || matches.length !== 1 || matches[0].id !== s.organizationId) fail('Exact fixture ownership not established');
    return matches[0];
  }
  async function invitations(s: FixtureScenario): Promise<Invitation[]> {
    const rows = await api('GET', `${ROOT}/${s.organizationId}/invitations`);
    if (!Array.isArray(rows)) fail('Invalid invitation list');
    return rows;
  }
  async function persist() { await deps.save(structuredClone(manifest)); }
  async function mutate(s: FixtureScenario, action: 'create' | 'revoke' | 'suspend', path: string, body?: unknown, invitationId?: number) {
    if (manifest.journal) fail('Unresolved write journal');
    manifest.journal = { action, scenario: s.kind, ...(invitationId === undefined ? {} : { invitationId }) };
    await persist(); // Failure here prevents the HTTP mutation.
    const result = await api(action === 'suspend' ? 'PATCH' : 'POST', path, body, 'admin', action === 'create' ? 201 : 200);
    if (action === 'create') {
      if (!result || !Number.isSafeInteger(result.id) || result.name !== s.name) fail('Create response cannot establish ownership');
      s.organizationId = result.id;
    }
    delete manifest.journal;
    await persist();
  }
  async function reconcile() {
    const j = manifest.journal;
    if (!j) return;
    const s = manifest.scenarios.find(s => s.kind === j.scenario)!;
    if (j.action === 'create') {
      const matches = (await organizations()).filter(o => o.name === s.name);
      // Zero matches cannot prove an earlier request will not commit later. No blind retry.
      if (matches.length !== 1 || (s.organizationId !== undefined && s.organizationId !== matches[0].id)) fail('Ambiguous creation; manual reconciliation required');
      s.organizationId = matches[0].id;
    } else {
      const org = await owned(s);
      if (j.action === 'suspend' && org.status !== 'suspended') fail('Ambiguous suspension; manual reconciliation required');
      if (j.action === 'revoke') {
        const row = (await invitations(s)).find(i => i.id === j.invitationId);
        if (!row || row.status !== 'revoked') fail('Ambiguous revocation; manual reconciliation required');
      }
    }
    delete manifest.journal;
    await persist();
  }
  async function prepare() {
    await reconcile();
    for (const s of manifest.scenarios) if (s.organizationId) await owned(s);
    for (const s of manifest.scenarios) {
      if (s.retired) fail('Retired run must be rebuilt');
      if (!s.organizationId) {
        if ((await organizations()).some(o => o.name === s.name)) fail('Unjournaled organization exists; refuse adoption');
        await mutate(s, 'create', ROOT, { name: s.name, ownerEmail: recipient });
      }
      const org = await owned(s);
      if (org.status !== 'active') fail('Prepared organization is not active');
      const members = await api('GET', `${ROOT}/${s.organizationId}/members`);
      const rows = await invitations(s);
      if (!Array.isArray(members) || members.length || rows.length !== 1 || rows[0].status !== 'pending' || rows[0].email.toLowerCase() !== recipient) fail('Pending empty-members fixture not established; cleanup owned run');
      if (s.invitationId !== undefined && s.invitationId !== rows[0].id) fail('Invitation changed; rebuild required');
      s.invitationId = rows[0].id;
      await persist();
    }
  }
  async function check(): Promise<FixtureResult> {
    const findings: string[] = [];
    if (manifest.journal) return { manifest, ready: false, findings: ['Unresolved mutation; run prepare/cleanup to reconcile'] };
    for (const s of manifest.scenarios) {
      if (!s.organizationId) { findings.push(`${s.kind}: not prepared`); continue; }
      const org = await owned(s), rows = await invitations(s);
      const members = await api('GET', `${ROOT}/${s.organizationId}/members`);
      const row = rows.find(i => i.id === s.invitationId);
      if (s.retired || org.status !== 'active' || !Array.isArray(members) || members.length || rows.length !== 1 || !row || row.status !== 'pending' || row.email.toLowerCase() !== recipient || !Number.isFinite(Date.parse(row.expiresAt)) || Date.parse(row.expiresAt) - deps.now().getTime() < 60 * 60 * 1000) { findings.push(`${s.kind}: consumed, expired, changed, or inactive; rebuild required`); continue; }
      if (row.deliveryStatus !== 'sent') findings.push(`${s.kind}: delivery not confirmed by SMTP`);
      if (row.requests.length !== 1 || row.requests[0].userId !== 328 || (s.requestId !== undefined && s.requestId !== row.requests[0].id)) findings.push(`${s.kind}: awaiting genuine inbox workflow by ordinary user328`);
      else s.requestId = row.requests[0].id;
      await api('GET', `/lighthouse/organizations/${s.organizationId}`, undefined, 'applicant', 403);
    }
    // check makes GET requests only; its public snapshot may be persisted by the caller.
    return { manifest, ready: findings.length === 0, findings };
  }
  async function cleanup() {
    await reconcile();
    // Establish ownership of every known organization before changing any of them.
    for (const s of manifest.scenarios) if (s.organizationId) await owned(s);
    for (const s of manifest.scenarios) {
      if (!s.organizationId) continue;
      const org = await owned(s);
      let rows = await invitations(s);
      if (org.status === 'suspended') {
        if (rows.some(i => i.status === 'pending' || i.status === 'expired')) fail('Suspended organization has unrevoked links; manual review required');
      } else if (org.status === 'active') {
        for (const row of rows.filter(i => i.status === 'pending' || i.status === 'expired')) {
          await owned(s);
          await mutate(s, 'revoke', `${ROOT}/${s.organizationId}/invitations/${row.id}/revoke`, undefined, row.id);
        }
        rows = await invitations(s);
        if (rows.some(i => i.status === 'pending' || i.status === 'expired')) fail('Unrevoked invitations remain');
        await owned(s);
        await mutate(s, 'suspend', `${ROOT}/${s.organizationId}`, { status: 'suspended' });
      } else fail('Unexpected organization status');
      if ((await owned(s)).status !== 'suspended') fail('Suspension readback failed');
      if ((await invitations(s)).some(i => i.status === 'pending' || i.status === 'expired')) fail('Cleanup readback failed');
      s.retired = true;
      await persist();
    }
  }
  if (command === 'check') return check();
  if (command === 'cleanup') { await cleanup(); return { manifest, ready: false, status: 'retired', findings: ['Retired; approved owners and audit history retained'] }; }
  if (command === 'rebuild') {
    await cleanup();
    const previous = manifest.runId;
    manifest = newFixtureManifest(deps.id(), deps.now());
    if (manifest.runId === previous) fail('Rebuild requires a fresh run ID');
    manifest.predecessorRunId = previous;
    await persist();
  }
  await prepare();
  const result = await check();
  await persist();
  return result;
}
