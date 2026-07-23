-- Migration: Chinese Dietotherapy Module DDL (Revision 2) and Seeds
-- Created: 2026-07-23

-- 1. DEFINIÇÃO DOS ENUMS
CREATE TYPE public.chinese_diet_editorial_status AS ENUM (
    'imported', 
    'pending_review', 
    'under_review', 
    'reviewed', 
    'published', 
    'archived'
);

CREATE TYPE public.chinese_diet_recommendation_level AS ENUM (
    'prioritize', 
    'moderate', 
    'avoid'
);

CREATE TYPE public.chinese_diet_audit_action AS ENUM (
    'INSERT', 
    'UPDATE', 
    'DELETE', 
    'RESTORE', 
    'PUBLISH', 
    'IMPORT'
);

-- =========================================================================
-- A. TABELAS DE APOIO (CADASTROS BASE)
-- =========================================================================

-- 1. Categorias de Alimentos
CREATE TABLE public.chinese_diet_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Global
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Naturezas Térmicas
CREATE TABLE public.chinese_diet_thermal_natures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Ex: Quente, Morno, Neutro, Fresco, Frio
    description TEXT
);

-- 3. Sabores
CREATE TABLE public.chinese_diet_flavors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Ex: Doce, Picante, Amargo, Azedo, Salgado, Adstringente
    description TEXT
);

-- 4. Órgãos ou Canais (Zang Fu)
CREATE TABLE public.chinese_diet_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Ex: Baço, Estômago, Fígado, Rim, Pulmão, Coração...
    abbreviation VARCHAR(10) UNIQUE, -- Ex: BP, E, F, R, P, C
    description TEXT
);

-- 5. Funções Terapêuticas MTC
CREATE TABLE public.chinese_diet_therapeutic_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Global
    description TEXT NOT NULL, -- Ex: Tonificar o Qi do Baço, Harmonizar o Aquecedor Médio
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Padrões Energéticos / Desarmonias
CREATE TABLE public.chinese_diet_disharmony_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Global
    name TEXT NOT NULL, -- Ex: Deficiência de Qi do Baço, Estagnação de Qi do Fígado
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Princípios de Tratamento
CREATE TABLE public.chinese_diet_treatment_principles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Global
    name TEXT NOT NULL, -- Ex: Tonificar o Baço, Drenar Umidade, Resolver Estagnação
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Modos de Preparo
CREATE TABLE public.chinese_diet_preparation_modes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Global
    name TEXT NOT NULL, -- Ex: Cozido, Assado, Vapor, Sopa, Chá
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Referências Bibliográficas (Autores e Fontes)
CREATE TABLE public.chinese_diet_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Global
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publication_year INTEGER,
    edition TEXT,
    isbn TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- B. TABELA PRINCIPAL DE ALIMENTOS & CONSOLIDADO
-- =========================================================================

-- 10. Alimentos
CREATE TABLE public.chinese_diet_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Global
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    scientific_name TEXT,
    
    -- Dados Consolidados (adotados pelo sistema/clínica e embasados na literatura)
    consolidated_thermal_nature_id UUID REFERENCES public.chinese_diet_thermal_natures(id) ON DELETE RESTRICT,
    
    -- Controle Editorial e Soft Delete
    editorial_status public.chinese_diet_editorial_status NOT NULL DEFAULT 'published',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Sinônimos ou Nomes Alternativos
