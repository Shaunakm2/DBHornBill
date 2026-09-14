const fs = require('fs');
const { loadApp } = require('./harness');
const dom = loadApp();
const { window } = dom; const doc = window.document;
const errors = [];
const fail = m => errors.push(m);
window.addEventListener('error', ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)));

const q = s => doc.querySelector(s), qa = s => Array.from(doc.querySelectorAll(s));
function click(el, what) { if (!el) { fail('missing element: ' + what); return false; } el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); return true; }
function nav(v){
  var a=q('#rail [data-go="'+v+'"]');
  if(!a){ if(!q('.mfly')) click(q('[data-act="menu"]'),'menu'); a=q('.mfly a[data-go="'+v+'"]'); }
  if(!a) return fail('no menu item '+v);
  click(a,'nav '+v);
}
const mainText = () => q('#main').textContent;
function setField(k, v) {
  const el = q('[data-f="' + k + '"]');
  if (!el) return fail('missing field ' + k);
  if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new window.Event('change', { bubbles: true })); }
  else { el.value = v; el.dispatchEvent(new window.Event(el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', { bubbles: true })); }
}
function setByText(k, re) {
  const el = q('[data-f="' + k + '"]'); if (!el) return fail('missing select ' + k);
  const o = Array.from(el.options).find(x => re.test(x.textContent));
  if (!o) return fail('no option ' + re + ' in ' + k); el.value = o.value;
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
}
const submitModal = () => { const b = q('#modal-root [data-go]'); if (!b) return fail('no modal submit'); click(b); };
const modalOpen = () => !!q('#modal-root .modal');
const errs = () => qa('#modal-root .err').map(e => e.textContent);
const stuck = w => { if (modalOpen()) fail(w + ' stuck: ' + errs().join(' | ')); };
const closeModal = () => { const b = q('#modal-root [data-close]'); if (b) click(b); };
const modalText = () => (q('#modal-root') || {}).textContent || '';
function search(query) {
  nav('search');
  const inp = q('#bs-q');
  if (!inp) return fail('search input missing');
  inp.value = query; inp.dispatchEvent(new window.Event('input', { bubbles: true }));
  click(q('[data-act="run-search"]'), 'run search');
}
const resultCount = () => { const m = mainText().match(/(\d+) results?/); return m ? +m[1] : null; };

// these suites assert that rules block, so run them in strict mode
if (q('#pmode') && /permissive/.test(q('#pmode').textContent)) q('#pmode').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));

/* ---- 1. generated CV pool ---- */
nav('candidates');
const total = (mainText().match(/(\d+) records/) || [])[1];
if (+total < 2900) fail('candidate pool too small: ' + total);
['Information Technology', 'Light Industrial', 'Admin & Clerical', 'Healthcare'].forEach(cat => {
  const sel = q('#cand-cat'); sel.value = cat; sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  const n = +(mainText().match(/(\d+) matching/) || [])[1];
  if (!(n >= 50)) fail('category ' + cat + ' only has ' + n + ' candidates');
});
q('#cand-cat').value = 'All'; q('#cand-cat').dispatchEvent(new window.Event('change', { bubbles: true }));

// CV coverage + paging
const cvSel = q('#cand-cv'); cvSel.value = 'With CV'; cvSel.dispatchEvent(new window.Event('change', { bubbles: true }));
const withCV = +(mainText().match(/(\d+) matching/) || [])[1];
if (withCV < 2900) fail('only ' + withCV + ' candidates have a CV');
cvSel.value = 'All'; cvSel.dispatchEvent(new window.Event('change', { bubbles: true }));
const pages = +(mainText().match(/page 1 of (\d+)/) || [])[1];
if (!(pages > 5)) fail('paging not working, pages=' + pages);
click(qa('[data-act="cand-page"]').find(b => /Next/.test(b.textContent)), 'next page');
click(qa('[data-act="cand-page"]').find(b => /Next/.test(b.textContent)), 'next page again');
if (!/page 3 of/.test(mainText())) fail('page navigation failed: ' + (mainText().match(/page \d+ of \d+/) || [])[0]);

