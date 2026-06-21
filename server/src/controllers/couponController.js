const supabase = require('../config/supabase');
const { success, error } = require('../utils/apiResponse');

exports.applyCoupon = async (req, res) => {
  try {
    const { code, orderValue } = req.body;

    const { data: coupon } = await supabase.from('coupons')
      .select('*').eq('code', code.toUpperCase()).eq('is_active', true).single();

    if (!coupon) return error(res, 'Invalid coupon code', 404);
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return error(res, 'Coupon has expired', 400);
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit)
      return error(res, 'Coupon usage limit reached', 400);
    if (orderValue < coupon.min_order_value)
      return error(res, `Minimum order value ₹${coupon.min_order_value} required`, 400);

    // Check if user already used
    const { data: used } = await supabase.from('coupon_usage')
      .select('id').eq('coupon_id', coupon.id).eq('user_id', req.user.id).single();
    if (used) return error(res, 'You have already used this coupon', 400);

    let discount = coupon.discount_type === 'percent'
      ? (orderValue * coupon.discount_value) / 100
      : coupon.discount_value;

    if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);

    success(res, {
      discount: +discount.toFixed(2),
      couponCode: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
    }, 'Coupon applied successfully');
  } catch (err) { error(res, err.message); }
};

exports.getCoupons = async (req, res) => {
  try {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    success(res, { coupons: data || [] });
  } catch (err) { error(res, err.message); }
};

exports.createCoupon = async (req, res) => {
  try {
    const { data, error: dbErr } = await supabase.from('coupons').insert(req.body).select().single();
    if (dbErr) return error(res, dbErr.message, 500);
    success(res, { coupon: data }, 'Coupon created', 201);
  } catch (err) { error(res, err.message); }
};

exports.deleteCoupon = async (req, res) => {
  try {
    await supabase.from('coupons').delete().eq('id', req.params.id);
    success(res, {}, 'Coupon deleted');
  } catch (err) { error(res, err.message); }
};
