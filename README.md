# GG Learning Labs

**One Platform. Every L&D Need.**

A complete Learning & Development management platform — planning, design, delivery,
assessment, effectiveness measurement, people development and analytics in one
ecosystem. An LMS is one module inside it, not the whole product.

This repository contains the **frontend prototype**: plain HTML, CSS and JavaScript,
no build step, no framework, no dependencies.

---

## Running it

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

Opening `index.html` directly from disk works too, but a server matches production.

## Demo accounts

Authentication is **mocked**. Any password of six or more characters works.

| Role | Email |
|---|---|
| Super Admin | `superadmin@example.com` |
| Admin | `admin@example.com` |
| Trainer | `trainer@example.com` |
| Trainee | `user@example.com` |

The login page fills these in for you. Once signed in, switch persona from the
sidebar user menu without logging out.

---

## The two client instruments

Two modules are transcribed from the supplied workbooks, not invented.

### Trainer Observation Form

Seven sections and 36 criteria, verbatim from `TOF Form-Blank.xlsx`.
Section sizes: 4 / 3 / 4 / 11 / 5 / 6 / 3.

A section score is the mean of its **answered** criteria; the overall score is the
mean of the section scores. Criteria left blank are excluded from the average
rather than scored as zero, so a partially observed session is not unfairly
penalised.

### Trainer Effectiveness Calculator

The weighting was reverse-engineered from the two worked rows in
`Trainer Effectiveness.xlsx` and verified to eight decimal places:

```
Effectiveness = L1×0.30 + TOF×0.30 + Throughput×0.20
              + Utilization×0.15 + Attendance×0.05
```

| Row | Inputs | Calculated | Workbook |
|---|---|---|---|
| Nikita | 92.7 / 91.5 / 95.5 / 102 / 100 | **94.66%** | 0.9466 |
| Vandana | 94.8 / 86.96 / 93.75 / 97.43 / 80 | **91.8925%** | 0.918925 |
| Average | — | **93.27625%** | 0.9327625 |

Any component below **90%** is flagged as an area of improvement and forces a
"Needs Improvement" rating regardless of the weighted total — which is why
Vandana rates as Needs Improvement at 91.89% and is flagged "TOF, Attendance",
exactly as the workbook does.

The two are connected: submitting a TOF writes its overall score into the
trainer's effectiveness record, where it carries the 30% TOF weight.

---

## How the modules interrelate

These are not independent demos — they share one chain of evidence:

```
course ──> assessment ──> attempt ──> certificate
                             │            │
                             └──> points ─┴──> badges ──> leaderboard
                             │
                             └──> effectiveness (pre/post knowledge gain)
```

Submitting an assessment is the one write that fans out. `submitAttempt()` grades
the answers against the stored key, records the attempt, awards points from a rule
table, and — on a passed post-assessment — issues a certificate with its own serial.
Badges are **evaluated** against that evidence rather than stored as flags, so they
cannot drift out of sync.

---

## Routes

**Public** — `/index.html`, `/login.html`, `/forgot-password.html`

**Application** (28 pages under `/app/`)

Dashboard · My Learning · Training Calendar · Assessments · Certificates ·
Achievements · Competencies · Learning Paths · Coaching · Mentoring · TNA/TNI ·
Courses · Batches · Attendance · Trainers · Content Library · Effectiveness ·
Trainer Observation · Effectiveness Calculator · Reports · SOPs · Users ·
Audit Log · Platform Settings · Requests · Newsfeed · Notifications · Settings

Pages guard themselves: unauthenticated visitors are redirected to login, and a
learner who navigates directly to an admin page gets an access message rather than
a broken screen.

**No navigation item is a "Coming soon" placeholder.** Every entry is a live module.

---

## Architecture

Five JavaScript files, loaded in a fixed order, sharing one `window.GGL` namespace.
No bundler, no ES-module CORS problems, works from `file://`.

```
core.js      icons, utilities, config, navigation registry, theme
data.js      deterministic mock data + the two client instruments
services.js  mock auth + domain services behind a promise interface
ui.js        toasts, modals, dropdowns, tabs, charts, shell, data table
pages.js     every screen, keyed by window.GGL_PAGE
```

