(function () {
  const section = document.getElementById('thinking');
  const list = document.getElementById('thinking-list');
  if (!section || !list) return;

  // The posts featured on the home page (home: true in thinking-posts.js), in list order.
  list.innerHTML = THINKING_POSTS.filter((p) => p.home).slice(0, 3).map((p) => thinkingCardHTML(p, '')).join('');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const track = section.querySelector('.thinking-scroll');
  const stage = section.querySelector('.thinking-stage');
  const title = section.querySelector('.thinking-title');
  const items = [...list.children];
  track.classList.add('is-anim');
  section.classList.add('is-anim');

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const seg = (s, a, b) => clamp((s - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  let V, W, narrow, extra, ts, tx, cl, ticking = false;

  // BHAVYA shows first; "Beyond" is written in; the title slides left; the posts appear on the right
  // (on narrow screens the post column then scrolls on while the title stays pinned).
  const measure = () => {
    V = window.innerHeight; W = stage.clientWidth; narrow = W <= 640;
    const tw = title.offsetWidth;
    const zoneW = (narrow ? 0.36 : 0.38) * W - (narrow ? 12 : 24);
    ts = Math.min(1, zoneW / tw);
    tx = (narrow ? 12 : 24) + zoneW / 2 - W / 2;
    cl = (narrow ? 0.4 : 0.42) * W;
    stage.style.setProperty('--cl', cl + 'px');
    extra = narrow ? Math.max(0, list.offsetHeight - (V - 92 - 24)) : 0;
    track.style.height = (V * 2.7 + extra) + 'px';
  };

  const update = () => {
    ticking = false;
    const r = track.getBoundingClientRect();
    const s = Math.max(0, -r.top);
    title.style.setProperty('--in', clamp((V - r.top) / (V * 0.6)).toFixed(3));
    title.style.setProperty('--draw', seg(s, 0.1 * V, 1.0 * V).toFixed(4));
    const mv = ease(seg(s, 1.0 * V, 1.4 * V));
    title.style.setProperty('--ts', (1 + (ts - 1) * mv).toFixed(4));
    title.style.setProperty('--tx', (tx * mv).toFixed(1) + 'px');
    items.forEach((c, i) => c.style.setProperty('--show', ease(seg(s, 1.15 * V + i * 0.12 * V, 1.45 * V + i * 0.12 * V)).toFixed(3)));
    if (narrow) list.style.setProperty('--cy', (-extra * seg(s, 1.7 * V, 1.7 * V + extra)).toFixed(1) + 'px');
    else list.style.removeProperty('--cy');
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  const remeasure = () => { measure(); request(); };

  measure(); update();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  list.querySelectorAll('img').forEach((im) => im.addEventListener('load', remeasure));
})();
