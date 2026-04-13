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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Evaluation {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  evaluator: string;
  // Section 1: Identification & Clinical History
  origin: string;
  firstTimeTCM: boolean;
  mainComplaint: string;
  complaintStart: string;
  improvementFactors: string;
  worseningFactors: string;
  secondaryComplaints: string;
  aggravatingRelieving: string;
  previousDiseases: string;
  surgeries: string;
  medications: string;
  allergies: string;
  habits: {
    smoker: boolean;
    sedentary: boolean;
  };
  familyHistory: string;
  // Section 2: Physical Exam & Pain
  physical: {
    pa: string;
    fc: string;
    glucose: string;
    height: string;
    weight: string;
    imc: string;
    painType: string[];
    painIntensity: number;
    painFrequency: string;
    painMigration: boolean;
    painPeakTime: string;
    painAggravatingRelieving: string;
    involuntaryMovements: string;
    skin: string[];
  };
  // Section 3: Sleep, Appetite, Thirst
  sleep: {
    difficulty: boolean;
    hours: string;
    wakeUpTime: string;
    nightWaking: string;
    dreams: boolean;
    restorative: boolean;
  };
  appetite: {
    level: string;
    preference: string;
    taste: string;
    stomachWeight: boolean;
    fullness: boolean;
  };
  thirst: {
    frequency: boolean;
    time: string;
    preference: string;
    quantity: string;
  };
  // Section 4: Evacuation, Urine, Reproductive
  evacuation: {
    frequency: string;
    bristol: string;
    gases: boolean;
  };
  urine: {
    color: string;
    frequency: string;
    pain: boolean;
  };
  reproductive: {
    menarche: string;
    cycleDuration: string;
    flowDuration: string;
    bloodColor: string;
    cramps: boolean;
    pms: string;
    contraceptives: string;
    pregnancies: string;
    abortions: string;
    libido: string;
    erection: string;
    ejaculation: string;
    ejaculationFrequency: string;
  };
  // Section 5: Emotions, Thermoregulation, Tongue/Pulse
  emotions: {
    predominant: string[];
    stress: string;
    anxiety: boolean;
    currentStatus: string;
  };
  thermoregulation: {
    feeling: string;
    spontaneousSweat: boolean;
    nightSweat: boolean;
    odor: boolean;
  };
  tonguePulse: {
    color: string;
    coating: string;
    humidity: string;
    shape: string;
    pulse: string;
  };
  // Section 6: Final Interpretation
  seasonsWorsening: string;
  timeWorsening: string;
  syndromeHypothesis: string;
  initialTreatment: string;
}

interface Patient {
  id: string;
  name: string;
}

