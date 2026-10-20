(function () {
  const list = document.getElementById('thinking-list');
  if (!list) return;

  // Newest three real posts; any gaps are filled with placeholders.
  const cards = THINKING_POSTS.slice(0, 3).concat(THINKING_PLACEHOLDERS.slice(THINKING_POSTS.length));
  list.innerHTML = cards.map((p) => thinkingCardHTML(p, '')).join('');

  // Scroll-driven cover: BHAVYA shows first, "Beyond" is written in as you scroll, then the pieces rise in.
  const section = document.getElementById('thinking');
  const title = section && section.querySelector('.thinking-title');
  if (!title || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  section.classList.add('is-anim');
  const items = [...list.children];
  const stage = section.firstElementChild;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  let shift = 0, ticking = false;

  const measure = () => { shift = (list.offsetHeight + parseFloat(getComputedStyle(stage).gap || 0)) / 2; };
  const update = () => {
    ticking = false;
    const r = section.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - window.innerHeight));
    title.style.setProperty('--in', clamp((window.innerHeight - r.top) / (window.innerHeight * 0.6)).toFixed(3));
    title.style.setProperty('--draw', seg(p, 0.05, 0.55).toFixed(4));
    title.style.transform = `translateY(${(shift * (1 - ease(seg(p, 0.55, 0.72)))).toFixed(1)}px)`;
    items.forEach((c, i) => c.style.setProperty('--show', ease(seg(p, 0.68 + i * 0.08, 0.82 + i * 0.08)).toFixed(3)));
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  measure(); update();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => { measure(); request(); });
  window.addEventListener('load', () => { measure(); request(); });
})();
