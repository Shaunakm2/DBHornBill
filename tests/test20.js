/* Accessibility sweep and permanent-placement display correctness */
const { loadApp } = require('./harness');
const errors = []; const fail = m => errors.push(m);
const dom = loadApp({ onError: ev => fail('RUNTIME: ' + String((ev.error && ev.error.stack) || ev.message).slice(0, 200)) });
const w = dom.window, d = w.document;
const q = s => d.querySelector(s), qa = s => Array.from(d.querySelectorAll(s));
const click = (el, what) => { if (!el) return false; el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return true; };
function nav(v) { let a = q('#rail [data-go="' + v + '"]'); if (!a) { if (!q('.mfly')) click(q('[data-act="menu"]')); a = q('.mfly a[data-go="' + v + '"]'); } if (!a) return fail('no menu item ' + v); click(a); }
const main = () => q('#main').textContent;

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'));

  const VIEWS = ['dashboard', 'candidates', 'jobs', 'companies', 'contacts', 'pipeline', 'placements',
    'tasks', 'appts', 'tearsheets', 'search', 'reports', 'notes', 'audit', 'data', 'config', 'guide',
    'leads', 'opps', 'approvals'];
  const problems = {};
  function record(k, m) { problems[k] = problems[k] || new Set(); problems[k].add(m); }

  function sweep(where) {
    // interactive things must be reachable and named
    qa('#main [data-act], #main [data-go], .coach [data-act], #rail [data-act], #rail [data-go]')
      .forEach(el => {
        const tag = el.tagName;
        const native = tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
        if (!native) {
          if (!el.hasAttribute('role')) record('no role', where + ' ' + (el.getAttribute('data-act') || el.getAttribute('data-go')));
          if (!el.hasAttribute('tabindex')) record('not focusable', where + ' ' + (el.getAttribute('data-act') || el.getAttribute('data-go')));
        }
        const label = (el.textContent || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title');
        if (!label) record('unnamed control', where + ' ' + (el.getAttribute('data-act') || el.getAttribute('data-go')));
      });
    // tables need header cells
    qa('#main table').forEach((t, i) => {
      if (t.querySelector('thead') && !t.querySelectorAll('thead th').length)
        record('table without header cells', where + ' table ' + i);
    });
    // svg needs an accessible name
    qa('#main svg').forEach(s => {
      if (!s.getAttribute('aria-label') && !s.getAttribute('aria-hidden') && !s.querySelector('title'))
        record('unlabelled svg', where);
    });
  }

  VIEWS.forEach(v => { nav(v); sweep('view:' + v); });

  // record pages and their tabs
  [['candidates', 'candidate'], ['jobs', 'job'], ['companies', 'company'], ['placements', 'placement']]
    .forEach(([list, type]) => {
      nav(list);
      const row = qa('tbody tr.click')[0];
      if (!row) return;
      click(row);
      sweep('record:' + type);
      qa('.rtabs a[data-rtab]').forEach((tb, i) => {
        click(qa('.rtabs a[data-rtab]')[i]);
        sweep('record:' + type + ' tab');
      });
    });

  // dialogs must be labelled and closable by keyboard
  nav('candidates');
  click(q('[data-act="add-candidate"]'));
  const modal = q('#modal-root .modal');
  if (!modal) fail('the add-candidate dialog did not open');
  else {
    if (modal.getAttribute('role') !== 'dialog') fail('a dialog has no dialog role');
    if (modal.getAttribute('aria-modal') !== 'true') fail('a dialog is not marked modal');
    if (!q('#modal-root .modal-h h4')) fail('a dialog has no heading');
    qa('#modal-root .f').forEach((f, i) => {
      const input = f.querySelector('input,select,textarea');
      const label = f.querySelector('label');
      if (input && label && label.getAttribute('for') !== input.id)
        fail('form field ' + i + ' has a label that does not point at its input');
      if (input && !label) fail('form field ' + i + ' has no label');
    });
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    if (q('#modal-root .modal')) fail('Escape did not close the dialog');
  }

  // keyboard activation of a non-native control
  nav('candidates');
  const kb = q('#main [data-go="candidate"]') || q('#main tbody tr.click');
  if (kb) {
    kb.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    if (!q('.h.rec') && !/records/.test(main())) fail('Enter did not activate a row');
  }


  /* ---- record chrome must be consistent across every record type ---- */
  [['candidates','candidate'],['jobs','job'],['companies','company'],['contacts','contact'],
   ['placements','placement'],['leads','lead'],['opps','opp'],['tearsheets','tearsheet']]
   .forEach(([list,type])=>{
    nav(list);
    const row=qa('tbody tr.click')[0];
    if(!row) return;
    click(row);
    if(!q('.h.rec')) fail(type+' record has no green header band');
    if(qa('#main > .h').some(h=>!h.classList.contains('rec')))
      fail(type+' record still renders the old plain heading');
    const kids=Array.from(q('#main').children).map(c=>c.className||'');
    const ci=kids.findIndex(c=>/(^|\s)crumb(\s|$)/.test(c));
    const bi=kids.findIndex(c=>/h rec/.test(c));
    if(bi<0) fail(type+' has no band among the top-level blocks');
    if(ci>=0 && ci!==bi-1)
      fail(type+' breadcrumb is not immediately above the band (crumb '+ci+', band '+bi+')');
    if(ci<0) fail(type+' record has no breadcrumb, so navigation back is inconsistent');
    const sub=kids[bi+1]||'';
    if(!/recsub/.test(sub)) fail(type+' has no context line under the band');
  });

  Object.keys(problems).forEach(k => {
    const list = Array.from(problems[k]);
    fail(k + ' (' + list.length + '): ' + list.slice(0, 4).join('; ') + (list.length > 4 ? ' …' : ''));
  });

  /* ---- a permanent placement must not display hourly figures it does not have ---- */
  nav('placements');
  const perm = qa('tbody tr.click').find(r => /Perm|Permanent/.test(r.textContent));
  if (perm) {
    click(perm);
    const t = main();
    if (/\$0\/hr|\$0 \/hr/.test(t)) fail('a permanent placement shows a zero hourly rate');
  }

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'ACCESSIBILITY SWEEP PASSED');
  process.exit(errors.length ? 1 : 0);
}, 350);
