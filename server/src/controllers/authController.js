const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');
const supabase  = require('../config/supabase');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');
const { success, error } = require('../utils/apiResponse');

// Helper: send token cookie
const sendToken = (res, user, statusCode = 200, message = 'Success') => {
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  const { password_hash, reset_token, ...safeUser } = user;

  res.status(statusCode)
    .cookie('token', token, options)
    .json({ success: true, message, token, user: safeUser });
};

// ── REGISTER ──────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check existing
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email.toLowerCase()).single();
    if (existing) return error(res, 'Email already registered', 400);

    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error: dbErr } = await supabase
      .from('users')
      .insert({ name, email: email.toLowerCase(), password_hash, phone })
      .select('id,name,email,role,phone,avatar_url,created_at')
      .single();

    if (dbErr) return error(res, dbErr.message, 500);

    // Send welcome email (non-blocking)
    const tpl = emailTemplates.welcome(name);
    sendEmail({ to: email, ...tpl }).catch(() => {});

    sendToken(res, user, 201, 'Registration successful');
  } catch (err) {
    error(res, err.message);
  }
};

// ── LOGIN ──────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error: dbErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (dbErr || !user) return error(res, 'Invalid email or password', 401);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return error(res, 'Invalid email or password', 401);

    sendToken(res, user, 200, 'Login successful');
  } catch (err) {
    error(res, err.message);
  }
};

// ── LOGOUT ────────────────────────────────────────────
exports.logout = (req, res) => {
  res.cookie('token', '', { expires: new Date(0), httpOnly: true });
  success(res, {}, 'Logged out successfully');
};

// ── GET PROFILE ───────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id,name,email,phone,role,avatar_url,is_email_verified,created_at')
      .eq('id', req.user.id)
      .single();

    const { data: addresses } = await supabase
      .from('addresses').select('*').eq('user_id', req.user.id);

    success(res, { user: { ...user, addresses: addresses || [] } });
  } catch (err) {
    error(res, err.message);
  }
};

// ── UPDATE PROFILE ────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const { data: user, error: dbErr } = await supabase
      .from('users')
      .update({ name, phone, updated_at: new Date() })
      .eq('id', req.user.id)
      .select('id,name,email,phone,avatar_url,role')
      .single();

    if (dbErr) return error(res, dbErr.message, 500);
    success(res, { user }, 'Profile updated');
  } catch (err) {
    error(res, err.message);
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const { data: user } = await supabase
      .from('users').select('password_hash').eq('id', req.user.id).single();

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) return error(res, 'Current password is incorrect', 400);

    const password_hash = await bcrypt.hash(newPassword, 12);
    await supabase.from('users').update({ password_hash }).eq('id', req.user.id);

    success(res, {}, 'Password changed successfully');
  } catch (err) {
    error(res, err.message);
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const { data: user } = await supabase
      .from('users').select('id,name,email').eq('email', email.toLowerCase()).single();

    if (!user) return error(res, 'No account found with that email', 404);

    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expire = new Date(Date.now() + 15 * 60 * 1000);

    await supabase.from('users').update({
      reset_token: hashedToken,
      reset_token_expire: expire,
    }).eq('id', user.id);

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const tpl = emailTemplates.resetPassword(resetUrl);

    await sendEmail({ to: email, ...tpl });
    success(res, {}, 'Password reset email sent');
  } catch (err) {
    error(res, err.message);
  }
};

// ── RESET PASSWORD ────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('reset_token', hashedToken)
      .gt('reset_token_expire', new Date().toISOString())
      .single();

    if (!user) return error(res, 'Invalid or expired reset token', 400);

    const password_hash = await bcrypt.hash(req.body.password, 12);

    await supabase.from('users').update({
      password_hash,
      reset_token: null,
      reset_token_expire: null,
    }).eq('id', user.id);

    sendToken(res, user, 200, 'Password reset successful');
  } catch (err) {
    error(res, err.message);
  }
};

// ── ADD ADDRESS ───────────────────────────────────────
exports.addAddress = async (req, res) => {
  try {
    const { name, phone, address_line1, address_line2, city, state, pincode, is_default } = req.body;

    if (is_default) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', req.user.id);
    }

    const { data: address, error: dbErr } = await supabase
      .from('addresses')
      .insert({ user_id: req.user.id, name, phone, address_line1, address_line2, city, state, pincode, is_default: !!is_default })
      .select().single();

    if (dbErr) return error(res, dbErr.message, 500);
    success(res, { address }, 'Address added', 201);
  } catch (err) {
    error(res, err.message);
  }
};

// ── DELETE ADDRESS ────────────────────────────────────
exports.deleteAddress = async (req, res) => {
  try {
    await supabase.from('addresses').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    success(res, {}, 'Address deleted');
  } catch (err) {
    error(res, err.message);
  }
};
