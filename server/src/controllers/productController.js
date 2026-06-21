const supabase = require('../config/supabase');
const { success, error } = require('../utils/apiResponse');
const slugify  = require('../utils/slugify');

// ── GET ALL PRODUCTS ──────────────────────────────────
exports.getProducts = async (req, res) => {
  try {
    const { search, category, sort = 'created_at', order = 'desc', page = 1, limit = 12, featured } = req.query;

    let query = supabase
      .from('products')
      .select('*, product_images(url, sort_order)', { count: 'exact' })
      .eq('is_active', true);

    if (search)   query = query.ilike('name', `%${search}%`);
    if (category) query = query.eq('category', category);
    if (featured) query = query.eq('is_featured', true);

    query = query.order(sort, { ascending: order === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: products, error: dbErr, count } = await query;
    if (dbErr) return error(res, dbErr.message, 500);

    success(res, {
      products,
      pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    error(res, err.message);
  }
};

// ── GET SINGLE PRODUCT ────────────────────────────────
exports.getProduct = async (req, res) => {
  try {
    const { data: product, error: dbErr } = await supabase
      .from('products')
      .select('*, product_images(url,public_id,sort_order)')
      .eq('is_active', true)
      .or(`id.eq.${req.params.id},slug.eq.${req.params.id}`)
      .maybeSingle();

    if (dbErr || !product) return error(res, 'Product not found', 404);

    // Get approved reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id,name,rating,comment,created_at')
      .eq('product_id', product.id)
      .eq('approved', true)
      .order('created_at', { ascending: false });

    success(res, { product: { ...product, reviews: reviews || [] } });
  } catch (err) {
    error(res, err.message);
  }
};

// ── CREATE PRODUCT (Admin) ────────────────────────────
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, mrp, stock, category, size, ingredients, benefits, how_to_use, is_featured, images } = req.body;

    const slug = slugify(name) + '-' + Date.now();
    const discount = Math.round(((mrp - price) / mrp) * 100);

    const { data: product, error: dbErr } = await supabase
      .from('products')
      .insert({ name, slug, description, price, mrp, discount, stock, category, size, ingredients, benefits, how_to_use, is_featured: !!is_featured })
      .select().single();

    if (dbErr) return error(res, dbErr.message, 500);

    // Insert images if provided
    if (images?.length) {
      await supabase.from('product_images').insert(
        images.map((img, i) => ({ product_id: product.id, url: img.url, public_id: img.public_id, sort_order: i }))
      );
    }

    success(res, { product }, 'Product created', 201);
  } catch (err) {
    error(res, err.message);
  }
};

// ── UPDATE PRODUCT (Admin) ────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date() };
    if (updates.mrp && updates.price) {
      updates.discount = Math.round(((updates.mrp - updates.price) / updates.mrp) * 100);
    }
    delete updates.images;

    const { data: product, error: dbErr } = await supabase
      .from('products').update(updates).eq('id', req.params.id).select().single();

    if (dbErr) return error(res, dbErr.message, 500);
    success(res, { product }, 'Product updated');
  } catch (err) {
    error(res, err.message);
  }
};

// ── DELETE PRODUCT (Admin) ────────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    await supabase.from('products').update({ is_active: false }).eq('id', req.params.id);
    success(res, {}, 'Product deleted');
  } catch (err) {
    error(res, err.message);
  }
};

// ── SEARCH SUGGESTIONS ────────────────────────────────
exports.searchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return success(res, { suggestions: [] });

    const { data } = await supabase
      .from('products')
      .select('id,name,slug,price,mrp')
      .ilike('name', `%${q}%`)
      .eq('is_active', true)
      .limit(6);

    success(res, { suggestions: data || [] });
  } catch (err) {
    error(res, err.message);
  }
};
