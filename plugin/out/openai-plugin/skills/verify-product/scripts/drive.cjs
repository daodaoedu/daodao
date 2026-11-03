#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const FEATURES = Object.freeze({
  'future-letter': {
    surface: 'ui',
    entryPoints: ['footprints write/send', 'received Email link/open', 'homepage footprints summary', 'logged-out Email target'],
    script: path.join(__dirname, 'features', 'future-letter.cjs'),
  },
});

function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === 'list') {
    console.log(JSON.stringify({ features: Object.entries(FEATURES).map(([id, feature]) => ({ id, surface: feature.surface, entryPoints: feature.entryPoints, capability: 'available-driver' })), note: 'Availability is not a verification result. Only these feature IDs are implemented; other feature-map pages are not executable drivers.' }, null, 2));
    return 0;
  }
  if (args.length !== 2 || args[0] !== 'run') throw new Error('Usage: node drive.cjs list | run <feature-id>');
  const feature = Object.hasOwn(FEATURES, args[1]) ? FEATURES[args[1]] : undefined;
  if (!feature) throw new Error(`Unknown feature "${args[1]}". Run drive.cjs list for implemented drivers.`);
  const { getPaths, readState } = require('./paths.cjs');
  const paths = getPaths();
  readState(paths);
  for (const file of [paths.privatePath, paths.fixturePath]) {
    if (!fs.existsSync(file)) throw new Error('Runtime configuration is incomplete; run runtime.cjs launch and doctor before driving');
  }
  const result = spawnSync(process.execPath, [feature.script], { env: { ...process.env, DAODAO_VERIFY_WORKSPACE: paths.workspace }, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`Feature driver ended on signal ${result.signal}`);
  return result.status ?? 1;
}

if (require.main === module) {
  try { process.exitCode = main(); }
  catch (error) { console.error(`Verification drive refused: ${error.message}`); process.exitCode = 2; }
}
module.exports = { main, FEATURES };
