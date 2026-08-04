export type PreBookingStatus = 'PENDENTE' | 'CONFIRMADO' | 'RECUSADO' | 'CANCELADO' | 'PROPOSTA_ALTERADA';

export interface PreBookingRequest {
  id: string;
  organization_id?: string | null;
  protocol: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  patient_cpf?: string | null;
  birth_date?: string | null;
  requested_date: string; // YYYY-MM-DD
  requested_time: string; // HH:mm
  duration: number;
  service_type: string;
  notes?: string | null;
  status: PreBookingStatus;
  rejection_reason?: string | null;
  proposed_date?: string | null;
  proposed_time?: string | null;
  converted_appointment_id?: string | null;
  converted_patient_id?: string | null;
  lgpd_consent: boolean;
  lgpd_consent_at: string;
  ip_address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePreBookingDTO {
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  patient_cpf?: string;
  birth_date?: string;
  requested_date: string;
  requested_time: string;
  service_type: string;
  notes?: string;
  honeypot?: string; // Bot protection
}

export interface PublicProtocolStatus {
  protocol: string;
  patient_name: string;
  requested_date: string;
  requested_time: string;
  service_type: string;
  status: PreBookingStatus;
  rejection_reason?: string | null;
  proposed_date?: string | null;
  proposed_time?: string | null;
  created_at: string;
}
