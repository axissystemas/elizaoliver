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
    if (profileError) {
      if (profileError.code === '23503' || profileError.message?.includes('violates foreign key constraint') || error.message?.includes('violates foreign key constraint')) {
        throw new Error('RESTRICTION');
      }
      throw new Error(profileError.message || error.message);
    }
  }

  return { success: true };
}

export async function toggleUserActiveAction(targetUserId: string, isActive: boolean) {
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

  if (targetUserId === user.id) {
    throw new Error('Você não pode alterar o status do seu próprio usuário.');
  }

  // 1. Atualiza a coluna is_active na tabela profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', targetUserId);

  if (profileError) {
    console.error('Erro ao atualizar status do usuário na tabela profiles:', profileError);
    throw new Error(profileError.message);
  }

  // 2. Tenta atualizar o ban_duration no Auth Admin API para suspender/liberar o login a nível de infraestrutura
  try {
    const banDuration = isActive ? 'none' : '876000h';
    await supabase.auth.admin.updateUserById(targetUserId, {
      ban_duration: banDuration
    });
  } catch (authBanErr) {
    console.warn('Aviso: Não foi possível atualizar o ban_duration no Supabase Auth Admin API:', authBanErr);
  }

  return { success: true, is_active: isActive };
}

