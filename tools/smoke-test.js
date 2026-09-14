/* GG Learning Labs — Headless smoke test.  Run: node tools/smoke-test.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const store = new Map();
const localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};
const documentShim = {
  documentElement: { getAttribute: () => './', setAttribute: () => {} },
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener: () => {}, dispatchEvent: () => {},
  createElement: () => ({ setAttribute(){}, appendChild(){}, addEventListener(){},
    style:{}, classList:{ add(){}, remove(){} } })
};
const sandbox = { window:{}, document:documentShim, localStorage, console,
  setTimeout, clearTimeout, Promise, Intl, Math, Date, JSON, Object, Array, String,
  Number, URLSearchParams, matchMedia: () => ({ matches:false, addEventListener(){}, addListener(){} }) };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

['assets/js/core.js','assets/js/data.js','assets/js/services.js'].forEach(f => {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'), sandbox, { filename:f }); }
  catch (e) { console.error(`✗ loading ${f}: ${e.message}`); process.exit(1); }
});

const GGL = sandbox.GGL;
let pass = 0, fail = 0;
function check(label, fn) {
  try {
    const r = fn();
    if (r === true || r === undefined) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label} — ${r}`); }
  } catch (e) { fail++; console.log(`  ✗ ${label} — threw: ${e.message}`); }
}
async function checkAsync(label, fn) {
  try {
    const r = await fn();
    if (r === true || r === undefined) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label} — ${r}`); }
  } catch (e) { fail++; console.log(`  ✗ ${label} — threw: ${e.message}`); }
}

(async function run() {
  console.log('\nGG Learning Labs — smoke test\n');

  console.log('Data layer');
  check('users generated', () => GGL.data.users.length > 100 || `only ${GGL.data.users.length}`);
  check('five demo accounts', () => GGL.data.demoAccounts.length === 5);
check('individual upskiller demo exists', () => GGL.data.demoAccounts.some(x => x.email === 'individual@example.com' && x.workspaceType === 'individual'));
check('trainer demo exists', () => GGL.data.demoAccounts.some(x => x.email === 'trainer@example.com' && x.role === GGL.ROLES.TRAINER));
  check('user ids unique', () => new Set(GGL.data.users.map(u=>u.id)).size === GGL.data.users.length);
  check('courses generated', () => GGL.data.courses.length >= 20);
  check('batches generated', () => GGL.data.batches.length >= 20);
  check('sessions sorted chronologically', () => {
    const s = GGL.data.sessions;
    return s.every((x,i)=> i===0 || new Date(s[i-1].start) <= new Date(x.start)) || 'out of order';
  });
  check('completedCourses <= assignedCourses', () =>
    GGL.data.users.filter(u=>u.role==='end_user')
      .every(u=>u.completedCourses <= u.assignedCourses) || 'inconsistent');

  console.log('\nUtilities');
  check('esc escapes angle brackets', () => GGL.utils.esc('<b>x</b>') === '&lt;b&gt;x&lt;/b&gt;');
  check('initials from two names', () => GGL.utils.initials('Kavya Nair') === 'KN');
  check('duration formats hours', () => GGL.utils.duration(90) === '1h 30m');
  check('sort does not mutate input', () => {
    const input = [{v:3},{v:1}];
    GGL.utils.sort(input,'v','asc');
    return input[0].v === 3;
  });
  check('paginate clamps overflow page', () => GGL.utils.paginate([1,2,3],99,2).page === 2);
  check('paginate handles empty set', () => {
    const p = GGL.utils.paginate([],1,10);
    return p.pages===1 && p.total===0 && p.from===0;
  });
  check('progressCell clamps above 100', () =>
    GGL.utils.progressCell(180).indexOf('width:100%') !== -1);
  check('email validator rejects bad input', () => GGL.utils.validators.email('nope') !== true);

  console.log('\nIcons & navigation');
  check('all nav icons exist', () => {
    const missing = [];
    GGL.NAV.forEach(g=>g.items.forEach(i=>{ if (GGL.iconNames.indexOf(i.icon)===-1) missing.push(i.icon); }));
    return missing.length === 0 || `missing: ${missing.join(', ')}`;
  });
  check('badge icons exist', () =>
    GGL.data.badgeCatalogue.every(b=>GGL.iconNames.indexOf(b.icon)!==-1) || 'unknown icon');
  check('super admin sees admin nav', () => {
    const l = GGL.navFor('super_admin').flatMap(g=>g.items.map(i=>i.label));
    return l.indexOf('Users')!==-1 && l.indexOf('Audit Log')!==-1;
  });
  check('admin cannot see platform settings', () =>
    GGL.navFor('admin').flatMap(g=>g.items.map(i=>i.label)).indexOf('Platform Settings') === -1);
  check('learner cannot see user management', () =>
    GGL.navFor('end_user').flatMap(g=>g.items.map(i=>i.label)).indexOf('Users') === -1);
  check('no navigation item marked coming soon', () => {
    const soon = [];
    GGL.NAV.forEach(g=>g.items.forEach(i=>{ if (i.soon) soon.push(i.label); }));
    return soon.length === 0 || soon.join(', ');
  });
  check('every navigation target resolves to a file', () => {
    const missing = [];
    GGL.NAV.forEach(g=>g.items.forEach(i=>{
      if (i.href && !fs.existsSync(path.join(ROOT,i.href))) missing.push(i.href);
    }));
    return missing.length === 0 || missing.join(', ');
  });

  console.log('\nAuth');
  await checkAsync('rejects unknown email', async () => {
    try { await GGL.services.auth.signIn('nobody@example.com','password123'); return 'should have thrown'; }
    catch { return true; }
  });
  await checkAsync('rejects short password', async () => {
    try { await GGL.services.auth.signIn('admin@example.com','123'); return 'should have thrown'; }
    catch { return true; }
  });
  await checkAsync('accepts demo admin', async () => {
    const r = await GGL.services.auth.signIn('admin@example.com','demo1234');
    return r.user.role === 'admin' || 'wrong role';
  });
  check('isAdminLevel true for admin', () => GGL.services.auth.isAdminLevel() === true);
  await checkAsync('role switch works', async () => {
    await GGL.services.auth.switchRole('end_user');
    return GGL.services.auth.getUser().role === 'end_user' || 'switch failed';
  });
  check('isAdminLevel false for learner', () => GGL.services.auth.isAdminLevel() === false);
  await checkAsync('sign out clears session', async () => {
    await GGL.services.auth.signOut();
    return GGL.services.auth.isAuthenticated() === false || 'still signed in';
  });

  console.log('\nServices');
  await checkAsync('users list paginates', async () => {
    const r = await GGL.services.users.list({ page:1, size:10 });
    return (r.rows.length===10 && r.total>10) || 'bad pagination';
  });
  await checkAsync('listByRole filters correctly', async () => {
    const r = await GGL.services.users.listByRole('admin', { size:100 });
    return r.all.every(u=>u.role==='admin') || 'role leak';
  });
  await checkAsync('user stats add up', async () => {
    const s = await GGL.services.users.stats();
    return s.superAdmins + s.admins + s.trainers + s.learners === s.total || 'totals mismatch';
  });
  await checkAsync('create persists', async () => {
    const c = await GGL.services.users.create({ name:'Test Person',
      email:'test.person@example.com', role:'end_user', status:'Active' });
    const f = await GGL.services.users.get(c.id);
    return f.name === 'Test Person' || 'not found after create';
  });
  await checkAsync('delete of a seeded record persists', async () => {
    const before = await GGL.services.courses.list({ size:100 });
    const target = before.all[0];
    await GGL.services.courses.remove(target.id);
    const after = await GGL.services.courses.list({ size:100 });
    return after.all.every(c=>c.id!==target.id) || 'seeded delete ignored';
  });
  check('reset restores seeded data', () => {
    GGL.resetPrototypeData();
    return GGL.services.courses.allSync().length === GGL.data.courses.length || 'reset failed';
  });
  await checkAsync('attendance summary coherent', async () => {
    const s = await GGL.services.attendance.summary();
    return s.present+s.late+s.absent+s.excused === s.total || 'counts mismatch';
  });
  await checkAsync('every catalogue report runs', async () => {
    const cat = await GGL.services.reports.catalogue();
    for (const r of cat) {
      const res = await GGL.services.reports.run(r.id);
      if (!res.report) return `report ${r.id} returned nothing`;
    }
    return true;
  });
  await checkAsync('learner progress coherent', async () => {
    const p = await GGL.services.learning.progress();
    return p.completed+p.inProgress+p.notStarted === p.assigned || 'progress mismatch';
  });
  await checkAsync('progress never exceeds 100', async () => {
    const rows = await GGL.services.learning.myLearning();
    const t = rows.find(r=>r.status==='In Progress') || rows[0];
    const res = await GGL.services.learning.advance(t.id, 500);
    return res.progress === 100 || `got ${res.progress}`;
  });

  console.log('\nAssessments, certificates & gamification');
  check('assessments generated', () => GGL.data.assessments.length >= 30);
  check('every question has a valid answer key', () =>
    GGL.data.assessments.every(a=>a.questions.every(q=>q.correct>=0 && q.correct<q.options.length))
      || 'bad answer key');
  check('attempts reference real assessments', () => {
    const ids = new Set(GGL.data.assessments.map(a=>a.id));
    return GGL.data.attempts.every(t=>ids.has(t.assessmentId)) || 'orphan attempt';
  });
  check('pass flag matches score vs pass mark', () => {
    const byId = {};
    GGL.data.assessments.forEach(a=>{ byId[a.id]=a; });
    return GGL.data.attempts.every(t=>t.passed === (t.score >= byId[t.assessmentId].passMark))
      || 'pass flag inconsistent';
  });
  check('post assessments outscore pre on average', () => {
    const avg = st => {
      const r = GGL.data.attempts.filter(t=>t.stage===st);
      return r.reduce((s,x)=>s+x.score,0)/r.length;
    };
    return avg('Post') > avg('Pre') || 'no measurable knowledge gain';
  });
  check('certificates only for passed post attempts', () =>
    GGL.data.certificates.every(c=>{
      const t = GGL.data.attempts.find(x=>x.userId===c.userId && x.courseId===c.courseId && x.stage==='Post');
      return t && t.passed;
    }) || 'certificate without a passing attempt');
  check('one certificate per learner per course', () => {
    const seen = new Set();
    return GGL.data.certificates.every(c=>{
      const k = c.userId+'|'+c.courseId;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    }) || 'duplicate certificate';
  });
  check('certificate serials unique', () =>
    new Set(GGL.data.certificates.map(c=>c.serial)).size === GGL.data.certificates.length);
  check('every point entry maps to a known rule', () =>
    GGL.data.points.every(p=>GGL.data.pointRules[p.type]) || 'unknown point type');
  check('effectiveness matches attempt data', () => {
    const bad = GGL.data.effectiveness.filter(e=>{
      const post = GGL.data.attempts.filter(t=>t.courseId===e.courseId && t.stage==='Post');
      if (!post.length) return false;
      return e.postScore !== Math.round(post.reduce((s,t)=>s+t.score,0)/post.length);
    });
    return bad.length === 0 || `${bad.length} mismatched course(s)`;
  });
  await checkAsync('leaderboard ranked descending', async () => {
    const rows = await GGL.services.gamification.leaderboard();
    return rows.every((r,i)=> i===0 || rows[i-1].points >= r.points) || 'not sorted';
  });
  await checkAsync('leaderboard ranks sequential', async () => {
    const rows = await GGL.services.gamification.leaderboard();
    return rows.every((r,i)=>r.rank===i+1) || 'rank gap';
  });
  await checkAsync('certificate stats add up', async () => {
    const st = await GGL.services.certificates.stats();
    return st.issued+st.expired+st.revoked === st.total || 'status totals mismatch';
  });
  await checkAsync('revoke then reinstate round-trips', async () => {
    const all = await GGL.services.certificates.all();
    const t = all.find(c=>c.status==='Issued');
    await GGL.services.certificates.revoke(t.id,'test');
    let a = await GGL.services.certificates.get(t.id);
    if (a.status !== 'Revoked') return 'revoke failed';
    await GGL.services.certificates.reinstate(t.id);
    a = await GGL.services.certificates.get(t.id);
    return a.status === 'Issued' || 'reinstate failed';
  });

  console.log('\nSubmitting an attempt (the cross-module write)');
  await checkAsync('grades a fully correct submission as 100%', async () => {
    await GGL.services.auth.signIn('user@example.com','demo1234');
    const all = await GGL.services.assessments.all();
    const t = all.find(a=>a.stage==='Post' && a.status==='Published' && a.courseId);
    const answers = {};
    t.questions.forEach(q=>{ answers[q.id]=q.correct; });
    const res = await GGL.services.assessments.submitAttempt(t.id, answers);
    return (res.score===100 && res.passed) || `got ${res.score}`;
  });
  await checkAsync('a passed post-assessment issues a certificate', async () => {
    const all = await GGL.services.assessments.all();
    const user = GGL.services.auth.getUser();
    const held = (await GGL.services.certificates.forUser(user.id)).map(c=>c.courseId);
    const t = all.find(a=>a.stage==='Post' && a.status==='Published' && a.courseId &&
      held.indexOf(a.courseId)===-1);
    const answers = {};
    t.questions.forEach(q=>{ answers[q.id]=q.correct; });
    const res = await GGL.services.assessments.submitAttempt(t.id, answers);
    return (res.certificate && res.certificate.status==='Issued') || 'no certificate issued';
  });
  await checkAsync('the same attempt awards points', async () => {
    const st = await GGL.services.gamification.standing(GGL.services.auth.getUser().id);
    return st.points > 0 || 'no points awarded';
  });
  await checkAsync('grades a wrong submission as 0% and does not certify', async () => {
    const all = await GGL.services.assessments.all();
    const t = all.find(a=>a.stage==='Post' && a.status==='Published');
    const answers = {};
    t.questions.forEach(q=>{ answers[q.id]=(q.correct+1)%q.options.length; });
    const res = await GGL.services.assessments.submitAttempt(t.id, answers);
    return (res.score===0 && !res.passed && !res.certificate) || `got ${res.score}`;
  });
  await checkAsync('submitting to an unknown assessment throws', async () => {
    try { await GGL.services.assessments.submitAttempt('nope_999', {}); return 'should have thrown'; }
    catch { return true; }
  });
  await checkAsync('badges re-evaluate after activity', async () => {
    const b = await GGL.services.gamification.badgesFor(GGL.services.auth.getUser().id);
    return b.some(x=>x.earned) || 'no badge earned';
  });
  await GGL.services.auth.signOut();

  console.log('\nTrainer Observation Form (client instrument)');
  check('seven sections transcribed', () => GGL.data.tofSections.length === 7);
  check('36 criteria in total', () => {
    const n = GGL.data.tofSections.reduce((a,s)=>a+s.criteria.length,0);
    return n === 36 || `got ${n}`;
  });
  check('section sizes match the workbook', () => {
    const s = GGL.data.tofSections.map(x=>x.criteria.length).join(',');
    return s === '4,3,4,11,5,6,3' || s;
  });
  check('all-max ratings score 100%', () => {
    const r = {};
    GGL.data.tofSections.forEach(s=>s.criteria.forEach(c=>{ r[c.id]=GGL.data.tofMax; }));
    return GGL.data.scoreTof(r).overall === 100 || GGL.data.scoreTof(r).overall;
  });
  check('all-zero ratings score 0%', () => {
    const r = {};
    GGL.data.tofSections.forEach(s=>s.criteria.forEach(c=>{ r[c.id]=0; }));
    return GGL.data.scoreTof(r).overall === 0;
  });
  check('overall is the mean of section scores', () => {
    const r = {};
    GGL.data.tofSections.forEach((s,i)=>s.criteria.forEach(c=>{ r[c.id]= i%2===0 ? 3 : 1; }));
    const out = GGL.data.scoreTof(r);
    const mean = out.sections.reduce((a,s)=>a+s.score,0)/out.sections.length;
    return Math.abs(out.overall - Math.round(mean*10)/10) < 0.05 || 'mean mismatch';
  });
  check('unrated criteria excluded, not zeroed', () => {
    const all = {}, partial = {};
    GGL.data.tofSections[0].criteria.forEach((c,i)=>{
      all[c.id]=3;
      if (i===0) partial[c.id]=3;
    });
    const a = GGL.data.scoreTof(all).sections[0].score;
    const b = GGL.data.scoreTof(partial).sections[0].score;
    return (a===100 && b===100) || `all=${a} partial=${b}`;
  });
  check('generated TOF records carry section scores', () =>
    GGL.data.tofRecords.every(r=>r.sections && r.sections.length===7));

  console.log('\nEffectiveness calculator (reproduces the workbook)');
  check('weights are L1 30 / TOF 30 / Thr 20 / Util 15 / Att 5', () => {
    const w = GGL.data.effWeights.map(x=>x.weight).join(',');
    return w === '0.3,0.3,0.2,0.15,0.05' || w;
  });
  check('weights sum to exactly 1', () => {
    const t = GGL.data.effWeights.reduce((a,w)=>a+w.weight,0);
    return Math.abs(t-1) < 1e-9 || t;
  });
  check('Nikita row reproduces 94.66%', () => {
    const o = GGL.data.calcEffectiveness({ l1:92.7, tof:91.5, throughput:95.5, utilization:102, attendance:100 });
    return Math.abs(o.effectiveness - 94.66) < 1e-6 || o.effectiveness;
  });
  check('Nikita rates Effective with no gaps', () => {
    const o = GGL.data.calcEffectiveness({ l1:92.7, tof:91.5, throughput:95.5, utilization:102, attendance:100 });
    return (o.rating==='Effective' && o.improvement==='No Improvement Required')
      || `${o.rating} / ${o.improvement}`;
  });
  check('Vandana row reproduces 91.8925%', () => {
    const o = GGL.data.calcEffectiveness({ l1:94.8, tof:86.96, throughput:93.75, utilization:97.43, attendance:80 });
    return Math.abs(o.effectiveness - 91.8925) < 1e-6 || o.effectiveness;
  });
  check('Vandana flags TOF and Attendance', () => {
    const o = GGL.data.calcEffectiveness({ l1:94.8, tof:86.96, throughput:93.75, utilization:97.43, attendance:80 });
    return o.improvement === 'TOF, Attendance' || o.improvement;
  });
  check('Vandana rates Needs Improvement despite 91.9% total', () => {
    const o = GGL.data.calcEffectiveness({ l1:94.8, tof:86.96, throughput:93.75, utilization:97.43, attendance:80 });
    return o.rating === 'Needs Improvement' || o.rating;
  });
  check('workbook dashboard average reproduces 93.28%', () => {
    const a = GGL.data.calcEffectiveness({ l1:92.7, tof:91.5, throughput:95.5, utilization:102, attendance:100 }).effectiveness;
    const b = GGL.data.calcEffectiveness({ l1:94.8, tof:86.96, throughput:93.75, utilization:97.43, attendance:80 }).effectiveness;
    return Math.abs((a+b)/2 - 93.27625) < 1e-6 || (a+b)/2;
  });
  check('a component below 90% always forces Needs Improvement', () => {
    const o = GGL.data.calcEffectiveness({ l1:100, tof:100, throughput:100, utilization:100, attendance:89 });
    return o.rating === 'Needs Improvement' || o.rating;
  });
  check('both reference rows present in the data', () => {
    const n = GGL.data.effRecords.filter(r=>r.source==='Workbook').map(r=>r.trainer);
    return (n.indexOf('Nikita')!==-1 && n.indexOf('Vandana')!==-1) || n.join(',');
  });
  check('stored records agree with a fresh calculation', () => {
    const bad = GGL.data.effRecords.filter(r=>{
      const o = GGL.data.calcEffectiveness(r);
      return Math.abs(o.effectiveness - r.effectiveness) > 1e-6 || o.rating !== r.rating;
    });
    return bad.length === 0 || `${bad.length} drifted`;
  });
  await checkAsync('submitting a TOF updates the effectiveness record', async () => {
    const trainer = GGL.data.trainers[0];
    const ratings = {};
    GGL.data.tofSections.forEach(s=>s.criteria.forEach(c=>{ ratings[c.id]=3; }));
    await GGL.services.tof.submit({ trainerId:trainer.id, trainer:trainer.name, evaluator:'Test',
      observationDate:new Date().toISOString(), topic:'Test session',
      ratings, recommendations:'Test recommendation text.' });
    const rows = await GGL.services.effectivenessCalc.all();
    const rec = rows.find(r=>r.trainerId===trainer.id);
    return (rec && Math.abs(rec.tof - 100) < 0.01) || (rec ? rec.tof : 'no record');
  });

  console.log('\nOther L&D modules');
  check('TNA needs derive from real competency gaps', () => {
    const withGap = GGL.data.competencyRecords.filter(r=>r.gap>0);
    return (GGL.data.tnaRecords.length>0 && withGap.length>0) || 'no needs derived';
  });
  check('every TNA row has at least one affected person', () =>
    GGL.data.tnaRecords.every(r=>r.affected>0));
  check('competency records never exceed level 5', () =>
    GGL.data.competencyRecords.every(r=>r.current<=5 && r.required<=5));
  check('gap equals required minus current, floored at zero', () =>
    GGL.data.competencyRecords.every(r=>r.gap === Math.max(0, r.required-r.current)));
  check('content maps to real courses', () => {
    const ids = new Set(GGL.data.courses.map(c=>c.id));
    return GGL.data.content.every(c=>ids.has(c.courseId)) || 'orphan asset';
  });
  check('SOPs have unique codes', () =>
    new Set(GGL.data.sops.map(s=>s.code)).size === GGL.data.sops.length);
  check('coaching progress matches sessions completed', () =>
    GGL.data.coaching.every(c=>c.progress === Math.round((c.sessionsCompleted/c.sessionsPlanned)*100)));
  check('requests have unique references', () =>
    new Set(GGL.data.requests.map(r=>r.reference)).size === GGL.data.requests.length);
  check('audit entries newest first', () =>
    GGL.data.audit.every((r,i)=> i===0 || new Date(GGL.data.audit[i-1].at) >= new Date(r.at)));
  check('learning path steps resolve to real courses', () =>
    GGL.data.paths.every(p=>p.steps.every(s=>s.courseId)) || 'unresolved step');

  console.log('\nNewsfeed');
  check('posts and comments linked', () => {
    const ids = new Set(GGL.data.posts.map(p=>p.id));
    return GGL.data.comments.every(c=>ids.has(c.postId)) || 'orphan comment';
  });
  await checkAsync('admin can publish a post', async () => {
    await GGL.services.auth.signIn('admin@example.com','demo1234');
    const p = await GGL.services.feed.publish({ title:'Test announcement',
      body:'Body text for the test post.', category:'Announcement' });
    return (p.id && p.author) ? true : 'publish failed';
  });
  await checkAsync('a learner cannot publish', async () => {
    await GGL.services.auth.switchRole('end_user');
    try { await GGL.services.feed.publish({ title:'Nope', body:'Should fail.', category:'Notice' });
      return 'should have thrown'; } catch { return true; }
  });
  await checkAsync('a learner can comment', async () => {
    const feed = await GGL.services.feed.timeline({});
    const c = await GGL.services.feed.addComment(feed[0].id, 'A test comment from a learner.');
    return c.id ? true : 'comment failed';
  });
  await checkAsync('an empty comment is rejected', async () => {
    const feed = await GGL.services.feed.timeline({});
    try { await GGL.services.feed.addComment(feed[0].id, '   '); return 'should have thrown'; }
    catch { return true; }
  });
  await checkAsync('like toggles on and back off', async () => {
    const feed = await GGL.services.feed.timeline({});
    const a = await GGL.services.feed.toggleLike(feed[0].id);
    const b = await GGL.services.feed.toggleLike(feed[0].id);
    return (a.liked===true && b.liked===false) || 'toggle broken';
  });
  await checkAsync('pinned posts sort to the top', async () => {
    const feed = await GGL.services.feed.timeline({});
    const firstUnpinned = feed.findIndex(p=>!p.pinned);
    const lastPinned = feed.map(p=>!!p.pinned).lastIndexOf(true);
    return firstUnpinned === -1 || lastPinned < firstUnpinned || 'pin order wrong';
  });
  await GGL.services.auth.signOut();

  console.log('\nPlatform settings');
  await checkAsync('settings persist and reset', async () => {
    await GGL.services.platformSettings.save('learning', { defaultPassMark:75 });
    let s = await GGL.services.platformSettings.get();
    if (s.learning.defaultPassMark !== 75) return 'save failed';
    await GGL.services.platformSettings.reset();
    s = await GGL.services.platformSettings.get();
    return s.learning.defaultPassMark === 70 || 'reset failed';
  });

  GGL.resetPrototypeData();
  console.log(`\n${'─'.repeat(46)}`);
  console.log(`Passed: ${pass}   Failed: ${fail}`);
  console.log(`${'─'.repeat(46)}\n`);
  process.exit(fail ? 1 : 0);
})();
