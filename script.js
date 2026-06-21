// ═══════ NAVBAR TOGGLE ═══════
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// ═══════ REVIEW CAROUSEL ═══════
let currentReview = 0;
const slides = document.querySelectorAll('.review-slide');
const dots = document.querySelectorAll('.dot');

function showReview(index) {
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  slides[index].classList.add('active');
  dots[index].classList.add('active');
  currentReview = index;
}

function nextReview() {
  showReview((currentReview + 1) % slides.length);
}

function prevReview() {
  showReview((currentReview - 1 + slides.length) % slides.length);
}

function goToReview(index) {
  showReview(index);
}

// Auto-rotate carousel every 4 seconds
setInterval(nextReview, 4000);

// ═══════ STICKY BAR VISIBILITY ═══════
const stickyBar = document.getElementById('order');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    stickyBar.style.opacity = '1';
    stickyBar.style.transform = 'translateY(0)';
  }
});

// ═══════ SMOOTH SCROLL FOR NAV LINKS ═══════
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      navLinks.classList.remove('open');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
