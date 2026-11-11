// Sticky nav background on scroll
const header = document.querySelector('.site-header');
const toggleSolid = () => {
  if (window.scrollY > 60) header.classList.add('solid');
  else header.classList.remove('solid');
};
toggleSolid();
window.addEventListener('scroll', toggleSolid);

// Mobile nav toggle (button turns into a close icon while the menu is open)
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle && navLinks) {
  const setMenu = (open) => {
    navLinks.classList.toggle('open', open);
    navToggle.classList.toggle('open', open);
    navToggle.innerHTML = open ? '&#10005;' : '&#9776;';
    navToggle.setAttribute('aria-expanded', open);
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  navToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) setMenu(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
}

// Scroll story: the book opens (preface + Buy now), then the preface page turns to the game's opening page
(() => {
  const story = document.querySelector('.story');
  const track = story && story.querySelector('.story-track');
  if (!track) return;
  story.classList.add('is-live');
  const book = story.querySelector('.book3d');
  const frame = story.querySelector('.st-game-frame');
  const GAME = frame ? frame.dataset.src : '';
  // The embedded game is loaded once, as soon as the page has finished loading (after the hero is up), so it is
  // already running by the time a visitor scrolls to the book instead of starting to load when they arrive.
  const loadGame = () => { if (frame && !frame.getAttribute('src')) frame.src = GAME; };
  if (document.readyState === 'complete') setTimeout(loadGame, 300);
  else window.addEventListener('load', () => setTimeout(loadGame, 300), { once: true });
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  let ticking = false;
  const fit = () => {   // scale the 360px-wide game page down to the size of a book page
    if (book && frame) frame.style.setProperty('--fscale', (book.offsetWidth / frame.offsetWidth).toFixed(4));
  };
  const update = () => {
    ticking = false;
    const range = track.offsetHeight - window.innerHeight;
    const rect = track.getBoundingClientRect();
    const p = range > 0 ? clamp(-rect.top / range) : 0;
    const buy = seg(p, 0.2, 0.3);
    const s = story.style;
    s.setProperty('--open-live', ease(seg(p, 0.03, 0.22)).toFixed(3));
    const flip = ease(seg(p, 0.42, 0.8));
    s.setProperty('--flip-live', flip.toFixed(3));
    s.setProperty('--buy', buy.toFixed(3));
    story.classList.toggle('buy-on', buy > 0.5);
    story.classList.toggle('on-game', flip > 0.5);
    story.querySelectorAll('.swap-play').forEach((el) => {
      el.setAttribute('aria-hidden', flip > 0.5 ? 'false' : 'true');
      if (el.tagName === 'A') el.tabIndex = flip > 0.5 ? 0 : -1;
    });
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => { fit(); request(); });
  fit(); update();

  // Play on the embedded game page opens the real game at its opening page
  const wire = () => {
    try {
      const doc = frame.contentDocument;
      if (!doc.getElementById('st-embed-style')) {   // the "Click to play" hint collides with the title plate at page size
        const st = doc.createElement('style');
        st.id = 'st-embed-style';
        st.textContent = '.ld-hint{display:none !important}';
        doc.head.appendChild(st);
      }
      const btn = doc.querySelector('.ld-play');
      if (!btn || btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();
        window.location.href = GAME;
      }, true);
    } catch (err) { /* cross-origin: the game's own Play still works inside the page */ }
  };
  if (frame) { frame.addEventListener('load', wire); wire(); }
})();

// About: the portrait rises in as the section scrolls into view; the copy fades up in turn
(() => {
  const fig = document.querySelector('.about-figure');
  if (!fig) return;
  const lines = document.querySelectorAll('.about-line');
  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still) return;
  lines.forEach((el) => el.classList.add('is-pending'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      lines.forEach((el, i) => setTimeout(() => el.classList.add('is-in'), 150 + i * 160));
      io.disconnect();
    });
  }, { threshold: 0.25 });
  io.observe(fig);
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = fig.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (r.height * 0.9 + window.innerHeight * 0.2)));
    fig.style.setProperty('--rise', (p * p * (3 - 2 * p)).toFixed(3));
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// In-page nav links: scroll smoothly, then re-check the position once the page above has settled
// (pinned scroll scenes and lazy images change the page height while a long scroll is under way), so the section lands exactly at the top.
(() => {
  const settle = (target) => {
    let tries = 0;
    const check = () => {
      const off = target.getBoundingClientRect().top;
      if (Math.abs(off) > 2 && tries++ < 4) {
        window.scrollTo({ top: window.scrollY + off, behavior: 'instant' });
        setTimeout(check, 150);
      }
    };
    return check;
  };
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      history.pushState(null, '', '#' + id);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      let timer;
      const done = () => { clearTimeout(timer); window.removeEventListener('scroll', onScroll); settle(target)(); };
      const onScroll = () => { clearTimeout(timer); timer = setTimeout(done, 180); };
      window.addEventListener('scroll', onScroll, { passive: true });
      timer = setTimeout(done, 400);
    });
  });
})();

// Arriving from another page with a #section link (e.g. Speaking -> About): the pinned scroll scenes and lazy images
// change the page height after the browser has already jumped, so the section ends up off-position.
// Keep re-aligning it for the first moments after load, unless the visitor starts scrolling themselves.
(() => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  let touched = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => window.addEventListener(ev, () => { touched = true; }, { passive: true, once: true }));
  const align = () => {
    const target = document.getElementById(id);
    if (!target || touched) return;
    const off = target.getBoundingClientRect().top;
    if (Math.abs(off) > 2) window.scrollTo({ top: window.scrollY + off, behavior: 'instant' });
  };
  [0, 150, 400, 800, 1400, 2200].forEach((t) => setTimeout(align, t));
  window.addEventListener('load', () => { align(); setTimeout(align, 200); });
})();
