import React, { useState, useEffect } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Check, Plus, Trash2, 
  Sparkles, AlertTriangle, Info, BookOpen, User as UserIcon, Calendar, Clipboard, Search
} from 'lucide-react';
import { 
  ChineseDietFood, ChineseDietPrescription, PrescriptionItem, ThermalNature, DietClinicalAlert 
} from '@/types/dietotherapy';
import { dietotherapyService } from '@/lib/dietotherapyService';
import { supabase } from '@/lib/supabase';
import FoodDetailModal from './FoodDetailModal';

interface DietBuilderModalProps {
  onClose: () => void;
  onSave: (prescription: Partial<ChineseDietPrescription>) => Promise<void>;
  user?: any;
  preloadedEval?: {
    id: string;
    patientId: string;
    pattern: string;
    principles: string | string[];
  } | null;
}

const PRINCIPLES_TEMPLATES = [
  'tonificar o Qi', 'nutrir o Sangue', 'nutrir o Yin', 'aquecer o Yang',
  'eliminar Calor', 'dispersar Frio', 'transformar Umidade', 'transformar Fleuma',
  'mover o Qi', 'mover o Sangue', 'umedecer a Secura', 'harmonizar Baço e Estômago'
];

const NATURES: ThermalNature[] = ['Quente', 'Morno', 'Neutro', 'Fresco', 'Frio'];
const FLAVORS = ['Doce', 'Picante', 'Amargo', 'Azedo', 'Salgado', 'Adstringente'];
const CHANNELS = ['Baço', 'Estômago', 'Fígado', 'Coração', 'Pulmão', 'Rim', 'Vesícula Biliar', 'Intestino Grosso', 'Intestino Delgado', 'Bexiga'];

