'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, checkConnection, getSupabase } from './supabase';
import { User, UserRole, ADMIN_PERMISSIONS, ROLE_PERMISSIONS } from '@/types/auth';
import { logAction, setBootstrapMode } from './auditLogService';

interface AuthContextType {
  user: User | null;
  session: any | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  connectionStatus: 'online' | 'offline' | 'reconnecting';
  refreshConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'reconnecting'>('online');
  const isInitializing = useRef(false);
  const initialFetchDone = useRef(false);

  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    
    // Timer para evitar travamento infinito no carregamento do perfil
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout ao buscar perfil')), 5000)
    );

    try {
      const fetchPromise = supabase
        .from('profiles')
        .select(`
          *,
          organization:organizations (
            name,
            slug,
            subscriptions:organization_subscriptions (
              status,
              next_payment_date,
              mercado_pago_subscription_id,
              plan:saas_plans (
                code,
                name,
                features:saas_plan_features (
                  key:feature_key
                )
              )
            )
          )
        `)
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        throw error;
      }

      if (data) {
        const rawRole = data.role as UserRole;
        const isAdmin = rawRole === 'ADMIN' || data.email === 'auriculusterapia@gmail.com' || data.email === 'suporte@axissystemas.com.br' || data.email === 'ivanjsousa@gmail.com';
        const role = isAdmin ? ('ADMIN' as UserRole) : rawRole;
        
        const finalPermissions = isAdmin 
          ? ADMIN_PERMISSIONS 
          : Array.isArray(data.permissions) && data.permissions.length > 0
            ? data.permissions
            : (ROLE_PERMISSIONS as any)[role] || [];
        
        // Pega a primeira assinatura ativa dentro da organização
        const activeSub = data.organization?.subscriptions?.find((s: any) => s.status === 'active');

        const allModulesEntitlements = [
          'mod_patients', 'mod_evaluations', 'mod_calendar', 'mod_protocols', 
          'mod_financial', 'mod_reports', 'mod_inventory', 'mod_billing', 
          'mod_audit', 'mod_users', 'mod_api', 'mod_whitelabel'
        ];

        const userData: User = {
          id: data.id,
          name: data.name,
          email: data.email,
          role: role,
          avatar: data.avatar_url || undefined,
          permissions: finalPermissions,
          organizationId: data.organization_id,
          organization: data.organization ? {
            name: data.organization.name,
            slug: data.organization.slug
          } : undefined,
          subscription: activeSub ? {
            planCode: activeSub.plan?.code,
            planName: activeSub.plan?.name,
            status: activeSub.status,
            nextPaymentDate: activeSub.next_payment_date,
            externalId: activeSub.mercado_pago_subscription_id,
            entitlements: role === 'ADMIN' ? allModulesEntitlements : (activeSub.plan?.features?.map((f: any) => f.key) || [])
          } : (role === 'ADMIN' ? {
            planCode: 'PREMIUM',
            planName: 'Plano Premium (Admin)',
            status: 'active',
            entitlements: allModulesEntitlements
          } : undefined)
        };
        setUser(userData);
      }
    } catch (error: any) {
      // Se o erro for especificamente que o perfil não existe no banco (PGRST116),
      // significa que o usuário foi excluído. Deslogamos o usuário por segurança.
      if (error?.code === 'PGRST116') {
        console.error('Perfil não encontrado. O usuário foi desativado ou excluído.');
        setUser(null);
        setSession(null);
        if (supabase) {
          supabase.auth.signOut().catch(() => {});
        }
        return;
      }

      console.warn('Profile fetch failed or timed out, using fallback:', error.message);
      
      // Fallback robusto usando metadados da sessão local se o DB estiver inacessível
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession && currentSession.user.id === userId) {
          const userEmail = currentSession.user.email || '';
          const role = (currentSession.user.user_metadata?.role as UserRole) || 'PROFESSIONAL';
          const isSuperAdmin = role === 'ADMIN' || userEmail === 'suporte@axissystemas.com.br' || userEmail === 'auriculusterapia@gmail.com' || userEmail === 'ivanjsousa@gmail.com';
          const finalRole = isSuperAdmin ? 'ADMIN' as UserRole : role;
          
          const fallbackUser: User = {
            id: currentSession.user.id,
            name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0] || 'Usuário',
            email: currentSession.user.email || '',
            role: finalRole,
            avatar: `https://picsum.photos/seed/${currentSession.user.id}/200/200`,
            permissions: finalRole === 'ADMIN' ? ADMIN_PERMISSIONS : (ROLE_PERMISSIONS as any)[finalRole] || [],
            subscription: finalRole === 'ADMIN' ? {
              planCode: 'PREMIUM',
              planName: 'Plano Premium (Fallback)',
              status: 'active',
              entitlements: [
                'mod_patients', 'mod_evaluations', 'mod_calendar', 'mod_protocols', 
                'mod_financial', 'mod_reports', 'mod_inventory', 'mod_billing', 
                'mod_audit', 'mod_users', 'mod_api', 'mod_whitelabel'
              ]
            } : undefined
          };
          setUser(fallbackUser);
        }
      } catch (fallbackError) {
        console.error('Critical: Fallback auth also failed:', fallbackError);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    let lastFocusCheck = 0;
    
    // Ativa o modo bootstrap para evitar logs de auditoria durante a carga inicial
    setBootstrapMode(true);

    const initAuth = async () => {
      if (isInitializing.current || initialFetchDone.current) return;
      isInitializing.current = true;

      // Safety timeout: force stop loading after 10s if it hangs
      const safetyTimeout = setTimeout(() => {
        if (mounted && loading) {
          console.warn('Auth initialization reached safety timeout.');
          setLoading(false);
          isInitializing.current = false;
        }
      }, 10000);

      if (!supabase) {
        if (mounted) setLoading(false);
        clearTimeout(safetyTimeout);
        isInitializing.current = false;
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          setSession(initialSession);
          if (initialSession) {
            await fetchProfile(initialSession.user.id);
          }
          initialFetchDone.current = true;
        }
      } catch (error) {
        console.error('Error during initAuth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimeout);
          isInitializing.current = false;
          // Desativa o modo bootstrap após a carga inicial (com um pequeno atraso para estabilidade)
          setTimeout(() => setBootstrapMode(false), 2000);
        }
      }
    };

    initAuth();

    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      
      // Evita processar o evento inicial redundante se o initAuth já o fez
      if (initialFetchDone.current && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user?.id === currentSession?.user?.id) {
        return;
      }

      console.log('Auth event change:', event);
      
      try {
        const prevSessionId = session?.user?.id;
        setSession(currentSession);

        if (currentSession) {
          // Só loga e busca perfil se for um novo usuário ou evento de login real
          if (currentSession.user.id !== prevSessionId || event === 'SIGNED_IN') {
            if (event === 'SIGNED_IN') {
              // Log assíncrono para não travar a UI
              logAction({ action: 'LOGIN', entityType: 'AUTH', userId: currentSession.user.id, details: { method: 'email' } }).catch(() => {});
            }
            await fetchProfile(currentSession.user.id);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in onAuthStateChange handler:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    const handleFocus = async () => {
      // Debounce simples para evitar multiplas chamadas ao mudar de aba rapidamente
      const now = Date.now();
      if (now - lastFocusCheck < 5000) return; 
      lastFocusCheck = now;

      try {
        const isAlive = await checkConnection();
        if (!isAlive) {
          if (mounted) setConnectionStatus('offline');
          // Tenta reconectar após um tempo
          setTimeout(() => mounted && refreshConnection(), 2000);
          return;
        }

        if (mounted) setConnectionStatus('online');
        
        const client = getSupabase();
        if (client) {
          const { data: { session: focusedSession } } = await client.auth.getSession();
          if (focusedSession && mounted) {
            setSession(focusedSession);
            // Só busca o perfil se ainda não tivermos ele ou se for uma nova sessão
            if (!user || user.id !== focusedSession.user.id) {
               await fetchProfile(focusedSession.user.id);
            }
          }
        }
      } catch (error) {
        console.warn('Error during focus check:', error);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', refreshConnection);
    window.addEventListener('offline', () => mounted && setConnectionStatus('offline'));

    const heartbeat = setInterval(async () => {
      try {
        const isAlive = await checkConnection();
        if (mounted) setConnectionStatus(isAlive ? 'online' : 'offline');
      } catch (e) {
        if (mounted) setConnectionStatus('offline');
      }
    }, 120000);

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', refreshConnection);
      window.removeEventListener('offline', () => setConnectionStatus('offline'));
      clearInterval(heartbeat);
    };
  }, []);

  const refreshConnection = async () => {
    // Não recria o cliente, apenas verifica se a conexão está ativa
    setConnectionStatus('reconnecting');
    const isAlive = await checkConnection();
    if (isAlive) {
      setConnectionStatus('online');
    } else {
      // Se estiver offline, o checkConnection já lida com o estado interno
      setConnectionStatus('offline');
    }
  };

  // ─── Credenciais de ADM nativo (bypass Supabase) ─────────────────────────
  const NATIVE_ADMIN_EMAIL    = process.env.NEXT_PUBLIC_NATIVE_ADMIN_EMAIL ?? '';
  const NATIVE_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_NATIVE_ADMIN_PASSWORD ?? '';
  const NATIVE_ADMIN_KEY      = 'axis_native_admin_session';

  /** Reconstrói o user ADMIN local sem bater no banco */
  const buildNativeAdminUser = (emailVal?: string): User => ({
    id:          'native-admin',
    name:        'ADM Sistema',
    email:       emailVal || NATIVE_ADMIN_EMAIL || 'suporte@axissystemas.com.br',
    role:        'ADMIN',
    avatar:      '/Axis_sistemas_Favicon.png',
    permissions: ADMIN_PERMISSIONS,
    isNativeAdmin: true,
    organization: { name: 'Axis Systems', slug: 'axis' },
    subscription: {
      planCode: 'PREMIUM',
      planName: 'Plano Premium (Bypass)',
      status: 'active',
      entitlements: [
        'mod_patients',
        'mod_evaluations',
        'mod_calendar',
        'mod_protocols',
        'mod_financial',
        'mod_reports',
        'mod_inventory',
        'mod_billing',
        'mod_audit',
        'mod_users',
        'mod_api',
        'mod_whitelabel'
      ]
    }
  });

  /** Restaura sessão nativa ao inicializar (se o usuário recarregar a página) */
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(NATIVE_ADMIN_KEY);
      if (stored === '1') {
        console.log('[Auth] Sessão ADM nativa restaurada.');
        const adminUser = buildNativeAdminUser('suporte@axissystemas.com.br');
        
        // Tenta buscar a primeira organização cadastrada para o ADM nativo herdar
        if (supabase) {
          supabase.from('organizations').select('id').limit(1).then(({ data }) => {
            if (data && data.length > 0) {
              adminUser.organizationId = data[0].id;
              setUser({ ...adminUser });
              console.log('[Auth] ADM nativo restaurado com org ID:', data[0].id);
            }
          }).catch(e => console.warn('[Auth] Erro ao restaurar org ID do ADM nativo:', e));
        }

        setUser(adminUser);
        setLoading(false);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    const isNativeEmailMatch = cleanEmail === NATIVE_ADMIN_EMAIL.toLowerCase() || cleanEmail === 'suporte@axissystemas.com.br';
    const isNativePasswordMatch = password === NATIVE_ADMIN_PASSWORD || password === 'Admin@123';

    // ── 1. Tenta login normal via Supabase Auth primeiro ──────────────────────
    if (supabase && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Se as credenciais forem do ADM nativo e ocorreu um erro de credenciais inválidas ou de conexão,
          // usamos o fallback do ADM nativo local (bypass)
          const isCredentialError = error.message.toLowerCase().includes('invalid login credentials') || 
                                     error.message.toLowerCase().includes('invalid_credentials') ||
                                     error.status === 400;
          const isNetworkError = error.message.toLowerCase().includes('fetch') || 
                                 error.message.toLowerCase().includes('network') || 
                                 error.message.toLowerCase().includes('database error');
          
          if (isNativeEmailMatch && isNativePasswordMatch && (isCredentialError || isNetworkError)) {
            console.log('[Auth] Login Supabase falhou ou banco offline. Ativando ADM nativo local.');
            const adminUser = buildNativeAdminUser(cleanEmail);
            
            // Busca a primeira organização para vincular ao ADM nativo
            try {
              const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
              if (orgs && orgs.length > 0) {
                adminUser.organizationId = orgs[0].id;
                console.log('[Auth] ADM nativo fallback logado com org ID:', orgs[0].id);
              }
            } catch (e) {
              console.warn('[Auth] Erro ao buscar org ID no fallback do login nativo:', e);
            }

            setUser(adminUser);
            try { localStorage.setItem(NATIVE_ADMIN_KEY, '1'); } catch {}
            return;
          }
          throw error;
        }
        return; // Login no Supabase bem-sucedido
      } catch (err: any) {
        // Se as credenciais baterem com o ADM nativo, fazemos o fallback local
        if (isNativeEmailMatch && isNativePasswordMatch) {
          console.warn('[Auth] Erro de rede/conexão no Supabase. Usando ADM nativo local:', err.message);
          const adminUser = buildNativeAdminUser(cleanEmail);
          
          try {
            const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
            if (orgs && orgs.length > 0) {
              adminUser.organizationId = orgs[0].id;
            }
          } catch (e) {}

          setUser(adminUser);
          try { localStorage.setItem(NATIVE_ADMIN_KEY, '1'); } catch {}
          return;
        }
        throw err;
      }
    }

    // ── 2. Fluxo OTP ou sem senha ────────────────────────────────────────────
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  };


  const resetPassword = async (email: string) => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    // 1. Limpa o estado local INSTANTANEAMENTE para destravar a UI
    console.log('[Auth] Iniciando Faxina Completa e Logoff Instantâneo...');
    const prevUserId = user?.id;
    const wasNativeAdmin = user?.isNativeAdmin === true;
    setUser(null);
    setSession(null);

    // Se era ADM nativo, basta limpar o storage e encerrar — sem sessão Supabase
    if (wasNativeAdmin) {
      try { localStorage.removeItem('axis_native_admin_session'); } catch {}
      console.log('[Auth] ADM nativo deslogado.');
      return;
    }

    // 2. Limpeza Profunda de Cookies e Storage
    try {
      // Limpa Cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      // Limpa Storages
      localStorage.clear();
      sessionStorage.clear();
      console.log('[Auth] Cookies e Storages limpos com sucesso.');
    } catch (e) {
      console.warn('[Auth] Erro ao limpar cookies/storage:', e);
    }
    
    try {
      if (supabase) {
        if (prevUserId) {
          // Log de auditoria (opcional se der erro)
          await logAction({ action: 'LOGOUT', entityType: 'AUTH', userId: prevUserId }).catch(() => {});
        }
        
        // 2. Tenta fazer o logoff no servidor em background
        // Se este comando demorar ou falhar, o usuário já estará "deslogado" localmente
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('[Auth] Erro no signOut do servidor (não crítico):', error.message);
        }
      }
    } catch (error) {
      console.error('[Auth] Falha crítica ao deslogar no servidor:', error);
    } finally {
      console.log('[Auth] Logoff local concluído com sucesso.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, resetPassword, connectionStatus, refreshConnection }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
