-- Tabela de Modelos de Fichas de Avaliação Personalizadas e Toggles de Sistema
CREATE TABLE IF NOT EXISTS public.evaluation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'FileText',
    color_theme TEXT DEFAULT 'emerald',
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    steps JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

-- Política de Isolamento Multi-Tenant por Organização
CREATE POLICY evaluation_templates_org_isolation ON public.evaluation_templates
    FOR ALL TO authenticated
    USING (organization_id IS NULL OR organization_id = public.get_current_org_id());
