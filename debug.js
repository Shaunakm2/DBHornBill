/* debug.js — temporary. Delete once the dropdown question is answered.

   Something is replacing the view while a dropdown is open. I have guarded
   the two redraw paths I know about and it still happens, which means there
   is a third I have not found. Guessing again is not the answer; this makes
   the page say who did it.

   Load it LAST in index.html, after app.js:

       <script src="debug.js?v=16"></script>

   Then: open Training operations -> Reports, click the Batch dropdown, and
   wait for it to close. The console prints one line per repaint with the
   call stack that caused it, and a loud line if a repaint happens while a
   control is focused — that is the one that closes your dropdown. */
(function () {
  'use strict';

  var n = 0;
  var openedAt = 0;

  function active() {
    var a = document.activeElement;
    if (!a) return 'none';
    return (a.tagName || '?').toLowerCase() +
      (a.dataset && a.dataset.st ? '[data-st=' + a.dataset.st + ']' : '') +
      (a.dataset && a.dataset.sf ? '[data-sf=' + a.dataset.sf + ']' : '');
  }

  function wrap() {
    if (!window.APP || !window.APP.render || window.APP.__wrapped) return false;
    var real = window.APP.render;
    window.APP.render = function () {
      n++;
      var who = active();
      var culprit = (new Error()).stack || '(no stack)';
      var suspect = who.indexOf('select') === 0 || who.indexOf('input') === 0;
      var since = openedAt ? ' | ' + (Date.now() - openedAt) + 'ms after the dropdown opened' : '';
      if (suspect) {
        console.warn('%cREPAINT #' + n + ' WHILE ' + who.toUpperCase() +
          ' WAS FOCUSED' + since, 'background:#8A3520;color:#fff;padding:2px 6px');
        console.warn(culprit);
      } else {
        console.info('repaint #' + n + ' (focus: ' + who + ')' + since);
        console.debug(culprit);
      }
      return real.apply(this, arguments);
    };
    window.APP.__wrapped = true;
    console.info('%cdebug.js armed — repaints will be logged',
      'background:#2F7A63;color:#fff;padding:2px 6px');
    return true;
  }

  /* window.APP appears when app.js boots, which may be after this file runs. */
  if (!wrap()) {
    var tries = 0;
    var t = setInterval(function () {
      if (wrap() || ++tries > 100) clearInterval(t);
    }, 100);
  }

  /* Mark when a dropdown is opened, so each repaint can say how long after. */
  document.addEventListener('mousedown', function (ev) {
    if (ev.target && (ev.target.tagName || '').toLowerCase() === 'select') {
      openedAt = Date.now();
      console.info('%cdropdown opened', 'color:#2F7A63', ev.target.dataset || {});
    }
  }, true);

  /* And say plainly when it is taken away. */
  var mo = new MutationObserver(function (recs) {
    recs.forEach(function (r) {
      [].forEach.call(r.removedNodes || [], function (node) {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'SELECT' || (node.querySelector && node.querySelector('select'))) {
          console.warn('%ca select was removed from the page' +
            (openedAt ? ' ' + (Date.now() - openedAt) + 'ms after opening' : ''),
            'background:#8A3520;color:#fff;padding:2px 6px');
        }
      });
    });
  });
  if (document.getElementById('main')) {
    mo.observe(document.getElementById('main'), { childList: true, subtree: true });
  }
})();
