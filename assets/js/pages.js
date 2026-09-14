/* ==========================================================================
   GG Learning Labs — Pages

   Every screen lives here, keyed by window.GGL_PAGE which each HTML file
   sets before loading this script. Keeping them together means one load
   order to reason about and no per-page boilerplate.
   ========================================================================== */
(function (GGL) {
  'use strict';

  var U = GGL.utils, UI = GGL.ui, C = GGL.charts, S = GGL.services;
  var P = {};

  /* --------------------------------------------------------------- helpers */
  function stat(label, value, icon, tone, delta, period) {
    return '<div class="card stat"><div class="stat-top">' +
      '<span class="stat-label">' + U.esc(label) + '</span>' +
      '<span class="stat-icon ' + (tone || '') + '">' + GGL.icon(icon, 'ico') + '</span></div>' +
      '<div class="stat-value">' + value + '</div>' +
      (delta !== undefined && delta !== null
        ? '<div class="stat-delta ' + (delta >= 0 ? 'up' : 'down') + '">' +
          GGL.icon(delta >= 0 ? 'arrowUp' : 'arrowDown', 'ico') +
          '<span>' + Math.abs(delta) + '%</span>' +
          '<span class="period">' + U.esc(period || 'vs last month') + '</span></div>' : '') + '</div>';
  }
  function card(title, sub, body, action) {
    return '<section class="card"><div class="card-head"><div><h3>' + U.esc(title) + '</h3>' +
      (sub ? '<p class="sub">' + U.esc(sub) + '</p>' : '') + '</div>' + (action || '') +
      '</div><div class="card-body">' + body + '</div></section>';
  }
  function kv(pairs) {
    return '<dl class="kv">' + pairs.map(function (p) {
      return '<dt>' + U.esc(p[0]) + '</dt><dd>' + (p[2] ? p[1] : U.esc(p[1])) + '</dd>';
    }).join('') + '</dl>';
  }
  function mini(label, value) {
    return '<div class="card card-pad" style="padding:var(--sp-3);text-align:center">' +
      '<div class="fw-bold">' + U.esc(value === undefined ? '—' : value) + '</div>' +
      '<div class="text-xs text-muted">' + U.esc(label) + '</div></div>';
  }
  function priorityBadge(p) {
    var tone = p === 'Critical' ? 'danger' : p === 'High' ? 'warning' : p === 'Medium' ? 'info' : 'plain';
    return '<span class="badge badge-' + tone + '">' + U.esc(p) + '</span>';
  }
  function gapBar(current, required) {
    var pct = Math.min(100, (current / required) * 100);
    var gap = Math.max(0, required - current);
    var tone = gap === 0 ? 'green' : gap === 1 ? 'amber' : 'red';
    return '<div class="progress-row"><div class="progress">' +
      '<div class="progress-bar ' + tone + '" style="width:' + pct + '%"></div></div>' +
      '<span class="pct">' + current + '/' + required + '</span></div>';
  }
  function denied(message) {
    return '<div class="card"><div class="state">' +
      '<div class="state-icon danger">' + GGL.icon('lock','ico') + '</div>' +
      '<h3>You don\u2019t have access to this area</h3>' +
      '<p>' + U.esc(message) + '</p>' +
      '<a class="btn btn-primary" href="' + GGL.url('app/dashboard.html') + '">Back to dashboard</a>' +
      '</div></div>';
  }
  function sessionList(rows, emptyMsg) {
    if (!rows.length) return UI.empty({ icon:'calendar', title:'Nothing scheduled', message:emptyMsg });
    return '<ul class="session-list">' + rows.map(function (s) {
      var d = new Date(s.start);
      return '<li><span class="session-date">' +
        '<span class="m">' + d.toLocaleDateString('en-GB', { month:'short' }) + '</span>' +
        '<span class="d">' + d.getDate() + '</span></span>' +
        '<span class="session-info"><h4 class="truncate">' + U.esc(s.title) + '</h4>' +
        '<span class="meta"><span>' + GGL.icon('clock','ico') + U.time(s.start) + '</span>' +
        '<span>' + GGL.icon('user','ico') + U.esc(s.trainer) + '</span>' +
        '<span>' + GGL.icon('mapPin','ico') + U.esc(s.location) + '</span></span></span>' +
        '<a class="btn btn-sm btn-secondary" href="' + GGL.url('app/calendar.html') + '">' +
        (s.mode === 'Virtual' ? 'Join' : 'View') + '</a></li>';
    }).join('') + '</ul>';
  }

  /* ============================== PUBLIC HOME ============================= */
  P.home = function () {
    var CAPABILITIES = [
      ['compass','Plan &amp; Analyse','TNA, TNI, skill-gap analysis and competency mapping that start from evidence, not guesswork.'],
      ['puzzle','Design &amp; Create','Course design, content development, SOPs and a searchable library in one repository.'],
      ['calendar','Train &amp; Manage','Calendar, scheduler, batches, trainers, trainees, sessions and attendance.'],
      ['bookOpen','Learn','Courses, modules, lessons, learning paths, progress tracking and certificates.'],
      ['checkSquare','Assess','Pre and post assessments that are graded live, with certificates issued on a pass.'],
      ['users','Develop','Coaching, mentoring, retraining, development plans and tasteful gamification.'],
      ['trending','Measure','Trainer observation and training effectiveness across reaction to results.'],
      ['barChart','Improve','Dashboards, reports and analytics that feed the next planning cycle.']
    ];
    var LIFECYCLE = [
      ['Identify','Surface the real capability gap'],
      ['Plan','Prioritise and schedule the intervention'],
      ['Create','Design content, assessments and SOPs'],
      ['Deliver','Run sessions, batches and self-paced learning'],
      ['Assess','Check knowledge before and after'],
      ['Measure','Observe trainers, measure effectiveness'],
      ['Develop','Coach, mentor and retrain where needed'],
      ['Improve','Feed the evidence back into planning']
    ];
    var MODULES = [
      ['Dashboards',1],['Course Management',1],['Batch Management',1],['Training Calendar',1],
      ['Attendance',1],['User Management',1],['Training Effectiveness',1],['Trainer Observation',1],
      ['Reports Centre',1],['Notifications',1],['Assessments',1],['Certificates',1],
      ['Gamification',1],['Data Export',1],['TNA / TNI',1],['Competency Mapping',1],
      ['Content Library',1],['SOP Management',1],['Coaching',1],['Mentoring',1],
      ['Request Centre',1],['Newsfeed',1],['Learning Paths',1],['Audit Log',1],
      ['Platform Settings',1],['SCORM Player',1],['Assessment Builder',1],['Upload Center',1]
    ];
    var SERVICES = [
      ['graduation','Training delivery','Facilitators for leadership, behavioural, process and compliance programmes.'],
      ['puzzle','Content development','Storyboards, e-learning, job aids and assessment banks built to your context.'],
      ['messageCircle','Coaching','One-to-one and group coaching for managers and high-potential talent.'],
      ['users','Mentoring programmes','Design, matching frameworks and running of structured mentoring schemes.'],
      ['clipboard','SOP development','Process documentation written to survive an audit and be usable on the floor.'],
      ['lightbulb','L&amp;D consulting','Operating model, capability frameworks and measurement strategy.']
    ];
    var PRICING = [
      { name:'Starter', monthly:24000, yearly:19200,
        desc:'For a single L&amp;D team getting structure in place.',
        features:['Up to 250 learners','Course &amp; batch management','Attendance tracking',
          'Standard reports','Email support'], cta:'Start free trial', featured:false },
      { name:'Professional', monthly:58000, yearly:46400,
        desc:'For organisations running continuous capability programmes.',
        features:['Up to 2,000 learners','Everything in Starter','Training effectiveness',
          'Trainer observation','Competency mapping','Priority support'],
        cta:'Start free trial', featured:true },
      { name:'Enterprise', monthly:null, yearly:null,
        desc:'For multi-entity organisations with audit obligations.',
        features:['Unlimited learners','Everything in Professional','SSO &amp; provisioning',
          'Audit log &amp; retention controls','L&amp;D services bundle','Named success manager'],
        cta:'Contact sales', featured:false }
    ];
    var ABOUT = [
      ['target','Evidence-led','Every intervention traces back to an identified gap.'],
      ['shield','Audit-ready','Attendance, assessment and observation trails by default.'],
      ['layers','One ecosystem','No more reconciling five tools and a spreadsheet.'],
      ['trending','Measured impact','Effectiveness from reaction through to business results.']
    ];
    var FAQ = [
      ['Is this a Learning Management System?',
       'No — an LMS is one module inside it. GG Learning Labs covers planning and needs analysis, design and content, delivery and scheduling, assessment, effectiveness measurement, people development and analytics. Course delivery is a part of that, not the whole.'],
      ['What is actually working in this build?',
       'This is a frontend prototype, but the interactive parts are genuinely interactive. You can sit a graded assessment, which scores your answers, awards points and issues a certificate you can download. The Trainer Observation Form and Effectiveness Calculator reproduce the client workbooks exactly. Course, batch, user and attendance management all work, as do dashboards, reporting, the leaderboard and CSV exports that produce real files.'],
      ['Is there a backend connected?',
       'Not yet, and the prototype never pretends otherwise. All data comes from an in-memory mock layer behind a service interface. Edits you make persist in your browser only. The service layer is structured so a database and real authentication can replace it without rewriting the interface.'],
      ['How is data secured?',
       'In this phase it is not — and it should not be treated as though it is. The role-based navigation shapes what each persona sees, but that is presentation, not security. Real authorisation must be enforced server-side before any production use.'],
      ['Can we customise the observation and effectiveness forms?',
       'The observation criteria are defined as configurable data with weightings rather than hard-coded markup, so a form builder can be layered on without restructuring the module. The effectiveness weights are likewise a single data structure.'],
      ['Does it work on mobile?',
       'Yes. Every screen is built responsive down to 390px with real mobile layouts — a drawer navigation, stacked cards and scrollable tables — rather than a shrunken desktop view.']
    ];

    function renderPricing(period) {
      var el = document.getElementById('pricing-grid');
      if (!el) return;
      el.innerHTML = PRICING.map(function (p) {
        var amount = period === 'yearly' ? p.yearly : p.monthly;
        return '<article class="card price-card' + (p.featured ? ' featured' : '') + '">' +
          (p.featured ? '<span class="price-tag">Most popular</span>' : '') +
          '<h3>' + U.esc(p.name) + '</h3><p class="desc">' + p.desc + '</p>' +
          '<div class="price-amount">' +
            (amount === null ? '<span class="amt">Custom</span>'
              : '<span class="amt">' + U.money(amount) + '</span><span class="per">/ month</span>') +
          '</div>' +
          '<button type="button" class="btn ' + (p.featured ? 'btn-primary' : 'btn-secondary') +
            ' btn-block" data-plan="' + U.esc(p.name) + '">' + U.esc(p.cta) + '</button>' +
          '<ul class="price-feats">' + p.features.map(function (f) {
            return '<li>' + GGL.icon('check','ico') + '<span>' + f + '</span></li>';
          }).join('') + '</ul></article>';
      }).join('');
      U.$$('[data-plan]', el).forEach(function (btn) {
        btn.addEventListener('click', function () { planDialog(btn.getAttribute('data-plan')); });
      });
    }

    function planDialog(plan) {
      var isEnt = plan === 'Enterprise';
      var h = UI.modal({
        title: isEnt ? 'Talk to sales' : 'Start your ' + plan + ' trial',
        subtitle:'Checkout is not connected in this prototype — this is a mock workflow.',
        size:'sm',
        body:'<form id="plan-form" novalidate>' +
          '<div class="field"><label class="label" for="pf-name">Full name <span class="req">*</span></label>' +
            '<input class="input" id="pf-name" name="name" type="text" autocomplete="name"></div>' +
          '<div class="field"><label class="label" for="pf-email">Work email <span class="req">*</span></label>' +
            '<input class="input" id="pf-email" name="email" type="email" autocomplete="email"></div>' +
          '<div class="field"><label class="label" for="pf-org">Organisation</label>' +
            '<input class="input" id="pf-org" name="org" type="text" autocomplete="organization"></div>' +
          '<div class="alert">' + GGL.icon('info','ico') + '<div class="text-sm">Selected plan: <strong>' +
            U.esc(plan) + '</strong></div></div></form>',
        footer:'<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
          '<button type="submit" form="plan-form" class="btn btn-primary">' +
          (isEnt ? 'Request a call' : 'Start trial') + '</button>'
      });
      h.overlay.querySelector('[data-cancel]').addEventListener('click', h.close);
      UI.handleSubmit(h.overlay.querySelector('#plan-form'),
        { name:[U.validators.required], email:[U.validators.required, U.validators.email] },
        function () { return U.delay(800); },
        { success: isEnt ? 'Request received' : 'Trial request received',
          successDesc:'A member of the team would be in touch — mock submission only.', onDone:h.close });
    }

    function demoDialog() {
      var h = UI.modal({
        title:'Request a demo', subtitle:'Or skip the queue — sign in with a demo account right now.',
        size:'sm',
        body:'<form id="demo-form" novalidate>' +
          '<div class="field"><label class="label" for="df-name">Full name <span class="req">*</span></label>' +
            '<input class="input" id="df-name" name="name" type="text" autocomplete="name"></div>' +
          '<div class="field"><label class="label" for="df-email">Work email <span class="req">*</span></label>' +
            '<input class="input" id="df-email" name="email" type="email" autocomplete="email"></div>' +
          '<div class="field"><label class="label" for="df-size">Learner population</label>' +
            '<select class="select" id="df-size" name="size"><option>Under 250</option>' +
            '<option>250 – 1,000</option><option>1,000 – 5,000</option><option>5,000+</option>' +
            '</select></div></form>',
        footer:'<a class="btn btn-ghost" href="' + GGL.url('login.html') + '">Use a demo account</a>' +
          '<button type="submit" form="demo-form" class="btn btn-primary">Request demo</button>'
      });
      UI.handleSubmit(h.overlay.querySelector('#demo-form'),
        { name:[U.validators.required], email:[U.validators.required, U.validators.email] },
        function () { return U.delay(800); },
        { success:'Demo requested', successDesc:'Mock submission — nothing was sent.', onDone:h.close });
    }

    GGL.theme.init();

    var el;
    if ((el = document.getElementById('capabilities'))) {
      el.innerHTML = CAPABILITIES.map(function (c, i) {
        return '<article class="card card-interactive feature-card tone-' + (i+1) + '">' +
          '<div class="feature-icon">' + GGL.icon(c[0],'ico') + '</div>' +
          '<h3>' + c[1] + '</h3><p>' + c[2] + '</p></article>';
      }).join('');
    }
    if ((el = document.getElementById('lifecycle-steps'))) {
      el.innerHTML = LIFECYCLE.map(function (s, i) {
        return '<div class="lifecycle-step tone-' + (i+1) + '"><div class="num">' + (i+1) + '</div>' +
          '<h4>' + U.esc(s[0]) + '</h4><p>' + U.esc(s[1]) + '</p></div>';
      }).join('');
    }
    if ((el = document.getElementById('module-pills'))) {
      el.innerHTML = MODULES.map(function (m) {
        return '<span class="module-pill' + (m[1] ? '' : ' soon') + '"' +
          (m[1] ? '' : ' title="Planned for a later phase"') + '>' +
          GGL.icon(m[1] ? 'check' : 'clock','ico') + '<span>' + U.esc(m[0]) + '</span>' +
          (m[1] ? '' : '<span class="badge badge-plain">Soon</span>') + '</span>';
      }).join('');
    }
    if ((el = document.getElementById('services-grid'))) {
      el.innerHTML = SERVICES.map(function (s, i) {
        return '<article class="card card-interactive service-card tone-' + (i+1) + '">' +
          '<div class="feature-icon">' + GGL.icon(s[0],'ico') + '</div>' +
          '<div><h3>' + s[1] + '</h3><p>' + s[2] + '</p></div></article>';
      }).join('');
    }
    if ((el = document.getElementById('about-points'))) {
      el.innerHTML = ABOUT.map(function (p, i) {
        return '<div class="card card-pad feature-card tone-' + (i+1) + '">' +
          '<div class="feature-icon">' + GGL.icon(p[0],'ico') + '</div>' +
          '<h4 style="font-size:var(--fs-base);margin-bottom:4px">' + U.esc(p[1]) + '</h4>' +
          '<p class="text-sm text-muted" style="margin:0">' + U.esc(p[2]) + '</p></div>';
      }).join('');
    }
    if ((el = document.getElementById('faq'))) {
      el.innerHTML = FAQ.map(function (f, i) {
        var id = 'faq-a-' + i;
        return '<div class="faq-item"><button type="button" class="faq-q" aria-expanded="false" ' +
          'aria-controls="' + id + '"><span>' + U.esc(f[0]) + '</span>' +
          GGL.icon('chevronDown','ico') + '</button>' +
          '<div class="faq-a" id="' + id + '"><p>' + U.esc(f[1]) + '</p></div></div>';
      }).join('');
    }
    if ((el = document.getElementById('social-links'))) {
      el.innerHTML = [['twitter','X'],['linkedin','LinkedIn'],['youtube','YouTube'],['globe','Website']]
        .map(function (s) {
          return '<a href="#support" aria-label="' + s[1] + ' (placeholder link)">' +
            GGL.icon(s[0],'ico') + '</a>';
        }).join('');
    }
    renderPricing('monthly');

    function openLoginModal() {
      var cards = GGL.data.demoAccounts.map(function(a) {
        return '<button type="button" class="demo-account" data-demo-email="' + U.esc(a.email) + '"><span class="demo-role">' + U.esc(a.workspaceType === 'individual' ? 'Individual Upskiller' : GGL.roleLabel(a.role)) + '</span><strong>' + U.esc(a.email) + '</strong><span>Password: demo1234</span></button>';
      }).join('');
      var h = UI.modal({ title:'Sign in to GG Learning Labs', subtitle:'Choose a role to test its workspace and permissions.', size:'lg',
        body:'<div class="demo-grid">' + cards + '</div><div class="divider"></div><form id="quick-login"><div class="grid grid-2"><div class="field"><label class="label">Email address *</label><input class="input" name="email" type="email" value="superadmin@example.com"><span class="error-text"></span></div><div class="field"><label class="label">Password *</label><input class="input" name="password" type="password" value="demo1234"><span class="error-text"></span></div></div><div class="alert">' + GGL.icon('info','ico') + 'Demo authentication only. Select a role above or enter a demo email.</div></form>',
        footer:'<button class="btn btn-secondary" type="button" data-cancel>Cancel</button><button class="btn btn-primary" type="submit" form="quick-login">Sign in</button>' });
      h.overlay.querySelector('[data-cancel]').addEventListener('click', h.close);
      U.$$('[data-demo-email]',h.overlay).forEach(function(btn){ btn.addEventListener('click',function(){ var f=h.overlay.querySelector('#quick-login'); f.email.value=btn.getAttribute('data-demo-email'); f.password.value='demo1234'; U.$$('[data-demo-email]',h.overlay).forEach(function(b){b.classList.toggle('selected',b===btn);}); }); });
      UI.handleSubmit(h.overlay.querySelector('#quick-login'), {email:[U.validators.required,U.validators.email],password:[U.validators.required,U.validators.min(6)]}, function(v){return GGL.services.auth.signIn(v.email,v.password);}, {reset:false,success:'Signed in',successDesc:'Opening your dashboard…',onDone:function(){window.location.href=GGL.url('app/dashboard.html');}});
    }
    U.$$('[data-open-login]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();openLoginModal();});});
    UI.initAccordion(document);

    U.$$('[data-icon]').forEach(function (n) {
      n.insertAdjacentHTML('afterbegin', GGL.icon(n.getAttribute('data-icon'), 'ico'));
    });

    var navBtn = document.querySelector('[data-nav-toggle]');
    var mobileNav = document.getElementById('mobile-nav');
    if (navBtn) {
      navBtn.innerHTML = GGL.icon('menu','ico');
      navBtn.addEventListener('click', function () {
        if (window.innerWidth > 1080) {
          mobileNav.classList.remove('open');
          navBtn.setAttribute('aria-expanded','false');
          navBtn.innerHTML = GGL.icon('menu','ico');
          return;
        }
        var open = mobileNav.classList.toggle('open');
        navBtn.setAttribute('aria-expanded', String(open));
        navBtn.innerHTML = GGL.icon(open ? 'close' : 'menu','ico');
        navBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
      window.addEventListener('resize', U.debounce(function () {
        if (window.innerWidth > 1080) {
          mobileNav.classList.remove('open');
          navBtn.setAttribute('aria-expanded','false');
          navBtn.innerHTML = GGL.icon('menu','ico');
          navBtn.setAttribute('aria-label','Open menu');
        }
      },100));
      U.$$('a', mobileNav).forEach(function (a) {
        a.addEventListener('click', function () {
          mobileNav.classList.remove('open');
          navBtn.setAttribute('aria-expanded','false');
          navBtn.innerHTML = GGL.icon('menu','ico');
        });
      });
    }

    if ('IntersectionObserver' in window) {
      var revealNodes = U.$$('.sec-head, .feature-card, .lifecycle-step, .price-card, .service-card');
      revealNodes.forEach(function(el){ el.classList.add('reveal-ready'); });
      var revealObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){ if(entry.isIntersecting){ entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } });
      }, { threshold:0.12, rootMargin:'0px 0px -40px 0px' });
      revealNodes.forEach(function(el){ revealObserver.observe(el); });
    }

    var header = document.getElementById('site-header');
    if (header) {
      var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
      window.addEventListener('scroll', onScroll, { passive:true });
      onScroll();
    }

    U.$$('[data-billing]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        U.$$('[data-billing]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        renderPricing(btn.getAttribute('data-billing'));
      });
    });

    var video = document.querySelector('[data-video]');
    if (video) {
      video.querySelector('.video-play').innerHTML = GGL.icon('play','ico');
      video.addEventListener('click', function () {
        UI.modal({ title:'Product overview', subtitle:'Video is a placeholder in this prototype.',
          size:'lg',
          body:'<div class="video-frame" style="cursor:default;box-shadow:none">' +
            '<span class="video-play">' + GGL.icon('play','ico') + '</span>' +
            '<span class="video-caption"><strong>No video attached yet</strong>' +
            '<span>Drop an MP4 or embed URL here when the asset is ready.</span></span></div>' });
      });
    }
    U.$$('[data-demo-request]').forEach(function (b) { b.addEventListener('click', demoDialog); });

    var contact = document.getElementById('contact-form');
    if (contact) UI.handleSubmit(contact, {
      name:[U.validators.required], email:[U.validators.required, U.validators.email],
      message:[U.validators.required, U.validators.min(10)]
    }, function () { return U.delay(900); },
      { success:'Message sent', successDesc:'Mock submission — no data left your browser.' });

    var newsletter = document.getElementById('newsletter-form');
    if (newsletter) UI.handleSubmit(newsletter, { email:[U.validators.required, U.validators.email] },
      function () { return U.delay(750); },
      { success:'You are subscribed', successDesc:'Mock subscription for the prototype.' });

    var sections = U.$$('main section[id]'), links = U.$$('.site-nav a');
    if ('IntersectionObserver' in window && sections.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
          });
        });
      }, { rootMargin:'-45% 0px -50% 0px' });
      sections.forEach(function (s) { io.observe(s); });
    }
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  };

  /* ================================= LOGIN =============================== */
  P.login = function () {
    var auth = S.auth;
    var POINTS = ['Plan from evidence — TNA, TNI and competency gaps',
      'Deliver training, batches, attendance and calendars',
      'Measure trainer observation and training effectiveness',
      'Report with an audit trail that holds up'];
    GGL.theme.init();

    var pts = document.getElementById('auth-points');
    if (pts) pts.innerHTML = POINTS.map(function (p) {
      return '<li>' + GGL.icon('checkCircle','ico') + '<span>' + U.esc(p) + '</span></li>';
    }).join('');

    var list = document.getElementById('demo-list');
    if (list) {
      list.innerHTML = GGL.data.demoAccounts.map(function (u) {
        return '<div class="cred-row"><span class="text-sm fw-medium">' +
          U.esc(GGL.roleLabel(u.role)) + '</span>' +
          '<button type="button" class="btn btn-sm btn-ghost" data-use="' + U.esc(u.email) + '">' +
          '<code>' + U.esc(u.email) + '</code></button></div>';
      }).join('');
      U.$$('[data-use]', list).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var form = document.getElementById('login-form');
          form.elements.email.value = btn.getAttribute('data-use');
          form.elements.password.value = 'demo1234';
          U.$$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
          form.elements.password.focus();
          UI.toast('Demo account filled in', { type:'info', desc:'Press Sign in to continue.', duration:2600 });
        });
      });
    }

    if (auth.isAuthenticated()) { window.location.replace(GGL.url('app/dashboard.html')); return; }

    var form = document.getElementById('login-form');
    UI.handleSubmit(form, {
      email:[U.validators.required, U.validators.email],
      password:[U.validators.required, U.validators.min(6)]
    }, function (values) {
      var box = document.getElementById('login-alert');
      box.hidden = true; box.innerHTML = '';
      return auth.signIn(values.email, values.password);
    }, {
      reset:false, success:'Signed in', successDesc:'Taking you to your dashboard…',
      onDone: function () {
        var next = new URLSearchParams(window.location.search).get('next');
        var safe = next && /^[a-z0-9-]+\.html$/i.test(next) ? 'app/' + next : 'app/launchpad.html';
        setTimeout(function () { window.location.href = GGL.url(safe); }, 420);
      },
      onError: function (err) {
        var box = document.getElementById('login-alert');
        box.hidden = false;
        box.innerHTML = '<div class="alert alert-danger">' + GGL.icon('alert','ico') +
          '<div>' + U.esc(err.message) + '</div></div>';
      }
    });

    var create = document.querySelector('[data-create-account]');
    if (create) create.addEventListener('click', function (e) {
      e.preventDefault();
      var h = UI.modal({ title:'Create an account',
        subtitle:'Self-registration is not enabled in this prototype.', size:'sm',
        body:'<div class="alert alert-warning mb-4">' + GGL.icon('info','ico') + '<div class="text-sm">' +
          'Accounts are provisioned by a Super Admin. Use a demo account to explore the platform.</div></div>' +
          '<form id="signup-form" novalidate>' +
          '<div class="field"><label class="label" for="su-name">Full name <span class="req">*</span></label>' +
            '<input class="input" id="su-name" name="name" type="text"></div>' +
          '<div class="field"><label class="label" for="su-email">Work email <span class="req">*</span></label>' +
            '<input class="input" id="su-email" name="email" type="email"></div></form>',
        footer:'<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
          '<button type="submit" form="signup-form" class="btn btn-primary">Request access</button>' });
      h.overlay.querySelector('[data-cancel]').addEventListener('click', h.close);
      UI.handleSubmit(h.overlay.querySelector('#signup-form'),
        { name:[U.validators.required], email:[U.validators.required, U.validators.email] },
        function () { return U.delay(800); },
        { success:'Access requested', successDesc:'An administrator would review this.', onDone:h.close });
    });
    form.elements.email.focus();
  };

  /* ============================ FORGOT PASSWORD ========================== */
  P.forgot = function () {
    GGL.theme.init();
    var form = document.getElementById('reset-form');
    UI.handleSubmit(form, { email:[U.validators.required, U.validators.email] },
      function (values) {
        return S.auth.requestPasswordReset(values.email).then(function () { return values.email; });
      }, {
        reset:false,
        onDone: function (email) {
          document.getElementById('reset-stage').innerHTML =
            '<div class="state" style="padding:var(--sp-8) 0">' +
            '<div class="state-icon" style="background:var(--success-soft);color:var(--success)">' +
            GGL.icon('mail','ico') + '</div><h3>Check your inbox</h3>' +
            '<p>If an account exists for <strong>' + U.esc(email) + '</strong>, a reset link is on its way. ' +
            'The link expires in 30 minutes.</p>' +
            '<a class="btn btn-primary" href="' + GGL.url('login.html') + '">Back to sign in</a>' +
            '<p class="hint mt-4">Prototype note: no email was sent.</p></div>';
        }
      });
    form.elements.email.focus();
  };

  /* =============================== DASHBOARD ============================= */
  P.dashboard = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var isLearner = user.role === GGL.ROLES.END_USER;
    var isTrainer = user.role === GGL.ROLES.TRAINER;
    var isSuper = user.role === GGL.ROLES.SUPER_ADMIN;

    var body = GGL.shell.mount({
      active:'dashboard', title: isLearner ? (user.workspaceType === 'individual' ? 'My upskilling workspace' : 'My learning dashboard') : isTrainer ? 'Trainer workspace' : isSuper ? 'Platform command centre' : 'L&D operations',
      subtitle: isLearner ? (user.workspaceType === 'individual' ? 'Choose skills, build a personal pathway and track independent progress.' : 'Assigned learning, assessments, certificates and development progress.')
        : isTrainer ? 'Run assigned batches, attendance, assessments, learner progress and close-out.'
        : isSuper ? 'Govern access, configuration, audit, data controls and platform health.'
        : 'Plan programmes, manage trainers and learners, assign learning and report outcomes.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Dashboard' }],
      actions: isLearner
        ? '<a class="btn btn-secondary" href="' + GGL.url('app/calendar.html') + '">' +
            GGL.icon('calendar','ico') + '<span>My calendar</span></a>' +
          '<a class="btn btn-primary" href="' + GGL.url('app/learning.html') + '">' +
            GGL.icon('bookOpen','ico') + '<span>My learning</span></a>'
        : '<a class="btn btn-secondary" href="' + GGL.url('app/reports.html') + '">' +
            GGL.icon('barChart','ico') + '<span>Reports</span></a>' +
          '<a class="btn btn-primary" href="' + GGL.url('app/batches.html?create=1') + '">' +
            GGL.icon('plus','ico') + '<span>New batch</span></a>'
    });
    if (!body) return;

    if (!isLearner) {
      var roleOps = isTrainer
        ? '<div class="role-workspace"><div><span class="eyebrow">Trainer workflow</span><h2>Delivery priorities</h2><p>Manage assigned batches from trainee allocation through attendance, assessment, progress monitoring and closure.</p></div><div class="role-actions"><a class="action-tile" href="'+GGL.url('app/batches.html')+'">'+GGL.icon('layers','ico')+'<b>My batches</b><span>Assign trainees and close cohorts</span></a><a class="action-tile" href="'+GGL.url('app/attendance.html')+'">'+GGL.icon('userCheck','ico')+'<b>Attendance</b><span>Update each session</span></a><a class="action-tile" href="'+GGL.url('app/assessments.html')+'">'+GGL.icon('checkSquare','ico')+'<b>Assessments</b><span>Review attempts</span></a><a class="action-tile" href="'+GGL.url('app/reports.html')+'">'+GGL.icon('barChart','ico')+'<b>Progress reports</b><span>Monitor gaps</span></a></div></div>'
        : isSuper ? '<div class="role-workspace"><div><span class="eyebrow">Platform governance</span><h2>Govern the L&D ecosystem</h2><p>Provision access, define platform rules, monitor audit events and maintain data controls.</p></div><div class="role-actions"><a class="action-tile" href="'+GGL.url('app/users.html')+'">'+GGL.icon('users','ico')+'<b>Access control</b><span>Admins, trainers and trainees</span></a><a class="action-tile" href="'+GGL.url('app/platform.html')+'">'+GGL.icon('server','ico')+'<b>Platform settings</b><span>Rules and retention</span></a><a class="action-tile" href="'+GGL.url('app/audit.html')+'">'+GGL.icon('shield','ico')+'<b>Audit log</b><span>Review changes</span></a><a class="action-tile" href="'+GGL.url('app/reports.html')+'">'+GGL.icon('barChart','ico')+'<b>Executive reports</b><span>Platform outcomes</span></a></div></div>'
        : '<div class="role-workspace"><div><span class="eyebrow">L&D operations</span><h2>Plan, assign and measure learning</h2><p>Manage courses, batches, trainers, trainee assignments and operational reporting.</p></div><div class="role-actions"><a class="action-tile" href="'+GGL.url('app/courses.html')+'">'+GGL.icon('book','ico')+'<b>Courses</b><span>Publish and assign</span></a><a class="action-tile" href="'+GGL.url('app/batches.html')+'">'+GGL.icon('layers','ico')+'<b>Batches</b><span>Create cohorts</span></a><a class="action-tile" href="'+GGL.url('app/trainers.html')+'">'+GGL.icon('briefcase','ico')+'<b>Trainers</b><span>Allocate capacity</span></a><a class="action-tile" href="'+GGL.url('app/reports.html')+'">'+GGL.icon('trending','ico')+'<b>Reports</b><span>Measure outcomes</span></a></div></div>';
      body.innerHTML = roleOps +
        '<div class="grid grid-4 mb-6" id="d-stats">' + UI.skeletonCards(4) + '</div>' +
        '<div class="grid grid-4 mb-6" id="d-stats2">' + UI.skeletonCards(4) + '</div>' +
        '<div class="split-2-1 mb-6"><div id="d-main"></div><div id="d-side"></div></div>' +
        '<div class="split-1-1 mb-6"><div id="d-completion"></div><div id="d-dept"></div></div>' +
        '<div class="split-1-1 mb-6"><div id="d-assess"></div><div id="d-certs"></div></div>' +
        '<div class="split-2-1"><div id="d-activity"></div><div id="d-upcoming"></div></div>';

      UI.async(document.getElementById('d-stats'), UI.skeletonCards(4), function () {
        return S.reports.platformStats().then(function (st) {
          document.getElementById('d-stats').innerHTML =
            (isSuper ? stat('Total admins', U.num(st.admins + st.superAdmins), 'shield', '', 8)
                     : stat('Trainers', U.num(st.trainers), 'briefcase', '', 6)) +
            stat('Total learners', U.num(st.learners), 'users', 'teal', 12) +
            stat('Courses', U.num(st.courses), 'book', 'violet', 4) +
            stat('Active batches', U.num(st.activeBatches), 'layers', 'amber', -3);
          document.getElementById('d-stats2').innerHTML =
            stat('Training hours', U.num(st.trainingHours), 'clock', '', 9) +
            stat('Completion rate', st.completionRate + '%', 'checkCircle', 'green', 5) +
            stat('Effectiveness score', st.effectiveness, 'trending', 'violet', 3) +
            stat('Learner satisfaction', st.satisfaction + '%', 'star', 'amber', 2);
        });
      });
      UI.async(document.getElementById('d-main'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
        return S.reports.series(isSuper ? 'userGrowth' : 'trainingActivity').then(function (series) {
          document.getElementById('d-main').innerHTML = card(
            isSuper ? 'User growth' : 'Training activity',
            isSuper ? 'Platform accounts over the last 12 months' : 'Sessions delivered per month',
            C.line(series, { height:260, label:isSuper ? 'User growth' : 'Training activity' }),
            '<span class="badge badge-success">Trending up</span>');
        });
      });
      UI.async(document.getElementById('d-side'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
        return S.reports.series(isSuper ? 'userDistribution' : 'attendanceSplit').then(function (series) {
          document.getElementById('d-side').innerHTML = card(
            isSuper ? 'User distribution' : 'Attendance split',
            isSuper ? 'Accounts by role' : 'Across completed sessions',
            C.donut(series, { size:160, stroke:24,
              centreValue: isSuper ? U.num(U.sum(series,'value')) : '88%',
              centreLabel: isSuper ? 'accounts' : 'attended', label:'Distribution' }));
        });
      });
      UI.async(document.getElementById('d-completion'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
        return S.reports.series('completion').then(function (series) {
          document.getElementById('d-completion').innerHTML = card('Course completion',
            'Rolling completion rate by month',
            C.bar(series, { height:240, suffix:'%', color:'var(--viz-2)', label:'Course completion' }));
        });
      });
      UI.async(document.getElementById('d-dept'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
        return S.reports.series('deptCompletion').then(function (series) {
          document.getElementById('d-dept').innerHTML = card('Completion by department',
            'Where the gaps are concentrated',
            C.hbars(series.sort(function (a,b) { return b.value - a.value; }), { suffix:'%' }),
            '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/reports.html') + '">Reports</a>');
        });
      });
      UI.async(document.getElementById('d-assess'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
        return S.assessments.stats().then(function (st) {
          document.getElementById('d-assess').innerHTML = card('Assessment activity',
            U.num(st.attempts) + ' attempts across ' + st.published + ' published assessments',
            '<div class="row gap-6 wrap" style="justify-content:center">' +
              C.gauge(st.passRate, { size:140, caption:'Pass rate' }) +
              '<div class="grow" style="min-width:200px">' +
              C.hbars([{ label:'Average score', value:st.avgScore },
                { label:'Pass rate', value:st.passRate }], { suffix:'%' }) + '</div></div>',
            '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/assessments.html') + '">Assessments</a>');
        });
      });
      UI.async(document.getElementById('d-certs'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
        return S.certificates.stats().then(function (st) {
          document.getElementById('d-certs').innerHTML = card('Certification',
            'Issued against passed post-assessments',
            '<div class="grid grid-2 gap-3 mb-4">' +
              [['Valid',st.issued],['This month',st.thisMonth],['Holders',st.holders],['Expired',st.expired]]
                .map(function (x) { return mini(x[0], U.num(x[1])); }).join('') + '</div>' +
            C.donut([{ label:'Valid', value:st.issued, color:'var(--viz-5)' },
              { label:'Expired', value:st.expired, color:'var(--viz-3)' },
              { label:'Revoked', value:st.revoked, color:'var(--viz-6)' }],
              { size:140, stroke:22, label:'Certificate status' }),
            '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/certificates.html') + '">Register</a>');
        });
      });
      UI.async(document.getElementById('d-activity'), '<div class="card card-pad"><div class="skel skel-row"></div></div>', function () {
        return S.reports.activity(7).then(function (rows) {
          document.getElementById('d-activity').innerHTML = card('Recent activity', 'Across the platform',
            rows.length ? '<ul class="timeline">' + rows.map(function (a) {
              return '<li><span class="dot">' + GGL.icon(a.icon,'ico') + '</span>' +
                '<span class="body"><strong>' + U.esc(a.actor) + '</strong> ' + U.esc(a.text) + ' ' +
                '<strong>' + U.esc(a.subject) + '</strong>' +
                '<span class="time">' + U.relative(a.at) + '</span></span></li>';
            }).join('') + '</ul>' : UI.empty({ icon:'activity', title:'No recent activity' }));
        });
      });
      UI.async(document.getElementById('d-upcoming'), '<div class="card card-pad"><div class="skel skel-row"></div></div>', function () {
        return S.learning.upcoming(4).then(function (rows) {
          document.getElementById('d-upcoming').innerHTML = card('Upcoming sessions', 'Next four scheduled',
            sessionList(rows, 'No sessions are scheduled in the current window.'),
            '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/calendar.html') + '">Calendar</a>');
        });
      });
      return;
    }

    /* ---- learner dashboard ---- */
    body.innerHTML = '<div id="d-welcome"></div>' +
      '<div class="grid grid-4 mb-6" id="d-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-2-1 mb-6"><div id="d-continue"></div><div id="d-upcoming"></div></div>' +
      '<div class="split-1-1 mb-6"><div id="d-comp"></div><div id="d-game"></div></div>' +
      '<div id="d-news"></div>';

    UI.async(document.getElementById('d-stats'), UI.skeletonCards(4), function () {
      return S.learning.progress().then(function (p) {
        document.getElementById('d-welcome').innerHTML =
          '<div class="welcome"><h2>' + U.greeting() + ', ' + U.esc(user.name.split(' ')[0]) + '</h2>' +
          '<p>You are ' + p.overall + '% through your assigned learning. ' +
          (p.inProgress ? p.inProgress + ' course' + (p.inProgress > 1 ? 's are' : ' is') + ' in progress.'
            : 'Nothing is in progress right now.') + '</p><div class="welcome-meta">' +
            '<span class="item"><span class="v">' + p.completed + '/' + p.assigned + '</span><span class="k">Courses completed</span></span>' +
            '<span class="item"><span class="v">' + p.hours + 'h</span><span class="k">Learning hours</span></span>' +
            '<span class="item"><span class="v">' + p.certificates + '</span><span class="k">Certificates</span></span>' +
            '<span class="item"><span class="v">#' + p.rank + '</span><span class="k">Leaderboard rank</span></span>' +
          '</div></div>';
        document.getElementById('d-stats').innerHTML =
          stat('Overall progress', p.overall + '%', 'activity', '') +
          stat('In progress', p.inProgress, 'bookOpen', 'teal') +
          stat('Completed', p.completed, 'checkCircle', 'green') +
          stat('Points earned', U.num(p.points), 'trophy', 'amber');
      });
    });

    function courseTile(c, i) {
      var variant = ['','v2','v3','v4'][i % 4];
      return '<article class="card course-card"><div class="course-thumb ' + variant + '">' +
        '<span class="cat">' + U.esc(c.category) + '</span>' + GGL.icon('bookOpen','ico') + '</div>' +
        '<div class="course-body"><h3>' + U.esc(c.title) + '</h3><div class="course-meta">' +
        '<span>' + GGL.icon('user','ico') + U.esc(c.instructor.split(' ')[0]) + '</span>' +
        '<span>' + GGL.icon('clock','ico') + U.duration(c.durationMins) + '</span>' +
        '<span>' + GGL.icon('layers','ico') + c.lessonsDone + '/' + c.lessons + '</span></div>' +
        '<div class="course-foot">' + U.progressCell(c.progress) +
        '<button type="button" class="btn btn-primary btn-sm btn-block mt-3" data-continue="' + c.id + '">' +
        GGL.icon('play','ico') + '<span>Continue</span></button></div></div></article>';
    }

    var contEl = document.getElementById('d-continue');
    var reloadCont = UI.async(contEl, '<div class="card card-pad"><div class="skel skel-row"></div></div>', function () {
      return S.learning.continueLearning().then(function (rows) {
        contEl.innerHTML = card('Continue learning', 'Pick up where you left off',
          rows.length ? '<div class="grid grid-2">' + rows.slice(0,4).map(courseTile).join('') + '</div>'
            : UI.empty({ icon:'bookOpen', title:'Nothing in progress',
                message:'Start one of your assigned courses to see it here.', action:'Browse my learning' }),
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/learning.html') + '">View all</a>');
        var browse = contEl.querySelector('[data-empty-action]');
        if (browse) browse.addEventListener('click', function () {
          window.location.href = GGL.url('app/learning.html');
        });
        U.$$('[data-continue]', contEl).forEach(function (btn) {
          btn.addEventListener('click', function () {
            btn.classList.add('is-loading');
            S.learning.advance(btn.getAttribute('data-continue'), 12).then(function (res) {
              UI.toast(res.progress === 100 ? 'Course completed' : 'Progress saved', { type:'success',
                desc: res.progress === 100 ? 'Your certificate is now available.' : 'Now at ' + res.progress + '%.' });
              reloadCont();
            });
          });
        });
      });
    });

    UI.async(document.getElementById('d-upcoming'), '<div class="card card-pad"><div class="skel skel-row"></div></div>', function () {
      return S.learning.upcoming(4).then(function (rows) {
        document.getElementById('d-upcoming').innerHTML = card('Upcoming training',
          'Sessions you are booked onto', sessionList(rows, 'You have no upcoming sessions.'),
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/calendar.html') + '">Calendar</a>');
      });
    });
    UI.async(document.getElementById('d-comp'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.competency.profileFor(user.id).then(function (rows) {
        document.getElementById('d-comp').innerHTML = card('Competency profile', 'Current level vs required',
          rows.length ? '<ul class="hbars">' + rows.slice(0,8).map(function (c) {
            var pct = (c.current / c.required) * 100;
            var tone = c.gap === 0 ? 'var(--viz-5)' : c.gap === 1 ? 'var(--viz-3)' : 'var(--viz-6)';
            return '<li><span class="hb-label truncate">' + U.esc(c.competency) + '</span>' +
              '<span class="hb-track"><span class="hb-fill" style="width:' + Math.min(100,pct) +
              '%;background:' + tone + '"></span></span>' +
              '<span class="hb-value">' + c.current + '/' + c.required + '</span></li>';
          }).join('') + '</ul><p class="hint mt-4">Bars show your current level against the level ' +
            'required for your role.</p>'
            : UI.empty({ icon:'target', title:'No assessment yet',
                message:'Your manager will assess your competencies as part of the review cycle.' }),
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/competencies.html') + '">Detail</a>');
      });
    });
    UI.async(document.getElementById('d-game'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return Promise.all([S.gamification.badgesFor(user.id), S.gamification.standing(user.id)])
        .then(function (res) {
          var badges = res[0], p = res[1];
          document.getElementById('d-game').innerHTML = card('Achievements',
            'Earned through assessments and certificates',
            '<div class="row gap-4 mb-5 wrap">' +
            '<span class="stat-icon amber" style="width:48px;height:48px">' + GGL.icon('trophy','ico') + '</span>' +
            '<div class="grow"><div class="fw-semi">Learning Champion</div>' +
            '<div class="text-sm text-muted">' + U.num(p.points) + ' points · Rank #' + p.rank + ' of ' + p.total + '</div></div>' +
            '<span class="badge badge-accent">' + badges.filter(function (b) { return b.earned; }).length +
              '/' + badges.length + ' badges</span></div>' +
            '<div class="badge-grid">' + badges.map(function (b) {
              return '<div class="badge-tile' + (b.earned ? '' : ' locked') + '">' +
                '<span class="ring">' + GGL.icon(b.earned ? b.icon : 'lock','ico') + '</span>' +
                '<div class="nm">' + U.esc(b.name) + '</div>' +
                '<div class="ds">' + U.esc(b.desc) + '</div></div>';
            }).join('') + '</div>',
            '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/gamification.html') + '">Leaderboard</a>');
        });
    });
    UI.async(document.getElementById('d-news'), '<div class="card card-pad"><div class="skel skel-row"></div></div>', function () {
      return Promise.all([S.assessments.availableFor(user.id), S.certificates.forUser(user.id)])
        .then(function (res) {
          var open = res[0].filter(function (a) { return !a.taken; });
          var certs = res[1].filter(function (c) { return c.status === 'Issued'; });
          document.getElementById('d-news').innerHTML = '<div class="split-1-1">' +
            card('Assessments waiting for you',
              open.length ? open.length + ' available to take' : 'Nothing outstanding',
              open.length ? '<ul class="session-list">' + open.slice(0,3).map(function (a) {
                return '<li><span class="session-date" style="width:44px">' +
                  '<span class="d" style="font-size:var(--fs-base)">' + a.questions.length + '</span></span>' +
                  '<span class="session-info"><h4 class="truncate">' + U.esc(a.title) + '</h4>' +
                  '<span class="meta"><span>' + GGL.icon('target','ico') +
                  (a.passMark > 0 ? a.passMark + '% to pass' : 'Not graded') + '</span></span></span>' +
                  '<a class="btn btn-sm btn-primary" href="' + GGL.url('app/assessments.html') + '">Start</a></li>';
              }).join('') + '</ul>'
                : UI.empty({ icon:'checkCircle', title:'All caught up',
                    message:'You have attempted every assessment available to you.' }),
              '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/assessments.html') + '">View all</a>') +
            card('My certificates', certs.length ? certs.length + ' currently valid' : 'None yet',
              certs.length ? '<ul class="session-list">' + certs.slice(0,3).map(function (c) {
                return '<li><span class="session-date" style="width:44px"><span class="m">CERT</span>' +
                  '<span class="d" style="font-size:var(--fs-sm)">' + c.score + '</span></span>' +
                  '<span class="session-info"><h4 class="truncate">' + U.esc(c.course) + '</h4>' +
                  '<span class="meta"><span>' + GGL.icon('file','ico') + U.esc(c.serial) + '</span></span></span></li>';
              }).join('') + '</ul>'
                : UI.empty({ icon:'award', title:'No certificates yet',
                    message:'Pass a course post-assessment to earn your first.' }),
              '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/certificates.html') + '">View all</a>') +
            '</div>';
        });
    });
  };

  /* ================================= USERS =============================== */
  P.users = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var table = null, currentRole = GGL.ROLES.END_USER;
    var DEPTS = GGL.seed.DEPTS, LOCS = GGL.seed.LOCATIONS;
    var COLUMNS = [
      { key:'name', label:'Name' }, { key:'email', label:'Email' },
      { key:'employeeId', label:'Employee ID' }, { key:'title', label:'Role title' },
      { key:'department', label:'Department' }, { key:'location', label:'Location' },
      { key:'status', label:'Status' },
      { label:'Training status', value:function (r) { return r.trainingStatus || '—'; } },
      { label:'Progress %', value:function (r) { return r.progress === undefined ? '' : r.progress; } },
      { label:'Created', value:function (r) { return U.date(r.createdAt); } }];

    if ([GGL.ROLES.END_USER, GGL.ROLES.TRAINER].indexOf(user.role) !== -1) {
      var b0 = GGL.shell.mount({ active:'users', title:'User management',
        breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Users' }] });
      if (b0) b0.innerHTML = denied('User management is available to administrators.');
      return;
    }

    /** Which account types the signed-in user may create. */
    function creatableRoles() {
      return user.role === GGL.ROLES.SUPER_ADMIN
        ? [GGL.ROLES.END_USER, GGL.ROLES.TRAINER, GGL.ROLES.ADMIN, GGL.ROLES.SUPER_ADMIN]
        : [GGL.ROLES.END_USER, GGL.ROLES.TRAINER];
    }

    function formHtml(u, role, allowRoleChange) {
      u = u || {};
      var isLearner = role === GGL.ROLES.END_USER;
      var choices = creatableRoles();
      function opts(list, sel) {
        return list.map(function (o) {
          return '<option' + (o === sel ? ' selected' : '') + '>' + U.esc(o) + '</option>';
        }).join('');
      }
      var rolePicker = allowRoleChange && choices.length > 1
        ? '<div class="field"><label class="label" for="uf-role">Account type <span class="req">*</span></label>' +
          '<select class="select" id="uf-role" name="role">' + choices.map(function (r) {
            return '<option value="' + r + '"' + (r === role ? ' selected' : '') + '>' +
              U.esc(GGL.roleLabel(r)) + '</option>';
          }).join('') + '</select>' +
          '<span class="hint">Super Admins have platform-level access including user and platform settings.</span></div>'
        : '';
      return '<form id="user-form" novalidate>' + rolePicker +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="uf-name">Full name <span class="req">*</span></label>' +
            '<input class="input" id="uf-name" name="name" value="' + U.esc(u.name || '') + '"></div>' +
          '<div class="field"><label class="label" for="uf-email">Email <span class="req">*</span></label>' +
            '<input class="input" id="uf-email" name="email" type="email" value="' + U.esc(u.email || '') + '"></div></div>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="uf-empid">Employee ID <span class="req">*</span></label>' +
            '<input class="input" id="uf-empid" name="employeeId" value="' + U.esc(u.employeeId || '') + '" placeholder="IMS-0000"></div>' +
          '<div class="field"><label class="label" for="uf-title">Role title</label>' +
            '<input class="input" id="uf-title" name="title" value="' + U.esc(u.title || '') + '"></div></div>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="uf-dept">Department</label>' +
            '<select class="select" id="uf-dept" name="department">' + opts(DEPTS, u.department) + '</select></div>' +
          '<div class="field"><label class="label" for="uf-loc">Location</label>' +
            '<select class="select" id="uf-loc" name="location">' + opts(LOCS, u.location) + '</select></div></div>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="uf-status">Status</label>' +
            '<select class="select" id="uf-status" name="status">' +
            opts(['Active','Inactive','Suspended'], u.status) + '</select></div>' +
          '<div class="field" data-learner-only' + (isLearner ? '' : ' hidden') + '>' +
            '<label class="label" for="uf-courses">Assigned courses</label>' +
            '<input class="input" id="uf-courses" name="assignedCourses" type="number" min="0" max="50" value="' +
            (u.assignedCourses || 0) + '"></div>' +
          '<div class="field" data-staff-only' + (isLearner ? ' hidden' : '') + '>' +
            '<label class="label" for="uf-phone">Phone</label>' +
            '<input class="input" id="uf-phone" name="phone" type="tel" value="' + U.esc(u.phone || '') + '"></div></div>' +
        '<div class="alert mt-2">' + GGL.icon('info','ico') + '<div class="text-sm">' +
        'This writes to the prototype\u2019s mock store. No account is created and no email is sent.' +
        '</div></div></form>';
    }

    var RULES = { name:[U.validators.required, U.validators.min(2)],
      email:[U.validators.required, U.validators.email], employeeId:[U.validators.required] };

    function openCreate(role) {
      var allowed = creatableRoles();
      if (allowed.indexOf(role) === -1) role = allowed[0];
      var h = UI.modal({ title:'Create account',
        subtitle:'Choose the account type and fill in the details.', size:'lg',
        body: formHtml(null, role, true),
        footer:'<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
          '<button type="submit" form="user-form" class="btn btn-primary">' +
          GGL.icon('plus','ico') + '<span>Create account</span></button>' });
      h.overlay.querySelector('[data-cancel]').addEventListener('click', h.close);
      var form = h.overlay.querySelector('#user-form');
      var picker = form.querySelector('[name="role"]');
      function sync() {
        var chosen = picker ? picker.value : role;
        var learner = chosen === GGL.ROLES.END_USER;
        U.$$('[data-learner-only]', form).forEach(function (n) { n.hidden = !learner; });
        U.$$('[data-staff-only]', form).forEach(function (n) { n.hidden = learner; });
        var heading = h.overlay.querySelector('.modal-head h2');
        if (heading) heading.textContent = 'Create ' + GGL.roleLabel(chosen).toLowerCase();
      }
      if (picker) picker.addEventListener('change', sync);
      sync();
      UI.handleSubmit(form, RULES, function (v) {
        var chosen = v.role || role, learner = chosen === GGL.ROLES.END_USER;
        if (creatableRoles().indexOf(chosen) === -1) {
          throw new Error('You do not have permission to create that account type.');
        }
        return S.users.create(Object.assign({}, v, { role:chosen, lastLogin:null,
          progress: learner ? 0 : undefined, completedCourses: learner ? 0 : undefined,
          trainingStatus: learner ? 'Not Started' : undefined,
          assignedCourses: learner ? (Number(v.assignedCourses) || 0) : undefined }));
      }, { success:'Account created', successDesc:'The account is now listed under its role tab.',
        onDone: function (created) {
          h.close();
          var tab = document.querySelector('[data-role="' + created.role + '"]');
          if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
          else table.reload();
        } });
    }

    function openEdit(row) {
      var h = UI.modal({ title:'Edit ' + row.name, subtitle:row.email, size:'lg',
        body: formHtml(row, row.role, false),
        footer:'<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
          '<button type="submit" form="user-form" class="btn btn-primary">Save changes</button>' });
      h.overlay.querySelector('[data-cancel]').addEventListener('click', h.close);
      UI.handleSubmit(h.overlay.querySelector('#user-form'), RULES, function (v) {
        if (v.assignedCourses !== undefined) v.assignedCourses = Number(v.assignedCourses);
        return S.users.update(row.id, v);
      }, { reset:false, success:'Changes saved', onDone:function () { h.close(); table.reload(); } });
    }

    function openView(row) {
      var isLearner = row.role === GGL.ROLES.END_USER;
      UI.modal({ title:row.name, subtitle:GGL.roleLabel(row.role) + ' · ' + row.email, size:'lg',
        body:'<div class="row gap-4 mb-6">' +
          '<span class="avatar avatar-xl">' + U.esc(U.initials(row.name)) + '</span>' +
          '<div class="grow"><h3 style="margin-bottom:4px">' + U.esc(row.title || '—') + '</h3>' +
          '<p class="text-muted text-sm" style="margin:0">' + U.esc(row.department || '—') + ' · ' +
          U.esc(row.location || '—') + '</p><div class="row gap-2 mt-3">' + U.statusBadge(row.status) +
          (isLearner ? U.statusBadge(row.trainingStatus) : '') + '</div></div></div>' +
          (isLearner ? '<div class="grid grid-4 gap-3 mb-6">' +
            mini('Assigned', row.assignedCourses) + mini('Completed', row.completedCourses) +
            mini('Hours', row.learningHours) + mini('Certificates', row.certificates) + '</div>' +
            '<div class="mb-6">' + U.progressCell(row.progress) + '</div>' : '') +
          kv([['Employee ID', row.employeeId || '—'], ['Email', row.email],
            ['Phone', row.phone || '—'], ['Created', U.date(row.createdAt, 'long')],
            ['Last login', row.lastLogin ? U.date(row.lastLogin,'long') + ', ' + U.time(row.lastLogin) : 'Never']]),
        footer:'<button type="button" class="btn btn-secondary" data-close>Close</button>' +
          '<button type="button" class="btn btn-primary" data-edit>Edit account</button>',
        onMount:function (h) {
          h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
          h.overlay.querySelector('[data-edit]').addEventListener('click', function () {
            h.close(); setTimeout(function () { openEdit(row); }, 240);
          });
        } });
    }

    function columnsFor(role) {
      var base = [{ key:'name', label:'Name', sortable:true, primary:true,
        render:function (r) { return U.userCell(r.name, r.email); } }];
      if (role === GGL.ROLES.END_USER) {
        return base.concat([
          { key:'employeeId', label:'Employee ID', sortable:true, hideBelow:'md' },
          { key:'department', label:'Department', sortable:true, hideBelow:'lg' },
          { key:'trainingStatus', label:'Training', sortable:true, hideBelow:'md',
            render:function (r) { return U.statusBadge(r.trainingStatus); } },
          { key:'progress', label:'Progress', sortable:true, width:'150px',
            render:function (r) { return U.progressCell(r.progress); } },
          { key:'status', label:'Status', sortable:true,
            render:function (r) { return U.statusBadge(r.status); } }]);
      }
      return base.concat([
        { key:'title', label:'Role title', sortable:true, hideBelow:'md' },
        { key:'department', label:'Department', sortable:true, hideBelow:'lg' },
        { key:'location', label:'Location', sortable:true, hideBelow:'lg' },
        { key:'lastLogin', label:'Last login', sortable:true,
          render:function (r) { return '<span class="text-muted">' + U.relative(r.lastLogin) + '</span>'; } },
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); } }]);
    }

    function buildTable(container, role) {
      /* Only a Super Admin may manage administrative accounts. */
      var canManage = role === GGL.ROLES.END_USER || user.role === GGL.ROLES.SUPER_ADMIN;
      table = GGL.DataTable(container, {
        columns: columnsFor(role),
        searchPlaceholder:'Search by name, email, ID or department…',
        pageSize:10, defaultSort:'name', selectable:true,
        filters:[
          { key:'status', label:'Status', options:['Active','Inactive','Suspended'].map(function (s) {
            return { value:s, label:s }; })},
          { key:'department', label:'Department', options:DEPTS.map(function (d) {
            return { value:d, label:d }; })}],
        bulkActions:[
          { label:'Deactivate', icon:'lock', onClick:function (ids, api) {
            UI.confirm({ title:'Deactivate ' + ids.length + ' account' + (ids.length > 1 ? 's' : '') + '?',
              message:'Deactivated users cannot sign in until reactivated.',
              confirmLabel:'Deactivate', tone:'warning',
              onConfirm:function () {
                return Promise.all(ids.map(function (id) {
                  return S.users.update(id, { status:'Inactive' });
                })).then(function () {
                  UI.toast(ids.length + ' account(s) deactivated', { type:'success' });
                  api.clearSelection(); api.reload();
                });
              }});
          }},
          { label:'Export selected', icon:'download', onClick:function (ids, api) {
            var rows = api.selection;
            U.downloadCsv('users-' + U.stamp() + '.csv', COLUMNS, rows);
            UI.toast('Export downloaded', { type:'success', desc:rows.length + ' users written to CSV.' });
          }}],
        fetch:function (q) { return S.users.listByRole(role, q); },
        onRowClick: openView,
        rowActions:function (row) {
          var actions = [{ label:'View profile', icon:'eye', onClick:openView }];
          if (canManage) {
            actions.push({ label:'Edit account', icon:'edit', onClick:openEdit });
            actions.push({ label: row.status === 'Active' ? 'Deactivate' : 'Activate',
              icon: row.status === 'Active' ? 'lock' : 'checkCircle',
              onClick:function (r) {
                var next = r.status === 'Active' ? 'Inactive' : 'Active';
                S.users.update(r.id, { status:next }).then(function () {
                  UI.toast('Account ' + next.toLowerCase(), { type:'success' });
                  table.reload();
                });
              }});
            actions.push({ label:'Delete account', icon:'trash', tone:'danger', onClick:function (r) {
              if (r.id === user.id) { UI.toast('You cannot delete your own account', { type:'warning' }); return; }
              UI.confirm({ title:'Delete this account?',
                message:'This will permanently remove ' + r.name + ' (' + r.email + ') from the platform.',
                detail: r.role !== GGL.ROLES.END_USER
                  ? 'This is an administrative account. Any batches or courses they own will need reassigning.' : null,
                confirmLabel:'Delete account',
                onConfirm:function () {
                  return S.users.remove(r.id).then(function () {
                    UI.toast('Account deleted', { type:'success' }); table.reload();
                  });
                }});
            }});
          }
          return actions;
        },
        empty:{ icon:'users', title:'No accounts yet',
          message:'Create the first ' + GGL.roleLabel(role).toLowerCase() + ' account to get started.',
          action:'Create account', onAction:function () { openCreate(role); } }
      });
    }

    var isSuper = user.role === GGL.ROLES.SUPER_ADMIN;
    var body = GGL.shell.mount({ active:'users', title:'User management',
      subtitle:'Create, edit and manage the accounts on your platform.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Users' }],
      actions:'<button type="button" class="btn btn-secondary" data-export-all>' +
        GGL.icon('download','ico') + '<span>Export</span></button>' +
        '<button type="button" class="btn btn-primary" data-create>' +
        GGL.icon('userPlus','ico') + '<span>Create user</span></button>' });
    if (!body) return;

    var tabs = [{ role:GGL.ROLES.END_USER, label:'Learners' }, { role:GGL.ROLES.ADMIN, label:'Admins' }];
    if (isSuper) tabs.push({ role:GGL.ROLES.SUPER_ADMIN, label:'Super Admins' });

    body.innerHTML = '<div class="grid grid-4 mb-6" id="u-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="tabs mb-5" role="tablist" aria-label="User types">' +
        tabs.map(function (t, i) {
          return '<button type="button" class="tab" role="tab" id="tab-' + t.role + '" ' +
            'aria-controls="panel-users" aria-selected="' + (i === 0) + '" data-role="' + t.role + '">' +
            U.esc(t.label) + '</button>';
        }).join('') + '</div>' +
      '<div id="panel-users" role="tabpanel" aria-labelledby="tab-' + tabs[0].role + '"></div>';

    UI.async(document.getElementById('u-stats'), UI.skeletonCards(4), function () {
      return S.users.stats().then(function (st) {
        document.getElementById('u-stats').innerHTML =
          stat('Total accounts', U.num(st.total), 'users', '') +
          stat('Learners', U.num(st.learners), 'graduation', 'teal') +
          stat('Admins', U.num(st.admins), 'sliders', 'violet') +
          stat('Active', U.num(st.active), 'checkCircle', 'green');
      });
    });

    var panel = document.getElementById('panel-users');
    var tabButtons = U.$$('[data-role]', body);
    function selectTab(btn) {
      tabButtons.forEach(function (b) {
        b.setAttribute('aria-selected', String(b === btn));
        b.tabIndex = b === btn ? 0 : -1;
      });
      currentRole = btn.getAttribute('data-role');
      buildTable(panel, currentRole);
    }
    tabButtons.forEach(function (btn) { btn.addEventListener('click', function () { selectTab(btn); }); });
    selectTab(tabButtons[0]);

    document.querySelector('[data-create]').addEventListener('click', function () { openCreate(currentRole); });
    document.querySelector('[data-export-all]').addEventListener('click', function () {
      S.users.listByRole(currentRole, { size:9999 }).then(function (res) {
        U.downloadCsv(GGL.roleLabel(currentRole).toLowerCase().replace(/\s+/g,'-') +
          's-' + U.stamp() + '.csv', COLUMNS, res.all);
        UI.toast('Export downloaded', { type:'success', desc:res.all.length + ' records written to CSV.' });
      });
    });
  };

  /* ====================== TRAINER OBSERVATION FORM (TOF) ================= */
  P.observation = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var table = null;

    if (user.role === GGL.ROLES.END_USER && user.workspaceType !== 'individual') {
      var b0 = GGL.shell.mount({ active:'observation', title:'Trainer observation',
        breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Observation' }] });
      if (b0) b0.innerHTML = denied('Trainer observation is available to administrators and evaluators.');
      return;
    }

    function tone(score) { return score >= 85 ? 'success' : score >= 70 ? 'info' : 'warning'; }

    function openForm(prefillTrainerId) {
      var inst = S.tof.instrument();
      var ratings = {}, comments = {};
      var h = UI.modal({
        title:'Trainer Observation Form',
        subtitle:'Learning & Development — ' + inst.sections.length + ' sections, ' +
          inst.sections.reduce(function (a, s) { return a + s.criteria.length; }, 0) + ' criteria',
        size:'xl', dismissible:false,
        body:'<div id="tof-wrap"></div>',
        footer:'<button type="button" class="btn btn-ghost" data-cancel>Cancel</button>' +
          '<div class="grow"></div><div class="tof-live" data-live></div>' +
          '<button type="button" class="btn btn-primary" data-submit>' +
          GGL.icon('check','ico') + '<span>Submit observation</span></button>'
      });

      var wrap = h.overlay.querySelector('#tof-wrap');
      wrap.innerHTML = '<form id="tof-form" novalidate>' +
        '<div class="card card-pad mb-5"><div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="tf-trainer">Trainer name <span class="req">*</span></label>' +
            '<select class="select" id="tf-trainer" name="trainerId"><option value="">Select a trainer…</option>' +
            GGL.data.trainers.map(function (t) {
              return '<option value="' + U.esc(t.id) + '"' +
                (t.id === prefillTrainerId ? ' selected' : '') + '>' + U.esc(t.name) + '</option>';
            }).join('') + '</select></div>' +
          '<div class="field"><label class="label" for="tf-eval">Name of the evaluator <span class="req">*</span></label>' +
            '<input class="input" id="tf-eval" name="evaluator" value="' + U.esc(user.name) + '"></div></div>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="tf-date">Observation date <span class="req">*</span></label>' +
            '<input class="input" id="tf-date" name="observationDate" type="date" value="' +
            new Date().toISOString().slice(0,10) + '"></div>' +
          '<div class="field"><label class="label" for="tf-time">Observation time</label>' +
            '<input class="input" id="tf-time" name="observationTime" type="time" value="10:00"></div></div>' +
        '<div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="tf-topic">Class name / topic <span class="req">*</span></label>' +
            '<input class="input" id="tf-topic" name="topic" list="tf-topics" placeholder="Session topic">' +
            '<datalist id="tf-topics">' + GGL.data.courses.slice(0,16).map(function (c) {
              return '<option value="' + U.esc(c.title) + '">';
            }).join('') + '</datalist></div>' +
          '<div class="field"><label class="label" for="tf-dur">Course duration (minutes)</label>' +
            '<input class="input" id="tf-dur" name="durationMins" type="number" min="15" max="600" value="120"></div>' +
        '</div></div>' +
        '<div class="card card-pad mb-5" style="background:var(--bg-sunken)">' +
          '<strong class="text-sm">Rating scale</strong><div class="row gap-4 mt-3 wrap">' +
          inst.scale.map(function (s) {
            return '<span class="text-xs"><strong>' + s.value + '</strong> · ' + U.esc(s.label) +
              ' <span class="text-subtle">— ' + U.esc(s.desc) + '</span></span>';
          }).join('') + '</div>' +
          '<p class="hint" style="margin-top:var(--sp-3)">Leave a criterion blank if it was not ' +
          'observable. Blank criteria are excluded from the section average rather than scored as zero.</p></div>' +
        '<div class="tof-strip mb-5" data-strip></div>' +
        inst.sections.map(function (sec) {
          return '<section class="card mb-4" data-section="' + sec.id + '">' +
            '<div class="card-head"><div><h3>' + sec.no + '. ' + U.esc(sec.title) + '</h3>' +
            '<p class="sub">' + sec.criteria.length + ' criteria</p></div>' +
            '<span class="badge badge-plain" data-sec-score="' + sec.id + '">—</span></div>' +
            '<div class="card-body" style="padding-top:var(--sp-2)">' +
            sec.criteria.map(function (c) {
              return '<div class="tof-row" data-criterion="' + c.id + '">' +
                '<div class="tof-label">' + U.esc(c.text) + '</div>' +
                '<div class="tof-controls"><div class="rating" role="group" aria-label="' + U.esc(c.text) + '">' +
                inst.scale.map(function (s) {
                  var id = 'r-' + c.id + '-' + s.value;
                  return '<input type="radio" id="' + id + '" name="rate_' + c.id + '" value="' + s.value + '">' +
                    '<label for="' + id + '" title="' + U.esc(s.label) + '">' + s.value + '</label>';
                }).join('') +
                '<button type="button" class="tof-clear" data-clear="' + c.id + '" ' +
                'title="Clear this rating" aria-label="Clear rating">' + GGL.icon('close','ico') + '</button>' +
                '</div><input class="input tof-comment" data-comment="' + c.id + '" placeholder="Comments" ' +
                'aria-label="Comments for ' + U.esc(c.text) + '"></div></div>';
            }).join('') + '</div></section>';
        }).join('') +
        '<div class="card card-pad"><div class="field" style="margin:0">' +
          '<label class="label" for="tf-rec">Recommendations <span class="req">*</span></label>' +
          '<textarea class="textarea" id="tf-rec" name="recommendations" ' +
          'placeholder="Strengths observed and specific development actions for this trainer."></textarea>' +
        '</div></div></form>';

      var form = wrap.querySelector('#tof-form');
      var strip = wrap.querySelector('[data-strip]');
      var live = h.overlay.querySelector('[data-live]');

      function recalc() {
        var scored = S.tof.score(ratings);
        strip.innerHTML = scored.sections.map(function (s) {
          var done = s.answered === s.total;
          return '<div class="tof-chip' + (s.answered ? ' active' : '') + '">' +
            '<span class="n">' + s.no + '</span><span class="t">' + U.esc(s.title) + '</span>' +
            '<span class="v">' + (s.answered ? s.score.toFixed(1) + '%' : '—') + '</span>' +
            '<span class="c">' + s.answered + '/' + s.total + (done ? ' ✓' : '') + '</span></div>';
        }).join('') +
        '<div class="tof-chip overall"><span class="t">Overall Score</span>' +
          '<span class="v">' + scored.overall.toFixed(1) + '%</span>' +
          '<span class="c">' + scored.answered + '/' + scored.total + ' rated</span></div>';

        scored.sections.forEach(function (s) {
          var badge = form.querySelector('[data-sec-score="' + s.id + '"]');
          if (!badge) return;
          badge.textContent = s.answered ? s.score.toFixed(1) + '%' : '—';
          badge.className = 'badge ' + (s.answered ? 'badge-' + tone(s.score) : 'badge-plain');
        });
        live.innerHTML = '<span class="lbl">Overall</span>' +
          '<strong class="val" style="color:var(--' +
          (scored.overall >= 85 ? 'success' : scored.overall >= 70 ? 'accent' : 'warning') + ')">' +
          scored.overall.toFixed(1) + '%</strong>' +
          '<span class="sub">' + scored.answered + '/' + scored.total + '</span>';
      }

      form.addEventListener('change', function (e) {
        var m = e.target.name && e.target.name.match(/^rate_(.+)$/);
        if (m) { ratings[m[1]] = Number(e.target.value); recalc(); }
      });
      U.on(form, 'click', '[data-clear]', function (e, btn) {
        var id = btn.getAttribute('data-clear');
        delete ratings[id];
        U.$$('[name="rate_' + id + '"]', form).forEach(function (i) { i.checked = false; });
        recalc();
      });
      U.on(form, 'input', '[data-comment]', function (e, input) {
        comments[input.getAttribute('data-comment')] = input.value;
      });

      h.overlay.querySelector('[data-cancel]').addEventListener('click', function () {
        if (!Object.keys(ratings).length) { h.close(); return; }
        UI.confirm({ title:'Discard this observation?',
          message:'You have rated ' + Object.keys(ratings).length + ' criteria. Nothing will be saved.',
          confirmLabel:'Discard', tone:'warning', onConfirm:function () { h.close(); } });
      });

      h.overlay.querySelector('[data-submit]').addEventListener('click', function () {
        var btn = this;
        var result = U.validateForm(form, {
          trainerId:[U.validators.required], evaluator:[U.validators.required],
          observationDate:[U.validators.required], topic:[U.validators.required],
          recommendations:[U.validators.required, U.validators.min(15)] });
        if (!result.valid) {
          wrap.scrollTop = 0;
          UI.toast('Complete the header and recommendations', { type:'warning' });
          return;
        }
        var scored = S.tof.score(ratings);
        if (scored.answered < scored.total * 0.6) {
          UI.toast('Rate more criteria before submitting', { type:'warning',
            desc:'At least 60% of criteria should be rated. Currently ' + scored.answered +
              ' of ' + scored.total + '.' });
          return;
        }
        var trainer = GGL.data.trainers.filter(function (t) { return t.id === result.values.trainerId; })[0];
        btn.classList.add('is-loading'); btn.disabled = true;
        S.tof.submit({ trainerId:result.values.trainerId, trainer:trainer ? trainer.name : '—',
          evaluator:result.values.evaluator,
          observationDate:new Date(result.values.observationDate).toISOString(),
          observationTime:result.values.observationTime, topic:result.values.topic,
          durationMins:Number(result.values.durationMins) || null,
          ratings:ratings, comments:comments, recommendations:result.values.recommendations
        }).then(function (row) {
          h.close();
          UI.toast('Observation submitted', { type:'success',
            desc:'Overall ' + row.score.toFixed(1) + '% — the trainer\u2019s effectiveness record has been updated.' });
          if (table) table.reload();
          setTimeout(function () { viewRecord(row); }, 300);
        }).catch(function (err) {
          btn.classList.remove('is-loading'); btn.disabled = false;
          UI.toast('Could not submit', { type:'error', desc:err.message });
        });
      });
      recalc();
    }

    function viewRecord(r) {
      var inst = S.tof.instrument();
      UI.modal({ title:'Observation — ' + r.trainer,
        subtitle:U.date(r.observationDate,'long') +
          (r.observationTime ? ' at ' + r.observationTime : '') + ' · evaluated by ' + r.evaluator,
        size:'lg',
        body:'<div class="row gap-5 mb-5 wrap" style="align-items:center">' +
          C.gauge(r.score, { size:140, caption:r.rating }) +
          '<div class="grow" style="min-width:240px">' +
          C.hbars(r.sections.map(function (s) {
            return { label:s.no + '. ' + s.title, value:Math.round(s.score) };
          }), { suffix:'%' }) + '</div></div>' +
          kv([['Topic', r.topic], ['Duration', r.durationMins ? U.duration(r.durationMins) : '—'],
            ['Overall score', '<strong>' + r.score.toFixed(1) + '%</strong> — ' + U.esc(r.rating), true]]) +
          '<h4 class="mt-5 mb-3">Criterion detail</h4>' +
          inst.sections.map(function (sec) {
            var ss = (r.sections.filter(function (s) { return s.id === sec.id; })[0] || {}).score;
            return '<div class="card card-pad mb-3"><div class="row-between mb-3">' +
              '<strong class="text-sm">' + sec.no + '. ' + U.esc(sec.title) + '</strong>' +
              '<span class="badge badge-' + tone(ss || 0) + '">' +
              (ss === undefined ? '—' : ss.toFixed(1) + '%') + '</span></div>' +
              '<ul style="list-style:none;padding:0;margin:0">' + sec.criteria.map(function (c) {
                var v = r.ratings ? r.ratings[c.id] : undefined;
                var lbl = v === undefined ? 'Not observed'
                  : (inst.scale.filter(function (s) { return s.value === v; })[0] || {}).label;
                return '<li class="row-between text-sm" style="padding:5px 0;gap:var(--sp-4);' +
                  'border-bottom:1px solid var(--border)">' +
                  '<span class="text-muted" style="flex:1">' + U.esc(c.text) + '</span>' +
                  '<span class="badge ' + (v === undefined ? 'badge-plain'
                    : v >= 3 ? 'badge-success' : v >= 2 ? 'badge-info' : 'badge-warning') + '">' +
                  (v === undefined ? '—' : v + ' · ' + lbl) + '</span></li>';
              }).join('') + '</ul></div>';
          }).join('') +
          '<h4 class="mt-5 mb-2">Recommendations</h4>' +
          '<p class="text-muted">' + U.esc(r.recommendations) + '</p>',
        footer:'<button type="button" class="btn btn-secondary" data-close>Close</button>' +
          '<button type="button" class="btn btn-secondary" data-print>' +
          GGL.icon('fileText','ico') + '<span>Print</span></button>' +
          '<a class="btn btn-primary" href="' + GGL.url('app/effectiveness-calculator.html') + '">' +
          GGL.icon('trending','ico') + '<span>Effectiveness</span></a>',
        onMount:function (h) {
          h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
          h.overlay.querySelector('[data-print]').addEventListener('click', function () {
            U.printDocument('Trainer Observation — ' + r.trainer,
              '<h1>Trainer Observation Form</h1><div class="meta">' + U.esc(r.trainer) + ' · ' +
              U.date(r.observationDate,'long') + ' · evaluated by ' + U.esc(r.evaluator) + '</div>' +
              '<table><tbody><tr><th>Topic</th><td>' + U.esc(r.topic) + '</td>' +
              '<th>Overall</th><td><strong>' + r.score.toFixed(1) + '%</strong></td></tr></tbody></table>' +
              '<h2>Section scores</h2><table><thead><tr><th>#</th><th>Section</th><th>Score</th></tr></thead><tbody>' +
              r.sections.map(function (s) {
                return '<tr><td>' + s.no + '</td><td>' + U.esc(s.title) + '</td><td>' +
                  s.score.toFixed(1) + '%</td></tr>';
              }).join('') + '</tbody></table>' +
              '<h2>Recommendations</h2><p>' + U.esc(r.recommendations) + '</p>');
          });
        } });
    }

    var body = GGL.shell.mount({ active:'observation', title:'Trainer observation',
      subtitle:'The TOF instrument — seven sections, 36 criteria, scored live.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Trainer observation' }],
      actions:'<button type="button" class="btn btn-secondary" data-export>' +
        GGL.icon('download','ico') + '<span>Export</span></button>' +
        '<button type="button" class="btn btn-primary" data-new>' +
        GGL.icon('plus','ico') + '<span>New observation</span></button>' });
    if (!body) return;

    body.innerHTML = '<div class="grid grid-4 mb-6" id="tf-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-1-1 mb-6"><div id="tf-sections"></div><div id="tf-trainers"></div></div>' +
      '<h2 class="mb-4" style="font-size:var(--fs-lg)">Completed observations</h2><div id="tf-table"></div>';

    UI.async(document.getElementById('tf-stats'), UI.skeletonCards(4), function () {
      return S.tof.all().then(function (rows) {
        var avg = rows.length ? U.avg(rows, 'score') : 0;
        var recent = rows.filter(function (r) {
          return (Date.now() - new Date(r.observationDate)) < 30 * 86400000;
        });
        document.getElementById('tf-stats').innerHTML =
          stat('Observations', U.num(rows.length), 'eye', '') +
          stat('Average score', avg.toFixed(1) + '%', 'trending', 'violet') +
          stat('Last 30 days', U.num(recent.length), 'calendar', 'teal') +
          stat('Below 70%', rows.filter(function (r) { return r.score < 70; }).length, 'alert', 'amber');

        var agg = {};
        rows.forEach(function (r) {
          (r.sections || []).forEach(function (s) {
            if (!agg[s.title]) agg[s.title] = { total:0, n:0, no:s.no };
            agg[s.title].total += s.score; agg[s.title].n++;
          });
        });
        document.getElementById('tf-sections').innerHTML = card('Section performance',
          'Average across all observations — weakest first',
          C.hbars(Object.keys(agg).map(function (k) {
            return { label:agg[k].no + '. ' + k, value:Math.round(agg[k].total / agg[k].n) };
          }).sort(function (a,b) { return a.value - b.value; }), { suffix:'%' }) +
          '<p class="hint mt-4">The lowest sections are where calibration and trainer development ' +
          'should focus.</p>');

        var byTrainer = U.groupBy(rows, 'trainer');
        document.getElementById('tf-trainers').innerHTML = card('Trainer scores',
          'Observation average by trainer',
          C.hbars(Object.keys(byTrainer).map(function (t) {
            return { label:t, value:Math.round(U.avg(byTrainer[t], 'score')) };
          }).sort(function (a,b) { return b.value - a.value; }).slice(0,8), { suffix:'%' }),
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/trainers.html') + '">Directory</a>');
      });
    });

    table = GGL.DataTable(document.getElementById('tf-table'), {
      searchPlaceholder:'Search trainer, evaluator or topic…',
      pageSize:10, defaultSort:'observationDate', defaultDir:'desc',
      columns:[
        { key:'trainer', label:'Trainer', sortable:true, primary:true,
          render:function (r) { return U.userCell(r.trainer, r.topic); }},
        { key:'evaluator', label:'Evaluator', sortable:true, hideBelow:'md' },
        { key:'observationDate', label:'Date', sortable:true,
          render:function (r) { return U.date(r.observationDate); }},
        { key:'durationMins', label:'Duration', sortable:true, hideBelow:'lg',
          render:function (r) { return U.duration(r.durationMins); }},
        { key:'score', label:'Overall', sortable:true, align:'right',
          render:function (r) {
            return '<span class="badge badge-' + tone(r.score) + '">' + r.score.toFixed(1) + '%</span>';
          }},
        { key:'rating', label:'Rating', sortable:true, hideBelow:'md' }],
      filters:[{ key:'rating', label:'Rating', options:['Exceeds','Meets','Needs development']
        .map(function (x) { return { value:x, label:x }; })}],
      fetch:function (q) { return S.tof.list(q); },
      onRowClick: viewRecord,
      rowActions:function () {
        return [
          { label:'View observation', icon:'eye', onClick:viewRecord },
          { label:'Observe again', icon:'plus', onClick:function (r) { openForm(r.trainerId); }},
          { label:'Delete', icon:'trash', tone:'danger', onClick:function (r) {
            UI.confirm({ title:'Delete this observation?',
              message:'The record for ' + r.trainer + ' on ' + U.date(r.observationDate) + ' will be removed.',
              onConfirm:function () {
                return S.tof.remove(r.id).then(function () {
                  UI.toast('Observation deleted', { type:'success' }); table.reload();
                });
              }});
          }}];
      },
      empty:{ icon:'eye', title:'No observations recorded',
        message:'Complete the TOF to start building trainer evidence.',
        action:'New observation', onAction:function () { openForm(); } }
    });

    document.querySelector('[data-new]').addEventListener('click', function () { openForm(); });
    document.querySelector('[data-export]').addEventListener('click', function () {
      S.tof.all().then(function (rows) {
        var cols = [{ key:'trainer', label:'Trainer' }, { key:'evaluator', label:'Evaluator' },
          { label:'Date', value:function (r) { return U.date(r.observationDate); } },
          { key:'topic', label:'Topic' },
          { label:'Overall %', value:function (r) { return r.score; } },
          { key:'rating', label:'Rating' }].concat(GGL.data.tofSections.map(function (sec) {
            return { label:sec.no + '. ' + sec.title + ' %',
              value:function (r) {
                var s = (r.sections || []).filter(function (x) { return x.id === sec.id; })[0];
                return s ? s.score : '';
              }};
          }));
        U.downloadCsv('trainer-observations-' + U.stamp() + '.csv', cols, rows);
        UI.toast('Export downloaded', { type:'success', desc:rows.length + ' observations written to CSV.' });
      });
    });
  };

  /* ==================== TRAINER EFFECTIVENESS CALCULATOR ================= */
  P.effectivenessCalculator = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var table = null;

    if (user.role === GGL.ROLES.END_USER && user.workspaceType !== 'individual') {
      var b0 = GGL.shell.mount({ active:'effectiveness-calculator', title:'Effectiveness calculator',
        breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Calculator' }] });
      if (b0) b0.innerHTML = denied('The effectiveness calculator is available to administrators.');
      return;
    }

    function ratingBadge(rating) {
      var t = rating === 'Effective' ? 'success' : rating === 'Satisfactory' ? 'info' : 'warning';
      return '<span class="badge badge-' + t + '">' + U.esc(rating) + '</span>';
    }
    function pct(v) { return (Math.round(v * 100) / 100).toFixed(2) + '%'; }

    function openCalculator(record) {
      var weights = S.effectivenessCalc.weights();
      var isEdit = !!record;
      record = record || {};
      var h = UI.modal({
        title: isEdit ? 'Effectiveness — ' + record.trainer : 'Trainer effectiveness calculator',
        subtitle:'Weighted model: ' + weights.map(function (w) {
          return w.label + ' ' + Math.round(w.weight * 100) + '%';
        }).join(' · '),
        size:'lg',
        body:'<form id="eff-form" novalidate>' +
          '<div class="grid grid-2 gap-4">' +
            '<div class="field"><label class="label" for="ef-trainer">Trainer <span class="req">*</span></label>' +
              '<select class="select" id="ef-trainer" name="trainerId"><option value="">Select a trainer…</option>' +
              GGL.data.trainers.map(function (t) {
                return '<option value="' + U.esc(t.id) + '"' +
                  (record.trainerId === t.id ? ' selected' : '') + '>' + U.esc(t.name) + '</option>';
              }).join('') + '</select></div>' +
            '<div class="field"><label class="label" for="ef-month">Month <span class="req">*</span></label>' +
              '<select class="select" id="ef-month" name="month">' +
              ['January','February','March','April','May','June','July','August',
               'September','October','November','December'].map(function (m) {
                return '<option' + (record.month === m ? ' selected' : '') + '>' + m + '</option>';
              }).join('') + '</select></div></div>' +
          '<div class="calc-grid">' + weights.map(function (w) {
            var val = record[w.key];
            return '<div class="calc-row" data-metric="' + w.key + '">' +
              '<div class="calc-meta"><div class="calc-name">' + U.esc(w.label) +
                '<span class="calc-weight">' + Math.round(w.weight * 100) + '%</span></div>' +
                '<div class="calc-hint">' + U.esc(w.hint) + '</div></div>' +
              '<div class="calc-input"><input class="input" type="number" name="' + w.key +
                '" min="0" max="150" step="0.01" value="' + (val === undefined ? '' : val) +
                '" placeholder="0.00" aria-label="' + U.esc(w.label) + ' percentage">' +
                '<span class="calc-suffix">%</span></div>' +
              '<div class="calc-contrib" data-contrib="' + w.key + '">—</div></div>';
          }).join('') + '</div>' +
          '<div class="calc-result" data-result></div>' +
          '<div class="alert mt-4">' + GGL.icon('info','ico') + '<div class="text-sm">' +
            'A component below ' + GGL.data.effThreshold + '% is flagged as an area of improvement and ' +
            'sets the rating to Needs Improvement, even where the weighted total is otherwise healthy.' +
          '</div></div></form>',
        footer:'<button type="button" class="btn btn-ghost" data-sample>Load workbook sample</button>' +
          '<div class="grow"></div>' +
          '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
          '<button type="button" class="btn btn-primary" data-save>' +
          GGL.icon('check','ico') + '<span>Save record</span></button>'
      });

      var form = h.overlay.querySelector('#eff-form');
      var resultEl = h.overlay.querySelector('[data-result]');

      function readMetrics() {
        var m = {};
        weights.forEach(function (w) {
          var v = form.elements[w.key].value;
          m[w.key] = v === '' ? 0 : Number(v);
        });
        return m;
      }
      function recalc() {
        var out = S.effectivenessCalc.calculate(readMetrics());
        out.contributions.forEach(function (c) {
          var el = form.querySelector('[data-contrib="' + c.key + '"]');
          if (!el) return;
          el.innerHTML = '<span class="contrib-val">' + c.contribution.toFixed(2) + '</span>' +
            '<span class="contrib-lbl">pts</span>';
          el.classList.toggle('below', c.below && c.value > 0);
          var row = form.querySelector('[data-metric="' + c.key + '"]');
          if (row) row.classList.toggle('flagged', c.below && c.value > 0);
        });
        var t = out.rating === 'Effective' ? 'success' : out.rating === 'Satisfactory' ? 'info' : 'warning';
        resultEl.innerHTML = '<div class="calc-total">' +
          '<div class="calc-total-left"><div class="calc-total-label">Trainer Effectiveness</div>' +
            '<div class="calc-total-value" style="color:var(--' + t + ')">' +
            out.effectiveness.toFixed(2) + '%</div>' +
            '<div class="mt-2">' + ratingBadge(out.rating) + '</div></div>' +
          '<div class="calc-total-right"><div class="text-xs text-muted mb-2">Area of improvement</div>' +
            '<div class="fw-medium text-sm">' + U.esc(out.improvement) + '</div>' +
            '<div class="calc-formula">' + out.contributions.map(function (c) {
              return '<span' + (c.below && c.value > 0 ? ' class="below"' : '') + '>' +
                c.value.toFixed(2) + '×' + c.weight.toFixed(2) + '</span>';
            }).join('<i>+</i>') + '</div></div></div>';
      }
      form.addEventListener('input', recalc);

      h.overlay.querySelector('[data-sample]').addEventListener('click', function () {
        form.elements.l1.value = 92.7; form.elements.tof.value = 91.5;
        form.elements.throughput.value = 95.5; form.elements.utilization.value = 102;
        form.elements.attendance.value = 100;
        recalc();
        UI.toast('Workbook sample loaded', { type:'info',
          desc:'Expected result 94.66% — Effective, no improvement required.' });
      });
      h.overlay.querySelector('[data-cancel]').addEventListener('click', h.close);
      h.overlay.querySelector('[data-save]').addEventListener('click', function () {
        var btn = this;
        var result = U.validateForm(form, {
          trainerId:[U.validators.required], month:[U.validators.required] });
        if (!result.valid) return;
        var trainer = GGL.data.trainers.filter(function (t) { return t.id === result.values.trainerId; })[0];
        var metrics = Object.assign(readMetrics(), { trainerId:result.values.trainerId,
          trainer: trainer ? trainer.name : '—', month:result.values.month });
        btn.classList.add('is-loading'); btn.disabled = true;
        S.effectivenessCalc.saveRecord(isEdit ? record.id : null, metrics).then(function (row) {
          h.close();
          UI.toast('Effectiveness recorded', { type:'success',
            desc:row.trainer + ' — ' + row.effectiveness.toFixed(2) + '%, ' + row.rating + '.' });
          if (table) table.reload();
        }).catch(function (err) {
          btn.classList.remove('is-loading'); btn.disabled = false;
          UI.toast('Could not save', { type:'error', desc:err.message });
        });
      });
      recalc();
    }

    function viewRecord(r) {
      var out = S.effectivenessCalc.calculate(r);
      UI.modal({ title:r.trainer + ' — ' + r.month,
        subtitle:'Weighted effectiveness ' + r.effectiveness.toFixed(2) + '% · ' + r.rating,
        size:'lg',
        body:'<div class="row gap-5 mb-5 wrap" style="align-items:center">' +
          C.gauge(r.effectiveness, { size:150, caption:r.rating }) +
          '<div class="grow" style="min-width:240px">' +
          C.hbars(out.contributions.map(function (c) {
            return { label:c.label + ' (' + Math.round(c.weight * 100) + '%)',
              value:Math.round(c.value), color: c.below ? 'var(--viz-6)' : 'var(--viz-1)' };
          }), { suffix:'%' }) + '</div></div>' +
          '<div class="table-wrap mb-5"><table class="table"><thead><tr>' +
          '<th>Component</th><th class="text-right">Score</th><th class="text-right">Weight</th>' +
          '<th class="text-right">Contribution</th><th>Status</th></tr></thead><tbody>' +
          out.contributions.map(function (c) {
            return '<tr><td class="cell-primary">' + U.esc(c.label) + '</td>' +
              '<td class="text-right">' + c.value.toFixed(2) + '%</td>' +
              '<td class="text-right">' + Math.round(c.weight * 100) + '%</td>' +
              '<td class="text-right"><strong>' + c.contribution.toFixed(2) + '</strong></td>' +
              '<td>' + (c.below ? '<span class="badge badge-warning">Below ' + GGL.data.effThreshold + '%</span>'
                : '<span class="badge badge-success">Met</span>') + '</td></tr>';
          }).join('') +
          '<tr style="border-top:2px solid var(--border-strong)">' +
            '<td class="cell-primary"><strong>Trainer Effectiveness</strong></td><td colspan="2"></td>' +
            '<td class="text-right"><strong>' + r.effectiveness.toFixed(2) + '%</strong></td>' +
            '<td>' + ratingBadge(r.rating) + '</td></tr></tbody></table></div>' +
          kv([['Area of improvement', r.improvement], ['Source', r.source || 'Platform']]) +
          (r.gaps && r.gaps.length
            ? '<div class="alert alert-warning mt-4">' + GGL.icon('alert','ico') + '<div class="text-sm">' +
              '<strong>' + r.gaps.join(' and ') + '</strong> ' + (r.gaps.length > 1 ? 'are' : 'is') +
              ' below the ' + GGL.data.effThreshold + '% threshold. Review the trainer observation and ' +
              'agree a development action.</div></div>'
            : '<div class="alert alert-success mt-4">' + GGL.icon('checkCircle','ico') +
              '<div class="text-sm">All components meet the threshold. No improvement required.</div></div>'),
        footer:'<button type="button" class="btn btn-secondary" data-close>Close</button>' +
          '<button type="button" class="btn btn-secondary" data-print>' +
          GGL.icon('fileText','ico') + '<span>Print</span></button>' +
          '<button type="button" class="btn btn-primary" data-edit>Recalculate</button>',
        onMount:function (h) {
          h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
          h.overlay.querySelector('[data-edit]').addEventListener('click', function () {
            h.close(); setTimeout(function () { openCalculator(r); }, 240);
          });
          h.overlay.querySelector('[data-print]').addEventListener('click', function () {
            U.printDocument('Trainer effectiveness — ' + r.trainer,
              '<h1>Trainer Effectiveness Scorecard</h1><div class="meta">' + U.esc(r.trainer) + ' · ' +
              U.esc(r.month) + '</div><table><thead><tr><th>Component</th><th>Score</th>' +
              '<th>Weight</th><th>Contribution</th></tr></thead><tbody>' +
              out.contributions.map(function (c) {
                return '<tr><td>' + U.esc(c.label) + '</td><td>' + c.value.toFixed(2) + '%</td><td>' +
                  Math.round(c.weight * 100) + '%</td><td>' + c.contribution.toFixed(2) + '</td></tr>';
              }).join('') +
              '<tr><td><strong>Trainer Effectiveness</strong></td><td colspan="2"></td><td><strong>' +
              r.effectiveness.toFixed(2) + '%</strong></td></tr></tbody></table>' +
              '<h2>Outcome</h2><p>Rating: <strong>' + U.esc(r.rating) + '</strong><br>' +
              'Area of improvement: ' + U.esc(r.improvement) + '</p>');
          });
        } });
    }

    var COLUMNS = [
      { key:'trainer', label:'Trainer' }, { key:'month', label:'Month' },
      { label:'L1 Score (%)', value:function (r) { return r.l1; } },
      { label:'TOF', value:function (r) { return r.tof; } },
      { label:'Throughput', value:function (r) { return r.throughput; } },
      { label:'Utilization (%)', value:function (r) { return r.utilization; } },
      { label:'Attendance', value:function (r) { return r.attendance; } },
      { label:'Trainer Effectiveness (%)', value:function (r) { return r.effectiveness; } },
      { key:'rating', label:'Rating' }, { key:'improvement', label:'Area of Improvement' }];

    var body = GGL.shell.mount({ active:'effectiveness-calculator',
      title:'Trainer effectiveness calculator',
      subtitle:'Weighted scoring across L1, TOF, throughput, utilization and attendance.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Effectiveness calculator' }],
      actions:'<button type="button" class="btn btn-secondary" data-export>' +
        GGL.icon('download','ico') + '<span>Export</span></button>' +
        '<button type="button" class="btn btn-primary" data-calc>' +
        GGL.icon('activity','ico') + '<span>Open calculator</span></button>' });
    if (!body) return;

    body.innerHTML = '<div class="grid grid-4 mb-6" id="ec-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div id="ec-narrative" class="mb-6"></div>' +
      '<div class="split-2-1 mb-6"><div id="ec-model"></div><div id="ec-gaps"></div></div>' +
      '<h2 class="mb-4" style="font-size:var(--fs-lg)">Trainer scorecard</h2><div id="ec-table"></div>';

    UI.async(document.getElementById('ec-stats'), UI.skeletonCards(4), function () {
      return S.effectivenessCalc.summary().then(function (st) {
        document.getElementById('ec-stats').innerHTML =
          stat('Completed records', U.num(st.records), 'clipboard', '') +
          stat('Avg effectiveness', st.average.toFixed(2) + '%', 'trending', 'violet') +
          stat('Effective trainers', U.num(st.effective), 'checkCircle', 'green') +
          stat('Needs improvement', U.num(st.needsImprovement), 'alert', 'amber');

        document.getElementById('ec-narrative').innerHTML =
          '<div class="alert">' + GGL.icon('info','ico') + '<div class="text-sm">' +
          'The current view includes <strong>' + st.records + '</strong> completed trainer records, ' +
          'with average effectiveness of <strong>' + st.average.toFixed(1) + '%</strong>. ' +
          '<strong>' + st.effective + '</strong> ' + (st.effective === 1 ? 'trainer meets' : 'trainers meet') +
          ' the effectiveness criteria and <strong>' + st.needsImprovement + '</strong> ' +
          (st.needsImprovement === 1 ? 'requires' : 'require') + ' improvement.' +
          (st.topGap ? ' <strong>' + U.esc(st.topGap) + '</strong> is the most common priority; ' +
            'review the TOF for trainers flagged below the threshold.' : '') + '</div></div>';

        document.getElementById('ec-gaps').innerHTML = card('Improvement priorities',
          'Components below ' + GGL.data.effThreshold + '%',
          st.gapCounts.length ? C.hbars(st.gapCounts.map(function (g) {
            return { label:g.label, value:g.value, color:'var(--viz-3)' };
          }), { suffix:' trainers' })
            : UI.empty({ icon:'checkCircle', title:'No gaps',
                message:'Every component is at or above the threshold.' }));

        var weights = S.effectivenessCalc.weights();
        document.getElementById('ec-model').innerHTML = card('The weighted model',
          'How the effectiveness percentage is built',
          '<div class="row gap-6 wrap" style="justify-content:center;align-items:center">' +
          C.donut(weights.map(function (w) {
            return { label:w.label, value:Math.round(w.weight * 100) };
          }), { size:170, stroke:26, centreValue:'100%', centreLabel:'weighting',
                label:'Effectiveness weighting' }) +
          '<div class="grow" style="min-width:250px"><table class="table" style="font-size:var(--fs-sm)"><tbody>' +
          weights.map(function (w) {
            return '<tr><td class="cell-primary">' + U.esc(w.label) + '</td>' +
              '<td class="text-right"><strong>' + Math.round(w.weight * 100) + '%</strong></td>' +
              '<td class="text-xs text-muted hide-sm">' + U.esc(w.hint) + '</td></tr>';
          }).join('') + '</tbody></table></div></div>' +
          '<p class="hint mt-4">Transcribed from the source workbook and verified against both worked ' +
          'examples. Load the sample inside the calculator to check it yourself.</p>',
          '<button type="button" class="btn btn-sm btn-secondary" data-open-calc>Try it</button>');
        document.querySelector('[data-open-calc]').addEventListener('click', function () { openCalculator(); });
      });
    });

    table = GGL.DataTable(document.getElementById('ec-table'), {
      searchPlaceholder:'Search trainer, month or rating…',
      pageSize:10, defaultSort:'effectiveness', defaultDir:'desc',
      columns:[
        { key:'trainer', label:'Trainer', sortable:true, primary:true,
          render:function (r) {
            return '<div class="fw-medium">' + U.esc(r.trainer) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.month) +
              (r.source === 'Workbook' ? ' · from workbook' : '') + '</div>';
          }},
        { key:'l1', label:'L1', sortable:true, align:'right', hideBelow:'md',
          render:function (r) { return pct(r.l1); }},
        { key:'tof', label:'TOF', sortable:true, align:'right', hideBelow:'md',
          render:function (r) {
            return '<span' + (r.tof < GGL.data.effThreshold ? ' class="text-warning"' : '') + '>' +
              pct(r.tof) + '</span>';
          }},
        { key:'throughput', label:'Throughput', sortable:true, align:'right', hideBelow:'lg',
          render:function (r) { return pct(r.throughput); }},
        { key:'utilization', label:'Utilization', sortable:true, align:'right', hideBelow:'lg',
          render:function (r) { return pct(r.utilization); }},
        { key:'attendance', label:'Attendance', sortable:true, align:'right', hideBelow:'xl',
          render:function (r) { return pct(r.attendance); }},
        { key:'effectiveness', label:'Effectiveness', sortable:true, align:'right',
          render:function (r) { return '<strong>' + r.effectiveness.toFixed(2) + '%</strong>'; }},
        { key:'rating', label:'Rating', sortable:true,
          render:function (r) { return ratingBadge(r.rating); }},
        { key:'improvement', label:'Area of improvement', sortable:true, hideBelow:'lg',
          render:function (r) {
            return r.gaps && r.gaps.length
              ? '<span class="text-sm">' + U.esc(r.improvement) + '</span>'
              : '<span class="text-sm text-subtle">None</span>';
          }}],
      filters:[{ key:'rating', label:'Rating',
        options:['Effective','Satisfactory','Needs Improvement'].map(function (x) {
          return { value:x, label:x }; })}],
      fetch:function (q) { return S.effectivenessCalc.list(q); },
      onRowClick: viewRecord,
      rowActions:function () {
        return [
          { label:'View scorecard', icon:'eye', onClick:viewRecord },
          { label:'Recalculate', icon:'activity', onClick:openCalculator },
          { label:'Observe trainer', icon:'clipboard',
            onClick:function () { window.location.href = GGL.url('app/observation.html'); }},
          { label:'Delete record', icon:'trash', tone:'danger', onClick:function (r) {
            UI.confirm({ title:'Delete this record?',
              message:r.trainer + ' — ' + r.month + ' will be removed from the scorecard.',
              onConfirm:function () {
                return S.effectivenessCalc.remove(r.id).then(function () {
                  UI.toast('Record deleted', { type:'success' }); table.reload();
                });
              }});
          }}];
      },
      empty:{ icon:'trending', title:'No effectiveness records',
        message:'Open the calculator to score a trainer.',
        action:'Open calculator', onAction:function () { openCalculator(); } }
    });

    document.querySelector('[data-calc]').addEventListener('click', function () { openCalculator(); });
    document.querySelector('[data-export]').addEventListener('click', function () {
      S.effectivenessCalc.all().then(function (rows) {
        U.downloadCsv('trainer-effectiveness-' + U.stamp() + '.csv', COLUMNS, rows);
        UI.toast('Export downloaded', { type:'success', desc:rows.length + ' records written to CSV.' });
      });
    });
  };

  /* ============================== ASSESSMENTS =========================== */
  P.assessments = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var isLearner = user.role === GGL.ROLES.END_USER;
    var RESULT_COLS = [
      { key:'name', label:'Learner' }, { key:'employeeId', label:'Employee ID' },
      { key:'department', label:'Department' }, { key:'assessment', label:'Assessment' },
      { key:'stage', label:'Stage' }, { key:'score', label:'Score %' },
      { label:'Outcome', value:function (r) { return r.passed ? 'Passed' : 'Failed'; } },
      { label:'Submitted', value:function (r) { return U.date(r.submittedAt); } }];

    function takeAssessment(assessment, onDone) {
      var answers = {}, index = 0, qs = assessment.questions;
      var h = UI.modal({ title:assessment.title,
        subtitle:qs.length + ' questions · ' +
          (assessment.passMark > 0 ? 'pass mark ' + assessment.passMark + '%' : 'baseline check, not graded'),
        size:'lg', dismissible:false,
        body:'<div id="quiz"></div>',
        footer:'<button type="button" class="btn btn-ghost" data-quit>Leave</button>' +
          '<div class="grow"></div>' +
          '<button type="button" class="btn btn-secondary" data-prev hidden>Previous</button>' +
          '<button type="button" class="btn btn-primary" data-next>Next</button>' });

      var quiz = h.overlay.querySelector('#quiz');
      var prevBtn = h.overlay.querySelector('[data-prev]');
      var nextBtn = h.overlay.querySelector('[data-next]');

      h.overlay.querySelector('[data-quit]').addEventListener('click', function () {
        UI.confirm({ title:'Leave this assessment?',
          message:'Your answers so far will not be saved and no attempt will be recorded.',
          confirmLabel:'Leave', tone:'warning', onConfirm:function () { h.close(); } });
      });

      function render() {
        var q = qs[index], answered = Object.keys(answers).length;
        quiz.innerHTML = '<div class="row-between mb-3">' +
          '<span class="text-sm text-muted">Question ' + (index+1) + ' of ' + qs.length + '</span>' +
          '<span class="text-sm text-muted">' + answered + ' answered</span></div>' +
          '<div class="progress mb-5"><div class="progress-bar" style="width:' +
          Math.round((index / qs.length) * 100) + '%"></div></div>' +
          '<h3 style="font-size:var(--fs-md);line-height:1.45;margin-bottom:var(--sp-4)">' +
          U.esc(q.text) + '</h3><div class="quiz-options">' +
          q.options.map(function (opt, i) {
            var id = 'opt-' + q.id + '-' + i;
            return '<label class="quiz-option' + (answers[q.id] === i ? ' selected' : '') +
              '" for="' + id + '"><input type="radio" id="' + id + '" name="' + q.id +
              '" value="' + i + '"' + (answers[q.id] === i ? ' checked' : '') + '>' +
              '<span class="marker">' + String.fromCharCode(65 + i) + '</span>' +
              '<span>' + U.esc(opt) + '</span></label>';
          }).join('') + '</div>';
        U.$$('input[type=radio]', quiz).forEach(function (input) {
          input.addEventListener('change', function () { answers[q.id] = Number(input.value); render(); });
        });
        prevBtn.hidden = index === 0;
        var last = index === qs.length - 1;
        nextBtn.innerHTML = last ? GGL.icon('check','ico') + '<span>Submit assessment</span>' : '<span>Next</span>';
        nextBtn.disabled = answers[q.id] === undefined;
      }

      nextBtn.addEventListener('click', function () {
        if (index < qs.length - 1) { index++; render(); return; }
        if (Object.keys(answers).length < qs.length) {
          UI.toast('Answer every question first', { type:'warning' }); return;
        }
        nextBtn.classList.add('is-loading'); nextBtn.disabled = true;
        S.assessments.submitAttempt(assessment.id, answers).then(function (result) {
          h.close();
          setTimeout(function () { showResult(result, onDone); }, 250);
        }).catch(function (err) {
          nextBtn.classList.remove('is-loading'); nextBtn.disabled = false;
          UI.toast('Could not submit', { type:'error', desc:err.message });
        });
      });
      prevBtn.addEventListener('click', function () { index = Math.max(0, index-1); render(); });
      render();
    }

    function showResult(r, onDone) {
      var tone = r.passed ? 'success' : 'warning';
      UI.modal({ title: r.passed ? 'Assessment passed' : 'Assessment submitted',
        subtitle:r.assessment.title, size:'sm',
        body:'<div class="text-center mb-5">' +
          C.gauge(r.score, { size:150, caption:r.correct + ' of ' + r.total + ' correct' }) + '</div>' +
          '<div class="alert alert-' + tone + ' mb-4">' +
          GGL.icon(r.passed ? 'checkCircle' : 'info','ico') + '<div class="text-sm">' +
          (r.assessment.passMark === 0
            ? 'This is a baseline check — it establishes your starting point and is not graded pass or fail.'
            : r.passed ? 'You scored above the ' + r.assessment.passMark + '% pass mark.'
              : 'The pass mark is ' + r.assessment.passMark + '%. You can retake this assessment.') +
          '</div></div>' +
          (r.awarded.length ? '<h4 class="mb-2" style="font-size:var(--fs-base)">Points awarded</h4>' +
            '<ul class="session-list mb-4">' + r.awarded.map(function (a) {
              return '<li style="padding:var(--sp-2) 0"><span class="session-info">' +
                '<strong class="text-sm">' + U.esc(a.label) + '</strong></span>' +
                '<span class="badge badge-accent">+' + a.points + '</span></li>';
            }).join('') + '</ul>' : '') +
          (r.certificate ? '<div class="alert alert-success">' + GGL.icon('award','ico') +
            '<div class="text-sm"><strong>Certificate issued.</strong> Serial ' +
            U.esc(r.certificate.serial) + ' is now in your certificates.</div></div>' : ''),
        footer:'<button type="button" class="btn btn-secondary" data-close>Close</button>' +
          (r.certificate
            ? '<a class="btn btn-primary" href="' + GGL.url('app/certificates.html') + '">View certificate</a>'
            : '<a class="btn btn-primary" href="' + GGL.url('app/gamification.html') + '">See my standing</a>'),
        onMount:function (h) { h.overlay.querySelector('[data-close]').addEventListener('click', h.close); },
        onClose: onDone });
    }

    function preview(a) {
      UI.modal({ title:a.title,
        subtitle:a.type + ' · ' + a.questions.length + ' questions · ' +
          (a.passMark > 0 ? 'pass mark ' + a.passMark + '%' : 'baseline check, not graded'),
        size:'lg',
        body:'<div class="row gap-2 mb-5 wrap">' + U.statusBadge(a.status) +
          '<span class="badge badge-plain">' + U.esc(a.category) + '</span>' +
          (a.mandatory ? '<span class="badge badge-warning">Mandatory</span>' : '') + '</div>' +
          '<div class="grid grid-4 gap-3 mb-5">' + mini('Attempts', U.num(a.attempts)) +
          mini('Average', a.avgScore + '%') + mini('Pass rate', a.passRate + '%') +
          mini('Duration', a.durationMins + 'm') + '</div>' +
          '<h4 class="mb-3">Questions</h4>' + a.questions.map(function (q, i) {
            return '<div class="card card-pad mb-3"><div class="fw-medium mb-3">' +
              (i+1) + '. ' + U.esc(q.text) + '</div><ul style="list-style:none;padding:0;margin:0">' +
              q.options.map(function (opt, oi) {
                var right = oi === q.correct;
                return '<li class="text-sm ' + (right ? 'fw-semi' : 'text-muted') + '" style="padding:3px 0">' +
                  String.fromCharCode(65 + oi) + '. ' + U.esc(opt) +
                  (right ? ' <span class="badge badge-success">Correct</span>' : '') + '</li>';
              }).join('') + '</ul></div>';
          }).join(''),
        footer:'<button type="button" class="btn btn-secondary" data-close>Close</button>',
        onMount:function (h) { h.overlay.querySelector('[data-close]').addEventListener('click', h.close); } });
    }

    var body = GGL.shell.mount({ active:'assessments', title:'Assessments',
      subtitle: isLearner ? 'Knowledge checks, pre and post assessments assigned to you.'
        : 'Build the question bank, review every attempt and export the results.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Assessments' }] });
    if (!body) return;

    if (isLearner) {
      body.innerHTML = '<div class="grid grid-4 mb-6" id="as-stats">' + UI.skeletonCards(4) + '</div>' +
        '<h2 class="mb-4" style="font-size:var(--fs-lg)">Available to you</h2>' +
        '<div id="as-available"></div>' +
        '<h2 class="mb-4 mt-8" style="font-size:var(--fs-lg)">My results</h2><div id="as-mine"></div>';

      var load = function () {
        return Promise.all([S.assessments.availableFor(user.id), S.assessments.attemptsFor(user.id)])
          .then(function (res) {
            var available = res[0], mine = res[1];
            document.getElementById('as-stats').innerHTML =
              stat('Available', available.filter(function (a) { return !a.taken; }).length, 'checkSquare', '') +
              stat('Attempted', mine.length, 'activity', 'teal') +
              stat('Passed', mine.filter(function (m) { return m.passed; }).length, 'checkCircle', 'green') +
              stat('Average score', (mine.length ? Math.round(U.avg(mine,'score')) : 0) + '%', 'trending', 'violet');

            var open = available.filter(function (a) { return !a.taken; });
            var el = document.getElementById('as-available');
            el.innerHTML = open.length
              ? '<div class="grid grid-3">' + open.slice(0,9).map(function (a, i) {
                  var variant = ['','v2','v3','v4'][i % 4];
                  return '<article class="card course-card"><div class="course-thumb ' + variant + '">' +
                    '<span class="cat">' + U.esc(a.category) + '</span>' + GGL.icon('checkSquare','ico') + '</div>' +
                    '<div class="course-body"><div class="row-between gap-2 mb-2">' +
                    '<span class="badge badge-info">' + U.esc(a.type) + '</span>' +
                    (a.mandatory ? '<span class="badge badge-warning">Mandatory</span>' : '') + '</div>' +
                    '<h3>' + U.esc(a.title) + '</h3><div class="course-meta">' +
                    '<span>' + GGL.icon('help','ico') + a.questions.length + ' questions</span>' +
                    '<span>' + GGL.icon('clock','ico') + a.durationMins + ' min</span></div>' +
                    '<div class="course-foot">' +
                    '<button type="button" class="btn btn-primary btn-sm btn-block" data-take="' + U.esc(a.id) + '">' +
                    GGL.icon('play','ico') + '<span>Start assessment</span></button></div></div></article>';
                }).join('') + '</div>'
              : '<div class="card">' + UI.empty({ icon:'checkCircle', title:'Nothing outstanding',
                  message:'You have attempted every assessment currently available to you.' }) + '</div>';

            U.$$('[data-take]', el).forEach(function (btn) {
              btn.addEventListener('click', function () {
                takeAssessment(available.filter(function (x) {
                  return x.id === btn.getAttribute('data-take'); })[0], load);
              });
            });

            var mineEl = document.getElementById('as-mine');
            mineEl.innerHTML = mine.length
              ? '<div class="card"><div class="table-wrap"><table class="table"><thead><tr>' +
                '<th>Assessment</th><th class="hide-sm">Stage</th><th class="hide-md">Submitted</th>' +
                '<th>Score</th><th>Outcome</th></tr></thead><tbody>' +
                mine.sort(function (a,b) { return new Date(b.submittedAt) - new Date(a.submittedAt); })
                  .map(function (m) {
                    return '<tr><td class="cell-primary"><div class="truncate" style="max-width:280px">' +
                      U.esc(m.assessment) + '</div></td><td class="hide-sm">' + U.esc(m.stage) + '</td>' +
                      '<td class="hide-md">' + U.date(m.submittedAt) + '</td>' +
                      '<td><strong>' + m.score + '%</strong></td>' +
                      '<td>' + U.statusBadge(m.passed ? 'Passed' : 'Failed') + '</td></tr>';
                  }).join('') + '</tbody></table></div>' +
                '<div class="card-foot"><button type="button" class="btn btn-sm btn-secondary" data-export-mine>' +
                GGL.icon('download','ico') + '<span>Export my results</span></button></div></div>'
              : '<div class="card">' + UI.empty({ icon:'activity', title:'No attempts yet',
                  message:'Start an assessment above and your results will appear here.' }) + '</div>';
            var exp = mineEl.querySelector('[data-export-mine]');
            if (exp) exp.addEventListener('click', function () {
              U.downloadCsv('my-assessment-results-' + U.stamp() + '.csv', RESULT_COLS, mine);
              UI.toast('Export downloaded', { type:'success', desc:mine.length + ' results written to CSV.' });
            });
          });
      };
      UI.async(document.getElementById('as-available'),
        '<div class="grid grid-3">' + UI.skeletonCards(6) + '</div>', load);
      return;
    }

    /* ---- admin view ---- */
    body.innerHTML = '<div class="grid grid-4 mb-6" id="as-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-1-1 mb-6"><div id="as-scores"></div><div id="as-gain"></div></div>' +
      '<div class="tabs mb-5" role="tablist" aria-label="Assessment views">' +
        '<button type="button" class="tab" role="tab" id="as-t0" aria-controls="as-p0" aria-selected="true">Assessment bank</button>' +
        '<button type="button" class="tab" role="tab" id="as-t1" aria-controls="as-p1" aria-selected="false">Results</button></div>' +
      '<div id="as-p0" role="tabpanel" aria-labelledby="as-t0"></div>' +
      '<div id="as-p1" role="tabpanel" aria-labelledby="as-t1" hidden></div>';
    UI.initTabs(body);

    UI.async(document.getElementById('as-stats'), UI.skeletonCards(4), function () {
      return S.assessments.stats().then(function (st) {
        document.getElementById('as-stats').innerHTML =
          stat('Assessments', U.num(st.total), 'checkSquare', '') +
          stat('Published', U.num(st.published), 'checkCircle', 'green') +
          stat('Total attempts', U.num(st.attempts), 'activity', 'teal') +
          stat('Pass rate', st.passRate + '%', 'trending', 'violet');
      });
    });
    UI.async(document.getElementById('as-scores'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.attempts.all().then(function (rows) {
        var buckets = [{ label:'0–39', value:0 },{ label:'40–59', value:0 },{ label:'60–69', value:0 },
          { label:'70–84', value:0 },{ label:'85–100', value:0 }];
        rows.forEach(function (r) {
          var i = r.score < 40 ? 0 : r.score < 60 ? 1 : r.score < 70 ? 2 : r.score < 85 ? 3 : 4;
          buckets[i].value++;
        });
        document.getElementById('as-scores').innerHTML = card('Score distribution',
          'Across ' + U.num(rows.length) + ' recorded attempts',
          C.bar(buckets, { height:240, label:'Score distribution' }));
      });
    });
    UI.async(document.getElementById('as-gain'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.attempts.all().then(function (rows) {
        var byCat = U.groupBy(rows.filter(function (r) { return r.stage !== 'Check'; }), 'category');
        var data = Object.keys(byCat).slice(0,6).map(function (cat) {
          var pre = byCat[cat].filter(function (r) { return r.stage === 'Pre'; });
          var post = byCat[cat].filter(function (r) { return r.stage === 'Post'; });
          var gain = (post.length ? U.avg(post,'score') : 0) - (pre.length ? U.avg(pre,'score') : 0);
          return { label:cat, value:Math.max(0, Math.round(gain)) };
        }).sort(function (a,b) { return b.value - a.value; });
        document.getElementById('as-gain').innerHTML = card('Knowledge gain by category',
          'Average post-assessment score minus pre-assessment',
          C.hbars(data, { suffix:' pts' }) +
          '<p class="hint mt-4">These are the same figures the effectiveness module reports — ' +
          'both read the attempt data.</p>',
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/effectiveness.html') + '">Effectiveness</a>');
      });
    });

    GGL.DataTable(document.getElementById('as-p0'), {
      searchPlaceholder:'Search assessments, courses or categories…',
      pageSize:10, defaultSort:'title',
      columns:[
        { key:'title', label:'Assessment', sortable:true, primary:true,
          render:function (r) {
            return '<div class="fw-medium truncate" style="max-width:300px">' + U.esc(r.title) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.category) +
              (r.mandatory ? ' · Mandatory' : '') + '</div>';
          }},
        { key:'type', label:'Type', sortable:true, hideBelow:'md' },
        { key:'passMark', label:'Pass mark', sortable:true, align:'right', hideBelow:'lg',
          render:function (r) { return r.passMark + '%'; }},
        { key:'attempts', label:'Attempts', sortable:true, align:'right', hideBelow:'md',
          render:function (r) { return U.num(r.attempts); }},
        { key:'passRate', label:'Pass rate', sortable:true, width:'150px',
          render:function (r) { return U.progressCell(r.passRate); }},
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); }}],
      filters:[{ key:'status', label:'Status', options:['Published','Draft','Archived']
        .map(function (x) { return { value:x, label:x }; })}],
      toolbarExtra:'<button type="button" class="btn btn-sm btn-secondary" data-export-bank>' +
        GGL.icon('download','ico') + '<span>Export</span></button>',
      fetch:function (q) { return S.assessments.list(q); },
      onRowClick: preview,
      rowActions:function () {
        return [{ label:'Preview questions', icon:'eye', onClick:preview }];
      },
      empty:{ icon:'checkSquare', title:'No assessments yet',
        message:'Create an assessment and link it to a course.' }
    });

    document.querySelector('[data-export-bank]').addEventListener('click', function () {
      S.assessments.all().then(function (rows) {
        U.downloadCsv('assessment-bank-' + U.stamp() + '.csv', [
          { key:'title', label:'Assessment' }, { key:'course', label:'Course' },
          { key:'category', label:'Category' }, { key:'type', label:'Type' },
          { label:'Questions', value:function (r) { return r.questions.length; } },
          { key:'passMark', label:'Pass mark %' }, { key:'attempts', label:'Attempts' },
          { key:'avgScore', label:'Average score %' }, { key:'passRate', label:'Pass rate %' },
          { key:'status', label:'Status' }], rows);
        UI.toast('Export downloaded', { type:'success', desc:rows.length + ' assessments written to CSV.' });
      });
    });

    GGL.DataTable(document.getElementById('as-p1'), {
      searchPlaceholder:'Search by learner, employee ID or course…',
      pageSize:10, defaultSort:'submittedAt', defaultDir:'desc', selectable:true,
      columns:[
        { key:'name', label:'Learner', sortable:true, primary:true,
          render:function (r) { return U.userCell(r.name, r.employeeId); }},
        { key:'assessment', label:'Assessment', sortable:true, hideBelow:'md',
          render:function (r) {
            return '<div class="truncate" style="max-width:240px">' + U.esc(r.assessment) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.stage) + '</div>';
          }},
        { key:'department', label:'Department', sortable:true, hideBelow:'lg' },
        { key:'submittedAt', label:'Submitted', sortable:true, hideBelow:'md',
          render:function (r) { return U.date(r.submittedAt); }},
        { key:'score', label:'Score', sortable:true, align:'right',
          render:function (r) {
            return '<strong>' + r.score + '%</strong><div class="text-xs text-muted">' +
              r.correct + '/' + r.total + '</div>';
          }},
        { key:'passed', label:'Outcome', sortable:true,
          render:function (r) { return U.statusBadge(r.passed ? 'Passed' : 'Failed'); }}],
      filters:[{ key:'stage', label:'Stage', options:[{ value:'Pre', label:'Pre' },
        { value:'Post', label:'Post' }, { value:'Check', label:'Knowledge check' }]}],
      bulkActions:[{ label:'Export selected', icon:'download', onClick:function (ids, api) {
        var rows = api.selection;
        U.downloadCsv('assessment-results-' + U.stamp() + '.csv', RESULT_COLS, rows);
        UI.toast('Export downloaded', { type:'success', desc:rows.length + ' results written to CSV.' });
      }}],
      fetch:function (q) { return S.attempts.list(q); },
      empty:{ icon:'activity', title:'No attempts recorded',
        message:'Results appear here once learners submit assessments.' }
    });
  };

  /* ============================= CERTIFICATES =========================== */
  P.certificates = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var isLearner = user.role === GGL.ROLES.END_USER;
    var table = null;
    var COLUMNS = [
      { key:'serial', label:'Serial' }, { key:'name', label:'Holder' },
      { key:'employeeId', label:'Employee ID' }, { key:'department', label:'Department' },
      { key:'course', label:'Course' }, { key:'score', label:'Score %' },
      { label:'Issued', value:function (r) { return U.date(r.issuedAt); } },
      { label:'Expires', value:function (r) { return U.date(r.expiresAt); } },
      { key:'status', label:'Status' }];

    function certificateHtml(c) {
      return '<div style="border:10px solid #1b4fd8;padding:6px;background:#fff">' +
        '<div style="border:2px solid #2f6bf3;padding:40px 34px;text-align:center;' +
        'font-family:Inter,Segoe UI,Arial,sans-serif">' +
        '<div style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:10px;' +
        'background:linear-gradient(135deg,#2f6bf3,#14b8a6);color:#fff;font-weight:700;font-size:15px">GG</div>' +
        '<div style="margin-top:8px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#6b7686">' +
        'GG Learning Labs</div>' +
        '<h1 style="font-size:26px;letter-spacing:.04em;margin:22px 0 4px;color:#141b25">' +
        'Certificate of Completion</h1>' +
        '<div style="width:64px;height:3px;background:#2f6bf3;margin:0 auto 26px"></div>' +
        '<div style="font-size:12px;color:#6b7686">This is to certify that</div>' +
        '<div style="font-size:28px;font-weight:700;margin:10px 0;color:#141b25">' + U.esc(c.name) + '</div>' +
        '<div style="font-size:12px;color:#6b7686">has successfully completed</div>' +
        '<div style="font-size:17px;font-weight:600;margin:10px 0 4px;color:#173eaa">' + U.esc(c.course) + '</div>' +
        '<div style="font-size:12px;color:#6b7686">achieving a final assessment score of <strong>' +
        c.score + '%</strong></div>' +
        '<table style="width:100%;margin-top:34px;border:0;font-size:11px;color:#6b7686"><tr>' +
        '<td style="border:0;text-align:left;width:33%"><div style="border-top:1px solid #cbd2dd;padding-top:7px">' +
        'Serial<br><strong style="color:#141b25">' + U.esc(c.serial) + '</strong></div></td>' +
        '<td style="border:0;text-align:center;width:34%"><div style="border-top:1px solid #cbd2dd;padding-top:7px">' +
        'Issued<br><strong style="color:#141b25">' + U.date(c.issuedAt,'long') + '</strong></div></td>' +
        '<td style="border:0;text-align:right;width:33%"><div style="border-top:1px solid #cbd2dd;padding-top:7px">' +
        'Valid until<br><strong style="color:#141b25">' + U.date(c.expiresAt,'long') + '</strong></div></td>' +
        '</tr></table>' +
        '<div style="margin-top:26px;font-size:10px;color:#98a2b3">Employee ID ' +
        U.esc(c.employeeId || '—') + ' · ' + U.esc(c.department || '—') +
        ' · Verify at gglearninglabs.example/verify/' + U.esc(c.serial) + '</div>' +
        '<div style="margin-top:18px;font-size:9px;color:#cbd2dd">' +
        'Prototype sample document — not a genuine qualification</div></div></div>';
    }
    function downloadCertificate(c) {
      var doc = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
        '<title>Certificate ' + U.esc(c.serial) + ' — ' + U.esc(c.name) + '</title>' +
        '<style>body{margin:0;padding:28px;background:#f7f8fa}' +
        '@media print{body{padding:0;background:#fff}}' +
        '.wrap{max-width:780px;margin:0 auto}' +
        '.bar{max-width:780px;margin:0 auto 16px;font:13px Inter,Segoe UI,Arial,sans-serif;color:#6b7686}' +
        '.bar button{font:inherit;padding:8px 14px;border:1px solid #cbd2dd;background:#fff;' +
        'border-radius:8px;cursor:pointer}@media print{.bar{display:none}}</style></head><body>' +
        '<div class="bar"><button onclick="window.print()">Print or save as PDF</button></div>' +
        '<div class="wrap">' + certificateHtml(c) + '</div></body></html>';
      U.triggerDownload('certificate-' + c.serial + '.html', doc, 'text/html');
      UI.toast('Certificate downloaded', { type:'success',
        desc:'Open the file and use Print to save it as a PDF.' });
    }
    function viewCertificate(c) {
      UI.modal({ title:'Certificate ' + c.serial, subtitle:c.course, size:'lg',
        body:(c.status !== 'Issued'
          ? '<div class="alert alert-' + (c.status === 'Revoked' ? 'danger' : 'warning') + ' mb-4">' +
            GGL.icon('alert','ico') + '<div class="text-sm"><strong>This certificate is ' +
            c.status.toLowerCase() + '.</strong> ' +
            (c.status === 'Revoked' ? U.esc(c.revokedReason || 'Revoked by an administrator.')
              : 'It passed its validity date and needs renewal.') + '</div></div>' : '') +
          certificateHtml(c),
        footer:'<button type="button" class="btn btn-secondary" data-close>Close</button>' +
          '<button type="button" class="btn btn-secondary" data-print>' +
          GGL.icon('fileText','ico') + '<span>Print</span></button>' +
          '<button type="button" class="btn btn-primary" data-download>' +
          GGL.icon('download','ico') + '<span>Download</span></button>',
        onMount:function (h) {
          h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
          h.overlay.querySelector('[data-download]').addEventListener('click', function () { downloadCertificate(c); });
          h.overlay.querySelector('[data-print]').addEventListener('click', function () {
            U.printDocument('Certificate ' + c.serial, certificateHtml(c));
          });
        } });
    }

    var body = GGL.shell.mount({ active:'certificates',
      title: isLearner ? 'My certificates' : 'Certificates',
      subtitle: isLearner ? 'Every certificate you have earned, ready to download.'
        : 'The issued register, with revocation and audit-ready exports.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Certificates' }],
      actions: isLearner ? '' : '<a class="btn btn-secondary" href="' + GGL.url('app/assessments.html') + '">' +
        GGL.icon('checkSquare','ico') + '<span>Assessments</span></a>' });
    if (!body) return;

    if (isLearner) {
      body.innerHTML = '<div class="grid grid-4 mb-6" id="ct-stats">' + UI.skeletonCards(4) + '</div>' +
        '<div id="ct-mine"></div>';
      UI.async(document.getElementById('ct-mine'), '<div class="grid grid-3">' + UI.skeletonCards(6) + '</div>', function () {
        return S.certificates.forUser(user.id).then(function (rows) {
          var valid = rows.filter(function (c) { return c.status === 'Issued'; });
          document.getElementById('ct-stats').innerHTML =
            stat('My certificates', rows.length, 'award', '') +
            stat('Currently valid', valid.length, 'checkCircle', 'green') +
            stat('Expired', rows.filter(function (c) { return c.status === 'Expired'; }).length, 'clock', 'amber') +
            stat('Average score', (rows.length ? Math.round(U.avg(rows,'score')) : 0) + '%', 'trending', 'violet');
          var el = document.getElementById('ct-mine');
          if (!rows.length) {
            el.innerHTML = '<div class="card">' + UI.empty({ icon:'award', title:'No certificates yet',
              message:'Pass a course post-assessment and your certificate is issued automatically.',
              action:'Browse assessments' }) + '</div>';
            el.querySelector('[data-empty-action]').addEventListener('click', function () {
              window.location.href = GGL.url('app/assessments.html');
            });
            return;
          }
          el.innerHTML = '<div class="grid grid-3 mb-5">' + rows.map(function (c, i) {
            var variant = ['','v2','v3','v4'][i % 4];
            return '<article class="card course-card"><div class="course-thumb ' + variant + '">' +
              '<span class="cat">' + U.esc(c.category) + '</span>' + GGL.icon('award','ico') + '</div>' +
              '<div class="course-body"><div class="row-between gap-2 mb-2">' + U.statusBadge(c.status) +
              '<span class="badge badge-plain">' + c.score + '%</span></div>' +
              '<h3>' + U.esc(c.course) + '</h3><div class="course-meta">' +
              '<span>' + GGL.icon('file','ico') + U.esc(c.serial) + '</span>' +
              '<span>' + GGL.icon('calendar','ico') + U.date(c.issuedAt) + '</span></div>' +
              '<div class="course-foot"><div class="text-xs text-muted mb-3">Valid until ' +
              U.date(c.expiresAt) + '</div><div class="row gap-2">' +
              '<button type="button" class="btn btn-sm btn-secondary grow" data-view="' + U.esc(c.id) + '">View</button>' +
              '<button type="button" class="btn btn-sm btn-primary btn-icon" data-dl="' + U.esc(c.id) + '" ' +
              'aria-label="Download certificate">' + GGL.icon('download','ico') + '</button>' +
              '</div></div></div></article>';
          }).join('') + '</div>';
          U.$$('[data-view]', el).forEach(function (b) {
            b.addEventListener('click', function () {
              viewCertificate(rows.filter(function (c) { return c.id === b.getAttribute('data-view'); })[0]);
            });
          });
          U.$$('[data-dl]', el).forEach(function (b) {
            b.addEventListener('click', function () {
              downloadCertificate(rows.filter(function (c) { return c.id === b.getAttribute('data-dl'); })[0]);
            });
          });
        });
      });
      return;
    }

    body.innerHTML = '<div class="grid grid-4 mb-6" id="ct-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-1-1 mb-6"><div id="ct-trend"></div><div id="ct-cat"></div></div>' +
      '<h2 class="mb-4" style="font-size:var(--fs-lg)">Certificate register</h2><div id="ct-table"></div>';

    UI.async(document.getElementById('ct-stats'), UI.skeletonCards(4), function () {
      return S.certificates.stats().then(function (st) {
        document.getElementById('ct-stats').innerHTML =
          stat('Total issued', U.num(st.total), 'award', '') +
          stat('Currently valid', U.num(st.issued), 'checkCircle', 'green') +
          stat('Expired', U.num(st.expired), 'clock', 'amber') +
          stat('Unique holders', U.num(st.holders), 'users', 'teal');
      });
    });
    UI.async(document.getElementById('ct-trend'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.certificates.all().then(function (rows) {
        var months = [];
        for (var i = 5; i >= 0; i--) {
          var d = new Date();
          d.setMonth(d.getMonth() - i);
          months.push({ label:d.toLocaleDateString('en-GB', { month:'short' }),
            key:d.getFullYear() + '-' + d.getMonth(), value:0 });
        }
        rows.forEach(function (c) {
          var d = new Date(c.issuedAt);
          var m = months.filter(function (x) { return x.key === d.getFullYear() + '-' + d.getMonth(); })[0];
          if (m) m.value++;
        });
        document.getElementById('ct-trend').innerHTML = card('Certificates issued', 'Last six months',
          C.bar(months, { height:240, color:'var(--viz-5)', label:'Certificates issued' }));
      });
    });
    UI.async(document.getElementById('ct-cat'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.certificates.all().then(function (rows) {
        var by = U.groupBy(rows, 'category');
        document.getElementById('ct-cat').innerHTML = card('By category',
          'Where capability is being certified',
          C.hbars(Object.keys(by).map(function (k) { return { label:k, value:by[k].length }; })
            .sort(function (a,b) { return b.value - a.value; }).slice(0,7)),
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/courses.html') + '">Courses</a>');
      });
    });

    table = GGL.DataTable(document.getElementById('ct-table'), {
      searchPlaceholder:'Search by holder, serial, course or department…',
      pageSize:10, defaultSort:'issuedAt', defaultDir:'desc', selectable:true,
      columns:[
        { key:'name', label:'Holder', sortable:true, primary:true,
          render:function (r) { return U.userCell(r.name, r.employeeId); }},
        { key:'serial', label:'Serial', sortable:true, hideBelow:'md',
          render:function (r) { return '<code class="text-xs">' + U.esc(r.serial) + '</code>'; }},
        { key:'course', label:'Course', sortable:true, hideBelow:'md',
          render:function (r) {
            return '<div class="truncate" style="max-width:230px">' + U.esc(r.course) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.category) + '</div>';
          }},
        { key:'department', label:'Department', sortable:true, hideBelow:'lg' },
        { key:'issuedAt', label:'Issued', sortable:true,
          render:function (r) { return U.date(r.issuedAt); }},
        { key:'expiresAt', label:'Expires', sortable:true, hideBelow:'md',
          render:function (r) { return U.date(r.expiresAt); }},
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); }}],
      filters:[{ key:'status', label:'Status', options:['Issued','Expired','Revoked']
        .map(function (x) { return { value:x, label:x }; })}],
      bulkActions:[{ label:'Export selected', icon:'download', onClick:function (ids, api) {
        var rows = api.selection;
        U.downloadCsv('certificates-' + U.stamp() + '.csv', COLUMNS, rows);
        UI.toast('Export downloaded', { type:'success', desc:rows.length + ' certificates written to CSV.' });
      }}],
      toolbarExtra:'<button type="button" class="btn btn-sm btn-secondary" data-export-all>' +
        GGL.icon('download','ico') + '<span>Export CSV</span></button>',
      fetch:function (q) { return S.certificates.list(q); },
      onRowClick: viewCertificate,
      rowActions:function (row) {
        var actions = [{ label:'View certificate', icon:'eye', onClick:viewCertificate },
          { label:'Download', icon:'download', onClick:downloadCertificate }];
        if (row.status === 'Revoked') {
          actions.push({ label:'Reinstate', icon:'refresh', onClick:function (r) {
            S.certificates.reinstate(r.id).then(function () {
              UI.toast('Certificate reinstated', { type:'success' }); table.reload();
            });
          }});
        } else {
          actions.push({ label:'Revoke certificate', icon:'xCircle', tone:'danger', onClick:function (r) {
            UI.confirm({ title:'Revoke this certificate?',
              message:'Serial ' + r.serial + ' held by ' + r.name + ' will be marked revoked.',
              detail:'Revocation is reversible in this prototype, but in production it would be audited.',
              confirmLabel:'Revoke',
              onConfirm:function () {
                return S.certificates.revoke(r.id).then(function () {
                  UI.toast('Certificate revoked', { type:'success' }); table.reload();
                });
              }});
          }});
        }
        return actions;
      },
      empty:{ icon:'award', title:'No certificates issued',
        message:'Certificates are issued automatically when a learner passes a post-assessment.' }
    });

    document.querySelector('[data-export-all]').addEventListener('click', function () {
      S.certificates.all().then(function (rows) {
        U.downloadCsv('certificate-register-' + U.stamp() + '.csv', COLUMNS, rows);
        UI.toast('Export downloaded', { type:'success', desc:rows.length + ' certificates written to CSV.' });
      });
    });
  };

  /* ============================== NEWSFEED ============================== */
  P.newsfeed = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var CATEGORIES = ['Announcement','New course','Update','Event','Recognition','Notice'];
    var state = { category:'all', search:'' }, expanded = {}, feedEl;
    function canPublish() { return user.role !== GGL.ROLES.END_USER; }
    function catTone(c) {
      return ({ 'Announcement':'accent','New course':'success','Update':'info',
        'Event':'warning','Recognition':'success','Notice':'plain' })[c] || 'plain';
    }

    function openCompose(post) {
      var isEdit = !!post;
      post = post || {};
      var imageData = post.image || null;
      var h = UI.modal({ title: isEdit ? 'Edit post' : 'New post',
        subtitle:'Published to everyone on the platform.', size:'lg',
        body:'<form id="post-form" novalidate>' +
          '<div class="grid grid-2 gap-4">' +
            '<div class="field"><label class="label" for="pf-cat">Category</label>' +
              '<select class="select" id="pf-cat" name="category">' + CATEGORIES.map(function (c) {
                return '<option' + (post.category === c ? ' selected' : '') + '>' + c + '</option>';
              }).join('') + '</select></div>' +
            '<div class="field" style="display:flex;align-items:flex-end">' +
              '<label class="check" style="margin:0 0 var(--sp-2)">' +
              '<input type="checkbox" name="pinned"' + (post.pinned ? ' checked' : '') + '>' +
              '<span>Pin to the top of the feed</span></label></div></div>' +
          '<div class="field"><label class="label" for="pf-title">Title <span class="req">*</span></label>' +
            '<input class="input" id="pf-title" name="title" value="' + U.esc(post.title || '') + '" ' +
            'placeholder="What is the headline?"></div>' +
          '<div class="field"><label class="label" for="pf-body">Post <span class="req">*</span></label>' +
            '<textarea class="textarea" id="pf-body" name="body" style="min-height:150px" ' +
            'placeholder="Write the update. Keep it clear and useful.">' + U.esc(post.body || '') + '</textarea></div>' +
          '<div class="field"><span class="label">Image ' +
            '<span class="text-subtle" style="font-weight:400">(optional)</span></span>' +
            '<div class="image-drop" data-drop tabindex="0" role="button" ' +
            'aria-label="Add an image — click or drop a file">' +
            '<input type="file" accept="image/*" data-file hidden>' +
            '<div data-drop-empty' + (imageData ? ' hidden' : '') + '>' + GGL.icon('image','ico') +
            '<div class="fw-medium text-sm mt-2">Click to choose, or drop an image here</div>' +
            '<div class="text-xs text-muted">PNG or JPG, up to 2 MB</div></div>' +
            '<div data-drop-preview' + (imageData ? '' : ' hidden') + '>' +
            '<img data-preview alt="Selected image preview"' +
            (imageData ? ' src="' + imageData + '"' : '') + '>' +
            '<button type="button" class="btn btn-sm btn-danger-ghost mt-3" data-remove-image>' +
            GGL.icon('trash','ico') + '<span>Remove image</span></button></div></div>' +
            '<span class="hint">Images are held in this browser only — nothing is uploaded to a server.</span>' +
          '</div></form>',
        footer:'<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
          '<button type="submit" form="post-form" class="btn btn-primary">' +
          GGL.icon(isEdit ? 'check' : 'send','ico') +
          '<span>' + (isEdit ? 'Save changes' : 'Publish post') + '</span></button>' });

      var form = h.overlay.querySelector('#post-form');
      var drop = form.querySelector('[data-drop]');
      var fileInput = form.querySelector('[data-file]');
      var preview = form.querySelector('[data-preview]');
      var emptyEl = form.querySelector('[data-drop-empty]');
      var previewEl = form.querySelector('[data-drop-preview]');

      function loadFile(file) {
        if (!file) return;
        if (!/^image\//.test(file.type)) { UI.toast('That is not an image', { type:'error' }); return; }
        if (file.size > 2 * 1024 * 1024) {
          UI.toast('Image is too large', { type:'error', desc:'Keep it under 2 MB.' }); return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
          imageData = e.target.result;
          preview.src = imageData;
          emptyEl.hidden = true; previewEl.hidden = false;
        };
        reader.readAsDataURL(file);
      }
      drop.addEventListener('click', function (e) {
        if (e.target.closest('[data-remove-image]')) return;
        fileInput.click();
      });
      drop.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
      });
      fileInput.addEventListener('change', function () { loadFile(this.files[0]); });
      ['dragenter','dragover'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
      });
      ['dragleave','drop'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
      });
      drop.addEventListener('drop', function (e) {
        loadFile(e.dataTransfer.files && e.dataTransfer.files[0]);
      });
      form.querySelector('[data-remove-image]').addEventListener('click', function (e) {
        e.stopPropagation();
        imageData = null; fileInput.value = '';
        preview.removeAttribute('src');
        emptyEl.hidden = false; previewEl.hidden = true;
      });
      h.overlay.querySelector('[data-cancel]').addEventListener('click', h.close);

      UI.handleSubmit(form, {
        title:[U.validators.required, U.validators.min(6)],
        body:[U.validators.required, U.validators.min(20)]
      }, function (v) {
        var payload = { title:v.title, body:v.body, category:v.category,
          pinned: !!v.pinned, image:imageData };
        return isEdit ? S.feed.update(post.id, payload) : S.feed.publish(payload);
      }, { success: isEdit ? 'Post updated' : 'Post published',
        successDesc: isEdit ? null : 'It is now visible to everyone on the platform.',
        onDone:function () { h.close(); load(); } });
    }

    function postCard(p, me) {
      var liked = (p.likedBy || []).indexOf(me.id) !== -1;
      var mine = p.authorId === me.id;
      var isAdmin = me.role !== GGL.ROLES.END_USER;
      return '<article class="post" data-post="' + U.esc(p.id) + '">' +
        (p.pinned ? '<div class="post-pin">' + GGL.icon('star','ico') + '<span>Pinned</span></div>' : '') +
        '<header class="post-head">' +
          '<span class="avatar">' + U.esc(U.initials(p.author)) + '</span>' +
          '<div class="grow"><div class="post-author">' + U.esc(p.author) +
          '<span class="post-role">' + U.esc(p.authorRole) + '</span></div>' +
          '<div class="post-time">' + U.relative(p.createdAt) + ' · ' + U.date(p.createdAt) + '</div></div>' +
          '<span class="badge badge-' + catTone(p.category) + '">' + U.esc(p.category) + '</span>' +
          (isAdmin ? '<div class="dropdown" data-dropdown>' +
            '<button type="button" class="btn-icon btn-sm" data-dropdown-trigger ' +
            'aria-haspopup="true" aria-expanded="false" aria-label="Post actions">' +
            GGL.icon('moreVertical','ico') + '</button><div class="menu">' +
            '<button type="button" class="menu-item" data-pin="' + U.esc(p.id) + '">' +
            GGL.icon('star','ico') + '<span>' + (p.pinned ? 'Unpin' : 'Pin to top') + '</span></button>' +
            (mine || me.role === GGL.ROLES.SUPER_ADMIN
              ? '<button type="button" class="menu-item" data-edit="' + U.esc(p.id) + '">' +
                GGL.icon('edit','ico') + '<span>Edit post</span></button><div class="menu-sep"></div>' +
                '<button type="button" class="menu-item danger" data-delete="' + U.esc(p.id) + '">' +
                GGL.icon('trash','ico') + '<span>Delete post</span></button>' : '') +
            '</div></div>' : '') +
        '</header>' +
        '<h3 class="post-title">' + U.esc(p.title) + '</h3>' +
        '<div class="post-body">' + U.esc(p.body) + '</div>' +
        (p.image ? '<img class="post-image" src="' + p.image + '" alt="Attached to: ' + U.esc(p.title) + '">' : '') +
        '<footer class="post-foot">' +
          '<button type="button" class="post-action' + (liked ? ' liked' : '') + '" ' +
          'data-like="' + U.esc(p.id) + '" aria-pressed="' + liked + '">' +
          GGL.icon('star','ico') + '<span data-like-count>' + p.likes + '</span>' +
          '<span class="sr-only">likes</span></button>' +
          '<button type="button" class="post-action" data-toggle-comments="' + U.esc(p.id) + '">' +
          GGL.icon('messageCircle','ico') + '<span>' + p.commentCount + '</span>' +
          '<span class="post-action-label">' + (p.commentCount === 1 ? 'comment' : 'comments') + '</span></button>' +
        '</footer>' +
        '<div class="post-comments" data-comments="' + U.esc(p.id) + '"' +
        (expanded[p.id] ? '' : ' hidden') + '></div></article>';
    }

    function renderComments(postId, container, me) {
      container.innerHTML = '<div class="skel skel-row"></div>';
      S.feed.commentsFor(postId).then(function (rows) {
        container.innerHTML = (rows.length ? rows.map(function (c) {
          var canDelete = c.authorId === me.id || me.role !== GGL.ROLES.END_USER;
          return '<div class="comment">' +
            '<span class="avatar avatar-sm">' + U.esc(U.initials(c.author)) + '</span>' +
            '<div class="grow"><div class="comment-head">' +
            '<strong>' + U.esc(c.author) + '</strong>' +
            '<span class="comment-role">' + U.esc(c.authorRole) + '</span>' +
            '<span class="comment-time">' + U.relative(c.createdAt) + '</span>' +
            (canDelete ? '<button type="button" class="btn-icon btn-sm comment-del" ' +
              'data-del-comment="' + U.esc(c.id) + '" aria-label="Delete comment">' +
              GGL.icon('trash','ico') + '</button>' : '') + '</div>' +
            '<div class="comment-body">' + U.esc(c.body) + '</div></div></div>';
        }).join('')
          : '<p class="text-sm text-muted" style="padding:var(--sp-2) 0">No comments yet. Be the first to reply.</p>') +
          '<form class="comment-form" data-comment-form="' + U.esc(postId) + '">' +
          '<span class="avatar avatar-sm">' + U.esc(U.initials(me.name)) + '</span>' +
          '<input class="input" name="body" placeholder="Write a comment…" ' +
          'aria-label="Write a comment" maxlength="500">' +
          '<button type="submit" class="btn btn-primary btn-sm">' +
          GGL.icon('send','ico') + '<span class="hide-sm">Post</span></button></form>';

        var form = container.querySelector('[data-comment-form]');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var input = form.elements.body, text = input.value.trim();
          if (!text) { UI.toast('Write something first', { type:'warning' }); return; }
          var btn = form.querySelector('button');
          btn.classList.add('is-loading'); btn.disabled = true;
          S.feed.addComment(postId, text).then(function () {
            input.value = '';
            renderComments(postId, container, me);
            var counter = document.querySelector('[data-toggle-comments="' + postId + '"] span');
            if (counter) counter.textContent = Number(counter.textContent) + 1;
            UI.toast('Comment posted', { type:'success', duration:1800 });
          }).catch(function (err) {
            btn.classList.remove('is-loading'); btn.disabled = false;
            UI.toast('Could not comment', { type:'error', desc:err.message });
          });
        });
        U.$$('[data-del-comment]', container).forEach(function (btn) {
          btn.addEventListener('click', function () {
            UI.confirm({ title:'Delete this comment?', message:'It will be removed from the post.',
              confirmLabel:'Delete',
              onConfirm:function () {
                return S.feed.deleteComment(btn.getAttribute('data-del-comment')).then(function () {
                  renderComments(postId, container, me);
                  var counter = document.querySelector('[data-toggle-comments="' + postId + '"] span');
                  if (counter) counter.textContent = Math.max(0, Number(counter.textContent) - 1);
                  UI.toast('Comment deleted', { type:'success', duration:1800 });
                });
              }});
          });
        });
      });
    }

    function load() {
      var me = S.auth.getUser();
      feedEl.innerHTML = '<div class="card card-pad mb-4"><div class="skel skel-title"></div>' +
        '<div class="skel skel-text w-100"></div><div class="skel skel-text w-80"></div></div>';
      return S.feed.timeline(state).then(function (rows) {
        if (!rows.length) {
          feedEl.innerHTML = '<div class="card">' + UI.empty({ icon:'megaphone',
            title: state.search || state.category !== 'all' ? 'No matching posts' : 'Nothing posted yet',
            message: state.search || state.category !== 'all'
              ? 'Try a different search or category.' : 'Announcements and updates will appear here.',
            action: canPublish() ? 'Write the first post' : null }) + '</div>';
          var act = feedEl.querySelector('[data-empty-action]');
          if (act) act.addEventListener('click', function () { openCompose(); });
          return;
        }
        feedEl.innerHTML = rows.map(function (p) { return postCard(p, me); }).join('');
        UI.initDropdowns();
        Object.keys(expanded).forEach(function (id) {
          if (!expanded[id]) return;
          var box = feedEl.querySelector('[data-comments="' + id + '"]');
          if (box) { box.hidden = false; renderComments(id, box, me); }
        });
        U.$$('[data-like]', feedEl).forEach(function (btn) {
          btn.addEventListener('click', function () {
            S.feed.toggleLike(btn.getAttribute('data-like')).then(function (res) {
              btn.classList.toggle('liked', res.liked);
              btn.setAttribute('aria-pressed', String(res.liked));
              btn.querySelector('[data-like-count]').textContent = res.likes;
            }).catch(function (err) {
              UI.toast('Could not register that', { type:'error', desc:err.message });
            });
          });
        });
        U.$$('[data-toggle-comments]', feedEl).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-toggle-comments');
            var box = feedEl.querySelector('[data-comments="' + id + '"]');
            var open = !box.hidden;
            box.hidden = open;
            expanded[id] = !open;
            if (!open) renderComments(id, box, me);
          });
        });
        U.$$('[data-pin]', feedEl).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-pin');
            var p = rows.filter(function (x) { return x.id === id; })[0];
            S.feed.togglePin(id, !p.pinned).then(function () {
              UI.toast(p.pinned ? 'Post unpinned' : 'Post pinned', { type:'success' });
              load();
            });
          });
        });
        U.$$('[data-edit]', feedEl).forEach(function (btn) {
          btn.addEventListener('click', function () {
            openCompose(rows.filter(function (x) { return x.id === btn.getAttribute('data-edit'); })[0]);
          });
        });
        U.$$('[data-delete]', feedEl).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var p = rows.filter(function (x) { return x.id === btn.getAttribute('data-delete'); })[0];
            UI.confirm({ title:'Delete this post?',
              message:'\u201C' + p.title + '\u201D and its comments will be removed from the feed.',
              confirmLabel:'Delete post',
              onConfirm:function () {
                return S.feed.remove(p.id).then(function () {
                  UI.toast('Post deleted', { type:'success' }); load();
                });
              }});
          });
        });
      });
    }

    var body = GGL.shell.mount({ active:'newsfeed', title:'Newsfeed',
      subtitle:'Announcements, updates and recognition from across the organisation.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Newsfeed' }],
      actions: canPublish() ? '<button type="button" class="btn btn-primary" data-compose>' +
        GGL.icon('plus','ico') + '<span>New post</span></button>' : '' });
    if (!body) return;

    body.innerHTML = '<div class="split-2-1"><div>' +
      '<div class="card mb-5"><div class="toolbar">' +
        '<div class="search"><label class="input-icon">' +
        '<span class="sr-only">Search the feed</span>' + GGL.icon('search','ico') +
        '<input type="search" class="input" data-feed-search placeholder="Search posts…"></label></div>' +
        '<select class="select" data-feed-cat><option value="all">All categories</option>' +
        CATEGORIES.map(function (c) { return '<option>' + c + '</option>'; }).join('') +
      '</select></div></div><div id="feed"></div></div><div id="feed-side"></div></div>';

    feedEl = document.getElementById('feed');

    S.feed.timeline({}).then(function (rows) {
      var byCat = U.groupBy(rows, 'category');
      var top = rows.slice().sort(function (a,b) {
        return (b.likes + b.commentCount) - (a.likes + a.commentCount);
      }).slice(0,4);
      document.getElementById('feed-side').innerHTML =
        (canPublish()
          ? '<div class="card card-pad mb-4"><strong class="text-sm">Posting as ' + U.esc(user.name) + '</strong>' +
            '<p class="text-xs text-muted mt-2 mb-4">Posts are visible to everyone on the platform, ' +
            'including learners.</p><button type="button" class="btn btn-primary btn-block btn-sm" data-compose-side>' +
            GGL.icon('plus','ico') + '<span>Write a post</span></button></div>'
          : '<div class="card card-pad mb-4"><strong class="text-sm">Reading the feed</strong>' +
            '<p class="text-xs text-muted mt-2" style="margin-bottom:0">You can like and comment on any ' +
            'post. Publishing is limited to administrators.</p></div>') +
        '<div class="card mb-4"><div class="card-head"><div><h3>Most discussed</h3>' +
        '<p class="sub">By reactions and comments</p></div></div><div class="card-body">' +
        (top.length ? '<ul class="session-list">' + top.map(function (p) {
          return '<li style="padding:var(--sp-3) 0"><span class="session-info">' +
            '<h4 class="truncate">' + U.esc(p.title) + '</h4><span class="meta">' +
            '<span>' + GGL.icon('star','ico') + p.likes + '</span>' +
            '<span>' + GGL.icon('messageCircle','ico') + p.commentCount + '</span></span></span></li>';
        }).join('') + '</ul>' : '<p class="text-sm text-muted">Nothing yet.</p>') + '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Categories</h3></div></div>' +
        '<div class="card-body"><div class="row gap-2 wrap">' +
        Object.keys(byCat).map(function (c) {
          return '<button type="button" class="chip" data-cat-chip="' + U.esc(c) + '">' +
            U.esc(c) + ' <strong>' + byCat[c].length + '</strong></button>';
        }).join('') + '</div></div></div>';

      var sideBtn = document.querySelector('[data-compose-side]');
      if (sideBtn) sideBtn.addEventListener('click', function () { openCompose(); });
      U.$$('[data-cat-chip]').forEach(function (chip) {
        chip.addEventListener('click', function () {
          state.category = chip.getAttribute('data-cat-chip');
          document.querySelector('[data-feed-cat]').value = state.category;
          load();
        });
      });
    });

    var search = document.querySelector('[data-feed-search]');
    search.addEventListener('input', U.debounce(function () { state.search = search.value; load(); }, 280));
    document.querySelector('[data-feed-cat]').addEventListener('change', function () {
      state.category = this.value; load();
    });
    var compose = document.querySelector('[data-compose]');
    if (compose) compose.addEventListener('click', function () { openCompose(); });
    load();
  };

  /* ============================ SIMPLE PAGES =========================== */
  P.learning = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var filter = 'all', rows = [];
    var body = GGL.shell.mount({ active:'learning', title:'My learning',
      subtitle:'Everything assigned to you, in one place.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'My learning' }],
      actions:'<a class="btn btn-secondary" href="' + GGL.url('app/calendar.html') + '">' +
        GGL.icon('calendar','ico') + '<span>My calendar</span></a>' });
    if (!body) return;

    body.innerHTML = '<div class="grid grid-4 mb-6" id="l-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="card mb-5"><div class="toolbar">' +
        '<div class="segmented" role="group" aria-label="Filter courses">' +
        ['all','In Progress','Not Started','Completed'].map(function (f) {
          return '<button type="button" data-filter="' + U.esc(f) + '" aria-pressed="' +
            (filter === f) + '">' + (f === 'all' ? 'All' : f) + '</button>';
        }).join('') + '</div><div class="grow"></div>' +
        '<span class="text-sm text-muted" id="l-count"></span></div></div>' +
      '<div id="l-grid"></div>';

    var grid = document.getElementById('l-grid');
    function draw() {
      var filtered = filter === 'all' ? rows : rows.filter(function (c) { return c.status === filter; });
      document.getElementById('l-count').textContent = filtered.length + ' course' +
        (filtered.length === 1 ? '' : 's');
      if (!filtered.length) {
        grid.innerHTML = '<div class="card">' + UI.empty({ icon:'bookOpen', title:'Nothing here',
          message: filter === 'all' ? 'You have no assigned learning yet.'
            : 'No courses with the status \u201C' + filter + '\u201D.' }) + '</div>';
        return;
      }
      grid.innerHTML = '<div class="grid grid-4">' + filtered.map(function (c, i) {
        var variant = ['','v2','v3','v4'][i % 4];
        var overdue = c.status !== 'Completed' && new Date(c.dueDate) < new Date();
        return '<article class="card course-card"><div class="course-thumb ' + variant + '">' +
          '<span class="cat">' + U.esc(c.category) + '</span>' +
          GGL.icon(c.delivery === 'E-Learning' ? 'video' : c.delivery === 'Blended' ? 'layers' : 'users','ico') +
          '</div><div class="course-body"><div class="row-between gap-2 mb-2">' +
          U.statusBadge(c.status) +
          (c.mandatory ? '<span class="badge badge-warning">Mandatory</span>' : '') + '</div>' +
          '<h3>' + U.esc(c.title) + '</h3><div class="course-meta">' +
          '<span>' + GGL.icon('user','ico') + U.esc(c.instructor.split(' ')[0]) + '</span>' +
          '<span>' + GGL.icon('clock','ico') + U.duration(c.durationMins) + '</span>' +
          '<span>' + GGL.icon('layers','ico') + c.lessonsDone + '/' + c.lessons + '</span></div>' +
          '<div class="course-foot"><div class="row-between mb-2">' +
          '<span class="text-xs text-muted">' + (c.status === 'Completed' ? 'Completed' : 'Due ' + U.date(c.dueDate)) + '</span>' +
          (overdue ? '<span class="badge badge-danger">Overdue</span>' : '') + '</div>' +
          U.progressCell(c.progress) +
          (c.status === 'Completed'
            ? '<a class="btn btn-secondary btn-sm btn-block mt-3" href="' + GGL.url('app/certificates.html') + '">' +
              GGL.icon('award','ico') + '<span>View certificate</span></a>'
            : '<button type="button" class="btn btn-primary btn-sm btn-block mt-3" data-continue="' + U.esc(c.id) + '">' +
              GGL.icon('play','ico') + '<span>' + (c.progress ? 'Continue' : 'Start course') + '</span></button>') +
          '</div></div></article>';
      }).join('') + '</div>';
      U.$$('[data-continue]', grid).forEach(function (btn) {
        btn.addEventListener('click', function () {
          btn.classList.add('is-loading');
          S.learning.advance(btn.getAttribute('data-continue'), 15).then(function (res) {
            UI.toast(res.progress === 100 ? 'Course completed' : 'Progress saved', { type:'success',
              desc: res.progress === 100 ? 'Well done — your certificate is now available.'
                : 'You are now at ' + res.progress + '%.' });
            load();
          });
        });
      });
    }
    function load() {
      return Promise.all([S.learning.myLearning(), S.learning.progress()]).then(function (res) {
        rows = res[0];
        var p = res[1];
        document.getElementById('l-stats').innerHTML =
          stat('Assigned', p.assigned, 'book', '') +
          stat('In progress', p.inProgress, 'play', 'teal') +
          stat('Completed', p.completed, 'checkCircle', 'green') +
          stat('Certificates', p.certificates, 'award', 'amber');
        draw();
      });
    }
    U.$$('[data-filter]', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        filter = btn.getAttribute('data-filter');
        U.$$('[data-filter]', body).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        draw();
      });
    });
    UI.async(grid, '<div class="grid grid-4">' + UI.skeletonCards(8) + '</div>', load);
  };

  P.notifications = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var filter = 'all', rows = [];
    var LABELS = { training_reminder:'Training reminder', course_assigned:'Course assignment',
      assessment_due:'Assessment due', certificate:'Certificate', request_update:'Request update',
      announcement:'Announcement', system:'System' };
    var body = GGL.shell.mount({ active:'notifications', title:'Notifications',
      subtitle:'Reminders, assignments and platform updates.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Notifications' }],
      actions:'<button type="button" class="btn btn-secondary" data-mark-all>' +
        GGL.icon('checkSquare','ico') + '<span>Mark all read</span></button>' });
    if (!body) return;
    body.innerHTML = '<div class="card mb-5"><div class="toolbar">' +
      '<div class="segmented" role="group" aria-label="Filter notifications">' +
      ['all','unread','read'].map(function (f) {
        return '<button type="button" data-nfilter="' + f + '" aria-pressed="' + (filter === f) + '">' +
          f.charAt(0).toUpperCase() + f.slice(1) + '</button>';
      }).join('') + '</div><div class="grow"></div>' +
      '<span class="text-sm text-muted" id="n-count"></span></div></div><div id="n-list"></div>';
    var list = document.getElementById('n-list');
    function draw() {
      var filtered = filter === 'all' ? rows
        : rows.filter(function (n) { return filter === 'unread' ? !n.read : n.read; });
      var unread = rows.filter(function (n) { return !n.read; }).length;
      document.getElementById('n-count').textContent = unread + ' unread of ' + rows.length;
      if (!filtered.length) {
        list.innerHTML = '<div class="card">' + UI.empty({ icon:'bell',
          title: filter === 'unread' ? 'You are all caught up' : 'Nothing here',
          message: filter === 'unread' ? 'No unread notifications.'
            : 'Notifications will appear here as training is assigned and scheduled.' }) + '</div>';
        return;
      }
      list.innerHTML = '<div class="card">' + filtered.map(function (n) {
        return '<article class="notif-item' + (n.read ? '' : ' unread') + '">' +
          '<span class="ring">' + GGL.icon(n.icon,'ico') + '</span>' +
          '<div class="grow"><div class="nt">' + U.esc(n.title) + '</div>' +
          '<div class="nb">' + U.esc(n.body) + '</div>' +
          '<div class="row gap-2 mt-2"><span class="badge badge-plain">' +
          U.esc(LABELS[n.type] || n.type) + '</span>' +
          (n.read ? '' : '<span class="badge badge-accent">Unread</span>') + '</div></div>' +
          '<div class="stack gap-2" style="align-items:flex-end">' +
          '<span class="nw">' + U.relative(n.at) + '</span>' +
          '<button type="button" class="btn-icon btn-sm" data-toggle-read="' + U.esc(n.id) + '" ' +
          'aria-label="' + (n.read ? 'Mark as unread' : 'Mark as read') + '">' +
          GGL.icon(n.read ? 'inbox' : 'check','ico') + '</button></div></article>';
      }).join('') + '</div>';
      U.$$('[data-toggle-read]', list).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-toggle-read');
          var row = rows.filter(function (n) { return n.id === id; })[0];
          S.notifications.update(id, { read: !row.read }).then(function () {
            row.read = !row.read; draw();
          });
        });
      });
    }
    function load() { return S.notifications.all().then(function (res) { rows = res; draw(); }); }
    U.$$('[data-nfilter]', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        filter = btn.getAttribute('data-nfilter');
        U.$$('[data-nfilter]', body).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        draw();
      });
    });
    document.querySelector('[data-mark-all]').addEventListener('click', function () {
      var btn = this;
      btn.classList.add('is-loading');
      S.notifications.markAllRead().then(function () {
        btn.classList.remove('is-loading');
        UI.toast('All notifications marked read', { type:'success' });
        load();
      });
    });
    UI.async(list, '<div class="card card-pad"><div class="skel skel-row"></div></div>', load);
  };

  P.settings = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var body = GGL.shell.mount({ active:'settings', title:'Settings',
      subtitle:'Your profile, appearance, notifications and account.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Settings' }] });
    if (!body) return;
    var TABS = ['Profile','Appearance','Account'];
    body.innerHTML = '<div class="tabs mb-5" role="tablist" aria-label="Settings sections">' +
      TABS.map(function (t, i) {
        return '<button type="button" class="tab" role="tab" id="st-t' + i + '" ' +
          'aria-controls="st-p' + i + '" aria-selected="' + (i === 0) + '">' + t + '</button>';
      }).join('') + '</div>' +
      '<div id="st-p0" role="tabpanel" aria-labelledby="st-t0">' +
        '<div class="card"><div class="card-head"><div><h3>Profile</h3>' +
        '<p class="sub">How you appear across the platform</p></div></div><div class="card-body">' +
        '<div class="row gap-4 mb-6 wrap"><span class="avatar avatar-xl">' +
        U.esc(U.initials(user.name)) + '</span>' +
        '<div><button type="button" class="btn btn-secondary btn-sm" data-upload-photo>' +
        GGL.icon('upload','ico') + '<span>Upload photo</span></button>' +
        '<p class="hint mt-2" style="margin:0">Upload is not implemented in this phase.</p></div></div>' +
        '<form id="profile-form" novalidate><div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="pf-name">Full name <span class="req">*</span></label>' +
        '<input class="input" id="pf-name" name="name" value="' + U.esc(user.name) + '"></div>' +
        '<div class="field"><label class="label" for="pf-email">Email <span class="req">*</span></label>' +
        '<input class="input" id="pf-email" name="email" type="email" value="' + U.esc(user.email) + '"></div></div>' +
        '<div class="grid grid-2 gap-4">' +
        '<div class="field"><label class="label" for="pf-title">Role title</label>' +
        '<input class="input" id="pf-title" name="title" value="' + U.esc(user.title || '') + '"></div>' +
        '<div class="field"><label class="label" for="pf-phone">Phone</label>' +
        '<input class="input" id="pf-phone" name="phone" type="tel" value="' + U.esc(user.phone || '') + '"></div></div>' +
        '<button type="submit" class="btn btn-primary mt-4">Save changes</button></form></div></div></div>' +
      '<div id="st-p1" role="tabpanel" aria-labelledby="st-t1" hidden>' +
        '<div class="card"><div class="card-head"><div><h3>Appearance</h3>' +
        '<p class="sub">Theme applies immediately and is remembered on this device</p></div></div>' +
        '<div class="card-body"><div class="field"><span class="label">Theme</span>' +
        '<div class="segmented" role="group" aria-label="Theme preference">' +
        [['light','Light'],['dark','Dark'],['system','System']].map(function (t) {
          return '<button type="button" data-theme-pref="' + t[0] + '" aria-pressed="' +
            (GGL.theme.preference === t[0]) + '">' + t[1] + '</button>';
        }).join('') + '</div>' +
        '<span class="hint">\u201CSystem\u201D follows your operating system setting.</span></div></div></div></div>' +
      '<div id="st-p2" role="tabpanel" aria-labelledby="st-t2" hidden>' +
        '<div class="alert alert-warning mb-5">' + GGL.icon('alert','ico') + '<div class="text-sm">' +
        '<strong>Authentication in this build is mocked.</strong> Password management will be handled ' +
        'by the identity provider in a later phase.</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Prototype data</h3>' +
        '<p class="sub">Everything you create is stored in this browser only</p></div></div>' +
        '<div class="card-body"><p class="text-sm text-muted">Records you add, edit or delete are kept ' +
        'in local storage so the prototype survives a refresh. Resetting restores the original sample data.</p>' +
        '<button type="button" class="btn btn-danger-ghost" data-reset-data>' +
        GGL.icon('refresh','ico') + '<span>Reset prototype data</span></button></div></div></div>';

    UI.initTabs(body);
    UI.handleSubmit(document.getElementById('profile-form'), {
      name:[U.validators.required, U.validators.min(2)],
      email:[U.validators.required, U.validators.email]
    }, function (v) {
      return S.users.update(user.id, { name:v.name, email:v.email, title:v.title, phone:v.phone });
    }, { reset:false, success:'Profile updated', successDesc:'Reload to see it in the sidebar.' });

    document.querySelector('[data-upload-photo]').addEventListener('click', function () {
      UI.toast('Upload not available', { type:'info', desc:'File storage is planned for a later phase.' });
    });
    U.$$('[data-theme-pref]', body).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pref = btn.getAttribute('data-theme-pref');
        GGL.theme.set(pref);
        U.$$('[data-theme-pref]', body).forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        UI.toast('Theme set to ' + pref, { type:'success', duration:1800 });
      });
    });
    document.querySelector('[data-reset-data]').addEventListener('click', function () {
      UI.confirm({ title:'Reset prototype data?',
        message:'All records you have created, edited or deleted will be discarded and the original ' +
          'sample data restored.',
        detail:'Your theme preference is kept.', confirmLabel:'Reset data',
        onConfirm:function () {
          return U.delay(500).then(function () {
            GGL.resetPrototypeData();
            UI.toast('Prototype data reset', { type:'success', desc:'Reloading…' });
            setTimeout(function () { window.location.reload(); }, 900);
          });
        }});
    });
  };

  P.reports = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    if (user.role === GGL.ROLES.END_USER && user.workspaceType !== 'individual') {
      var b0 = GGL.shell.mount({ active:'reports', title:'Reports',
        breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Reports' }] });
      if (b0) b0.innerHTML = denied('The reporting centre is available to administrators.');
      return;
    }
    var lastRendered = { columns:[], rows:[] };

    function pickSeries(report) {
      var d = GGL.data;
      if (/Attendance/.test(report.name)) {
        return { chart:C.donut(d.series.attendanceSplit, { size:160, stroke:24, label:'Attendance split' }),
          head:['Status','Records','Share'],
          body:d.series.attendanceSplit.map(function (s) {
            return [U.esc(s.label), U.num(s.value * 12), s.value + '%'];
          })};
      }
      if (/Trainer/.test(report.name)) {
        var trainers = d.trainers.slice(0,8);
        return { chart:C.hbars(trainers.map(function (t) {
            return { label:t.name, value:Math.round(t.effectiveness) };
          }), { suffix:'%' }),
          head:['Trainer','Sessions','Hours','Effectiveness'],
          body:trainers.map(function (t) {
            return [U.esc(t.name), U.num(t.sessionsDelivered), U.num(t.trainingHours),
              U.progressCell(Math.round(t.effectiveness))];
          })};
      }
      if (/Competency/.test(report.name)) {
        return { chart:C.hbars(d.competencies.map(function (c) {
            return { label:c.name, value:c.gap,
              color: c.gap >= 2 ? 'var(--viz-6)' : c.gap === 1 ? 'var(--viz-3)' : 'var(--viz-5)' };
          }), { suffix:' levels' }),
          head:['Competency','Current','Required','Gap','Priority'],
          body:d.competencies.map(function (c) {
            return [U.esc(c.name), c.current + '/5', c.required + '/5', String(c.gap),
              U.statusBadge(c.priority)];
          })};
      }
      if (/Learning Hours/.test(report.name)) {
        var total = U.sum(d.series.hoursByMode, 'value');
        return { chart:C.bar(d.series.hoursByMode, { height:220, color:'var(--viz-2)', label:'Learning hours' }),
          head:['Delivery mode','Hours','Share'],
          body:d.series.hoursByMode.map(function (m) {
            return [U.esc(m.label), U.num(m.value), Math.round(m.value / total * 100) + '%'];
          })};
      }
      if (/Effectiveness/.test(report.name)) {
        return { chart:C.line(d.series.effectivenessTrend, { height:220, color:'var(--viz-4)',
            label:'Effectiveness', zeroBased:false }),
          head:['Course','Responses','Pre','Post','Gain'],
          body:d.effectiveness.slice(0,8).map(function (e) {
            return [U.esc(e.course), U.num(e.responses), e.preScore + '%', e.postScore + '%', '+' + e.gain];
          })};
      }
      if (/Batch|Graduation/.test(report.name)) {
        var batches = d.batches.slice(0,8);
        return { chart:C.bar(batches.map(function (b, i) {
            return { label:'B' + (i+1), value:b.completion };
          }), { height:220, suffix:'%', label:'Batch completion' }),
          head:['Batch','Programme','Trainees','Completion'],
          body:batches.map(function (b) {
            return [U.esc(b.name), U.esc(b.programme), String(b.trainees), U.progressCell(b.completion)];
          })};
      }
      var courses = d.courses.filter(function (c) { return c.status === 'Published'; }).slice(0,8);
      return { chart:C.line(d.series.completion, { height:220, suffix:'%', label:'Completion trend' }),
        head:['Course','Category','Enrolled','Completed','Rate'],
        body:courses.map(function (c) {
          return [U.esc(c.title), U.esc(c.category), U.num(c.enrolled), U.num(c.completed),
            U.progressCell(c.completionRate)];
        })};
    }

    function openReport(report) {
      var h = UI.modal({ title:report.name, subtitle:report.description, size:'xl',
        body:'<form id="rp-filters" class="card card-pad mb-5"><div class="grid grid-4 gap-3">' +
          '<div class="field" style="margin:0"><label class="label" for="rp-from">From</label>' +
            '<input class="input" id="rp-from" name="from" type="date" value="' +
            new Date(Date.now() - 90 * 86400000).toISOString().slice(0,10) + '"></div>' +
          '<div class="field" style="margin:0"><label class="label" for="rp-to">To</label>' +
            '<input class="input" id="rp-to" name="to" type="date" value="' +
            new Date().toISOString().slice(0,10) + '"></div>' +
          '<div class="field" style="margin:0"><label class="label" for="rp-dept">Department</label>' +
            '<select class="select" id="rp-dept" name="department"><option value="all">All departments</option>' +
            GGL.seed.DEPTS.map(function (d) { return '<option>' + U.esc(d) + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="field" style="margin:0"><label class="label" for="rp-group">Group by</label>' +
            '<select class="select" id="rp-group" name="groupBy"><option>Month</option>' +
            '<option>Department</option><option>Course</option></select></div></div>' +
          '<div class="row gap-3 mt-4">' +
          '<button type="submit" class="btn btn-primary btn-sm">' + GGL.icon('refresh','ico') +
          '<span>Apply filters</span></button></div></form><div id="rp-output"></div>',
        footer:'<span class="text-xs text-subtle grow" style="align-self:center">Exports the filtered result set</span>' +
          '<button type="button" class="btn btn-secondary" data-export="PDF">' +
          GGL.icon('download','ico') + '<span>PDF</span></button>' +
          '<button type="button" class="btn btn-secondary" data-export="Excel">' +
          GGL.icon('download','ico') + '<span>Excel</span></button>' +
          '<button type="button" class="btn btn-primary" data-export="CSV">' +
          GGL.icon('download','ico') + '<span>CSV</span></button>' });

      var output = h.overlay.querySelector('#rp-output');
      var filters = h.overlay.querySelector('#rp-filters');

      function run(values) {
        output.innerHTML = '<div class="card card-pad"><div class="skel skel-chart"></div></div>';
        S.reports.run(report.id, values || {}).then(function (res) {
          var series = pickSeries(report);
          lastRendered = { columns:series.head.map(function (hd, i) {
            return { label:hd, value:function (row) { return row[i]; } };
          }), rows:series.body };
          output.innerHTML = '<div class="row-between mb-4 wrap gap-3">' +
            '<div><strong>' + U.num(res.rows) + '</strong> <span class="text-muted">records matched</span></div>' +
            '<span class="text-xs text-subtle">Generated ' + U.date(res.generatedAt) + ', ' +
            U.time(res.generatedAt) + '</span></div>' +
            '<div class="card card-pad mb-4">' + series.chart + '</div>' +
            '<div class="card"><div class="table-wrap"><table class="table"><thead><tr>' +
            series.head.map(function (hd) { return '<th>' + U.esc(hd) + '</th>'; }).join('') +
            '</tr></thead><tbody>' + series.body.map(function (row) {
              return '<tr>' + row.map(function (cell, i) {
                return '<td' + (i === 0 ? ' class="cell-primary"' : '') + '>' + cell + '</td>';
              }).join('') + '</tr>';
            }).join('') + '</tbody></table></div></div>';
        }).catch(function (err) {
          output.innerHTML = UI.error({ message:err.message });
        });
      }
      filters.addEventListener('submit', function (e) {
        e.preventDefault();
        var values = {};
        U.$$('input,select', filters).forEach(function (i) { values[i.name] = i.value; });
        if (values.from && values.to && values.from > values.to) {
          UI.toast('The "from" date is after the "to" date', { type:'error' }); return;
        }
        run(values);
        UI.toast('Filters applied', { type:'success', duration:2000 });
      });
      U.$$('[data-export]', h.overlay).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var format = btn.getAttribute('data-export');
          btn.classList.add('is-loading');
          S.reports.export(report.id, format, lastRendered).then(function (res) {
            btn.classList.remove('is-loading');
            UI.toast(format + (res.printed ? ' ready to print' : ' export downloaded'), { type:'success',
              desc: res.printed ? 'Use your browser\u2019s print dialog to save it as a PDF.'
                : res.rows + ' rows written to ' + res.file + '.' });
          }).catch(function (err) {
            btn.classList.remove('is-loading');
            UI.toast('Export failed', { type:'error', desc:err.message });
          });
        });
      });
      run({});
    }

    var body = GGL.shell.mount({ active:'reports', title:'Reports',
      subtitle:'Run, filter and export the reports your audits and reviews need.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Reports' }] });
    if (!body) return;
    body.innerHTML = '<div class="card mb-5"><div class="toolbar">' +
      '<div class="search"><label class="input-icon"><span class="sr-only">Search reports</span>' +
      GGL.icon('search','ico') + '<input type="search" class="input" id="rep-search" ' +
      'placeholder="Search reports…"></label></div>' +
      '<select class="select" id="rep-cat"><option value="all">Category: All</option>' +
      '<option>Operations</option><option>Quality</option><option>People</option></select></div></div>' +
      '<div id="rep-grid"></div>';

    var grid = document.getElementById('rep-grid'), all = [];
    function draw() {
      var q = document.getElementById('rep-search').value.toLowerCase().trim();
      var cat = document.getElementById('rep-cat').value;
      var rows = all.filter(function (r) {
        return (!q || (r.name + ' ' + r.description).toLowerCase().indexOf(q) !== -1) &&
          (cat === 'all' || r.category === cat);
      });
      if (!rows.length) {
        grid.innerHTML = '<div class="card">' + UI.empty({ icon:'search', title:'No reports match',
          message:'Try a different search term or category.' }) + '</div>';
        return;
      }
      grid.innerHTML = '<div class="grid grid-3">' + rows.map(function (r, i) {
        return '<article class="card card-interactive report-card feature-card tone-' + ((i % 8) + 1) + '">' +
          '<div class="feature-icon">' + GGL.icon(r.icon,'ico') + '</div>' +
          '<h3>' + U.esc(r.name) + '</h3><p>' + U.esc(r.description) + '</p>' +
          '<div class="row-between mt-4"><span class="text-xs text-subtle">Last run ' +
          U.relative(r.lastRun) + '</span>' +
          '<span class="badge badge-plain">' + U.esc(r.category) + '</span></div>' +
          '<button type="button" class="btn btn-secondary btn-sm btn-block mt-4" data-run="' + U.esc(r.id) + '">' +
          GGL.icon('play','ico') + '<span>Run report</span></button></article>';
      }).join('') + '</div>';
      U.$$('[data-run]', grid).forEach(function (btn) {
        btn.addEventListener('click', function () {
          openReport(all.filter(function (r) { return r.id === btn.getAttribute('data-run'); })[0]);
        });
      });
    }
    UI.async(grid, '<div class="grid grid-3">' + UI.skeletonCards(6) + '</div>', function () {
      return S.reports.catalogue().then(function (rows) { all = rows; draw(); });
    });
    document.getElementById('rep-search').addEventListener('input', U.debounce(draw, 250));
    document.getElementById('rep-cat').addEventListener('change', draw);
  };

  P.gamification = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var isAdmin = user.role !== GGL.ROLES.END_USER;
    function medal(rank) {
      if (rank === 1) return '<span class="rank-medal gold">1</span>';
      if (rank === 2) return '<span class="rank-medal silver">2</span>';
      if (rank === 3) return '<span class="rank-medal bronze">3</span>';
      return '<span class="rank-medal">' + rank + '</span>';
    }
    var body = GGL.shell.mount({ active:'gamification',
      title: isAdmin ? 'Engagement & gamification' : 'My achievements',
      subtitle: isAdmin ? 'Points, badges and the leaderboard — every point traces to a learning event.'
        : 'Your points, badges, challenges and standing against your peers.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Gamification' }],
      actions:'<a class="btn btn-secondary" href="' + GGL.url('app/assessments.html') + '">' +
        GGL.icon('checkSquare','ico') + '<span>Earn points</span></a>' });
    if (!body) return;

    body.innerHTML = '<div id="gm-hero"></div>' +
      '<div class="grid grid-4 mb-6" id="gm-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-2-1 mb-6"><div id="gm-lb"></div><div id="gm-side"></div></div>' +
      '<div class="split-1-1"><div id="gm-badges"></div><div id="gm-ch"></div></div>';

    UI.async(document.getElementById('gm-stats'), UI.skeletonCards(4), function () {
      return Promise.all([S.gamification.standing(user.id), S.gamification.leaderboard(),
        S.gamification.badgesFor(user.id)]).then(function (res) {
        var me = res[0], board = res[1], badges = res[2];
        var earned = badges.filter(function (b) { return b.earned; }).length;
        if (isAdmin) {
          document.getElementById('gm-stats').innerHTML =
            stat('Participants', U.num(board.length), 'users', '') +
            stat('Points awarded', U.num(U.sum(board,'points')), 'zap', 'amber') +
            stat('Certificates earned', U.num(U.sum(board,'certificates')), 'award', 'green') +
            stat('Assessments taken', U.num(U.sum(board,'assessments')), 'checkSquare', 'teal');
        } else {
          document.getElementById('gm-hero').innerHTML =
            '<div class="welcome"><h2>You are ranked #' + me.rank + ' of ' + me.total + '</h2>' +
            '<p>' + (me.percentile >= 75
              ? 'That puts you in the top ' + (100 - me.percentile + 1) + '% of learners. Strong work.'
              : 'Submit assessments and earn certificates to climb the board.') + '</p>' +
            '<div class="welcome-meta">' +
            '<span class="item"><span class="v">' + U.num(me.points) + '</span><span class="k">Points</span></span>' +
            '<span class="item"><span class="v">' + earned + '/' + badges.length + '</span><span class="k">Badges</span></span>' +
            '<span class="item"><span class="v">' + me.certificates + '</span><span class="k">Certificates</span></span>' +
            '<span class="item"><span class="v">' + me.assessments + '</span><span class="k">Assessments</span></span>' +
            '</div></div>';
          document.getElementById('gm-stats').innerHTML =
            stat('My points', U.num(me.points), 'zap', 'amber') +
            stat('My rank', '#' + me.rank, 'trophy', '') +
            stat('Badges earned', earned + ' / ' + badges.length, 'star', 'violet') +
            stat('Percentile', me.percentile + 'th', 'trending', 'green');
        }
      });
    });

    GGL.DataTable(document.getElementById('gm-lb'), {
      searchPlaceholder:'Search the leaderboard…', pageSize:10, defaultSort:'rank',
      columns:[
        { key:'rank', label:'Rank', sortable:true, width:'80px',
          render:function (r) { return medal(r.rank); }},
        { key:'name', label:'Learner', sortable:true, primary:true,
          render:function (r) {
            var you = r.userId === user.id ? ' <span class="badge badge-accent">You</span>' : '';
            return '<div class="row gap-3"><span class="avatar avatar-sm">' +
              U.esc(U.initials(r.name)) + '</span><span><span class="fw-medium">' + U.esc(r.name) + '</span>' +
              you + '<div class="text-xs text-muted">' + U.esc(r.department) + '</div></span></div>';
          }},
        { key:'assessments', label:'Assessments', sortable:true, align:'right', hideBelow:'md',
          render:function (r) { return U.num(r.assessments); }},
        { key:'certificates', label:'Certificates', sortable:true, align:'right', hideBelow:'md',
          render:function (r) { return U.num(r.certificates); }},
        { key:'badges', label:'Badges', sortable:true, align:'right', hideBelow:'lg',
          render:function (r) { return r.badges + ' / ' + GGL.data.badgeCatalogue.length; }},
        { key:'points', label:'Points', sortable:true, align:'right',
          render:function (r) { return '<strong>' + U.num(r.points) + '</strong>'; }}],
      fetch:function (q) {
        return S.gamification.leaderboard().then(function (rows) {
          var filtered = rows;
          if (q.search) filtered = U.search(filtered, q.search, ['name','department','employeeId']);
          if (q.sort) filtered = U.sort(filtered, q.sort, q.dir);
          var page = U.paginate(filtered, q.page, q.size);
          page.all = filtered;
          return page;
        });
      },
      empty:{ icon:'trophy', title:'No activity yet',
        message:'Points appear once learners submit assessments.' }
    });

    UI.async(document.getElementById('gm-side'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      if (isAdmin) {
        return S.gamification.breakdown().then(function (rows) {
          document.getElementById('gm-side').innerHTML = card('Points by source',
            'What learners are being rewarded for',
            C.donut(rows, { size:160, stroke:24, label:'Points by source' }));
        });
      }
      return S.gamification.standing(user.id).then(function (st) {
        document.getElementById('gm-side').innerHTML = card('Recent points', 'Your latest activity',
          st.ledger.length ? '<ul class="timeline">' + st.ledger.slice(0,8).map(function (p) {
            return '<li><span class="dot">' + GGL.icon('zap','ico') + '</span>' +
              '<span class="body"><strong>+' + p.points + '</strong> ' + U.esc(p.reason) +
              '<span class="time">' + U.relative(p.at) + '</span></span></li>';
          }).join('') + '</ul>'
            : UI.empty({ icon:'zap', title:'No points yet', message:'Submit an assessment to get started.' }));
      });
    });
    UI.async(document.getElementById('gm-badges'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.gamification.badgesFor(user.id).then(function (badges) {
        var earned = badges.filter(function (b) { return b.earned; }).length;
        document.getElementById('gm-badges').innerHTML = card(
          isAdmin ? 'Badge catalogue' : 'My badges',
          isAdmin ? 'Criteria are evaluated against real activity' : earned + ' of ' + badges.length + ' earned',
          '<div class="badge-grid">' + badges.map(function (b) {
            return '<div class="badge-tile' + (b.earned ? '' : ' locked') + '" title="' + U.esc(b.desc) + '">' +
              '<span class="ring">' + GGL.icon(b.earned ? b.icon : 'lock','ico') + '</span>' +
              '<div class="nm">' + U.esc(b.name) + '</div>' +
              '<div class="ds">' + U.esc(b.desc) + '</div></div>';
          }).join('') + '</div>');
      });
    });
    UI.async(document.getElementById('gm-ch'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.gamification.challengesFor(user.id).then(function (rows) {
        document.getElementById('gm-ch').innerHTML = card('Active challenges',
          'Time-bound goals with bonus points',
          rows.map(function (c) {
            return '<div class="card card-pad mb-3"><div class="row gap-3 mb-3">' +
              '<span class="stat-icon ' + (c.complete ? 'green' : 'amber') + '">' +
              GGL.icon(c.icon,'ico') + '</span>' +
              '<div class="grow"><div class="row-between gap-2">' +
              '<strong class="text-sm">' + U.esc(c.name) + '</strong>' +
              '<span class="badge ' + (c.complete ? 'badge-success' : 'badge-accent') + '">+' +
              c.reward + ' pts</span></div>' +
              '<div class="text-xs text-muted">' + U.esc(c.desc) + '</div></div></div>' +
              U.progressCell(c.pct) + '<div class="row-between mt-2">' +
              '<span class="text-xs text-muted">' + c.progress + ' of ' + c.target + '</span>' +
              '<span class="text-xs text-subtle">Ends ' + U.date(c.endsAt) + '</span></div></div>';
          }).join('') +
          '<p class="hint">Challenge progress is derived from your assessment and certificate activity.</p>');
      });
    });
  };

  /* ======================= GENERIC MODULE RUNNER ========================
     The remaining modules share one shape: stats, two charts, a table and a
     detail dialog. Declaring them as data keeps eleven screens consistent
     without eleven near-identical files.                                   */
  var MODULES = {};

  MODULES.courses = {
    active:'courses', title:'Courses', crumb:'Courses',
    subtitle:'Design, publish and manage the learning catalogue.',
    service:function () { return S.courses; }, exportName:'course-catalogue',
    columns:[{ key:'title', label:'Course' }, { key:'category', label:'Category' },
      { key:'delivery', label:'Delivery' }, { key:'level', label:'Level' },
      { key:'instructor', label:'Instructor' }, { key:'enrolled', label:'Enrolled' },
      { key:'completionRate', label:'Completion %' }, { key:'status', label:'Status' }],
    stats:function () {
      return S.courses.all().then(function (rows) {
        return stat('Courses', U.num(rows.length), 'book', '') +
          stat('Published', U.num(rows.filter(function (c) { return c.status === 'Published'; }).length), 'checkCircle', 'green') +
          stat('Total enrolments', U.num(U.sum(rows,'enrolled')), 'users', 'teal') +
          stat('Avg completion', Math.round(U.avg(rows,'completionRate')) + '%', 'trending', 'violet');
      });
    },
    charts:function () {
      return S.courses.all().then(function (rows) {
        var byCat = U.groupBy(rows, 'category');
        return [
          card('Enrolment by course', 'Most subscribed programmes',
            C.hbars(rows.slice().sort(function (a,b) { return b.enrolled - a.enrolled; })
              .slice(0,8).map(function (c) { return { label:c.title, value:c.enrolled }; }))),
          card('Catalogue by category', 'Coverage across capability areas',
            C.donut(Object.keys(byCat).slice(0,7).map(function (k) {
              return { label:k, value:byCat[k].length };
            }), { size:160, stroke:24, label:'Courses by category' }))];
      });
    },
    table:{ searchPlaceholder:'Search courses, categories or instructors…',
      defaultSort:'title',
      filters:[{ key:'status', label:'Status', options:['Published','Draft','Archived']
        .map(function (x) { return { value:x, label:x }; })},
        { key:'delivery', label:'Delivery', options:['E-Learning','Instructor-Led','Blended']
          .map(function (x) { return { value:x, label:x }; })}],
      columns:[
        { key:'title', label:'Course', sortable:true, primary:true,
          render:function (r) {
            return '<div class="fw-medium">' + U.esc(r.title) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.category) + ' · ' + U.esc(r.level) + '</div>';
          }},
        { key:'delivery', label:'Delivery', sortable:true, hideBelow:'md' },
        { key:'instructor', label:'Instructor', sortable:true, hideBelow:'lg' },
        { key:'durationMins', label:'Duration', sortable:true, hideBelow:'lg',
          render:function (r) { return U.duration(r.durationMins); }},
        { key:'enrolled', label:'Enrolled', sortable:true, align:'right', hideBelow:'md',
          render:function (r) { return U.num(r.enrolled); }},
        { key:'completionRate', label:'Completion', sortable:true, width:'150px',
          render:function (r) { return U.progressCell(r.completionRate); }},
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); }}]},
    detail:function (c) {
      return { title:c.title, subtitle:c.category + ' · ' + c.delivery + ' · ' + c.level,
        body:'<div class="row gap-2 mb-5 wrap">' + U.statusBadge(c.status) +
          (c.mandatory ? '<span class="badge badge-warning">Mandatory</span>' : '') +
          (c.hasScorm ? '<span class="badge badge-info">SCORM</span>' : '') +
          '<span class="badge badge-plain">' + GGL.icon('star','ico') + ' ' + c.rating + '</span></div>' +
          '<p class="text-muted">' + U.esc(c.description) + '</p>' +
          '<div class="grid grid-4 gap-3 my-5">' + mini('Modules', c.modules) + mini('Lessons', c.lessons) +
          mini('Assessments', c.assessments) + mini('Duration', U.duration(c.durationMins)) + '</div>' +
          '<div class="card card-pad mb-5"><div class="row-between mb-3">' +
          '<strong class="text-sm">Enrolment &amp; completion</strong>' +
          '<span class="text-sm text-muted">' + U.num(c.completed) + ' of ' + U.num(c.enrolled) + '</span></div>' +
          U.progressCell(c.completionRate) + '</div>' +
          kv([['Instructor', c.instructor], ['Certificates issued', U.num(c.certificatesIssued || 0)],
            ['Created', U.date(c.createdAt,'long')], ['Updated', U.date(c.updatedAt,'long')]]) +
          '<div class="alert mt-4">' + GGL.icon('info','ico') + '<div class="text-sm">' +
          'Lesson content, uploads and SCORM packages are not implemented in this phase.</div></div>' };
    }
  };

  MODULES.batches = {
    active:'batches', title:'Batches', crumb:'Batches',
    subtitle:'Cohorts, trainers, schedules and outcomes.',
    newAction:{ label:'Create batch', run:function(done){
      var h=UI.modal({title:'Create training batch',subtitle:'Set up the cohort first. Trainees, modules and sessions can be assigned after creation.',size:'lg',body:'<form id="batch-create"><div class="grid grid-2"><div class="field"><label class="label">Batch name *</label><input class="input" name="name" placeholder="e.g. September New Hire Academy"><span class="error-text"></span></div><div class="field"><label class="label">Programme *</label><input class="input" name="programme" placeholder="Programme or course"><span class="error-text"></span></div><div class="field"><label class="label">Trainer *</label><input class="input" name="trainer" placeholder="Assigned trainer"><span class="error-text"></span></div><div class="field"><label class="label">Mode</label><select class="select" name="mode"><option>Instructor-Led</option><option>Virtual</option><option>Blended</option></select></div><div class="field"><label class="label">Start date *</label><input class="input" type="date" name="startDate"><span class="error-text"></span></div><div class="field"><label class="label">End date *</label><input class="input" type="date" name="endDate"><span class="error-text"></span></div><div class="field"><label class="label">Location</label><input class="input" name="location" placeholder="Room or virtual link"></div><div class="field"><label class="label">Initial trainees</label><input class="input" type="number" min="0" name="trainees" value="0"></div></div></form>',footer:'<button class="btn btn-secondary" data-cancel>Cancel</button><button class="btn btn-primary" type="submit" form="batch-create">Create batch</button>'});
      h.overlay.querySelector('[data-cancel]').onclick=h.close;
      UI.handleSubmit(h.overlay.querySelector('#batch-create'),{name:[U.validators.required],programme:[U.validators.required],trainer:[U.validators.required],startDate:[U.validators.required],endDate:[U.validators.required]},function(v){return S.batches.create({name:v.name,programme:v.programme,trainer:v.trainer,mode:v.mode,startDate:v.startDate,endDate:v.endDate,location:v.location||'TBD',trainees:Number(v.trainees||0),completion:0,attendanceRate:0,status:'Scheduled',department:'All'});},{success:'Batch created',successDesc:'The cohort is ready for trainee and module assignment.',onDone:function(){h.close();done();}});
    } },
    service:function () { return S.batches; }, exportName:'batches',
    columns:[{ key:'name', label:'Batch' }, { key:'programme', label:'Programme' },
      { key:'trainer', label:'Trainer' }, { key:'mode', label:'Mode' },
      { key:'location', label:'Location' }, { key:'trainees', label:'Trainees' },
      { key:'completion', label:'Completion %' }, { key:'status', label:'Status' }],
    stats:function () {
      return S.batches.all().then(function (rows) {
        var by = U.groupBy(rows, 'status');
        return stat('Total batches', U.num(rows.length), 'layers', '') +
          stat('Active', U.num((by.Active||[]).length), 'play', 'green') +
          stat('Scheduled', U.num((by.Scheduled||[]).length), 'calendar', 'teal') +
          stat('Completed', U.num((by.Completed||[]).length), 'checkCircle', 'violet');
      });
    },
    charts:function () {
      return S.batches.all().then(function (rows) {
        var byMode = U.groupBy(rows, 'mode');
        return [
          card('Completion by batch', 'Progress across active and completed cohorts',
            C.bar(rows.slice(0,8).map(function (b, i) {
              return { label:'B' + (i+1), value:b.completion };
            }), { height:240, suffix:'%', label:'Batch completion' })),
          card('Delivery mode', 'How training is being run',
            C.donut(Object.keys(byMode).map(function (k) {
              return { label:k, value:byMode[k].length };
            }), { size:160, stroke:24, label:'Delivery mode' }))];
      });
    },
    table:{ searchPlaceholder:'Search batches, programmes or trainers…',
      defaultSort:'startDate', defaultDir:'desc',
      filters:[{ key:'status', label:'Status', options:['Active','Scheduled','Completed','On Hold']
        .map(function (x) { return { value:x, label:x }; })},
        { key:'mode', label:'Mode', options:['Classroom','Virtual','Hybrid']
          .map(function (x) { return { value:x, label:x }; })}],
      columns:[
        { key:'name', label:'Batch', sortable:true, primary:true,
          render:function (r) {
            return '<div class="fw-medium">' + U.esc(r.name) + '</div>' +
              '<div class="text-xs text-muted truncate" style="max-width:260px">' +
              U.esc(r.programme) + '</div>';
          }},
        { key:'trainer', label:'Trainer', sortable:true, hideBelow:'md' },
        { key:'mode', label:'Mode', sortable:true, hideBelow:'lg' },
        { key:'startDate', label:'Start', sortable:true, hideBelow:'md',
          render:function (r) { return U.date(r.startDate); }},
        { key:'trainees', label:'Trainees', sortable:true, align:'right' },
        { key:'completion', label:'Completion', sortable:true, width:'150px',
          render:function (r) { return U.progressCell(r.completion); }},
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); }}]},
    detail:function (b) {
      var sessions = GGL.data.sessions.filter(function (s) { return s.batchId === b.id; });
      return { title:b.name, subtitle:b.programme,
        body:'<div class="row gap-2 mb-5 wrap">' + U.statusBadge(b.status) +
          '<span class="badge badge-plain">' + U.esc(b.mode) + '</span>' +
          '<span class="badge badge-plain">' + U.esc(b.location) + '</span></div>' +
          '<div class="grid grid-4 gap-3 mb-5">' + mini('Trainees', b.trainees) +
          mini('Sessions', b.sessions) + mini('Completion', b.completion + '%') +
          mini('Attendance', b.attendanceRate === null ? '—' : b.attendanceRate + '%') + '</div>' +
          kv([['Programme', b.programme], ['Trainer', b.trainer], ['Department', b.department],
            ['Start date', U.date(b.startDate,'long')], ['End date', U.date(b.endDate,'long')]]) +
          '<h4 class="mt-5 mb-3">Schedule</h4>' +
          (sessions.length ? sessionList(sessions, '') :
            '<p class="text-sm text-muted">No sessions scheduled for this batch.</p>'),
        actions:'<button class="btn btn-secondary" type="button" data-manage-trainees>Manage trainees</button><a class="btn btn-primary" href="' + GGL.url('app/attendance.html') + '">Mark attendance</a>',
        onMount:function(parent){ parent.overlay.querySelector('[data-manage-trainees]').addEventListener('click',function(){
          Promise.all([S.users.all(),S.batches.get(b.id)]).then(function(res){
            var trainees=res[0].filter(function(u){return u.role===GGL.ROLES.END_USER && u.workspaceType!=='individual';});
            var fresh=res[1]||b, selected=fresh.traineeIds||[];
            var h=UI.modal({title:'Assign trainees',subtitle:fresh.name+' · '+selected.length+' currently assigned',size:'md',body:'<form id="assign-trainees"><div class="assignment-list">'+trainees.map(function(u){return '<label class="assignment-row"><input type="checkbox" name="trainee" value="'+u.id+'" '+(selected.indexOf(u.id)!==-1?'checked':'')+'><span>'+U.userCell(u.name,u.email)+'</span><small>'+U.esc(u.department||'')+'</small></label>';}).join('')+'</div></form>',footer:'<button class="btn btn-secondary" data-cancel>Cancel</button><button class="btn btn-primary" type="submit" form="assign-trainees">Save assignments</button>'});
            h.overlay.querySelector('[data-cancel]').onclick=h.close;
            h.overlay.querySelector('#assign-trainees').onsubmit=function(e){e.preventDefault();var ids=Array.from(e.target.querySelectorAll('[name="trainee"]:checked')).map(function(x){return x.value;});S.batches.update(fresh.id,{traineeIds:ids,trainees:ids.length}).then(function(){UI.toast('Trainees assigned',{type:'success',desc:ids.length+' trainee(s) are now in '+fresh.name+'.'});h.close();parent.close();setTimeout(function(){location.reload();},240);});};
          });
        }); } };
    }
  };

  MODULES.trainers = {
    active:'trainers', title:'Trainer management', crumb:'Trainers',
    subtitle:'The trainer directory, with delivery load and observation history.',
    adminOnly:true, service:function () { return S.trainers; }, exportName:'trainer-directory',
    columns:[{ key:'name', label:'Trainer' }, { key:'email', label:'Email' },
      { key:'type', label:'Type' }, { key:'specialism', label:'Specialism' },
      { key:'location', label:'Location' }, { key:'sessionsDelivered', label:'Sessions' },
      { key:'trainingHours', label:'Hours' }, { key:'effectiveness', label:'Effectiveness %' },
      { key:'status', label:'Status' }],
    stats:function () {
      return S.trainers.stats().then(function (st) {
        return stat('Trainers', U.num(st.total), 'briefcase', '') +
          stat('Active', U.num(st.active), 'checkCircle', 'green') +
          stat('Hours delivered', U.num(st.hours), 'clock', 'teal') +
          stat('Avg effectiveness', st.avgEffectiveness + '%', 'trending', 'violet');
      });
    },
    charts:function () {
      return Promise.all([S.trainers.all(), S.effectivenessCalc.all()]).then(function (res) {
        var trainers = res[0], eff = res[1];
        var bySpec = U.groupBy(trainers, 'specialism');
        return [
          card('Top effectiveness', 'Weighted score from the calculator',
            C.hbars(eff.slice().sort(function (a,b) { return b.effectiveness - a.effectiveness; })
              .slice(0,8).map(function (e) {
                return { label:e.trainer, value:Math.round(e.effectiveness) };
              }), { suffix:'%' }),
            '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/effectiveness-calculator.html') + '">Calculator</a>'),
          card('Coverage by specialism', 'Where delivery capability sits',
            C.hbars(Object.keys(bySpec).map(function (k) {
              return { label:k, value:bySpec[k].length };
            }).sort(function (a,b) { return b.value - a.value; }).slice(0,7), { suffix:' trainers' }))];
      });
    },
    table:{ searchPlaceholder:'Search name, specialism or location…', defaultSort:'name',
      filters:[{ key:'type', label:'Type', options:[{ value:'Internal', label:'Internal' },
        { value:'External', label:'External' }]},
        { key:'status', label:'Status', options:[{ value:'Active', label:'Active' },
          { value:'Inactive', label:'Inactive' }]}],
      columns:[
        { key:'name', label:'Trainer', sortable:true, primary:true,
          render:function (r) { return U.userCell(r.name, r.specialism); }},
        { key:'type', label:'Type', sortable:true, hideBelow:'md' },
        { key:'location', label:'Location', sortable:true, hideBelow:'lg' },
        { key:'sessionsDelivered', label:'Sessions', sortable:true, align:'right', hideBelow:'md',
          render:function (r) { return U.num(r.sessionsDelivered); }},
        { key:'observationScore', label:'TOF', sortable:true, align:'right', hideBelow:'lg',
          render:function (r) { return r.observationScore + '/5'; }},
        { key:'effectiveness', label:'Effectiveness', sortable:true, width:'150px',
          render:function (r) { return U.progressCell(Math.round(r.effectiveness)); }},
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); }}],
      extraActions:function () {
        return [{ label:'Observe trainer', icon:'clipboard',
          onClick:function () { window.location.href = GGL.url('app/observation.html'); }}];
      }},
    detail:function (r) {
      var obs = GGL.data.tofRecords.filter(function (o) { return o.trainerId === r.id; });
      var eff = GGL.data.effRecords.filter(function (e) { return e.trainerId === r.id; })[0];
      return { title:r.name, subtitle:r.specialism + ' · ' + r.type + ' · ' + r.location,
        body:'<div class="row gap-2 mb-5 wrap">' + U.statusBadge(r.status) +
          '<span class="badge badge-plain">' + U.esc(r.type) + '</span></div>' +
          '<div class="grid grid-4 gap-3 mb-5">' + mini('Sessions', U.num(r.sessionsDelivered)) +
          mini('Hours', U.num(r.trainingHours)) + mini('Learners', U.num(r.learnersTrained)) +
          mini('Upcoming', r.upcomingSessions) + '</div>' +
          (eff ? '<h4 class="mb-3">Effectiveness</h4>' +
            '<div class="row gap-5 mb-5 wrap" style="align-items:center">' +
            C.gauge(eff.effectiveness, { size:130, caption:eff.rating }) +
            '<div class="grow" style="min-width:220px">' +
            C.hbars(GGL.data.effWeights.map(function (w) {
              return { label:w.label, value:Math.round(eff[w.key]) };
            }), { suffix:'%' }) + '</div></div>' : '') +
          '<h4 class="mb-3">Observation history</h4>' +
          (obs.length ? '<ul class="session-list">' + obs.slice(0,5).map(function (o) {
            return '<li><span class="session-date" style="width:52px"><span class="m">TOF</span>' +
              '<span class="d" style="font-size:var(--fs-sm)">' + Math.round(o.score) + '</span></span>' +
              '<span class="session-info"><h4 class="truncate">' + U.esc(o.topic) + '</h4>' +
              '<span class="meta"><span>' + GGL.icon('calendar','ico') + U.date(o.observationDate) + '</span>' +
              '<span>' + GGL.icon('user','ico') + U.esc(o.evaluator) + '</span></span></span>' +
              '<span class="badge badge-plain">' + U.esc(o.rating) + '</span></li>';
          }).join('') + '</ul>' : '<p class="text-sm text-muted">No observations recorded yet.</p>'),
        actions:'<a class="btn btn-primary" href="' + GGL.url('app/observation.html') + '">New observation</a>' };
    }
  };

  MODULES.attendance = {
    active:'attendance', title:'Attendance', crumb:'Attendance',
    subtitle:'Mark, review and report attendance across sessions.',
    adminOnly:true, service:function () { return S.attendance; }, exportName:'attendance-register',
    columns:[{ key:'name', label:'Trainee' }, { key:'employeeId', label:'Employee ID' },
      { key:'department', label:'Department' }, { key:'sessionTitle', label:'Session' },
      { key:'batchName', label:'Batch' },
      { label:'Date', value:function (r) { return U.date(r.date); } },
      { key:'status', label:'Status' }, { key:'minutesAttended', label:'Minutes attended' }],
    stats:function () {
      return S.attendance.summary().then(function (st) {
        return stat('Attendance rate', st.rate + '%', 'userCheck', 'green') +
          stat('Present', U.num(st.present), 'checkCircle', '') +
          stat('Late', U.num(st.late), 'clock', 'amber') +
          stat('Absent', U.num(st.absent), 'xCircle', 'red');
      });
    },
    charts:function () {
      return Promise.all([S.attendance.summary(), S.sessions.all()]).then(function (res) {
        var st = res[0];
        var completed = res[1].filter(function (s) {
          return s.attendance !== null && s.attendance !== undefined;
        }).slice(0,8);
        return [
          card('Attendance by session', 'Most recent completed sessions',
            C.bar(completed.map(function (s, i) {
              return { label:'S' + (i+1), value:s.attendance };
            }), { height:250, suffix:'%', color:'var(--viz-1)', label:'Attendance by session' })),
          card('Attendance breakdown', 'Across all recorded sessions',
            C.donut([{ label:'Present', value:st.present, color:'var(--viz-5)' },
              { label:'Late', value:st.late, color:'var(--viz-3)' },
              { label:'Absent', value:st.absent, color:'var(--viz-6)' },
              { label:'Excused', value:st.excused, color:'var(--viz-1)' }],
              { size:170, stroke:26, centreValue:st.rate + '%', centreLabel:'attended',
                label:'Attendance breakdown' }))];
      });
    },
    table:{ searchPlaceholder:'Search trainees, sessions or batches…',
      defaultSort:'date', defaultDir:'desc', selectable:true,
      filters:[{ key:'status', label:'Status', options:['Present','Late','Absent','Excused']
        .map(function (x) { return { value:x, label:x }; })}],
      columns:[
        { key:'name', label:'Trainee', sortable:true, primary:true,
          render:function (r) { return U.userCell(r.name, r.employeeId); }},
        { key:'sessionTitle', label:'Session', sortable:true, hideBelow:'md',
          render:function (r) {
            return '<div class="truncate" style="max-width:240px">' + U.esc(r.sessionTitle) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.batchName) + '</div>';
          }},
        { key:'department', label:'Department', sortable:true, hideBelow:'lg' },
        { key:'date', label:'Date', sortable:true, hideBelow:'md',
          render:function (r) { return U.date(r.date); }},
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); }}],
      bulkActions: GGL.data.attendanceStates.map(function (st) {
        return { label:'Mark ' + st.toLowerCase(),
          icon: st === 'Present' ? 'checkCircle' : st === 'Absent' ? 'xCircle'
            : st === 'Late' ? 'clock' : 'info',
          onClick:function (ids, api) {
            UI.confirm({ title:'Mark ' + ids.length + ' record(s) as ' + st.toLowerCase() + '?',
              message:'This updates the attendance register for the selected trainees.',
              tone:'info', confirmLabel:'Mark ' + st.toLowerCase(),
              onConfirm:function () {
                return S.attendance.markAll(ids, st).then(function (res) {
                  UI.toast(res.updated + ' record(s) updated', { type:'success' });
                  api.clearSelection(); api.reload();
                });
              }});
          }};
      })},
    detail:function (r) {
      return { title:r.name, subtitle:r.sessionTitle,
        body:'<div class="row gap-2 mb-5 wrap">' + U.statusBadge(r.status) + '</div>' +
          kv([['Batch', r.batchName], ['Department', r.department], ['Employee ID', r.employeeId],
            ['Date', U.date(r.date,'long')], ['Minutes attended', String(r.minutesAttended)]]) };
    }
  };

  MODULES.tna = {
    active:'tna', title:'Training needs analysis', crumb:'TNA / TNI',
    subtitle:'Identified capability gaps, prioritised and mapped to interventions.',
    adminOnly:true, service:function () { return S.tna; }, exportName:'training-needs-analysis',
    columns:[{ key:'competency', label:'Competency' }, { key:'department', label:'Department' },
      { key:'category', label:'Category' }, { key:'affected', label:'People affected' },
      { key:'avgGap', label:'Average gap' }, { key:'priority', label:'Priority' },
      { key:'intervention', label:'Recommended intervention' },
      { key:'recommendedCourse', label:'Recommended course' }, { key:'status', label:'Status' }],
    stats:function () {
      return S.tna.summary().then(function (st) {
        return stat('Identified needs', U.num(st.total), 'compass', '') +
          stat('Critical priority', U.num(st.critical), 'alert', 'red') +
          stat('People affected', U.num(st.peopleAffected), 'users', 'teal') +
          stat('Addressed', U.num(st.addressed), 'checkCircle', 'green');
      });
    },
    charts:function () {
      return S.tna.summary().then(function (st) {
        return [
          card('Needs by department', 'Headcount with an identified gap',
            C.hbars(st.byDepartment.slice(0,7), { suffix:' people' })),
          card('Needs by competency area', 'Where capability is thinnest',
            C.donut(st.byCategory, { size:160, stroke:24, label:'Needs by category' }))];
      });
    },
    table:{ searchPlaceholder:'Search competency, department or intervention…',
      defaultSort:'affected', defaultDir:'desc',
      filters:[{ key:'priority', label:'Priority', options:['Critical','High','Medium','Low']
        .map(function (x) { return { value:x, label:x }; })},
        { key:'status', label:'Status', options:['Identified','Planned','In Progress','Addressed']
          .map(function (x) { return { value:x, label:x }; })}],
      columns:[
        { key:'competency', label:'Competency', sortable:true, primary:true,
          render:function (r) {
            return '<div class="fw-medium">' + U.esc(r.competency) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.category) + '</div>';
          }},
        { key:'department', label:'Department', sortable:true, hideBelow:'md' },
        { key:'affected', label:'Affected', sortable:true, align:'right',
          render:function (r) { return U.num(r.affected); }},
        { key:'avgGap', label:'Avg gap', sortable:true, align:'right', hideBelow:'lg',
          render:function (r) { return r.avgGap + ' levels'; }},
        { key:'intervention', label:'Intervention', sortable:true, hideBelow:'lg' },
        { key:'priority', label:'Priority', sortable:true,
          render:function (r) { return priorityBadge(r.priority); }},
        { key:'status', label:'Status', sortable:true, hideBelow:'md',
          render:function (r) { return U.statusBadge(r.status); }}]},
    detail:function (r) {
      return { title:r.competency + ' — ' + r.department,
        subtitle:r.affected + ' people affected · ' + r.priority + ' priority',
        body:'<div class="row gap-2 mb-5 wrap">' + priorityBadge(r.priority) + U.statusBadge(r.status) +
          '<span class="badge badge-plain">' + U.esc(r.category) + '</span></div>' +
          '<div class="grid grid-4 gap-3 mb-5">' + mini('Affected', r.affected) +
          mini('Avg gap', r.avgGap) + mini('Max gap', r.maxGap) +
          mini('Target', U.date(r.targetDate)) + '</div>' +
          kv([['Recommended intervention', r.intervention],
            ['Recommended course', r.recommendedCourse], ['Raised by', r.raisedBy],
            ['Identified', U.date(r.createdAt,'long')]]) +
          '<div class="alert mt-4">' + GGL.icon('info','ico') + '<div class="text-sm">' +
          'This need was aggregated from individual competency assessments. Open ' +
          '<a href="' + GGL.url('app/competencies.html') + '">Competencies</a> to see the ' +
          'underlying per-person gaps.</div></div>',
        actions:'<a class="btn btn-primary" href="' + GGL.url('app/courses.html') + '">Plan training</a>' };
    }
  };

  MODULES.competencies = {
    active:'competencies', title:'Competency management', crumb:'Competencies',
    subtitle:'Role-based frameworks, individual profiles and the organisational gap picture.',
    service:function () { return S.competency; }, exportName:'competency-assessment',
    columns:[{ key:'name', label:'Learner' }, { key:'employeeId', label:'Employee ID' },
      { key:'department', label:'Department' }, { key:'role', label:'Role' },
      { key:'competency', label:'Competency' }, { key:'category', label:'Category' },
      { key:'current', label:'Current level' }, { key:'required', label:'Required level' },
      { key:'gap', label:'Gap' }],
    learnerView:function (body, user) {
      body.innerHTML = '<div class="grid grid-4 mb-6" id="m-stats">' + UI.skeletonCards(4) + '</div>' +
        '<div id="m-profile"></div>';
      UI.async(document.getElementById('m-profile'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
        return S.competency.profileFor(user.id).then(function (rows) {
          var met = rows.filter(function (r) { return r.gap === 0; }).length;
          document.getElementById('m-stats').innerHTML =
            stat('Competencies', rows.length, 'target', '') +
            stat('At required level', met, 'checkCircle', 'green') +
            stat('Development areas', rows.length - met, 'trending', 'amber') +
            stat('Framework', rows.length ? rows[0].role : '—', 'briefcase', 'teal');
          document.getElementById('m-profile').innerHTML = card('My competency profile',
            rows.length ? 'Assessed against the ' + rows[0].role + ' framework' : '',
            rows.length ? '<div class="table-wrap"><table class="table"><thead><tr>' +
              '<th>Competency</th><th class="hide-sm">Category</th><th>Level</th><th>Status</th>' +
              '</tr></thead><tbody>' + rows.sort(function (a,b) { return b.gap - a.gap; })
                .map(function (r) {
                  return '<tr><td class="cell-primary">' + U.esc(r.competency) + '</td>' +
                    '<td class="hide-sm">' + U.esc(r.category) + '</td>' +
                    '<td style="width:170px">' + gapBar(r.current, r.required) + '</td>' +
                    '<td>' + (r.gap === 0 ? '<span class="badge badge-success">Met</span>'
                      : '<span class="badge badge-warning">' + r.gap + ' level' +
                        (r.gap > 1 ? 's' : '') + ' to close</span>') + '</td></tr>';
                }).join('') + '</tbody></table></div>' +
              '<p class="hint mt-4">Levels run 1 (Awareness) to 5 (Expert). Your required levels come ' +
              'from the competency framework for your role.</p>'
              : UI.empty({ icon:'target', title:'No assessment yet',
                  message:'Your manager will assess your competencies as part of the review cycle.' }));
        });
      });
    },
    stats:function () {
      return S.competency.all().then(function (rows) {
        var met = rows.filter(function (r) { return r.gap === 0; }).length;
        return stat('Assessments', U.num(rows.length), 'target', '') +
          stat('At required level', Math.round((met / rows.length) * 100) + '%', 'checkCircle', 'green') +
          stat('Competencies', GGL.data.competencyLibrary.length, 'layers', 'teal') +
          stat('Role frameworks', GGL.data.roleProfiles.length, 'briefcase', 'violet');
      });
    },
    charts:function () {
      return Promise.all([S.competency.all(), S.competency.heatmap()]).then(function (res) {
        var rows = res[0], heat = res[1];
        var byComp = U.groupBy(rows, 'competency');
        var depts = heat[0] ? heat[0].cells.map(function (c) { return c.department; }) : [];
        var heatHtml = '<div class="heatmap-wrap"><table class="table heatmap"><thead><tr><th>Competency</th>' +
          depts.map(function (d) {
            return '<th class="text-right">' + U.esc(d.slice(0,10)) + '</th>';
          }).join('') + '</tr></thead><tbody>' +
          heat.map(function (row) {
            return '<tr><td class="cell-primary">' + U.esc(row.competency) + '</td>' +
              row.cells.map(function (c) {
                if (c.gap === null) return '<td class="text-right text-subtle">—</td>';
                var lvl = c.gap >= 1.5 ? 'hot' : c.gap >= 0.8 ? 'warm' : c.gap > 0.3 ? 'mild' : 'cool';
                return '<td class="text-right"><span class="heat ' + lvl + '" title="' + c.people +
                  ' assessed">' + c.gap.toFixed(1) + '</span></td>';
              }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>' +
          '<p class="hint mt-3">Average gap in levels. Darker cells need attention first.</p>';
        return [
          card('Competency gap heatmap', 'Average gap by competency and department', heatHtml),
          card('Largest gaps', 'Across the whole population',
            C.hbars(Object.keys(byComp).map(function (k) {
              return { label:k, value:Math.round(U.avg(byComp[k],'gap') * 10) / 10 };
            }).sort(function (a,b) { return b.value - a.value; }).slice(0,8), { suffix:' levels' }))];
      });
    },
    table:{ searchPlaceholder:'Search learner, competency or department…',
      defaultSort:'gap', defaultDir:'desc',
      filters:[{ key:'category', label:'Category',
        options:['Behavioural','Leadership','Functional','Technical','Compliance']
          .map(function (x) { return { value:x, label:x }; })},
        { key:'department', label:'Department', options:GGL.seed.DEPTS.map(function (d) {
          return { value:d, label:d }; })}],
      columns:[
        { key:'name', label:'Learner', sortable:true, primary:true,
          render:function (r) { return U.userCell(r.name, r.role); }},
        { key:'department', label:'Department', sortable:true, hideBelow:'md' },
        { key:'competency', label:'Competency', sortable:true,
          render:function (r) {
            return '<div>' + U.esc(r.competency) + '</div>' +
              '<div class="text-xs text-muted">' + U.esc(r.category) + '</div>';
          }},
        { key:'current', label:'Level', sortable:true, width:'170px',
          render:function (r) { return gapBar(r.current, r.required); }},
        { key:'gap', label:'Gap', sortable:true, align:'right',
          render:function (r) {
            return r.gap === 0 ? '<span class="badge badge-success">Met</span>'
              : '<span class="badge badge-warning">' + r.gap + '</span>';
          }}]},
    detail:function (r) {
      return { title:r.name + ' — ' + r.competency, subtitle:r.role + ' · ' + r.department,
        body:'<div class="row gap-4 mb-5 wrap" style="align-items:center">' +
          C.gauge(Math.round((r.current / r.required) * 100), { size:130,
            caption: r.gap === 0 ? 'At required level' : r.gap + ' level(s) to close' }) +
          '<div class="grow" style="min-width:220px"><ul style="list-style:none;padding:0;margin:0">' +
          GGL.data.proficiency.map(function (p) {
            var isCur = p.level === r.current, isReq = p.level === r.required;
            return '<li class="row gap-3 text-sm" style="padding:6px 0">' +
              '<span class="rank-medal' + (isCur ? ' gold' : '') + '">' + p.level + '</span>' +
              '<span class="grow"><strong>' + U.esc(p.label) + '</strong>' +
              '<div class="text-xs text-muted">' + U.esc(p.desc) + '</div></span>' +
              (isCur ? '<span class="badge badge-accent">Current</span>' : '') +
              (isReq ? '<span class="badge badge-info">Required</span>' : '') + '</li>';
          }).join('') + '</ul></div></div>' +
          kv([['Assessed by', r.assessedBy], ['Assessed on', U.date(r.assessedAt,'long')]]) };
    }
  };

  MODULES.content = {
    active:'content', title:'Content library', crumb:'Content Library',
    subtitle:'Every asset backing the catalogue — searchable, versioned and owned.',
    adminOnly:true, service:function () { return S.content; }, exportName:'content-library',
    columns:[{ key:'title', label:'Title' }, { key:'course', label:'Course' },
      { key:'type', label:'Type' }, { key:'format', label:'Format' },
      { key:'sizeMb', label:'Size (MB)' }, { key:'version', label:'Version' },
      { key:'author', label:'Author' }, { key:'views', label:'Views' },
      { key:'status', label:'Status' }],
    stats:function () {
      return S.content.all().then(function (rows) {
        return stat('Assets', U.num(rows.length), 'folder', '') +
          stat('Published', U.num(rows.filter(function (r) { return r.status === 'Published'; }).length), 'checkCircle', 'green') +
          stat('SCORM packages', U.num(rows.filter(function (r) { return r.type === 'SCORM'; }).length), 'package', 'violet') +
          stat('Total size', Math.round(U.sum(rows,'sizeMb')) + ' MB', 'database', 'teal');
      });
    },
    charts:function () {
      return S.content.all().then(function (rows) {
        var byType = U.groupBy(rows, 'type');
        return [
          card('Most viewed', 'Assets learners actually open',
            C.hbars(rows.slice().sort(function (a,b) { return b.views - a.views; }).slice(0,7)
              .map(function (r) { return { label:r.title, value:r.views }; }), { suffix:' views' })),
          card('Library composition', 'By asset type',
            C.donut(Object.keys(byType).map(function (k) {
              return { label:k, value:byType[k].length };
            }).sort(function (a,b) { return b.value - a.value; }),
              { size:160, stroke:24, label:'Content by type' }))];
      });
    },
    table:{ searchPlaceholder:'Search title, course, type or author…',
      defaultSort:'updatedAt', defaultDir:'desc',
      filters:[{ key:'type', label:'Type',
        options:['Video','PDF','Presentation','Document','SCORM','Job aid','Link']
          .map(function (x) { return { value:x, label:x }; })},
        { key:'status', label:'Status', options:['Published','In Review','Draft']
          .map(function (x) { return { value:x, label:x }; })}],
      columns:[
        { key:'title', label:'Asset', sortable:true, primary:true,
          render:function (r) {
            var icon = r.type === 'Video' ? 'video' : r.type === 'SCORM' ? 'package'
              : r.type === 'Presentation' ? 'image' : r.type === 'Link' ? 'link' : 'fileText';
            return '<div class="row gap-3"><span class="stat-icon" style="width:32px;height:32px">' +
              GGL.icon(icon,'ico') + '</span><span>' +
              '<span class="fw-medium truncate" style="max-width:260px;display:block">' +
              U.esc(r.title) + '</span><span class="text-xs text-muted">' + U.esc(r.format) +
              ' · ' + r.sizeMb + ' MB · ' + U.esc(r.version) + '</span></span></div>';
          }},
        { key:'course', label:'Course', sortable:true, hideBelow:'md',
          render:function (r) {
            return '<div class="truncate" style="max-width:200px">' + U.esc(r.course) + '</div>';
          }},
        { key:'author', label:'Author', sortable:true, hideBelow:'lg' },
        { key:'views', label:'Views', sortable:true, align:'right', hideBelow:'md',
          render:function (r) { return U.num(r.views); }},
        { key:'updatedAt', label:'Updated', sortable:true, hideBelow:'md',
          render:function (r) { return U.date(r.updatedAt); }},
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); }}]},
    detail:function (r) {
      return { title:r.title, subtitle:r.type + ' · ' + r.format + ' · ' + r.version,
        body:'<div class="row gap-2 mb-5 wrap">' + U.statusBadge(r.status) +
          '<span class="badge badge-plain">' + U.esc(r.category) + '</span>' +
          '<span class="badge badge-plain">' + U.esc(r.language) + '</span></div>' +
          '<div class="content-preview mb-5">' +
          GGL.icon(r.type === 'Video' ? 'video' : r.type === 'SCORM' ? 'package' : 'fileText','ico') +
          '<div class="fw-medium mt-3">' + U.esc(r.format) + ' · ' + r.sizeMb + ' MB</div>' +
          '<div class="text-xs text-muted">Preview and playback are not implemented in this phase</div></div>' +
          kv([['Course', r.course], ['Author', r.author], ['Version', r.version],
            ['Views', U.num(r.views)], ['Downloads', U.num(r.downloads)],
            ['Last updated', U.date(r.updatedAt,'long')]]) };
    }
  };

  MODULES.sops = {
    active:'sops', title:'SOP management', crumb:'SOPs',
    subtitle:'Controlled documents with versioning, approval workflow and review dates.',
    adminOnly:true, service:function () { return S.sops; }, exportName:'sop-register',
    columns:[{ key:'code', label:'Code' }, { key:'title', label:'Title' },
      { key:'category', label:'Category' }, { key:'version', label:'Version' },
      { key:'owner', label:'Owner' }, { key:'approver', label:'Approver' },
      { key:'status', label:'Status' },
      { label:'Next review', value:function (r) { return U.date(r.nextReview); } }],
    stats:function () {
      return S.sops.all().then(function (rows) {
        var overdue = rows.filter(function (r) { return new Date(r.nextReview) < new Date(); });
        return stat('SOPs', U.num(rows.length), 'clipboard', '') +
          stat('Published', U.num(rows.filter(function (r) { return r.status === 'Published'; }).length), 'checkCircle', 'green') +
          stat('In workflow', U.num(rows.filter(function (r) {
            return ['Draft','Review','Approval'].indexOf(r.status) !== -1; }).length), 'edit', 'amber') +
          stat('Review overdue', U.num(overdue.length), 'alert', 'red');
      });
    },
    charts:function () {
      return S.sops.all().then(function (rows) {
        var byCat = U.groupBy(rows, 'category');
        return [
          card('Approval workflow', 'Draft → Review → Approval → Published → Archived',
            C.bar(GGL.data.sopStages.map(function (st) {
              return { label:st, value:rows.filter(function (r) { return r.status === st; }).length };
            }), { height:230, label:'SOP workflow' })),
          card('By category', 'Coverage across the L&D function',
            C.donut(Object.keys(byCat).map(function (k) {
              return { label:k, value:byCat[k].length };
            }), { size:160, stroke:24, label:'SOPs by category' }))];
      });
    },
    table:{ searchPlaceholder:'Search code, title or owner…', defaultSort:'code',
      filters:[{ key:'status', label:'Status', options:GGL.data.sopStages.map(function (s) {
        return { value:s, label:s }; })}],
      columns:[
        { key:'code', label:'SOP', sortable:true, primary:true,
          render:function (r) {
            return '<div class="fw-medium">' + U.esc(r.title) + '</div>' +
              '<div class="text-xs text-muted"><code>' + U.esc(r.code) + '</code> · ' +
              U.esc(r.version) + '</div>';
          }},
        { key:'category', label:'Category', sortable:true, hideBelow:'md' },
        { key:'owner', label:'Owner', sortable:true, hideBelow:'lg' },
        { key:'lastReviewed', label:'Reviewed', sortable:true, hideBelow:'md',
          render:function (r) { return U.date(r.lastReviewed); }},
        { key:'nextReview', label:'Next review', sortable:true,
          render:function (r) {
            var overdue = new Date(r.nextReview) < new Date();
            return '<span class="' + (overdue ? 'text-warning fw-medium' : '') + '">' +
              U.date(r.nextReview) + (overdue ? ' ⚠' : '') + '</span>';
          }},
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); }}],
      extraActions:function (r, api) {
        var next = { Draft:'Review', Review:'Approval', Approval:'Published' }[r.status];
        if (!next) return [];
        return [{ label:'Advance to ' + next, icon:'arrowRight', onClick:function (row) {
          UI.confirm({ title:'Advance to ' + next + '?',
            message:row.code + ' — ' + row.title + ' will move to the ' + next.toLowerCase() + ' stage.',
            tone:'info', confirmLabel:'Advance',
            onConfirm:function () {
              return S.sops.advance(row.id, next).then(function () {
                UI.toast('Moved to ' + next, { type:'success' }); api.reload();
              });
            }});
        }}];
      }},
    detail:function (r) {
      var stages = GGL.data.sopStages, idx = stages.indexOf(r.status);
      return { title:r.title, subtitle:r.code + ' · ' + r.version + ' · owned by ' + r.owner,
        body:'<div class="wizard-steps mb-5">' + stages.map(function (st, i) {
          var cls = i === idx ? ' active' : i < idx ? ' done' : '';
          return '<span class="wizard-step' + cls + '"><span class="n">' +
            (i < idx ? '✓' : i+1) + '</span><span>' + st + '</span></span>';
        }).join('') + '</div>' +
        '<h4 class="mb-2">Purpose</h4><p class="text-muted">' + U.esc(r.purpose) + '</p>' +
        kv([['Category', r.category], ['Owner', r.owner], ['Approver', r.approver],
          ['Effective from', r.effectiveFrom ? U.date(r.effectiveFrom,'long') : 'Not yet published'],
          ['Last reviewed', U.date(r.lastReviewed,'long')],
          ['Next review', U.date(r.nextReview,'long')]]) +
        '<h4 class="mt-5 mb-2">Latest change</h4>' +
        '<p class="text-muted text-sm">' + U.esc(r.changeNote) + '</p>' };
    }
  };

  function engagementModule(kind) {
    var isCoaching = kind === 'coaching';
    var who = isCoaching ? 'coachee' : 'mentee';
    var pro = isCoaching ? 'coach' : 'mentor';
    return {
      active:kind, title: isCoaching ? 'Coaching' : 'Mentoring',
      crumb: isCoaching ? 'Coaching' : 'Mentoring',
      subtitle: isCoaching ? 'One-to-one coaching engagements, goals and session progress.'
        : 'Mentor matching, long-term development relationships and check-ins.',
      service:function () { return isCoaching ? S.coaching : S.mentoring; },
      exportName: kind + '-engagements',
      columns:[{ key:who, label: isCoaching ? 'Coachee' : 'Mentee' },
        { key:'department', label:'Department' },
        { key:pro, label: isCoaching ? 'Coach' : 'Mentor' },
        { key: isCoaching ? 'focus' : 'area', label: isCoaching ? 'Focus' : 'Area' },
        { key:'goal', label:'Goal' }, { key:'status', label:'Status' },
        { key:'progress', label:'Progress %' }],
      stats:function () {
        return (isCoaching ? S.coaching : S.mentoring).all().then(function (rows) {
          var active = rows.filter(function (r) {
            return ['In Progress','Active'].indexOf(r.status) !== -1; }).length;
          return stat('Engagements', U.num(rows.length), isCoaching ? 'messageCircle' : 'users', '') +
            stat('Active', U.num(active), 'activity', 'green') +
            stat('Completed', U.num(rows.filter(function (r) { return r.status === 'Completed'; }).length), 'checkCircle', 'teal') +
            stat('Avg progress', Math.round(U.avg(rows,'progress')) + '%', 'trending', 'violet');
        });
      },
      charts:function () {
        return (isCoaching ? S.coaching : S.mentoring).all().then(function (rows) {
          var key = isCoaching ? 'focus' : 'area';
          var byFocus = U.groupBy(rows, key), byDept = U.groupBy(rows, 'department');
          return [
            card(isCoaching ? 'Coaching focus areas' : 'Mentoring areas', 'What people are working on',
              C.hbars(Object.keys(byFocus).map(function (k) {
                return { label:k, value:byFocus[k].length };
              }).sort(function (a,b) { return b.value - a.value; }).slice(0,7))),
            card('Uptake by department', 'Where the demand sits',
              C.donut(Object.keys(byDept).map(function (k) {
                return { label:k, value:byDept[k].length };
              }).sort(function (a,b) { return b.value - a.value; }).slice(0,6),
                { size:160, stroke:24, label:'By department' }))];
        });
      },
      table:{ searchPlaceholder:'Search participant, ' + pro + ' or focus…',
        defaultSort:'progress', defaultDir:'desc',
        filters:[{ key:'status', label:'Status',
          options:(isCoaching ? ['Requested','In Progress','Completed'] : ['Matching','Active','Completed'])
            .map(function (s) { return { value:s, label:s }; })}],
        columns:[
          { key:who, label: isCoaching ? 'Coachee' : 'Mentee', sortable:true, primary:true,
            render:function (r) { return U.userCell(r[who], r.department); }},
          { key:pro, label: isCoaching ? 'Coach' : 'Mentor', sortable:true, hideBelow:'md' },
          { key: isCoaching ? 'focus' : 'area', label:'Focus', sortable:true, hideBelow:'lg' },
          { key:'progress', label:'Progress', sortable:true, width:'150px',
            render:function (r) { return U.progressCell(r.progress); }},
          { key:'status', label:'Status', sortable:true,
            render:function (r) { return U.statusBadge(r.status); }}],
        extraActions: isCoaching ? function (r, api) {
          if (r.status === 'Completed') return [];
          return [{ label:'Log a session', icon:'checkCircle', onClick:function (row) {
            S.coaching.logSession(row.id).then(function (res) {
              UI.toast('Session logged', { type:'success',
                desc:res.sessionsCompleted + ' of ' + row.sessionsPlanned + ' complete.' });
              api.reload();
            });
          }}];
        } : null },
      detail:function (r) {
        return { title:r[who] + ' with ' + r[pro],
          subtitle:(isCoaching ? r.focus : r.area) + ' · ' + r.department,
          body:'<div class="row gap-2 mb-5 wrap">' + U.statusBadge(r.status) + '</div>' +
            '<div class="mb-5">' + U.progressCell(r.progress) + '</div>' +
            '<h4 class="mb-2">Goal</h4><p class="text-muted">' + U.esc(r.goal) + '</p>' +
            kv(isCoaching
              ? [['Coach', r.coach], ['Focus', r.focus],
                 ['Sessions', r.sessionsCompleted + ' of ' + r.sessionsPlanned],
                 ['Next session', r.nextSession ? U.date(r.nextSession,'long') : '—'],
                 ['Started', U.date(r.startedAt,'long')]]
              : [['Mentor', r.mentor], ['Area', r.area], ['Duration', r.durationMonths + ' months'],
                 ['Elapsed', r.monthsElapsed + ' months'],
                 ['Next check-in', r.nextCheckIn ? U.date(r.nextCheckIn,'long') : '—'],
                 ['Matched on', U.date(r.matchedOn,'long')]]) };
      }
    };
  }
  MODULES.coaching = engagementModule('coaching');
  MODULES.mentoring = engagementModule('mentoring');

  MODULES.requests = {
    active:'requests', title:'Request centre', crumb:'Requests',
    subtitle:'A single intake for training, content, coaching and L&D support.',
    service:function () { return S.requests; }, exportName:'lnd-requests',
    columns:[{ key:'reference', label:'Reference' }, { key:'title', label:'Title' },
      { key:'type', label:'Type' }, { key:'requester', label:'Requester' },
      { key:'department', label:'Department' }, { key:'priority', label:'Priority' },
      { key:'status', label:'Status' }, { key:'assignee', label:'Assignee' },
      { label:'Needed by', value:function (r) { return r.neededBy ? U.date(r.neededBy) : ''; } }],
    stats:function () {
      return S.requests.summary().then(function (st) {
        return stat('All requests', U.num(st.total), 'inbox', '') +
          stat('Open', U.num(st.open), 'activity', 'amber') +
          stat('Completed', U.num(st.completed), 'checkCircle', 'green') +
          stat('Rejected', U.num(st.rejected), 'xCircle', 'red');
      });
    },
    charts:function () {
      return S.requests.summary().then(function (st) {
        return [
          card('Pipeline', 'Where requests sit in the workflow',
            C.bar(st.byStatus, { height:230, label:'Request pipeline' })),
          card('By request type', 'What the business asks for',
            C.hbars(st.byType.slice(0,7)))];
      });
    },
    newAction:{ label:'Raise a request', run:function (reload) {
      var h = UI.modal({ title:'Raise a request', subtitle:'Tell the L&D team what you need.',
        size:'lg',
        body:'<form id="req-form" novalidate><div class="grid grid-2 gap-4">' +
          '<div class="field"><label class="label" for="rq-type">Request type</label>' +
            '<select class="select" id="rq-type" name="type">' +
            GGL.data.requestTypes.map(function (t) { return '<option>' + U.esc(t) + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="field"><label class="label" for="rq-pri">Priority</label>' +
            '<select class="select" id="rq-pri" name="priority">' +
            ['Low','Medium','High','Critical'].map(function (p) {
              return '<option' + (p === 'Medium' ? ' selected' : '') + '>' + p + '</option>';
            }).join('') + '</select></div></div>' +
          '<div class="field"><label class="label" for="rq-title">Title <span class="req">*</span></label>' +
            '<input class="input" id="rq-title" name="title" placeholder="Summarise the need in one line"></div>' +
          '<div class="field"><label class="label" for="rq-desc">Description <span class="req">*</span></label>' +
            '<textarea class="textarea" id="rq-desc" name="description" ' +
            'placeholder="What is needed, for whom, and why now?"></textarea></div>' +
          '<div class="grid grid-2 gap-4">' +
            '<div class="field"><label class="label" for="rq-aud">Audience</label>' +
              '<select class="select" id="rq-aud" name="audience">' +
              ['My team','Whole department','Selected individuals','All staff'].map(function (a) {
                return '<option>' + a + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label class="label" for="rq-head">Approximate headcount</label>' +
              '<input class="input" id="rq-head" name="headcount" type="number" min="1" max="500" value="10"></div></div>' +
          '<div class="field"><label class="label" for="rq-by">Needed by</label>' +
            '<input class="input" id="rq-by" name="neededBy" type="date"></div></form>',
        footer:'<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
          '<button type="submit" form="req-form" class="btn btn-primary">' +
          GGL.icon('send','ico') + '<span>Submit request</span></button>' });
      h.overlay.querySelector('[data-cancel]').addEventListener('click', h.close);
      UI.handleSubmit(h.overlay.querySelector('#req-form'), {
        title:[U.validators.required, U.validators.min(8)],
        description:[U.validators.required, U.validators.min(20)]
      }, function (v) {
        var me = S.auth.getUser();
        return S.requests.create({
          reference:'REQ-' + Math.floor(5000 + Math.random() * 4000),
          type:v.type, title:v.title, description:v.description,
          requester:me.name, requesterId:me.id, department:me.department,
          audience:v.audience, headcount:Number(v.headcount) || 1,
          priority:v.priority, status:'Submitted', assignee:null,
          neededBy: v.neededBy ? new Date(v.neededBy).toISOString() : null,
          updatedAt:new Date().toISOString() });
      }, { success:'Request submitted', successDesc:'The L&D team will review and come back to you.',
        onDone:function () { h.close(); reload(); } });
    }},
    table:{ searchPlaceholder:'Search reference, title or requester…',
      defaultSort:'createdAt', defaultDir:'desc',
      filters:[{ key:'status', label:'Status', options:GGL.data.requestStates.map(function (s) {
        return { value:s, label:s }; })},
        { key:'priority', label:'Priority', options:['Critical','High','Medium','Low']
          .map(function (p) { return { value:p, label:p }; })}],
      columns:[
        { key:'title', label:'Request', sortable:true, primary:true,
          render:function (r) {
            return '<div class="fw-medium truncate" style="max-width:280px">' + U.esc(r.title) + '</div>' +
              '<div class="text-xs text-muted"><code>' + U.esc(r.reference) + '</code> · ' +
              U.esc(r.type) + '</div>';
          }},
        { key:'requester', label:'Requester', sortable:true, hideBelow:'md',
          render:function (r) { return U.userCell(r.requester, r.department); }},
        { key:'neededBy', label:'Needed by', sortable:true, hideBelow:'lg',
          render:function (r) { return r.neededBy ? U.date(r.neededBy) : '—'; }},
        { key:'assignee', label:'Assignee', sortable:true, hideBelow:'lg',
          render:function (r) { return r.assignee || '<span class="text-subtle">Unassigned</span>'; }},
        { key:'priority', label:'Priority', sortable:true,
          render:function (r) { return priorityBadge(r.priority); }},
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); }}],
      extraActions:function (r, api) {
        var me = S.auth.getUser();
        if (me.role === GGL.ROLES.END_USER) return [];
        var flow = { Submitted:'Under Review', 'Under Review':'Assigned',
          Assigned:'In Progress', 'In Progress':'Completed' };
        var next = flow[r.status], out = [];
        if (next) out.push({ label:'Move to ' + next, icon:'arrowRight', onClick:function (row) {
          S.requests.setStatus(row.id, next, next === 'Assigned' ? me.name : null).then(function () {
            UI.toast('Moved to ' + next, { type:'success' }); api.reload();
          });
        }});
        if (['Completed','Rejected'].indexOf(r.status) === -1) {
          out.push({ label:'Reject request', icon:'xCircle', tone:'danger', onClick:function (row) {
            UI.confirm({ title:'Reject this request?', message:row.reference + ' — ' + row.title,
              detail:'The requester would be notified with a reason in production.',
              confirmLabel:'Reject',
              onConfirm:function () {
                return S.requests.setStatus(row.id, 'Rejected').then(function () {
                  UI.toast('Request rejected', { type:'success' }); api.reload();
                });
              }});
          }});
        }
        return out;
      }},
    detail:function (r) {
      var states = GGL.data.requestStates.filter(function (s) { return s !== 'Rejected'; });
      var idx = states.indexOf(r.status);
      return { title:r.title, subtitle:r.reference + ' · ' + r.type,
        body:(r.status === 'Rejected'
          ? '<div class="alert alert-danger mb-5">' + GGL.icon('xCircle','ico') +
            '<div class="text-sm">This request was rejected.</div></div>'
          : '<div class="wizard-steps mb-5">' + states.map(function (st, i) {
              var cls = i === idx ? ' active' : i < idx ? ' done' : '';
              return '<span class="wizard-step' + cls + '"><span class="n">' +
                (i < idx ? '✓' : i+1) + '</span><span>' + st + '</span></span>';
            }).join('') + '</div>') +
          '<div class="row gap-2 mb-5 wrap">' + priorityBadge(r.priority) + U.statusBadge(r.status) + '</div>' +
          '<h4 class="mb-2">Description</h4><p class="text-muted">' + U.esc(r.description) + '</p>' +
          kv([['Requester', r.requester], ['Department', r.department], ['Audience', r.audience],
            ['Headcount', String(r.headcount)], ['Assignee', r.assignee || 'Unassigned'],
            ['Needed by', r.neededBy ? U.date(r.neededBy,'long') : '—'],
            ['Raised', U.date(r.createdAt,'long')]]) };
    }
  };

  MODULES.paths = {
    active:'paths', title:'Learning paths', crumb:'Learning Paths',
    subtitle:'Sequenced programmes that build capability over time.',
    service:function () { return S.paths; }, exportName:'learning-paths',
    columns:[{ key:'name', label:'Path' }, { key:'category', label:'Category' },
      { label:'Courses', value:function (r) { return r.steps.length; } },
      { label:'Duration (mins)', value:function (r) { return r.totalMins; } },
      { key:'enrolled', label:'Enrolled' }, { key:'completed', label:'Completed' },
      { key:'owner', label:'Owner' }, { key:'status', label:'Status' }],
    stats:function () {
      return S.paths.all().then(function (rows) {
        return stat('Learning paths', U.num(rows.length), 'compass', '') +
          stat('Published', U.num(rows.filter(function (r) { return r.status === 'Published'; }).length), 'checkCircle', 'green') +
          stat('Total enrolled', U.num(U.sum(rows,'enrolled')), 'users', 'teal') +
          stat('Completions', U.num(U.sum(rows,'completed')), 'award', 'violet');
      });
    },
    charts:function () {
      return S.paths.all().then(function (rows) {
        return [
          card('Completion rate', 'Completions against enrolments',
            C.hbars(rows.map(function (r) {
              return { label:r.name, value: r.enrolled ? Math.round((r.completed / r.enrolled) * 100) : 0 };
            }).sort(function (a,b) { return b.value - a.value; }), { suffix:'%' })),
          card('Programme length', 'Total learning hours per path',
            C.hbars(rows.map(function (r) {
              return { label:r.name, value:Math.round(r.totalMins / 60) };
            }).sort(function (a,b) { return b.value - a.value; }), { suffix:' hrs' }))];
      });
    },
    table:{ searchPlaceholder:'Search path, category or owner…',
      defaultSort:'enrolled', defaultDir:'desc',
      filters:[{ key:'status', label:'Status', options:[{ value:'Published', label:'Published' },
        { value:'Draft', label:'Draft' }]}],
      columns:[
        { key:'name', label:'Path', sortable:true, primary:true,
          render:function (r) {
            return '<div class="fw-medium">' + U.esc(r.name) + '</div>' +
              '<div class="text-xs text-muted">' + r.steps.length + ' courses · ' +
              Math.round(r.totalMins / 60) + ' hours</div>';
          }},
        { key:'category', label:'Category', sortable:true, hideBelow:'md' },
        { key:'owner', label:'Owner', sortable:true, hideBelow:'lg' },
        { key:'enrolled', label:'Enrolled', sortable:true, align:'right', hideBelow:'md',
          render:function (r) { return U.num(r.enrolled); }},
        { key:'completed', label:'Completion', sortable:true, width:'150px',
          render:function (r) {
            return U.progressCell(r.enrolled ? Math.round((r.completed / r.enrolled) * 100) : 0);
          }},
        { key:'status', label:'Status', sortable:true,
          render:function (r) { return U.statusBadge(r.status); }}]},
    detail:function (r) {
      return { title:r.name,
        subtitle:r.category + ' · ' + r.steps.length + ' courses · ' + Math.round(r.totalMins / 60) + ' hours',
        body:'<div class="row gap-2 mb-5 wrap">' + U.statusBadge(r.status) +
          '<span class="badge badge-plain">' + U.esc(r.category) + '</span></div>' +
          '<p class="text-muted">' + U.esc(r.description) + '</p>' +
          '<h4 class="mt-5 mb-3">Path sequence</h4><ul class="session-list">' +
          r.steps.map(function (s) {
            return '<li><span class="session-date" style="width:40px">' +
              '<span class="d" style="font-size:var(--fs-base)">' + s.order + '</span></span>' +
              '<span class="session-info"><h4 class="truncate">' + U.esc(s.title) + '</h4>' +
              '<span class="meta"><span>' + GGL.icon('clock','ico') + U.duration(s.durationMins) + '</span>' +
              (s.required ? '<span>' + GGL.icon('check','ico') + 'Required</span>' : '') +
              '</span></span></li>';
          }).join('') + '</ul>' +
          kv([['Owner', r.owner], ['Enrolled', U.num(r.enrolled)], ['Completed', U.num(r.completed)],
            ['Created', U.date(r.createdAt,'long')]]),
        actions:'<a class="btn btn-primary" href="' + GGL.url('app/courses.html') + '">View courses</a>' };
    }
  };

  MODULES.audit = {
    active:'audit', title:'Audit log', crumb:'Audit Log',
    subtitle:'An immutable record of who changed what, and when.',
    superAdminOnly:true, service:function () { return S.audit; }, exportName:'audit-log',
    columns:[{ label:'Timestamp', value:function (r) { return U.date(r.at) + ' ' + U.time(r.at); } },
      { key:'actor', label:'Actor' }, { key:'actorRole', label:'Role' },
      { key:'action', label:'Action' }, { key:'label', label:'Description' },
      { key:'module', label:'Module' }, { key:'target', label:'Target' },
      { key:'severity', label:'Severity' }, { key:'result', label:'Result' },
      { key:'ip', label:'Source IP' }],
    stats:function () {
      return S.audit.summary().then(function (st) {
        return stat('Events', U.num(st.total), 'shield', '') +
          stat('High severity', U.num(st.high), 'alert', 'red') +
          stat('Failed actions', U.num(st.failed), 'xCircle', 'amber') +
          stat('Distinct actors', U.num(st.actors), 'users', 'teal');
      });
    },
    charts:function () {
      return S.audit.summary().then(function (st) {
        return [
          card('Activity by module', 'Where changes are concentrated',
            C.hbars(st.byModule.slice(0,8), { suffix:' events' })),
          card('Retention', 'Configured in platform settings',
            '<div class="text-center" style="padding:var(--sp-6) 0">' +
            '<div style="font-size:var(--fs-3xl);font-weight:var(--fw-bold)">' +
            GGL.data.platformSettings.retention.auditLogYears + ' years</div>' +
            '<div class="text-sm text-muted">Audit log retention period</div>' +
            '<p class="hint mt-4">Events older than the retention period would be archived ' +
            'automatically in production.</p></div>')];
      });
    },
    table:{ searchPlaceholder:'Search actor, action, module or target…',
      defaultSort:'at', defaultDir:'desc', noRowActions:true,
      filters:[{ key:'severity', label:'Severity', options:['High','Medium','Low']
        .map(function (s) { return { value:s, label:s }; })},
        { key:'result', label:'Result', options:[{ value:'Success', label:'Success' },
          { value:'Failed', label:'Failed' }]}],
      columns:[
        { key:'at', label:'When', sortable:true, primary:true,
          render:function (r) {
            return '<div class="fw-medium">' + U.date(r.at) + '</div>' +
              '<div class="text-xs text-muted">' + U.time(r.at) + '</div>';
          }},
        { key:'actor', label:'Actor', sortable:true, hideBelow:'md',
          render:function (r) { return U.userCell(r.actor, r.actorRole); }},
        { key:'label', label:'Action', sortable:true,
          render:function (r) {
            return '<div class="row gap-2"><span class="stat-icon" style="width:26px;height:26px">' +
              GGL.icon(r.icon,'ico') + '</span><span>' +
              '<span class="fw-medium">' + U.esc(r.label) + '</span>' +
              '<div class="text-xs text-muted"><code>' + U.esc(r.action) + '</code></div></span></div>';
          }},
        { key:'target', label:'Target', sortable:true, hideBelow:'lg',
          render:function (r) {
            return '<div class="truncate" style="max-width:200px">' + U.esc(r.target) + '</div>';
          }},
        { key:'module', label:'Module', sortable:true, hideBelow:'lg' },
        { key:'severity', label:'Severity', sortable:true,
          render:function (r) {
            var t = r.severity === 'High' ? 'danger' : r.severity === 'Medium' ? 'warning' : 'plain';
            return '<span class="badge badge-' + t + '">' + U.esc(r.severity) + '</span>';
          }},
        { key:'result', label:'Result', sortable:true, hideBelow:'md',
          render:function (r) {
            return r.result === 'Success' ? '<span class="badge badge-success">Success</span>'
              : '<span class="badge badge-danger">Failed</span>';
          }}]},
    detail:function (r) {
      return { title:r.label, subtitle:U.date(r.at,'long') + ' at ' + U.time(r.at),
        body:'<div class="row gap-2 mb-5 wrap">' +
          '<span class="badge badge-' + (r.severity === 'High' ? 'danger'
            : r.severity === 'Medium' ? 'warning' : 'plain') + '">' + U.esc(r.severity) + '</span>' +
          '<span class="badge badge-' + (r.result === 'Success' ? 'success' : 'danger') + '">' +
          U.esc(r.result) + '</span></div>' +
          kv([['Action code', '<code>' + U.esc(r.action) + '</code>', true], ['Module', r.module],
            ['Actor', r.actor + ' (' + r.actorRole + ')'], ['Target', r.target],
            ['Source IP', r.ip], ['Timestamp', U.date(r.at,'long') + ', ' + U.time(r.at)]]) +
          '<div class="alert mt-5">' + GGL.icon('lock','ico') + '<div class="text-sm">' +
          'Audit entries are append-only. In production they would be written to tamper-evident ' +
          'storage and could not be edited or deleted from the interface.</div></div>' };
    }
  };

  /* =============================== CALENDAR ============================= */
  P.calendar = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var MONTHS = ['January','February','March','April','May','June','July','August',
      'September','October','November','December'];
    var state = { view:U.store.get('calendarView','month'), cursor:new Date(), sessions:[] };

    function sameDay(a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
    }
    function eventTone(s) { return { Classroom:'', Virtual:'teal', Hybrid:'violet' }[s.mode] || ''; }

    function monthView() {
      var c = state.cursor;
      var first = new Date(c.getFullYear(), c.getMonth(), 1);
      var start = new Date(first);
      start.setDate(1 - ((first.getDay() + 6) % 7));
      var today = new Date(), cells = '';
      for (var i = 0; i < 42; i++) {
        var day = new Date(start);
        day.setDate(start.getDate() + i);
        var events = state.sessions.filter(function (s) { return sameDay(new Date(s.start), day); });
        cells += '<div class="cal-cell' + (day.getMonth() !== c.getMonth() ? ' muted' : '') +
          (sameDay(day, today) ? ' today' : '') + (events.length ? ' has-events' : '') + '">' +
          '<span class="cal-daynum">' + day.getDate() + '</span>' +
          events.slice(0,3).map(function (e) {
            return '<button type="button" class="cal-event ' + eventTone(e) + '" data-session="' +
              U.esc(e.id) + '" title="' + U.esc(e.title) + '">' + U.time(e.start) + ' ' +
              U.esc(e.batchName) + '</button>';
          }).join('') +
          (events.length > 3 ? '<span class="cal-more">+' + (events.length - 3) + ' more</span>' : '') +
          '</div>';
      }
      return '<div class="cal-grid">' + DOW.map(function (d) {
        return '<div class="cal-dow">' + d + '</div>';
      }).join('') + cells + '</div>';
    }

    function weekView() {
      var c = state.cursor;
      var start = new Date(c);
      start.setDate(c.getDate() - ((c.getDay() + 6) % 7));
      var today = new Date(), cells = '';
      for (var i = 0; i < 7; i++) {
        var day = new Date(start);
        day.setDate(start.getDate() + i);
        var events = state.sessions.filter(function (s) { return sameDay(new Date(s.start), day); });
        cells += '<div class="cal-cell' + (sameDay(day, today) ? ' today' : '') +
          '" style="min-height:240px"><span class="cal-daynum">' + day.getDate() + '</span>' +
          (events.length ? events.map(function (e) {
            return '<button type="button" class="cal-event ' + eventTone(e) + '" data-session="' +
              U.esc(e.id) + '" style="white-space:normal;padding:var(--sp-2)"><strong>' +
              U.time(e.start) + '</strong><br>' + U.esc(e.batchName) + '</button>';
          }).join('') : '<span class="cal-more">—</span>') + '</div>';
      }
      return '<div class="cal-grid">' + DOW.map(function (d, i) {
        var day = new Date(start); day.setDate(start.getDate() + i);
        return '<div class="cal-dow">' + d + ' ' + day.getDate() + '</div>';
      }).join('') + cells + '</div>';
    }

    function agendaView() {
      var upcoming = state.sessions.filter(function (s) {
        return new Date(s.start) >= new Date(new Date().setHours(0,0,0,0));
      }).slice(0,20);
      if (!upcoming.length) {
        return '<div class="card-body">' + UI.empty({ icon:'calendar',
          title:'Nothing scheduled ahead',
          message:'There are no upcoming sessions in the sample data.' }) + '</div>';
      }
      var grouped = U.groupBy(upcoming, function (s) { return U.date(s.start, 'long'); });
      return '<div class="card-body">' + Object.keys(grouped).map(function (date) {
        return '<h4 class="mb-3 mt-4">' + U.esc(date) + '</h4>' + sessionList(grouped[date], '');
      }).join('') + '</div>';
    }

    function titleFor() {
      var c = state.cursor;
      if (state.view === 'agenda') return 'Upcoming sessions';
      if (state.view === 'week') {
        var start = new Date(c);
        start.setDate(c.getDate() - ((c.getDay() + 6) % 7));
        var end = new Date(start); end.setDate(start.getDate() + 6);
        return U.date(start.toISOString()) + ' – ' + U.date(end.toISOString());
      }
      return MONTHS[c.getMonth()] + ' ' + c.getFullYear();
    }

    function openSession(id) {
      var s = state.sessions.filter(function (x) { return x.id === id; })[0];
      if (!s) return;
      UI.modal({ title:s.title, subtitle:U.date(s.start,'long') + ' · ' + U.time(s.start), size:'sm',
        body:'<div class="row gap-2 mb-5 wrap">' +
          U.statusBadge(s.status === 'Today' ? 'Active' : s.status) +
          '<span class="badge badge-plain">' + U.esc(s.mode) + '</span></div>' +
          kv([['Batch', s.batchName], ['Trainer', s.trainer], ['Duration', U.duration(s.durationMins)],
            ['Location', s.location], ['Trainees', String(s.trainees)]].concat(
            s.attendance !== null && s.attendance !== undefined
              ? [['Attendance', s.attendance + '%']] : [])),
        footer:'<button type="button" class="btn btn-secondary" data-close>Close</button>' +
          (s.mode === 'Virtual' ? '<button type="button" class="btn btn-primary" data-join>Join session</button>'
            : '<a class="btn btn-primary" href="' + GGL.url('app/attendance.html') + '">Attendance</a>'),
        onMount:function (h) {
          h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
          var join = h.overlay.querySelector('[data-join]');
          if (join) join.addEventListener('click', function () {
            UI.toast('Virtual meeting not connected', { type:'info',
              desc:'Meeting links are a placeholder in this prototype.' });
          });
        }});
    }

    function render(container) {
      container.innerHTML = '<div class="card"><div class="cal-head">' +
        '<div class="row gap-2">' +
        '<button type="button" class="btn-icon" data-nav="-1" aria-label="Previous">' +
        GGL.icon('chevronLeft','ico') + '</button>' +
        '<button type="button" class="btn-icon" data-nav="1" aria-label="Next">' +
        GGL.icon('chevronRight','ico') + '</button>' +
        '<button type="button" class="btn btn-sm btn-secondary" data-today>Today</button>' +
        '<h2 class="cal-title" style="margin-left:var(--sp-3)">' + U.esc(titleFor()) + '</h2></div>' +
        '<div class="segmented" role="group" aria-label="Calendar view">' +
        ['month','week','agenda'].map(function (v) {
          return '<button type="button" data-cal-view="' + v + '" aria-pressed="' +
            (state.view === v) + '">' + v.charAt(0).toUpperCase() + v.slice(1) + '</button>';
        }).join('') + '</div></div>' +
        (state.view === 'month' ? monthView() : state.view === 'week' ? weekView() : agendaView()) +
        '</div>' +
        '<div class="row gap-4 mt-4 wrap text-sm text-muted">' +
        '<span class="row gap-2"><i style="width:10px;height:10px;border-radius:3px;background:var(--accent);display:block"></i>Classroom</span>' +
        '<span class="row gap-2"><i style="width:10px;height:10px;border-radius:3px;background:var(--teal-500);display:block"></i>Virtual</span>' +
        '<span class="row gap-2"><i style="width:10px;height:10px;border-radius:3px;background:var(--violet-500);display:block"></i>Hybrid</span></div>';

      U.$$('[data-nav]', container).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var dir = Number(btn.getAttribute('data-nav'));
          if (state.view === 'week') state.cursor.setDate(state.cursor.getDate() + dir * 7);
          else state.cursor.setMonth(state.cursor.getMonth() + dir);
          render(container);
        });
      });
      container.querySelector('[data-today]').addEventListener('click', function () {
        state.cursor = new Date(); render(container);
      });
      U.$$('[data-cal-view]', container).forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.view = btn.getAttribute('data-cal-view');
          U.store.set('calendarView', state.view);
          render(container);
        });
      });
      U.$$('[data-session]', container).forEach(function (btn) {
        btn.addEventListener('click', function () { openSession(btn.getAttribute('data-session')); });
      });
    }

    var isLearner = user.role === GGL.ROLES.END_USER;
    var body = GGL.shell.mount({ active:'calendar', title:'Training calendar',
      subtitle: isLearner ? 'Sessions you are booked onto.'
        : 'Every scheduled session across batches and trainers.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Calendar' }] });
    if (!body) return;
    body.innerHTML = '<div id="cal-root"></div>';
    var root = document.getElementById('cal-root');
    UI.async(root, '<div class="card card-pad"><div class="skel skel-chart" style="height:420px"></div></div>',
      function () {
        return S.sessions.all().then(function (rows) { state.sessions = rows; render(root); });
      });
  };

  /* ========================== PLATFORM SETTINGS ======================== */
  P.platform = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var body = GGL.shell.mount({ active:'platform', title:'Platform settings',
      subtitle:'Organisation, learning rules, access, notifications and retention.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Platform settings' }] });
    if (!body) return;
    if (user.role !== GGL.ROLES.SUPER_ADMIN) {
      body.innerHTML = denied('Platform settings are restricted to Super Admins.');
      return;
    }
    var GROUPS = [
      { key:'organisation', title:'Organisation', icon:'globe', fields:[
        ['name','Organisation name','text'],['shortName','Short name','text'],
        ['primaryContact','Primary contact','text'],['supportEmail','Support email','email'],
        ['timezone','Timezone','text'],['fiscalYearStart','Fiscal year starts','text']]},
      { key:'learning', title:'Learning rules', icon:'bookOpen', fields:[
        ['defaultPassMark','Default pass mark (%)','number'],
        ['maxAttempts','Maximum assessment attempts','number'],
        ['certificateValidityYears','Certificate validity (years)','number'],
        ['mandatoryCompletionDays','Mandatory completion window (days)','number'],
        ['attendanceThreshold','Minimum attendance (%)','number'],
        ['tofThreshold','TOF threshold (%)','number'],
        ['effectivenessThreshold','Effectiveness threshold (%)','number']]},
      { key:'access', title:'Access & security', icon:'shield', fields:[
        ['ssoEnabled','Single sign-on','bool'],['selfRegistration','Allow self-registration','bool'],
        ['mfaRequired','Require multi-factor authentication','bool'],
        ['sessionTimeoutMins','Session timeout (minutes)','number'],
        ['passwordMinLength','Minimum password length','number']]},
      { key:'notifications', title:'Notifications', icon:'bell', fields:[
        ['sessionReminderHours','Session reminder (hours before)','number'],
        ['assessmentReminderDays','Assessment reminder (days before)','number'],
        ['escalateOverdueDays','Escalate overdue after (days)','number'],
        ['weeklyDigest','Send weekly digest','bool']]},
      { key:'retention', title:'Data retention', icon:'database', fields:[
        ['learningRecordsYears','Learning records (years)','number'],
        ['auditLogYears','Audit log (years)','number'],
        ['attendanceYears','Attendance records (years)','number'],
        ['anonymiseOnExit','Anonymise records when a user leaves','bool']]}
    ];
    body.innerHTML = '<div class="tabs mb-5" role="tablist" aria-label="Settings groups">' +
      GROUPS.map(function (g, i) {
        return '<button type="button" class="tab" role="tab" id="ps-t' + i + '" ' +
          'aria-controls="ps-p' + i + '" aria-selected="' + (i === 0) + '">' + U.esc(g.title) + '</button>';
      }).join('') + '</div>' +
      GROUPS.map(function (g, i) {
        return '<div id="ps-p' + i + '" role="tabpanel" aria-labelledby="ps-t' + i + '"' +
          (i === 0 ? '' : ' hidden') + '><div class="card card-pad"><div class="skel skel-row"></div></div></div>';
      }).join('') +
      '<div class="card card-pad mt-5"><div class="row-between wrap gap-3">' +
      '<div><strong class="text-sm">Reset platform settings</strong>' +
      '<div class="text-xs text-muted">Restores every group to its shipped default.</div></div>' +
      '<button type="button" class="btn btn-danger-ghost btn-sm" data-reset-settings>' +
      GGL.icon('refresh','ico') + '<span>Reset to defaults</span></button></div></div>';
    UI.initTabs(body);

    S.platformSettings.get().then(function (settings) {
      GROUPS.forEach(function (g, i) {
        var panel = document.getElementById('ps-p' + i);
        var values = settings[g.key] || {};
        panel.innerHTML = '<div class="card"><div class="card-head"><div class="row gap-3">' +
          '<span class="stat-icon">' + GGL.icon(g.icon,'ico') + '</span>' +
          '<div><h3>' + U.esc(g.title) + '</h3>' +
          '<p class="sub">Applies across the whole platform</p></div></div></div>' +
          '<div class="card-body"><form data-settings-form="' + g.key + '" novalidate>' +
          g.fields.map(function (f) {
            var val = values[f[0]];
            if (f[2] === 'bool') {
              return '<div class="criteria-row"><div><div class="c-label">' + U.esc(f[1]) + '</div></div>' +
                '<label class="switch"><input type="checkbox" name="' + f[0] + '"' +
                (val ? ' checked' : '') + '><span class="track"></span>' +
                '<span class="sr-only">' + U.esc(f[1]) + '</span></label></div>';
            }
            return '<div class="field"><label class="label" for="ps-' + g.key + '-' + f[0] + '">' +
              U.esc(f[1]) + '</label><input class="input" id="ps-' + g.key + '-' + f[0] +
              '" name="' + f[0] + '" type="' + f[2] + '" value="' +
              U.esc(val === undefined ? '' : val) + '"></div>';
          }).join('') +
          '<button type="submit" class="btn btn-primary mt-4">Save ' +
          U.esc(g.title.toLowerCase()) + '</button></form></div></div>';

        UI.handleSubmit(panel.querySelector('form'), {}, function (v) {
          var payload = {};
          g.fields.forEach(function (f) {
            payload[f[0]] = f[2] === 'bool' ? !!v[f[0]] : f[2] === 'number' ? Number(v[f[0]]) : v[f[0]];
          });
          return S.platformSettings.save(g.key, payload);
        }, { reset:false, success:g.title + ' saved' });
      });
    });

    document.querySelector('[data-reset-settings]').addEventListener('click', function () {
      UI.confirm({ title:'Reset platform settings?',
        message:'Every settings group returns to its shipped default.',
        confirmLabel:'Reset settings',
        onConfirm:function () {
          return S.platformSettings.reset().then(function () {
            UI.toast('Settings reset', { type:'success', desc:'Reloading…' });
            setTimeout(function () { window.location.reload(); }, 800);
          });
        }});
    });
  };

  /* ======================== EFFECTIVENESS OVERVIEW ====================== */
  P.effectiveness = function () {
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    if (user.role === GGL.ROLES.END_USER && user.workspaceType !== 'individual') {
      var b0 = GGL.shell.mount({ active:'effectiveness', title:'Training effectiveness',
        breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Effectiveness' }] });
      if (b0) b0.innerHTML = denied('Effectiveness measurement is available to administrators.');
      return;
    }
    var body = GGL.shell.mount({ active:'effectiveness', title:'Training effectiveness',
      subtitle:'Reaction, learning, behaviour and results — measured from real assessment data.',
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:'Effectiveness' }],
      actions:'<a class="btn btn-secondary" href="' + GGL.url('app/observation.html') + '">' +
        GGL.icon('clipboard','ico') + '<span>Observations</span></a>' +
        '<a class="btn btn-primary" href="' + GGL.url('app/effectiveness-calculator.html') + '">' +
        GGL.icon('activity','ico') + '<span>Calculator</span></a>' });
    if (!body) return;

    body.innerHTML = '<div class="grid grid-4 mb-6" id="e-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-1-1 mb-6"><div id="e-gauge"></div><div id="e-trend"></div></div>' +
      '<div id="e-courses"></div>';

    UI.async(document.getElementById('e-stats'), UI.skeletonCards(4), function () {
      return S.reports.effectiveness().then(function (e) {
        document.getElementById('e-stats').innerHTML =
          stat('Overall effectiveness', e.overall, 'trending', 'violet') +
          stat('Learner satisfaction', e.satisfaction + '%', 'star', 'amber') +
          stat('Knowledge gain', '+' + e.knowledgeGain + ' pts', 'lightbulb', 'teal') +
          stat('Would recommend', e.recommend + '%', 'checkCircle', 'green');

        document.getElementById('e-gauge').innerHTML = card('Effectiveness by dimension',
          'Kirkpatrick-aligned measures across ' + U.num(e.responses) + ' responses',
          '<div class="row gap-6 wrap" style="justify-content:center">' +
          C.gauge(e.overall, { size:150, caption:'Overall score' }) +
          '<div class="grow" style="min-width:220px">' + C.hbars([
            { label:'Reaction', value:Math.round(e.reaction * 20) },
            { label:'Learning', value:Math.min(100, e.knowledgeGain + 50) },
            { label:'Behaviour', value:e.behaviour },
            { label:'Results', value:e.results }], { suffix:'%' }) + '</div></div>' +
          '<p class="hint mt-4">Reaction is scaled from the 1–5 satisfaction rating. Learning is ' +
          'derived from real pre and post <a href="' + GGL.url('app/assessments.html') +
          '">assessment attempts</a>.</p>');

        var rows = e.rows.slice().sort(function (a,b) { return b.overall - a.overall; });
        document.getElementById('e-courses').innerHTML =
          '<div class="card"><div class="card-head"><div><h3>Effectiveness by course</h3>' +
          '<p class="sub">Highest and lowest performing programmes</p></div>' +
          '<a class="btn btn-sm btn-ghost" href="' + GGL.url('app/reports.html') + '">Reports</a></div>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>Course</th>' +
          '<th class="hide-md">Trainer</th><th class="hide-sm">Responses</th>' +
          '<th class="hide-md">Pre → Post</th><th>Gain</th><th>Overall</th></tr></thead><tbody>' +
          rows.slice(0,8).map(function (r) {
            return '<tr><td class="cell-primary"><div class="truncate" style="max-width:260px">' +
              U.esc(r.course) + '</div><div class="text-xs text-muted">' + U.esc(r.category) + '</div></td>' +
              '<td class="hide-md">' + U.esc(r.trainer) + '</td>' +
              '<td class="hide-sm">' + U.num(r.responses) + '</td>' +
              '<td class="hide-md">' + r.preScore + '% → ' + r.postScore + '%</td>' +
              '<td><span class="badge badge-success">+' + r.gain + '</span></td>' +
              '<td style="width:150px">' + U.progressCell(r.overall) + '</td></tr>';
          }).join('') + '</tbody></table></div></div>';
      });
    });
    UI.async(document.getElementById('e-trend'), '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return S.reports.series('effectivenessTrend').then(function (series) {
        document.getElementById('e-trend').innerHTML = card('Effectiveness trend', 'Rolling 12 months',
          C.line(series, { height:250, color:'var(--viz-4)', label:'Effectiveness trend', zeroBased:false }),
          '<span class="badge badge-success">Improving</span>');
      });
    });
  };

  /* ========================= GENERIC MODULE RUNNER ===================== */
  function openDetail(mod, row) {
    var d = mod.detail(row);
    UI.modal({ title:d.title, subtitle:d.subtitle, size:'lg', body:d.body,
      footer:'<button type="button" class="btn btn-secondary" data-close>Close</button>' + (d.actions || ''),
      onMount:function (h) {
        h.overlay.querySelector('[data-close]').addEventListener('click', h.close);
        if (d.onMount) d.onMount(h, row);
      }});
  }

  function runModule(key) {
    var mod = MODULES[key];
    if (!mod) return;
    var user = S.auth.getUser();
    if (!user) { S.auth.requireAuth(); return; }
    var isLearner = user.role === GGL.ROLES.END_USER;
    var isIndividual = isLearner && user.workspaceType === 'individual';
    var blocked = !isIndividual && ((mod.adminOnly && isLearner) ||
      (mod.superAdminOnly && user.role !== GGL.ROLES.SUPER_ADMIN));

    var body = GGL.shell.mount({ active:mod.active, title:mod.title, subtitle:mod.subtitle,
      breadcrumbs:[{ label:'Home', href:'app/dashboard.html' }, { label:mod.crumb }],
      actions: blocked ? '' :
        '<button type="button" class="btn btn-secondary" data-export>' +
        GGL.icon('download','ico') + '<span>Export</span></button>' +
        (mod.newAction ? '<button type="button" class="btn btn-primary" data-new>' +
          GGL.icon('plus','ico') + '<span>' + U.esc(mod.newAction.label) + '</span></button>' : '') });
    if (!body) return;

    if (blocked) {
      body.innerHTML = denied(mod.superAdminOnly
        ? 'This area is restricted to Super Admins.' : 'This area is available to administrators.');
      return;
    }
    if (isLearner && mod.learnerView && !isIndividual) { mod.learnerView(body, user); return; }

    body.innerHTML = '<div class="grid grid-4 mb-6" id="m-stats">' + UI.skeletonCards(4) + '</div>' +
      '<div class="split-1-1 mb-6" id="m-charts">' +
      '<div class="card card-pad"><div class="skel skel-chart"></div></div>' +
      '<div class="card card-pad"><div class="skel skel-chart"></div></div></div>' +
      '<div id="m-table"></div>';

    UI.async(document.getElementById('m-stats'), UI.skeletonCards(4), function () {
      return mod.stats().then(function (html) { document.getElementById('m-stats').innerHTML = html; });
    });
    UI.async(document.getElementById('m-charts'),
      '<div class="card card-pad"><div class="skel skel-chart"></div></div>' +
      '<div class="card card-pad"><div class="skel skel-chart"></div></div>', function () {
      return mod.charts().then(function (parts) {
        document.getElementById('m-charts').innerHTML =
          parts.map(function (p) { return '<div>' + p + '</div>'; }).join('');
      });
    });

    var t = mod.table, svc = mod.service();
    var api = GGL.DataTable(document.getElementById('m-table'), {
      searchPlaceholder:t.searchPlaceholder, pageSize:10,
      defaultSort:t.defaultSort, defaultDir:t.defaultDir,
      columns:t.columns, filters:t.filters, selectable:t.selectable,
      bulkActions:t.bulkActions,
      fetch:function (q) {
        /* Learners only ever see their own rows in the request centre */
        if (isLearner && key === 'requests') {
          return svc.list(q).then(function (page) {
            var mine = page.all.filter(function (r) { return r.requesterId === user.id; });
            var paged = U.paginate(mine, q.page, q.size);
            paged.all = mine;
            return paged;
          });
        }
        return svc.list(q);
      },
      onRowClick:function (row) { openDetail(mod, row); },
      rowActions: t.noRowActions ? null : function (row, tableApi) {
        var base = [{ label:'View details', icon:'eye', onClick:function (r) { openDetail(mod, r); } }];
        var extra = t.extraActions ? (t.extraActions(row, tableApi) || []) : [];
        if (!isLearner) {
          extra.push({ label:'Delete', icon:'trash', tone:'danger', onClick:function (r) {
            UI.confirm({ title:'Delete this record?',
              message:'It will be removed from the prototype store.',
              onConfirm:function () {
                return svc.remove(r.id).then(function () {
                  UI.toast('Record deleted', { type:'success' }); tableApi.reload();
                });
              }});
          }});
        }
        return base.concat(extra);
      },
      empty:{ icon:'inbox', title:'Nothing here yet',
        message:'Records will appear here as they are created.' }
    });

    document.querySelector('[data-export]').addEventListener('click', function () {
      svc.all().then(function (rows) {
        U.downloadCsv(mod.exportName + '-' + U.stamp() + '.csv', mod.columns, rows);
        UI.toast('Export downloaded', { type:'success', desc:rows.length + ' records written to CSV.' });
      });
    });
    var newBtn = document.querySelector('[data-new]');
    if (newBtn && mod.newAction) {
      newBtn.addEventListener('click', function () { mod.newAction.run(function () { api.reload(); }); });
      if (new URLSearchParams(window.location.search).get('create') === '1') { mod.newAction.run(function(){ api.reload(); history.replaceState({},'',window.location.pathname); }); }
    }
  }

  
