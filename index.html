/* =====================================================================
   staff.js — the Training operations section of the rail.

   Three views, visible only to trainers and administrators:

     Overview   every batch the reader may report on, as a board
     Reports    the four downloads, as formatted Excel workbooks
     Accounts   batches, people and membership

   The visibility rule is the one Bullhorn uses: same application, extra
   entries earned by role, and record access governed underneath rather
   than by hiding screens. A trainer works their own batches and can read
   the numbers for everyone else's; the database enforces that in
   rpt_* and refuses a trainee outright, so what follows is presentation.
   ===================================================================== */
(function () {
  'use strict';

  var VIEWS = { overview: 1, staffreports: 1, accounts: 1 };
  var cache = { batches: null, at: 0 };
  var busy = false, err = null;
  var scope = null;      // batch id, or null for every batch the reader may see
  var whoFor = {};       // trainee, per report — not every report has one

  function sb() { return window.Store && window.Store.sb && window.Store.sb(); }
  function me() { return (window.Store && window.Store.whoami && window.Store.whoami()) || {}; }
  function staff() { return me().role === 'trainer' || me().role === 'super_admin'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* A background load finishing must not replace the view while somebody is
     using a control on it. Opening Reports starts a fetch; roughly a second
     later it resolved and redrew the page, closing whatever dropdown had been
     opened in the meantime. The data still arrives — the repaint waits until
     the control is let go. */
  function busyControl() {
    var a = document.activeElement;
    if (!a || a === document.body) return false;
    var t = (a.tagName || '').toLowerCase();
    if (t !== 'select' && t !== 'input' && t !== 'textarea') return false;
    return !!(a.closest && a.closest('#main'));
  }

  /* Repaint only when the view would actually come out different. The console
     showed this running every 610ms with nothing changing, and a dropdown
     cannot survive a page that rebuilds itself twice a second.

     The focus check below is kept but is not relied on: while a native select
     popup is open the browser reports document.activeElement as <body>, not as
     the select, so a guard written that way can never fire. That is why the
     two previous attempts at this made no difference. */
  var lastPaint = '';

  function redraw() {
    if (!window.APP || !window.APP.render) return;
    var main = document.getElementById('main');
    var fresh;
    comparing = true;
    try { fresh = render(currentView()); } catch (e) { fresh = null; }
    comparing = false;
    if (fresh != null && main && fresh === lastPaint) return;   // nothing changed
    if (fresh != null) lastPaint = fresh;
    window.APP.render();
  }

  function currentView() {
    var h = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    return VIEWS[h] ? h : 'overview';
  }
  function say(m, k) { if (window.APP && window.APP.toast) window.APP.toast(m, k); }

  function A() { return window.ATSAdmin || {}; }

  function act(p) {
    busy = true; err = null; redraw();
    return Promise.resolve(p)
      .then(function () { return batches(true); })
      .then(function () { busy = false; redraw(); })
      .catch(function (e) { busy = false; err = e.message || String(e); redraw(); });
  }

  function rpc(name, args) {
    var c = sb();
    if (!c) return Promise.reject(new Error('Not connected.'));
    return c.rpc(name, args || {}).then(function (r) {
      if (r.error) throw new Error(r.error.message);
      return r.data || [];
    });
  }

  /* ---------------------------------------------------------------- load */
  function batches(force) {
    if (!force && cache.batches && Date.now() - cache.at < 20000) {
      return Promise.resolve(cache.batches);
    }
    return rpc('rpt_batches').then(function (rows) {
      cache.batches = rows; cache.at = Date.now();
      return rpc('rpt_scorecard').then(function (sc) {
        var seen = {};
        cache.people = (sc || []).map(function (r) { return r.trainee; })
          .filter(function (n) { if (!n || seen[n]) return false; seen[n] = 1; return true; });
        return rows;
      }, function () { cache.people = []; return rows; });
    });
  }

  function refresh(view) {
    busy = true; err = null; redraw();
    batches(true).then(function () { busy = false; redraw(); })
      .catch(function (e) { busy = false; err = e.message; redraw(); });
  }

  /* ------------------------------------------------------------- overview */
  function hrs(n) {
    if (n == null) return '—';
    if (n < 24) return Math.round(n) + 'h';
    return Math.round(n / 24) + 'd';
  }

  function overview() {
    var rows = cache.batches || [];
    var mine = rows.filter(function (b) { return b.mine; });
    var other = rows.filter(function (b) { return !b.mine; });

    function actions(b) {
      /* Only on your own batches. Another trainer's row is numbers, and an
         action button sitting on it would be an invitation to a refusal. */
      return '<td class="st-act">' +
        '<button class="btn ghost sm" data-st="people" data-id="' + esc(b.batch_id) + '">People</button>' +
        '<button class="btn ghost sm" data-st="edit" data-id="' + esc(b.batch_id) + '">Edit</button>' +
        (b.status === 'active'
          ? '<button class="btn ghost sm" data-st="archive" data-id="' + esc(b.batch_id) + '">Archive</button>'
          : '') + '</td>';
    }

    function table(list, readonly) {
      if (!list.length) return '';
      return '<table class="st-table"><thead><tr>' +
        '<th>Batch</th><th>Code</th><th>Mode</th>' +
        '<th class="num">Trainees</th><th class="num">Open jobs</th>' +
        '<th class="num">To review</th><th class="num">On trainee</th>' +
        '<th class="num">To client</th><th class="num">Oldest</th>' +
        '<th>Status</th>' + (readonly ? '' : '<th></th>') + '</tr></thead><tbody>' +
        list.map(function (b) {
          var stale = b.oldest_waiting_hours != null && b.oldest_waiting_hours > 24;
          return '<tr' + (b.status !== 'active' ? ' class="st-off"' : '') + '>' +
            '<td><b>' + esc(b.batch_name) + '</b>' +
            (readonly ? '<span class="st-tag">' + esc(b.trainer) + '</span>' : '') + '</td>' +
            '<td class="mono">' + esc(b.join_code) + '</td>' +
            '<td>' + esc(b.mode) + '</td>' +
            '<td class="num">' + b.trainees + '</td>' +
            '<td class="num">' + b.open_jobs + '</td>' +
            '<td class="num' + (b.awaiting_review > 0 ? ' st-hot' : '') + '">' +
              b.awaiting_review + '</td>' +
            '<td class="num">' + b.awaiting_trainee + '</td>' +
            '<td class="num">' + b.sent_to_client + '</td>' +
            '<td class="num' + (stale ? ' st-hot' : '') + '">' +
              hrs(b.oldest_waiting_hours) + '</td>' +
            '<td>' + (b.status === 'active' ? 'Active' : 'Archived') + '</td>' +
            (readonly ? '' : actions(b)) +
            '</tr>';
        }).join('') + '</tbody></table>';
    }

    var waiting = mine.reduce(function (n, b) { return n + Number(b.awaiting_review || 0); }, 0);

    return '<div class="h"><h2>Overview</h2><span class="sp"></span>' +
      '<div class="btnrow"><button class="btn ghost" data-st="refresh">Refresh</button>' +
      '<button class="btn" data-st="newbatch">New batch</button></div></div>' +
      (err ? '<div class="ad-err">' + esc(err) + '</div>' : '') +
      (busy ? '<p class="muted">Loading…</p>' : '') +
      (!rows.length && !busy
        ? '<div class="ad-empty"><h3>Set up your first desk</h3><p>A batch is one ' +
          'shared desk: the clients, the job orders and the pipeline a group of ' +
          'trainees will work. Create it now and build it out before anyone joins.</p>' +
          '<button class="btn" data-st="newbatch">New batch</button></div>'
        : '<div class="sec">' +
          '<p class="st-lead">' +
          (waiting
            ? '<b>' + waiting + '</b> submission' + (waiting === 1 ? '' : 's') +
              ' waiting on you across your batches.'
            : 'Nothing is waiting on you.') +
          '</p>' +
          (mine.length ? '<h3 class="st-h">Your batches</h3>' + table(mine, false) : '') +
          (other.length
            ? '<h3 class="st-h">Other batches</h3>' +
              '<p class="muted st-note">Numbers only. The records inside these ' +
              'batches belong to the trainer who runs them.</p>' +
              table(other, true)
            : '') +
          '</div>');
  }

  /* --------------------------------------------------------- batch people */
  var people = { batch: null, roster: [], members: [] };

  function openPeople(id) {
    var c = sb();
    busy = true; err = null; people.batch = id; redraw();
    Promise.all([
      c.rpc('roster'),
      c.from('batch_members').select('*').eq('batch_id', id)
    ]).then(function (r) {
      if (r[0].error) throw new Error(r[0].error.message);
      if (r[1].error) throw new Error(r[1].error.message);
      people.roster = r[0].data || [];
      people.members = r[1].data || [];
      busy = false; redraw();
    }).catch(function (e) { busy = false; err = e.message; redraw(); });
  }

  function peopleView() {
    var b = (cache.batches || []).filter(function (x) {
      return x.batch_id === people.batch;
    })[0] || {};
    var on = {};
    people.members.forEach(function (m) { on[m.user_id] = m.role_in_batch; });
    var list = people.roster.filter(function (p) { return p.role !== 'super_admin'; });

    return '<div class="h"><h2>' + esc(b.batch_name || 'Batch') + '</h2>' +
      '<span class="sp"></span><div class="btnrow">' +
      '<button class="btn ghost" data-st="back">\u2190 Overview</button></div></div>' +
      (err ? '<div class="ad-err">' + esc(err) + '</div>' : '') +
      '<div class="sec">' +
      '<p class="st-lead">Trainees sign in with their employee ID and the batch ' +
      'code <span class="mono">' + esc(b.join_code || '') + '</span>. ' +
      'They never have a password, so there is never one to reset.</p>' +
      (busy ? '<p class="muted">Loading\u2026</p>' : '') +
      (!list.length && !busy
        ? '<div class="ad-empty"><h3>Nobody to add yet</h3><p>Create accounts ' +
          'under Accounts first, then come back and put them on this batch.</p></div>'
        : '<table class="st-table"><thead><tr><th>Name</th><th>Employee ID</th>' +
          '<th>Role</th><th></th></tr></thead><tbody>' +
          list.map(function (p) {
            return '<tr' + (p.is_active ? '' : ' class="st-off"') + '>' +
              '<td>' + esc(p.full_name) +
              (p.is_active ? '' : ' <span class="st-tag">deactivated</span>') + '</td>' +
              '<td class="mono">' + esc(p.employee_id || '\u2014') + '</td>' +
              '<td>' + esc(p.role) + '</td>' +
              '<td class="st-act">' + (on[p.id]
                ? '<button class="btn ghost sm" data-st="unassign" data-id="' + esc(p.id) + '">Remove</button>'
                : '<button class="btn ghost sm" data-st="assign" data-id="' + esc(p.id) +
                  '" data-role="' + esc(p.role) + '">Add to batch</button>') + '</td></tr>';
          }).join('') + '</tbody></table>') +
      '</div>';
  }

  /* ------------------------------------------------------------- accounts */
  var roster = null;

  function loadRoster(force) {
    if (roster && !force) return Promise.resolve(roster);
    return rpc('roster').then(function (r) { roster = r; return r; });
  }

  /* A roster of 150 with no way to narrow it is a scrolling exercise. */
  var filt = { q: '', role: '', status: '', sort: 'name' };

  function rosterRows() {
    var rows = (roster || []).slice();
    var q = filt.q.trim().toLowerCase();
    if (q) rows = rows.filter(function (p) {
      return (p.full_name || '').toLowerCase().indexOf(q) >= 0
          || (p.employee_id || '').toLowerCase().indexOf(q) >= 0
          || (p.email || '').toLowerCase().indexOf(q) >= 0;
    });
    if (filt.role) rows = rows.filter(function (p) { return p.role === filt.role; });
    if (filt.status === 'active') rows = rows.filter(function (p) { return p.is_active; });
    if (filt.status === 'off') rows = rows.filter(function (p) { return !p.is_active; });
    if (filt.status === 'unassigned') rows = rows.filter(function (p) {
      return p.role === 'trainee' && Number(p.batches) === 0;
    });
    rows.sort(function (a, b) {
      if (filt.sort === 'batches') return Number(b.batches) - Number(a.batches);
      if (filt.sort === 'role') return String(a.role).localeCompare(String(b.role))
        || String(a.full_name).localeCompare(String(b.full_name));
      if (filt.sort === 'employee') return String(a.employee_id || '~')
        .localeCompare(String(b.employee_id || '~'));
      return String(a.full_name).localeCompare(String(b.full_name));
    });
    return rows;
  }

  function filterBar() {
    var unassigned = (roster || []).filter(function (p) {
      return p.role === 'trainee' && Number(p.batches) === 0;
    }).length;
    function sel(k, opts) {
      return '<select data-sf="' + k + '">' + opts.map(function (o) {
        return '<option value="' + o[0] + '"' + (filt[k] === o[0] ? ' selected' : '') +
          '>' + esc(o[1]) + '</option>';
      }).join('') + '</select>';
    }
    return '<div class="ad-filter">' +
      '<input data-sf="q" placeholder="Search name, employee ID or email" value="' +
        esc(filt.q) + '">' +
      sel('role', [['', 'Any role'], ['trainee', 'Trainee'], ['trainer', 'Trainer'],
                   ['super_admin', 'Administrator']]) +
      sel('status', [['', 'Any status'], ['active', 'Active only'],
                     ['off', 'Deactivated only'],
                     ['unassigned', 'Trainees on no batch' +
                       (unassigned ? ' (' + unassigned + ')' : '')]]) +
      sel('sort', [['name', 'Sort by name'], ['role', 'Sort by role'],
                   ['employee', 'Sort by employee ID'], ['batches', 'Sort by batches']]) +
      (filt.q || filt.role || filt.status
        ? '<button class="btn ghost sm" data-st="clearf">Clear</button>' : '') +
      '</div>';
  }

  function accountsView() {
    var isAdmin = me().role === 'super_admin';
    var shown = rosterRows();
    return '<div class="h"><h2>Accounts and batches</h2><span class="sp"></span>' +
      (isAdmin ? '<div class="btnrow">' +
        '<button class="btn" data-st="newtrainee">Add trainee</button>' +
        '<button class="btn ghost" data-st="newtrainer">Add trainer</button></div>' : '') +
      '</div>' +
      (err ? '<div class="ad-err">' + esc(err) + '</div>' : '') +
      '<div class="sec">' +
      (isAdmin ? '' : '<p class="muted st-note">Only the administrator can create ' +
        'or deactivate accounts.</p>') +
      (!roster ? '<p class="muted">Loading\u2026</p>' : '') +
      /* The bar shows with the table, not with a loaded flag: the table was
         being drawn empty while the roster was still on its way, which made
         the filters look absent rather than pending. */
      (roster ? filterBar() : '') +
      (roster && roster.length && !shown.length
        ? '<div class="ad-empty"><h3>Nothing matches</h3><p>No account matches ' +
          'those filters. Clear them to see everyone.</p></div>' : '') +
      (!roster ? ''
        : !roster.length
        ? '<div class="ad-empty"><h3>No accounts yet</h3><p>' +
          (isAdmin ? 'Add a trainee or a trainer to get started.'
                   : 'The administrator has not created any accounts yet.') + '</p></div>'
        : '<table class="st-table"><thead><tr><th>Name</th><th>Employee ID</th>' +
          '<th>Email</th><th>Role</th><th class="num">Batches</th>' +
          (isAdmin ? '<th></th>' : '') + '</tr></thead><tbody>' +
          shown.map(function (p) {
            return '<tr' + (p.is_active ? '' : ' class="st-off"') + '>' +
              '<td>' + esc(p.full_name) +
              (p.is_active ? '' : ' <span class="st-tag">deactivated</span>') + '</td>' +
              '<td class="mono">' + esc(p.employee_id || '\u2014') + '</td>' +
              '<td>' + esc(p.email || '\u2014') + '</td>' +
              '<td>' + esc(p.role) + '</td>' +
              '<td class="num">' + p.batches + '</td>' +
              (isAdmin ? '<td class="st-act">' + (p.id === me().id ? '' :
                '<button class="btn ghost sm" data-st="' +
                  (p.is_active ? 'deactivate' : 'reactivate') + '" data-id="' + esc(p.id) + '">' +
                  (p.is_active ? 'Deactivate' : 'Reactivate') + '</button>' +
                (p.role !== 'trainee'
                  ? '<button class="btn ghost sm" data-st="resetpw" data-id="' + esc(p.id) +
                    '">Reset password</button>' : '')) + '</td>' : '') +
              '</tr>';
          }).join('') + '</tbody></table>') +
      '<p class="muted st-note">Accounts are deactivated, never deleted, so the ' +
      'work they did stays attributable after they leave.</p></div>';
  }

  /* -------------------------------------------------------------- reports */
  var REPORTS = [
    { k: 'scorecard', fn: 'rpt_scorecard', t: 'Trainee scorecard', who: true,
      d: 'One row per trainee. Volumes, internal-to-client conversion, ' +
         'turnaround on queries and on sendouts, and how much of what they ' +
         'sent was good enough to reach the client.',
      why: 'The headline number is internal-to-client. It answers whether ' +
           'their write-ups are landing, which is the thing coaching changes.' },
    { k: 'rejections', fn: 'rpt_rejections', t: 'Rejection analysis',
      d: 'Where submissions die, by reason and by stage, with the share each ' +
         'reason accounts for.',
      why: 'Coachable reasons are trainee error; the rest is the market. ' +
           'The split is what stops a debrief becoming defensive.' },
    { k: 'activity', fn: 'rpt_activity', t: 'Activity log',
      d: 'Every recorded action, newest first: who did what, to which record, ' +
         'and when.',
      why: 'The evidence behind an appraisal comment, and the answer to ' +
           '"did they actually work the desk".' },
    { k: 'footprint', fn: 'rpt_activity', t: 'Trainee footprint',
      d: 'One trainee, every action they took, in order: what they sourced, ' +
         'what they wrote, what they submitted and when.',
      why: 'This is the session summary, per person and for the whole batch ' +
           'rather than one browser. It is what an appraisal comment has to ' +
           'rest on if it is going to survive being questioned.',
      who: true, needsWho: true },
    { k: 'batches', fn: 'rpt_batches', t: 'Batch summary',
      d: 'One row per batch: people, job orders, pipeline depth, what is ' +
         'waiting and for how long.',
      why: 'The management view. Goes straight into a weekly pack.' }
  ];

  function reports() {
    var rows = cache.batches || [];
    var people = (cache.people || []).slice().sort();
    return '<div class="h"><h2>Reports</h2></div>' +
      (err ? '<div class="ad-err">' + esc(err) + '</div>' : '') +
      '<div class="sec">' +
      '<div class="st-scope"><label>Batch' +
      '<select data-st="scope"><option value="">All batches I can report on</option>' +
      rows.map(function (b) {
        return '<option value="' + esc(b.batch_id) + '"' +
          (scope === b.batch_id ? ' selected' : '') + '>' + esc(b.batch_name) +
          (b.mine ? '' : ' (not yours)') + '</option>';
      }).join('') + '</select></label>' +
      '<p class="muted st-note" id="st-scope-note"></p></div>' +
      '<div class="st-cards">' +
      REPORTS.map(function (r) {
        return '<div class="st-card"><h3>' + esc(r.t) + '</h3>' +
          '<p>' + esc(r.d) + '</p>' +
          '<p class="st-why">' + esc(r.why) + '</p>' +
          (r.who
            ? '<label class="st-who">Trainee<select data-st="who" data-k="' + r.k + '">' +
              '<option value="">Everyone</option>' +
              people.map(function (p) {
                return '<option value="' + esc(p) + '"' +
                  (whoFor[r.k] === p ? ' selected' : '') + '>' + esc(p) + '</option>';
              }).join('') + '</select></label>'
            : '') +
          (r.needsWho && !whoFor[r.k]
            ? '<p class="st-need">Choose a trainee.</p>' : '') +
          '<div class="st-card-foot">' +
          '<button class="btn" data-st="dl" data-k="' + r.k + '"' +
          (r.needsWho && !whoFor[r.k] ? ' disabled' : '') + '>Download</button></div></div>';
      }).join('') + '</div></div>';
  }

  /* ---------------------------------------------------------------- excel */
  var HEAD = {
    footprint: ['Batch', 'Yours', 'When', 'Who', 'Employee ID', 'Action', 'Record', 'Detail'],
    scorecard: ['Batch', 'Yours', 'Employee ID', 'Trainee', 'Candidates added',
      'Notes written', 'Avg note length', 'Submissions', 'Sent internal',
      'Sent to client', 'Interviews', 'Rejected', 'Rejected (coachable)',
      '% internal to client', 'Avg hours to sendout', 'Avg summary length',
      'Queries received', 'Queries answered', 'Avg hours to answer', 'Last seen'],
    rejections: ['Batch', 'Yours', 'Reason', 'Coachable', 'Stage', 'Count', '% of batch'],
    activity: ['Batch', 'Yours', 'When', 'Who', 'Employee ID', 'Action', 'Record', 'Detail'],
    batches: ['Batch ID', 'Batch', 'Code', 'Mode', 'Status', 'Desk', 'Trainer', 'Yours',
      'Trainees', 'Job orders', 'Open jobs', 'Candidates', 'Submissions',
      'Sent to client', 'Awaiting review', 'Awaiting trainee',
      'Oldest waiting (hours)', 'Started', 'Last activity']
  };

  function download(kind) {
    var r = REPORTS.filter(function (x) { return x.k === kind; })[0];
    if (!r || !window.XLSX) {
      return say('The spreadsheet library did not load.', 'no');
    }
    busy = true; err = null; redraw();

    var args = r.fn === 'rpt_batches' ? {} : { p_batch: scope || null };
    rpc(r.fn, args).then(function (rows) {
      busy = false;
      var pick = whoFor[r.k];
      if (r.who && pick) {
        rows = rows.filter(function (x) { return (x.actor || x.trainee) === pick; });
      }
      if (!rows.length) { say('That report has no rows yet.', 'no'); return redraw(); }

      var head = HEAD[kind];
      var body = rows.map(function (o) { return Object.keys(o).map(function (k) {
        var v = o[k];
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        return v == null ? '' : v;
      }); });

      var title = r.t;
      var pickName = whoFor[kind];
      var scopeName = scope
        ? (cache.batches.filter(function (b) { return b.batch_id === scope; })[0] || {}).batch_name
        : 'All batches';

      /* A title block above the data, because these get forwarded and a bare
         grid of numbers with no date on it is worth very little a week later. */
      var aoa = [
        [title],
        ['Scope', scopeName || ''],
        ['Trainee', pickName || 'Everyone'],
        ['Generated', new Date().toLocaleString()],
        ['Run by', me().full_name || ''],
        [],
        head
      ].concat(body);

      var ws = window.XLSX.utils.aoa_to_sheet(aoa);

      /* Column widths from the content, so nothing arrives as ####. */
      ws['!cols'] = head.map(function (h, i) {
        var longest = h.length;
        body.forEach(function (row) {
          var len = String(row[i] == null ? '' : row[i]).length;
          if (len > longest) longest = len;
        });
        return { wch: Math.min(42, Math.max(10, longest + 2)) };
      });
      ws['!freeze'] = { xSplit: 0, ySplit: 6 };
      ws['!autofilter'] = {
        ref: window.XLSX.utils.encode_range({
          s: { r: 5, c: 0 }, e: { r: 5 + body.length, c: head.length - 1 }
        })
      };

      /* Bold the title and the header row. SheetJS's community build writes
         cell styles it can read back; some viewers ignore them, which is why
         the layout above does not depend on them. */
      ['A1'].concat(head.map(function (_, i) {
        return window.XLSX.utils.encode_cell({ r: 5, c: i });
      })).forEach(function (addr) {
        if (ws[addr]) ws[addr].s = { font: { bold: true } };
      });

      var wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 28));

      var stamp = new Date().toISOString().slice(0, 10);
      var name = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + stamp + '.xlsx';
      window.XLSX.writeFile(wb, name);
      say('Downloaded ' + name, 'ok');
      redraw();
    }).catch(function (e) {
      busy = false; err = e.message; redraw();
    });
  }

  /* Editing a batch. Everything here is safe to change after the fact except
     the code, which trainees may already have written down \u2014 so it is
     offered, with the consequence stated rather than hidden. */
  function editBatch(id) {
    var b = (cache.batches || []).filter(function (x) { return x.batch_id === id; })[0];
    if (!b) return;
    return A().ask('Edit ' + b.batch_name, [
      { k: 'name', label: 'Batch name', placeholder: b.batch_name },
      { k: 'code', label: 'Batch code', placeholder: b.join_code },
      { k: 'mode', label: 'Mode', options: ['collaborative', 'parallel'] },
      { k: 'desk', label: 'Desk type', options: ['d180', 'd360', 'dvms'] }
    ], 'Changing the code stops the old one working straight away, so anyone ' +
       'who has written it down will need the new one. Switching to parallel ' +
       'hides trainees\u2019 work from each other from that moment; it does not ' +
       'hide what they have already seen.'
    ).then(function (v) {
      if (!v) return;
      if (!/^[A-Z0-9-]{4,24}$/.test(v.code.toUpperCase())) {
        err = 'A batch code is 4 to 24 characters: capitals, digits and hyphens.';
        return redraw();
      }
      return act(sb().from('batches').update({
        name: v.name, join_code: v.code.toUpperCase(),
        mode: v.mode, desk_type: v.desk
      }).eq('id', id).select().then(function (r) {
        if (r.error) {
          throw new Error(String(r.error.code) === '23505'
            ? 'That batch code is already in use by another batch.'
            : r.error.message);
        }
        /* A refused update changes nothing and raises nothing, so the row
           count is the only signal that it did not happen. */
        if (!r.data || !r.data.length) {
          throw new Error('That batch is not yours to edit.');
        }
        say('Batch updated.', 'ok');
      }));
    });
  }

  /* ---------------------------------------------------------------- render */
  var comparing = false;

  function render(view) {
    if (!staff()) {
      return '<div class="ad-empty"><h3>Not available</h3>' +
        '<p>This section is for trainers and administrators.</p></div>';
    }
    if (!cache.batches && !busy && !comparing) {
      busy = true;
      batches().then(function () { busy = false; redraw(); })
        .catch(function (e) { busy = false; err = e.message; redraw(); });
    }
    if (view === 'overview') return people.batch ? peopleView() : overview();
    if (view === 'staffreports') return reports();
    if (!roster && !busy && !comparing) {
      busy = true;
      loadRoster().then(function () { busy = false; redraw(); })
        .catch(function (e) { busy = false; err = e.message; redraw(); });
    }
    return accountsView();
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-st]');
    if (!t) return;
    var k = t.dataset.st;
    ev.preventDefault();
    var id = t.dataset.id;
    var a = A();

    if (k === 'refresh') return refresh();
    if (k === 'dl') return download(t.dataset.k);
    if (k === 'back') { people.batch = null; return redraw(); }
    if (k === 'people') return openPeople(id);

    if (k === 'newbatch') return a.acts && a.acts['new-batch']().then(function () {
      cache.batches = null; return act(batches(true));
    });

    if (k === 'edit') return editBatch(id);

    if (k === 'archive') {
      return a.ask('Archive this batch?', [
        { k: 'confirm', label: 'Type ARCHIVE to confirm', placeholder: 'ARCHIVE' }
      ], 'An archived batch can still be read and reported on, but nobody can ' +
         'change anything in it \u2014 including you. Nothing is deleted.'
      ).then(function (v) {
        if (!v || v.confirm.toUpperCase() !== 'ARCHIVE') return;
        return act(sb().from('batches')
          .update({ status: 'archived', archived_at: new Date().toISOString() })
          .eq('id', id).select().then(function (r) {
            if (r.error) throw new Error(r.error.message);
            if (!r.data || !r.data.length) {
              throw new Error('That batch is not yours to archive.');
            }
          }));
      });
    }

    if (k === 'assign') {
      return act(sb().from('batch_members').insert({
        batch_id: people.batch, user_id: id,
        role_in_batch: t.dataset.role === 'trainer' ? 'trainer' : 'trainee'
      }).then(function (r) {
        if (r.error) throw new Error(r.error.message);
        return openPeople(people.batch);
      }));
    }
    if (k === 'unassign') {
      return act(sb().from('batch_members').delete()
        .eq('batch_id', people.batch).eq('user_id', id)
        .then(function (r) {
          if (r.error) throw new Error(r.error.message);
          return openPeople(people.batch);
        }));
    }

    if (k === 'newtrainee' || k === 'newtrainer') {
      var which = k === 'newtrainee' ? 'new-trainee' : 'new-trainer';
      return a.acts[which]().then(function () {
        return act(loadRoster(true));
      });
    }
    if (k === 'deactivate' || k === 'reactivate') {
      return act(a.adminCall({ action: 'set_active', user_id: id,
        is_active: k === 'reactivate' }).then(function () { return loadRoster(true); }));
    }
    if (k === 'resetpw') {
      return act(a.adminCall({ action: 'reset_password', user_id: id })
        .then(function (j) {
          var n = (roster || []).filter(function (p) { return p.id === id; })[0] || {};
          a.showSecret(n.full_name || 'this user', j.temporary_password);
        }));
    }
  });

  function onFilter(ev) {
    var k = ev.target.dataset && ev.target.dataset.sf;
    if (!k) return;
    filt[k] = ev.target.value;
    /* Only the rows are replaced. Rebuilding the whole view would take the
       focus out of the search box on every keystroke. */
    var el = ev.target;
    var caret = (k === 'q' && el.setSelectionRange) ? el.selectionStart : null;
    var tb = document.querySelector('#main .st-table tbody');
    if (!tb) { redraw(); }
    else {
      var host = document.createElement('div');
      host.innerHTML = accountsView();
      var fresh = host.querySelector('.st-table tbody');
      tb.innerHTML = fresh ? fresh.innerHTML
        : '<tr><td colspan="6" class="muted">No account matches those filters.</td></tr>';
      if (!rosterRows().length) {
        tb.innerHTML = '<tr><td colspan="6" class="muted">No account matches those ' +
          'filters.</td></tr>';
      }
    }
    /* The input is only replaced if the whole view was redrawn; either way,
       put the focus and the caret back where the person left them. */
    var again = document.querySelector('[data-sf="' + k + '"]');
    if (again) {
      again.focus();
      if (caret != null && again.setSelectionRange) again.setSelectionRange(caret, caret);
    }
  }
  document.addEventListener('input', onFilter);

  document.addEventListener('change', function (ev) {
    if (ev.target.dataset && ev.target.dataset.sf) return onFilter(ev);
    var d = ev.target.dataset || {};
    if (d.st === 'scope' || d.st === 'who') {
      if (d.st === 'scope') scope = ev.target.value || null;
      if (d.st === 'who') {
        whoFor[d.k] = ev.target.value || null;
        /* The tile's own button has to enable or disable with the choice, so
           this one card is repainted. The select being changed is inside it,
           so the value is written back before anything is replaced. */
        return paintCard(d.k);
      }
      /* Deliberately not a redraw. Re-rendering the view replaces the select
         element, which closes it mid-choice and looks like the control is
         broken. Only the sentence underneath needs to change. */
      paintScope();
    }
  });

  /* Repaint one tile without touching the rest of the page, so no other
     open control is destroyed. */
  function paintCard(k) {
    var r = REPORTS.filter(function (x) { return x.k === k; })[0];
    if (!r) return;
    var btn = document.querySelector('[data-st="dl"][data-k="' + k + '"]');
    if (btn) {
      if (r.needsWho && !whoFor[k]) btn.setAttribute('disabled', '');
      else btn.removeAttribute('disabled');
    }
    var need = btn && btn.closest('.st-card').querySelector('.st-need');
    if (need) need.hidden = !(r.needsWho && !whoFor[k]);
    paintScope();
  }

  function paintScope() {
    var el = document.getElementById('st-scope-note');
    if (!el) return;
    var rows = cache.batches || [];
    var b = scope && rows.filter(function (x) { return x.batch_id === scope; })[0];
    el.innerHTML = 'Downloads are Excel workbooks covering <b>' +
      esc(b ? b.batch_name : 'every batch you can report on') +
      '</b>. Figures are as at the moment you press the button.';
  }

  window.ATSStaff = { render: render, views: VIEWS, staff: staff };
})();