CREATE TABLE public.chinese_diet_food_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id UUID NOT NULL REFERENCES public.chinese_diet_foods(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Global
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- C. ASSOCIAÇÕES MUITOS-PARA-MUITOS (N:M) DO CADASTRO CONSOLIDADO
-- =========================================================================

-- 12. Alimentos & Categorias (Permite um alimento estar em mais de uma categoria)
CREATE TABLE public.chinese_diet_food_categories (
    food_id UUID NOT NULL REFERENCES public.chinese_diet_foods(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.chinese_diet_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (food_id, category_id)
);

-- 13. Alimentos & Sabores
CREATE TABLE public.chinese_diet_food_flavors (
    food_id UUID NOT NULL REFERENCES public.chinese_diet_foods(id) ON DELETE CASCADE,
    flavor_id UUID NOT NULL REFERENCES public.chinese_diet_flavors(id) ON DELETE CASCADE,
    PRIMARY KEY (food_id, flavor_id)
);

-- 14. Alimentos & Canais (Tropismo)
CREATE TABLE public.chinese_diet_food_channels (
    food_id UUID NOT NULL REFERENCES public.chinese_diet_foods(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.chinese_diet_channels(id) ON DELETE CASCADE,
    PRIMARY KEY (food_id, channel_id)
);

-- 15. Alimentos & Funções Terapêuticas MTC
CREATE TABLE public.chinese_diet_food_functions (
    food_id UUID NOT NULL REFERENCES public.chinese_diet_foods(id) ON DELETE CASCADE,
    function_id UUID NOT NULL REFERENCES public.chinese_diet_therapeutic_functions(id) ON DELETE CASCADE,
    PRIMARY KEY (food_id, function_id)
);

-- 16. Alimentos & Padrões Indicados (Indicações Clínicas)
CREATE TABLE public.chinese_diet_food_patterns_indicated (
    food_id UUID NOT NULL REFERENCES public.chinese_diet_foods(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES public.chinese_diet_disharmony_patterns(id) ON DELETE CASCADE,
    PRIMARY KEY (food_id, pattern_id)
);

-- 17. Alimentos & Padrões com Cautela (Contraindicações Clínicas)
CREATE TABLE public.chinese_diet_food_patterns_cautions (
    food_id UUID NOT NULL REFERENCES public.chinese_diet_foods(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES public.chinese_diet_disharmony_patterns(id) ON DELETE CASCADE,
    PRIMARY KEY (food_id, pattern_id)
);

-- 18. Alimentos & Modos de Preparo Recomendados
CREATE TABLE public.chinese_diet_food_preparation_modes (
    food_id UUID NOT NULL REFERENCES public.chinese_diet_foods(id) ON DELETE CASCADE,
    mode_id UUID NOT NULL REFERENCES public.chinese_diet_preparation_modes(id) ON DELETE CASCADE,
    PRIMARY KEY (food_id, mode_id)
);

-- =========================================================================
-- D. CLASSIFICAÇÃO ESPECÍFICA POR FONTE / AUTOR (RASTREABILIDADE)
-- =========================================================================

-- 19. Classificação Bibliográfica dos Alimentos por Fonte
CREATE TABLE public.chinese_diet_source_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id UUID NOT NULL REFERENCES public.chinese_diet_foods(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.chinese_diet_sources(id) ON DELETE CASCADE,
    
    -- Propriedades registradas por este autor
    thermal_nature_id UUID REFERENCES public.chinese_diet_thermal_natures(id) ON DELETE RESTRICT,
    page_number VARCHAR(20),
    indications TEXT,
    cautions TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_source_classification UNIQUE(food_id, source_id)
);

-- Relações N:M específicas por Autor/Fonte (Suporta divergências completas)
CREATE TABLE public.chinese_diet_source_classification_flavors (
    classification_id UUID NOT NULL REFERENCES public.chinese_diet_source_classifications(id) ON DELETE CASCADE,
    flavor_id UUID NOT NULL REFERENCES public.chinese_diet_flavors(id) ON DELETE CASCADE,
    PRIMARY KEY (classification_id, flavor_id)
);

CREATE TABLE public.chinese_diet_source_classification_channels (
    classification_id UUID NOT NULL REFERENCES public.chinese_diet_source_classifications(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.chinese_diet_channels(id) ON DELETE CASCADE,
    PRIMARY KEY (classification_id, channel_id)
);

CREATE TABLE public.chinese_diet_source_classification_functions (
    classification_id UUID NOT NULL REFERENCES public.chinese_diet_source_classifications(id) ON DELETE CASCADE,
    function_id UUID NOT NULL REFERENCES public.chinese_diet_therapeutic_functions(id) ON DELETE CASCADE,
    PRIMARY KEY (classification_id, function_id)
);

-- =========================================================================
-- E. INFRAESTRUTURA DE IMPORTAÇÃO DE DADOS
-- =========================================================================

-- 20. Cabeçalho de Importação
CREATE TABLE public.chinese_diet_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Global
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. Linhas Temporárias de Importação para Revisão e Rollback (Normalizada)
CREATE TABLE public.chinese_diet_import_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES public.chinese_diet_imports(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    
    -- Dados Originais da Planilha
    original_name TEXT NOT NULL,
    original_category TEXT,
    original_thermal_nature TEXT,
    original_flavors TEXT,
    original_channels TEXT,
    
    -- Dados Normalizados para Deduplicação e Validação
    normalized_name TEXT NOT NULL,
    
    -- Identificações e Mapeamentos Encontrados
    mapped_category_id UUID REFERENCES public.chinese_diet_categories(id) ON DELETE SET NULL,
    mapped_thermal_nature_id UUID REFERENCES public.chinese_diet_thermal_natures(id) ON DELETE SET NULL,
    
    recognized_flavors UUID[],  -- IDs dos sabores validados
    unrecognized_flavors TEXT[], -- Sabores que não constam no cadastro padrão
    
    recognized_channels UUID[],  -- IDs dos canais/órgãos validados
    unrecognized_channels TEXT[], -- Canais que não constam no cadastro padrão
    
    -- Controle de Duplicidade e Decisão Humana
    possible_duplicate_food_id UUID REFERENCES public.chinese_diet_foods(id) ON DELETE SET NULL,
    review_decision TEXT NOT NULL DEFAULT 'pending' CHECK (review_decision IN ('pending', 'create_new', 'link_to_existing', 'add_synonym', 'discard')),
    
    -- Status do Processamento da Linha
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'error')),
    error_message TEXT,
    
    generated_food_id UUID REFERENCES public.chinese_diet_foods(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    inconsistency_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT unique_import_line UNIQUE(import_id, row_number)
);

-- =========================================================================
-- F. EMISSÃO DE ORIENTAÇÕES DIETÉTICAS, VERSÕES E PDFs
-- =========================================================================

-- 22. Orientações Dietéticas (Prescrições)
CREATE TABLE public.chinese_diet_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    disharmony_pattern TEXT NOT NULL, -- Padrão identificado na avaliação
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 23. Versões das Orientações Dietéticas (Controle Histórico)
CREATE TABLE public.chinese_diet_prescription_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.chinese_diet_prescriptions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Princípios de tratamento selecionados nesta versão
    treatment_principles TEXT[], -- Guardado como texto estático (snapshot do raciocínio clínico)
    general_recommendations TEXT,
    
    -- Snapshot completo em JSONB (Backup de integridade e reprodução fiel do PDF)
    snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Campos extras persistentes do PDF integrados na versão
    accessible_objective TEXT,
    meal_suggestions TEXT,
    reevaluation_date DATE,
    safety_warning TEXT,
    report_type TEXT,
    professional_registry TEXT,

    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT unique_version_number UNIQUE(prescription_id, version_number)
);

-- 24. Relações Estruturadas durante Edição da Prescrição
-- Padrões energéticos identificados nesta prescrição (Edição ativa)
CREATE TABLE public.chinese_diet_prescription_disharmonies (
    prescription_id UUID NOT NULL REFERENCES public.chinese_diet_prescriptions(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES public.chinese_diet_disharmony_patterns(id) ON DELETE RESTRICT,
    PRIMARY KEY (prescription_id, pattern_id)
);

-- Princípios de tratamento definidos nesta prescrição (Edição ativa)
CREATE TABLE public.chinese_diet_prescription_principles (
    prescription_id UUID NOT NULL REFERENCES public.chinese_diet_prescriptions(id) ON DELETE CASCADE,
    principle_id UUID NOT NULL REFERENCES public.chinese_diet_treatment_principles(id) ON DELETE RESTRICT,
    PRIMARY KEY (prescription_id, principle_id)
);

-- 25. Itens da Orientação Dietética (Alimentos Vinculados à Versão)
CREATE TABLE public.chinese_diet_prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_version_id UUID NOT NULL REFERENCES public.chinese_diet_prescription_versions(id) ON DELETE CASCADE,
    food_id UUID REFERENCES public.chinese_diet_foods(id) ON DELETE SET NULL,
    
    -- Cópia dos dados do alimento na data da prescrição (Snapshot)
    food_name TEXT NOT NULL,
    food_thermal_nature TEXT NOT NULL,
    food_flavors TEXT NOT NULL,
    food_channels TEXT NOT NULL,
    
    -- Nível de recomendação clínica e nota de preparo customizada
    recommendation_level public.chinese_diet_recommendation_level NOT NULL,
    custom_prep_notes TEXT, -- Ex: "Consumir cozido ou assado em sopas com gengibre"
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 26. Arquivos PDF Emitidos e Armazenados
CREATE TABLE public.chinese_diet_prescription_pdfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_version_id UUID NOT NULL REFERENCES public.chinese_diet_prescription_versions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Caminho do bucket de storage no Supabase
    file_size INTEGER,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- G. HISTÓRICO E AUDITORIA DETALHADA
-- =========================================================================

-- 27. Log de Histórico de Alterações de Alimentos
CREATE TABLE public.chinese_diet_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL = Global
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    food_id UUID REFERENCES public.chinese_diet_foods(id) ON DELETE SET NULL,
    action public.chinese_diet_audit_action NOT NULL,
    changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb, -- Armazena diff {"thermal_nature_id": ["old_id", "new_id"]}
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- H. PROCEDURES & FUNÇÕES CLÍNICAS TRANSACIONAIS (ROLLBACK SEGURO)
-- =========================================================================

-- 28. Função de Rollback Seguro de Importações
CREATE OR REPLACE FUNCTION public.rollback_chinese_diet_import(p_import_id UUID)
RETURNS TABLE(foods_deleted INT, lines_deleted INT, skipped_foods INT) AS $$
DECLARE
    v_deleted_foods INT := 0;
    v_skipped_foods INT := 0;
    v_deleted_lines INT := 0;
BEGIN
    -- 1. Determina quais alimentos gerados por esta importação já estão em uso ou foram alterados
    -- E desassocia a referência gerada nas linhas que não podem ser excluídas
    UPDATE public.chinese_diet_import_lines
    SET generated_food_id = NULL
    WHERE import_id = p_import_id
      AND generated_food_id IN (
          SELECT id FROM public.chinese_diet_foods f
          WHERE f.editorial_status IN ('published', 'reviewed')
             OR f.updated_at > f.created_at
             OR EXISTS (
                 SELECT 1 FROM public.chinese_diet_prescription_items pi 
                 WHERE pi.food_id = f.id
             )
      );

    -- 2. Exclui os alimentos associados não alterados/não usados
    WITH deleted_rows AS (
        DELETE FROM public.chinese_diet_foods
        WHERE id IN (
            SELECT generated_food_id 
            FROM public.chinese_diet_import_lines 
            WHERE import_id = p_import_id 
              AND generated_food_id IS NOT NULL
        )
        RETURNING id
    )
    SELECT count(*) INTO v_deleted_foods FROM deleted_rows;

    -- 3. Conta alimentos pulados (que estavam em uso)
    SELECT count(*) INTO v_skipped_foods
    FROM public.chinese_diet_import_lines
    WHERE import_id = p_import_id AND generated_food_id IS NULL;

    -- 4. Exclui as linhas temporárias de importação
    DELETE FROM public.chinese_diet_import_lines WHERE import_id = p_import_id;
    GET DIAGNOSTICS v_deleted_lines = ROW_COUNT;

    -- 5. Exclui o cabeçalho da importação
    DELETE FROM public.chinese_diet_imports WHERE id = p_import_id;

    RETURN QUERY SELECT v_deleted_foods, v_deleted_lines, v_skipped_foods;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- I. ÍNDICES DE UNICIDADE PARCIAIS (DEDUPLICAÇÃO GLOBAL E LOCAL)
-- =========================================================================

-- Índices de Unicidade de Alimentos por normalized_name (Global vs Local)
CREATE UNIQUE INDEX idx_foods_normalized_name_global 
ON public.chinese_diet_foods(normalized_name) 
WHERE (organization_id IS NULL AND deleted_at IS NULL);

CREATE UNIQUE INDEX idx_foods_normalized_name_org 
ON public.chinese_diet_foods(organization_id, normalized_name) 
WHERE (organization_id IS NOT NULL AND deleted_at IS NULL);

-- Índices de Unicidade de Sinônimos (Global vs Local)
CREATE UNIQUE INDEX idx_synonyms_normalized_global
ON public.chinese_diet_food_synonyms(normalized_name)
WHERE (organization_id IS NULL);

CREATE UNIQUE INDEX idx_synonyms_normalized_org
ON public.chinese_diet_food_synonyms(organization_id, normalized_name)
WHERE (organization_id IS NOT NULL);

-- Unicidade com COALESCE para tabelas de apoio
CREATE UNIQUE INDEX unique_category_org_name 
    ON public.chinese_diet_categories (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name)));

CREATE UNIQUE INDEX unique_function_org_desc 
    ON public.chinese_diet_therapeutic_functions (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(description)));

CREATE UNIQUE INDEX unique_pattern_org_name 
    ON public.chinese_diet_disharmony_patterns (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name)));

