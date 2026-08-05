'use server';

import { 
  getAvailableSlots, 
  createPreBookingRequest, 
  getPreBookingStatusByProtocol,
  lookupPatientByCpf
} from '@/lib/preBookingService';
import { CreatePreBookingDTO } from '@/types/preBooking';

export async function fetchAvailableSlotsAction(dateStr: string) {
  try {
    const slots = await getAvailableSlots(dateStr);
    return { success: true, slots };
  } catch (err: any) {
    return { success: false, slots: [], error: err.message };
  }
}

export async function submitPreBookingAction(data: CreatePreBookingDTO) {
  try {
    const res = await createPreBookingRequest(data);
    return res;
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro ao submeter solicitação' };
  }
}

export async function checkProtocolStatusAction(protocol: string) {
  try {
    const statusData = await getPreBookingStatusByProtocol(protocol);
    if (!statusData) {
      return { success: false, message: 'Protocolo não encontrado. Verifique o código digitado.' };
    }
    return { success: true, data: statusData };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro ao buscar protocolo' };
  }
}

export async function lookupPatientByCpfAction(cpf: string) {
  try {
    const res = await lookupPatientByCpf(cpf);
    return res;
  } catch (err: any) {
    return { found: false, message: err.message || 'Erro ao consultar CPF' };
  }
}
