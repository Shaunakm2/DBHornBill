const fs = require('fs');
const { loadApp } = require('./harness');
const dom = loadApp();
const { window } = dom; const doc = window.document;
const errors = []; const fail = m => errors.push(m);
window.addEventListener('error', ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)));
const q = s => doc.querySelector(s), qa = s => Array.from(doc.querySelectorAll(s));
const click = (el, w) => { if (!el) { fail('missing: ' + w); return; } el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); };
function nav(v){
  var a=q('#rail [data-go="'+v+'"]');
  if(!a){ if(!q('.mfly')) click(q('[data-act="menu"]'),'menu'); a=q('.mfly a[data-go="'+v+'"]'); }
  if(!a) return fail('no menu item '+v);
  click(a,'nav '+v);
}
const mainText = () => q('#main').textContent;
function setField(k, v) { const el = q('[data-f="' + k + '"]'); if (!el) return fail('field ' + k); if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new window.Event('change', { bubbles: true })); } else { el.value = v; el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); } }
function setByText(k, re) { const el = q('[data-f="' + k + '"]'); if (!el) return fail('select ' + k); const o = Array.from(el.options).find(x => re.test(x.textContent)); if (!o) return fail('option ' + re); el.value = o.value; el.dispatchEvent(new window.Event('change', { bubbles: true })); }
const submitModal = () => click(q('#modal-root [data-go]'), 'submit');
const modalOpen = () => !!q('#modal-root .modal');
const closeModal = () => { const b = q('#modal-root [data-close]'); if (b) click(b); };
const modalText = () => (q('#modal-root') || {}).textContent || '';
function search(query) { nav('search'); const i = q('#bs-q'); i.value = query; i.dispatchEvent(new window.Event('input', { bubbles: true })); click(q('[data-act="run-search"]'), 'run'); }
const count = () => { const m = mainText().match(/(\d+) results?/); return m ? +m[1] : null; };
function openCoach(){ if(!q('[data-scenario]')){ const b=q('.fab'); if(b) b.dispatchEvent(new window.MouseEvent('click',{bubbles:true})); } }
function scen(k) { openCoach(); const s = q('[data-scenario]'); s.value = k; s.dispatchEvent(new window.Event('change', { bubbles: true })); const m = q('#coach').textContent.match(/(\d+) of (\d+) done/); return { done: +m[1], total: +m[2] }; }

/* documented boolean precedence must actually hold */
search('java OR python AND aws'); const loose = count();
search('(java OR python) AND aws'); const tight = count();
search('java'); const j = count();
if (!(loose >= j)) fail('OR/AND precedence looks wrong: "java OR python AND aws"=' + loose + ' should be at least as large as "java"=' + j);
if (!(tight <= loose)) fail('bracketed form should be no wider than the unbracketed one');

/* scenario 4 end to end */
scen('s4');
search('(forklift OR "reach truck") AND osha');
if (!(count() > 0)) fail('scenario 4 seed query returned nothing');
search('(forklift OR "reach truck") AND skills:osha NOT welder');
if (count() === null) fail('narrowed query failed to run');

click(q('[data-act="save-search"]'), 'save search');
setField('name', 'Light industrial — forklift, OSHA, no welders');
submitModal();
if (modalOpen()) fail('save search stuck');

click(q('[data-act="addnew"]'), 'add new');
click(q('[data-new="tearsheet"]'), 'new tearsheet');
setField('name', 'Warehouse nights shortlist');
setField('description', 'Forklift certified, OSHA trained, screened for night shift availability.');
submitModal();
if (modalOpen()) fail('tearsheet stuck');

search('(forklift OR "reach truck") AND skills:osha NOT welder');
const sel = qa('[data-act="sel"]');
if (sel.length < 4) fail('need at least 4 results for the mass actions, got ' + sel.length);
[0, 1, 2, 3].forEach(i => click(qa('[data-act="sel"]')[i], 'select ' + i));
click(q('[data-act="mass-tearsheet"]'), 'mass tearsheet');
setByText('trId', /Warehouse nights shortlist/);
submitModal();
if (modalOpen()) fail('mass tearsheet stuck');

search('(forklift OR "reach truck") AND skills:osha NOT welder');
[0, 1, 2].forEach(i => click(qa('[data-act="sel"]')[i], 'select again ' + i));
click(q('[data-act="mass-pipeline"]'), 'mass pipeline');
setByText('jobId', /Warehouse Team Lead/);
submitModal();
if (!/Added \d+ of \d+/.test(modalText())) fail('mass pipeline did not report');
closeModal();

// CV upload
nav('candidates');
click(qa('tbody tr.click')[0], 'a candidate');
click(q('[data-act="upload-cv"]'), 'upload cv');
const ta = q('#cv-text');
ta.value = 'REVISED CV\nWarehouse team lead, OSHA 30, reach truck and order picker certified, ten years on night shifts running pick lines and cycle counts.';
ta.dispatchEvent(new window.Event('input', { bubbles: true }));
click(q('[data-cvsave]'), 'save cv');
if (modalOpen()) fail('cv save stuck');

// edit a record
nav('candidates');
click(qa('tbody tr.click')[0], 'a candidate again');
click(q('[data-act="edit-candidate"]'), 'edit');
setField('desiredRate', '33');
submitModal();
if (modalOpen()) fail('edit stuck');

// save to the database
nav('data');
click(q('[data-act="db-save"]'), 'save now');

const s4 = scen('s4');
if (s4.done !== s4.total) {
  const steps = qa('#coach .step').map((el, i) => (el.className.indexOf('done') >= 0 ? 'x' : ' ') + ' ' + el.textContent.slice(0, 60));
  fail('scenario 4 incomplete ' + s4.done + '/' + s4.total + '\n     ' + steps.join('\n     '));
}

// session summary should list all four scenarios
click(q('[data-act="session"]'), 'session');
const sess = q('#sess');
if (!sess) fail('session summary missing');
else {
  ['Full desk cycle', 'Clear an inherited desk', 'weekly desk review', 'Source from the CV database']
    .forEach(t => { if (sess.value.indexOf(t) < 0) fail('session summary missing scenario: ' + t); });
  if (!/Saved searches|CVs/.test(sess.value + mainText())) { /* optional */ }
}
closeModal();

console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'SCENARIO 4 CHECKS PASSED');
process.exit(errors.length ? 1 : 0);