Each HTML page sets `window.GGL_PAGE` before loading `pages.js`; a small router at
the bottom dispatches to the right screen. Eleven of the more uniform modules are
declared as data and rendered by one shared runner, which keeps them consistent
without eleven near-identical files.

### The service seam

Components never touch the mock data arrays. They call services, which return
promises:

```js
GGL.services.users.listByRole('admin', { search, filters, sort, page, size })
  .then(renderTable);
```

Query work happens **inside** the service, so it can be pushed into SQL later
without the calling code changing. Writes persist to `localStorage` under
`ggl.overrides`; **Settings → Account → Reset prototype data** restores the seed.

### Real exports

Exports produce actual files. CSV/Excel are built in-browser and downloaded via a
Blob (UTF-8 with BOM so Excel opens them correctly). PDF opens a styled,
print-ready document. Certificates download as a self-contained HTML document
with a print button.

---

## Design system

Tokens live at the top of `main.css`. Components reference only semantic
variables, never raw ramps, so dark mode overrides one layer and every component
follows.

Charts are hand-rolled inline SVG — line/area, bar, donut, gauge, horizontal bars.
They read CSS variables, so they re-theme automatically, and carry `role="img"`
with accessible labels.

The hero, auth panel, CTA band and learner welcome card share one abstract brand
image (`assets/img/hero-dark.jpg`) under a dot-matrix overlay and a legibility
scrim. Capability and lifecycle cards each carry their own gradient tone
(`.tone-1` … `.tone-8`) so the grids read as a spectrum rather than a wall of
identical blue tiles.

The logo is a CSS placeholder (`.logo-mark`). Drop in real assets:

```html
<img class="logo-light" src="assets/img/logo-light.svg" alt="GG Learning Labs">
<img class="logo-dark"  src="assets/img/logo-dark.svg"  alt="GG Learning Labs">
```

The theme swap rules already exist in `main.css`.

---

## Testing

```bash
node tools/smoke-test.js    # 97 checks: data integrity, utils, services, auth,
                            # grading, certificates, points, badges, and the
                            # workbook arithmetic verified to 1e-6
```

---

## What is and isn't built

### Built and interactive

Public site · authentication · role-based shell · three dashboards · user CRUD
with role-aware creation · courses · batches · calendar · attendance · assessments
(graded, end to end) · certificates (downloadable) · gamification · Trainer
Observation Form · Effectiveness Calculator · TNA/TNI · competencies with a
department heatmap · trainers · content library · SOPs with approval workflow ·
coaching · mentoring · requests · learning paths · newsfeed with image upload,
likes and comments · audit log · platform settings · reports with real exports.

### Deliberately not built

SCORM playback · assessment question authoring · real file uploads to a server ·
video streaming · email delivery.

### Known limitations

- No backend. Data is in-memory plus `localStorage`.
- Excel export is CSV with an `.xls` extension, not a true workbook.
- Newsfeed images are data URLs in browser storage, not uploaded.
- Assessments display a time limit but do not enforce a countdown.
- The TOF has no evaluator calibration workflow yet.

---

## Security

**The role checks in this prototype are presentation, not security.**

Navigation shaping and page guards improve the experience and prevent accidents.
They are trivially bypassable from the browser console, and they are meant to be.

What this codebase does do: no secrets in source; mock authentication isolated
behind a clear warning in `services.js`; all string data escaped with
`GGL.utils.esc()` before reaching `innerHTML`; password reset does not reveal
whether an account exists.

**Grading currently happens client-side, so answer keys ship to the browser.**
Fine for a demo, unacceptable in production — it is the first migration item.

---

## Backend integration plan

| Today | Becomes |
|---|---|
| `auth.signIn()` | Provider sign-in |
| `collection().list(q)` | `select(...).ilike(...).order(...).range(...)` |
| `collection().create/update/remove` | `insert` / `update` / `delete` |
| `localStorage` overrides | Real persistence |
| Frontend role checks | Row-level security policies |
| `assessments.submitAttempt()` | Server-side grading — the key must never reach the client |

Because every component already calls services, this is a substitution rather
than a rewrite.

---

Frontend prototype. Sample data only. No production data is present.

## September 2026 visual and module refresh

