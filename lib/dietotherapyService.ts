import { supabase } from './supabase';
import { ChineseDietFood, FoodImportLine, ThermalNature, EditorialStatus, ChineseDietPrescription } from '@/types/dietotherapy';
import { INITIAL_MOCK_FOODS } from './dietotherapyMockData';

const CHANNEL_MAP: Record<string, string> = {
  'BP': 'Baço',
  'BAÇO-PÂNCREAS': 'Baço',
  'BAÇO PÂNCREAS': 'Baço',
  'BAÇO': 'Baço',
  'BACO': 'Baço',
  'E': 'Estômago',
  'ESTÔMAGO': 'Estômago',
  'ESTOMAGO': 'Estômago',
  'IG': 'Intestino Grosso',
  'INTESTINO GROSSO': 'Intestino Grosso',
  'ID': 'Intestino Delgado',
  'INTESTINO DELGADO': 'Intestino Delgado',
  'P': 'Pulmão',
  'PULMÃO': 'Pulmão',
  'PULMAO': 'Pulmão',
  'R': 'Rim',
  'RIMS': 'Rim',
  'RINS': 'Rim',
  'RIM': 'Rim',
  'F': 'Fígado',
  'FÍGADO': 'Fígado',
  'FIGADO': 'Fígado',
  'C': 'Coração',
  'CORAÇÃO': 'Coração',
  'CORACAO': 'Coração',
  'B': 'Bexiga',
  'BEXIGA': 'Bexiga',
  'VB': 'Vesícula Biliar',
  'VESÍCULA BILIAR': 'Vesícula Biliar',
  'VESICULA BILIAR': 'Vesícula Biliar',
  'VC': 'Vaso Concepção',
  'VG': 'Vaso Governador',
  'TA': 'Triplo Aquecedor',
  'PC': 'Pericárdio'
};

export function parseChannels(rawInput: any): string[] {
  if (!rawInput) return [];
  
  let str = '';
  if (Array.isArray(rawInput)) {
    str = rawInput.join(', ');
  } else {
    str = rawInput.toString();
  }

  // Substitui conectivos ' e ', '&', ' E ' por vírgula
  str = str.replace(/\s+e\s+/gi, ', ').replace(/\s*&\s*/g, ', ');

  // Separa por vírgula, ponto-e-vírgula, barra (/), pipe (|)
  const parts = str.split(/[,;/|]+/).map(p => p.trim()).filter(Boolean);
  const result = new Set<string>();

  for (const part of parts) {
    const normKey = part.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (CHANNEL_MAP[normKey]) {
      result.add(CHANNEL_MAP[normKey]);
    } else if (CHANNEL_MAP[part.toUpperCase()]) {
      result.add(CHANNEL_MAP[part.toUpperCase()]);
    } else if (part !== '') {
      // Se houver sub-tokens (ex: P/IG/E/BP/R que pode vir aglutinado ou separado por espaços)
      const subParts = part.split(/[\/\s]+/).filter(Boolean);
      let matchedAny = false;
      for (const sub of subParts) {
        const subKey = sub.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (CHANNEL_MAP[subKey]) {
          result.add(CHANNEL_MAP[subKey]);
          matchedAny = true;
        }
      }
      if (!matchedAny) {
        const capitalized = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        result.add(capitalized);
      }
    }
  }

  return Array.from(result);
}

function parseFlavors(rawText: string): string[] {
  if (!rawText) return [];
  const parts = rawText.split(/[,/;|]\s*/).map(p => p.trim());
  const result = new Set<string>();
  for (const part of parts) {
    if (part !== '') {
      const capitalized = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      result.add(capitalized);
    }
  }
  return Array.from(result);
}

// Chave para persistência em localStorage para simular banco local caso Supabase não tenha as tabelas
const LOCAL_STORAGE_KEY = 'axis_gc_dietotherapy_foods';
const LOCAL_STORAGE_IMPORTS_KEY = 'axis_gc_dietotherapy_imports';
const LOCAL_STORAGE_PRESCRIPTIONS_KEY = 'axis_gc_dietotherapy_prescriptions';

