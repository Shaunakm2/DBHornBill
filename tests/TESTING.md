# Tests

20 suites and 2 audits for the recruitment ATS training sandbox. Node only — no browser needed.
Nothing here ships with the application; keep it in the repo but out of the deployed folder if you
serve from root.

## Running them

```bash
cd tests
npm install          # jsdom + fake-indexeddb, dev only
npm test             # every suite and both audits
node test19.js       # one suite
```

The harness finds `index.html`, `app.js` and `app.css` by looking in `.`, `..`, `../app` and
`../src`, so it works whether the tests sit beside the app or in a `tests/` folder next to it. It
also accepts `dist_*` names for a working copy.

Expected output ends with `All 22 passed`. Any failure prints the first lines of the error.

## Run these after every change

They are fast and they have caught real defects repeatedly. If a change is unverified, say so
rather than assuming.

| Suite | Covers |
|---|---|
| test2 | Full desk cycle end to end. Runs in **legacy** interface and **strict** mode |
| test3 | CV pool, boolean semantics, saved searches, mass actions, edit guards |
| test4 | Sourcing scenario completion |
| test5 | Persistence across reloads, clear, migration from an older saved state |
| test6 | Guided tour: prompt, skip, every step, replay, persistence |
| test7 | Collapsible practice panel, sourcing from a job order |
| test8 | Email composer and templates, notifications, training mode |
| test9 | Navigation in **both** interface modes |
| test10 | Permissive mode and overrides, bulk actions, duplicates, drag-and-drop, preview |
| test11 | Agreed picklists, rule bands, record layout |
| test12 | Files tab, Parse as Existing, Direct Hire pricing |
| test13 | Tenant configuration screen, clickable workflow icons |
| test14 | Details card, submission funnel, Actions menus |
| test15 | Report chart cards, asserted against real data totals |
| test16 | State-transition matrix and boundary values |
| test17 | Injection and escaping (7 payloads), boolean fuzzing (43 queries), extreme values |
| test18 | 400-step randomised walk plus invariants, export/import round trip |
| test19 | Business flows: Direct Hire end to end, decline paths, cross-mode |
| test20 | Accessibility: roles, names, labels, keyboard, every screen and dialog |
| test21 | Desk types scoping scenarios, progress and the session summary |
| audit | Dead controls, broken links, thin views, leaked values, duplicate ids, data invariants |
| audit2 | Undefined CSS tokens, unwired controls, modal open/close, required-field enforcement |

## What these cannot check

**There is no layout engine.** jsdom computes no geometry, so overlapping text, clipped elements,
duplicated headings and repeated group headers all pass. Four visual bugs in this project were
found by someone looking at a screenshot, not by these suites. **Ask for a screenshot after any
visual change.**

## Failure patterns that cost real bugs here

1. **Feature coverage is not business-flow coverage.** Fifteen suites passed while a direct hire
   could never be client-submitted, because the sendout applied a contract rate rule to permanent
   roles. Found only by writing a perm flow end to end (test19).
2. **Fresh-install testing hides upgrade bugs.** Moving resume text into its own store lost every
   CV for anyone with previously saved data. Every persistence test started from an empty browser.
   test5 now covers the migration path.
3. **Half-applied patches leave broken states.** Scripted edits that abort before writing once left
   controls rendering with no handler. `audit.js` catches that; run it.

## Adding a suite

Copy the top of any existing file. The pattern is: `loadApp()`, a `fail()` collector, helpers for
navigation and forms, then assertions. Exit non-zero on failure so `run-all.js` reports it.

Navigation differs by interface mode, so use the standard helper:

```js
function nav(v) {
  let a = q('#rail [data-go="' + v + '"]');
  if (!a) { if (!q('.mfly')) click(q('[data-act="menu"]')); a = q('.mfly a[data-go="' + v + '"]'); }
  if (!a) return fail('no menu item ' + v);
  click(a);
}
```

Two things that bite: after `render()` any DOM reference is stale, so re-query rather than reusing
a node; and date and select inputs need a `change` event, not `input`.
