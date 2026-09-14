/* Randomised walk with invariant re-checking, and export/import round-trip integrity */
const { loadApp } = require('./harness');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
const errors = []; const fail = m => errors.push(m);
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(idb) {
  const dom = loadApp({ indexedDB: idb ? indexedDB : null, IDBKeyRange: idb ? IDBKeyRange : null,
    onError: ev => fail('RUNTIME: ' + String((ev.error && ev.error.stack) || ev.message).slice(0, 220)) });
  const w = dom.window, d = w.document;
  const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
  const click = el => { if (!el) return false; el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return true; };
  return { dom, w, d, q, qa, click, main: () => q('#main').textContent };
}
function invariants(D, label) {
  const P = m => fail(label + ': ' + m);
  D.jobs.forEach(j => {
    const pl = D.placements.filter(p => p.jobId === j.id).length;
    if (j.filled !== pl) P('job ' + j.id + ' filled=' + j.filled + ' but ' + pl + ' placements');
    if (j.filled > j.openings) P('job ' + j.id + ' over-filled');
    if (j.type !== 'Direct Hire' && j.billRate && j.billRate <= j.payRate) P('job ' + j.id + ' has no margin');
  });
  D.placements.forEach(p => {
    if (p.billRate <= p.payRate) P('placement ' + p.id + ' has no margin');
    if (new Date(p.end) <= new Date(p.start)) P('placement ' + p.id + ' ends before it starts');
    if (!D.jobs.some(j => j.id === p.jobId)) P('placement ' + p.id + ' has no job order');
    if (!D.candidates.some(c => c.id === p.candidateId)) P('placement ' + p.id + ' has no candidate');
  });
  D.subs.forEach(s => {
    if (!s.history || !s.history.length) P('submission ' + s.id + ' has no history');
    else if (s.history[s.history.length - 1].status !== s.status)
      P('submission ' + s.id + ' status disagrees with its history');
    if (!D.jobs.some(j => j.id === s.jobId)) P('submission ' + s.id + ' has no job order');
    if (!D.candidates.some(c => c.id === s.candidateId)) P('submission ' + s.id + ' has no candidate');
    if (s.sendoutAt && !s.sentTo) P('submission ' + s.id + ' sent to nobody');
    const dup = D.subs.filter(x => x.jobId === s.jobId && x.candidateId === s.candidateId);
    if (dup.length > 1) P('candidate appears twice on job ' + s.jobId);
  });
  D.times.forEach(t => {
    if (!D.placements.some(p => p.id === t.placementId)) P('time entry ' + t.id + ' has no placement');
    if (t.regular < 0 || t.overtime < 0) P('time entry ' + t.id + ' has negative hours');
  });
  D.contacts.forEach(c => { if (!D.companies.some(x => x.id === c.companyId)) P('contact ' + c.id + ' has no company'); });
  D.notes.forEach(n => {
    const L = n.links || {};
    if (!L.candidateId && !L.contactId && !L.companyId && !L.jobId) P('note ' + n.id + ' is unlinked');
  });
  D.tearsheets.forEach(t => {
    t.candidateIds.forEach(id => { if (!D.candidates.some(c => c.id === id)) P('tearsheet ' + t.id + ' points at a missing candidate'); });
    if (new Set(t.candidateIds).size !== t.candidateIds.length) P('tearsheet ' + t.id + ' lists a candidate twice');
  });
  const ids = [].concat(D.candidates, D.jobs, D.companies, D.contacts, D.placements, D.subs).map(x => x.id);
  if (new Set(ids).size !== ids.length) P('duplicate record ids across the dataset');
}
function exportData(T) {
  const menu = T.q('#rail [data-go="data"]');
  T.click(menu);
  T.click(T.q('[data-act="db-export"]'));
  const raw = T.q('#db-json');
  if (!raw) { fail('could not export'); return null; }
  const val = raw.value;
  T.click(T.q('#modal-root [data-close]'));
  try { return JSON.parse(val); } catch (e) { fail('export is not valid JSON: ' + e.message); return null; }
}

