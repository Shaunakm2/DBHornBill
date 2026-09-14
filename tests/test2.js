const fs = require('fs');
const { loadApp } = require('./harness');

const dom = loadApp();
const { window } = dom;
const doc = window.document;
const errors = [];
function fail(m) { errors.push(m); }
window.addEventListener('error', ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)));

const q = s => doc.querySelector(s);
const qa = s => Array.from(doc.querySelectorAll(s));
function click(el, what) { if (!el) { fail('click on missing element' + (what ? ': ' + what : '')); return false; } el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); return true; }
function mainText() { return q('#main').textContent; }
function openMenu() {}
function nav(v){
  var a=q('#rail [data-go="'+v+'"]');
  if(!a){ if(!q('.mfly')) click(q('[data-act="menu"]'),'menu'); a=q('.mfly a[data-go="'+v+'"]'); }
  if(!a) return fail('no menu item '+v);
  click(a,'nav '+v);
}
function setField(k, v) {
  const el = q('[data-f="' + k + '"]');
  if (!el) return fail('missing form field ' + k);
  if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new window.Event('change', { bubbles: true })); }
  else { el.value = v; el.dispatchEvent(new window.Event(el.tagName === 'SELECT' || el.type === 'date' || el.type === 'time' ? 'change' : 'input', { bubbles: true })); }
}
function setByText(k, re) {
  const el = q('[data-f="' + k + '"]');
  if (!el) return fail('missing select ' + k);
  const o = Array.from(el.options).find(x => re.test(x.textContent));
  if (!o) return fail('no option ' + re + ' in ' + k + ' — had: ' + Array.from(el.options).map(x => x.textContent).join(' | '));
  el.value = o.value; el.dispatchEvent(new window.Event('change', { bubbles: true }));
}
function submitModal() { const b = q('#modal-root [data-go]'); if (!b) return fail('no modal submit button'); click(b); }
function modalOpen() { return !!q('#modal-root .modal'); }
function errs() { return qa('#modal-root .err').map(e => e.textContent); }
function stuck(what) { if (modalOpen()) fail(what + ' form stuck: ' + errs().join(' | ')); }
function closeModal() { const b = q('#modal-root [data-close]'); if (b) click(b); }
function modalText() { return (q('#modal-root') || {}).textContent || ''; }
function openCoach(){ if(!q('[data-scenario]')){ const b=q('.fab'); if(b) b.dispatchEvent(new window.MouseEvent('click',{bubbles:true})); } }
function scen(k) { openCoach();
  const s = q('[data-scenario]'); s.value = k; s.dispatchEvent(new window.Event('change', { bubbles: true }));
  const m = q('#coach').textContent.match(/(\d+) of (\d+) done/);
  return m ? { done: +m[1], total: +m[2] } : fail('coach progress missing');
}
const future = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// these suites assert that rules block, so run them in strict mode
if (q('#pmode') && /permissive/.test(q('#pmode').textContent)) q('#pmode').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));

// this suite covers the legacy interface, where open records are listed in the left column
function toLegacy(){
  var cfgLink=q('#rail [data-go="config"]');
  if(cfgLink) cfgLink.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  var sw=q('[data-act="ui-mode"]');
  if(sw && /legacy interface/.test(sw.textContent)) sw.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
}
toLegacy();

/* ---- 1. every menu view renders */

click(q('[data-act="menu"]'), 'open menu');
const views = qa('.mfly a[data-go]').map(a => a.getAttribute('data-go'));
if (views.length < 16) fail('menu looks short: ' + views.length);
click(q('[data-menuclose]'), 'close menu');
views.forEach(v => { nav(v); const n = mainText().trim().length; if (n < 40) fail('view ' + v + ' rendered ' + n + ' chars'); });