CREATE UNIQUE INDEX unique_principle_org_name 
    ON public.chinese_diet_treatment_principles (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name)));

CREATE UNIQUE INDEX unique_prep_org_name 
    ON public.chinese_diet_preparation_modes (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name)));

CREATE UNIQUE INDEX unique_source_org_title_author 
    ON public.chinese_diet_sources (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(title)), LOWER(TRIM(author)));

-- Unicidade de arquivo hash de importação (Global vs Local)
CREATE UNIQUE INDEX unique_import_hash_org 
ON public.chinese_diet_imports (organization_id, file_hash) 
WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX unique_import_hash_global 
ON public.chinese_diet_imports (file_hash) 
WHERE organization_id IS NULL;

-- Garantia de Versão Única Ativa por Orientação
CREATE UNIQUE INDEX idx_prescriptions_only_one_active 
ON public.chinese_diet_prescription_versions(prescription_id) 
WHERE (is_active = true);

-- Índices de performance
CREATE INDEX idx_diet_foods_org ON public.chinese_diet_foods(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_diet_synonyms_name ON public.chinese_diet_food_synonyms(name);
CREATE INDEX idx_diet_import_lines_status ON public.chinese_diet_import_lines(import_id, editorial_status);
CREATE INDEX idx_diet_prescriptions_patient ON public.chinese_diet_prescriptions(patient_id);
CREATE INDEX idx_diet_prescription_versions_active ON public.chinese_diet_prescription_versions(prescription_id) WHERE is_active = true;

-- =========================================================================
-- J. POLÍTICAS DE SEGURANÇA POR TENANT (RLS)
-- =========================================================================

-- 1. Categorias
ALTER TABLE public.chinese_diet_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select categories" ON public.chinese_diet_categories
    FOR SELECT USING (organization_id IS NULL OR organization_id = public.get_current_org_id());
CREATE POLICY "Write categories" ON public.chinese_diet_categories
    FOR ALL USING (organization_id = public.get_current_org_id()) WITH CHECK (organization_id = public.get_current_org_id());

-- 2. Naturezas (Global)
ALTER TABLE public.chinese_diet_thermal_natures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select thermal natures" ON public.chinese_diet_thermal_natures FOR SELECT USING (true);

-- 3. Sabores (Global)
ALTER TABLE public.chinese_diet_flavors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select flavors" ON public.chinese_diet_flavors FOR SELECT USING (true);

-- 4. Canais (Global)
ALTER TABLE public.chinese_diet_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select channels" ON public.chinese_diet_channels FOR SELECT USING (true);

-- 5. Funções Terapêuticas
ALTER TABLE public.chinese_diet_therapeutic_functions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select functions" ON public.chinese_diet_therapeutic_functions
    FOR SELECT USING (organization_id IS NULL OR organization_id = public.get_current_org_id());
CREATE POLICY "Write functions" ON public.chinese_diet_therapeutic_functions
    FOR ALL USING (organization_id = public.get_current_org_id()) WITH CHECK (organization_id = public.get_current_org_id());

-- 6. Padrões Energéticos
ALTER TABLE public.chinese_diet_disharmony_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select disharmony patterns" ON public.chinese_diet_disharmony_patterns
    FOR SELECT USING (organization_id IS NULL OR organization_id = public.get_current_org_id());
CREATE POLICY "Write disharmony patterns" ON public.chinese_diet_disharmony_patterns
    FOR ALL USING (organization_id = public.get_current_org_id()) WITH CHECK (organization_id = public.get_current_org_id());

-- 7. Princípios de Tratamento
ALTER TABLE public.chinese_diet_treatment_principles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select treatment principles" ON public.chinese_diet_treatment_principles
    FOR SELECT USING (organization_id IS NULL OR organization_id = public.get_current_org_id());
CREATE POLICY "Write treatment principles" ON public.chinese_diet_treatment_principles
    FOR ALL USING (organization_id = public.get_current_org_id()) WITH CHECK (organization_id = public.get_current_org_id());

-- 8. Modos de Preparo
ALTER TABLE public.chinese_diet_preparation_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select prep modes" ON public.chinese_diet_preparation_modes
    FOR SELECT USING (organization_id IS NULL OR organization_id = public.get_current_org_id());
CREATE POLICY "Write prep modes" ON public.chinese_diet_preparation_modes
    FOR ALL USING (organization_id = public.get_current_org_id()) WITH CHECK (organization_id = public.get_current_org_id());

-- 9. Fontes/Referências
ALTER TABLE public.chinese_diet_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select sources" ON public.chinese_diet_sources
    FOR SELECT USING (organization_id IS NULL OR organization_id = public.get_current_org_id());
CREATE POLICY "Write sources" ON public.chinese_diet_sources
    FOR ALL USING (organization_id = public.get_current_org_id()) WITH CHECK (organization_id = public.get_current_org_id());

-- 10. Alimentos
ALTER TABLE public.chinese_diet_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select foods" ON public.chinese_diet_foods
    FOR SELECT USING (deleted_at IS NULL AND (organization_id IS NULL OR organization_id = public.get_current_org_id()));
CREATE POLICY "Write foods" ON public.chinese_diet_foods
    FOR ALL USING (organization_id = public.get_current_org_id()) WITH CHECK (organization_id = public.get_current_org_id());

-- 11. Sinônimos
ALTER TABLE public.chinese_diet_food_synonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select synonyms" ON public.chinese_diet_food_synonyms
    FOR SELECT USING (organization_id IS NULL OR organization_id = public.get_current_org_id());
CREATE POLICY "Write synonyms" ON public.chinese_diet_food_synonyms
    FOR ALL USING (organization_id = public.get_current_org_id()) WITH CHECK (organization_id = public.get_current_org_id());

-- 12-18. Junções N:M (Lógica baseada na leitura do Alimento)
ALTER TABLE public.chinese_diet_food_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select food categories" ON public.chinese_diet_food_categories
    FOR SELECT USING (food_id IN (SELECT id FROM public.chinese_diet_foods));
CREATE POLICY "Write food categories" ON public.chinese_diet_food_categories
    FOR ALL USING (food_id IN (SELECT id FROM public.chinese_diet_foods WHERE organization_id = public.get_current_org_id()));

ALTER TABLE public.chinese_diet_food_flavors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select food flavors" ON public.chinese_diet_food_flavors
    FOR SELECT USING (food_id IN (SELECT id FROM public.chinese_diet_foods));
CREATE POLICY "Write food flavors" ON public.chinese_diet_food_flavors
    FOR ALL USING (food_id IN (SELECT id FROM public.chinese_diet_foods WHERE organization_id = public.get_current_org_id()));

ALTER TABLE public.chinese_diet_food_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select food channels" ON public.chinese_diet_food_channels
    FOR SELECT USING (food_id IN (SELECT id FROM public.chinese_diet_foods));
CREATE POLICY "Write food channels" ON public.chinese_diet_food_channels
    FOR ALL USING (food_id IN (SELECT id FROM public.chinese_diet_foods WHERE organization_id = public.get_current_org_id()));

ALTER TABLE public.chinese_diet_food_functions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select food functions" ON public.chinese_diet_food_functions
    FOR SELECT USING (food_id IN (SELECT id FROM public.chinese_diet_foods));
CREATE POLICY "Write food functions" ON public.chinese_diet_food_functions
    FOR ALL USING (food_id IN (SELECT id FROM public.chinese_diet_foods WHERE organization_id = public.get_current_org_id()));

ALTER TABLE public.chinese_diet_food_patterns_indicated ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select food patterns indicated" ON public.chinese_diet_food_patterns_indicated
    FOR SELECT USING (food_id IN (SELECT id FROM public.chinese_diet_foods));
CREATE POLICY "Write food patterns indicated" ON public.chinese_diet_food_patterns_indicated
    FOR ALL USING (food_id IN (SELECT id FROM public.chinese_diet_foods WHERE organization_id = public.get_current_org_id()));

ALTER TABLE public.chinese_diet_food_patterns_cautions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select food patterns cautions" ON public.chinese_diet_food_patterns_cautions
    FOR SELECT USING (food_id IN (SELECT id FROM public.chinese_diet_foods));
CREATE POLICY "Write food patterns cautions" ON public.chinese_diet_food_patterns_cautions
    FOR ALL USING (food_id IN (SELECT id FROM public.chinese_diet_foods WHERE organization_id = public.get_current_org_id()));

ALTER TABLE public.chinese_diet_food_preparation_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select food prep modes" ON public.chinese_diet_food_preparation_modes
    FOR SELECT USING (food_id IN (SELECT id FROM public.chinese_diet_foods));
CREATE POLICY "Write food prep modes" ON public.chinese_diet_food_preparation_modes
    FOR ALL USING (food_id IN (SELECT id FROM public.chinese_diet_foods WHERE organization_id = public.get_current_org_id()));

-- 19. Classificação Bibliográfica por Fonte
ALTER TABLE public.chinese_diet_source_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select source classifications" ON public.chinese_diet_source_classifications
    FOR SELECT USING (food_id IN (SELECT id FROM public.chinese_diet_foods));
CREATE POLICY "Write source classifications" ON public.chinese_diet_source_classifications
    FOR ALL USING (food_id IN (SELECT id FROM public.chinese_diet_foods WHERE organization_id = public.get_current_org_id()));

-- 20. Importações (Isolamento por Tenant com suporte a Global)
ALTER TABLE public.chinese_diet_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Select imports" ON public.chinese_diet_imports
    FOR SELECT USING (organization_id IS NULL OR organization_id = public.get_current_org_id());
CREATE POLICY "Write imports" ON public.chinese_diet_imports
    FOR ALL USING (
        -- Permite apenas se for local do tenant ou se for global e o usuário for administrador do sistema
        (organization_id = public.get_current_org_id()) OR
        (organization_id IS NULL AND auth.email() = 'suporte@axissystemas.com.br')
    );

-- 21. Linhas de Importação
ALTER TABLE public.chinese_diet_import_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access import lines" ON public.chinese_diet_import_lines
    FOR ALL USING (
        import_id IN (
            SELECT id FROM public.chinese_diet_imports 
            WHERE (organization_id IS NULL OR organization_id = public.get_current_org_id())
        )
    );

-- 22. Prescrições
ALTER TABLE public.chinese_diet_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access prescriptions" ON public.chinese_diet_prescriptions
    FOR ALL USING (organization_id = public.get_current_org_id()) WITH CHECK (organization_id = public.get_current_org_id());

-- 23. Versões de Prescrição
ALTER TABLE public.chinese_diet_prescription_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access prescription versions" ON public.chinese_diet_prescription_versions
    FOR ALL USING (prescription_id IN (SELECT id FROM public.chinese_diet_prescriptions WHERE organization_id = public.get_current_org_id()));

-- 24. Relações de Edição Ativa
ALTER TABLE public.chinese_diet_prescription_disharmonies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access prescription disharmonies" ON public.chinese_diet_prescription_disharmonies
    FOR ALL USING (prescription_id IN (SELECT id FROM public.chinese_diet_prescriptions WHERE organization_id = public.get_current_org_id()));

ALTER TABLE public.chinese_diet_prescription_principles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access prescription principles" ON public.chinese_diet_prescription_principles
    FOR ALL USING (prescription_id IN (SELECT id FROM public.chinese_diet_prescriptions WHERE organization_id = public.get_current_org_id()));

-- 25. Itens da Prescrição
ALTER TABLE public.chinese_diet_prescription_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access prescription items" ON public.chinese_diet_prescription_items
    FOR ALL USING (prescription_version_id IN (
        SELECT id FROM public.chinese_diet_prescription_versions WHERE prescription_id IN (
            SELECT id FROM public.chinese_diet_prescriptions WHERE organization_id = public.get_current_org_id()
        )
    ));

-- 26. PDFs da Prescrição
ALTER TABLE public.chinese_diet_prescription_pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access prescription pdfs" ON public.chinese_diet_prescription_pdfs
    FOR ALL USING (prescription_version_id IN (
        SELECT id FROM public.chinese_diet_prescription_versions WHERE prescription_id IN (
            SELECT id FROM public.chinese_diet_prescriptions WHERE organization_id = public.get_current_org_id()
        )
    ));

-- 27. Auditoria de Log
ALTER TABLE public.chinese_diet_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access audit logs" ON public.chinese_diet_audit_logs
    FOR ALL USING (organization_id = public.get_current_org_id()) WITH CHECK (organization_id = public.get_current_org_id());

-- =========================================================================
-- K. DADOS DE SEED INICIAL (CARGA DINÂMICA DE REFERÊNCIA)
-- =========================================================================

-- Seed de Naturezas Térmicas
INSERT INTO public.chinese_diet_thermal_natures (name, description) VALUES
('Quente', 'Aumenta o Yang, dispersa o Frio e aquece o Interior.'),
('Morno', 'Aquece levemente o Interior e tonifica o Qi/Yang.'),
('Neutro', 'Não altera a temperatura corporal, harmoniza e estabiliza.'),
('Fresco', 'Refresca levemente o Calor e clareia os fluidos do corpo.'),
('Frio', 'Elimina o Calor de forma acentuada, dispersa o Fogo e purga toxinas.')
ON CONFLICT (name) DO NOTHING;

-- Seed de Sabores Clássicos
INSERT INTO public.chinese_diet_flavors (name, description) VALUES
('Doce', 'Tonifica, harmoniza e umedece. Relaciona-se ao elemento Terra (Baço/Estômago).'),
('Picante', 'Dispersa, move o Qi e o Sangue. Relaciona-se ao elemento Metal (Pulmão/Intestino Grosso).'),
('Amargo', 'Seca a umidade, drena para baixo e clareia o Calor. Relaciona-se ao elemento Fogo (Coração/Intestino Delgado).'),
('Azedo', 'Adstringe, consolida fluidos e retém energia. Relaciona-se ao elemento Madeira (Fígado/Vesícula Biliar).'),
('Salgado', 'Suaviza durezas, dissolve nódulos e drena para baixo. Relaciona-se ao elemento Água (Rim/Bexiga).'),
('Adstringente', 'Semelhante ao azedo, retém a transpiração, diarreia e fluidos corporais.')
ON CONFLICT (name) DO NOTHING;

-- Seed de Canais / Meridianos MTC (Zang Fu)
INSERT INTO public.chinese_diet_channels (name, abbreviation, description) VALUES
('Baço', 'BP', 'Meridiano do Baço-Pâncreas (Tai Yin do Pé)'),
('Estômago', 'E', 'Meridiano do Estômago (Yang Ming do Pé)'),
('Fígado', 'F', 'Meridiano do Fígado (Jue Yin do Pé)'),
('Coração', 'C', 'Meridiano do Coração (Shao Yin da Mão)'),
('Pulmão', 'P', 'Meridiano do Pulmão (Tai Yin da Mão)'),
('Rim', 'R', 'Meridiano do Rim (Shao Yin do Pé)'),
('Intestino Grosso', 'IG', 'Meridiano do Intestino Grosso (Yang Ming da Mão)'),
('Intestino Delgado', 'ID', 'Meridiano do Intestino Delgado (Tai Yang da Mão)'),
('Bexiga', 'B', 'Meridiano da Bexiga (Tai Yang do Pé)'),
('Vesícula Biliar', 'VB', 'Meridiano da Vesícula Biliar (Shao Yang do Pé)'),
('Pericárdio', 'PC', 'Meridiano do Pericárdio / Circulação-Sexo (Jue Yin da Mão)'),
('Triplo Aquecedor', 'TA', 'Meridiano do Triplo Aquecedor (Shao Yang da Mão)')
ON CONFLICT (name) DO NOTHING;
