/* The Manage roster: filtering, sorting, and keeping focus while typing.
   A roster of 150 with no way to narrow it is a scrolling exercise, and a
   search box that loses focus on each keystroke is worse than none. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const errors = []; const fail = m => errors.push(m);
function find(n){for(const d of ['.','..']){const p=path.join(d,n);if(fs.existsSync(p))return p;}return null;}
const ADMINP = find('admin.js');
if (!ADMINP) { console.log('SKIPPED (no admin.js beside the app)'); process.exit(0); }

const roster = [
 {id:'1',role:'super_admin',full_name:'S Admin',employee_id:null,email:'a@b.com',is_active:true,batches:1},
 {id:'2',role:'trainer',full_name:'T One',employee_id:'E9001',email:'t@b.com',is_active:true,batches:2},
 {id:'3',role:'trainee',full_name:'Asha R',employee_id:'E1',email:null,is_active:true,batches:1},
 {id:'4',role:'trainee',full_name:'Chen W',employee_id:'E3',email:null,is_active:true,batches:0},
 {id:'5',role:'trainee',full_name:'Gita M',employee_id:'E7',email:null,is_active:false,batches:0}];

const dom = new JSDOM('<!doctype html><html><body><div id="modal-root"></div></body></html>',
  { runScripts:'outside-only', url:'https://x.test/' });
const w = dom.window;
w.ATS_CONFIG = { url:'https://x.supabase.co', anonKey:'k' };
w.Store = { whoami:()=>({id:'1',role:'super_admin',full_name:'S Admin'}),
  sb:()=>({ from:()=>({ select:()=>({ order:()=>Promise.resolve({data:[],error:null}),
      then:f=>Promise.resolve({data:[],error:null}).then(f) }) }),
    rpc:()=>Promise.resolve({data:roster,error:null}),
    auth:{ getSession:()=>Promise.resolve({data:{session:{access_token:'t'}}}) } }),
  reload:()=>{} };
w.APP = { toast:()=>{} };
w.eval(fs.readFileSync(ADMINP,'utf8'));
w.ATSAdmin.open();

setTimeout(() => {
  const d = w.document;
  d.querySelector('[data-tab="accounts"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  const rows = () => d.querySelectorAll('.ad-table tbody tr').length;
  const set = (k,v) => { const el = d.querySelector('[data-f="'+k+'"]'); el.value = v;
    el.dispatchEvent(new w.Event(el.tagName === 'SELECT' ? 'change' : 'input',{bubbles:true})); };

  if (!d.querySelector('.ad-filter')) fail('there is no filter bar');
  if (rows() !== 5) fail('the roster does not list everyone');
  set('role','trainee'); if (rows() !== 3) fail('filtering by role is wrong');
  set('role',''); set('status','unassigned');
  if (rows() !== 2) fail('filtering to trainees on no batch is wrong');
  set('status',''); set('q','E9'); if (rows() !== 1) fail('search is wrong');
  if (!(d.activeElement && d.activeElement.dataset && d.activeElement.dataset.f === 'q'))
    fail('the search box loses focus while typing');
  set('q',''); set('sort','batches');
  if (!/T One/.test(d.querySelector('.ad-table tbody tr td').textContent))
    fail('sorting by batch count is wrong');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e=>' - '+e).join('\n')
    : 'ROSTER FILTER CHECKS PASSED');
  process.exit(errors.length?1:0);
}, 300);
