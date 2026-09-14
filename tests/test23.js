/* Boot states that are not failures. An administrator on day one has no
   batches, which used to abort startup and leave them staring at the boot
   placeholder — unable to reach the one screen that would have fixed it. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const errors = []; const fail = m => errors.push(m);
function find(n) { for (const d of ['.','..']) { const p = path.join(d,n); if (fs.existsSync(p)) return p; } return null; }
const html = fs.readFileSync(find('index.html'),'utf8');
const APP = fs.readFileSync(find('app.js'),'utf8');
const SYNCP = find('sync.js'); if (!SYNCP) { console.log('SKIPPED'); process.exit(0); }
const SYNC = fs.readFileSync(SYNCP,'utf8');
const ADMINP = find('admin.js');

function boot(profile, batches) {
  const dom = new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'https://x.test/'});
  const w = dom.window;
  w.fetch = () => Promise.reject(new Error('offline'));
  const table = (name) => ({
    select: () => { const q = {
      eq: () => q, is: () => q, order: () => q, single: () => Promise.resolve({data:profile}),
      then: (f) => Promise.resolve({ data: name==='batches'?batches:[], error:null }).then(f) };
      return q; },
    insert: () => ({ select: () => ({ single: () => Promise.resolve({data:{}}) }) }),
    update: () => ({ eq: () => Promise.resolve({}) })
  });
  w.supabase = { createClient: () => ({
    auth: { getSession: () => Promise.resolve({data:{session:{user:{id:'u1'},access_token:'t'}}}),
            signOut: () => Promise.resolve() },
    from: table, rpc: () => Promise.resolve({data:[]}),
    channel: () => ({ on(){return this;}, subscribe(){} }), removeChannel(){} })};
  w.eval('window.ATS_CONFIG={url:"https://x.supabase.co",anonKey:"k"}');
  w.eval(SYNC); if (ADMINP) w.eval(fs.readFileSync(ADMINP,'utf8')); w.eval(APP);
  return w;
}

const admin = boot({id:'u1',role:'super_admin',full_name:'S Admin'}, []);
const trainee = boot({id:'u1',role:'trainee',full_name:'Asha R',employee_id:'E1001'}, []);

setTimeout(() => {
  const a = admin.document, t = trainee.document;
  const am = a.getElementById('main').textContent;
  if (/did not load or could not run/.test(am)) fail('admin with no batch is left on the boot placeholder');
  if (!/No batches yet/.test(am)) fail('admin with no batch is not told what to do');
  if (!a.querySelector('[data-act="manage"]')) fail('admin cannot reach Manage to create the first batch');
  if (a.getElementById('mmode') && a.getElementById('mmode').hidden) fail('the Manage link is hidden from the admin');
  if (a.getElementById('signout') && a.getElementById('signout').hidden) fail('the admin cannot sign out');
  if (/My Dashboard|Live job orders/.test(am)) fail('the seeded desk rendered for an admin with no batch');

  const tm = t.getElementById('main').textContent;
  if (/did not load or could not run/.test(tm)) fail('trainee with no batch is left on the boot placeholder');
  if (!/not on a batch yet/i.test(tm)) fail('trainee with no batch is not told why');
  if (!t.getElementById('mmode').hidden) fail('the Manage link is visible to a trainee');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(e=>' - '+e).join('\n')
    : 'EMPTY-STATE BOOT CHECKS PASSED');
  process.exit(errors.length?1:0);
}, 500);
