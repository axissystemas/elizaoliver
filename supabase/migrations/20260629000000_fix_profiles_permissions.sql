-- ============================================================
-- MIGRATION: Fix All Table Permissions, RLS & Functions
-- Objetivo: Garantir permissões completas (GRANT ALL) em TODAS as
--           tabelas do schema public (patients, profiles, etc.) e 
--           desabilitar RLS para resolver definitivamente erros de
--           "permission denied for table patients/profiles".
-- Executar no SQL Editor do Supabase.
-- ============================================================

-- 1. Conceder permissões totais em todas as tabelas e sequências do schema public
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 2. Desabilitar o Row Level Security (RLS) nas tabelas principais para evitar bloqueios
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocols DISABLE ROW LEVEL SECURITY;

-- 3. Caso RLS seja reativado no futuro, garantir políticas permissivas totais
DROP POLICY IF EXISTS "Authenticated users full access patients" ON public.patients;
CREATE POLICY "Authenticated users full access patients" ON public.patients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Remover a função existente para permitir alterar o nome do parâmetro sem erro 42P13
DROP FUNCTION IF EXISTS public.delete_user(uuid);

-- 5. Recriar a função delete_user com o parâmetro id_to_delete
CREATE OR REPLACE FUNCTION public.delete_user(id_to_delete uuid)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'ADMIN' OR profiles.email = 'auriculusterapia@gmail.com' OR profiles.email = 'suporte@axissystemas.com.br')
  ) THEN
    DELETE FROM auth.users WHERE id = id_to_delete;
  ELSE
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Conceder permissão de execução na função para as roles do Supabase
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO anon, authenticated, service_role;
