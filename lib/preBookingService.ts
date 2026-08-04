import { supabase } from '@/lib/supabase';
import { CreatePreBookingDTO, PreBookingRequest, PublicProtocolStatus } from '@/types/preBooking';
import { logAction } from '@/lib/auditLogService';

const DEFAULT_SLOTS = [
  '08:00', '08:45', '09:30', '10:15', '11:00',
  '13:30', '14:15', '15:00', '15:45', '16:30', '17:15'
];

function generateProtocol(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomHash = '';
  for (let i = 0; i < 5; i++) {
    randomHash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PRE-${dateStr}-${randomHash}`;
}

export async function getAvailableSlots(dateStr: string): Promise<string[]> {
  if (!supabase) return DEFAULT_SLOTS;

  try {
    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('time, status')
      .eq('date', dateStr)
      .neq('status', 'cancelled');

    const { data: existingPreBookings } = await (supabase as any)
      .from('pre_booking_requests')
      .select('requested_time, status')
      .eq('requested_date', dateStr)
      .eq('status', 'PENDENTE');

    const busyTimes = new Set<string>();

    if (existingAppts) {
      existingAppts.forEach((app: any) => {
        if (app.time) busyTimes.add(app.time.slice(0, 5));
      });
    }

    if (existingPreBookings) {
      existingPreBookings.forEach((req: any) => {
        if (req.requested_time) busyTimes.add(req.requested_time.slice(0, 5));
      });
    }

    const freeSlots = DEFAULT_SLOTS.filter(slot => !busyTimes.has(slot));
    return freeSlots;
  } catch (err) {
    console.error('Erro ao calcular horários livres:', err);
    return DEFAULT_SLOTS;
  }
}

export async function createPreBookingRequest(
  data: CreatePreBookingDTO,
  ipAddress?: string
): Promise<{ success: boolean; protocol?: string; message?: string }> {
  if (data.honeypot && data.honeypot.trim().length > 0) {
    return { success: true, protocol: 'PRE-ROBOT-PASS', message: 'Solicitação registrada com sucesso!' };
  }

  if (!data.patient_name || !data.patient_email || !data.patient_phone || !data.requested_date || !data.requested_time) {
    return { success: false, message: 'Preencha todos os campos obrigatórios.' };
  }

  if (!supabase) {
    return { success: false, message: 'Serviço temporariamente indisponível.' };
  }

  try {
    const availableSlots = await getAvailableSlots(data.requested_date);
    if (!availableSlots.includes(data.requested_time)) {
      return { 
        success: false, 
        message: 'O horário selecionado acabou de ser reservado por outro paciente. Escolha outro horário.' 
      };
    }

    const protocol = generateProtocol();

    const insertPayload = {
      protocol,
      patient_name: data.patient_name.trim(),
      patient_email: data.patient_email.trim().toLowerCase(),
      patient_phone: data.patient_phone.trim(),
      patient_cpf: data.patient_cpf ? data.patient_cpf.trim() : null,
      birth_date: data.birth_date || null,
      requested_date: data.requested_date,
      requested_time: data.requested_time,
      duration: 45,
      service_type: data.service_type || 'Primeira Consulta',
      notes: data.notes ? data.notes.trim() : null,
      status: 'PENDENTE',
      lgpd_consent: true,
      lgpd_consent_at: new Date().toISOString(),
      ip_address: ipAddress || 'client-web'
    };

    const { error } = await (supabase as any)
      .from('pre_booking_requests')
      .insert([insertPayload]);

    if (error) {
      console.error('Erro ao gravar pré-agendamento:', error);
      throw error;
    }

    return {
      success: true,
      protocol,
      message: 'Sua solicitação de pré-agendamento foi enviada com sucesso!'
    };
  } catch (err: any) {
    console.error('Erro no createPreBookingRequest:', err);
    return { 
      success: false, 
      message: err.message || 'Erro ao processar pré-agendamento. Tente novamente em instantes.' 
    };
  }
}

export async function getPreBookingStatusByProtocol(protocol: string): Promise<PublicProtocolStatus | null> {
  if (!supabase || !protocol) return null;

  try {
    const { data, error } = await (supabase as any)
      .from('pre_booking_requests')
      .select('protocol, patient_name, requested_date, requested_time, service_type, status, rejection_reason, proposed_date, proposed_time, created_at')
      .eq('protocol', protocol.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) return null;

    const nameParts = data.patient_name.split(' ');
    const maskedName = nameParts.map((part: string, idx: number) => {
      if (idx === 0) return part;
      return part.charAt(0) + '***';
    }).join(' ');

    return {
      protocol: data.protocol,
      patient_name: maskedName,
      requested_date: data.requested_date,
      requested_time: data.requested_time,
      service_type: data.service_type,
      status: data.status,
      rejection_reason: data.rejection_reason,
      proposed_date: data.proposed_date,
      proposed_time: data.proposed_time,
      created_at: data.created_at
    };
  } catch (err) {
    console.error('Erro ao buscar protocolo público:', err);
    return null;
  }
}

export async function fetchPreBookingRequests(): Promise<PreBookingRequest[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await (supabase as any)
      .from('pre_booking_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Tabela pre_booking_requests não encontrada ou sem permissão:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Erro ao listar pré-agendamentos admin:', err);
    return [];
  }
}

export async function approvePreBookingRequest(
  requestId: string,
  adminUserId: string
): Promise<{ success: boolean; appointmentId?: string; patientName?: string; message?: string }> {
  if (!supabase) return { success: false, message: 'Supabase indisponível' };

  try {
    const { data: request, error: reqErr } = await (supabase as any)
      .from('pre_booking_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqErr || !request) {
      return { success: false, message: 'Solicitação não encontrada.' };
    }

    let patientId = request.converted_patient_id;

    if (!patientId) {
      if (request.patient_cpf) {
        const { data: existingPat } = await supabase
          .from('patients')
          .select('id')
          .eq('cpf', request.patient_cpf)
          .maybeSingle();
        if (existingPat) patientId = existingPat.id;
      }

      if (!patientId && request.patient_email) {
        const { data: existingPat } = await supabase
          .from('patients')
          .select('id')
          .eq('email', request.patient_email)
          .maybeSingle();
        if (existingPat) patientId = existingPat.id;
      }

      if (!patientId) {
        const newPatientPayload = {
          name: request.patient_name,
          email: request.patient_email,
          phone: request.patient_phone,
          cpf: request.patient_cpf || null,
          birth_date: request.birth_date || null,
          status: 'Ativo',
          created_by: adminUserId === 'native-admin' ? null : adminUserId
        };

        const { data: createdPat, error: createPatErr } = await supabase
          .from('patients')
          .insert([newPatientPayload])
          .select('id')
          .single();

        if (createPatErr) throw createPatErr;
        patientId = createdPat.id;
      }
    }

    const appointmentPayload = {
      patient_id: patientId,
      patient_name: request.patient_name,
      date: request.proposed_date || request.requested_date,
      time: request.proposed_time || request.requested_time,
      duration: request.duration || 45,
      type: request.service_type || 'Primeira Consulta',
      status: 'scheduled',
      payment_status: 'pendente',
      notes: `[Pré-Agendamento Protocolo: ${request.protocol}] ${request.notes || ''}`,
      created_by: adminUserId === 'native-admin' ? null : adminUserId
    };

    const { data: newAppt, error: apptErr } = await supabase
      .from('appointments')
      .insert([appointmentPayload])
      .select('id')
      .single();

    if (apptErr) throw apptErr;

    const { error: updateErr } = await (supabase as any)
      .from('pre_booking_requests')
      .update({
        status: 'CONFIRMADO',
        converted_appointment_id: newAppt.id,
        converted_patient_id: patientId,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateErr) {
      console.error('Erro ao atualizar status do pré-agendamento:', updateErr);
      throw updateErr;
    }

    await logAction({
      action: 'UPDATE',
      entityType: 'APPOINTMENTS',
      userId: adminUserId,
      details: { summary: `Pré-agendamento ${request.protocol} aprovado e convertido em agendamento`, id: newAppt.id }
    });

    return {
      success: true,
      appointmentId: newAppt.id,
      patientName: request.patient_name,
      message: 'Solicitação aprovada e agendamento criado com sucesso!'
    };
  } catch (err: any) {
    console.error('Erro ao aprovar pré-agendamento:', err);
    return { success: false, message: err.message || 'Erro ao aprovar solicitação.' };
  }
}

export async function rejectPreBookingRequest(
  requestId: string,
  reason: string,
  adminUserId: string
): Promise<{ success: boolean; message?: string }> {
  if (!supabase) return { success: false, message: 'Supabase indisponível' };

  try {
    const { error } = await (supabase as any)
      .from('pre_booking_requests')
      .update({
        status: 'RECUSADO',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;

    await logAction({
      action: 'UPDATE',
      entityType: 'APPOINTMENTS',
      userId: adminUserId,
      details: { summary: `Pré-agendamento recusado. Motivo: ${reason}`, id: requestId }
    });

    return { success: true, message: 'Solicitação recusada.' };
  } catch (err: any) {
    console.error('Erro ao recusar pré-agendamento:', err);
    return { success: false, message: err.message || 'Erro ao recusar solicitação.' };
  }
}

export async function proposeNewSlot(
  requestId: string,
  proposedDate: string,
  proposedTime: string,
  adminUserId: string
): Promise<{ success: boolean; message?: string }> {
  if (!supabase) return { success: false, message: 'Supabase indisponível' };

  try {
    const { error } = await (supabase as any)
      .from('pre_booking_requests')
      .update({
        status: 'PROPOSTA_ALTERADA',
        proposed_date: proposedDate,
        proposed_time: proposedTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;

    await logAction({
      action: 'UPDATE',
      entityType: 'APPOINTMENTS',
      userId: adminUserId,
      details: { summary: `Novo horário proposto para solicitação (${proposedDate} às ${proposedTime})`, id: requestId }
    });

    return { success: true, message: 'Nova proposta de horário salva.' };
  } catch (err: any) {
    console.error('Erro ao propor novo horário:', err);
    return { success: false, message: err.message || 'Erro ao salvar nova proposta.' };
  }
}
