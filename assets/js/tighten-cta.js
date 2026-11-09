/* Pulls the "See all books" / "Read all posts" buttons up into the unused space at the
   bottom of the pinned scroll scenes, measured so they never overlap the content above. */
(function () {
  var MIN_GAP = 56; // px kept clear between the content and the button
  var pairs = [
    { track: '.story-track', stage: '.story-stage', cta: '.story-cta', content: '.book3d, .st-buy' },
    { track: '.thinking-scroll', stage: '.thinking-stage', cta: '.thinking-section-cta', content: '.thinking-card, .thinking-title' }
  ];
  var queued = false;

  function fit() {
    queued = false;
    pairs.forEach(function (p) {
      var track = document.querySelector(p.track), stage = document.querySelector(p.stage), cta = document.querySelector(p.cta);
      if (!track || !stage || !cta) return;
      if (window.innerWidth <= 860) { cta.style.marginTop = ''; return; }
      var s = stage.getBoundingClientRect();
      if (track.getBoundingClientRect().bottom > s.bottom + 1) return; // scene not finished pinning
      var bottom = 0;
      document.querySelectorAll(p.content).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.height > 0 && r.top < s.bottom) bottom = Math.max(bottom, r.bottom);
      });
      if (!bottom) return;
      var pull = Math.max(0, Math.floor(s.bottom - bottom - MIN_GAP));
      cta.style.position = 'relative';
      cta.style.zIndex = '3';
      cta.style.marginTop = (-pull) + 'px';
    });
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(fit); } }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('load', queue);
})();