export function normalizeThermalNature(raw: string): ThermalNature {
  if (!raw) return 'Neutro';
  const norm = raw.toString().trim().toLowerCase();
  if (norm.includes('quente')) return 'Quente';
  if (norm.includes('morn')) return 'Morno';
  if (norm.includes('fresc')) return 'Fresco';
  if (norm.includes('fri')) return 'Frio';
  if (norm.includes('neutr')) return 'Neutro';
  return 'Neutro';
}

function getLocalFoods(): ChineseDietFood[] {
  if (typeof window === 'undefined') return INITIAL_MOCK_FOODS;
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  let foods = INITIAL_MOCK_FOODS;
  if (stored) {
    try {
      foods = JSON.parse(stored);
    } catch (e) {
      foods = INITIAL_MOCK_FOODS;
    }
  } else {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_FOODS));
  }

  let updated = false;
  const sanitized = foods.map(f => {
    const normNature = normalizeThermalNature(f.thermal_nature);
    const parsedCh = parseChannels(f.channels);
    const chChanged = JSON.stringify(parsedCh) !== JSON.stringify(f.channels);
    if (normNature !== f.thermal_nature || chChanged) {
      updated = true;
      return { 
        ...f, 
        thermal_nature: normNature,
        channels: parsedCh 
      };
    }
    return f;
  });

  if (updated) {
    saveLocalFoods(sanitized);
  }

  return sanitized;
}

function saveLocalFoods(foods: ChineseDietFood[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(foods));
  }
}

function isUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function toDbPayload(food: ChineseDietFood): any {
  const payload: any = {
    name: food.name,
    normalized_name: food.normalized_name || (food.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(),
    category: food.category || 'Outros',
    thermal_nature: normalizeThermalNature(food.thermal_nature),
    energy_direction: food.energy_direction || 'Neutro',
    flavors: Array.isArray(food.flavors) ? food.flavors : [],
    channels: parseChannels(food.channels),
    scientific_name: food.scientific_name || null,
    used_part: food.used_part || null,
    description: food.description || null,
    image_url: food.image_url || null,
    synonyms: Array.isArray(food.synonyms) ? food.synonyms : [],
    therapeutic_functions: Array.isArray(food.therapeutic_functions) ? food.therapeutic_functions : [],
    indicated_patterns: Array.isArray(food.indicated_patterns) ? food.indicated_patterns : [],
    caution_patterns: Array.isArray(food.caution_patterns) ? food.caution_patterns : [],
    preparation_modes: Array.isArray(food.preparation_modes) ? food.preparation_modes : [],
    clinical_notes: food.clinical_notes || null,
    culinary_notes: food.culinary_notes || null,
    contraindications: food.contraindications || null,
    allergens: food.allergens || null,
    restrictions: food.restrictions || null,
    editorial_status: food.editorial_status || 'published',
    is_active: food.is_active ?? true,
    sources: Array.isArray(food.sources) ? food.sources : [],
    divergences: Array.isArray(food.divergences) ? food.divergences : [],
    audit_logs: Array.isArray(food.audit_logs) ? food.audit_logs : [],
    updated_at: new Date().toISOString()
  };

  if (isUUID(food.id)) {
    payload.id = food.id;
  }

  return payload;
}

async function fetchFoodsFromSupabase(): Promise<ChineseDietFood[]> {
  const localFoods = getLocalFoods();

  try {
    const { data, error } = await (supabase.from as any)('chinese_diet_foods').select('*');

    let mappedDbFoods: ChineseDietFood[] = [];

    if (!error && data && Array.isArray(data)) {
      mappedDbFoods = data.map((item: any) => ({
        id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'f_' + Math.random().toString(36).substr(2, 9)),
        name: item.name || '',
        normalized_name: item.normalized_name || (item.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
        category: item.category || 'Outros',
        scientific_name: item.scientific_name || undefined,
        used_part: item.used_part || undefined,
        description: item.description || undefined,
        image_url: item.image_url || undefined,
        thermal_nature: normalizeThermalNature(item.thermal_nature),
        energy_direction: item.energy_direction || 'Neutro',
        flavors: Array.isArray(item.flavors) ? item.flavors : [],
        channels: parseChannels(item.channels),
        therapeutic_functions: Array.isArray(item.therapeutic_functions) ? item.therapeutic_functions : [],
        indicated_patterns: Array.isArray(item.indicated_patterns) ? item.indicated_patterns : [],
        caution_patterns: Array.isArray(item.caution_patterns) ? item.caution_patterns : [],
        preparation_modes: Array.isArray(item.preparation_modes) ? item.preparation_modes : [],
        clinical_notes: item.clinical_notes || undefined,
        culinary_notes: item.culinary_notes || undefined,
        contraindications: item.contraindications || undefined,
        allergens: item.allergens || undefined,
        restrictions: item.restrictions || undefined,
        editorial_status: item.editorial_status || 'published',
        is_active: item.is_active ?? true,
        sources: Array.isArray(item.sources) ? item.sources : [],
        divergences: Array.isArray(item.divergences) ? item.divergences : [],
        audit_logs: Array.isArray(item.audit_logs) ? item.audit_logs : [],
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      }));
    } else if (error) {
      console.warn('[DietotherapyService] Tabela no Supabase inacessível ou vazia, usando dados locais. Erro:', error.message);
    }

    // Combina os alimentos locais com os alimentos do banco de dados (priorizando o que tem mais informação)
    const foodMap = new Map<string, ChineseDietFood>();
    
    localFoods.forEach(f => {
      if (f.name) foodMap.set(f.name.toLowerCase().trim(), f);
    });

    mappedDbFoods.forEach(f => {
      if (f.name) foodMap.set(f.name.toLowerCase().trim(), f);
    });

    const combinedFoods = Array.from(foodMap.values());

    if (combinedFoods.length > 0) {
      saveLocalFoods(combinedFoods);

      // Tenta sincronizar em segundo plano alimentos locais que não estão no Supabase
      const dbNameSet = new Set(mappedDbFoods.map(f => f.name.toLowerCase().trim()));
      const localFoodsToUpload = localFoods.filter(lf => lf.name && !dbNameSet.has(lf.name.toLowerCase().trim()));

      if (localFoodsToUpload.length > 0) {
        console.log(`[DietotherapyService] Sincronizando ${localFoodsToUpload.length} alimentos locais com o Supabase...`);
        const dbPayloads = localFoodsToUpload.map(toDbPayload);
        (supabase.from as any)('chinese_diet_foods').upsert(dbPayloads).catch((e: any) => {
          console.warn('[DietotherapyService] Aviso ao enviar para Supabase:', e);
        });
      }

      return combinedFoods;
    }
  } catch (err) {
    console.error('[DietotherapyService] Erro ao conectar ao Supabase:', err);
  }

  return localFoods;
}

function getLocalPrescriptions(): ChineseDietPrescription[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_PRESCRIPTIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

function saveLocalPrescriptions(prescriptions: ChineseDietPrescription[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_PRESCRIPTIONS_KEY, JSON.stringify(prescriptions));
  }
}

export const dietotherapyService = {
  /**
   * Busca alimentos com base em filtros e busca textual (Nuvem / Supabase com fallback local)
   */
  async getFoods(filters: {
    searchTerm?: string;
    category?: string;
    thermal_nature?: string;
    flavor?: string;
    channel?: string;
    therapeutic_function?: string;
    indicated_pattern?: string;
    caution_pattern?: string;
    preparation_mode?: string;
    editorial_status?: string;
    energy_direction?: string;
    source?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<ChineseDietFood[]> {
    let foods = await fetchFoodsFromSupabase();

    // Filtro por termo de busca
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase().trim();
      foods = foods.filter(f => 
        f.name.toLowerCase().includes(term) ||
        f.normalized_name.toLowerCase().includes(term) ||
        (f.scientific_name && f.scientific_name.toLowerCase().includes(term)) ||
        f.synonyms.some(s => s.toLowerCase().includes(term)) ||
        f.category.toLowerCase().includes(term) ||
        f.flavors.some(fv => fv.toLowerCase().includes(term)) ||
        f.thermal_nature.toLowerCase().includes(term) ||
        (f.energy_direction && f.energy_direction.toLowerCase().includes(term)) ||
        f.channels.some(ch => ch.toLowerCase().includes(term)) ||
        f.therapeutic_functions.some(fn => fn.toLowerCase().includes(term)) ||
        f.indicated_patterns.some(ind => ind.toLowerCase().includes(term))
      );
    }

    // Filtros individuais
    if (filters.category && filters.category !== 'Todos') {
      foods = foods.filter(f => f.category === filters.category);
    }
    if (filters.thermal_nature && filters.thermal_nature !== 'Todos') {
      foods = foods.filter(f => f.thermal_nature === filters.thermal_nature);
    }
    if (filters.energy_direction && filters.energy_direction !== 'Todos') {
      foods = foods.filter(f => f.energy_direction === filters.energy_direction);
    }
    if (filters.flavor && filters.flavor !== 'Todos') {
      foods = foods.filter(f => f.flavors.includes(filters.flavor!));
    }
    if (filters.channel && filters.channel !== 'Todos') {
      foods = foods.filter(f => f.channels.includes(filters.channel!));
    }
    if (filters.therapeutic_function && filters.therapeutic_function !== 'Todos') {
      foods = foods.filter(f => f.therapeutic_functions.some(fn => fn.includes(filters.therapeutic_function!)));
    }
    if (filters.indicated_pattern && filters.indicated_pattern !== 'Todos') {
      foods = foods.filter(f => f.indicated_patterns.some(ind => ind.includes(filters.indicated_pattern!)));
    }
    if (filters.caution_pattern && filters.caution_pattern !== 'Todos') {
      foods = foods.filter(f => f.caution_patterns.some(c => c.includes(filters.caution_pattern!)));
    }
    if (filters.preparation_mode && filters.preparation_mode !== 'Todos') {
      foods = foods.filter(f => f.preparation_modes.includes(filters.preparation_mode!));
    }
    if (filters.editorial_status && filters.editorial_status !== 'Todos') {
      foods = foods.filter(f => f.editorial_status === filters.editorial_status);
    }
    if (filters.source && filters.source !== 'Todos') {
      foods = foods.filter(f => f.sources.some(s => s.source_title === filters.source));
    }

    // Ordenação
    if (filters.sortBy) {
      const order = filters.sortOrder === 'desc' ? -1 : 1;
      foods = [...foods].sort((a, b) => {
        let valA = (a as any)[filters.sortBy!] || '';
        let valB = (b as any)[filters.sortBy!] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
      });
    }

    return foods;
  },

  /**
   * Grava ou atualiza um alimento no banco Supabase e localmente
   */
  async saveFood(food: Partial<ChineseDietFood>): Promise<ChineseDietFood> {
    const foods = getLocalFoods();
    let updatedFood: ChineseDietFood;

    if (food.id) {
      const index = foods.findIndex(f => f.id === food.id);
      if (index !== -1) {
        updatedFood = {
          ...foods[index],
          ...food,
          updated_at: new Date().toISOString()
        } as ChineseDietFood;
        foods[index] = updatedFood;
      } else {
        throw new Error('Alimento não encontrado.');
      }
    } else {
      updatedFood = {
        ...food,
        id: 'f_' + Math.random().toString(36).substr(2, 9),
        normalized_name: (food.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        synonyms: food.synonyms || [],
        is_active: food.is_active ?? true,
        flavors: food.flavors || [],
        channels: food.channels || [],
        energy_direction: food.energy_direction || '',
        therapeutic_functions: food.therapeutic_functions || [],
        indicated_patterns: food.indicated_patterns || [],
        caution_patterns: food.caution_patterns || [],
        preparation_modes: food.preparation_modes || [],
        clinical_notes: food.clinical_notes || '',
        culinary_notes: food.culinary_notes || '',
        contraindications: food.contraindications || '',
        allergens: food.allergens || '',
        restrictions: food.restrictions || '',
        editorial_status: food.editorial_status || 'published',
        sources: food.sources || [],
        divergences: food.divergences || [],
        audit_logs: food.audit_logs || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as ChineseDietFood;
      foods.push(updatedFood);
    }

    saveLocalFoods(foods);

    // Tenta persistir no Supabase em paralelo
    try {
      await (supabase.from as any)('chinese_diet_foods').upsert(toDbPayload(updatedFood));
    } catch (err) {
      console.error('[DietotherapyService] Erro ao salvar no Supabase:', err);
    }

    return updatedFood;
  },

  /**
   * Exclui um alimento logicamente (Soft Delete) ou fisicamente se for local
   */
  async deleteFood(id: string): Promise<void> {
    const foods = getLocalFoods();
    const index = foods.findIndex(f => f.id === id);
    let deletedItem: ChineseDietFood | null = null;
    if (index !== -1) {
      deletedItem = foods[index];
      foods.splice(index, 1);
      saveLocalFoods(foods);
    }

    try {
      if (id) {
        await (supabase.from as any)('chinese_diet_foods').delete().eq('id', id);
      }
      if (deletedItem?.name) {
        await (supabase.from as any)('chinese_diet_foods').delete().eq('name', deletedItem.name);
      }
    } catch (err) {
      console.error('[DietotherapyService] Erro ao deletar no Supabase:', err);
    }
  },

  /**
   * Simulação de importação em lote a partir do arquivo JSON/CSV
   */
  async importRawFoods(lines: Omit<FoodImportLine, 'id' | 'normalized_name'>[]): Promise<{
    importId: string;
    successCount: number;
    duplicateCount: number;
    errorCount: number;
  }> {
    const currentFoods = getLocalFoods();
    const importId = 'imp_' + Math.random().toString(36).substr(2, 9);
    
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    const processedLines: FoodImportLine[] = lines.map(line => {
      const normName = line.original_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const duplicate = currentFoods.find(f => 
        f.normalized_name === normName || 
        f.synonyms.some(s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normName)
      );

      let status: 'pending' | 'processed' | 'error' = 'pending';
      let inconsistencyNotes = '';
      
      if (!line.original_name) {
        status = 'error';
        inconsistencyNotes += 'Nome do alimento ausente. ';
        errorCount++;
      }

      if (duplicate) {
        duplicateCount++;
      } else {
        successCount++;
      }

      return {
        ...line,
        id: 'line_' + Math.random().toString(36).substr(2, 9),
        normalized_name: normName,
        possible_duplicate_food_id: duplicate?.id,
        processing_status: status,
        inconsistency_notes: inconsistencyNotes || (duplicate ? 'Possível duplicado encontrado no sistema.' : undefined)
      } as FoodImportLine;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_IMPORTS_KEY + '_' + importId, JSON.stringify(processedLines));
      
      const historyStr = localStorage.getItem('axis_gc_dietotherapy_imports_history') || '[]';
      const history = JSON.parse(historyStr);
      history.unshift({
        id: importId,
        date: new Date().toISOString(),
        successCount,
        duplicateCount,
        errorCount,
        status: 'pending'
      });
      localStorage.setItem('axis_gc_dietotherapy_imports_history', JSON.stringify(history));
    }

    return {
      importId,
      successCount,
      duplicateCount,
      errorCount
    };
  },

  async getImportHistory(): Promise<any[]> {
    if (typeof window === 'undefined') return [];
    const historyStr = localStorage.getItem('axis_gc_dietotherapy_imports_history') || '[]';
    return JSON.parse(historyStr);
  },

  async getImportLines(importId: string): Promise<FoodImportLine[]> {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(LOCAL_STORAGE_IMPORTS_KEY + '_' + importId);
    return stored ? JSON.parse(stored) : [];
  },

  async confirmImport(
    importId: string,
    decisions: Record<string, { decision: 'create_new' | 'link_to_existing' | 'add_synonym' | 'discard'; targetFoodId?: string }>
  ): Promise<{ successCount: number; discardedCount: number }> {
    const lines = await this.getImportLines(importId);
    const currentFoods = getLocalFoods();
    let successCount = 0;
    let discardedCount = 0;

    for (const line of lines) {
      const decisionObj = decisions[line.id] || { decision: line.possible_duplicate_food_id ? 'link_to_existing' : 'create_new', targetFoodId: line.possible_duplicate_food_id };
      
      if (decisionObj.decision === 'discard') {
        discardedCount++;
        continue;
      }

      if (decisionObj.decision === 'add_synonym' && decisionObj.targetFoodId) {
        const targetFood = currentFoods.find(f => f.id === decisionObj.targetFoodId);
        if (targetFood) {
          if (!targetFood.synonyms.includes(line.original_name)) {
            targetFood.synonyms.push(line.original_name);
            targetFood.updated_at = new Date().toISOString();
          }
          successCount++;
        }
        continue;
      }

      if (decisionObj.decision === 'link_to_existing' && decisionObj.targetFoodId) {
        const targetFood = currentFoods.find(f => f.id === decisionObj.targetFoodId);
        if (targetFood) {
          if (!targetFood.sources.some(s => s.source_title === 'Carga Inicial')) {
            targetFood.sources.push({
              source_title: 'Carga Inicial',
              author: 'Sistema',
              notes: `Original importado: ${line.original_name} [${line.original_category}]`
            });
          }
          targetFood.updated_at = new Date().toISOString();
          successCount++;
        }
        continue;
      }

      if (decisionObj.decision === 'create_new') {
        const expandedChannels = parseChannels(line.original_channels);
        const splitFlavors = parseFlavors(line.original_flavors);
        
        const newFood: ChineseDietFood = {
          id: 'f_' + Math.random().toString(36).substr(2, 9),
          name: line.original_name,
          normalized_name: line.normalized_name,
          synonyms: line.synonyms || [],
          category: line.original_category || 'Outros',
          scientific_name: line.scientific_name || undefined,
          used_part: line.used_part || undefined,
          image_url: line.image_url || undefined,
          description: line.description || undefined,
          thermal_nature: normalizeThermalNature(line.original_thermal_nature || 'Neutro'),
          energy_direction: line.energy_direction || 'Neutro',
          flavors: splitFlavors,
          channels: expandedChannels,
          therapeutic_functions: line.therapeutic_functions || [],
          indicated_patterns: line.indicated_patterns || [],
          caution_patterns: line.caution_patterns || [],
          preparation_modes: line.preparation_modes || [],
          clinical_notes: line.clinical_notes || undefined,
          culinary_notes: line.culinary_notes || undefined,
          contraindications: line.contraindications || undefined,
          allergens: line.allergens || undefined,
          restrictions: line.restrictions || undefined,
          editorial_status: 'published',
          is_active: line.is_active ?? true,
          sources: line.source_title ? [{
            source_title: line.source_title,
            author: line.author || 'Desconhecido',
            edition: line.edition || undefined,
            page: line.page || undefined,
            publication_year: line.publication_year ? Number(line.publication_year) : undefined,
            notes: `Importado via carga em lote`
          }] : [{
            source_title: 'Carga Inicial',
            author: 'Sistema',
            notes: `Importação original em lote: ${line.original_name}`
          }],
          divergences: [],
          audit_logs: [{
            timestamp: new Date().toISOString(),
            user: 'Sistema',
            action: 'import',
            details: `Importado em lote sob ID ${importId}`
          }],
          original_imported_text: `Nome: ${line.original_name} | Cat: ${line.original_category} | Nat: ${line.original_thermal_nature} | Flav: ${line.original_flavors} | Chan: ${line.original_channels}`,
          import_id: importId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        currentFoods.push(newFood);
        successCount++;
      }
    }

    saveLocalFoods(currentFoods);

    // Tenta persistir toda a lista no Supabase
    try {
      const dbPayloads = currentFoods.map(toDbPayload);
      await (supabase.from as any)('chinese_diet_foods').upsert(dbPayloads);
    } catch (err) {
      console.error('[DietotherapyService] Erro ao enviar importação para o Supabase:', err);
    }

    if (typeof window !== 'undefined') {
      const historyStr = localStorage.getItem('axis_gc_dietotherapy_imports_history') || '[]';
      const history = JSON.parse(historyStr);
      const idx = history.findIndex((h: any) => h.id === importId);
      if (idx !== -1) {
        history[idx].status = 'confirmed';
      }
      localStorage.setItem('axis_gc_dietotherapy_imports_history', JSON.stringify(history));
    }

    return { successCount, discardedCount };
  },

  async rollbackImport(importId: string): Promise<{ deletedCount: number; skippedCount: number }> {
    const currentFoods = getLocalFoods();
    let deletedCount = 0;
    let skippedCount = 0;

    const remainingFoods = currentFoods.filter(f => {
      if (f.import_id === importId) {
        const isReviewed = f.reviewed_by || f.editorial_status === 'reviewed';
        const isManuallyEdited = f.audit_logs.some(log => log.action === 'edit' || log.user !== 'Sistema');
        
        if (isReviewed || isManuallyEdited) {
          skippedCount++;
          return true;
        } else {
          deletedCount++;
          return false;
        }
      }
      return true;
    });

    saveLocalFoods(remainingFoods);

    if (typeof window !== 'undefined') {
      const historyStr = localStorage.getItem('axis_gc_dietotherapy_imports_history') || '[]';
      const history = JSON.parse(historyStr);
      const idx = history.findIndex((h: any) => h.id === importId);
      if (idx !== -1) {
        history[idx].status = 'rolled_back';
      }
      localStorage.setItem('axis_gc_dietotherapy_imports_history', JSON.stringify(history));
    }

    return { deletedCount, skippedCount };
  },

  /**
   * Busca todas as orientações dietéticas
   */
  async getPrescriptions(): Promise<ChineseDietPrescription[]> {
    return getLocalPrescriptions();
  },

  /**
   * Salva ou atualiza uma orientação dietética (rascunho, modelo ou final)
   */
  async savePrescription(prescription: Partial<ChineseDietPrescription>): Promise<ChineseDietPrescription> {
    const prescriptions = getLocalPrescriptions();
    let updated: ChineseDietPrescription;

    if (prescription.id) {
      const idx = prescriptions.findIndex(p => p.id === prescription.id);
      if (idx !== -1) {
        updated = {
          ...prescriptions[idx],
          ...prescription,
          version_number: (prescriptions[idx].version_number || 1) + (prescription.status === 'final' ? 1 : 0),
          updated_at: new Date().toISOString()
        } as ChineseDietPrescription;
        prescriptions[idx] = updated;
      } else {
        throw new Error('Orientação não encontrada.');
      }
    } else {
      updated = {
        ...prescription,
        id: 'presc_' + Math.random().toString(36).substr(2, 9),
        version_number: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as ChineseDietPrescription;
      prescriptions.push(updated);
    }

    saveLocalPrescriptions(prescriptions);
    return updated;
  },

  /**
   * Força o envio e sincronização de todos os alimentos do armazenamento local com o banco de dados Supabase
   */
  async forceSyncWithDatabase(): Promise<{ successCount: number; error: string | null }> {
    const localFoods = getLocalFoods();
    if (!localFoods || localFoods.length === 0) {
      return { successCount: 0, error: 'Nenhum alimento encontrado no armazenamento local para sincronizar.' };
    }

    try {
      const dbPayloads = localFoods.map(toDbPayload);
      console.log(`[DietotherapyService] Forçando sincronismo de ${dbPayloads.length} alimentos com o Supabase...`);

      const BATCH_SIZE = 50;
      let totalSynced = 0;

      for (let i = 0; i < dbPayloads.length; i += BATCH_SIZE) {
        const chunk = dbPayloads.slice(i, i + BATCH_SIZE);
        const { error } = await (supabase.from as any)('chinese_diet_foods').upsert(chunk);

        if (error) {
          console.error(`[DietotherapyService] Erro ao sincronizar lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
          return { successCount: totalSynced, error: error.message };
        }

        totalSynced += chunk.length;
      }

      return { successCount: totalSynced, error: null };
    } catch (err: any) {
      console.error('[DietotherapyService] Erro fatal na força de sincronismo:', err);
      return { successCount: 0, error: err?.message || 'Falha ao conectar com o banco Supabase' };
    }
  }
};
