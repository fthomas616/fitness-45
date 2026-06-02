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
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('challenge_settings')
      .select('start_date, updated_at')
      .eq('id', 1)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST { start_date: 'YYYY-MM-DD' } — admin only; resets challenge for everyone
  if (req.method === 'POST') {
    if (user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Admin only' });
    const { start_date } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(start_date || ''))) {
      return res.status(400).json({ error: 'start_date must be YYYY-MM-DD' });
    }

    const { error: upErr } = await supabase
      .from('challenge_settings')
      .update({ start_date, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (upErr) return res.status(500).json({ error: upErr.message });

    // Wipe all workouts, weights, and clear start_weight on every profile.
    const [w1, w2, w3] = await Promise.all([
      supabase.from('workouts').delete().not('id', 'is', null),
      supabase.from('weights').delete().not('id', 'is', null),
      supabase.from('profiles').update({ start_weight: null }).not('id', 'is', null)
    ]);
    const err = w1.error || w2.error || w3.error;
    if (err) return res.status(500).json({ error: err.message });

    return res.status(200).json({ success: true, start_date });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
