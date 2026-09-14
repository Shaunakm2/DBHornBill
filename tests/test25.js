/* The Training operations section.

   Two things to hold: a trainee must never be shown it, and a trainer must
   see their own batches separately from everyone else's — because the
   numbers for another trainer's batch are readable and the records inside
   it are not, and a board that blurs the two invites the wrong click. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const errors = []; const fail = m => errors.push(m);
function find(n) { for (const d of ['.','..']) { const p = path.join(d,n); if (fs.existsSync(p)) return p; } return null; }
const STAFFP = find('staff.js');
if (!STAFFP) { console.log('SKIPPED (no staff.js beside the app)'); process.exit(0); }
const html = fs.readFileSync(find('index.html'),'utf8');
const APP = fs.readFileSync(find('app.js'),'utf8');
const SYNC = fs.readFileSync(find('sync.js'),'utf8');

const BATCHES = [
  { batch_id:'b1', batch_name:'Batch 1', join_code:'B1', mode:'collaborative', status:'active',
    desk_type:'d180', trainer:'T One', mine:true, trainees:4, job_orders:2, open_jobs:2,
    candidates:3, submissions:5, sent_to_client:1, awaiting_review:2, awaiting_trainee:1,
    oldest_waiting_hours:48, started:null, last_activity:null },
  { batch_id:'b2', batch_name:'Batch 2', join_code:'B2', mode:'parallel', status:'active',
    desk_type:'d180', trainer:'T Two', mine:false, trainees:3, job_orders:1, open_jobs:1,
    candidates:1, submissions:1, sent_to_client:0, awaiting_review:0, awaiting_trainee:0,
    oldest_waiting_hours:null, started:null, last_activity:null }
];

function boot(profile) {
  const dom = new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://x.test/'});
  const w = dom.window;
  w.fetch = () => Promise.reject(new Error('offline'));
  const q = (data) => { const o = { eq:()=>o, is:()=>o, order:()=>o, single:()=>Promise.resolve({data:profile}),
      then:(f)=>Promise.resolve({data,error:null}).then(f) }; return o; };
  w.supabase = { createClient: () => ({
    auth:{ getSession:()=>Promise.resolve({data:{session:{user:{id:'u1'},access_token:'t'}}}),
           signOut:()=>Promise.resolve() },
    from:(t)=> ({ select:()=>q(t==='batches'
        ? [{id:'b1',name:'Batch 1',join_code:'B1',mode:'collaborative',status:'active',desk_type:'d180'}]
        : []) }),
    rpc:(n)=> Promise.resolve({ data: n==='rpt_batches'?BATCHES:[], error:null }),
    channel:()=>({on(){return this;},subscribe(){}}), removeChannel(){} })};
  w.eval('window.ATS_CONFIG={url:"https://x.supabase.co",anonKey:"k"}');
  w.eval(SYNC); w.eval(fs.readFileSync(STAFFP,'utf8')); w.eval(APP);
  return w;
}

const trainer = boot({id:'u1',role:'trainer',full_name:'T One',is_active:true});
const trainee = boot({id:'u1',role:'trainee',full_name:'Asha R',employee_id:'E1',is_active:true});

setTimeout(() => {
  const rail = (w) => (w.document.getElementById('rail')||{}).textContent || '';

  if (!/Training operations/.test(rail(trainer))) fail('a trainer has no Training operations section');
  ['Overview','Reports','Accounts and batches'].forEach(t => {
    if (!new RegExp(t).test(rail(trainer))) fail('the trainer rail is missing ' + t);
  });
  if (/Training operations/.test(rail(trainee))) fail('a trainee is shown the staff section');
  if (trainee.document.querySelector('#rail [data-go="overview"]'))
    fail('a trainee can reach Overview from the rail');

  // Open Overview as the trainer.
  const go = trainer.document.querySelector('#rail [data-go="overview"]');
  if (!go) { fail('Overview is not reachable'); }
  else {
    go.dispatchEvent(new trainer.MouseEvent('click',{bubbles:true}));
    setTimeout(() => {
      const main = trainer.document.getElementById('main').textContent;
      if (!/Your batches/.test(main)) fail('the trainer is not shown their own batches separately');
      if (!/Other batches/.test(main)) fail('other trainers\' batches are not shown');
      if (!/Numbers only/.test(main)) fail('the read-only nature of other batches is not stated');
      if (!/waiting on you/.test(main)) fail('the queue depth is not surfaced');
      if (!trainer.document.querySelector('.st-hot')) fail('nothing is flagged as needing attention');
      done();
    }, 250);
  }
  if (!go) done();

  function done() {
    console.log(errors.length ? 'FAILURES:\n' + errors.map(e=>' - '+e).join('\n')
      : 'STAFF SECTION CHECKS PASSED');
    process.exit(errors.length?1:0);
  }
}, 500);
