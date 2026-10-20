(function () {
  const section = document.getElementById('thinking');
  const list = document.getElementById('thinking-list');
  if (!section || !list) return;

  // The posts featured on the home page (home: true in thinking-posts.js), in list order.
  list.innerHTML = THINKING_POSTS.filter((p) => p.home).slice(0, 3).map((p) => thinkingCardHTML(p, '')).join('');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const track = section.querySelector('.thinking-scroll');
  const title = section.querySelector('.thinking-title');
  track.classList.add('is-anim');
  section.classList.add('is-anim');

  // Posts fade up as they scroll into view.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    [...list.children].forEach((c) => io.observe(c));
  } else {
    [...list.children].forEach((c) => c.classList.add('in-view'));
  }

  // BHAVYA shows first, then "Beyond" is written in as the section scrolls.
  const clamp = (v) => Math.min(1, Math.max(0, v));
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = track.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - window.innerHeight));
    title.style.setProperty('--in', clamp((window.innerHeight - r.top) / (window.innerHeight * 0.6)).toFixed(3));
    title.style.setProperty('--draw', clamp((p - 0.05) / 0.7).toFixed(4));
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  update();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  window.addEventListener('load', request);
})();
