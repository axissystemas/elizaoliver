-- Migration: Fix pre_booking_requests table columns, policies and permissions
-- Date: 2026-08-05

ALTER TABLE public.pre_booking_requests 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS converted_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS proposed_date DATE,
  ADD COLUMN IF NOT EXISTS proposed_time TEXT;

-- Grant permissions to anon, authenticated and service_role
GRANT ALL ON TABLE public.pre_booking_requests TO anon, authenticated, service_role;
ALTER TABLE public.pre_booking_requests DISABLE ROW LEVEL SECURITY;
