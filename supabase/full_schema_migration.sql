-- MASTER INSTALLATION MIGRATION
-- Data: 2026-04-25
-- Descrição: Consolida todo o esquema do Axis GC SaaS para instalações do zero.

-- 1. EXTENSÕES E CONFIGURAÇÕES INICIAIS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SEQUÊNCIAS
CREATE SEQUENCE IF NOT EXISTS public.evaluation_code_seq START WITH 1 INCREMENT BY 1;

-- 3. TABELAS CORE SAAS
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly NUMERIC DEFAULT 0,
    price_yearly NUMERIC DEFAULT 0,
    checkout_url TEXT,
    mercado_pago_plan_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.saas_feature_catalog (
    key TEXT PRIMARY KEY,
    description TEXT,
    module_name TEXT
);

CREATE TABLE public.saas_limit_catalog (
    key TEXT PRIMARY KEY,
    description TEXT,
    unit TEXT
);

CREATE TABLE public.saas_plan_features (
    plan_id UUID REFERENCES public.saas_plans(id) ON DELETE CASCADE,
    feature_key TEXT REFERENCES public.saas_feature_catalog(key) ON DELETE CASCADE,
    PRIMARY KEY (plan_id, feature_key)
);

CREATE TABLE public.saas_plan_limits (
    plan_id UUID REFERENCES public.saas_plans(id) ON DELETE CASCADE,
    limit_key TEXT REFERENCES public.saas_limit_catalog(key) ON DELETE CASCADE,
    quota_value INTEGER,
    PRIMARY KEY (plan_id, limit_key)
);

CREATE TABLE public.organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    plan_id UUID REFERENCES public.saas_plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    next_payment_date TIMESTAMPTZ,
    mercado_pago_subscription_id TEXT,
    mercado_pago_customer_id TEXT,
    external_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.organization_feature_overrides (
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    feature_key TEXT REFERENCES public.saas_feature_catalog(key) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (organization_id, feature_key)
);

CREATE TABLE public.organization_limit_overrides (
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    limit_key TEXT REFERENCES public.saas_limit_catalog(key) ON DELETE CASCADE,
    quota_value INTEGER,
    PRIMARY KEY (organization_id, limit_key)
);

-- 4. TABELAS DE NEGÓCIO
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    permissions TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL
);

CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    cpf TEXT UNIQUE,
    age INTEGER,
    birth_date DATE,
    gender TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    marital_status TEXT,
    profession TEXT,
    status TEXT DEFAULT 'Ativo',
    notes TEXT,
    last_visit DATE,
    avatar_url TEXT,
    active_insurance_id UUID, -- Referenciada depois
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER DEFAULT 60,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    payment_status TEXT DEFAULT 'pendente',
    price NUMERIC,
    notes TEXT,
    package_id UUID, -- Referenciada depois
    is_package_session BOOLEAN DEFAULT false,
    is_insurance BOOLEAN DEFAULT false,
    insurance_plan_id UUID, -- Referenciada depois
    guia_number TEXT,
    auth_number TEXT,
    billing_status TEXT DEFAULT 'not_applicable',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    main_complaint TEXT,
    history TEXT,
    tongue_diagnosis TEXT,
    pulse_diagnosis TEXT,
    syndrome_hypothesis TEXT,
    treatment_plan TEXT,
    points_used TEXT[],
    materials_used JSONB DEFAULT '[]'::jsonb,
    is_unscheduled BOOLEAN DEFAULT false,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    code TEXT UNIQUE,
    date DATE NOT NULL,
    data JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    points TEXT[],
    category TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC NOT NULL DEFAULT 0,
    min_quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'Unidade',
    category TEXT,
    expiry_date DATE,
    unit_cost NUMERIC,
    batch TEXT,
    manufacturer TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC DEFAULT 0,
    category TEXT DEFAULT 'PURCHASE',
    notes TEXT,
    is_reversed BOOLEAN DEFAULT false,
    reversed_at TIMESTAMPTZ,
    financial_id UUID, -- Referenciada depois
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL DEFAULT 'Outros',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.system_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    audit_enabled BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.patient_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    total_sessions INTEGER NOT NULL CHECK (total_sessions > 0),
    used_sessions INTEGER NOT NULL DEFAULT 0,
    price NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.insurers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    ans_registration TEXT,
    cnpj TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.insurance_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    insurer_id UUID REFERENCES public.insurers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    external_code TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.medical_supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    presentation TEXT,
    laboratory TEXT,
    anvisa_registry TEXT,
    category TEXT DEFAULT 'medicamento',
    manufacturer TEXT,
    batch TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.insurance_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    plan_id UUID REFERENCES public.insurance_plans(id) ON DELETE CASCADE,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE CASCADE,
    medical_supply_id UUID REFERENCES public.medical_supplies(id) ON DELETE CASCADE,
    unit_price NUMERIC NOT NULL DEFAULT 0.00,
    valid_from DATE,
    valid_until DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.patient_insurances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.insurance_plans(id) ON DELETE CASCADE,
    card_number TEXT NOT NULL,
    validity_date DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.billing_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    insurer_id UUID REFERENCES public.insurers(id) ON DELETE CASCADE,
    competence TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    total_presented_value NUMERIC DEFAULT 0.00,
    total_paid_value NUMERIC DEFAULT 0.00,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.billing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    status TEXT NOT NULL DEFAULT 'draft',
    competence TEXT NOT NULL,
    patient_id UUID REFERENCES public.patients(id),
    professional_id UUID REFERENCES public.profiles(id),
    insurance_plan_id UUID REFERENCES public.insurance_plans(id),
    procedure_id UUID REFERENCES public.procedures(id),
    medical_supply_id UUID REFERENCES public.medical_supplies(id),
    appointment_id UUID REFERENCES public.appointments(id),
    batch_id UUID REFERENCES public.billing_batches(id),
    service_date DATE NOT NULL,
    guia_number TEXT,
    auth_number TEXT,
    quantity INTEGER DEFAULT 1,
    unit_value NUMERIC NOT NULL DEFAULT 0.00,
    total_presented_value NUMERIC NOT NULL DEFAULT 0.00,
    total_paid_value NUMERIC DEFAULT 0.00,
    total_glossed_value NUMERIC DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.billing_glosses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id),
    billing_item_id UUID REFERENCES public.billing_items(id) ON DELETE CASCADE,
    gloss_code TEXT,
    reason TEXT,
    value NUMERIC NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. FK LATE CONSTRAINTS (Para tabelas que se referenciam mutuamente)