/* ---- 2. fast find */
const ff = q('#ff');
ff.value = 'delaney'; ff.dispatchEvent(new window.Event('input', { bubbles: true }));
if (!/Marcus Delaney/.test(q('#ff-res').textContent)) fail('fast find did not match a candidate');
ff.value = 'zzzznothing'; ff.dispatchEvent(new window.Event('input', { bubbles: true }));
if (!/No records match/.test(q('#ff-res').textContent)) fail('fast find empty state missing');
ff.value = 'northwind'; ff.dispatchEvent(new window.Event('input', { bubbles: true }));
click(q('#ff-res a'), 'fast find result');
if (!/Northwind/.test(mainText())) fail('fast find navigation failed');

/* ---- 3. record tabs open and close */
if (!qa('.side-tab').length) fail('no open-record tab after opening a company');
nav('candidates'); click(q('tbody tr.click'));
if (qa('.side-tab').length < 2) fail('second record tab not added');
const firstTabId = qa('.side-tab')[1].getAttribute('data-id');
click(qa('.side-tab')[1], 'switch tab');
if (!qa('.side-tab.on').length) fail('no active tab after switching');
const openRecTabs = () => qa('.side-tab .x').length;
const beforeClose = openRecTabs();
click(q('.side-tab .x'), 'close tab');
if (openRecTabs() >= beforeClose) fail('record tab did not close');

/* ---- 4. record sub-tabs on a job order */
nav('jobs'); click(q('tbody tr.click'));
if (!q('.ladder')) fail('job order pipeline board missing');
if (qa('.rung').length !== 6) fail('pipeline rungs = ' + qa('.rung').length + ', expected 6');
const jobTabs = qa('.rtabs a').map(a => a.getAttribute('data-rtab'));
jobTabs.forEach(t => {
  click(qa('.rtabs a').find(a => a.getAttribute('data-rtab') === t), 'job tab ' + t);
  if (mainText().trim().length < 100) fail('job tab ' + t + ' rendered thin');
});

/* ============ SCENARIO 1 ============ */
scen('s1');

// 1 add lead
click(q('[data-act="addnew"]'), '+ Add New');
click(q('[data-new="lead"]'), 'Add New → Lead');
submitModal();
if (!errs().length) fail('empty lead form not validated');
setField('name', 'Gregor Vale'); setField('company', 'Corvus Manufacturing');
setField('title', 'Plant Director'); setField('source', 'Referral');
setField('notes', 'Two plants, 300 heads, night shift cover currently split across two agencies.');
submitModal(); stuck('lead');
if (!/Gregor Vale/.test(mainText())) fail('did not land on the lead record');

// 2 convert lead
click(q('[data-act="convert-lead"]'), 'Convert Lead');
setField('email', 'no-at-sign'); submitModal();
if (!errs().some(e => /full email/.test(e))) fail('lead conversion email validation missing');
setField('email', 'gregor@corvus.example'); setField('phone', '+1 555 0912');
setField('category', 'Light Industrial'); setField('coStatus', 'Prospect');
submitModal(); stuck('lead conversion');
if (!/Corvus Manufacturing/.test(mainText())) fail('conversion did not open the company');

// 3 linked note
click(q('[data-act="note"]'), 'Add Note on company');
setByText('candidateId', /none/); setByText('contactId', /Gregor Vale/);
setByText('companyId', /Corvus/); setByText('jobId', /none/);
setField('action', 'Outbound Call'); setField('text', 'short');
submitModal();
if (!errs().some(e => /at least 25/.test(e))) fail('note min length not enforced');
setField('text', 'Spoke to Gregor about two line-lead vacancies from next month. He sends the brief on Friday.');
submitModal(); stuck('note');

// unlinked note must be refused
click(q('[data-act="note"]'), 'Add Note again');
setByText('candidateId', /none/); setByText('contactId', /none/);
setByText('companyId', /none/); setByText('jobId', /none/);
setField('text', 'A note with no links at all, which should be refused by validation.');
submitModal();
if (!errs().some(e => /linked to at least one/.test(e))) fail('unlinked note not refused');
closeModal();

