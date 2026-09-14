/* The Reports tiles.

   Two things this guards. A trainee selector above every tile implied it
   narrowed all of them; it narrows two. And a Download button that floats
   after a short description while its neighbour sits lower makes a row of
   cards read as a list of unrelated things — so every button is pinned to
   its own footer. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const errors = []; const fail = m => errors.push(m);
function find(n){for(const d of ['.','..']){const p=path.join(d,n);if(fs.existsSync(p))return p;}return null;}
const STAFFP = find('staff.js');
if (!STAFFP) { console.log('SKIPPED (no staff.js beside the app)'); process.exit(0); }

const B = [{batch_id:'b1',batch_name:'Batch 1',mine:true,join_code:'B1'},
           {batch_id:'b2',batch_name:'Batch 2',mine:false,join_code:'B2'}];
const dom = new JSDOM('<!doctype html><html><body><div id="main"></div></body></html>',
  { runScripts:'outside-only', url:'https://x.test/' });
const w = dom.window;
w.Store = { whoami:()=>({role:'trainer',full_name:'T One'}),
  sb:()=>({ rpc:(n)=>Promise.resolve({
    data: n === 'rpt_batches' ? B : [{trainee:'Asha R'},{trainee:'Bilal K'}], error:null }) }) };
w.APP = { render:()=>{}, toast:()=>{} };
w.eval(fs.readFileSync(STAFFP,'utf8'));

setTimeout(() => {
  const d = w.document;
  d.getElementById('main').innerHTML = w.ATSStaff.render('staffreports');
  const cards = [...d.querySelectorAll('.st-card')];

  if (cards.length !== 5) fail('expected 5 report tiles, got ' + cards.length);

  const withWho = cards.filter(c => c.querySelector('[data-st="who"]'))
                       .map(c => c.querySelector('h3').textContent);
  if (withWho.length !== 2) fail('the trainee selector is on ' + withWho.length + ' tiles');
  if (!withWho.includes('Trainee scorecard')) fail('the scorecard has no trainee selector');
  if (!withWho.includes('Trainee footprint')) fail('the footprint has no trainee selector');
  if (d.querySelector('.st-scope [data-st="who"]'))
    fail('a trainee selector is still sitting above every report');

  if (d.querySelectorAll('.st-card .st-card-foot .btn[data-st="dl"]').length !== 5)
    fail('not every download button is pinned to its tile footer');

  const fp = cards.find(c => /Trainee footprint/.test(c.textContent));
  if (fp && !fp.querySelector('.btn[disabled]'))
    fail('the footprint download is not disabled until a trainee is chosen');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e=>' - '+e).join('\n')
    : 'REPORT TILE CHECKS PASSED');
  process.exit(errors.length?1:0);
}, 250);
