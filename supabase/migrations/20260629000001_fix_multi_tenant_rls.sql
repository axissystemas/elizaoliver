-- ============================================================================
-- MIGRAÇÃO DE SEGURANÇA: ISOLAMENTO MULTI-TENANT RIGOROSO (RLS POR ORGANIZAÇÃO)
-- Data: 2026-06-29
-- Descrição: Substitui políticas genéricas de RLS por regras estritas baseadas em organization_id.
-- ============================================================================

-- Helper Function para obter a organização do usuário logado de forma rápida
CREATE OR REPLACE FUNCTION public.get_auth_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. TABELA PATIENTS (Pacientes)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients are viewable by authenticated users" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can delete patients" ON public.patients;
DROP POLICY IF EXISTS "tenant_patients_select" ON public.patients;
DROP POLICY IF EXISTS "tenant_patients_insert" ON public.patients;
DROP POLICY IF EXISTS "tenant_patients_update" ON public.patients;
DROP POLICY IF EXISTS "tenant_patients_delete" ON public.patients;

CREATE POLICY "tenant_patients_select" ON public.patients FOR SELECT TO authenticated
USING (organization_id = public.get_auth_organization_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "tenant_patients_insert" ON public.patients FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_auth_organization_id());

CREATE POLICY "tenant_patients_update" ON public.patients FOR UPDATE TO authenticated
USING (organization_id = public.get_auth_organization_id());

CREATE POLICY "tenant_patients_delete" ON public.patients FOR DELETE TO authenticated
USING (organization_id = public.get_auth_organization_id() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

-- 2. TABELA APPOINTMENTS (Agendamentos)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Appointments viewable by authenticated" ON public.appointments;
DROP POLICY IF EXISTS "Appointments insertable by authenticated" ON public.appointments;
DROP POLICY IF EXISTS "Appointments updatable by authenticated" ON public.appointments;
DROP POLICY IF EXISTS "tenant_appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "tenant_appointments_insert" ON public.appointments;
DROP POLICY IF EXISTS "tenant_appointments_update" ON public.appointments;

CREATE POLICY "tenant_appointments_select" ON public.appointments FOR SELECT TO authenticated
USING (organization_id = public.get_auth_organization_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "tenant_appointments_insert" ON public.appointments FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_auth_organization_id());

CREATE POLICY "tenant_appointments_update" ON public.appointments FOR UPDATE TO authenticated
USING (organization_id = public.get_auth_organization_id());

-- 3. TABELA CONSULTATIONS (Consultas e Atendimentos)
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Consultations viewable by authenticated" ON public.consultations;
DROP POLICY IF EXISTS "Consultations insertable by authenticated" ON public.consultations;
DROP POLICY IF EXISTS "tenant_consultations_select" ON public.consultations;
DROP POLICY IF EXISTS "tenant_consultations_insert" ON public.consultations;

CREATE POLICY "tenant_consultations_select" ON public.consultations FOR SELECT TO authenticated
USING (organization_id = public.get_auth_organization_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "tenant_consultations_insert" ON public.consultations FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_auth_organization_id());

-- 4. TABELA EVALUATIONS (Avaliações Prontuário)
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Evaluations viewable by authenticated" ON public.evaluations;
DROP POLICY IF EXISTS "Evaluations insertable by authenticated" ON public.evaluations;
DROP POLICY IF EXISTS "tenant_evaluations_select" ON public.evaluations;
DROP POLICY IF EXISTS "tenant_evaluations_insert" ON public.evaluations;

CREATE POLICY "tenant_evaluations_select" ON public.evaluations FOR SELECT TO authenticated
USING (organization_id = public.get_auth_organization_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "tenant_evaluations_insert" ON public.evaluations FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_auth_organization_id());

-- 5. TABELA INVENTORY_ITEMS (Itens de Estoque)
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Inventory items are viewable by authenticated users" ON public.inventory_items;
DROP POLICY IF EXISTS "Authenticated users can insert inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Authenticated users can update inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "tenant_inventory_select" ON public.inventory_items;
DROP POLICY IF EXISTS "tenant_inventory_insert" ON public.inventory_items;

CREATE POLICY "tenant_inventory_select" ON public.inventory_items FOR SELECT TO authenticated
USING (organization_id = public.get_auth_organization_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "tenant_inventory_insert" ON public.inventory_items FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_auth_organization_id());

-- 6. TABELA FINANCIAL_TRANSACTIONS (Transações Financeiras)
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Financial transactions viewable by authenticated" ON public.financial_transactions;
DROP POLICY IF EXISTS "tenant_financial_select" ON public.financial_transactions;
DROP POLICY IF EXISTS "tenant_financial_insert" ON public.financial_transactions;

CREATE POLICY "tenant_financial_select" ON public.financial_transactions FOR SELECT TO authenticated
USING (organization_id = public.get_auth_organization_id() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "tenant_financial_insert" ON public.financial_transactions FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_auth_organization_id());
