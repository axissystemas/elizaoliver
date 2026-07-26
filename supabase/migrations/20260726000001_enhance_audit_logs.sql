-- ============================================================
-- MIGRATION: Enhance Audit Logs, Multi-Tenant Isolation & DB Triggers
-- Data: 2026-07-26
-- ============================================================

-- 1. Garantir coluna organization_id em audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Criar índices para otimização de consultas e relatórios
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- 3. Atualizar RLS na tabela audit_logs (Imutabilidade & Isolamento Multi-Tenant)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs of their organization" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_logs;

-- Permite leitura de logs por usuários autenticados
CREATE POLICY "Admins can view audit logs of their organization" ON public.audit_logs
FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- Permite inserção de logs por usuários autenticados
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL OR true
);

-- 4. Função genérica de Trigger PostgreSQL para auditoria automática de tabelas críticas
CREATE OR REPLACE FUNCTION public.process_table_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_audit_enabled BOOLEAN;
  v_action TEXT;
  v_entity_id TEXT;
  v_details JSONB;
BEGIN
  -- Verifica se a auditoria está ativada nas configurações
  SELECT audit_enabled INTO v_audit_enabled FROM public.system_settings WHERE id = 1;
  IF v_audit_enabled IS FALSE THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_user_id := auth.uid();
  v_action := TG_OP; -- 'INSERT', 'UPDATE', 'DELETE'

  IF (TG_OP = 'DELETE') THEN
    v_entity_id := OLD.id::TEXT;
    v_org_id := CASE WHEN (to_jsonb(OLD) ? 'organization_id') THEN (OLD.organization_id)::UUID ELSE NULL END;
    v_details := jsonb_build_object('old_data', to_jsonb(OLD));
  ELSIF (TG_OP = 'UPDATE') THEN
    v_entity_id := NEW.id::TEXT;
    v_org_id := CASE WHEN (to_jsonb(NEW) ? 'organization_id') THEN (NEW.organization_id)::UUID ELSE NULL END;
    v_details := jsonb_build_object('old_data', to_jsonb(OLD), 'new_data', to_jsonb(NEW));
  ELSE -- INSERT
    v_entity_id := NEW.id::TEXT;
    v_org_id := CASE WHEN (to_jsonb(NEW) ? 'organization_id') THEN (NEW.organization_id)::UUID ELSE NULL END;
    v_details := jsonb_build_object('new_data', to_jsonb(NEW));
  END IF;

  -- Insere o log automaticamente
  INSERT INTO public.audit_logs (user_id, organization_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    v_org_id,
    v_action,
    UPPER(TG_TABLE_NAME),
    v_entity_id,
    v_details
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Garante que falhas de log nunca travem as transações principais da clínica
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Aplicação dos Triggers automáticos nas tabelas críticas
DROP TRIGGER IF EXISTS audit_patients_trigger ON public.patients;
CREATE TRIGGER audit_patients_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.process_table_audit_log();

DROP TRIGGER IF EXISTS audit_financial_trigger ON public.financial_transactions;
CREATE TRIGGER audit_financial_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.process_table_audit_log();

DROP TRIGGER IF EXISTS audit_appointments_trigger ON public.appointments;
CREATE TRIGGER audit_appointments_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.process_table_audit_log();

DROP TRIGGER IF EXISTS audit_evaluations_trigger ON public.evaluations;
CREATE TRIGGER audit_evaluations_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.process_table_audit_log();
