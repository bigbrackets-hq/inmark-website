/* Page transitions: curtain wipe on internal navigation, fade-in on arrival */
(function () {
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // curtain element (ink panel that rises from the bottom)
  var curtain = document.createElement('div');
  curtain.className = 'pt-curtain';
  curtain.setAttribute('aria-hidden', 'true');
  document.body.appendChild(curtain);

  // arrival: release the enter state (the preloader owns the entrance when it runs)
  function release() { document.documentElement.classList.remove('pt-enter'); }
  if (document.body.classList.contains('is-loading')) release();
  else requestAnimationFrame(function () { requestAnimationFrame(release); });
  setTimeout(release, 1200); // never leave a page veiled

  // bfcache restore: never come back covered
  addEventListener('pageshow', function (e) {
    if (e.persisted) {
      curtain.classList.remove('is-on');
      document.documentElement.classList.remove('pt-enter');
    }
  });

  if (REDUCED) return;

  addEventListener('click', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) {
      // same-page links scroll normally; a bare "#" (logo) always returns to the top
      if (!url.hash) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      return;
    }
    e.preventDefault();
    curtain.classList.add('is-on');
    setTimeout(function () { location.href = a.href; }, 460);
  });
})();
