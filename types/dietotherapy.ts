export type ThermalNature = 'Quente' | 'Morno' | 'Neutro' | 'Fresco' | 'Frio';

export type EditorialStatus = 
  | 'imported' 
  | 'pending_review' 
  | 'under_review' 
  | 'reviewed' 
  | 'published' 
  | 'archived';

export interface FoodSource {
  source_title: string;
  author: string;
  edition?: string;
  page?: string;
  publication_year?: number;
  notes?: string;
  classification?: {
    thermal_nature?: ThermalNature;
    flavors?: string[];
    channels?: string[];
    therapeutic_functions?: string[];
    indications?: string[];
    cautions?: string[];
  };
}

export interface FoodDivergence {
  attribute: string;
  opinion_a: string;
  source_a: string;
  opinion_b: string;
  source_b: string;
  clinical_recommendation?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface ChineseDietFood {
  id: string;
  organization_id?: string | null;
  
  // Identificação
  name: string;
  normalized_name: string;
  synonyms: string[];
  scientific_name?: string;
  category: string;
  description?: string;
  used_part?: string;
  image_url?: string;
  is_active: boolean;

  // Classificação energética
  thermal_nature: ThermalNature;
  flavors: string[];
  channels: string[];
  energy_direction?: string;
  therapeutic_functions: string[];

  // Aplicação
  indicated_patterns: string[];
  caution_patterns: string[];
  preparation_modes: string[];
  clinical_notes?: string;
  culinary_notes?: string;
  contraindications?: string;
  allergens?: string;
  restrictions?: string;

  // Controle & Auditoria
  editorial_status: EditorialStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_by?: string;
  updated_by?: string;
  original_imported_text?: string; // preserva texto original da planilha/importação
  audit_logs: AuditLogEntry[];

  // Referências & Divergências
  sources: FoodSource[];
  divergences: FoodDivergence[];
  
  created_at?: string;
  updated_at?: string;
  import_id?: string;
}

export interface FoodImportLine {
  id: string;
  row_number: number;
  original_name: string;
  original_category: string;
  original_thermal_nature: string;
  original_flavors: string;
  original_channels: string;

  // Extended fields from complete import CSV template
  is_active?: boolean;
  scientific_name?: string;
  used_part?: string;
  synonyms?: string[];
  image_url?: string;
  description?: string;
  energy_direction?: string;
  therapeutic_functions?: string[];
  indicated_patterns?: string[];
  caution_patterns?: string[];
  clinical_notes?: string;
  culinary_notes?: string;
  preparation_modes?: string[];
  contraindications?: string;
  allergens?: string;
  restrictions?: string;
  source_title?: string;
  author?: string;
  edition?: string;
  page?: string;
  publication_year?: number;

  normalized_name: string;
  possible_duplicate_food_id?: string;
  review_decision: 'pending' | 'create_new' | 'link_to_existing' | 'add_synonym' | 'discard';
  processing_status: 'pending' | 'processed' | 'error';
  error_message?: string;
  inconsistency_notes?: string;
}

export interface PrescriptionItem {
  food_id: string;
  food_name: string;
  food_thermal_nature: ThermalNature;
  food_flavors: string[];
  food_channels: string[];
  recommendation_level: 'prioritize' | 'moderate' | 'avoid';
  custom_prep_notes?: string;
  frequency?: string;
  quantity?: string;
}

export interface DietClinicalAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  reason: string;
  recommended_action: string;
  professional_justification?: string;
}

export interface ChineseDietPrescription {
  id: string;
  patient_id?: string;
  patient_name?: string;
  evaluation_id?: string;
  title: string;
  disharmony_pattern: string;
  secondary_patterns: string[];
  symptoms: string[];
  treatment_principles: string[];
  general_recommendations?: string;
  individualized_notes?: string;
  period?: string;
  is_template: boolean;
  status: 'draft' | 'final';
  version_number: number;
  items: PrescriptionItem[];
  alerts?: DietClinicalAlert[];
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Custom PDF rendering configuration and history fields
  accessible_objective?: string;
  meal_suggestions?: string;
  reevaluation_date?: string;
  safety_warning?: string;
  report_type?: 'clinical' | 'simplified';
  professional_registry?: string;
}
