#!/usr/bin/env node
/* Runs every suite and both audits. Exits non-zero if anything fails. */
const { execFileSync } = require('child_process');
const fs = require('fs');

const suites = fs.readdirSync('.')
  .filter(f => /^test\d+\.js$/.test(f))
  .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));
const audits = ['audit.js', 'audit2.js'].filter(f => fs.existsSync(f));

let failed = 0;
function run(f) {
  process.stdout.write(f.replace('.js', '').padEnd(9));
  try {
    const out = execFileSync('node', [f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const first = out.trim().split('\n')[0] || '(no output)';
    console.log(first);
  } catch (e) {
    failed++;
    const out = ((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(0, 6).join('\n           ');
    console.log('FAILED\n           ' + out);
  }
}
console.log('Suites\n------');
suites.forEach(run);
console.log('\nAudits\n------');
audits.forEach(run);
console.log('\n' + (failed ? failed + ' of ' + (suites.length + audits.length) + ' FAILED'
  : 'All ' + (suites.length + audits.length) + ' passed'));
process.exit(failed ? 1 : 0);
