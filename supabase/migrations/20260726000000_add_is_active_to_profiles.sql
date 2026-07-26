-- ============================================================
-- MIGRATION: Add is_active column to public.profiles table
-- Data: 2026-07-26
-- ============================================================

-- 1. Adicionar coluna is_active com padrão true se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Atualizar a trigger de criação de novos usuários para garantir is_active = true
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

  INSERT INTO public.profiles (id, name, email, role, permissions, organization_id, is_active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    v_role,
    v_permissions,
    v_org_id,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    organization_id = COALESCE(profiles.organization_id, EXCLUDED.organization_id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
