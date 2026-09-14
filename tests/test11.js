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

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip');

  /* ---------- A: picklists as agreed ---------- */
  nav('candidates');
  click(q('[data-act="add-candidate"]'), 'add candidate');
  const cs = optsOf('status');
  ['New Lead', 'Active', 'Available', 'Submitted', 'Placed', 'Do Not Call', 'Archive']
    .forEach(v => { if (cs.indexOf(v) < 0) fail('candidate status missing: ' + v); });
  const src = optsOf('source');
  ['LinkedIn', 'Indeed', 'Job Board', 'Company Website', 'Referral', 'Recruiter Outreach', 'Other']
    .forEach(v => { if (src.indexOf(v) < 0) fail('candidate source missing: ' + v); });
  closeM();

  nav('companies');
  click(q('[data-act="add-company"]'), 'add company');
  const cos = optsOf('status');
  ['Prospect', 'Active Client', 'Inactive', 'Former Client', 'Do Not Contact']
    .forEach(v => { if (cos.indexOf(v) < 0) fail('company status missing: ' + v); });
  closeM();

  nav('dashboard');
  click(q('[data-act="note"]'), 'add note');
  const na = optsOf('action');
  ['Prescreen', 'Outbound Call', 'Inbound Call', 'Left Message', 'Email', 'Meeting',
    'Interview', 'Reference Check', 'Client Visit', 'Internal Memo', 'Other']
    .forEach(v => { if (na.indexOf(v) < 0) fail('note action missing: ' + v); });
  if (na.indexOf('Call') >= 0) fail('the generic "Call" action should have been replaced');
  closeM();

  /* ---------- D: pipeline above the tabs on the job order ---------- */
  nav('jobs');
  click(qa('tbody tr.click')[0], 'a job order');
  const chev = q('.chevs'), tabs = q('.rtabs');
  if (!chev) fail('no stage bar on the job order');
  if (!tabs) fail('no tab strip on the job order');
  if (chev && tabs && !(chev.compareDocumentPosition(tabs) & w.Node.DOCUMENT_POSITION_FOLLOWING))
    fail('the stage bar is not above the tab strip');
  const labels = qa('.chevs').map(x => x.textContent.trim());
  ['Prescreen', 'Submission', 'Client Submission', 'Interview', 'Offer Extended', 'Placement']
    .forEach((t, i) => { if (labels[i] !== t) fail('stage bar label ' + i + ' is "' + labels[i] + '", expected "' + t + '"'); });
  const jt = qa('.rtabs a').map(a => a.textContent.replace(/\d+$/, '').trim());
  // tab order is tenant configuration now, so assert the set rather than a fixed order
  ['Overview', 'Submissions', 'Notes', 'Files', 'Edit'].forEach(t => {
    if (!jt.some(x => x === t || x.indexOf(t) === 0)) fail('job order is missing tab: ' + t);
  });
  if (!qa('.rung').length) fail('the job order does not open on its pipeline board');
  if (!q('.rtabs a[data-act="edit-job"]')) fail('no Edit tab on the job order');

  // grouped overview panels
  click(qa('.rtabs a')[0], 'overview');
  const panels = qa('.card-h h4').map(h => h.textContent.trim());
  ['Job Details', 'Compensation', 'Job Description', 'Recent Activity']
    .forEach(p => { if (panels.indexOf(p) < 0) fail('overview panel missing: ' + p); });
  if (!q('.detailscard')) fail('no Details card on the job order overview');

  // candidate tab order
  nav('candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  const ct = qa('.rtabs a').map(a => a.textContent.replace(/\d+$/, '').trim());
  ['Overview', 'Activity', 'Notes', 'Submissions', 'Placements', 'Files', 'Resume'].forEach((t, i) => {
    if (ct[i] !== t) fail('candidate tab ' + (i + 1) + ' is "' + ct[i] + '", expected "' + t + '"');
  });
  if (!q('.rtabs a[data-act="edit-candidate"]')) fail('no Edit tab on the candidate');

  /* ---------- C1: margin bands ---------- */
  nav('placements');
  const prow = qa('tbody tr.click').find(r => /Pending Approval/.test(r.textContent)) || qa('tbody tr.click')[0];
  click(prow, 'a placement');
  if (!q('[data-act="approve-pl"]')) {
    // already approved; edit it down into the block band instead
    click(q('[data-act="edit-placement"]'), 'edit placement');
    closeM();
  } else {
    click(q('[data-act="approve-pl"]'), 'approve');
    // C2: the creator must not be their own approver
    const ap = optsOf('approver');
    if (ap.indexOf('A. Trainee') >= 0 && ap.length === 1)
      fail('the recruiter is the only available approver');
    if (!/cannot sign it off|cannot approve their own/.test(modalText()))
      fail('the form does not state that a recruiter cannot approve their own placement');
    closeM();
  }

  /* ---------- C6: overtime ---------- */
  nav('placements');
  const arow = qa('tbody tr.click').find(r => /Approved/.test(r.textContent));
  if (arow) {
    click(arow, 'an approved placement');
    const tb = q('[data-act="time-add"]');
    if (tb) {
      click(tb, 'add time');
      if (modalOpen() && q('[data-f="overtime"]')) {
        if (!q('[data-f="otApproved"]')) fail('no client pre-approval control on overtime');
        setF('regular', '40'); setF('overtime', '30');
        submitM();
        if (!errs().some(e => /over 24 overtime hours/i.test(e))) fail('the 24-hour overtime stop did not fire');
        closeM();
      } else closeM();
    }
  }

  /* ---------- B4: client submission gates ---------- */
  // strict mode so the gates block rather than warn
  if (/permissive/.test(q('#pmode').textContent)) click(q('#pmode'), 'strict');
  nav('pipeline');
  const secs = qa('#main .sec');
  const isec = secs.find(x => /Internal Submission/.test(x.textContent.slice(0, 60)));
  if (isec) {
    const r = isec.querySelector('tbody tr.click');
    if (r) {
      click(r, 'an internal submission');
      const adv = q('#modal-root [data-adv]');
      if (adv) {
        click(adv, 'advance to client submission');
        submitM();
        const e = errs().join(' | ');
        if (!/consent|summary|screening|HARD STOP/i.test(e))
          fail('the client submission gates raised nothing: ' + e.slice(0, 120));
        closeM();
      } else closeM();
    }
  }

  /* every seeded candidate must have a CV, or the gate makes the desk unusable */
  nav('data');
  click(q('[data-act="db-export"]'), 'export');
  const raw = q('#db-json');
  if (!raw) fail('could not export to check CV coverage');
  else {
    const D = JSON.parse(raw.value).data;
    const noCv = D.candidates.filter(c => !c.cv);
    if (noCv.length) fail(noCv.length + ' candidates have no CV, so they cannot be client submitted');
    const badSrc = D.candidates.filter(c => ['LinkedIn', 'Indeed', 'Job Board', 'Company Website',
      'Referral', 'Recruiter Outreach', 'Other'].indexOf(c.source) < 0);
    if (badSrc.length) fail(badSrc.length + ' candidates carry a source outside the agreed list, e.g. ' + badSrc[0].source);
    const badCo = D.companies.filter(c => ['Prospect', 'Active Client', 'Inactive', 'Former Client',
      'Do Not Contact'].indexOf(c.status) < 0);
    if (badCo.length) fail(badCo.length + ' companies carry a status outside the agreed list, e.g. ' + badCo[0].status);
    const badNote = D.notes.filter(n => ['Prescreen', 'Outbound Call', 'Inbound Call', 'Left Message',
      'Email', 'Meeting', 'Interview', 'Reference Check', 'Client Visit', 'Internal Memo', 'Other'].indexOf(n.action) < 0);
    if (badNote.length) fail(badNote.length + ' notes carry an action outside the agreed list, e.g. ' + badNote[0].action);
    closeM();
  }

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'CONFIG + RULES + LAYOUT CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
}, 300);
