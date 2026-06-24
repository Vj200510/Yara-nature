// ═══════════════════════════════════════════════════════
//  YARA NATURE — Complete Frontend API & Button Wiring
// ═══════════════════════════════════════════════════════
// ── Auto-detect local vs production ──────────────────
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5001/api'
  : 'https://yara-nature.onrender.com/api';

// ── Core fetch ────────────────────────────────────────
async function api(path, method = 'GET', body = null) {
  const token = localStorage.getItem('yn_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method, headers, credentials: 'include',
      body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  } catch (e) {
    throw new Error(e.message || 'Network error');
  }
}

// ── Auth helpers ──────────────────────────────────────
const Auth = {
  isLoggedIn: () => !!localStorage.getItem('yn_token'),
  getUser:    () => { try { return JSON.parse(localStorage.getItem('yn_user')||'null'); } catch { return null; }},
  setSession: (data) => {
    localStorage.setItem('yn_token', data.token);
    localStorage.setItem('yn_user', JSON.stringify(data.user));
  },
  clearSession: () => {
    localStorage.removeItem('yn_token');
    localStorage.removeItem('yn_user');
  }
};

// ── Toast notification ────────────────────────────────
function showToast(msg, type = 'success') {
  let t = document.getElementById('yn-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'yn-toast';
    t.style.cssText = `
      position:fixed; bottom:110px; left:50%; transform:translateX(-50%);
      padding:12px 24px; border-radius:8px; font-family:Inter,sans-serif;
      font-size:14px; font-weight:600; z-index:99999; pointer-events:none;
      box-shadow:0 4px 20px rgba(0,0,0,0.2); transition:opacity .3s;
      max-width:90vw; text-align:center; opacity:0;`;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type === 'success' ? '#2d4a2b' : type === 'error' ? '#e63f2e' : '#c9a227';
  t.style.color = '#fff';
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}

// ── Search Modal ──────────────────────────────────────
function createSearchModal() {
  if (document.getElementById('search-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'search-modal';
  modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9998;
    display:none; align-items:flex-start; justify-content:center; padding-top:80px;`;
  modal.innerHTML = `
    <div style="background:#fff; border-radius:14px; padding:24px; width:90%; max-width:520px; position:relative;">
      <button onclick="closeSearch()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.4rem;cursor:pointer;color:#999">✕</button>
      <h3 style="font-family:'Playfair Display',serif;color:#2d4a2b;margin-bottom:14px">Search Products</h3>
      <input id="search-input" type="text" placeholder="Search for hair oil, ingredients..."
        style="width:100%;padding:12px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:0.9rem;outline:none;font-family:Inter,sans-serif"
        oninput="handleSearch(this.value)" />
      <div id="search-results" style="margin-top:12px;max-height:260px;overflow-y:auto"></div>
    </div>`;
  modal.addEventListener('click', (e) => { if (e.target === modal) closeSearch(); });
  document.body.appendChild(modal);
}

function openSearch() {
  createSearchModal();
  const modal = document.getElementById('search-modal');
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('search-input')?.focus(), 100);
}

function closeSearch() {
  const modal = document.getElementById('search-modal');
  if (modal) modal.style.display = 'none';
}

let searchTimer;
async function handleSearch(q) {
  clearTimeout(searchTimer);
  const results = document.getElementById('search-results');
  if (!q || q.length < 2) { results.innerHTML = ''; return; }
  results.innerHTML = '<div style="color:#aaa;padding:10px;font-size:0.85rem">Searching...</div>';
  searchTimer = setTimeout(async () => {
    try {
      const { suggestions } = await api(`/products/search?q=${encodeURIComponent(q)}`);
      if (!suggestions?.length) {
        results.innerHTML = '<div style="color:#aaa;padding:10px;font-size:0.85rem">No products found</div>';
        return;
      }
      results.innerHTML = suggestions.map(p => `
        <div style="display:flex;justify-content:space-between;align-items:center;
          padding:10px 12px;border-bottom:1px solid #f0f0f0;cursor:pointer;border-radius:6px"
          onmouseover="this.style.background='#f5f0e6'" onmouseout="this.style.background=''"
          onclick="closeSearch();showToast('${p.name} added to cart ✅');addToCart('${p.id}')">
          <div>
            <div style="font-weight:600;font-size:0.88rem;color:#1c1c1c">${p.name}</div>
            <div style="font-size:0.75rem;color:#888">100ml | Hair Oil</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:800;color:#2d4a2b">₹${p.price}</div>
            <div style="font-size:0.72rem;color:#aaa;text-decoration:line-through">₹${p.mrp}</div>
          </div>
        </div>`).join('');
    } catch (e) {
      results.innerHTML = '<div style="color:#aaa;padding:10px;font-size:0.85rem">Search unavailable</div>';
    }
  }, 350);
}

// ── Cart ──────────────────────────────────────────────
async function addToCart(productId) {
  if (!Auth.isLoggedIn()) {
    showToast('Please login to add to cart', 'error');
    setTimeout(() => showLoginModal(), 1200);
    return;
  }
  try {
    await api('/cart', 'POST', { productId, quantity: 1 });
    updateCartBadge(1);
    showToast('✅ Added to cart!');
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

function updateCartBadge(add = 0) {
  document.querySelectorAll('.cart-badge, .cart-count').forEach(b => {
    const n = parseInt(b.textContent) || 0;
    b.textContent = Math.max(0, n + add);
  });
}

async function loadCartCount() {
  if (!Auth.isLoggedIn()) return;
  try {
    const { cart } = await api('/cart');
    const count = cart?.items?.length || 0;
    document.querySelectorAll('.cart-badge, .cart-count').forEach(b => b.textContent = count);
  } catch (e) {}
}

// ── Cart Drawer ───────────────────────────────────────
function createCartDrawer() {
  if (document.getElementById('cart-drawer')) return;
  const drawer = document.createElement('div');
  drawer.id = 'cart-drawer';
  drawer.style.cssText = `
    position:fixed; top:0; right:-400px; width:380px; max-width:95vw;
    height:100vh; background:#fff; z-index:9998; box-shadow:-4px 0 24px rgba(0,0,0,0.15);
    display:flex; flex-direction:column; transition:right .3s ease; font-family:Inter,sans-serif;`;
  drawer.innerHTML = `
    <div style="padding:20px 20px 16px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center">
      <h3 style="font-family:'Playfair Display',serif;color:#2d4a2b;font-size:1.1rem">🛒 Your Cart</h3>
      <button onclick="closeCart()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#999">✕</button>
    </div>
    <div id="cart-items" style="flex:1;overflow-y:auto;padding:16px 20px">
      <div style="text-align:center;color:#aaa;padding:40px 0">Loading cart...</div>
    </div>
    <div id="cart-footer" style="padding:16px 20px;border-top:1px solid #f0f0f0"></div>`;

  const overlay = document.createElement('div');
  overlay.id = 'cart-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9997;display:none';
  overlay.onclick = closeCart;
  document.body.append(overlay, drawer);
}

async function openCart() {
  createCartDrawer();
  document.getElementById('cart-drawer').style.right = '0';
  document.getElementById('cart-overlay').style.display = 'block';
  document.body.style.overflow = 'hidden';

  if (!Auth.isLoggedIn()) {
    document.getElementById('cart-items').innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:2rem;margin-bottom:12px">🛒</div>
        <p style="color:#555;margin-bottom:16px">Login to see your cart</p>
        <button onclick="closeCart();showLoginModal()" 
          style="background:#2d4a2b;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:700">
          Login / Register
        </button>
      </div>`;
    document.getElementById('cart-footer').innerHTML = '';
    return;
  }

  try {
    const { cart } = await api('/cart');
    const items = cart?.items || [];
    if (!items.length) {
      document.getElementById('cart-items').innerHTML = `
        <div style="text-align:center;padding:40px 20px">
          <div style="font-size:3rem;margin-bottom:12px">🛒</div>
          <p style="color:#555;margin-bottom:16px">Your cart is empty</p>
          <button onclick="closeCart()" 
            style="background:#2d4a2b;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:700">
            Continue Shopping
          </button>
        </div>`;
      document.getElementById('cart-footer').innerHTML = '';
      return;
    }

    document.getElementById('cart-items').innerHTML = items.map(item => `
      <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f5f0e6" id="cart-item-${item.id}">
        <img src="${item.product?.product_images?.[0]?.url || 'images/product-bottle.jpeg'}"
          style="width:60px;height:72px;object-fit:contain;border-radius:8px;flex-shrink:0;background:#f9f6f0;padding:3px"/>
        <div style="flex:1">
          <div style="font-weight:600;font-size:0.85rem;color:#1c1c1c;margin-bottom:4px">${item.product?.name || 'Yara Nature Oil'}</div>
          <div style="font-size:0.8rem;color:#888;margin-bottom:8px">₹${item.product?.price} × ${item.quantity}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <button onclick="updateCartQty('${item.id}',${item.quantity - 1})"
              style="width:26px;height:26px;border:1.5px solid #ddd;border-radius:50%;background:#fff;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center">−</button>
            <span style="font-weight:700;min-width:20px;text-align:center">${item.quantity}</span>
            <button onclick="updateCartQty('${item.id}',${item.quantity + 1})"
              style="width:26px;height:26px;border:1.5px solid #ddd;border-radius:50%;background:#fff;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center">+</button>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800;color:#2d4a2b">₹${(item.product?.price * item.quantity).toFixed(0)}</div>
          <button onclick="removeCartItem('${item.id}')" 
            style="background:none;border:none;color:#e63f2e;cursor:pointer;font-size:0.75rem;margin-top:8px">Remove</button>
        </div>
      </div>`).join('');

    document.getElementById('cart-footer').innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:#888;font-size:0.85rem">Subtotal</span>
        <span style="font-weight:600">₹${cart.itemsPrice?.toFixed(0)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:#888;font-size:0.85rem">Shipping</span>
        <span style="font-weight:600;color:${cart.shippingPrice===0?'#2d4a2b':'#333'}">${cart.shippingPrice===0?'FREE':'₹'+cart.shippingPrice}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;padding-top:10px;border-top:1px solid #f0f0f0">
        <span style="font-weight:700">Total</span>
        <span style="font-weight:800;font-size:1.1rem;color:#2d4a2b">₹${cart.totalPrice?.toFixed(0)}</span>
      </div>
      <button onclick="closeCart();window.location.href='checkout.html'"
        style="width:100%;background:#2d4a2b;color:#fff;border:none;padding:13px;border-radius:6px;font-weight:700;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;gap:8px">
        🛒 Proceed to Checkout
      </button>
      <a href="https://wa.me/919999999999?text=${encodeURIComponent('Hi! I want to order Yara Nature Hair Oil (₹349). Please help me!')}"
        target="_blank"
        style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;padding:11px;border:2px solid #2d4a2b;border-radius:6px;color:#2d4a2b;font-weight:700;text-decoration:none;font-size:0.88rem">
        💬 Order via WhatsApp
      </a>`;
  } catch (e) {
    document.getElementById('cart-items').innerHTML = `<div style="text-align:center;color:#e63f2e;padding:20px">${e.message}</div>`;
  }
}

function closeCart() {
  const d = document.getElementById('cart-drawer');
  const o = document.getElementById('cart-overlay');
  if (d) d.style.right = '-400px';
  if (o) o.style.display = 'none';
  document.body.style.overflow = '';
}

async function updateCartQty(itemId, qty) {
  try {
    await api(`/cart/${itemId}`, 'PUT', { quantity: qty });
    openCart(); // refresh
  } catch (e) { showToast(e.message, 'error'); }
}

async function removeCartItem(itemId) {
  try {
    await api(`/cart/${itemId}`, 'DELETE');
    showToast('Item removed');
    updateCartBadge(-1);
    openCart(); // refresh
  } catch (e) { showToast(e.message, 'error'); }
}

// ── Login / Register Modal ────────────────────────────
function showLoginModal(mode = 'login') {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;
      display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,sans-serif`;
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:36px 32px;width:100%;max-width:400px;position:relative">
        <button onclick="closeAuthModal()" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:#999">✕</button>
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:800;color:#2d4a2b">YARA NATURE</div>
          <div style="font-size:0.72rem;color:#c9a227;font-style:italic">Pure Wellness from Nature</div>
        </div>
        <div style="display:flex;border:1.5px solid #e0ddd4;border-radius:8px;overflow:hidden;margin-bottom:20px">
          <button id="tab-login" onclick="switchTab('login')"
            style="flex:1;padding:10px;border:none;font-weight:700;font-size:0.85rem;cursor:pointer;background:#2d4a2b;color:#fff">Login</button>
          <button id="tab-register" onclick="switchTab('register')"
            style="flex:1;padding:10px;border:none;font-weight:700;font-size:0.85rem;cursor:pointer;background:#fff;color:#555">Register</button>
        </div>
        <!-- Login -->
        <div id="auth-login">
          <div style="margin-bottom:14px">
            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:5px">Email</label>
            <input id="login-email" type="email" placeholder="your@email.com"
              style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:0.88rem;outline:none"/>
          </div>
          <div style="margin-bottom:18px">
            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:5px">Password</label>
            <input id="login-password" type="password" placeholder="••••••••"
              style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:0.88rem;outline:none"/>
          </div>
          <button onclick="handleLogin()"
            style="width:100%;padding:12px;background:#2d4a2b;color:#fff;border:none;border-radius:7px;font-weight:700;cursor:pointer;font-size:0.9rem">
            Login →
          </button>
        </div>
        <!-- Register -->
        <div id="auth-register" style="display:none">
          <div style="margin-bottom:12px">
            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:5px">Full Name</label>
            <input id="reg-name" type="text" placeholder="Your name"
              style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:0.88rem;outline:none"/>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:5px">Email</label>
            <input id="reg-email" type="email" placeholder="your@email.com"
              style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:0.88rem;outline:none"/>
          </div>
          <div style="margin-bottom:12px">
            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:5px">Phone</label>
            <input id="reg-phone" type="tel" placeholder="9999999999"
              style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:0.88rem;outline:none"/>
          </div>
          <div style="margin-bottom:18px">
            <label style="font-size:0.8rem;font-weight:600;display:block;margin-bottom:5px">Password</label>
            <input id="reg-password" type="password" placeholder="Min 6 characters"
              style="width:100%;padding:10px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:0.88rem;outline:none"/>
          </div>
          <button onclick="handleRegister()"
            style="width:100%;padding:12px;background:#2d4a2b;color:#fff;border:none;border-radius:7px;font-weight:700;cursor:pointer;font-size:0.9rem">
            Create Account →
          </button>
        </div>
        <div id="auth-error" style="color:#e63f2e;font-size:0.8rem;margin-top:12px;text-align:center"></div>
      </div>`;
    modal.addEventListener('click', e => { if(e.target===modal) closeAuthModal(); });
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  switchTab(mode);
}

function switchTab(mode) {
  document.getElementById('auth-login').style.display    = mode==='login'    ? 'block' : 'none';
  document.getElementById('auth-register').style.display = mode==='register' ? 'block' : 'none';
  document.getElementById('tab-login').style.background    = mode==='login'    ? '#2d4a2b' : '#fff';
  document.getElementById('tab-login').style.color         = mode==='login'    ? '#fff' : '#555';
  document.getElementById('tab-register').style.background = mode==='register' ? '#2d4a2b' : '#fff';
  document.getElementById('tab-register').style.color      = mode==='register' ? '#fff' : '#555';
  document.getElementById('auth-error').textContent = '';
}

function closeAuthModal() {
  const m = document.getElementById('auth-modal');
  if (m) m.style.display = 'none';
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('auth-error');
  if (!email || !password) { errEl.textContent = 'Please fill in all fields'; return; }
  try {
    errEl.textContent = 'Logging in...';
    const data = await api('/auth/login', 'POST', { email, password });
    Auth.setSession(data);
    closeAuthModal();
    updateNavForUser(data.user);
    loadCartCount();
    showToast(`✅ Welcome back, ${data.user.name}!`);
  } catch (e) {
    errEl.textContent = e.message;
  }
}

async function handleRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const phone    = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('auth-error');
  if (!name || !email || !password) { errEl.textContent = 'Please fill in all required fields'; return; }
  try {
    errEl.textContent = 'Creating account...';
    const data = await api('/auth/register', 'POST', { name, email, phone, password });
    Auth.setSession(data);
    closeAuthModal();
    updateNavForUser(data.user);
    loadCartCount();
    showToast(`✅ Welcome to Yara Nature, ${data.user.name}!`);
  } catch (e) {
    errEl.textContent = e.message;
  }
}

// ── Update nav UI based on login state ────────────────
function updateNavForUser(user) {
  // Remove any existing user menu
  document.querySelectorAll('.user-nav-item').forEach(el => el.remove());

  const navMenu = document.getElementById('navMenu');
  if (!navMenu) return;

  if (user) {
    // Add user profile + logout to nav
    const li = document.createElement('li');
    li.className = 'user-nav-item';
    li.style.cssText = 'position:relative';
    li.innerHTML = `
      <a href="#" onclick="toggleUserMenu(event)" style="display:flex;align-items:center;gap:6px">
        <div style="width:28px;height:28px;background:#2d4a2b;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0">
          ${user.name[0].toUpperCase()}
        </div>
        <span>${user.name.split(' ')[0]}</span>
      </a>
      <div id="user-dropdown" style="display:none;position:absolute;top:100%;right:0;background:#fff;border:1px solid #e0ddd4;border-radius:8px;padding:8px;min-width:150px;box-shadow:0 4px 16px rgba(0,0,0,0.1);z-index:200">
        <a href="dashboard.html" style="display:block;padding:8px 12px;font-size:0.83rem;color:#333;text-decoration:none;border-radius:5px" onmouseover="this.style.background='#f5f0e6'" onmouseout="this.style.background=''">�� My Account</a>
        <a href="dashboard.html#orders" style="display:block;padding:8px 12px;font-size:0.83rem;color:#333;text-decoration:none;border-radius:5px" onmouseover="this.style.background='#f5f0e6'" onmouseout="this.style.background=''">📦 My Orders</a>
        <a href="track-order.html" style="display:block;padding:8px 12px;font-size:0.83rem;color:#333;text-decoration:none;border-radius:5px" onmouseover="this.style.background='#f5f0e6'" onmouseout="this.style.background=''">🚚 Track Order</a>
        <a href="admin/login.html" style="display:${user.role==='admin'?'block':'none'};padding:8px 12px;font-size:0.83rem;color:#2d4a2b;text-decoration:none;font-weight:700;border-radius:5px" onmouseover="this.style.background='#f5f0e6'" onmouseout="this.style.background=''">🔐 Admin Panel</a>
        <hr style="margin:6px 0;border:none;border-top:1px solid #f0f0f0"/>
        <a href="#" onclick="handleLogout()" style="display:block;padding:8px 12px;font-size:0.83rem;color:#e63f2e;text-decoration:none;border-radius:5px" onmouseover="this.style.background='#fff0f0'" onmouseout="this.style.background=''">🚪 Logout</a>
      </div>`;
    navMenu.appendChild(li);
  }
}

function toggleUserMenu(e) {
  e.preventDefault();
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

async function handleLogout() {
  try { await api('/auth/logout', 'POST'); } catch(e) {}
  Auth.clearSession();
  document.querySelectorAll('.user-nav-item').forEach(el => el.remove());
  document.querySelectorAll('.cart-badge,.cart-count').forEach(b => b.textContent = '0');
  showToast('Logged out successfully');
}

// ── WhatsApp order with product message ───────────────
function openWhatsApp(msg) {
  const text = msg || 'Hi! I am interested in Yara Nature Herbal Hair Growth Oil (₹349). Please help me order.';
  window.open(`https://wa.me/919999999999?text=${encodeURIComponent(text)}`, '_blank');
}

// ── Order Now button handler ──────────────────────────
async function handleOrderNow(e) {
  if (e) e.preventDefault();
  if (!Auth.isLoggedIn()) {
    showToast('Please login to place an order', 'error');
    setTimeout(() => showLoginModal(), 900);
    return;
  }
  try {
    const { products } = await api('/products?featured=true&limit=1');
    const product = products?.[0];
    if (!product) { openWhatsApp(); return; }
    await api('/cart', 'POST', { productId: product.id, quantity: 1 });
    updateCartBadge(1);
    showToast('✅ Added to cart! Opening cart...');
    setTimeout(openCart, 800);
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════
//  DOM READY — Wire every button
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // ── Search icon ──────────────────────────────────────
  document.querySelectorAll('#searchBtn, .icon-btn[aria-label="Search"], [data-action="search"]').forEach(btn => {
    btn.addEventListener('click', openSearch);
  });

  // ── Cart icon ─────────────────────────────────────────
  document.querySelectorAll('#cartBtn, .icon-btn.cart-icon, .cart-icon, [aria-label="Cart"]').forEach(btn => {
    btn.addEventListener('click', openCart);
  });

  // ── All ORDER NOW / BUY NOW buttons by ID ────────────
  const orderBtnIds = ['heroBuyBtn','productBuyNow','smbBuyBtn','footerOrderBtn'];
  orderBtnIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handleOrderNow);
  });

  // ── Add to Cart button ────────────────────────────────
  const addCartBtn = document.getElementById('productAddCart');
  if (addCartBtn) {
    addCartBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const qtyEl = document.getElementById('qtyNum');
      const qty = qtyEl ? parseInt(qtyEl.textContent) || 1 : 1;
      if (!Auth.isLoggedIn()) { showToast('Please login to add to cart', 'error'); setTimeout(() => showLoginModal(), 900); return; }
      try {
        const { products } = await api('/products?featured=true&limit=1');
        const pid = products?.[0]?.id;
        if (!pid) { openWhatsApp(); return; }
        await api('/cart', 'POST', { productId: pid, quantity: qty });
        updateCartBadge(qty);
        showToast(`✅ Added ${qty} item(s) to cart!`);
        setTimeout(openCart, 600);
      } catch (e) { showToast('❌ ' + e.message, 'error'); }
    });
  }

  // ── WhatsApp buttons ──────────────────────────────────
  const waBtnIds = ['heroWaBtn','smbWaBtn','floatingWa'];
  waBtnIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', (e) => { e.preventDefault(); openWhatsApp(); });
  });

  // ── Remaining .btn-green (fallback) ──────────────────
  document.querySelectorAll('.btn-green:not([id])').forEach(btn => {
    if (!btn.closest('.footer-wa-btn')) {
      btn.addEventListener('click', handleOrderNow);
    }
  });

  // ── Contact form ──────────────────────────────────────
  const contactForm = document.getElementById('contactForm') || document.querySelector('form[data-form="contact"]');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      const orig = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      try {
        await api('/contact', 'POST', {
          name:    contactForm.querySelector('#name, [name="name"]')?.value,
          email:   contactForm.querySelector('#email, [name="email"]')?.value,
          phone:   contactForm.querySelector('#phone, [name="phone"]')?.value || '',
          subject: contactForm.querySelector('#subject, [name="subject"]')?.value || 'General',
          message: contactForm.querySelector('#message, [name="message"]')?.value,
        });
        showToast('✅ Message sent! We will reply within 24 hours.');
        contactForm.reset();
        const successEl = document.getElementById('form-success');
        if (successEl) successEl.style.display = 'block';
      } catch (err) {
        showToast('❌ ' + err.message, 'error');
      } finally {
        btn.textContent = orig;
        btn.disabled = false;
      }
    });
  }

  // ── Load FAQs dynamically on FAQ page ─────────────────
  const faqList = document.querySelector('.faq-list, .faq-full');
  if (faqList && window.location.pathname.includes('faq')) {
    api('/faqs').then(({ faqs }) => {
      if (!faqs?.length) return;
      faqList.innerHTML = faqs.map(f => `
        <details class="faq-item">
          <summary>${f.question}</summary>
          <p>${f.answer}</p>
        </details>`).join('');
    }).catch(() => {});
  }

  // ── Load approved reviews on reviews page ─────────────
  if (window.location.pathname.includes('review')) {
    api('/products').then(({ products }) => {
      if (!products?.[0]) return;
      return api(`/reviews/${products[0].id}`);
    }).then(data => {
      if (!data?.reviews?.length) return;
      const grid = document.querySelector('.reviews-grid');
      if (!grid) return;
      grid.innerHTML = data.reviews.map(r => `
        <div class="review-card">
          <div class="rev-stars r-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
          <p class="rev-text r-quote">"${r.comment}"</p>
          <div class="rev-author r-author">
            <div class="rev-avatar r-avatar" style="background:#2d4a2b;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.82rem">
              ${(r.name||'U')[0].toUpperCase()}
            </div>
            <div>
              <div class="rev-name r-name">${r.name}</div>
              <div class="rev-verified r-verified">✅ Verified Buyer</div>
            </div>
          </div>
        </div>`).join('');
    }).catch(() => {});
  }

  // ── Init user session ─────────────────────────────────
  const user = Auth.getUser();
  if (user) {
    updateNavForUser(user);
    loadCartCount();
  }

  // ── Track analytics visit ─────────────────────────────
  api('/analytics/track', 'POST').catch(() => {});

  // ── Close dropdowns on outside click ─────────────────
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-nav-item')) {
      const dd = document.getElementById('user-dropdown');
      if (dd) dd.style.display = 'none';
    }
  });

});

// Expose globally
window.YaraNature = { api, Auth, showToast, openSearch, openCart, closeCart,
  showLoginModal, handleOrderNow, openWhatsApp, addToCart };
