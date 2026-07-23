import { ChineseDietFood } from '@/types/dietotherapy';

export const INITIAL_MOCK_FOODS: ChineseDietFood[] = [
  {
    id: 'f1',
    name: 'Inhame',
    normalized_name: 'inhame',
    scientific_name: 'Colocasia esculenta',
    category: 'raízes',
    is_active: true,
    thermal_nature: 'Morno',
    flavors: ['Doce'],
    channels: ['Baço', 'Pulmão', 'Rim'],
    energy_direction: 'Ascendente',
    therapeutic_functions: ['Tonificar o Qi do Baço', 'Tonificar o Qi do Pulmão', 'Nutrir o Yin do Rim'],
    indicated_patterns: ['Deficiência de Qi do Baço', 'Deficiência de Qi do Pulmão', 'Deficiência de Yin do Rim'],
    caution_patterns: ['Estagnação de Qi', 'Plenitude abdominal'],
    synonyms: ['Cará', 'Inhame-da-Costa'],
    preparation_modes: ['Cozido', 'Assado', 'Sopa'],
    clinical_notes: 'Excelente para uso prolongado em pacientes debilitados ou idosos.',
    culinary_notes: 'Deve sempre ser consumido cozido, idealmente em caldos quentes.',
    contraindications: 'Evitar em casos de calor-umidade agudo.',
    allergens: '',
    restrictions: '',
    editorial_status: 'published',
    sources: [
      {
        source_title: 'Dietoterapia Chinesa',
        author: 'Giovanni Maciocia',
        edition: '1ª Edição',
        page: '112',
        publication_year: 2005,
        notes: 'Excelente tonificante de Qi e Yin do Baço e Rins.',
        classification: {
          thermal_nature: 'Morno',
          flavors: ['Doce'],
          channels: ['Baço', 'Rim']
        }
      }
    ],
    divergences: [],
    audit_logs: [
      {
        timestamp: '2026-07-23T01:00:00Z',
        user: 'suporte@axissystemas.com.br',
        action: 'INSERT',
        details: 'Carga inicial do alimento Inhame.'
      }
    ]
  },
  {
    id: 'f2',
    name: 'Cenoura',
    normalized_name: 'cenoura',
    scientific_name: 'Daucus carota',
    category: 'raízes',
    is_active: true,
    thermal_nature: 'Neutro',
    flavors: ['Doce'],
    channels: ['Baço', 'Fígado', 'Pulmão'],
    energy_direction: 'Neutro',
    therapeutic_functions: ['Tonificar o Baço', 'Harmonizar o Estômago', 'Melhorar a visão', 'Eliminar estagnação de alimentos'],
    indicated_patterns: ['Deficiência de Qi do Baço', 'Estagnação de Alimentos', 'Deficiência de Sangue do Fígado'],
    caution_patterns: [],
    synonyms: ['Gergelão'],
    preparation_modes: ['Cozido', 'Sopa', 'Cru'],
    clinical_notes: 'Auxilia na digestão pós-operatória quando preparada em purê.',
    culinary_notes: 'Cozida no vapor preserva melhor as propriedades de tonificação do Baço.',
    contraindications: '',
    allergens: '',
    restrictions: '',
    editorial_status: 'published',
    sources: [
      {
        source_title: 'Medicina Chinesa: Guia Prático',
        author: 'Giovanni Maciocia',
        edition: '2ª Edição',
        page: '145',
        publication_year: 2010,
        notes: 'Classificado como Neutro.'
      },
      {
        source_title: 'A Saúde Através dos Alimentos',
        author: 'Bob Flaws',
        edition: '1ª Edição',
        page: '64',
        publication_year: 1998,
        notes: 'Classificado como ligeiramente Morno devido ao seu efeito de tonificação de Qi.'
      }
    ],
    divergences: [
      {
        attribute: 'Natureza Térmica',
        opinion_a: 'Neutro',
        source_a: 'Giovanni Maciocia',
        opinion_b: 'Morno',
        source_b: 'Bob Flaws',
        clinical_recommendation: 'Usar como Neutro em preparos rápidos, mas considerar Morno se assada por longo período.'
      }
    ],
    audit_logs: [
      {
        timestamp: '2026-07-23T01:05:00Z',
        user: 'suporte@axissystemas.com.br',
        action: 'INSERT',
        details: 'Carga inicial do alimento Cenoura.'
      }
    ]
  },
  {
    id: 'f3',
    name: 'Feijão Azuki',
    normalized_name: 'feijao azuki',
    scientific_name: 'Vigna angularis',
    category: 'leguminosas',
    is_active: true,
    thermal_nature: 'Neutro',
    flavors: ['Doce', 'Azedo'],
    channels: ['Coração', 'Intestino Delgado', 'Baço'],
    energy_direction: 'Descendente',
    therapeutic_functions: ['Drenar Umidade', 'Resolver Edema', 'Tonificar o Sangue', 'Clarear Calor de Toxinas'],
    indicated_patterns: ['Acúmulo de Umidade', 'Edema por deficiência do Baço'],
    caution_patterns: ['Deficiência de fluidos corporais severa'],
    synonyms: ['Feijão Adzuki', 'Feijão Vermelho'],
    preparation_modes: ['Cozido', 'Sopa'],
    clinical_notes: 'Muito eficiente para retenção de líquidos pré-menstrual.',
    editorial_status: 'published',
    sources: [
      {
        source_title: 'Dietoterapia Chinesa',
        author: 'Giovanni Maciocia',
        page: '189'
      }
    ],
    divergences: [],
    audit_logs: []
  },
  {
    id: 'f4',
    name: 'Espinafre',
    normalized_name: 'espinafre',
    scientific_name: 'Spinacia oleracea',
    category: 'folhas',
    is_active: true,
    thermal_nature: 'Fresco',
    flavors: ['Doce'],
    channels: ['Fígado', 'Estômago', 'Intestino Grosso'],
    energy_direction: 'Descendente',
    therapeutic_functions: ['Nutrir o Sangue do Fígado', 'Limpar Calor', 'Umedecer a Secura'],
    indicated_patterns: ['Deficiência de Sangue do Fígado', 'Calor de Fígado', 'Secura nos Intestinos'],
    caution_patterns: ['Deficiência de Qi do Baço com fezes amolecidas'],
    synonyms: [],
    preparation_modes: ['Cozido', 'Vapor'],
    clinical_notes: 'Evitar consumo excessivo cru devido ao teor de oxalatos e natureza fresca.',
    editorial_status: 'published',
    sources: [
      {
        source_title: 'Medicina Chinesa: Guia Prático',
        author: 'Giovanni Maciocia',
        page: '202'
      }
    ],
    divergences: [],
    audit_logs: []
  },
  {
    id: 'f5',
    name: 'Arroz Integral',
    normalized_name: 'arroz integral',
    scientific_name: 'Oryza sativa',
    category: 'cereais',
    is_active: true,
    thermal_nature: 'Neutro',
    flavors: ['Doce'],
    channels: ['Baço', 'Estômago'],
    energy_direction: 'Neutro',
    therapeutic_functions: ['Tonificar o Qi do Baço', 'Harmonizar o Estômago', 'Acalmar a Mente', 'Cessar diarreia'],
    indicated_patterns: ['Deficiência de Qi do Baço', 'Irritabilidade mental'],
    caution_patterns: [],
    synonyms: [],
    preparation_modes: ['Cozido', 'Sopa'],
    editorial_status: 'published',
    sources: [],
    divergences: [],
    audit_logs: []
  },
  {
    id: 'f6',
    name: 'Carne de Gado',
    normalized_name: 'carne de gado',
    category: 'animais',
    is_active: true,
    thermal_nature: 'Morno',
    flavors: ['Doce'],
    channels: ['Baço', 'Estômago'],
    energy_direction: 'Ascendente',
    therapeutic_functions: ['Tonificar o Qi e o Sangue', 'Fortalecer os tendões e ossos', 'Aquecer o Aquecedor Médio'],
    indicated_patterns: ['Deficiência severa de Qi e Sangue', 'Frio no Estômago'],
    caution_patterns: ['Calor Plenitude', 'Hipertensão com padrão de Fogo'],
    synonyms: ['Carne Bovina'],
    preparation_modes: ['Cozido', 'Assado', 'Sopa'],
    editorial_status: 'published',
    sources: [],
    divergences: [],
    audit_logs: []
  },
  {
    id: 'f7',
    name: 'Espirulina',
    normalized_name: 'espirulina',
    category: 'alimentos extras',
    is_active: true,
    thermal_nature: 'Frio',
    flavors: ['Salgado'],
    channels: ['Fígado', 'Rim', 'Baço'],
    energy_direction: 'Descendente',
    therapeutic_functions: ['Nutrir o Yin', 'Clarear Calor', 'Limpar Toxinas'],
    indicated_patterns: ['Calor no Sangue', 'Calor de Fígado'],
    caution_patterns: ['Frio no Baço', 'Diarreia crônica'],
    synonyms: ['Spirulina', 'Alga Azul'],
    preparation_modes: ['Cru'],
    editorial_status: 'pending_review',
    sources: [],
    divergences: [],
    audit_logs: []
  },
  {
    id: 'f8',
    name: 'Gengibre Fresco',
    normalized_name: 'gengibre fresco',
    scientific_name: 'Zingiber officinale',
    category: 'alimentos extras',
    is_active: true,
    thermal_nature: 'Morno',
    flavors: ['Picante'],
    channels: ['Pulmão', 'Baço', 'Estômago'],
    energy_direction: 'Ascendente',
    therapeutic_functions: ['Dispersar o Frio do Exterior', 'Aquecer o Aquecedor Médio', 'Parar náusea e vômito', 'Resolver toxicidade'],
    indicated_patterns: ['Invasão de Vento-Frio', 'Frio no Estômago com náuseas'],
    caution_patterns: ['Calor de Estômago', 'Sudorese excessiva por Calor'],
    synonyms: [],
    preparation_modes: ['Chá', 'Cozido', 'Cru'],
    editorial_status: 'published',
    sources: [],
    divergences: [],
    audit_logs: []
  }
];
