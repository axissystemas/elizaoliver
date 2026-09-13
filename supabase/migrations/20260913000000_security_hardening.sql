-- ============================================================================
-- MIGRAÇÃO DE HARDENING DE SEGURANÇA (AUDITORIA E CORREÇÃO DE VULNERABILIDADES)
-- Data: 2026-09-13
-- Descrição:
-- 1. Corrige a função delete_user removendo a cláusula permissiva auth.uid() IS NULL.
-- 2. Revoga permissões irrestritas concedidas ao papel anon em tabelas críticas.
-- 3. Assegura que o Row Level Security (RLS) permaneça ativo em todas as entidades.
-- ============================================================================

-- 1. CORREÇÃO CRÍTICA NA FUNÇÃO delete_user
-- Anteriormente permitia exclusão se auth.uid() fosse nulo ou para qualquer autenticado.
DROP FUNCTION IF EXISTS public.delete_user(uuid);

CREATE OR REPLACE FUNCTION public.delete_user(id_to_delete uuid)
RETURNS void AS $$
DECLARE
  v_caller_role TEXT;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Rejeita imediatamente qualquer chamada não autenticada
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não autenticado.';
  END IF;

  -- Permite apenas se o usuário chamador for realmente ADMIN na tabela profiles
  SELECT role INTO v_caller_role 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF v_caller_role = 'ADMIN' OR (SELECT current_setting('role', true)) = 'service_role' THEN
    v_is_admin := TRUE;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores do sistema podem excluir usuários.';
  END IF;

  -- Exclui o perfil e em seguida a conta de autenticação
  DELETE FROM public.profiles WHERE id = id_to_delete;
  DELETE FROM auth.users WHERE id = id_to_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoga explicitamente do papel anon e restringe a authenticated/service_role
REVOKE ALL ON FUNCTION public.delete_user(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated, service_role;


-- 2. REVOGAÇÃO DE ACESSO EXCESSIVO DO PAPEL ANON
-- A migração 20260629000000 havia concedido GRANT ALL ON ALL TABLES ao papel anon.
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.patients FROM anon;
REVOKE ALL ON TABLE public.appointments FROM anon;
REVOKE ALL ON TABLE public.consultations FROM anon;
REVOKE ALL ON TABLE public.evaluations FROM anon;
REVOKE ALL ON TABLE public.protocols FROM anon;
REVOKE ALL ON TABLE public.financial_transactions FROM anon;
REVOKE ALL ON TABLE public.inventory_items FROM anon;
REVOKE ALL ON TABLE public.billing_items FROM anon;
REVOKE ALL ON TABLE public.billing_batches FROM anon;
REVOKE ALL ON TABLE public.audit_logs FROM anon;
REVOKE ALL ON TABLE public.organizations FROM anon;
REVOKE ALL ON TABLE public.organization_subscriptions FROM anon;


-- 3. RE-ATIVAÇÃO E GARANTIA DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- 4. POLÍTICAS DE RLS PARA TABELA PROFILES (se ausentes)
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() OR 
  organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (
  id = auth.uid() OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);
