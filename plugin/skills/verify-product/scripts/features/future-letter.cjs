#!/usr/bin/env node
/* Drive the real Future Letter UI, original delayed job, SMTP boundary and received link. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { assertNotification, assertLoginRedirect, assertOpenedSnapshot } = require('./future-letter-contracts.cjs');
const scripts = path.resolve(__dirname, '..');
const { getPaths, readJson, readState, readPrivate } = require('../paths.cjs');
const paths = getPaths();
const runtime = readState(paths);
const secrets = readPrivate(paths);
const fixtures = readJson(paths.fixturePath);
const f2e = paths.product;
const server = paths.server;
const { chromium, expect } = require(path.join(f2e, 'apps/product/node_modules/@playwright/test'));
const { Client } = require(path.join(server, 'node_modules/pg'));
const { Queue } = require(path.join(server, 'node_modules/bullmq'));
const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`;
const output = path.join(paths.evidence, 'future-letter', runId);
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const write = (name, value) => fs.writeFileSync(path.join(output, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
const primaryFixtureRole = process.env.PRIMARY_FIXTURE_ROLE || 'learner';
const requestedOtherFixtureRole = process.env.OTHER_FIXTURE_ROLE || 'coach';
const owner = fixtures.users.find(user => user.key === primaryFixtureRole);
const other = fixtures.users.find(user => user.key === requestedOtherFixtureRole);
const bodySentinel = `給未來的自己：真實畫面寄出的訊息 ${runId}`;
const currentSentinel = `現在的我正在驗證 Email 送達旅程 ${runId}`;
const runMetadata = { schemaVersion: 1, surface: 'ui', feature: 'future-letter', runId, startedAt: new Date().toISOString() };
const results = [], network = [], errors = [], resourceErrors = [], pending = new Set(), contexts = [];
let browser, db, queue, ownerPage, createdId, actualEmailHref;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const localFetch = (url, options) => fetch(url.replace('://localhost:', '://127.0.0.1:'), options);
const unwrap = body => body?.data?.data ?? body?.data;
async function waitFor(fn, label, timeout = 60000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { const value = await fn(); if (value) return value; await pause(300); }
  throw new Error(`Timed out waiting for ${label}`);
}
function capture(page, label) {
  page.on('pageerror', error => errors.push({ label, type: 'pageerror', message: error.message }));
  page.on('console', msg => { if (msg.type() === 'error') errors.push({ label, type: 'console', message: msg.text() }); });
  page.on('requestfailed', request => resourceErrors.push({ label, method: request.method(), url: request.url(), failure: request.failure()?.errorText }));
  page.on('response', response => {
    if (response.status() >= 400) resourceErrors.push({ label, method: response.request().method(), url: response.url(), status: response.status() });
    if (!/\/api\/v1\/(?:me\/(?:future-letters|timeline)|auth\/me)/.test(response.url())) return;
    const work = (async () => {
      const record = { page: label, method: response.request().method(), url: response.url(), status: response.status(), postData: response.request().postData(), body: await response.text().catch(error => `[unreadable: ${error.message}]`) };
      network.push(record); write('network.json', network);
    })();
    pending.add(work); void work.finally(() => pending.delete(work));
  });
}
async function checkpoint(id, label, action) {
  const startedAt = new Date().toISOString();
  const proof = await action();
  assert.ok(proof && proof.observed && Array.isArray(proof.artifacts), 'each check must return observations and inspectable artifact references');
  results.push({ id, label, result: 'PASS', startedAt, completedAt: new Date().toISOString(), ...proof });
  write('results.json', { ...runMetadata, status: 'RUNNING', checks: results });
  console.log(`${id}: PASS ${label}`);
}
async function newContext(label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-TW', timezoneId: 'Asia/Taipei', recordVideo: { dir: path.join(output, `video-${label}`), size: { width: 1280, height: 900 } } });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  contexts.push({ context, label });
  return context;
}
async function login(context, user, note) {
  const response = await localFetch(`${runtime.apiBase}/api/v1/auth/dev-login`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-login-secret': secrets.devLoginSecret }, body: JSON.stringify({ email: user.email, mode: 'user' }),
  });
  assert.equal(response.status, 200, `${note}: real dev-login response`);
  const body = await response.json();
  assert.equal(body.data.isTemporary, false);
  assert.equal(body.data.user.email, user.email);
  assert.ok(body.data.token);
  await context.addCookies([{ name: 'auth_token', value: body.data.token, url: runtime.productBase, httpOnly: true, sameSite: 'Lax' }]);
  const me = await context.request.get(`${runtime.apiBase}/api/v1/auth/me`);
  assert.equal(me.status(), 200);
  const meBody = unwrap(await me.json());
  assert.equal(meBody.user.email, user.email);
  write(`auth-${note}.json`, { method: 'POST dev-login → cookie fixture → GET auth/me', status: me.status(), isTemporary: meBody.isTemporary, emailVerified: meBody.user.email_verified, roles: meBody.user.roles, fixtureKey: user.key, note: 'This is a verified existing-session fixture; it is not an OAuth-login proof.' });
}
async function snapshot(name) {
  const result = await db.query('SELECT id, external_id::text, user_id, status, deliver_at, sent_at, delivered_at, opened_at, content_ciphertext IS NOT NULL AS encrypted FROM future_letters WHERE external_id::text=$1', [createdId]);
  const letter = result.rows[0]; assert.ok(letter, 'browser-created letter must exist in real DB');
  const job = await queue.getJob(`future-letter-${letter.id}`);
  const emailLogs = await db.query("SELECT id,user_id,entity_type,entity_id,email_code,status,sent_at FROM email_logs WHERE entity_type='future_letter' AND entity_id=$1", [letter.id]);
  const value = { letter, job: job ? { id: job.id, name: job.name, timestamp: job.timestamp, delay: job.delay, configuredDelay: job.opts.delay, data: job.data, attemptsMade: job.attemptsMade, state: await job.getState() } : null, emailLogs: emailLogs.rows };
  write(`snapshot-${name}.json`, value); return value;
}
async function findActualMail() {
  const response = await localFetch(`${runtime.mailpitBase}/api/v1/messages`); assert.equal(response.status, 200);
  const list = await response.json();
  for (const entry of list.messages ?? list.Messages ?? []) {
    const id = entry.ID ?? entry.IDENTIFIER ?? entry.id;
    if (!id) continue;
    const detailResponse = await localFetch(`${runtime.mailpitBase}/api/v1/message/${encodeURIComponent(id)}`);
    if (detailResponse.status !== 200) continue;
    const mail = await detailResponse.json();
    const html = mail.HTML ?? mail.html ?? '';
    if (html.includes(createdId)) return { mail, html, listEntry: entry };
  }
  return null;
}
async function main() {
  assert.ok(owner && other && owner.id !== other.id, 'two distinct isolated fixture users are required');
  for (const target of [runtime.productBase, runtime.apiBase, runtime.mailpitBase]) assert.ok(['localhost', '127.0.0.1', '::1'].includes(new URL(target).hostname), 'only owned loopback runtime targets may be driven');
  assert.equal(Number(new URL(runtime.productBase).port), paths.ports.product);
  assert.equal(Number(new URL(runtime.apiBase).port), paths.ports.api);
  assert.equal(runtime.redis.port, paths.ports.redis); assert.ok(runtime.redis.db > 0, 'the verification queue requires a nonzero Redis database');
  Object.assign(runMetadata, {
    configDigest: paths.configDigest,
    runId, productBase: runtime.productBase, apiBase: runtime.apiBase, mailpitBase: runtime.mailpitBase,
    serverHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: server, encoding: 'utf8' }).trim(),
    frontendHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: f2e, encoding: 'utf8' }).trim(),
    fixtureSelection: { primary: owner.key, requestedOther: requestedOtherFixtureRole, actualOther: other.key, note: 'cross-user personal-letter isolation; no organization-outside-role claim' },
    permittedSetup: ['isolated ordinary User fixtures and real dev-login session', 'server-only Date offset after a real browser send; DB row and original BullMQ job are not mutated', 'matching browser Date fixed after server advance; timer execution is not accelerated', 'Mailpit accepts real SMTP sockets at the configured external-system boundary'],
    scheduleRegistration: 'Doctor observes real BullMQ repeat metadata; registration is distinct from time-trigger execution',
    notCovered: ['OAuth provider/login callback flow', 'production Gmail/Outlook inbox placement', 'literal seven wall-clock days', 'hourly scheduler cadence; the present drive covers original delayed delivery only'],
    testedEntry: '/zh-TW/me/footprints → 寫信給未來的自己',
    driverSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
    contractsSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'future-letter-contracts.cjs'))).digest('hex'),
    substitutions: [
      { boundary: 'authentication', method: 'real dev-login existing-session fixture', excludes: 'OAuth provider and callback', evidence: 'auth-owner-before.json' },
      { boundary: 'time', method: 'server Date offset to original due time; browser Date fixed afterward without accelerating timers', excludes: 'literal seven-day wall-clock passage', evidence: 'clock-advance.json' },
      { boundary: 'external mail provider', method: 'real SMTP sockets delivered to owned Mailpit', excludes: 'Gmail/Outlook inbox placement', evidence: 'mailpit-message.json' },
    ],
  });
  write('scope.json', runMetadata);
  const doctor = JSON.parse(execFileSync(process.execPath, [path.join(scripts, 'runtime.cjs'), 'doctor'], { encoding: 'utf8', timeout: 45000 }));
  write('doctor-before-drive.json', doctor);
  assert.equal(doctor.queueProof.retryScanRegistered, true, 'real repeat registration must be visible');
  const health = await localFetch(`${runtime.apiBase}/api/v1/health`); assert.equal(health.status, 200); write('health.json', await health.json());
  browser = await chromium.launch({ headless: true });
  db = new Client({ connectionString: secrets.databaseUrl }); await db.connect();
  const roleProof = await db.query('SELECT u.id,u.nickname,u.role_id,r.name AS global_role,u.verified,u.is_active FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id = ANY($1::int[]) ORDER BY u.id', [[owner.id, other.id]]);
  assert.equal(roleProof.rows.length, 2);
  for (const row of roleProof.rows) { assert.equal(row.global_role, 'User', 'both journey actors must be ordinary global User accounts'); assert.equal(row.verified, true); assert.equal(row.is_active, true); }
  write('ordinary-user-role-proof.json', { sql: 'SELECT users.id,nickname,role_id,roles.name,verified,is_active FROM users JOIN roles ON roles.id=users.role_id WHERE users.id=ANY(selected fixture ids)', primaryFixture: owner.key, otherFixture: other.key, requestedOtherFixture: requestedOtherFixtureRole, rows: roleProof.rows, result: 'two ordinary global User actors; no SuperAdmin used as either letter actor (separate runtime Doctor may use its readiness fixture)' });
  queue = new Queue('future-letter', { connection: runtime.redis });
  const initialClock = JSON.parse(execFileSync(process.execPath, [path.join(scripts, 'clock.cjs'), 'status'], { encoding: 'utf8' }));
  write('clock-before.json', initialClock);
  assert.ok(Math.abs(initialClock.offsetMs) < 10000, 'fresh run requires runtime clock reset before browser submission');
  const ownerContext = await newContext('owner');
  await login(ownerContext, owner, 'owner-before');
  ownerPage = await ownerContext.newPage(); capture(ownerPage, 'owner');
  let sendBody, scheduledSnapshot, originalJob;
  await checkpoint('U01', 'real browser writes and sends a seven-day letter through product API', async () => {
    await ownerPage.goto(`${runtime.productBase}/zh-TW/me/footprints`, { waitUntil: 'domcontentloaded' });
    const writeButton = ownerPage.getByRole('button', { name: '寫信給未來的自己' }).first();
    await expect(writeButton).toBeEnabled({ timeout: 90000 });
    await ownerPage.screenshot({ path: path.join(output, '01-footprints-before.png'), fullPage: true });
    await writeButton.click();
    await ownerPage.locator('#current-self').fill(currentSentinel);
    await ownerPage.locator('#message-to-future').fill(bodySentinel);
    await ownerPage.getByRole('button', { name: '7 天', exact: true }).click();
    await ownerPage.screenshot({ path: path.join(output, '02-letter-filled.png'), fullPage: true });
    write('02-letter-filled.aria.txt', await ownerPage.locator('body').ariaSnapshot());
    const sent = ownerPage.waitForResponse(response => /\/api\/v1\/me\/future-letters\/[^/]+\/send$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST');
    await ownerPage.getByRole('button', { name: '寄出這封信', exact: true }).click();
    const response = await sent; assert.equal(response.status(), 200);
    sendBody = await response.json(); const letter = unwrap(sendBody);
    createdId = letter.id; assert.ok(createdId); assert.equal(letter.status, 'scheduled');
    assert.ok(!JSON.stringify(sendBody).includes(bodySentinel)); assert.ok(!JSON.stringify(sendBody).includes(currentSentinel));
    write('browser-send-response.json', { status: response.status(), request: response.request().postDataJSON(), response: sendBody });
    await expect(ownerPage.getByRole('dialog', { name: '寫信給未來的自己' })).toHaveCount(0);
    await expect(ownerPage.locator(`[data-testid="timeline-node"][data-node-id="letter-${createdId}"][data-kind="scheduled"]`)).toBeVisible();
    const displayed = await ownerPage.locator('body').innerText(); assert.ok(!displayed.includes(bodySentinel)); assert.ok(!displayed.includes(currentSentinel));
    const sealed = await ownerContext.request.get(`${runtime.apiBase}/api/v1/me/future-letters/${createdId}`);
    assert.equal(sealed.status(), 200); const sealedText = await sealed.text();
    assert.ok(!sealedText.includes(bodySentinel)); assert.ok(!sealedText.includes(currentSentinel)); write('scheduled-api-response.json', { status: sealed.status(), body: JSON.parse(sealedText) });
    scheduledSnapshot = await snapshot('scheduled'); originalJob = scheduledSnapshot.job;
    assert.equal(scheduledSnapshot.letter.user_id, owner.id); assert.equal(scheduledSnapshot.letter.status, 'scheduled'); assert.equal(scheduledSnapshot.letter.encrypted, true);
    assert.ok(originalJob); assert.equal(originalJob.state, 'delayed');
    const dueAt = new Date(scheduledSnapshot.letter.deliver_at).getTime();
    assert.ok(Math.abs(originalJob.timestamp + originalJob.configuredDelay - dueAt) < 2000, 'original API-created job delay must match browser selected deliverAt');
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const schedulingBufferMs = 5 * 60 * 1000;
    assert.ok(originalJob.configuredDelay > 6.9 * 24 * 60 * 60 * 1000, '7天 UI choice must schedule roughly seven days, not a short test delay');
    assert.ok(originalJob.configuredDelay <= sevenDaysMs + schedulingBufferMs, '7天 UI choice must not silently schedule beyond seven days plus five minutes');
    write('seven-day-delay-contract.json', { source: 'UI requirement: explicit 7天 button; bounds are independent of implementation-computed deliverAt', sevenDaysMs, permittedUpperBufferMs: schedulingBufferMs, actualDelayMs: originalJob.configuredDelay, actualTargetMs: originalJob.timestamp + originalJob.configuredDelay, databaseDeliverAtMs: dueAt, timestampTargetAgreementToleranceMs: 2000 });
    assert.equal(scheduledSnapshot.emailLogs.length, 0);
    await ownerPage.screenshot({ path: path.join(output, '03-scheduled-sealed.png'), fullPage: true });
    return { observed: { letterId: createdId, apiSendStatus: response.status(), status: scheduledSnapshot.letter.status, ownerUserId: scheduledSnapshot.letter.user_id, encrypted: scheduledSnapshot.letter.encrypted, job: originalJob, dueAt: scheduledSnapshot.letter.deliver_at, redactedSendResponse: true, redactedScheduledApi: true, noEmailBeforeDelivery: scheduledSnapshot.emailLogs.length === 0 }, artifacts: ['browser-send-response.json', 'scheduled-api-response.json', 'snapshot-scheduled.json', 'ordinary-user-role-proof.json', 'seven-day-delay-contract.json', '01-footprints-before.png', '02-letter-filled.png', '02-letter-filled.aria.txt', '03-scheduled-sealed.png', 'trace-owner.zip', 'network.json'] };
  });
  let targetTime;
  await checkpoint('U02', 'original delayed job is consumed after explicit clock advance without DB/job mutation', async () => {
    targetTime = new Date(new Date(scheduledSnapshot.letter.deliver_at).getTime() + 3000).toISOString();
    const clock = JSON.parse(execFileSync(process.execPath, [path.join(scripts, 'clock.cjs'), 'advance-to', targetTime], { encoding: 'utf8' }));
    write('clock-advance.json', { ...clock, requestedTarget: targetTime, method: 'server Date offset file only; original DB deliver_at and BullMQ job untouched' });
    await waitFor(async () => (await db.query('SELECT status FROM future_letters WHERE external_id::text=$1', [createdId])).rows[0]?.status === 'delivered', 'the real original future-letter worker to deliver', 90000);
    await waitFor(async () => { const job = await queue.getJob(originalJob.id); return job && await job.getState() === 'completed'; }, 'the original delayed job to complete', 30000);
    const delivered = await snapshot('delivered');
    assert.equal(delivered.letter.status, 'delivered'); assert.equal(delivered.letter.opened_at, null);
    assert.equal(new Date(delivered.letter.deliver_at).toISOString(), new Date(scheduledSnapshot.letter.deliver_at).toISOString());
    assert.ok(delivered.job); assert.equal(delivered.job.id, originalJob.id); assert.equal(delivered.job.timestamp, originalJob.timestamp); assert.equal(delivered.job.configuredDelay, originalJob.configuredDelay); assert.equal(delivered.job.state, 'completed');
    await ownerPage.clock.setFixedTime(new Date(targetTime));
    write('browser-clock.json', { method: 'page.clock.setFixedTime', targetTime, timersFastForwarded: false });
    await login(ownerContext, owner, 'owner-after-clock');
    return { observed: { letterId: createdId, status: delivered.letter.status, originalJobId: delivered.job.id, originalTimestamp: delivered.job.timestamp, originalConfiguredDelay: delivered.job.configuredDelay, jobState: delivered.job.state, deliverAtUnchanged: delivered.letter.deliver_at, openedAt: delivered.letter.opened_at, targetTime }, artifacts: ['clock-before.json', 'clock-advance.json', 'browser-clock.json', 'snapshot-scheduled.json', 'snapshot-delivered.json', 'auth-owner-after-clock.json'], substitutions: ['server Date advanced; existing DB row and original job not edited', 'ordinary-user session refreshed after logical seven-day time jump'] };
  });
  let mailHtml;
  await checkpoint('U03', 'Mailpit receives real SMTP with owner copy and the actual captured Email link', async () => {
    const actual = await waitFor(findActualMail, 'Mailpit message for the browser-created letter', 60000);
    mailHtml = actual.html; write('mailpit-message.json', actual.mail); write('mailpit-message.html', mailHtml); write('mailpit-list-entry.json', actual.listEntry);
    assert.ok(!mailHtml.includes(bodySentinel)); assert.ok(!mailHtml.includes(currentSentinel));
    assertNotification(actual.mail.Subject ?? actual.listEntry.Subject, mailHtml);
    const recipients = JSON.stringify(actual.mail.To ?? actual.listEntry.To ?? []);
    assert.ok(recipients.includes(owner.email)); assert.ok(!recipients.includes(other.email));
    await waitFor(async () => (await db.query("SELECT status FROM email_logs WHERE entity_type='future_letter' AND entity_id=$1", [scheduledSnapshot.letter.id])).rows[0]?.status === 'sent', 'real SMTP email log sent');
    const sentSnapshot = await snapshot('smtp-sent');
    return { observed: { mailpitMessageId: actual.mail.ID ?? actual.listEntry.ID, recipient: owner.email, subject: actual.mail.Subject ?? actual.listEntry.Subject, privateLetterTextAbsent: true, emailLogStatuses: sentSnapshot.emailLogs.map(row => row.status), transport: 'real SMTP to Mailpit' }, artifacts: ['mailpit-message.json', 'mailpit-message.html', 'mailpit-list-entry.json', 'snapshot-smtp-sent.json'] };
  });
  await checkpoint('U04', 'owner clicks the SMTP-captured HTML href and opens original letter content', async () => {
    await ownerPage.setContent(mailHtml, { waitUntil: 'domcontentloaded' });
    const actualLink = ownerPage.locator('a[href*="futureLetterId="]'); await expect(actualLink).toHaveCount(1);
    actualEmailHref = await actualLink.getAttribute('href'); assert.ok(actualEmailHref);
    const url = new URL(actualEmailHref); assert.equal(url.origin, runtime.productBase); assert.equal(url.searchParams.get('futureLetterId'), createdId);
    write('actual-email-href.json', { href: actualEmailHref, source: 'a[href] in Mailpit-received SMTP HTML; never constructed by driver' });
    await ownerPage.screenshot({ path: path.join(output, '04-received-email.png'), fullPage: true });
    await Promise.all([ownerPage.waitForURL(url => url.pathname.includes('/me/footprints') && url.searchParams.get('futureLetterId') === createdId), actualLink.click()]);
    await expect(ownerPage.getByRole('button', { name: '打開這封信', exact: true })).toBeVisible({ timeout: 60000 });
    const beforeOpen = await ownerPage.locator('body').innerText(); assert.ok(!beforeOpen.includes(bodySentinel));
    await ownerPage.screenshot({ path: path.join(output, '05-email-link-unopened.png'), fullPage: true });
    const opened = ownerPage.waitForResponse(response => new URL(response.url()).pathname.endsWith(`/future-letters/${createdId}/open`) && response.request().method() === 'POST');
    await ownerPage.getByRole('button', { name: '打開這封信', exact: true }).click();
    const response = await opened; assert.equal(response.status(), 200);
    const card = ownerPage.getByTestId('letter-detail-card'); await expect(card).toContainText(bodySentinel); await expect(card).toContainText(currentSentinel);
    await ownerPage.screenshot({ path: path.join(output, '06-owner-opened-letter.png'), fullPage: true });
    write('06-owner-opened-letter.aria.txt', await ownerPage.locator('body').ariaSnapshot());
    const openedSnapshot = await snapshot('opened');
    assertOpenedSnapshot(openedSnapshot.letter);
    return { observed: { actualEmailHref, browserUrl: ownerPage.url(), apiOpenStatus: response.status(), originalCurrentSelfVisible: true, originalMessageVisible: true, storedOpenedAt: openedSnapshot.letter.opened_at }, artifacts: ['actual-email-href.json', '04-received-email.png', '05-email-link-unopened.png', '06-owner-opened-letter.png', '06-owner-opened-letter.aria.txt', 'snapshot-opened.json', 'trace-owner.zip', 'network.json'] };
  });
  await checkpoint('U05', 'another logged-in fixture follows the same actual href but cannot read owner content', async () => {
    const context = await newContext('other'); await login(context, other, 'other-after-clock');
    const page = await context.newPage(); capture(page, 'other'); await page.clock.setFixedTime(new Date(targetTime));
    await page.goto(actualEmailHref, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('future-letter-timeline')).toBeVisible({ timeout: 60000 });
    const displayed = await page.locator('body').innerText(); assert.ok(!displayed.includes(bodySentinel)); assert.ok(!displayed.includes(currentSentinel));
    await expect(page.getByTestId('letter-detail-card')).toHaveCount(0);
    const response = await context.request.get(`${runtime.apiBase}/api/v1/me/future-letters/${createdId}`);
    const text = await response.text(); assert.equal(response.status(), 404); assert.ok(!text.includes(bodySentinel)); assert.ok(!text.includes(currentSentinel));
    write('other-owner-detail-response.json', { status: response.status(), body: JSON.parse(text), browserUrl: page.url() });
    await page.screenshot({ path: path.join(output, '07-other-account-no-content.png'), fullPage: true });
    return { observed: { otherFixture: other.key, otherUserId: other.id, browserUrl: page.url(), ownerLetterGetStatus: response.status(), letterDetailCardCount: await page.getByTestId('letter-detail-card').count(), privateLetterTextAbsent: true }, artifacts: ['auth-other-after-clock.json', 'ordinary-user-role-proof.json', 'other-owner-detail-response.json', '07-other-account-no-content.png', 'trace-other.zip'] };
  });
  await checkpoint('U06', 'homepage footprint-summary entry reaches footprints after the real letter exists', async () => {
    await ownerPage.goto(`${runtime.productBase}/zh-TW`, { waitUntil: 'domcontentloaded' });
    const summary = ownerPage.getByTestId('home-timeline-summary'); await expect(summary).toBeVisible({ timeout: 60000 });
    await ownerPage.screenshot({ path: path.join(output, '08-home-summary-entry.png'), fullPage: true });
    await Promise.all([ownerPage.waitForURL(/\/me\/footprints/), summary.getByRole('button', { name: '我的足跡' }).click()]);
    await expect(ownerPage.getByTestId('future-letter-timeline')).toBeVisible();
    await ownerPage.screenshot({ path: path.join(output, '09-home-entry-footprints.png'), fullPage: true });
    return { observed: { entry: 'homepage summary button 我的足跡', browserUrl: ownerPage.url(), timelineVisible: await ownerPage.getByTestId('future-letter-timeline').isVisible() }, artifacts: ['08-home-summary-entry.png', '09-home-entry-footprints.png', 'trace-owner.zip'] };
  });
  await checkpoint('U07', 'logged-out actual Email href redirects to login while retaining target; OAuth callback is not claimed', async () => {
    const context = await newContext('logged-out'); const page = await context.newPage(); capture(page, 'logged-out');
    await page.clock.setFixedTime(new Date(targetTime));
    await page.goto(actualEmailHref, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/auth\/login/, { timeout: 60000 });
    const loginUrl = new URL(page.url()); const redirect = loginUrl.searchParams.get('redirect');
    assertLoginRedirect(page.url(), actualEmailHref);
    const displayed = await page.locator('body').innerText(); assert.ok(!displayed.includes(bodySentinel)); assert.ok(!displayed.includes(currentSentinel));
    write('logged-out-redirect.json', { actualEmailHref, loginUrl: page.url(), redirect, coverage: 'redirect-to-login only; no OAuth provider interaction or callback' });
    await page.screenshot({ path: path.join(output, '10-logged-out-login-target.png'), fullPage: true });
    return { observed: { actualEmailHref, loginUrl: page.url(), retainedRedirect: redirect, privateLetterTextAbsent: true, coverage: 'local redirect only; OAuth provider/callback not exercised' }, artifacts: ['logged-out-redirect.json', '10-logged-out-login-target.png', 'trace-logged-out.zip'] };
  });
  write('final.json', { ...runMetadata, result: 'PASS', surface: 'ui', feature: 'future-letter', runId, createdId, actualEmailHref, fixtureSelection: { primary: owner.key, other: other.key, requestedOther: requestedOtherFixtureRole, globalRolesVerified: 'User' }, checks: results, observedScheduleRegistration: doctor.queueProof, unresolved: ['OAuth provider/callback completion', 'production mailbox placement', 'literal seven-day wall-clock wait', 'hourly cron time-trigger/cadence (registration metadata is checked by Doctor)'], assertionBoundary: 'The actual browser submission, original delayed queue job, real worker, SMTP to Mailpit, owner link/open, other-account denial, home entry and logged-out redirect were exercised. Server/browser Date acceleration and dev-login session fixtures are explicit substitutions.' });
}
main().catch(async error => {
  write('failure.json', { ...runMetadata, result: 'FAIL', surface: 'ui', feature: 'future-letter', runId, createdId, actualEmailHref, message: error.message, stack: error.stack, passedCheckpoints: results });
  for (const { context, label } of contexts) {
    for (const [index, page] of context.pages().entries()) {
      if (!page.isClosed()) await page.screenshot({ path: path.join(output, `failure-${label}-${index}.png`), fullPage: true }).catch(() => undefined);
    }
  }
  console.error(`FAIL: ${error.message}`); process.exitCode = 1;
}).finally(async () => {
  await Promise.allSettled([...pending]); write('network.json', network); write('browser-errors.json', errors); write('resource-errors.json', resourceErrors);
  for (const { context, label } of contexts) {
    await context.tracing.stop({ path: path.join(output, `trace-${label}.zip`) }).catch(error => write(`trace-${label}-error.txt`, error.message));
    await context.close().catch(() => undefined);
  }
  if (browser) await browser.close(); if (queue) await queue.close(); if (db) await db.end();
  const missingArtifacts = [...new Set(results.flatMap(check => check.artifacts))].filter(file => !fs.existsSync(path.join(output, file)));
  const videos = contexts.map(({ label }) => ({ label, files: fs.existsSync(path.join(output, `video-${label}`)) ? fs.readdirSync(path.join(output, `video-${label}`)).filter(file => file.endsWith('.webm')) : [] }));
  if (missingArtifacts.length || videos.some(entry => entry.files.length === 0)) {
    process.exitCode = 1;
    write('evidence-failure.json', { ...runMetadata, result: 'FAIL', reason: 'required evidence did not survive context cleanup', missingArtifacts, videos });
    if (fs.existsSync(path.join(output, 'final.json'))) { const prior = readJson(path.join(output, 'final.json')); write('final.json', { ...prior, result: 'FAIL', evidenceFailure: 'required artifacts or context videos missing after cleanup' }); }
  }
  write('artifact-location.json', { surface: 'ui', feature: 'future-letter', output, evidenceSurvivesContextCleanup: missingArtifacts.length === 0 && videos.every(entry => entry.files.length > 0), missingArtifacts, videos });
  console.log(`Evidence: ${output}`);
});
