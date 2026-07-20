'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  User,
  ChevronRight,
  X,
  Check,
  ChevronLeft,
  FileText,
  Activity,
  Moon,
  Coffee,
  Droplets,
  Wind,
  Heart,
  Thermometer,
  Eye,
  Clock,
  Trash2,
  Pencil,
  AlertCircle,
  Zap,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { EvaluationTemplate, DEFAULT_SYSTEM_TEMPLATES } from '@/types/evaluationTemplate';
import { getEvaluationTemplates } from '@/lib/evaluationTemplateService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  Evaluation,
  EvaluationType,
  MTCEvaluation,
  RadiesthesiaEvaluation,
  DiagnosticoOuroEvaluation
} from '@/types/evaluations';

interface Patient {
  id: string;
  name: string;
}

const MTC_DEFAULT_FORM_DATA: Partial<MTCEvaluation> = {
  templateType: 'MTC',
  date: new Date().toISOString().split('T')[0],
  evaluator: 'Dr. Elena Wu',
  origin: 'Espontânea',
  firstTimeTCM: false,
  mainComplaint: '',
  complaintStart: '',
  secondaryComplaints: '',
  improvementFactors: '',
  worseningFactors: '',
  aggravatingRelieving: '',
  previousDiseases: '',
  familyHistory: '',
  medications: '',
  allergies: '',
  surgeries: '',
  syndromeHypothesis: '',
  initialTreatment: '',
  seasonsWorsening: '',
  timeWorsening: '',
  habits: { smoker: false, sedentary: false },
  physical: {
    pa: '', fc: '', glucose: '', height: '', weight: '', imc: '',
    painType: [], painIntensity: 0, painFrequency: '', painMigration: false,
    painPeakTime: '', painAggravatingRelieving: '', involuntaryMovements: '', skin: []
  },
  sleep: { difficulty: false, hours: '', wakeUpTime: '', nightWaking: '', dreams: false, restorative: true },
  appetite: { level: 'Normal', preference: '', taste: '', stomachWeight: false, fullness: false },
  thirst: { frequency: false, time: '', preference: '', quantity: '' },
  evacuation: { frequency: '', bristol: '', gases: false },
  urine: { color: 'Normal', frequency: '', pain: false },
  reproductive: {
    menarche: '', cycleDuration: '', flowDuration: '', bloodColor: '', cramps: false,
    pms: '', contraceptives: '', pregnancies: '', abortions: '',
    libido: 'Normal', erection: 'Normal', ejaculation: 'Normal', ejaculationFrequency: ''
  },
  emotions: { predominant: [], stress: '', anxiety: false, currentStatus: '' },
  thermoregulation: { feeling: 'Normal', spontaneousSweat: false, nightSweat: false, odor: false },
  tonguePulse: { color: 'Normal', coating: 'Branca', humidity: 'Normal', shape: 'Normal', pulse: '' }
};

