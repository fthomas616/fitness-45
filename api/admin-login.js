import { supabase } from '../lib/supabase.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PIN = process.env.ADMIN_PIN;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin } = req.body || {};
  if (!pin) return res.status(400).json({ error: 'PIN required' });
  if (!ADMIN_PIN || !ADMIN_EMAIL) return res.status(500).json({ error: 'Server not configured' });
  if (String(pin) !== String(ADMIN_PIN)) return res.status(403).json({ error: 'Invalid PIN' });

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: ADMIN_EMAIL
  });
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ action_link: data.properties.action_link });
}
