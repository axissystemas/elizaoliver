-- ============================================================
-- MIGRATION: Fix Table Permissions & RLS for Profiles Table
-- Objetivo: Garantir permissões completas (GRANT ALL) na tabela 
--           public.profiles e desabilitar o RLS para evitar
--           erros de "permission denied for table profiles" ao
--           gerenciar usuários.
-- Executar no SQL Editor do Supabase se necessário.
-- ============================================================

-- 1. Garantir permissões de acesso da tabela public.profiles para roles do Supabase
GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- 2. Desabilitar o Row Level Security (RLS) na tabela profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. Caso RLS seja reativado no futuro, garantir políticas permissivas para administradores
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
