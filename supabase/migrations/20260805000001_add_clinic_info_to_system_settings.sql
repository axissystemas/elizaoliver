-- Migration: Add clinic_info JSONB column to system_settings and allow anon select
-- Date: 2026-08-05

ALTER TABLE public.system_settings 
  ADD COLUMN IF NOT EXISTS clinic_info JSONB DEFAULT '{}'::jsonb;

-- Grant SELECT to anon (for public pages like /pre-agendamento)
GRANT SELECT ON TABLE public.system_settings TO anon, authenticated, service_role;

-- Allow anon to read system_settings (if RLS is active)
DROP POLICY IF EXISTS "Public users can read system settings" ON public.system_settings;
CREATE POLICY "Public users can read system settings" ON public.system_settings FOR SELECT USING (true);
