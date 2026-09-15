/* One roster, two mounts.

   staff.js owns the accounts screen. The Manage panel shows the same markup
   by delegating to it. There were two implementations; filters were added to
   one and not the other, and a whole debugging round went to looking at the
   wrong screen. This fails if a second copy ever grows back. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const errors = []; const fail = m => errors.push(m);
function find(n){for(const d of ['.','..']){const p=path.join(d,n);if(fs.existsSync(p))return p;}return null;}
const STAFFP = find('staff.js'), ADMINP = find('admin.js');
if (!STAFFP || !ADMINP) { console.log('SKIPPED'); process.exit(0); }

const R = [
 {id:'1',role:'super_admin',full_name:'S Admin',employee_id:null,email:'a@b.com',is_active:true,batches:1},
 {id:'2',role:'trainer',full_name:'T One',employee_id:'E9001',email:'t@b.com',is_active:true,batches:2},
 {id:'3',role:'trainee',full_name:'Asha R',employee_id:'E1',email:null,is_active:true,batches:1},
 {id:'4',role:'trainee',full_name:'Chen W',employee_id:'E3',email:null,is_active:true,batches:0},
 {id:'5',role:'trainee',full_name:'Gita M',employee_id:'E7',email:null,is_active:false,batches:0}];

const dom = new JSDOM('<!doctype html><html><body><div id="main"></div><div id="modal-root"></div></body></html>',
  { runScripts:'outside-only', url:'https://x.test/' });
const w = dom.window;
w.ATS_CONFIG = { url:'https://x.supabase.co', anonKey:'k' };
const q = (data) => { const o = { eq:()=>o, order:()=>o, single:()=>Promise.resolve({data:null}),
  then:f=>Promise.resolve({data,error:null}).then(f) }; return o; };
w.Store = { whoami:()=>({id:'1',role:'super_admin',full_name:'S Admin'}),
  sb:()=>({ from:()=>({ select:()=>q([]) }),
    rpc:(n)=>Promise.resolve({ data: n==='roster' ? R : [], error:null }),
    auth:{ getSession:()=>Promise.resolve({data:{session:{access_token:'t'}}}) } }),
  reload:()=>{}, repaint:()=>paint() };
const paint = () => { w.document.getElementById('main').innerHTML = w.ATSStaff.render('accounts'); };
w.APP = { render:()=>paint(), toast:()=>{} };
w.eval(fs.readFileSync(STAFFP,'utf8'));
w.eval(fs.readFileSync(ADMINP,'utf8'));
paint();

setTimeout(() => {
  const d = w.document;
  const rows = () => d.querySelectorAll('#main .st-table tbody tr').length;
  if (!d.querySelector('#main .ad-filter')) fail('the screen has no filter bar');
  if (rows() !== 5) fail('the roster does not list everyone');

  const set = (k,v) => { const el = d.querySelector('#main [data-sf="'+k+'"]'); el.value = v;
    el.dispatchEvent(new w.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true})); };
  set('role','trainee'); if (rows() !== 3) fail('filtering by role is wrong');
  set('role',''); set('status','unassigned');
  if (rows() !== 2) fail('filtering to trainees on no batch is wrong');
  set('status',''); set('q','E9'); if (rows() !== 1) fail('search is wrong');
  if (!(d.activeElement && d.activeElement.dataset && d.activeElement.dataset.sf === 'q'))
    fail('the search box loses focus while typing');

  /* The panel must show the same thing, not its own version of it. */
  if (!w.ATSStaff.roster) fail('staff.js does not expose the roster for reuse');
  const frag = w.ATSStaff.roster();
  if (!/ad-filter/.test(frag)) fail('the reusable roster has no filter bar');
  const adminSrc = fs.readFileSync(ADMINP,'utf8');
  if (/ad-filter/.test(adminSrc)) fail('admin.js has grown its own roster filters again');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e=>' - '+e).join('\n')
    : 'SINGLE ROSTER CHECKS PASSED');
  process.exit(errors.length?1:0);
}, 350);
