require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// ── Security ──────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

// CORS — allow all localhost origins in dev
app.use(cors({
  origin: (origin, cb) => cb(null, true), // open in dev; restrict in production
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Static files (frontend + admin) ──────────────────
const root = path.join(__dirname, '..');
app.use(express.static(root));
app.use('/admin', express.static(path.join(root, 'admin')));

// ── Rate limiting ─────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests. Try again later.' },
  skip: (req) => process.env.NODE_ENV === 'development',
}));

// ── Body parsing ──────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Health check ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), env: process.env.NODE_ENV });
});

// ── API Routes ────────────────────────────────────────
app.use('/api/auth',      require('./src/routes/authRoutes'));
app.use('/api/products',  require('./src/routes/productRoutes'));
app.use('/api/cart',      require('./src/routes/cartRoutes'));
app.use('/api/orders',    require('./src/routes/orderRoutes'));
app.use('/api/reviews',   require('./src/routes/reviewRoutes'));
app.use('/api/contact',   require('./src/routes/contactRoutes'));
app.use('/api/faqs',      require('./src/routes/faqRoutes'));
app.use('/api/coupons',   require('./src/routes/couponRoutes'));
app.use('/api/admin',     require('./src/routes/adminRoutes'));
app.use('/api/upload',    require('./src/routes/uploadRoutes'));
app.use('/api/analytics', require('./src/routes/analyticsRoutes'));

// ── SPA fallback for admin ────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(root, 'admin', 'login.html')));
app.get('/admin/:file', (req, res) => {
  res.sendFile(path.join(root, 'admin', req.params.file), (err) => {
    if (err) res.sendFile(path.join(root, 'admin', 'login.html'));
  });
});

// ── 404 only for /api routes ──────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API route ${req.originalUrl} not found` });
});

// ── Global error handler ──────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`\n🌿 ══════════════════════════════════════`);
  console.log(`🚀 Yara Nature Server running!`);
  console.log(`📡 API:      http://localhost:${PORT}/api`);
  console.log(`🌐 Website:  http://localhost:${PORT}`);
  console.log(`🔐 Admin:    http://localhost:${PORT}/admin/login.html`);
  console.log(`💚 Health:   http://localhost:${PORT}/health`);
  console.log(`🌿 ══════════════════════════════════════\n`);
});

// Keep alive — prevent accidental exit
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err?.message || err);
});

module.exports = app;
