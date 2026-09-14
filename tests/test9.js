const { loadApp } = require('./harness');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
const errors = []; const fail = m => errors.push(m);
const wait = ms => new Promise(r => setTimeout(r, ms));

function boot(withIDB) {
  const dom = loadApp({ indexedDB: withIDB ? indexedDB : null, IDBKeyRange: withIDB ? IDBKeyRange : null,
    onError: ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)) });
  const w = dom.window, d = w.document;
  const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
  const click = (el, what) => { if (!el) { fail('missing: ' + what); return false; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return true; };
  return { dom, w, d, q, qa, click, main: () => q('#main').textContent };
}

(async () => {
  let T = boot(false);
  const { q, qa, click, w } = T;
  await wait(250);
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip welcome');

  /* ---- 0. the redesigned sidebar is the shipped default ---- */
  if (q('.side-menu')) fail('the redesigned sidebar is not the default');
  if (q('.side-brand')) fail('the sidebar carries a second wordmark, duplicating the top bar');
  const gh = qa('#rail .side-grp').map(x => x.textContent);
  if (gh.filter((x, i) => gh.indexOf(x) !== i).length)
    fail('a navigation group header appears more than once: ' + gh.join(' | '));
  if (!q('[data-act="focus-find"]')) fail('Fast Find is not in the redesigned sidebar');
  if (!q('#rail [data-go="config"]')) fail('Preferences is not in the redesigned sidebar');
  const redesignItems = qa('#rail [data-go]').length;
  if (redesignItems < 15) fail('the redesigned sidebar carries only ' + redesignItems + ' items; it should carry all navigation');
  if (q('[data-act="menu"]')) fail('a Menu control is present in the redesigned interface');
  if (q('.mfly')) fail('a Menu flyout is present in the redesigned interface');
  // opening a record must not add a tab to the redesigned sidebar
  click(q('#rail [data-go="candidates"]'), 'candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  if (qa('.side-tab').length) fail('open records are shown as sidebar tabs in the redesigned interface, which is not documented');

  /* ---- switch to the legacy interface for the rest ---- */
  click(q('#rail [data-go="config"]'), 'preferences');
  if (!/not of Bullhorn/.test(T.main())) fail('the interface switch is not labelled as a sandbox feature');
  click(q('[data-act="ui-mode"]'), 'switch to legacy');
  if (!q('.side-menu')) fail('the legacy Menu block did not appear');

  /* ---- 1. pinned sections exist, with icons and labels ---- */
  const pins = qa('.side-pin');
  if (pins.length < 8) fail('only ' + pins.length + ' pinned sections');
  const labels = pins.map(p => p.textContent.replace(/\d+$/, '').trim());
  ['Home', 'Candidates', 'Jobs', 'Submissions', 'Companies', 'Contacts', 'Placements', 'Tasks', 'Tearsheets', 'Reports']
    .forEach(t => { if (!labels.some(l => l.indexOf(t) === 0)) fail('pinned section missing: ' + t); });
  if (!q('.side-pin .ic svg')) fail('pinned sections have no icons');

  /* ---- 2. counts and attention flags render ---- */
  const candPin = pins.find(p => /Candidates/.test(p.textContent));
  if (!/\d/.test(candPin.textContent)) fail('candidate pin shows no count');
  const subPin = qa('.side-pin').find(p => /Submissions/.test(p.textContent));
  if (!subPin) fail('no submissions pin');

  /* ---- 3. every pinned section navigates and highlights ---- */
  ['candidates', 'jobs', 'pipeline', 'companies', 'contacts', 'placements', 'tasks', 'tearsheets', 'reports', 'dashboard']
    .forEach(v => {
      const a = q('.side-pin[data-go="' + v + '"]');
      if (!a) return fail('no pin for ' + v);
      click(a, 'pin ' + v);
      if (T.main().trim().length < 40) fail('pin ' + v + ' rendered a thin view');
      const on = q('.side-pin.on');
      if (!on) fail('no active pin after navigating to ' + v);
    });

  /* ---- 4. the flyout still carries the sections that are not pinned ---- */
  click(q('[data-act="menu"]'), 'menu');
  const flyViews = qa('.mfly a[data-go]').map(a => a.getAttribute('data-go'));
  ['search', 'data', 'guide', 'audit', 'appts', 'leads', 'opps', 'approvals', 'notes']
    .forEach(v => { if (flyViews.indexOf(v) < 0) fail('flyout missing ' + v); });
  click(q('[data-menuclose]'), 'close menu');

  /* ---- 5. open records appear beneath the pins, under their own heading ---- */
  click(q('.side-pin[data-go="candidates"]'), 'candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  if (!qa('.side-tab').length) fail('opening a record did not add a tab');
  if (!/Open records/.test(q('#rail').textContent)) fail('no heading above the open record tabs');
  const pinIdx = Array.from(q('#rail').children).findIndex(c => c.className === 'side-pins');
  const tabIdx = Array.from(q('#rail').children).findIndex(c => c.className === 'side-tabs');
  if (!(pinIdx >= 0 && tabIdx > pinIdx)) fail('open records are not below the pinned sections');

  /* ---- 6. collapse to icons ---- */
  const col = q('.side-collapse');
  if (!col) fail('no collapse control on the left column');
  else {
    click(col, 'collapse');
    if (q('.side').className.indexOf('mini') < 0) fail('collapse did not switch to icon mode');
    if (q('.side-pin .lbl')) fail('labels still showing in icon mode');
    if (!q('.side-pin .ic svg')) fail('icons lost in icon mode');
    // still navigable while collapsed
    click(q('.side-pin[data-go="jobs"]'), 'jobs while collapsed');
    if (!/Job Orders/.test(T.main())) fail('cannot navigate while collapsed');
    click(q('.side-collapse'), 'expand');
    if (q('.side').className.indexOf('mini') >= 0) fail('could not expand again');
    if (!q('.side-pin .lbl')) fail('labels did not come back');
  }

  /* ---- 7. the collapsed choice survives a reload ---- */
  let T2 = boot(true);
  await wait(400);
  if (T2.q('#modal-root').innerHTML.trim()) T2.click(T2.q('[data-welcome="skip"]'), 'skip');
  T2.click(T2.q('#rail [data-go="config"]'), 'prefs');
  const sw2 = T2.q('[data-act="ui-mode"]');
  if (sw2 && /legacy interface/.test(sw2.textContent)) T2.click(sw2, 'legacy');
  T2.click(T2.q('.side-collapse'), 'collapse');
  await wait(400);
  let T3 = boot(true);
  await wait(500);
  if (T3.q('.side').className.indexOf('mini') < 0)
    fail('icon-only choice did not survive a reload');
  T3.click(T3.q('.side-collapse'), 'expand');
  await wait(400);
  let T4 = boot(true);
  await wait(500);
  if (T4.q('.side').className.indexOf('mini') >= 0)
    fail('expanded choice did not survive a reload');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'HYBRID NAV CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
})();
