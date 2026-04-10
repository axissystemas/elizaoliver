'use client';

import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import { useCallback, useState, useEffect } from 'react';

export type FeatureKey = 
  | 'mod_patients' 
  | 'mod_evaluations' 
  | 'mod_calendar' 
  | 'mod_protocols' 
  | 'mod_financial' 
  | 'mod_reports' 
  | 'mod_inventory' 
  | 'mod_billing' 
  | 'mod_audit' 
  | 'mod_users';

export type LimitKey = 
  | 'max_patients' 
  | 'max_professional_agendas' 
  | 'max_active_users';

interface QuotaStatus {
  quota: number | null;
  usage: number;
  isUnlimited: boolean;
  isExceeded: boolean;
  loading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  
  const hasFeature = useCallback((featureKey: FeatureKey): boolean => {
    if (!user || !user.subscription) return false;
    if (user.role === 'ADMIN' && !user.organizationId) return true; // Para admins globais se existirem
    return user.subscription.entitlements.includes(featureKey);
  }, [user]);

  const checkQuota = useCallback(async (limitKey: LimitKey): Promise<QuotaStatus> => {
    const status: QuotaStatus = { quota: null, usage: 0, isUnlimited: true, isExceeded: false, loading: true };
    
    if (!supabase || !user) return { ...status, loading: false };

    try {
      const { data, error } = await supabase.rpc('get_quota_usage', { p_limit_key: limitKey });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const row = data[0];
        return {
          quota: row.r_quota_value,
          usage: row.r_current_usage,
          isUnlimited: row.r_is_unlimited,
          isExceeded: !row.r_is_unlimited && row.r_current_usage >= row.r_quota_value,
          loading: false
        };
      }
    } catch (err) {
      console.error(`Error checking quota ${limitKey}:`, JSON.stringify(err, null, 2));
    }
    
    return { ...status, loading: false };
  }, [user]);

  return {
    hasFeature,
    checkQuota,
    plan: user?.subscription?.planName || 'Nenhum',
    planCode: user?.subscription?.planCode || 'NONE'
  };
}
