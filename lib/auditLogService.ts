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

export interface AuditLogEntry {
  id: string;
  user_id?: string | null;
  organization_id?: string | null;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id?: string | null;
  details: any;
  ip_address?: string;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

interface LogActionParams {
  action: AuditAction;
  entityType: AuditEntityType;
  details?: Record<string, any>;
  entityId?: string;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
}

const LOCAL_AUDIT_KEY = 'axis_audit_logs';
let auditEnabledCache: boolean | null = null;
let lastCacheUpdate: number = 0;
const CACHE_TTL = 30000; // 30 segundos

/**
 * Lê os logs armazenados no LocalStorage
 */
export function getLocalAuditLogs(): AuditLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[AuditLog] Erro ao ler LocalStorage:', e);
    return [];
  }
}

/**
 * Salva um novo registro de log no LocalStorage (mantendo os 1.000 mais recentes)
 */
export function saveLocalAuditLog(entry: AuditLogEntry) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalAuditLogs();
    const filtered = existing.filter(item => item.id !== entry.id);
    const updated = [entry, ...filtered].slice(0, 1000);
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[AuditLog] Erro ao salvar log no LocalStorage:', e);
  }
}

export function setBootstrapMode(enabled: boolean) {
  // Desativado bloqueio de bootstrap para garantir gravação 100% contínua
}

export async function isAuditEnabled(): Promise<boolean> {
  const now = Date.now();
  if (auditEnabledCache !== null && (now - lastCacheUpdate < CACHE_TTL)) {
    return auditEnabledCache;
  }

  try {
    const client = getSupabase();
    if (!client) return true;

    const { data, error } = await client
      .from('system_settings')
      .select('audit_enabled')
      .eq('id', 1)
      .maybeSingle();
    
    if (error || !data) {
      auditEnabledCache = true;
    } else {
      auditEnabledCache = data.audit_enabled ?? true;
    }
  } catch (err) {
    auditEnabledCache = true;
  }
  
  lastCacheUpdate = now;
  return auditEnabledCache;
}

let lastLoginLogTime = 0;
let lastLoginLogKey = '';

/**
 * Registra uma ação no log de auditoria de forma assíncrona, híbrida (Nuvem + LocalStorage) e não-bloqueante.
 */
export async function logAction({ action, entityType, details = {}, entityId, userId, organizationId, ipAddress }: LogActionParams) {
  try {
    const isEnabled = await isAuditEnabled();
    if (!isEnabled) return;

    // Evita duplicar o mesmo log de LOGIN dentro de um curto intervalo (3s)
    if (action === 'LOGIN') {
      const currentKey = `${userId || details?.user_email}_${details?.status || 'default'}`;
      const now = Date.now();
      if (now - lastLoginLogTime < 3000 && lastLoginLogKey === currentKey) {
        return;
      }
      lastLoginLogTime = now;
      lastLoginLogKey = currentKey;
    }

    const client = getSupabase();

    let finalUserId = userId;
    let finalOrgId = organizationId;
    let userName = details?.user_name || details?.userName || '';
    let userEmail = details?.user_email || details?.userEmail || '';

    // 1. Tenta carregar do LocalStorage do navegador (perfil ativo da sessão)
    if (typeof window !== 'undefined') {
      try {
        const savedProfile = localStorage.getItem('auriculocare_profile');
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          if (parsed.name && !userName) userName = parsed.name;
          if (parsed.email && !userEmail) userEmail = parsed.email;
        }
      } catch (e) {}
    }

    // 2. Tenta obter dados do usuário do Supabase Auth e perfil
    if (client) {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!finalUserId) finalUserId = user?.id;
        if (user?.email && !userEmail) userEmail = user.email;

        const userMetaData = user?.user_metadata || {};
        if (!userName && (userMetaData.full_name || userMetaData.name)) {
          userName = userMetaData.full_name || userMetaData.name;
        }

        if (finalUserId) {
          const { data: profile } = await client
            .from('profiles')
            .select('name, email, organization_id')
            .eq('id', finalUserId)
            .maybeSingle();

          if (profile) {
            if (profile.name) userName = profile.name;
            if (profile.email) userEmail = profile.email;
            if (!finalOrgId && profile.organization_id) finalOrgId = profile.organization_id;
          }
        }
      } catch (e) {}
    }

    // 3. Fallbacks de nome de usuário para garantir identificação clara
    if (!userName && userEmail) {
      userName = userEmail.split('@')[0];
    }
    if (!userName) {
      userName = 'Administrador do Sistema';
    }
    if (!userEmail) {
      userEmail = finalUserId ? `ID: ${finalUserId.substring(0, 8)}` : 'Sessão Ativa';
    }

    const safeDetails = { ...details };
    if (safeDetails.password) delete safeDetails.password;
    if (safeDetails.newPassword) delete safeDetails.newPassword;
    if (safeDetails.currentPassword) delete safeDetails.currentPassword;

    const clientIp = ipAddress || (typeof window !== 'undefined' ? 'Web App (Navegador)' : 'Servidor (Next.js)');
    const logId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const createdAt = new Date().toISOString();

    const logEntry: AuditLogEntry = {
      id: logId,
      user_id: finalUserId || null,
      organization_id: finalOrgId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: safeDetails,
      ip_address: clientIp,
      created_at: createdAt,
      profiles: {
        name: userName,
        email: userEmail
      }
    };

    // 1. SALVAMENTO HÍBRIDO IMEDIATO NO LOCALSTORAGE
    saveLocalAuditLog(logEntry);

    // Dispara evento para atualização em tempo real da interface se a tela de auditoria estiver aberta
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('axis_audit_log_created', { detail: logEntry }));
    }

    // 2. SINCRONIZAÇÃO EM SEGUNDO PLANO COM SUPABASE NA NUVEM
    if (client) {
      (async () => {
        try {
          const { error } = await client
            .from('audit_logs')
            .insert({
              id: logId,
              user_id: finalUserId || null,
              organization_id: finalOrgId || null,
              action,
              entity_type: entityType,
              entity_id: entityId || null,
              details: safeDetails,
              ip_address: clientIp,
              created_at: createdAt
            });

          if (error) {
            console.warn('[AuditLog] Aviso Supabase Sync:', error.message);
          } else {
            console.log(`[AuditLog] Log registrado com sucesso (Nuvem + Local): [${action}] -> ${entityType}`);
          }
        } catch (err) {
          console.warn('[AuditLog] Erro Supabase Sync:', err);
        }
      })();
    }

  } catch (err) {
    console.error('[AuditLog] Erro crítico em logAction:', err);
  }
}
