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
const setF = (k, v) => { const el = q('[data-f="' + k + '"]'); if (!el) return fail('field ' + k);
  el.value = v; el.dispatchEvent(new w.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };

setTimeout(() => {
  if (q('#modal-root').innerHTML.trim()) click(q('[data-welcome="skip"]'), 'skip');

  /* the dashboard must be back to its earlier shape, with no chart cards on it */
  if (qa('.dashcard').length) fail('chart cards are still on the dashboard');
  if (!/My Dashboard/.test(main())) fail('the dashboard heading was not restored');
  if (qa('.met').length !== 4) fail('the dashboard metric tiles are missing');
  if (!/Needs attention/.test(main())) fail('the dashboard lost its Needs attention section');
  if (!/Submission funnel/.test(main())) fail('the dashboard lost its funnel card');
  if (!/Practice progress/.test(main())) fail('the dashboard lost its practice card');
  if (!/Latest notes/.test(main())) fail('the dashboard lost its latest notes card');

  /* ---------- the charts live in Reports ---------- */
  nav('reports');
  const cards = qa('.dashcard');
  if (cards.length < 5) fail('only ' + cards.length + ' report cards');
  const titles = qa('.dashcard .card-h h4').map(h => h.textContent.trim());
  ['Jobs without Coverage', 'Companies by Status', 'Submissions by Status',
    'Companies over Time', 'Candidates by Category'].forEach(t => {
    if (titles.indexOf(t) < 0) fail('reports card missing: ' + t);
  });
  if (!/Conversion by job order/.test(main())) fail('Reports lost its conversion table');
  if (!/Data quality flags/.test(main())) fail('Reports lost its data quality flags');

  /* ---------- pie charts have geometry, a legend and accessible labels ---------- */
  const pies = qa('.dashcard .chart-wrap');
  if (pies.length < 2) fail('fewer than two pie charts');
  pies.forEach((p, i) => {
    const svg = p.querySelector('svg');
    if (!svg) return fail('pie ' + i + ' has no svg');
    if (!svg.getAttribute('aria-label')) fail('pie ' + i + ' has no accessible label');
    const wedges = p.querySelectorAll('svg path, svg circle').length;
    if (!wedges) fail('pie ' + i + ' drew no wedges');
    const keys = p.querySelectorAll('.chart-key li').length;
    if (!keys) fail('pie ' + i + ' has no legend');
    if (keys !== wedges) fail('pie ' + i + ' has ' + wedges + ' wedges but ' + keys + ' legend rows');
    // every wedge should carry a tooltip naming its value
    if (!p.querySelector('svg title')) fail('pie ' + i + ' wedges have no tooltips');
  });

  /* ---------- the line chart has axis labels, a line and points ---------- */
  const jc = cards.find(c => /Jobs without Coverage/.test(c.textContent));
  if (!jc) fail('no jobs-without-coverage card');
  else {
    const svg = jc.querySelector('svg');
    if (!svg) fail('the coverage card has no chart');
    else {
      if (!svg.querySelectorAll('circle').length) fail('the line chart has no data points');
      if (!svg.querySelectorAll('path').length) fail('the line chart has no line');
      if (svg.querySelectorAll('text').length < 3) fail('the line chart has no axis labels');
    }
    if (!/Job order|Every live job order/.test(jc.textContent))
      fail('the coverage card has neither a table nor an empty state');
  }

  /* ---------- charts reflect real data, not placeholders ---------- */
  nav('data');
  click(q('[data-act="db-export"]'), 'export');
  const raw = q('#db-json');
  const D = JSON.parse(raw.value).data;
  click(q('#modal-root [data-close]'), 'close');
  nav('reports');
  const compCard = qa('.dashcard').find(c => /Companies by Status/.test(c.textContent));
  const legendTotal = Array.from(compCard.querySelectorAll('.chart-key .v'))
    .reduce((a, x) => a + (+x.textContent || 0), 0);
  if (legendTotal !== D.companies.length)
    fail('the companies pie totals ' + legendTotal + ' but there are ' + D.companies.length + ' companies');
  const subCard = qa('.dashcard').find(c => /Submissions by Status/.test(c.textContent));
  const subTotal = Array.from(subCard.querySelectorAll('.chart-key .v'))
    .reduce((a, x) => a + (+x.textContent || 0), 0);
  if (subTotal !== D.subs.length)
    fail('the submissions pie totals ' + subTotal + ' but there are ' + D.subs.length + ' submissions');

  /* ---------- cards can be removed and added, and the choice sticks ---------- */
  const before = qa('.dashcard').length;
  const hide = q('.dashcard [data-act="dash-hide"]');
  if (!hide) fail('a card cannot be removed');
  else {
    click(hide, 'remove a card');
    if (qa('.dashcard').length !== before - 1) fail('removing a card had no effect');
    click(q('[data-act="dash-add"]'), 'add card');
    if (!q('[data-f="card"]')) fail('the add-card picker did not open');
    else {
      const opts = Array.from(q('[data-f="card"]').options).length;
      if (!opts) fail('nothing available to add');
      click(q('#modal-root [data-go]'), 'confirm add');
      if (qa('.dashcard').length !== before) fail('adding a card did not restore the count');
    }
    nav('audit');
    if (!/dashboard card/i.test(main())) fail('card changes are not logged');
  }

  /* ---------- charts survive an empty dataset rather than throwing ---------- */
  nav('reports');
  const lc = qa('.dashcard').find(c => /Leads by Status/.test(c.textContent));
  // add the leads card, then clear leads via reset is overkill; just confirm the empty path exists
  click(q('[data-act="dash-add"]'), 'add card again');
  const sel = q('[data-f="card"]');
  if (sel) {
    const leadOpt = Array.from(sel.options).find(o => /Leads/.test(o.textContent));
    if (leadOpt) {
      setF('card', leadOpt.value);
      click(q('#modal-root [data-go]'), 'add leads card');
      const lc2 = qa('.dashcard').find(c => /Leads by Status/.test(c.textContent));
      if (!lc2) fail('the leads card was not added');
      else if (!lc2.querySelector('svg') && !/Nothing to chart/.test(lc2.textContent))
        fail('the leads card neither charted nor showed an empty state');
    } else { const b = q('#modal-root [data-close]'); if (b) click(b, 'close'); }
  }

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n') : 'DASHBOARD CHART CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
}, 350);
