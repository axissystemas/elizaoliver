-- ============================================================
-- MIGRATION: Fix All Table Permissions, RLS & Admin Roles
-- Objetivo: Garantir permissões completas (GRANT ALL) em TODAS as
--           tabelas do schema public e restaurar a role ADMIN para
--           os logins de administradores.
-- Executar no SQL Editor do Supabase.
-- ============================================================

-- 1. Restaurar a role ADMIN e permissões completas para os usuários administradores
UPDATE public.profiles
SET 
  role = 'ADMIN',
  permissions = ARRAY[
    'dashboard', 'dashboard:view',
    'patients', 'patients:view', 'patients:create', 'patients:edit', 'patients:delete',
    'evaluations', 'evaluations:view', 'evaluations:create', 'evaluations:edit', 'evaluations:delete',
    'calendar', 'calendar:view', 'calendar:create', 'calendar:edit', 'calendar:delete',
    'auricular', 'auricular:view', 'auricular:edit',
    'protocols', 'protocols:view', 'protocols:create', 'protocols:edit', 'protocols:delete',
    'financial', 'financial:view', 'financial:create', 'financial:reports', 'financial:delete',
    'inventory', 'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:undo', 'inventory:delete',
    'users', 'users:view', 'users:create', 'users:edit', 'users:delete',
    'reports', 'reports:view', 'reports:export',
    'billing', 'billing:view', 'billing:setup', 'billing:audit', 'billing:batch', 'billing:finance',
    'settings', 'settings:profile', 'settings:clinic', 'settings:users', 'settings:delete'
  ]
WHERE role = 'ADMIN' 
   OR email IN ('ivanjsousa@gmail.com', 'auriculusterapia@gmail.com', 'suporte@axissystemas.com.br');

-- 2. Conceder permissões totais em todas as tabelas e sequências do schema public
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 3. Desabilitar o Row Level Security (RLS) nas tabelas principais para evitar bloqueios
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocols DISABLE ROW LEVEL SECURITY;

-- 4. Remover a função existente para permitir alterar o nome do parâmetro sem erro 42P13
DROP FUNCTION IF EXISTS public.delete_user(uuid);

-- 5. Recriar a função delete_user com o parâmetro id_to_delete
CREATE OR REPLACE FUNCTION public.delete_user(id_to_delete uuid)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'ADMIN' OR profiles.email IN ('ivanjsousa@gmail.com', 'auriculusterapia@gmail.com', 'suporte@axissystemas.com.br'))
  ) THEN
    DELETE FROM auth.users WHERE id = id_to_delete;
  ELSE
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Conceder permissão de execução na função para as roles do Supabase
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO anon, authenticated, service_role;
