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
