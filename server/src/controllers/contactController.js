const supabase = require('../config/supabase');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');
const { success, error } = require('../utils/apiResponse');

// ── SUBMIT CONTACT FORM ───────────────────────────────
exports.submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    const { data: contact, error: dbErr } = await supabase
      .from('contacts')
      .insert({ name, email: email.toLowerCase(), phone, subject, message })
      .select().single();

    if (dbErr) return error(res, dbErr.message, 500);

    // Email to admin
    const tpl = emailTemplates.contactAdmin(contact);
    sendEmail({ to: process.env.ADMIN_EMAIL, ...tpl }).catch(() => {});

    success(res, { contact }, 'Message sent successfully. We will get back to you soon!', 201);
  } catch (err) {
    error(res, err.message);
  }
};

// ── ADMIN: GET ALL CONTACTS ───────────────────────────
exports.getContacts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = supabase.from('contacts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq('status', status);

    const { data: contacts, count } = await query;
    success(res, { contacts, total: count });
  } catch (err) {
    error(res, err.message);
  }
};

// ── ADMIN: UPDATE CONTACT STATUS ──────────────────────
exports.updateContact = async (req, res) => {
  try {
    const { status, reply_note } = req.body;
    const updates = { status };
    if (reply_note) { updates.reply_note = reply_note; updates.replied_at = new Date(); }

    await supabase.from('contacts').update(updates).eq('id', req.params.id);
    success(res, {}, 'Contact updated');
  } catch (err) {
    error(res, err.message);
  }
};

// ── ADMIN: DELETE CONTACT ─────────────────────────────
exports.deleteContact = async (req, res) => {
  try {
    await supabase.from('contacts').delete().eq('id', req.params.id);
    success(res, {}, 'Contact deleted');
  } catch (err) {
    error(res, err.message);
  }
};
