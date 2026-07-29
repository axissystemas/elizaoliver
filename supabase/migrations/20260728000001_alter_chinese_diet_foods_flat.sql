-- Migration: Add flat columns to chinese_diet_foods table to support full SaaS catalog sync
-- Created: 2026-07-28

ALTER TABLE public.chinese_diet_foods 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Outros',
ADD COLUMN IF NOT EXISTS thermal_nature TEXT DEFAULT 'Neutro',
ADD COLUMN IF NOT EXISTS energy_direction TEXT DEFAULT 'Neutro',
ADD COLUMN IF NOT EXISTS flavors TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS channels TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS used_part TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS synonyms TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS therapeutic_functions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS indicated_patterns TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS caution_patterns TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preparation_modes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
ADD COLUMN IF NOT EXISTS culinary_notes TEXT,
ADD COLUMN IF NOT EXISTS contraindications TEXT,
ADD COLUMN IF NOT EXISTS allergens TEXT,
ADD COLUMN IF NOT EXISTS restrictions TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS divergences JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS audit_logs JSONB DEFAULT '[]'::jsonb;

-- Permissões RLS públicas para leitura e escrita na tabela de alimentos
ALTER TABLE public.chinese_diet_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for chinese_diet_foods" ON public.chinese_diet_foods;
CREATE POLICY "Allow public read access for chinese_diet_foods" ON public.chinese_diet_foods FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete for chinese_diet_foods" ON public.chinese_diet_foods;
CREATE POLICY "Allow authenticated insert/update/delete for chinese_diet_foods" ON public.chinese_diet_foods FOR ALL USING (true);
