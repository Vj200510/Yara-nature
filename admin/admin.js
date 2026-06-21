// ═══════════════════════════════════════════════════
//  YARA NATURE — Admin Dashboard JS
// ═══════════════════════════════════════════════════
const API = 'https://yara-nature.onrender.com/api';
let adminToken = localStorage.getItem('yn_admin_token');
let adminUser  = JSON.parse(localStorage.getItem('yn_admin_user') || '{}');
let currentPage = 'dashboard';
let orderPage = 1, customerPage = 1;

// ── Auth guard ───────────────────────────────────────
if (!adminToken || adminUser.role !== 'admin') {
  window.location.href = 'login.html';
}

// ── Core API helper ──────────────────────────────────
async function req(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: body ? JSON.stringify(body) : null,
  };
  const r = await fetch(`${API}${path}`, opts);
  const d = await r.json();
  if (!d.success) throw new Error(d.message);
  return d;
}

// ── Toast ─────────────────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type === 'success' ? '#2d4a2b' : '#e63f2e';
  t.style.color = '#fff';
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.opacity = '0', 3200);
}

// ── Navigation ────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.getElementById('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);
  const loaders = { dashboard: loadDashboard, orders: loadOrders, products: loadProducts, customers: loadCustomers, reviews: loadReviews, contacts: loadContacts, faqs: loadFAQs, coupons: loadCoupons, analytics: loadAnalytics };
  if (loaders[page]) loaders[page]();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigate(item.dataset.page); });
});

// ── Mobile sidebar toggle ─────────────────────────────
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Set admin name ────────────────────────────────────
document.getElementById('adminName').textContent = adminUser.name || 'Admin';
document.getElementById('adminAvatar').textContent = (adminUser.name || 'A')[0].toUpperCase();

// ── Logout ────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('yn_admin_token');
  localStorage.removeItem('yn_admin_user');
  window.location.href = 'login.html';
});

