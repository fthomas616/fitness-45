import { supabase } from '../lib/supabase.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const APP_URL = process.env.APP_URL || 'https://your-app.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, pin } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!pin || !/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'A 4-digit PIN is required' });

  // Verify caller is admin via their Supabase token
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user || user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin only' });
  }

  // Check if already invited/registered
  const { data: existing } = await supabase
    .from('invites')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) return res.status(409).json({ error: 'Already invited' });

  // Create invite record
  const { error: insertErr } = await supabase
    .from('invites')
    .insert({ email: email.toLowerCase(), invited_by: user.id, status: 'pending' });

  if (insertErr) return res.status(500).json({ error: 'Failed to record invite' });

  // Send magic link via Supabase auth (it emails the user)
  const { data: invitedData, error: otpErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${APP_URL}/onboard`
  });

  if (otpErr) {
    // Rollback invite record
    await supabase.from('invites').delete().eq('email', email.toLowerCase());
    return res.status(500).json({ error: otpErr.message });
  }

  // Set the invitee's password to the padded PIN so they can pass the PIN gate
  const newUserId = invitedData?.user?.id;
  if (newUserId) {
    const padded = `f45.${pin}.pwd`;
    await supabase.auth.admin.updateUserById(newUserId, { password: padded });
  }

  return res.status(200).json({ success: true, message: `Invite sent to ${email}`, pin });
}