- Refreshed button, icon-button, card, modal and menu styling.
- Added a visible, responsive hero visual using the supplied project artwork.
- Corrected theme-toggle centering and top-edge/tooltip clipping safeguards.
- Increased dropdown and user-menu contrast in both themes.
- Confirmed Super Admin role-aware creation of Learner, Administrator and Super Admin accounts.
- Added interactive starter workspaces for SCORM Player, Assessment Builder and Upload Center.
- Corrected the browser QA calculator route.
- Included the source TOF and Trainer Effectiveness workbooks under `reference/`.

## Corrective build 2

- Theme initialization is now idempotent and the toggle remains centered.
- Public homepage loads the data and service dependencies required by the sign-in modal.
- Header, hero and footer sign-in links open a modal; `login.html` remains as a direct-route and accessibility fallback.
- Pricing cards are forced visible and spacing has been tightened across public sections.
- Assessment Builder, SCORM Player and Upload Center are registered in the page router.


## Role-led L&D workflow refresh

The prototype now separates four working personas:

- Super Admin: platform governance, access, configuration, audit and enterprise reporting.
- L&D Administrator: course, batch, trainer, trainee assignment and operational reporting.
- Trainer: assigned batch delivery, attendance, assessments, progress monitoring and batch close-out.
- Trainee: assigned learning, calendar, assessments, certificates, progress and learning requests.

The homepage login modal exposes all four demo accounts and the shared password. Each account opens a role-specific dashboard and navigation model.


### Product-first visual redesign
The public homepage now places a responsive application dashboard in the first viewport, with the product shell, capability analytics, heatmap, recent assessments and coaching activity rendered as HTML/CSS components. It includes an interactive nine-stage capability cycle, six L&D ecosystem workbenches, three role-specific workspaces, capability intelligence and a six-stage product tour. Existing application routes, mock services and domain logic remain unchanged.

Run `python3 tools/product-site-audit.py` for public homepage checks and `node tools/smoke-test.js` for application regression checks.

### Audience, Genie, membership and launchpad update (v13)
- Added Individual and Business homepage experiences with persistent audience selection.
- Added GG Genie, displayed once per browser session, with need-based links into relevant product areas.
- Restored purchase experiences: One Membership, Build Your Own module access, and Business Plans. Purchase is a clearly marked front-end prototype and does not collect payment.
- Added slide-like desktop viewport storytelling using restrained scroll snapping; mobile retains natural scrolling.
- Added a role-aware launchpad after authentication. Module cards flip on hover/focus and open the corresponding workspace.
- Standardised the public site and launchpad on Poppins body type and Raleway display type.

### Homepage simplification and individual entitlements (v14)
- Removed the large dashboard simulation from the first public viewport.
- Tightened the Capability Cycle to fit as a complete desktop canvas while retaining natural mobile flow.
- Removed the L&D ecosystem, Capability Intelligence, interactive tour and closing CTA sections.
- Retained role workspaces and membership configuration.
- Added a GG Journal section with four working article routes.
- Added a purchasable-module entitlement set for Individual Upskillers and removed platform-governance-only tiles from that launchpad.
- Individual Upskiller access now bypasses organisational learner blocks for Trainer Observation, Effectiveness Calculator, Effectiveness and Reports.

### Cycle crop and role-section correction (v15)
- Removed the public homepage section headed “One platform. Three different jobs to be done.”
- Removed stale navigation links to the deleted workspaces section.
- Removed the forced 100vh/scroll-snap behavior from the Capability Cycle section.
- Constrained and scaled the desktop orbit while preserving visible overflow around orbit nodes.
- Added tablet and mobile fallbacks so the orbit and inspector reflow rather than clip.

### Presentation-canvas and newsletter refinement (v17)
- Rebalanced the opening canvas with a concise Identify → Develop → Prove strip while keeping the dashboard simulation removed.
- Rebuilt the Capability Cycle as a bounded presentation canvas with a smaller complete orbit, compact inspector and animated signal handoff from cycle to explanation.
- Reflowed the GG Journal and Membership areas so all related information fits together at standard desktop viewport heights; tablet/mobile use natural height.
- Added a frontend newsletter signup interaction with explicit prototype feedback.
- Added footer routes for About us, Press notes, Contact, Support, Privacy, Terms and Accessibility while retaining social links.
