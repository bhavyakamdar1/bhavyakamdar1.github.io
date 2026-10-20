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

// Newsletter forms: placeholder handling until a real email service is wired up
document.querySelectorAll('.newsletter-form').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    if (input) {
      alert('Thanks for subscribing! (Connect a real email service to make this live.)');
      input.value = '';
    }
  });
});

// Scroll story: the book opens (preface + Buy now), then the preface page turns to the game's opening page
(() => {
  const story = document.querySelector('.story');
  const track = story && story.querySelector('.story-track');
  if (!track) return;
  story.classList.add('is-live');
  const book = story.querySelector('.book3d');
  const frame = story.querySelector('.st-game-frame');
  const GAME = frame ? frame.dataset.src : '';
  let gameOn = false;   // the embedded game keeps animating even off-screen, so it is only loaded while the book is being read
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
    const wantGame = !!frame && p > 0.15 && rect.bottom > 0;
    if (wantGame !== gameOn) { gameOn = wantGame; frame.src = wantGame ? GAME : 'about:blank'; }
    const buy = seg(p, 0.28, 0.4);
    const s = story.style;
    s.setProperty('--open-live', ease(seg(p, 0.06, 0.3)).toFixed(3));
    const flip = ease(seg(p, 0.45, 0.7));
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
