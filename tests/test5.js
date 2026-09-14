const fs = require('fs');
const { loadApp } = require('./harness');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');


const errors = []; const fail = m => errors.push(m);

// one shared IndexedDB backend across both "page loads", like a real browser profile
function load(withIDB) {
  const dom = loadApp({ indexedDB: (withIDB === undefined || withIDB) ? indexedDB : null,
    IDBKeyRange: (withIDB === undefined || withIDB) ? IDBKeyRange : null,
    onError: ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)) });
  return dom;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* ---------- first load: should initialise and save ---------- */
  let dom = load();
  let w = dom.window, d = w.document;
  w.addEventListener('error', ev => fail('RUNTIME(1): ' + (ev.error && ev.error.stack || ev.message)));
  const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
  const click = (el, what) => { if (!el) { fail('missing: ' + what); return; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  function setField(k, v) { const el = q('[data-f="' + k + '"]'); if (!el) return fail('field ' + k); if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new w.Event('change', { bubbles: true })); } else { el.value = v; el.dispatchEvent(new w.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); } }

  function nav(v){
    var a=q('#rail [data-go="'+v+'"]');
    if(!a){ if(!q('.mfly')) click(q('[data-act="menu"]'),'menu'); a=q('.mfly a[data-go="'+v+'"]'); }
    if(!a) return fail('no menu item '+v);
    click(a,'nav '+v);
  }
  await wait(400);
  nav('data');
  const mode = d.querySelector('#main').textContent;
  if (!/Local database active/.test(mode)) fail('IndexedDB not detected as active on first load');
  if (!/Active/.test(mode)) fail('storage tile does not read Active');

  // make a change that must survive
  nav('candidates');
  click(qa('tbody tr.click')[0], 'first candidate');
  click(q('[data-act="edit-candidate"]'), 'edit candidate');
  setField('name', 'Persistence Test Person');
  setField('desiredRate', '77');
  click(q('#modal-root [data-go]'), 'save edit');
  if (q('#modal-root .modal')) fail('edit did not save: ' + qa('#modal-root .err').map(e => e.textContent).join('|'));

  // upload a CV so the files store is exercised too
  click(q('[data-act="upload-cv"]'), 'upload cv');
  const ta = q('#cv-text');
  ta.value = 'PERSISTED CV\nThis CV text exists only to prove that uploaded CV content survives a page reload through the local database layer.';
  ta.dispatchEvent(new w.Event('input', { bubbles: true }));
  click(q('[data-cvsave]'), 'save cv');

  // save a search too
  nav('search');
  const inp = q('#bs-q');
  inp.value = 'skills:forklift AND osha';
  inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  click(q('[data-act="run-search"]'), 'run search');
  click(q('[data-act="save-search"]'), 'save search');
  setField('name', 'Persisted search');
  click(q('#modal-root [data-go]'), 'submit save search');

  nav('data');
  click(q('[data-act="db-save"]'), 'save now');
  await wait(500);
  if (!/Last saved/.test(d.querySelector('#main').textContent)) fail('no last-saved indicator');

  /* ---------- second load: same browser profile, fresh page ---------- */
  dom = load();
  w = dom.window; d = w.document;
  w.addEventListener('error', ev => fail('RUNTIME(2): ' + (ev.error && ev.error.stack || ev.message)));
  const q2 = s => d.querySelector(s), qa2 = s => Array.from(d.querySelectorAll(s));
  const click2 = (el, what) => { if (!el) { fail('missing(2): ' + what); return; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  function nav2(v){
    var a=q2('#rail [data-go="'+v+'"]');
    if(!a){ if(!q2('.mfly')) click2(q2('[data-act="menu"]'),'menu'); a=q2('.mfly a[data-go="'+v+'"]'); }
    if(!a) return fail('no menu item(2) '+v);
    click2(a,'nav2 '+v);
  }

  await wait(600);
  const toastText = qa2('#toasts .toast').map(t => t.textContent).join(' ');
  if (!/Restored your saved data/.test(toastText)) fail('no restore notice on reload, toasts were: ' + (toastText || 'none'));

  nav2('candidates');
  const cf = q2('#cand-filter');
  cf.value = 'Persistence';
  cf.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const t2 = d.querySelector('#main').textContent;
  if (!/Persistence Test Person/.test(t2)) fail('edited candidate did not survive the reload');
  if (!/\$77/.test(t2)) fail('edited rate did not survive the reload');

  const row = qa2('tbody tr.click').find(r => /Persistence Test Person/.test(r.textContent));
  click2(row, 'restored candidate');
  click2(qa2('.rtabs a').find(a => a.getAttribute('data-rtab') === 'resume'), 'resume tab');
  if (!/PERSISTED CV/.test(d.querySelector('#main').textContent)) fail('uploaded CV text did not survive the reload');

  nav2('search');
  if (!/Persisted search/.test(d.querySelector('#main').textContent)) fail('saved search did not survive the reload');

  nav2('audit');
  if (!/Edited Candidate/.test(d.querySelector('#main').textContent)) fail('activity log did not survive the reload');

  /* ---------- clear ---------- */
  nav2('data');
  click2(q2('[data-act="db-clear"]'), 'clear database');
  const ack = q2('[data-f="ack"]'); ack.checked = true; ack.dispatchEvent(new w.Event('change', { bubbles: true }));
  click2(q2('#modal-root [data-go]'), 'confirm clear');
  await wait(400);

  const dom3 = load();
  await wait(600);
  const toasts3 = Array.from(dom3.window.document.querySelectorAll('#toasts .toast')).map(t => t.textContent).join(' ');
  if (/Restored your saved data/.test(toasts3)) fail('data was restored after the database was cleared');
  const c3 = dom3.window.document.querySelector('#main').textContent;
  if (!/Dashboard/.test(c3)) fail('third load did not render');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'PERSISTENCE CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
})();
