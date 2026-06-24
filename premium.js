// ═══════════════════════════════════════════════════════
//  YARA NATURE — Premium Frontend JS
// ═══════════════════════════════════════════════════════
// ── Auto-detect local vs production ──────────────────
const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5001/api'
  : 'https://yara-nature.onrender.com/api';
let productId = null;
let quantity  = 1;

// ── Core API ──────────────────────────────────────────
async function apiFetch(path, method='GET', body=null) {
  const token = localStorage.getItem('yn_token');
  const headers = {'Content-Type':'application/json'};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  try{
    const r = await fetch(`${API}${path}`,{method,headers,credentials:'include',body:body?JSON.stringify(body):null});
    const d = await r.json();
    if(!d.success) throw new Error(d.message);
    return d;
  }catch(e){ throw new Error(e.message||'Network error'); }
}
const Auth = {
  isLoggedIn:()=>!!localStorage.getItem('yn_token'),
  getUser:()=>{try{return JSON.parse(localStorage.getItem('yn_user')||'null');}catch{return null;}},
  set:(d)=>{localStorage.setItem('yn_token',d.token);localStorage.setItem('yn_user',JSON.stringify(d.user));},
  clear:()=>{localStorage.removeItem('yn_token');localStorage.removeItem('yn_user');}
};

