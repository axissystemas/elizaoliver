import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_PERMISSIONS } from '@/types/auth';

// Environment variables (ensure they exist in .env.local)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key for server‑side admin operations

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Supabase URL or Service Role Key missing.');
}

// Admin client with service role privileges
const adminSupabase = SUPABASE_URL && SERVICE_ROLE_KEY ?
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!adminSupabase) {
    return res.status(500).json({ error: 'Supabase configuration missing' });
  }

  const { email, password, name } = req.body as { email: string; password: string; name: string };

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password and name are required' });
  }

  try {
    // Create user in Auth with ADMIN role
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      // Custom user metadata (role & permissions) stored in the `user_metadata` field
      user_metadata: { role: 'ADMIN' },
    });

    if (authError) {
      console.error('Supabase admin.createUser error:', authError);
      return res.status(500).json({ error: authError.message });
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return res.status(500).json({ error: 'Failed to obtain new user ID' });
    }

    // Insert or upsert profile with full admin permissions
    const { error: profileError } = await adminSupabase.from('profiles').upsert({
      id: userId,
      name,
      email,
      role: 'ADMIN',
      permissions: ADMIN_PERMISSIONS,
      avatar_url: `https://picsum.photos/seed/${userId}/200/200`,
    });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      return res.status(500).json({ error: profileError.message });
    }

    return res.status(200).json({ message: 'Administrador criado com sucesso', userId });
  } catch (err: any) {
    console.error('Unexpected error in create-admin endpoint:', err);
    return res.status(500).json({ error: err.message || 'Erro inesperado' });
  }
}
