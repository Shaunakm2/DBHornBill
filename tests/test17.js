/* Injection, escaping, fuzzing and robustness */
const { loadApp } = require('./harness');
const errors = []; const fail = m => errors.push(m);
const dom = loadApp({ onError: ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)) });
const w = dom.window, d = w.document;
const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
const click = (el, what) => { if (!el) { fail('missing: ' + what); return false; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return true; };
function nav(v) { let a = q('#rail [data-go="' + v + '"]'); if (!a) { if (!q('.mfly')) click(q('[data-act="menu"]'), 'menu'); a = q('.mfly a[data-go="' + v + '"]'); } if (!a) return fail('no menu item ' + v); click(a, 'nav ' + v); }
const main = () => q('#main').textContent;
const mopen = () => !!q('#modal-root .modal');
const errs = () => qa('#modal-root .err, #modal-root .warn-note').map(e => e.textContent);
function setF(k, v) { const el = q('[data-f="' + k + '"]'); if (!el) return false;
  if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
  else { el.value = v; el.dispatchEvent(new w.Event((el.tagName === 'SELECT' || el.type === 'date' || el.type === 'time') ? 'change' : 'input', { bubbles: true })); }
  return true; }
const submitM = () => click(q('#modal-root [data-go]'), 'submit');
const closeM = () => { const b = q('#modal-root [data-close]'); if (b) click(b, 'close'); q('#modal-root').innerHTML = ''; };
const permissive = () => { const p = q('#pmode'); if (p && /strict/.test(p.textContent)) click(p, 'permissive'); };

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip');
  permissive();   // so long/odd values save rather than being blocked

  /* =============== 1. injection and escaping =============== */
  const PAYLOADS = [
    '<script>window.__pwned=1;<\/script>',
    '"><img src=x onerror="window.__pwned=1">',
    "'; DROP TABLE candidates; --",
    '<svg onload="window.__pwned=1">',
    '</td></tr><tr><td>broken table',
    '{{7*7}} ${7*7} <%= 7*7 %>',
    'Ünïcödé ☠ 中文 عربى \u0000 tail'
  ];
  const injected = [];
  PAYLOADS.forEach((pay, i) => {
    nav('companies');
    click(q('[data-act="add-company"]'), 'add company');
    const nm = 'INJ' + i + ' ' + pay;
    setF('name', nm);
    setF('category', 'Information Technology');
    setF('status', 'Prospect');
    setF('owner', 'A. Trainee');
    setF('__override', true);
    submitM();
    if (mopen()) { setF('__override', true); submitM(); }
    if (mopen()) { closeM(); return; }
    injected.push(nm);
  });
  if (injected.length < 5) fail('only ' + injected.length + ' payloads were accepted; escaping barely exercised');
  if (w.__pwned) fail('SCRIPT EXECUTED from an injected field value');
  if (d.querySelector('script[data-injected], img[onerror], svg[onload]'))
    fail('an injected payload became a live DOM element');

  // the payload must survive as text everywhere it is displayed
  nav('companies');
  const listText = main();
  if (listText.indexOf('<script>') < 0 && listText.indexOf('&lt;script&gt;') < 0)
    fail('the injected name is not visible as text in the list');
  // open one and check the record, list and preview all render it inertly
  const row = qa('tbody tr.click').find(r => /INJ0/.test(r.textContent));
  if (!row) fail('cannot find the injected company');
  else {
    click(row, 'injected company');
    if (w.__pwned) fail('SCRIPT EXECUTED when opening the record');
    if (!/INJ0/.test(main())) fail('the record does not show the injected name');
    ['overview', 'contacts', 'jobs', 'notes'].forEach(t => {
      const tb = qa('.rtabs a').find(a => a.getAttribute('data-rtab') === t);
      if (tb) { click(tb, 'tab ' + t); if (w.__pwned) fail('SCRIPT EXECUTED on tab ' + t); }
    });
  }
  // quick view and Fast Find
  nav('companies');
  const qv = qa('#main [data-act="peek"]').find(x => /INJ/.test((x.closest('tr') || x).textContent));
  if (qv) { click(qv, 'quick view'); if (w.__pwned) fail('SCRIPT EXECUTED in the preview'); }
  const ff = q('#ff');
  ff.value = 'INJ'; ff.dispatchEvent(new w.Event('input', { bubbles: true }));
  if (w.__pwned) fail('SCRIPT EXECUTED in Fast Find results');
  if (!/INJ/.test(q('#ff-res').textContent)) fail('Fast Find does not match the injected record');

  // a payload inside a note, which is rendered in several places
  nav('dashboard');
  click(q('[data-act="note"]'), 'add note');
  setF('action', 'Outbound Call');
  setF('text', 'Note with a payload: <img src=x onerror="window.__pwned=1"> and a quote " and an apostrophe \'');
  setF('companyId', q('[data-f="companyId"]') ? q('[data-f="companyId"]').options[1].value : '');
  submitM();
  if (mopen()) { setF('__override', true); submitM(); }
  closeM();
  nav('notes');
  if (w.__pwned) fail('SCRIPT EXECUTED from a note body');
  if (!/payload/.test(main())) fail('the note is not displayed');

  /* =============== 2. fuzzing the boolean parser =============== */
  const FUZZ = ['', ' ', 'AND', 'OR', 'NOT', '((((', '))))', '(', ')', '()', '(())',
    '"', '""', '" unclosed', 'a AND', 'AND a', 'a OR OR b', 'NOT NOT NOT', '-', '--', '- -',
    'a: :b', ':', 'skills:', ':java', 'a:b:c', '*', '**', 'a**b', '*a', 'a AND (b OR', 'a) AND b',
    'a AND NOT', '"a" "b" "c"', 'java AND "unclosed', 'field_that_is_not_real:x',
    'a'.repeat(500), '(a OR '.repeat(40) + 'b' + ')'.repeat(40),
    '\u0000', '💥 AND 🔥', 'a\\\\b', 'a\tAND\tb', 'NOT (NOT (NOT a))'];
  nav('search');
  let ran = 0, reported = 0;
  FUZZ.forEach(qy => {
    const inp = q('#bs-q');
    if (!inp) return fail('search box vanished during fuzzing');
    inp.value = qy;
    inp.dispatchEvent(new w.Event('input', { bubbles: true }));
    click(q('[data-act="run-search"]'), 'fuzz run');
    ran++;
    const t = main();
    const ok = /results?|could not be read|Unknown field|No candidates match|Boolean query/.test(t);
    if (!ok) fail('fuzz query ' + JSON.stringify(qy.slice(0, 30)) + ' produced no readable outcome');
    if (/could not be read|Unknown field/.test(t)) reported++;
    if (!q('#bs-q')) fail('the search screen broke on ' + JSON.stringify(qy.slice(0, 30)));
  });
  if (ran !== FUZZ.length) fail('only ' + ran + ' of ' + FUZZ.length + ' fuzz queries ran');
  if (reported < 8) fail('only ' + reported + ' malformed queries were reported as errors; the parser may be silently swallowing them');

  /* =============== 3. extreme field values =============== */
  nav('candidates');
  click(q('[data-act="add-candidate"]'), 'add candidate');
  setF('name', 'Z'.repeat(400));
  setF('occupation', 'Q'.repeat(400));
  setF('location', 'L'.repeat(200));
  setF('skills', ('skill,'.repeat(200)));
  setF('desiredRate', '999999999');
  setF('email', 'a'.repeat(200) + '@mail.example');
  setF('phone', '9'.repeat(60));
  setF('status', 'Active'); setF('owner', 'A. Trainee');
  setF('__override', true);
  submitM();
  if (mopen()) { setF('__override', true); submitM(); }
  if (mopen()) closeM();
  nav('candidates');
  if (w.__pwned) fail('SCRIPT EXECUTED from an extreme value');
  // negative and non-numeric rates
  click(q('[data-act="add-candidate"]'), 'add candidate again');
  setF('name', 'Negative Rate Person');
  setF('desiredRate', '-50');
  submitM();
  if (!errs().some(e => /at least/i.test(e))) fail('a negative desired rate raised nothing');
  setF('desiredRate', 'not a number');
  submitM();
  if (!errs().some(e => /number/i.test(e))) fail('a non-numeric rate raised nothing');
  closeM();

  /* =============== 4. the application is still healthy =============== */
  ['dashboard', 'candidates', 'jobs', 'companies', 'pipeline', 'placements', 'reports', 'search', 'data', 'config', 'audit']
    .forEach(v => {
      nav(v);
      if (main().trim().length < 40) fail('view ' + v + ' broke after the robustness pass');
      if (/undefined|NaN|\[object Object\]/.test(main()))
        fail('view ' + v + ' leaks a raw value after the robustness pass');
    });
  if (w.__pwned) fail('SCRIPT EXECUTED at some point during the run');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n')
    : 'INJECTION + FUZZ + EXTREME VALUE CHECKS PASSED (' + injected.length + ' payloads, ' + ran + ' fuzz queries)');
  process.exit(errors.length ? 1 : 0);
}, 350);
