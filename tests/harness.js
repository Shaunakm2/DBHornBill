/* Shared test harness.
   Boots the application in jsdom. Looks for the repo filenames first, then the working copies,
   so it runs unchanged whether the app sits beside it or one directory up. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function findFile(names) {
  const dirs = ['.', '..', path.join('..', 'app'), path.join('..', 'src')];
  for (const dir of dirs) {
    for (const name of names) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error('Cannot find any of: ' + names.join(', ') +
    '\nRun the suites from the folder holding index.html and app.js, or from a tests/ folder beside them.');
}

const SHELL_PATH = findFile(['index.html', 'dist_index.html']);
const APP_PATH = findFile(['app.js', 'dist_app.js']);
const CSS_PATH = findFile(['app.css', 'dist_app.css']);
const SHELL = fs.readFileSync(SHELL_PATH, 'utf8');
const APP = fs.readFileSync(APP_PATH, 'utf8');

function loadApp(opts) {
  opts = opts || {};
  const dom = new JSDOM(SHELL, { runScripts: 'outside-only', pretendToBeVisual: true });
  if (opts.indexedDB) {
    dom.window.indexedDB = opts.indexedDB;
    dom.window.IDBKeyRange = opts.IDBKeyRange;
  }
  if (opts.onError) dom.window.addEventListener('error', opts.onError);
  dom.window.eval(APP);
  return dom;
}
module.exports = { loadApp, SHELL, APP, SHELL_PATH, APP_PATH, CSS_PATH };
