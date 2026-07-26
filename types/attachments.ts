export type AttachmentCategory = 'auriculotherapy' | 'tongue' | 'clinical_evolution' | 'exam_other';

export interface PatientAttachment {
  id: string;
  patientId: string;
  consultationId?: string;
  url: string; // URL pública do Supabase ou DataURL Base64
  category: AttachmentCategory;
  title?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  fileSize?: number;
  mimeType?: string;
}

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, { label: string; icon: string; color: string }> = {
  auriculotherapy: { label: 'Auriculoterapia', icon: '👂', color: 'bg-purple-100 text-purple-900 border-purple-200' },
  tongue: { label: 'Língua (MTC)', icon: '👅', color: 'bg-rose-100 text-rose-900 border-rose-200' },
  clinical_evolution: { label: 'Evolução Clínica', icon: '🩺', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  exam_other: { label: 'Exames & Outros', icon: '📄', color: 'bg-sky-100 text-sky-900 border-sky-200' }
};