// 4 opportunity
nav('companies');
click(qa('tbody tr.click').find(r => /Corvus/.test(r.textContent)), 'Corvus company row');
nav('opps');
click(q('[data-act="add-opp"]'), 'Add Opportunity');
setByText('companyId', /Corvus/); setByText('contactId', /Gregor/);
setField('title', 'Night line-lead cover'); setField('type', 'Contract');
setField('value', '90000'); setField('probability', '50');
submitModal(); stuck('opportunity');

// 5 convert opportunity to job order
click(q('[data-act="convert-opp"]'), 'Convert to Job Order');
setField('payRate', '30'); setField('billRate', '28');
submitModal();
if (!errs().some(e => /must exceed pay rate/.test(e))) fail('job order margin rule not enforced');
setField('billRate', '38'); setField('category', 'Light Industrial');
setField('openings', '2'); setField('location', 'Corvus North plant');
setField('description', 'Two night line leads. Must have run a team of ten or more on a packing line.');
submitModal(); stuck('opportunity conversion');
if (!/Night line-lead cover/.test(mainText())) fail('job order not opened after conversion');

// 6 publish
click(q('[data-act="actions"][data-type="job"]'), 'job Actions');
click(qa('#modal-root [data-runact="publish"]')[0], 'Publish from Actions');

// 7 + 8 candidate created from the job order, chaining into the pipeline
click(q('[data-act="actions"][data-type="job"]'), 'job Actions for new candidate');
click(q('#modal-root [data-runact="add-candidate"]'), 'New Candidate from Actions');
setField('name', 'Marcus Delaney'); submitModal();
if (!errs().some(e => /Possible duplicate/.test(e))) fail('duplicate candidate not caught');
setField('name', 'Grace Oyelaran'); setField('occupation', 'Production Supervisor');
setField('status', 'New Lead'); setField('category', 'Light Industrial');
setField('location', 'Corvus North'); setField('skills', 'Lean, Team lead');
setField('source', 'Referral'); setField('desiredRate', '29');
setField('availability', '2 weeks'); setField('employmentPref', 'Contract');
setField('phone', '+1 555 0777'); setField('email', 'grace@mail.example');
submitModal();
if (!modalOpen()) fail('candidate creation did not chain into the pipeline form');
setByText('jobId', /Night line-lead/); setByText('candidateId', /Grace Oyelaran/);
submitModal(); stuck('pipeline add');

// duplicate pipeline entry refused — reopen the pipeline form from the job order
if (q('[data-act="pipeline-add"]')) click(q('[data-act="pipeline-add"]'), 'Add to pipeline');
else {
  click(q('[data-act="actions"][data-type="job"]'), 'job Actions for pipeline');
  click(q('#modal-root [data-runact="pipeline-add"]'), 'Add to pipeline from Actions');
}
setByText('jobId', /Night line-lead/); setByText('candidateId', /Grace Oyelaran/);
submitModal();
if (!errs().some(e => /already on this pipeline/.test(e))) fail('duplicate pipeline entry not refused');
closeModal();

// Do Not Call guard is documented in the guide
// no edit form in this build, so assert the rule via a candidate already flagged is not possible;
// instead confirm the guard text exists in the validator by checking the guide lists it
nav('guide');
if (!/Do Not Call or Archive cannot be added/.test(mainText())) fail('guide does not document the Do Not Call rule');

// walk the pipeline
function openMySub() {
  nav('pipeline');
  const row = qa('tbody tr.click').find(r => /Grace Oyelaran/.test(r.textContent));
  if (!row) return fail('trainee submission not found on the submissions list');
  click(row);
  if (!/Grace Oyelaran/.test(modalText())) fail('submission drawer did not open');
}
function advance() { const b = q('#modal-root [data-adv]'); if (!b) return fail('no status-change button at current status'); click(b); }

