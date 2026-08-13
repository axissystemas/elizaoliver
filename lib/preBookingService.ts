import { supabase } from '@/lib/supabase';
import { CreatePreBookingDTO, PreBookingRequest, PublicProtocolStatus } from '@/types/preBooking';
import { logAction } from '@/lib/auditLogService';

const DEFAULT_SLOTS_45 = [
  '08:00', '08:45', '09:30', '10:15', '11:00',
  '13:30', '14:15', '15:00', '15:45', '16:30', '17:15'
];

const DEFAULT_SLOTS_60 = [
  '08:00', '09:00', '10:00', '11:00',
  '13:30', '14:30', '15:30', '16:30'
];

const isUuid = (str?: string | null) => !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/i.test(str);

export function cleanCpf(cpf?: string | null): string {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
}

export function formatCpf(val?: string | null): string {
  const digits = cleanCpf(val);
  if (!digits) return '';
  return digits
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function isValidCpf(val?: string | null): boolean {
  const digits = cleanCpf(val);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  let remainder;
  for (let i = 1; i <= 9; i++) sum += parseInt(digits.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(digits.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(10, 11))) return false;

  return true;
}

export async function lookupPatientByCpf(cpf: string): Promise<{
  found: boolean;
  patient?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    birth_date?: string;
  };
  message?: string;
}> {
  if (!supabase || !cpf) return { found: false, message: 'CPF não informado' };

  const rawDigits = cleanCpf(cpf);
  if (rawDigits.length !== 11) {
    return { found: false, message: 'CPF deve conter 11 dígitos' };
  }

  const formatted = formatCpf(rawDigits);

  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, email, phone, birth_date, cpf')
      .or(`cpf.eq.${rawDigits},cpf.eq.${formatted}`)
      .maybeSingle();

    if (error) {
      console.warn('Erro ao buscar paciente por CPF:', error.message);
      return { found: false };
    }

    if (data) {
      return {
        found: true,
        patient: {
          id: data.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          birth_date: data.birth_date || ''
        }
      };
    }

    return { found: false };
  } catch (err) {
    console.error('Erro no lookupPatientByCpf:', err);
    return { found: false };
  }
}

