import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Singleton instance
let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Retorna a instância única do cliente Supabase.
 * O uso de Singleton evita o erro "lock was released because another request stole it".
 */
export const getSupabase = () => {
  // Se já temos uma instância, retorna ela sempre. Nunca recria se persistSession for true.
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing. Check .env.local');
    return null;
  }

  console.log('Inicializando instância única do cliente Supabase...');
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Garante que o lock de storage seja gerenciado de forma estável
      storageKey: 'axis-auth-token-stable' 
    },
    global: {
      headers: { 'x-client-info': 'axis-gc-singleton' }
    }
  });
  
  return supabaseInstance;
};

/**
 * Reseta a instância única do cliente Supabase para garantir limpeza de locks em re-logins.
 */
export const resetSupabaseInstance = () => {
  supabaseInstance = null;
};

let lastCheckTime = 0;
let lastCheckResult = true;
const CHECK_INTERVAL = 30000; // 30 segundos entre checks reais

/**
 * Verifica se a conexão com o banco de dados está ativa.
 * Implementa cache de curto prazo para evitar flood de requisições de saúde.
 */
export const checkConnection = async (): Promise<boolean> => {
  const client = getSupabase();
  if (!client) return false;
  
  const now = Date.now();
  if (now - lastCheckTime < CHECK_INTERVAL) {
    return lastCheckResult;
  }

  try {
    // Consulta mínima para health check
    const { error } = await client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    lastCheckTime = now;

    if (error) {
      // Erros de RLS ou permissão ainda significam que o servidor respondeu (estamos online)
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        lastCheckResult = true;
        return true;
      }
      
      console.warn('Conexão Supabase instável (Health Check):', error.message);
      // Erro de rede ou timeout real
      const isNetworkError = error.message.includes('fetch') || error.message.includes('timeout') || error.message.includes('Network');
      lastCheckResult = !isNetworkError;
      return lastCheckResult;
    }
    
    lastCheckResult = true;
    return true;
  } catch (err) {
    console.error('Erro fatal no checkConnection:', err);
    return false; // Não atualiza cache em caso de erro fatal
  }
};

/**
 * Exporta um Proxy para que qualquer módulo que importe 'supabase' use a instância única.
 */
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabase();
    if (!client) return undefined;
    const value = (client as any)[prop];

    // Se o valor for uma função e pertencer diretamente ao cliente (como from, rpc)
    // fazemos o bind. Se for um sub-objeto (como auth, storage) retornamos o objeto original.
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  }
}) as SupabaseClient<Database>;

/**
 * Helper para uso seguro no lado do cliente.
 */
export const getClientSupabase = () => {
  if (typeof window === 'undefined') return null;
  return getSupabase();
};

