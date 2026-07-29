-- Migration: Patient Attachments Table and Storage Bucket Policies
-- Created: 2026-07-28

CREATE TABLE IF NOT EXISTS public.patient_attachments (
    id TEXT PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    title TEXT,
    notes TEXT,
    file_size INTEGER,
    mime_type TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Permitir leitura de anexos de pacientes" 
    ON public.patient_attachments FOR SELECT 
    USING (true);

CREATE POLICY "Permitir inserção e atualização de anexos de pacientes" 
    ON public.patient_attachments FOR ALL 
    USING (true);

-- Criar bucket no storage caso não exista (via extensão/função Supabase)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('patient-attachments', 'patient-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Política de Acesso ao Storage
CREATE POLICY "Permitir leitura publica dos anexos" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'patient-attachments');

CREATE POLICY "Permitir envio de anexos para o storage" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'patient-attachments');

CREATE POLICY "Permitir exclusao de anexos do storage" 
    ON storage.objects FOR DELETE 
    USING (bucket_id = 'patient-attachments');