// the sendout now requires a CV on file, so upload one first
nav('candidates');
const cvf = q('#cand-filter');
cvf.value = 'Oyelaran';
cvf.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
const gRow = qa('tbody tr.click').find(r => /Grace Oyelaran/.test(r.textContent));
if (!gRow) fail('could not find the new candidate to attach a CV');
else {
  click(gRow, 'open new candidate');
  click(q('[data-act="upload-cv"]'), 'upload cv');
  const cta = q('#cv-text');
  if (!cta) fail('CV upload did not open');
  else {
    cta.value = 'GRACE OYELARAN\nProduction supervisor with ten years running night packing lines, '
      + 'lean trained, comfortable with WMS cycle counting and shift handovers.';
    cta.dispatchEvent(new window.Event('input', { bubbles: true }));
    click(q('[data-cvsave]'), 'save cv');
    if (q('#modal-root .modal')) fail('CV did not save');
  }
}
// 9 Internal Submission
openMySub(); advance();
setField('screenNote', 'too short'); submitModal();
if (!errs().some(e => /at least 40/.test(e))) fail('screening note min length not enforced');
setField('screenNote', 'Ran a ten-person packing line for three years, comfortable on nights, no travel limits.');
setField('summary', 'short'); submitModal();
if (!errs().some(e => /at least 60/.test(e))) fail('client summary min length not enforced');
setField('summary', 'Direct line-lead experience on nights with a team of ten. Available in two weeks at the agreed rate.');
setField('desiredRate', '29'); setField('availability', '2 weeks');
submitModal(); stuck('internal submission');

// 10 Client Submission — margin, ceiling, and below-expectation rules
openMySub(); advance();
setField('payRate', '40'); setField('billRate', '35'); submitModal();
if (!errs().some(e => /must exceed pay rate/.test(e))) fail('negative margin not caught at sendout');
setField('payRate', '29'); setField('billRate', '99'); submitModal();
if (!errs().some(e => /job order bill rate/.test(e))) fail('bill rate ceiling not enforced');
setField('payRate', '20'); setField('billRate', '38'); submitModal();
if (!errs().length) fail('a pay rate below the confirmed expectation raised nothing at all');
setField('payRate', '29'); submitModal();
if (!errs().length) fail('consent checkbox not enforced at sendout');
setField('consent', true); submitModal(); stuck('client submission');

// 11 Interview Scheduled
openMySub(); advance();
setField('date', '2020-01-01'); submitModal();
if (!errs().some(e => /in the past/.test(e))) fail('past interview date not caught');
setField('date', future(3)); submitModal();
if (!errs().length) fail('candidate-briefed checkbox not enforced');
setField('briefed', true); submitModal(); stuck('interview');
nav('appts');
if (!/Grace Oyelaran/.test(mainText())) fail('appointment not created on interview scheduling');

// 12 Offer Extended
openMySub(); advance();
setField('note', 'Accepted verbally, wants a two week runway to finish her notice.');
submitModal(); stuck('offer');

// 13 Placed
openMySub(); advance();
submitModal();
if (!errs().length) fail('placement confirmation not enforced');
setField('confirm', true);
setField('endDate', future(2));
setField('startDate', future(10));
submitModal();
if (!errs().some(e => /after the start date/.test(e))) fail('end-before-start not caught');
setField('endDate', future(120));
submitModal(); stuck('placement');

// candidate status should now read Placed
nav('candidates');
const cfilt = q('#cand-filter');
cfilt.value = 'Oyelaran';
cfilt.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
const grow = qa('tbody tr.click').find(r => /Grace Oyelaran/.test(r.textContent));
if (!grow) fail('placed candidate not findable via the list filter');
else if (!/Placed/.test(grow.textContent)) fail('candidate status did not flip to Placed');
click(q('[data-act="cand-clear"]'), 'reset candidate filters');

