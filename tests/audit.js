const { loadApp, APP_PATH, CSS_PATH } = require('./harness');
const fs = require('fs');
const problems = [];
const P = m => problems.push(m);

const dom = loadApp({ onError: ev => P('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)) });
const w = dom.window, d = w.document;
const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'));

  /* ---------- 1. every data-act used anywhere must be handled ---------- */
  const app = fs.readFileSync(APP_PATH, 'utf8');
  const used = new Set();
  const re = /data-act="([a-z-]+)"/g; let m;
  while ((m = re.exec(app))) used.add(m[1]);
  // also the dynamically-built ones
  ['sort','sel'].forEach(x => used.add(x));
  const handled = new Set();
  const cre = /case '([a-z-]+)':/g;
  while ((m = cre.exec(app))) handled.add(m[1]);
  // bespoke listeners inside modals (data-* attributes, not data-act)
  const dead = [...used].filter(a => !handled.has(a));
  if (dead.length) P('data-act with no handler (dead buttons): ' + dead.join(', '));

  /* ---------- 2. every data-go target must be a real view ---------- */
  const gos = new Set();
  const gre = /data-go="([a-z-]+)"/g;
  while ((m = gre.exec(app))) gos.add(m[1]);
  const views = new Set();
  const vre = /^\s*([a-z]+):v[A-Z]/gm;
  const vblock = app.slice(app.indexOf('var VIEWS='), app.indexOf('var VIEWS=') + 1400);
  const vre2 = /([a-z]+):v[A-Za-z]+/g;
  while ((m = vre2.exec(vblock))) views.add(m[1]);
  const badGo = [...gos].filter(v => !views.has(v));
  if (badGo.length) P('data-go pointing at no view: ' + badGo.join(', '));

  /* ---------- 3. walk every view and every record tab ---------- */
  function nav(v) {
    let a = q('#rail [data-go="' + v + '"]');
    if (!a) { if (!q('.mfly')) click(q('[data-act="menu"]')); a = q('.mfly a[data-go="' + v + '"]'); }
    if (!a) { P('cannot reach view ' + v); return false; }
    click(a); return true;
  }
  const allViews = [...views];
  allViews.forEach(v => {
    if (['company','contact','candidate','job','placement','tearsheet','lead','opp'].indexOf(v) >= 0) return;
    if (!nav(v)) return;
    const txt = q('#main').textContent.trim();
    if (txt.length < 40) P('view "' + v + '" renders almost nothing (' + txt.length + ' chars)');
    if (/undefined|NaN|\[object Object\]/.test(txt)) P('view "' + v + '" leaks a raw value: ' +
      (txt.match(/\S*(undefined|NaN|\[object Object\])\S*/) || [])[0]);
  });

  /* ---------- 4. record pages: every tab on every record type ---------- */
  const recs = [['candidates','candidate'],['jobs','job'],['companies','company'],
    ['contacts','contact'],['placements','placement'],['tearsheets','tearsheet'],
    ['leads','lead'],['opps','opp']];
  recs.forEach(([list, type]) => {
    if (!nav(list)) return;
    const row = qa('tbody tr.click')[0];
    if (!row) { P('no rows to open on ' + list); return; }
    click(row);
    const tabs = qa('.rtabs a[data-rtab]').map(a => a.getAttribute('data-rtab'));
    if (!tabs.length) {
      const txt = q('#main').textContent.trim();
      if (txt.length < 60) P(type + ' record renders almost nothing');
      return;
    }
    tabs.forEach(t => {
      click(qa('.rtabs a[data-rtab]').find(a => a.getAttribute('data-rtab') === t));
      const txt = q('#main').textContent.trim();
      if (txt.length < 60) P(type + ' tab "' + t + '" renders almost nothing');
      if (/undefined|NaN|\[object Object\]/.test(txt))
        P(type + ' tab "' + t + '" leaks a raw value: ' +
          (txt.match(/\S*(undefined|NaN|\[object Object\])\S*/) || [])[0]);
    });
  });

  /* ---------- 5. duplicate DOM ids ---------- */
  nav('dashboard');
  const ids = qa('[id]').map(e => e.id);
  const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dupes.length) P('duplicate DOM ids: ' + [...new Set(dupes)].join(', '));

  /* ---------- 6. data invariants ---------- */
  nav('data');
  click(q('[data-act="db-export"]'));
  const raw = q('#db-json');
  if (!raw) { P('could not export the dataset to check invariants'); return done(); }
  let S;
  try { S = JSON.parse(raw.value).data; } catch (e) { P('export is not valid JSON: ' + e.message); return done(); }
  click(q('#modal-root [data-close]'));
  S = { jobs: S.jobs, subs: S.subs, pl: S.placements, cands: S.candidates, times: S.times };
  S.jobs.forEach(j => {
    const placedSubs = S.subs.filter(s => s.jobId === j.id && s.status === 'Placed').length;
    const placements = S.pl.filter(p => p.jobId === j.id).length;
    if (j.filled !== placements)
      P('job ' + j.id + ' filled=' + j.filled + ' but has ' + placements + ' placement records');
    if (placedSubs !== placements)
      P('job ' + j.id + ' has ' + placedSubs + ' placed submissions but ' + placements + ' placements');
    if (j.filled > j.openings) P('job ' + j.id + ' is over-filled: ' + j.filled + '/' + j.openings);
    if (j.billRate <= j.payRate) P('job ' + j.id + ' has no margin: pay ' + j.payRate + ' bill ' + j.billRate);
  });
  S.pl.forEach(p => {
    if (p.billRate <= p.payRate) P('placement ' + p.id + ' has no margin');
    if (new Date(p.end) <= new Date(p.start)) P('placement ' + p.id + ' ends before it starts');
    const c = S.cands.find(x => x.id === p.candidateId);
    if (c && c.status !== 'Placed') P('placement ' + p.id + ' but candidate status is ' + c.status);
  });
  S.subs.forEach(s => {
    if (!s.history || !s.history.length) P('submission ' + s.id + ' has no status history');
    else if (s.history[s.history.length - 1].status !== s.status)
      P('submission ' + s.id + ' status "' + s.status + '" disagrees with its history');
    if (s.sendoutAt && !s.sentTo) P('submission ' + s.id + ' has a sendout with no recipient');
    if (s.payRate && s.billRate && s.billRate <= s.payRate)
      P('submission ' + s.id + ' priced at zero or negative margin');
  });
  S.times.forEach(t => {
    if (!S.pl.find(p => p.id === t.placementId)) P('time entry ' + t.id + ' has no placement');
  });
  S.cands.forEach(c => {
    if (c.cv && c.cv.length < 60) P('candidate ' + c.id + ' has a CV too short to search');
  });

  done();
  function done(){
    console.log(problems.length ? 'FINDINGS (' + problems.length + '):\n' + problems.map(x => ' * ' + x).join('\n')
      : 'AUDIT CLEAN');
  }
}, 300);
