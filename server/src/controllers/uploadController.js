const { uploadToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const supabase = require('../config/supabase');
const { success, error } = require('../utils/apiResponse');

// ── Upload product images ─────────────────────────────
exports.uploadProductImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return error(res, 'No images provided', 400);

    const uploaded = await Promise.all(
      req.files.map((file, i) =>
        uploadToCloudinary(file.buffer, 'yaranature/products').then(result => ({
          ...result,
          sort_order: i,
          product_id: req.params.productId,
        }))
      )
    );

    const { data, error: dbErr } = await supabase
      .from('product_images')
      .insert(uploaded)
      .select();

    if (dbErr) return error(res, dbErr.message, 500);
    success(res, { images: data }, 'Images uploaded', 201);
  } catch (err) {
    error(res, err.message);
  }
};

// ── Upload user avatar ────────────────────────────────
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No image provided', 400);

    const { url, public_id } = await uploadToCloudinary(
      req.file.buffer, 'yaranature/avatars'
    );

    await supabase
      .from('users')
      .update({ avatar_url: url })
      .eq('id', req.user.id);

    success(res, { avatar_url: url }, 'Avatar updated');
  } catch (err) {
    error(res, err.message);
  }
};

// ── Delete product image ──────────────────────────────
exports.deleteProductImage = async (req, res) => {
  try {
    const { data: img } = await supabase
      .from('product_images')
      .select('public_id')
      .eq('id', req.params.imageId)
      .single();

    if (img?.public_id) await deleteFromCloudinary(img.public_id);
    await supabase.from('product_images').delete().eq('id', req.params.imageId);

    success(res, {}, 'Image deleted');
  } catch (err) {
    error(res, err.message);
  }
};