function generateProtocol(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomHash = '';
  for (let i = 0; i < 5; i++) {
    randomHash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PRE-${dateStr}-${randomHash}`;
}

/**
 * Remove agendamentos duplicados criados por tentativas repetidas de aprovação do mesmo protocolo.
 */
export async function cleanupDuplicatePreBookingAppointments(protocol?: string): Promise<number> {
  if (!supabase) return 0;
  try {
    let query = supabase
      .from('appointments')
      .select('id, patient_name, date, time, notes, created_at')
      .ilike('notes', '%[Pré-Agendamento Protocolo:%');

    if (protocol) {
      query = query.ilike('notes', `%${protocol}%`);
    }

    const { data: appts, error } = await query;
    if (error || !appts || appts.length <= 1) return 0;

    const seenProtocols = new Map<string, string>(); // protocol -> first appt id
    const idsToDelete: string[] = [];

    // Ordena por data de criação mais antiga primeiro para manter a primeira inserção
    const sorted = [...appts].sort((a, b) => 
      new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );

    for (const appt of sorted) {
      const match = appt.notes?.match(/\[Pré-Agendamento Protocolo:\s*([A-Z0-9-]+)\]/i);
      const apptKey = match ? match[1] : `${appt.patient_name}_${appt.date}_${appt.time}`;

      if (seenProtocols.has(apptKey)) {
        idsToDelete.push(appt.id);
      } else {
        seenProtocols.set(apptKey, appt.id);
      }
    }

    if (idsToDelete.length > 0) {
      console.log(`Limpando ${idsToDelete.length} agendamentos duplicados da agenda...`);
      await supabase.from('appointments').delete().in('id', idsToDelete);
    }

    return idsToDelete.length;
  } catch (err) {
    console.error('Erro ao limpar agendamentos duplicados:', err);
    return 0;
  }
}

export async function getAvailableSlots(dateStr: string, serviceType?: string): Promise<string[]> {
  const isInitialService = !serviceType || serviceType.toLowerCase().includes('primeira') || serviceType.toLowerCase() === 'initial';
  const candidateSlots = isInitialService ? DEFAULT_SLOTS_60 : DEFAULT_SLOTS_45;
  const candidateDur = isInitialService ? 60 : 45;

  if (!supabase) return candidateSlots;

  try {
    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('time, duration, type, status')
      .eq('date', dateStr)
      .neq('status', 'cancelled');

    const { data: existingPreBookings } = await (supabase as any)
      .from('pre_booking_requests')
      .select('requested_time, duration, service_type, status')
      .eq('requested_date', dateStr)
      .eq('status', 'PENDENTE');

    const busyTimes = new Set<string>();

    const checkOverlap = (timeStr: string, dur: number) => {
      const [h, m] = timeStr.split(':').map(Number);
      const appStartMin = h * 60 + m;
      const appEndMin = appStartMin + dur;

      candidateSlots.forEach(slot => {
        const [sh, sm] = slot.split(':').map(Number);
        const slotStartMin = sh * 60 + sm;
        const slotEndMin = slotStartMin + candidateDur;

        // Overlap if candidate slot starts before existing appointment ends AND candidate slot ends after existing appointment starts
        if (slotStartMin < appEndMin && slotEndMin > appStartMin) {
          busyTimes.add(slot);
        }
      });
    };

    if (existingAppts) {
      existingAppts.forEach((app: any) => {
        if (app.time) {
          const isInitial = app.type && (app.type.toLowerCase().includes('primeira') || app.type.toLowerCase() === 'initial');
          const dur = (isInitial && (!app.duration || app.duration === 45)) ? 60 : (app.duration || 45);
          checkOverlap(app.time.slice(0, 5), dur);
        }
      });
    }

    if (existingPreBookings) {
      existingPreBookings.forEach((req: any) => {
        if (req.requested_time) {
          const isInitial = req.service_type && (req.service_type.toLowerCase().includes('primeira') || req.service_type.toLowerCase() === 'initial');
          const dur = (isInitial && (!req.duration || req.duration === 45)) ? 60 : (req.duration || 45);
          checkOverlap(req.requested_time.slice(0, 5), dur);
        }
      });
    }

    const freeSlots = candidateSlots.filter(slot => !busyTimes.has(slot));
    return freeSlots;
  } catch (err) {
    console.error('Erro ao calcular horários livres:', err);
    return candidateSlots;
  }
}

export async function createPreBookingRequest(
  data: CreatePreBookingDTO,
  ipAddress?: string
): Promise<{ success: boolean; protocol?: string; message?: string }> {
  if (data.honeypot && data.honeypot.trim().length > 0) {
    return { success: true, protocol: 'PRE-ROBOT-PASS', message: 'Solicitação registrada com sucesso!' };
  }

  if (!data.patient_name || !data.patient_email || !data.patient_phone || !data.patient_cpf || !data.requested_date || !data.requested_time) {
    return { success: false, message: 'Preencha todos os campos obrigatórios (Nome, E-mail, Celular, CPF, Data e Horário).' };
  }

  if (!isValidCpf(data.patient_cpf)) {
    return { success: false, message: 'Por favor, informe um CPF válido com 11 dígitos.' };
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
    const formattedCpf = formatCpf(data.patient_cpf);

    const insertPayload: any = {
      protocol,
      patient_name: data.patient_name.trim(),
      patient_email: data.patient_email.trim().toLowerCase(),
      patient_phone: data.patient_phone.trim(),
      patient_cpf: formattedCpf || cleanCpf(data.patient_cpf),
      birth_date: data.birth_date || null,
      requested_date: data.requested_date,
      requested_time: data.requested_time,
      duration: (data.service_type && (data.service_type.toLowerCase().includes('primeira') || data.service_type.toLowerCase() === 'initial')) ? 60 : 45,
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
    // Executa a limpeza proativa de duplicados em background
    cleanupDuplicatePreBookingAppointments().catch(() => {});

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
    // 1. Buscar a solicitação no banco
    const { data: request, error: reqErr } = await (supabase as any)
      .from('pre_booking_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqErr || !request) {
      console.error('Erro ao buscar pre_booking_request:', reqErr);
      return { success: false, message: 'Solicitação não encontrada no banco.' };
    }

    // Se já estiver confirmada, retorna direto para evitar recriação
    if (request.status === 'CONFIRMADO') {
      return {
        success: true,
        appointmentId: request.converted_appointment_id || undefined,
        patientName: request.patient_name,
        message: 'Esta solicitação já foi aprovada anteriormente.'
      };
    }

    // 2. Verificar se já existe agendamento criado para este protocolo
    let apptId: string | null = request.converted_appointment_id || null;

    if (!apptId && request.protocol) {
      const { data: existingAppts } = await supabase
        .from('appointments')
        .select('id')
        .ilike('notes', `%${request.protocol}%`);

      if (existingAppts && existingAppts.length > 0) {
        apptId = existingAppts[0].id;
        // Limpa duplicatas excedentes se existirem
        if (existingAppts.length > 1) {
          const duplicateIds = existingAppts.slice(1).map(a => a.id);
          await supabase.from('appointments').delete().in('id', duplicateIds);
        }
      }
    }

    // 3. Cadastrar ou localizar o Paciente (Evitando Duplicidades por CPF ou E-mail)
    let patientId = request.converted_patient_id;
    const rawCpf = cleanCpf(request.patient_cpf);
    const formattedCpf = formatCpf(rawCpf);
    const cleanEmail = (request.patient_email && request.patient_email.trim().length > 0) ? request.patient_email.trim() : null;
    const validUserId = isUuid(adminUserId) ? adminUserId : null;

    if (!patientId) {
      // Prioridade 1: Localizar paciente existente pelo CPF (formatado ou limpo)
      if (rawCpf) {
        const { data: existingPat } = await supabase
          .from('patients')
          .select('id')
          .or(`cpf.eq.${rawCpf},cpf.eq.${formattedCpf}`)
          .maybeSingle();
        if (existingPat) patientId = existingPat.id;
      }

      // Prioridade 2: Localizar paciente existente pelo E-mail
      if (!patientId && cleanEmail) {
        const { data: existingPat } = await supabase
          .from('patients')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();
        if (existingPat) patientId = existingPat.id;
      }

      // Apenas se NÃO existir nenhum paciente com esse CPF/E-mail, cria um novo
      if (!patientId) {
        const newPatientPayload: any = {
          name: request.patient_name,
          email: cleanEmail,
          phone: request.patient_phone || null,
          cpf: formattedCpf || rawCpf || null,
          birth_date: request.birth_date || null,
          status: 'Ativo'
        };
        if (validUserId) newPatientPayload.created_by = validUserId;
        if (request.organization_id) newPatientPayload.organization_id = request.organization_id;

        const { data: createdPat, error: createPatErr } = await supabase
          .from('patients')
          .insert([newPatientPayload])
          .select('id')
          .single();

        if (createPatErr) {
          console.warn('Aviso ao cadastrar paciente:', createPatErr.message);
        } else if (createdPat) {
          patientId = createdPat.id;
        }
      }
    }

    // 4. Inserir o agendamento na Agenda (apenas se ainda não existir)
    if (!apptId) {
      const serviceType = request.service_type || 'Primeira Consulta';
      const isInitialService = serviceType.toLowerCase().includes('primeira') || serviceType.toLowerCase() === 'initial';
      const durationVal = (isInitialService && (!request.duration || request.duration === 45)) ? 60 : (request.duration || 45);

      const appointmentPayload: any = {
        patient_id: isUuid(patientId) ? patientId : null,
        patient_name: request.patient_name,
        date: request.proposed_date || request.requested_date,
        time: request.proposed_time || request.requested_time,
        duration: durationVal,
        type: serviceType,
        status: 'scheduled',
        payment_status: 'pendente',
        notes: `[Pré-Agendamento Protocolo: ${request.protocol}] ${request.notes || ''}`
      };
      if (validUserId) appointmentPayload.created_by = validUserId;
      if (request.organization_id) appointmentPayload.organization_id = request.organization_id;

      const { data: newAppt, error: apptErr } = await supabase
        .from('appointments')
        .insert([appointmentPayload])
        .select('id')
        .single();

      if (apptErr) {
        console.error('Erro ao inserir appointment:', apptErr.message);
        return { 
          success: false, 
          message: `Falha ao registrar consulta na agenda: ${apptErr.message}` 
        };
      }

      apptId = newAppt?.id || null;
    }

    // 5. Atualizar status da solicitação de pré-agendamento para CONFIRMADO
    const updatePayload: any = {
      status: 'CONFIRMADO',
      updated_at: new Date().toISOString()
    };
    if (apptId) updatePayload.converted_appointment_id = apptId;
    if (isUuid(patientId)) updatePayload.converted_patient_id = patientId;

    let { error: updateErr } = await (supabase as any)
      .from('pre_booking_requests')
      .update(updatePayload)
      .eq('id', requestId);

    // Fallback: Se colunas convertidas não existirem na tabela
    if (updateErr) {
      console.warn('Tentativa com colunas estendidas falhou, tentando fallback apenas status:', updateErr.message);
      const fallbackPayload = {
        status: 'CONFIRMADO',
        updated_at: new Date().toISOString()
      };
      const { error: fallbackErr } = await (supabase as any)
        .from('pre_booking_requests')
        .update(fallbackPayload)
        .eq('id', requestId);

      if (fallbackErr) {
        console.error('Erro ao atualizar status do pre_booking_requests:', fallbackErr.message);
        return {
          success: false,
          message: `Agendamento criado na agenda, porém erro ao alterar status da solicitação: ${fallbackErr.message}`
        };
      }
    }

    // 6. Registrar Log de Auditoria
    if (validUserId && apptId) {
      await logAction({
        action: 'UPDATE',
        entityType: 'APPOINTMENTS',
        userId: validUserId,
        details: { summary: `Pré-agendamento ${request.protocol} aprovado`, id: apptId }
      }).catch(() => {});
    }

    return {
      success: true,
      appointmentId: apptId || undefined,
      patientName: request.patient_name,
      message: 'Solicitação aprovada e agendamento confirmado com sucesso!'
    };
  } catch (err: any) {
    console.error('Erro geral no approvePreBookingRequest:', err);
    return { success: false, message: err.message || 'Erro ao aprovar solicitação no banco de dados.' };
  }
}

export async function rejectPreBookingRequest(
  requestId: string,
  reason: string,
  adminUserId: string
): Promise<{ success: boolean; message?: string }> {
  if (!supabase) return { success: false, message: 'Supabase indisponível' };

  try {
    let { error } = await (supabase as any)
      .from('pre_booking_requests')
      .update({
        status: 'RECUSADO',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      // Fallback se a coluna rejection_reason não existir
      const { error: fallbackErr } = await (supabase as any)
        .from('pre_booking_requests')
        .update({
          status: 'RECUSADO',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (fallbackErr) throw fallbackErr;
    }

    const validUserId = isUuid(adminUserId) ? adminUserId : null;
    if (validUserId) {
      await logAction({
        action: 'UPDATE',
        entityType: 'APPOINTMENTS',
        userId: validUserId,
        details: { summary: `Pré-agendamento recusado. Motivo: ${reason}`, id: requestId }
      }).catch(() => {});
    }

    return { success: true, message: 'Solicitação recusada com sucesso.' };
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
    let { error } = await (supabase as any)
      .from('pre_booking_requests')
      .update({
        status: 'PROPOSTA_ALTERADA',
        proposed_date: proposedDate,
        proposed_time: proposedTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      // Fallback se as colunas propostas não existirem
      const { error: fallbackErr } = await (supabase as any)
        .from('pre_booking_requests')
        .update({
          status: 'PROPOSTA_ALTERADA',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (fallbackErr) throw fallbackErr;
    }

    const validUserId = isUuid(adminUserId) ? adminUserId : null;
    if (validUserId) {
      await logAction({
        action: 'UPDATE',
        entityType: 'APPOINTMENTS',
        userId: validUserId,
        details: { summary: `Novo horário proposto para solicitação (${proposedDate} às ${proposedTime})`, id: requestId }
      }).catch(() => {});
    }

    return { success: true, message: 'Nova proposta de horário salva.' };
  } catch (err: any) {
    console.error('Erro ao propor novo horário:', err);
    return { success: false, message: err.message || 'Erro ao salvar nova proposta.' };
  }
}
