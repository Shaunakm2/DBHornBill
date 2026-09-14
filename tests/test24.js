/* The Manage panel against a database that answers badly.

   The failure this guards against: only the first of three responses was
   checked, so a 404 on the roster produced a screen listing nobody and
   saying nothing — which reads as an accurate answer rather than a fault. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const errors = []; const fail = m => errors.push(m);
function find(n) { for (const d of ['.','..']) { const p = path.join(d,n); if (fs.existsSync(p)) return p; } return null; }
const ADMINP = find('admin.js');
if (!ADMINP) { console.log('SKIPPED (no admin.js beside the app)'); process.exit(0); }

function panel(rosterResult) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>',
    { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://x.test/' });
  const w = dom.window;
  w.ATS_CONFIG = { url: 'https://x.supabase.co', anonKey: 'k' };
  w.Store = {
    whoami: () => ({ id: 'u1', role: 'super_admin', full_name: 'S Admin' }),
    sb: () => ({
      from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }),
                                      then: (f) => Promise.resolve({ data: [], error: null }).then(f) }) }),
      rpc: () => Promise.resolve(rosterResult),
      auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 't' } } }) }
    }),
    reload: () => {}
  };
  w.APP = { toast: () => {} };
  w.eval(fs.readFileSync(ADMINP, 'utf8'));
  w.ATSAdmin.open();
  return w;
}

/* A function that is not exposed through the API. */
const broken = panel({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
/* A working database with nobody in it yet. */
const empty = panel({ data: [], error: null });

setTimeout(() => {
  const b = broken.document.querySelector('.ad-body').textContent;
  if (!/Could not load roster/.test(b)) fail('a failed roster load is not reported');
  if (!/migration/i.test(b)) fail('a missing function does not point at the migrations');
  if (!broken.document.querySelector('.ad-err')) fail('the failure is not shown inside the panel');

  const e = empty.document.querySelector('.ad-body');
  if (e.querySelector('.ad-err')) fail('an empty roster is reported as an error');

  console.log(errors.length ? 'FAILURES:\n' + errors.map(x => ' - ' + x).join('\n')
    : 'ADMIN PANEL CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
}, 300);
