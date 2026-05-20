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

  // GET /api/profiles — return all profiles (everyone can read)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, goal, approach, avatar_color, created_at, user_id')
      .order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST /api/profiles — create or update caller's own profile
  if (req.method === 'POST') {
    const { display_name, goal, approach, avatar_color, start_weight } = req.body;
    if (!display_name || !goal) {
      return res.status(400).json({ error: 'display_name and goal are required' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        display_name,
        goal,
        approach: approach || '',
        avatar_color: avatar_color || '#7b61ff',
        start_weight: start_weight || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
