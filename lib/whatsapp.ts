/**
 * Módulo de utilitários para integração com WhatsApp (wa.me)
 */

export interface WhatsAppSettings {
  clinicName: string;
  reminderTemplate: string;
  confirmationTemplate: string;
  welcomeTemplate: string;
}

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  clinicName: 'Axis GC',
  reminderTemplate: 'Olá {paciente}, tudo bem? 🌿\n\nLembramos da sua consulta agendada na *{clinica}* para o dia *{data}* às *{horario}*.\n\nPor favor, responda confirmando sua presença. Qualquer dúvida, estamos à disposição!',
  confirmationTemplate: 'Olá {paciente}! Sua consulta na *{clinica}* está confirmada para *{data}* às *{horario}*.\n\nTe esperamos lá! ✨',
  welcomeTemplate: 'Olá {paciente}! Seja bem-vindo(a) à *{clinica}*. Como podemos te ajudar hoje?'
};

export function getWhatsAppSettings(): WhatsAppSettings {
  if (typeof window === 'undefined') return DEFAULT_WHATSAPP_SETTINGS;
  try {
    const saved = localStorage.getItem('auriculocare_whatsapp_settings');
    let settings = DEFAULT_WHATSAPP_SETTINGS;
    if (saved) {
      const parsed = JSON.parse(saved);
      settings = { ...DEFAULT_WHATSAPP_SETTINGS, ...parsed };
    }
    // Sincronizar nome da clínica se houver um salvo nas configurações gerais da clínica
    const savedClinic = localStorage.getItem('auriculocare_clinic');
    if (savedClinic) {
      const clinicObj = JSON.parse(savedClinic);
      if (clinicObj?.name && settings.clinicName === 'Axis GC') {
        settings.clinicName = clinicObj.name;
      }
    }
    return settings;
  } catch (e) {
    console.error('Erro ao ler configurações do WhatsApp:', e);
  }
  return DEFAULT_WHATSAPP_SETTINGS;
}

export function saveWhatsAppSettings(settings: WhatsAppSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auriculocare_whatsapp_settings', JSON.stringify(settings));
  }
}

/**
 * Formata um número de telefone para o padrão internacional do WhatsApp (ex: 5511999999999)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 0) return '';
  
  // Se já começar com 55 e tiver 12 ou 13 dígitos (com DDI 55)
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    return cleaned;
  }
  
  // Se for um número brasileiro padrão com DDD (10 ou 11 dígitos)
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Gera o link wa.me para abrir o WhatsApp Web ou App com mensagem pré-preenchida
 */
export function generateWhatsAppLink(phone: string, message?: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  if (!formattedPhone) return '';
  
  const baseUrl = `https://wa.me/${formattedPhone}`;
  if (!message) return baseUrl;
  
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

/**
 * Abre o WhatsApp diretamente em uma nova aba do navegador
 */
export function openWhatsApp(phone: string, message?: string): void {
  const link = generateWhatsAppLink(phone, message);
  if (link && typeof window !== 'undefined') {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Modelos de mensagens padrão com suporte a substituição dinâmica
 */
export const WhatsAppTemplates = {
  appointmentReminder: (patientName: string, date: string, time: string, clinicName?: string): string => {
    const settings = getWhatsAppSettings();
    const finalClinic = clinicName && clinicName !== 'Axis GC' ? clinicName : settings.clinicName;
    return settings.reminderTemplate
      .replace(/\{paciente\}/g, patientName)
      .replace(/\{data\}/g, date)
      .replace(/\{horario\}/g, time)
      .replace(/\{clinica\}/g, finalClinic);
  },
  
  appointmentConfirmation: (patientName: string, date: string, time: string, clinicName?: string): string => {
    const settings = getWhatsAppSettings();
    const finalClinic = clinicName && clinicName !== 'Axis GC' ? clinicName : settings.clinicName;
    return settings.confirmationTemplate
      .replace(/\{paciente\}/g, patientName)
      .replace(/\{data\}/g, date)
      .replace(/\{horario\}/g, time)
      .replace(/\{clinica\}/g, finalClinic);
  },
  
  welcome: (patientName: string, clinicName?: string): string => {
    const settings = getWhatsAppSettings();
    const finalClinic = clinicName && clinicName !== 'Axis GC' ? clinicName : settings.clinicName;
    return settings.welcomeTemplate
      .replace(/\{paciente\}/g, patientName)
      .replace(/\{clinica\}/g, finalClinic);
  }
};

