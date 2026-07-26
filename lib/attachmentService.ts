import { supabase } from './supabase';
import { PatientAttachment, AttachmentCategory } from '@/types/attachments';

const LOCAL_STORAGE_KEY = 'axis_gc_patient_attachments';

/**
 * Função utilitária para compactar imagem via Canvas client-side antes de salvar
 */
async function compressImage(file: File, maxWidth = 1600, maxHeight = 1600, quality = 0.85): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter contexto do canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              reject(new Error('Falha ao gerar blob da imagem'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Erro ao carregar arquivo de imagem'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Busca anexos do paciente no localStorage
 */
function getLocalAttachments(patientId?: string): PatientAttachment[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: PatientAttachment[] = stored ? JSON.parse(stored) : [];
    if (patientId) {
      return list.filter(a => a.patientId === patientId);
    }
    return list;
  } catch (e) {
    console.error('Erro ao ler anexos locais:', e);
    return [];
  }
}

/**
 * Salva a lista de anexos no localStorage
 */
function saveLocalAttachments(attachments: PatientAttachment[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(attachments));
  } catch (e) {
    console.error('Erro ao salvar anexos locais:', e);
  }
}

export const attachmentService = {
  /**
   * Busca todas as fotos/anexos de um paciente (com filtro opcional por consulta)
   */
  async getPatientAttachments(patientId: string, consultationId?: string): Promise<PatientAttachment[]> {
    let attachments: PatientAttachment[] = [];

    // Tenta buscar no Supabase
    try {
      let query = (supabase.from as any)('patient_attachments')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (consultationId) {
        query = query.eq('consultation_id', consultationId);
      }

      const { data, error } = await query;

      if (!error && data) {
        attachments = data.map((item: any) => ({
          id: item.id,
          patientId: item.patient_id,
          consultationId: item.consultation_id,
          url: item.url,
          category: item.category as AttachmentCategory,
          title: item.title,
          notes: item.notes,
          createdAt: item.created_at,
          createdBy: item.created_by,
          fileSize: item.file_size,
          mimeType: item.mime_type
        }));
      }
    } catch (err) {
      console.warn('Busca no Supabase indisponível, utilizando dados locais:', err);
    }

    // Merge com os anexos armazenados localmente
    const local = getLocalAttachments(patientId).filter(a => !consultationId || a.consultationId === consultationId);
    const attachmentMap = new Map<string, PatientAttachment>();

    attachments.forEach(a => attachmentMap.set(a.id, a));
    local.forEach(a => attachmentMap.set(a.id, a));

    const result = Array.from(attachmentMap.values());
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  },

  /**
   * Faz upload de uma nova foto/anexo
   */
  async uploadAttachment(
    file: File,
    meta: {
      patientId: string;
      consultationId?: string;
      category: AttachmentCategory;
      title?: string;
      notes?: string;
      createdBy?: string;
    }
  ): Promise<PatientAttachment> {
    const attachmentId = 'att_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    const { blob, dataUrl } = await compressImage(file);
    const createdAt = new Date().toISOString();

    let publicUrl = dataUrl; // Default fallback para DataURL Base64 local

    // Tenta fazer upload para o Supabase Storage se disponível
    try {
      const fileName = `${meta.patientId}/${attachmentId}.jpg`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('patient-attachments')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!storageError && storageData) {
        const { data: urlData } = supabase.storage
          .from('patient-attachments')
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          publicUrl = urlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Upload no Supabase Storage indisponível, usando armazenamento híbrido local:', err);
    }

    const newAttachment: PatientAttachment = {
      id: attachmentId,
      patientId: meta.patientId,
      consultationId: meta.consultationId,
      url: publicUrl,
      category: meta.category,
      title: meta.title || file.name.replace(/\.[^/.]+$/, ''),
      notes: meta.notes,
      createdAt,
      createdBy: meta.createdBy || 'Profissional',
      fileSize: blob.size,
      mimeType: 'image/jpeg'
    };

    // Tenta gravar no banco de dados do Supabase
    try {
      await (supabase.from as any)('patient_attachments').insert({
        id: newAttachment.id,
        patient_id: newAttachment.patientId,
        consultation_id: newAttachment.consultationId,
        url: newAttachment.url,
        category: newAttachment.category,
        title: newAttachment.title,
        notes: newAttachment.notes,
        created_at: newAttachment.createdAt,
        created_by: newAttachment.createdBy,
        file_size: newAttachment.fileSize,
        mime_type: newAttachment.mimeType
      });
    } catch (dbErr) {
      console.warn('Gravação no DB Supabase indisponível, armazenando localmente:', dbErr);
    }

    // Sempre garante no armazenamento local
    const allLocal = getLocalAttachments();
    allLocal.unshift(newAttachment);
    saveLocalAttachments(allLocal);

    return newAttachment;
  },

  /**
   * Exclui um anexo
   */
  async deleteAttachment(attachmentId: string, patientId?: string): Promise<boolean> {
    try {
      await (supabase.from as any)('patient_attachments').delete().eq('id', attachmentId);
    } catch (err) {
      console.warn('Erro ao deletar anexo no Supabase:', err);
    }

    const allLocal = getLocalAttachments();
    const filtered = allLocal.filter(a => a.id !== attachmentId);
    saveLocalAttachments(filtered);

    return true;
  }
};
