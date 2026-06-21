-- ═══════════════════════════════════════════════════════
--  YARA NATURE — SUPABASE POSTGRESQL SCHEMA
--  Run this entire file in Supabase SQL Editor once
-- ═══════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────── USERS ───────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  password_hash   TEXT NOT NULL,
  role            TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  avatar_url      TEXT DEFAULT '',
  is_email_verified BOOLEAN DEFAULT FALSE,
  reset_token     TEXT,
  reset_token_expire TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────── ADDRESSES ───────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city         TEXT NOT NULL,
  state        TEXT NOT NULL,
  pincode      TEXT NOT NULL,
  is_default   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────── PRODUCTS ───────────────────
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  mrp         NUMERIC(10,2) NOT NULL,
  discount    INTEGER DEFAULT 0,
  stock       INTEGER DEFAULT 0,
  sold        INTEGER DEFAULT 0,
  category    TEXT DEFAULT 'Hair Oil',
  size        TEXT DEFAULT '100ml',
  ingredients TEXT[],
  benefits    TEXT[],
  how_to_use  TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  ratings     NUMERIC(3,2) DEFAULT 0,
  num_reviews INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────── PRODUCT IMAGES ───────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  public_id  TEXT,
  url        TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- ─────────────────── CARTS ───────────────────
CREATE TABLE IF NOT EXISTS carts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id    UUID REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price      NUMERIC(10,2),
  UNIQUE(cart_id, product_id)
);

-- ─────────────────── ORDERS ───────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES users(id),
  items_price           NUMERIC(10,2) NOT NULL,
  tax_price             NUMERIC(10,2) DEFAULT 0,
  shipping_price        NUMERIC(10,2) DEFAULT 0,
  discount_amount       NUMERIC(10,2) DEFAULT 0,
  total_price           NUMERIC(10,2) NOT NULL,
  coupon_code           TEXT,
  order_status          TEXT DEFAULT 'processing' CHECK (order_status IN ('processing','confirmed','shipped','delivered','cancelled')),
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  payment_status        TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed')),
  paid_at               TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,
  -- Shipping address snapshot
  shipping_name         TEXT,
  shipping_phone        TEXT,
  shipping_address1     TEXT,
  shipping_address2     TEXT,
  shipping_city         TEXT,
  shipping_state        TEXT,
  shipping_pincode      TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  name       TEXT NOT NULL,
  price      NUMERIC(10,2) NOT NULL,
  quantity   INTEGER NOT NULL,
  image_url  TEXT
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────── REVIEWS ───────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  name       TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT NOT NULL,
  approved   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ─────────────────── CONTACTS ───────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  status     TEXT DEFAULT 'new' CHECK (status IN ('new','read','replied')),
  reply_note TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────── FAQS ───────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  category   TEXT DEFAULT 'General',
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────── COUPONS ───────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  discount_type   TEXT DEFAULT 'percent' CHECK (discount_type IN ('percent','flat')),
  discount_value  NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_discount    NUMERIC(10,2),
  usage_limit     INTEGER,
  used_count      INTEGER DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_usage (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id  UUID REFERENCES coupons(id),
  user_id    UUID REFERENCES users(id),
  order_id   UUID REFERENCES orders(id),
  used_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────── ANALYTICS ───────────────────
CREATE TABLE IF NOT EXISTS analytics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_date  DATE DEFAULT CURRENT_DATE,
  visitors    INTEGER DEFAULT 0,
  page_views  INTEGER DEFAULT 0,
  orders      INTEGER DEFAULT 0,
  revenue     NUMERIC(10,2) DEFAULT 0,
  new_users   INTEGER DEFAULT 0,
  UNIQUE(event_date)
);

-- ─────────────────── SEED: Default Product ───────────────────
INSERT INTO products (name, slug, description, price, mrp, discount, stock, category, size, ingredients, benefits, is_featured, is_active)
VALUES (
  'Yara Nature Herbal Hair Growth Oil',
  'yara-nature-herbal-hair-growth-oil',
  'A 100% natural, chemical-free herbal hair oil made with Fenugreek, Clove, Rosemary, Vitamin E and Natural Oils. Reduces hair fall, promotes new growth and adds natural shine.',
  349.00, 499.00, 30, 500,
  'Hair Oil', '100ml',
  ARRAY['Fenugreek','Clove','Rosemary','Vitamin E','Natural Base Oils'],
  ARRAY['Reduces Hair Fall','Promotes Hair Growth','Fights Dandruff','Adds Natural Shine','Strengthens Roots'],
  TRUE, TRUE
) ON CONFLICT (slug) DO NOTHING;

-- ─────────────────── SEED: FAQs ───────────────────
INSERT INTO faqs (question, answer, category, sort_order) VALUES
('How often should I use the oil?','For best results, apply 2–3 times per week. Massage into the scalp and leave for 30 minutes before washing.','Usage',1),
('Is it safe for colour-treated hair?','Yes, it is 100% natural and safe for all hair types including chemically treated hair.','Safety',2),
('When will I see visible results?','Most customers notice improvement within 30 days of consistent use.','Results',3),
('Can both men and women use this?','Absolutely! It is formulated for all genders and hair types.','Usage',4)
ON CONFLICT DO NOTHING;

-- ─────────────────── SEED: Sample Coupon ───────────────────
INSERT INTO coupons (code, discount_type, discount_value, min_order_value, usage_limit)
VALUES ('YARA10', 'percent', 10, 299, 100)
ON CONFLICT (code) DO NOTHING;
