# 🌿 Yara Nature — Backend API

Production-ready Node.js + Express backend using **Supabase (PostgreSQL)**.

---

## 🚀 Quick Start

```bash
cd server
cp .env.example .env      # fill in your keys
npm install
npm run dev               # starts on http://localhost:5000
```

---

## ⚙️ Setup Steps

### 1. Supabase
1. Create project at https://supabase.com
2. Go to **SQL Editor** → paste entire contents of `src/db/schema.sql` → Run
3. Copy **Project URL** and **service_role key** into `.env`

### 2. Razorpay
1. Sign up at https://dashboard.razorpay.com
2. Copy **Key ID** and **Key Secret** into `.env`

### 3. Gmail (Nodemailer)
1. Enable 2FA on your Gmail account
2. Create **App Password** at https://myaccount.google.com/apppasswords
3. Add email + app password to `.env`

### 4. Cloudinary (Image Uploads)
1. Sign up at https://cloudinary.com
2. Copy cloud name, API key, API secret into `.env`

### 5. Create Admin User
After running the schema, insert an admin directly in Supabase Table Editor:
```sql
-- Run in Supabase SQL Editor after registering via /api/auth/register
UPDATE users SET role = 'admin' WHERE email = 'admin@yaranature.com';
```

---

## 📁 Project Structure

```
server/
├── server.js                  # Entry point
├── src/
│   ├── config/
│   │   └── supabase.js        # Supabase client
│   ├── controllers/           # Business logic
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── cartController.js
│   │   ├── orderController.js
│   │   ├── reviewController.js
│   │   ├── contactController.js
│   │   ├── faqController.js
│   │   ├── couponController.js
│   │   ├── adminController.js
│   │   ├── analyticsController.js
│   │   └── uploadController.js
│   ├── routes/                # Express routers
│   ├── middleware/
│   │   ├── auth.js            # JWT protect + adminOnly
│   │   ├── errorHandler.js
│   │   ├── validate.js
│   │   └── upload.js          # Multer + Cloudinary
│   ├── utils/
│   │   ├── sendEmail.js       # Nodemailer + templates
│   │   ├── apiResponse.js
│   │   └── slugify.js
│   └── db/
│       └── schema.sql         # Full PostgreSQL schema
├── .env.example
├── render.yaml                # Render deployment config
└── README.md
```

---

## 📡 API Documentation

**Base URL:** `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <token>`

---

### 🔐 Auth  `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login, returns JWT |
| POST | `/logout` | ✅ | Logout |
| GET  | `/me` | ✅ | Get profile |
| PUT  | `/me` | ✅ | Update profile |
| PUT  | `/password` | ✅ | Change password |
| POST | `/forgot-password` | ❌ | Send reset email |
| PUT  | `/reset-password/:token` | ❌ | Reset password |
| POST | `/address` | ✅ | Add address |
| DELETE | `/address/:id` | ✅ | Delete address |

**Register body:**
```json
{ "name": "Neha Sharma", "email": "neha@email.com", "password": "pass123", "phone": "9999999999" }
```

---

### 🌿 Products  `/api/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/` | ❌ | Get all products (search, filter, page) |
| GET  | `/search?q=` | ❌ | Search suggestions |
| GET  | `/:id` | ❌ | Get single product |
| POST | `/` | 🔒 Admin | Create product |
| PUT  | `/:id` | 🔒 Admin | Update product |
| DELETE | `/:id` | 🔒 Admin | Soft delete product |

**Query params for GET /:** `search`, `category`, `sort`, `order`, `page`, `limit`, `featured`

---

### 🛒 Cart  `/api/cart`  *(auth required)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/` | Get cart with totals |
| POST | `/` | Add item `{productId, quantity}` |
| PUT  | `/:itemId` | Update quantity |
| DELETE | `/:itemId` | Remove item |

---

### 📦 Orders  `/api/orders`  *(auth required)*

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/razorpay` | ✅ | Create Razorpay order `{amount}` |
| POST | `/` | ✅ | Place order after payment |
| GET  | `/my` | ✅ | My orders |
| GET  | `/:id` | ✅ | Single order |
| PUT  | `/:id/cancel` | ✅ | Cancel order |
| GET  | `/` | 🔒 Admin | All orders |
| PUT  | `/:id/status` | 🔒 Admin | Update status |

---

### ⭐ Reviews  `/api/reviews`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/:productId` | ❌ | Get approved reviews |
| POST | `/` | ✅ | Submit review |
| GET  | `/` | 🔒 Admin | All reviews |
| PUT  | `/:id` | 🔒 Admin | Approve/reject |
| DELETE | `/:id` | 🔒 Admin | Delete review |

---

### 📩 Contact  `/api/contact`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | ❌ | Submit contact form |
| GET  | `/` | 🔒 Admin | All contacts |
| PUT  | `/:id` | 🔒 Admin | Update status |
| DELETE | `/:id` | 🔒 Admin | Delete contact |

---

### ❓ FAQs  `/api/faqs`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/` | ❌ | All active FAQs |
| POST | `/` | 🔒 Admin | Create FAQ |
| PUT  | `/:id` | 🔒 Admin | Update FAQ |
| DELETE | `/:id` | 🔒 Admin | Delete FAQ |

---

### 🏷️ Coupons  `/api/coupons`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/apply` | ✅ | Apply coupon `{code, orderValue}` |
| GET  | `/` | 🔒 Admin | All coupons |
| POST | `/` | 🔒 Admin | Create coupon |
| DELETE | `/:id` | 🔒 Admin | Delete coupon |

---

### 🖼️ Upload  `/api/upload`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/product/:productId` | 🔒 Admin | Upload product images (multipart) |
| POST | `/avatar` | ✅ | Upload user avatar |
| DELETE | `/product/image/:imageId` | 🔒 Admin | Delete product image |

---

### 📊 Admin  `/api/admin`  *(admin only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/dashboard` | Stats + recent orders + top products |
| GET  | `/users` | All customers |
| GET  | `/revenue-chart` | Last 30 days revenue |

---

### 📈 Analytics  `/api/analytics`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/track` | ❌ | Track page visit |
| GET  | `/` | 🔒 Admin | Analytics data |

---

## 🌐 Deployment (Render)

1. Push `server/` folder to GitHub
2. Go to https://render.com → New Web Service
3. Connect your repo
4. Set **Build Command:** `npm install`
5. Set **Start Command:** `npm start`
6. Add all environment variables from `.env.example`
7. Deploy ✅

---

## 🔒 Security Features

- ✅ Helmet (HTTP security headers)
- ✅ Rate limiting (100 req/15min globally, 20 for auth)
- ✅ JWT authentication with httpOnly cookies
- ✅ bcrypt password hashing (12 rounds)
- ✅ express-validator input validation
- ✅ CORS with origin whitelist
- ✅ Supabase Row Level Security (service role on backend)
- ✅ Razorpay signature verification
- ✅ File type + size validation on uploads

---

## 📧 Email Templates

- Welcome email on registration
- Order confirmation with items table
- Shipping notification
- Password reset with 15-min expiry link
- Contact form notification to admin
