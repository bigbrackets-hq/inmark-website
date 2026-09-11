/* Standalone preloader — the landing page's ceremony (gradient TextLoop ribbon,
   big logo, 0→100 counter, curtain lift) for pages that don't load main.js.
   Configure the once-per-session key via data-loader-key on the script tag.
   Signals completion by adding body.is-ready and dispatching 'inmark:ready'. */
(function () {
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var script = document.currentScript;
  var KEY = (script && script.dataset.loaderKey) || 'inmark-loaded';
  var loader = document.getElementById('loader');

  function ready(settleMs) {
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    document.dispatchEvent(new CustomEvent('inmark:ready'));
    setTimeout(function () { document.body.classList.add('is-settled'); }, settleMs);
  }

  if (!loader) { ready(0); return; }

  if (REDUCED) {
    loader.remove();
    ready(0);
    return;
  }

  var returning = false;
  try { returning = sessionStorage.getItem(KEY) === '1'; } catch (e) {}
  if (returning) {
    loader.remove();
    ready(2300);
    return;
  }

  /* ---- ribbon TextLoop ---- */
  (function () {
    var root = document.getElementById('creatorLoop');
    var pathEl = document.getElementById('loopPath');
    var head = document.getElementById('loopHead');
    var tail = document.getElementById('loopTail');
    var measure = document.getElementById('loopMeasure');
    if (!root || !pathEl || !head || !measure) return;
    if (tail) tail.remove();
    var unit = 'CREATORS FIRST  ✦  AN OS FOR EVERY PARTNERSHIP  ✦  ';
    measure.textContent = unit;
    var unitW = 0;
    function build() {
      var length = pathEl.getTotalLength();
      try { unitW = measure.getComputedTextLength(); } catch (e) { unitW = 0; }
      if (!unitW) return;
      head.textContent = unit.repeat(Math.ceil(length / unitW) + 2);
      head.removeAttribute('textLength');
    }
    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build).catch(function () {});
    var SPEED = 115;
    var t = 0;
    var last = performance.now();
    function frame(now) {
      if (!root.isConnected) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (unitW && !document.hidden) {
        t = (t + SPEED * dt) % unitW;
        head.setAttribute('startOffset', (-t).toFixed(2));
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ---- counter + curtain ---- */
  var countEl = document.getElementById('loaderCount');
  var finished = false;
  function done() {
    if (finished) return;
    finished = true;
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    loader.classList.add('is-done');
    ready(2600);
    setTimeout(function () { loader.remove(); }, 1100);
  }
  var MIN = 2300;
  var start = performance.now();
  var loaded = document.readyState === 'complete';
  if (!loaded) window.addEventListener('load', function () { loaded = true; }, { once: true });
  setTimeout(function () { loaded = true; }, 5000); // never trap the visitor behind a slow asset
  var shown = 0;
  function step(now) {
    var elapsed = now - start;
    var target = loaded && elapsed >= MIN ? 100 : Math.min(93, (elapsed / MIN) * 93);
    shown += (target - shown) * 0.09;
    if (countEl) countEl.textContent = String(Math.round(shown));
    if (shown >= 99.4) {
      if (countEl) countEl.textContent = '100';
      done();
      return;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();
