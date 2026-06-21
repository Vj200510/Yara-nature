const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
};

// ── Email templates ──────────────────────────────────────
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to Yara Nature! 🌿',
    html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#f5f0e6;padding:0">
      <div style="background:#2d4a2b;padding:24px;text-align:center">
        <h1 style="color:#c9a227;font-size:28px;margin:0">YARA NATURE</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Pure Wellness from Nature</p>
      </div>
      <div style="padding:32px 24px">
        <h2 style="color:#2d4a2b">Welcome, ${name}! 🎉</h2>
        <p style="color:#555;line-height:1.7">Thank you for joining the Yara Nature family. Enjoy <strong>100% natural, chemical-free</strong> hair care crafted from ancient Ayurvedic wisdom.</p>
        <a href="${process.env.CLIENT_URL}" style="display:inline-block;margin-top:20px;background:#2d4a2b;color:#fff;padding:12px 28px;border-radius:4px;text-decoration:none;font-weight:700">Shop Now →</a>
      </div>
      <div style="background:#2d4a2b;padding:16px;text-align:center;color:rgba(255,255,255,0.5);font-size:12px">
        © 2026 Yara Nature. All rights reserved.
      </div>
    </div>`,
  }),

  orderConfirmation: (order, items) => ({
    subject: `Order Confirmed #${order.id.slice(0,8).toUpperCase()} 🌿`,
    html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#2d4a2b;padding:24px;text-align:center">
        <h1 style="color:#c9a227;margin:0">YARA NATURE</h1>
      </div>
      <div style="padding:32px 24px;background:#f5f0e6">
        <h2 style="color:#2d4a2b">Order Confirmed! ✅</h2>
        <p style="color:#555">Your order <strong>#${order.id.slice(0,8).toUpperCase()}</strong> has been placed successfully.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          ${items.map(i => `<tr><td style="padding:8px;border-bottom:1px solid #ddd">${i.name} x${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">₹${(i.price * i.quantity).toFixed(2)}</td></tr>`).join('')}
          <tr><td style="padding:8px;font-weight:700">Total</td><td style="padding:8px;font-weight:700;text-align:right">₹${order.total_price}</td></tr>
        </table>
        <p style="color:#555;font-size:13px">We will notify you when your order is shipped.</p>
      </div>
    </div>`,
  }),

  orderShipped: (order) => ({
    subject: `Your Yara Nature Order is Shipped! 🚚`,
    html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#2d4a2b;padding:24px;text-align:center">
        <h1 style="color:#c9a227;margin:0">YARA NATURE</h1>
      </div>
      <div style="padding:32px 24px;background:#f5f0e6">
        <h2 style="color:#2d4a2b">Your Order is on the Way! 🚚</h2>
        <p style="color:#555">Order <strong>#${order.id.slice(0,8).toUpperCase()}</strong> has been shipped and is on its way to you.</p>
        <p style="color:#555">Expected delivery: <strong>3–7 business days</strong></p>
      </div>
    </div>`,
  }),

  resetPassword: (resetUrl) => ({
    subject: 'Reset Your Yara Nature Password',
    html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#2d4a2b;padding:24px;text-align:center">
        <h1 style="color:#c9a227;margin:0">YARA NATURE</h1>
      </div>
      <div style="padding:32px 24px;background:#f5f0e6">
        <h2 style="color:#2d4a2b">Password Reset Request</h2>
        <p style="color:#555">Click the button below to reset your password. This link expires in 15 minutes.</p>
        <a href="${resetUrl}" style="display:inline-block;margin-top:20px;background:#2d4a2b;color:#fff;padding:12px 28px;border-radius:4px;text-decoration:none;font-weight:700">Reset Password</a>
        <p style="color:#999;font-size:12px;margin-top:20px">If you did not request this, ignore this email.</p>
      </div>
    </div>`,
  }),

  contactAdmin: (contact) => ({
    subject: `New Contact Form: ${contact.subject || 'General Inquiry'}`,
    html: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#2d4a2b">New Contact Form Submission</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;font-weight:700;width:120px">Name</td><td style="padding:8px">${contact.name}</td></tr>
        <tr><td style="padding:8px;font-weight:700">Email</td><td style="padding:8px">${contact.email}</td></tr>
        <tr><td style="padding:8px;font-weight:700">Phone</td><td style="padding:8px">${contact.phone || '-'}</td></tr>
        <tr><td style="padding:8px;font-weight:700">Subject</td><td style="padding:8px">${contact.subject || '-'}</td></tr>
        <tr><td style="padding:8px;font-weight:700;vertical-align:top">Message</td><td style="padding:8px">${contact.message}</td></tr>
      </table>
    </div>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
