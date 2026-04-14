'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Helper for admin client
const getAdminSupabase = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
};

export async function getOrganizationsWithPlans(adminUserId: string) {
  const supabase = getAdminSupabase();
  
  // Verify if caller is really ADMIN to prevent abuse
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminUserId)
    .single();
    
  if (adminProfile?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Fetch organizations with their current active subscription and their associated users (profiles)
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      created_at,
      profiles (
        name,
        email,
        role
      ),
      organization_subscriptions (
        plan_id,
        status,
        current_period_start,
        next_payment_date
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  
  return orgs;
}

export async function forcePlanActivation(adminUserId: string, organizationId: string, planId: string) {
  const supabase = getAdminSupabase();
  
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminUserId)
    .single();
    
  if (adminProfile?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Upsert the subscription
  const { error } = await supabase.from('organization_subscriptions').upsert({
    organization_id: organizationId,
    plan_id: planId,
    status: 'active',
    current_period_start: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // We can clear mercado_pago fields since it's a manual activation, or leave them.
    // Let's set a fake subscription id to indicate it was manual.
    mercado_pago_subscription_id: 'MANUAL_ACTIVATION_' + Math.random().toString(36).substr(2, 9)
  }, { onConflict: 'organization_id' });

  if (error) {
    console.error('Error forcing plan activation:', error);
    throw new Error(error.message);
  }

  return { success: true };
}
