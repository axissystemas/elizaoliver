export type FieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'number';

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  options?: string[]; // Opções para tipo 'select'
  required?: boolean;
  placeholder?: string;
}

export interface TemplateStep {
  id: string;
  label: string;
  icon?: string;
  fields: TemplateField[];
}

export interface EvaluationTemplate {
  id: string;
  organization_id?: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  colorTheme: 'emerald' | 'indigo' | 'amber' | 'blue' | 'purple';
  isActive: boolean;
  isSystem?: boolean;
  steps: TemplateStep[];
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_SYSTEM_TEMPLATES: EvaluationTemplate[] = [
  {
    id: 'system-diagnostico-ouro',
    name: 'Diagnóstico de Ouro MTC',
    code: 'DIAGNOSTICO_OURO',
    description: 'Ficha de Anamnese completa de 6 páginas da Medicina Chinesa.',
    icon: 'FileText',
    colorTheme: 'amber',
    isActive: true,
    isSystem: true,
    steps: []
  },
  {
    id: 'system-mtc',
    name: 'Avaliação MTC',
    code: 'MTC',
    description: 'Medicina Tradicional Chinesa, 5 elementos, canais e colaterais.',
    icon: 'ClipboardList',
    colorTheme: 'emerald',
    isActive: true, // Native MTC is enabled by default
    isSystem: true,
    steps: []
  },
  {
    id: 'system-radiestesia',
    name: 'Radiestesia',
    code: 'RADIESTESIA',
    description: 'Análise energética de chakras, campos energéticos e sistemas.',
    icon: 'Activity',
    colorTheme: 'indigo',
    isActive: false, // Radiestesia is disabled by default
    isSystem: true,
    steps: []
  }
];

