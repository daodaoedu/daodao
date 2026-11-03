#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { getPaths } = require('./paths.cjs');
if (require.main === module && ['--help', '-h', 'help'].includes(process.argv[2])) {
  console.log('Usage: DAODAO_VERIFY_WORKSPACE=ABS node clock.cjs status | reset | advance-to <ISO date>'); process.exit(0);
}
const OriginalDate = Date;
const paths = getPaths();
const clockPath = paths.clockPath;
function offset() {
  const value = JSON.parse(fs.readFileSync(clockPath, 'utf8'));
  if (!Number.isSafeInteger(value.offsetMs)) throw new Error('Invalid verification clock offset');
  return value.offsetMs;
}
function now() { return OriginalDate.now() + offset(); }
function status() { return { realNow: new OriginalDate().toISOString(), logicalNow: new OriginalDate(now()).toISOString(), offsetMs: offset(), clockPath }; }
if (require.main === module) {
  const command = process.argv[2] || 'status';
  if (command === 'advance-to' || command === 'reset') {
    const realNow = OriginalDate.now();
    const target = command === 'reset' ? realNow : OriginalDate.parse(process.argv[3]);
    if (!Number.isFinite(target)) throw new Error('Usage: clock.cjs advance-to <ISO date> | reset | status');
    const before = fs.existsSync(clockPath) ? JSON.parse(fs.readFileSync(clockPath, 'utf8')) : { offsetMs: 0 };
    if (command === 'advance-to' && target < realNow + before.offsetMs) throw new Error('advance-to cannot move the logical clock backwards; use reset explicitly');
    const data = { offsetMs: target - realNow, updatedAt: new OriginalDate().toISOString() };
    fs.mkdirSync(path.dirname(clockPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(clockPath + '.tmp', JSON.stringify(data) + '\n', { mode: 0o600 });
    fs.renameSync(clockPath + '.tmp', clockPath);
    fs.appendFileSync(path.join(path.dirname(clockPath), 'clock-history.jsonl'), JSON.stringify({ command, beforeOffsetMs: before.offsetMs, ...status() }) + '\n', { mode: 0o600 });
  } else if (command !== 'status') throw new Error('Unknown clock command');
  console.log(JSON.stringify(status()));
} else {
  // The launcher preloads this only into its owned server process, never browsers or shared services.
  function VerificationDate(...args) {
    if (!new.target) return new OriginalDate(now()).toString();
    return Reflect.construct(OriginalDate, args.length ? args : [now()], new.target === VerificationDate ? OriginalDate : new.target);
  }
  Object.setPrototypeOf(VerificationDate, OriginalDate);
  VerificationDate.prototype = OriginalDate.prototype;
  VerificationDate.now = now;
  global.Date = VerificationDate;
}
