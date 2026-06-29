-- ============================================================
-- MIGRATION: Fix Table Permissions, RLS & Delete User Function
-- Objetivo: Garantir permissões completas na tabela public.profiles,
--           desabilitar RLS e recriar a função delete_user.
-- Executar no SQL Editor do Supabase.
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
