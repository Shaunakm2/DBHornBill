const fs = require('fs');
const { loadApp } = require('./harness');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
const errors = []; const fail = m => errors.push(m);
const wait = ms => new Promise(r => setTimeout(r, ms));

function load(withIDB) {
  const dom = loadApp({ indexedDB: withIDB ? indexedDB : null, IDBKeyRange: withIDB ? IDBKeyRange : null,
    onError: ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)) });
  const w = dom.window, d = w.document;
  const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
  const click = (el, what) => { if (!el) { fail('missing: ' + what); return false; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return true; };
function nav(v){
  var a=q('#rail [data-go="'+v+'"]');
  if(!a){ if(!q('.mfly')) click(q('[data-act="menu"]'),'menu'); a=q('.mfly a[data-go="'+v+'"]'); }
  if(!a) return fail('no menu item '+v);
  click(a,'nav '+v);
}
  return { dom, w, d, q, qa, click, nav, main: () => q('#main').textContent };
}

(async () => {
  let T = load(false);
  const { q, qa, click, nav, w, d } = T;
  await wait(250);
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip welcome');

  /* ---- 1. collapsed by default, app at full width ---- */
  const coach = q('#coach');
  if (coach.className.indexOf('mini') < 0) fail('practice panel is not collapsed by default');
  if (coach.innerHTML.trim()) fail('collapsed panel still renders content');
  if (q('[data-scenario]')) fail('collapsed panel still exposes the scenario picker');

  /* ---- 2. a floating button stands in for it ---- */
  const fab = q('.fab');
  if (!fab) fail('no floating button when the panel is collapsed');
  else {
    if (!/Practice tasks/.test(fab.textContent)) fail('button does not say what it opens');
    if (!/\d+ of \d+ done/.test(fab.textContent)) fail('button does not show progress');
    if (!fab.getAttribute('aria-label')) fail('button has no accessible label');
    if (!q('.fab svg circle')) fail('progress ring missing from the button');
  }

  /* ---- 3. it expands and collapses ---- */
  click(q('.fab'), 'fab');
  if (q('#coach').className.indexOf('mini') >= 0) fail('clicking the button did not expand the panel');
  if (!q('[data-scenario]')) fail('expanded panel has no scenario picker');
  if (q('.fab')) fail('button still showing while the panel is open');
  const closeBtn = q('.coach-collapse') || q('#coach [data-act="coach"]');
  if (!closeBtn) fail('expanded panel has no collapse control');
  click(closeBtn, 'collapse');
  if (q('#coach').className.indexOf('mini') < 0) fail('collapse control did not collapse the panel');
  if (!q('.fab')) fail('button did not come back after collapsing');

  /* ---- 4. progress on the button tracks real progress ---- */
  const before = q('.fab').textContent.match(/(\d+) of (\d+) done/);
  nav('reports');                     // ticks a step in scenario 3
  click(q('.fab'), 'fab');
  const sc = q('[data-scenario]'); sc.value = 's3';
  sc.dispatchEvent(new w.Event('change', { bubbles: true }));
  const openTotal = q('#coach').textContent.match(/(\d+) of (\d+) done/);
  click(q('.coach-collapse') || q('#coach [data-act="coach"]'), 'collapse again');
  const after = q('.fab').textContent.match(/(\d+) of (\d+) done/);
  if (!after) fail('button lost its progress readout');
  else if (after[2] !== openTotal[2]) fail('button total (' + after[2] + ') does not match the open panel (' + openTotal[2] + ')');

  /* ---- 5. navigating does not reopen or lose the choice ---- */
  ['candidates', 'jobs', 'search', 'data', 'guide'].forEach(v => {
    nav(v);
    if (q('#coach').className.indexOf('mini') < 0) fail('panel reopened itself on navigating to ' + v);
    if (!q('.fab')) fail('button disappeared on ' + v);
  });

  /* ---- 6. the choice survives a reload ---- */
  let T2 = load(true);
  await wait(400);
  if (T2.q('#modal-root').innerHTML.trim()) T2.click(T2.q('[data-welcome="skip"]'), 'skip');
  T2.click(T2.q('.fab'), 'expand');            // leave it expanded
  await wait(500);
  let T3 = load(true);
  await wait(500);
  if (T3.q('#coach').className.indexOf('mini') >= 0)
    fail('the expanded choice did not survive a reload');
  T3.click(T3.q('.coach-collapse') || T3.q('#coach [data-act="coach"]'), 'collapse');
  await wait(500);
  let T4 = load(true);
  await wait(500);
  if (T4.q('#coach').className.indexOf('mini') < 0)
    fail('the collapsed choice did not survive a reload');

  /* ---- 7. the tour still reaches the panel ---- */
  T4.click(T4.q('.fab'), 'expand for tour');
  T4.click(T4.q('#coach [data-act="tour"]'), 'start tour');
  let reachedPanelStep = false;
  for (let i = 0; i < 14; i++) {
    const t = T4.q('#tour-root').textContent;
    if (!/Step \d+ of/.test(t)) break;
    if (/Practice tasks/.test(t)) {
      reachedPanelStep = true;
      if (!/bottom right/.test(t)) fail('tour does not explain the collapse button');
      if (T4.q('#coach').className.indexOf('mini') >= 0) fail('tour did not open the panel for its own step');
    }
    T4.click(T4.q('[data-tour="next"]'), 'next ' + i);
    await wait(15);
  }
  if (!reachedPanelStep) fail('tour never reached the practice-tasks step');
  const fin = T4.q('#modal-root [data-close]'); if (fin) T4.click(fin, 'close');

  /* ---- 8. sourcing straight from a job order ---- */
  T4.nav('jobs');
  T4.click(T4.qa('tbody tr.click')[0], 'first job order');
  const jbtn = T4.q('[data-act="match-job"]') || T4.q('[data-act="job-search"]');
  if (!jbtn) fail('job order has no Find candidates action');
  else {
    T4.click(jbtn, 'find candidates');
    const sb = T4.q('#modal-root [data-go]');
    if (sb) T4.click(sb, 'run generated query');
    const box = T4.q('#bs-q');
    if (!box) fail('Find candidates did not land on the search screen');
    else {
      if (!box.value.trim()) fail('generated query is empty');
      if (!/Read as:/.test(T4.main())) fail('generated query was not executed');
      const m = T4.main().match(/(\d+) results?/);
      if (!m) fail('no result count after searching from the job order');
    }
  }

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'PANEL + SOURCING CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
})();
