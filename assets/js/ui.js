/* ==========================================================================
   GG Learning Labs — UI kit
   Toasts, modals, dropdowns, tabs, states, forms, charts, shell, data table.
   ========================================================================== */
(function (GGL) {
  'use strict';

  var U = GGL.utils;
  var UI = {};

  /* ---------------------------------------------------------------- toasts */
  function toastRegion() {
    var r = document.getElementById('toast-region');
    if (!r) {
      r = U.el('div', { id:'toast-region', class:'toast-region', role:'status',
        'aria-live':'polite', 'aria-atomic':'false' });
      document.body.appendChild(r);
    }
    return r;
  }
  var TOAST_ICON = { success:'checkCircle', error:'xCircle', warning:'alert', info:'info' };

  UI.toast = function (title, opts) {
    opts = opts || {};
    var type = opts.type || 'info';
    var node = U.el('div', { class:'toast toast-' + type },
      GGL.icon(TOAST_ICON[type] || 'info', 'ico') +
      '<div class="msg"><span class="title">' + U.esc(title) + '</span>' +
      (opts.desc ? '<span class="desc">' + U.esc(opts.desc) + '</span>' : '') + '</div>');
    var close = U.el('button', { class:'btn-icon btn-sm', 'aria-label':'Dismiss notification' },
      GGL.icon('close','ico'));
    node.appendChild(close);
    toastRegion().appendChild(node);
    var timer = setTimeout(dismiss, opts.duration || 4200);
    function dismiss() {
      clearTimeout(timer);
      node.classList.add('out');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 220);
    }
    close.addEventListener('click', dismiss);
    return dismiss;
  };

  /* ---------------------------------------------------------------- modals */
  var openModals = [];

  UI.modal = function (opts) {
    opts = opts || {};
    var lastFocused = document.activeElement;
    var titleId = U.uid('modal-title');
    var overlay = U.el('div', { class:'modal-overlay' });
    var modal = U.el('div', { class:'modal ' + (opts.size ? 'modal-' + opts.size : ''),
      role:'dialog', 'aria-modal':'true', 'aria-labelledby':titleId });
    var head = U.el('div', { class:'modal-head' },
      '<div><h2 id="' + titleId + '">' + U.esc(opts.title || '') + '</h2>' +
      (opts.subtitle ? '<p class="sub">' + U.esc(opts.subtitle) + '</p>' : '') + '</div>');
    var closeBtn = U.el('button', { class:'btn-icon', type:'button', 'aria-label':'Close dialog' },
      GGL.icon('close','ico'));
    head.appendChild(closeBtn);
    var body = U.el('div', { class:'modal-body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    modal.appendChild(head); modal.appendChild(body);
    if (opts.footer) {
      var foot = U.el('div', { class:'modal-foot' });
      if (typeof opts.footer === 'string') foot.innerHTML = opts.footer;
      else foot.appendChild(opts.footer);
      modal.appendChild(foot);
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { overlay.classList.add('open'); });
    var release = U.trapFocus(modal);
    openModals.push(handleClose);

    function handleClose() {
      overlay.classList.remove('open');
      release();
      openModals = openModals.filter(function (f) { return f !== handleClose; });
      if (!openModals.length) document.body.style.overflow = '';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (lastFocused && lastFocused.focus) lastFocused.focus();
      }, 220);
      if (opts.onClose) opts.onClose();
    }
    closeBtn.addEventListener('click', handleClose);
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay && opts.dismissible !== false) handleClose();
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && opts.dismissible !== false) { e.stopPropagation(); handleClose(); }
    });
    setTimeout(function () {
      var first = modal.querySelector('input:not([type=hidden]), select, textarea, .modal-foot .btn');
      (first || closeBtn).focus();
    }, 60);
    var handle = { el:modal, body:body, overlay:overlay, close:handleClose };
    if (opts.onMount) opts.onMount(handle);
    return handle;
  };

  UI.confirm = function (opts) {
    opts = opts || {};
    var tone = opts.tone || 'danger';
    var handle = UI.modal({
      title: opts.title || 'Are you sure?', size:'sm',
      body:'<div class="confirm-icon ' + (tone === 'danger' ? '' : tone) + '">' +
        GGL.icon(tone === 'danger' ? 'trash' : tone === 'warning' ? 'alert' : 'info', 'ico') +
        '</div><p>' + U.esc(opts.message || 'This action cannot be undone.') + '</p>' +
        (opts.detail ? '<div class="alert alert-warning mt-4">' + GGL.icon('alert','ico') +
          '<div>' + U.esc(opts.detail) + '</div></div>' : ''),
      footer:'<button type="button" class="btn btn-secondary" data-act="cancel">Cancel</button>' +
        '<button type="button" class="btn ' + (tone === 'danger' ? 'btn-danger' : 'btn-primary') +
        '" data-act="confirm">' + U.esc(opts.confirmLabel || 'Delete') + '</button>'
    });
    var confirmBtn = handle.overlay.querySelector('[data-act="confirm"]');
    handle.overlay.querySelector('[data-act="cancel"]').addEventListener('click', handle.close);
    confirmBtn.addEventListener('click', function () {
      if (!opts.onConfirm) { handle.close(); return; }
      confirmBtn.classList.add('is-loading');
      confirmBtn.disabled = true;
      Promise.resolve(opts.onConfirm())
        .then(function () { handle.close(); })
        .catch(function (err) {
          confirmBtn.classList.remove('is-loading');
          confirmBtn.disabled = false;
          UI.toast('Could not complete', { type:'error', desc:err.message });
        });
    });
    return handle;
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openModals.length) openModals[openModals.length - 1]();
  });

  /* ------------------------------------------------------------- dropdowns
     One global delegated handler, registered exactly once. An earlier version
     attached "open" and "close-everything" to the same node, so
     stopPropagation() could not separate them and menus closed on the same
     click that opened them. */
  var dropdownsReady = false;
  function closeAllDropdowns() {
    U.$$('.menu.open').forEach(function (m) {
      m.classList.remove('open');
      var wrap = m.closest('[data-dropdown]');
      var t = wrap && wrap.querySelector('[data-dropdown-trigger]');
      if (t) t.setAttribute('aria-expanded','false');
    });
  }
  UI.closeDropdowns = closeAllDropdowns;
  UI.initDropdowns = function () {
    if (dropdownsReady) return;
    dropdownsReady = true;
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-dropdown-trigger]');
      if (trigger) {
        e.preventDefault();
        var wrap = trigger.closest('[data-dropdown]');
        var menu = wrap && wrap.querySelector('.menu');
        if (!menu) return;
        var wasOpen = menu.classList.contains('open');
        closeAllDropdowns();
        if (wasOpen) return;
        menu.classList.add('open');
        trigger.setAttribute('aria-expanded','true');
        var rect = menu.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 8) {
          menu.style.top = 'auto'; menu.style.bottom = 'calc(100% + 6px)';
        } else { menu.style.top = ''; menu.style.bottom = ''; }
        return;
      }
      if (e.target.closest('.menu-item')) { closeAllDropdowns(); return; }
      if (e.target.closest('.menu')) return;
      closeAllDropdowns();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllDropdowns(); });
  };

  /* ------------------------------------------------------------------ tabs */
  UI.initTabs = function (root) {
    U.$$('[role="tablist"]', root || document).forEach(function (list) {
      var tabs = U.$$('[role="tab"]', list);
      function select(tab) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      }
      list.addEventListener('click', function (e) {
        var tab = e.target.closest('[role="tab"]');
        if (tab) select(tab);
      });
      list.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(document.activeElement);
        if (i === -1) return;
        var next = e.key === 'ArrowRight' ? i+1 : e.key === 'ArrowLeft' ? i-1
          : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length-1 : null;
        if (next === null) return;
        e.preventDefault();
        var target = tabs[(next + tabs.length) % tabs.length];
        target.focus(); select(target);
      });
      var initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
      select(initial || tabs[0]);
    });
  };
  UI.initAccordion = function (root) {
    U.on(root || document, 'click', '.faq-q', function (e, btn) {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.classList.toggle('open', !open);
    });
  };

  /* ---------------------------------------------------------------- states */
  UI.skeletonRows = function (count, cols) {
    var out = '';
    for (var i = 0; i < (count || 5); i++) {
      out += '<tr>';
      for (var c = 0; c < (cols || 5); c++) {
        out += '<td><div class="skel skel-text" style="width:' + (45 + ((i+c) % 4) * 14) + '%"></div></td>';
      }
      out += '</tr>';
    }
    return out;
  };
  UI.skeletonCards = function (count) {
    var out = '';
    for (var i = 0; i < (count || 4); i++) out += '<div class="skel skel-card"></div>';
    return out;
  };
  UI.empty = function (opts) {
    opts = opts || {};
    return '<div class="state"><div class="state-icon">' + GGL.icon(opts.icon || 'inbox','ico') + '</div>' +
      '<h3>' + U.esc(opts.title || 'Nothing here yet') + '</h3>' +
      '<p>' + U.esc(opts.message || 'When records are added they will appear here.') + '</p>' +
      (opts.action ? '<button type="button" class="btn btn-primary" data-empty-action>' +
        GGL.icon(opts.actionIcon || 'plus','ico') + '<span>' + U.esc(opts.action) + '</span></button>' : '') +
      '</div>';
  };
  UI.error = function (opts) {
    opts = opts || {};
    return '<div class="state"><div class="state-icon danger">' + GGL.icon('alert','ico') + '</div>' +
      '<h3>' + U.esc(opts.title || 'Something went wrong') + '</h3>' +
      '<p>' + U.esc(opts.message || 'We could not load this content. Please try again.') + '</p>' +
      '<button type="button" class="btn btn-secondary" data-retry>' +
      GGL.icon('refresh','ico') + '<span>Retry</span></button></div>';
  };
  UI.async = function (container, loadingHtml, task) {
    function run() {
      container.innerHTML = loadingHtml;
      Promise.resolve().then(task).catch(function (err) {
        if (window.console) console.error('[GGL]', err);
        container.innerHTML = UI.error({ message: err && err.message });
        var retry = container.querySelector('[data-retry]');
        if (retry) retry.addEventListener('click', run);
      });
    }
    run();
    return run;
  };

  UI.handleSubmit = function (form, rules, submitFn, opts) {
    opts = opts || {};
    form.setAttribute('novalidate','novalidate');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var result = U.validateForm(form, rules || {});
      if (!result.valid) return;
      var btn = form.querySelector('[type="submit"]') || document.querySelector('[form="' + form.id + '"]');
      if (btn) { btn.classList.add('is-loading'); btn.disabled = true; }
      Promise.resolve(submitFn(result.values, form))
        .then(function (res) {
          if (opts.success) UI.toast(opts.success, { type:'success', desc:opts.successDesc });
          if (opts.reset !== false) form.reset();
          if (opts.onDone) opts.onDone(res);
        })
        .catch(function (err) {
          UI.toast(opts.failure || 'Could not save', { type:'error', desc: err && err.message });
          if (opts.onError) opts.onError(err);
        })
        .then(function () { if (btn) { btn.classList.remove('is-loading'); btn.disabled = false; } });
    });
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field) { field.classList.remove('has-error'); e.target.removeAttribute('aria-invalid'); }
    });
  };

  GGL.ui = UI;

  /* ---------------------------------------------------------------- charts */
  var Charts = {};
  var SERIES = ['var(--viz-1)','var(--viz-2)','var(--viz-3)','var(--viz-4)','var(--viz-5)','var(--viz-6)'];
  function niceMax(max) {
    if (max <= 0) return 10;
    var mag = Math.pow(10, Math.floor(Math.log10(max)));
    var n = Math.ceil(max / mag * 2) / 2 * mag;
    return n === max ? n + mag / 2 : n;
  }
  function svgWrap(inner, w, h, label) {
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" ' +
      'role="img" aria-label="' + U.esc(label || 'Chart') + '" ' +
      'style="width:100%;height:100%;display:block;overflow:visible">' + inner + '</svg>';
  }

  Charts.line = function (data, opts) {
    opts = opts || {};
    var W = 640, H = opts.height || 240, padL = 38, padR = 12, padT = 14, padB = 26;
    var iw = W - padL - padR, ih = H - padT - padB;
    if (!data || !data.length) return Charts.noData(opts.label);
    var max = niceMax(Math.max.apply(null, data.map(function (d) { return d.value; })));
    var min = opts.zeroBased === false
      ? Math.max(0, Math.min.apply(null, data.map(function (d) { return d.value; })) * 0.85) : 0;
    var range = max - min || 1;
    var x = function (i) { return padL + (data.length === 1 ? iw/2 : (i / (data.length-1)) * iw); };
    var y = function (v) { return padT + ih - ((v - min) / range) * ih; };
    var g = '';
    for (var t = 0; t <= 4; t++) {
      var val = min + (range/4) * t, gy = y(val);
      g += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W-padR) + '" y2="' + gy.toFixed(1) +
        '" stroke="var(--viz-grid)" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + (padL-8) + '" y="' + (gy+3.5).toFixed(1) + '" text-anchor="end" font-size="10" ' +
        'fill="var(--text-subtle)">' + Math.round(val) + (opts.suffix || '') + '</text>';
    }
    var line = data.map(function (d, i) {
      return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(d.value).toFixed(1);
    }).join(' ');
    var area = line + ' L' + x(data.length-1).toFixed(1) + ' ' + (padT+ih) +
      ' L' + x(0).toFixed(1) + ' ' + (padT+ih) + ' Z';
    var gid = U.uid('grad');
    var pts = data.map(function (d, i) {
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(d.value).toFixed(1) + '" r="3.5" ' +
        'fill="var(--surface)" stroke="' + (opts.color || SERIES[0]) + '" stroke-width="2">' +
        '<title>' + U.esc(d.label) + ': ' + d.value + (opts.suffix || '') + '</title></circle>';
    }).join('');
    var labels = data.map(function (d, i) {
      if (data.length > 8 && i % 2) return '';
      return '<text x="' + x(i).toFixed(1) + '" y="' + (H-8) + '" text-anchor="middle" font-size="10" ' +
        'fill="var(--text-subtle)">' + U.esc(d.label) + '</text>';
    }).join('');
    var inner = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + (opts.color || SERIES[0]) + '" stop-opacity="0.22"/>' +
      '<stop offset="100%" stop-color="' + (opts.color || SERIES[0]) + '" stop-opacity="0"/>' +
      '</linearGradient></defs>' + g +
      (opts.area === false ? '' : '<path d="' + area + '" fill="url(#' + gid + ')"/>') +
      '<path d="' + line + '" fill="none" stroke="' + (opts.color || SERIES[0]) + '" stroke-width="2.5" ' +
      'stroke-linejoin="round" stroke-linecap="round"/>' + pts + labels;
    return '<div class="chart-box" style="height:' + H + 'px">' +
      svgWrap(inner, W, H, opts.label || 'Trend chart') + '</div>';
  };

  Charts.bar = function (data, opts) {
    opts = opts || {};
    var W = 640, H = opts.height || 240, padL = 38, padR = 12, padT = 14, padB = 28;
    var iw = W - padL - padR, ih = H - padT - padB;
    if (!data || !data.length) return Charts.noData(opts.label);
    var max = niceMax(Math.max.apply(null, data.map(function (d) { return d.value; })));
    var slot = iw / data.length, bw = Math.min(opts.barWidth || 30, slot * 0.62);
    var g = '';
    for (var t = 0; t <= 4; t++) {
      var val = (max/4) * t, gy = padT + ih - (val/max) * ih;
      g += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W-padR) + '" y2="' + gy.toFixed(1) +
        '" stroke="var(--viz-grid)" stroke-width="1" shape-rendering="crispEdges"/>' +
        '<text x="' + (padL-8) + '" y="' + (gy+3.5).toFixed(1) + '" text-anchor="end" font-size="10" ' +
        'fill="var(--text-subtle)">' + Math.round(val) + (opts.suffix || '') + '</text>';
    }
    var bars = data.map(function (d, i) {
      var h = Math.max(2, (d.value/max) * ih);
      var bx = padL + slot * i + (slot - bw) / 2, by = padT + ih - h;
      return '<rect x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + h.toFixed(1) + '" rx="4" fill="' + (opts.color || SERIES[i % SERIES.length]) +
        '" opacity="0.9"><title>' + U.esc(d.label) + ': ' + d.value + (opts.suffix || '') +
        '</title></rect><text x="' + (bx + bw/2).toFixed(1) + '" y="' + (H-9) +
        '" text-anchor="middle" font-size="10" fill="var(--text-subtle)">' + U.esc(d.label) + '</text>';
    }).join('');
    return '<div class="chart-box" style="height:' + H + 'px">' +
      svgWrap(g + bars, W, H, opts.label || 'Bar chart') + '</div>';
  };

  Charts.donut = function (data, opts) {
    opts = opts || {};
    var size = opts.size || 180, stroke = opts.stroke || 26;
    var r = (size - stroke) / 2, c = size / 2, circ = 2 * Math.PI * r;
    if (!data || !data.length) return Charts.noData(opts.label);
    var total = U.sum(data, 'value') || 1, offset = 0;
    var arcs = data.map(function (d, i) {
      var len = (d.value / total) * circ;
      var seg = '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' +
        (d.color || SERIES[i % SERIES.length]) + '" stroke-width="' + stroke + '" ' +
        'stroke-dasharray="' + (len-2).toFixed(2) + ' ' + (circ-len+2).toFixed(2) + '" ' +
        'stroke-dashoffset="' + (-offset).toFixed(2) + '" stroke-linecap="butt" ' +
        'transform="rotate(-90 ' + c + ' ' + c + ')"><title>' + U.esc(d.label) + ': ' + d.value +
        ' (' + Math.round((d.value/total) * 100) + '%)</title></circle>';
      offset += len;
      return seg;
    }).join('');
    var centre = opts.centreValue !== undefined
      ? '<text x="' + c + '" y="' + (c-2) + '" text-anchor="middle" font-size="26" font-weight="700" ' +
        'fill="var(--text)">' + U.esc(opts.centreValue) + '</text>' +
        '<text x="' + c + '" y="' + (c+16) + '" text-anchor="middle" font-size="11" ' +
        'fill="var(--text-muted)">' + U.esc(opts.centreLabel || '') + '</text>' : '';
    var legend = opts.legend === false ? '' :
      '<ul class="chart-legend">' + data.map(function (d, i) {
        return '<li><i style="background:' + (d.color || SERIES[i % SERIES.length]) + '"></i>' +
          '<span class="lbl">' + U.esc(d.label) + '</span>' +
          '<span class="val">' + Math.round((d.value/total) * 100) + '%</span></li>';
      }).join('') + '</ul>';
    return '<div class="chart-donut"><svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size +
      '" height="' + size + '" role="img" aria-label="' + U.esc(opts.label || 'Distribution chart') + '">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--viz-grid)" ' +
      'stroke-width="' + stroke + '"/>' + arcs + centre + '</svg>' + legend + '</div>';
  };

  Charts.hbars = function (data, opts) {
    opts = opts || {};
    if (!data || !data.length) return Charts.noData(opts.label);
    var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
    return '<ul class="hbars">' + data.map(function (d, i) {
      return '<li><span class="hb-label truncate" title="' + U.esc(d.label) + '">' + U.esc(d.label) + '</span>' +
        '<span class="hb-track"><span class="hb-fill" style="width:' + ((d.value/max) * 100).toFixed(1) +
        '%;background:' + (d.color || SERIES[i % SERIES.length]) + '"></span></span>' +
        '<span class="hb-value">' + U.esc(d.value) + (opts.suffix || '') + '</span></li>';
    }).join('') + '</ul>';
  };

  Charts.gauge = function (value, opts) {
    opts = opts || {};
    var size = opts.size || 150, stroke = 14;
    var r = (size - stroke) / 2, c = size / 2, circ = 2 * Math.PI * r;
    var v = Math.max(0, Math.min(100, Number(value) || 0));
    var tone = v >= 80 ? 'var(--viz-5)' : v >= 55 ? 'var(--viz-1)' : v >= 35 ? 'var(--viz-3)' : 'var(--viz-6)';
    return '<div class="chart-gauge"><svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size +
      '" height="' + size + '" role="img" aria-label="' + U.esc(opts.label || 'Score') + ': ' + v + ' percent">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="var(--viz-grid)" ' +
      'stroke-width="' + stroke + '"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + (opts.color || tone) +
      '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' +
      ((v/100) * circ).toFixed(2) + ' ' + circ + '" transform="rotate(-90 ' + c + ' ' + c + ')"/>' +
      '<text x="' + c + '" y="' + (c+2) + '" text-anchor="middle" font-size="28" font-weight="700" ' +
      'fill="var(--text)">' + v + '</text>' +
      '<text x="' + c + '" y="' + (c+20) + '" text-anchor="middle" font-size="10" ' +
      'fill="var(--text-muted)">' + U.esc(opts.unit || '%') + '</text></svg>' +
      (opts.caption ? '<p class="chart-caption">' + U.esc(opts.caption) + '</p>' : '') + '</div>';
  };

  Charts.noData = function (label) {
    return '<div class="chart-nodata">' + GGL.icon('barChart','ico') +
      '<span>No data for ' + U.esc(label || 'this period') + '</span></div>';
  };
  Charts.colors = SERIES;
  GGL.charts = Charts;

  /* ----------------------------------------------------------------- shell */
  var Shell = {};
  function logoMarkup() {
    return '<a class="logo" href="' + GGL.url('index.html') + '" aria-label="' + GGL.config.appName + ' home">' +
      '<span class="logo-mark" aria-hidden="true">GG</span>' +
      '<span class="logo-text"><span class="name">GG Learning Labs</span>' +
      '<span class="tag">L&amp;D Platform</span></span></a>';
  }
  Shell.logo = logoMarkup;

  function roleSwitchItems(current) {
    return [GGL.ROLES.SUPER_ADMIN, GGL.ROLES.ADMIN, GGL.ROLES.TRAINER, GGL.ROLES.END_USER].map(function (r) {
      var on = r === current;
      return '<button type="button" class="menu-item" data-switch-role="' + r + '"' +
        (on ? ' aria-current="true"' : '') + '>' +
        GGL.icon(r === GGL.ROLES.SUPER_ADMIN ? 'shield' : r === GGL.ROLES.ADMIN ? 'sliders' : r === GGL.ROLES.TRAINER ? 'briefcase' : 'user','ico') +
        '<span>' + GGL.roleLabel(r) + '</span>' + (on ? GGL.icon('check','ico') : '') + '</button>';
    }).join('');
  }

  function renderSidebar(user, activeKey) {
    var unread = GGL.services.notifications.unreadCount();
    var nav = GGL.navFor(user.role).map(function (g) {
      var items = g.items.map(function (item) {
        var isActive = item.href && (item.href.indexOf(activeKey) !== -1);
        var badge = item.label === 'Notifications' && unread
          ? '<span class="nav-badge count">' + unread + '</span>' : '';
        return '<a class="nav-item' + (isActive ? ' active' : '') + '" href="' + GGL.url(item.href) + '"' +
          (isActive ? ' aria-current="page"' : '') + '>' + GGL.icon(item.icon,'ico') +
          '<span class="label">' + U.esc(item.label) + '</span>' + badge + '</a>';
      }).join('');
      return '<div class="nav-group">' +
        (g.group ? '<div class="nav-group-label">' + U.esc(g.group) + '</div>' : '') + items + '</div>';
    }).join('');

    return '<aside class="app-sidebar" id="app-sidebar" aria-label="Main navigation">' +
      '<div class="sidebar-head">' + logoMarkup() +
        '<button type="button" class="btn-icon sidebar-toggle" data-sidebar-close aria-label="Close navigation">' +
        GGL.icon('close','ico') + '</button></div>' +
      '<nav class="sidebar-nav">' + nav + '</nav>' +
      '<div class="sidebar-foot"><div class="dropdown" data-dropdown style="width:100%">' +
        '<button type="button" class="sidebar-user" data-dropdown-trigger aria-expanded="false" aria-haspopup="true">' +
          '<span class="avatar">' + U.esc(U.initials(user.name)) + '</span>' +
          '<span class="meta"><span class="name truncate">' + U.esc(user.name) + '</span>' +
          '<span class="role truncate">' + U.esc(GGL.roleLabel(user.role)) + '</span></span>' +
          GGL.icon('chevronUp','ico') + '</button>' +
        '<div class="menu menu-left" style="bottom:calc(100% + 6px);top:auto;left:0;right:0">' +
          '<a class="menu-item" href="' + GGL.url('app/settings.html') + '">' +
            GGL.icon('user','ico') + '<span>Profile &amp; settings</span></a>' +
          '<a class="menu-item" href="' + GGL.url('app/notifications.html') + '">' +
            GGL.icon('bell','ico') + '<span>Notifications</span></a>' +
          '<div class="menu-sep"></div><div class="menu-label">Demo persona</div>' +
          roleSwitchItems(user.role) + '<div class="menu-sep"></div>' +
          '<button type="button" class="menu-item danger" data-signout>' +
            GGL.icon('logout','ico') + '<span>Sign out</span></button>' +
        '</div></div></div></aside>' +
      '<div class="sidebar-scrim" data-sidebar-close hidden></div>';
  }

  function renderTopbar(user) {
    var unread = GGL.services.notifications.unreadCount();
    return '<header class="app-topbar">' +
      '<button type="button" class="btn-icon sidebar-toggle" data-sidebar-open aria-label="Open navigation" aria-expanded="false">' +
        GGL.icon('menu','ico') + '</button>' +
      '<div class="topbar-search"><label class="input-icon">' +
        '<span class="sr-only">Search the platform</span>' + GGL.icon('search','ico') +
        '<input type="search" class="input" placeholder="Search courses, batches, people…" data-global-search>' +
      '</label></div>' +
      '<div class="topbar-actions">' +
        '<button type="button" class="btn-icon tooltip" data-theme-toggle data-tip="Theme"></button>' +
        '<a class="btn-icon notif-btn tooltip" href="' + GGL.url('app/notifications.html') + '" ' +
          'data-tip="Notifications" aria-label="Notifications' + (unread ? ', ' + unread + ' unread' : '') + '">' +
          GGL.icon('bell','ico') +
          (unread ? '<span class="notif-dot">' + (unread > 9 ? '9+' : unread) + '</span>' : '') + '</a>' +
        '<div class="dropdown" data-dropdown>' +
          '<button type="button" class="btn-icon" data-dropdown-trigger aria-expanded="false" ' +
            'aria-haspopup="true" aria-label="Account menu">' +
            '<span class="avatar avatar-sm">' + U.esc(U.initials(user.name)) + '</span></button>' +
          '<div class="menu"><div class="menu-label">' + U.esc(user.email) + '</div>' +
            '<a class="menu-item" href="' + GGL.url('app/settings.html') + '">' +
              GGL.icon('settings','ico') + '<span>Settings</span></a>' +
            '<a class="menu-item" href="' + GGL.url('index.html') + '">' +
              GGL.icon('globe','ico') + '<span>Public site</span></a>' +
            '<div class="menu-sep"></div>' +
            '<button type="button" class="menu-item danger" data-signout>' +
              GGL.icon('logout','ico') + '<span>Sign out</span></button>' +
          '</div></div></div></header>';
  }

  Shell.pageHead = function (opts) {
    opts = opts || {};
    var crumbs = (opts.breadcrumbs || []).map(function (c, i, arr) {
      return i === arr.length - 1
        ? '<span class="current" aria-current="page">' + U.esc(c.label) + '</span>'
        : '<a href="' + (c.href ? GGL.url(c.href) : '#') + '">' + U.esc(c.label) + '</a>' +
          '<span class="sep" aria-hidden="true">/</span>';
    }).join('');
    return (crumbs ? '<nav class="breadcrumbs" aria-label="Breadcrumb">' + crumbs + '</nav>' : '') +
      '<div class="page-head"><div><h1>' + U.esc(opts.title || '') + '</h1>' +
      (opts.subtitle ? '<p class="page-sub">' + U.esc(opts.subtitle) + '</p>' : '') + '</div>' +
      (opts.actions ? '<div class="page-head-actions">' + opts.actions + '</div>' : '') + '</div>';
  };

  Shell.mount = function (opts) {
    opts = opts || {};
    var user = GGL.services.auth.requireAuth();
    if (!user) return null;
    var root = document.getElementById('app-root') || document.body;
    root.insertAdjacentHTML('afterbegin',
      '<a class="skip-link" href="#main-content">Skip to main content</a>' +
      renderSidebar(user, opts.active || 'dashboard') +
      '<div class="app-main">' + renderTopbar(user) +
        '<main class="app-content" id="main-content" tabindex="-1">' +
          Shell.pageHead(opts) + '<div id="page-body"></div></main></div>');
    bindShell();
    UI.initDropdowns();
    GGL.theme.init();
    document.title = (opts.title ? opts.title + ' · ' : '') + GGL.config.appName;
    return document.getElementById('page-body');
  };

  function bindShell() {
    var sidebar = document.getElementById('app-sidebar');
    var scrim = document.querySelector('.sidebar-scrim');
    var opener = document.querySelector('[data-sidebar-open]');
    function openSidebar() {
      sidebar.classList.add('open');
      scrim.hidden = false;
      requestAnimationFrame(function () { scrim.classList.add('open'); });
      if (opener) opener.setAttribute('aria-expanded','true');
      document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      scrim.classList.remove('open');
      if (opener) opener.setAttribute('aria-expanded','false');
      document.body.style.overflow = '';
      setTimeout(function () { scrim.hidden = true; }, 220);
    }
    if (opener) opener.addEventListener('click', openSidebar);
    U.$$('[data-sidebar-close]').forEach(function (n) { n.addEventListener('click', closeSidebar); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
    });
    window.addEventListener('resize', U.debounce(function () {
      if (window.innerWidth > 1024 && sidebar.classList.contains('open')) closeSidebar();
    }, 150));

    U.$$('.sidebar-nav .nav-item').forEach(function(link) {
      link.addEventListener('pointerdown', function(e) {
        e.stopPropagation();
        UI.closeDropdowns();
      }, true);
      link.addEventListener('click', function(e) {
        e.stopPropagation();
        UI.closeDropdowns();
        if (window.innerWidth <= 1024) closeSidebar();
      }, true);
    });

    U.$$('[data-signout]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.confirm({ title:'Sign out?',
          message:'You will be returned to the GG Learning Labs homepage. Prototype data you have entered is kept.',
          confirmLabel:'Sign out', tone:'info',
          onConfirm: function () {
            return GGL.services.auth.signOut().then(function () {
              window.location.href = GGL.url('index.html');
            });
          }});
      });
    });
    U.$$('[data-switch-role]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var role = btn.getAttribute('data-switch-role');
        if (GGL.services.auth.getUser().role === role) return;
        btn.classList.add('is-loading');
        GGL.services.auth.switchRole(role).then(function () {
          window.location.href = GGL.url('app/dashboard.html');
        });
      });
    });
    var search = document.querySelector('[data-global-search]');
    if (search) search.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var q = search.value.trim();
      if (q) window.location.href = GGL.url('app/courses.html') + '?q=' + encodeURIComponent(q);
    });
  }
  GGL.shell = Shell;

  /* ------------------------------------------------------------- DataTable */
  GGL.DataTable = function (container, opts) {
    opts = opts || {};
    var cols = opts.columns || [];
    var state = { search: opts.initialSearch || '', filters:{},
      sort: opts.defaultSort || null, dir: opts.defaultDir || 'asc',
      page:1, size: opts.pageSize || 10, selected:{}, rows:[], meta:null };
    (opts.filters || []).forEach(function (f) { state.filters[f.key] = f.default || 'all'; });

    container.innerHTML =
      '<div class="card"><div class="toolbar" data-toolbar></div>' +
        '<div class="table-wrap" data-table-wrap>' +
          '<table class="table"><thead data-thead></thead><tbody data-tbody></tbody></table></div>' +
        '<div data-state-slot></div>' +
        '<div class="pagination" data-pagination hidden></div></div>';

    var toolbar = container.querySelector('[data-toolbar]');
    var thead = container.querySelector('[data-thead]');
    var tbody = container.querySelector('[data-tbody]');
    var tableWrap = container.querySelector('[data-table-wrap]');
    var stateSlot = container.querySelector('[data-state-slot]');
    var pager = container.querySelector('[data-pagination]');

    function renderToolbar() {
      var filterHtml = (opts.filters || []).map(function (f) {
        return '<label class="sr-only" for="flt-' + f.key + '">' + U.esc(f.label) + '</label>' +
          '<select class="select" id="flt-' + f.key + '" data-filter="' + f.key + '">' +
          '<option value="all">' + U.esc(f.label) + ': All</option>' +
          f.options.map(function (o) {
            return '<option value="' + U.esc(o.value) + '">' + U.esc(o.label) + '</option>';
          }).join('') + '</select>';
      }).join('');
      toolbar.innerHTML =
        (opts.search === false ? '' :
          '<div class="search"><label class="input-icon">' +
          '<span class="sr-only">' + U.esc(opts.searchLabel || 'Search records') + '</span>' +
          GGL.icon('search','ico') +
          '<input type="search" class="input" data-search placeholder="' +
          U.esc(opts.searchPlaceholder || 'Search…') + '" value="' + U.esc(state.search) + '">' +
          '</label></div>') +
        filterHtml + '<div class="grow"></div>' +
        '<div class="row gap-2" data-bulk hidden>' +
          '<span class="text-sm text-muted" data-bulk-count></span>' +
          (opts.bulkActions || []).map(function (a, i) {
            return '<button type="button" class="btn btn-sm btn-secondary" data-bulk-action="' + i + '">' +
              (a.icon ? GGL.icon(a.icon,'ico') : '') + '<span>' + U.esc(a.label) + '</span></button>';
          }).join('') + '</div>' + (opts.toolbarExtra || '');

      var searchInput = toolbar.querySelector('[data-search]');
      if (searchInput) searchInput.addEventListener('input', U.debounce(function () {
        state.search = searchInput.value; state.page = 1; load();
      }, 280));
      U.$$('[data-filter]', toolbar).forEach(function (sel) {
        sel.addEventListener('change', function () {
          state.filters[sel.getAttribute('data-filter')] = sel.value;
          state.page = 1; load();
        });
      });
      (opts.bulkActions || []).forEach(function (action, i) {
        var btn = toolbar.querySelector('[data-bulk-action="' + i + '"]');
        if (btn) btn.addEventListener('click', function () { action.onClick(selectedIds(), api); });
      });
    }

    function renderHead() {
      var cells = cols.map(function (c) {
        var cls = [];
        if (c.align === 'right') cls.push('text-right');
        if (c.hideBelow) cls.push('hide-' + c.hideBelow);
        var style = c.width ? ' style="width:' + c.width + '"' : '';
        var inner = c.sortable
          ? '<button type="button" class="th-sort" data-sort="' + U.esc(c.key) + '"' +
            (state.sort === c.key ? ' data-dir="' + state.dir + '"' : '') + '>' +
            U.esc(c.label) + GGL.icon('sort','ico') + '</button>'
          : U.esc(c.label);
        return '<th' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + style +
          (c.sortable && state.sort === c.key
            ? ' aria-sort="' + (state.dir === 'asc' ? 'ascending' : 'descending') + '"' : '') +
          '>' + inner + '</th>';
      }).join('');
      var select = opts.selectable
        ? '<th style="width:36px"><label class="check" style="margin:0">' +
          '<input type="checkbox" data-select-all aria-label="Select all rows on this page"></label></th>' : '';
      thead.innerHTML = '<tr>' + select + cells +
        (opts.rowActions ? '<th class="col-actions">Actions</th>' : '') + '</tr>';
      U.$$('[data-sort]', thead).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-sort');
          if (state.sort === key) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
          else { state.sort = key; state.dir = 'asc'; }
          state.page = 1; load();
        });
      });
      var all = thead.querySelector('[data-select-all]');
      if (all) all.addEventListener('change', function () {
        state.rows.forEach(function (r) {
          if (all.checked) state.selected[r.id] = r; else delete state.selected[r.id];
        });
        renderBody(); syncBulk();
      });
    }

    function renderBody() {
      tbody.innerHTML = state.rows.map(function (row) {
        var cells = cols.map(function (c) {
          var cls = [];
          if (c.align === 'right') cls.push('text-right');
          if (c.primary) cls.push('cell-primary');
          if (c.hideBelow) cls.push('hide-' + c.hideBelow);
          var value = c.render ? c.render(row) : U.esc(U.get(row, c.key));
          return '<td' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' +
            (value === undefined || value === null || value === ''
              ? '<span class="text-subtle">—</span>' : value) + '</td>';
        }).join('');
        var select = opts.selectable
          ? '<td><label class="check" style="margin:0"><input type="checkbox" data-row-select="' +
            U.esc(row.id) + '"' + (state.selected[row.id] ? ' checked' : '') +
            ' aria-label="Select row"></label></td>' : '';
        var actions = '';
        if (opts.rowActions) {
          var list = opts.rowActions(row, api) || [];
          actions = '<td class="col-actions"><div class="dropdown" data-dropdown>' +
            '<button type="button" class="btn-icon btn-sm" data-dropdown-trigger aria-haspopup="true" ' +
            'aria-expanded="false" aria-label="Actions for this row">' +
            GGL.icon('moreVertical','ico') + '</button><div class="menu">' +
            list.map(function (a, i) {
              return '<button type="button" class="menu-item' + (a.tone === 'danger' ? ' danger' : '') +
                '" data-row-action="' + i + '" data-row-id="' + U.esc(row.id) + '">' +
                GGL.icon(a.icon || 'eye','ico') + '<span>' + U.esc(a.label) + '</span></button>';
            }).join('') + '</div></div></td>';
        }
        return '<tr data-row-id="' + U.esc(row.id) + '">' + select + cells + actions + '</tr>';
      }).join('');

      U.$$('[data-row-select]', tbody).forEach(function (cb) {
        cb.addEventListener('change', function () {
          var id = cb.getAttribute('data-row-select');
          var row = state.rows.filter(function (r) { return String(r.id) === id; })[0];
          if (cb.checked) state.selected[id] = row; else delete state.selected[id];
          syncBulk();
        });
      });
      U.$$('[data-row-action]', tbody).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-row-id');
          var row = state.rows.filter(function (r) { return String(r.id) === id; })[0];
          var action = opts.rowActions(row, api)[Number(btn.getAttribute('data-row-action'))];
          if (UI.closeDropdowns) UI.closeDropdowns();
          if (action && action.onClick) action.onClick(row, api);
        });
      });
      if (opts.onRowClick) {
        U.$$('tr[data-row-id]', tbody).forEach(function (tr) {
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', function (e) {
            if (e.target.closest('.dropdown, input, a, button')) return;
            var id = tr.getAttribute('data-row-id');
            opts.onRowClick(state.rows.filter(function (r) { return String(r.id) === id; })[0], api);
          });
        });
      }
    }

    function selectedIds() { return Object.keys(state.selected); }
    function syncBulk() {
      var bulk = toolbar.querySelector('[data-bulk]');
      var ids = selectedIds();
      if (bulk) {
        bulk.hidden = !ids.length;
        var count = bulk.querySelector('[data-bulk-count]');
        if (count) count.textContent = ids.length + ' selected';
      }
      var all = thead.querySelector('[data-select-all]');
      if (all) {
        var onPage = state.rows.filter(function (r) { return state.selected[r.id]; }).length;
        all.checked = onPage > 0 && onPage === state.rows.length;
        all.indeterminate = onPage > 0 && onPage < state.rows.length;
      }
    }

    function renderPager(meta) {
      if (meta.total <= 0) { pager.hidden = true; return; }
      pager.hidden = false;
      var windowed = [];
      var start = Math.max(1, meta.page - 2);
      var end = Math.min(meta.pages, start + 4);
      start = Math.max(1, end - 4);
      for (var p = start; p <= end; p++) windowed.push(p);
      pager.innerHTML =
        '<span>Showing <strong>' + meta.from + '–' + meta.to + '</strong> of <strong>' +
        U.num(meta.total) + '</strong></span><div class="pages">' +
        '<button type="button" class="page-btn" data-page="' + (meta.page-1) + '"' +
          (meta.page <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' +
          GGL.icon('chevronLeft','ico') + '</button>' +
        (start > 1 ? '<button type="button" class="page-btn" data-page="1">1</button>' +
          (start > 2 ? '<span class="text-subtle">…</span>' : '') : '') +
        windowed.map(function (p) {
          return '<button type="button" class="page-btn"' +
            (p === meta.page ? ' aria-current="page"' : '') + ' data-page="' + p + '">' + p + '</button>';
        }).join('') +
        (end < meta.pages ? (end < meta.pages - 1 ? '<span class="text-subtle">…</span>' : '') +
          '<button type="button" class="page-btn" data-page="' + meta.pages + '">' + meta.pages + '</button>' : '') +
        '<button type="button" class="page-btn" data-page="' + (meta.page+1) + '"' +
          (meta.page >= meta.pages ? ' disabled' : '') + ' aria-label="Next page">' +
          GGL.icon('chevronRight','ico') + '</button></div>';
      U.$$('[data-page]', pager).forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.page = Number(btn.getAttribute('data-page'));
          load();
          container.scrollIntoView({ behavior:'smooth', block:'start' });
        });
      });
    }

    function load() {
      var colCount = cols.length + (opts.selectable ? 1 : 0) + (opts.rowActions ? 1 : 0);
      tbody.innerHTML = UI.skeletonRows(Math.min(state.size, 6), colCount);
      stateSlot.innerHTML = '';
      tableWrap.hidden = false;
      pager.hidden = true;
      opts.fetch({ search:state.search, filters:state.filters, sort:state.sort,
        dir:state.dir, page:state.page, size:state.size
      }).then(function (meta) {
        state.rows = meta.rows;
        state.meta = meta;
        if (!meta.rows.length) {
          /* Clear the body too — otherwise the previous page's rows linger
             in the DOM behind the empty state. */
          tbody.innerHTML = '';
          state.selected = {};
          tableWrap.hidden = true;
          pager.hidden = true;
          var isFiltered = state.search || Object.keys(state.filters).some(function (k) {
            return state.filters[k] && state.filters[k] !== 'all';
          });
          stateSlot.innerHTML = isFiltered
            ? UI.empty({ icon:'search', title:'No matching records',
                message:'No results for the current search and filters. Try widening them.',
                action:'Clear filters' })
            : UI.empty(opts.empty || {});
          var act = stateSlot.querySelector('[data-empty-action]');
          if (act) act.addEventListener('click', function () {
            if (isFiltered) api.reset();
            else if (opts.empty && opts.empty.onAction) opts.empty.onAction(api);
          });
          return;
        }
        renderHead(); renderBody(); renderPager(meta); syncBulk();
      }).catch(function (err) {
        if (window.console) console.error('[GGL] table load failed', err);
        tableWrap.hidden = true;
        stateSlot.innerHTML = UI.error({ message: err && err.message });
        var retry = stateSlot.querySelector('[data-retry]');
        if (retry) retry.addEventListener('click', load);
      });
    }

    var api = {
      reload: load,
      get state() { return state; },
      get selection() { return selectedIds().map(function (i) { return state.selected[i]; }); },
      clearSelection: function () { state.selected = {}; renderBody(); syncBulk(); },
      reset: function () {
        state.search = '';
        Object.keys(state.filters).forEach(function (k) { state.filters[k] = 'all'; });
        state.page = 1;
        renderToolbar(); load();
      },
      setFilter: function (key, value) {
        state.filters[key] = value; state.page = 1;
        var sel = toolbar.querySelector('[data-filter="' + key + '"]');
        if (sel) sel.value = value;
        load();
      }
    };

    renderToolbar(); renderHead(); load();
    return api;
  };

})(window.GGL = window.GGL || {});