const DEFAULT_FORM_DATA: Partial<Evaluation> = {
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

const STEPS = [
  { id: 'history', label: 'Histórico', icon: FileText },
  { id: 'physical', label: 'Exame Físico', icon: Activity },
  { id: 'habits', label: 'Hábitos', icon: Moon },
  { id: 'functions', label: 'Funções', icon: Droplets },
  { id: 'emotions', label: 'Emoções/Língua', icon: Heart },
  { id: 'conclusion', label: 'Conclusão', icon: Check },
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
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPatientId, setSelectedPatientId] = useState(preSelectedPatientId || '');
  
  const [formData, setFormData] = useState<Partial<Evaluation>>(DEFAULT_FORM_DATA);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const canCreate = user?.permissions.includes('evaluations:create') || user?.role === 'ADMIN';
  const canEdit = user?.permissions.includes('evaluations:edit') || user?.role === 'ADMIN';
  const canDelete = user?.permissions.includes('evaluations:delete') || user?.role === 'ADMIN';
  const canView = user?.permissions.includes('evaluations:view') || user?.role === 'ADMIN';

  const handleExportEvaluation = (evaluation: Evaluation) => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(15, 82, 56); // Primary color
      doc.text('Avaliação Clínica MTC', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Paciente: ${evaluation.patientName}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`Data: ${new Date(evaluation.date).toLocaleDateString('pt-BR')} | Avaliador: ${evaluation.evaluator}`, pageWidth / 2, 33, { align: 'center' });
      
      // 1. Histórico e Identificação
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('1. Identificação e Histórico Clínico', 14, 45);
      
      autoTable(doc, {
        startY: 50,
        body: [
          ['Origem', evaluation.origin],
          ['Primeira vez MTC', evaluation.firstTimeTCM ? 'Sim' : 'Não'],
          ['Queixa Principal', evaluation.mainComplaint],
          ['Início da Queixa', evaluation.complaintStart],
          ['Fatores de Melhora', evaluation.improvementFactors],
          ['Fatores de Piora', evaluation.worseningFactors],
          ['Doenças Prévias', evaluation.previousDiseases],
          ['Cirurgias', evaluation.surgeries],
          ['Medicamentos', evaluation.medications],
          ['Alergias', evaluation.allergies],
          ['Fatores Agravantes / Aliviantes', evaluation.aggravatingRelieving],
          ['Histórico Familiar', evaluation.familyHistory],
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
          ['Sinais Vitais', `PA: ${evaluation.physical.pa} | FC: ${evaluation.physical.fc} | Glicose: ${evaluation.physical.glucose}`],
          ['Antropometria', `Altura: ${evaluation.physical.height}m | Peso: ${evaluation.physical.weight}kg | IMC: ${evaluation.physical.imc}`],
          ['Intensidade da Dor (EVA)', `${evaluation.physical.painIntensity}/10`],
          ['Tipo de Dor', evaluation.physical.painType.join(', ')],
          ['Frequência', evaluation.physical.painFrequency],
          ['Pico de Dor', evaluation.physical.painPeakTime],
          ['Migração', evaluation.physical.painMigration ? 'Sim' : 'Não'],
          ['Agravantes/Aliviantes', evaluation.physical.painAggravatingRelieving],
          ['Mov. Involuntários', evaluation.physical.involuntaryMovements],
          ['Pele e Observações', evaluation.physical.skin.join(', ')],
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
          ['Sono', `${evaluation.sleep.hours}h | Dificuldade: ${evaluation.sleep.difficulty ? 'Sim' : 'Não'} | Repousante: ${evaluation.sleep.restorative ? 'Sim' : 'Não'}`],
          ['Apetite', `Nível: ${evaluation.appetite.level} | Preferência: ${evaluation.appetite.preference || 'N/A'} | Sabor: ${evaluation.appetite.taste}`],
          ['Sede', `Frequência: ${evaluation.thirst.frequency ? 'Sim' : 'Não'} | Preferência: ${evaluation.thirst.preference || 'N/A'} | Quantidade: ${evaluation.thirst.quantity}`],
          ['Evacuação', `Frequência: ${evaluation.evacuation.frequency} | Bristol: ${evaluation.evacuation.bristol}`],
          ['Urina', `Cor: ${evaluation.urine.color} | Frequência: ${evaluation.urine.frequency}`],
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
          ['Emoções Predominantes', evaluation.emotions.predominant.join(', ')],
          ['Status Atual', evaluation.emotions.currentStatus],
          ['Termorregulação', `Sensação: ${evaluation.thermoregulation.feeling} | Suor Noturno: ${evaluation.thermoregulation.nightSweat ? 'Sim' : 'Não'}`],
          ['Língua', `Cor: ${evaluation.tonguePulse.color} | Saburra: ${evaluation.tonguePulse.coating} | Forma: ${evaluation.tonguePulse.shape}`],
          ['Pulso', evaluation.tonguePulse.pulse],
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
          ['Hipótese Diagnóstica (Síndrome)', evaluation.syndromeHypothesis],
          ['Planejamento Terapêutico Inicial', evaluation.initialTreatment],
          ['Piora Sazonal', evaluation.seasonsWorsening],
          ['Piora Horária', evaluation.timeWorsening],
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 82, 56] },
      });

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
    setFormData(DEFAULT_FORM_DATA);
  };

  const handleEdit = (evaluation: Evaluation) => {
    if (!canEdit) return;
    setEditingId(evaluation.id);
    setSelectedPatientId(evaluation.patientId);
    setFormData({ ...DEFAULT_FORM_DATA, ...evaluation });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (evaluation: Evaluation) => {
    if (!canView) return;
    setEditingId(evaluation.id);
    setSelectedPatientId(evaluation.patientId);
    setFormData({ ...DEFAULT_FORM_DATA, ...evaluation });
    setIsViewMode(true);
    setIsModalOpen(true);
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
                         e.syndromeHypothesis?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (preSelectedPatientId) {
      return e.patientId === preSelectedPatientId && matchesSearch;
    }
    
    return matchesSearch;
  });

  return (
    <div className="p-10 space-y-10 relative">
      {/* Header */}
      <section className="flex flex-col md:flex-row gap-8 items-start justify-between">
        <div>
          <h2 className="text-4xl font-bold font-headline text-on-surface">Avaliações Clínicas</h2>
          <p className="text-on-surface-variant text-lg mt-2 font-medium">Prontuários e fichas de avaliação MTC.</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setIsModalOpen(true)}
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
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{evaluation.patientName}</p>
                    <p className="text-[10px] text-outline uppercase tracking-widest font-bold">
                      {new Date(evaluation.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleExportEvaluation(evaluation)}
                    className="p-2 text-outline hover:text-primary hover:bg-primary/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Exportar PDF"
                  >
                    <FileText size={16} />
                  </button>
                  {canEdit && (
                    <button 
                      onClick={() => handleEdit(evaluation)}
                      className="p-2 text-outline hover:text-primary hover:bg-primary/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      onClick={() => confirmDelete(evaluation.id)}
                      className="p-2 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-surface-container-low rounded-xl">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Queixa Principal</p>
                  <p className="text-xs text-on-surface-variant line-clamp-2">{evaluation.mainComplaint}</p>
                </div>
                {evaluation.syndromeHypothesis && (
                  <div className="p-3 bg-primary/5 rounded-xl">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Hipótese Diagnóstica</p>
                    <p className="text-xs text-primary font-medium">{evaluation.syndromeHypothesis}</p>
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

      {/* Modal */}
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
              className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
                <div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">
                    {isViewMode ? 'Detalhes da Avaliação' : editingId ? 'Editar Avaliação Clínica' : 'Nova Avaliação Clínica'}
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium">Passo {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].label}</p>
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

              {/* Progress Bar */}
              <div className="flex px-8 py-4 bg-surface-container-low/10 gap-2">
                {STEPS.map((step, idx) => (
                  <div 
                    key={step.id}
                    className={cn(
                      "flex-1 h-1.5 rounded-full transition-all duration-500",
                      idx <= currentStep ? "bg-primary" : "bg-outline-variant/20"
                    )}
                  />
                ))}
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
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
                          onChange={e => setFormData({...formData, date: e.target.value})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Origem da Consulta</label>
                        <select 
                          disabled={isViewMode}
                          value={formData.origin}
                          onChange={e => setFormData({...formData, origin: e.target.value})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                        >
                          <option value="Espontânea">Espontânea</option>
                          <option value="Encaminhamento">Encaminhamento</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-4 pt-8">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                            formData.firstTimeTCM ? "bg-primary border-primary" : "border-outline-variant group-hover:border-primary",
                            isViewMode && "opacity-70 cursor-not-allowed"
                          )} onClick={() => !isViewMode && setFormData({...formData, firstTimeTCM: !formData.firstTimeTCM})}>
                            {formData.firstTimeTCM && <Check size={14} className="text-white" />}
                          </div>
                          <span className="text-sm font-medium text-on-surface">Primeira vez com MTC?</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Queixa Principal</label>
                        <textarea 
                          disabled={isViewMode}
                          value={formData.mainComplaint}
                          onChange={e => setFormData({...formData, mainComplaint: e.target.value})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[100px] disabled:opacity-70"
                          placeholder="Descreva a queixa principal do paciente..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase tracking-widest">Início da Queixa</label>
                          <input 
                            disabled={isViewMode}
                            type="text" 
                            value={formData.complaintStart}
                            onChange={e => setFormData({...formData, complaintStart: e.target.value})}
                            className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                            placeholder="Ex: Há 3 meses"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase tracking-widest">Queixas Secundárias</label>
                          <input 
                            disabled={isViewMode}
                            type="text" 
                            value={formData.secondaryComplaints}
                            onChange={e => setFormData({...formData, secondaryComplaints: e.target.value})}
                            className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                            placeholder="Outros sintomas..."
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase tracking-widest">Fatores de Melhora</label>
                          <input 
                            disabled={isViewMode}
                            type="text" 
                            value={formData.improvementFactors}
                            onChange={e => setFormData({...formData, improvementFactors: e.target.value})}
                            className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                            placeholder="O que melhora os sintomas?"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase tracking-widest">Fatores de Piora</label>
                          <input 
                            disabled={isViewMode}
                            type="text" 
                            value={formData.worseningFactors}
                            onChange={e => setFormData({...formData, worseningFactors: e.target.value})}
                            className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                            placeholder="O que piora os sintomas?"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Fatores Agravantes / Aliviantes</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.aggravatingRelieving}
                          onChange={e => setFormData({...formData, aggravatingRelieving: e.target.value})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          placeholder="Ex: Piora com frio, melhora com pressão..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Doenças Prévias</label>
                        <textarea 
                          disabled={isViewMode}
                          value={formData.previousDiseases}
                          onChange={e => setFormData({...formData, previousDiseases: e.target.value})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[80px] disabled:opacity-70"
                          placeholder="Ex: Hipertensão, Diabetes..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Cirurgias</label>
                        <textarea 
                          disabled={isViewMode}
                          value={formData.surgeries}
                          onChange={e => setFormData({...formData, surgeries: e.target.value})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[80px] disabled:opacity-70"
                          placeholder="Ex: Apendicectomia, Colecistectomia..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Histórico Familiar</label>
                        <textarea 
                          disabled={isViewMode}
                          value={formData.familyHistory}
                          onChange={e => setFormData({...formData, familyHistory: e.target.value})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[60px] disabled:opacity-70"
                          placeholder="Diabetes, hipertensão, etc. na família..."
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase tracking-widest">Medicamentos em Uso</label>
                          <input 
                            disabled={isViewMode}
                            type="text" 
                            value={formData.medications}
                            onChange={e => setFormData({...formData, medications: e.target.value})}
                            className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase tracking-widest">Alergias</label>
                          <input 
                            disabled={isViewMode}
                            type="text" 
                            value={formData.allergies}
                            onChange={e => setFormData({...formData, allergies: e.target.value})}
                            className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">PA (mmHg)</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.physical?.pa}
                          onChange={e => setFormData({...formData, physical: {...formData.physical!, pa: e.target.value}})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          placeholder="120/80"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">FC (bpm)</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.physical?.fc}
                          onChange={e => setFormData({...formData, physical: {...formData.physical!, fc: e.target.value}})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          placeholder="72"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Glicose (mg/dL)</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.physical?.glucose}
                          onChange={e => setFormData({...formData, physical: {...formData.physical!, glucose: e.target.value}})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          placeholder="90"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Altura (m)</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.physical?.height}
                          onChange={e => setFormData({...formData, physical: {...formData.physical!, height: e.target.value}})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          placeholder="1.70"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Peso (kg)</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.physical?.weight}
                          onChange={e => setFormData({...formData, physical: {...formData.physical!, weight: e.target.value}})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          placeholder="70"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">IMC</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.physical?.imc}
                          onChange={e => setFormData({...formData, physical: {...formData.physical!, imc: e.target.value}})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          placeholder="24.2"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest">Intensidade da Dor (EVA)</label>
                      <div className="flex justify-between gap-1">
                        {[0,1,2,3,4,5,6,7,8,9,10].map(val => (
                          <button
                            key={val}
                            disabled={isViewMode}
                            onClick={() => setFormData({...formData, physical: {...formData.physical!, painIntensity: val}})}
                            className={cn(
                              "flex-1 h-12 rounded-lg font-bold text-sm transition-all",
                              formData.physical?.painIntensity === val 
                                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                : "bg-surface-container-low text-on-surface hover:bg-surface-container",
                              isViewMode && "opacity-70 cursor-not-allowed"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Tipo de Dor</label>
                        <div className="flex flex-wrap gap-2">
                          {['Aguda', 'Crônica', 'Latejante', 'Queimação', 'Fincada', 'Surda'].map(type => (
                            <button
                              key={type}
                              disabled={isViewMode}
                              onClick={() => {
                                const current = formData.physical?.painType || [];
                                const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
                                setFormData({...formData, physical: {...formData.physical!, painType: next}});
                              }}
                              className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold border transition-all",
                                formData.physical?.painType?.includes(type) ? "bg-primary text-white border-primary" : "bg-white text-on-surface border-outline-variant/20 hover:bg-surface-container-low",
                                isViewMode && "opacity-70 cursor-not-allowed"
                              )}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Frequência da Dor</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.physical?.painFrequency}
                          onChange={e => setFormData({...formData, physical: {...formData.physical!, painFrequency: e.target.value}})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          placeholder="Ex: Diária, intermitente..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Pico de Dor (Horário)</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.physical?.painPeakTime}
                          onChange={e => setFormData({...formData, physical: {...formData.physical!, painPeakTime: e.target.value}})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          placeholder="Ex: Manhã, noite..."
                        />
                      </div>
                      <div className="flex items-center gap-4 pt-8">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            disabled={isViewMode}
                            type="checkbox" 
                            checked={formData.physical?.painMigration}
                            onChange={e => setFormData({...formData, physical: {...formData.physical!, painMigration: e.target.checked}})}
                            className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                          />
                          <span className="text-sm font-medium">A dor migra?</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Movimentos Involuntários</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.physical?.involuntaryMovements}
                          onChange={e => setFormData({...formData, physical: {...formData.physical!, involuntaryMovements: e.target.value}})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                          placeholder="Tiques, tremores..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-widest">Agravantes/Aliviantes da Dor</label>
                        <input 
                          disabled={isViewMode}
                          type="text" 
                          value={formData.physical?.painAggravatingRelieving}
                          onChange={e => setFormData({...formData, physical: {...formData.physical!, painAggravatingRelieving: e.target.value}})}
                          className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest">Pele e Outras Observações</label>
                      <textarea 
                        disabled={isViewMode}
                        value={formData.physical?.skin?.join(', ')}
                        onChange={e => setFormData({...formData, physical: {...formData.physical!, skin: e.target.value.split(',').map(s => s.trim())}})}
                        className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[80px] disabled:opacity-70"
                        placeholder="Cor, temperatura, umidade, lesões..."
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                          <Moon size={20} className="text-primary" /> Sono
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.sleep?.difficulty}
                                onChange={e => setFormData({...formData, sleep: {...formData.sleep!, difficulty: e.target.checked}})}
                                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-sm font-medium">Dificuldade para iniciar?</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.sleep?.dreams}
                                onChange={e => setFormData({...formData, sleep: {...formData.sleep!, dreams: e.target.checked}})}
                                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-sm font-medium">Muitos sonhos?</span>
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.sleep?.restorative}
                                onChange={e => setFormData({...formData, sleep: {...formData.sleep!, restorative: e.target.checked}})}
                                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-sm font-medium">Sono reparador?</span>
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Horas de sono</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.sleep?.hours}
                                onChange={e => setFormData({...formData, sleep: {...formData.sleep!, hours: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Ex: 7h"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Acorda às</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.sleep?.wakeUpTime}
                                onChange={e => setFormData({...formData, sleep: {...formData.sleep!, wakeUpTime: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Ex: 06:30"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Acordares Noturnos</label>
                            <input 
                              disabled={isViewMode}
                              type="text" 
                              value={formData.sleep?.nightWaking}
                              onChange={e => setFormData({...formData, sleep: {...formData.sleep!, nightWaking: e.target.value}})}
                              className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              placeholder="Frequência e motivo..."
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                          <Coffee size={20} className="text-primary" /> Apetite e Digestão
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Nível de Apetite</label>
                              <select 
                                disabled={isViewMode}
                                value={formData.appetite?.level}
                                onChange={e => setFormData({...formData, appetite: {...formData.appetite!, level: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              >
                                <option value="Normal">Normal</option>
                                <option value="Aumentado">Aumentado</option>
                                <option value="Diminuído">Diminuído</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Sabor na boca</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.appetite?.taste}
                                onChange={e => setFormData({...formData, appetite: {...formData.appetite!, taste: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Metálico, amargo, doce..."
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Preferência por Comidas</label>
                              <select 
                                disabled={isViewMode}
                                value={formData.appetite?.preference}
                                onChange={e => setFormData({...formData, appetite: {...formData.appetite!, preference: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              >
                                <option value="">Indiferente / Selecione...</option>
                                <option value="Quentes">Quentes</option>
                                <option value="Frias">Frias</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.appetite?.stomachWeight}
                                onChange={e => setFormData({...formData, appetite: {...formData.appetite!, stomachWeight: e.target.checked}})}
                                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-sm font-medium">Peso no estômago?</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.appetite?.fullness}
                                onChange={e => setFormData({...formData, appetite: {...formData.appetite!, fullness: e.target.checked}})}
                                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-sm font-medium">Plenitude pós-prandial?</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-outline-variant/10">
                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                          <Droplets size={20} className="text-primary" /> Sede
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.thirst?.frequency}
                                onChange={e => setFormData({...formData, thirst: {...formData.thirst!, frequency: e.target.checked}})}
                                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-sm font-medium">Muita sede?</span>
                            </label>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Preferência</label>
                              <select 
                                disabled={isViewMode}
                                value={formData.thirst?.preference}
                                onChange={e => setFormData({...formData, thirst: {...formData.thirst!, preference: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              >
                                <option value="">Selecione...</option>
                                <option value="Gelada">Gelada</option>
                                <option value="Quente">Quente</option>
                                <option value="Natural">Natural</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Horário de Pico</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.thirst?.time}
                                onChange={e => setFormData({...formData, thirst: {...formData.thirst!, time: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Ex: Tarde"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Quantidade (L/dia)</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.thirst?.quantity}
                                onChange={e => setFormData({...formData, thirst: {...formData.thirst!, quantity: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Ex: 2L"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                          <Activity size={20} className="text-primary" /> Hábitos
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              disabled={isViewMode}
                              type="checkbox" 
                              checked={formData.habits?.smoker}
                              onChange={e => setFormData({...formData, habits: {...formData.habits!, smoker: e.target.checked}})}
                              className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                            />
                            <span className="text-sm font-medium">Fumante?</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              disabled={isViewMode}
                              type="checkbox" 
                              checked={formData.habits?.sedentary}
                              onChange={e => setFormData({...formData, habits: {...formData.habits!, sedentary: e.target.checked}})}
                              className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                            />
                            <span className="text-sm font-medium">Sedentário?</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                          <Droplets size={20} className="text-primary" /> Evacuação e Urina
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Frequência Evacuações</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.evacuation?.frequency}
                                onChange={e => setFormData({...formData, evacuation: {...formData.evacuation!, frequency: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Ex: 1x ao dia"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Escala de Bristol</label>
                              <select 
                                disabled={isViewMode}
                                value={formData.evacuation?.bristol}
                                onChange={e => setFormData({...formData, evacuation: {...formData.evacuation!, bristol: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              >
                                <option value="">Selecione...</option>
                                <option value="Tipo 1">Tipo 1: Caroços duros</option>
                                <option value="Tipo 2">Tipo 2: Salsicha encaroçada</option>
                                <option value="Tipo 3">Tipo 3: Salsicha com fendas</option>
                                <option value="Tipo 4">Tipo 4: Salsicha macia</option>
                                <option value="Tipo 5">Tipo 5: Pedaços moles</option>
                                <option value="Tipo 6">Tipo 6: Pastosa</option>
                                <option value="Tipo 7">Tipo 7: Líquida</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.evacuation?.gases}
                                onChange={e => setFormData({...formData, evacuation: {...formData.evacuation!, gases: e.target.checked}})}
                                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-sm font-medium">Gases/Flatulência?</span>
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Cor da Urina</label>
                              <select 
                                disabled={isViewMode}
                                value={formData.urine?.color}
                                onChange={e => setFormData({...formData, urine: {...formData.urine!, color: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              >
                                <option value="Normal">Normal</option>
                                <option value="Clara">Clara</option>
                                <option value="Escura">Escura</option>
                                <option value="Turva">Turva</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Frequência Urina</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.urine?.frequency}
                                onChange={e => setFormData({...formData, urine: {...formData.urine!, frequency: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Ex: 5x ao dia"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.urine?.pain}
                                onChange={e => setFormData({...formData, urine: {...formData.urine!, pain: e.target.checked}})}
                                className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-sm font-medium">Dor ao urinar?</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                          <Activity size={20} className="text-primary" /> Saúde Reprodutiva
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Menarca (idade)</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.reproductive?.menarche}
                                onChange={e => setFormData({...formData, reproductive: {...formData.reproductive!, menarche: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Duração Ciclo</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.reproductive?.cycleDuration}
                                onChange={e => setFormData({...formData, reproductive: {...formData.reproductive!, cycleDuration: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Libido</label>
                              <select 
                                disabled={isViewMode}
                                value={formData.reproductive?.libido}
                                onChange={e => setFormData({...formData, reproductive: {...formData.reproductive!, libido: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              >
                                <option value="Normal">Normal</option>
                                <option value="Aumentada">Aumentada</option>
                                <option value="Diminuída">Diminuída</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Gestações / Abortos</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={`${formData.reproductive?.pregnancies || 0} / ${formData.reproductive?.abortions || 0}`}
                                onChange={e => {
                                  const [p, a] = e.target.value.split('/').map(s => s.trim());
                                  setFormData({...formData, reproductive: {...formData.reproductive!, pregnancies: p, abortions: a}});
                                }}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Ex: 2 / 0"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Fluxo Menstrual</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.reproductive?.flowDuration}
                                onChange={e => setFormData({...formData, reproductive: {...formData.reproductive!, flowDuration: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Duração/Intensidade"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Cor do Sangue</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.reproductive?.bloodColor}
                                onChange={e => setFormData({...formData, reproductive: {...formData.reproductive!, bloodColor: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">TPM</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.reproductive?.pms}
                                onChange={e => setFormData({...formData, reproductive: {...formData.reproductive!, pms: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              />
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                  disabled={isViewMode}
                                  type="checkbox" 
                                  checked={formData.reproductive?.cramps}
                                  onChange={e => setFormData({...formData, reproductive: {...formData.reproductive!, cramps: e.target.checked}})}
                                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                                />
                                <span className="text-sm font-medium">Cólicas?</span>
                              </label>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Ereção</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.reproductive?.erection}
                                onChange={e => setFormData({...formData, reproductive: {...formData.reproductive!, erection: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Ejaculação</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.reproductive?.ejaculation}
                                onChange={e => setFormData({...formData, reproductive: {...formData.reproductive!, ejaculation: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                          <Heart size={20} className="text-primary" /> Emoções Predominantes
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {['Raiva', 'Frustração', 'Preocupação', 'Medo', 'Tristeza', 'Alegria Excessiva'].map(emotion => (
                            <button
                              key={emotion}
                              disabled={isViewMode}
                              onClick={() => {
                                const current = formData.emotions?.predominant || [];
                                const next = current.includes(emotion) 
                                  ? current.filter(e => e !== emotion)
                                  : [...current, emotion];
                                setFormData({...formData, emotions: {...formData.emotions!, predominant: next}});
                              }}
                              className={cn(
                                "px-4 py-3 rounded-xl text-xs font-bold transition-all border",
                                formData.emotions?.predominant?.includes(emotion)
                                  ? "bg-primary text-white border-primary shadow-md"
                                  : "bg-surface-container-low text-on-surface border-outline-variant/10 hover:bg-surface-container",
                                isViewMode && "opacity-70 cursor-not-allowed"
                              )}
                            >
                              {emotion}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                          <Eye size={20} className="text-primary" /> Língua e Pulso
                        </h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Cor da Língua</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.tonguePulse?.color}
                                onChange={e => setFormData({...formData, tonguePulse: {...formData.tonguePulse!, color: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Normal, pálida, vermelha..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Saburra</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.tonguePulse?.coating}
                                onChange={e => setFormData({...formData, tonguePulse: {...formData.tonguePulse!, coating: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Branca, amarela, espessa..."
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Umidade / Forma</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={`${formData.tonguePulse?.humidity || ''} / ${formData.tonguePulse?.shape || ''}`}
                                onChange={e => {
                                  const [h, s] = e.target.value.split('/').map(v => v.trim());
                                  setFormData({...formData, tonguePulse: {...formData.tonguePulse!, humidity: h, shape: s}});
                                }}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Normal / Normal"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Pulso</label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.tonguePulse?.pulse}
                                onChange={e => setFormData({...formData, tonguePulse: {...formData.tonguePulse!, pulse: e.target.value}})}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                                placeholder="Fino, rápido, corda..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 pt-6 border-t border-outline-variant/10">
                        <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                          <Thermometer size={20} className="text-primary" /> Termorregulação
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Sensação Térmica</label>
                            <select 
                              disabled={isViewMode}
                              value={formData.thermoregulation?.feeling}
                              onChange={e => setFormData({...formData, thermoregulation: {...formData.thermoregulation!, feeling: e.target.value}})}
                              className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none disabled:opacity-70"
                            >
                              <option value="Normal">Normal</option>
                              <option value="Calor">Calor</option>
                              <option value="Frio">Frio</option>
                              <option value="Alternância">Alternância</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-2 pt-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.thermoregulation?.spontaneousSweat}
                                onChange={e => setFormData({...formData, thermoregulation: {...formData.thermoregulation!, spontaneousSweat: e.target.checked}})}
                                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-xs font-medium">Suor Espontâneo?</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.thermoregulation?.nightSweat}
                                onChange={e => setFormData({...formData, thermoregulation: {...formData.thermoregulation!, nightSweat: e.target.checked}})}
                                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-xs font-medium">Suor Noturno?</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                disabled={isViewMode}
                                type="checkbox" 
                                checked={formData.thermoregulation?.odor}
                                onChange={e => setFormData({...formData, thermoregulation: {...formData.thermoregulation!, odor: e.target.checked}})}
                                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                              />
                              <span className="text-xs font-medium">Odor forte?</span>
                            </label>
                          </div>
                        </div>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Estado Emocional Atual</label>
                            <textarea 
                              disabled={isViewMode}
                              value={formData.emotions?.currentStatus}
                              onChange={e => setFormData({...formData, emotions: {...formData.emotions!, currentStatus: e.target.value}})}
                              className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none text-sm disabled:opacity-70 min-h-[80px]"
                              placeholder="Como o paciente se sente hoje?"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-outline uppercase tracking-widest">Estresse / Ansiedade</label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                  disabled={isViewMode}
                                  type="checkbox" 
                                  checked={formData.emotions?.anxiety}
                                  onChange={e => setFormData({...formData, emotions: {...formData.emotions!, anxiety: e.target.checked}})}
                                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary disabled:opacity-70"
                                />
                                <span className="text-xs font-medium">Ansiedade?</span>
                              </label>
                              <input 
                                disabled={isViewMode}
                                type="text" 
                                value={formData.emotions?.stress}
                                onChange={e => setFormData({...formData, emotions: {...formData.emotions!, stress: e.target.value}})}
                                className="flex-1 px-4 py-2 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none text-xs disabled:opacity-70"
                                placeholder="Nível de estresse..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <h4 className="text-lg font-bold text-on-surface flex items-center gap-2">
                        <Activity size={20} className="text-primary" /> Interpretação Final
                      </h4>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase tracking-widest">Hipótese de Síndrome na MTC</label>
                          <textarea 
                            disabled={isViewMode}
                            value={formData.syndromeHypothesis}
                            onChange={e => setFormData({...formData, syndromeHypothesis: e.target.value})}
                            className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[120px] disabled:opacity-70"
                            placeholder="Ex: Deficiência de Qi do Baço com Estagnação de Qi do Fígado..."
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-outline uppercase tracking-widest">Piora por Estação</label>
                            <input 
                              disabled={isViewMode}
                              type="text" 
                              value={formData.seasonsWorsening}
                              onChange={e => setFormData({...formData, seasonsWorsening: e.target.value})}
                              className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                              placeholder="Ex: Inverno, umidade..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-outline uppercase tracking-widest">Piora por Horário</label>
                            <input 
                              disabled={isViewMode}
                              type="text" 
                              value={formData.timeWorsening}
                              onChange={e => setFormData({...formData, timeWorsening: e.target.value})}
                              className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium disabled:opacity-70"
                              placeholder="Ex: Final da tarde"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase tracking-widest">Indicação de Tratamento Inicial</label>
                          <textarea 
                            disabled={isViewMode}
                            value={formData.initialTreatment}
                            onChange={e => setFormData({...formData, initialTreatment: e.target.value})}
                            className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none font-medium min-h-[120px] disabled:opacity-70"
                            placeholder="Pontos de acupuntura, fitoterapia, orientações dietéticas..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
                <button
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="px-6 py-3 rounded-xl border border-outline-variant/20 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all disabled:opacity-30 flex items-center gap-2"
                >
                  <ChevronLeft size={18} /> Anterior
                </button>

                {currentStep === STEPS.length - 1 ? (
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
