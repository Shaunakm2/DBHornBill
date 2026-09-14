/* ==========================================================================
   GG Learning Labs — Services

   Mock authentication plus a domain service layer. Every service returns a
   Promise and does its query work (search / sort / page) inside the service,
   so a real database can replace this without the UI changing.
   Writes persist to localStorage under ggl.overrides.

   ⚠ AUTHENTICATION IS MOCKED. No password verification, no token signing,
     no server. Every check is cosmetic and trivially bypassable — by design,
     so nothing here is mistaken for a real control.
   ========================================================================== */
(function (GGL) {
  'use strict';

  var U = GGL.utils;

  /* ------------------------------------------------------------------ auth */
  var SESSION_KEY = 'session';
  var MIN_PASSWORD = 6;

  var authService = {
    getSession: function () {
      var s = U.store.get(SESSION_KEY, null);
      if (!s || !s.userId) return null;
      var user = GGL.data.users.filter(function (u) { return u.id === s.userId; })[0];
      return user ? { user: user, signedInAt: s.signedInAt } : null;
    },
    getUser: function () {
      var s = authService.getSession();
      return s ? s.user : null;
    },
    isAuthenticated: function () { return !!authService.getSession(); },
    signIn: function (email, password) {
      return U.delay(650).then(function () {
        var addr = String(email || '').trim().toLowerCase();
        if (!addr) throw new Error('Enter your email address.');
        if (!password || password.length < MIN_PASSWORD) {
          throw new Error('Password must be at least ' + MIN_PASSWORD + ' characters.');
        }
        var user = GGL.data.users.filter(function (u) { return u.email.toLowerCase() === addr; })[0];
        if (!user) throw new Error('No account found for that email. Try one of the demo accounts below.');
        if (user.status !== 'Active') {
          throw new Error('This account is ' + user.status.toLowerCase() + '. Contact your administrator.');
        }
        U.store.set(SESSION_KEY, { userId: user.id, signedInAt: new Date().toISOString() });
        return { user: user };
      });
    },
    signOut: function () {
      return U.delay(200).then(function () { U.store.remove(SESSION_KEY); return true; });
    },
    requestPasswordReset: function (email) {
      return U.delay(700).then(function () {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim())) {
          throw new Error('Enter a valid email address.');
        }
        return { sent: true };
      });
    },
    hasRole: function (roles) {
      var u = authService.getUser();
      return u ? [].concat(roles).indexOf(u.role) !== -1 : false;
    },
    isAdminLevel: function () {
      return authService.hasRole([GGL.ROLES.SUPER_ADMIN, GGL.ROLES.ADMIN]);
    },
    requireAuth: function () {
      var user = authService.getUser();
      if (!user) {
        var target = window.location.pathname.split('/').pop() || '';
        window.location.replace(GGL.url('login.html') + (target ? '?next=' + encodeURIComponent(target) : ''));
        return null;
      }
      return user;
    },
    switchRole: function (role) {
      return U.delay(280).then(function () {
        var user = GGL.data.demoAccounts.filter(function (u) { return u.role === role; })[0];
        if (!user) throw new Error('No demo account for that role.');
        U.store.set(SESSION_KEY, { userId: user.id, signedInAt: new Date().toISOString() });
        return { user: user };
      });
    }
  };

  /* ------------------------------------------------------- override store */
  var OVERRIDE_KEY = 'overrides';
  function overrides() { return U.store.get(OVERRIDE_KEY, { created:{}, updated:{}, deleted:{} }); }
  function saveOverrides(o) { U.store.set(OVERRIDE_KEY, o); }

  function hydrate(name, rows) {
    var o = overrides();
    var deleted = o.deleted[name] || [];
    var updated = o.updated[name] || {};
    var created = o.created[name] || [];
    return created.concat(rows
      .filter(function (r) { return deleted.indexOf(r.id) === -1; })
      .map(function (r) { return updated[r.id] ? Object.assign({}, r, updated[r.id]) : r; }));
  }
  function recordCreate(name, row) {
    var o = overrides();
    (o.created[name] = o.created[name] || []).unshift(row);
    saveOverrides(o);
  }
  function recordUpdate(name, id, patch) {
    var o = overrides();
    var inCreated = (o.created[name] || []).filter(function (r) { return r.id === id; })[0];
    if (inCreated) Object.assign(inCreated, patch);
    else {
      o.updated[name] = o.updated[name] || {};
      o.updated[name][id] = Object.assign({}, o.updated[name][id], patch);
    }
    saveOverrides(o);
  }
  function recordDelete(name, id) {
    var o = overrides();
    o.created[name] = (o.created[name] || []).filter(function (r) { return r.id !== id; });
    (o.deleted[name] = o.deleted[name] || []).push(id);
    saveOverrides(o);
  }
  GGL.resetPrototypeData = function () { U.store.remove(OVERRIDE_KEY); };

  function query(name, source, q) {
    q = q || {};
    var rows = hydrate(name, source);
    if (q.filters) {
      Object.keys(q.filters).forEach(function (k) {
        var want = q.filters[k];
        if (want === undefined || want === null || want === '' || want === 'all') return;
        rows = rows.filter(function (r) { return String(U.get(r, k)) === String(want); });
      });
    }
    if (q.search && q.searchKeys) rows = U.search(rows, q.search, q.searchKeys);
    if (q.sort) rows = U.sort(rows, q.sort, q.dir);
    var page = U.paginate(rows, q.page || 1, q.size || 10);
    page.all = rows;
    return page;
  }

  function collection(name, sourceFn, searchKeys) {
    return {
      list: function (q) {
        return U.delay(q && q.instant ? 0 : 420).then(function () {
          return query(name, sourceFn(), Object.assign({ searchKeys: searchKeys }, q));
        });
      },
      all: function () { return U.delay(320).then(function () { return hydrate(name, sourceFn()); }); },
      allSync: function () { return hydrate(name, sourceFn()); },
      get: function (id) {
        return U.delay(260).then(function () {
          var row = hydrate(name, sourceFn()).filter(function (r) { return r.id === id; })[0];
          if (!row) throw new Error('Record not found.');
          return row;
        });
      },
      create: function (payload) {
        return U.delay(560).then(function () {
          var row = Object.assign({ id: U.uid(name.slice(0,3)), createdAt: new Date().toISOString() }, payload);
          recordCreate(name, row);
          return row;
        });
      },
      update: function (id, patch) {
        return U.delay(520).then(function () {
          recordUpdate(name, id, patch);
          return Object.assign({ id: id }, patch);
        });
      },
      remove: function (id) {
        return U.delay(480).then(function () { recordDelete(name, id); return { id:id, deleted:true }; });
      }
    };
  }

  var D = GGL.data;

  /* ----------------------------------------------------------------- users */
  var userService = collection('users', function () { return D.users; },
    ['name','email','employeeId','department','title','location']);

  userService.listByRole = function (role, q) {
    return U.delay(420).then(function () {
      var rows = hydrate('users', D.users)
        .filter(function (u) { return !role || role === 'all' || u.role === role; });
      return query('users', rows, Object.assign({
        searchKeys: ['name','email','employeeId','department','title','location'] }, q));
    });
  };
  userService.stats = function () {
    return U.delay(300).then(function () {
      var rows = hydrate('users', D.users);
      var by = U.groupBy(rows, 'role');
      return { total: rows.length,
        superAdmins: (by[GGL.ROLES.SUPER_ADMIN] || []).length,
        admins: (by[GGL.ROLES.ADMIN] || []).length,
        trainers: (by[GGL.ROLES.TRAINER] || []).length,
        learners: (by[GGL.ROLES.END_USER] || []).length,
        active: rows.filter(function (u) { return u.status === 'Active'; }).length };
    });
  };

  var courseService = collection('courses', function () { return D.courses; },
    ['title','category','instructor','level','delivery']);
  var batchService = collection('batches', function () { return D.batches; },
    ['name','programme','trainer','location','department']);
  var trainerService = collection('trainers', function () { return D.trainers; },
    ['name','email','specialism','location','type']);
  var sessionService = collection('sessions', function () { return D.sessions; },
    ['title','batchName','trainer','location']);
  var attendanceService = collection('attendance', function () { return D.attendance; },
    ['name','employeeId','department','sessionTitle','batchName']);

  trainerService.stats = function () {
    return U.delay(340).then(function () {
      var rows = hydrate('trainers', D.trainers);
      var eff = hydrate('effRecords', D.effRecords);
      return { total: rows.length,
        active: rows.filter(function (t) { return t.status === 'Active'; }).length,
        internal: rows.filter(function (t) { return t.type === 'Internal'; }).length,
        hours: U.sum(rows, 'trainingHours'),
        avgEffectiveness: eff.length ? Math.round(U.avg(eff, 'effectiveness') * 10) / 10 : 0 };
    });
  };
  attendanceService.summary = function () {
    return U.delay(300).then(function () {
      var rows = hydrate('attendance', D.attendance);
      var by = U.groupBy(rows, 'status');
      var total = rows.length || 1;
      return { total: rows.length, present:(by.Present||[]).length, late:(by.Late||[]).length,
        absent:(by.Absent||[]).length, excused:(by.Excused||[]).length,
        rate: Math.round((((by.Present||[]).length + (by.Late||[]).length) / total) * 100) };
    });
  };
  attendanceService.markAll = function (ids, status) {
    return U.delay(520).then(function () {
      ids.forEach(function (id) { recordUpdate('attendance', id, { status: status }); });
      return { updated: ids.length, status: status };
    });
  };

  var notificationService = collection('notifications', function () { return D.notifications; },
    ['title','body','type']);
  notificationService.unreadCount = function () {
    return hydrate('notifications', D.notifications).filter(function (n) { return !n.read; }).length;
  };
  notificationService.markAllRead = function () {
    return U.delay(360).then(function () {
      var rows = hydrate('notifications', D.notifications);
      rows.forEach(function (n) { if (!n.read) recordUpdate('notifications', n.id, { read:true }); });
      return { updated: rows.length };
    });
  };

  var observationService = collection('observations', function () { return D.observations; },
    ['trainer','observer','sessionTitle','batchName']);

  /* ---------------------------------------------------------- assessments */
  var assessmentService = collection('assessments', function () { return D.assessments; },
    ['title','course','category','type']);
  var attemptService = collection('attempts', function () { return D.attempts; },
    ['name','employeeId','assessment','course','department']);

  assessmentService.availableFor = function (userId) {
    return U.delay(400).then(function () {
      var taken = hydrate('attempts', D.attempts)
        .filter(function (t) { return t.userId === userId; })
        .map(function (t) { return t.assessmentId; });
      return hydrate('assessments', D.assessments)
        .filter(function (a) { return a.status === 'Published'; })
        .map(function (a) { return Object.assign({}, a, { taken: taken.indexOf(a.id) !== -1 }); });
    });
  };
  assessmentService.attemptsFor = function (userId) {
    return U.delay(360).then(function () {
      return hydrate('attempts', D.attempts).filter(function (t) { return t.userId === userId; });
    });
  };
  assessmentService.stats = function () {
    return U.delay(320).then(function () {
      var rows = hydrate('assessments', D.assessments);
      var attempts = hydrate('attempts', D.attempts);
      var passed = attempts.filter(function (t) { return t.passed; }).length;
      return { total: rows.length,
        published: rows.filter(function (a) { return a.status === 'Published'; }).length,
        attempts: attempts.length,
        avgScore: attempts.length ? Math.round(U.avg(attempts, 'score')) : 0,
        passRate: attempts.length ? Math.round((passed / attempts.length) * 100) : 0 };
    });
  };

  /** The one write that fans out: attempt → points → certificate. */
  assessmentService.submitAttempt = function (assessmentId, answers) {
    return U.delay(700).then(function () {
      var assessment = hydrate('assessments', D.assessments)
        .filter(function (a) { return a.id === assessmentId; })[0];
      if (!assessment) throw new Error('Assessment not found.');
      var user = authService.getUser();
      if (!user) throw new Error('You must be signed in to submit an attempt.');

      var correct = assessment.questions.filter(function (q) { return answers[q.id] === q.correct; }).length;
      var total = assessment.questions.length;
      var score = Math.round((correct / total) * 100);
      var passed = score >= assessment.passMark;
      var now = new Date().toISOString();

      var attempt = { id:U.uid('att'), assessmentId:assessment.id, assessment:assessment.title,
        stage:assessment.stage, courseId:assessment.courseId, course:assessment.course,
        category:assessment.category, userId:user.id, name:user.name,
        employeeId:user.employeeId, department:user.department,
        score:score, correct:correct, total:total, passed:passed,
        durationMins:null, submittedAt:now };
      recordCreate('attempts', attempt);

      var awarded = [];
      function award(type, reason) {
        var rule = D.pointRules[type];
        if (!rule) return;
        recordCreate('points', { id:U.uid('pt'), userId:user.id, name:user.name,
          type:type, points:rule.points, reason:reason, at:now });
        awarded.push({ label:rule.label, points:rule.points });
      }
      award('attempt_submitted', 'Submitted ' + assessment.title);
      if (passed) award('attempt_passed', 'Passed ' + assessment.title);
      if (score === 100) award('perfect_score', 'Full marks on ' + assessment.title);

      var certificate = null;
      if (passed && assessment.stage === 'Post' && assessment.courseId) {
        var already = hydrate('certificates', D.certificates).some(function (c) {
          return c.userId === user.id && c.courseId === assessment.courseId && c.status !== 'Revoked';
        });
        if (!already) {
          var expires = new Date();
          expires.setFullYear(expires.getFullYear() + 2);
          certificate = { id:U.uid('crt'), serial:'GGL-' + Math.floor(2000 + Math.random() * 7000),
            userId:user.id, name:user.name, employeeId:user.employeeId,
            department:user.department, courseId:assessment.courseId,
            course:assessment.course, category:assessment.category,
            assessmentId:assessment.id, score:score, issuedAt:now,
            expiresAt:expires.toISOString(), status:'Issued' };
          recordCreate('certificates', certificate);
          award('certificate_issued', 'Certificate for ' + assessment.course);
        }
      }
      return { attempt:attempt, assessment:assessment, score:score, correct:correct,
        total:total, passed:passed, certificate:certificate, awarded:awarded,
        pointsEarned: awarded.reduce(function (s, a) { return s + a.points; }, 0) };
    });
  };

  /* --------------------------------------------------------- certificates */
  var certificateService = collection('certificates', function () { return D.certificates; },
    ['name','employeeId','course','serial','department']);

  certificateService.forUser = function (userId) {
    return U.delay(380).then(function () {
      return hydrate('certificates', D.certificates).filter(function (c) { return c.userId === userId; });
    });
  };
  certificateService.stats = function () {
    return U.delay(300).then(function () {
      var rows = hydrate('certificates', D.certificates);
      var by = U.groupBy(rows, 'status');
      var n = new Date();
      return { total:rows.length, issued:(by.Issued||[]).length,
        expired:(by.Expired||[]).length, revoked:(by.Revoked||[]).length,
        thisMonth: rows.filter(function (c) {
          var d = new Date(c.issuedAt);
          return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
        }).length,
        holders: Object.keys(U.groupBy(rows, 'userId')).length };
    });
  };
  certificateService.revoke = function (id, reason) {
    return U.delay(480).then(function () {
      recordUpdate('certificates', id, { status:'Revoked',
        revokedReason: reason || 'Revoked by administrator' });
      return { id:id, status:'Revoked' };
    });
  };
  certificateService.reinstate = function (id) {
    return U.delay(420).then(function () {
      recordUpdate('certificates', id, { status:'Issued', revokedReason:null });
      return { id:id, status:'Issued' };
    });
  };

  /* --------------------------------------------------------- gamification */
  function contextFor(userId) {
    var attempts = hydrate('attempts', D.attempts)
      .filter(function (t) { return t.userId === userId; })
      .map(function (t) {
        var a = D.assessments.filter(function (x) { return x.id === t.assessmentId; })[0];
        return Object.assign({}, t, { mandatory: a ? a.mandatory : false });
      });
    var certificates = hydrate('certificates', D.certificates)
      .filter(function (c) { return c.userId === userId && c.status === 'Issued'; });
    var points = hydrate('points', D.points).filter(function (p) { return p.userId === userId; });
    return { attempts:attempts, certificates:certificates, ledger:points, points:U.sum(points, 'points') };
  }

  var gamificationService = {
    leaderboard: function () {
      return U.delay(460).then(function () {
        var byUser = U.groupBy(hydrate('points', D.points), 'userId');
        var rows = Object.keys(byUser).map(function (userId) {
          var entries = byUser[userId];
          var user = D.users.filter(function (u) { return u.id === userId; })[0];
          var ctx = contextFor(userId);
          return { id:userId, userId:userId, name:entries[0].name,
            department: user ? user.department : '—',
            employeeId: user ? user.employeeId : '—',
            points:U.sum(entries, 'points'), events:entries.length,
            certificates:ctx.certificates.length, assessments:ctx.attempts.length,
            badges:D.badgeCatalogue.filter(function (b) { return b.test(ctx); }).length };
        });
        rows.sort(function (a, b) { return b.points - a.points; });
        rows.forEach(function (r, i) { r.rank = i + 1; });
        return rows;
      });
    },
    standing: function (userId) {
      return gamificationService.leaderboard().then(function (rows) {
        var me = rows.filter(function (r) { return r.userId === userId; })[0];
        var ctx = contextFor(userId);
        return { rank: me ? me.rank : rows.length + 1, total: rows.length,
          points: me ? me.points : 0, certificates: ctx.certificates.length,
          assessments: ctx.attempts.length, ledger: ctx.ledger.slice(0,12),
          percentile: me ? Math.round(((rows.length - me.rank + 1) / rows.length) * 100) : 0 };
      });
    },
    badgesFor: function (userId) {
      return U.delay(300).then(function () {
        var ctx = contextFor(userId);
        return D.badgeCatalogue.map(function (b) {
          return { id:b.id, name:b.name, icon:b.icon, desc:b.desc, earned:b.test(ctx) };
        });
      });
    },
    challengesFor: function (userId) {
      return U.delay(300).then(function () {
        var ctx = contextFor(userId);
        var progress = { ch1: ctx.attempts.filter(function (a) { return a.mandatory && a.passed; }).length,
          ch2: ctx.attempts.length, ch3: ctx.certificates.length, ch4: 4 };
        return D.challenges.map(function (c) {
          var done = Math.min(progress[c.id] || 0, c.target);
          return Object.assign({}, c, { progress:done,
            pct: Math.round((done / c.target) * 100), complete: done >= c.target });
        });
      });
    },
    breakdown: function () {
      return U.delay(320).then(function () {
        var by = U.groupBy(hydrate('points', D.points), 'type');
        return Object.keys(by).map(function (type) {
          return { label:(D.pointRules[type] || { label:type }).label, value:U.sum(by[type], 'points') };
        }).sort(function (a, b) { return b.value - a.value; });
      });
    }
  };

  /* ------------------------------------------- TOF + effectiveness calc */
  var tofService = collection('tofRecords', function () { return D.tofRecords; },
    ['trainer','evaluator','topic']);
  tofService.instrument = function () {
    return { sections:D.tofSections, scale:D.tofScale, max:D.tofMax };
  };
  tofService.score = function (ratings) { return D.scoreTof(ratings); };
  tofService.submit = function (payload) {
    return U.delay(650).then(function () {
      var scored = D.scoreTof(payload.ratings);
      var row = Object.assign({}, payload, { id:U.uid('tof'), sections:scored.sections,
        score:scored.overall,
        rating: scored.overall >= 85 ? 'Exceeds' : scored.overall >= 70 ? 'Meets' : 'Needs development',
        status:'Completed' });
      recordCreate('tofRecords', row);

      /* Feed the result into the trainer's effectiveness record (30% weight) */
      var eff = hydrate('effRecords', D.effRecords)
        .filter(function (e) { return e.trainerId === payload.trainerId; })[0];
      if (eff) {
        var patch = { tof: scored.overall };
        var out = D.calcEffectiveness(Object.assign({}, eff, patch));
        Object.assign(patch, { effectiveness:out.effectiveness, rating:out.rating,
          improvement:out.improvement, gaps:out.gaps });
        recordUpdate('effRecords', eff.id, patch);
      }
      return row;
    });
  };

  var effectivenessService = collection('effRecords', function () { return D.effRecords; },
    ['trainer','month','rating']);
  effectivenessService.weights = function () { return D.effWeights; };
  effectivenessService.calculate = function (m) { return D.calcEffectiveness(m); };
  effectivenessService.saveRecord = function (id, metrics) {
    return U.delay(540).then(function () {
      var out = D.calcEffectiveness(metrics);
      var patch = Object.assign({}, metrics, { effectiveness:out.effectiveness,
        rating:out.rating, improvement:out.improvement, gaps:out.gaps });
      if (id) { recordUpdate('effRecords', id, patch); return Object.assign({ id:id }, patch); }
      var row = Object.assign({ id:U.uid('eff'), source:'Platform' }, patch);
      recordCreate('effRecords', row);
      return row;
    });
  };
  effectivenessService.summary = function () {
    return U.delay(360).then(function () {
      var rows = hydrate('effRecords', D.effRecords);
      var by = U.groupBy(rows, 'rating');
      var gapCount = {};
      rows.forEach(function (r) {
        (r.gaps || []).forEach(function (g) { gapCount[g] = (gapCount[g] || 0) + 1; });
      });
      var topGap = Object.keys(gapCount).sort(function (a, b) { return gapCount[b] - gapCount[a]; })[0];
      return { records: rows.length,
        average: rows.length ? Math.round(U.avg(rows, 'effectiveness') * 100) / 100 : 0,
        effective:(by.Effective||[]).length,
        satisfactory:(by.Satisfactory||[]).length,
        needsImprovement:(by['Needs Improvement']||[]).length,
        topGap: topGap || null,
        gapCounts: Object.keys(gapCount).map(function (k) { return { label:k, value:gapCount[k] }; })
          .sort(function (a, b) { return b.value - a.value; }) };
    });
  };

  /* ------------------------------------------------------ TNA / competency */
  var tnaService = collection('tnaRecords', function () { return D.tnaRecords; },
    ['competency','department','category','recommendedCourse','intervention']);
  tnaService.summary = function () {
    return U.delay(340).then(function () {
      var rows = hydrate('tnaRecords', D.tnaRecords);
      var by = U.groupBy(rows, 'priority');
      return { total:rows.length, critical:(by.Critical||[]).length, high:(by.High||[]).length,
        peopleAffected:U.sum(rows, 'affected'),
        addressed: rows.filter(function (r) { return r.status === 'Addressed'; }).length,
        byDepartment: Object.keys(U.groupBy(rows, 'department')).map(function (d) {
          return { label:d, value:U.sum(rows.filter(function (r) { return r.department === d; }), 'affected') };
        }).sort(function (a, b) { return b.value - a.value; }),
        byCategory: Object.keys(U.groupBy(rows, 'category')).map(function (c) {
          return { label:c, value:rows.filter(function (r) { return r.category === c; }).length };
        }).sort(function (a, b) { return b.value - a.value; }) };
    });
  };

  var competencyService = collection('competencyRecords', function () { return D.competencyRecords; },
    ['name','employeeId','competency','department','role']);
  competencyService.library = function () {
    return U.delay(280).then(function () { return D.competencyLibrary.slice(); });
  };
  competencyService.profileFor = function (userId) {
    return U.delay(340).then(function () {
      return hydrate('competencyRecords', D.competencyRecords)
        .filter(function (r) { return r.userId === userId; });
    });
  };
  competencyService.heatmap = function () {
    return U.delay(400).then(function () {
      var rows = hydrate('competencyRecords', D.competencyRecords);
      var depts = Object.keys(U.groupBy(rows, 'department')).sort();
      return D.competencyLibrary.map(function (c) {
        return { competency:c.name, category:c.category,
          cells: depts.map(function (d) {
            var g = rows.filter(function (r) { return r.department === d && r.competencyId === c.id; });
            return { department:d, gap: g.length ? Math.round(U.avg(g, 'gap') * 10) / 10 : null,
              people:g.length };
          }) };
      });
    });
  };

  /* -------------------------------------------------- content / SOP / paths */
  var contentService = collection('content', function () { return D.content; },
    ['title','course','category','type','author']);
  var sopService = collection('sops', function () { return D.sops; },
    ['title','code','category','owner','purpose']);
  var pathService = collection('paths', function () { return D.paths; }, ['name','category','owner']);

  sopService.advance = function (id, stage) {
    return U.delay(500).then(function () {
      var patch = { status: stage };
      if (stage === 'Published') patch.effectiveFrom = new Date().toISOString();
      recordUpdate('sops', id, patch);
      return Object.assign({ id:id }, patch);
    });
  };

  /* ------------------------------------------------- coaching / mentoring */
  var coachingService = collection('coaching', function () { return D.coaching; },
    ['coachee','coach','focus','department']);
  var mentoringService = collection('mentoring', function () { return D.mentoring; },
    ['mentee','mentor','area','department']);

  coachingService.logSession = function (id) {
    return U.delay(480).then(function () {
      var row = hydrate('coaching', D.coaching).filter(function (r) { return r.id === id; })[0];
      if (!row) throw new Error('Engagement not found.');
      var done = Math.min(row.sessionsPlanned, row.sessionsCompleted + 1);
      var patch = { sessionsCompleted:done,
        progress: Math.round((done / row.sessionsPlanned) * 100),
        status: done >= row.sessionsPlanned ? 'Completed' : 'In Progress' };
      recordUpdate('coaching', id, patch);
      return Object.assign({ id:id }, patch);
    });
  };

  /* -------------------------------------------------------------- requests */
  var requestService = collection('requests', function () { return D.requests; },
    ['title','reference','requester','type','department']);
  requestService.setStatus = function (id, status, assignee) {
    return U.delay(480).then(function () {
      var patch = { status:status, updatedAt:new Date().toISOString() };
      if (assignee) patch.assignee = assignee;
      recordUpdate('requests', id, patch);
      return Object.assign({ id:id }, patch);
    });
  };
  requestService.summary = function () {
    return U.delay(320).then(function () {
      var rows = hydrate('requests', D.requests);
      var by = U.groupBy(rows, 'status');
      return { total:rows.length,
        open: rows.filter(function (r) {
          return ['Submitted','Under Review','Assigned','In Progress'].indexOf(r.status) !== -1;
        }).length,
        completed:(by.Completed||[]).length, rejected:(by.Rejected||[]).length,
        byStatus: D.requestStates.map(function (st) { return { label:st, value:(by[st]||[]).length }; }),
        byType: Object.keys(U.groupBy(rows, 'type')).map(function (t) {
          return { label:t, value:rows.filter(function (r) { return r.type === t; }).length };
        }).sort(function (a, b) { return b.value - a.value; }) };
    });
  };

  /* -------------------------------------------------------------- newsfeed */
  var feedService = collection('posts', function () { return D.posts; },
    ['title','body','author','category']);

  feedService.timeline = function (q) {
    return U.delay(420).then(function () {
      var rows = hydrate('posts', D.posts);
      if (q && q.category && q.category !== 'all') {
        rows = rows.filter(function (p) { return p.category === q.category; });
      }
      if (q && q.search) rows = U.search(rows, q.search, ['title','body','author']);
      var comments = hydrate('comments', D.comments);
      rows.forEach(function (p) {
        p.commentCount = comments.filter(function (c) { return c.postId === p.id; }).length;
      });
      return rows.sort(function (a, b) {
        if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    });
  };
  feedService.commentsFor = function (postId) {
    return U.delay(300).then(function () {
      return hydrate('comments', D.comments)
        .filter(function (c) { return c.postId === postId; })
        .sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    });
  };
  feedService.addComment = function (postId, bodyText) {
    return U.delay(420).then(function () {
      var user = authService.getUser();
      if (!user) throw new Error('You must be signed in to comment.');
      if (!bodyText || !bodyText.trim()) throw new Error('Write something first.');
      var row = { id:U.uid('cmt'), postId:postId, authorId:user.id, author:user.name,
        authorRole:GGL.roleLabel(user.role), body:bodyText.trim(),
        createdAt:new Date().toISOString() };
      recordCreate('comments', row);
      return row;
    });
  };
  feedService.deleteComment = function (id) {
    return U.delay(380).then(function () { recordDelete('comments', id); return { id:id, deleted:true }; });
  };
  feedService.toggleLike = function (postId) {
    return U.delay(220).then(function () {
      var user = authService.getUser();
      if (!user) throw new Error('You must be signed in.');
      var post = hydrate('posts', D.posts).filter(function (p) { return p.id === postId; })[0];
      if (!post) throw new Error('Post not found.');
      var likedBy = (post.likedBy || []).slice();
      var idx = likedBy.indexOf(user.id), liked;
      if (idx === -1) { likedBy.push(user.id); liked = true; }
      else { likedBy.splice(idx, 1); liked = false; }
      var likes = Math.max(0, post.likes + (liked ? 1 : -1));
      recordUpdate('posts', postId, { likedBy:likedBy, likes:likes });
      return { liked:liked, likes:likes };
    });
  };
  feedService.publish = function (payload) {
    return U.delay(620).then(function () {
      var user = authService.getUser();
      if (!user) throw new Error('You must be signed in.');
      if ([GGL.ROLES.SUPER_ADMIN, GGL.ROLES.ADMIN].indexOf(user.role) === -1) {
        throw new Error('Only L&D administrators can publish to the newsfeed.');
      }
      var row = Object.assign({ id:U.uid('post'), authorId:user.id, author:user.name,
        authorRole:GGL.roleLabel(user.role), createdAt:new Date().toISOString(),
        likes:0, likedBy:[], commentCount:0, pinned:false, image:null }, payload);
      recordCreate('posts', row);
      return row;
    });
  };
  feedService.togglePin = function (postId, pinned) {
    return U.delay(360).then(function () {
      recordUpdate('posts', postId, { pinned: !!pinned });
      return { id:postId, pinned: !!pinned };
    });
  };

  /* ------------------------------------------------------ audit / settings */
  var auditService = collection('audit', function () { return D.audit; },
    ['actor','label','module','target','action']);
  auditService.summary = function () {
    return U.delay(320).then(function () {
      var rows = hydrate('audit', D.audit);
      return { total:rows.length,
        high: rows.filter(function (r) { return r.severity === 'High'; }).length,
        failed: rows.filter(function (r) { return r.result === 'Failed'; }).length,
        actors: Object.keys(U.groupBy(rows, 'actorId')).length,
        byModule: Object.keys(U.groupBy(rows, 'module')).map(function (m) {
          return { label:m, value:rows.filter(function (r) { return r.module === m; }).length };
        }).sort(function (a, b) { return b.value - a.value; }) };
    });
  };

  var settingsService = {
    get: function () {
      return U.delay(300).then(function () {
        var o = U.store.get('platformSettings', null);
        return o ? Object.assign({}, D.platformSettings, o) : U.clone(D.platformSettings);
      });
    },
    save: function (group, values) {
      return U.delay(520).then(function () {
        var current = U.store.get('platformSettings', U.clone(D.platformSettings));
        current[group] = Object.assign({}, current[group], values);
        U.store.set('platformSettings', current);
        return current[group];
      });
    },
    reset: function () {
      return U.delay(360).then(function () {
        U.store.remove('platformSettings');
        return U.clone(D.platformSettings);
      });
    }
  };

  /* ------------------------------------------------------------- reporting */
  var reportService = {
    catalogue: function () { return U.delay(360).then(function () { return D.reports.slice(); }); },
    run: function (reportId, filters) {
      return U.delay(900).then(function () {
        var report = D.reports.filter(function (r) { return r.id === reportId; })[0];
        if (!report) throw new Error('Report not found.');
        return { report:report, filters:filters || {},
          generatedAt:new Date().toISOString(), rows:report.records };
      });
    },
    /** Real export: CSV/Excel download a file, PDF opens a print-ready document. */
    export: function (reportId, format, payload) {
      return U.delay(500).then(function () {
        var report = D.reports.filter(function (r) { return r.id === reportId; })[0];
        if (!report) throw new Error('Report not found.');
        var name = report.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase();
        var columns = (payload && payload.columns) || [];
        var rows = (payload && payload.rows) || [];
        if (format === 'PDF') {
          U.printDocument(report.name,
            '<h1>' + U.esc(report.name) + '</h1>' +
            '<div class="meta">' + U.esc(report.description) + '</div>' +
            '<table><thead><tr>' +
              columns.map(function (c) { return '<th>' + U.esc(c.label) + '</th>'; }).join('') +
            '</tr></thead><tbody>' +
              rows.map(function (r) {
                return '<tr>' + columns.map(function (c) {
                  var v = c.value ? c.value(r) : U.get(r, c.key);
                  return '<td>' + U.esc(String(v === undefined || v === null ? '' : v).replace(/<[^>]*>/g,'')) + '</td>';
                }).join('') + '</tr>';
              }).join('') + '</tbody></table>');
          return { format:format, rows:rows.length, printed:true };
        }
        var ext = format === 'Excel' ? 'xls' : 'csv';
        var file = U.downloadCsv(name + '-' + U.stamp() + '.' + ext, columns, rows);
        return { format:format, rows:rows.length, file:file };
      });
    },
    platformStats: function () {
      return U.delay(400).then(function () {
        var users = hydrate('users', D.users);
        var courses = hydrate('courses', D.courses);
        var batches = hydrate('batches', D.batches);
        return { admins: users.filter(function (u) { return u.role === GGL.ROLES.ADMIN; }).length,
          superAdmins: users.filter(function (u) { return u.role === GGL.ROLES.SUPER_ADMIN; }).length,
          learners: users.filter(function (u) { return u.role === GGL.ROLES.END_USER; }).length,
          courses: courses.length,
          publishedCourses: courses.filter(function (c) { return c.status === 'Published'; }).length,
          activeBatches: batches.filter(function (b) { return b.status === 'Active'; }).length,
          scheduledBatches: batches.filter(function (b) { return b.status === 'Scheduled'; }).length,
          trainingHours: 11100,
          completionRate: Math.round(U.avg(courses, 'completionRate')),
          effectiveness: Math.round(U.avg(D.effectiveness, 'overall')),
          satisfaction: Math.round(U.avg(D.effectiveness, 'satisfaction')),
          trainers: D.trainers.length };
      });
    },
    effectiveness: function () {
      return U.delay(420).then(function () {
        var rows = D.effectiveness;
        return { rows:rows, overall:Math.round(U.avg(rows, 'overall')),
          reaction:U.avg(rows, 'reaction').toFixed(1),
          knowledgeGain:Math.round(U.avg(rows, 'gain')),
          behaviour:Math.round(U.avg(rows, 'behaviour')),
          results:Math.round(U.avg(rows, 'results')),
          satisfaction:Math.round(U.avg(rows, 'satisfaction')),
          recommend:Math.round(U.avg(rows, 'recommendRate')),
          responses:U.sum(rows, 'responses') };
      });
    },
    activity: function (limit) {
      return U.delay(340).then(function () { return D.activity.slice(0, limit || 8); });
    },
    series: function (key) {
      return U.delay(300).then(function () {
        var s = D.series[key];
        if (!s) throw new Error('Unknown series: ' + key);
        return s.slice();
      });
    }
  };

  /* -------------------------------------------------------- learner-facing */
  var learningService = {
    myLearning: function () {
      return U.delay(420).then(function () { return hydrate('myLearning', D.myLearning); });
    },
    continueLearning: function () {
      return U.delay(380).then(function () {
        return hydrate('myLearning', D.myLearning)
          .filter(function (c) { return c.status === 'In Progress'; })
          .sort(function (a, b) { return new Date(b.lastAccessed) - new Date(a.lastAccessed); });
      });
    },
    upcoming: function (limit) {
      return U.delay(360).then(function () {
        return hydrate('sessions', D.sessions)
          .filter(function (s) { return new Date(s.start) >= new Date(); })
          .slice(0, limit || 4);
      });
    },
    progress: function () {
      return U.delay(320).then(function () {
        var rows = hydrate('myLearning', D.myLearning);
        return { assigned:rows.length,
          completed: rows.filter(function (c) { return c.status === 'Completed'; }).length,
          inProgress: rows.filter(function (c) { return c.status === 'In Progress'; }).length,
          notStarted: rows.filter(function (c) { return c.status === 'Not Started'; }).length,
          overall: Math.round(U.avg(rows, 'progress')), hours:48,
          certificates: rows.filter(function (c) { return c.certificate; }).length,
          points:1240, rank:12 };
      });
    },
    badges: function () { return U.delay(300).then(function () { return D.badges.slice(); }); },
    advance: function (enrolmentId, delta) {
      return U.delay(480).then(function () {
        var row = hydrate('myLearning', D.myLearning)
          .filter(function (r) { return r.id === enrolmentId; })[0];
        if (!row) throw new Error('Enrolment not found.');
        var next = Math.min(100, row.progress + (delta || 10));
        recordUpdate('myLearning', enrolmentId, { progress:next,
          status: next === 100 ? 'Completed' : 'In Progress',
          certificate: next === 100, lastAccessed:new Date().toISOString() });
        return { id:enrolmentId, progress:next };
      });
    }
  };

  GGL.services = {
    auth: authService, users: userService, courses: courseService, batches: batchService,
    trainers: trainerService, sessions: sessionService, attendance: attendanceService,
    notifications: notificationService, observations: observationService,
    assessments: assessmentService, attempts: attemptService, certificates: certificateService,
    gamification: gamificationService, tof: tofService, effectivenessCalc: effectivenessService,
    tna: tnaService, competency: competencyService, content: contentService, sops: sopService,
    paths: pathService, coaching: coachingService, mentoring: mentoringService,
    requests: requestService, feed: feedService, audit: auditService,
    platformSettings: settingsService, reports: reportService, learning: learningService
  };

})(window.GGL = window.GGL || {});