// ══════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const { stats, recentOrders, topProducts } = await req('/admin/dashboard');
    document.getElementById('statRevenue').textContent  = '₹' + (stats.totalRevenue || 0).toLocaleString('en-IN');
    document.getElementById('statOrders').textContent   = stats.totalOrders   || 0;
    document.getElementById('statUsers').textContent    = stats.totalUsers    || 0;
    document.getElementById('statProducts').textContent = stats.totalProducts || 0;
    document.getElementById('statReviews').textContent  = stats.pendingReviews || 0;
    document.getElementById('statContacts').textContent = stats.newContacts   || 0;

    document.getElementById('recentOrdersBody').innerHTML = (recentOrders || []).map(o => `
      <tr>
        <td><code style="font-size:0.75rem">#${o.id.slice(0,8).toUpperCase()}</code></td>
        <td>${o.shipping_name || '—'}</td>
        <td>₹${parseFloat(o.total_price).toLocaleString('en-IN')}</td>
        <td><span class="badge badge-${o.order_status}">${o.order_status}</span></td>
        <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="loading">No orders yet</td></tr>';

    document.getElementById('topProductsBody').innerHTML = (topProducts || []).map(p => `
      <tr>
        <td>${p.name}</td>
        <td>₹${parseFloat(p.price).toLocaleString('en-IN')}</td>
        <td><strong>${p.sold || 0}</strong></td>
      </tr>`).join('') || '<tr><td colspan="3" class="loading">No data</td></tr>';
  } catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════
async function loadOrders() {
  const status = document.getElementById('orderStatusFilter').value;
  try {
    const { orders, total } = await req(`/orders?page=${orderPage}&limit=15${status ? '&status=' + status : ''}`);
    document.getElementById('ordersBody').innerHTML = (orders || []).map(o => `
      <tr>
        <td><code style="font-size:0.75rem">#${o.id.slice(0,8).toUpperCase()}</code></td>
        <td>${o.shipping_name || '—'}</td>
        <td>₹${parseFloat(o.total_price).toLocaleString('en-IN')}</td>
        <td><span class="badge badge-${o.payment_status}">${o.payment_status}</span></td>
        <td><span class="badge badge-${o.order_status}">${o.order_status}</span></td>
        <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
        <td>
          <button class="btn-sm btn-view" onclick="viewOrder('${o.id}')">View</button>
          ${o.order_status === 'confirmed' ? `<button class="btn-sm btn-ship" onclick="updateOrderStatus('${o.id}','shipped')">Ship</button>` : ''}
          ${o.order_status === 'shipped'   ? `<button class="btn-sm btn-approve" onclick="updateOrderStatus('${o.id}','delivered')">Delivered</button>` : ''}
        </td>
      </tr>`).join('') || '<tr><td colspan="7" class="loading">No orders found</td></tr>';

    const pages = Math.ceil((total || 0) / 15);
    document.getElementById('orderPagination').innerHTML = Array.from({length: pages}, (_, i) =>
      `<button class="page-btn ${i+1===orderPage?'active':''}" onclick="orderPage=${i+1};loadOrders()">${i+1}</button>`
    ).join('');
  } catch (e) { toast(e.message, 'error'); }
}

async function viewOrder(id) {
  try {
    const { order } = await req(`/orders/${id}`);
    document.getElementById('orderModalContent').innerHTML = `
      <h3>Order #${id.slice(0,8).toUpperCase()}</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
        <div><strong>Customer:</strong> ${order.shipping_name}</div>
        <div><strong>Phone:</strong> ${order.shipping_phone || '—'}</div>
        <div><strong>Status:</strong> <span class="badge badge-${order.order_status}">${order.order_status}</span></div>
        <div><strong>Payment:</strong> <span class="badge badge-${order.payment_status}">${order.payment_status}</span></div>
        <div style="grid-column:1/-1"><strong>Address:</strong> ${order.shipping_address1}, ${order.shipping_city}, ${order.shipping_state} – ${order.shipping_pincode}</div>
      </div>
      <h4 style="margin:16px 0 10px;color:#2d4a2b">Items</h4>
      <table class="admin-table">
        <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
        <tbody>${(order.order_items||[]).map(i=>`<tr><td>${i.name}</td><td>${i.quantity}</td><td>₹${i.price}</td><td>₹${(i.price*i.quantity).toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="text-align:right;margin-top:12px;font-size:0.9rem">
        <div>Items: ₹${order.items_price}</div>
        <div>Shipping: ₹${order.shipping_price}</div>
        <div>Tax: ₹${order.tax_price}</div>
        <div style="font-size:1.1rem;font-weight:800;margin-top:6px">Total: ₹${order.total_price}</div>
      </div>
      <div style="margin-top:16px">
        <label style="font-size:0.82rem;font-weight:600">Update Status:</label>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          ${['processing','confirmed','shipped','delivered','cancelled'].map(s=>
            `<button class="btn-sm btn-${s==='cancelled'?'reject':'approve'}" onclick="updateOrderStatus('${id}','${s}');closeOrderModal()">${s}</button>`
          ).join('')}
        </div>
      </div>`;
    document.getElementById('orderModal').classList.add('open');
  } catch (e) { toast(e.message, 'error'); }
}

async function updateOrderStatus(id, status) {
  try {
    await req(`/orders/${id}/status`, 'PUT', { status });
    toast(`Order marked as ${status}`);
    loadOrders();
  } catch (e) { toast(e.message, 'error'); }
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('open');
}

// ══════════════════════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════════════════════
async function loadProducts() {
  try {
    const { products } = await req('/products');
    document.getElementById('productsBody').innerHTML = (products || []).map(p => `
      <tr>
        <td><img src="${p.product_images?.[0]?.url || '../images/product-bottle.jpeg'}" style="width:44px;height:52px;object-fit:cover;border-radius:6px"/></td>
        <td><strong>${p.name}</strong><br/><small style="color:#888">${p.category}</small></td>
        <td>₹${p.price}</td>
        <td><s style="color:#aaa">₹${p.mrp}</s></td>
        <td>${p.stock}</td>
        <td><span class="badge ${p.is_active?'badge-delivered':'badge-cancelled'}">${p.is_active?'Active':'Inactive'}</span></td>
        <td>
          <button class="btn-sm btn-edit" onclick="editProduct('${p.id}')">Edit</button>
          <button class="btn-sm btn-delete" onclick="deleteProduct('${p.id}')">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="7" class="loading">No products</td></tr>';
  } catch (e) { toast(e.message, 'error'); }
}

function showAddProductModal(product = null) {
  const isEdit = !!product;
  document.getElementById('modalContent').innerHTML = `
    <h3>${isEdit ? 'Edit' : 'Add'} Product</h3>
    <form id="productForm">
      <div class="form-row">
        <div class="form-group"><label>Name *</label><input name="name" value="${product?.name||''}" required/></div>
        <div class="form-group"><label>Category</label><input name="category" value="${product?.category||'Hair Oil'}"/></div>
      </div>
      <div class="form-group"><label>Description *</label><textarea name="description" rows="3" required>${product?.description||''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Price (₹) *</label><input name="price" type="number" value="${product?.price||349}" required/></div>
        <div class="form-group"><label>MRP (₹) *</label><input name="mrp" type="number" value="${product?.mrp||499}" required/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Stock *</label><input name="stock" type="number" value="${product?.stock||100}" required/></div>
        <div class="form-group"><label>Size</label><input name="size" value="${product?.size||'100ml'}"/></div>
      </div>
      <div class="form-group"><label>How To Use</label><textarea name="how_to_use" rows="2">${product?.how_to_use||''}</textarea></div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;cursor:pointer">
          <input type="checkbox" name="is_featured" ${product?.is_featured?'checked':''}/> Featured
        </label>
      </div>
      <button type="submit" class="btn-primary" style="width:100%;margin-top:16px">${isEdit?'Update':'Create'} Product</button>
    </form>`;
  document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd);
    body.price = +body.price; body.mrp = +body.mrp; body.stock = +body.stock;
    body.is_featured = !!body.is_featured;
    try {
      if (isEdit) { await req(`/products/${product.id}`, 'PUT', body); toast('Product updated'); }
      else        { await req('/products', 'POST', body); toast('Product created'); }
      closeModal(); loadProducts();
    } catch (err) { toast(err.message, 'error'); }
  });
  document.getElementById('modalOverlay').classList.add('open');
}

async function editProduct(id) {
  try {
    const { product } = await req(`/products/${id}`);
    showAddProductModal(product);
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try { await req(`/products/${id}`, 'DELETE'); toast('Product deleted'); loadProducts(); }
  catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════
//  CUSTOMERS
// ══════════════════════════════════════════════════════
async function loadCustomers() {
  try {
    const { users, total } = await req(`/admin/users?page=${customerPage}&limit=15`);
    document.getElementById('customersBody').innerHTML = (users || []).map(u => `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td>${u.phone || '—'}</td>
        <td><span class="badge ${u.role==='admin'?'badge-shipped':'badge-delivered'}">${u.role}</span></td>
        <td>${new Date(u.created_at).toLocaleDateString('en-IN')}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="loading">No customers</td></tr>';

    const pages = Math.ceil((total || 0) / 15);
    document.getElementById('customerPagination').innerHTML = Array.from({length: pages}, (_, i) =>
      `<button class="page-btn ${i+1===customerPage?'active':''}" onclick="customerPage=${i+1};loadCustomers()">${i+1}</button>`
    ).join('');
  } catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════
//  REVIEWS
// ══════════════════════════════════════════════════════
async function loadReviews() {
  const filter = document.getElementById('reviewFilter').value;
  try {
    const { reviews } = await req(`/reviews?${filter !== '' ? 'approved=' + filter : ''}`);
    const list = document.getElementById('reviewsList');
    list.innerHTML = (reviews || []).map(r => `
      <div class="review-card">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <strong style="font-size:0.88rem">${r.name}</strong>
            <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
            <span class="badge ${r.approved?'badge-delivered':'badge-processing'}">${r.approved?'Approved':'Pending'}</span>
          </div>
          <p class="review-comment">"${r.comment}"</p>
          <p class="review-meta">Product: ${r.product?.name || '—'} • ${new Date(r.created_at).toLocaleDateString('en-IN')}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${!r.approved ? `<button class="btn-sm btn-approve" onclick="approveReview('${r.id}',true)">Approve</button>` : ''}
          ${r.approved  ? `<button class="btn-sm btn-reject"  onclick="approveReview('${r.id}',false)">Unapprove</button>` : ''}
          <button class="btn-sm btn-delete" onclick="deleteReview('${r.id}')">Delete</button>
        </div>
      </div>`).join('') || '<div class="loading" style="padding:24px;text-align:center;color:#aaa">No reviews found</div>';
  } catch (e) { toast(e.message, 'error'); }
}

async function approveReview(id, approved) {
  try { await req(`/reviews/${id}`, 'PUT', { approved }); toast(approved ? 'Review approved' : 'Review unapproved'); loadReviews(); }
  catch (e) { toast(e.message, 'error'); }
}

async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  try { await req(`/reviews/${id}`, 'DELETE'); toast('Review deleted'); loadReviews(); }
  catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════
//  CONTACTS
// ══════════════════════════════════════════════════════
async function loadContacts() {
  try {
    const { contacts } = await req('/contact');
    document.getElementById('contactsBody').innerHTML = (contacts || []).map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.email}</td>
        <td>${c.subject || '—'}</td>
        <td><span class="badge badge-${c.status}">${c.status}</span></td>
        <td>${new Date(c.created_at).toLocaleDateString('en-IN')}</td>
        <td>
          <button class="btn-sm btn-view" onclick="viewContact('${c.id}','${encodeURIComponent(c.message)}','${c.name}')">View</button>
          <button class="btn-sm btn-approve" onclick="markContactRead('${c.id}')">Mark Read</button>
          <button class="btn-sm btn-delete" onclick="deleteContact('${c.id}')">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" class="loading">No contacts</td></tr>';
  } catch (e) { toast(e.message, 'error'); }
}

function viewContact(id, message, name) {
  document.getElementById('modalContent').innerHTML = `
    <h3>Message from ${name}</h3>
    <p style="margin-top:14px;font-size:0.88rem;color:#555;line-height:1.7">${decodeURIComponent(message)}</p>
    <button class="btn-primary" style="margin-top:20px;width:100%" onclick="markContactRead('${id}');closeModal()">Mark as Read</button>`;
  document.getElementById('modalOverlay').classList.add('open');
}

async function markContactRead(id) {
  try { await req(`/contact/${id}`, 'PUT', { status: 'read' }); toast('Marked as read'); loadContacts(); }
  catch (e) { toast(e.message, 'error'); }
}

async function deleteContact(id) {
  if (!confirm('Delete this contact?')) return;
  try { await req(`/contact/${id}`, 'DELETE'); toast('Contact deleted'); loadContacts(); }
  catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════
//  FAQs
// ══════════════════════════════════════════════════════
async function loadFAQs() {
  try {
    const { faqs } = await req('/faqs');
    const list = document.getElementById('faqsList');
    list.innerHTML = (faqs || []).map(f => `
      <div class="faq-item">
        <div style="flex:1">
          <div class="faq-q">${f.question}</div>
          <div class="faq-a">${f.answer}</div>
          <div style="font-size:0.74rem;color:#bbb;margin-top:6px">Category: ${f.category} • Order: ${f.sort_order}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn-sm btn-edit" onclick="editFAQ(${JSON.stringify(f).split('"').join('&quot;')})">Edit</button>
          <button class="btn-sm btn-delete" onclick="deleteFAQ('${f.id}')">Delete</button>
        </div>
      </div>`).join('') || '<div class="loading" style="padding:24px;text-align:center;color:#aaa">No FAQs yet</div>';
  } catch (e) { toast(e.message, 'error'); }
}

function showFAQModal(faq = null) {
  document.getElementById('modalContent').innerHTML = `
    <h3>${faq ? 'Edit' : 'Add'} FAQ</h3>
    <form id="faqForm">
      <div class="form-group"><label>Question *</label><input name="question" value="${faq?.question||''}" required/></div>
      <div class="form-group"><label>Answer *</label><textarea name="answer" rows="4" required>${faq?.answer||''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Category</label><input name="category" value="${faq?.category||'General'}"/></div>
        <div class="form-group"><label>Sort Order</label><input name="sort_order" type="number" value="${faq?.sort_order||0}"/></div>
      </div>
      <button type="submit" class="btn-primary" style="width:100%;margin-top:8px">${faq?'Update':'Create'} FAQ</button>
    </form>`;
  document.getElementById('faqForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    body.sort_order = +body.sort_order;
    try {
      if (faq) { await req(`/faqs/${faq.id}`, 'PUT', body); toast('FAQ updated'); }
      else     { await req('/faqs', 'POST', body); toast('FAQ created'); }
      closeModal(); loadFAQs();
    } catch (err) { toast(err.message, 'error'); }
  });
  document.getElementById('modalOverlay').classList.add('open');
}

function editFAQ(faq) { showFAQModal(faq); }

async function deleteFAQ(id) {
  if (!confirm('Delete this FAQ?')) return;
  try { await req(`/faqs/${id}`, 'DELETE'); toast('FAQ deleted'); loadFAQs(); }
  catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════
//  COUPONS
// ══════════════════════════════════════════════════════
async function loadCoupons() {
  try {
    const { coupons } = await req('/coupons');
    document.getElementById('couponsBody').innerHTML = (coupons || []).map(c => `
      <tr>
        <td><strong style="color:#2d4a2b;letter-spacing:1px">${c.code}</strong></td>
        <td>${c.discount_type}</td>
        <td>${c.discount_type==='percent' ? c.discount_value+'%' : '₹'+c.discount_value}</td>
        <td>₹${c.min_order_value}</td>
        <td>${c.used_count}${c.usage_limit ? '/'+c.usage_limit : ''}</td>
        <td>${c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : 'No expiry'}</td>
        <td><button class="btn-sm btn-delete" onclick="deleteCoupon('${c.id}')">Delete</button></td>
      </tr>`).join('') || '<tr><td colspan="7" class="loading">No coupons</td></tr>';
  } catch (e) { toast(e.message, 'error'); }
}

function showCouponModal() {
  document.getElementById('modalContent').innerHTML = `
    <h3>Create Coupon</h3>
    <form id="couponForm">
      <div class="form-row">
        <div class="form-group"><label>Code *</label><input name="code" placeholder="YARA10" required style="text-transform:uppercase"/></div>
        <div class="form-group"><label>Type</label>
          <select name="discount_type"><option value="percent">Percent (%)</option><option value="flat">Flat (₹)</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Value *</label><input name="discount_value" type="number" placeholder="10" required/></div>
        <div class="form-group"><label>Min Order (₹)</label><input name="min_order_value" type="number" value="0"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Max Discount (₹)</label><input name="max_discount" type="number" placeholder="Optional"/></div>
        <div class="form-group"><label>Usage Limit</label><input name="usage_limit" type="number" placeholder="Optional"/></div>
      </div>
      <div class="form-group"><label>Expires At</label><input name="expires_at" type="date"/></div>
      <button type="submit" class="btn-primary" style="width:100%;margin-top:8px">Create Coupon</button>
    </form>`;
  document.getElementById('couponForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    body.discount_value  = +body.discount_value;
    body.min_order_value = +body.min_order_value || 0;
    if (body.max_discount)  body.max_discount  = +body.max_discount;  else delete body.max_discount;
    if (body.usage_limit)   body.usage_limit   = +body.usage_limit;   else delete body.usage_limit;
    if (!body.expires_at)   delete body.expires_at;
    body.code = body.code.toUpperCase();
    try { await req('/coupons', 'POST', body); toast('Coupon created'); closeModal(); loadCoupons(); }
    catch (err) { toast(err.message, 'error'); }
  });
  document.getElementById('modalOverlay').classList.add('open');
}

async function deleteCoupon(id) {
  if (!confirm('Delete this coupon?')) return;
  try { await req(`/coupons/${id}`, 'DELETE'); toast('Coupon deleted'); loadCoupons(); }
  catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════════════
async function loadAnalytics() {
  try {
    const [analyticsData, revenueData] = await Promise.all([
      req('/analytics?days=30'),
      req('/admin/revenue-chart'),
    ]);
    const { totals } = analyticsData;
    document.getElementById('analyticsStats').innerHTML = `
      <div class="stat-card green"><div class="stat-icon">👁️</div><div><div class="stat-num">${totals.visitors.toLocaleString()}</div><div class="stat-label">Visitors (30d)</div></div></div>
      <div class="stat-card blue"><div class="stat-icon">📄</div><div><div class="stat-num">${totals.pageViews.toLocaleString()}</div><div class="stat-label">Page Views (30d)</div></div></div>
      <div class="stat-card gold"><div class="stat-icon">₹</div><div><div class="stat-num">₹${totals.revenue.toLocaleString('en-IN')}</div><div class="stat-label">Revenue (30d)</div></div></div>
      <div class="stat-card purple"><div class="stat-icon">📦</div><div><div class="stat-num">${totals.orders}</div><div class="stat-label">Orders (30d)</div></div></div>`;

    // Simple bar chart
    const chart = revenueData.chart || [];
    if (chart.length) {
      const max = Math.max(...chart.map(d => d.revenue), 1);
      document.getElementById('revenueChart').innerHTML = `
        <div class="chart-bar-wrap" style="align-items:flex-end;gap:3px;height:160px;padding:8px 0;overflow-x:auto">
          ${chart.map(d => `
            <div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:14px">
              <div title="₹${d.revenue} on ${d.date}" style="background:#2d4a2b;border-radius:4px 4px 0 0;width:100%;height:${Math.round((d.revenue/max)*140)}px;min-height:4px;cursor:pointer;transition:opacity .2s" onmouseover="this.style.opacity=.7" onmouseout="this.style.opacity=1"></div>
              <div style="font-size:0.55rem;color:#bbb;margin-top:4px;transform:rotate(-40deg);white-space:nowrap">${d.date.slice(5)}</div>
            </div>`).join('')}
        </div>`;
    } else {
      document.getElementById('revenueChart').innerHTML = '<div style="text-align:center;color:#aaa;padding:40px">No revenue data yet</div>';
    }
  } catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════
//  MODAL HELPERS
// ══════════════════════════════════════════════════════
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});
document.getElementById('orderModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('orderModal')) closeOrderModal();
});

// ══════════════════════════════════════════════════════
//  INIT — load dashboard on start
// ══════════════════════════════════════════════════════
loadDashboard();
