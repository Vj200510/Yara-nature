const supabase = require('../config/supabase');
const { success, error } = require('../utils/apiResponse');

// ── Track a page visit (called from frontend) ─────────
exports.trackVisit = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Upsert today's row, increment visitors
    await supabase.rpc('increment_analytics', {
      p_date:  today,
      p_field: 'visitors',
      p_value: 1,
    }).catch(() => {
      // Fallback: manual upsert
      return supabase.from('analytics').upsert(
        { event_date: today, visitors: 1 },
        { onConflict: 'event_date', ignoreDuplicates: false }
      );
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(200).json({ success: true }); // never block frontend
  }
};

// ── Get analytics summary (admin) ─────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const { data } = await supabase
      .from('analytics')
      .select('*')
      .gte('event_date', since)
      .order('event_date', { ascending: true });

    // Totals
    const totals = (data || []).reduce((acc, row) => ({
      visitors:  acc.visitors  + (row.visitors  || 0),
      pageViews: acc.pageViews + (row.page_views || 0),
      revenue:   acc.revenue   + (row.revenue   || 0),
      orders:    acc.orders    + (row.orders     || 0),
    }), { visitors: 0, pageViews: 0, revenue: 0, orders: 0 });

    success(res, { data: data || [], totals });
  } catch (err) {
    error(res, err.message);
  }
};
