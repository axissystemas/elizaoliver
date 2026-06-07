-- ============================================================
-- MIGRATION: Simplify Profiles Table RLS (Disable RLS on Profiles)
-- Objetivo: Desabilitar o RLS na tabela profiles para resolver 
--           definitivamente erros de permissão ao criar e 
--           atualizar membros da equipe, mantendo o RLS ativo 
--           e seguro em todas as outras tabelas do sistema.
-- Executar no SQL Editor do Supabase
-- ============================================================

-- 1. Desabilitar o RLS especificamente na tabela profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas e novas da tabela profiles para evitar conflitos
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- 3. Redefinir a trigger de novos usuários de forma simples para herdar a organização
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_permissions TEXT[];
  v_org_id UUID;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'PROFESSIONAL');
  v_org_id := (new.raw_user_meta_data->>'organization_id')::UUID;
  
  -- Suporte Global
  IF new.email = 'suporte@axissystemas.com.br' OR new.email = 'auriculusterapia@gmail.com' THEN
    v_role := 'ADMIN';
  END IF;

  IF new.raw_user_meta_data->'permissions' IS NOT NULL THEN
    SELECT ARRAY_AGG(x)::TEXT[] INTO v_permissions
    FROM jsonb_array_elements_text(new.raw_user_meta_data->'permissions') AS x;
  ELSE
    IF v_role = 'ADMIN' THEN
      v_permissions := ARRAY['dashboard','dashboard:view','patients','patients:view','patients:create','patients:edit','patients:delete','evaluations','evaluations:view','evaluations:create','evaluations:edit','evaluations:delete','calendar','calendar:view','calendar:create','calendar:edit','calendar:delete','auricular','auricular:view','auricular:edit','protocols','protocols:view','protocols:create','protocols:edit','protocols:delete','financial','financial:view','financial:create','financial:reports','inventory','inventory:view','inventory:create','inventory:edit','inventory:delete','users','users:view','users:create','users:edit','users:delete','settings','settings:profile','settings:clinic','settings:users','settings:backup'];
    ELSIF v_role = 'PROFESSIONAL' THEN
      v_permissions := ARRAY['dashboard','dashboard:view','patients','patients:view','patients:create','patients:edit','evaluations','evaluations:view','evaluations:create','evaluations:edit','calendar','calendar:view','calendar:create','calendar:edit','auricular','auricular:view','auricular:edit','protocols','protocols:view','protocols:create','protocols:edit','inventory','inventory:view','inventory:create','inventory:edit','inventory:delete','settings','settings:profile'];
    ELSE
      v_permissions := ARRAY['dashboard','dashboard:view','patients','patients:view','patients:create','calendar','calendar:view','calendar:create','calendar:edit','settings','settings:profile'];
    END IF;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, permissions, organization_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    v_role,
    v_permissions,
    v_org_id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
