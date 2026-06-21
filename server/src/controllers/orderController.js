const crypto    = require('crypto');
const supabase  = require('../config/supabase');
const { clearCart } = require('./cartController');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');
const { success, error } = require('../utils/apiResponse');

// Initialize Razorpay lazily — only when keys are available
function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('xxxx')) {
    return null;
  }
  const Razorpay = require('razorpay');
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ── CREATE RAZORPAY ORDER ─────────────────────────────
exports.createRazorpayOrder = async (req, res) => {
  try {
    const razorpay = getRazorpay();
    if (!razorpay) {
      return error(res, 'Payment gateway not configured. Please contact support or order via WhatsApp.', 503);
    }
    const { amount } = req.body;
    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `yara_${Date.now()}`,
    };
    const rzpOrder = await razorpay.orders.create(options);
    success(res, {
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    error(res, err.message);
  }
};

// ── PLACE ORDER ───────────────────────────────────────
exports.placeOrder = async (req, res) => {
  try {
    const {
      orderItems, shippingAddress,
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      couponCode, itemsPrice, taxPrice, shippingPrice, discount, totalPrice,
    } = req.body;

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString()).digest('hex');

    const isValid = expectedSig === razorpay_signature;
    if (!isValid) return error(res, 'Payment verification failed', 400);

    // Create order in DB
    const { data: order, error: dbErr } = await supabase.from('orders').insert({
      user_id: req.user.id,
      items_price: itemsPrice,
      tax_price: taxPrice,
      shipping_price: shippingPrice,
      discount_amount: discount || 0,
      total_price: totalPrice,
      coupon_code: couponCode,
      payment_status: 'paid',
      paid_at: new Date(),
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_status: 'confirmed',
      shipping_name:     shippingAddress.name,
      shipping_phone:    shippingAddress.phone,
      shipping_address1: shippingAddress.addressLine1,
      shipping_address2: shippingAddress.addressLine2,
      shipping_city:     shippingAddress.city,
      shipping_state:    shippingAddress.state,
      shipping_pincode:  shippingAddress.pincode,
    }).select().single();

    if (dbErr) return error(res, dbErr.message, 500);

    // Insert order items
    await supabase.from('order_items').insert(
      orderItems.map(i => ({
        order_id: order.id, product_id: i.product,
        name: i.name, price: i.price, quantity: i.quantity, image_url: i.image,
      }))
    );

    // Update product stock
    for (const item of orderItems) {
      await supabase.rpc('decrement_stock', { product_id: item.product, qty: item.quantity }).catch(() => {});
    }

    // Status history
    await supabase.from('order_status_history').insert({ order_id: order.id, status: 'confirmed', note: 'Payment received' });

    // Clear cart
    await clearCart(req.user.id);

    // Confirmation email (non-blocking)
    const { data: user } = await supabase.from('users').select('email,name').eq('id', req.user.id).single();
    const tpl = emailTemplates.orderConfirmation(order, orderItems);
    sendEmail({ to: user.email, ...tpl }).catch(() => {});

    success(res, { order }, 'Order placed successfully', 201);
  } catch (err) {
    error(res, err.message);
  }
};

// ── MY ORDERS ─────────────────────────────────────────
exports.myOrders = async (req, res) => {
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('id,total_price,order_status,payment_status,created_at,order_items(name,quantity,price,image_url)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    success(res, { orders: orders || [] });
  } catch (err) {
    error(res, err.message);
  }
};

// ── GET SINGLE ORDER ──────────────────────────────────
exports.getOrder = async (req, res) => {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('*, order_items(*), order_status_history(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!order) return error(res, 'Order not found', 404);
    success(res, { order });
  } catch (err) {
    error(res, err.message);
  }
};

// ── CANCEL ORDER ──────────────────────────────────────
exports.cancelOrder = async (req, res) => {
  try {
    const { data: order } = await supabase
      .from('orders').select('order_status').eq('id', req.params.id).eq('user_id', req.user.id).single();

    if (!order) return error(res, 'Order not found', 404);
    if (['shipped','delivered'].includes(order.order_status))
      return error(res, 'Cannot cancel order that is already shipped or delivered', 400);

    await supabase.from('orders').update({
      order_status: 'cancelled',
      cancelled_at: new Date(),
      cancel_reason: req.body.reason || 'Cancelled by customer',
    }).eq('id', req.params.id);

    await supabase.from('order_status_history').insert({
      order_id: req.params.id, status: 'cancelled',
      note: req.body.reason || 'Cancelled by customer',
    });

    success(res, {}, 'Order cancelled');
  } catch (err) {
    error(res, err.message);
  }
};

// ── ADMIN: ALL ORDERS ─────────────────────────────────
exports.allOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    let query = supabase
      .from('orders')
      .select('id,total_price,order_status,payment_status,created_at,shipping_name,shipping_phone', { count: 'exact' });

    if (status) query = query.eq('order_status', status);
    query = query.order('created_at', { ascending: false });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: orders, count } = await query;
    success(res, { orders, total: count });
  } catch (err) {
    error(res, err.message);
  }
};

// ── ADMIN: UPDATE ORDER STATUS ────────────────────────
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const updates = { order_status: status, updated_at: new Date() };
    if (status === 'delivered') updates.delivered_at = new Date();

    await supabase.from('orders').update(updates).eq('id', req.params.id);
    await supabase.from('order_status_history').insert({ order_id: req.params.id, status, note });

    // Email customer on ship
    if (status === 'shipped') {
      const { data: order } = await supabase
        .from('orders').select('id,user_id').eq('id', req.params.id).single();
      const { data: user } = await supabase
        .from('users').select('email').eq('id', order.user_id).single();
      const tpl = emailTemplates.orderShipped(order);
      sendEmail({ to: user.email, ...tpl }).catch(() => {});
    }

    success(res, {}, 'Order status updated');
  } catch (err) {
    error(res, err.message);
  }
};