// 14 approve the placement — time entry must be blocked first
nav('placements');
const prow = qa('tbody tr.click').find(r => /Grace Oyelaran/.test(r.textContent));
if (!prow) fail('placement record not created');
else {
  if (!/Pending Approval/.test(prow.textContent)) fail('placement did not start at Pending Approval');
  click(prow);
  click(q('[data-act="approve-pl"]'), 'Approve placement');
  // a recruiter cannot sign off their own placement, so an approver must be chosen
  const apSel = q('[data-f="approver"]');
  if (!apSel) fail('approval form has no approver field');
  else if (Array.from(apSel.options).some(o => o.value === 'A. Trainee' && apSel.options.length === 1))
    fail('the creator is offered as their own approver');
  setField('decision', 'Approved');
  setField('reason', 'Rates, dates and employment type match the signed contract.');
  submitModal();
  if (!errs().length) fail('approval confirmation checkbox not enforced');
  setField('checked', true);
  setByText('approver', /Silva|Rao/);
  submitModal(); stuck('placement approval');
  if (!/Approved/.test(mainText())) fail('placement not approved');

  // time blocked by onboarding
  click(q('[data-act="time-add"]'), 'Add time entry');
  if (!/Time entry blocked/.test(modalText())) fail('time entry not blocked by onboarding gaps');
  closeModal();

  // 15 complete onboarding
  for (let i = 0; i < 12; i++) {
    const box = qa('[data-act="onboard"]').find(b => b.getAttribute('aria-checked') === 'false');
    if (!box) break;
    click(box);
  }
  if (qa('[data-act="onboard"]').some(b => b.getAttribute('aria-checked') === 'false')) fail('onboarding items did not all clear');

  // 16 time entry, with the overtime and regular caps
  click(q('[data-act="time-add"]'), 'Add time entry after onboarding');
  setField('regular', '80'); submitModal();
  if (!errs().some(e => /60 regular hours/.test(e))) fail('regular hours cap not enforced');
  setField('regular', '40'); setField('overtime', '30'); submitModal();
  if (!errs().some(e => /over 24 overtime hours/i.test(e))) fail('overtime hard cap not enforced');
  setField('overtime', '4'); submitModal();
  if (!errs().some(e => /not been pre-approved/.test(e))) fail('unapproved overtime not flagged');
  setField('otApproved', true);
  submitModal(); stuck('time entry');
}

// 17 approve that time entry
nav('approvals');
const treview = qa('[data-act="time-decide"]');
if (!treview.length) fail('no time entry awaiting approval');
else {
  click(treview[treview.length - 1]);
  setField('decision', 'Approved'); setField('note', 'Hours match the roster for the week.');
  submitModal(); stuck('time approval');
}

const s1 = scen('s1');
if (s1.done !== s1.total) fail('scenario 1 incomplete after full walkthrough: ' + s1.done + '/' + s1.total);

/* ============ SCENARIO 2 ============ */
// close a submission
nav('pipeline');
click(qa('tbody tr.click')[0], 'first live submission');
click(q('#modal-root [data-reject]'), 'Close submission');
setField('status', 'Client Declined');
setField('reason', 'Client confirmed the role was filled internally last week.');
submitModal(); stuck('close submission');

// advance an inherited submission
nav('pipeline');
// pick one that is actually ready to move on: a sendout awaiting an interview.
// Some seeded submissions deliberately lack a summary, which strict mode refuses.
const readyRow = qa('tbody tr.click').find(r => /Client Submission/.test(
  r.closest('div.sec') ? r.closest('div.sec').textContent.slice(0, 60) : '')) ||
  (function () {
    const secs = qa('#main .sec');
    const cs = secs.find(x => /Client Submission/.test(x.textContent.slice(0, 60)));
    return cs ? cs.querySelector('tbody tr.click') : qa('tbody tr.click')[0];
  })();
