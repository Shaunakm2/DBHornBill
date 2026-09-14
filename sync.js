/* =====================================================================
   sync.js — the shared-desk persistence layer.

   This replaces the IndexedDB Store in app.js and nothing else. The
   application keeps its in-memory DB object, its rendering, its rules and
   its twenty test suites exactly as they are; only where the data lives
   changes. Everything below is deliberately shaped to the existing
   Store contract:

     Store.init()        -> Promise, resolves once a session and a batch exist
     Store.save(force)   -> pushes what changed since the last save
     Store.load()        -> pulls the batch
     Store.clear()       -> not available on a shared desk; explains why
     Store.markCV(id)    -> no-op, resume text is a column now
     Store.hydrateCVs()  -> no-op
     Store.putFile()     -> no-op
     Store.available / .ready / .reason / .lastSaved

   Load order in index.html:
     supabase-js  ->  config.js  ->  sync.js  ->  app.js
   sync.js must define window.Store before app.js runs, because app.js
   calls Store.init() at the bottom of its own file.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.ATS_CONFIG || {};
  var sb = null;                 // supabase client
  var session = null;
  var me = null;                 // { id, role, full_name, employee_id }
  var batch = null;              // { id, name, mode, status, desk_type }
  var channel = null;
  var snapshot = null;           // last known server state, for diffing
  var idMap = { toServer: {}, toLocal: {} };
  var saveTimer = null;
  var pushing = false;

  var api = {
    available: false,
    ready: false,
    reason: 'Connecting…',
    lastSaved: null,
    mode: 'remote'
  };

  /* ---------------------------------------------------------------- util */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fail(where, e) {
    var msg = (e && (e.message || e.error_description)) || String(e || 'unknown');
    api.available = false;
    api.reason = where + ': ' + msg;
    if (window.toast) window.toast(api.reason, 'no');
    console.error('[sync] ' + where, e);
  }

  /* ------------------------------------------------------------ pipeline */
  /* The application's stage names and the database's codes. Kept in one
     place so adding a stage is an edit here and a row in
     submission_transitions, not a hunt through the UI. */
  var TO_CODE = {
    'New Lead': 'sourced',
    'Internal Submission': 'internal',
    'Awaiting Trainee Response': 'query',
    'Client Submission': 'client',
    'Interview Scheduled': 'interview',
    'Offer Extended': 'offer',
    'Placed': 'placed',
    'Client Declined': 'rejected',
    'Candidate Declined': 'rejected',
    'Not Proceeding': 'rejected'
  };
  var TO_LABEL = {
    sourced: 'New Lead',
    internal: 'Internal Submission',
    query: 'Awaiting Trainee Response',
    client: 'Client Submission',
    interview: 'Interview Scheduled',
    offer: 'Offer Extended',
    placed: 'Placed',
    rejected: 'Client Declined',
    withdrawn: 'Not Proceeding'
  };
  /* The three ways the app says no, mapped onto reasons the report can
     actually count. A trainer picking a specific reason in the review
     screen overrides this default. */
  var DECLINE_REASON = {
    'Client Declined': 'skills',
    'Candidate Declined': 'withdrew',
    'Not Proceeding': 'onhold'
  };

  /* ---------------------------------------------------------------- auth */
  var Auth = {};

  Auth.client = function () {
    if (sb) return sb;
    if (!window.supabase || !CFG.url || !CFG.anonKey) {
      throw new Error('config.js is missing the project URL or anon key');
    }
    sb = window.supabase.createClient(CFG.url, CFG.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return sb;
  };

  /* Staff sign in with an email and a password like anywhere else. */
  Auth.staffSignIn = function (email, password) {
    return Auth.client().auth.signInWithPassword({ email: email, password: password })
      .then(function (r) {
        if (r.error) throw r.error;
        return r.data.session;
      });
  };

  /* Trainees type an employee ID and a batch code. The Edge Function turns
     that into a real session; no password exists on this path, which is why
     nobody is ever asked to reset one. */
  Auth.traineeSignIn = function (employeeId, batchCode) {
    return fetch(CFG.url + '/functions/v1/trainee-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CFG.anonKey },
      body: JSON.stringify({ employee_id: employeeId, batch_code: batchCode })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || 'Sign-in failed.');
        return Auth.client().auth.setSession(res.j.session).then(function () {
          return res.j.session;
        });
      });
  };

  Auth.signOut = function () {
    if (channel) { try { sb.removeChannel(channel); } catch (e) {} channel = null; }
    return Auth.client().auth.signOut().then(function () { location.reload(); });
  };

  /* ------------------------------------------------------------ sign-in UI */
  function signInScreen(prefillError) {
    var main = document.getElementById('main');
    var wrap = el('div', 'signin');
    wrap.innerHTML =
      '<div class="signin-card">' +
      '<h1>Sign in</h1>' +
      '<p class="signin-sub">Practice environment. Invented records only.</p>' +
      '<div class="signin-tabs">' +
      '<button class="signin-tab on" data-tab="trainee">Trainee</button>' +
      '<button class="signin-tab" data-tab="staff">Trainer or admin</button></div>' +
      '<div class="signin-pane" id="pane-trainee">' +
      '<label>Employee ID<input id="si-emp" autocomplete="off" placeholder="E1001"></label>' +
      '<label>Batch code<input id="si-batch" autocomplete="off" placeholder="BATCH7"></label>' +
      '<button class="btn" id="si-go-trainee">Sign in</button>' +
      '<p class="signin-help">Your trainer has the batch code. You do not need a password.</p>' +
      '</div>' +
      '<div class="signin-pane" id="pane-staff" hidden>' +
      '<label>Email<input id="si-email" type="email" autocomplete="username"></label>' +
      '<label>Password<input id="si-pw" type="password" autocomplete="current-password"></label>' +
      '<button class="btn" id="si-go-staff">Sign in</button>' +
      '</div>' +
      '<div class="signin-err" id="si-err" hidden></div>' +
      '</div>';
    main.innerHTML = '';
    main.appendChild(wrap);
    document.body.classList.add('signed-out');

    var err = wrap.querySelector('#si-err');
    function showErr(m) { err.textContent = m; err.hidden = false; }
    if (prefillError) showErr(prefillError);

    wrap.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-tab]');
      if (t) {
        wrap.querySelectorAll('.signin-tab').forEach(function (b) {
          b.classList.toggle('on', b === t);
        });
        wrap.querySelector('#pane-trainee').hidden = t.dataset.tab !== 'trainee';
        wrap.querySelector('#pane-staff').hidden = t.dataset.tab !== 'staff';
        err.hidden = true;
      }
    });

    function attempt(p, btn) {
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      p.then(function () { location.reload(); })
        .catch(function (e) {
          btn.disabled = false;
          btn.textContent = 'Sign in';
          showErr(e.message || 'Sign-in failed.');
        });
    }
    wrap.querySelector('#si-go-trainee').onclick = function () {
      var emp = wrap.querySelector('#si-emp').value.trim();
      var bc = wrap.querySelector('#si-batch').value.trim();
      if (!emp || !bc) return showErr('Enter both your employee ID and the batch code.');
      attempt(Auth.traineeSignIn(emp, bc), this);
    };
    wrap.querySelector('#si-go-staff').onclick = function () {
      var em = wrap.querySelector('#si-email').value.trim();
      var pw = wrap.querySelector('#si-pw').value;
      if (!em || !pw) return showErr('Enter your email and password.');
      attempt(Auth.staffSignIn(em, pw), this);
    };
    wrap.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter') return;
      var pane = ev.target.closest('.signin-pane');
      if (pane) pane.querySelector('.btn').click();
    });
  }

  /* If a trainer belongs to more than one live batch, ask which desk. */
  function batchPicker(rows) {
    return new Promise(function (resolve) {
      var main = document.getElementById('main');
      main.innerHTML = '';
      var wrap = el('div', 'signin');
      wrap.innerHTML = '<div class="signin-card"><h1>Choose a batch</h1>' +
        '<div class="batch-list">' + rows.map(function (b) {
          return '<button class="batch-pick" data-id="' + esc(b.id) + '">' +
            '<b>' + esc(b.name) + '</b><span>' + esc(b.join_code) + ' · ' +
            esc(b.mode) + '</span></button>';
        }).join('') + '</div></div>';
      main.appendChild(wrap);
      wrap.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-id]');
        if (!b) return;
        var picked = rows.filter(function (r) { return r.id === b.dataset.id; })[0];
        try { sessionStorage.setItem('ats_batch', picked.id); } catch (e) {}
        resolve(picked);
      });
    });
  }

  /* ---------------------------------------------------------------- pull */
  function pull() {
    var b = batch.id;
    return Promise.all([
      sb.from('companies').select('*').eq('batch_id', b),
      sb.from('contacts').select('*').eq('batch_id', b),
      sb.from('job_orders').select('*').eq('batch_id', b),
      sb.from('job_assignments').select('*'),
      sb.from('candidates').select('*').eq('batch_id', b),
      sb.from('submissions').select('*').eq('batch_id', b),
      sb.from('sub_messages').select('*').eq('batch_id', b).order('created_at'),
      sb.from('notes').select('*').eq('batch_id', b).order('created_at'),
      sb.from('notifications').select('*').eq('batch_id', b).order('created_at', { ascending: false }),
      sb.from('profiles').select('id, full_name, employee_id, role')
    ]).then(function (r) {
      for (var i = 0; i < r.length; i++) if (r[i].error) throw r[i].error;
      return {
        companies: r[0].data, contacts: r[1].data, jobs: r[2].data,
        assignments: r[3].data, candidates: r[4].data, subs: r[5].data,
        messages: r[6].data, notes: r[7].data, notifs: r[8].data,
        people: r[9].data
      };
    });
  }

  /* --------------------------------------------------------- materialise */
  /* Server rows become the shapes app.js already renders. The seeded search
     pool is left alone: it is generated identically on every machine from a
     fixed seed, so it costs nothing to store and nothing to sync. A pool
     candidate only becomes a row when someone actually sources them. */
  function nameOf(people, id) {
    for (var i = 0; i < people.length; i++) if (people[i].id === id) return people[i].full_name;
    return 'Unknown';
  }

  function materialise(d) {
    var DB = window.DB;
    idMap = { toServer: {}, toLocal: {} };

    DB.companies = d.companies.map(function (c) {
      idMap.toServer[c.id] = c.id; idMap.toLocal[c.id] = c.id;
      return {
        id: c.id, name: c.name, category: c.industry || '', owner: nameOf(d.people, c.created_by),
        status: 'Active Client', since: (c.created_at || '').slice(0, 10),
        mine: c.created_by === me.id, employees: ''
      };
    });

    DB.contacts = d.contacts.map(function (c) {
      return {
        id: c.id, companyId: c.company_id, name: c.name, title: c.title || '',
        status: 'Active', owner: nameOf(d.people, c.created_by), primary: true,
        email: c.email || '', phone: c.phone || '', mine: c.created_by === me.id
      };
    });

    var assignedTo = {};
    d.assignments.forEach(function (a) {
      (assignedTo[a.job_id] = assignedTo[a.job_id] || []).push(nameOf(d.people, a.user_id));
    });

    DB.jobs = d.jobs.map(function (j) {
      return {
        id: j.id, ref: j.ref, companyId: j.company_id, contactId: j.contact_id,
        title: j.title, description: j.description || '',
        type: j.employment_type, status: j.status,
        openings: j.openings, filled: 0,
        payRate: Number(j.pay_rate || 0), billRate: Number(j.bill_rate || 0),
        salary: Number(j.salary || 0), flatFee: Number(j.flat_fee || 0),
        employmentType: j.employment_type === 'Direct Hire' ? 'Permanent' : 'W2',
        location: j.location || '', category: j.category || '',
        owner: nameOf(d.people, j.created_by), added: j.created_at,
        assignedUsers: assignedTo[j.id] || [],
        mine: (assignedTo[j.id] || []).indexOf(me.full_name) >= 0,
        published: false, closedReason: null, startDate: null, duration: ''
      };
    });

    DB.candidates = (window.POOL || []).slice();      // local, never written
    d.candidates.forEach(function (c) {
      idMap.toServer[c.ref] = c.id; idMap.toLocal[c.id] = c.ref;
      DB.candidates.push({
        id: c.id, ref: c.ref, name: c.name, occupation: c.occupation || '',
        location: c.location || '', skills: c.skills || [], source: c.source || 'other',
        status: c.status, category: '', desiredRate: Number(c.desired_rate || 0),
        availability: c.availability || '', owner: nameOf(d.people, c.created_by),
        added: c.created_at, email: c.email || '', phone: c.phone || '',
        relocate: false, employmentPref: 'Contract',
        poolRef: c.pool_ref, resume: c.resume_text || '',
        mine: c.created_by === me.id, remote: true
      });
    });

    var msgBySub = {};
    d.messages.forEach(function (m) { (msgBySub[m.submission_id] = msgBySub[m.submission_id] || []).push(m); });

    DB.subs = d.subs.map(function (s) {
      return {
        id: s.id, jobId: s.job_id, candidateId: s.candidate_id,
        status: TO_LABEL[s.status] || s.status,
        statusCode: s.status,
        owner: nameOf(d.people, s.owner_id), ownerId: s.owner_id,
        mine: s.owner_id === me.id,
        added: s.created_at, modified: s.updated_at,
        summary: s.summary || '', screenNote: '',
        payRate: Number(s.pay_expectation || 0), billRate: Number(s.bill_rate || 0),
        sendoutAt: s.sendout_at, startDate: null,
        reason: s.rejection_note || null, reasonCode: s.rejection_code || null,
        version: s.version,
        history: (msgBySub[s.id] || []).map(function (m) {
          return { status: m.kind, at: m.created_at, by: nameOf(d.people, m.author_id), text: m.body };
        })
      };
    });

    DB.notes = d.notes.map(function (n) {
      return {
        id: n.id, action: n.action || 'other', text: n.body, at: n.created_at,
        by: nameOf(d.people, n.author_id), mine: n.author_id === me.id,
        links: [{ type: n.target_type, id: n.target_id }]
      };
    });

    DB.notifs = d.notifs.map(function (n) {
      return {
        id: n.id, kind: n.kind, text: n.body, at: n.created_at,
        read: !!n.read_at, link: { type: n.link_type, id: n.link_id }
      };
    });

    /* Collections outside a 180° desk stay empty rather than seeded.
       Showing a trainee invented leads they cannot act on teaches nothing. */
    DB.leads = []; DB.opps = []; DB.placements = []; DB.times = [];
    DB.appts = []; DB.tasks = []; DB.tearsheets = []; DB.savedSearches = [];

    DB.desk = batch.desk_type || 'd180';
    DB.role = me.role;
    DB.me = me.full_name;
    DB.batchName = batch.name;
    DB.batchMode = batch.mode;
    DB.readOnly = batch.status !== 'active';

    snapshot = JSON.parse(JSON.stringify({
      candidates: DB.candidates.filter(function (c) { return c.remote; }),
      subs: DB.subs, notes: DB.notes
    }));
  }

  /* ---------------------------------------------------------------- push */
  /* Only the things a trainee creates are pushed from here: candidates they
     source, submissions they open, notes they write, and answers to queries.
     Everything a trainer does — creating a client, a job order, moving a
     submission — goes through an explicit call so the error message can be
     shown next to the control that caused it. */
  function pushCandidates(DB) {
    var out = [];
    DB.candidates.forEach(function (c) {
      if (c.remote || !c.sourced) return;         // untouched pool entry
      out.push(
        sb.from('candidates').insert({
          batch_id: batch.id, name: c.name, email: c.email || null,
          phone: c.phone || null, location: c.location || null,
          occupation: c.occupation || null, skills: c.skills || [],
          source: c.source || 'pool', pool_ref: c.poolRef || c.id,
          desired_rate: c.desiredRate || null, availability: c.availability || null,
          resume_text: c.resume || null, created_by: me.id
        }).select().single().then(function (r) {
          if (r.error) throw r.error;
          /* The record keeps its identity across the swap: anything already
             pointing at the local pool id is repointed at the real row. */
          var was = c.id;
          c.id = r.data.id; c.ref = r.data.ref; c.remote = true;
          idMap.toServer[r.data.ref] = r.data.id;
          DB.subs.forEach(function (s) { if (s.candidateId === was) s.candidateId = c.id; });
          DB.notes.forEach(function (n) {
            (n.links || []).forEach(function (l) { if (l.id === was) l.id = c.id; });
          });
        })
      );
    });
    return Promise.all(out);
  }

  function pushSubmissions(DB) {
    var out = [];
    DB.subs.forEach(function (s) {
      if (s.id && String(s.id).length === 36) return;   // already a server row
      out.push(
        sb.from('submissions').insert({
          batch_id: batch.id, job_id: s.jobId, candidate_id: s.candidateId,
          owner_id: me.id, status: 'sourced', created_by: me.id
        }).select().single().then(function (r) {
          if (r.error) {
            if (String(r.error.code) === '23505') return duplicateWarning(s);
            throw r.error;
          }
          s.id = r.data.id; s.version = r.data.version; s.statusCode = 'sourced';
        })
      );
    });
    return Promise.all(out);
  }

  /* The most instructive collision on a shared desk deserves a sentence,
     not a constraint-violation dialog. */
  function duplicateWarning(s) {
    return sb.rpc('existing_submission', { p_job: s.jobId, p_candidate: s.candidateId })
      .then(function (r) {
        var row = r.data && r.data[0];
        var who = row ? row.owner_name : 'someone else';
        var when = row ? new Date(row.submitted).toLocaleDateString() : 'earlier';
        var i = window.DB.subs.indexOf(s);
        if (i >= 0) window.DB.subs.splice(i, 1);
        if (window.toast) {
          window.toast(who + ' already submitted this candidate to this job on ' + when +
            '. Check the pipeline before sourcing.', 'no');
        }
      });
  }

  function pushNotes(DB) {
    var out = [];
    DB.notes.forEach(function (n) {
      if (n.id && String(n.id).length === 36) return;
      var link = (n.links || [])[0] || {};
      var type = ({ candidate: 'candidate', job: 'job_order', jobs: 'job_order',
        contact: 'contact', company: 'company', sub: 'submission' })[link.type] || 'candidate';
      out.push(
        sb.from('notes').insert({
          batch_id: batch.id, target_type: type, target_id: link.id,
          action: n.action || 'other', body: n.text, author_id: me.id
        }).select().single().then(function (r) {
          if (r.error) throw r.error;
          n.id = r.data.id;
        })
      );
    });
    return Promise.all(out);
  }

  /* ------------------------------------------------- explicit operations */
  /* Status changes go through the database function rather than an update,
     because a policy that filters a row away turns a forbidden update into a
     successful statement affecting nothing: the person sees "saved" and
     nothing happened. This path always returns a sentence. */
  api.advance = function (subId, toLabel, extra) {
    extra = extra || {};
    var s = null;
    window.DB.subs.forEach(function (x) { if (x.id === subId) s = x; });
    var code = TO_CODE[toLabel];
    if (!code) return Promise.reject(new Error('Unknown stage: ' + toLabel));

    return sb.rpc('advance_submission', {
      p_id: subId,
      p_to: code,
      p_version: s ? s.version : null,
      p_summary: extra.summary || null,
      p_rejection_code: extra.reasonCode || DECLINE_REASON[toLabel] || null,
      p_rejection_stage: extra.stage || (s ? s.statusCode : null),
      p_rejection_note: extra.note || null
    }).then(function (r) {
      if (r.error) throw new Error(r.error.message);
      if (s && r.data) {
        s.status = TO_LABEL[r.data.status] || r.data.status;
        s.statusCode = r.data.status;
        s.version = r.data.version;
        s.summary = r.data.summary || s.summary;
      }
      return r.data;
    });
  };

  api.addMessage = function (subId, kind, body) {
    return sb.from('sub_messages').insert({
      batch_id: batch.id, submission_id: subId, author_id: me.id,
      kind: kind, body: body
    }).select().single().then(function (r) {
      if (r.error) throw new Error(r.error.message);
      return r.data;
    });
  };

  api.duplicateCheck = function (email, phone, name) {
    return sb.rpc('candidate_duplicates', {
      p_batch: batch.id, p_email: email || null,
      p_phone: phone || null, p_name: name || null
    }).then(function (r) { return r.data || []; });
  };

  api.markNotificationsRead = function () {
    return sb.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', me.id).is('read_at', null);
  };

  api.scorecard = function () {
    return sb.from('v_trainee_scorecard').select('*').eq('batch_id', batch.id)
      .then(function (r) { return r.data || []; });
  };

  api.queue = function () {
    return sb.from('v_trainer_queue').select('*').eq('batch_id', batch.id)
      .order('last_activity')
      .then(function (r) { return r.data || []; });
  };

  api.whoami = function () { return me; };
  api.batch = function () { return batch; };
  api.signOut = Auth.signOut;

  /* ------------------------------------------------------------ realtime */
  /* A shared desk has to move while you are looking at it. Without this the
     duplicate check is only as fresh as your last refresh. */
  function subscribe() {
    channel = sb.channel('batch:' + batch.id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: 'batch_id=eq.' + batch.id },
        refresh)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'candidates', filter: 'batch_id=eq.' + batch.id },
        refresh)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + me.id },
        function (p) {
          if (window.toast) window.toast(p.new.body, 'ok');
          refresh();
        })
      .subscribe();
  }

  var refreshTimer = null;
  function refresh() {
    /* Coalesce: a trainer working through a queue fires several of these in
       a second and the screen should settle once, not flicker per row. */
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      if (pushing) return;
      pull().then(function (d) {
        materialise(d);
        if (window.render) window.render();
      }).catch(function (e) { fail('Refresh', e); });
    }, 400);
  }

  /* ------------------------------------------------------ Store contract */
  api.init = function () {
    var client;
    try { client = Auth.client(); } catch (e) {
      api.ready = true;
      api.reason = e.message;
      return Promise.reject(e);
    }

    return client.auth.getSession().then(function (r) {
      session = r.data.session;
      if (!session) { signInScreen(); return Promise.reject({ handled: true }); }

      return sb.from('profiles').select('id, role, full_name, employee_id')
        .eq('id', session.user.id).single();
    }).then(function (r) {
      if (r.error || !r.data) throw new Error('No profile for this account. Ask the administrator.');
      me = r.data;
      return sb.from('batches').select('id, name, join_code, mode, status, desk_type')
        .eq('status', 'active').order('created_at', { ascending: false });
    }).then(function (r) {
      if (r.error) throw r.error;
      var rows = r.data || [];
      if (!rows.length) throw new Error('You are not on an active batch yet.');
      var remembered = null;
      try { remembered = sessionStorage.getItem('ats_batch'); } catch (e) {}
      var pick = rows.filter(function (b) { return b.id === remembered; })[0];
      if (pick) return pick;
      if (rows.length === 1) return rows[0];
      return batchPicker(rows);
    }).then(function (picked) {
      batch = picked;
      return pull();
    }).then(function (d) {
      materialise(d);
      subscribe();
      api.available = true;
      api.ready = true;
      api.reason = 'Connected to ' + batch.name;
      api.lastSaved = new Date().toISOString();
      return { restored: true };
    }).catch(function (e) {
      if (e && e.handled) throw e;
      api.ready = true;
      fail('Startup', e);
      throw e;
    });
  };

  api.save = function (force) {
    if (!api.available) return;
    if (window.DB && window.DB.readOnly) {
      if (window.toast) window.toast('This batch is archived. It can be read but not changed.', 'no');
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var DB = window.DB;
      pushing = true;
      pushCandidates(DB)
        .then(function () { return pushSubmissions(DB); })
        .then(function () { return pushNotes(DB); })
        .then(function () {
          api.lastSaved = new Date().toISOString();
          pushing = false;
          if (window.render) window.render();
        })
        .catch(function (e) { pushing = false; fail('Save', e); });
    }, force ? 0 : 600);
  };

  api.load = function () { return pull().then(materialise); };

  api.clear = function () {
    if (window.toast) {
      window.toast('This desk is shared, so nothing here is yours alone to reset. ' +
        'Ask your trainer to archive the batch and start a new one.', 'no');
    }
    return Promise.resolve();
  };

  /* Resume text is a column now, so these have nothing left to do. They stay
     because app.js calls them and a missing function is a blank page. */
  api.markCV = function () {};
  api.markAllCV = function () {};
  api.hydrateCVs = function () { return Promise.resolve(0); };
  api.putFile = function () { return Promise.resolve(); };
  api.countFiles = function () { return Promise.resolve(0); };

  window.Store = api;
  window.ATS = { auth: Auth, api: api };
})();
