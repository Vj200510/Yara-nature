// ═══════════════════════════════════════════════════════
//  YARA NATURE — Shared Components
//  Injects premium footer into all inner pages
// ═══════════════════════════════════════════════════════

(function injectSharedComponents() {

  // ── Fix all broken footer customer-support links ──────
  function fixFooterLinks() {
    document.querySelectorAll('.footer-links a').forEach(link => {
      const text = link.textContent.trim();
      if (link.getAttribute('href') === '#' || !link.getAttribute('href')) {
        if (text.includes('Track')) link.href = 'track-order.html';
        else if (text.includes('Return') || text.includes('Refund')) link.href = 'refund-policy.html';
        else if (text.includes('Shipping')) link.href = 'shipping-policy.html';
        else if (text.includes('Privacy')) link.href = 'privacy-policy.html';
        else if (text.includes('Terms')) link.href = 'terms.html';
        else if (text.includes('Payment')) link.href = 'checkout.html';
        else if (text.includes('Account') || text.includes('Dashboard')) link.href = 'dashboard.html';
      }
    });
  }

  // ── Fix nav toggle for inner pages (old .nav-toggle pattern) ──
  function fixNavToggle() {
    const toggle = document.getElementById('navToggle');
    const links  = document.getElementById('navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        links.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) links.classList.remove('open');
      });
    }
    // Also handle new hamburger pattern
    const hamburger = document.getElementById('hamburger');
    const navMenu   = document.getElementById('navMenu');
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', function() {
        const isOpen = navMenu.classList.toggle('open');
        this.setAttribute('aria-expanded', isOpen);
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) navMenu.classList.remove('open');
      });
    }
  }

  // ── Fix sticky bar ORDER NOW on inner pages ────────────
  function fixStickyBar() {
    document.querySelectorAll('.sticky-btns .btn-primary, .sticky-btns .btn-outline').forEach(btn => {
      const href = btn.getAttribute('href') || '';
      if (href.includes('#order') || href.includes('index.html#') || href === '#') {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
            if (window.YaraNature?.handleOrderNow) window.YaraNature.handleOrderNow(e);
          } else {
            window.location.href = 'index.html#product';
          }
        });
      }
    });
    // Also wire footer ORDER NOW buttons on inner pages
    document.querySelectorAll('.footer-order-btn').forEach(btn => {
      if (btn.tagName === 'A' && (btn.href.includes('index.html') || btn.getAttribute('href') === '#')) {
        btn.addEventListener('click', (e) => {
          // Let it navigate to index.html — that's correct for inner pages
        });
      }
    });
  }

  // ── Wire search and cart icons (emoji buttons in inner pages) ──
  function wireNavIcons() {
    document.querySelectorAll('.nav-icons button[aria-label="Search"], button[aria-label="Search"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.YaraNature?.openSearch) window.YaraNature.openSearch();
      });
    });
    document.querySelectorAll('.nav-icons button[aria-label="Cart"], .cart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.YaraNature?.openCart) window.YaraNature.openCart();
      });
    });
  }

  // ── Scroll to top button ───────────────────────────────
  function initScrollTop() {
    if (document.getElementById('scrollTop')) return; // already exists
    const btn = document.createElement('button');
    btn.id = 'scrollTop';
    btn.className = 'scroll-top';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.innerHTML = '<svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>';
    btn.style.cssText = 'position:fixed;bottom:170px;right:20px;z-index:490;width:44px;height:44px;border-radius:50%;background:#2d4a2b;color:#fff;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.15);transition:transform .25s ease';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
    });
  }

  // ── Floating WhatsApp button ───────────────────────────
  function initFloatingWa() {
    if (document.getElementById('floatingWa')) return;
    const wa = document.createElement('button');
    wa.id = 'floatingWa';
    wa.className = 'floating-wa';
    wa.setAttribute('aria-label', 'Chat on WhatsApp');
    wa.innerHTML = '<svg width="26" height="26" fill="#fff" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>';
    wa.style.cssText = 'position:fixed;bottom:110px;right:20px;z-index:490;width:54px;height:54px;border-radius:50%;background:#25D366;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(37,211,102,.45);transition:transform .25s;animation:waWiggle 3s ease-in-out infinite';
    wa.addEventListener('click', () => {
      window.open('https://wa.me/919999999999?text=' + encodeURIComponent('Hi! I am interested in Yara Nature Herbal Hair Oil. Can you help me?'), '_blank');
    });
    document.body.appendChild(wa);
  }

  document.addEventListener('DOMContentLoaded', () => {
    fixFooterLinks();
    fixNavToggle();
    fixStickyBar();
    wireNavIcons();
    initScrollTop();
    initFloatingWa();
  });

})();
