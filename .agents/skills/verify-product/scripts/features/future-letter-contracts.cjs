const assert = require('node:assert/strict');

function assertNotification(subject, html) {
  assert.equal(subject, '你寫給自己的信，今天寄到囉', 'Email subject must match the delivery notification contract');
  for (const copy of ['還記得你在那一天寫信給自己嗎？', '今天你的信寄到囉，現在就來看看你當時寫了什麼給自己。', '看看寫給自己的信']) {
    assert.ok(html.includes(copy), `Email must include delivery copy: ${copy}`);
  }
}

function assertLoginRedirect(loginHref, actualEmailHref) {
  const login = new URL(loginHref);
  const target = new URL(actualEmailHref);
  assert.equal(login.origin, target.origin);
  assert.equal(login.pathname, '/auth/login');
  assert.equal(login.searchParams.get('redirect'), target.pathname + target.search, 'login must retain the entire received Email target');
}

function assertOpenedSnapshot(letter) {
  assert.ok(letter.opened_at, 'opening must persist opened_at');
  const opened = Date.parse(letter.opened_at);
  const delivered = Date.parse(letter.delivered_at);
  assert.ok(Number.isFinite(opened) && Number.isFinite(delivered) && opened >= delivered, 'persisted opened_at must be a valid timestamp after delivery');
}

module.exports = { assertNotification, assertLoginRedirect, assertOpenedSnapshot };