export default function DietBuilderModal({ onClose, onSave, user, preloadedEval }: DietBuilderModalProps) {
  const [step, setStep] = useState(1);

  // Etapa 1 — Contexto Clínico
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState('');
  const [disharmonyPattern, setDisharmonyPattern] = useState('');
  const [secondaryPatterns, setSecondaryPatterns] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [newRestriction, setNewRestriction] = useState('');

  // Etapa 2 — Princípios de Tratamento
  const [selectedPrinciples, setSelectedPrinciples] = useState<string[]>([]);
  const [customPrinciple, setCustomPrinciple] = useState('');

  // Etapa 3 — Propriedades Desejadas
  const [targetNatures, setTargetNatures] = useState<ThermalNature[]>([]);
  const [targetFlavors, setTargetFlavors] = useState<string[]>([]);
  const [targetChannels, setTargetChannels] = useState<string[]>([]);
  const [desiredFunctions, setDesiredFunctions] = useState<string[]>([]);
  const [newFunction, setNewFunction] = useState('');

  // Etapa 4 — Seleção dos Alimentos
  const [allFoods, setAllFoods] = useState<ChineseDietFood[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [prioritizeItems, setPrioritizeItems] = useState<PrescriptionItem[]>([]);
  const [moderateItems, setModerateItems] = useState<PrescriptionItem[]>([]);
  const [avoidItems, setAvoidItems] = useState<PrescriptionItem[]>([]);
  const [viewingFood, setViewingFood] = useState<ChineseDietFood | null>(null);

  // Etapa 5 — Recomendações
  const [generalRecs, setGeneralRecs] = useState('');
  const [individualizedNotes, setIndividualizedNotes] = useState('');
  const [period, setPeriod] = useState('30 dias');
  
  // Custom PDF rendering configuration states
  const [accessibleObjective, setAccessibleObjective] = useState('');
  const [mealSuggestions, setMealSuggestions] = useState('');
  const [reevaluationDate, setReevaluationDate] = useState('');
  const [professionalRegistry, setProfessionalRegistry] = useState('');
  const [safetyWarning, setSafetyWarning] = useState('');

  // Controle de Gravação
  const [prescriptionTitle, setPrescriptionTitle] = useState('Orientação Dietética Alimentar');
  const [saveStatus, setSaveStatus] = useState<'draft' | 'final'>('draft');
  const [isTemplate, setIsTemplate] = useState(false);

  // Carregar avaliação pré-carregada
  useEffect(() => {
    if (preloadedEval) {
      setSelectedPatientId(preloadedEval.patientId);
      setSelectedEvaluationId(preloadedEval.id);
      setDisharmonyPattern(preloadedEval.pattern);
      if (preloadedEval.principles) {
        if (Array.isArray(preloadedEval.principles)) {
          setSelectedPrinciples(preloadedEval.principles);
        } else {
          const parsed = preloadedEval.principles.split(/[,;\n]/).map(s => s.trim()).filter(s => s !== '');
          setSelectedPrinciples(parsed);
        }
      }
    }
  }, [preloadedEval]);

  // Carregar dados de pacientes e alimentos
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Carrega Alimentos
        const foodsData = await dietotherapyService.getFoods({ editorial_status: 'published' });
        setAllFoods(foodsData);

        // Carrega Pacientes do Supabase se disponível, ou Mock
        if (supabase) {
          const { data: pats, error } = await supabase.from('patients').select('id, name, metadata').order('name');
          if (pats && pats.length > 0) {
            setPatients(pats);
          } else {
            setPatients([
              { id: 'p_mock1', name: 'Maria Souza', metadata: { allergies: ['Lactose', 'Glúten'] } },
              { id: 'p_mock2', name: 'João Silva', metadata: { allergies: [] } }
            ]);
          }
        }
      } catch (e) {
        setPatients([
          { id: 'p_mock1', name: 'Maria Souza', metadata: { allergies: ['Lactose', 'Glúten'] } },
          { id: 'p_mock2', name: 'João Silva', metadata: { allergies: [] } }
        ]);
      }
    };
    loadInitialData();
  }, []);

  // Carregar Avaliações do Paciente
  useEffect(() => {
    const loadEvaluations = async () => {
      if (!selectedPatientId) {
        setEvaluations([]);
        return;
      }
      try {
        if (supabase) {
          const { data: evals, error } = await supabase
            .from('evaluations')
            .select('*')
            .eq('patient_id', selectedPatientId)
            .order('date', { ascending: false });

          if (evals && evals.length > 0) {
            setEvaluations(evals.map(ev => {
              const evalData = (ev as any).data || {};
              return {
                id: ev.id,
                date: ev.date,
                code: (ev as any).code || 'AV',
                syndromeHypothesis: evalData.syndromeHypothesis || 'Padrão não especificado',
                tongueColor: evalData.tonguePulse?.color || '',
                tongueCoating: evalData.tonguePulse?.coating || ''
              };
            }));
          } else {
            // Mock de avaliações se não houver registros
            setEvaluations([
              { 
                id: 'ev_mock1', 
                date: '2026-07-22', 
                code: 'AV-001', 
                syndromeHypothesis: 'Deficiência de Qi do Baço com Umidade',
                tongueColor: 'Pálida',
                tongueCoating: 'Branca e Pegajosa'
              }
            ]);
          }
        }
      } catch (e) {
        setEvaluations([
          { 
            id: 'ev_mock1', 
            date: '2026-07-22', 
            code: 'AV-001', 
            syndromeHypothesis: 'Deficiência de Qi do Baço com Umidade',
            tongueColor: 'Pálida',
            tongueCoating: 'Branca e Pegajosa'
          }
        ]);
      }
    };
    loadEvaluations();
  }, [selectedPatientId]);

  // Quando seleciona uma avaliação, preenche automaticamente os padrões e sintomas sugeridos
  useEffect(() => {
    if (!selectedEvaluationId) return;
    const selectedEval = evaluations.find(ev => ev.id === selectedEvaluationId);
    if (selectedEval) {
      setDisharmonyPattern(selectedEval.syndromeHypothesis);
      setSymptoms([
        selectedEval.tongueColor ? `Língua ${selectedEval.tongueColor}` : '',
        selectedEval.tongueCoating ? `Saburra ${selectedEval.tongueCoating}` : ''
      ].filter(s => s !== ''));

      // Preenche restrições baseadas no paciente
      const pat = patients.find(p => p.id === selectedPatientId);
      if (pat?.metadata?.allergies) {
        setRestrictions(pat.metadata.allergies);
      }

      // Auto-sugere princípios e propriedades baseados no padrão
      if (selectedEval.syndromeHypothesis.includes('Baço') && selectedEval.syndromeHypothesis.includes('Qi')) {
        setSelectedPrinciples(['tonificar o Qi', 'harmonizar Baço e Estômago']);
        setTargetNatures(['Neutro', 'Morno']);
        setTargetFlavors(['Doce']);
        setTargetChannels(['Baço', 'Estômago']);
      } else if (selectedEval.syndromeHypothesis.includes('Frio')) {
        setSelectedPrinciples(['dispersar Frio', 'aquecer o Yang']);
        setTargetNatures(['Quente', 'Morno']);
        setTargetFlavors(['Picante']);
      } else if (selectedEval.syndromeHypothesis.includes('Calor')) {
        setSelectedPrinciples(['eliminar Calor']);
        setTargetNatures(['Fresco', 'Frio']);
        setTargetFlavors(['Amargo']);
      }
    }
  }, [selectedEvaluationId, evaluations, patients, selectedPatientId]);

  // Adicionar Alimento a alguma lista
  const addFoodToLevel = (food: ChineseDietFood, level: 'prioritize' | 'moderate' | 'avoid') => {
    const item: PrescriptionItem = {
      food_id: food.id,
      food_name: food.name,
      food_thermal_nature: food.thermal_nature,
      food_flavors: food.flavors,
      food_channels: food.channels,
      recommendation_level: level,
      custom_prep_notes: '',
      frequency: '',
      quantity: ''
    };

    // Remove das outras listas para evitar duplicidade
    setPrioritizeItems(prev => prev.filter(i => i.food_id !== food.id));
    setModerateItems(prev => prev.filter(i => i.food_id !== food.id));
    setAvoidItems(prev => prev.filter(i => i.food_id !== food.id));

    if (level === 'prioritize') setPrioritizeItems(prev => [...prev, item]);
    if (level === 'moderate') setModerateItems(prev => [...prev, item]);
    if (level === 'avoid') setAvoidItems(prev => [...prev, item]);
  };

  const removeItem = (foodId: string, level: 'prioritize' | 'moderate' | 'avoid') => {
    if (level === 'prioritize') setPrioritizeItems(prev => prev.filter(i => i.food_id !== foodId));
    if (level === 'moderate') setModerateItems(prev => prev.filter(i => i.food_id !== foodId));
    if (level === 'avoid') setAvoidItems(prev => prev.filter(i => i.food_id !== foodId));
  };

  const updateItemDetails = (
    foodId: string, 
    level: 'prioritize' | 'moderate' | 'avoid', 
    field: 'custom_prep_notes' | 'frequency' | 'quantity', 
    value: string
  ) => {
    const update = (prev: PrescriptionItem[]) => prev.map(item => {
      if (item.food_id === foodId) {
        return { ...item, [field]: value };
      }
      return item;
    });

    if (level === 'prioritize') setPrioritizeItems(update);
    if (level === 'moderate') setModerateItems(update);
    if (level === 'avoid') setAvoidItems(update);
  };

  // Filtragem de alimentos sugeridos na Etapa 4
  const filteredFoods = allFoods.filter(food => {
    // 1. Busca textual
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      const matchText = food.name.toLowerCase().includes(term) ||
                        food.flavors.some(f => f.toLowerCase().includes(term)) ||
                        food.channels.some(c => c.toLowerCase().includes(term));
      if (!matchText) return false;
    }

    // 2. Filtros baseados na Etapa 3 (Somente se houver filtros selecionados pelo profissional)
    if (targetNatures.length > 0 && !targetNatures.includes(food.thermal_nature)) return false;
    if (targetFlavors.length > 0 && !food.flavors.some(f => targetFlavors.includes(f))) return false;
    if (targetChannels.length > 0 && !food.channels.some(c => targetChannels.includes(c))) return false;

    return true;
  });

  // Justificativas do profissional para os alertas
  const [justifications, setJustifications] = useState<Record<string, string>>({});

  // Geração de Alertas Clínicos Automáticos (Apoio à decisão)
  const getClinicalAlerts = (): DietClinicalAlert[] => {
    const alerts: DietClinicalAlert[] = [];
    const normPattern = disharmonyPattern.toLowerCase();

    // 1. Orientação para Calor com predominância de alimentos quentes
    const isCalor = normPattern.includes('calor') || normPattern.includes('fogo') || normPattern.includes('deficiência de yin') || normPattern.includes('yin');
    const hotFoodsInPrioritize = prioritizeItems.filter(i => i.food_thermal_nature === 'Quente' || i.food_thermal_nature === 'Morno');
    if (isCalor && prioritizeItems.length > 0 && (hotFoodsInPrioritize.length / prioritizeItems.length) > 0.5) {
      alerts.push({
        id: 'alert_calor_predominance_hot',
        level: 'critical',
        title: 'Predominância de Alimentos Quentes em Padrão de Calor',
        description: 'A orientação clínica é voltada para tratar Calor/Fogo, mas mais da metade dos alimentos selecionados para priorizar possuem natureza de aquecimento (Quente/Morno).',
        reason: 'Alimentos Quentes e Mornos aceleram a circulação de Qi, ativam as funções corporais e geram Calor interno, o que se opõe diretamente ao princípio de clarear Calor.',
        recommended_action: 'Substitua alguns alimentos Quentes/Mornos por alimentos de natureza Neutra, Fresca ou Fria.'
      });
    }

    // 2. Orientação para Frio com predominância de alimentos frios
    const isFrio = normPattern.includes('frio') || normPattern.includes('yang') || normPattern.includes('deficiência de yang');
    const coldFoodsInPrioritize = prioritizeItems.filter(i => i.food_thermal_nature === 'Frio' || i.food_thermal_nature === 'Fresco');
    if (isFrio && prioritizeItems.length > 0 && (coldFoodsInPrioritize.length / prioritizeItems.length) > 0.5) {
      alerts.push({
        id: 'alert_frio_predominance_cold',
        level: 'critical',
        title: 'Predominância de Alimentos Frios em Padrão de Frio/Deficiência de Yang',
        description: 'A conduta visa tratar Frio Interno ou Deficiência de Yang, porém a maior parte dos alimentos prioritários é de natureza Fria/Fresca.',
        reason: 'Alimentos Frios e Frescos reduzem a atividade metabólica e resfriam o corpo, o que pode agravar sintomas de frio e enfraquecer o Fogo do Portal da Vida (Ming Men).',
        recommended_action: 'Adicione ou aumente a proporção de alimentos Mornos ou Quentes na lista de prioridades.'
      });
    }

    // 3. Excesso de alimentos de uma mesma natureza em Priorizar
    const naturesCount: Record<string, number> = {};
    prioritizeItems.forEach(i => {
      naturesCount[i.food_thermal_nature] = (naturesCount[i.food_thermal_nature] || 0) + 1;
    });
    Object.entries(naturesCount).forEach(([nature, count]) => {
      if (count > 4) {
        alerts.push({
          id: `alert_excess_nature_${nature}`,
          level: 'warning',
          title: `Concentração Elevada de Alimentos de Natureza ${nature}`,
          description: `Há um número elevado de alimentos (${count}) com natureza térmica "${nature}" concentrados na lista de prioridades.`,
          reason: 'A Dietoterapia Chinesa preza pela harmonia e moderação. A concentração excessiva de uma única natureza térmica pode sobrecarregar o Baço/Estômago.',
          recommended_action: 'Diversifique a seleção incluindo alimentos de natureza Neutra para equilibrar a recomendação dietética.'
        });
      }
    });

    // 4. Alimento associado a um padrão de cautela, alergias, contraindicação ou divergência
    prioritizeItems.concat(moderateItems).forEach(item => {
      const foodRef = allFoods.find(f => f.id === item.food_id);
      if (!foodRef) return;

      // Cautela
      if (foodRef.caution_patterns && foodRef.caution_patterns.length > 0) {
        foodRef.caution_patterns.forEach(cp => {
          if (normPattern.includes(cp.toLowerCase())) {
            alerts.push({
              id: `alert_caution_${item.food_id}_${cp}`,
              level: 'warning',
              title: `Alimento Associado a Padrão de Cautela: ${item.food_name}`,
              description: `O alimento "${item.food_name}" possui indicação de cautela no sistema para o padrão "${cp}".`,
              reason: `Alguns alimentos possuem propriedades ou direções energéticas secundárias que podem exacerbar condições acessórias de cautela do paciente.`,
              recommended_action: 'Avalie se a dosagem deve ser reduzida ou justifique a inclusão.'
            });
          }
        });
      }

      // Alergias
      restrictions.forEach(allergy => {
        const isMatch = item.food_name.toLowerCase().includes(allergy.toLowerCase()) ||
                        (foodRef.synonyms && foodRef.synonyms.some(s => s.toLowerCase().includes(allergy.toLowerCase()))) ||
                        (foodRef.allergens && foodRef.allergens.toLowerCase().includes(allergy.toLowerCase()));
        if (isMatch) {
          alerts.push({
            id: `alert_allergy_${item.food_id}_${allergy}`,
            level: 'critical',
            title: `Alergia/Intolerância Detectada: ${item.food_name}`,
            description: `O alimento "${item.food_name}" coincide com a alergia ou restrição registrada do paciente: "${allergy}".`,
            reason: 'Risco de reação adversa imediata ou hipersensibilidade alimentar.',
            recommended_action: 'Remova o alimento da prescrição ou mude-o para Evitar Temporariamente.'
          });
        }
      });

      // Contraindicações
      if (foodRef.contraindications) {
        const matchContra = normPattern.split(' ').some(word => word.length > 3 && foodRef.contraindications?.toLowerCase().includes(word));
        if (matchContra) {
          alerts.push({
            id: `alert_contraindication_${item.food_id}`,
            level: 'warning',
            title: `Contraindicação Clínica Recomendada: ${item.food_name}`,
            description: `O alimento "${item.food_name}" possui contraindicações no sistema que coincidem com termos do quadro clínico: "${foodRef.contraindications}".`,
            reason: 'A literatura clássica ou observações clínicas sugerem evitar este alimento em quadros similares ao do paciente.',
            recommended_action: 'Revise a inclusão ou substitua por outro alimento da mesma categoria.'
          });
        }
      }

      // Alimento não revisado
      if (foodRef.editorial_status !== 'published') {
        alerts.push({
          id: `alert_not_reviewed_${item.food_id}`,
          level: 'info',
          title: `Alimento Pendente de Revisão: ${item.food_name}`,
          description: `O alimento "${item.food_name}" está com status de revisão pendente ou em análise.`,
          reason: 'Os dados cadastrais deste alimento ainda não passaram pela validação científica/editorial final do sistema.',
          recommended_action: 'Confirme as propriedades com fontes adicionais antes da prescrição.'
        });
      }

      // Classificação divergente entre referências
      if (foodRef.divergences && foodRef.divergences.length > 0) {
        alerts.push({
          id: `alert_divergence_${item.food_id}`,
          level: 'info',
          title: `Classificação Divergente nas Referências: ${item.food_name}`,
          description: `O alimento "${item.food_name}" possui divergências de classificação registradas na literatura.`,
          reason: `Existem opiniões conflitantes registradas (ex: natureza Neutra por um autor e Morna por outro).`,
          recommended_action: 'Consulte a ficha do alimento para ver as diferentes visões literárias.'
        });
      }
    });

    // 9. Orientação sem princípio de tratamento
    if (selectedPrinciples.length === 0) {
      alerts.push({
        id: 'alert_no_principles',
        level: 'warning',
        title: 'Ausência de Princípios de Tratamento',
        description: 'Nenhum princípio de tratamento clínico foi selecionado na Etapa 2.',
        reason: 'O tratamento por dietoterapia deve ser guiado por um raciocínio clínico claro e estruturado.',
        recommended_action: 'Selecione ao menos um princípio de tratamento na Etapa 2.'
      });
    }

    // 10. Orientação sem vínculo com avaliação
    if (!selectedEvaluationId) {
      alerts.push({
        id: 'alert_no_evaluation',
        level: 'info',
        title: 'Prescrição sem Vínculo com Avaliação Energética',
        description: 'Esta prescrição não está associada a nenhuma avaliação energética registrada.',
        reason: 'Vincular a uma avaliação garante a rastreabilidade da conduta clínica.',
        recommended_action: 'Selecione uma avaliação energética na Etapa 1 ou prossiga justificando a prescrição direta.'
      });
    }

    // 11. Ausência de período para reavaliação
    if (!period || period.trim() === '') {
      alerts.push({
        id: 'alert_no_period',
        level: 'warning',
        title: 'Ausência de Período para Reavaliação',
        description: 'O período de aplicação da conduta alimentar não foi estipulado.',
        reason: 'As prescrições dietéticas MTC baseiam-se em síndromes dinâmicas e exigem reavaliação periódica.',
        recommended_action: 'Defina o período de reavaliação (ex: 30 dias) na Etapa 5.'
      });
    }

    return alerts;
  };

  const handleFinalSave = async () => {
    const patient = patients.find(p => p.id === selectedPatientId);
    const calculatedAlerts = getClinicalAlerts().map(a => ({
      ...a,
      professional_justification: justifications[a.id] || undefined
    }));
    
    const prescriptionData: Partial<ChineseDietPrescription> = {
      title: prescriptionTitle,
      patient_id: selectedPatientId || undefined,
      patient_name: patient?.name || undefined,
      evaluation_id: selectedEvaluationId || undefined,
      disharmony_pattern: disharmonyPattern,
      secondary_patterns: secondaryPatterns,
      symptoms,
      treatment_principles: selectedPrinciples,
      general_recommendations: generalRecs,
      individualized_notes: individualizedNotes,
      period,
      is_template: isTemplate,
      status: saveStatus,
      items: [...prioritizeItems, ...moderateItems, ...avoidItems],
      alerts: calculatedAlerts,
      created_by: user?.name || 'suporte@axissystemas.com.br',
      
      // PDF & clinical metadata fields
      accessible_objective: accessibleObjective || undefined,
      meal_suggestions: mealSuggestions || undefined,
      reevaluation_date: reevaluationDate || undefined,
      safety_warning: safetyWarning || undefined,
      professional_registry: professionalRegistry || undefined
    };

    await onSave(prescriptionData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Container */}
      <div className="relative bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Dietoterapia Chinesa</span>
            <h2 className="text-2xl font-bold font-headline text-on-surface">Construtor de Orientação Dietética</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-on-surface-variant">
            <X size={24} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-surface-container-low/50 px-8 py-4 border-b border-outline-variant/10 flex justify-between text-xs font-bold text-outline">
          {[
            '1. Caso Clínico',
            '2. Princípios',
            '3. Propriedades',
            '4. Alimentos',
            '5. Prescrição',
            '6. Revisão'
          ].map((label, idx) => (
            <span 
              key={idx} 
              className={`transition-all ${step === idx + 1 ? 'text-primary scale-105 border-b-2 border-primary pb-1' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Step Contents */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* ETAPA 1: Contexto Clínico */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selecionar Paciente */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase flex items-center gap-1">
                    <UserIcon size={14} /> Selecionar Paciente
                  </label>
                  <select 
                    value={selectedPatientId} 
                    onChange={e => { setSelectedPatientId(e.target.value); setSelectedEvaluationId(''); }}
                    className="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-bold text-on-surface outline-none"
                  >
                    <option value="">Selecione o paciente...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Selecionar Avaliação */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase flex items-center gap-1">
                    <Calendar size={14} /> Selecionar Avaliação Energética Recente
                  </label>
                  <select 
                    disabled={!selectedPatientId}
                    value={selectedEvaluationId} 
                    onChange={e => setSelectedEvaluationId(e.target.value)}
                    className="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-bold text-on-surface outline-none disabled:opacity-50"
                  >
                    <option value="">Selecione a avaliação...</option>
                    {evaluations.map(ev => <option key={ev.id} value={ev.id}>{new Date(ev.date).toLocaleDateString('pt-BR')} - {ev.syndromeHypothesis}</option>)}
                  </select>
                </div>
              </div>

              {selectedEvaluationId && (
                <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                    <Clipboard size={16} /> Quadro Diagnóstico MTC (Suporte Clínico)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-outline font-bold block mb-1">PADRÃO PRINCIPAL DETECTADO</span>
                      <input 
                        type="text" 
                        value={disharmonyPattern}
                        onChange={e => setDisharmonyPattern(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-outline-variant/10 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-outline font-bold block mb-1">ALERGIAS E RESTRIÇÕES CADASTRADAS</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {restrictions.map(r => (
                          <span key={r} className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-800 text-[10px] font-bold rounded">
                            {r}
                          </span>
                        ))}
                        {restrictions.length === 0 && <span className="text-[10px] text-outline italic">Nenhuma alergia relatada.</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 2: Princípios de Tratamento */}
          {step === 2 && (
            <div className="space-y-6">
              <span className="text-xs font-bold text-outline uppercase block">Selecione os Princípios de Tratamento Clínico</span>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRINCIPLES_TEMPLATES.map(princ => {
                  const active = selectedPrinciples.includes(princ);
                  return (
                    <button
                      type="button"
                      key={princ}
                      onClick={() => {
                        setSelectedPrinciples(prev => 
                          active ? prev.filter(p => p !== princ) : [...prev, princ]
                        );
                      }}
                      className={`p-4 rounded-xl text-xs font-bold border transition-all text-left flex justify-between items-center ${
                        active 
                          ? 'bg-primary text-white border-primary shadow-sm' 
                          : 'bg-surface-container-low text-on-surface border-outline-variant/10 hover:border-primary/20'
                      }`}
                    >
                      {princ}
                      {active && <Check size={14} />}
                    </button>
                  );
                })}
              </div>

              {/* Princípio customizado */}
              <div className="flex gap-3 max-w-md items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase">Outro Princípio de Tratamento</label>
                  <input 
                    type="text" 
                    value={customPrinciple}
                    onChange={e => setCustomPrinciple(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/10 text-xs font-semibold"
                    placeholder="Ex: Resolver estagnação do Yang"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (customPrinciple.trim() && !selectedPrinciples.includes(customPrinciple)) {
                      setSelectedPrinciples(prev => [...prev, customPrinciple.trim()]);
                      setCustomPrinciple('');
                    }
                  }}
                  className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 3: Propriedades Desejadas (Filtros Guias) */}
          {step === 3 && (
            <div className="space-y-8">
              <span className="text-xs font-bold text-outline uppercase block">Defina as Propriedades Clínicas desejadas dos Alimentos</span>

              {/* Filtro de Natureza */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-outline uppercase block">Naturezas Térmicas Desejadas</label>
                <div className="flex flex-wrap gap-2">
                  {NATURES.map(n => {
                    const active = targetNatures.includes(n);
                    return (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setTargetNatures(prev => active ? prev.filter(x => x !== n) : [...prev, n])}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          active ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-container-low text-on-surface border-outline-variant/10'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtro de Sabores */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-outline uppercase block">Sabores Desejados</label>
                <div className="flex flex-wrap gap-2">
                  {FLAVORS.map(f => {
                    const active = targetFlavors.includes(f);
                    return (
                      <button
                        type="button"
                        key={f}
                        onClick={() => setTargetFlavors(prev => active ? prev.filter(x => x !== f) : [...prev, f])}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          active ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-container-low text-on-surface border-outline-variant/10'
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tropismos / Canais */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-outline uppercase block">Canais / Meridianos Desejados</label>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map(c => {
                    const active = targetChannels.includes(c);
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setTargetChannels(prev => active ? prev.filter(x => x !== c) : [...prev, c])}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          active ? 'bg-secondary text-white border-secondary shadow-sm' : 'bg-surface-container-low text-on-surface border-outline-variant/10'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: Seleção dos Alimentos */}
          {step === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Coluna Esquerda: Busca e Resultados */}
              <div className="lg:col-span-2 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar alimentos por nome..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-medium outline-none"
                  />
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                  {filteredFoods.map(food => (
                    <div key={food.id} className="bg-white p-4 rounded-2xl border border-outline-variant/10 flex justify-between items-center shadow-sm">
                      <div>
                        <span className="font-bold text-sm text-on-surface">{food.name}</span>
                        <span className="text-[9px] uppercase font-bold text-outline block mt-0.5">{food.category} | {food.thermal_nature} | {food.flavors.join(', ')}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setViewingFood(food)}
                          className="px-2.5 py-1 bg-surface-container-low text-on-surface text-[10px] font-bold rounded-lg border hover:bg-surface-container-high transition-all"
                        >
                          Ficha
                        </button>
                        <button 
                          type="button"
                          onClick={() => addFoodToLevel(food, 'prioritize')}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all"
                        >
                          Priorizar
                        </button>
                        <button 
                          type="button"
                          onClick={() => addFoodToLevel(food, 'moderate')}
                          className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200 hover:bg-amber-100 transition-all"
                        >
                          Moderar
                        </button>
                        <button 
                          type="button"
                          onClick={() => addFoodToLevel(food, 'avoid')}
                          className="px-2.5 py-1 bg-rose-50 text-rose-800 text-[10px] font-bold rounded-lg border border-rose-200 hover:bg-rose-100 transition-all"
                        >
                          Evitar
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredFoods.length === 0 && (
                    <p className="text-xs text-outline italic text-center py-6">Nenhum alimento compatível encontrado.</p>
                  )}
                </div>
              </div>

              {/* Coluna Direita: Quadro Resumo */}
              <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 space-y-6">
                <span className="text-xs font-bold text-primary block border-b border-outline-variant/15 pb-2">Alimentos Alocados</span>
                
                {/* Priorizar */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-emerald-800 block">💚 PRIORIZAR</span>
                  <div className="space-y-1">
                    {prioritizeItems.map(item => (
                      <div key={item.food_id} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100">
                        <span>{item.food_name}</span>
                        <button onClick={() => removeItem(item.food_id, 'prioritize')} className="text-rose-500 hover:text-rose-700">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {prioritizeItems.length === 0 && <span className="text-[10px] text-outline italic pl-2">Nenhum.</span>}
                  </div>
                </div>

                {/* Moderar */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-amber-800 block">💛 CONSUMIR COM MODERAÇÃO</span>
                  <div className="space-y-1">
                    {moderateItems.map(item => (
                      <div key={item.food_id} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-100">
                        <span>{item.food_name}</span>
                        <button onClick={() => removeItem(item.food_id, 'moderate')} className="text-rose-500 hover:text-rose-700">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {moderateItems.length === 0 && <span className="text-[10px] text-outline italic pl-2">Nenhum.</span>}
                  </div>
                </div>

                {/* Evitar */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-rose-800 block">🔴 EVITAR TEMPORARIAMENTE</span>
                  <div className="space-y-1">
                    {avoidItems.map(item => (
                      <div key={item.food_id} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-100">
                        <span>{item.food_name}</span>
                        <button onClick={() => removeItem(item.food_id, 'avoid')} className="text-rose-500 hover:text-rose-700">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {avoidItems.length === 0 && <span className="text-[10px] text-outline italic pl-2">Nenhum.</span>}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ETAPA 5: Recomendações e Preparo */}
          {step === 5 && (
            <div className="space-y-6">
              <span className="text-xs font-bold text-outline uppercase block">Detalhe as Orientações de Preparo e Consumo</span>

              {prioritizeItems.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-emerald-800 block border-b border-emerald-100 pb-1">Instruções para alimentos que deve Priorizar</span>
                  {prioritizeItems.map(item => (
                    <div key={item.food_id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                      <div className="text-xs font-bold">{item.food_name}</div>
                      <div>
                        <label className="text-[9px] font-bold text-outline uppercase">Modo de Preparo</label>
                        <input 
                          type="text" 
                          value={item.custom_prep_notes || ''}
                          onChange={e => updateItemDetails(item.food_id, 'prioritize', 'custom_prep_notes', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-outline-variant/10 text-xs"
                          placeholder="Ex: Cozido no vapor"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-outline uppercase">Frequência / Quantidade</label>
                        <input 
                          type="text" 
                          value={item.frequency || ''}
                          onChange={e => updateItemDetails(item.food_id, 'prioritize', 'frequency', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-outline-variant/10 text-xs"
                          placeholder="Ex: 3x por semana"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Orientações gerais */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-outline uppercase block">Recomendações Culinárias Gerais</label>
                <textarea 
                  rows={3} 
                  value={generalRecs}
                  onChange={e => setGeneralRecs(e.target.value)}
                  className="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold resize-none"
                  placeholder="Ex: Evitar líquidos gelados durante as refeições. Preferir alimentos cozidos e sopas quentes para nutrir o Qi do Baço."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-outline uppercase block">Objetivo da Orientação (Linguagem Acessível ao Paciente)</label>
                <textarea 
                  rows={2} 
                  value={accessibleObjective}
                  onChange={e => setAccessibleObjective(e.target.value)}
                  className="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold resize-none"
                  placeholder="Ex: Harmonizar e aquecer o estômago para melhorar a digestão e combater gases..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-outline uppercase block">Sugestões de Refeições e Combinações Culinárias</label>
                <textarea 
                  rows={2} 
                  value={mealSuggestions}
                  onChange={e => setMealSuggestions(e.target.value)}
                  className="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold resize-none"
                  placeholder="Ex: Mingau de aveia morno pela manhã; Sopa de abóbora com gengibre no jantar..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase block">Observações Clínicas Individualizadas</label>
                  <textarea 
                    rows={2} 
                    value={individualizedNotes}
                    onChange={e => setIndividualizedNotes(e.target.value)}
                    className="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold resize-none"
                    placeholder="Instruções particulares..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase block">Período de Aplicação da Orientação</label>
                  <input 
                    type="text" 
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase block">Registro Profissional (CRN/CRM)</label>
                  <input 
                    type="text" 
                    value={professionalRegistry}
                    onChange={e => setProfessionalRegistry(e.target.value)}
                    className="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold"
                    placeholder="Ex: CRN-3 12345/SP"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase block">Data Sugerida para Reavaliação</label>
                  <input 
                    type="date" 
                    value={reevaluationDate}
                    onChange={e => setReevaluationDate(e.target.value)}
                    className="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase block">Aviso de Segurança (Opcional)</label>
                  <input 
                    type="text" 
                    value={safetyWarning}
                    onChange={e => setSafetyWarning(e.target.value)}
                    className="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs font-semibold"
                    placeholder="Aviso padrão da clínica..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 6: Revisão, Alertas Clínicos e Finalização */}
          {step === 6 && (
            <div className="space-y-6">
              
              {/* Alertas Automáticos de Suporte à Decisão */}
              {getClinicalAlerts().length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    🛡️ Apoio à Decisão: Alertas Clínicos e Incompatibilidades
                  </h4>
                  <div className="space-y-3 max-h-[35vh] overflow-y-auto custom-scrollbar pr-2">
                    {getClinicalAlerts().map((alert) => (
                      <div key={alert.id} className={`p-5 rounded-2xl border ${
                        alert.level === 'critical' ? 'bg-rose-50 border-rose-200 text-rose-950' :
                        alert.level === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-950' :
                        'bg-sky-50 border-sky-200 text-sky-950'
                      } space-y-2`}>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs flex items-center gap-1.5">
                            <AlertTriangle size={15} /> {alert.title}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                            alert.level === 'critical' ? 'bg-rose-100 text-rose-800' :
                            alert.level === 'warning' ? 'bg-amber-100 text-amber-800' :
                            'bg-sky-100 text-sky-800'
                          }`}>{alert.level === 'critical' ? 'Crítico' : alert.level === 'warning' ? 'Atenção' : 'Informativo'}</span>
                        </div>
                        <p className="text-xs font-semibold">{alert.description}</p>
                        <div className="text-[10px] opacity-90 leading-relaxed font-medium">
                          <strong>Motivo:</strong> {alert.reason} <br />
                          <strong>Recomendação:</strong> {alert.recommended_action}
                        </div>
                        <div className="pt-2 border-t border-outline-variant/10">
                          <label className="text-[9px] font-bold block mb-1 uppercase text-outline">Justificativa Profissional para manter a conduta</label>
                          <textarea
                            rows={1}
                            value={justifications[alert.id] || ''}
                            onChange={e => setJustifications(prev => ({ ...prev, [alert.id]: e.target.value }))}
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-outline-variant/15 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary/20"
                            placeholder="Insira sua justificativa técnica..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-outline italic">
                    * Os alertas servem como assessoria de apoio à decisão do terapeuta, mantendo sua total autonomia clínica para prescrever.
                  </p>
                </div>
              )}

              {/* Quadro Resumo */}
              <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 space-y-4">
                <h4 className="text-sm font-bold text-primary">Revisão Geral da Prescrição</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-on-surface">
                  <div>
                    <span className="text-[9px] text-outline block">PADRÃO ENERGÉTICO</span>
                    <span>{disharmonyPattern || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-outline block">PRINCÍPIOS</span>
                    <span>{selectedPrinciples.join(', ') || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-outline block">ITENS PRIORITÁRIOS</span>
                    <span>{prioritizeItems.length} alimentos</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-outline block">PERÍODO</span>
                    <span>{period}</span>
                  </div>
                </div>
              </div>

              {/* Escolha da Forma de Gravação */}
              <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 space-y-4">
                <span className="text-xs font-bold text-outline uppercase block">Configurações de Gravação</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-bold text-outline uppercase">Título do Documento</label>
                    <input 
                      type="text" 
                      value={prescriptionTitle}
                      onChange={e => setPrescriptionTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/10 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-outline uppercase block mb-1.5">Gravar Como</label>
                    <select 
                      value={saveStatus}
                      onChange={e => setSaveStatus(e.target.value as 'draft' | 'final')}
                      className="w-full p-2.5 bg-surface-container-low rounded-lg border border-outline-variant/10 text-xs font-bold text-on-surface outline-none"
                    >
                      <option value="draft">Rascunho (Editável)</option>
                      <option value="final">Versão Emitida Final (Snapshot)</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isTemplate} 
                        onChange={e => setIsTemplate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ms-3 text-xs font-bold text-on-surface">Salvar como Modelo de Protocolo</span>
                    </label>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-6 bg-surface-container-low border-t border-outline-variant/10 flex justify-between items-center">
          <button 
            type="button" 
            disabled={step === 1}
            onClick={() => setStep(prev => prev - 1)}
            className="px-6 py-3 bg-white rounded-xl border border-outline-variant/20 font-bold text-xs hover:bg-surface-container-low disabled:opacity-40 flex items-center gap-2 transition-all"
          >
            <ChevronLeft size={16} /> Voltar
          </button>

          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-outline-variant/20 rounded-xl font-bold text-xs text-outline hover:bg-white transition-all"
            >
              Cancelar
            </button>
            {step < 6 ? (
              <button 
                type="button" 
                onClick={() => setStep(prev => prev + 1)}
                className="px-6 py-3 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-container flex items-center gap-2 transition-all shadow-md"
              >
                Avançar <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleFinalSave}
                className="px-6 py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-md"
              >
                <Check size={16} /> Salvar Orientação
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Detalhe do alimento em Modal Flutuante */}
      {viewingFood && (
        <FoodDetailModal 
          food={viewingFood}
          onClose={() => setViewingFood(null)}
        />
      )}
    </div>
  );
}
