const { loadApp } = require('./harness');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
const errors = []; const fail = m => errors.push(m);
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(idb) {
  const dom = loadApp({ indexedDB: idb ? indexedDB : null, IDBKeyRange: idb ? IDBKeyRange : null,
    onError: ev => fail('RUNTIME: ' + (ev.error && ev.error.stack || ev.message)) });
  const w = dom.window, d = w.document;
  const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
  const click = (el, what) => { if (!el) { fail('missing: ' + what); return false; } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return true; };
  function nav(v) {
    let a = q('#rail [data-go="' + v + '"]');
    if (!a) { if (!q('.mfly')) click(q('[data-act="menu"]'), 'menu'); a = q('.mfly a[data-go="' + v + '"]'); }
    if (!a) return fail('no menu item ' + v);
    click(a, 'nav ' + v);
  }
  return { dom, w, d, q, qa, click, nav, main: () => q('#main').textContent };
}
(async () => {
  let T = boot(false);
  const { q, qa, click, nav, w, d } = T;
  const modalText = () => (q('#modal-root') || {}).textContent || '';
  const modalOpen = () => !!q('#modal-root .modal');
  const errs = () => qa('#modal-root .err, #modal-root .warn-note').map(e => e.textContent);
  const setF = (k, v) => { const el = q('[data-f="' + k + '"]'); if (!el) return fail('field ' + k);
    if (el.type === 'checkbox') { el.checked = !!v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }
    else { el.value = v; el.dispatchEvent(new w.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); } };
  const submitM = () => click(q('#modal-root [data-go]'), 'submit');
  const closeM = () => { const b = q('#modal-root [data-close]'); if (b) click(b, 'close'); q('#modal-root').innerHTML = ''; };
  const optsOf = k => { const el = q('[data-f="' + k + '"]'); return el ? Array.from(el.options).map(o => o.value) : []; };

  await wait(200);
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip');

  /* ---------- the configuration screen exists and is reachable ---------- */
  nav('config');
  if (!/Configuration/.test(T.main())) fail('no configuration screen');
  ['Picklists', 'Required fields', 'Record tabs'].forEach(s => {
    if (T.main().indexOf(s) < 0) fail('configuration is missing the section: ' + s);
  });
  const pickBtns = qa('[data-act="cfg-pick"]').map(b => b.getAttribute('data-id'));
  ['candidateStatus', 'jobStatus', 'noteAction', 'candidateSource', 'companyStatus', 'category']
    .forEach(k => { if (pickBtns.indexOf(k) < 0) fail('picklist not configurable: ' + k); });

  /* ---------- editing a picklist changes what the forms offer ---------- */
  click(qa('[data-act="cfg-pick"]').find(b => b.getAttribute('data-id') === 'candidateSource'), 'edit source list');
  if (!modalOpen()) fail('picklist editor did not open');
  setF('vals', 'Solo');
  submitM();
  if (!errs().some(e => /at least two values/.test(e))) fail('a one-value picklist was accepted');
  setF('vals', 'Referral\nReferral');
  submitM();
  if (!errs().some(e => /appears twice/.test(e))) fail('a duplicated value was accepted');
  setF('vals', 'Careers Fair\nWord of Mouth\nLinkedIn');
  submitM();
  if (modalOpen()) fail('picklist edit did not save: ' + errs().join('|'));

  nav('candidates');
  click(q('[data-act="add-candidate"]'), 'add candidate');
  const src = optsOf('source');
  if (src.join(',') !== 'Careers Fair,Word of Mouth,LinkedIn')
    fail('the form still offers the old source list: ' + src.join(','));
  closeM();

  // and the pipeline is protected from a count change that would break the board
  nav('config');
  click(qa('[data-act="cfg-pick"]').find(b => b.getAttribute('data-id') === 'submissionStatus'), 'edit pipeline');
  setF('vals', 'One\nTwo\nThree');
  submitM();
  if (!errs().some(e => /six stages/.test(e))) fail('the pipeline accepted the wrong stage count');
  closeM();

  /* ---------- required fields are configuration, not code ---------- */
  nav('candidates');
  click(q('[data-act="add-candidate"]'), 'add candidate');
  const reqBefore = qa('#modal-root .f label span[title="required"]').length;
  closeM();
  nav('config');
  // make occupation required
  const occBox = qa('[data-act="cfg-req"]').find(b =>
    b.getAttribute('data-id') === 'candidate' && b.getAttribute('data-field') === 'occupation');
  if (!occBox) fail('cannot configure the occupation field');
  else {
    click(occBox, 'require occupation');
    nav('candidates');
    click(q('[data-act="add-candidate"]'), 'add candidate again');
    const reqAfter = qa('#modal-root .f label span[title="required"]').length;
    if (reqAfter <= reqBefore) fail('marking a field required did not change the form');
    // and it should now block
    setF('name', 'Config Test Person');
    setF('occupation', '');
    submitM();
    if (!errs().length) fail('the newly required field did not block the save');
    closeM();
  }
  // the anchor field cannot be made optional
  nav('config');
  const nameBox = qa('[data-act="cfg-req"]').find(b =>
    b.getAttribute('data-id') === 'candidate' && b.getAttribute('data-field') === 'name');
  click(nameBox, 'try to unrequire name');
  nav('candidates');
  click(q('[data-act="add-candidate"]'), 'add candidate');
  const stillReq = qa('#modal-root .f').some(f =>
    /Name/.test(f.textContent) && f.querySelector('span[title="required"]'));
  if (!stillReq) fail('the anchor field was made optional');
  closeM();

  /* ---------- tab order is configuration, and Layout opens it ---------- */
  nav('candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  const before = qa('.rtabs a[data-rtab]').map(a => a.getAttribute('data-rtab'));
  if (!q('.rtabs .layout')) fail('no Layout control on the tab strip');
  click(q('.rtabs .layout'), 'layout');
  if (!/Configuration/.test(T.main())) fail('the Layout control does not open the configuration');
  // move the second candidate tab up
  const up = qa('[data-act="cfg-tab-up"]').find(b => b.getAttribute('data-id') === 'candidate' && !b.disabled);
  if (!up) fail('cannot reorder candidate tabs');
  else {
    click(up, 'move tab up');
    nav('candidates');
    click(qa('tbody tr.click')[0], 'a candidate again');
    const after = qa('.rtabs a[data-rtab]').map(a => a.getAttribute('data-rtab'));
    if (after.join(',') === before.join(',')) fail('reordering the tabs had no effect');
  }

  /* ---------- clickable workflow icons ---------- */
  nav('candidates');
  const crow = qa('tbody tr.click').find(r => /Submitted|Placed/.test(r.textContent));
  if (crow) {
    click(crow, 'a candidate with a submission');
    const reached = qa('.chevs[data-act="stage-open"]');
    if (!reached.length) fail('no reached stage is clickable on the workflow bar');
    else {
      click(reached[reached.length - 1], 'click a reached stage');
      if (!modalOpen()) fail('clicking a reached stage opened nothing');
      else {
        if (!/Submission|submission/.test(modalText())) fail('the stage click did not open a submission');
        closeM();
      }
    }
    // an unreached stage must not pretend to be clickable
    const all = qa('.chevs');
    const unreached = all.filter(x => !x.getAttribute('data-act'));
    if (!unreached.length) fail('every stage is clickable, including ones never reached');
  }

  /* ---------- no fake affordances left ---------- */
  nav('candidates');
  click(qa('tbody tr.click')[0], 'a candidate');
  const handles = qa('.card-h h4').filter(h => /⠿/.test(h.textContent));
  if (handles.length) fail('card headers still show a drag handle that does not drag');

  /* ---------- the configuration survives a reload ---------- */
  let T2 = boot(true);
  await wait(400);
  if (T2.q('#modal-root').innerHTML.trim()) T2.click(T2.q('[data-welcome="skip"]'), 'skip');
  T2.nav('config');
  T2.click(T2.qa('[data-act="cfg-pick"]').find(b => b.getAttribute('data-id') === 'companyStatus'), 'edit company status');
  const ta = T2.q('[data-f="vals"]');
  ta.value = 'Live Account\nDormant\nProspect';
  ta.dispatchEvent(new T2.w.Event('input', { bubbles: true }));
  T2.click(T2.q('#modal-root [data-go]'), 'save');
  await wait(500);
  let T3 = boot(true);
  await wait(500);
  T3.nav('config');
  if (!/Live Account/.test(T3.main())) fail('the configuration did not survive a reload');
  // and reset restores the shipped values
  T3.click(T3.q('[data-act="cfg-reset"]'), 'reset config');
  const ack = T3.q('[data-f="ack"]'); ack.checked = true;
  ack.dispatchEvent(new T3.w.Event('change', { bubbles: true }));
  T3.click(T3.q('#modal-root [data-go]'), 'confirm reset');
  if (/Live Account/.test(T3.main())) fail('reset did not restore the shipped configuration');
  if (!/Active Client/.test(T3.main())) fail('reset did not bring back the default values');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'TENANT CONFIG + WORKFLOW ICONS CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
})();