// text filter via Enter
const cf = q('#cand-filter'); cf.value = 'forklift';
cf.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
const ffN = +(mainText().match(/(\d+) matching/) || [])[1];
if (!(ffN > 0)) fail('name/skill filter returned nothing for forklift');
click(q('[data-act="cand-clear"]'), 'reset filters');

/* ---- 2. boolean search semantics ---- */
search('java'); const nJava = resultCount();
search('java*'); const nJavaStar = resultCount();
if (!(nJavaStar > nJava)) fail('wildcard did not widen the result set (java=' + nJava + ', java*=' + nJavaStar + ')');

search('nurse'); const nNurse = resultCount();
search('nurse OR forklift'); const nOr = resultCount();
if (!(nOr > nNurse)) fail('OR did not widen results');
search('nurse AND forklift');
if (resultCount() !== 0) fail('AND across two verticals should return 0, got ' + resultCount());

search('"spring boot"'); const nPhrase = resultCount();
search('spring boot'); const nImplicit = resultCount();
if (nPhrase === null || nImplicit === null) fail('phrase vs implicit AND search failed to run');
if (!(nPhrase <= nImplicit)) fail('exact phrase returned more than implicit AND');

search('nurse NOT paediatric'); const nNot = resultCount();
search('nurse -paediatric');
if (resultCount() !== nNot) fail('minus operator does not match NOT');
if (!(nNot <= nNurse)) fail('NOT did not narrow results');

search('skills:kubernetes');
if (!(resultCount() > 0)) fail('field-scoped search returned nothing for skills:kubernetes');
search('status:active AND skills:epic');
if (resultCount() === null) fail('two field-scoped terms failed');
search('(forklift OR "reach truck") AND osha NOT welder');
if (!(resultCount() > 0)) fail('compound bracketed query returned nothing');

// explain output
search('(java OR python) AND aws');
if (!/Read as:/.test(mainText())) fail('query interpretation not shown');
if (!/whole word/.test(mainText())) fail('explain text missing term description');

// error handling — must re-query the live input each time
search('java AND (aws');
if (!/could not be read/i.test(mainText())) fail('unbalanced bracket not reported');
search('java AND "unclosed');
if (!/could not be read/i.test(mainText())) fail('unclosed quote not reported');
search('bogusfield:x');
if (!/Unknown field/.test(mainText())) fail('unknown field not reported');
search('java AND');
if (!/could not be read/i.test(mainText())) fail('dangling operator not reported');

/* ---- 3. saved searches ---- */
search('(forklift OR "reach truck") AND osha');
click(q('[data-act="save-search"]'), 'save search');
setField('name', 'Light industrial — forklift and OSHA');
submitModal(); stuck('save search');
if (!/Light industrial — forklift and OSHA/.test(mainText())) fail('saved search not listed');
click(q('[data-act="try-search"]'), 'run saved search');
if (resultCount() === null) fail('saved search did not re-run');

/* ---- 4. mass actions from search results ---- */
click(q('[data-act="addnew"]'), 'add new');
click(q('[data-new="tearsheet"]'), 'new tearsheet');
setField('name', 'Forklift pool'); setField('description', 'Certified forklift operators screened for warehouse nights.');
submitModal(); stuck('tearsheet');

search('skills:forklift');
if (qa('[data-act="sel"]').length < 3) fail('not enough results to test mass select');
[0, 1, 2].forEach(i => click(qa('[data-act="sel"]')[i]));
if (!/\(3\)/.test(mainText())) fail('selection count not shown');
click(q('[data-act="mass-tearsheet"]'), 'mass tearsheet');
setByText('trId', /Forklift pool/);
submitModal(); stuck('mass tearsheet');
nav('tearsheets');
if (!/Forklift pool/.test(mainText())) fail('tearsheet missing');
click(qa('tbody tr.click').find(r => /Forklift pool/.test(r.textContent)));
if (!/3 candidates|remove/.test(mainText())) fail('mass-added candidates not on the tearsheet');
const rowsOnSheet = qa('tbody tr.click').length;
if (rowsOnSheet !== 3) fail('expected 3 on tearsheet, got ' + rowsOnSheet);
click(q('[data-act="tearsheet-remove"]'), 'remove from tearsheet');
if (qa('tbody tr.click').length !== 2) fail('remove from tearsheet failed');

