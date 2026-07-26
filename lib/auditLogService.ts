import { supabase, getSupabase } from './supabase';

export type AuditAction = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'EXPORT' 
  | 'IMPORT' 
  | 'ACTIVATE' 
  | 'INACTIVATE' 
  | 'PERMISSION_CHANGE' 
  | 'SETTINGS_CHANGE'
  | 'ACCESS_DENIED';

export type AuditEntityType = 
  | 'AUTH' 
  | 'PATIENTS' 
  | 'FINANCIAL' 
  | 'INVENTORY' 
  | 'APPOINTMENTS' 
  | 'EVALUATIONS' 
  | 'DIETOTHERAPY' 
  | 'PROTOCOLS' 
  | 'BILLING' 
  | 'CLINIC' 
  | 'SYSTEM';

interface LogActionParams {
  action: AuditAction;
  entityType: AuditEntityType;
  details?: Record<string, any>;
  entityId?: string;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
}

// Em memória cache para não consultar o DB a cada ação
let auditEnabledCache: boolean | null = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL = 60000; // 1 minuto
let isBootstrapMode = false;

/**
 * Define se o sistema está em modo bootstrap (inicialização).
 * Durante o bootstrap, os logs são ignorados para evitar concorrência.
 */
export function setBootstrapMode(enabled: boolean) {
  isBootstrapMode = enabled;
  if (enabled) {
    console.log('[AuditLog] Sistema em modo bootstrap. Logs suspensos.');
  } else {
    console.log('[AuditLog] Modo bootstrap finalizado. Logs liberados.');
  }
}

export async function isAuditEnabled(): Promise<boolean> {
  const now = Date.now();
  if (auditEnabledCache !== null && (now - lastCacheUpdate < CACHE_TTL)) {
    return auditEnabledCache;
  }

  try {
    if (!supabase) return false;
    const { data, error } = await supabase
      .from('system_settings')
      .select('audit_enabled')
      .eq('id', 1)
      .single();
    
    if (error || !data) {
      console.error('Erro ao ler configuração de auditoria:', error);
      auditEnabledCache = true; // Fallback seguro
    } else {
      auditEnabledCache = data.audit_enabled ?? true;
    }
  } catch (err) {
    auditEnabledCache = true;
  }
  
  lastCacheUpdate = now;
  return auditEnabledCache;
}

/**
 * Registra uma ação no log de auditoria de forma assíncrona e não-bloqueante.
 */
export async function logAction({ action, entityType, details = {}, entityId, userId, organizationId, ipAddress }: LogActionParams) {
  // Fire-and-forget assíncrono para garantir zero atraso na navegação do usuário
  try {
    if (isBootstrapMode) return;
    const isEnabled = await isAuditEnabled();
    if (!isEnabled) return;

    const client = getSupabase();
    if (!client) return;

    let finalUserId = userId;
    let finalOrgId = organizationId;

    if (!finalUserId || !finalOrgId) {
      const { data: { user } } = await client.auth.getUser();
      if (!finalUserId) finalUserId = user?.id;

      if (!finalOrgId && finalUserId) {
        const { data: profile } = await client
          .from('profiles')
          .select('organization_id')
          .eq('id', finalUserId)
          .single();
        finalOrgId = profile?.organization_id;
      }
    }

    const safeDetails = { ...details };
    if (safeDetails.password) delete safeDetails.password;
    if (safeDetails.newPassword) delete safeDetails.newPassword;
    if (safeDetails.currentPassword) delete safeDetails.currentPassword;

    const clientIp = ipAddress || (typeof window !== 'undefined' ? 'Web App (Navegador)' : 'Servidor (Next.js)');

    const { error } = await client
      .from('audit_logs')
      .insert({
        user_id: finalUserId || null,
        organization_id: finalOrgId || null,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: safeDetails,
        ip_address: clientIp
      });

    if (error) console.error('[AuditLog] Erro ao salvar log:', error.message);
  } catch (err) {
    console.error('[AuditLog] Erro crítico ao processar log:', err);
  }
}