(async () => {
  let T = boot(false);
  await wait(300);
  if (T.q('#modal-root').innerHTML.trim()) T.click(T.q('[data-welcome="skip"]'));

  /* baseline invariants */
  let snap0 = exportData(T);
  if (snap0) invariants(snap0.data, 'baseline');

  /* =============== randomised walk =============== */
  // a deterministic pseudo-random sequence so a failure can be reproduced
  let seed = 987654321;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const VIEWS = ['dashboard', 'candidates', 'jobs', 'companies', 'contacts', 'pipeline',
    'placements', 'tasks', 'appts', 'tearsheets', 'search', 'reports', 'notes', 'audit', 'data', 'config'];
  let steps = 0, opened = 0, modals = 0;
  for (let i = 0; i < 400; i++) {
    const r = rnd();
    try {
      if (r < 0.22) {
        const v = VIEWS[Math.floor(rnd() * VIEWS.length)];
        T.click(T.q('#rail [data-go="' + v + '"]'));
      } else if (r < 0.42) {
        const rows = T.qa('#main tbody tr.click');
        if (rows.length) { T.click(rows[Math.floor(rnd() * rows.length)]); opened++; }
      } else if (r < 0.55) {
        const tabs = T.qa('.rtabs a[data-rtab]');
        if (tabs.length) T.click(tabs[Math.floor(rnd() * tabs.length)]);
      } else if (r < 0.66) {
        const chips = T.qa('.chip[data-sub]');
        if (chips.length) { T.click(chips[Math.floor(rnd() * chips.length)]); modals++; }
      } else if (r < 0.76) {
        const acts = T.qa('#main [data-act]').filter(a => {
          const k = a.getAttribute('data-act');
          return ['reset', 'db-clear', 'db-import', 'training', 'permissive', 'cfg-reset', 'ui-mode'].indexOf(k) < 0;
        });
        if (acts.length) { T.click(acts[Math.floor(rnd() * acts.length)]); modals++; }
      } else if (r < 0.84) {
        const c = T.q('#modal-root [data-close]');
        if (c) T.click(c); else T.q('#modal-root').innerHTML = '';
      } else if (r < 0.9) {
        const s = T.qa('#main [data-act="sel"]');
        if (s.length) T.click(s[Math.floor(rnd() * s.length)]);
      } else if (r < 0.95) {
        const inp = T.q('#bs-q');
        if (inp) {
          inp.value = ['java', 'nurse OR forklift', 'skills:excel', '(a OR b) AND c', 'engineer*'][Math.floor(rnd() * 5)];
          inp.dispatchEvent(new T.w.Event('input', { bubbles: true }));
          T.click(T.q('[data-act="run-search"]'));
        }
      } else {
        const st = T.qa('.chevs[data-act]');
        if (st.length) { T.click(st[Math.floor(rnd() * st.length)]); modals++; }
      }
      steps++;
    } catch (e) {
      fail('walk threw at step ' + i + ': ' + (e.message || e));
      break;
    }
    // the shell must never disappear
    if (!T.q('#rail') || !T.q('#main')) { fail('the shell was destroyed at step ' + i); break; }
  }
  T.q('#modal-root').innerHTML = '';
  T.click(T.q('#rail [data-go="dashboard"]'));
  if (T.main().trim().length < 40) fail('the dashboard is broken after the walk');
  if (/undefined|NaN|\[object Object\]/.test(T.main())) fail('the dashboard leaks a raw value after the walk');

  /* invariants must still hold after all that */
  let snap1 = exportData(T);
  if (snap1) invariants(snap1.data, 'after ' + steps + ' random steps');

  /* every screen still renders */
  VIEWS.forEach(v => {
    T.click(T.q('#rail [data-go="' + v + '"]'));
    if (T.main().trim().length < 40) fail('view ' + v + ' broke after the walk');
  });

  /* =============== export / import round trip =============== */
  let T2 = boot(true);
  await wait(350);
  if (T2.q('#modal-root').innerHTML.trim()) T2.click(T2.q('[data-welcome="skip"]'));
  const a = exportData(T2);
  if (a) {
    // import the same snapshot back
    T2.click(T2.q('#rail [data-go="data"]'));
    T2.click(T2.q('[data-act="db-import"]'));
    const ta = T2.q('[data-f="json"]');
    if (!ta) fail('the import form did not open');
    else {
      ta.value = JSON.stringify(a);
      ta.dispatchEvent(new T2.w.Event('input', { bubbles: true }));
      const ack = T2.q('[data-f="ack"]'); ack.checked = true;
      ack.dispatchEvent(new T2.w.Event('change', { bubbles: true }));
      T2.click(T2.q('#modal-root [data-go]'));
      await wait(120);
      const b = exportData(T2);
      if (b) {
        const counts = k => [a.data[k].length, b.data[k].length];
        ['candidates', 'jobs', 'companies', 'contacts', 'subs', 'placements', 'times', 'notes', 'tasks', 'tearsheets']
          .forEach(k => {
            const [x, y] = counts(k);
            if (x !== y) fail('round trip changed ' + k + ': ' + x + ' -> ' + y);
          });
        const cvA = a.data.candidates.filter(c => c.cv).length;
        const cvB = b.data.candidates.filter(c => c.cv).length;
        if (cvA !== cvB) fail('round trip lost resumes: ' + cvA + ' -> ' + cvB);
        invariants(b.data, 'after a round trip');
      }
    }
  }

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n')
    : 'RANDOM WALK (' + steps + ' steps, ' + opened + ' records, ' + modals + ' dialogs) + ROUND TRIP CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
})();
