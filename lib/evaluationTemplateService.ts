import { supabase } from './supabase';
import { EvaluationTemplate, DEFAULT_SYSTEM_TEMPLATES } from '@/types/evaluationTemplate';

const STORAGE_KEY = 'axis_evaluation_templates';

function mergeSystemTemplates(loaded: EvaluationTemplate[]): EvaluationTemplate[] {
  const result = [...loaded];
  for (const sysTpl of DEFAULT_SYSTEM_TEMPLATES) {
    const idx = result.findIndex(t => t.code === sysTpl.code || t.id === sysTpl.id);
    if (idx === -1) {
      result.unshift(sysTpl);
    } else {
      result[idx].isSystem = true;
      if (result[idx].isActive === undefined) {
        result[idx].isActive = sysTpl.isActive;
      }
    }
  }
  return result;
}

export async function getEvaluationTemplates(): Promise<EvaluationTemplate[]> {
  let loadedTemplates: EvaluationTemplate[] = [];

  try {
    if (supabase) {
      const { data, error } = await (supabase as any)
        .from('evaluation_templates')
        .select('*')
        .order('is_system', { ascending: false });

      if (!error && data && data.length > 0) {
        loadedTemplates = data.map((t: any) => ({
          id: t.id,
          organization_id: t.organization_id,
          name: t.name,
          code: t.code,
          description: t.description || '',
          icon: t.icon || 'FileText',
          colorTheme: (t.color_theme as any) || 'emerald',
          isActive: t.is_active ?? (t.code === 'MTC'),
          isSystem: t.is_system ?? (t.code === 'MTC' || t.code === 'RADIESTESIA'),
          steps: Array.isArray(t.steps) ? t.steps : []
        }));
      }
    }
  } catch (err) {
    console.warn('[EvaluationTemplateService] Supabase offline, usando fallback local:', err);
  }

  if (loadedTemplates.length === 0 && typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        loadedTemplates = JSON.parse(saved);
      } catch (e) {}
    }
  }

  if (loadedTemplates.length === 0) {
    loadedTemplates = DEFAULT_SYSTEM_TEMPLATES;
  }

  return mergeSystemTemplates(loadedTemplates);
}

export async function saveEvaluationTemplates(templates: EvaluationTemplate[]): Promise<boolean> {
  // Salva no LocalStorage sempre
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }

  try {
    if (supabase) {
      for (const t of templates) {
        if (t.isSystem) {
          // Upsert modelos do sistema no Supabase
          await (supabase as any).from('evaluation_templates').upsert({
            id: t.id.includes('-') ? t.id : undefined,
            name: t.name,
            code: t.code,
            description: t.description,
            icon: t.icon,
            color_theme: t.colorTheme,
            is_active: t.isActive,
            is_system: true,
            steps: t.steps,
            updated_at: new Date().toISOString()
          }, { onConflict: 'code' });
        } else {
          // Modelos customizados
          await (supabase as any).from('evaluation_templates').upsert({
            id: t.id.length > 20 ? t.id : undefined,
            name: t.name,
            code: t.code,
            description: t.description,
            icon: t.icon,
            color_theme: t.colorTheme,
            is_active: t.isActive,
            is_system: false,
            steps: t.steps,
            updated_at: new Date().toISOString()
          });
        }
      }
    }
    return true;
  } catch (err) {
    console.warn('[EvaluationTemplateService] Erro ao sincronizar no Supabase:', err);
    return true; // Sucesso via LocalStorage
  }
}

export async function deleteEvaluationTemplate(templateId: string): Promise<boolean> {
  try {
    if (supabase && templateId.length > 20) {
      await (supabase as any).from('evaluation_templates').delete().eq('id', templateId);
    }
  } catch (e) {}
  return true;
}
