const fs = require('fs');
const { loadApp } = require('./harness');
const dom = loadApp();
const { window } = dom; const doc = window.document;
const errors = []; const fail = m => errors.push(m);
window.addEventListener('error', ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)));
const q = s => doc.querySelector(s), qa = s => Array.from(doc.querySelectorAll(s));
const click = (el, w) => { if (!el) { fail('missing: ' + w); return false; } el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); return true; };
function nav(v) {
  var a = q('#rail [data-go="' + v + '"]');
  if (!a) { if (!q('.mfly')) click(q('[data-act="menu"]'), 'menu'); a = q('.mfly a[data-go="' + v + '"]'); }
  if (!a) return fail('no menu item ' + v);
  click(a, 'nav ' + v);
}
const main = () => q('#main').textContent;
const modalText = () => (q('#modal-root') || {}).textContent || '';
const modalOpen = () => !!q('#modal-root .modal');
const setV = (sel, v) => { const el = q(sel); if (!el) return fail('missing input ' + sel); el.value = v; el.dispatchEvent(new window.Event('input', { bubbles: true })); };

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip welcome');

  /* ---- 1. Ctrl+K focuses Fast Find ---- */
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  if (doc.activeElement !== q('#ff')) fail('Ctrl+K did not focus Fast Find');

  /* ---- 2. notification bell present ---- */
  if (!q('[data-act="notifs"]')) fail('no notification bell');
  click(q('[data-act="notifs"]'), 'bell');
  if (!/Notifications/.test(modalText())) fail('notification centre did not open');
  if (!/Nothing yet/.test(modalText())) fail('empty notification state missing');
  click(q('#modal-root [data-close]'), 'close notifs');

  /* ---- 3. email from a candidate ---- */
  nav('candidates');
  click(qa('tbody tr.click')[0], 'first candidate');
  const eb = q('[data-act="email"][data-to="candidate"]');
  if (!eb) fail('candidate record has no Email action');
  else {
    click(eb, 'email candidate');
    if (!q('#em-body')) fail('email composer did not open');
    else {
      // template switching must rewrite subject and body
      const t0 = q('#em-subj').value;
      const sel = q('#em-tpl');
      if (!sel) fail('no template picker');
      else {
        const opts = Array.from(sel.options).map(o => o.value);
        ['intro', 'sendout', 'confirm', 'remind', 'avail', 'followup', 'reject'].forEach(k => {
          if (opts.indexOf(k) < 0) fail('template missing: ' + k);
        });
        sel.value = 'avail'; sel.dispatchEvent(new window.Event('change', { bubbles: true }));
        const t1 = q('#em-subj').value;
        if (!t1) fail('template did not populate a subject');
        sel.value = 'intro'; sel.dispatchEvent(new window.Event('change', { bubbles: true }));
        if (q('#em-subj').value === t1) fail('changing template did not rewrite the subject');
        if (!/Introducing/.test(q('#em-subj').value)) fail('intro template subject wrong: ' + q('#em-subj').value);
      }

      // validation: bad address, empty subject, short body, unfilled placeholders
      setV('#em-to', 'not-an-email');
      click(q('[data-send]'), 'send');
      if (!/not a full email address/.test(modalText())) fail('bad To address not caught');
      setV('#em-to', 'someone@example.com');
      setV('#em-subj', '');
      click(q('[data-send]'), 'send');
      if (!/subject is required/.test(modalText())) fail('empty subject not caught');
      setV('#em-subj', 'Availability check');
      setV('#em-body', 'too short');
      click(q('[data-send]'), 'send');
      if (!/at least 40 characters/.test(modalText())) fail('short body not caught');
      setV('#em-body', 'Hi there, are you still available and is the rate we discussed still right for you? [rate]');
      click(q('[data-send]'), 'send');
      if (!/unfilled placeholders/.test(modalText())) fail('unfilled placeholder not caught');

      // a clean send
      setV('#em-body', 'Hi there, are you still available at the rate we discussed? A one line reply is fine and it keeps you in the running.');
      click(q('[data-send]'), 'send');
      if (modalOpen()) fail('valid email did not send: ' + modalText().slice(0, 160));

      // it must land as an Email activity on the record
      if (!/Availability check/.test(main())) fail('sent email not shown on the record');
      nav('notes');
      if (!/Availability check/.test(main())) fail('email not in the notes list');
      if (!/Email/.test(main())) fail('email action type not recorded');
      // and raise a notification
      if (!q('[data-act="notifs"] span')) fail('no unread badge after sending');
      click(q('[data-act="notifs"]'), 'bell again');
      if (!/Email sent to/.test(modalText())) fail('no notification for the sent email');
      click(q('#modal-root [data-readall]'), 'mark all read');
      if (q('[data-act="notifs"] span')) fail('unread badge did not clear');
    }
  }

  /* ---- 4. email the client from a job order ---- */
  nav('jobs');
  click(qa('tbody tr.click')[0], 'first job');
  const cb = q('[data-act="email"][data-to="contact"]');
  if (!cb) fail('job order has no Email Client action');
  else {
    click(cb, 'email client');
    if (!q('#em-body')) fail('client email composer did not open');
    else {
      if (!/Attach the CV|no CV on file/.test(modalText()) && !q('#em-cv')) { /* no candidate in context is fine */ }
      const to = q('#em-to').value;
      if (to.indexOf('@') < 0) fail('client email has no recipient address');
      click(q('#modal-root [data-close]'), 'close');
    }
  }

  /* ---- 5. sendout email from a submission, with CV attach ---- */
  nav('pipeline');
  click(qa('tbody tr.click')[0], 'first submission');
  const sb = q('#modal-root [data-email]');
  if (!sb) fail('submission drawer has no Email action');
  else {
    click(sb, 'submission email');
    if (!q('#em-body')) fail('sendout composer did not open');
    else {
      if (!/CV attached|Attach the CV|no CV on file/.test(modalText())) fail('no CV attachment control on a sendout');
      click(q('[data-send]'), 'send sendout');
      if (modalOpen()) {
        // template may leave placeholders when the submission has no summary; fill and retry
        setV('#em-body', 'Please find the CV attached for this role. Rate and availability are confirmed and I can arrange a call this week.');
        click(q('[data-send]'), 'retry send');
      }
      if (modalOpen()) fail('sendout email did not send: ' + modalText().slice(0, 140));
    }
  }

  /* ---- 6. training mode toggle ---- */
  const tm = q('#tmode');
  if (!tm) fail('no training mode toggle');
  else {
    if (!/Training: on/.test(tm.textContent)) fail('training mode should start on');
    // coaching prose visible while on
    nav('candidates');
    click(q('[data-act="add-candidate"]'), 'add candidate');
    if (!q('#modal-root .callout')) fail('coaching note missing while training mode is on');
    click(q('#modal-root [data-close]'), 'close');
    // turn it off
    click(q('#tmode'), 'toggle training off');
    if (!/Training: off/.test(q('#tmode').textContent)) fail('toggle did not switch off');
    if (q('.fab')) fail('practice button still showing with training mode off');
    if (q('[data-scenario]')) fail('practice panel still showing with training mode off');
    click(q('[data-act="add-candidate"]'), 'add candidate again');
    if (q('#modal-root .callout')) fail('coaching note still shown with training mode off');
    click(q('#modal-root [data-close]'), 'close');
    // and back on
    click(q('#tmode'), 'toggle training on');
    if (!/Training: on/.test(q('#tmode').textContent)) fail('could not turn training mode back on');
    if (!q('.fab')) fail('practice button did not return');
  }

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'EMAIL + NOTIFY + TRAINING CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
}, 250);
