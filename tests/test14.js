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
const setF = (k, v) => { const el = q('[data-f="' + k + '"]'); if (!el) return fail('field ' + k);
  if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
  else { el.value = v; el.dispatchEvent(new w.Event(
    (el.tagName === 'SELECT' || el.type === 'date' || el.type === 'time') ? 'change' : 'input',
    { bubbles: true })); } };
const submitM = () => click(q('#modal-root [data-go]'), 'submit');
const closeM = () => { const b = q('#modal-root [data-close]'); if (b) click(b, 'close'); q('#modal-root').innerHTML = ''; };
const tab = k => click(qa('.rtabs a').find(a => a.getAttribute('data-rtab') === k), 'tab ' + k);

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip');

  /* ---------- Details card on the right ---------- */
  nav('candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  tab('overview');
  const dc = q('.detailscard');
  if (!dc) fail('no Details card on the candidate overview');
  else {
    if (!/DETAILS|Details/i.test(dc.textContent)) fail('the Details card has no heading');
    ['Status', 'Owner', 'Category', 'Date Added'].forEach(f => {
      if (dc.textContent.indexOf(f) < 0) fail('Details card missing: ' + f);
    });
    if (!q('.reccols')) fail('the main content column is missing beside the Details card');
    // the main column must carry the cards, not the details
    const cards = qa('.reccols .card-h h4').map(h => h.textContent.trim());
    ['Contact Information', 'Recent Notes', 'Resume', 'Open Tasks'].forEach(c => {
      if (cards.indexOf(c) < 0) fail('overview card missing: ' + c);
    });
  }

  /* ---------- submission funnel with counts ---------- */
  nav('jobs');
  const jrow = qa('tbody tr.click').find(r => /Warehouse Team Lead|Registered Nurse/.test(r.textContent)) || qa('tbody tr.click')[0];
  click(jrow, 'a job order with a pipeline');
  const fn = qa('.funnel .fn');
  if (!fn.length) fail('no submission funnel on the job order');
  else {
    const labels = fn.map(x => x.querySelector('.t').textContent.trim());
    ['All', 'Submissions', 'Interviewing', 'Confirmed', 'Rejected'].forEach(t => {
      if (labels.indexOf(t) < 0) fail('funnel bucket missing: ' + t);
    });
    fn.forEach(x => { if (!/^\d+$/.test(x.querySelector('.n').textContent.trim()))
      fail('funnel bucket has no count: ' + x.querySelector('.t').textContent); });
    const allN = +q('.funnel .fn .n').textContent;
    if (!(allN > 0)) fail('the All bucket counts nothing');
    // selecting a bucket filters the board
    const before = qa('.chip').length;
    const intBtn = qa('.funnel .fn').find(x => /Interviewing/.test(x.textContent));
    click(intBtn, 'interviewing bucket');
    if (!q('.funnel .fn.on')) fail('the selected bucket is not highlighted');
    const after = qa('.chip').length;
    if (after >= before && before > 0) fail('selecting a bucket did not filter the board');
    click(qa('.funnel .fn')[0], 'back to All');
    if (qa('.chip').length !== before) fail('returning to All did not restore the board');
  }

  /* ---------- Actions menu completed ---------- */
  nav('candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  click(q('[data-act="actions"][data-type="candidate"]'), 'candidate actions');
  const acts = qa('#modal-root [data-runact]').map(a => a.getAttribute('data-runact'));
  ['task-for', 'appt-for', 'send-resume', 'email-cand', 'pipeline-add', 'upload-cv']
    .forEach(k => { if (acts.indexOf(k) < 0) fail('candidate Actions missing: ' + k); });
  // schedule an appointment through it
  click(q('#modal-root [data-runact="appt-for"]'), 'schedule appointment');
  if (!modalOpen()) fail('the appointment form did not open');
  else {
    setF('date', '2020-01-01');
    submitM();
    if (!errs().some(e => /date has passed/.test(e))) fail('a past appointment date was accepted');
    setF('date', new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10));
    setF('subject', 'Screening call');
    submitM();
    if (modalOpen()) fail('the appointment did not save: ' + errs().join(' | '));
    nav('appts');
    if (!/Screening call/.test(main())) fail('the appointment is not on the appointments list');
  }

  // a task assigned to a teammate
  nav('candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  click(q('[data-act="actions"][data-type="candidate"]'), 'actions');
  click(q('#modal-root [data-runact="task-for"]'), 'add task');
  if (!q('[data-f="owner"]')) fail('a task cannot be assigned to anyone');
  else {
    setF('subject', 'Chase references');
    setF('owner', 'M. Silva');
    submitM();
    if (modalOpen()) fail('the task did not save: ' + errs().join('|'));
    nav('tasks');
    if (!/Chase references/.test(main())) fail('the task is not on the task list');
  }

  // send the resume to a contact
  nav('candidates');
  const withCv = qa('tbody tr.click').find(r => /yes/.test(r.textContent));
  click(withCv || qa('tbody tr.click')[0], 'a candidate with a resume');
  click(q('[data-act="actions"][data-type="candidate"]'), 'actions');
  click(q('#modal-root [data-runact="send-resume"]'), 'send resume');
  if (!q('#em-body')) fail('sending the resume did not open the composer');
  else {
    if (!/Attach the CV|CV attached/.test(modalText())) fail('the resume is not attached to the email');
    closeM();
  }

  /* ---------- job Actions gained tasks and appointments ---------- */
  nav('jobs');
  click(qa('tbody tr.click')[0], 'a job order');
  click(q('[data-act="actions"][data-type="job"]'), 'job actions');
  const jacts = qa('#modal-root [data-runact]').map(a => a.getAttribute('data-runact'));
  ['task-for-job', 'appt-for-job', 'email-client', 'pipeline-add']
    .forEach(k => { if (jacts.indexOf(k) < 0) fail('job Actions missing: ' + k); });
  closeM();

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'DETAILS CARD + FUNNEL + ACTIONS CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
}, 300);
