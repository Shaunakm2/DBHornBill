/* ==========================================================================
   GG Learning Labs — Core: icons, utilities, config, theme
   ========================================================================== */
(function (GGL) {
  'use strict';

  /* ------------------------------------------------------------------ icons */
  var PATHS = {
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    menu:'<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    close:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    chevronDown:'<polyline points="6 9 12 15 18 9"/>',
    chevronUp:'<polyline points="18 15 12 9 6 15"/>',
    chevronLeft:'<polyline points="15 18 9 12 15 6"/>',
    chevronRight:'<polyline points="9 18 15 12 9 6"/>',
    arrowRight:'<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    arrowUp:'<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    arrowDown:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    sort:'<polyline points="6 9 12 4 18 9"/><polyline points="6 15 12 20 18 15"/>',
    moreVertical:'<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
    users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    userPlus:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
    userCheck:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    award:'<circle cx="12" cy="8" r="6"/><polyline points="8.2 13.4 7 22 12 19 17 22 15.8 13.4"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    bookOpen:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    graduation:'<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    layers:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    play:'<polygon points="6 3 20 12 6 21 6 3"/>',
    video:'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    fileText:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    clipboard:'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
    checkSquare:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    compass:'<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    lightbulb:'<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.1 14a5 5 0 1 0-6.2 0c.6.5 1.1 1.2 1.1 2h4c0-.8.5-1.5 1.1-2z"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    barChart:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    trending:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    activity:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    sliders:'<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    check:'<polyline points="20 6 9 17 4 12"/>',
    checkCircle:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    xCircle:'<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    alert:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    help:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    inbox:'<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    sun:'<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
    mapPin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    globe:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    trophy:'<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
    messageCircle:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>',
    megaphone:'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    puzzle:'<path d="M19.44 12.44a2.5 2.5 0 1 0 0-4.32V5a1 1 0 0 0-1-1h-3.12a2.5 2.5 0 1 0-4.32 0H7a1 1 0 0 0-1 1v3.12a2.5 2.5 0 1 0 0 4.32V19a1 1 0 0 0 1 1h3.12a2.5 2.5 0 1 1 4.32 0h3.12a1 1 0 0 0 1-1z"/>',
    package:'<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/>',
    link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    database:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    server:'<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    twitter:'<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>',
    linkedin:'<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    youtube:'<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>'
  };

  GGL.icon = function (name, cls) {
    var body = PATHS[name];
    if (!body) { if (window.console && console.warn) console.warn('[GGL] unknown icon:', name); body = PATHS.help; }
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body + '</svg>';
  };
  GGL.iconNames = Object.keys(PATHS);

  /* -------------------------------------------------------------- utilities */
  var U = {};
  U.$  = function (s, r) { return (r || document).querySelector(s); };
  U.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  U.el = function (tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    });
    if (html !== undefined && html !== null) n.innerHTML = html;
    return n;
  };
  U.on = function (target, evt, sel, handler) {
    if (typeof sel === 'function') { target.addEventListener(evt, sel); return; }
    target.addEventListener(evt, function (e) {
      var m = e.target.closest(sel);
      if (m && target.contains(m)) handler.call(m, e, m);
    });
  };
  U.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  };
  U.debounce = function (fn, wait) {
    var t;
    return function () { var c = this, a = arguments; clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, wait || 250); };
  };
  U.trapFocus = function (container) {
    var SEL = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    function onKey(e) {
      if (e.key !== 'Tab') return;
      var items = U.$$(SEL, container).filter(function (n) { return n.offsetParent !== null; });
      if (!items.length) return;
      var f = items[0], l = items[items.length - 1];
      if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
      else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
    }
    container.addEventListener('keydown', onKey);
    return function () { container.removeEventListener('keydown', onKey); };
  };
  U.initials = function (name) {
    if (!name) return '?';
    return String(name).trim().split(/\s+/).slice(0,2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
  };
  U.num = function (n) { return (n === null || n === undefined || isNaN(n)) ? '—' : Number(n).toLocaleString('en-IN'); };
  U.money = function (n, c) { return (c || '₹') + Number(n || 0).toLocaleString('en-IN'); };
  U.date = function (iso, style) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', style === 'long'
      ? { day:'numeric', month:'long', year:'numeric' } : { day:'2-digit', month:'short', year:'numeric' });
  };
  U.time = function (iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  };
  U.relative = function (iso) {
    if (!iso) return '—';
    var then = new Date(iso).getTime();
    if (isNaN(then)) return '—';
    var diff = Math.round((then - Date.now()) / 1000), abs = Math.abs(diff);
    var units = [['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60]];
    for (var i = 0; i < units.length; i++) {
      if (abs >= units[i][1]) return new Intl.RelativeTimeFormat('en', { numeric:'auto' })
        .format(Math.round(diff / units[i][1]), units[i][0]);
    }
    return 'just now';
  };
  U.greeting = function () {
    var h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };
  U.duration = function (m) {
    if (!m && m !== 0) return '—';
    var h = Math.floor(m / 60), r = m % 60;
    return h ? h + 'h' + (r ? ' ' + r + 'm' : '') : r + 'm';
  };
  U.clone = function (v) { return JSON.parse(JSON.stringify(v)); };
  U.uid = function (p) { return (p || 'id') + '_' + Math.random().toString(36).slice(2,9); };
  U.get = function (o, path) {
    return String(path).split('.').reduce(function (a, k) {
      return (a === null || a === undefined) ? undefined : a[k];
    }, o);
  };
  U.search = function (rows, term, keys) {
    if (!term) return rows;
    var q = String(term).toLowerCase().trim();
    return rows.filter(function (r) {
      return keys.some(function (k) {
        var v = U.get(r, k);
        return v !== undefined && v !== null && String(v).toLowerCase().indexOf(q) !== -1;
      });
    });
  };
  U.sort = function (rows, key, dir) {
    if (!key) return rows;
    var mul = dir === 'desc' ? -1 : 1;
    return rows.slice().sort(function (a, b) {
      var x = U.get(a, key), y = U.get(b, key);
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * mul;
      var dx = Date.parse(x), dy = Date.parse(y);
      if (!isNaN(dx) && !isNaN(dy) && typeof x === 'string' && x.length > 7) return (dx - dy) * mul;
      return String(x).localeCompare(String(y), undefined, { numeric:true }) * mul;
    });
  };
  U.paginate = function (rows, page, size) {
    var total = rows.length, pages = Math.max(1, Math.ceil(total / size));
    var p = Math.min(Math.max(1, page), pages);
    return { rows: rows.slice((p-1)*size, p*size), page:p, pages:pages, total:total, size:size,
      from: total ? (p-1)*size + 1 : 0, to: Math.min(p*size, total) };
  };
  U.groupBy = function (rows, key) {
    return rows.reduce(function (acc, r) {
      var k = typeof key === 'function' ? key(r) : U.get(r, key);
      (acc[k] = acc[k] || []).push(r);
      return acc;
    }, {});
  };
  U.sum = function (rows, key) { return rows.reduce(function (a, r) { return a + (Number(U.get(r,key)) || 0); }, 0); };
  U.avg = function (rows, key) { return rows.length ? U.sum(rows,key) / rows.length : 0; };

  U.validators = {
    required: function (v) { return (v !== null && v !== undefined && String(v).trim() !== '') || 'This field is required.'; },
    email: function (v) { return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Enter a valid email address.'; },
    min: function (n) { return function (v) { return !v || String(v).length >= n || 'Must be at least ' + n + ' characters.'; }; },
    numeric: function (v) { return !v || !isNaN(Number(v)) || 'Enter a number.'; },
    match: function (other, label) {
      return function (v, form) {
        var o = form.elements[other];
        return !v || v === (o && o.value) || (label || 'Values') + ' do not match.';
      };
    }
  };

  U.validateForm = function (form, rules) {
    var errors = {}, values = {};
    U.$$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      var val = input.type === 'checkbox' ? input.checked : input.value;
      values[name] = typeof val === 'string' ? val.trim() : val;
      for (var i = 0; i < rules[name].length; i++) {
        var res = rules[name][i](values[name], form);
        if (res !== true) { errors[name] = res; break; }
      }
    });
    U.$$('input,select,textarea', form).forEach(function (i) {
      if (!i.name || values.hasOwnProperty(i.name)) return;
      values[i.name] = i.type === 'checkbox' ? i.checked : i.value;
    });
    Object.keys(errors).forEach(function (name) {
      var input = form.elements[name], field = input.closest('.field');
      if (!field) return;
      field.classList.add('has-error');
      var msg = field.querySelector('.error-text');
      if (!msg) { msg = U.el('span', { class:'error-text' }); field.appendChild(msg); }
      msg.innerHTML = GGL.icon('alert','ico') + '<span>' + U.esc(errors[name]) + '</span>';
      var ico = msg.querySelector('.ico');
      if (ico) { ico.style.width = '13px'; ico.style.height = '13px'; }
      input.setAttribute('aria-invalid','true');
    });
    var first = Object.keys(errors)[0];
    if (first && form.elements[first]) form.elements[first].focus();
    return { valid: !Object.keys(errors).length, values: values, errors: errors };
  };

  U.delay = function (ms) { return new Promise(function (r) { setTimeout(r, ms === undefined ? 380 : ms); }); };

  function csvField(v) {
    if (v === null || v === undefined) return '';
    var s = String(v).replace(/<[^>]*>/g,'').trim();
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  }
  U.triggerDownload = function (filename, content, mime) {
    var blob = content instanceof Blob ? content
      : new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
    return filename;
  };
  U.downloadCsv = function (filename, columns, rows) {
    var head = columns.map(function (c) { return csvField(c.label); }).join(',');
    var body = rows.map(function (r) {
      return columns.map(function (c) { return csvField(c.value ? c.value(r) : U.get(r, c.key)); }).join(',');
    }).join('\r\n');
    return U.triggerDownload(filename, '\uFEFF' + head + '\r\n' + body, 'text/csv');
  };
  U.stamp = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  };
  U.printDocument = function (title, bodyHtml) {
    var w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return false;
    w.document.write('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>' + U.esc(title) +
      '</title><style>body{font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;color:#141b25;margin:40px;line-height:1.55}' +
      'h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}' +
      '.meta{color:#6b7686;font-size:12px;margin-bottom:24px}' +
      'table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}' +
      'th,td{border:1px solid #e1e5ec;padding:7px 9px;text-align:left}' +
      'th{background:#f7f8fa;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:.05em}' +
      'tr:nth-child(even) td{background:#fcfcfd}' +
      '.foot{margin-top:28px;padding-top:12px;border-top:1px solid #e1e5ec;color:#98a2b3;font-size:11px}' +
      '@media print{body{margin:12mm}}</style></head><body>' + bodyHtml +
      '<div class="foot">GG Learning Labs · Generated ' + new Date().toLocaleString('en-GB') +
      ' · Prototype sample data</div></body></html>');
    w.document.close();
    setTimeout(function () { w.focus(); w.print(); }, 350);
    return true;
  };

  U.store = {
    get: function (k, fb) {
      try { var raw = localStorage.getItem('ggl.' + k); return raw === null ? fb : JSON.parse(raw); }
      catch (e) { return fb; }
    },
    set: function (k, v) { try { localStorage.setItem('ggl.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    remove: function (k) { try { localStorage.removeItem('ggl.' + k); } catch (e) {} }
  };

  var TONE = { active:'success', published:'success', completed:'success', graduated:'success',
    approved:'success', present:'success', passed:'success', met:'success', issued:'success', addressed:'success',
    'in progress':'info', assigned:'info', scheduled:'info', review:'info', 'under review':'info',
    submitted:'info', medium:'info', matching:'info', identified:'info', planned:'info', active2:'info',
    draft:'warning', pending:'warning', late:'warning', retraining:'warning', 'on hold':'warning',
    overdue:'warning', excused:'warning', requested:'warning', approval:'warning',
    inactive:'danger', absent:'danger', failed:'danger', rejected:'danger', cancelled:'danger',
    expired:'danger', suspended:'danger', high:'danger', critical:'danger', revoked:'danger',
    archived:'plain', 'not started':'plain' };

  U.statusBadge = function (status) {
    var t = TONE[String(status || '').toLowerCase()] || '';
    return '<span class="badge' + (t && t !== 'plain' ? ' badge-' + t : '') + '">' + U.esc(status) + '</span>';
  };
  U.progressCell = function (value) {
    var v = Math.max(0, Math.min(100, Number(value) || 0));
    var tone = v >= 75 ? 'green' : v >= 40 ? '' : v > 0 ? 'amber' : 'red';
    return '<div class="progress-row"><div class="progress">' +
      '<div class="progress-bar ' + tone + '" style="width:' + v + '%"></div></div>' +
      '<span class="pct">' + v + '%</span></div>';
  };
  U.userCell = function (name, sub) {
    return '<div class="user-cell"><span class="avatar avatar-sm">' + U.esc(U.initials(name)) + '</span>' +
      '<span class="meta"><span class="name truncate">' + U.esc(name) + '</span>' +
      (sub ? '<span class="sub truncate">' + U.esc(sub) + '</span>' : '') + '</span></div>';
  };

  GGL.utils = U;

  /* ----------------------------------------------------------------- config */
  var BASE = document.documentElement.getAttribute('data-base') || './';
  if (BASE.slice(-1) !== '/') BASE += '/';
  GGL.base = BASE;
  GGL.url = function (p) { return BASE + String(p).replace(/^\//, ''); };
  GGL.config = { appName:'GG Learning Labs', tagline:'Learning & Development Platform',
    promise:'One Platform. Every L&D Need.', supportEmail:'support@gglearninglabs.example',
    version:'1.0.0-prototype' };
  GGL.ROLES = { SUPER_ADMIN:'super_admin', ADMIN:'admin', TRAINER:'trainer', END_USER:'end_user' };
  GGL.roleLabel = function (r) {
    return ({ super_admin:'Super Admin', admin:'L&D Administrator', trainer:'Trainer', end_user:'Trainee' })[r] || 'User';
  };

  var R = GGL.ROLES, ALL = [R.SUPER_ADMIN, R.ADMIN, R.TRAINER, R.END_USER], STAFF = [R.SUPER_ADMIN, R.ADMIN], DELIVERY = [R.SUPER_ADMIN, R.ADMIN, R.TRAINER];
  GGL.NAV = [
    { group:null, items:[{ label:'Dashboard', icon:'grid', href:'app/dashboard.html', roles:ALL }]},
    { group:'Learn', roles:[R.END_USER], items:[
      { label:'My Learning', icon:'bookOpen', href:'app/learning.html', roles:[R.END_USER] },
      { label:'Training Calendar', icon:'calendar', href:'app/calendar.html', roles:[R.END_USER] },
      { label:'Assessments', icon:'checkSquare', href:'app/assessments.html', roles:[R.END_USER] },
      { label:'Certificates', icon:'award', href:'app/certificates.html', roles:[R.END_USER] },
      { label:'Achievements', icon:'trophy', href:'app/gamification.html', roles:[R.END_USER] },
      { label:'Competency', icon:'target', href:'app/competencies.html', roles:[R.END_USER] },
      { label:'Learning Paths', icon:'compass', href:'app/paths.html', roles:[R.END_USER] },
      { label:'Coaching', icon:'messageCircle', href:'app/coaching.html', roles:[R.END_USER] },
      { label:'Mentoring', icon:'users', href:'app/mentoring.html', roles:[R.END_USER] }]},
    { group:'Plan & Analyse', roles:DELIVERY, items:[
      { label:'TNA / TNI', icon:'compass', href:'app/tna.html', roles:STAFF },
      { label:'Competencies', icon:'target', href:'app/competencies.html', roles:DELIVERY },
      { label:'Training Calendar', icon:'calendar', href:'app/calendar.html', roles:DELIVERY }]},
    { group:'Deliver', roles:DELIVERY, items:[
      { label:'Courses', icon:'book', href:'app/courses.html', roles:DELIVERY },
      { label:'Batches', icon:'layers', href:'app/batches.html', roles:DELIVERY },
      { label:'Attendance', icon:'userCheck', href:'app/attendance.html', roles:DELIVERY },
      { label:'Trainers', icon:'briefcase', href:'app/trainers.html', roles:DELIVERY },
      { label:'Learning Paths', icon:'compass', href:'app/paths.html', roles:DELIVERY },
      { label:'Content Library', icon:'folder', href:'app/content.html', roles:DELIVERY },
      { label:'SCORM Player', icon:'package', href:'app/scorm.html', roles:DELIVERY },
      { label:'Upload Center', icon:'upload', href:'app/uploads.html', roles:DELIVERY }]},
    { group:'Measure', roles:DELIVERY, items:[
      { label:'Effectiveness', icon:'trending', href:'app/effectiveness.html', roles:DELIVERY },
      { label:'Trainer Observation', icon:'clipboard', href:'app/observation.html', roles:DELIVERY },
      { label:'Effectiveness Calculator', icon:'activity', href:'app/effectiveness-calculator.html', roles:DELIVERY },
      { label:'Assessments', icon:'checkSquare', href:'app/assessments.html', roles:DELIVERY },
      { label:'Assessment Builder', icon:'edit', href:'app/assessment-builder.html', roles:DELIVERY },
      { label:'Certificates', icon:'award', href:'app/certificates.html', roles:DELIVERY },
      { label:'Reports', icon:'barChart', href:'app/reports.html', roles:DELIVERY }]},
    { group:'Develop', roles:DELIVERY, items:[
      { label:'Gamification', icon:'trophy', href:'app/gamification.html', roles:DELIVERY },
      { label:'Coaching', icon:'messageCircle', href:'app/coaching.html', roles:DELIVERY },
      { label:'Mentoring', icon:'users', href:'app/mentoring.html', roles:DELIVERY },
      { label:'SOPs', icon:'fileText', href:'app/sops.html', roles:DELIVERY }]},
    { group:'Administration', roles:STAFF, items:[
      { label:'Users', icon:'users', href:'app/users.html', roles:STAFF },
      { label:'Audit Log', icon:'shield', href:'app/audit.html', roles:[R.SUPER_ADMIN] },
      { label:'Platform Settings', icon:'server', href:'app/platform.html', roles:[R.SUPER_ADMIN] }]},
    { group:'Workspace', roles:ALL, items:[
      { label:'Requests', icon:'inbox', href:'app/requests.html', roles:ALL },
      { label:'Newsfeed', icon:'megaphone', href:'app/newsfeed.html', roles:ALL },
      { label:'Notifications', icon:'bell', href:'app/notifications.html', roles:ALL },
      { label:'Settings', icon:'settings', href:'app/settings.html', roles:ALL }]}
  ];
  GGL.navFor = function (role) {
    var session = null;
    try { session = JSON.parse(localStorage.getItem('ggl.session') || 'null'); } catch(e) { session = null; }
    var sessionUser = session && GGL.data && GGL.data.users ? GGL.data.users.filter(function(u){return u.id===session.userId;})[0] : null;
    var individual = sessionUser && sessionUser.workspaceType === 'individual';
    if (individual) {
      var purchasable = ['Dashboard','My Learning','Training Calendar','Assessments','Certificates','Achievements','Competency','Competencies','Learning Paths','Coaching','Mentoring','TNA / TNI','Courses','Batches','Attendance','Trainers','Content Library','SCORM Player','Upload Center','Effectiveness','Trainer Observation','Effectiveness Calculator','Assessment Builder','Reports','SOPs','Requests','Newsfeed','Notifications','Settings'];
      return GGL.NAV.map(function(g){ return { group:g.group, items:g.items.filter(function(i){ return purchasable.indexOf(i.label)!==-1; }) }; })
        .filter(function(g){ return g.items.length; });
    }
    return GGL.NAV.filter(function (g) { return !g.roles || g.roles.indexOf(role) !== -1; })
      .map(function (g) {
        return { group:g.group, items:g.items.filter(function (i) { return i.roles.indexOf(role) !== -1; }) };
      }).filter(function (g) { return g.items.length; });
  };

  /* ------------------------------------------------------------------ theme */
  var KEY = 'ggl.theme';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function systemTheme() { return mq && mq.matches ? 'dark' : 'light'; }
  function resolved() { var p = stored() || 'system'; return p === 'system' ? systemTheme() : p; }
  function syncToggles(theme) {
    var isDark = theme === 'dark';
    U.$$('[data-theme-toggle]').forEach(function (btn) {
      btn.innerHTML = GGL.icon(isDark ? 'sun' : 'moon', 'ico');
      btn.setAttribute('aria-label', 'Switch to ' + (isDark ? 'light' : 'dark') + ' mode');
      btn.setAttribute('data-tip', isDark ? 'Light mode' : 'Dark mode');
      btn.setAttribute('aria-pressed', String(isDark));
    });
  }
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0f16' : '#ffffff');
    syncToggles(theme);
    document.dispatchEvent(new CustomEvent('ggl:themechange', { detail:{ theme:theme } }));
  }
  var themeReady = false;
  GGL.theme = {
    get preference() { return stored() || 'system'; },
    get current() { return resolved(); },
    set: function (pref) {
      try { if (pref === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, pref); }
      catch (e) {}
      apply(resolved());
    },
    toggle: function () { GGL.theme.set(resolved() === 'dark' ? 'light' : 'dark'); },
    init: function () {
      apply(resolved());
      if (themeReady) return;
      themeReady = true;
      document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-theme-toggle]');
        if (btn) { e.preventDefault(); GGL.theme.toggle(); }
      });
      if (mq) {
        var onChange = function () { if (!stored()) apply(systemTheme()); };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
      }
      window.addEventListener('storage', function (e) { if (e.key === KEY) apply(resolved()); });
    }
  };

})(window.GGL = window.GGL || {});
