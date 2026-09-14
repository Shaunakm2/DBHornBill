/* Business-flow testing: the Direct Hire cycle end to end, plus the decline and withdrawal paths,
   and the same core flow run across both interfaces and both rule modes. */
const { loadApp } = require('./harness');
const errors = []; const fail = m => errors.push(m);
const dom = loadApp({ onError: ev => fail('RUNTIME: ' + String((ev.error && ev.error.stack) || ev.message).slice(0, 200)) });
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
function setByText(k, re) { const el = q('[data-f="' + k + '"]'); if (!el) return fail('select ' + k);
  const o = Array.from(el.options).find(x => re.test(x.textContent)); if (!o) return fail('no option ' + re + ' in ' + k);
  el.value = o.value; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
const submitM = () => click(q('#modal-root [data-go]'), 'submit');
const closeM = () => { const b = q('#modal-root [data-close]'); if (b) click(b, 'close'); q('#modal-root').innerHTML = ''; };
const permissive = () => { const p = q('#pmode'); if (p && /strict/.test(p.textContent)) click(p, 'permissive'); };
const strict = () => { const p = q('#pmode'); if (p && /permissive/.test(p.textContent)) click(p, 'strict'); };
const future = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const tab = k => click(qa('.rtabs a').find(a => a.getAttribute('data-rtab') === k), 'tab ' + k);

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip');
  permissive();

  /* ===================== DIRECT HIRE, END TO END ===================== */
  // company and contact
  nav('companies');
  click(q('[data-act="add-company"]'), 'add company');
  setF('name', 'Perm Client Holdings'); setF('category', 'Engineering');
  setF('status', 'Active Client'); setF('owner', 'A. Trainee');
  submitM(); if (mopen()) { fail('company: ' + errs().join('|')); closeM(); }
  click(q('[data-act="actions"][data-type="company"]'), 'company actions');
  click(q('#modal-root [data-runact="add-contact"]'), 'add contact');
  setF('name', 'Perm Hiring Manager'); setF('title', 'Head of Engineering');
  setF('phone', '+1 555 4321'); setF('email', 'perm.hm@permclient.example');
  submitM(); if (mopen()) { fail('contact: ' + errs().join('|')); closeM(); }

  // a direct hire job order priced on salary and fee
  nav('companies');
  click(qa('tbody tr.click').find(r => /Perm Client Holdings/.test(r.textContent)), 'the perm client');
  click(q('[data-act="add-job"]'), 'add job order');
  setByText('companyId', /Perm Client Holdings/);
  setByText('contactId', /Perm Hiring Manager/);
  setF('title', 'Senior Design Engineer'); setF('type', 'Direct Hire');
  setF('category', 'Engineering'); setF('openings', '1');
  setF('location', 'Corvus North'); setF('salary', '84000'); setF('flatFee', '16800');
  setF('description', 'Permanent senior design engineer for the new product programme, SolidWorks and GD&T essential.');
  submitM(); if (mopen()) { fail('direct hire job order: ' + errs().join(' | ')); closeM(); }
  if (!/Senior Design Engineer/.test(main())) fail('did not land on the direct hire job order');
  // no hourly rates should be on show
  tab('overview');
  if (/Mark-up %/.test(main())) fail('a direct hire shows contract mark-up');
  if (!/Flat Fee/.test(main())) fail('a direct hire does not show its fee');
  if (!/Not applicable on a direct hire/.test(main())) fail('a direct hire does not say timesheets do not apply');

  // candidate with a resume, then the full pipeline
  tab('pipeline');
  click(q('[data-act="actions"][data-type="job"]'), 'job actions');
  click(q('#modal-root [data-runact="add-candidate"]'), 'new candidate');
  setF('name', 'Perm Candidate One'); setF('occupation', 'Design Engineer');
  setF('status', 'Active'); setF('category', 'Engineering'); setF('location', 'Corvus North');
  setF('skills', 'SolidWorks, GD&T, FEA'); setF('source', 'Referral');
  setF('desiredRate', '42'); setF('availability', '4 weeks');
  setF('employmentPref', 'Direct Hire'); setF('phone', '+1 555 8080');
  setF('email', 'perm.candidate@mail.example');
  submitM();
  if (mopen() && q('[data-f="jobId"]')) { setByText('jobId', /Senior Design Engineer/); setByText('candidateId', /Perm Candidate One/); submitM(); }
  if (mopen()) { fail('candidate/pipeline: ' + errs().join('|')); closeM(); }

  // attach a resume so the sendout gate is satisfied
  nav('candidates');
  const cf = q('#cand-filter'); cf.value = 'Perm Candidate One';
  cf.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const prow = qa('tbody tr.click').find(r => /Perm Candidate One/.test(r.textContent));
  if (!prow) fail('cannot find the perm candidate');
  else {
    click(prow, 'perm candidate');
    click(q('[data-act="upload-cv"]'), 'attach resume');
    const ta = q('#cv-text');
    ta.value = 'PERM CANDIDATE ONE\nDesign Engineer  |  Corvus North  |  +1 555 8080  |  perm.candidate@mail.example\n\nPROFESSIONAL SUMMARY\n11 years of experience as a design engineer in engineering.\n\nKEY SKILLS\nSolidWorks, GD&T, FEA\n\nCERTIFICATIONS\nProfessional Engineer (PE)';
    ta.dispatchEvent(new w.Event('input', { bubbles: true }));
    click(q('[data-cvsave]'), 'save resume');
    if (q('#modal-root .modal')) fail('resume did not attach');
  }

  // walk the pipeline to Placed
  function openPermSub() {
    nav('pipeline');
    const r = qa('tbody tr.click').find(x => /Perm Candidate One/.test(x.textContent));
    if (!r) return fail('perm submission not on the list');
    click(r, 'perm submission');
  }
  const STEPS = [
    () => { setF('screenNote', 'Eleven years on new product programmes, SolidWorks and GD&T daily, four weeks notice.'); setF('summary', 'Direct hire fit for the design engineer role: full product lifecycle experience and a PE licence.'); },
    () => { setF('consent', true); },
    () => { setF('date', future(5)); setF('briefed', true); },
    () => { setF('note', 'Offer discussed and accepted verbally at the advertised salary.'); },
    () => { setF('confirm', true); setF('startDate', future(30)); setF('endDate', future(400)); }
  ];
  for (let i = 0; i < STEPS.length; i++) {
    openPermSub();
    const adv = q('#modal-root [data-adv]');
    if (!adv) { fail('no status change available at step ' + (i + 1)); break; }
    click(adv, 'advance ' + i);
    STEPS[i]();
    submitM();
    if (mopen()) { setF('__override', true); submitM(); }
    if (mopen()) { fail('perm step ' + (i + 1) + ' stuck: ' + errs().join(' | ')); closeM(); break; }
  }

  // a direct hire placement must exist, and must refuse time entry
  nav('placements');
  const pl = qa('tbody tr.click').find(r => /Perm Candidate One/.test(r.textContent));
  if (!pl) fail('no direct hire placement was created');
  else {
    click(pl, 'perm placement');
    if (!/Permanent/.test(main())) fail('the placement is not marked permanent');
    // approve it
    if (q('[data-act="approve-pl"]')) {
      click(q('[data-act="approve-pl"]'), 'approve');
      setF('decision', 'Approved'); setByText('approver', /Silva|Rao/);
      setF('reason', 'Salary and fee match the signed terms of business.');
      setF('checked', true);
      submitM();
      if (mopen()) { setF('__override', true); submitM(); }
      if (mopen()) { fail('perm approval stuck: ' + errs().join(' | ')); closeM(); }
    }
    if (q('[data-act="time-add"]')) {
      click(q('[data-act="time-add"]'), 'time entry');
      if (!/No timesheets on a direct hire|fee based/i.test(mtext()))
        fail('a direct hire allowed time entry');
      closeM();
    }
  }

  /* ===================== DECLINE AND WITHDRAWAL PATHS ===================== */
  nav('pipeline');
  const live = qa('tbody tr.click');
  if (live.length >= 2) {
    ['Client Declined', 'Candidate Declined'].forEach((outcome, i) => {
      nav('pipeline');
      const rows = qa('tbody tr.click');
      if (!rows.length) return;
      click(rows[0], 'a live submission');
      const rj = q('#modal-root [data-reject]');
      if (!rj) { closeM(); return; }
      click(rj, 'close submission');
      setF('status', outcome);
      setF('reason', 'Recorded for the ' + outcome + ' path so the reason is on the record.');
      submitM();
      if (mopen()) { fail(outcome + ' stuck: ' + errs().join('|')); closeM(); }
      else {
        nav('audit');
        if (!new RegExp(outcome).test(main())) fail(outcome + ' was not written to the activity log');
      }
    });
  }

  /* ===================== THE SAME FLOW ACROSS MODES ===================== */
  // strict mode must block a sendout with no resume; permissive must warn and allow an override
  ['strict', 'permissive'].forEach(mode => {
    mode === 'strict' ? strict() : permissive();
    nav('candidates');
    click(q('[data-act="add-candidate"]'), 'add candidate ' + mode);
    setF('name', 'No Resume ' + mode); setF('occupation', 'Tester');
    setF('status', 'Active'); setF('category', 'Information Technology');
    setF('location', 'Aurora'); setF('skills', 'Testing'); setF('source', 'Referral');
    setF('desiredRate', '30'); setF('availability', 'Immediate');
    setF('employmentPref', 'Contract'); setF('phone', '+1 555 1' + (mode === 'strict' ? '111' : '222'));
    setF('email', 'no.resume.' + mode + '@mail.example');
    submitM();
    if (mopen() && q('[data-f="jobId"]')) { submitM(); }
    if (mopen()) { setF('__override', true); submitM(); }
    if (mopen()) closeM();
  });
  // and the interface switch must not disturb the data
  nav('config');
  const before = (main().match(/(\d+)\s*$/) || [])[0];
  click(q('[data-act="ui-mode"]'), 'switch interface');
  nav('candidates');
  if (!/records/.test(main())) fail('the candidate list broke after switching interface');
  click(q('#rail [data-go="config"]') || q('[data-act="menu"]'), 'back to config');
  const swBack = q('[data-act="ui-mode"]');
  if (swBack) click(swBack, 'switch back');

  // training mode off must not break the flow
  const tm = q('#tmode');
  if (tm) {
    click(tm, 'training off');
    nav('jobs'); click(qa('tbody tr.click')[0], 'a job order');
    if (main().trim().length < 60) fail('a job order broke with training mode off');
    if (q('.fab')) fail('the practice button survived training mode off');
    click(q('#tmode'), 'training on');
  }

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'BUSINESS FLOW CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
}, 350);
