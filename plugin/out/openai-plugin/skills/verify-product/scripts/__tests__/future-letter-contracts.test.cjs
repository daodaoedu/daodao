const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertNotification, assertLoginRedirect, assertOpenedSnapshot } = require('../features/future-letter-contracts.cjs');
const subject = '你寫給自己的信，今天寄到囉';
const html = '<p>還記得你在那一天寫信給自己嗎？</p><p>今天你的信寄到囉，現在就來看看你當時寫了什麼給自己。</p><a>看看寫給自己的信</a>';

test('received notification rejects wrong subject and missing required copy', () => {
  assert.doesNotThrow(() => assertNotification(subject, html));
  assert.throws(() => assertNotification('信件寄送失敗', html));
  assert.throws(() => assertNotification(subject, '<p>今天你的信寄到囉</p>'));
});

test('login redirect preserves received path and query, not just letter id', () => {
  const target = 'http://localhost:3185/me/footprints?futureLetterId=owned-letter';
  const login = (redirect, origin = 'http://localhost:3185') => `${origin}/auth/login?redirect=${encodeURIComponent(redirect)}`;
  assert.doesNotThrow(() => assertLoginRedirect(login('/me/footprints?futureLetterId=owned-letter'), target));
  assert.throws(() => assertLoginRedirect(login('/wrong?futureLetterId=owned-letter'), target));
  assert.throws(() => assertLoginRedirect(login('/me/footprints?futureLetterId=owned-letter&extra=true'), target));
  assert.throws(() => assertLoginRedirect(login('/me/footprints?futureLetterId=owned-letter', 'https://unrelated.invalid'), target));
});

test('opening must persist a valid timestamp after delivery', () => {
  const delivered_at = '2026-11-10T12:00:00.000Z';
  assert.doesNotThrow(() => assertOpenedSnapshot({ delivered_at, opened_at: '2026-11-10T12:00:01.000Z' }));
  for (const opened_at of [null, undefined, 'invalid', '2026-11-09T12:00:00.000Z']) {
    assert.throws(() => assertOpenedSnapshot({ delivered_at, opened_at }));
  }
});
