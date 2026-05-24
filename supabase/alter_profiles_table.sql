-- ============================================================
-- ALTER TABLE: profiles
-- Objetivo: Ajustar a tabela profiles para remover constraints
--           de NOT NULL e CHECK que impedem inserções diretas.
-- Executar no SQL Editor do Supabase
-- ============================================================

-- 1. Remover a constraint CHECK que valida o role
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Tornar 'name' opcional (remover NOT NULL)
ALTER TABLE public.profiles 
  ALTER COLUMN name DROP NOT NULL;

-- 3. Tornar 'email' opcional (remover NOT NULL)
ALTER TABLE public.profiles 
  ALTER COLUMN email DROP NOT NULL;

-- 4. Tornar 'role' opcional (remover NOT NULL)
ALTER TABLE public.profiles 
  ALTER COLUMN role DROP NOT NULL;

-- 5. Remover a FK obrigatória de organization_id e recriar como nullable sem restrição rígida
--    (caso queira manter a FK mas permitir organization_id = NULL ao inserir)
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_organization_id_fkey 
  FOREIGN KEY (organization_id) 
  REFERENCES public.organizations(id) 
  ON DELETE SET NULL;

-- Resultado esperado:
-- id            uuid        PK (referencia auth.users)
-- name          text        NULL
-- email         text        NULL
-- role          text        NULL
-- avatar_url    text        NULL
-- permissions   text[]      default '{}'::text[]
-- created_at    timestamptz default now()
-- updated_at    timestamptz default now()
-- organization_id uuid      NULL (FK para organizations, sem bloquear se não existir)