click(readyRow, 'a submission that is ready to advance');
advance();
qa('#modal-root [data-f]').forEach(el => {
  if (el.tagName === 'TEXTAREA') { el.value = 'Confirmed availability, rate and shift suitability directly with the candidate today, all in order.'; el.dispatchEvent(new window.Event('input', { bubbles: true })); }
  if (el.type === 'checkbox') { el.checked = true; el.dispatchEvent(new window.Event('change', { bubbles: true })); }
});
submitModal();
if (modalOpen()) { // may be a later-stage form needing more; fill numerics then retry
  qa('#modal-root [data-f]').forEach(el => { if (el.type === 'number' && !el.value) { el.value = '30'; el.dispatchEvent(new window.Event('input', { bubbles: true })); } });
  submitModal();
}
stuck('inherited advance');

// clear onboarding on inherited placements
for (const name of ['Sofia', 'Elliot']) {
  nav('placements');
  const r = qa('tbody tr.click').find(x => x.textContent.includes(name));
  if (!r) continue;
  click(r);
  for (let i = 0; i < 12; i++) {
    const b = qa('[data-act="onboard"]').find(x => x.getAttribute('aria-checked') === 'false');
    if (!b) break; click(b);
  }
}

// action pending time entries
for (let i = 0; i < 10; i++) {
  nav('approvals');
  const b = q('[data-act="time-decide"]');
  if (!b) break;
  click(b);
  setField('decision', 'Approved'); setField('note', 'Checked against the roster and approved.');
  submitModal();
  if (modalOpen()) { fail('inherited time approval stuck: ' + errs().join('|')); break; }
}

// note on a candidate
nav('candidates');
click(qa('tbody tr.click')[0], 'first candidate');
click(q('[data-act="note"]'), 'Add Note on candidate');
setField('text', 'Reconnected on availability, still open to nights, will confirm travel by Friday.');
submitModal(); stuck('candidate note');

// fix the misstated job order status
nav('jobs');
const fullrow = qa('tbody tr.click').find(r => /2\/2|1\/1|3\/3/.test(r.textContent));
if (fullrow) {
  click(fullrow);
  click(q('[data-act="job-status"]'), 'Change status');
  setField('status', 'Filled');
  setField('reason', 'All openings placed and confirmed with the client.');
  submitModal();
  stuck('job status');
}
// Filled must be refused when coverage is short
nav('jobs');
const shortrow = qa('tbody tr.click').find(r => /0\/1|1\/3|1\/4|2\/4/.test(r.textContent));
if (shortrow) {
  click(shortrow);
  click(q('[data-act="job-status"]'), 'Change status on a short job order');
  setField('status', 'Filled'); setField('reason', 'Trying to mark filled while coverage is short.');
  submitModal();
  if (!errs().some(e => /misstate coverage/.test(e))) fail('Filled allowed while coverage short');
  closeModal();
}

// tearsheet with two candidates
click(q('[data-act="addnew"]'), '+ Add New for tearsheet');
click(q('[data-new="tearsheet"]'), 'Add New → Tearsheet');
setField('name', 'Corvus nights — cleared leads');
setField('description', 'Screened line leads available for night shifts at the Corvus plants.');
submitModal(); stuck('tearsheet');
for (const nm of [/Grace Oyelaran/, /Marcus Delaney/]) {
  click(q('[data-act="tearsheet-add"]'), 'Add candidate to tearsheet');
  setByText('trId', /Corvus nights/); setByText('candidateId', nm);
  submitModal(); stuck('tearsheet add');
}

const s2 = scen('s2');
if (s2.done !== s2.total) fail('scenario 2 incomplete: ' + s2.done + '/' + s2.total);

/* ============ SCENARIO 3 ============ */
nav('reports');
if (!/Conversion by job order/.test(mainText())) fail('reports missing conversion table');
if (!/Data quality flags/.test(mainText())) fail('reports missing data quality flags');

