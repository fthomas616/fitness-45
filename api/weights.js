import { supabase } from '../lib/supabase.js';

async function getAuthUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export default async function handler(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // GET — all weight entries (everyone can read)
  if (req.method === 'GET') {
    const { user_id } = req.query;
    let query = supabase
      .from('weights')
      .select('id, user_id, day, value, logged_at')
      .order('day');
    if (user_id) query = query.eq('user_id', user_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST — log a weight entry (upsert by user+day)
  if (req.method === 'POST') {
    const { day, value } = req.body;
    if (!day || !value) return res.status(400).json({ error: 'day and value required' });

    const { data, error } = await supabase
      .from('weights')
      .upsert({ user_id: user.id, day, value }, { onConflict: 'user_id,day' })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