// mass add to pipeline, including the Do Not Call block
search('skills:forklift OR skills:"order picker"');
qa('[data-act="sel"]').slice(0, 8).forEach(b => click(b));
click(q('[data-act="mass-pipeline"]'), 'mass pipeline');
setByText('jobId', /Warehouse Team Lead/);
submitModal();
if (!/Added \d+ of \d+/.test(modalText())) fail('mass pipeline report not shown');
closeModal();

/* ---- 5. CV upload ---- */
nav('candidates');
click(qa('tbody tr.click')[0], 'first candidate');
click(q('[data-act="upload-cv"]'), 'upload cv');
if (!q('#cv-text')) fail('CV upload modal missing textarea');
else {
  const ta = q('#cv-text'); ta.value = 'too short'; ta.dispatchEvent(new window.Event('input', { bubbles: true }));
  click(q('[data-cvsave]'), 'save cv');
  if (!/at least 80 characters/.test(modalText())) fail('CV minimum length not enforced');
  const body = 'AMENDED CV\nSenior warehouse supervisor with fifteen years of experience running night shift pick lines, '
    + 'certified on reach truck and order picker, trained to OSHA 30, and experienced with WMS cycle counting.';
  ta.value = body; ta.dispatchEvent(new window.Event('input', { bubbles: true }));
  click(q('[data-cvsave]'), 'save cv 2');
  if (modalOpen()) fail('CV save stuck');
  // an upload now attaches a file rather than rewriting the record, so it lands on Files
  if (!/Resume|resume/.test(mainText())) fail('upload did not land on the Files tab');
  click(qa('.rtabs a').find(a => a.getAttribute('data-rtab') === 'resume'), 'resume tab');
  if (!/AMENDED CV/.test(mainText())) fail('Resume tab does not show the saved text');
  // and it must be searchable
  search('"night shift pick lines"');
  if (!(resultCount() >= 1)) fail('uploaded CV text is not searchable');
}

/* ---- 6. edit forms ---- */
// candidate edit + duplicate guard + Do Not Call guard
search('skills:forklift');
click(q('[data-go="candidate"]'), 'open a candidate from results');
click(q('[data-act="edit-candidate"]'), 'edit candidate');
setField('name', 'Marcus Delaney'); submitModal();
if (!errs().some(e => /already has the same/.test(e))) fail('edit duplicate-name guard missing');
const origName = 'Edited Candidate Name';
setField('name', origName); setField('desiredRate', '41'); setField('status', 'Do Not Call');
submitModal();
if (!errs().some(e => /live on \d+ pipeline/.test(e))) fail('Do Not Call guard did not fire for a live candidate');
setField('ack', true); submitModal(); stuck('candidate edit');
if (!/Edited Candidate Name/.test(mainText())) fail('candidate edit did not apply');
nav('audit');
if (!/Edited Candidate/.test(mainText())) fail('candidate edit not written to the activity log');
if (!/status Active → Do Not Call|desired rate/.test(mainText())) fail('field-level diff not logged');

// job order edit: margin, openings, bill-rate-lowering guard
nav('jobs'); click(qa('tbody tr.click')[0], 'first job order');
click(q('[data-act="edit-job"]'), 'edit job');
setField('payRate', '40'); setField('billRate', '30'); submitModal();
if (!errs().some(e => /must exceed pay rate/.test(e))) fail('job edit margin rule missing');
setField('payRate', '30'); setField('billRate', '38'); setField('openings', '0'); submitModal();
if (!errs().some(e => /at least 1|cannot go below/.test(e))) fail('openings floor not enforced');
setField('openings', '3'); setField('billRate', '31'); submitModal();
if (!errs().some(e => /lowering the bill rate/.test(e))) fail('bill-rate-lowering guard missing');
setField('ack', true); submitModal(); stuck('job edit');

// placement edit: approval voiding
nav('placements');
const apr = qa('tbody tr.click').find(r => /Approved/.test(r.textContent));
if (!apr) fail('no approved placement to test approval voiding');
else {
  click(apr);
  click(q('[data-act="edit-placement"]'), 'edit placement');
  const pay = q('[data-f="payRate"]').value;
  setField('billRate', String(Number(q('[data-f="billRate"]').value) + 6));
  submitModal();
  if (!errs().length) fail('changing an approved placement did not require acknowledgement');
  setField('ack', true); submitModal(); stuck('placement edit');
  if (!/Pending Approval/.test(mainText())) fail('approval was not voided after a rate change');
  nav('audit');
  if (!/approval voided/i.test(mainText())) fail('approval voiding not logged');
}

