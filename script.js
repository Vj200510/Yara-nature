// ═══════════════════════════════════════════════════════
//  YARA NATURE — Inner Pages Script
// ═══════════════════════════════════════════════════════

// ── Navbar Toggle ──
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar')) navLinks.classList.remove('open');
  });
}

// ── Review Carousel ──
let currentReview = 0;
const slides = document.querySelectorAll('.review-slide');
const dots   = document.querySelectorAll('.dot');

function showReview(index) {
  if (!slides.length) return;
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  slides[index].classList.add('active');
  if (dots[index]) dots[index].classList.add('active');
  currentReview = index;
}

function nextReview() {
  if (!slides.length) return;
  showReview((currentReview + 1) % slides.length);
}

function prevReview() {
  if (!slides.length) return;
  showReview((currentReview - 1 + slides.length) % slides.length);
}

function goToReview(index) { showReview(index); }

if (slides.length > 1) setInterval(nextReview, 4000);

// ── Smooth Scroll ──
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      if (navLinks) navLinks.classList.remove('open');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
