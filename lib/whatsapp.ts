/**
 * Módulo de utilitários para integração com WhatsApp (wa.me)
 */

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
 * Modelos de mensagens padrão
 */
export const WhatsAppTemplates = {
  appointmentReminder: (patientName: string, date: string, time: string, clinicName: string = 'Axis GC'): string => {
    return `Olá ${patientName}, tudo bem? 🌿\n\nLembramos da sua consulta agendada na *${clinicName}* para o dia *${date}* às *${time}*.\n\nPor favor, responda confirmando sua presença. Qualquer dúvida, estamos à disposição!`;
  },
  
  appointmentConfirmation: (patientName: string, date: string, time: string, clinicName: string = 'Axis GC'): string => {
    return `Olá ${patientName}! Sua consulta na *${clinicName}* está confirmada para *${date}* às *${time}*.\n\nTe esperamos lá! ✨`;
  },
  
  welcome: (patientName: string, clinicName: string = 'Axis GC'): string => {
    return `Olá ${patientName}! Seja bem-vindo(a) à *${clinicName}*. Como podemos te ajudar hoje?`;
  }
};
