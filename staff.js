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
  var busy = false, err = null, scope = null;   // scope: batch id, or null for all

  function sb() { return window.Store && window.Store.sb && window.Store.sb(); }
  function me() { return (window.Store && window.Store.whoami && window.Store.whoami()) || {}; }
  function staff() { return me().role === 'trainer' || me().role === 'super_admin'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function redraw() { if (window.APP && window.APP.render) window.APP.render(); }
  function say(m, k) { if (window.APP && window.APP.toast) window.APP.toast(m, k); }

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
      return rows;
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

    function table(list, readonly) {
      if (!list.length) return '';
      return '<table class="st-table"><thead><tr>' +
        '<th>Batch</th><th>Code</th><th>Mode</th>' +
        '<th class="num">Trainees</th><th class="num">Open jobs</th>' +
        '<th class="num">To review</th><th class="num">On trainee</th>' +
        '<th class="num">To client</th><th class="num">Oldest</th>' +
        '<th>Status</th></tr></thead><tbody>' +
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
            '</tr>';
        }).join('') + '</tbody></table>';
    }

    var waiting = mine.reduce(function (n, b) { return n + Number(b.awaiting_review || 0); }, 0);

    return '<div class="h"><h2>Overview</h2><span class="sp"></span>' +
      '<div class="btnrow"><button class="btn ghost" data-st="refresh">Refresh</button></div></div>' +
      (err ? '<div class="ad-err">' + esc(err) + '</div>' : '') +
      (busy ? '<p class="muted">Loading…</p>' : '') +
      (!rows.length && !busy
        ? '<div class="ad-empty"><h3>No batches yet</h3><p>Create one under ' +
          'Accounts and batches, then build it out before trainees join.</p></div>'
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

  /* -------------------------------------------------------------- reports */
  var REPORTS = [
    { k: 'scorecard', fn: 'rpt_scorecard', t: 'Trainee scorecard',
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
    { k: 'batches', fn: 'rpt_batches', t: 'Batch summary',
      d: 'One row per batch: people, job orders, pipeline depth, what is ' +
         'waiting and for how long.',
      why: 'The management view. Goes straight into a weekly pack.' }
  ];

  function reports() {
    var rows = cache.batches || [];
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
      '<p class="muted st-note">Downloads are Excel workbooks. Figures are ' +
      'as at the moment you press the button.</p></div>' +
      '<div class="st-cards">' +
      REPORTS.map(function (r) {
        return '<div class="st-card"><h3>' + esc(r.t) + '</h3>' +
          '<p>' + esc(r.d) + '</p>' +
          '<p class="st-why">' + esc(r.why) + '</p>' +
          '<button class="btn" data-st="dl" data-k="' + r.k + '">Download</button></div>';
      }).join('') + '</div></div>';
  }

  /* ---------------------------------------------------------------- excel */
  var HEAD = {
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
      if (!rows.length) { say('That report has no rows yet.', 'no'); return redraw(); }

      var head = HEAD[kind];
      var body = rows.map(function (o) { return Object.keys(o).map(function (k) {
        var v = o[k];
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        return v == null ? '' : v;
      }); });

      var title = r.t;
      var scopeName = scope
        ? (cache.batches.filter(function (b) { return b.batch_id === scope; })[0] || {}).batch_name
        : 'All batches';

      /* A title block above the data, because these get forwarded and a bare
         grid of numbers with no date on it is worth very little a week later. */
      var aoa = [
        [title],
        ['Scope', scopeName || ''],
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

  /* -------------------------------------------------------------- accounts */
  function accounts() {
    return '<div class="h"><h2>Accounts and batches</h2></div>' +
      '<div class="sec"><p class="st-lead">Create batches, add trainees and ' +
      'trainers, and put people on the desks they will work.</p>' +
      '<button class="btn" data-act="manage">Open</button></div>';
  }

  /* ---------------------------------------------------------------- render */
  function render(view) {
    if (!staff()) {
      return '<div class="ad-empty"><h3>Not available</h3>' +
        '<p>This section is for trainers and administrators.</p></div>';
    }
    if (!cache.batches && !busy) {
      busy = true;
      batches().then(function () { busy = false; redraw(); })
        .catch(function (e) { busy = false; err = e.message; redraw(); });
    }
    if (view === 'overview') return overview();
    if (view === 'staffreports') return reports();
    return accounts();
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-st]');
    if (!t) return;
    var k = t.dataset.st;
    if (k === 'refresh') { ev.preventDefault(); return refresh(); }
    if (k === 'dl') { ev.preventDefault(); return download(t.dataset.k); }
  });

  document.addEventListener('change', function (ev) {
    if (ev.target.dataset && ev.target.dataset.st === 'scope') {
      scope = ev.target.value || null;
    }
  });

  window.ATSStaff = { render: render, views: VIEWS, staff: staff };
})();
