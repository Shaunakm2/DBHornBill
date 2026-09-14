/* Signed-out boot. The failure this guards against shipped once: app.js drew
   the desk before Store.init() was called, so an unauthenticated visitor got
   a dashboard of invented records painted over the sign-in card. */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const errors = []; const fail = m => errors.push(m);

function find(names) {
  for (const d of ['.', '..']) for (const n of names) {
    const p = path.join(d, n); if (fs.existsSync(p)) return p;
  }
  throw new Error('cannot find ' + names.join(', '));
}
const html = fs.readFileSync(find(['index.html']), 'utf8');
const APP = fs.readFileSync(find(['app.js']), 'utf8');
const SYNC = fs.existsSync('../sync.js') ? fs.readFileSync('../sync.js', 'utf8')
           : fs.existsSync('sync.js') ? fs.readFileSync('sync.js', 'utf8') : null;
if (!SYNC) { console.log('SKIPPED (no sync.js beside the app)'); process.exit(0); }

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://x.test/' });
const w = dom.window;
w.fetch = () => Promise.reject(new Error('offline'));
w.supabase = { createClient: () => ({
  auth: { getSession: () => Promise.resolve({ data: { session: null } }),
          signInWithPassword: () => Promise.resolve({ error: new Error('no') }),
          signOut: () => Promise.resolve() },
  from: () => ({ select: () => Promise.resolve({ data: [] }) }),
  channel: () => ({ on() { return this; }, subscribe() {} })
})};
w.eval('window.ATS_CONFIG={url:"https://x.supabase.co",anonKey:"k"}');
w.eval(SYNC);
w.eval(APP);

setTimeout(() => {
  const d = w.document, main = d.getElementById('main').textContent;
  if (!d.querySelector('.signin-card')) fail('the sign-in card is not on the page');
  if (/My Dashboard|Live job orders/.test(main)) fail('the desk rendered over the sign-in screen');
  if (d.querySelector('.fab')) fail('the practice-tasks button is visible signed out');
  if (/saved only in this browser/.test(d.getElementById('sandbox-note').textContent))
    fail('the banner still claims the data is browser-only');
  if (!d.getElementById('signout')) fail('there is no way to sign out');
  if (!d.getElementById('mmode')) fail('there is no way to reach account administration');
  console.log(errors.length ? 'FAILURES:\n' + errors.map(e => ' - ' + e).join('\n')
    : 'SIGNED-OUT BOOT CHECKS PASSED');
  process.exit(errors.length ? 1 : 0);
}, 400);
