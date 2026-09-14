const { loadApp, APP_PATH, CSS_PATH } = require('./harness');
const fs = require('fs');
const problems = []; const P = m => { if (problems.indexOf(m) < 0) problems.push(m); };

/* ---------- static: CSS custom properties that are used but never defined ---------- */
const css = fs.readFileSync(CSS_PATH, 'utf8');
const defined = new Set();
let m; const dre = /(--[a-z0-9-]+)\s*:/g;
while ((m = dre.exec(css))) defined.add(m[1]);
const ure = /var\((--[a-z0-9-]+)/g;
while ((m = ure.exec(css))) if (!defined.has(m[1])) P('CSS uses undefined token ' + m[1]);
/* inline styles in the JS use tokens too */
const js = fs.readFileSync(APP_PATH, 'utf8');
const ure2 = /var\((--[a-z0-9-]+)/g;
while ((m = ure2.exec(js))) if (!defined.has(m[1])) P('app.js uses undefined CSS token ' + m[1]);
/* obviously malformed declarations */
(css.match(/^[^@\/\s][^{]*\{[^}]*[^;\s}]\s*\}/gm) || []).forEach(() => {});
if (/#[0-9a-fA-F]{7,}/.test(css)) P('malformed hex colour in app.css');
if (/:\s*;/.test(css)) P('empty CSS declaration in app.css');

const dom = loadApp({ onError: ev => P('RUNTIME: ' + (ev.error && ev.error.stack || ev.message).slice(0, 200)) });
const w = dom.window, d = w.document;
const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

/* every case handled by the delegated switch */
const handled = new Set();
const cre = /case '([a-z-]+)':/g;
while ((m = cre.exec(js))) handled.add(m[1]);

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'));

  function nav(v) {
    let a = q('#rail [data-go="' + v + '"]');
    if (!a) { if (!q('.mfly')) click(q('[data-act="menu"]')); a = q('.mfly a[data-go="' + v + '"]'); }
    if (!a) { P('cannot reach view ' + v); return false; }
    click(a); return true;
  }
  // the redesigned sidebar carries all navigation; the legacy flyout is the fallback
  let views = qa('#rail [data-go]').map(a => a.getAttribute('data-go'));
  if (views.length < 10) {
    click(q('[data-act="menu"]'));
    views = views.concat(qa('.mfly a[data-go]').map(a => a.getAttribute('data-go')));
    click(q('[data-menuclose]'));
  }
  views = [...new Set(views)];

  /* ---------- live DOM: every control on every screen must be wired ---------- */
  const seenActs = new Set();
  function scanControls(where) {
    qa('#main [data-act], .coach [data-act], #rail [data-act]').forEach(el => {
      const a = el.getAttribute('data-act');
      seenActs.add(a);
      if (!handled.has(a)) P('unhandled control "' + a + '" rendered on ' + where);
      if (el.tagName !== 'BUTTON' && el.tagName !== 'A' && !el.hasAttribute('role'))
        P('control "' + a + '" on ' + where + ' has no role for assistive tech');
    });
    qa('#main [data-go]').forEach(el => {
      const v = el.getAttribute('data-go');
      if (views.indexOf(v) < 0 && ['candidate','job','company','contact','placement','tearsheet','lead','opp'].indexOf(v) < 0)
        P('link on ' + where + ' points at unknown view "' + v + '"');
    });
  }

  views.forEach(v => { if (nav(v)) scanControls('view:' + v); });

  /* record pages and their tabs */
  [['candidates','candidate'],['jobs','job'],['companies','company'],['contacts','contact'],
   ['placements','placement'],['tearsheets','tearsheet'],['leads','lead'],['opps','opp']]
   .forEach(([list, type]) => {
    if (!nav(list)) return;
    const row = qa('tbody tr.click')[0];
    if (!row) return;
    click(row);
    scanControls('record:' + type);
    qa('.rtabs a[data-rtab]').map(a => a.getAttribute('data-rtab')).forEach(t => {
      click(qa('.rtabs a[data-rtab]').find(a => a.getAttribute('data-rtab') === t));
      scanControls('record:' + type + ' tab:' + t);
    });
  });

  /* practice panel controls */
  if (!q('[data-scenario]')) click(q('.fab'));
  scanControls('practice panel');

  /* ---------- every modal-opening control must open and close cleanly ---------- */
  const MODAL_ACTS = ['addnew','notifs','session','add-task','note','add-candidate','add-company',
    'add-contact','add-lead','add-tearsheet','pipeline-add','tearsheet-add','assess','review',
    'db-export','db-import','db-clear','reset'];
  MODAL_ACTS.forEach(a => {
    if (!seenActs.has(a)) return;
    // find it wherever it lives
    let found = null;
    for (const v of views) {
      nav(v);
      found = q('#main [data-act="' + a + '"]') || q('.sandbox-mark [data-act="' + a + '"]');
      if (found) break;
    }
    if (!found) found = q('[data-act="' + a + '"]');
    if (!found) return;
    click(found);
    if (!q('#modal-root .modal')) P('control "' + a + '" opened nothing');
    else {
      const cl = q('#modal-root [data-close]');
      if (!cl) P('modal from "' + a + '" has no way to close it');
      else { click(cl); if (q('#modal-root .modal')) P('modal from "' + a + '" would not close'); }
    }
    q('#modal-root').innerHTML = '';
  });

  /* ---------- required-field enforcement on the creation forms ---------- */
  [['add-company','companies'],['add-lead','leads'],['add-tearsheet',null],['add-task','tasks']]
    .forEach(([a, view]) => {
      if (view) nav(view);
      let btn = q('#main [data-act="' + a + '"]');
      if (!btn) { click(q('[data-act="addnew"]')); const alt = q('#modal-root [data-new]'); q('#modal-root').innerHTML=''; }
      if (!btn) return;
      click(btn);
      const sub = q('#modal-root [data-go]');
      if (!sub) { q('#modal-root').innerHTML=''; return; }
      click(sub);
      if (!qa('#modal-root .err').length && !q('#modal-root .modal'))
        P('form "' + a + '" saved with every field empty');
      q('#modal-root').innerHTML = '';
    });

  console.log(problems.length
    ? 'FINDINGS (' + problems.length + '):\n' + problems.map(x => ' * ' + x).join('\n')
    : 'DEEP AUDIT CLEAN');
}, 300);