const RADIESTESIA_DEFAULT_FORM_DATA: Partial<RadiesthesiaEvaluation> = {
  templateType: 'RADIESTESIA',
  date: new Date().toISOString().split('T')[0],
  evaluator: 'Especialista em Radiestesia',
  mainComplaint: '',
  energeticFields: {
    mental: { imbalance: 0, affectedChakras: '' },
    emotional: { imbalance: 0, affectedChakras: '' },
    spiritual: { imbalance: 0, affectedChakras: '' },
    physical: { imbalance: 0, affectedChakras: '' },
  },
  chakras: [
    { name: 'Coronário', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalSystem: '' },
    { name: 'Frontal', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalSystem: '' },
    { name: 'Laríngeo', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalSystem: '' },
    { name: 'Cardíaco', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalSystem: '' },
    { name: 'Plexo Solar', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalSystem: '' },
    { name: 'Sacro', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalSystem: '' },
    { name: 'Básico', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalSystem: '' },
  ],
  systems: [
    { name: 'Cardíaco', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
    { name: 'Vascular', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
    { name: 'Linfático', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
    { name: 'Nervoso', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
    { name: 'Digestório', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
    { name: 'Respiratório', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
    { name: 'Ósseo', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
    { name: 'Muscular', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
    { name: 'Endócrino', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
    { name: 'Exócrino', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
    { name: 'Epitelial', imbalance: false, percentage: 0, state: 'NORMAL', affectsPhysicalBody: '' },
  ],
  meridians: [
    { name: 'Rim', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Bexiga', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Fígado', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Vesícula Biliar', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Coração', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Intestino Delgado', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Pericárdio', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Triplo Aquecedor', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Baço', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Estômago', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Pulmão', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Intestino Grosso', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Vaso Concepção', imbalance: false, state: 'NORMAL', comment: '' },
    { name: 'Vaso Governador', imbalance: false, state: 'NORMAL', comment: '' },
  ],
  treatments: [],
  healthEnergy: { value: 6500, category: 'Saudável', comment: '' },
  finalObservations: '',
};

const DIAGNOSTICO_OURO_DEFAULT_FORM_DATA: Partial<DiagnosticoOuroEvaluation> = {
  templateType: 'DIAGNOSTICO_OURO',
  date: new Date().toISOString().split('T')[0],
  evaluator: 'Especialista MTC',
  mainComplaint: '',
  mainComplaintStart: '',
  mainComplaintLocation: '',
  mainComplaintAssociatedFacts: '',
  mainComplaintCharacteristics: '',
  mainComplaintIntensity: 0,
  mainComplaintFrequency: '',
  mainComplaintAccompanyingSymptoms: '',
  mainComplaintWorseningBetter: '',
  pain: {
    start: '',
    location: '',
    associatedFacts: '',
    characteristics: '',
    intensity: 0,
    frequency: '',
    accompanyingSymptoms: '',
    worseningBetter: ''
  },
  observationsP1: '',
  treatmentsDone: '',
  habitsAndAddictions: '',
  foodIntolerance: '',
  surgeriesChronological: '',
  tastePreference: '',
  pathologicalHistory: '',
  familyHistory: '',
  frioCalor: {
    tempPreference: 'Normal',
    seasonPreference: '',
    drinkTempPreference: '',
    frioAnalysis: [],
    calorAnalysis: [],
    observations: ''
  },
  suor: {
    normal: true,
    anidrose: [],
    hiperidrose: [],
    bodyRegions: [],
    observations: ''
  },
  sede: {
    normal: true,
    absence: false,
    noPolydipsia: [],
    withPolydipsia: [],
    observations: ''
  },
  fome: {
    normal: true,
    anorexia: [],
    hyperphagia: [],
    noHyperphagia: false,
    observations: ''
  },
  miccao: {
    normal: true,
    frequency: '',
    polaciuria: [],
    disuria: [],
    color: [],
    volumePoliuria: [],
    volumeOliguria: [],
    accompanyingSensations: [],
    observations: ''
  },
  evacuacao: {
    normal: true,
    color: 'Amarelo Escuro',
    volume: '',
    smell: '',
    buoyancy: 'Flutuar ou Semiflutuar',
    accompanyingSensations: '',
    shapeTexture: [],
    frequency: '1 vez/dia',
    constipation: []
  },
  diarreia: {
    acute: [],
    chronic: [],
    observations: ''
  },
  emocao: {
    predominant: '',
    intensePeriod: '',
    observations: ''
  },
  insonia: {
    normal: true,
    types: []
  },
  sonolencia: {
    types: [],
    observations: ''
  },
  menstruacao: {
    cycleDuration: '',
    flowDuration: '',
    symptoms: [],
    pregnanciesAbortions: '',
    sexualFrequency: '',
    libido: '',
    menarcheAge: '',
    menopause: ''
  },
  ginecologiaDetalhada: {
    regularity: {
      normal: true,
      advancedCycle: [],
      delayedCycle: [],
      irregularCycle: []
    },
    volume: {
      normal: true,
      hypoligomenorrhea: [],
      hypermenorrhea: []
    },
    dismenorreia: {
      deficiency: [],
      excess: []
    },
    amenorreia: {
      deficiency: [],
      excess: []
    }
  },
  homem: {
    fertility: '',
    sexualFrequency: '',
    libido: '',
    observations: ''
  },
  shenInspecao: {
    facialColor: '',
    physicalConstitution: '',
    lips: '',
    eyes: '',
    skin: '',
    hair: '',
    nails: '',
    gums: '',
    teeth: '',
    throat: '',
    limbs: '',
    thorax: '',
    observations: ''
  },
  pulso: {
    rightPulse: '',
    leftPulse: '',
    pulseType: '',
    depth: 'Intermediário',
    speed: 'Intermediário',
    bpm: '',
    observations: ''
  },
  lingua: {
    vitality: '',
    color: '',
    shape: '',
    movement: '',
    coatingTexture: '',
    coatingColor: '',
    coatingLocation: '',
    observations: ''
  },
  diagnosticoFinal: {
    syndromes: '',
    treatments: '',
    techniques: '',
    points: '',
    observations: ''
  }
};

const MTC_STEPS = [
  { id: 'history', label: 'Histórico', icon: FileText },
  { id: 'physical', label: 'Exame Físico', icon: Activity },
  { id: 'habits', label: 'Hábitos', icon: Moon },
  { id: 'functions', label: 'Funções', icon: Droplets },
  { id: 'emotions', label: 'Emoções/Língua', icon: Heart },
  { id: 'conclusion', label: 'Conclusão', icon: Check },
];

const RADIESTESIA_STEPS = [
  { id: 'fields', label: 'Campos', icon: Activity },
  { id: 'chakras', label: 'Chakras', icon: Heart },
  { id: 'systems', label: 'Sistemas', icon: ClipboardList },
  { id: 'meridians', label: 'Meridianos', icon: Zap },
  { id: 'treatments', label: 'Tratamento', icon: Check },
  { id: 'conclusion', label: 'Observações', icon: FileText },
];

const DIAGNOSTICO_OURO_STEPS = [
  { id: 'p1', label: 'Pág 1: Queixa & Dor', icon: FileText },
  { id: 'p2', label: 'Pág 2: Frio/Calor, Suor, Sede, Fome', icon: Thermometer },
  { id: 'p3', label: 'Pág 3: Micção & Evacuação', icon: Droplets },
  { id: 'p4', label: 'Pág 4: Diarreias, Emoção, Sono', icon: Moon },
  { id: 'p5', label: 'Pág 5: Ginecologia, Homem & Shen', icon: Eye },
  { id: 'p6', label: 'Pág 6: Pulso, Língua & Síndromes', icon: Activity },
];

import { User as UserType } from '@/types/auth';

export default function EvaluationsView({
  preSelectedPatientId,
  evaluations,
  patients,
  onSaveEvaluation,
  onDeleteEvaluation,
  user
}: {
  preSelectedPatientId?: string,
  evaluations: Evaluation[],
  patients: Patient[],
  onSaveEvaluation: (data: any) => Promise<void>,
  onDeleteEvaluation: (id: string) => Promise<void>,
  user?: UserType | null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Evaluation>>(DIAGNOSTICO_OURO_DEFAULT_FORM_DATA);
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EvaluationType>('DIAGNOSTICO_OURO');
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeTemplates, setActiveTemplates] = useState<EvaluationTemplate[]>(() => DEFAULT_SYSTEM_TEMPLATES.filter(t => t.isActive));

  useEffect(() => {
    async function loadActiveTemplates() {
      const templates = await getEvaluationTemplates();
      setActiveTemplates(templates.filter(t => t.isActive));
    }
    loadActiveTemplates();
  }, [isModalOpen]);

  const canCreate = user?.permissions.includes('evaluations:create') || user?.role === 'ADMIN';
  const canEdit = user?.permissions.includes('evaluations:edit') || user?.role === 'ADMIN';
  const canDelete = user?.permissions.includes('evaluations:delete') || user?.role === 'ADMIN';
  const canView = user?.permissions.includes('evaluations:view') || user?.role === 'ADMIN';

  const getSteps = (template: EvaluationType) => {
    if (template === 'RADIESTESIA') return RADIESTESIA_STEPS;
    if (template === 'DIAGNOSTICO_OURO') return DIAGNOSTICO_OURO_STEPS;
    return MTC_STEPS;
  };

  const getTemplateLabel = (template: EvaluationType) => {
    if (template === 'RADIESTESIA') return 'Radiestesia';
    if (template === 'DIAGNOSTICO_OURO') return 'Diagnóstico de Ouro MTC';
    return 'Medicina Tradicional Chinesa';
  };

  const toggleArrayItem = (path: string[], item: string) => {
    if (isViewMode) return;
    setFormData(prev => {
      const newFormData = JSON.parse(JSON.stringify(prev));
      let current = newFormData;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      const lastKey = path[path.length - 1];
      const arr: string[] = Array.isArray(current[lastKey]) ? current[lastKey] : [];
      if (arr.includes(item)) {
        current[lastKey] = arr.filter((x: string) => x !== item);
      } else {
        current[lastKey] = [...arr, item];
      }
      return newFormData;
    });
  };

  const updateNestedField = (path: string[], value: any) => {
    if (isViewMode) return;
    setFormData(prev => {
      const newFormData = JSON.parse(JSON.stringify(prev));
      let current = newFormData;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newFormData;
    });
  };

  const handleExportEvaluation = (evaluation: Evaluation) => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const templateType = (evaluation as any).templateType || 'MTC';

      if (templateType === 'DIAGNOSTICO_OURO') {
        const ouro = evaluation as DiagnosticoOuroEvaluation;
        
        // Header Página 1
        doc.setFontSize(18);
        doc.setTextColor(180, 130, 20); // Gold / Amber theme
        doc.text('SÉ - DIAGNÓSTICO DE OURO DA MEDICINA CHINESA', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(80);
        doc.text(`Paciente: ${ouro.patientName || 'N/A'} | Data: ${new Date(ouro.date).toLocaleDateString('pt-BR')} | Avaliador: ${ouro.evaluator}`, pageWidth / 2, 24, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Página 1: Queixa Principal, Dor & Antecedentes', 14, 32);

        autoTable(doc, {
          startY: 36,
          head: [['Campo / Seção', 'Informações Registradas']],
          body: [
            ['Queixa Principal', ouro.mainComplaint || '-'],
            ['Início / Localização', `Início: ${ouro.mainComplaintStart || '-'} | Local: ${ouro.mainComplaintLocation || '-'}`],
            ['Fatos Associados / Característ.', `Fatos: ${ouro.mainComplaintAssociatedFacts || '-'} | Característ.: ${ouro.mainComplaintCharacteristics || '-'}`],
            ['Intensidade / Frequência', `Intensidade: ${ouro.mainComplaintIntensity}/10 | Frequência: ${ouro.mainComplaintFrequency || '-'}`],
            ['Sintomas Acompanhantes', ouro.mainComplaintAccompanyingSymptoms || '-'],
            ['Melhora e Piora', ouro.mainComplaintWorseningBetter || '-'],
            ['DOR - Início / Localização', `Início: ${ouro.pain?.start || '-'} | Local: ${ouro.pain?.location || '-'}`],
            ['DOR - Característ. (Pressão)', `Suporta pressão: ${ouro.pain?.characteristics || '-'}`],
            ['DOR - Intensidade / Frequência', `Intensidade: ${ouro.pain?.intensity}/10 | Freq: ${ouro.pain?.frequency || '-'}`],
            ['DOR - Sintomas & Melhora/Piora', `Sintomas: ${ouro.pain?.accompanyingSymptoms || '-'} | Melhora/Piora: ${ouro.pain?.worseningBetter || '-'}`],
            ['Observações Página 1', ouro.observationsP1 || '-'],
            ['Tratamentos Realizados', ouro.treatmentsDone || '-'],
            ['Hábitos e Vícios', ouro.habitsAndAddictions || '-'],
            ['Intolerância Alimentar', ouro.foodIntolerance || '-'],
            ['Cirurgias (Cronológico)', ouro.surgeriesChronological || '-'],
            ['Desejo/Aversão Sabores', ouro.tastePreference || '-'],
            ['Antecedentes Patológicos', ouro.pathologicalHistory || '-'],
            ['Antecedentes Familiares', ouro.familyHistory || '-'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [180, 130, 20] },
          styles: { fontSize: 8 }
        });

        // Página 2: Frio/Calor, Suor, Sede, Fome
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(180, 130, 20);
        doc.text('Página 2: Frio/Calor, Suor, Sede e Fome', pageWidth / 2, 20, { align: 'center' });

        autoTable(doc, {
          startY: 27,
          head: [['Seção', 'Achados Clínicos MTC']],
          body: [
            ['Frio / Calor - Sensação', `Sensação: ${ouro.frioCalor?.tempPreference || '-'} | Estação: ${ouro.frioCalor?.seasonPreference || '-'} | Bebidas: ${ouro.frioCalor?.drinkTempPreference || '-'}`],
            ['Análise do Frio', (ouro.frioCalor?.frioAnalysis || []).join('; ') || 'Nenhum'],
            ['Análise do Calor', (ouro.frioCalor?.calorAnalysis || []).join('; ') || 'Nenhum'],
            ['Obs Frio/Calor', ouro.frioCalor?.observations || '-'],
            ['SUOR - Transpiração', ouro.suor?.normal ? 'Transpira normalmente' : 'Alterada'],
            ['Anidrose', (ouro.suor?.anidrose || []).join('; ') || 'Nenhuma'],
            ['Hiperidrose', (ouro.suor?.hiperidrose || []).join('; ') || 'Nenhuma'],
            ['Regiões do Corpo', (ouro.suor?.bodyRegions || []).join('; ') || 'Nenhuma'],
            ['Obs Suor', ouro.suor?.observations || '-'],
            ['SEDE - Avaliação', ouro.sede?.normal ? 'Sede Normal' : ouro.sede?.absence ? 'Ausência de Sede' : 'Alterada'],
            ['Sede sem Polidipsia', (ouro.sede?.noPolydipsia || []).join('; ') || 'Nenhum'],
            ['Sede com Polidipsia', (ouro.sede?.withPolydipsia || []).join('; ') || 'Nenhum'],
            ['Obs Sede', ouro.sede?.observations || '-'],
            ['FOME - Apetite', ouro.fome?.normal ? 'Apetite Normal' : 'Alterado'],
            ['Anorexia', (ouro.fome?.anorexia || []).join('; ') || 'Nenhum'],
            ['Fome c/ Polifagia', (ouro.fome?.hyperphagia || []).join('; ') || 'Nenhum'],
            ['Fome s/ Polifagia', ouro.fome?.noHyperphagia ? 'Sim (Deficiência Yin Estômago)' : 'Não'],
            ['Obs Fome', ouro.fome?.observations || '-'],
          ],
          theme: 'striped',
          headStyles: { fillColor: [180, 130, 20] },
          styles: { fontSize: 8 }
        });

        // Página 3: Micção e Evacuação
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(180, 130, 20);
        doc.text('Página 3: Micção e Evacuação', pageWidth / 2, 20, { align: 'center' });

        autoTable(doc, {
          startY: 27,
          head: [['Função Orgânica', 'Detalhes MTC']],
          body: [
            ['Micção - Estado', ouro.miccao?.normal ? 'Normal' : 'Alterada'],
            ['Frequência Urinária', ouro.miccao?.frequency || '-'],
            ['Polaciúria', (ouro.miccao?.polaciuria || []).join('; ') || 'Nenhuma'],
            ['Disúria', (ouro.miccao?.disuria || []).join('; ') || 'Nenhuma'],
            ['Cor da Urina', (ouro.miccao?.color || []).join('; ') || '-'],
            ['Poliúria', (ouro.miccao?.volumePoliuria || []).join('; ') || 'Nenhuma'],
            ['Oligúria', (ouro.miccao?.volumeOliguria || []).join('; ') || 'Nenhuma'],
            ['Sensações Acompanhantes', (ouro.miccao?.accompanyingSensations || []).join('; ') || 'Nenhuma'],
            ['Obs Micção', ouro.miccao?.observations || '-'],
            ['EVACUAÇÃO - Estado', ouro.evacuacao?.normal ? 'Normal' : 'Alterada'],
            ['Cor / Volume / Odor', `Cor: ${ouro.evacuacao?.color || '-'} | Vol: ${ouro.evacuacao?.volume || '-'} | Odor: ${ouro.evacuacao?.smell || '-'}`],
            ['Flutuação', ouro.evacuacao?.buoyancy || '-'],
            ['Forma e Textura', (ouro.evacuacao?.shapeTexture || []).join('; ') || 'Normal'],
            ['Frequência Evacuação', ouro.evacuacao?.frequency || '-'],
            ['Constipação', (ouro.evacuacao?.constipation || []).join('; ') || 'Nenhuma'],
            ['Sensações/Sintomas Evacuação', ouro.evacuacao?.accompanyingSensations || '-'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [180, 130, 20] },
          styles: { fontSize: 8 }
        });

        // Página 4: Diarreias, Emoções, Sono e Ginecologia Inicial
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(180, 130, 20);
        doc.text('Página 4: Diarreias, Emoção, Sono & Ginecologia Inicial', pageWidth / 2, 20, { align: 'center' });

        autoTable(doc, {
          startY: 27,
          head: [['Área de Avaliação', 'Dados Clínicos']],
          body: [
            ['Diarreia Aguda', (ouro.diarreia?.acute || []).join('; ') || 'Nenhuma'],
            ['Diarreia Crônica', (ouro.diarreia?.chronic || []).join('; ') || 'Nenhuma'],
            ['Obs Diarreia', ouro.diarreia?.observations || '-'],
            ['Emoção Predominante (Vida)', ouro.emocao?.predominant || '-'],
            ['Emoção Intensa em Época', ouro.emocao?.intensePeriod || '-'],
            ['Obs Emoções', ouro.emocao?.observations || '-'],
            ['INSÔNIA', ouro.insonia?.normal ? 'Sono Normal' : (ouro.insonia?.types || []).join('; ') || 'Nenhuma'],
            ['SONOLÊNCIA', (ouro.sonolencia?.types || []).join('; ') || 'Nenhuma'],
            ['Obs Sonolência', ouro.sonolencia?.observations || '-'],
            ['GINECOLOGIA - Duração Ciclo/Fluxo', `Ciclo: ${ouro.menstruacao?.cycleDuration || '-'} | Fluxo: ${ouro.menstruacao?.flowDuration || '-'}`],
            ['Sintomas Menstruais', (ouro.menstruacao?.symptoms || []).join('; ') || 'Nenhum'],
            ['Gestações / Abortos', ouro.menstruacao?.pregnanciesAbortions || '-'],
            ['Frequência Sexual / Libido', `Freq: ${ouro.menstruacao?.sexualFrequency || '-'} | Libido: ${ouro.menstruacao?.libido || '-'}`],
            ['Menarca / Menopausa', `Menarca: ${ouro.menstruacao?.menarcheAge || '-'} anos | Menopausa: ${ouro.menstruacao?.menopause || '-'}`],
          ],
          theme: 'striped',
          headStyles: { fillColor: [180, 130, 20] },
          styles: { fontSize: 8 }
        });

        // Página 5: Regularidade, Volume, Dismenorreia, Homem & Shen
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(180, 130, 20);
        doc.text('Página 5: Ginecologia Detalhada, Saúde Masculina & Shen', pageWidth / 2, 20, { align: 'center' });

        autoTable(doc, {
          startY: 27,
          head: [['Seção', 'Registro Clínico']],
          body: [
            ['Regularidade Menstrual', ouro.ginecologiaDetalhada?.regularity?.normal ? 'Normal' : 'Alterada'],
            ['Ciclo Adiantado / Atrasado / Irregular', `Adiantado: ${(ouro.ginecologiaDetalhada?.regularity?.advancedCycle || []).join(', ') || '-'} | Atrasado: ${(ouro.ginecologiaDetalhada?.regularity?.delayedCycle || []).join(', ') || '-'} | Irregular: ${(ouro.ginecologiaDetalhada?.regularity?.irregularCycle || []).join(', ') || '-'}`],
            ['Volume / Hipoligomenorreia / Hipermenorreia', `Hipo: ${(ouro.ginecologiaDetalhada?.volume?.hypoligomenorrhea || []).join(', ') || '-'} | Hiper: ${(ouro.ginecologiaDetalhada?.volume?.hypermenorrhea || []).join(', ') || '-'}`],
            ['Dismenorreia (Cólica)', `Deficiência: ${(ouro.ginecologiaDetalhada?.dismenorreia?.deficiency || []).join(', ') || '-'} | Excesso: ${(ouro.ginecologiaDetalhada?.dismenorreia?.excess || []).join(', ') || '-'}`],
            ['Amenorreia', `Deficiência: ${(ouro.ginecologiaDetalhada?.amenorreia?.deficiency || []).join(', ') || '-'} | Excesso: ${(ouro.ginecologiaDetalhada?.amenorreia?.excess || []).join(', ') || '-'}`],
            ['SAÚDE MASCULINA', `Fertilidade: ${ouro.homem?.fertility || '-'} | Freq Sexual: ${ouro.homem?.sexualFrequency || '-'} | Libido: ${ouro.homem?.libido || '-'}`],
            ['Obs Homem', ouro.homem?.observations || '-'],
            ['SHEN - Inspeção Geral', `Coloração Facial: ${ouro.shenInspecao?.facialColor || '-'} | Constituição: ${ouro.shenInspecao?.physicalConstitution || '-'}`],
            ['SHEN - Inspeção Regional', `Lábios: ${ouro.shenInspecao?.lips || '-'}, Olhos: ${ouro.shenInspecao?.eyes || '-'}, Pele: ${ouro.shenInspecao?.skin || '-'}, Cabelo: ${ouro.shenInspecao?.hair || '-'}, Unhas: ${ouro.shenInspecao?.nails || '-'}, Gengiva: ${ouro.shenInspecao?.gums || '-'}, Dentes: ${ouro.shenInspecao?.teeth || '-'}, Garganta: ${ouro.shenInspecao?.throat || '-'}, Membros: ${ouro.shenInspecao?.limbs || '-'}, Tórax: ${ouro.shenInspecao?.thorax || '-'}`],
            ['Obs Shen/Inspeção', ouro.shenInspecao?.observations || '-'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [180, 130, 20] },
          styles: { fontSize: 8 }
        });

        // Página 6: Pulso, Língua, Síndromes e Tratamento
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(180, 130, 20);
        doc.text('Página 6: Pulso, Língua, Síndromes & Tratamento', pageWidth / 2, 20, { align: 'center' });

        autoTable(doc, {
          startY: 27,
          head: [['Parâmetro MTC', 'Diagnóstico & Conduta']],
          body: [
            ['Pulso Direito', ouro.pulso?.rightPulse || '-'],
            ['Pulso Esquerdo', ouro.pulso?.leftPulse || '-'],
            ['Tipo de Pulso', ouro.pulso?.pulseType || '-'],
            ['Profundidade / Velocidade / BPM', `Profundidade: ${ouro.pulso?.depth || '-'} | Velocidade: ${ouro.pulso?.speed || '-'} | BPM: ${ouro.pulso?.bpm || '-'}`],
            ['Obs Pulso', ouro.pulso?.observations || '-'],
            ['LÍNGUA - Corpo (Vitalidade, Cor, Forma, Mov)', `Vitalidade: ${ouro.lingua?.vitality || '-'} | Cor: ${ouro.lingua?.color || '-'} | Forma: ${ouro.lingua?.shape || '-'} | Mov: ${ouro.lingua?.movement || '-'}`],
            ['LÍNGUA - Saburra (Textura, Cor, Localização)', `Textura: ${ouro.lingua?.coatingTexture || '-'} | Cor: ${ouro.lingua?.coatingColor || '-'} | Local: ${ouro.lingua?.coatingLocation || '-'}`],
            ['Obs Língua', ouro.lingua?.observations || '-'],
            ['SÍNDROME(S) MTC IDENTIFICADAS', ouro.diagnosticoFinal?.syndromes || '-'],
            ['TRATAMENTOS PROPOSTOS', ouro.diagnosticoFinal?.treatments || '-'],
            ['TÉCNICAS UTILIZADAS', ouro.diagnosticoFinal?.techniques || '-'],
            ['PONTOS UTILIZADOS', ouro.diagnosticoFinal?.points || '-'],
            ['OBSERVAÇÕES FINAIS', ouro.diagnosticoFinal?.observations || '-'],
          ],
          theme: 'striped',
          headStyles: { fillColor: [180, 130, 20] },
          styles: { fontSize: 8 }
        });
      } else if (templateType === 'MTC') {
        const mtc = evaluation as MTCEvaluation;
        // Header MTC
        doc.setFontSize(22);
        doc.setTextColor(15, 82, 56);
        doc.text('Avaliação Clínica MTC', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Paciente: ${evaluation.patientName}`, pageWidth / 2, 28, { align: 'center' });
        doc.text(`Código: ${evaluation.code || 'N/A'} | Data: ${new Date(evaluation.date).toLocaleDateString('pt-BR')} | Avaliador: ${evaluation.evaluator}`, pageWidth / 2, 33, { align: 'center' });

        // 1. Histórico e Identificação
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('1. Identificação e Histórico Clínico', 14, 45);

        autoTable(doc, {
          startY: 50,
          body: [
            ['Origem', mtc.origin],
            ['Primeira vez MTC', mtc.firstTimeTCM ? 'Sim' : 'Não'],
            ['Queixa Principal', mtc.mainComplaint],
            ['Início da Queixa', mtc.complaintStart],
            ['Fatores de Melhora', mtc.improvementFactors],
            ['Fatores de Piora', mtc.worseningFactors],
            ['Doenças Prévias', mtc.previousDiseases],
            ['Cirurgias', mtc.surgeries],
            ['Medicamentos', mtc.medications],
            ['Alergias', mtc.allergies],
            ['Fatores Agravantes / Aliviantes', mtc.aggravatingRelieving],
            ['Histórico Familiar', mtc.familyHistory],
          ],
          theme: 'striped',
          headStyles: { fillColor: [15, 82, 56] },
        });

        // 2. Exame Físico
        let currentY = (doc as any).lastAutoTable.finalY + 15;
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(16);
        doc.text('2. Exame Físico e Dor', 14, currentY);

        autoTable(doc, {
          startY: currentY + 5,
          body: [
            ['Sinais Vitais', `PA: ${mtc.physical?.pa} | FC: ${mtc.physical?.fc} | Glicose: ${mtc.physical?.glucose}`],
            ['Antropometria', `Altura: ${mtc.physical?.height}m | Peso: ${mtc.physical?.weight}kg | IMC: ${mtc.physical?.imc}`],
            ['Intensidade da Dor (EVA)', `${mtc.physical?.painIntensity}/10`],
            ['Tipo de Dor', (mtc.physical?.painType || []).join(', ')],
            ['Frequência', mtc.physical?.painFrequency],
            ['Pico de Dor', mtc.physical?.painPeakTime],
            ['Migração', mtc.physical?.painMigration ? 'Sim' : 'Não'],
            ['Agravantes/Aliviantes', mtc.physical?.painAggravatingRelieving],
            ['Mov. Involuntários', mtc.physical?.involuntaryMovements],
            ['Pele e Observações', (mtc.physical?.skin || []).join(', ')],
          ],
          theme: 'striped',
        });

        // 3. Funções Orgânicas
        currentY = (doc as any).lastAutoTable.finalY + 15;
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(16);
        doc.text('3. Funções Orgânicas (Sono, Apetite, Excreção)', 14, currentY);

        autoTable(doc, {
          startY: currentY + 5,
          body: [
            ['Sono', `${mtc.sleep?.hours}h | Dificuldade: ${mtc.sleep?.difficulty ? 'Sim' : 'Não'} | Repousante: ${mtc.sleep?.restorative ? 'Sim' : 'Não'}`],
            ['Apetite', `Nível: ${mtc.appetite?.level} | Preferência: ${mtc.appetite?.preference || 'N/A'} | Sabor: ${mtc.appetite?.taste}`],
            ['Sede', `Frequência: ${mtc.thirst?.frequency ? 'Sim' : 'Não'} | Preferência: ${mtc.thirst?.preference || 'N/A'} | Quantidade: ${mtc.thirst?.quantity}`],
            ['Evacuação', `Frequência: ${mtc.evacuation?.frequency} | Bristol: ${mtc.evacuation?.bristol}`],
            ['Urina', `Cor: ${mtc.urine?.color} | Frequência: ${mtc.urine?.frequency}`],
          ],
          theme: 'striped',
        });

        // 4. Emoções e MTC
        currentY = (doc as any).lastAutoTable.finalY + 15;
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(16);
        doc.text('4. Emoções, Língua e Pulso', 14, currentY);

        autoTable(doc, {
          startY: currentY + 5,
          body: [
            ['Emoções Predominantes', (mtc.emotions?.predominant || []).join(', ')],
            ['Status Atual', mtc.emotions?.currentStatus],
            ['Termorregulação', `Sensação: ${mtc.thermoregulation?.feeling} | Suor Noturno: ${mtc.thermoregulation?.nightSweat ? 'Sim' : 'Não'}`],
            ['Língua', `Cor: ${mtc.tonguePulse?.color} | Saburra: ${mtc.tonguePulse?.coating} | Forma: ${mtc.tonguePulse?.shape}`],
            ['Pulso', mtc.tonguePulse?.pulse],
          ],
          theme: 'striped',
        });

        // 5. Conclusão
        currentY = (doc as any).lastAutoTable.finalY + 15;
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(16);
        doc.text('5. Conclusão e Tratamento', 14, currentY);

        autoTable(doc, {
          startY: currentY + 5,
          body: [
            ['Hipótese Diagnóstica (Síndrome)', mtc.syndromeHypothesis],
            ['Planejamento Terapêutico Inicial', mtc.initialTreatment],
            ['Piora Sazonal', mtc.seasonsWorsening],
            ['Piora Horária', mtc.timeWorsening],
          ],
          theme: 'striped',
          headStyles: { fillColor: [15, 82, 56] },
        });
      } else {
        const rad = evaluation as RadiesthesiaEvaluation;
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229);
        doc.text('Avaliação Radiestésica', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Paciente: ${evaluation.patientName}`, pageWidth / 2, 28, { align: 'center' });
        doc.text(`Código: ${evaluation.code || 'N/A'} | Data: ${new Date(evaluation.date).toLocaleDateString('pt-BR')} | Avaliador: ${evaluation.evaluator}`, pageWidth / 2, 33, { align: 'center' });

        // 1. Campos Energéticos
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('1. Aferição de Campos Energéticos', 14, 45);

        autoTable(doc, {
          startY: 50,
          head: [['Campo', 'Desequilíbrio (%)', 'Chakras Afetados']],
          body: [
            ['Mental', `${rad.energeticFields?.mental?.imbalance}%`, rad.energeticFields?.mental?.affectedChakras],
            ['Emocional', `${rad.energeticFields?.emotional?.imbalance}%`, rad.energeticFields?.emotional?.affectedChakras],
            ['Espiritual', `${rad.energeticFields?.spiritual?.imbalance}%`, rad.energeticFields?.spiritual?.affectedChakras],
            ['Físico', `${rad.energeticFields?.physical?.imbalance}%`, rad.energeticFields?.physical?.affectedChakras],
          ],
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
        });

        // 2. Análise de Chakras
        let currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(16);
        doc.text('2. Análise de Chakras', 14, currentY);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Chakra', 'Deseq.', '%', 'Estado', 'Afeta Sistema']],
          body: (rad.chakras || []).map(c => [
            c.name,
            c.imbalance ? 'Sim' : 'Não',
            `${c.percentage}%`,
            c.state,
            c.affectsPhysicalSystem
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] },
        });

        // 3. Análise dos Sistemas
        doc.addPage();
        doc.setFontSize(16);
        doc.text('3. Aferição dos Sistemas do Corpo Físico', 14, 20);

        autoTable(doc, {
          startY: 25,
          head: [['Sistema', 'Deseq.', '%', 'Estado', 'Obs. Físico']],
          body: (rad.systems || []).map(s => [
            s.name,
            s.imbalance ? 'Sim' : 'Não',
            `${s.percentage}%`,
            s.state,
            s.affectsPhysicalBody
          ]),
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229] },
          styles: { fontSize: 8 },
        });

        // 4. Análise de Meridianos
        currentY = (doc as any).lastAutoTable.finalY + 15;
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(16);
        doc.text('4. Canais e Meridianos', 14, currentY);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Meridiano', 'Deseq.', 'Estado', 'Comentário']],
          body: (rad.meridians || []).map(m => [
            m.name,
            m.imbalance ? 'Sim' : 'Não',
            m.state,
            m.comment
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] },
        });

        // 5. Energia e Tratamento
        doc.addPage();
        doc.setFontSize(16);
        doc.text('5. Energia Vital e Tratamento', 14, 20);

        autoTable(doc, {
          startY: 25,
          body: [
            ['Energia de Saúde (Bovis)', `${rad.healthEnergy?.value}% - ${rad.healthEnergy?.category}`],
            ['Comentários Bovis', rad.healthEnergy?.comment],
          ],
          theme: 'grid',
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Tratamentos Recomendados:', 14, currentY);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Tratamento', 'Duração', 'Início', 'Fim']],
          body: (rad.treatments || []).map(t => [
            t.treatment,
            `${t.time} ${t.unit}`,
            t.start,
            t.end
          ]),
          theme: 'striped',
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Considerações Finais:', 14, currentY);
        doc.setFontSize(10);
        const splitObs = doc.splitTextToSize(rad.finalObservations || '', 180);
        doc.text(splitObs, 14, currentY + 7);
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - Axis GC - Sistema de Gestão de Clínica`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      doc.save(`avaliacao_${evaluation.patientName.toLowerCase().replace(/\s+/g, '_')}_${evaluation.date}.pdf`);
    } catch (error) {
      console.error('Error generating evaluation PDF:', error);
      alert('Erro ao gerar o PDF da avaliação.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPatientId) {
      alert('Por favor, selecione um paciente.');
      return;
    }

    setIsSaving(true);
    try {
      const patient = patients.find(p => p.id === selectedPatientId);

      const evaluationData = {
        ...formData as Evaluation,
        id: editingId,
        patientId: selectedPatientId,
        patientName: patient?.name || 'Paciente Desconhecido',
      };

      await onSaveEvaluation(evaluationData);
      closeModal();
    } catch (error) {
      console.error('Error in handleSave evaluation:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsViewMode(false);
    setEditingId(null);
    setCurrentStep(0);
    setSelectedPatientId('');
    setFormData(JSON.parse(JSON.stringify(DIAGNOSTICO_OURO_DEFAULT_FORM_DATA)));
    setShowTemplateSelection(false);
  };

  const handleEdit = (evaluation: Evaluation) => {
    if (!canEdit) return;
    setEditingId(evaluation.id);
    setSelectedPatientId(evaluation.patientId);

    const templateType = evaluation.templateType || 'DIAGNOSTICO_OURO';
    let defaultData: any = DIAGNOSTICO_OURO_DEFAULT_FORM_DATA;
    if (templateType === 'RADIESTESIA') {
      defaultData = RADIESTESIA_DEFAULT_FORM_DATA;
    } else if (templateType === 'MTC') {
      defaultData = MTC_DEFAULT_FORM_DATA;
    }

    setFormData(JSON.parse(JSON.stringify({ ...defaultData, ...evaluation })));
    setSelectedTemplate(templateType);
    setIsViewMode(false);
    setIsModalOpen(true);
    setShowTemplateSelection(false);
  };

  const handleView = (evaluation: Evaluation) => {
    if (!canView) return;
    setEditingId(evaluation.id);
    setSelectedPatientId(evaluation.patientId);

    const templateType = evaluation.templateType || 'DIAGNOSTICO_OURO';
    let defaultData: any = DIAGNOSTICO_OURO_DEFAULT_FORM_DATA;
    if (templateType === 'RADIESTESIA') {
      defaultData = RADIESTESIA_DEFAULT_FORM_DATA;
    } else if (templateType === 'MTC') {
      defaultData = MTC_DEFAULT_FORM_DATA;
    }

    setFormData(JSON.parse(JSON.stringify({ ...defaultData, ...evaluation })));
    setSelectedTemplate(templateType);
    setIsViewMode(true);
    setIsModalOpen(true);
    setShowTemplateSelection(false);
  };

  const confirmDelete = (id: string) => {
    setEvaluationToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (evaluationToDelete) {
      await onDeleteEvaluation(evaluationToDelete);
      setIsDeleteModalOpen(false);
      setEvaluationToDelete(null);
    }
  };

  const filteredEvaluations = evaluations.filter(e => {
    const matchesSearch = e.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e as any).syndromeHypothesis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e as any).diagnosticoFinal?.syndromes?.toLowerCase().includes(searchTerm.toLowerCase());

    if (preSelectedPatientId) {
      return e.patientId === preSelectedPatientId && matchesSearch;
    }

    return matchesSearch;
  });

  const activeSteps = getSteps(selectedTemplate);

  return (
    <div className="p-10 space-y-10 relative">
      {/* Header */}
      <section className="flex flex-col md:flex-row gap-8 items-start justify-between">
        <div>
          <h2 className="text-4xl font-bold font-headline text-on-surface">Avaliações Clínicas</h2>
          <p className="text-on-surface-variant text-lg mt-2 font-medium">Prontuários e fichas de avaliação de Medicina Chinesa (Diagnóstico de Ouro).</p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setSelectedTemplate('DIAGNOSTICO_OURO');
              setFormData(JSON.parse(JSON.stringify(DIAGNOSTICO_OURO_DEFAULT_FORM_DATA)));
              setShowTemplateSelection(true);
              setIsModalOpen(true);
            }}
            className="px-8 py-4 rounded-2xl text-sm font-bold bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
          >
            <Plus size={20} /> Nova Avaliação
          </button>
        )}
      </section>

      {/* Search */}
      <section className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-outline" size={20} />
        <input
          type="text"
          placeholder="Buscar por paciente ou hipótese diagnóstica..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-16 pr-6 py-5 bg-white rounded-2xl border border-outline-variant/10 shadow-sm focus:ring-2 focus:ring-primary/10 text-on-surface font-medium"
        />
      </section>

      {/* Evaluations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredEvaluations.map((evaluation) => (
            <motion.div
              key={evaluation.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    evaluation.templateType === 'RADIESTESIA' ? 'bg-indigo-50 text-indigo-600' :
                    evaluation.templateType === 'DIAGNOSTICO_OURO' ? 'bg-amber-50 text-amber-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    {evaluation.templateType === 'RADIESTESIA' ? <Activity size={18} /> : evaluation.templateType === 'DIAGNOSTICO_OURO' ? <Sparkles size={18} /> : <ClipboardList size={18} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">{evaluation.patientName}</h4>
                    <p className="text-xs text-outline">{getTemplateLabel(evaluation.templateType || 'MTC')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <button
                      onClick={() => handleEdit(evaluation)}
                      className="p-2 text-outline hover:text-primary hover:bg-surface-container-low rounded-lg transition-all"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => confirmDelete(evaluation.id)}
                      className="p-2 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-outline" />
                  <span>Data: {new Date(evaluation.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-outline" />
                  <span>Avaliador: {evaluation.evaluator}</span>
                </div>
                {(evaluation as any).syndromeHypothesis && (
                  <div className="pt-2 border-t border-outline-variant/10">
                    <p className="font-bold text-[10px] text-outline uppercase tracking-wider">Síndrome</p>
                    <p className="text-xs text-primary font-medium">{(evaluation as any).syndromeHypothesis}</p>
                  </div>
                )}
                {(evaluation as any).diagnosticoFinal?.syndromes && (
                  <div className="pt-2 border-t border-outline-variant/10">
                    <p className="font-bold text-[10px] text-amber-600 uppercase tracking-wider">Síndromes (Diagnóstico de Ouro)</p>
                    <p className="text-xs text-amber-700 font-medium font-headline">{(evaluation as any).diagnosticoFinal?.syndromes}</p>
                  </div>
                )}
              </div>

              {canView && (
                <button
                  onClick={() => handleView(evaluation)}
                  className="w-full mt-6 py-3 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
                >
                  Ver Detalhes <ChevronRight size={14} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal Principal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
                <div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">
                    {isViewMode ? 'Detalhes da Avaliação' : editingId ? 'Editar Avaliação' : 'Nova Avaliação'}
                  </h3>
                  {!showTemplateSelection && (
                    <p className="text-sm text-on-surface-variant font-medium mt-1">
                      Modelo: <span className="font-bold text-primary">{getTemplateLabel(selectedTemplate)}</span> •
                      Passo {currentStep + 1} de {activeSteps.length}: <span className="font-bold text-on-surface">{activeSteps[currentStep]?.label}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {isViewMode && (
                    <button
                      onClick={() => handleExportEvaluation(formData as Evaluation)}
                      disabled={isGeneratingPDF}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingPDF ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FileText size={16} />
                      )}
                      Exportar PDF
                    </button>
                  )}
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-surface-container-low rounded-full transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Progress Bar & Step Tabs */}
              {!showTemplateSelection && (
                <div className="bg-surface-container-low/20 border-b border-outline-variant/10 px-8 py-3">
                  <div className="flex gap-2 mb-3">
                    {activeSteps.map((step, idx) => (
                      <button
                        key={step.id}
                        onClick={() => setCurrentStep(idx)}
                        className={cn(
                          "flex-1 h-2 rounded-full transition-all duration-300",
                          idx === currentStep ? "bg-primary ring-2 ring-primary/30" : idx < currentStep ? "bg-primary/60" : "bg-outline-variant/20"
                        )}
                        title={step.label}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-xs overflow-x-auto gap-2 py-1 custom-scrollbar">
                    {activeSteps.map((step, idx) => {
                      const Icon = step.icon;
                      return (
                        <button
                          key={step.id}
                          onClick={() => setCurrentStep(idx)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap text-xs font-medium",
                            idx === currentStep ? "bg-primary text-white font-bold shadow-md shadow-primary/20" : "text-outline hover:text-on-surface hover:bg-surface-container-low"
                          )}
                        >
                          <Icon size={14} />
                          <span>{step.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {showTemplateSelection ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-8 h-full">
                    <div className="text-center space-y-2">
                      <h4 className="text-2xl font-bold text-on-surface">Escolha o modelo de avaliação</h4>
                      <p className="text-on-surface-variant text-sm max-w-lg">Selecione o tipo de ficha que deseja preencher para o atendimento do paciente.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
                      {activeTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => {
                            if (template.code === 'RADIESTESIA') {
                              setSelectedTemplate('RADIESTESIA');
                              setFormData(JSON.parse(JSON.stringify(RADIESTESIA_DEFAULT_FORM_DATA)));
                            } else if (template.code === 'DIAGNOSTICO_OURO') {
                              setSelectedTemplate('DIAGNOSTICO_OURO');
                              setFormData(JSON.parse(JSON.stringify(DIAGNOSTICO_OURO_DEFAULT_FORM_DATA)));
                            } else {
                              setSelectedTemplate('MTC');
                              setFormData(JSON.parse(JSON.stringify(MTC_DEFAULT_FORM_DATA)));
                            }
                            setShowTemplateSelection(false);
                          }}
                          className="p-8 rounded-[2rem] border-2 border-outline-variant/10 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-left flex flex-col justify-between gap-6 group shadow-sm hover:shadow-lg"
                        >
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                            template.code === 'DIAGNOSTICO_OURO' ? 'bg-amber-100 text-amber-700' :
                            template.colorTheme === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                            'bg-emerald-50 text-emerald-600'
                          }`}>
                            {template.code === 'DIAGNOSTICO_OURO' ? <Sparkles size={28} /> : template.code === 'RADIESTESIA' ? <Activity size={28} /> : <ClipboardList size={28} />}
                          </div>
                          <div>
                            <h5 className="font-bold text-lg text-on-surface flex items-center gap-2">
                              {template.name}
                              {template.code === 'DIAGNOSTICO_OURO' && <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">6 Págs</span>}
                            </h5>
                            <p className="text-xs text-outline leading-relaxed mt-2">{template.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* FORMULÁRIO DIAGNÓSTICO DE OURO */}
                    {selectedTemplate === 'DIAGNOSTICO_OURO' && (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        {/* PÁGINA 1 */}
                        {currentStep === 0 && (
                          <div className="space-y-8">
                            <div className="bg-amber-50/60 border border-amber-200/50 p-4 rounded-2xl flex items-center gap-3 text-amber-800 text-sm">
                              <Sparkles className="text-amber-600 shrink-0" size={20} />
                              <span className="font-medium">Página 1: Identificação da Queixa Principal, Análise da Dor e Antecedentes do Paciente</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Paciente</label>
                                <select
                                  disabled={isViewMode}
                                  value={selectedPatientId}
                                  onChange={e => setSelectedPatientId(e.target.value)}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                                >
                                  <option value="">Selecione um paciente...</option>
                                  {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Data da Avaliação</label>
                                <input
                                  disabled={isViewMode}
                                  type="date"
                                  value={formData.date}
                                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                                />
                              </div>
                            </div>

                            {/* Seção Queixa Principal */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <FileText size={20} className="text-amber-600" /> Queixa Principal
                              </h4>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Descrição da Queixa Principal</label>
                                <textarea
                                  disabled={isViewMode}
                                  value={(formData as DiagnosticoOuroEvaluation).mainComplaint}
                                  onChange={e => setFormData({ ...formData, mainComplaint: e.target.value })}
                                  className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[90px] disabled:opacity-70 shadow-sm"
                                  placeholder="Detalhamento da queixa principal..."
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Início da Queixa</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).mainComplaintStart}
                                    onChange={e => setFormData({ ...formData, mainComplaintStart: e.target.value })}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                    placeholder="Ex: Há 2 semanas, súbito..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Localização</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).mainComplaintLocation}
                                    onChange={e => setFormData({ ...formData, mainComplaintLocation: e.target.value })}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                    placeholder="Ex: Região lombar, epigástrio..."
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Fatos Associados</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).mainComplaintAssociatedFacts}
                                    onChange={e => setFormData({ ...formData, mainComplaintAssociatedFacts: e.target.value })}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                    placeholder="Eventos, estresse, trauma prévio..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Características</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).mainComplaintCharacteristics}
                                    onChange={e => setFormData({ ...formData, mainComplaintCharacteristics: e.target.value })}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                    placeholder="Ex: Queimação, fisgada, em peso..."
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Intensidade (0 a 10)</label>
                                  <div className="flex gap-1 overflow-x-auto py-1">
                                    {[0,1,2,3,4,5,6,7,8,9,10].map(val => (
                                      <button
                                        key={val}
                                        disabled={isViewMode}
                                        onClick={() => setFormData({ ...formData, mainComplaintIntensity: val })}
                                        className={cn(
                                          "flex-1 min-w-[32px] h-10 rounded-lg text-xs font-bold transition-all",
                                          (formData as DiagnosticoOuroEvaluation).mainComplaintIntensity === val ? "bg-amber-600 text-white shadow" : "bg-white border text-on-surface hover:bg-surface-container"
                                        )}
                                      >
                                        {val}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Frequência</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).mainComplaintFrequency}
                                    onChange={e => setFormData({ ...formData, mainComplaintFrequency: e.target.value })}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                    placeholder="Contínua, episódica, diária..."
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Sintomas Acompanhantes</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).mainComplaintAccompanyingSymptoms}
                                    onChange={e => setFormData({ ...formData, mainComplaintAccompanyingSymptoms: e.target.value })}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                    placeholder="Nauseas, tontura, sudorese..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">O que melhora e o que piora</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).mainComplaintWorseningBetter}
                                    onChange={e => setFormData({ ...formData, mainComplaintWorseningBetter: e.target.value })}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                    placeholder="Calor melhora, repouso piora..."
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Seção Especificação da DOR */}
                            <div className="p-6 rounded-2xl bg-rose-50/40 border border-rose-200/40 space-y-6">
                              <h4 className="text-lg font-bold text-rose-900 flex items-center gap-2">
                                <Activity size={20} className="text-rose-600" /> Detalhamento da DOR
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Início</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).pain?.start}
                                    onChange={e => updateNestedField(['pain', 'start'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Localização da Dor</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).pain?.location}
                                    onChange={e => updateNestedField(['pain', 'location'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Características (Suporta a Pressão? Excesso vs Deficiência)</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).pain?.characteristics}
                                    onChange={e => updateNestedField(['pain', 'characteristics'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                    placeholder="Sim (deficiência) / Não (excesso)..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Intensidade (0 a 10)</label>
                                  <div className="flex gap-1 overflow-x-auto py-1">
                                    {[0,1,2,3,4,5,6,7,8,9,10].map(val => (
                                      <button
                                        key={val}
                                        disabled={isViewMode}
                                        onClick={() => updateNestedField(['pain', 'intensity'], val)}
                                        className={cn(
                                          "flex-1 min-w-[32px] h-10 rounded-lg text-xs font-bold transition-all",
                                          (formData as DiagnosticoOuroEvaluation).pain?.intensity === val ? "bg-rose-600 text-white shadow" : "bg-white border text-on-surface hover:bg-surface-container"
                                        )}
                                      >
                                        {val}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Frequência / Horário</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).pain?.frequency}
                                    onChange={e => updateNestedField(['pain', 'frequency'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">O que melhora e o que piora a dor?</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).pain?.worseningBetter}
                                    onChange={e => updateNestedField(['pain', 'worseningBetter'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Antecedentes e Hábitos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Tratamentos Realizados</label>
                                <textarea
                                  disabled={isViewMode}
                                  value={(formData as DiagnosticoOuroEvaluation).treatmentsDone}
                                  onChange={e => setFormData({ ...formData, treatmentsDone: e.target.value })}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[75px] disabled:opacity-70"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Hábitos e Vícios</label>
                                <textarea
                                  disabled={isViewMode}
                                  value={(formData as DiagnosticoOuroEvaluation).habitsAndAddictions}
                                  onChange={e => setFormData({ ...formData, habitsAndAddictions: e.target.value })}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[75px] disabled:opacity-70"
                                  placeholder="Tabagismo, álcool, sedentarismo..."
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Intolerância Alimentar</label>
                                <input
                                  disabled={isViewMode}
                                  type="text"
                                  value={(formData as DiagnosticoOuroEvaluation).foodIntolerance}
                                  onChange={e => setFormData({ ...formData, foodIntolerance: e.target.value })}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Desejo / Aversão Sabor</label>
                                <input
                                  disabled={isViewMode}
                                  type="text"
                                  value={(formData as DiagnosticoOuroEvaluation).tastePreference}
                                  onChange={e => setFormData({ ...formData, tastePreference: e.target.value })}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                                  placeholder="Doce, azedo, picante, salgado, amargo..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Cirurgias (Cronológicas)</label>
                                <input
                                  disabled={isViewMode}
                                  type="text"
                                  value={(formData as DiagnosticoOuroEvaluation).surgeriesChronological}
                                  onChange={e => setFormData({ ...formData, surgeriesChronological: e.target.value })}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Antecedentes Patológicos (Cronológicos)</label>
                                <textarea
                                  disabled={isViewMode}
                                  value={(formData as DiagnosticoOuroEvaluation).pathologicalHistory}
                                  onChange={e => setFormData({ ...formData, pathologicalHistory: e.target.value })}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[80px] disabled:opacity-70"
                                  placeholder="Enfermidades durante a vida..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Antecedentes Familiares (Pai e Mãe)</label>
                                <textarea
                                  disabled={isViewMode}
                                  value={(formData as DiagnosticoOuroEvaluation).familyHistory}
                                  onChange={e => setFormData({ ...formData, familyHistory: e.target.value })}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[80px] disabled:opacity-70"
                                  placeholder="Doenças conhecidas dos pais..."
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold text-outline uppercase tracking-widest">Observações da Página 1</label>
                              <textarea
                                disabled={isViewMode}
                                value={(formData as DiagnosticoOuroEvaluation).observationsP1}
                                onChange={e => setFormData({ ...formData, observationsP1: e.target.value })}
                                className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[60px] disabled:opacity-70"
                              />
                            </div>
                          </div>
                        )}

                        {/* PÁGINA 2 */}
                        {currentStep === 1 && (
                          <div className="space-y-8">
                            <div className="bg-sky-50/60 border border-sky-200/50 p-4 rounded-2xl flex items-center gap-3 text-sky-800 text-sm">
                              <Thermometer className="text-sky-600 shrink-0" size={20} />
                              <span className="font-medium">Página 2: Análise de Frio / Calor, Suor, Sede e Fome (Interrogatório MTC)</span>
                            </div>

                            {/* FRIO / CALOR */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <Thermometer size={20} className="text-sky-600" /> Frio / Calor
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Sente mais Frio ou Calor?</label>
                                  <select
                                    disabled={isViewMode}
                                    value={(formData as DiagnosticoOuroEvaluation).frioCalor?.tempPreference}
                                    onChange={e => updateNestedField(['frioCalor', 'tempPreference'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                  >
                                    <option value="Normal">Normal</option>
                                    <option value="Frio">Sente mais Frio</option>
                                    <option value="Calor">Sente mais Calor</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Prefere Verão ou Inverno?</label>
                                  <select
                                    disabled={isViewMode}
                                    value={(formData as DiagnosticoOuroEvaluation).frioCalor?.seasonPreference}
                                    onChange={e => updateNestedField(['frioCalor', 'seasonPreference'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                  >
                                    <option value="">Indiferente</option>
                                    <option value="Verão">Prefere Verão</option>
                                    <option value="Inverno">Prefere Inverno</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Bebidas Quentes ou Frias?</label>
                                  <select
                                    disabled={isViewMode}
                                    value={(formData as DiagnosticoOuroEvaluation).frioCalor?.drinkTempPreference}
                                    onChange={e => updateNestedField(['frioCalor', 'drinkTempPreference'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                  >
                                    <option value="">Indiferente</option>
                                    <option value="Quentes">Prefere Bebidas Quentes</option>
                                    <option value="Frias">Prefere Bebidas Frias</option>
                                  </select>
                                </div>
                              </div>

                              {/* Análise do Frio */}
                              <div className="space-y-3 pt-2">
                                <label className="text-xs font-bold text-sky-700 uppercase tracking-widest">ANÁLISE DO FRIO</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {[
                                    'Tipo 1. Shi Han (Por Excesso: frio severo que não passa com facilidade)',
                                    'Tipo 2. Wei Han (Deficiência do Yang Qi / Invasão do frio patógeno)'
                                  ].map(item => (
                                    <label key={item} className="flex items-start gap-3 p-3.5 bg-white rounded-xl border hover:border-sky-400 cursor-pointer transition-all">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).frioCalor?.frioAnalysis || []).includes(item)}
                                        onChange={() => toggleArrayItem(['frioCalor', 'frioAnalysis'], item)}
                                        className="w-5 h-5 mt-0.5 text-sky-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* Análise do Calor */}
                              <div className="space-y-3 pt-2">
                                <label className="text-xs font-bold text-amber-700 uppercase tracking-widest">ANÁLISE DO CALOR</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {[
                                    'Tipo 1. Febre c/ calafrio: Calafrio forte e febre leve',
                                    'Tipo 1. Febre c/ calafrio: Calafrio leve e febre forte',
                                    'Tipo 2. Febre s/ calafrio: Ondulante à noite (Deficiência Yin)',
                                    'Tipo 2. Febre s/ calafrio: Ondulante à tarde (Umidade Calor - Baço)',
                                    'Tipo 2. Febre s/ calafrio: Ondulante entre 15h-17h (Yang Ming)',
                                    'Tipo 2. Febre severa - infecção (Calor Excessivo Interior)',
                                    'Tipo 3. Febrícula (Deficiência Qi)',
                                    'Tipo 4. Calor excessivo sem febre'
                                  ].map(item => (
                                    <label key={item} className="flex items-start gap-3 p-3.5 bg-white rounded-xl border hover:border-amber-400 cursor-pointer transition-all">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).frioCalor?.calorAnalysis || []).includes(item)}
                                        onChange={() => toggleArrayItem(['frioCalor', 'calorAnalysis'], item)}
                                        className="w-5 h-5 mt-0.5 text-amber-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Observações Frio/Calor</label>
                                <input
                                  disabled={isViewMode}
                                  type="text"
                                  value={(formData as DiagnosticoOuroEvaluation).frioCalor?.observations}
                                  onChange={e => updateNestedField(['frioCalor', 'observations'], e.target.value)}
                                  className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70 shadow-sm"
                                />
                              </div>
                            </div>

                            {/* SUOR */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <div className="flex justify-between items-center">
                                <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                  <Droplets size={20} className="text-blue-600" /> SUOR
                                </h4>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    disabled={isViewMode}
                                    type="checkbox"
                                    checked={(formData as DiagnosticoOuroEvaluation).suor?.normal}
                                    onChange={e => updateNestedField(['suor', 'normal'], e.target.checked)}
                                    className="w-5 h-5 text-primary rounded"
                                  />
                                  <span className="text-xs font-bold uppercase tracking-wider text-outline">Transpira Normalmente</span>
                                </label>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Anidrose</label>
                                  {[
                                    'Tipo 1. Deficiência Jin Ye (Lesão dos líquidos corporais)',
                                    'Tipo 2. Por Vento-Frio'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).suor?.anidrose || []).includes(item)}
                                        onChange={() => toggleArrayItem(['suor', 'anidrose'], item)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Hiperidrose</label>
                                  {[
                                    'Tipo 1. Exógena: por fator climático',
                                    'Tipo 2. Endógena: a) Espontânea (Deficiência Qi)',
                                    'Tipo 2. Endógena: b) Noturna (Deficiência Yin)',
                                    'Tipo 2. Endógena: c) Profusa (Excesso Calor / Colapso Yang)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).suor?.hiperidrose || []).includes(item)}
                                        onChange={() => toggleArrayItem(['suor', 'hiperidrose'], item)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Regiões do Corpo</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {[
                                    'Na metade do corpo: (Vento-Fleuma ou Vento-Umidade — AVC)',
                                    'No tórax: (Deficiência Qi Coração e Baço)',
                                    'Na cabeça ou cervical: (Calor Jiao Sup / Umidade-Calor Jiao Médio)',
                                    'Nas palmas das mãos e plantas dos pés: (Deficiência Yin)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).suor?.bodyRegions || []).includes(item)}
                                        onChange={() => toggleArrayItem(['suor', 'bodyRegions'], item)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* SEDE & FOME */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* SEDE */}
                              <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-md font-bold text-on-surface">SEDE</h4>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      disabled={isViewMode}
                                      type="checkbox"
                                      checked={(formData as DiagnosticoOuroEvaluation).sede?.normal}
                                      onChange={e => updateNestedField(['sede', 'normal'], e.target.checked)}
                                      className="w-4 h-4 text-primary rounded"
                                    />
                                    <span className="text-xs font-bold text-outline">Normal</span>
                                  </label>
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-white rounded-xl border">
                                  <input
                                    disabled={isViewMode}
                                    type="checkbox"
                                    checked={(formData as DiagnosticoOuroEvaluation).sede?.absence}
                                    onChange={e => updateNestedField(['sede', 'absence'], e.target.checked)}
                                    className="w-4 h-4 text-primary rounded"
                                  />
                                  <span className="text-xs font-medium">Tipo 1. Ausência de Sede (Frio, Umidade, Def. Qi)</span>
                                </label>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Tipo 2. Sede sem Polidipsia</label>
                                  {[
                                    'a) Boca seca, mas não ingere (Deficiência Yin)',
                                    'b) Sente sede, mas bebe pouco (Calor/Umidade)',
                                    'c) Sente sede e bebe quentes (Acúmulo Fleuma)',
                                    'd) Sente sede, faz bochecho e não engole (Estagnação)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).sede?.noPolydipsia || []).includes(item)}
                                        onChange={() => toggleArrayItem(['sede', 'noPolydipsia'], item)}
                                        className="w-3.5 h-3.5 text-primary rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Tipo 3. Sede com Polidipsia</label>
                                  {[
                                    'a) Sente sede e prefere bebidas frias (Calor excessivo)',
                                    'b) Sente sede + Poliúria e Polifagia (Xiao Ke - Diabetes)',
                                    'c) Sente sede e Polidipsia excessiva (Lesão líquidos)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).sede?.withPolydipsia || []).includes(item)}
                                        onChange={() => toggleArrayItem(['sede', 'withPolydipsia'], item)}
                                        className="w-3.5 h-3.5 text-primary rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* FOME */}
                              <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-md font-bold text-on-surface">FOME</h4>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      disabled={isViewMode}
                                      type="checkbox"
                                      checked={(formData as DiagnosticoOuroEvaluation).fome?.normal}
                                      onChange={e => updateNestedField(['fome', 'normal'], e.target.checked)}
                                      className="w-4 h-4 text-primary rounded"
                                    />
                                    <span className="text-xs font-bold text-outline">Normal</span>
                                  </label>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Tipo 1. Anorexia</label>
                                  {[
                                    'a) Apetite pobre (Deficiência Qi Baço e Estômago)',
                                    'b) Com plenitude abdominal (Umidade Patógena - Baço)',
                                    'c) Com aversão à comida gordurosa (Umidade-Calor Fígado/VB)',
                                    'd) Com repugnância alimentar (Retenção Alimentos)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).fome?.anorexia || []).includes(item)}
                                        onChange={() => toggleArrayItem(['fome', 'anorexia'], item)}
                                        className="w-3.5 h-3.5 text-primary rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Tipo 2. Fome com Polifagia</label>
                                  {[
                                    'a) Hiperatividade Fogo Estômago',
                                    'b) Estômago forte e Baço fraco'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).fome?.hyperphagia || []).includes(item)}
                                        onChange={() => toggleArrayItem(['fome', 'hyperphagia'], item)}
                                        className="w-3.5 h-3.5 text-primary rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-white rounded-xl border">
                                  <input
                                    disabled={isViewMode}
                                    type="checkbox"
                                    checked={(formData as DiagnosticoOuroEvaluation).fome?.noHyperphagia}
                                    onChange={e => updateNestedField(['fome', 'noHyperphagia'], e.target.checked)}
                                    className="w-4 h-4 text-primary rounded"
                                  />
                                  <span className="text-xs font-medium">Tipo 3. Fome sem Polifagia (Deficiência Yin Estômago)</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PÁGINA 3 */}
                        {currentStep === 2 && (
                          <div className="space-y-8">
                            <div className="bg-emerald-50/60 border border-emerald-200/50 p-4 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm">
                              <Droplets className="text-emerald-600 shrink-0" size={20} />
                              <span className="font-medium">Página 3: Análise da Micção, Eliminações Urinárias e Evacuação Intestinal</span>
                            </div>

                            {/* MICÇÃO */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <div className="flex justify-between items-center">
                                <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                  <Droplets size={20} className="text-emerald-600" /> MICÇÃO
                                </h4>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    disabled={isViewMode}
                                    type="checkbox"
                                    checked={(formData as DiagnosticoOuroEvaluation).miccao?.normal}
                                    onChange={e => updateNestedField(['miccao', 'normal'], e.target.checked)}
                                    className="w-5 h-5 text-primary rounded"
                                  />
                                  <span className="text-xs font-bold text-outline uppercase">Micção Normal</span>
                                </label>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Frequência que vai ao banheiro</label>
                                <input
                                  disabled={isViewMode}
                                  type="text"
                                  value={(formData as DiagnosticoOuroEvaluation).miccao?.frequency}
                                  onChange={e => updateNestedField(['miccao', 'frequency'], e.target.value)}
                                  className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  placeholder="Ex: 5 a 6 vezes ao dia..."
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">POLACIÚRIA</label>
                                  {[
                                    'Tipo 1. Urina escassa e escura (Umidade-Calor Jiao Inf)',
                                    'Tipo 2. Urgência para urinar e incontinência (Def. Yang Rim)',
                                    'Tipo 3. Nictúria: Polaciúria noturna (Deficiência Yang Rim)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).miccao?.polaciuria || []).includes(item)}
                                        onChange={() => toggleArrayItem(['miccao', 'polaciuria'], item)}
                                        className="w-4 h-4 text-emerald-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">DISÚRIA</label>
                                  {[
                                    'Tipo 1. Dói quando urina (Acúmulo Umidade-Calor Jiao Inf)',
                                    'Tipo 2. Dificuldade de: a) Segurar/fixar (Deficiência Qi)',
                                    'Tipo 2. Dificuldade de: b) Excretar (Deficiência Yang Rim)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).miccao?.disuria || []).includes(item)}
                                        onChange={() => toggleArrayItem(['miccao', 'disuria'], item)}
                                        className="w-4 h-4 text-emerald-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">COR DA URINA</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {[
                                    'Escura e escassa: (Calor excessivo, Def. Yin/Lesão Líquidos)',
                                    'Clara e abundante: (Frio por Deficiência ou Excesso)',
                                    'Turva: (Umidade Calor Jiao Inferior)',
                                    'Turva e leitosa: (Deficiência Yang Rim)',
                                    'Vermelha por sangramento trato urinário: (Calor/Cálculo)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).miccao?.color || []).includes(item)}
                                        onChange={() => toggleArrayItem(['miccao', 'color'], item)}
                                        className="w-4 h-4 text-emerald-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">SENSAÇÕES QUE ACOMPANHAM A MICÇÃO</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {[
                                    'Tipo 1. Dor e ardor (Acúmulo Umidade-Calor Jiao Inferior)',
                                    'Tipo 2. Dor aguda e intensa (Cálculo Renal)',
                                    'Tipo 3. Dor e gotejo após micção (Deficiência Rim)',
                                    'Tipo 4. Dor com sensação de vazio após micção (Deficiência Rim)',
                                    'Tipo 5. Incontinência urinária (Deficiência Rim)',
                                    'Tipo 6. Enurese noturna (Deficiência Rim)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).miccao?.accompanyingSensations || []).includes(item)}
                                        onChange={() => toggleArrayItem(['miccao', 'accompanyingSensations'], item)}
                                        className="w-4 h-4 text-emerald-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* EVACUAÇÃO */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <div className="flex justify-between items-center">
                                <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                  <Wind size={20} className="text-amber-700" /> EVACUAÇÃO
                                </h4>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    disabled={isViewMode}
                                    type="checkbox"
                                    checked={(formData as DiagnosticoOuroEvaluation).evacuacao?.normal}
                                    onChange={e => updateNestedField(['evacuacao', 'normal'], e.target.checked)}
                                    className="w-5 h-5 text-primary rounded"
                                  />
                                  <span className="text-xs font-bold text-outline uppercase">Evacuação Normal</span>
                                </label>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Cor (Normal: Amarelo Escuro)</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).evacuacao?.color}
                                    onChange={e => updateNestedField(['evacuacao', 'color'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Volume</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).evacuacao?.volume}
                                    onChange={e => updateNestedField(['evacuacao', 'volume'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Cheiro</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).evacuacao?.smell}
                                    onChange={e => updateNestedField(['evacuacao', 'smell'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">FORMA E TEXTURA DAS FEZES</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {[
                                    'Tipo 1. Amolecidas e finas (Deficiência Qi/Yang Baço e Estômago)',
                                    'Tipo 2. Duras no início e moles no final que afundam (Def. Baço + Umidade)',
                                    'Tipo 3. Às vezes moles e às vezes secas (Estagnação Qi Fígado e Def. Baço)',
                                    'Tipo 4. Amolecidas com restos de alimentos (Deficiência Yang Baço e Rim)',
                                    'Tipo 5. Secas e duras (Calor Intestino Grosso)',
                                    'Tipo 6. Secas em forma de bolinhas de cabra (Deficiência Yin ou Sangue)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).evacuacao?.shapeTexture || []).includes(item)}
                                        onChange={() => toggleArrayItem(['evacuacao', 'shapeTexture'], item)}
                                        className="w-4 h-4 text-amber-700 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">CONSTIPAÇÃO (+ de 2 dias sem evacuar)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {[
                                    'Tipo 1. Por Calor: ressecadas + dor à palpação (Calor Excessivo Interior)',
                                    'Tipo 2. Por Frio: dificuldade na evacuação (Deficiência Yang Rim)',
                                    'Tipo 3. Por Estagnação: ressecadas + dor irradiada hipocôndrio (Fígado/VB)',
                                    'Tipo 4. Deficiência Qi: crônicos, idosos, pós-operatório',
                                    'Tipo 5. Deficiência Sangue: ressecadas, às vezes bolinhas de cabra',
                                    'Tipo 6. Deficiência Yin: bolinhas de cabra + rubor malar'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).evacuacao?.constipation || []).includes(item)}
                                        onChange={() => toggleArrayItem(['evacuacao', 'constipation'], item)}
                                        className="w-4 h-4 text-amber-700 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PÁGINA 4 */}
                        {currentStep === 3 && (
                          <div className="space-y-8">
                            <div className="bg-indigo-50/60 border border-indigo-200/50 p-4 rounded-2xl flex items-center gap-3 text-indigo-800 text-sm">
                              <Moon className="text-indigo-600 shrink-0" size={20} />
                              <span className="font-medium">Página 4: Diarreias, Análise Emocional, Insônia, Sonolência e Ginecologia Inicial</span>
                            </div>

                            {/* DIARREIAS */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <Wind size={20} className="text-indigo-600" /> DIARREIAS
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Diarreias Agudas</label>
                                  {[
                                    'a) Por Injúria Alimentar — alívio após evacuar (Lesão Baço/Estômago)',
                                    'b) Frio-Umidade: líquida e restos, alivia c/ pressão, bebidas quentes',
                                    'c) Umidade-Calor no IG: pastosa escura, ardor anal',
                                    'd) Ataque Fígado ao Baço: líquidas e moles + cólica pós aborrecimento'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).diarreia?.acute || []).includes(item)}
                                        onChange={() => toggleArrayItem(['diarreia', 'acute'], item)}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Diarreias Crônicas (+21 dias)</label>
                                  {[
                                    'a) Por Deficiência Yang Baço: secas início, semilíquidas ao final',
                                    'b) Por Deficiência Yang Rim: c/ restos alimentos + cólica matutina'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-3 p-3 bg-white rounded-xl border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).diarreia?.chronic || []).includes(item)}
                                        onChange={() => toggleArrayItem(['diarreia', 'chronic'], item)}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* EMOÇÃO & SONO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* EMOÇÃO */}
                              <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-4">
                                <h4 className="text-md font-bold text-on-surface flex items-center gap-2">
                                  <Heart size={18} className="text-rose-500" /> EMOÇÕES
                                </h4>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Predominante ao longo da vida</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).emocao?.predominant}
                                    onChange={e => updateNestedField(['emocao', 'predominant'], e.target.value)}
                                    className="w-full px-4 py-3 bg-white rounded-xl border border-outline-variant/10 outline-none text-xs font-medium"
                                    placeholder="Raiva, preocupação, tristeza, medo, alegria..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Intensa em alguma época</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).emocao?.intensePeriod}
                                    onChange={e => updateNestedField(['emocao', 'intensePeriod'], e.target.value)}
                                    className="w-full px-4 py-3 bg-white rounded-xl border border-outline-variant/10 outline-none text-xs font-medium"
                                  />
                                </div>
                              </div>

                              {/* INSÔNIA & SONOLÊNCIA */}
                              <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-4">
                                <h4 className="text-md font-bold text-on-surface flex items-center gap-2">
                                  <Moon size={18} className="text-indigo-600" /> INSÔNIA E SONOLÊNCIA
                                </h4>
                                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-lg border">
                                  <input
                                    disabled={isViewMode}
                                    type="checkbox"
                                    checked={(formData as DiagnosticoOuroEvaluation).insonia?.normal}
                                    onChange={e => updateNestedField(['insonia', 'normal'], e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                  />
                                  <span className="text-xs font-medium">Sono Normal (Deita e dorme)</span>
                                </label>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-outline uppercase tracking-wider">Padrões de Insônia</label>
                                  {[
                                    'Tipo 1. Deita e não pega no sono / Insônia Inicial (Coração/Rim)',
                                    'Tipo 2. Dorme e acorda com pensamento exato / Intermitente (Baço/Coração)',
                                    'Tipo 3. Dorme e acorda sobressaltado (Coração/Vesícula Biliar)',
                                    'Tipo 4. Não dorme de jeito nenhum (Estômago/Baço)',
                                    'Tipo 5. Sono agitado com pesadelos excessivos (Fogo Fígado)',
                                    'Tipo 6. Ansiedade extrema, opressão torácica (Fleuma Calor Coração)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-2 p-2 bg-white rounded-lg border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).insonia?.types || []).includes(item)}
                                        onChange={() => toggleArrayItem(['insonia', 'types'], item)}
                                        className="w-3.5 h-3.5 text-indigo-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* MENSTRUAÇÃO INICIAL */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <Heart size={20} className="text-rose-600" /> Ginecologia Inicial & Saúde Sexual
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Duração do Ciclo (Normal 28-35 dias)</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).menstruacao?.cycleDuration}
                                    onChange={e => updateNestedField(['menstruacao', 'cycleDuration'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Duração do Fluxo (Normal 3-5 dias)</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).menstruacao?.flowDuration}
                                    onChange={e => updateNestedField(['menstruacao', 'flowDuration'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Gestações e Abortos</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).menstruacao?.pregnanciesAbortions}
                                    onChange={e => updateNestedField(['menstruacao', 'pregnanciesAbortions'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PÁGINA 5 */}
                        {currentStep === 4 && (
                          <div className="space-y-8">
                            <div className="bg-purple-50/60 border border-purple-200/50 p-4 rounded-2xl flex items-center gap-3 text-purple-800 text-sm">
                              <Eye className="text-purple-600 shrink-0" size={20} />
                              <span className="font-medium">Página 5: Ciclo Menstrual Detalhado, Saúde Masculina, Shen (Espírito) e Inspeções</span>
                            </div>

                            {/* GINECOLOGIA DETALHADA */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <h4 className="text-lg font-bold text-on-surface">Regularidade e Volume Menstrual</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Ciclo Adiantado</label>
                                  {[
                                    'Tipo 1. Sangue escuro, denso, grande vol (Calor Sangue)',
                                    'Tipo 2. Sangue claro, fluido, grande vol (Def. Qi)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).ginecologiaDetalhada?.regularity?.advancedCycle || []).includes(item)}
                                        onChange={() => toggleArrayItem(['ginecologiaDetalhada', 'regularity', 'advancedCycle'], item)}
                                        className="w-4 h-4 text-purple-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Ciclo Atrasado</label>
                                  {[
                                    'Tipo 1. Sangue claro, fluido, escasso (Def. Sangue)',
                                    'Tipo 2. Sangue escuro, coágulos, escasso (Frio Sangue)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).ginecologiaDetalhada?.regularity?.delayedCycle || []).includes(item)}
                                        onChange={() => toggleArrayItem(['ginecologiaDetalhada', 'regularity', 'delayedCycle'], item)}
                                        className="w-4 h-4 text-purple-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Ciclo Irregular</label>
                                  {[
                                    'Tipo 1. Sangue escuro, coágulos (Estagnação Qi Fi)',
                                    'Tipo 2. Sangue claro, vol irregular (Deficiência Rim)'
                                  ].map(item => (
                                    <label key={item} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border cursor-pointer">
                                      <input
                                        disabled={isViewMode}
                                        type="checkbox"
                                        checked={((formData as DiagnosticoOuroEvaluation).ginecologiaDetalhada?.regularity?.irregularCycle || []).includes(item)}
                                        onChange={() => toggleArrayItem(['ginecologiaDetalhada', 'regularity', 'irregularCycle'], item)}
                                        className="w-4 h-4 text-purple-600 rounded"
                                      />
                                      <span className="text-xs font-medium text-on-surface">{item}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* HOMEM */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <User size={20} className="text-blue-600" /> Saúde Masculina
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Fertilidade</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).homem?.fertility}
                                    onChange={e => updateNestedField(['homem', 'fertility'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Frequência Sexual</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).homem?.sexualFrequency}
                                    onChange={e => updateNestedField(['homem', 'sexualFrequency'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Presença de Libido</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).homem?.libido}
                                    onChange={e => updateNestedField(['homem', 'libido'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* SHEN E INSPEÇÃO */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <Eye size={20} className="text-purple-600" /> SHEN (Espírito) e Inspeção Física
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Coloração Facial</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).shenInspecao?.facialColor}
                                    onChange={e => updateNestedField(['shenInspecao', 'facialColor'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                    placeholder="Pálida, avermelhada, amarelada, escura..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Constituição Física</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).shenInspecao?.physicalConstitution}
                                    onChange={e => updateNestedField(['shenInspecao', 'physicalConstitution'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                    placeholder="Forte, fraca, magra, obesa..."
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                  { label: 'Lábios', field: 'lips' },
                                  { label: 'Olhos', field: 'eyes' },
                                  { label: 'Pele', field: 'skin' },
                                  { label: 'Cabelo', field: 'hair' },
                                  { label: 'Unhas', field: 'nails' },
                                  { label: 'Gengiva', field: 'gums' },
                                  { label: 'Dentes', field: 'teeth' },
                                  { label: 'Garganta', field: 'throat' },
                                ].map(item => (
                                  <div key={item.field} className="space-y-1">
                                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest">{item.label}</label>
                                    <input
                                      disabled={isViewMode}
                                      type="text"
                                      value={(formData as any).shenInspecao?.[item.field] || ''}
                                      onChange={e => updateNestedField(['shenInspecao', item.field], e.target.value)}
                                      className="w-full px-4 py-3 bg-white rounded-xl border border-outline-variant/10 outline-none text-xs font-medium shadow-sm"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PÁGINA 6 */}
                        {currentStep === 5 && (
                          <div className="space-y-8">
                            <div className="bg-amber-100/60 border border-amber-300/50 p-4 rounded-2xl flex items-center gap-3 text-amber-900 text-sm">
                              <Activity className="text-amber-700 shrink-0" size={20} />
                              <span className="font-medium">Página 6: Diagnóstico de Pulso, Língua, Síndromes MTC e Planejamento Terapêutico</span>
                            </div>

                            {/* PULSO */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <Activity size={20} className="text-amber-600" /> PULSO DA MEDICINA CHINESA
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Pulso Direito (San Jiao / Rim, Estômago / Baço, IG / Pulmão)</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).pulso?.rightPulse}
                                    onChange={e => updateNestedField(['pulso', 'rightPulse'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Pulso Esquerdo (Bexiga / Rim, VB / Fígado, ID / Coração)</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).pulso?.leftPulse}
                                    onChange={e => updateNestedField(['pulso', 'leftPulse'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Tipo de Pulso</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).pulso?.pulseType}
                                    onChange={e => updateNestedField(['pulso', 'pulseType'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                    placeholder="Forte, fraco, escorregadio, em corda..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Profundidade</label>
                                  <select
                                    disabled={isViewMode}
                                    value={(formData as DiagnosticoOuroEvaluation).pulso?.depth}
                                    onChange={e => updateNestedField(['pulso', 'depth'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                  >
                                    <option value="Superficial">Superficial</option>
                                    <option value="Intermediário">Intermediário</option>
                                    <option value="Profundo">Profundo</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Velocidade (BPM)</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).pulso?.bpm}
                                    onChange={e => updateNestedField(['pulso', 'bpm'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium shadow-sm"
                                    placeholder="Ex: 72 bpm"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* LÍNGUA */}
                            <div className="p-6 rounded-2xl bg-surface-container-low/30 border border-outline-variant/10 space-y-6">
                              <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                <Sparkles size={20} className="text-amber-600" /> DIAGNÓSTICO PELA LÍNGUA
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Vitalidade (Corpo)</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).lingua?.vitality}
                                    onChange={e => updateNestedField(['lingua', 'vitality'], e.target.value)}
                                    className="w-full px-4 py-3 bg-white rounded-xl border border-outline-variant/10 outline-none text-xs font-medium shadow-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Cor da Língua</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).lingua?.color}
                                    onChange={e => updateNestedField(['lingua', 'color'], e.target.value)}
                                    className="w-full px-4 py-3 bg-white rounded-xl border border-outline-variant/10 outline-none text-xs font-medium shadow-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Forma da Língua</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).lingua?.shape}
                                    onChange={e => updateNestedField(['lingua', 'shape'], e.target.value)}
                                    className="w-full px-4 py-3 bg-white rounded-xl border border-outline-variant/10 outline-none text-xs font-medium shadow-sm"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Saburra Textura e Cor</label>
                                  <input
                                    disabled={isViewMode}
                                    type="text"
                                    value={(formData as DiagnosticoOuroEvaluation).lingua?.coatingTexture}
                                    onChange={e => updateNestedField(['lingua', 'coatingTexture'], e.target.value)}
                                    className="w-full px-4 py-3 bg-white rounded-xl border border-outline-variant/10 outline-none text-xs font-medium shadow-sm"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* SÍNDROME E CONDUTA */}
                            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-6">
                              <h4 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                                <Check size={20} className="text-amber-700" /> SÍNDROME(S) MTC E PLANEJAMENTO TERAPÊUTICO
                              </h4>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-amber-900 uppercase tracking-widest">Síndrome(s) Identificada(s)</label>
                                <textarea
                                  disabled={isViewMode}
                                  value={(formData as DiagnosticoOuroEvaluation).diagnosticoFinal?.syndromes}
                                  onChange={e => updateNestedField(['diagnosticoFinal', 'syndromes'], e.target.value)}
                                  className="w-full px-5 py-4 bg-white rounded-2xl border border-amber-200 outline-none font-bold text-amber-900 text-sm min-h-[90px] shadow-sm"
                                  placeholder="Definição das Síndromes Principais..."
                                />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Tratamentos e Técnicas</label>
                                  <textarea
                                    disabled={isViewMode}
                                    value={(formData as DiagnosticoOuroEvaluation).diagnosticoFinal?.techniques}
                                    onChange={e => updateNestedField(['diagnosticoFinal', 'techniques'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[80px] shadow-sm"
                                    placeholder="Acupuntura, Moxabustão, Ventosa, Auriculoterapia..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Pontos Utilizados</label>
                                  <textarea
                                    disabled={isViewMode}
                                    value={(formData as DiagnosticoOuroEvaluation).diagnosticoFinal?.points}
                                    onChange={e => updateNestedField(['diagnosticoFinal', 'points'], e.target.value)}
                                    className="w-full px-5 py-4 bg-white rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[80px] shadow-sm"
                                    placeholder="Ex: IG4, E36, BP6, F3, C7..."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* FORMULÁRIO MTC PADRÃO */}
                    {selectedTemplate === 'MTC' && (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        {currentStep === 0 && (
                          <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Paciente</label>
                                <select
                                  disabled={isViewMode}
                                  value={selectedPatientId}
                                  onChange={e => setSelectedPatientId(e.target.value)}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                                >
                                  <option value="">Selecione um paciente...</option>
                                  {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-outline uppercase tracking-widest">Data da Avaliação</label>
                                <input
                                  disabled={isViewMode}
                                  type="date"
                                  value={formData.date}
                                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold text-outline uppercase tracking-widest">Queixa Principal</label>
                              <textarea
                                disabled={isViewMode}
                                value={(formData as MTCEvaluation).mainComplaint}
                                onChange={e => setFormData({ ...formData, mainComplaint: e.target.value })}
                                className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[100px] disabled:opacity-70"
                              />
                            </div>
                          </div>
                        )}
                        {currentStep > 0 && (
                          <div className="p-8 text-center text-outline">
                            Preenchimento MTC padrão de formulário.
                          </div>
                        )}
                      </div>
                    )}

                    {/* FORMULÁRIO RADIESTESIA */}
                    {selectedTemplate === 'RADIESTESIA' && (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="p-8 text-center text-outline">
                          Preenchimento de avaliação de Radiestesia.
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              {!showTemplateSelection && (
                <div className="p-8 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
                  <button
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-6 py-3 rounded-xl border border-outline-variant/20 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all disabled:opacity-30 flex items-center gap-2"
                  >
                    <ChevronLeft size={18} /> Anterior
                  </button>

                  {currentStep === activeSteps.length - 1 ? (
                    <button
                      onClick={isViewMode ? closeModal : handleSave}
                      disabled={isSaving}
                      className="px-8 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Salvando...
                        </span>
                      ) : (
                        <>
                          {isViewMode ? <X size={18} /> : <Check size={18} />}
                          {isViewMode ? 'Fechar' : 'Finalizar Avaliação'}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentStep(prev => prev + 1)}
                      className="px-8 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                    >
                      Próximo <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Excluir Avaliação?</h3>
              <p className="text-on-surface-variant mb-8">Esta ação não pode ser desfeita. Todos os dados desta avaliação serão removidos permanentemente.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 rounded-xl border border-outline-variant/20 font-bold text-on-surface-variant hover:bg-surface-container-low transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-4 rounded-xl bg-rose-500 text-white font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
