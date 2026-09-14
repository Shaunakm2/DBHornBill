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
const errs = () => qa('#modal-root .err, #modal-root .warn-note').map(e => e.textContent);
function setF(k, v) {
  const el = q('[data-f="' + k + '"]');
  if (!el) return fail('missing field ' + k);
  if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
  else { el.value = v; el.dispatchEvent(new w.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }
}
function optsOf(k) { const el = q('[data-f="' + k + '"]'); return el ? Array.from(el.options).map(o => o.value) : []; }
const submitM = () => click(q('#modal-root [data-go]'), 'submit');
const closeM = () => { const b = q('#modal-root [data-close]'); if (b) click(b, 'close'); q('#modal-root').innerHTML = ''; };
const tab = k => click(qa('.rtabs a').find(a => a.getAttribute('data-rtab') === k), 'tab ' + k);

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip');

  /* ---------- documented five-tab baseline ---------- */
  nav('candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  const ct = qa('.rtabs a').map(a => a.textContent.replace(/\d+$/, '').trim());
  ['Overview', 'Activity', 'Notes', 'Files', 'Edit'].forEach(t => {
    if (!ct.some(x => x === t)) fail('candidate is missing the baseline tab: ' + t);
  });
  nav('jobs');
  click(qa('tbody tr.click')[0], 'a job order');
  const jt = qa('.rtabs a').map(a => a.textContent.replace(/\d+$/, '').trim());
  ['Overview', 'Activity', 'Notes', 'Files', 'Edit'].forEach(t => {
    if (!jt.some(x => x === t)) fail('job order is missing the baseline tab: ' + t);
  });

  /* ---------- Activity is wider than Notes ---------- */
  nav('candidates');
  const arow = qa('tbody tr.click').find(r => /Submitted|Placed/.test(r.textContent)) || qa('tbody tr.click')[0];
  click(arow, 'a candidate with history');
  tab('activity');
  const at = main();
  if (!/Activity/.test(at)) fail('no activity tab body');
  if (!/Status|Sendout|Note|Placement|Appointment/.test(at))
    fail('the activity timeline shows no event kinds: ' + at.slice(0, 120));

  /* ---------- Files: attaching is not updating ---------- */
  tab('files');
  if (!/Files/.test(main())) fail('no files panel');
  if (!q('[data-act="parse-existing"]')) fail('no Parse as Existing action on the resume file');
  if (!q('[data-act="file-actions"]')) fail('no per-file Actions menu');
  if (!/Overwrite prevention/.test(main())) fail('the overwrite prevention setting is not exposed');

  // the Actions menu offers the documented options
  click(q('[data-act="file-actions"]'), 'file actions');
  const fa = qa('#modal-root [data-fa]').map(a => a.getAttribute('data-fa'));
  ['parse', 'parsed', 'replace', 'remove'].forEach(k => {
    if (fa.indexOf(k) < 0) fail('file Actions menu missing: ' + k);
  });
  closeM();

  /* ---------- Parse as Existing previews and lets fields be deselected ---------- */
  nav('candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  tab('files');
  click(q('[data-act="parse-existing"]'), 'parse as existing');
  if (!modalOpen()) fail('Parse as Existing did not open');
  else {
    const t = modalText();
    if (!/Current value/.test(t)) fail('the parse preview does not show the current value');
    if (!/From the CV/.test(t)) fail('the parse preview does not show the proposed value');
    const rows = qa('#modal-root [data-prow]');
    if (!rows.length) fail('the parse preview has no selectable rows');
    // clearing everything must leave the record untouched
    click(q('#modal-root [data-none]'), 'clear all');
    if (qa('#modal-root [data-prow].on').length) fail('Clear all did not deselect the rows');
    click(q('#modal-root [data-save]'), 'save with nothing ticked');
    if (modalOpen()) fail('saving with nothing ticked did not close');
    nav('audit');
    if (/Parsed resume as existing/.test(main()))
      fail('an empty parse was logged as though it changed the record');
  }

  // now actually apply a parse and confirm it is logged field by field
  nav('candidates');
  click(qa('tbody tr.click')[1] || qa('tbody tr.click')[0], 'another candidate');
  tab('files');
  click(q('[data-act="parse-existing"]'), 'parse again');
  if (modalOpen()) {
    const rows = qa('#modal-root [data-prow]');
    if (rows.length) {
      // ensure at least one row is ticked
      if (!qa('#modal-root [data-prow].on').length) click(rows[0], 'tick a row');
      click(q('#modal-root [data-save]'), 'apply the parse');
      if (modalOpen()) { closeM(); }
      nav('audit');
      if (!/Parsed resume as existing/.test(main())) fail('the applied parse was not logged');
    } else closeM();
  }

  /* ---------- upload attaches a file, it does not silently rewrite the record ---------- */
  nav('candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  const before = main();
  click(q('[data-act="upload-cv"]'), 'attach a resume');
  const ta = q('#cv-text');
  if (!ta) fail('the attach dialog did not open');
  else {
    ta.value = 'REPLACEMENT CV\nSenior Widget Fitter  |  Nowhereton  |  +1 555 9999  |  new.address@mail.example\n\n'
      + 'PROFESSIONAL SUMMARY\n17 years of experience as a senior widget fitter in light industrial.\n\n'
      + 'KEY SKILLS\nWidget Fitting, Sprocket Alignment, Torque Testing\n\n'
      + 'CERTIFICATIONS\nOSHA 30, Forklift Certification';
    ta.dispatchEvent(new w.Event('input', { bubbles: true }));
    click(q('[data-cvsave]'), 'save the file');
    if (q('#modal-root .modal')) fail('attaching the file did not complete');
    if (!/Files|Resume/.test(main())) fail('attaching did not land on Files');
    // the record must NOT have changed yet
    if (/Senior Widget Fitter/.test(q('.recsub') ? q('.recsub').textContent : ''))
      fail('attaching a file rewrote the record without a parse');
    // now parse it and the record should change
    click(q('[data-act="parse-existing"]'), 'parse the new file');
    if (!modalOpen()) fail('cannot parse the newly attached file');
    else {
      if (!/Widget Fitting|Sprocket/.test(modalText()))
        fail('the parser did not read the skills out of the attached file');
      click(q('#modal-root [data-save]'), 'apply');
      if (modalOpen()) closeM();
      if (!/Senior Widget Fitter/.test(main() + (q('.recsub') || {}).textContent))
        fail('the parse did not write the occupation onto the record');
    }
  }

  /* ---------- Direct Hire uses salary and a flat fee ---------- */
  nav('companies');
  click(qa('tbody tr.click')[0], 'a company');
  click(q('[data-act="add-job"]'), 'add job order');
  setF('title', 'Permanent Systems Analyst');
  setF('type', 'Direct Hire');
  const et = optsOf('employmentType');
  if (et.length !== 1 || et[0] !== 'Permanent')
    fail('a direct hire should only offer Permanent, offers: ' + et.join(','));
  setF('category', 'Information Technology');
  setF('location', 'Corvus North');
  setF('description', 'Permanent systems analyst for the internal platform team, hybrid working.');
  submitM();
  if (!errs().some(e => /needs a salary/.test(e))) fail('a direct hire saved without a salary');
  setF('salary', '78000');
  submitM();
  if (!errs().some(e => /flat fee/.test(e))) fail('a direct hire saved without a fee');
  setF('flatFee', '15600');
  submitM();
  if (modalOpen()) fail('the direct hire did not save: ' + errs().join(' | '));

  // the compensation panel must show the permanent fields, not hourly rates
  tab('overview');
  const ov = main();
  if (!/Flat Fee/.test(ov)) fail('the compensation panel does not show a flat fee for a direct hire');
  if (/Mark-up %/.test(ov)) fail('the compensation panel shows contract markup on a direct hire');
  if (!/Not applicable on a direct hire/.test(ov)) fail('the panel does not say timesheets do not apply');

  // and a contract job must still show the rate fields
  nav('jobs');
  const crow = qa('tbody tr.click').find(r => /Contract/.test(r.textContent) && !/Direct Hire/.test(r.textContent));
  if (crow) {
    click(crow, 'a contract job order');
    tab('overview');
    const cov = main();
    if (!/Mark-up %/.test(cov)) fail('a contract job order does not show mark-up');
    if (/Flat Fee/.test(cov)) fail('a contract job order shows a flat fee');
  }

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'FILES + PARSE + DIRECT HIRE CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
}, 300);
