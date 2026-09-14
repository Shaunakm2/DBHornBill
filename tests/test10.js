const { loadApp } = require('./harness');
const errors = []; const fail = m => errors.push(m);
const dom = loadApp({ onError: ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)) });
const w = dom.window, d = w.document;
const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
const click = (el, what) => { if (!el) { fail('missing: ' + what); return false; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return true; };
function nav(v) {
  let a = q('#rail [data-go="' + v + '"]');
  if (!a) { if (!q('.mfly')) click(q('[data-act="menu"]'), 'menu'); a = q('.mfly a[data-go="' + v + '"]'); }
  if (!a) return fail('no menu item ' + v);
  click(a, 'nav ' + v);
}
const main = () => q('#main').textContent;
const modalText = () => (q('#modal-root') || {}).textContent || '';
const modalOpen = () => !!q('#modal-root .modal');
const errs = () => qa('#modal-root .err').map(e => e.textContent);
const warns = () => qa('#modal-root .warn-note').map(e => e.textContent);
function setF(k, v) {
  const el = q('[data-f="' + k + '"]');
  if (!el) return fail('missing field ' + k);
  if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
  else { el.value = v; el.dispatchEvent(new w.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }
}
const submitM = () => click(q('#modal-root [data-go]'), 'submit');
const closeM = () => { const b = q('#modal-root [data-close]'); if (b) click(b, 'close'); q('#modal-root').innerHTML = ''; };

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip');

  /* ================= 1. permissive mode ================= */
  const pm = q('#pmode');
  if (!pm) fail('no rules-mode toggle in the header');
  else {
    if (!/Rules: permissive/.test(pm.textContent))
      fail('should ship in permissive mode per the agreed configuration, reads: ' + pm.textContent);
    click(q('#pmode'), 'switch to strict for the strict assertions');
    if (!/Rules: strict/.test(q('#pmode').textContent)) fail('could not switch to strict');

    // strict: a soft rule blocks
    nav('companies');
    click(q('[data-act="add-company"]'), 'add company');
    setF('name', '');
    submitM();
    if (!errs().length) fail('strict mode let an empty required field through');
    if (warns().length) fail('strict mode showed warnings instead of errors');
    if (q('[data-f="__override"]')) fail('override offered in strict mode');
    closeM();

    // back to permissive
    click(q('#pmode'), 'toggle permissive');
    if (!/Rules: permissive/.test(q('#pmode').textContent)) fail('toggle did not switch to permissive');

    // permissive: the same rule now warns and can be overridden
    click(q('[data-act="add-company"]'), 'add company again');
    setF('name', '');
    submitM();
    if (!modalOpen()) fail('permissive mode saved silently with a missing field');
    if (!warns().length) fail('permissive mode did not show the rule as a warning');
    if (!q('[data-f="__override"]')) fail('no override control in permissive mode');
    if (!/recorded against your name/.test(modalText())) fail('override is not explained as logged');
    // override it
    setF('__override', true);
    submitM();
    if (modalOpen()) fail('override did not save: ' + warns().join(' | '));
    nav('audit');
    if (!/Override/.test(main())) fail('the override was not written to the activity log');

    // hard rules must still block in permissive mode
    nav('candidates');
    click(q('[data-act="add-candidate"]'), 'add candidate');
    setF('name', 'Marcus Delaney');
    submitM();
    if (!/Possible duplicate/.test(modalText())) fail('duplicate not reported at all');
    // a duplicate is a warning per spec, so it should be overridable
    if (!q('[data-f="__override"]')) fail('duplicate should be overridable in permissive mode');
    closeM();

    // a structural rule stays hard
    nav('jobs');
    click(qa('tbody tr.click')[0], 'a job order');
    click(q('[data-act="job-status"]'), 'change status');
    setF('status', 'Filled');
    setF('reason', 'Attempting to mark filled while coverage is short, which must be refused.');
    submitM();
    if (!modalOpen()) fail('a structural rule was overridden in permissive mode');
    if (q('[data-f="__override"]')) fail('override offered for a structural rule');
    if (!errs().some(e => /misstate coverage/.test(e))) fail('coverage rule did not fire');
    closeM();

    // back to strict for the rest
    click(q('#pmode'), 'back to strict');
    if (!/Rules: strict/.test(q('#pmode').textContent)) fail('could not return to strict');
  }

  /* ================= 2. duplicate detection on email and phone ================= */
  nav('candidates');
  const cf = q('#cand-filter');
  cf.value = 'Marcus Delaney';
  cf.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const row = qa('tbody tr.click').find(r => /Marcus Delaney/.test(r.textContent));
  if (!row) fail('could not find a known candidate to duplicate');
  click(q('[data-act="cand-clear"]'), 'reset filter');

  click(q('[data-act="add-candidate"]'), 'add candidate');
  setF('name', 'Completely Different Person');
  setF('email', 'marcus.delaney@mail.example');
  submitM();
  if (!/Possible duplicate/.test(modalText())) fail('duplicate email not detected');
  if (!/email address/.test(modalText())) fail('duplicate message does not say it matched on email');
  setF('email', 'unique.person@mail.example');
  setF('phone', '+1 555 0710');
  submitM();
  const t1 = modalText();
  if (/Possible duplicate/.test(t1) && !/phone number/.test(t1))
    fail('duplicate reported but not attributed to the phone number');
  closeM();

  /* ================= 3. candidate list multi-select ================= */
  nav('candidates');
  if (!q('[data-act="sel-all"]')) fail('no select-all control on the candidate list');
  const boxes = qa('#main [data-act="sel"]');
  if (boxes.length < 3) fail('no per-row selection on the candidate list');
  else {
    click(boxes[0], 'select row 1');
    if (!/1 selected/.test(main())) fail('bulk toolbar did not appear after selecting a row');
    click(qa('#main [data-act="sel"]')[1], 'select row 2');
    if (!/2 selected/.test(main())) fail('selection count did not increase');
    ['mass-update', 'mass-pipeline', 'mass-tearsheet', 'mass-note', 'sel-none']
      .forEach(a => { if (!q('[data-act="' + a + '"]')) fail('bulk toolbar missing action: ' + a); });

    // select all on the page
    click(q('[data-act="sel-all"]'), 'select all');
    const n = (main().match(/(\d+) selected/) || [])[1];
    if (!n || +n < 20) fail('select-all only picked ' + n);
    // and clear it
    click(q('[data-act="sel-all"]'), 'clear all');
    if (/selected/.test(main())) fail('select-all did not toggle off');

    // bulk note across two records
    click(qa('#main [data-act="sel"]')[0], 'select again 1');
    click(qa('#main [data-act="sel"]')[1], 'select again 2');
    click(q('[data-act="mass-note"]'), 'bulk note');
    setF('text', 'Bulk availability check sent as part of the weekly call-out to this shortlist.');
    submitM();
    if (modalOpen()) fail('bulk note did not save: ' + errs().join('|'));
    if (/selected/.test(main())) fail('selection not cleared after a bulk action');
    nav('notes');
    const noteCount = (main().match(/Bulk availability check/g) || []).length;
    if (noteCount < 2) fail('bulk note only landed on ' + noteCount + ' record(s)');

    // mass update guards
    nav('candidates');
    click(qa('#main [data-act="sel"]')[0], 'select for mass update');
    click(q('[data-act="mass-update"]'), 'mass update');
    setF('ack', true);
    submitM();
    if (!errs().some(e => /Nothing would change/.test(e))) fail('mass update allowed a no-op');
    closeM();
  }

  /* ================= 4. pipeline drag and drop ================= */
  nav('jobs');
  const jrow = qa('tbody tr.click').find(r => /Warehouse Team Lead/.test(r.textContent)) || qa('tbody tr.click')[0];
  click(jrow, 'job with a pipeline');
  const chips = qa('.chip[draggable]');
  if (!chips.length) fail('pipeline cards are not draggable');
  if (!qa('[data-drop]').length) fail('pipeline columns are not drop targets');

  function drop(subId, status) {
    const zone = qa('[data-drop]').find(z => z.getAttribute('data-drop') === status);
    if (!zone) return fail('no drop zone for ' + status);
    const chip = qa('.chip[data-sub="' + subId + '"]')[0];
    if (chip) chip.dispatchEvent(new w.Event('dragstart', { bubbles: true }));
    const ev = new w.Event('drop', { bubbles: true });
    ev.dataTransfer = { getData: () => subId, setData: () => { }, dropEffect: '' };
    ev.preventDefault = () => { };
    zone.dispatchEvent(ev);
  }
  const firstChip = qa('.chip[data-sub]')[0];
  const subId = firstChip.getAttribute('data-sub');
  const curStatus = firstChip.closest('.rung').querySelector('.rung-b').getAttribute('data-drop');
  const order = ['New Lead', 'Internal Submission', 'Client Submission', 'Interview Scheduled', 'Offer Extended', 'Placed'];
  const ci = order.indexOf(curStatus);

  // skipping ahead must be refused with an explanation
  if (ci >= 0 && ci + 2 < order.length) {
    drop(subId, order[ci + 2]);
    if (!/One status at a time/.test(modalText())) fail('skipping statuses by drag was not refused');
    closeM();
  }
  // dragging backwards must be refused
  if (ci > 0) {
    drop(subId, order[ci - 1]);
    if (!/do not move backwards/i.test(modalText())) fail('dragging backwards was not refused');
    closeM();
  }
  // the legal next step must open the stage form, which still enforces its own gates
  drop(subId, order[ci + 1]);
  if (!modalOpen()) fail('dropping on the next column did not open the stage form');
  if (!new RegExp(order[ci + 1]).test(modalText())) fail('stage form is for the wrong status: ' + modalText().slice(0, 80));
  submitM();
  if (!modalOpen()) fail('the stage form skipped its own validation on a drag');
  closeM();


  /* ================= 5. slide-out record preview ================= */
  ['candidates','jobs','companies'].forEach(function(view){
    nav(view);
    var qv = q('#main [data-act="peek"]');
    if (!qv) { fail('no quick-view control on ' + view); return; }
    click(qv, 'quick view on ' + view);
    if (!q('.peek')) { fail('preview did not open from ' + view); return; }
    if (!q('.peek-h .nm').textContent.trim()) fail('preview has no record name on ' + view);
    var tabs = qa('.peek-tabs a');
    if (tabs.length < 3) fail('preview on ' + view + ' has only ' + tabs.length + ' tabs');
    tabs.forEach(function(t, i) {
      click(qa('.peek-tabs a')[i], 'preview tab ' + i);
      var b = q('.peek-b');
      if (!b || b.textContent.trim().length < 10)
        fail('preview tab "' + t.textContent.trim() + '" on ' + view + ' is empty');
    });
    // the list is still behind it, not replaced
    if (q('#main').textContent.trim().length < 100) fail('opening the preview blanked the list on ' + view);
    // Escape closes it
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    if (q('.peek')) fail('Escape did not close the preview on ' + view);
    // Open takes you to the full record
    click(q('#main [data-act="peek"]'), 'quick view again');
    var ob = q('[data-act="peek-open"]');
    if (!ob) fail('preview has no Open control');
    else {
      click(ob, 'open full record');
      if (q('.peek')) fail('preview stayed open after Open');
      if (!q('.h.rec')) fail('Open did not land on a record page from ' + view);
    }
  });

  /* navigating away must dismiss the preview */
  nav('candidates');
  click(q('#main [data-act="peek"]'), 'quick view');
  nav('jobs');
  if (q('.peek')) fail('preview survived navigation');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'PERMISSIVE + BULK + DUPES + DRAG CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
}, 300);
