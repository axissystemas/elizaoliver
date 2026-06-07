-- ============================================================
-- MIGRATION: Fix User Creation and Organization Linking
-- Objetivo: Ajustar a trigger de novos usuários para herdar o 
--           organization_id e corrigir políticas de RLS para 
--           permitir que administradores gerenciem perfis.
-- Executar no SQL Editor do Supabase
-- ============================================================

-- 1. Redefinir a função do trigger para extrair o organization_id dos metadados do Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_permissions TEXT[];
  v_org_id UUID;
BEGIN
  -- Extrair role dos metadados ou definir padrão
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'PROFESSIONAL');
  
  -- Extrair organization_id dos metadados (se enviado)
  v_org_id := (new.raw_user_meta_data->>'organization_id')::UUID;
  
  -- Forçar Admin Global para e-mails de suporte do sistema
  IF new.email = 'suporte@axissystemas.com.br' OR new.email = 'auriculusterapia@gmail.com' THEN
    v_role := 'ADMIN';
  END IF;

  -- Mapear permissões padrão caso não venham nos metadados
  IF new.raw_user_meta_data->'permissions' IS NOT NULL THEN
    SELECT ARRAY_AGG(x)::TEXT[] INTO v_permissions
    FROM jsonb_array_elements_text(new.raw_user_meta_data->'permissions') AS x;
  ELSE
    IF v_role = 'ADMIN' THEN
      v_permissions := ARRAY['dashboard','dashboard:view','patients','patients:view','patients:create','patients:edit','patients:delete','evaluations','evaluations:view','evaluations:create','evaluations:edit','evaluations:delete','calendar','calendar:view','calendar:create','calendar:edit','calendar:delete','auricular','auricular:view','auricular:edit','protocols','protocols:view','protocols:create','protocols:edit','protocols:delete','financial','financial:view','financial:create','financial:reports','inventory','inventory:view','inventory:create','inventory:edit','inventory:delete','users','users:view','users:create','users:edit','users:delete','settings','settings:profile','settings:clinic','settings:users','settings:backup'];
    ELSIF v_role = 'PROFESSIONAL' THEN
      v_permissions := ARRAY['dashboard','dashboard:view','patients','patients:view','patients:create','patients:edit','evaluations','evaluations:view','evaluations:create','evaluations:edit','calendar','calendar:view','calendar:create','calendar:edit','auricular','auricular:view','auricular:edit','protocols','protocols:view','protocols:create','protocols:edit','inventory','inventory:view','inventory:create','inventory:edit','inventory:delete','settings','settings:profile'];
    ELSE -- SECRETARY
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

-- 2. Criar a função can_manage_profile com SECURITY DEFINER para evitar recursão no RLS
CREATE OR REPLACE FUNCTION public.can_manage_profile(admin_id uuid, target_org_id uuid)
RETURNS boolean AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_org_id UUID;
  v_caller_email TEXT;
  v_caller_permissions TEXT[];
BEGIN
  -- Buscar dados do chamador ignorando RLS por estar definida como SECURITY DEFINER
  SELECT role, organization_id, email, permissions 
  INTO v_caller_role, v_caller_org_id, v_caller_email, v_caller_permissions
  FROM public.profiles 
  WHERE id = admin_id;

  -- Suporte / Administrador Global tem acesso total
  IF v_caller_email = 'suporte@axissystemas.com.br' OR v_caller_email = 'auriculusterapia@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- Administrador ou usuário com permissão explícita de gerenciar usuários da mesma clínica
  IF (
    v_caller_role = 'ADMIN' OR 
    'users' = ANY(v_caller_permissions) OR 
    'users:create' = ANY(v_caller_permissions) OR 
    'users:edit' = ANY(v_caller_permissions)
  ) AND v_caller_org_id IS NOT NULL AND v_caller_org_id = target_org_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Remover políticas antigas conflitantes (se existirem)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- 4. Recriar as políticas RLS para a tabela profiles

-- Permite visualizar o próprio perfil, perfis da mesma organização ou acesso se for suporte global (usando JWT para evitar recursão)
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    organization_id = public.get_current_org_id() OR
    auth.jwt() ->> 'email' = 'suporte@axissystemas.com.br' OR
    auth.jwt() ->> 'email' = 'auriculusterapia@gmail.com'
  );

-- Permite inserção de novos perfis por administradores autorizados
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    public.can_manage_profile(auth.uid(), organization_id)
  );

-- Permite atualizar o próprio perfil ou perfis administrados
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    public.can_manage_profile(auth.uid(), organization_id)
  )
  WITH CHECK (
    auth.uid() = id OR 
    public.can_manage_profile(auth.uid(), organization_id)
  );

-- Permite excluir perfis administrados
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    public.can_manage_profile(auth.uid(), organization_id)
  );
