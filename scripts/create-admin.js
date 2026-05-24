// scripts/create-admin.js
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const { ADMIN_PERMISSIONS } = require('../types/auth');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Supabase URL or Service Role Key missing.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function main() {
  const email = 'admin@example.com';
  const password = 'SenhaSegura123';
  const name = 'Admin Master';

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'ADMIN' },
  });
  if (authError) {
    console.error('auth admin.createUser error:', authError);
    process.exit(1);
  }
  const userId = authData?.user?.id;
  if (!userId) {
    console.error('Failed to get user ID');
    process.exit(1);
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    name,
    email,
    role: 'ADMIN',
    permissions: ADMIN_PERMISSIONS,
    avatar_url: `https://picsum.photos/seed/${userId}/200/200`,
  });
  if (profileError) {
    console.error('profile upsert error:', profileError);
    process.exit(1);
  }

  console.log('Admin user created:', { userId, email, name });
}

main();
