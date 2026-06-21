const supabase = require('../config/supabase');
const { success, error } = require('../utils/apiResponse');

// Helper: get or create cart
const getOrCreateCart = async (userId) => {
  let { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
  if (!cart) {
    const { data } = await supabase.from('carts').insert({ user_id: userId }).select('id').single();
    cart = data;
  }
  return cart;
};

// Helper: get full cart with items
const getFullCart = async (cartId) => {
  const { data: items } = await supabase
    .from('cart_items')
    .select('id,quantity,price,product:products(id,name,price,mrp,discount,stock,product_images(url))')
    .eq('cart_id', cartId);
  return items || [];
};

// ── GET CART ──────────────────────────────────────────
exports.getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const items = await getFullCart(cart.id);

    const itemsPrice   = items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
    const shippingPrice = itemsPrice >= 499 ? 0 : 49;
    const taxPrice     = +(itemsPrice * 0.18).toFixed(2);
    const totalPrice   = +(itemsPrice + shippingPrice + taxPrice).toFixed(2);

    success(res, { cart: { id: cart.id, items, itemsPrice, shippingPrice, taxPrice, totalPrice } });
  } catch (err) {
    error(res, err.message);
  }
};

// ── ADD TO CART ───────────────────────────────────────
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Check product
    const { data: product } = await supabase
      .from('products').select('id,price,stock').eq('id', productId).eq('is_active', true).single();
    if (!product) return error(res, 'Product not found', 404);
    if (product.stock < 1) return error(res, 'Product out of stock', 400);

    const cart = await getOrCreateCart(req.user.id);

    // Check if already in cart
    const { data: existing } = await supabase
      .from('cart_items').select('id,quantity').eq('cart_id', cart.id).eq('product_id', productId).single();

    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, product.stock);
      await supabase.from('cart_items').update({ quantity: newQty }).eq('id', existing.id);
    } else {
      await supabase.from('cart_items').insert({
        cart_id: cart.id, product_id: productId,
        quantity: Math.min(quantity, product.stock), price: product.price,
      });
    }

    const items = await getFullCart(cart.id);
    success(res, { items }, 'Added to cart', 201);
  } catch (err) {
    error(res, err.message);
  }
};

// ── UPDATE QUANTITY ───────────────────────────────────
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (quantity <= 0) {
      await supabase.from('cart_items').delete().eq('id', itemId);
      return success(res, {}, 'Item removed from cart');
    }

    await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
    success(res, {}, 'Cart updated');
  } catch (err) {
    error(res, err.message);
  }
};

// ── REMOVE FROM CART ──────────────────────────────────
exports.removeFromCart = async (req, res) => {
  try {
    await supabase.from('cart_items').delete().eq('id', req.params.itemId);
    success(res, {}, 'Item removed from cart');
  } catch (err) {
    error(res, err.message);
  }
};

// ── CLEAR CART ────────────────────────────────────────
exports.clearCart = async (userId) => {
  const { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
  if (cart) await supabase.from('cart_items').delete().eq('cart_id', cart.id);
};
