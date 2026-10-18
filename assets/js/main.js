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

// Scroll story: the book opens (preface + Buy now), then the storm scene (Play the game)
(() => {
  const story = document.querySelector('.story');
  const track = story && story.querySelector('.story-track');
  if (!track) return;
  story.classList.add('is-live');
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  let ticking = false;
  const update = () => {
    ticking = false;
    const range = track.offsetHeight - window.innerHeight;
    const p = range > 0 ? clamp(-track.getBoundingClientRect().top / range) : 0;
    const open = ease(seg(p, 0.06, 0.3));
    const buy = seg(p, 0.28, 0.4);
    const game = ease(seg(p, 0.52, 0.68));
    const s = story.style;
    s.setProperty('--open-live', open.toFixed(3));
    s.setProperty('--buy', buy.toFixed(3));
    s.setProperty('--game', game.toFixed(3));
    story.classList.toggle('buy-on', buy > 0.5 && game < 0.5);
    story.classList.toggle('book-off', game >= 0.99);
    story.classList.toggle('game-off', game <= 0.01);
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();

  // Play inside the embedded game opens the real game page straight at the name-entry screen
  const frame = story.querySelector('.st-game-frame');
  const wire = () => {
    try {
      const btn = frame.contentDocument.querySelector('.ld-play');
      if (!btn || btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        e.preventDefault();
        window.location.href = frame.getAttribute('src') + '#name';
      }, true);
    } catch (err) { /* cross-origin: the game's own Play still works inside the frame */ }
  };
  if (frame) { frame.addEventListener('load', wire); wire(); }
})();