// ── Toast ─────────────────────────────────────────────
function toast(msg, type='success') {
  let t = document.getElementById('yn-toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'yn-toast';
    t.style.cssText=`position:fixed;bottom:120px;left:50%;transform:translateX(-50%);
    padding:13px 24px;border-radius:10px;font-family:Inter,sans-serif;font-size:14px;
    font-weight:600;z-index:99999;pointer-events:none;box-shadow:0 6px 24px rgba(0,0,0,0.18);
    transition:opacity .3s;max-width:88vw;text-align:center;opacity:0;`;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type==='success'?'#2d4a2b':type==='error'?'#e63f2e':'#c9a227';
  t.style.color = '#fff';
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(()=>t.style.opacity='0', 3500);
}

// ── Navbar scroll ─────────────────────────────────────
window.addEventListener('scroll',()=>{
  const nav = document.getElementById('navbar');
  if(nav) nav.classList.toggle('scrolled', window.scrollY > 60);
  const smb = document.getElementById('stickyMobileBar');
  if(smb) smb.style.display = window.scrollY > 400 ? 'flex' : 'flex';
});

// ── Hamburger menu ────────────────────────────────────
document.getElementById('hamburgerBtn')?.addEventListener('click',()=>{
  const nl = document.getElementById('navLinks');
  if(!nl) return;
  if(nl.style.display==='flex'){nl.style.display='none';}
  else{
    nl.style.cssText='display:flex;flex-direction:column;position:absolute;top:70px;left:0;right:0;background:#fff;padding:16px 24px;box-shadow:0 8px 24px rgba(0,0,0,0.1);z-index:300;gap:4px';
  }
});

// ── Countdown timer ───────────────────────────────────
function initCountdown() {
  let stored = localStorage.getItem('yn_countdown');
  if(!stored || stored < Date.now()) {
    stored = Date.now() + 24*60*60*1000;
    localStorage.setItem('yn_countdown', stored);
  }
  const el = document.getElementById('countdownTimer');
  if(!el) return;
  const tick = ()=>{
    const diff = +stored - Date.now();
    if(diff<=0){el.textContent='00:00:00';return;}
    const h = Math.floor(diff/3600000).toString().padStart(2,'0');
    const m = Math.floor((diff%3600000)/60000).toString().padStart(2,'0');
    const s = Math.floor((diff%60000)/1000).toString().padStart(2,'0');
    el.textContent=`${h}:${m}:${s}`;
  };
  tick();
  setInterval(tick,1000);
}

// ── Quantity controls ─────────────────────────────────
document.getElementById('qtyMinus')?.addEventListener('click',()=>{
  if(quantity>1){quantity--;document.getElementById('qtyNum').textContent=quantity;}
});
document.getElementById('qtyPlus')?.addEventListener('click',()=>{
  if(quantity<10){quantity++;document.getElementById('qtyNum').textContent=quantity;}
});

// ── Product image switcher ────────────────────────────
function switchImg(thumb, src) {
  document.getElementById('pgMainImg').src = src;
  document.querySelectorAll('.pg-thumb').forEach(t=>t.classList.remove('active'));
  thumb.classList.add('active');
}

// ── Load product from API ─────────────────────────────
async function loadProduct(){
  try{
    const {products} = await apiFetch('/products?featured=true&limit=1');
    if(products?.[0]) productId = products[0].id;
  }catch(e){}
}

// ── Add to cart ───────────────────────────────────────
async function addToCart(qty=1){
  if(!Auth.isLoggedIn()){ showAuthModal(); return; }
  if(!productId){ toast('Loading product...','info'); return; }
  try{
    await apiFetch('/cart','POST',{productId, quantity:qty});
    updateCartCount(1);
    toast(`✅ Added ${qty} item(s) to cart!`);
    openCartDrawer();
  }catch(e){ toast('❌ '+e.message,'error'); }
}

// ── Buy now ───────────────────────────────────────────
async function buyNow(){
  if(!Auth.isLoggedIn()){ showAuthModal(); return; }
  await addToCart(quantity);
  setTimeout(()=>window.location.href='checkout.html', 500);
}

// ── Button wiring ─────────────────────────────────────
document.getElementById('heroBuyBtn')?.addEventListener('click', buyNow);
document.getElementById('heroCartBtn')?.addEventListener('click',()=>addToCart(1));
document.getElementById('productAddCart')?.addEventListener('click',()=>addToCart(quantity));
document.getElementById('productBuyNow')?.addEventListener('click', buyNow);
document.getElementById('smbCartBtn')?.addEventListener('click',()=>addToCart(1));
document.getElementById('smbBuyBtn')?.addEventListener('click', buyNow);
document.getElementById('footerOrderBtn')?.addEventListener('click', buyNow);

// ── Wishlist ──────────────────────────────────────────
document.getElementById('productWishlist')?.addEventListener('click',function(){
  if(!Auth.isLoggedIn()){ showAuthModal(); return; }
  this.classList.toggle('active');
  toast(this.classList.contains('active')?'❤️ Added to wishlist':'Removed from wishlist');
});
document.getElementById('wishlistBtn')?.addEventListener('click',()=>{
  if(!Auth.isLoggedIn()){ showAuthModal(); return; }
  toast('Your wishlist is empty. Add items to get started!','info');
});

// ── Cart count ────────────────────────────────────────
function updateCartCount(add=0){
  document.querySelectorAll('.cart-count,#cartCount').forEach(el=>{
    el.textContent = Math.max(0,(parseInt(el.textContent)||0)+add);
  });
}
async function loadCartCount(){
  if(!Auth.isLoggedIn()) return;
  try{
    const {cart}=await apiFetch('/cart');
    const c=cart?.items?.length||0;
    document.querySelectorAll('.cart-count,#cartCount').forEach(el=>el.textContent=c);
  }catch(e){}
}
document.getElementById('cartBtn')?.addEventListener('click', openCartDrawer);

// ── Cart Drawer ───────────────────────────────────────
function openCartDrawer(){
  let d = document.getElementById('cart-drawer');
  if(!d){
    d = document.createElement('div');
    d.id='cart-drawer';
    d.style.cssText=`position:fixed;top:0;right:-420px;width:400px;max-width:95vw;height:100vh;
    background:#fff;z-index:9998;box-shadow:-4px 0 32px rgba(0,0,0,0.15);
    display:flex;flex-direction:column;transition:right .3s ease;font-family:Inter,sans-serif;`;
    d.innerHTML=`
    <div style="padding:18px 20px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center">
      <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:#2d4a2b">🛒 Your Cart</div>
      <button onclick="closeCartDrawer()" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#999">✕</button>
    </div>
    <div id="cart-body" style="flex:1;overflow-y:auto;padding:16px 20px"></div>
    <div id="cart-foot" style="padding:16px 20px;border-top:1px solid #f0f0f0"></div>`;
    const ov = document.createElement('div');
    ov.id='cart-ov';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9997;display:none';
    ov.onclick=closeCartDrawer;
    document.body.append(ov,d);
  }
  d.style.right='0';
  document.getElementById('cart-ov').style.display='block';
  document.body.style.overflow='hidden';
  renderCart();
}
function closeCartDrawer(){
  const d=document.getElementById('cart-drawer');
  const o=document.getElementById('cart-ov');
  if(d) d.style.right='-420px';
  if(o) o.style.display='none';
  document.body.style.overflow='';
}
async function renderCart(){
  const body=document.getElementById('cart-body');
  const foot=document.getElementById('cart-foot');
  if(!body) return;
  if(!Auth.isLoggedIn()){
    body.innerHTML=`<div style="text-align:center;padding:40px 20px">
      <div style="font-size:3rem;margin-bottom:12px">🛒</div>
      <p style="color:#555;margin-bottom:16px">Login to view your cart</p>
      <button onclick="closeCartDrawer();showAuthModal()"
        style="background:#2d4a2b;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:700">
        Login / Register</button></div>`;
    foot.innerHTML=''; return;
  }
  body.innerHTML='<div style="text-align:center;color:#aaa;padding:30px">Loading cart...</div>';
  try{
    const {cart}=await apiFetch('/cart');
    const items=cart?.items||[];
    if(!items.length){
      body.innerHTML=`<div style="text-align:center;padding:40px 20px">
        <div style="font-size:3rem;margin-bottom:12px">🛒</div>
        <p style="color:#555">Your cart is empty</p></div>`;
      foot.innerHTML=''; return;
    }
    body.innerHTML=items.map(item=>`
      <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f5f0e6">
        <img src="${item.product?.product_images?.[0]?.url||'images/product-bottle.jpeg'}"
          style="width:64px;height:78px;object-fit:contain;border-radius:8px;flex-shrink:0;background:#f9f6f0;padding:3px"/>
        <div style="flex:1">
          <div style="font-weight:700;font-size:0.84rem;margin-bottom:4px">${item.product?.name||'Yara Nature Oil'}</div>
          <div style="font-size:0.78rem;color:#888">₹${item.product?.price} × ${item.quantity}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
            <button onclick="changeQty('${item.id}',${item.quantity-1})" style="width:26px;height:26px;border:1.5px solid #ddd;border-radius:50%;background:#fff;cursor:pointer">−</button>
            <span style="font-weight:700;min-width:18px;text-align:center">${item.quantity}</span>
            <button onclick="changeQty('${item.id}',${item.quantity+1})" style="width:26px;height:26px;border:1.5px solid #ddd;border-radius:50%;background:#fff;cursor:pointer">+</button>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800;color:#2d4a2b">₹${(item.product?.price*item.quantity).toFixed(0)}</div>
          <button onclick="removeItem('${item.id}')" style="background:none;border:none;color:#e63f2e;cursor:pointer;font-size:0.72rem;margin-top:8px">Remove</button>
        </div>
      </div>`).join('');
    foot.innerHTML=`
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:0.85rem"><span style="color:#888">Subtotal</span><span style="font-weight:600">₹${cart.itemsPrice?.toFixed(0)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:0.85rem"><span style="color:#888">Shipping</span><span style="font-weight:600;color:${cart.shippingPrice===0?'#2d4a2b':'#333'}">${cart.shippingPrice===0?'FREE':'₹'+cart.shippingPrice}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;padding-top:10px;border-top:1px solid #f0f0f0;font-weight:800;font-size:1rem"><span>Total</span><span style="color:#2d4a2b">₹${cart.totalPrice?.toFixed(0)}</span></div>
      <button onclick="window.location.href='checkout.html'"
        style="width:100%;background:#2d4a2b;color:#fff;border:none;padding:13px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.9rem">
        Proceed to Checkout →</button>
      <a href="https://wa.me/919999999999?text=I want to order Yara Nature Oil ₹349"
        target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;padding:11px;background:#25D366;color:#fff;border-radius:8px;font-weight:700;font-size:0.84rem;text-decoration:none">
        💬 Order via WhatsApp</a>`;
  }catch(e){
    body.innerHTML=`<div style="text-align:center;color:#e63f2e;padding:20px">${e.message}</div>`;
  }
}
async function changeQty(id,qty){
  try{await apiFetch(`/cart/${id}`,'PUT',{quantity:qty});renderCart();}catch(e){}
}
async function removeItem(id){
  try{await apiFetch(`/cart/${id}`,'DELETE');updateCartCount(-1);renderCart();}catch(e){}
}

// ── Auth Modal ────────────────────────────────────────
function showAuthModal(mode='login'){
  let m = document.getElementById('auth-modal');
  if(!m){
    m = document.createElement('div');
    m.id = 'auth-modal';
    m.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;
      display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,sans-serif`;
    m.innerHTML=`
      <div style="background:#fff;border-radius:20px;padding:36px 32px;width:100%;max-width:400px;position:relative">
        <button onclick="closeAuthModal()" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:1.4rem;cursor:pointer;color:#aaa">✕</button>
        <div style="text-align:center;margin-bottom:22px">
          <div style="font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:800;color:#2d4a2b">YARA NATURE</div>
          <div style="font-size:0.7rem;color:#c9a227;font-style:italic">Pure Wellness from Nature</div>
        </div>
        <div id="auth-tabs" style="display:flex;border:1.5px solid #e0ddd4;border-radius:8px;overflow:hidden;margin-bottom:20px">
          <button id="tab-login" onclick="switchAuthTab('login')"
            style="flex:1;padding:11px;border:none;font-weight:700;font-size:0.85rem;cursor:pointer;background:#2d4a2b;color:#fff;transition:all .2s">Login</button>
          <button id="tab-reg" onclick="switchAuthTab('register')"
            style="flex:1;padding:11px;border:none;font-weight:700;font-size:0.85rem;cursor:pointer;background:#fff;color:#555;transition:all .2s">Register</button>
        </div>
        <div id="auth-login-form">
          <div style="margin-bottom:14px"><label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:5px">Email</label>
            <input id="al-email" type="email" placeholder="your@email.com"
              style="width:100%;padding:11px 13px;border:1.5px solid #ddd;border-radius:8px;font-size:0.88rem;outline:none"/></div>
          <div style="margin-bottom:18px"><label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:5px">Password</label>
            <input id="al-pass" type="password" placeholder="••••••••"
              style="width:100%;padding:11px 13px;border:1.5px solid #ddd;border-radius:8px;font-size:0.88rem;outline:none"/>
          <div style="text-align:right;margin-top:6px"><a href="forgot-password.html" style="font-size:0.75rem;color:#2d4a2b">Forgot password?</a></div></div>
          <button id="do-login" onclick="doLogin()"
            style="width:100%;padding:13px;background:#2d4a2b;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:0.9rem;cursor:pointer">Login →</button>
        </div>
        <div id="auth-reg-form" style="display:none">
          <div style="margin-bottom:12px"><label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:5px">Full Name</label>
            <input id="ar-name" type="text" placeholder="Your name"
              style="width:100%;padding:11px 13px;border:1.5px solid #ddd;border-radius:8px;font-size:0.88rem;outline:none"/></div>
          <div style="margin-bottom:12px"><label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:5px">Email</label>
            <input id="ar-email" type="email" placeholder="your@email.com"
              style="width:100%;padding:11px 13px;border:1.5px solid #ddd;border-radius:8px;font-size:0.88rem;outline:none"/></div>
          <div style="margin-bottom:12px"><label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:5px">Phone</label>
            <input id="ar-phone" type="tel" placeholder="9999999999"
              style="width:100%;padding:11px 13px;border:1.5px solid #ddd;border-radius:8px;font-size:0.88rem;outline:none"/></div>
          <div style="margin-bottom:18px"><label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:5px">Password</label>
            <input id="ar-pass" type="password" placeholder="Min 6 characters"
              style="width:100%;padding:11px 13px;border:1.5px solid #ddd;border-radius:8px;font-size:0.88rem;outline:none"/></div>
          <button onclick="doRegister()"
            style="width:100%;padding:13px;background:#2d4a2b;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:0.9rem;cursor:pointer">Create Account →</button>
        </div>
        <div id="auth-err" style="color:#e63f2e;font-size:0.8rem;margin-top:12px;text-align:center;min-height:18px"></div>
      </div>`;
    m.addEventListener('click',e=>{ if(e.target===m) closeAuthModal(); });
    document.body.appendChild(m);
  }
  m.style.display='flex';
  switchAuthTab(mode);
}

function closeAuthModal(){
  const m = document.getElementById('auth-modal');
  if(m) m.style.display='none';
}

function switchAuthTab(mode){
  document.getElementById('auth-login-form').style.display = mode==='login'?'block':'none';
  document.getElementById('auth-reg-form').style.display   = mode==='register'?'block':'none';
  document.getElementById('tab-login').style.background    = mode==='login'?'#2d4a2b':'#fff';
  document.getElementById('tab-login').style.color         = mode==='login'?'#fff':'#555';
  document.getElementById('tab-reg').style.background      = mode==='register'?'#2d4a2b':'#fff';
  document.getElementById('tab-reg').style.color           = mode==='register'?'#fff':'#555';
  document.getElementById('auth-err').textContent = '';
}

async function doLogin(){
  const e=document.getElementById('al-email').value.trim();
  const p=document.getElementById('al-pass').value;
  const err=document.getElementById('auth-err');
  if(!e||!p){err.textContent='Please fill in all fields';return;}
  document.getElementById('do-login').textContent='Logging in...';
  try{
    const d = await apiFetch('/auth/login','POST',{email:e,password:p});
    Auth.set(d);
    closeAuthModal();
    updateNavUI(d.user);
    loadCartCount();
    toast(`✅ Welcome back, ${d.user.name}!`);
  }catch(ex){
    err.textContent=ex.message;
    document.getElementById('do-login').textContent='Login →';
  }
}

async function doRegister(){
  const name=document.getElementById('ar-name').value.trim();
  const email=document.getElementById('ar-email').value.trim();
  const phone=document.getElementById('ar-phone').value.trim();
  const pass=document.getElementById('ar-pass').value;
  const err=document.getElementById('auth-err');
  if(!name||!email||!pass){err.textContent='Please fill required fields';return;}
  try{
    const d = await apiFetch('/auth/register','POST',{name,email,phone,password:pass});
    Auth.set(d);
    closeAuthModal();
    updateNavUI(d.user);
    loadCartCount();
    toast(`✅ Welcome to Yara Nature, ${d.user.name}! 🌿`);
  }catch(ex){ err.textContent=ex.message; }
}

// ── Nav UI after login ────────────────────────────────
function updateNavUI(user){
  document.querySelectorAll('.user-nav-wrap').forEach(e=>e.remove());
  if(!user) return;
  const nav = document.querySelector('.nav-actions');
  if(!nav) return;
  const wrap = document.createElement('div');
  wrap.className = 'user-nav-wrap';
  wrap.style.cssText = 'position:relative';
  wrap.innerHTML = `
    <button onclick="toggleUserMenu(event)"
      style="display:flex;align-items:center;gap:7px;background:rgba(45,74,43,0.08);border:none;
      padding:7px 12px;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;color:#2d4a2b">
      <div style="width:26px;height:26px;background:#2d4a2b;color:#fff;border-radius:50%;
        display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700">
        ${user.name[0].toUpperCase()}</div>
      ${user.name.split(' ')[0]}
    </button>
    <div id="user-menu" style="display:none;position:absolute;top:calc(100%+6px);right:0;
      background:#fff;border:1px solid #e0ddd4;border-radius:12px;padding:8px;
      min-width:180px;box-shadow:0 8px 28px rgba(0,0,0,0.12);z-index:300;font-family:Inter,sans-serif">
      <a href="dashboard.html"
        style="display:flex;align-items:center;gap:8px;padding:9px 12px;font-size:0.83rem;color:#333;border-radius:7px;text-decoration:none"
        onmouseover="this.style.background='#f5f0e6'" onmouseout="this.style.background=''">👤 My Account</a>
      <a href="dashboard.html#orders"
        style="display:flex;align-items:center;gap:8px;padding:9px 12px;font-size:0.83rem;color:#333;border-radius:7px;text-decoration:none"
        onmouseover="this.style.background='#f5f0e6'" onmouseout="this.style.background=''">📦 My Orders</a>
      ${user.role==='admin'?`<a href="admin/login.html"
        style="display:flex;align-items:center;gap:8px;padding:9px 12px;font-size:0.83rem;color:#2d4a2b;font-weight:700;border-radius:7px;text-decoration:none"
        onmouseover="this.style.background='#f5f0e6'" onmouseout="this.style.background=''">🔐 Admin Panel</a>`:''}
      <hr style="margin:6px 0;border:none;border-top:1px solid #f0f0f0"/>
      <button onclick="doLogout()"
        style="width:100%;text-align:left;display:flex;align-items:center;gap:8px;padding:9px 12px;
        font-size:0.83rem;color:#e63f2e;border:none;background:none;cursor:pointer;border-radius:7px"
        onmouseover="this.style.background='#fff5f5'" onmouseout="this.style.background=''">🚪 Logout</button>
    </div>`;
  nav.insertBefore(wrap, nav.querySelector('.hamburger'));
}

function toggleUserMenu(e){
  e.stopPropagation();
  const m = document.getElementById('user-menu');
  if(m) m.style.display = m.style.display==='none'?'block':'none';
}

async function doLogout(){
  try{ await apiFetch('/auth/logout','POST'); }catch(ex){}
  Auth.clear();
  document.querySelectorAll('.user-nav-wrap').forEach(e=>e.remove());
  document.querySelectorAll('.cart-count,#cartCount').forEach(e=>e.textContent='0');
  toast('Logged out successfully');
}

document.addEventListener('click',()=>{
  const m=document.getElementById('user-menu');
  if(m) m.style.display='none';
});

document.getElementById('userBtn')?.addEventListener('click',()=>{
  if(Auth.isLoggedIn()) toggleUserMenu({stopPropagation:()=>{}});
  else showAuthModal();
});

// ── Search Modal ──────────────────────────────────────
function openSearch(){
  let m = document.getElementById('search-modal');
  if(!m){
    m = document.createElement('div');
    m.id = 'search-modal';
    m.style.cssText=`position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;
      display:none;align-items:flex-start;justify-content:center;padding-top:80px;font-family:Inter,sans-serif`;
    m.innerHTML=`
      <div style="background:#fff;border-radius:16px;padding:24px;width:90%;max-width:540px;position:relative">
        <button onclick="closeSearch()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.4rem;cursor:pointer;color:#aaa">✕</button>
        <h3 style="font-family:'Playfair Display',serif;color:#2d4a2b;margin-bottom:14px;font-size:1.1rem">🔍 Search Products</h3>
        <input id="search-inp" type="text" placeholder="Search hair oil, ingredients, benefits..."
          oninput="handleSearch(this.value)"
          style="width:100%;padding:12px 14px;border:1.5px solid #ddd;border-radius:8px;font-size:0.9rem;outline:none"/>
        <div id="search-res" style="margin-top:12px;max-height:300px;overflow-y:auto"></div>
      </div>`;
    m.addEventListener('click',e=>{ if(e.target===m) closeSearch(); });
    document.body.appendChild(m);
  }
  m.style.display='flex';
  setTimeout(()=>document.getElementById('search-inp')?.focus(),80);
}
function closeSearch(){
  const m=document.getElementById('search-modal');
  if(m) m.style.display='none';
}
let _st;
async function handleSearch(q){
  clearTimeout(_st);
  const res=document.getElementById('search-res');
  if(!q||q.length<2){res.innerHTML='';return;}
  res.innerHTML='<div style="color:#aaa;padding:10px;font-size:0.84rem">Searching...</div>';
  _st = setTimeout(async()=>{
    try{
      const {suggestions}=await apiFetch(`/products/search?q=${encodeURIComponent(q)}`);
      if(!suggestions?.length){res.innerHTML='<div style="color:#aaa;padding:10px;font-size:0.84rem">No results found</div>';return;}
      res.innerHTML=suggestions.map(p=>`
        <div onclick="closeSearch();addToCart(1)"
          style="display:flex;justify-content:space-between;align-items:center;padding:11px 12px;
          border-bottom:1px solid #f0f0f0;cursor:pointer;border-radius:7px"
          onmouseover="this.style.background='#f5f0e6'" onmouseout="this.style.background=''">
          <div>
            <div style="font-weight:600;font-size:0.88rem">${p.name}</div>
            <div style="font-size:0.74rem;color:#888">100ml | Herbal Hair Oil</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:800;color:#2d4a2b;font-size:0.92rem">₹${p.price}</div>
            <div style="font-size:0.72rem;color:#aaa;text-decoration:line-through">₹${p.mrp}</div>
          </div>
        </div>`).join('');
    }catch(ex){res.innerHTML='<div style="color:#aaa;padding:10px;font-size:0.84rem">Search unavailable</div>';}
  },340);
}
document.getElementById('searchBtn')?.addEventListener('click', openSearch);

// ── Exit Intent Popup ─────────────────────────────────
let _exitShown = sessionStorage.getItem('yn_exit_shown');
document.addEventListener('mouseleave',(e)=>{
  if(e.clientY<10 && !_exitShown){
    _exitShown=true;
    sessionStorage.setItem('yn_exit_shown','1');
    const pop=document.getElementById('exitPopup');
    if(pop){ pop.style.display='flex'; }
  }
});
function applyAndClose(code){
  localStorage.setItem('yn_coupon', code);
  document.getElementById('exitPopup').style.display='none';
  toast(`✅ Coupon ${code} applied! Redirecting to checkout...`);
  setTimeout(()=>{ if(Auth.isLoggedIn()) window.location.href='checkout.html'; else showAuthModal(); }, 1000);
}

// ── Purchase Notifications ────────────────────────────
const _buyers = [
  {name:'Neha',city:'Delhi'},{name:'Priya',city:'Mumbai'},
  {name:'Rahul',city:'Bangalore'},{name:'Anita',city:'Pune'},
  {name:'Vikram',city:'Chennai'},{name:'Pooja',city:'Hyderabad'},
  {name:'Arjun',city:'Jaipur'},{name:'Divya',city:'Kolkata'},
];
function showPurchaseNotif(){
  const b = _buyers[Math.floor(Math.random()*_buyers.length)];
  const el = document.getElementById('purchaseNotif');
  if(!el) return;
  el.querySelector('.pn-text').innerHTML=`<strong>${b.name} from ${b.city}</strong> just ordered Yara Nature Oil<br/><small>${Math.floor(Math.random()*8)+1} minutes ago</small>`;
  el.style.display='flex';
  setTimeout(()=>el.style.display='none', 5000);
}
setTimeout(showPurchaseNotif, 5000);
setInterval(showPurchaseNotif, 20000);

// ── Animated stats counter ────────────────────────────
function animateStats(){
  document.querySelectorAll('[data-target]').forEach(el=>{
    const target = parseFloat(el.dataset.target);
    if(target===4){ el.textContent='4.8★'; return; }
    let current=0;
    const step = target/60;
    const timer = setInterval(()=>{
      current = Math.min(current+step, target);
      const disp = current>=1000 ? Math.round(current).toLocaleString('en-IN')+'+' : Math.round(current)+(target===30?'':'+');
      el.textContent = disp;
      if(current>=target) clearInterval(timer);
    },30);
  });
}
const statsObs = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ animateStats(); statsObs.disconnect(); }});
},{threshold:0.3});
const statsEl=document.querySelector('.stats-section');
if(statsEl) statsObs.observe(statsEl);

// ── Particle background ───────────────────────────────
function createParticles(){
  const container = document.getElementById('heroParticles');
  if(!container) return;
  const emojis=['🌿','🌾','✨','💧','🌱'];
  for(let i=0;i<12;i++){
    const p=document.createElement('div');
    p.className='hero-particle';
    p.textContent=emojis[i%emojis.length];
    p.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;
      animation-delay:${Math.random()*6}s;animation-duration:${6+Math.random()*6}s;
      font-size:${0.8+Math.random()*1.2}rem;`;
    container.appendChild(p);
  }
}

// ── Newsletter ────────────────────────────────────────
async function subscribeNewsletter(){
  const el=document.getElementById('newsletterEmail');
  if(!el?.value){ toast('Please enter your email','error'); return; }
  try{
    await apiFetch('/contact','POST',{name:'Newsletter',email:el.value,subject:'Newsletter Subscription',message:'Subscribe to newsletter'});
    toast('✅ Subscribed! Check your inbox for exclusive offers.');
    el.value='';
  }catch(ex){ toast('❌ '+ex.message,'error'); }
}

// ── Size selector ─────────────────────────────────────
document.querySelectorAll('.size-opt').forEach(opt=>{
  opt.addEventListener('click',function(){
    document.querySelectorAll('.size-opt').forEach(o=>o.classList.remove('active'));
    this.classList.add('active');
  });
});

// ── Scroll to top ─────────────────────────────────────
const scrollBtn = document.createElement('button');
scrollBtn.style.cssText=`position:fixed;bottom:160px;right:20px;width:42px;height:42px;
  border-radius:50%;background:#2d4a2b;color:#fff;border:none;font-size:1.2rem;
  cursor:pointer;z-index:497;opacity:0;transition:opacity .3s;box-shadow:0 3px 12px rgba(0,0,0,0.2)`;
scrollBtn.textContent='↑';
scrollBtn.title='Back to top';
scrollBtn.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
document.body.appendChild(scrollBtn);
window.addEventListener('scroll',()=>scrollBtn.style.opacity=window.scrollY>400?'1':'0');

// ── Track analytics ───────────────────────────────────
apiFetch('/analytics/track','POST').catch(()=>{});

// ── DOMContentLoaded ──────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  initCountdown();
  createParticles();
  loadProduct();

  // Init user session
  const user=Auth.getUser();
  if(user){ updateNavUI(user); loadCartCount(); }

  // Navbar sticky
  window.dispatchEvent(new Event('scroll'));
});
