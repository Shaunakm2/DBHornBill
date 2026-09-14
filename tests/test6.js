const fs = require('fs');
const { loadApp } = require('./harness');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');


const errors = []; const fail = m => errors.push(m);
const wait = ms => new Promise(r => setTimeout(r, ms));

function load(withIDB) {
  const dom = loadApp({ indexedDB: (withIDB === undefined || withIDB) ? indexedDB : null,
    IDBKeyRange: (withIDB === undefined || withIDB) ? IDBKeyRange : null,
    onError: ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)) });
  return dom;
}
function tools(dom) {
  const w = dom.window, d = w.document;
  const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
  const click = (el, what) => { if (!el) { fail('missing: ' + what); return false; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return true; };
function nav(v){
  var a=q('#rail [data-go="'+v+'"]');
  if(!a){ if(!q('.mfly')) click(q('[data-act="menu"]'),'menu'); a=q('.mfly a[data-go="'+v+'"]'); }
  if(!a) return fail('no menu item '+v);
  click(a,'nav '+v);
}
  const openCoach = () => { if (!q('[data-scenario]')) { const b = q('.fab'); if (b) click(b, 'fab'); } };
  const coachText = () => { openCoach(); return q('#coach').textContent; };
  return { w, d, q, qa, click, nav, openCoach, coachText, main: () => q('#main').textContent, tour: () => q('#tour-root').textContent };
}

(async () => {
  /* ---- 1. first run offers the tour ---- */
  let dom = load(false);
  let { w, d, q, qa, click, nav, openCoach, coachText, main, tour } = tools(dom);
  await wait(300);
  if (!/Welcome to the practice environment/.test((q('#modal-root') || {}).textContent || ''))
    fail('first run did not offer the tour');
  if (!/Entirely optional/.test(q('#modal-root').textContent)) fail('welcome does not say it is optional');
  if (!q('[data-welcome="skip"]')) fail('no skip option on the welcome prompt');
  if (!q('[data-welcome="go"]')) fail('no way to start the tour from the welcome prompt');

  /* ---- 2. skipping works and does not block anything ---- */
  click(q('[data-welcome="skip"]'), 'skip');
  if (q('#modal-root .modal')) fail('welcome prompt did not close on skip');
  if (q('#tour-root').innerHTML.trim()) fail('tour started despite skipping');
  nav('candidates');
  if (!/records/.test(main())) fail('app not usable after skipping the tour');
  if (!/Replay the guided tour/.test(coachText())) fail('coach rail does not offer a replay after skipping');

  /* ---- 3. replay from the coach rail, then walk every step ---- */
  openCoach(); click(q('#coach [data-act="tour"]'), 'replay tour');
  if (!/Step 1 of/.test(tour())) fail('tour did not start from the coach rail');
  const totalM = tour().match(/Step 1 of (\d+)/);
  const total = totalM ? +totalM[1] : 0;
  if (total < 8) fail('tour is only ' + total + ' steps');
  if (!/Skip the tour/.test(tour())) fail('no skip control during the tour');

  const seenTitles = [];
  for (let i = 1; i <= total; i++) {
    const t = tour();
    const m = t.match(/Step (\d+) of \d+/);
    if (!m || +m[1] !== i) fail('expected step ' + i + ', tour shows: ' + (m ? m[1] : 'none'));
    seenTitles.push(t.slice(0, 80));
    if (i === 1 && q('[data-tour="back"]')) fail('Back offered on the first step');
    if (i === total && !/Finish/.test(t)) fail('last step does not offer Finish');
    if (i < total && !q('[data-tour="next"]')) fail('no Next control on step ' + i);
    click(q('[data-tour="next"]'), 'next from step ' + i);
    await wait(20);
  }
  if (q('#tour-root').innerHTML.trim()) fail('tour overlay not cleared after finishing');
  if (!/Tour finished/.test((q('#modal-root') || {}).textContent || '')) fail('no confirmation after the last step');
  click(q('#modal-root [data-close]'), 'close finish dialog');

  // the tour must have visited the search, candidate, job order and database screens
  nav('audit');
  const auditText = main();
  ['Started the guided tour', 'Completed the guided tour'].forEach(a => {
    if (auditText.indexOf(a) < 0) fail('activity log missing: ' + a);
  });

  /* ---- 4. Back works and Escape leaves the tour ---- */
  nav('guide');
  if (!q('[data-act="tour"]')) fail('Guide has no tour button');
  click(q('[data-act="tour"]'), 'tour from guide');
  click(q('[data-tour="next"]'), 'next');
  await wait(20);
  if (!/Step 2 of/.test(tour())) fail('did not advance to step 2');
  click(q('[data-tour="back"]'), 'back');
  await wait(20);
  if (!/Step 1 of/.test(tour())) fail('Back did not return to step 1');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  if (q('#tour-root').innerHTML.trim()) fail('Escape did not close the tour');

  // arrow keys
  click(q('[data-act="tour"]'), 'tour again');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await wait(20);
  if (!/Step 2 of/.test(tour())) fail('ArrowRight did not advance the tour');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  await wait(20);
  if (!/Step 1 of/.test(tour())) fail('ArrowLeft did not go back');
  click(q('[data-tour="skip"]'), 'skip mid-tour');
  if (q('#tour-root').innerHTML.trim()) fail('skip mid-tour left the overlay up');

  /* ---- 5. the seen flag persists across a reload ---- */
  let dom2 = load(true);
  let T2 = tools(dom2);
  await wait(400);
  if (!/Welcome to the practice environment/.test((T2.q('#modal-root') || {}).textContent || ''))
    fail('fresh browser profile did not offer the tour');
  T2.click(T2.q('[data-welcome="go"]'), 'take tour');
  if (!/Step 1 of/.test(T2.tour())) fail('tour did not start from the welcome prompt');
  T2.click(T2.q('[data-tour="skip"]'), 'skip');
  await wait(400);

  let dom3 = load(true);
  let T3 = tools(dom3);
  await wait(500);
  const m3 = (T3.q('#modal-root') || {}).textContent || '';
  if (/Welcome to the practice environment/.test(m3))
    fail('tour prompt reappeared on a second visit in the same browser');
  if (!/Replay the guided tour/.test(T3.coachText()))
    fail('replay option missing on a returning visit');

  /* ---- 6. reset should offer the tour again to the next trainee ---- */
  T3.click(T3.q('[data-act="reset"]'), 'reset');
  const ack = T3.q('[data-f="ack"]'); ack.checked = true;
  ack.dispatchEvent(new T3.w.Event('change', { bubbles: true }));
  T3.click(T3.q('#modal-root [data-go]'), 'confirm reset');
  await wait(200);
  if (!/Take the guided tour/.test(T3.coachText()))
    fail('after a reset the coach rail should offer the tour as new');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'TOUR CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
})();
