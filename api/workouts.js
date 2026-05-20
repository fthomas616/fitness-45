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

  // GET /api/workouts?user_id=xxx  (all users readable)
  if (req.method === 'GET') {
    const { user_id } = req.query;
    let query = supabase
      .from('workouts')
      .select('id, user_id, day, description, duration_min, logged_at')
      .order('logged_at', { ascending: false });
    if (user_id) query = query.eq('user_id', user_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST /api/workouts — log a workout for the caller
  if (req.method === 'POST') {
    const { day, description, duration_min } = req.body;
    if (!day || !description) return res.status(400).json({ error: 'day and description required' });

    const { data, error } = await supabase
      .from('workouts')
      .insert({ user_id: user.id, day, description, duration_min: duration_min || 0 })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // DELETE /api/workouts?id=xxx — only own workouts
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // enforce ownership
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
