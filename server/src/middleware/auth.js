const jwt      = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { error } = require('../utils/apiResponse');

// Verify JWT and attach user to req
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) return error(res, 'Not authenticated. Please login.', 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error: dbErr } = await supabase
      .from('users')
      .select('id, name, email, role, phone, avatar_url')
      .eq('id', decoded.id)
      .single();

    if (dbErr || !user) return error(res, 'User not found', 401);

    req.user = user;
    next();
  } catch (err) {
    return error(res, 'Invalid token', 401);
  }
};

// Admin only
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return error(res, 'Admin access required', 403);
  }
  next();
};
