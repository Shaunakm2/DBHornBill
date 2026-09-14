/* Desk types: each scopes where a scenario ends */
const { loadApp } = require('./harness');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
const errors = []; const fail = m => errors.push(m);
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(idb) {
  const dom = loadApp({ indexedDB: idb ? indexedDB : null, IDBKeyRange: idb ? IDBKeyRange : null,
    onError: ev => fail('RUNTIME: ' + String((ev.error && ev.error.stack) || ev.message).slice(0, 200)) });
  const w = dom.window, d = w.document;
  const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
  const click = el => { if (!el) return false; el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return true; };
  const openCoach = () => { if (!q('[data-scenario]')) click(q('.fab')); };
  const setDesk = k => { openCoach(); const p = q('[data-desk]'); if (!p) return fail('no desk selector'); p.value = k; p.dispatchEvent(new w.Event('change', { bubbles: true })); openCoach(); };
  const setScen = k => { openCoach(); const p = q('[data-scenario]'); if (!p) return fail('no scenario selector'); p.value = k; p.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const steps = () => { openCoach(); return qa('#coach .step').map(x => x.textContent.replace(/\s+/g, ' ').trim()); };
  return { dom, w, d, q, qa, click, openCoach, setDesk, setScen, steps, coach: () => { openCoach(); return q('#coach').textContent; }, main: () => q('#main').textContent };
}

(async () => {
  let T = boot(false);
  const { q, qa, click } = T;
  await wait(300);
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'));

  /* ---------- the selector exists and offers the three desks ---------- */
  T.openCoach();
  const opts = q('[data-desk]') ? Array.from(q('[data-desk]').options).map(o => o.textContent) : [];
  if (opts.length !== 3) fail('expected three desk types, got ' + opts.length);
  [/180/, /360/, /VMS/].forEach(re => { if (!opts.some(o => re.test(o))) fail('desk type missing: ' + re); });
  if (!/360/.test(q('[data-desk]').value === 'd360' ? '360' : '')) { /* default check below */ }
  if (q('[data-desk]').value !== 'd360') fail('the full desk should be the default, got ' + q('[data-desk]').value);

  /* ---------- 180: the sendout is the finish line ---------- */
  T.setDesk('d180'); T.setScen('s1');
  const s180 = T.steps();
  if (!/Finishes at Client Submission/.test(T.coach())) fail('180 does not state its finish line');
  if (!s180.length) fail('180 has no steps');
  if (!/Client Submission/.test(s180[s180.length - 1]))
    fail('180 does not end at the sendout, ends at: ' + s180[s180.length - 1].slice(0, 50));
  // business development must not appear on a delivery desk
  ['Add a Lead', 'Convert the lead', 'Raise an Opportunity', 'Publish the job order']
    .forEach(t => { if (s180.some(x => x.indexOf(t) >= 0)) fail('180 includes a business development step: ' + t); });
  // nor anything past the sendout
  ['Schedule the interview', 'Extend the offer', 'Place the candidate', 'Approve the placement',
    'onboarding pack', 'Enter the first week of time', 'Approve that time entry']
    .forEach(t => { if (s180.some(x => x.indexOf(t) >= 0)) fail('180 includes a step past the sendout: ' + t); });
  // but the delivery work must be there
  ['Add a Candidate', 'Upload the candidate CV', 'pipeline', 'Internal Submission', 'Client Submission']
    .forEach(t => { if (!s180.some(x => x.indexOf(t) >= 0)) fail('180 is missing a delivery step: ' + t); });

  /* ---------- 360: runs to the candidate starting ---------- */
  T.setDesk('d360'); T.setScen('s1');
  const s360 = T.steps();
  if (!/Finishes at the candidate starting/.test(T.coach())) fail('360 does not state its finish line');
  if (!(s360.length > s180.length)) fail('360 is not longer than 180');
  ['Add a Lead', 'Convert the opportunity', 'Schedule the interview', 'Extend the offer',
    'Place the candidate', 'Approve the placement', 'onboarding pack']
    .forEach(t => { if (!s360.some(x => x.indexOf(t) >= 0)) fail('360 is missing: ' + t); });
  ['Enter the first week of time', 'Approve that time entry']
    .forEach(t => { if (s360.some(x => x.indexOf(t) >= 0)) fail('360 includes back-office step: ' + t); });
  if (!/onboarding pack/.test(s360[s360.length - 1]))
    fail('360 does not end at onboarding, ends at: ' + s360[s360.length - 1].slice(0, 50));

  /* ---------- VMS: everything, ending at approved hours ---------- */
  T.setDesk('dvms'); T.setScen('s1');
  const svms = T.steps();
  if (!/Finishes at approved hours/.test(T.coach())) fail('VMS does not state its finish line');
  if (!(svms.length > s360.length)) fail('VMS is not longer than 360');
  ['Enter the first week of time', 'Approve that time entry']
    .forEach(t => { if (!svms.some(x => x.indexOf(t) >= 0)) fail('VMS is missing: ' + t); });
  if (!/Approve that time entry/.test(svms[svms.length - 1]))
    fail('VMS does not end at approved hours');

  /* ---------- the inherited-desk scenario is scoped too ---------- */
  T.setDesk('d180'); T.setScen('s2');
  const b180 = T.steps();
  ['Action the pending time entry', 'onboarding items', 'status of the job order']
    .forEach(t => { if (b180.some(x => x.indexOf(t) >= 0)) fail('180 backlog includes out-of-scope work: ' + t); });
  T.setDesk('dvms'); T.setScen('s2');
  const bvms = T.steps();
  if (!(bvms.length > b180.length)) fail('the backlog scenario is not scoped by desk');
  if (!bvms.some(x => /pending time entry/.test(x))) fail('VMS backlog is missing the time entry step');

  /* ---------- progress is measured against the scoped list ---------- */
  T.setDesk('d180'); T.setScen('s1');
  const m = T.coach().match(/(\d+) of (\d+) done/);
  if (!m) fail('no progress readout');
  else if (+m[2] !== s180.length) fail('progress total ' + m[2] + ' does not match the ' + s180.length + ' scoped steps');

  /* ---------- the session summary records the desk ---------- */
  click(q('[data-act="session"]'));
  const sess = q('#sess');
  if (!sess) fail('no session summary');
  else {
    if (!/Desk type practised: 180/.test(sess.value)) fail('the session summary does not name the desk');
    if (!/Finishes at Client Submission|finishes at Client Submission/.test(sess.value))
      fail('the session summary does not record the finish line');
    if (/Approve that time entry/.test(sess.value))
      fail('the session summary lists steps outside the chosen desk');
    const b = q('#modal-root [data-close]'); if (b) click(b);
  }

  /* ---------- the choice survives a reload ---------- */
  let T2 = boot(true);
  await wait(350);
  if (T2.q('#modal-root').innerHTML.trim()) T2.click(T2.q('[data-welcome="skip"]'));
  T2.setDesk('dvms');
  await wait(400);
  let T3 = boot(true);
  await wait(500);
  T3.openCoach();
  if (T3.q('[data-desk]') && T3.q('[data-desk]').value !== 'dvms')
    fail('the desk type did not survive a reload, got ' + T3.q('[data-desk]').value);

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n')
    : 'DESK TYPE CHECKS PASSED (180: ' + s180.length + ' steps, 360: ' + s360.length + ', VMS: ' + svms.length + ')');
  process.exit(errors.length ? 1 : 0);
})();
