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

  // DELETE /api/admin?invite_id=xxx — revoke invite
  // DELETE /api/admin?user_id=xxx — wipe member's profile, workouts, weights (auth user kept so they can re-login)
  if (req.method === 'DELETE') {
    const { invite_id, user_id } = req.query;
    if (user_id) {
      const [profErr, wkErr, wtErr] = await Promise.all([
        supabase.from('profiles').delete().eq('user_id', user_id),
        supabase.from('workouts').delete().eq('user_id', user_id),
        supabase.from('weights').delete().eq('user_id', user_id)
      ]).then(rs => rs.map(r => r.error));
      const err = profErr || wkErr || wtErr;
      if (err) return res.status(500).json({ error: err.message });
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
