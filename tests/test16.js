/* State-transition coverage and boundary-value analysis */
const { loadApp } = require('./harness');
const errors = []; const fail = m => errors.push(m);
const dom = loadApp({ onError: ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)) });
const w = dom.window, d = w.document;
const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
const click = (el, what) => { if (!el) { fail('missing: ' + what); return false; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return true; };
function nav(v) { let a = q('#rail [data-go="' + v + '"]'); if (!a) { if (!q('.mfly')) click(q('[data-act="menu"]'), 'menu'); a = q('.mfly a[data-go="' + v + '"]'); } if (!a) return fail('no menu item ' + v); click(a, 'nav ' + v); }
const main = () => q('#main').textContent;
const mtext = () => (q('#modal-root') || {}).textContent || '';
const mopen = () => !!q('#modal-root .modal');
const errs = () => qa('#modal-root .err, #modal-root .warn-note').map(e => e.textContent);
function setF(k, v) { const el = q('[data-f="' + k + '"]'); if (!el) return false;
  if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
  else { el.value = v; el.dispatchEvent(new w.Event((el.tagName === 'SELECT' || el.type === 'date' || el.type === 'time') ? 'change' : 'input', { bubbles: true })); }
  return true; }
const submitM = () => click(q('#modal-root [data-go]'), 'submit');
const closeM = () => { const b = q('#modal-root [data-close]'); if (b) click(b, 'close'); q('#modal-root').innerHTML = ''; };
const strict = () => { const p = q('#pmode'); if (p && /permissive/.test(p.textContent)) click(p, 'strict'); };
const permissive = () => { const p = q('#pmode'); if (p && /strict/.test(p.textContent)) click(p, 'permissive'); };

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip');
  strict();

  const ORDER = ['New Lead', 'Internal Submission', 'Client Submission', 'Interview Scheduled', 'Offer Extended', 'Placed'];

  /* ---------- 1. state-transition coverage on the pipeline board ---------- */
  function openJobWithBoard() {
    nav('jobs');
    const r = qa('tbody tr.click')[0];
    click(r, 'a job order');
  }
  function dropOn(subId, status) {
    const zone = qa('[data-drop]').find(z => z.getAttribute('data-drop') === status);
    if (!zone) return null;
    const ev = new w.Event('drop', { bubbles: true });
    ev.dataTransfer = { getData: () => subId, setData: () => {}, dropEffect: '' };
    ev.preventDefault = () => {};
    zone.dispatchEvent(ev);
    return true;
  }
  openJobWithBoard();
  const chips = qa('.chip[data-sub]');
  if (!chips.length) fail('no cards on the board to transition');
  else {
    // for every card, try every target column and classify the outcome
    const results = { forward: 0, skip: 0, back: 0, same: 0 };
    chips.slice(0, 4).forEach(chip => {
      const id = chip.getAttribute('data-sub');
      const cur = chip.closest('.rung').querySelector('.rung-b').getAttribute('data-drop');
      const ci = ORDER.indexOf(cur);
      ORDER.forEach((target, ti) => {
        openJobWithBoard();
        if (!qa('.chip[data-sub="' + id + '"]').length) return;
        q('#modal-root').innerHTML = '';
        dropOn(id, target);
        const t = mtext();
        if (ti === ci) {
          if (mopen()) fail('dropping on its own column opened something for ' + cur);
          results.same++;
        } else if (ti < ci) {
          if (!/do not move backwards/i.test(t)) fail('backward drop ' + cur + ' -> ' + target + ' was not refused');
          results.back++;
        } else if (ti === ci + 1) {
          if (!mopen()) fail('legal forward drop ' + cur + ' -> ' + target + ' opened nothing');
          else if (!new RegExp(target).test(t)) fail('forward drop opened the wrong stage form');
          results.forward++;
        } else {
          if (!/One status at a time/i.test(t)) fail('skipping ' + cur + ' -> ' + target + ' was not refused');
          results.skip++;
        }
        closeM();
      });
    });
    if (!results.forward || !results.skip || !results.back)
      fail('transition matrix incomplete: ' + JSON.stringify(results));
  }

  /* ---------- 2. a terminal submission accepts no transitions ---------- */
  nav('pipeline');
  const anyLive = qa('tbody tr.click')[0];
  if (anyLive) {
    click(anyLive, 'a live submission');
    click(q('#modal-root [data-reject]'), 'close it');
    setF('status', 'Client Declined');
    setF('reason', 'Closing this one deliberately to test that terminal states are terminal.');
    submitM();
    if (mopen()) { fail('could not close a submission: ' + errs().join('|')); closeM(); }
    else {
      // reopen it from the job order's closed list
      nav('jobs');
      let found = null;
      qa('tbody tr.click').forEach(r => { if (!found) { click(r, 'job'); if (q('[data-act="sub"]')) found = true; } });
      const closedRow = qa('[data-act="sub"]').find(x => /Declined/.test((x.closest('tr') || x).textContent));
      if (closedRow) {
        click(closedRow, 'a closed submission');
        if (q('#modal-root [data-adv]')) fail('a declined submission still offers a status change');
        if (q('#modal-root [data-reject]')) fail('a declined submission still offers closing');
        closeM();
      }
    }
  }

  /* ---------- 3. boundary values ---------- */
  // margin bands: 20% passes, 19% needs a manager, 9% is refused
  function marginCase(pay, bill, expect) {
    nav('placements');
    const row = qa('tbody tr.click')[0];
    click(row, 'a placement');
    if (!q('[data-act="edit-placement"]')) return;
    click(q('[data-act="edit-placement"]'), 'edit');
    setF('payRate', String(pay)); setF('billRate', String(bill));
    setF('status', 'Approved'); setF('ack', true);
    submitM();
    const e = errs().join(' | ');
    if (expect === 'block' && !/threshold|floor|below the/i.test(e))
      fail('margin ' + pay + '/' + bill + ' should have been refused, got: ' + (e || 'saved'));
    if (expect === 'ok' && /threshold|floor/i.test(e))
      fail('margin ' + pay + '/' + bill + ' should have been allowed, got: ' + e);
    closeM();
  }
  marginCase(40, 50, 'ok');      // exactly 20%
  marginCase(41, 50, 'review');  // 18%
  marginCase(46, 50, 'block');   // 8%
  // exactly at the floor
  marginCase(45, 50, 'ok');      // exactly 10% -> not below the floor

  // CV minimum length: 79 refused, 80 accepted
  nav('candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  click(q('[data-act="upload-cv"]'), 'attach');
  const ta = q('#cv-text');
  if (ta) {
    ta.value = 'x'.repeat(79); ta.dispatchEvent(new w.Event('input', { bubbles: true }));
    click(q('[data-cvsave]'), 'save 79');
    if (!/at least 80 characters/.test(mtext())) fail('a 79-character CV was accepted');
    ta.value = 'y'.repeat(80); ta.dispatchEvent(new w.Event('input', { bubbles: true }));
    click(q('[data-cvsave]'), 'save 80');
    if (q('#modal-root .modal')) fail('an 80-character CV was refused');
  }

  // overtime: 24 allowed, 25 refused
  nav('placements');
  const appr = qa('tbody tr.click').find(r => /Approved/.test(r.textContent));
  if (appr) {
    click(appr, 'approved placement');
    if (q('[data-act="time-add"]')) {
      [[24, 'ok'], [25, 'block']].forEach(([ot, expect]) => {
        click(q('[data-act="time-add"]'), 'time');
        if (!q('[data-f="overtime"]')) { closeM(); return; }
        setF('weekEnding', new Date(Date.now() - ot * 864e5).toISOString().slice(0, 10));
        setF('regular', '40'); setF('overtime', String(ot)); setF('otApproved', true);
        submitM();
        const e = errs().join(' | ');
        if (expect === 'block' && !/over 24 overtime/i.test(e))
          fail(ot + ' overtime hours should have been refused');
        if (expect === 'ok' && /over 24 overtime/i.test(e))
          fail(ot + ' overtime hours should have been allowed');
        closeM();
      });
    }
  }

  // openings cannot drop below placements made
  nav('jobs');
  const filled = qa('tbody tr.click').find(r => /[1-9]\/\d/.test(r.textContent));
  if (filled) {
    click(filled, 'a job with placements');
    click(q('[data-act="edit-job"]'), 'edit');
    setF('openings', '0');
    submitM();
    if (!errs().length) fail('openings of zero was accepted on a job with placements');
    closeM();
  }

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'STATE TRANSITION + BOUNDARY CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
}, 350);