/* ========================= PRODUCTION-READY STARTER MODULES ========================= */
function starterGuard(title, active) {
  var user = S.auth.getUser();
  if (!user) { S.auth.requireAuth(); return null; }
  var body = GGL.shell.mount({ active:active, title:title, breadcrumbs:[{label:'Home',href:'app/dashboard.html'},{label:title}] });
  if (user.role === GGL.ROLES.END_USER && body) { body.innerHTML = denied('This workspace is available to administrators.'); return null; }
  return body;
}
P.scorm = function () {
  var body=starterGuard('SCORM Player','scorm'); if(!body)return;
  body.innerHTML='<div class="module-hero"><span class="eyebrow">Standards-based delivery</span><h2>SCORM package workspace</h2><p class="text-muted">Stage, validate and preview SCORM 1.2 or 2004 packages before publishing them to a course.</p></div><div class="module-builder"><div class="card builder-rail"><h3>Package checklist</h3><ul class="timeline"><li><span class="dot">1</span><div class="body"><b>Upload package</b><div class="text-muted text-sm">ZIP with imsmanifest.xml</div></div></li><li><span class="dot">2</span><div class="body"><b>Validate manifest</b></div></li><li><span class="dot">3</span><div class="body"><b>Preview runtime</b></div></li><li><span class="dot">4</span><div class="body"><b>Publish to course</b></div></li></ul></div><div class="card builder-stage"><div class="drop-zone" data-scorm-drop>'+GGL.icon('package','ico')+'<div><h3>Drop a SCORM ZIP here</h3><p class="text-muted">Prototype validation workflow. Files stay in this browser.</p><button class="btn btn-primary" type="button" data-pick-scorm>'+GGL.icon('upload','ico')+'Choose package</button><input type="file" accept=".zip" hidden data-scorm-file></div></div><div class="alert alert-info mt-4">'+GGL.icon('info','ico')+'Runtime tracking requires a backend and LMS API adapter before production use.</div></div></div>';
  var input=body.querySelector('[data-scorm-file]'); body.querySelector('[data-pick-scorm]').onclick=function(){input.click();}; input.onchange=function(){if(!input.files[0])return; UI.toast('Package staged',{type:'success',desc:input.files[0].name+' is ready for manifest validation.'}); body.querySelector('[data-scorm-drop] h3').textContent=input.files[0].name;};
};
P.assessmentBuilder = function () {
  var body=starterGuard('Assessment Builder','assessment-builder'); if(!body)return;
  body.innerHTML='<div class="module-hero"><span class="eyebrow">Controlled authoring</span><h2>Build and publish assessments</h2><p class="text-muted">Create question banks with pass marks, attempts, randomisation and review status.</p></div><div class="split-2-1"><div class="card card-pad"><form id="ab-form"><div class="field"><label class="label">Assessment title *</label><input class="input" name="title" placeholder="e.g. Information Security Post-assessment"></div><div class="grid grid-2"><div class="field"><label class="label">Type</label><select class="select" name="type"><option>Pre-assessment</option><option selected>Post-assessment</option><option>Knowledge check</option></select></div><div class="field"><label class="label">Pass mark (%)</label><input class="input" name="pass" type="number" min="0" max="100" value="70"></div></div><div class="field"><label class="label">Question *</label><textarea class="textarea" name="question" placeholder="Write a clear, single-focus question"></textarea></div><div class="grid grid-2"><div class="field"><label class="label">Option A</label><input class="input" name="a"></div><div class="field"><label class="label">Option B</label><input class="input" name="b"></div></div><button class="btn btn-primary" type="submit">'+GGL.icon('plus','ico')+'Save draft question</button></form></div><div class="card card-pad"><h3>Quality controls</h3><p><span class="badge badge-success">Draft</span></p><ul><li>Versioned draft and review status</li><li>One correct answer per item</li><li>Pass mark and attempt limits</li><li>Server-side grading required for production</li></ul><div data-ab-count class="alert">0 draft questions in this browser</div></div></div>';
  var count=Number(localStorage.getItem('ggl.builderCount')||0), slot=body.querySelector('[data-ab-count]'); slot.textContent=count+' draft questions in this browser';
  body.querySelector('#ab-form').onsubmit=function(e){e.preventDefault();var f=e.target;if(!f.title.value.trim()||!f.question.value.trim()){UI.toast('Complete the required fields',{type:'warning'});return;} count++;localStorage.setItem('ggl.builderCount',String(count));slot.textContent=count+' draft questions in this browser';UI.toast('Draft question saved',{type:'success'});f.question.value='';f.a.value='';f.b.value='';};
};
P.uploads = function () {
  var body=starterGuard('Upload Center','uploads'); if(!body)return;
  body.innerHTML='<div class="module-hero"><span class="eyebrow">Governed content intake</span><h2>Upload and classify learning assets</h2><p class="text-muted">A controlled intake for documents, presentations, video and course packages.</p></div><div class="split-2-1"><div class="card card-pad"><div class="drop-zone"><div>'+GGL.icon('upload','ico')+'<h3>Choose learning assets</h3><p class="text-muted">PDF, DOCX, PPTX, MP4 or ZIP. Prototype files are not transmitted.</p><button class="btn btn-primary" data-up-pick>Choose files</button><input type="file" multiple hidden data-up-file></div></div><div data-up-list class="mt-4"></div></div><div class="card card-pad"><h3>Publishing workflow</h3><ol><li>Virus and file-type validation</li><li>Metadata and ownership</li><li>Accessibility review</li><li>Approval and versioning</li><li>Publish to content library</li></ol></div></div>';
  var i=body.querySelector('[data-up-file]');body.querySelector('[data-up-pick]').onclick=function(){i.click();};i.onchange=function(){var files=Array.from(i.files);body.querySelector('[data-up-list]').innerHTML=files.map(function(f){return '<div class="alert mb-2">'+GGL.icon('file','ico')+'<div><b>'+U.esc(f.name)+'</b><div class="text-sm text-muted">'+Math.ceil(f.size/1024)+' KB · staged locally</div></div></div>';}).join('');UI.toast(files.length+' file(s) staged',{type:'success'});};
};

/* ================================ ROUTER ============================= */
  var ROUTES = {
    home:P.home, login:P.login, forgot:P.forgot,
    dashboard:P.dashboard, users:P.users, observation:P.observation,
    'effectiveness-calculator':P.effectivenessCalculator, effectiveness:P.effectiveness,
    assessments:P.assessments, certificates:P.certificates, newsfeed:P.newsfeed,
    gamification:P.gamification, learning:P.learning, notifications:P.notifications,
    settings:P.settings, reports:P.reports, calendar:P.calendar, platform:P.platform,
    scorm:P.scorm, 'assessment-builder':P.assessmentBuilder, uploads:P.uploads
  };

  function boot() {
    var key = window.GGL_PAGE;
    if (!key) return;
    if (ROUTES[key]) { ROUTES[key](); return; }
    if (MODULES[key]) { runModule(key); return; }
    if (window.console) console.warn('[GGL] unknown page:', key);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window.GGL = window.GGL || {});
