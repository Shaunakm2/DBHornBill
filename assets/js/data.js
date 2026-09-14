/* ==========================================================================
   GG Learning Labs — Mock data

   Deterministic: a fixed-seed PRNG means every reload and every machine
   produces identical records, so screenshots and tests stay stable.

   Two structures come from the client workbooks rather than invention:

   1. TRAINER OBSERVATION FORM — seven sections, 36 criteria, transcribed
      from "TOF Form-Blank.xlsx". Section score = mean of its answered
      criteria; overall = mean of the section scores.

   2. TRAINER EFFECTIVENESS CALCULATOR — weights reverse-engineered from
      "Trainer Effectiveness.xlsx" and verified against both worked rows:

        Effectiveness = L1×0.30 + TOF×0.30 + Throughput×0.20
                      + Utilization×0.15 + Attendance×0.05

        Nikita  92.7/91.5/95.5/102/100     → 94.66     (workbook 0.9466)
        Vandana 94.8/86.96/93.75/97.43/80  → 91.8925   (workbook 0.918925)

      A component below 90% is flagged and forces "Needs Improvement".
   ========================================================================== */
(function (GGL) {
  'use strict';

  /* ------------------------------------------------------------------ seed */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var r = rng(20260912);
  var S = {
    rand: r,
    int: function (min, max) { return Math.floor(r() * (max - min + 1)) + min; },
    pick: function (a) { return a[Math.floor(r() * a.length)]; },
    picks: function (a, n) {
      var pool = a.slice(), out = [];
      for (var i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      return out;
    },
    bool: function (c) { return r() < (c === undefined ? 0.5 : c); },
    day: function (days, hour, min) {
      var d = new Date();
      d.setDate(d.getDate() + days);
      if (hour !== undefined) d.setHours(hour, min || 0, 0, 0);
      return d.toISOString();
    },
    round: function (n, dp) { var f = Math.pow(10, dp || 0); return Math.round(n * f) / f; }
  };
  S.FIRST = ['Aarav','Priya','Rohan','Ananya','Vikram','Meera','Arjun','Kavya','Siddharth','Neha',
    'Karthik','Divya','Rahul','Sneha','Aditya','Pooja','Nikhil','Ritu','Sanjay','Ishita',
    'Manish','Tanvi','Varun','Shreya','Ajay','Anjali','Harsh','Nisha','Rajat','Swati',
    'Deepak','Lakshmi','Gaurav','Preeti','Amit','Sonia','Kunal','Payal','Vivek','Ruchi'];
  S.LAST = ['Sharma','Iyer','Mehta','Reddy','Banerjee','Kulkarni','Nair','Gupta','Desai','Rao',
    'Joshi','Chatterjee','Malhotra','Pillai','Verma','Shah','Bose','Menon','Sinha','Kapoor'];
  S.DEPTS = ['Operations','Technology','Human Resources','Finance','Sales','Customer Support',
    'Quality','Marketing','Compliance','Supply Chain'];
  S.LOCATIONS = ['Mumbai','Bengaluru','Pune','Hyderabad','Gurugram','Chennai','Remote','London','Austin'];
  S.name = function () { return S.pick(S.FIRST) + ' ' + S.pick(S.LAST); };
  S.email = function (n, d) {
    return n.toLowerCase().replace(/[^a-z ]/g,'').split(' ').join('.') + '@' + (d || 'example.com');
  };
  GGL.seed = S;

  var D = GGL.data = {};
  var R = GGL.ROLES;

  /* ----------------------------------------------------------------- users */
  var demo = [
    { id:'usr_sa_001', name:'Aditi Raghunathan', email:'superadmin@example.com', role:R.SUPER_ADMIN,
      title:'Head of Learning & Development', department:'Human Resources', location:'Mumbai',
      status:'Active', employeeId:'IMS-0001', createdAt:S.day(-720), lastLogin:S.day(0,8,42),
      phone:'+91 98200 00001' },
    { id:'usr_ad_001', name:'Rohan Mehta', email:'admin@example.com', role:R.ADMIN,
      title:'L&D Manager', department:'Human Resources', location:'Bengaluru',
      status:'Active', employeeId:'IMS-0042', createdAt:S.day(-540), lastLogin:S.day(0,9,15),
      phone:'+91 98200 00042' },
    { id:'usr_tr_001', name:'Nikita Shah', email:'trainer@example.com', role:R.TRAINER,
title:'Senior Trainer', department:'Human Resources', location:'Ahmedabad', status:'Active',
employeeId:'IMS-0201', createdAt:S.day(-420), lastLogin:S.day(0,8,55), phone:'+91 98200 00201' },
{ id:'usr_eu_001', name:'Kavya Nair', email:'user@example.com', role:R.END_USER,
      title:'Senior Process Associate', department:'Operations', location:'Pune', workspaceType:'organisation',
      status:'Active', employeeId:'IMS-1180', createdAt:S.day(-310), lastLogin:S.day(-1,18,5),
      phone:'+91 98200 01180', manager:'Rohan Mehta' },
    { id:'usr_ind_001', name:'Arjun Individual', email:'individual@example.com', role:R.END_USER,
      title:'Individual Upskiller', department:'Independent', location:'Remote', workspaceType:'individual',
      status:'Active', employeeId:'IND-0001', createdAt:S.day(-80), lastLogin:S.day(-1,20,15),
      phone:'', manager:'', assignedCourses:4, completedCourses:1, progress:25, trainingStatus:'In Progress', learningHours:12, certificates:1, points:180, rank:0 }
  ];

  var generated = [], used = {};
  function uniqueName() {
    var n, guard = 0;
    do { n = S.name(); guard++; } while (used[n] && guard < 60);
    used[n] = true;
    return n;
  }
  for (var a = 0; a < 4; a++) {
    var sn = uniqueName();
    generated.push({ id:'usr_sa_' + String(a+2).padStart(3,'0'), name:sn, email:S.email(sn),
      role:R.SUPER_ADMIN,
      title:S.pick(['Platform Owner','L&D Director','Head of Capability','Learning Technology Lead']),
      department:'Human Resources', location:S.pick(S.LOCATIONS),
      status:S.bool(0.85) ? 'Active' : 'Inactive',
      employeeId:'IMS-' + S.int(1,99).toString().padStart(4,'0'),
      createdAt:S.day(-S.int(200,700)), lastLogin:S.day(-S.int(0,20), S.int(8,19), S.int(0,59)),
      phone:'+91 9820' + S.int(100000,999999) });
  }
  for (var b = 0; b < 14; b++) {
    var an = uniqueName();
    generated.push({ id:'usr_ad_' + String(b+2).padStart(3,'0'), name:an, email:S.email(an),
      role:R.ADMIN,
      title:S.pick(['L&D Manager','Training Coordinator','Instructional Designer',
        'Capability Partner','Assistant Manager — L&D','Learning Consultant']),
      department:S.pick(['Human Resources','Operations','Quality','Technology']),
      location:S.pick(S.LOCATIONS),
      status:S.bool(0.88) ? 'Active' : S.bool(0.6) ? 'Inactive' : 'Suspended',
      employeeId:'IMS-' + S.int(100,499).toString().padStart(4,'0'),
      createdAt:S.day(-S.int(120,600)), lastLogin:S.day(-S.int(0,30), S.int(8,19), S.int(0,59)),
      phone:'+91 9820' + S.int(100000,999999) });
  }
  for (var c = 0; c < 96; c++) {
    var ln = uniqueName(), prog = S.int(0,100);
    generated.push({ id:'usr_eu_' + String(c+2).padStart(3,'0'), name:ln, email:S.email(ln),
      role:R.END_USER,
      title:S.pick(['Process Associate','Senior Associate','Team Lead','Analyst','Executive',
        'Specialist','Consultant','Engineer','Coordinator']),
      department:S.pick(S.DEPTS), location:S.pick(S.LOCATIONS),
      status:S.bool(0.9) ? 'Active' : 'Inactive',
      employeeId:'IMS-' + S.int(1000,4999),
      createdAt:S.day(-S.int(10,500)), lastLogin:S.day(-S.int(0,45), S.int(8,21), S.int(0,59)),
      phone:'+91 9820' + S.int(100000,999999),
      assignedCourses:S.int(1,9), completedCourses:0, progress:prog,
      trainingStatus: prog === 0 ? 'Not Started' : prog === 100 ? 'Completed'
        : S.bool(0.12) ? 'Retraining' : 'In Progress',
      learningHours:S.int(2,86), certificates:S.int(0,5), points:S.int(120,2400) });
  }
  generated.forEach(function (u) {
    if (u.role !== R.END_USER) return;
    u.completedCourses = Math.round((u.assignedCourses * u.progress) / 100);
  });
  demo[3].assignedCourses = 7; demo[3].completedCourses = 4; demo[3].progress = 62;
  demo[3].trainingStatus = 'In Progress'; demo[3].learningHours = 48;
  demo[3].certificates = 4; demo[3].points = 1240; demo[3].rank = 12;

  D.users = demo.concat(generated);
  D.demoAccounts = demo;

  var SPECIALISMS = ['Leadership','Communication','Process Excellence','Compliance','Technical Skills',
    'Customer Experience','Quality Systems','Data & Analytics','Safety','Onboarding'];
  D.trainers = [];
  for (var t = 0; t < 18; t++) {
    var tn = uniqueName(), sessions = S.int(12,140);
    D.trainers.push({ id:'trn_' + String(t+1).padStart(3,'0'), name:tn, email:S.email(tn),
      type:S.bool(0.7) ? 'Internal' : 'External', specialism:S.pick(SPECIALISMS),
      location:S.pick(S.LOCATIONS), status:S.bool(0.9) ? 'Active' : 'Inactive',
      sessionsDelivered:sessions, trainingHours:sessions * S.int(2,4),
      learnersTrained:sessions * S.int(8,22),
      effectiveness:S.round(S.int(62,96) + S.rand(), 1),
      observationScore:S.round(3 + S.rand() * 2, 1),
      lastObserved:S.day(-S.int(3,120)), upcomingSessions:S.int(0,6) });
  }

  /* --------------------------------------------------------------- courses */
  var COURSE_DEFS = [
    ['Leadership Essentials for New Managers','Leadership','Blended',480],
    ['Effective Business Communication','Communication','Instructor-Led',360],
    ['POSH Awareness & Compliance','Compliance','E-Learning',90],
    ['Information Security Fundamentals','Compliance','E-Learning',120],
    ['Advanced Excel for Analysts','Technical','Blended',420],
    ['Customer Experience Excellence','Customer Experience','Instructor-Led',300],
    ['Root Cause Analysis & Problem Solving','Process Excellence','Blended',360],
    ['Data Storytelling with Dashboards','Data & Analytics','E-Learning',240],
    ['Onboarding: Welcome to the Organisation','Onboarding','Blended',180],
    ['Coaching Conversations for Team Leads','Leadership','Instructor-Led',300],
    ['Quality Management Systems Overview','Quality','E-Learning',150],
    ['Time & Priority Management','Personal Effectiveness','E-Learning',120],
    ['Train the Trainer Certification','Capability Building','Blended',960],
    ['GDPR & Data Privacy Practices','Compliance','E-Learning',100],
    ['Presentation Skills Masterclass','Communication','Instructor-Led',240],
    ['Lean Six Sigma — Yellow Belt','Process Excellence','Blended',720],
    ['Conflict Resolution at Work','Personal Effectiveness','Instructor-Led',180],
    ['Workplace Safety Induction','Safety','E-Learning',60],
    ['Stakeholder Management','Leadership','Blended',300],
    ['Introduction to Process Automation','Technical','E-Learning',300],
    ['Accessibility & Inclusive Design','Technical','E-Learning',180],
    ['Negotiation Fundamentals','Sales','Instructor-Led',360]
  ];
  D.courses = COURSE_DEFS.map(function (d, i) {
    var enrolled = S.int(18,420), completion = S.int(24,97);
    return { id:'crs_' + String(i+1).padStart(3,'0'), title:d[0], category:d[1],
      delivery:d[2], durationMins:d[3], level:S.pick(['Beginner','Intermediate','Advanced']),
      status: i < 17 ? 'Published' : S.bool(0.5) ? 'Draft' : 'Archived',
      mandatory: d[1] === 'Compliance' || d[1] === 'Safety',
      instructor:D.trainers[i % D.trainers.length].name,
      trainerId:D.trainers[i % D.trainers.length].id,
      modules:S.int(3,12), lessons:S.int(8,42), assessments:S.int(1,4),
      enrolled:enrolled, completed:Math.round(enrolled * completion / 100),
      completionRate:completion, rating:S.round(3.4 + S.rand() * 1.6, 1),
      effectiveness:S.int(58,96), createdAt:S.day(-S.int(30,600)), updatedAt:S.day(-S.int(0,40)),
      hasScorm:S.bool(0.35),
      description:'A structured programme covering the core principles, practical application and ' +
        'on-the-job reinforcement required to build capability in this area.' };
  });

  /* Individual learning content: lessons, practice, resources and evidence. */
  D.courseContent = {};
  D.courses.forEach(function(course, ci) {
    var topics = ci % 2 === 0
      ? ['Context and foundations','Diagnose the current state','Use the core framework','Practice with a workplace scenario','Create an action plan']
      : ['Why this capability matters','Essential concepts','Tools and templates','Guided practice','Reflection and transfer'];
    D.courseContent[course.id] = {
      overview:'A practical capability-building experience focused on workplace application rather than passive completion.',
      objectives:['Explain the core concepts','Apply a practical framework','Produce a usable job output','Commit to one workplace action'],
      modules:topics.map(function(t,mi){return {id:course.id+'_m'+(mi+1),title:t,durationMins:Math.max(15,Math.round(course.durationMins/topics.length)),lessons:[{title:'Explore: '+t,type:'Interactive lesson',durationMins:12},{title:'Apply: '+t,type:mi===topics.length-1?'Action plan':'Practice activity',durationMins:18},{title:'Check understanding',type:'Knowledge check',durationMins:8}],resources:[mi%2===0?'Practical worksheet':'Conversation guide',mi%2===0?'Reflection prompts':'Job aid']};}),
      evidence:['Practice activity','Knowledge-check result','Personal reflection','Workplace action plan']
    };
  });

  D.batches = [];
  for (var bi = 0; bi < 24; bi++) {
    var course = S.pick(D.courses.filter(function (x) { return x.status === 'Published'; }));
    var trainer = D.trainers[S.int(0, D.trainers.length - 1)];
    var startOffset = S.int(-120,45), lengthDays = S.int(5,45);
    var state = startOffset > 5 ? 'Scheduled' : startOffset + lengthDays < 0 ? 'Completed'
      : S.bool(0.1) ? 'On Hold' : 'Active';
    D.batches.push({ id:'bat_' + String(bi+1).padStart(3,'0'),
      name:course.category.split(' ')[0].toUpperCase() + '-' + new Date().getFullYear() +
        '-B' + String(bi+1).padStart(2,'0'),
      programme:course.title, courseId:course.id, trainer:trainer.name, trainerId:trainer.id,
      location:S.pick(S.LOCATIONS), mode:S.pick(['Classroom','Virtual','Hybrid']),
      startDate:S.day(startOffset), endDate:S.day(startOffset + lengthDays),
      trainees:S.int(8,34), status:state,
      completion: state === 'Completed' ? S.int(82,100) : state === 'Scheduled' ? 0 : S.int(15,88),
      attendanceRate: state === 'Scheduled' ? null : S.int(68,99),
      sessions:S.int(3,14), department:S.pick(S.DEPTS) });
  }

  var ROOMS = ['Training Room A','Training Room B','Auditorium','Lab 2','MS Teams','Zoom Room 1'];
  D.sessions = [];
  D.batches.forEach(function (batch) {
    var count = Math.min(batch.sessions, 6);
    for (var s = 0; s < count; s++) {
      var offset = Math.round((new Date(batch.startDate) - new Date()) / 86400000) + s * S.int(2,6);
      D.sessions.push({ id:'ses_' + batch.id + '_' + (s+1),
        title:batch.programme + ' — Session ' + (s+1),
        batchId:batch.id, batchName:batch.name, courseId:batch.courseId,
        trainer:batch.trainer, trainerId:batch.trainerId,
        start:S.day(offset, S.pick([9,10,11,14,15,16]), 0),
        durationMins:S.pick([60,90,120,180]), mode:batch.mode,
        location: batch.mode === 'Virtual' ? S.pick(['MS Teams','Zoom Room 1']) : S.pick(ROOMS),
        trainees:batch.trainees,
        status: offset < 0 ? 'Completed' : offset === 0 ? 'Today' : 'Scheduled',
        attendance: offset < 0 ? S.int(62,100) : null });
    }
  });
  D.sessions.sort(function (x, y) { return new Date(x.start) - new Date(y.start); });

  var learners = D.users.filter(function (u) { return u.role === R.END_USER; });
  D.attendance = [];
  D.sessions.filter(function (s) { return s.status === 'Completed'; }).slice(0,14).forEach(function (session) {
    S.picks(learners, Math.min(session.trainees, 18)).forEach(function (learner) {
      var roll = S.rand();
      D.attendance.push({ id:'att_' + session.id + '_' + learner.id,
        sessionId:session.id, sessionTitle:session.title,
        batchId:session.batchId, batchName:session.batchName,
        date:session.start, userId:learner.id, name:learner.name,
        employeeId:learner.employeeId, department:learner.department,
        status: roll < 0.78 ? 'Present' : roll < 0.88 ? 'Late' : roll < 0.95 ? 'Absent' : 'Excused',
        minutesAttended:S.int(30, session.durationMins) });
    });
  });
  D.attendanceStates = ['Present','Absent','Late','Excused'];
  D.batchStates = ['Active','Scheduled','Completed','On Hold'];

  /* ------------------------------------------------------------- insights */
  D.observationCriteria = [
    { id:'knowledge', label:'Subject knowledge', weight:15, desc:'Command of content, accuracy, depth of examples.' },
    { id:'communication', label:'Communication', weight:15, desc:'Clarity, pace, language, audibility.' },
    { id:'engagement', label:'Learner engagement', weight:15, desc:'Participation drawn from the room, energy sustained.' },
    { id:'delivery', label:'Content delivery', weight:15, desc:'Structure, sequencing, use of materials and aids.' },
    { id:'time', label:'Time management', weight:10, desc:'Adherence to plan, pacing across sections.' },
    { id:'interaction', label:'Learner interaction', weight:10, desc:'Questioning technique, handling responses.' },
    { id:'examples', label:'Practical examples', weight:10, desc:'Relevance of examples to the learner\u2019s role.' },
    { id:'overall', label:'Overall effectiveness', weight:10, desc:'Holistic judgement of the session.' }
  ];
  D.observations = [];
  D.trainers.forEach(function (trainer) {
    var count = S.int(1,3);
    for (var i = 0; i < count; i++) {
      var scores = {}, weighted = 0;
      D.observationCriteria.forEach(function (cr) {
        var v = S.int(3,5); scores[cr.id] = v; weighted += (v / 5) * cr.weight;
      });
      D.observations.push({ id:'obs_' + String(D.observations.length+1).padStart(3,'0'),
        trainerId:trainer.id, trainer:trainer.name,
        observer:S.pick(['Aditi Raghunathan','Rohan Mehta','Quality Team']),
        date:S.day(-S.int(2,150)), sessionTitle:S.pick(D.courses).title,
        batchName:S.pick(D.batches).name, scores:scores, score:S.round(weighted,1),
        rating: weighted >= 85 ? 'Exceeds' : weighted >= 70 ? 'Meets' : 'Needs development',
        strengths:S.pick(['Strong structure and clear sectional transitions.',
          'Excellent use of role-relevant examples throughout.',
          'Sustained participation from the full room.',
          'Confident handling of challenging questions.']),
        development:S.pick(['Allow longer wait time after open questions.',
          'Tighten the closing summary — it ran over by eight minutes.',
          'Increase practice time relative to input.',
          'Check understanding more frequently in the first hour.']),
        status:S.bool(0.85) ? 'Completed' : 'Draft' });
    }
  });

  D.effectiveness = D.courses.filter(function (x) { return x.status === 'Published'; })
    .map(function (x) {
      var pre = S.int(38,62), post = Math.min(pre + S.int(14,38), 99);
      return { courseId:x.id, course:x.title, category:x.category, trainer:x.instructor,
        responses:S.int(18,240), reaction:S.round(3.5 + S.rand() * 1.5, 1),
        learning:post, preScore:pre, postScore:post, gain:post - pre,
        behaviour:S.int(48,92), results:S.int(40,88),
        satisfaction:S.int(68,98), recommendRate:S.int(62,99), overall:x.effectiveness };
    });
  D.effectivenessDimensions = [
    { key:'reaction', label:'Reaction', desc:'Learner satisfaction with the session' },
    { key:'learning', label:'Learning', desc:'Knowledge gain, pre vs post assessment' },
    { key:'behaviour', label:'Behaviour', desc:'On-the-job application at 30/60 days' },
    { key:'results', label:'Results', desc:'Business outcome contribution' }
  ];

  var ACTIVITY_TYPES = [
    { type:'user_created', icon:'userPlus', text:'created a new learner account for' },
    { type:'course_published', icon:'book', text:'published the course' },
    { type:'batch_created', icon:'layers', text:'created batch' },
    { type:'training_done', icon:'checkCircle', text:'marked training complete for' },
    { type:'assessment', icon:'checkSquare', text:'submitted an assessment for' },
    { type:'observation', icon:'eye', text:'recorded a trainer observation for' },
    { type:'request', icon:'inbox', text:'raised a content request for' }
  ];
  var staff = D.users.filter(function (u) { return u.role !== R.END_USER; });
  D.activity = [];
  for (var ai = 0; ai < 22; ai++) {
    var ty = S.pick(ACTIVITY_TYPES);
    D.activity.push({ id:'act_' + ai, type:ty.type, icon:ty.icon, actor:S.pick(staff).name, text:ty.text,
      subject: ty.type === 'batch_created' ? S.pick(D.batches).name
        : ty.type === 'course_published' ? S.pick(D.courses).title
        : ty.type === 'observation' ? S.pick(D.trainers).name : S.pick(D.users).name,
      at:S.day(-S.int(0,6), S.int(8,19), S.int(0,59)) });
  }
  D.activity.sort(function (x, y) { return new Date(y.at) - new Date(x.at); });

  var NOTIF_DEFS = [
    ['training_reminder','bell','Session tomorrow: {course}','Starts at 10:00 in Training Room A. Please arrive five minutes early.'],
    ['course_assigned','book','New course assigned: {course}','Assigned by your L&D team. Target completion in 14 days.'],
    ['assessment_due','checkSquare','Assessment due: {course}','Your post-assessment closes in 48 hours.'],
    ['certificate','award','Certificate issued','Your certificate for {course} is ready to download.'],
    ['request_update','inbox','Request moved to In Progress','Your content development request has been assigned to a designer.'],
    ['announcement','megaphone','New learning path published','The Leadership Essentials path is now open for nominations.'],
    ['system','server','Scheduled maintenance','The platform will be briefly unavailable on Sunday 02:00–04:00 IST.']
  ];
  D.notifications = [];
  for (var ni = 0; ni < 16; ni++) {
    var nd = NOTIF_DEFS[ni % NOTIF_DEFS.length], nc = S.pick(D.courses).title;
    D.notifications.push({ id:'ntf_' + String(ni+1).padStart(3,'0'), type:nd[0], icon:nd[1],
      title:nd[2].replace('{course}', nc), body:nd[3].replace('{course}', nc),
      at:S.day(-S.int(0,9), S.int(7,20), S.int(0,59)), read: ni > 4 ? S.bool(0.7) : false });
  }
  D.notifications.sort(function (x, y) { return new Date(y.at) - new Date(x.at); });

  D.reports = [
    ['Course Completion','Completion rates by course, category and department.','barChart'],
    ['Attendance Summary','Present, absent, late and excused across sessions.','userCheck'],
    ['Batch Performance','Progress, attendance and assessment outcomes per batch.','layers'],
    ['Assessment Results','Pre/post scores, pass rates and question analysis.','checkSquare'],
    ['Training Effectiveness','Reaction, learning, behaviour and results measures.','trending'],
    ['Trainer Performance','Observation scores, hours delivered and learner feedback.','briefcase'],
    ['Competency Gaps','Current vs required levels by role and department.','target'],
    ['Learning Hours','Hours consumed by department, month and delivery mode.','clock'],
    ['Graduation & Retraining','Outcome distribution across completed batches.','graduation'],
    ['Learner Progress','Individual progress against assigned learning.','activity']
  ].map(function (x, i) {
    return { id:'rpt_' + String(i+1).padStart(3,'0'), name:x[0], description:x[1], icon:x[2],
      category: i < 4 ? 'Operations' : i < 7 ? 'Quality' : 'People',
      lastRun:S.day(-S.int(0,21), S.int(8,18), 0),
      records:S.int(120,8400), format:['PDF','Excel','CSV'] };
  });

  D.myLearning = S.picks(D.courses.filter(function (x) { return x.status === 'Published'; }), 7)
    .map(function (x, i) {
      var progress = i === 0 ? 68 : i === 1 ? 35 : i === 2 ? 100 : i === 3 ? 100 : i < 5 ? S.int(5,90) : 0;
      return { id:'enr_' + x.id, courseId:x.id, title:x.title, category:x.category,
        instructor:x.instructor, delivery:x.delivery, durationMins:x.durationMins,
        modules:x.modules, lessonsDone:Math.round(x.lessons * progress / 100), lessons:x.lessons,
        progress:progress,
        status: progress === 100 ? 'Completed' : progress === 0 ? 'Not Started' : 'In Progress',
        dueDate:S.day(S.int(-6,40)),
        lastAccessed: progress ? S.day(-S.int(0,12), S.int(9,21), 0) : null,
        mandatory:x.mandatory, certificate: progress === 100 };
    });

  D.competencies = [
    ['Communication',4,2],['Problem Solving',4,3],['Process Knowledge',5,4],
    ['Stakeholder Management',3,2],['Data Literacy',4,2],['Quality Orientation',4,4],
    ['Leadership',3,1],['Domain Expertise',5,4]
  ].map(function (x) {
    return { name:x[0], required:x[1], current:x[2], gap:Math.max(0, x[1]-x[2]),
      priority:(x[1]-x[2]) >= 2 ? 'High' : (x[1]-x[2]) === 1 ? 'Medium' : 'Met' };
  });
  D.badges = [
    { name:'Fast Starter', icon:'zap', earned:true, desc:'Completed first course within 7 days' },
    { name:'Compliance Clear', icon:'shield', earned:true, desc:'All mandatory training current' },
    { name:'Knowledge Seeker', icon:'bookOpen', earned:true, desc:'25+ learning hours logged' },
    { name:'Perfect Attendance', icon:'userCheck', earned:true, desc:'No absences across a full batch' },
    { name:'Assessment Ace', icon:'star', earned:false, desc:'Score 90%+ on five assessments' },
    { name:'Mentor', icon:'users', earned:false, desc:'Support three colleagues to completion' }
  ];

  var MONTHS12 = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
  D.series = {
    userGrowth: MONTHS12.map(function (m, i) { return { label:m, value:640 + i*S.int(28,72) + S.int(-18,18) }; }),
    trainingActivity: MONTHS12.map(function (m) { return { label:m, value:S.int(18,64) }; }),
    completion: MONTHS12.map(function (m, i) { return { label:m, value:Math.min(96, 58 + i*2 + S.int(-7,9)) }; }),
    effectivenessTrend: MONTHS12.map(function (m, i) { return { label:m, value:Math.min(94, Math.round(64 + i*1.8 + S.int(-5,6))) }; }),
    hoursByMode: [{ label:'E-Learning', value:4820 }, { label:'Instructor-Led', value:3140 },
      { label:'Blended', value:2260 }, { label:'Coaching', value:880 }],
    userDistribution: [{ label:'Learners', value:97 }, { label:'Admins', value:15 },
      { label:'Super Admins', value:5 }],
    attendanceSplit: [{ label:'Present', value:78 }, { label:'Late', value:10 },
      { label:'Absent', value:7 }, { label:'Excused', value:5 }],
    deptCompletion: S.DEPTS.slice(0,6).map(function (d) { return { label:d, value:S.int(48,96) }; })
  };

  /* --------------------------------------------------------- assessments */
  var QUESTION_POOL = {
    'Compliance':[
      ['Who can raise a complaint under the organisation\u2019s POSH policy?',
        ['Only permanent female employees','Any employee, contractor or visitor at the workplace',
         'Only employees who have completed probation','Only the reporting manager on behalf of a team member'],1],
      ['What is the first action on discovering a suspected data breach?',
        ['Attempt to fix it quietly','Report it immediately through the incident channel',
         'Wait for confirmation before escalating','Email the affected customers directly'],1],
      ['Which of these counts as personal data under privacy regulation?',
        ['An aggregated headcount report','A work email address linked to a named individual',
         'A published office address','A generic role description'],1],
      ['How long must mandatory compliance training records be retained?',
        ['Until the end of the current quarter','For the period defined in the retention schedule',
         'They need not be retained','Until the employee leaves'],1],
      ['A colleague shares their system password with you to cover leave. You should:',
        ['Use it only for urgent work','Decline and request delegated access through the correct process',
         'Use it and change it afterwards','Share it with the wider team for continuity'],1]],
    'Leadership':[
      ['A team member misses a deadline for the first time. The most effective first step is to:',
        ['Escalate to their skip-level manager','Hold a private conversation to understand the cause',
         'Reassign their work immediately','Raise it in the next team meeting'],1],
      ['In a coaching conversation, the manager should mostly be:',
        ['Advising','Listening and questioning','Instructing','Evaluating'],1],
      ['Which best describes situational leadership?',
        ['Applying one consistent style for fairness','Adapting style to the individual\u2019s competence and commitment',
         'Delegating everything to senior members','Leading primarily through authority'],1],
      ['The clearest sign of psychological safety in a team is that members:',
        ['Always agree in meetings','Raise problems and admit mistakes without fear',
         'Rarely need manager input','Complete work ahead of schedule'],1],
      ['Effective delegation requires you to transfer:',
        ['Accountability only','The task, the authority to do it, and clear success criteria',
         'The task without context','Responsibility for the outcome entirely'],1]],
    'Communication':[
      ['The main purpose of active listening is to:',
        ['Prepare your response','Understand the speaker\u2019s meaning and intent',
         'Identify errors in their argument','Fill silences in conversation'],1],
      ['When writing a business update, the key message should appear:',
        ['In the closing paragraph','At the start, before supporting detail',
         'Spread evenly throughout','Only in the subject line'],1],
      ['Which is the strongest opening for a difficult message?',
        ['A lengthy apology','A clear statement of the situation and its impact',
         'An unrelated pleasantry','A list of who is responsible'],1],
      ['Presenting to a mixed technical and non-technical audience, you should:',
        ['Use full technical depth throughout','Lead with outcomes and keep detail available on request',
         'Avoid all specifics','Split into two separate sessions always'],1],
      ['Non-verbal signals matter most when:',
        ['The content is purely factual','There is a mismatch between words and delivery',
         'The audience is small','The session is recorded'],1]],
    'Process Excellence':[
      ['The purpose of a root cause analysis is to:',
        ['Assign responsibility for the failure','Identify the underlying cause so the issue does not recur',
         'Document the incident for audit','Estimate the cost of the failure'],1],
      ['In the "5 Whys" technique, you stop asking why when:',
        ['You have asked exactly five times','You reach a cause you can actually control and fix',
         'The team agrees on a culprit','The answer becomes uncomfortable'],1],
      ['Which is a measure of process capability rather than process output?',
        ['Units produced this week','Variation of the process against specification limits',
         'Revenue for the period','Number of staff assigned'],1],
      ['Waste in a lean context is best defined as:',
        ['Any cost incurred','Any activity the customer would not pay for',
         'Any manual step','Any rework by junior staff'],1],
      ['A control chart is primarily used to distinguish:',
        ['Good staff from poor staff','Common-cause variation from special-cause variation',
         'Fixed cost from variable cost','Planned work from unplanned work'],1]],
    'Technical':[
      ['In a spreadsheet, which function returns a value from a table by matching a key?',
        ['CONCAT','VLOOKUP or XLOOKUP','TRIM','NOW'],1],
      ['The clearest chart for showing a trend over twelve months is a:',
        ['Pie chart','Line chart','Doughnut chart','Treemap'],1],
      ['A dashboard should open by answering:',
        ['Every possible question','The single most important question for its audience',
         'Questions about data sources','Questions about methodology'],1],
      ['Before automating a process you should first:',
        ['Buy the tooling','Stabilise and document the process','Train all users','Remove all manual steps'],1],
      ['Accessible colour use in a report means:',
        ['Using as many colours as possible','Never relying on colour alone to convey meaning',
         'Using only greyscale','Matching the brand palette exactly'],1]],
    'General':[
      ['The most effective way to prioritise competing tasks is to assess:',
        ['Which is quickest','Impact against urgency','Who asked most recently','Which is most enjoyable'],1],
      ['Feedback is most useful when it is:',
        ['General and positive','Specific, timely and behaviour-focused',
         'Delivered in writing only','Saved for the annual review'],1],
      ['A SMART objective must always be:',
        ['Ambitious and vague','Specific, measurable, achievable, relevant and time-bound',
         'Set by the manager alone','Reviewed only at year end'],1],
      ['The main benefit of documenting a process is that it:',
        ['Satisfies auditors','Makes performance repeatable and transferable',
         'Reduces headcount','Replaces training'],1],
      ['Continuous improvement depends most on:',
        ['Large annual projects','Regular small changes informed by evidence',
         'External consultants','New technology'],1]]
  };
  function questionsFor(category, count) {
    var pool = QUESTION_POOL[category] || QUESTION_POOL.General;
    var picked = S.picks(pool, Math.min(count, pool.length));
    while (picked.length < count) {
      var extra = S.pick(QUESTION_POOL.General);
      if (picked.indexOf(extra) === -1) picked.push(extra); else break;
    }
    return picked.map(function (q, i) {
      return { id:'q' + (i+1), text:q[0], options:q[1], correct:q[2], marks:1 };
    });
  }

  D.assessments = [];
  D.courses.filter(function (x) { return x.status === 'Published'; }).forEach(function (x, idx) {
    [['Pre','Pre-assessment'],['Post','Post-assessment']].forEach(function (kind) {
      D.assessments.push({ id:'asm_' + String(D.assessments.length+1).padStart(3,'0'),
        courseId:x.id, course:x.title, category:x.category,
        title:x.title + ' — ' + kind[1],
        type: kind[0] === 'Pre' ? 'Pre-assessment' : 'Post-assessment',
        stage:kind[0], questions:questionsFor(x.category, 5),
        passMark: kind[0] === 'Pre' ? 0 : 70, durationMins:15,
        status: idx < 14 ? 'Published' : 'Draft', mandatory:x.mandatory,
        createdAt:x.createdAt, attempts:0, avgScore:0, passRate:0 });
    });
  });
  ['Compliance','Leadership','Communication'].forEach(function (cat, i) {
    D.assessments.push({ id:'asm_kc_' + (i+1), courseId:null, course:'—', category:cat,
      title:cat + ' Knowledge Check', type:'Knowledge check', stage:'Check',
      questions:questionsFor(cat, 5), passMark:60, durationMins:10,
      status:'Published', mandatory:false, createdAt:S.day(-S.int(40,200)),
      attempts:0, avgScore:0, passRate:0 });
  });

  D.attempts = [];
  D.assessments.filter(function (x) { return x.status === 'Published'; }).forEach(function (asm) {
    S.picks(learners, S.int(6,22)).forEach(function (learner) {
      var score = asm.stage === 'Pre' ? S.int(32,64) : S.int(58,100);
      D.attempts.push({ id:'att_' + asm.id + '_' + learner.id, assessmentId:asm.id, assessment:asm.title,
        stage:asm.stage, courseId:asm.courseId, course:asm.course, category:asm.category,
        userId:learner.id, name:learner.name, employeeId:learner.employeeId,
        department:learner.department, score:score,
        correct:Math.round((score / 100) * asm.questions.length),
        total:asm.questions.length, passed: score >= asm.passMark,
        durationMins:S.int(4, asm.durationMins),
        submittedAt:S.day(-S.int(1,180), S.int(9,19), S.int(0,59)) });
    });
  });
  D.attempts.sort(function (x, y) { return new Date(y.submittedAt) - new Date(x.submittedAt); });
  D.assessments.forEach(function (asm) {
    var mine = D.attempts.filter(function (x) { return x.assessmentId === asm.id; });
    asm.attempts = mine.length;
    asm.avgScore = mine.length ? Math.round(mine.reduce(function (s, x) { return s + x.score; }, 0) / mine.length) : 0;
    asm.passRate = mine.length ? Math.round((mine.filter(function (x) { return x.passed; }).length / mine.length) * 100) : 0;
  });

  D.certificates = [];
  var serial = 1000;
  D.attempts.filter(function (x) { return x.stage === 'Post' && x.passed && x.courseId; }).forEach(function (x) {
    if (D.certificates.some(function (cc) { return cc.userId === x.userId && cc.courseId === x.courseId; })) return;
    var expires = new Date(x.submittedAt);
    expires.setFullYear(expires.getFullYear() + 2);
    D.certificates.push({ id:'crt_' + String(D.certificates.length+1).padStart(4,'0'),
      serial:'GGL-' + (++serial), userId:x.userId, name:x.name,
      employeeId:x.employeeId, department:x.department,
      courseId:x.courseId, course:x.course, category:x.category,
      assessmentId:x.assessmentId, score:x.score,
      issuedAt:x.submittedAt, expiresAt:expires.toISOString(),
      status: new Date(expires) < new Date() ? 'Expired' : (S.bool(0.02) ? 'Revoked' : 'Issued') });
  });
  D.certificates.sort(function (x, y) { return new Date(y.issuedAt) - new Date(x.issuedAt); });

  D.pointRules = {
    attempt_passed:{ points:50, label:'Assessment passed' },
    attempt_submitted:{ points:10, label:'Assessment submitted' },
    certificate_issued:{ points:150, label:'Certificate earned' },
    course_completed:{ points:100, label:'Course completed' },
    perfect_score:{ points:75, label:'Perfect score' },
    attendance_streak:{ points:40, label:'Attendance streak' }
  };
  D.points = [];
  D.attempts.forEach(function (x) {
    D.points.push({ id:'pt_' + D.points.length, userId:x.userId, name:x.name,
      type:'attempt_submitted', points:10, reason:'Submitted ' + x.assessment, at:x.submittedAt });
    if (x.passed) D.points.push({ id:'pt_' + D.points.length, userId:x.userId, name:x.name,
      type:'attempt_passed', points:50, reason:'Passed ' + x.assessment, at:x.submittedAt });
    if (x.score === 100) D.points.push({ id:'pt_' + D.points.length, userId:x.userId, name:x.name,
      type:'perfect_score', points:75, reason:'Full marks on ' + x.assessment, at:x.submittedAt });
  });
  D.certificates.filter(function (x) { return x.status === 'Issued'; }).forEach(function (x) {
    D.points.push({ id:'pt_' + D.points.length, userId:x.userId, name:x.name,
      type:'certificate_issued', points:150, reason:'Certificate for ' + x.course, at:x.issuedAt });
  });
  D.points.sort(function (x, y) { return new Date(y.at) - new Date(x.at); });

  D.badgeCatalogue = [
    { id:'fast_starter', name:'Fast Starter', icon:'zap', desc:'Submit your first assessment',
      test:function (ctx) { return ctx.attempts.length >= 1; } },
    { id:'compliance_clear', name:'Compliance Clear', icon:'shield',
      desc:'Pass every mandatory assessment attempted',
      test:function (ctx) {
        var m = ctx.attempts.filter(function (x) { return x.mandatory; });
        return m.length > 0 && m.every(function (x) { return x.passed; });
      } },
    { id:'knowledge_seeker', name:'Knowledge Seeker', icon:'bookOpen', desc:'Submit five or more assessments',
      test:function (ctx) { return ctx.attempts.length >= 5; } },
    { id:'certified', name:'Certified', icon:'award', desc:'Earn your first certificate',
      test:function (ctx) { return ctx.certificates.length >= 1; } },
    { id:'assessment_ace', name:'Assessment Ace', icon:'star', desc:'Score 90% or higher three times',
      test:function (ctx) { return ctx.attempts.filter(function (x) { return x.score >= 90; }).length >= 3; } },
    { id:'collector', name:'Collector', icon:'trophy', desc:'Hold three or more valid certificates',
      test:function (ctx) { return ctx.certificates.length >= 3; } },
    { id:'perfectionist', name:'Perfectionist', icon:'target', desc:'Achieve a perfect score',
      test:function (ctx) { return ctx.attempts.some(function (x) { return x.score === 100; }); } },
    { id:'high_roller', name:'High Roller', icon:'trending', desc:'Accumulate 1,000 points',
      test:function (ctx) { return ctx.points >= 1000; } }
  ];
  D.challenges = [
    { id:'ch1', name:'Compliance sprint', desc:'Complete all mandatory assessments this quarter',
      reward:300, icon:'shield', target:4, endsAt:S.day(28) },
    { id:'ch2', name:'Five in five', desc:'Submit five assessments within five weeks',
      reward:250, icon:'zap', target:5, endsAt:S.day(35) },
    { id:'ch3', name:'Certified professional', desc:'Earn two certificates this quarter',
      reward:400, icon:'award', target:2, endsAt:S.day(45) },
    { id:'ch4', name:'Perfect attendance', desc:'Attend every scheduled session in your batch',
      reward:200, icon:'userCheck', target:6, endsAt:S.day(21) }
  ];

  /* Re-derive effectiveness from real attempts so the modules cannot disagree */
  D.effectiveness.forEach(function (e) {
    var pre = D.attempts.filter(function (x) { return x.courseId === e.courseId && x.stage === 'Pre'; });
    var post = D.attempts.filter(function (x) { return x.courseId === e.courseId && x.stage === 'Post'; });
    if (!pre.length || !post.length) return;
    var avg = function (rows) { return Math.round(rows.reduce(function (s, x) { return s + x.score; }, 0) / rows.length); };
    e.preScore = avg(pre); e.postScore = avg(post);
    e.gain = e.postScore - e.preScore; e.learning = e.postScore;
    e.responses = pre.length + post.length; e.attempts = post.length;
    e.passRate = Math.round((post.filter(function (x) { return x.passed; }).length / post.length) * 100);
  });
  D.courses.forEach(function (x) {
    x.assessments = D.assessments.filter(function (asm) { return asm.courseId === x.id; }).length;
    x.certificatesIssued = D.certificates.filter(function (cc) {
      return cc.courseId === x.id && cc.status === 'Issued';
    }).length;
  });

  /* ================= Trainer Observation Form (client instrument) ========= */
  D.tofSections = [
    { id:'s1', no:1, title:'Classroom Readiness', criteria:[
      'Preparedness and Utilization of Training Equipment\u2019s / Technology',
      'Availability and Organization of Training Materials and Supplies',
      'Provision and Display of Learner Name Tents',
      'Maintenance of a Professional and Organized Classroom Environment']},
    { id:'s2', no:2, title:'Facilitator Readiness', criteria:[
      'Facilitator Presence at Least 15 Minutes Prior to Session Start',
      'Establishment of a Positive Learning Environment through Rapport Building',
      'Adherence to Scheduled Session Start and End Times']},
    { id:'s3', no:3, title:'Training Introduction', criteria:[
      'Utilization of an Engaging and Impactful Opening',
      'Clearly Communicated the \u201CWhat\u2019s In It For Me\u201D (WIIFM) to Learners',
      'Clear Communication of Learning Objectives',
      'Encouragement of Learner Participation in Identifying Additional Learning Objectives']},
    { id:'s4', no:4, title:'Facilitation Skills', criteria:[
      'Effective Use of Vocal Dynamics (Voice and Tone)',
      'Adaptation of Speech Rate to Support Learner Needs',
      'Use of Clear and Appropriate Language',
      'Consistent and Engaging Eye Contact',
      'Recognition and Response to Non-Verbal Cues',
      'Posture and Body Language Demonstration',
      'Effective Use of Hand Gestures and Facial Expressions',
      'Accuracy and Clarity in Responding to Learner Questions',
      'Engagement and Sustained Learner Interest',
      'Seamless Use of Transitions Between Topics',
      'Consistent Reinforcement of Key Learning Points']},
    { id:'s5', no:5, title:'Content / Subject Matter Expertise', criteria:[
      'Effective Use of Facilitator Guide and Training Materials',
      'Ensured completeness of training / content delivered',
      'Accuracy and Reliability of Training Information',
      'Effective Facilitation and Management of Learning Activities',
      'Comprehensive Debriefing to Reinforce Learning Transfer']},
    { id:'s6', no:6, title:'Classroom Management / Professionalism', criteria:[
      'Approachability and Confidence',
      'Professional Appearance and Attire',
      'Creative Problem-Solving in Ambiguous Situations',
      'Timely and Appropriate Management of Inappropriate Behavior',
      'Respect and Recognition of Adult Learners',
      'Minimization of Trainer Distractions']},
    { id:'s7', no:7, title:'Closing', criteria:[
      'Summary of Key Points and Identification of Learning Gaps',
      'Completion and Accuracy of Knowledge and Skills Assessment',
      'Facilitation of Learner Feedback through Level 1 Evaluations']}
  ];
  D.tofSections.forEach(function (sec) {
    sec.criteria = sec.criteria.map(function (text, i) {
      return { id:sec.id + '_c' + (i+1), text:text };
    });
  });
  D.tofScale = [
    { value:0, label:'Not met', desc:'Standard not demonstrated' },
    { value:1, label:'Partially met', desc:'Inconsistent or incomplete' },
    { value:2, label:'Met', desc:'Meets the expected standard' },
    { value:3, label:'Exceeds', desc:'Consistently above standard' }
  ];
  D.tofMax = 3;

  /** Section means and mean-of-sections, exactly as the workbook computes. */
  D.scoreTof = function (ratings) {
    var sections = D.tofSections.map(function (sec) {
      var vals = sec.criteria.map(function (cc) { return ratings[cc.id]; })
        .filter(function (v) { return typeof v === 'number'; });
      var pct = vals.length
        ? (vals.reduce(function (p, q) { return p + q; }, 0) / (vals.length * D.tofMax)) * 100 : 0;
      return { id:sec.id, no:sec.no, title:sec.title, answered:vals.length,
        total:sec.criteria.length, score:Math.round(pct * 10) / 10 };
    });
    var scored = sections.filter(function (s) { return s.answered > 0; });
    var overall = scored.length ? scored.reduce(function (p, s) { return p + s.score; }, 0) / scored.length : 0;
    return { sections:sections, overall:Math.round(overall * 10) / 10,
      answered:sections.reduce(function (p, s) { return p + s.answered; }, 0),
      total:sections.reduce(function (p, s) { return p + s.total; }, 0) };
  };

  /* ================ Trainer Effectiveness Calculator ====================== */
  D.effWeights = [
    { key:'l1', label:'L1 Score', weight:0.30, hint:'Level 1 learner feedback' },
    { key:'tof', label:'TOF', weight:0.30, hint:'Trainer Observation Form score' },
    { key:'throughput', label:'Throughput', weight:0.20, hint:'Learners graduated vs enrolled' },
    { key:'utilization', label:'Utilization', weight:0.15, hint:'Delivered hours vs available hours' },
    { key:'attendance', label:'Attendance', weight:0.05, hint:'Trainer attendance against schedule' }
  ];
  D.effThreshold = 90;
  var EFF_EFFECTIVE = 93, EFF_SATISFACTORY = 85;

  D.calcEffectiveness = function (m) {
    var total = 0;
    var contributions = D.effWeights.map(function (w) {
      var v = Number(m[w.key]);
      if (isNaN(v)) v = 0;
      var contrib = v * w.weight;
      total += contrib;
      return { key:w.key, label:w.label, weight:w.weight,
        value:Math.round(v * 100) / 100,
        contribution:Math.round(contrib * 10000) / 10000,
        below: v < D.effThreshold };
    });
    var gaps = contributions.filter(function (cc) { return cc.below; }).map(function (cc) { return cc.label; });
    var effectiveness = Math.round(total * 10000) / 10000;
    var rating = gaps.length ? 'Needs Improvement'
      : effectiveness >= EFF_EFFECTIVE ? 'Effective'
      : effectiveness >= EFF_SATISFACTORY ? 'Satisfactory' : 'Needs Improvement';
    return { effectiveness:effectiveness, rating:rating, gaps:gaps,
      improvement: gaps.length ? gaps.join(', ') : 'No Improvement Required',
      contributions:contributions };
  };

  D.effRecords = [
    { id:'eff_ref_1', trainer:'Nikita', trainerId:null, month:'July',
      l1:92.7, tof:91.5, throughput:95.5, utilization:102, attendance:100, source:'Workbook' },
    { id:'eff_ref_2', trainer:'Vandana', trainerId:null, month:'July',
      l1:94.8, tof:86.96, throughput:93.75, utilization:97.43, attendance:80, source:'Workbook' }
  ];
  var MONTHS6 = ['April','May','June','July','August','September'];
  D.trainers.forEach(function (tr, i) {
    var obs = D.observations.filter(function (o) { return o.trainerId === tr.id; });
    var tof = obs.length
      ? Math.round((obs.reduce(function (p, o) { return p + o.score; }, 0) / obs.length) * 100) / 100
      : S.round(82 + S.rand() * 16, 2);
    D.effRecords.push({ id:'eff_' + String(i+1).padStart(3,'0'), trainer:tr.name, trainerId:tr.id,
      month:MONTHS6[i % MONTHS6.length],
      l1:S.round(84 + S.rand() * 14, 2), tof:tof,
      throughput:S.round(86 + S.rand() * 13, 2), utilization:S.round(88 + S.rand() * 16, 2),
      attendance:S.pick([80,85,90,95,100,100,100]), source:'Platform' });
  });
  D.effRecords.forEach(function (rec) {
    var out = D.calcEffectiveness(rec);
    rec.effectiveness = out.effectiveness; rec.rating = out.rating;
    rec.improvement = out.improvement; rec.gaps = out.gaps;
  });

  D.tofRecords = [];
  D.trainers.slice(0,12).forEach(function (tr, i) {
    var ratings = {}, bias = 0.55 + (i % 5) * 0.09;
    D.tofSections.forEach(function (sec) {
      sec.criteria.forEach(function (cc) {
        var v = S.rand();
        ratings[cc.id] = v < bias * 0.55 ? 3 : v < bias + 0.28 ? 2 : v < 0.96 ? 1 : 0;
      });
    });
    var scored = D.scoreTof(ratings);
    D.tofRecords.push({ id:'tof_' + String(i+1).padStart(3,'0'), trainerId:tr.id, trainer:tr.name,
      evaluator:S.pick(['Aditi Raghunathan','Rohan Mehta','Quality Team']),
      observationDate:S.day(-S.int(3,120)),
      observationTime:S.pick(['09:30','10:00','11:00','14:00','15:30']),
      topic:S.pick(D.courses).title, durationMins:S.pick([60,90,120,180,240]),
      ratings:ratings, sections:scored.sections, score:scored.overall,
      rating: scored.overall >= 85 ? 'Exceeds' : scored.overall >= 70 ? 'Meets' : 'Needs development',
      recommendations:S.pick([
        'Maintain the current standard; consider mentoring newer facilitators.',
        'Tighten timing on the activity debrief and reinforce key points before closing.',
        'Increase learner participation during the introduction — draw out objectives from the room.',
        'Strengthen classroom readiness: materials and name tents should be set before learners arrive.']),
      status:'Completed' });
  });
  D.tofRecords.sort(function (x, y) { return new Date(y.observationDate) - new Date(x.observationDate); });

  /* ---------------------------------------------------- TNA / competency */
  D.competencyLibrary = [
    { id:'cmp_01', name:'Business Communication', category:'Behavioural', desc:'Written and verbal clarity with internal and external stakeholders.' },
    { id:'cmp_02', name:'Stakeholder Management', category:'Behavioural', desc:'Building and sustaining productive working relationships.' },
    { id:'cmp_03', name:'Problem Solving', category:'Behavioural', desc:'Structured analysis and resolution of operational issues.' },
    { id:'cmp_04', name:'People Leadership', category:'Leadership', desc:'Directing, coaching and developing a team.' },
    { id:'cmp_05', name:'Coaching & Feedback', category:'Leadership', desc:'Developing others through structured conversation.' },
    { id:'cmp_06', name:'Change Management', category:'Leadership', desc:'Leading teams through operational and system change.' },
    { id:'cmp_07', name:'Process Knowledge', category:'Functional', desc:'Depth of understanding of the end-to-end process.' },
    { id:'cmp_08', name:'Quality Orientation', category:'Functional', desc:'Accuracy, attention to detail and adherence to standards.' },
    { id:'cmp_09', name:'Data Literacy', category:'Technical', desc:'Interpreting and acting on operational data.' },
    { id:'cmp_10', name:'Systems Proficiency', category:'Technical', desc:'Effective use of core platforms and tooling.' },
    { id:'cmp_11', name:'Regulatory Awareness', category:'Compliance', desc:'Understanding of obligations relevant to the role.' },
    { id:'cmp_12', name:'Information Security', category:'Compliance', desc:'Safe handling of data and systems.' }
  ];
  D.proficiency = [
    { level:1, label:'Awareness', desc:'Understands the basics; needs supervision.' },
    { level:2, label:'Working', desc:'Performs routine tasks independently.' },
    { level:3, label:'Practitioner', desc:'Handles complexity without support.' },
    { level:4, label:'Advanced', desc:'Coaches others and improves the practice.' },
    { level:5, label:'Expert', desc:'Recognised authority; sets the standard.' }
  ];
  D.roleProfiles = [
    { role:'Process Associate', requirements:{ cmp_01:2, cmp_03:2, cmp_07:3, cmp_08:3, cmp_10:2, cmp_11:2, cmp_12:2 } },
    { role:'Senior Associate', requirements:{ cmp_01:3, cmp_02:2, cmp_03:3, cmp_07:4, cmp_08:4, cmp_09:2, cmp_10:3, cmp_11:3, cmp_12:2 } },
    { role:'Team Lead', requirements:{ cmp_01:4, cmp_02:3, cmp_03:3, cmp_04:3, cmp_05:3, cmp_07:4, cmp_08:4, cmp_09:3, cmp_11:3, cmp_12:3 } },
    { role:'Analyst', requirements:{ cmp_01:3, cmp_03:4, cmp_07:3, cmp_09:4, cmp_10:4, cmp_12:3 } },
    { role:'Specialist', requirements:{ cmp_01:3, cmp_02:3, cmp_07:4, cmp_08:4, cmp_09:3, cmp_10:3, cmp_11:3 } },
    { role:'Consultant', requirements:{ cmp_01:4, cmp_02:4, cmp_03:4, cmp_06:3, cmp_07:4, cmp_09:3 } },
    { role:'Engineer', requirements:{ cmp_03:4, cmp_07:3, cmp_09:3, cmp_10:4, cmp_12:4 } },
    { role:'Executive', requirements:{ cmp_01:3, cmp_02:2, cmp_07:3, cmp_08:3, cmp_11:2 } },
    { role:'Coordinator', requirements:{ cmp_01:3, cmp_02:3, cmp_07:3, cmp_08:3, cmp_10:2 } }
  ];
  function profileFor(title) {
    return D.roleProfiles.filter(function (p) { return p.role === title; })[0] || D.roleProfiles[0];
  }
  D.competencyRecords = [];
  learners.forEach(function (u) {
    var profile = profileFor(u.title);
    Object.keys(profile.requirements).forEach(function (cid) {
      var required = profile.requirements[cid], roll = S.rand();
      var current = roll < 0.42 ? required : roll < 0.72 ? Math.max(1, required-1)
        : roll < 0.86 ? Math.max(1, required-2) : Math.min(5, required+1);
      var comp = D.competencyLibrary.filter(function (cc) { return cc.id === cid; })[0];
      D.competencyRecords.push({ id:'cr_' + u.id + '_' + cid, userId:u.id, name:u.name,
        employeeId:u.employeeId, department:u.department, role:u.title, competencyId:cid,
        competency:comp.name, category:comp.category,
        current:current, required:required, gap:Math.max(0, required - current),
        assessedAt:S.day(-S.int(10,200)),
        assessedBy:S.pick(['Line manager','L&D assessment','Self + manager']) });
    });
  });

  var byDeptComp = {};
  D.competencyRecords.filter(function (x) { return x.gap > 0; }).forEach(function (x) {
    var k = x.department + '|' + x.competencyId;
    if (!byDeptComp[k]) {
      byDeptComp[k] = { department:x.department, competencyId:x.competencyId,
        competency:x.competency, category:x.category, people:0, totalGap:0, maxGap:0 };
    }
    var bb = byDeptComp[k];
    bb.people++; bb.totalGap += x.gap; bb.maxGap = Math.max(bb.maxGap, x.gap);
  });
  var INTERVENTIONS = ['Instructor-led workshop','E-learning module','Coaching programme',
    'On-the-job practice','Mentoring assignment','Blended programme'];
  D.tnaRecords = [];
  Object.keys(byDeptComp).forEach(function (k, i) {
    var bb = byDeptComp[k], avgGap = bb.totalGap / bb.people, weight = bb.people * avgGap;
    var course = D.courses.filter(function (cc) {
      return cc.category === bb.category || cc.category === 'Compliance';
    })[0] || D.courses[0];
    D.tnaRecords.push({ id:'tna_' + String(i+1).padStart(3,'0'),
      department:bb.department, competencyId:bb.competencyId,
      competency:bb.competency, category:bb.category,
      affected:bb.people, avgGap:Math.round(avgGap * 10) / 10, maxGap:bb.maxGap,
      priority: weight >= 12 ? 'Critical' : weight >= 6 ? 'High' : weight >= 3 ? 'Medium' : 'Low',
      intervention:S.pick(INTERVENTIONS),
      recommendedCourseId:course.id, recommendedCourse:course.title,
      targetDate:S.day(S.int(20,150)),
      status:S.pick(['Identified','Identified','Planned','In Progress','Addressed']),
      raisedBy:S.pick(['Capability review','Manager nomination','Quality audit','Annual TNA cycle']),
      createdAt:S.day(-S.int(5,90)) });
  });
  D.tnaRecords.sort(function (x, y) { return y.affected * y.avgGap - x.affected * x.avgGap; });

  /* ------------------------------------------------------- content / SOPs */
  var CONTENT_TYPES = ['Video','PDF','Presentation','Document','SCORM','Job aid','Link'];
  var CONTENT_TITLES = ['Facilitator Guide','Participant Workbook','Slide Deck','Quick Reference Card',
    'Process Walkthrough','Scenario Pack','Assessment Key','Session Plan'];
  D.content = [];
  D.courses.forEach(function (x, ci) {
    var n = S.int(2,4);
    for (var i = 0; i < n; i++) {
      var type = S.pick(CONTENT_TYPES);
      D.content.push({ id:'cnt_' + String(D.content.length+1).padStart(3,'0'),
        title:x.title.split(' ').slice(0,3).join(' ') + ' — ' + S.pick(CONTENT_TITLES),
        courseId:x.id, course:x.title, category:x.category, type:type,
        format: type === 'Video' ? 'MP4' : type === 'PDF' ? 'PDF' : type === 'Presentation' ? 'PPTX'
          : type === 'SCORM' ? 'SCORM 1.2' : type === 'Document' ? 'DOCX' : type === 'Link' ? 'URL' : 'PDF',
        sizeMb: type === 'Video' ? S.round(40 + S.rand() * 400, 1)
          : type === 'SCORM' ? S.round(8 + S.rand() * 60, 1) : S.round(0.4 + S.rand() * 12, 1),
        version:'v' + S.int(1,4) + '.' + S.int(0,9),
        author:S.pick(staff).name,
        status: ci < 18 ? S.pick(['Published','Published','Published','In Review']) : 'Draft',
        views:S.int(12,1800), downloads:S.int(3,460),
        updatedAt:S.day(-S.int(1,240)),
        language:S.pick(['English','English','English','Hindi']) });
    }
  });

  D.sopStages = ['Draft','Review','Approval','Published','Archived'];
  D.sops = [
    ['L&D Attendance and Re-batching','Operations','Defines how attendance is captured, escalated and how learners are re-batched.'],
    ['Trainer Observation and Calibration','Quality','Governs how observations are conducted, scored and calibrated across evaluators.'],
    ['Mandatory Compliance Training Drive','Compliance','End-to-end process for launching, tracking and closing a compliance drive.'],
    ['Assessment Design and Approval','Quality','Standards for authoring, reviewing and signing off assessments.'],
    ['Certificate Issue and Revocation','Compliance','Controls around issuing, verifying and revoking certificates.'],
    ['New Joiner Onboarding Curriculum','Operations','The learning path and checkpoints for a new joiner\u2019s first 90 days.'],
    ['Content Development Request','Operations','How content requests are raised, prioritised and delivered.'],
    ['Training Needs Analysis Cycle','Strategy','The annual and quarterly TNA cadence, inputs and outputs.'],
    ['LMS Access and Role Provisioning','Compliance','Granting, reviewing and revoking platform access by role.'],
    ['Training Effectiveness Measurement','Quality','How L1 to L4 effectiveness is measured and reported.'],
    ['Trainer Certification Pathway','Quality','Requirements and stages for certifying an internal trainer.'],
    ['Learning Records Retention','Compliance','Retention periods and disposal rules for learning records.']
  ].map(function (x, i) {
    var stage = i < 7 ? 'Published' : S.pick(['Draft','Review','Approval','Archived']);
    var reviewed = S.day(-S.int(20,300));
    var next = new Date(reviewed);
    next.setFullYear(next.getFullYear() + 1);
    return { id:'sop_' + String(i+1).padStart(3,'0'), code:'SOP-LD-' + String(i+1).padStart(3,'0'),
      title:x[0], category:x[1], purpose:x[2],
      version: stage === 'Published' ? 'v' + S.int(1,3) + '.0' : 'v0.' + S.int(1,9),
      owner:S.pick(staff).name, approver:'Aditi Raghunathan', status:stage,
      effectiveFrom: stage === 'Published' ? reviewed : null,
      lastReviewed:reviewed, nextReview:next.toISOString(),
      linkedCourseId:S.pick(D.courses).id,
      changeNote:S.pick(['Annual review — no material change.','Updated escalation matrix and owner.',
        'Aligned to revised retention schedule.','Added RACI and clarified approval stage.']),
      createdAt:S.day(-S.int(120,700)) };
  });

  /* -------------------------------------------------- coaching / mentoring */
  var COACH_FOCUS = ['Leadership presence','Difficult conversations','Time and priority management',
    'Stakeholder influence','Performance conversations','Decision making','Presentation confidence','Delegation'];
  D.coaching = [];
  for (var ci2 = 0; ci2 < 22; ci2++) {
    var coachee = S.pick(learners), coach = S.pick(staff);
    var planned = S.int(4,8), done = S.int(0, planned);
    D.coaching.push({ id:'coach_' + String(ci2+1).padStart(3,'0'), type:'Coaching',
      coachee:coachee.name, coacheeId:coachee.id, department:coachee.department,
      coach:coach.name, coachId:coach.id, focus:S.pick(COACH_FOCUS),
      goal:S.pick(['Lead a cross-team initiative with confidence by the end of the quarter.',
        'Hold structured performance conversations without escalation.',
        'Present to the leadership forum unaided.',
        'Delegate effectively and reduce personal task load by a third.']),
      sessionsPlanned:planned, sessionsCompleted:done,
      nextSession: done >= planned ? null : S.day(S.int(2,30), S.int(9,17), 0),
      startedAt:S.day(-S.int(10,180)),
      status: done === 0 ? 'Requested' : done >= planned ? 'Completed' : 'In Progress',
      progress:Math.round((done / planned) * 100) });
  }
  var MENTOR_AREAS = ['Career progression','Domain expertise','Cross-functional exposure',
    'Leadership readiness','Professional network','Technical depth'];
  D.mentoring = [];
  for (var mi = 0; mi < 18; mi++) {
    var mentee = S.pick(learners), mentor = S.pick(staff.concat(D.trainers));
    var months = S.int(3,12), elapsed = S.int(0, months);
    D.mentoring.push({ id:'mentor_' + String(mi+1).padStart(3,'0'), type:'Mentoring',
      mentee:mentee.name, menteeId:mentee.id, department:mentee.department,
      mentor:mentor.name, mentorId:mentor.id, area:S.pick(MENTOR_AREAS),
      goal:S.pick(['Build readiness for a team lead role within twelve months.',
        'Develop depth in the domain and become a go-to reference.',
        'Gain exposure to adjacent functions ahead of a lateral move.',
        'Grow an internal network beyond the immediate team.']),
      durationMonths:months, monthsElapsed:elapsed, matchedOn:S.day(-elapsed * 30),
      nextCheckIn: elapsed >= months ? null : S.day(S.int(3,28), S.int(9,17), 0),
      status: elapsed === 0 ? 'Matching' : elapsed >= months ? 'Completed' : 'Active',
      progress:Math.round((elapsed / months) * 100) });
  }

  /* ------------------------------------------------------------- requests */
  D.requestTypes = ['Training request','Course request','Coaching request','Mentoring request',
    'Content development','SOP development','L&D help','Other service'];
  D.requestStates = ['Submitted','Under Review','Assigned','In Progress','Completed','Rejected'];
  D.requests = [];
  for (var ri = 0; ri < 38; ri++) {
    var requester = S.pick(D.users), state2 = S.pick(D.requestStates);
    D.requests.push({ id:'req_' + String(ri+1).padStart(3,'0'), reference:'REQ-' + (4000 + ri),
      type:S.pick(D.requestTypes),
      title:S.pick(['Advanced Excel refresher for the reporting team',
        'Coaching support ahead of a team lead transition',
        'New joiner induction deck needs a refresh',
        'Compliance drive for the new regulatory change',
        'Mentoring match for a high-potential analyst',
        'SOP needed for the revised escalation path',
        'Presentation skills workshop for client-facing staff',
        'Refresher on the updated quality framework']),
      requester:requester.name, requesterId:requester.id, department:requester.department,
      audience:S.pick(['My team','Whole department','Selected individuals','All staff']),
      headcount:S.int(1,60), priority:S.pick(['Low','Medium','Medium','High','Critical']),
      status:state2, assignee: state2 === 'Submitted' ? null : S.pick(staff).name,
      neededBy:S.day(S.int(7,120)), createdAt:S.day(-S.int(1,120)), updatedAt:S.day(-S.int(0,20)),
      description:'Raised through the request centre. Full requirement captured in the request detail.' });
  }
  D.requests.sort(function (x, y) { return new Date(y.createdAt) - new Date(x.createdAt); });

  /* ------------------------------------------------------------- newsfeed */
  D.posts = [
    { category:'Announcement', pinned:true, title:'Q3 compliance drive opens Monday',
      body:'All mandatory modules for the quarter go live on Monday morning. Completion is required within 21 days. Leaders will receive a weekly completion report for their teams; please chase gaps before the final week rather than after it.' },
    { category:'New course', pinned:false, title:'Coaching Conversations for Team Leads is now open',
      body:'A four-session blended programme for anyone holding regular one-to-ones. Nominations are open to team leads and above. Places are capped at 18 per cohort.' },
    { category:'Recognition', pinned:false, title:'Trainer of the month — July',
      body:'Congratulations to our top-rated facilitator this month, who scored 94.7% weighted effectiveness with a perfect attendance record and the highest L1 feedback in the team.' },
    { category:'Update', pinned:false, title:'Trainer Observation Form moves into the platform',
      body:'The TOF is now completed directly in GG Learning Labs rather than in the spreadsheet. Section scores and the overall score calculate automatically, and results feed straight into the effectiveness calculator.' },
    { category:'Event', pinned:false, title:'Learning at Work Week — sessions announced',
      body:'Eight lunch-and-learn sessions across the week, covering data literacy, wellbeing, and working across time zones. No booking required, but rooms fill quickly.' },
    { category:'Notice', pinned:false, title:'Certificate verification is live',
      body:'Every certificate now carries a serial that can be verified from the register. If you hold a certificate issued before this change, it has been backfilled with a serial automatically.' },
    { category:'Announcement', pinned:false, title:'Annual TNA cycle begins next month',
      body:'Managers will be asked to review competency profiles for their teams. The output feeds the training calendar for the following two quarters, so accuracy here genuinely matters.' }
  ].map(function (p, i) {
    var author = i % 3 === 0 ? D.users[0] : D.users[1];
    return { id:'post_' + String(i+1).padStart(3,'0'), title:p.title, body:p.body,
      category:p.category, pinned:p.pinned,
      authorId:author.id, author:author.name, authorRole:GGL.roleLabel(author.role),
      createdAt:S.day(-i * 2 - S.int(0,2), S.int(9,17), S.int(0,59)),
      image:null, likes:S.int(3,48), likedBy:[], commentCount:0 };
  });
  var COMMENT_TEXTS = ['Useful, thank you — shared with the team.',
    'Will the recording be available afterwards for people on shift?',
    'Completed mine this morning. The new format is much quicker.',
    'Is this open to contractors as well, or permanent staff only?',
    'Great to see this finally move off the spreadsheet.',
    'Can we get a version of this for the night shift?',
    'Nominated two of my team — looking forward to it.',
    'Really helpful, especially the section on feedback.'];
  D.comments = [];
  D.posts.forEach(function (post) {
    var n = S.int(0,4);
    for (var i = 0; i < n; i++) {
      var u = S.pick(D.users);
      D.comments.push({ id:'cmt_' + String(D.comments.length+1).padStart(4,'0'), postId:post.id,
        authorId:u.id, author:u.name, authorRole:GGL.roleLabel(u.role),
        body:S.pick(COMMENT_TEXTS), createdAt:S.day(-S.int(0,5), S.int(9,19), S.int(0,59)) });
    }
    post.commentCount = n;
  });

  /* ------------------------------------------------------------ audit log */
  var AUDIT_ACTIONS = [
    ['user.create','Created account','userPlus','User management'],
    ['user.update','Updated account','edit','User management'],
    ['user.delete','Deleted account','trash','User management'],
    ['user.deactivate','Deactivated account','lock','User management'],
    ['auth.login','Signed in','logout','Authentication'],
    ['course.publish','Published course','book','Courses'],
    ['course.update','Updated course','edit','Courses'],
    ['batch.create','Created batch','layers','Batches'],
    ['attendance.bulk','Bulk attendance update','userCheck','Attendance'],
    ['assessment.create','Created assessment','checkSquare','Assessments'],
    ['certificate.issue','Issued certificate','award','Certificates'],
    ['certificate.revoke','Revoked certificate','xCircle','Certificates'],
    ['tof.submit','Submitted observation','eye','Trainer observation'],
    ['sop.publish','Published SOP','clipboard','SOP management'],
    ['report.export','Exported report','download','Reports'],
    ['settings.update','Changed platform setting','settings','Platform settings']
  ];
  D.audit = [];
  for (var aui = 0; aui < 90; aui++) {
    var act = S.pick(AUDIT_ACTIONS), actor = S.pick(staff);
    D.audit.push({ id:'aud_' + String(aui+1).padStart(4,'0'),
      action:act[0], label:act[1], icon:act[2], module:act[3],
      actorId:actor.id, actor:actor.name, actorRole:GGL.roleLabel(actor.role),
      target:S.pick([S.pick(D.users).name, S.pick(D.courses).title, S.pick(D.batches).name]),
      at:S.day(-S.int(0,45), S.int(7,21), S.int(0,59)),
      ip:'10.' + S.int(0,40) + '.' + S.int(1,255) + '.' + S.int(1,255),
      severity: act[0].indexOf('delete') !== -1 || act[0].indexOf('revoke') !== -1 ? 'High'
        : act[0].indexOf('create') !== -1 || act[0].indexOf('publish') !== -1 ? 'Medium' : 'Low',
      result:S.bool(0.97) ? 'Success' : 'Failed' });
  }
  D.audit.sort(function (x, y) { return new Date(y.at) - new Date(x.at); });

  /* -------------------------------------------------------- learning paths */
  D.paths = [
    ['New Manager Foundations','Leadership',['Leadership Essentials for New Managers','Coaching Conversations for Team Leads','Conflict Resolution at Work','Stakeholder Management']],
    ['Compliance Essentials','Compliance',['POSH Awareness & Compliance','Information Security Fundamentals','GDPR & Data Privacy Practices','Workplace Safety Induction']],
    ['Analyst Toolkit','Technical',['Advanced Excel for Analysts','Data Storytelling with Dashboards','Root Cause Analysis & Problem Solving']],
    ['Trainer Certification','Capability Building',['Train the Trainer Certification','Presentation Skills Masterclass','Effective Business Communication']],
    ['Customer Excellence','Customer Experience',['Customer Experience Excellence','Effective Business Communication','Conflict Resolution at Work']]
  ].map(function (p, i) {
    var steps = p[2].map(function (title, si) {
      var course = D.courses.filter(function (cc) { return cc.title === title; })[0];
      return { order:si+1, courseId:course ? course.id : null, title:title,
        durationMins:course ? course.durationMins : 120, required:true };
    });
    return { id:'path_' + String(i+1).padStart(3,'0'), name:p[0], category:p[1],
      description:'A sequenced programme building capability in ' + p[1].toLowerCase() + '.',
      steps:steps, totalMins:steps.reduce(function (acc, s) { return acc + s.durationMins; }, 0),
      enrolled:S.int(12,180), completed:S.int(4,90),
      status: i < 4 ? 'Published' : 'Draft', owner:S.pick(staff).name,
      createdAt:S.day(-S.int(40,400)) };
  });

  /* ----------------------------------------------------- platform settings */
  D.platformSettings = {
    organisation:{ name:'IMS Group', shortName:'IMS', primaryContact:'Aditi Raghunathan',
      supportEmail:'support@gglearninglabs.example', timezone:'Asia/Kolkata (GMT+5:30)',
      fiscalYearStart:'April' },
    learning:{ defaultPassMark:70, maxAttempts:3, certificateValidityYears:2,
      mandatoryCompletionDays:21, attendanceThreshold:80, tofThreshold:90, effectivenessThreshold:90 },
    access:{ ssoEnabled:false, selfRegistration:false, sessionTimeoutMins:60,
      passwordMinLength:8, mfaRequired:false },
    notifications:{ sessionReminderHours:24, assessmentReminderDays:3,
      weeklyDigest:true, escalateOverdueDays:7 },
    retention:{ learningRecordsYears:7, auditLogYears:3, attendanceYears:5, anonymiseOnExit:true }
  };

})(window.GGL = window.GGL || {});
