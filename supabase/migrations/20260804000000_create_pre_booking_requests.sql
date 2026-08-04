-- Migration: Create pre_booking_requests table and permissions
-- Date: 2026-08-04

CREATE TABLE IF NOT EXISTS public.pre_booking_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    protocol TEXT UNIQUE NOT NULL,
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    patient_cpf TEXT,
    birth_date DATE,
    requested_date DATE NOT NULL,
    requested_time TEXT NOT NULL,
    duration INTEGER DEFAULT 45,
    service_type TEXT NOT NULL DEFAULT 'Primeira Consulta',
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'RECUSADO', 'CANCELADO', 'PROPOSTA_ALTERADA')),
    rejection_reason TEXT,
    proposed_date DATE,
    proposed_time TEXT,
    converted_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    converted_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    lgpd_consent BOOLEAN NOT NULL DEFAULT true,
    lgpd_consent_at TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for protocol lookup and status queries
CREATE INDEX IF NOT EXISTS idx_pre_booking_protocol ON public.pre_booking_requests(protocol);
CREATE INDEX IF NOT EXISTS idx_pre_booking_status ON public.pre_booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_pre_booking_requested_date ON public.pre_booking_requests(requested_date);

-- Grant full permissions to anon, authenticated and service_role for Native Admin & client operations
GRANT ALL ON TABLE public.pre_booking_requests TO anon, authenticated, service_role;
ALTER TABLE public.pre_booking_requests DISABLE ROW LEVEL SECURITY;