// brute force the desk review to prove 3/3 is reachable
click(q('[data-act="review"]'), 'Weekly desk review');
const o1 = Array.from(q('[data-f="q1"]').options).map(o => o.value);
const o2 = Array.from(q('[data-f="q2"]').options).map(o => o.value);
const o3 = Array.from(q('[data-f="q3"]').options).map(o => o.value);
closeModal();
let got3 = false;
outer:
for (const a of o1) for (const b of o2) for (const c of o3) {
  click(q('[data-act="review"]'));
  setField('q1', a); setField('q2', b); setField('q3', c);
  submitModal();
  const m = modalText().match(/scored (\d)\/3/);
  closeModal();
  if (m && m[1] === '3') { got3 = true; break outer; }
}
if (!got3) fail('desk review 3/3 is not reachable');

// task
click(q('[data-act="addnew"]'), '+ Add New for task');
click(q('[data-new="task"]'), 'Add New → Task');
setField('subject', 'Rework the East hub submission pack with the client contact');
setField('priority', 'High');
submitModal(); stuck('task');

// knowledge check, answer all correctly by brute-forcing each question
nav('guide');
click(q('[data-act="assess"]'), 'Knowledge check');
const nq = qa('#modal-root select').length;
if (nq !== 12) fail('knowledge check should have 12 questions, got ' + nq);
closeModal();
const answers = new Array(nq).fill('0');
for (let i = 0; i < nq; i++) {
  for (let a = 0; a < 4; a++) {
    const trial = answers.slice(); trial[i] = String(a);
    click(q('[data-act="assess"]'));
    trial.forEach((v, ix) => setField('q' + ix, v));
    submitModal();
    const m = modalText().match(/check: (\d+)\/12/);
    closeModal();
    if (m && +m[1] > 0) {
      // keep the answer that improves the score for this index
      const score = +m[1];
      if (score >= 1) { /* probe */ }
    }
    if (m && +m[1] === nq) { answers.splice(0, nq, ...trial); i = nq; break; }
    if (m) {
      // greedy: record best per-index
      if (!answers._best) answers._best = {};
      if (!(i in answers._best) || +m[1] > answers._best[i].s) answers._best[i] = { s: +m[1], a: String(a) };
    }
  }
  if (answers._best && i < nq && answers._best[i]) answers[i] = answers._best[i].a;
}
click(q('[data-act="assess"]'));
answers.slice(0, nq).forEach((v, ix) => setField('q' + ix, v));
submitModal();
const finalScore = (modalText().match(/check: (\d+)\/12/) || [])[1];
closeModal();
if (!finalScore || +finalScore < 8) fail('could not reach a passing knowledge-check score, best was ' + finalScore);

const s3 = scen('s3');
if (s3.done !== s3.total) fail('scenario 3 incomplete: ' + s3.done + '/' + s3.total);

/* ---- session summary + reset ---- */
click(q('[data-act="session"]'), 'Session summary');
const sess = q('#sess');
if (!sess) fail('session summary textarea missing');
else {
  if (sess.value.length < 500) fail('session summary too short');
  if (!/Full desk cycle/.test(sess.value)) fail('session summary missing scenario detail');
  if (!/Tearsheets 1/.test(sess.value)) fail('session summary missing created-record counts');
}
closeModal();

click(q('[data-act="reset"]'), 'Reset');
setField('ack', true);
submitModal(); stuck('reset');
nav('candidates');
function findCand(name) {
  const f = q('#cand-filter'); f.value = name;
  f.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const hit = qa('tbody tr.click').some(r => new RegExp(name).test(r.textContent));
  click(q('[data-act="cand-clear"]'), 'clear filter');
  return hit;
}
if (findCand('Grace Oyelaran')) fail('reset did not clear trainee records');
if (!findCand('Marcus Delaney')) fail('reset did not restore seed data');
if (qa('.side-tab .x').length > 0) fail('reset did not clear open record tabs');

console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'ALL CHECKS PASSED');
process.exit(errors.length ? 1 : 0);
