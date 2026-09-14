/* =====================================================================
   admin.js — creating batches, accounts and memberships.

   A separate overlay rather than a screen inside app.js. Two reasons: it
   keeps administration out of the desk the trainees are being taught, and
   it means app.js needs no new views, no new routes and no new rail
   entries, so its twenty suites keep testing exactly what they tested.

   Everything here is also enforced in the database. The Manage link is
   hidden from trainees as a courtesy; the policies and the admin-users
   function are the actual control, and they do not care what the browser
   chose to display.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.ATS_CONFIG || {};
  var root = null, tab = 'batches', busy = false;

  function sb() { return window.Store.sb(); }
  function me() { return window.Store.whoami(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var lastError = null;

  function say(m, k) { if (window.APP && window.APP.toast) window.APP.toast(m, k); }

  /* A toast fires behind the overlay, which is how an error can look like
     nothing happening at all. Say it in the panel, where it is being read. */
  function problem(m) {
    lastError = m;
    say(m, 'no');
    render();
  }

  function errorStrip() {
    if (!lastError) return '';
    return '<div class="ad-err" role="alert"><b>That did not work.</b> ' +
      esc(lastError) +
      '<button class="ad-err-x" data-ad="dismiss" aria-label="Dismiss">\u00d7</button></div>';
  }

  /* The service key never reaches the browser, so account creation goes
     through the Edge Function, which checks the caller's role server-side. */
  function adminCall(body) {
    return sb().auth.getSession().then(function (r) {
      var token = r.data.session && r.data.session.access_token;
      return fetch(CFG.url + '/functions/v1/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: CFG.anonKey,
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify(body)
      });
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || ('The server returned ' + r.status + '.'));
        return j;
      }, function () {
        throw new Error('The server returned ' + r.status + ' with no message.');
      });
    }, function (e) {
      /* fetch rejects with a bare TypeError when the browser blocks the call,
         which is almost always CORS or an undeployed function. Neither is
         guessable from "Failed to fetch". */
      throw new Error(
        'Could not reach the account service. Check that the admin-users ' +
        'function is deployed, and that its ALLOWED_ORIGIN secret is exactly ' +
        location.origin + ' with no trailing slash. (' + (e.message || e) + ')');
    });
  }

  /* ---------------------------------------------------------------- data */
  var state = { batches: [], roster: [], members: {}, openBatch: null };

  function load() {
    return Promise.all([
      sb().from('batches').select('*').order('created_at', { ascending: false }),
      sb().rpc('roster'),
      sb().from('batch_members').select('*')
    ]).then(function (r) {
      state.batches = r[0].data || [];
      state.roster = r[1].data || [];
      state.members = {};
      (r[2].data || []).forEach(function (m) {
        (state.members[m.batch_id] = state.members[m.batch_id] || []).push(m);
      });
      if (r[0].error) throw r[0].error;
    });
  }

  function personName(id) {
    for (var i = 0; i < state.roster.length; i++) {
      if (state.roster[i].id === id) return state.roster[i].full_name;
    }
    return 'Unknown';
  }

  /* ---------------------------------------------------------------- views */
  function batchesView() {
    if (!state.batches.length) {
      return '<div class="ad-empty"><h3>No batches yet</h3>' +
        '<p>A batch is a group of trainees working one shared desk. Create one, ' +
        'then add the trainees who will work it.</p>' +
        '<button class="btn" data-ad="new-batch">Create the first batch</button></div>';
    }
    return '<div class="ad-bar"><button class="btn" data-ad="new-batch">New batch</button></div>' +
      '<table class="ad-table"><thead><tr><th>Batch</th><th>Code</th><th>Mode</th>' +
      '<th class="num">People</th><th>Status</th><th></th></tr></thead><tbody>' +
      state.batches.map(function (b) {
        var mem = state.members[b.id] || [];
        return '<tr><td><b>' + esc(b.name) + '</b></td>' +
          '<td class="mono">' + esc(b.join_code) + '</td>' +
          '<td>' + esc(b.mode) + '</td>' +
          '<td class="num">' + mem.length + '</td>' +
          '<td>' + (b.status === 'active' ? 'Active' : 'Archived') + '</td>' +
          '<td class="ad-act">' +
          '<button class="btn ghost sm" data-ad="people" data-id="' + b.id + '">People</button>' +
          (b.status === 'active'
            ? '<button class="btn ghost sm" data-ad="archive" data-id="' + b.id + '">Archive</button>'
            : '') +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function peopleView() {
    var b = null;
    state.batches.forEach(function (x) { if (x.id === state.openBatch) b = x; });
    if (!b) return batchesView();
    var mem = state.members[b.id] || [];
    var inBatch = {};
    mem.forEach(function (m) { inBatch[m.user_id] = m.role_in_batch; });

    return '<div class="ad-bar"><button class="btn ghost sm" data-ad="back">← All batches</button>' +
      '<span class="ad-title">' + esc(b.name) + ' <span class="mono">' +
      esc(b.join_code) + '</span></span></div>' +
      '<p class="ad-help">Trainees sign in with their employee ID and this batch code. ' +
      'They never have a password, so there is never one to reset.</p>' +
      '<table class="ad-table"><thead><tr><th>Name</th><th>Employee ID</th><th>Role</th>' +
      '<th>On this batch</th></tr></thead><tbody>' +
      state.roster.filter(function (p) { return p.role !== 'super_admin'; })
        .map(function (p) {
          var on = inBatch[p.id];
          return '<tr' + (p.is_active ? '' : ' class="ad-off"') + '>' +
            '<td>' + esc(p.full_name) + (p.is_active ? '' : ' <span class="ad-tag">deactivated</span>') + '</td>' +
            '<td class="mono">' + esc(p.employee_id || '—') + '</td>' +
            '<td>' + esc(p.role) + '</td>' +
            '<td>' + (on
              ? '<button class="btn ghost sm" data-ad="unassign" data-id="' + p.id + '">Remove</button>'
              : '<button class="btn ghost sm" data-ad="assign" data-id="' + p.id +
                '" data-role="' + esc(p.role) + '">Add</button>') +
            '</td></tr>';
        }).join('') + '</tbody></table>';
  }

  function accountsView() {
    var isAdmin = me().role === 'super_admin';
    return (isAdmin
      ? '<div class="ad-bar">' +
        '<button class="btn" data-ad="new-trainee">Add trainee</button>' +
        '<button class="btn ghost" data-ad="new-trainer">Add trainer</button></div>'
      : '<p class="ad-help">Only the administrator can create or deactivate accounts.</p>') +
      '<table class="ad-table"><thead><tr><th>Name</th><th>Employee ID</th><th>Email</th>' +
      '<th>Role</th><th class="num">Batches</th>' + (isAdmin ? '<th></th>' : '') +
      '</tr></thead><tbody>' +
      state.roster.map(function (p) {
        return '<tr' + (p.is_active ? '' : ' class="ad-off"') + '>' +
          '<td>' + esc(p.full_name) + '</td>' +
          '<td class="mono">' + esc(p.employee_id || '—') + '</td>' +
          '<td>' + esc(p.email || '—') + '</td>' +
          '<td>' + esc(p.role) + '</td>' +
          '<td class="num">' + p.batches + '</td>' +
          (isAdmin ? '<td class="ad-act">' +
            (p.id === me().id ? ''
              : '<button class="btn ghost sm" data-ad="' +
                (p.is_active ? 'deactivate' : 'reactivate') + '" data-id="' + p.id + '">' +
                (p.is_active ? 'Deactivate' : 'Reactivate') + '</button>' +
                (p.role !== 'trainee'
                  ? '<button class="btn ghost sm" data-ad="reset" data-id="' + p.id +
                    '">Reset password</button>' : '')) +
            '</td>' : '') +
          '</tr>';
      }).join('') + '</tbody></table>' +
      '<p class="ad-help">Accounts are deactivated, never deleted, so the work they did ' +
      'stays attributable after they leave.</p>';
  }

  function render() {
    if (!root) return;
    root.querySelector('.ad-body').innerHTML = errorStrip() + (
      busy ? '<div class="ad-empty"><p>Working…</p></div>'
        : tab === 'batches' ? (state.openBatch ? peopleView() : batchesView())
        : accountsView());
    root.querySelectorAll('.ad-tab').forEach(function (t) {
      t.classList.toggle('on', t.dataset.tab === tab);
    });
  }

  /* ---------------------------------------------------------------- forms */
  function ask(title, fields, help) {
    return new Promise(function (resolve) {
      var box = document.createElement('div');
      box.className = 'ad-ask';
      box.innerHTML = '<div class="ad-ask-card"><h3>' + esc(title) + '</h3>' +
        (help ? '<p class="ad-help">' + help + '</p>' : '') +
        fields.map(function (f) {
          if (f.options) {
            return '<label>' + esc(f.label) + '<select data-k="' + f.k + '">' +
              f.options.map(function (o) {
                return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
              }).join('') + '</select></label>';
          }
          return '<label>' + esc(f.label) + '<input data-k="' + f.k + '" ' +
            (f.type ? 'type="' + f.type + '" ' : '') +
            'placeholder="' + esc(f.placeholder || '') + '"></label>';
        }).join('') +
        '<div class="ad-ask-err" hidden></div>' +
        '<div class="ad-ask-row"><button class="btn ghost" data-x="cancel">Cancel</button>' +
        '<button class="btn" data-x="ok">Save</button></div></div>';
      document.body.appendChild(box);
      var first = box.querySelector('input,select'); if (first) first.focus();

      function close(v) { box.remove(); resolve(v); }
      box.addEventListener('click', function (ev) {
        if (ev.target.dataset.x === 'cancel' || ev.target === box) return close(null);
        if (ev.target.dataset.x !== 'ok') return;
        var out = {}, bad = false;
        box.querySelectorAll('[data-k]').forEach(function (i) {
          out[i.dataset.k] = i.value.trim();
          if (!i.value.trim()) bad = true;
        });
        if (bad) {
          var e = box.querySelector('.ad-ask-err');
          e.textContent = 'Every field is needed.';
          e.hidden = false;
          return;
        }
        close(out);
      });
      box.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') box.querySelector('[data-x="ok"]').click();
        if (ev.key === 'Escape') close(null);
      });
    });
  }

  /* ---------------------------------------------------------------- acts */
  function run(p) {
    busy = true; lastError = null; render();
    return p.then(load)
      .then(function () { busy = false; render(); })
      .catch(function (e) { busy = false; problem(e.message || String(e)); });
  }

  var acts = {
    'new-batch': function () {
      return ask('New batch', [
        { k: 'name', label: 'Batch name', placeholder: 'Batch 7 — Light Industrial' },
        { k: 'code', label: 'Batch code', placeholder: 'BATCH7' },
        { k: 'mode', label: 'Mode', options: ['collaborative', 'parallel'] },
        { k: 'desk', label: 'Desk type', options: ['d180', 'd360', 'dvms'] }
      ], 'The batch code is the second thing a trainee types when signing in. ' +
         'Capitals, digits and hyphens only. Collaborative means trainees see ' +
         'each other\u2019s work, which is how a real desk behaves.'
      ).then(function (v) {
        if (!v) return;
        if (!/^[A-Z0-9-]{4,24}$/.test(v.code.toUpperCase())) {
          say('A batch code is 4 to 24 characters: capitals, digits and hyphens.', 'no');
          return;
        }
        return run(
          sb().from('batches').insert({
            name: v.name, join_code: v.code.toUpperCase(), mode: v.mode,
            desk_type: v.desk, created_by: me().id
          }).select().single().then(function (r) {
            if (r.error) {
              throw new Error(String(r.error.code) === '23505'
                ? 'That batch code is already in use. Pick another.'
                : r.error.message);
            }
            /* The creator is its trainer, otherwise the batch is stranded. */
            return sb().from('batch_members').insert({
              batch_id: r.data.id, user_id: me().id, role_in_batch: 'trainer'
            }).then(function (m) {
              if (m.error) throw new Error(m.error.message);
              say('Batch created. Add trainees to it next.', 'ok');
            });
          })
        );
      });
    },

    people: function (id) { state.openBatch = id; render(); },
    back: function () { state.openBatch = null; render(); },

    assign: function (id, el) {
      return run(sb().from('batch_members').insert({
        batch_id: state.openBatch, user_id: id,
        role_in_batch: el.dataset.role === 'trainer' ? 'trainer' : 'trainee'
      }).then(function (r) { if (r.error) throw new Error(r.error.message); }));
    },

    unassign: function (id) {
      return run(sb().from('batch_members').delete()
        .eq('batch_id', state.openBatch).eq('user_id', id)
        .then(function (r) { if (r.error) throw new Error(r.error.message); }));
    },

    archive: function (id) {
      return ask('Archive this batch?', [
        { k: 'confirm', label: 'Type ARCHIVE to confirm', placeholder: 'ARCHIVE' }
      ], 'An archived batch can still be read and reported on, but nobody can ' +
         'change anything in it — including you. Nothing is deleted.'
      ).then(function (v) {
        if (!v || v.confirm.toUpperCase() !== 'ARCHIVE') return;
        return run(sb().from('batches')
          .update({ status: 'archived', archived_at: new Date().toISOString() })
          .eq('id', id)
          .then(function (r) { if (r.error) throw new Error(r.error.message); }));
      });
    },

    'new-trainee': function () {
      return ask('Add a trainee', [
        { k: 'employee_id', label: 'Employee ID', placeholder: 'E1001' },
        { k: 'full_name', label: 'Full name', placeholder: 'Asha Raman' }
      ], 'No password is created, because trainees sign in with their employee ' +
         'ID and a batch code. There will never be one to reset.'
      ).then(function (v) {
        if (!v) return;
        return run(adminCall({
          action: 'create_trainee',
          employee_id: v.employee_id, full_name: v.full_name
        }).then(function () {
          say('Trainee added. Put them on a batch to give them a desk.', 'ok');
        }));
      });
    },

    'new-trainer': function () {
      return ask('Add a trainer', [
        { k: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com' },
        { k: 'full_name', label: 'Full name', placeholder: 'Dana Vale' }
      ], 'A one-time password is shown once, here. Pass it on and have them ' +
         'change it.'
      ).then(function (v) {
        if (!v) return;
        return run(adminCall({
          action: 'create_staff', email: v.email,
          full_name: v.full_name, role: 'trainer'
        }).then(function (j) { showSecret(v.full_name, j.temporary_password); }));
      });
    },

    reset: function (id) {
      return run(adminCall({ action: 'reset_password', user_id: id })
        .then(function (j) { showSecret(personName(id), j.temporary_password); }));
    },

    deactivate: function (id) {
      return run(adminCall({ action: 'set_active', user_id: id, is_active: false }));
    },
    reactivate: function (id) {
      return run(adminCall({ action: 'set_active', user_id: id, is_active: true }));
    }
  };

  /* Shown once and never stored anywhere the browser can reach again. */
  function showSecret(name, pw) {
    var box = document.createElement('div');
    box.className = 'ad-ask';
    box.innerHTML = '<div class="ad-ask-card"><h3>Password for ' + esc(name) + '</h3>' +
      '<p class="ad-help">Shown once. Copy it now, pass it on, and have them change it.</p>' +
      '<div class="ad-secret mono">' + esc(pw) + '</div>' +
      '<div class="ad-ask-row"><button class="btn" data-x="ok">Done</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) {
      if (ev.target.dataset.x === 'ok' || ev.target === box) box.remove();
    });
  }

  /* ---------------------------------------------------------------- shell */
  function open() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'ad-wrap';
    root.innerHTML =
      '<div class="ad-panel"><div class="ad-head">' +
      '<h2>Manage</h2>' +
      '<div class="ad-tabs">' +
      '<button class="ad-tab on" data-tab="batches">Batches</button>' +
      '<button class="ad-tab" data-tab="accounts">Accounts</button></div>' +
      '<span class="sp"></span>' +
      '<button class="btn ghost sm" data-ad="close">Close</button></div>' +
      '<div class="ad-body"><div class="ad-empty"><p>Loading…</p></div></div></div>';
    document.body.appendChild(root);

    root.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-tab]');
      if (t) { tab = t.dataset.tab; state.openBatch = null; return render(); }
      var a = ev.target.closest('[data-ad]');
      if (!a) { if (ev.target === root) close(); return; }
      var k = a.dataset.ad;
      if (k === 'close') return close();
      if (k === 'dismiss') { lastError = null; return render(); }
      if (acts[k]) acts[k](a.dataset.id, a);
    });
    document.addEventListener('keydown', escClose);

    load().then(render).catch(function (e) {
      root.querySelector('.ad-body').innerHTML =
        '<div class="ad-empty"><h3>Could not load</h3><p>' + esc(e.message) + '</p></div>';
    });
  }

  function escClose(ev) { if (ev.key === 'Escape') close(); }

  function close() {
    if (!root) return;
    root.remove(); root = null;
    document.removeEventListener('keydown', escClose);
    state.openBatch = null;
    /* The desk may now be looking at a batch that has changed underneath it. */
    if (window.Store && window.Store.reload) window.Store.reload();
  }

  window.ATSAdmin = { open: open, close: close };
})();
