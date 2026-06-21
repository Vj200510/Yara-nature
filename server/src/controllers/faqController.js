const supabase = require('../config/supabase');
const { success, error } = require('../utils/apiResponse');

exports.getFAQs = async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase.from('faqs').select('*').eq('is_active', true).order('sort_order');
    if (category) query = query.eq('category', category);
    const { data: faqs } = await query;
    success(res, { faqs: faqs || [] });
  } catch (err) { error(res, err.message); }
};

exports.createFAQ = async (req, res) => {
  try {
    const { question, answer, category, sort_order } = req.body;
    const { data, error: dbErr } = await supabase.from('faqs')
      .insert({ question, answer, category, sort_order }).select().single();
    if (dbErr) return error(res, dbErr.message, 500);
    success(res, { faq: data }, 'FAQ created', 201);
  } catch (err) { error(res, err.message); }
};

exports.updateFAQ = async (req, res) => {
  try {
    const { data, error: dbErr } = await supabase.from('faqs')
      .update({ ...req.body, updated_at: new Date() }).eq('id', req.params.id).select().single();
    if (dbErr) return error(res, dbErr.message, 500);
    success(res, { faq: data }, 'FAQ updated');
  } catch (err) { error(res, err.message); }
};

exports.deleteFAQ = async (req, res) => {
  try {
    await supabase.from('faqs').delete().eq('id', req.params.id);
    success(res, {}, 'FAQ deleted');
  } catch (err) { error(res, err.message); }
};
