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

export async function getOrganizationsWithPlans() {
  const supabase = getAdminSupabase();
  
  // Verify authenticated user session securely on the server
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Verify if authenticated user is really ADMIN
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
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

export async function forcePlanActivation(organizationId: string, planId: string) {
  const supabase = getAdminSupabase();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
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
    mercado_pago_subscription_id: 'MANUAL_ACTIVATION_' + Math.random().toString(36).substr(2, 9)
  }, { onConflict: 'organization_id' });

  if (error) {
    console.error('Error forcing plan activation:', error);
    throw new Error(error.message);
  }

  return { success: true };
}

export async function deleteUserAction(targetUserId: string) {
  const supabase = getAdminSupabase();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (adminProfile?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  // Deleta o usuário diretamente do Supabase Auth Admin API (usando a Service Role Key)
  const { error } = await supabase.auth.admin.deleteUser(targetUserId);
  
  if (error) {
    console.warn('Supabase Auth Admin deleteUser avisou/falhou, tentando exclusão direta na tabela profiles:', error.message);
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', targetUserId);
    if (profileError && error.message) {
      throw new Error(error.message || profileError.message);
    }
  }

  return { success: true };
}