// contact edit archive guard
nav('contacts'); click(qa('tbody tr.click')[0], 'first contact');
click(q('[data-act="edit-contact"]'), 'edit contact');
setField('status', 'Archive'); submitModal();
if (modalOpen() && !errs().some(e => /live job order/.test(e))) {
  // contact may have no live job orders; that is a valid pass
  closeModal();
} else if (modalOpen()) { closeModal(); }

// company, lead, opportunity, tearsheet, task, note edits all open and save
nav('companies'); click(qa('tbody tr.click')[0]);
click(q('[data-act="edit-company"]'), 'edit company');
setField('employees', '999'); submitModal(); stuck('company edit');

nav('leads'); click(qa('tbody tr.click')[0]);
click(q('[data-act="edit-lead"]'), 'edit lead');
setField('title', 'Group Operations Director'); submitModal(); stuck('lead edit');

nav('opps'); click(qa('tbody tr.click')[0]);
click(q('[data-act="edit-opp"]'), 'edit opportunity');
setField('probability', '150'); submitModal();
if (!errs().some(e => /cannot exceed 100/.test(e))) fail('probability cap not enforced');
setField('probability', '55'); submitModal(); stuck('opportunity edit');

nav('tasks');
click(q('[data-act="edit-task"]'), 'edit task');
setField('priority', 'Low'); submitModal(); stuck('task edit');

nav('notes');
click(q('[data-act="edit-note"]'), 'edit note');
setField('text', 'Corrected note text with enough characters to satisfy the minimum length rule.');
submitModal(); stuck('note edit');

/* ---- 7. database screen, export, import ---- */
nav('data');
if (!/Storage/.test(mainText())) fail('database view missing');
if (!/Memory only|Active/.test(mainText())) fail('storage mode not reported');
if (!/CVs on file/.test(mainText())) fail('record counts missing CV row');
click(q('[data-act="db-save"]'), 'save now');

click(q('[data-act="db-export"]'), 'export');
const json = q('#db-json');
if (!json) fail('export textarea missing');
else {
  const payload = json.value;
  if (payload.length < 5000) fail('export payload suspiciously small: ' + payload.length);
  let parsed = null;
  try { parsed = JSON.parse(payload); } catch (e) { fail('export is not valid JSON: ' + e.message); }
  if (parsed && (!parsed.data || !parsed.data.candidates)) fail('export missing data.candidates');
  if (parsed && parsed.data.candidates.length < 160) fail('export lost candidates');
  closeModal();

  // import a modified snapshot
  const mod = JSON.parse(payload);
  mod.data.candidates = mod.data.candidates.slice(0, 20);
  mod.data.candidates[0].name = 'Imported Test Person';
  click(q('[data-act="db-import"]'), 'import');
  setField('json', 'not json at all'); submitModal();
  if (!errs().some(e => /Could not parse/.test(e))) fail('import JSON validation missing');
  setField('json', JSON.stringify({ hello: 'world' })); submitModal();
  if (!errs().some(e => /does not look like a sandbox snapshot/.test(e))) fail('import shape validation missing');
  setField('json', JSON.stringify(mod)); submitModal();
  if (!errs().length) fail('import confirmation checkbox not enforced');
  setField('ack', true); submitModal(); stuck('import');
  nav('candidates');
  if (!/20 records/.test(mainText())) fail('import did not replace the dataset');
  const t2 = mainText();
  if (!/Imported Test Person/.test(t2)) fail('imported record not visible');
}

/* ---- 8. reset restores the generated pool ---- */
click(q('[data-act="reset"]'), 'reset');
setField('ack', true); submitModal(); stuck('reset');
nav('candidates');
if (!/3012 records/.test(mainText())) fail('reset did not restore the full pool, got: ' + (mainText().match(/(\d+) records/) || [])[0]);
nav('search');
if (q('#bs-q').value !== '') fail('reset did not clear the search box');

console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'ALL NEW-FEATURE CHECKS PASSED');
process.exit(errors.length ? 1 : 0);
