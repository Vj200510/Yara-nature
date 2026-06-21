const supabase = require('../config/supabase');
const { success, error } = require('../utils/apiResponse');

// ── DASHBOARD STATS ───────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [
      { count: totalOrders },
      { count: totalUsers },
      { count: totalProducts },
      { count: pendingReviews },
      { count: newContacts },
      { data: revenueData },
      { data: recentOrders },
      { data: topProducts },
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('approved', false),
      supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('orders').select('total_price').eq('payment_status', 'paid'),
      supabase.from('orders').select('id,total_price,order_status,created_at,shipping_name').order('created_at', { ascending: false }).limit(5),
      supabase.from('products').select('id,name,sold,price').order('sold', { ascending: false }).limit(5),
    ]);

    const totalRevenue = revenueData?.reduce((s, o) => s + +o.total_price, 0) || 0;

    success(res, {
      stats: { totalOrders, totalUsers, totalProducts, pendingReviews, newContacts, totalRevenue: +totalRevenue.toFixed(2) },
      recentOrders: recentOrders || [],
      topProducts: topProducts || [],
    });
  } catch (err) {
    error(res, err.message);
  }
};

// ── ALL USERS ─────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { data: users, count } = await supabase
      .from('users')
      .select('id,name,email,phone,role,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    success(res, { users, total: count });
  } catch (err) { error(res, err.message); }
};

// ── REVENUE CHART (last 30 days) ─────────────────────
exports.getRevenueChart = async (req, res) => {
  try {
    const { data } = await supabase
      .from('orders')
      .select('total_price,created_at')
      .eq('payment_status', 'paid')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Group by date
    const grouped = {};
    (data || []).forEach(o => {
      const d = o.created_at.split('T')[0];
      grouped[d] = (grouped[d] || 0) + +o.total_price;
    });

    success(res, { chart: Object.entries(grouped).map(([date, revenue]) => ({ date, revenue })) });
  } catch (err) { error(res, err.message); }
};
