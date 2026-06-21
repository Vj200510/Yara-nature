const supabase = require('../config/supabase');
const { success, error } = require('../utils/apiResponse');

// ── SUBMIT REVIEW ─────────────────────────────────────
exports.submitReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    const { data: product } = await supabase
      .from('products').select('id').eq('id', productId).single();
    if (!product) return error(res, 'Product not found', 404);

    const { data: review, error: dbErr } = await supabase
      .from('reviews')
      .upsert({
        user_id: req.user.id, product_id: productId,
        name: req.user.name, rating, comment, approved: false,
      }, { onConflict: 'user_id,product_id' })
      .select().single();

    if (dbErr) return error(res, dbErr.message, 500);
    success(res, { review }, 'Review submitted. It will appear after approval.', 201);
  } catch (err) {
    error(res, err.message);
  }
};

// ── GET PRODUCT REVIEWS ───────────────────────────────
exports.getProductReviews = async (req, res) => {
  try {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id,name,rating,comment,created_at')
      .eq('product_id', req.params.productId)
      .eq('approved', true)
      .order('created_at', { ascending: false });

    success(res, { reviews: reviews || [] });
  } catch (err) {
    error(res, err.message);
  }
};

// ── ADMIN: ALL REVIEWS ────────────────────────────────
exports.allReviews = async (req, res) => {
  try {
    const { approved } = req.query;
    let query = supabase.from('reviews')
      .select('*, product:products(name)')
      .order('created_at', { ascending: false });
    if (approved !== undefined) query = query.eq('approved', approved === 'true');

    const { data: reviews } = await query;
    success(res, { reviews: reviews || [] });
  } catch (err) {
    error(res, err.message);
  }
};

// ── ADMIN: APPROVE / REJECT REVIEW ───────────────────
exports.approveReview = async (req, res) => {
  try {
    const { approved } = req.body;
    await supabase.from('reviews').update({ approved }).eq('id', req.params.id);

    // Recalculate product rating
    const { data: review } = await supabase.from('reviews').select('product_id').eq('id', req.params.id).single();
    const { data: stats } = await supabase.from('reviews')
      .select('rating').eq('product_id', review.product_id).eq('approved', true);

    if (stats?.length) {
      const avg = stats.reduce((s, r) => s + r.rating, 0) / stats.length;
      await supabase.from('products').update({ ratings: +avg.toFixed(2), num_reviews: stats.length }).eq('id', review.product_id);
    }

    success(res, {}, approved ? 'Review approved' : 'Review rejected');
  } catch (err) {
    error(res, err.message);
  }
};

// ── ADMIN: DELETE REVIEW ──────────────────────────────
exports.deleteReview = async (req, res) => {
  try {
    await supabase.from('reviews').delete().eq('id', req.params.id);
    success(res, {}, 'Review deleted');
  } catch (err) {
    error(res, err.message);
  }
};