ALTER TABLE public.patients ADD CONSTRAINT patients_active_insurance_id_fkey FOREIGN KEY (active_insurance_id) REFERENCES public.patient_insurances(id);
ALTER TABLE public.appointments ADD CONSTRAINT appointments_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.patient_packages(id);
ALTER TABLE public.appointments ADD CONSTRAINT appointments_insurance_plan_id_fkey FOREIGN KEY (insurance_plan_id) REFERENCES public.insurance_plans(id);
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_financial_id_fkey FOREIGN KEY (financial_id) REFERENCES public.financial_transactions(id);

-- 6. LÓGICA DE NEGÓCIO (FUNÇÕES)

-- Obter organização do usuário logado
CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para Novos Usuários (Corrigido para suporte@axissystemas.com.br)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_permissions TEXT[];
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'PROFESSIONAL');
  
  -- Admin Global
  IF new.email = 'suporte@axissystemas.com.br' THEN
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

  INSERT INTO public.profiles (id, name, email, role, permissions)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    v_role,
    v_permissions
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Geração de Código de Avaliação
CREATE OR REPLACE FUNCTION public.generate_evaluation_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := '#EV-' || LPAD(nextval('evaluation_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_evaluation_code
  BEFORE INSERT ON public.evaluations
  FOR EACH ROW EXECUTE PROCEDURE public.generate_evaluation_code();

-- Funções SaaS (Quotas e Features)
CREATE OR REPLACE FUNCTION public.get_quota_usage(p_limit_key TEXT)
RETURNS TABLE(limit_key TEXT, quota_value INTEGER, current_usage INTEGER, is_unlimited BOOLEAN) AS $$
DECLARE
    v_org_id UUID;
    v_val INTEGER;
    v_usage BIGINT := 0;
BEGIN
    v_org_id := public.get_current_org_id();
    IF v_org_id IS NULL THEN RETURN; END IF;

    SELECT q.filtered_val INTO v_val FROM (
        SELECT o.quota_value as filtered_val, 1 as priority 
        FROM public.organization_limit_overrides o 
        WHERE o.organization_id = v_org_id AND o.limit_key = p_limit_key
        UNION ALL
        SELECT lp.quota_value as filtered_val, 2 as priority 
        FROM public.organization_subscriptions s
        JOIN public.saas_plan_limits lp ON lp.plan_id = s.plan_id
        WHERE s.organization_id = v_org_id AND s.status = 'active' AND lp.limit_key = p_limit_key
        ORDER BY priority ASC
        LIMIT 1
    ) q;

    IF p_limit_key = 'max_patients' THEN
        SELECT count(*) INTO v_usage FROM public.patients WHERE organization_id = v_org_id;
    ELSIF p_limit_key = 'max_active_users' THEN
        SELECT count(*) INTO v_usage FROM public.profiles WHERE organization_id = v_org_id;
    ELSIF p_limit_key = 'max_professional_agendas' THEN
        SELECT count(*) INTO v_usage FROM public.profiles WHERE organization_id = v_org_id AND role = 'PROFESSIONAL';
    END IF;

    RETURN QUERY SELECT p_limit_key, v_val, v_usage::INTEGER, (v_val IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_feature(p_feature_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_has_access BOOLEAN;
BEGIN
    v_org_id := public.get_current_org_id();
    IF v_org_id IS NULL THEN RETURN FALSE; END IF;

    SELECT enabled INTO v_has_access 
    FROM public.organization_feature_overrides 
    WHERE organization_id = v_org_id AND feature_key = p_feature_key;

    IF v_has_access IS NOT NULL THEN RETURN v_has_access; END IF;

    RETURN EXISTS (
        SELECT 1 
        FROM public.organization_subscriptions s
        JOIN public.saas_plan_features pf ON pf.plan_id = s.plan_id
        WHERE s.organization_id = v_org_id 
          AND s.status = 'active'
          AND pf.feature_key = p_feature_key
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. FUNÇÕES ADMINISTRATIVAS (SUPER ADMIN)
CREATE OR REPLACE FUNCTION public.admin_get_all_organizations()
RETURNS jsonb AS $$
DECLARE
  v_email TEXT;
  v_result jsonb;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  IF v_email != 'suporte@axissystemas.com.br' THEN
    RAISE EXCEPTION 'Acesso negado. Apenas o Super Administrator pode usar esta função.';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'created_at', o.created_at,
      'profiles', COALESCE((
         SELECT jsonb_agg(
            jsonb_build_object('name', p.name, 'email', p.email, 'role', p.role)
         ) FROM public.profiles p WHERE p.organization_id = o.id
      ), '[]'::jsonb),
      'organization_subscriptions', COALESCE((
         SELECT jsonb_agg(
            jsonb_build_object(
               'plan_id', s.plan_id,
               'status', s.status,
               'current_period_start', s.current_period_start,
               'next_payment_date', s.next_payment_date
            )
         ) FROM public.organization_subscriptions s WHERE s.organization_id = o.id
      ), '[]'::jsonb)
    )
  ) INTO v_result
  FROM public.organizations o;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_force_plan_activation(
  p_org_id UUID,
  p_plan_id UUID
)
RETURNS void AS $$
DECLARE
  v_email TEXT;
  v_exists BOOLEAN;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  IF v_email != 'suporte@axissystemas.com.br' THEN
    RAISE EXCEPTION 'Acesso negado. Apenas o Super Administrator pode executar esta ação.';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.organization_subscriptions WHERE organization_id = p_org_id) INTO v_exists;

  IF v_exists THEN
    UPDATE public.organization_subscriptions SET 
      plan_id = p_plan_id,
      status = 'active',
      current_period_start = NOW(),
      updated_at = NOW(),
      mercado_pago_subscription_id = 'MANUAL_ACTIVATION_' || substr(md5(random()::text), 1, 9)
    WHERE organization_id = p_org_id;
  ELSE
    INSERT INTO public.organization_subscriptions (
      organization_id, plan_id, status, current_period_start, updated_at, mercado_pago_subscription_id
    ) VALUES (
      p_org_id, p_plan_id, 'active', NOW(), NOW(), 'MANUAL_ACTIVATION_' || substr(md5(random()::text), 1, 9)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função de Webhook Mercado Pago
CREATE OR REPLACE FUNCTION public.handle_subscription_webhook_update(
  p_organization_id UUID,
  p_status TEXT,
  p_mercado_pago_subscription_id TEXT,
  p_mercado_pago_customer_id TEXT,
  p_next_payment_date TIMESTAMPTZ,
  p_mercado_pago_plan_id TEXT
)
RETURNS void AS $$
DECLARE
  v_plan_id UUID;
  v_mapped_status TEXT;
BEGIN
  SELECT id INTO v_plan_id FROM public.saas_plans WHERE mercado_pago_plan_id = p_mercado_pago_plan_id;

  v_mapped_status := CASE 
    WHEN p_status = 'authorized' THEN 'active'
    WHEN p_status = 'pending' THEN 'pending'
    WHEN p_status = 'paused' THEN 'paused'
    WHEN p_status = 'cancelled' THEN 'cancelled'
    ELSE p_status
  END;

  INSERT INTO public.organization_subscriptions (
    organization_id, plan_id, status, current_period_start, mercado_pago_subscription_id, mercado_pago_customer_id, next_payment_date, updated_at
  )
  VALUES (p_organization_id, v_plan_id, v_mapped_status, NOW(), p_mercado_pago_subscription_id, p_mercado_pago_customer_id, p_next_payment_date, NOW())
  ON CONFLICT (organization_id) 
  DO UPDATE SET
    plan_id = COALESCE(v_plan_id, organization_subscriptions.plan_id),
    status = EXCLUDED.status,
    mercado_pago_subscription_id = EXCLUDED.mercado_pago_subscription_id,
    mercado_pago_customer_id = EXCLUDED.mercado_pago_customer_id,
    next_payment_date = EXCLUDED.next_payment_date,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. SEGURANÇA (RLS)
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- Política Genérica de Isolamento para TODAS as tabelas com organization_id
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'organization_id' LOOP
        EXECUTE format('CREATE POLICY org_isolation ON public.%I AS PERMISSIVE FOR ALL TO authenticated USING (organization_id = public.get_current_org_id())', t);
    END LOOP;
END $$;

-- Políticas Adicionais para Perfis (Permitir visualizar o próprio e admins gerenciarem)
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR organization_id = public.get_current_org_id());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 8. DADOS DE SEMENTE (SEEDS)

-- Catálogo de Funcionalidades
INSERT INTO public.saas_feature_catalog (key, description, module_name) VALUES
('mod_patients', 'Gestão de Pacientes e Prontuários', 'Patients'),
('mod_evaluations', 'Avaliações Clínicas Ilimitadas', 'Evaluations'),
('mod_calendar', 'Agenda Digital Inteligente', 'Calendar'),
('mod_protocols', 'Protocolos e Planos de Tratamento', 'Protocols'),
('mod_financial', 'Gestão Financeira Completa', 'Financial'),
('mod_reports', 'Relatórios e Inteligência de Dados', 'Reports'),
('mod_inventory', 'Gestão de Estoque e Materiais', 'Inventory'),
('mod_billing', 'Faturamento TISS e Convênios', 'Billing'),
('mod_audit', 'Trilha de Auditoria e Segurança', 'Audit'),
('mod_users', 'Controle de Acesso de Equipe', 'Users'),
('mod_api', 'Integração via API Avançada', 'Desenvolvedor'),
('mod_whitelabel', 'Personalização White Label (Sua Marca)', 'Configurações');

-- Catálogo de Limites
INSERT INTO public.saas_limit_catalog (key, description, unit) VALUES
('max_patients', 'Pacientes Ativos na Base', 'Pacientes'),
('max_professional_agendas', 'Agendas de Profissionais', 'Agendas'),
('max_active_users', 'Contas para Colaboradores', 'Usuários');

-- Planos
INSERT INTO public.saas_plans (id, code, name, description, price_monthly, price_yearly, checkout_url) VALUES
('18576633-2526-4ecd-b4b2-2565fbb6531f', 'BASIC', 'Plano Básico', 'Plano de entrada ideal para iniciantes.', 29.90, 990, 'https://link.mercadopago.com.br/axisgc_basico'),
('15f2ae8e-061f-4e05-ba3a-499e846cf82a', 'PRO', 'Plano Profissional', 'O melhor custo-benefício para crescimento.', 49.90, 1990, 'https://link.mercadopago.com.br/axisgc_profissional'),
('8ea21034-64d5-4003-bd48-861386b6883b', 'PREMIUM', 'Plano Premium', 'Solução completa para alta demanda.', 199.90, 3990, 'https://link.mercadopago.com.br/axisgc_premium');

-- Funcionalidades dos Planos (Exemplo: Básico vs Premium)
INSERT INTO public.saas_plan_features (plan_id, feature_key) 
SELECT '18576633-2526-4ecd-b4b2-2565fbb6531f', key FROM public.saas_feature_catalog WHERE key IN ('mod_patients', 'mod_evaluations', 'mod_calendar', 'mod_users');

INSERT INTO public.saas_plan_features (plan_id, feature_key) 
SELECT '8ea21034-64d5-4003-bd48-861386b6883b', key FROM public.saas_feature_catalog;

-- Limites dos Planos
INSERT INTO public.saas_plan_limits (plan_id, limit_key, quota_value) VALUES
('18576633-2526-4ecd-b4b2-2565fbb6531f', 'max_patients', 100),
('18576633-2526-4ecd-b4b2-2565fbb6531f', 'max_active_users', 2),
('15f2ae8e-061f-4e05-ba3a-499e846cf82a', 'max_patients', 1000),
('15f2ae8e-061f-4e05-ba3a-499e846cf82a', 'max_active_users', 10),
('8ea21034-64d5-4003-bd48-861386b6883b', 'max_patients', NULL), -- Ilimitado
('8ea21034-64d5-4003-bd48-861386b6883b', 'max_active_users', NULL);
