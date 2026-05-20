import { supabase } from '../lib/supabase.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function getAuthUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export default async function handler(req, res) {
  const user = await getAuthUser(req);
  if (!user || user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin only' });
  }

  if (req.method === 'GET') {
    const [invitesRes, usersRes] = await Promise.all([
      supabase.from('invites').select('*').order('created_at', { ascending: false }),
      supabase.auth.admin.listUsers()
    ]);
    return res.status(200).json({
      invites: invitesRes.data || [],
      users: (usersRes.data?.users || []).map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at
      }))
    });
  }

  // POST /api/admin — { user_id, pin } sets the user's password to the padded PIN
  if (req.method === 'POST') {
    const { user_id, pin } = req.body || {};
    if (!user_id || !pin) return res.status(400).json({ error: 'user_id and pin required' });
    if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'PIN must be 4 digits' });
    const padded = `f45.${pin}.pwd`;
    const { error } = await supabase.auth.admin.updateUserById(user_id, { password: padded });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  // DELETE /api/admin?invite_id=xxx — revoke invite
  // DELETE /api/admin?user_id=xxx — delete the auth user; FK cascade removes profile, workouts, weights
  if (req.method === 'DELETE') {
    const { invite_id, user_id } = req.query;
    if (user_id) {
      if (user.id === user_id) return res.status(400).json({ error: 'Cannot delete yourself' });
      const target = await supabase.auth.admin.getUserById(user_id).catch(() => null);
      const email = target?.data?.user?.email;
      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) return res.status(500).json({ error: error.message });
      if (email) await supabase.from('invites').delete().eq('email', email.toLowerCase());
      return res.status(200).json({ success: true });
    }
    if (invite_id) {
      const { error } = await supabase.from('invites').delete().eq('id', invite_id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ error: 'invite_id or user_id required' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
