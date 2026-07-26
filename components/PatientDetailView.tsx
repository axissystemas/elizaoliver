'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  History as HistoryIcon, 
  Stethoscope, 
  Globe, 
  Zap, 
  Plus, 
  Sparkles, 
  Type, 
  Italic, 
  List as ListIcon, 
  Save as SaveIcon, 
  Download,
  ChevronRight,
  ArrowLeft,
  Edit3,
  Calendar,
  Clock,
  Trash2,
  Printer,
  FileText,
  X,
  AlertCircle,
  Check,
  Phone,
  Mail,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User } from '@/types/auth';
import ConfirmationModal from './ConfirmationModal';
import { supabase } from '@/lib/supabase';
import { openWhatsApp, WhatsAppTemplates } from '@/lib/whatsapp';
import DietBuilderModal from './dietotherapy/DietBuilderModal';
import { dietotherapyService } from '@/lib/dietotherapyService';
import { DietPdfGenerator } from '@/lib/DietPdfGenerator';

import PatientGalleryView from './attachments/PatientGalleryView';

interface PatientDetailViewProps {
  patient: any;
  consultations: any[];
  evaluations: any[];
  onBack: () => void;
  onEditPersonal: (patient: any) => void;
  onStartConsultation: () => void;
  onEditConsultation: (consultation: any) => void;
  onDeleteConsultation: (consultationId: string) => void;
  inventoryItems: any[];
  packages?: any[];
  onSavePackage?: (data: any) => Promise<void>;
  onUpdatePackage?: (id: string, data: any) => Promise<void>;
  onDeletePackage?: (id: string) => Promise<void>;
  user?: User | null;
}

export default function PatientDetailView({ 
  patient, 
  consultations, 
  evaluations,
  onBack, 
  onEditPersonal,
  onStartConsultation,
  onEditConsultation,
  onDeleteConsultation,
  inventoryItems,
  packages = [],
  onSavePackage,
  onUpdatePackage,
  onDeletePackage,
  user
}: PatientDetailViewProps) {
  const [notes, setNotes] = useState(patient?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  React.useEffect(() => {
    if (patient) {
      setNotes(patient.notes || '');
    }
  }, [patient]);

  const handleSaveNotes = async () => {
    if (!patient || !supabase) return;
    setIsSavingNotes(true);
    try {
      const { error } = await supabase.from('patients').update({ notes } as any).eq('id', patient.id);
      if (error) throw error;
      alert('Notas de evolução salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar notas de evolução:', error);
      alert('Falha ao salvar as notas de evolução. Tente novamente.');
    } finally {
      setIsSavingNotes(false);
    }
  };
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [packageToDeleteId, setPackageToDeleteId] = useState<string | null>(null);
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'historico' | 'pacotes' | 'dietoterapia' | 'galeria'>('geral');

  // Dietotherapy States
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isDietBuilderOpen, setIsDietBuilderOpen] = useState(false);
  const [preloadedEval, setPreloadedEval] = useState<any | null>(null);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [adherence, setAdherence] = useState('Boa');
  const [evolutionText, setEvolutionText] = useState('');

  const fetchPrescriptions = React.useCallback(async () => {
    try {
      const data = await dietotherapyService.getPrescriptions();
      setPrescriptions(data.filter(p => p.patient_id === patient.id));
    } catch (e) {
      console.error(e);
    }
  }, [patient.id]);

  React.useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const handleExportPrescriptionPdf = (presc: any, forceType?: 'clinical' | 'simplified') => {
    const type = forceType || presc.report_type || 'simplified';
    const doc = DietPdfGenerator.generatePrescriptionPdf(presc, type);
    doc.save(`orientacao_dietetica_${presc.patient_name || 'paciente'}_${type}.pdf`);
  };

  const handleUpdateAdherence = async (prescId: string) => {
    try {
      const target = prescriptions.find(p => p.id === prescId);
      if (!target) return;
      
      const updated = await dietotherapyService.savePrescription({
        ...target,
        adherence: adherence,
        evolution_notes: evolutionText,
        updated_at: new Date().toISOString()
      });

      setPrescriptions(prev => prev.map(p => p.id === prescId ? updated : p));
      setEditingPrescriptionId(null);
      alert('Acompanhamento de adesão e evolução salvo com sucesso!');
    } catch (e: any) {
      alert(e.message || 'Erro ao atualizar.');
    }
  };

  const [packageFormData, setPackageFormData] = useState({
    total_sessions: 10,
    price: 1200,
    status: 'active',
    date: new Date().toISOString().split('T')[0]
  });

  const patientPackages = packages.filter(p => p.patient_id === patient.id);
  const activePackage = patientPackages.find(p => p.status === 'active');

  const canEditPatient = user?.permissions.includes('patients:edit') || user?.role === 'ADMIN';
  const canCreateConsultation = user?.permissions.includes('calendar:create') || user?.role === 'ADMIN';
  const canEditConsultation = user?.permissions.includes('calendar:edit') || user?.role === 'ADMIN';
  const canDeleteConsultation = user?.permissions.includes('calendar:delete') || user?.role === 'ADMIN';

  if (!patient) return null;

  const totalVisits = consultations.length;

  // Get the most recent evaluation
  const latestEvaluation = evaluations.length > 0 
    ? [...evaluations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const handleGenerateReport = () => {
    setIsGeneratingReport(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header bg
      doc.setFillColor(31, 41, 55); 
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('Relatório Clínico - Axis GC', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('Informações do Paciente', 14, 45);
      
      autoTable(doc, {
        startY: 50,
        head: [['Campo', 'Informação']],
        body: [
          ['Nome', patient.name],
          ['ID', `#TCM-${patient.id.slice(-4)}`],
          ['CPF', patient.cpf ? patient.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : 'N/A'],
          ['Data de Nascimento', patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : 'N/A'],
          ['Idade', `${patient.age} Anos`],
          ['Gênero', patient.gender || 'N/A'],
          ['Telefone', patient.phone || 'N/A'],
          ['E-mail', patient.email || 'N/A'],
          ['Profissão', patient.profession],
          ['Status', patient.status === 'Ativo' ? 'Tratamento Ativo' : 'Inativo'],
          ['Última Visita', patient.lastVisit || 'N/A'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 82, 56] },
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;
      if (latestEvaluation) {
        const isRad = (latestEvaluation as any).templateType === 'RADIESTESIA';
        
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(isRad ? 'Análise Radiestésica Recente' : 'Anamnese e Histórico Clínico', 14, currentY);
        
        let body: any[] = [
          ['Anamnese (Cód)', latestEvaluation?.code || 'N/A'],
          ['Queixa Principal', latestEvaluation?.mainComplaint || 'N/A'],
        ];

        if (isRad) {
          const rad = latestEvaluation as any;
          body = [
            ...body,
            ['Energia de Saúde', `${rad.healthEnergy?.value}% (${rad.healthEnergy?.category})`],
            ['Campos (Deseq.)', `M: ${rad.energeticFields?.mental?.imbalance}% | E: ${rad.energeticFields?.emotional?.imbalance}% | S: ${rad.energeticFields?.spiritual?.imbalance}% | F: ${rad.energeticFields?.physical?.imbalance}%`],
            ['Observações', rad.finalObservations || 'N/A']
          ];
        } else {
          body = [
            ...body,
            ['Sono', latestEvaluation?.sleep ? `${latestEvaluation.sleep.hours}h, ${latestEvaluation.sleep.restorative ? 'Repousante' : 'Não repousante'}` : 'N/A'],
            ['Apetite/Digestão', latestEvaluation?.appetite ? `Apetite ${latestEvaluation.appetite.level}${latestEvaluation.appetite.fullness ? ', Plenitude' : ''}` : 'N/A'],
            ['Língua', latestEvaluation?.tonguePulse ? `${latestEvaluation.tonguePulse.color}, ${latestEvaluation.tonguePulse.shape}, ${latestEvaluation.tonguePulse.coating}` : 'N/A'],
            ['Pulso', latestEvaluation?.tonguePulse?.pulse || 'N/A'],
            ['Hipótese Diagnóstica', latestEvaluation?.syndromeHypothesis || 'N/A']
          ];
        }

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Categoria', 'Detalhes']],
          body: body,
          theme: 'striped',
          headStyles: { fillColor: isRad ? [79, 70, 229] : [15, 82, 56] },
        });
      }
      
      // Histórico de Consultas
      currentY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(16);
      doc.text('Histórico de Consultas', 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Data', 'Horário', 'Duração', 'Notas']],
        body: consultations.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map(c => {
          const date = new Date(c.startTime);
          const end = c.endTime ? new Date(c.endTime) : null;
          const duration = end ? Math.round((end.getTime() - date.getTime()) / 60000) : 0;
          return [
            date.toLocaleDateString('pt-BR'),
            date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            `${duration} min`,
            c.notes || '-'
          ];
        }),
        theme: 'striped',
        headStyles: { fillColor: [15, 82, 56] },
      });
      
      // Pacotes de Sessões
      if (patientPackages.length > 0) {
        currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(16);
        doc.text('Pacotes de Sessões', 14, currentY);
        
        autoTable(doc, {
          startY: currentY + 5,
          head: [['Data Venda', 'Sessões', 'Valor', 'Status']],
          body: patientPackages.map(pkg => [
            new Date(pkg.created_at).toLocaleDateString('pt-BR'),
            `${pkg.used_sessions} / ${pkg.total_sessions}`,
            `R$ ${pkg.price.toLocaleString('pt-BR')}`,
            pkg.status === 'active' ? 'Ativo' : 'Concluído'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [15, 82, 56] },
        });
      }

      doc.save(`relatorio_${patient.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="p-10 space-y-10 relative">
      {/* Patient Header */}
      <section className="flex flex-col md:flex-row gap-8 items-start justify-between">
        <div className="flex gap-8 items-center">
          <button onClick={onBack} className="p-3 rounded-2xl bg-surface-container-low text-outline hover:text-primary transition-all no-print">
            <ArrowLeft size={24} />
          </button>
          <div className="w-24 h-24 rounded-[2rem] overflow-hidden bg-secondary-container shadow-xl relative">
            <Image src={patient.avatar || "https://picsum.photos/seed/isabella/200/200"} alt="Patient" fill className="object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold font-headline text-on-surface">{patient.name}</h2>
              <span className={`px-4 py-1 text-[10px] font-bold rounded-lg uppercase tracking-widest ${patient.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-container-high text-outline'}`}>
                {patient.status === 'Ativo' ? 'Tratamento Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-on-surface-variant text-base mt-1 font-medium">ID: #TCM-{patient.id.slice(-4)} • {patient.age} Anos • {patient.profession}</p>
            
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
              {patient.cpf && (
                <span className="flex items-center gap-2 text-xs font-bold text-outline">
                  <CreditCard size={14} /> {patient.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                </span>
              )}
              {patient.birth_date && (
                <span className="flex items-center gap-2 text-xs font-bold text-outline">
                  <Calendar size={14} /> Nasc: {new Date(patient.birth_date).toLocaleDateString('pt-BR')}
                </span>
              )}
              {patient.phone && (
                <>
                  <a href={`tel:${patient.phone}`} className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                    <Phone size={14} /> {patient.phone}
                  </a>
                  <button 
                    onClick={() => openWhatsApp(patient.phone, WhatsAppTemplates.welcome(patient.name))} 
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-all"
                  >
                    <MessageSquare size={12} /> WhatsApp
                  </button>
                </>
              )}
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                  <Mail size={14} /> {patient.email}
                </a>
              )}
            </div>

            <div className="flex gap-6 mt-4">
              <span className="flex items-center gap-2 text-xs font-bold text-primary"><HistoryIcon size={14} /> Última: {patient.lastVisit || 'N/A'}</span>
              <span className="flex items-center gap-2 text-xs font-bold text-secondary"><Stethoscope size={14} /> {totalVisits} Visitas</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4 no-print flex-wrap">
          {patient.phone && (
            <button 
              onClick={() => openWhatsApp(patient.phone, WhatsAppTemplates.welcome(patient.name))} 
              className="px-6 py-3.5 rounded-2xl text-sm font-bold bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            >
              <MessageSquare size={18} /> WhatsApp
            </button>
          )}
          <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="px-8 py-3.5 rounded-2xl text-sm font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-2 disabled:opacity-50">
            {isGeneratingReport ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <FileText size={18} />} Exportar
          </button>
          {canEditPatient && (
            <button onClick={() => onEditPersonal(patient)} className="px-8 py-3.5 rounded-2xl text-sm font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-2">
              <Edit3 size={18} /> Editar
            </button>
          )}
          {canCreateConsultation && (
            <button onClick={onStartConsultation} className="px-8 py-3.5 rounded-2xl text-sm font-bold bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
              <Plus size={18} /> Iniciar Consulta
            </button>
          )}
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-[2rem] w-fit no-print flex-wrap">
        {['geral', 'historico', 'pacotes', 'dietoterapia', 'galeria'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-8 py-3 rounded-[1.5rem] text-sm font-bold transition-all ${
              activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-primary'
            }`}
          >
            {tab === 'geral' ? 'Resumo Clínico' : tab === 'historico' ? 'Consultas' : tab === 'pacotes' ? 'Pacotes' : tab === 'dietoterapia' ? 'Dietoterapia' : '📷 Fotos & Mídias Clínicas'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'geral' && (
          <motion.div key="geral" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-8 space-y-8">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-outline-variant/10">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-outline mb-6">Queixa Principal</h3>
                  <div className="bg-surface-container-low p-6 rounded-2xl border-l-4 border-primary">
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-xs font-bold uppercase tracking-widest text-outline">Descrição</label>
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-black">{latestEvaluation?.code || '#EV-0000'}</span>
                         {latestEvaluation && (
                           <button
                             onClick={() => {
                               const evalData = latestEvaluation.data || {};
                               setPreloadedEval({
                                 id: latestEvaluation.id,
                                 patientId: patient.id,
                                 pattern: latestEvaluation.syndromeHypothesis || evalData.syndromeHypothesis || '',
                                 principles: latestEvaluation.initialTreatment || evalData.initialTreatment || ''
                               });
                               setIsDietBuilderOpen(true);
                             }}
                             className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded flex items-center gap-1 transition-all"
                           >
                             <Sparkles size={10} /> Prescrever Dietoterapia
                           </button>
                         )}
                       </div>
                    </div>
                    <p className="text-on-surface font-medium leading-relaxed">{latestEvaluation?.mainComplaint || "Nenhuma avaliação."}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {latestEvaluation?.templateType === 'RADIESTESIA' ? (
                      <>
                        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                          <label className="text-[10px] font-bold text-indigo-700 uppercase">Energia de Saúde (Bovis)</label>
                          <div className="flex items-end gap-2 mt-1">
                            <p className="text-2xl font-black text-indigo-900">{(latestEvaluation as any).healthEnergy?.value} <span className="text-sm font-medium text-indigo-600/60 mix-blend-multiply">UB (Å)</span></p>
                            <span className="text-[10px] font-bold text-indigo-600 mb-1 uppercase">{(latestEvaluation as any).healthEnergy?.category}</span>
                          </div>
                        </div>
                        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                          <label className="text-[10px] font-bold text-indigo-700 uppercase">Principal Desequilíbrio</label>
                          <p className="text-sm font-bold text-indigo-900 mt-1">
                            {(latestEvaluation as any).energeticFields ? 
                              Object.entries((latestEvaluation as any).energeticFields)
                                .sort(([,a]: any, [,b]: any) => b.imbalance - a.imbalance)[0][0].toUpperCase() 
                              : 'N/A'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-surface-container-low p-6 rounded-2xl">
                          <label className="text-[10px] font-bold text-primary uppercase">Sono</label>
                          <p className="text-sm font-medium">{latestEvaluation?.sleep ? `${latestEvaluation.sleep.hours}h, ${latestEvaluation.sleep.restorative ? 'Repousante' : 'Não'}` : 'N/A'}</p>
                        </div>
                        <div className="bg-surface-container-low p-6 rounded-2xl">
                          <label className="text-[10px] font-bold text-primary uppercase">Digestão</label>
                          <p className="text-sm font-medium">{latestEvaluation?.appetite ? `Apetite ${latestEvaluation.appetite.level}` : 'N/A'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {latestEvaluation?.templateType === 'RADIESTESIA' ? (
                    <div className="col-span-2 bg-indigo-50/30 rounded-[2.5rem] p-10 shadow-sm border border-indigo-100/50">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-700 mb-8">Campos Energéticos (% Desequilíbrio)</h3>
                      <div className="flex gap-8 overflow-x-auto pb-2">
                        {['mental', 'emotional', 'spiritual', 'physical'].map((field) => (
                          <div key={field} className="flex flex-col items-center gap-2 min-w-[80px]">
                            <div className="w-12 h-20 bg-indigo-100/50 rounded-full relative flex items-end overflow-hidden">
                              <div 
                                className="w-full bg-indigo-500 transition-all duration-1000" 
                                style={{ height: `${(latestEvaluation as any).energeticFields?.[field]?.imbalance || 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black uppercase text-indigo-900">{field.slice(0, 3)}</span>
                            <span className="text-[10px] font-bold text-indigo-600">{(latestEvaluation as any).energeticFields?.[field]?.imbalance || 0}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-outline-variant/10">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-outline mb-8">Língua</h3>
                        <div className="flex gap-2 flex-wrap">
                          {latestEvaluation?.tonguePulse ? [latestEvaluation.tonguePulse.color, latestEvaluation.tonguePulse.shape].map((t, i) => <span key={i} className="px-4 py-1.5 bg-secondary-container text-on-secondary-container rounded-xl text-xs font-bold">{t}</span>) : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-outline-variant/10">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-outline mb-8">Pulso</h3>
                        <p className="text-sm font-extrabold text-primary">{latestEvaluation?.tonguePulse?.pulse || 'N/A'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="col-span-12 lg:col-span-4">
                 <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-outline-variant/10">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-outline mb-8">
                    {latestEvaluation?.templateType === 'RADIESTESIA' ? 'Observações Finais' : 'Tratamento Inicial'}
                  </h3>
                  <p className="text-sm font-bold text-on-surface">
                    {latestEvaluation?.templateType === 'RADIESTESIA' 
                      ? (latestEvaluation as any).finalObservations 
                      : latestEvaluation?.initialTreatment || "N/A"}
                  </p>
                </div>
              </div>
         </div>

            <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-outline-variant/10">
              <h3 className="text-2xl font-bold font-headline mb-8">Notas de Evolução</h3>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isSavingNotes} className="w-full min-h-[180px] bg-surface-container-low border-none rounded-[2rem] p-8 text-base text-on-surface focus:ring-2 focus:ring-primary/10 disabled:opacity-50" placeholder="Evolução do paciente..." />
              <div className="flex justify-end mt-4">
                <button onClick={handleSaveNotes} disabled={isSavingNotes} className="p-3 bg-primary text-white rounded-2xl shadow-lg hover:scale-110 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center">
                  {isSavingNotes ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SaveIcon size={20} />}
                </button>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'historico' && (
          <motion.div key="historico" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
            {consultations.length > 0 ? consultations.map((c) => {
              const start = new Date(c.startTime);
              const end = c.endTime ? new Date(c.endTime) : null;
              const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;
              
              return (
                <div key={c.id} className="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8 space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-surface-container-low rounded-2xl flex items-center justify-center text-on-surface-variant">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">
                          {start.toLocaleDateString('pt-BR')} • {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {end ? ` às ${end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Duração</p>
                        <p className="text-sm font-black text-on-surface">{duration} min</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => onEditConsultation(c)} className="p-2 bg-white rounded-xl border border-outline-variant/10 text-outline hover:text-primary shadow-sm hover:shadow-md transition-all">
                          <Edit3 size={18} />
                        </button>
                        <button onClick={() => onDeleteConsultation(c.id)} className="p-2 bg-white rounded-xl border border-outline-variant/10 text-outline hover:text-rose-500 shadow-sm hover:shadow-md transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {c.notes && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest">Notas da Sessão</h4>
                      <p className="text-sm text-on-surface italic font-medium opacity-90 leading-relaxed">
                        &quot;{c.notes}&quot;
                      </p>
                    </div>
                  )}

                  {/* Materials */}
                  {c.materials_used && c.materials_used.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest">Materiais Utilizados</h4>
                      <div className="flex flex-wrap gap-2">
                        {c.materials_used.map((m: any, idx: number) => {
                          const item = inventoryItems.find(i => i.id === m.itemId);
                          const name = m.itemName || item?.name || 'Material';
                          return (
                            <span key={idx} className="px-3 py-1.5 bg-surface-container-low text-[10px] font-bold text-on-surface-variant rounded-xl border border-outline-variant/10">
                              {name} x{m.quantity}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-outline-variant/20 italic text-outline">
                Sem consultas registradas.
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'pacotes' && (
          <motion.div key="pacotes" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-2xl font-bold font-headline">Pacotes de Sessões</h3>
                <p className="text-sm text-on-surface-variant mt-1">Gestão de pacotes pré-pagos</p>
              </div>
              <button onClick={() => setIsPackageModalOpen(true)} className="px-8 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-xl flex items-center gap-2"><Plus size={18} /> Vender Pacote</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {patientPackages.length > 0 ? patientPackages.map((pkg) => (
                <div key={pkg.id} className="p-8 bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-outline-variant uppercase">Data da Venda</p>
                      <p className="font-bold">{new Date(pkg.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-outline-variant uppercase">Status</p>
                        <span className={`px-2 py-0.5 text-[8px] font-bold rounded-md ${pkg.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-container-high text-outline'}`}>{pkg.status === 'active' ? 'Ativo' : 'Concluído'}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setPackageFormData({
                              total_sessions: pkg.total_sessions,
                              price: pkg.price,
                              status: pkg.status,
                              date: new Date(pkg.created_at).toISOString().split('T')[0]
                            });
                            setIsEditingPackage(true);
                            setPackageToDeleteId(pkg.id); // Reusing this for current edit ID
                            setIsPackageModalOpen(true);
                          }}
                          className="p-2 hover:bg-surface-container-low rounded-xl text-outline hover:text-primary transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setPackageToDeleteId(pkg.id);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="p-2 hover:bg-surface-container-low rounded-xl text-outline hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Sessões: {pkg.used_sessions} / {pkg.total_sessions}</span>
                      <span className="text-primary">{Math.round((pkg.used_sessions / pkg.total_sessions) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(pkg.used_sessions / pkg.total_sessions) * 100}%` }} />
                    </div>
                    <p className="text-xl font-black text-on-surface">R$ {pkg.price.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              )) : <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-outline-variant/20 text-outline italic">Nenhum pacote vendido.</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Package Modal (Sell/Edit) */}
      <AnimatePresence>
        {isPackageModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPackageModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="px-8 py-6 bg-primary text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Sparkles size={24} />
                  <h3 className="text-xl font-headline font-bold">{isEditingPackage ? 'Editar Pacote' : 'Venda de Pacote'}</h3>
                </div>
                <button onClick={() => setIsPackageModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-all"><X size={22} /></button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Sessões Totais</label>
                    <input type="number" value={packageFormData.total_sessions} onChange={e => setPackageFormData({...packageFormData, total_sessions: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Valor do Pacote (R$)</label>
                    <input type="number" value={packageFormData.price} onChange={e => setPackageFormData({...packageFormData, price: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg" />
                  </div>
                </div>

                {isEditingPackage && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Status</label>
                    <div className="flex gap-2">
                       {['active', 'completed'].map(s => (
                         <button key={s} onClick={() => setPackageFormData({...packageFormData, status: s})}
                           className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${packageFormData.status === s ? 'bg-primary text-white border-primary' : 'bg-surface-container-low text-outline border-outline-variant/10 hover:border-primary/40'}`}>
                           {s === 'active' ? 'Ativo' : 'Concluído'}
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsPackageModalOpen(false)} className="flex-1 py-4 rounded-2xl border border-outline-variant/20 font-bold text-outline hover:bg-surface-container-low transition-all">Cancelar</button>
                  <button 
                    disabled={isSavingPackage}
                    onClick={async () => {
                      setIsSavingPackage(true);
                      try {
                        if (isEditingPackage && packageToDeleteId) {
                          await onUpdatePackage?.(packageToDeleteId, packageFormData);
                        } else {
                          await onSavePackage?.({ ...packageFormData, patientId: patient.id });
                        }
                        setIsPackageModalOpen(false);
                        setIsEditingPackage(false);
                      } finally {
                        setIsSavingPackage(false);
                      }
                    }}
                    className="flex-[2] py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSavingPackage ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={20} /> {isEditingPackage ? 'Salvar Alterações' : 'Concluir Venda'}</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* DIETOTERAPIA TAB PANEL */}
        {activeTab === 'dietoterapia' && (
          <motion.div key="dietoterapia" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-2xl font-bold font-headline">Dietoterapia Chinesa</h3>
                <p className="text-sm text-on-surface-variant mt-1">Orientações e prescrições alimentares do paciente</p>
              </div>
              <button 
                onClick={() => {
                  setPreloadedEval(null);
                  setIsDietBuilderOpen(true);
                }} 
                className="px-8 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-xl flex items-center gap-2"
              >
                <Plus size={18} /> Nova Orientação
              </button>
            </div>

            {/* Histórico de Avaliações */}
            <div className="bg-white rounded-[2.5rem] p-10 border border-outline-variant/10 shadow-sm space-y-6">
              <h4 className="text-sm font-bold text-outline uppercase tracking-wider flex items-center gap-2">
                📋 Histórico de Avaliações MTC
              </h4>
              {evaluations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {evaluations.map(ev => {
                    const evalData = ev.data || {};
                    const patternName = ev.syndromeHypothesis || evalData.syndromeHypothesis || 'Padrão não especificado';
                    const principlesStr = ev.initialTreatment || evalData.initialTreatment || '';
                    return (
                      <div key={ev.id} className="p-5 bg-surface-container-low/50 rounded-2xl border border-outline-variant/10 flex justify-between items-start text-xs">
                        <div className="space-y-1">
                          <span className="font-bold text-on-surface text-sm block">
                            {new Date(ev.date).toLocaleDateString('pt-BR')} {ev.code ? `- ${ev.code}` : ''}
                          </span>
                          <span className="text-outline font-semibold block">Padrão: {patternName}</span>
                          {principlesStr && <span className="text-primary font-medium block">Princípios: {principlesStr}</span>}
                        </div>
                        <button
                          onClick={() => {
                            setPreloadedEval({
                              id: ev.id,
                              patientId: patient.id,
                              pattern: patternName,
                              principles: principlesStr
                            });
                            setIsDietBuilderOpen(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Sparkles size={12} /> Prescrever
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-outline italic">Nenhuma avaliação cadastrada para este paciente.</p>
              )}
            </div>

            {/* Prescrições */}
            <div className="space-y-6">
              <h4 className="text-sm font-bold text-outline uppercase tracking-wider">
                Orientações Registradas
              </h4>

              {prescriptions.length > 0 ? (
                <div className="space-y-6">
                  {prescriptions.map((presc) => (
                    <div key={presc.id} className="p-8 bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6 relative overflow-hidden group">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-on-surface">{presc.title}</span>
                            <span className={`px-2 py-0.5 text-[8px] font-bold rounded-md ${
                              presc.status === 'final' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {presc.status === 'final' ? 'Versão Final / Emitida' : 'Rascunho'}
                            </span>
                            {presc.is_template && (
                              <span className="px-2 py-0.5 text-[8px] bg-indigo-100 text-indigo-700 font-bold rounded-md">Modelo</span>
                            )}
                          </div>
                          <p className="text-xs text-outline mt-1 font-semibold">
                            Criado em {new Date(presc.created_at).toLocaleDateString('pt-BR')} por {presc.created_by || 'Sistema'}
                            {presc.version_number ? ` • Versão ${presc.version_number}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleExportPrescriptionPdf(presc, 'simplified')}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                            title="Exportar Guia Simplificado do Paciente"
                          >
                            <Download size={14} /> Guia Paciente
                          </button>
                          <button
                            onClick={() => handleExportPrescriptionPdf(presc, 'clinical')}
                            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                            title="Exportar Dossiê Clínico Detalhado"
                          >
                            <FileText size={14} /> Dossiê Clínico
                          </button>
                          <button
                            onClick={() => {
                              setEditingPrescriptionId(presc.id);
                              setAdherence(presc.adherence || 'Boa (75%)');
                              setEvolutionText(presc.evolution_notes || '');
                            }}
                            className="p-2.5 bg-white border border-outline-variant/10 rounded-xl text-outline hover:text-secondary hover:border-secondary/20 hover:shadow-sm transition-all"
                            title="Registrar Adesão / Evolução"
                          >
                            <Edit3 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Quadro Resumo */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs bg-surface-container-low/30 p-6 rounded-2xl border border-outline-variant/5">
                        <div>
                          <span className="text-[10px] text-outline font-bold block mb-1">DIAGNÓSTICO MTC</span>
                          <span className="font-semibold">{presc.disharmony_pattern || 'Não especificado'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-outline font-bold block mb-1">PRINCÍPIOS DE TRATAMENTO</span>
                          <span className="font-semibold">{presc.treatment_principles?.join(', ') || 'Nenhum'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-outline font-bold block mb-1">PERÍODO</span>
                          <span className="font-semibold">{presc.period || '30 dias'}</span>
                        </div>
                      </div>

                      {/* Alimentos Selecionados */}
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-on-surface block">Alimentos Selecionados:</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-800 block mb-2">💚 PRIORIZAR</span>
                            <div className="space-y-1 text-xs">
                              {presc.items.filter((i: any) => i.recommendation_level === 'prioritize').map((i: any) => (
                                <div key={i.food_id} className="font-medium text-emerald-950">
                                  • {i.food_name} <span className="text-[10px] text-emerald-700/70">({i.custom_prep_notes || 'Geral'})</span>
                                </div>
                              ))}
                              {presc.items.filter((i: any) => i.recommendation_level === 'prioritize').length === 0 && <span className="text-[10px] text-outline italic">Nenhum</span>}
                            </div>
                          </div>

                          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                            <span className="text-[10px] font-bold text-amber-800 block mb-2">💛 MODERAR</span>
                            <div className="space-y-1 text-xs">
                              {presc.items.filter((i: any) => i.recommendation_level === 'moderate').map((i: any) => (
                                <div key={i.food_id} className="font-medium text-amber-950">
                                  • {i.food_name}
                                </div>
                              ))}
                              {presc.items.filter((i: any) => i.recommendation_level === 'moderate').length === 0 && <span className="text-[10px] text-outline italic">Nenhum</span>}
                            </div>
                          </div>

                          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                            <span className="text-[10px] font-bold text-rose-800 block mb-2">🔴 EVITAR</span>
                            <div className="space-y-1 text-xs">
                              {presc.items.filter((i: any) => i.recommendation_level === 'avoid').map((i: any) => (
                                <div key={i.food_id} className="font-medium text-rose-950">
                                  • {i.food_name}
                                </div>
                              ))}
                              {presc.items.filter((i: any) => i.recommendation_level === 'avoid').length === 0 && <span className="text-[10px] text-outline italic">Nenhum</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Adesão & Evolução */}
                      {(presc.adherence || presc.evolution_notes) && (
                        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 text-xs text-on-surface space-y-1.5">
                          <div>
                            <span className="font-bold text-[10px] text-outline block">ADESÃO DO PACIENTE</span>
                            <span className="font-semibold text-primary">{presc.adherence}</span>
                          </div>
                          {presc.evolution_notes && (
                            <div>
                              <span className="font-bold text-[10px] text-outline block">NOTAS DE EVOLUÇÃO</span>
                              <p className="italic text-on-surface-variant font-medium mt-0.5">"{presc.evolution_notes}"</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Edição de Adesão */}
                      {editingPrescriptionId === presc.id && (
                        <div className="p-6 bg-surface-container-high rounded-2xl border border-outline-variant/15 space-y-4">
                          <span className="text-xs font-bold text-on-surface block">Registrar Acompanhamento da Conduta</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-outline block">ADESÃO ATUAL</label>
                              <select
                                value={adherence}
                                onChange={e => setAdherence(e.target.value)}
                                className="w-full p-2.5 bg-white border border-outline-variant/15 rounded-lg text-xs font-bold"
                              >
                                <option value="Muito Alta (100%)">Muito Alta (100%)</option>
                                <option value="Boa (75%)">Boa (75%)</option>
                                <option value="Regular (50%)">Regular (50%)</option>
                                <option value="Baixa (<25%)">Baixa (&lt;25%)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-outline block">EVOLUÇÃO CLÍNICA / FEEDBACK</label>
                              <input
                                type="text"
                                value={evolutionText}
                                onChange={e => setEvolutionText(e.target.value)}
                                className="w-full p-2.5 bg-white border border-outline-variant/15 rounded-lg text-xs"
                                placeholder="Ex: Redução do inchaço, melhor disposição intestinal..."
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 text-xs font-bold">
                            <button onClick={() => setEditingPrescriptionId(null)} className="px-4 py-2 border rounded-lg hover:bg-white transition-all">Cancelar</button>
                            <button onClick={() => handleUpdateAdherence(presc.id)} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-container shadow transition-all">Salvar Notas</button>
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-outline-variant/20 italic text-outline text-xs font-semibold">
                  Nenhuma orientação dietoterápica emitida para este paciente.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'galeria' && (
          <motion.div key="galeria" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <PatientGalleryView 
              patientId={patient.id} 
              patientName={patient.name} 
              canCreate={canCreateConsultation} 
              canDelete={canEditPatient} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diet Builder Modal */}
      {isDietBuilderOpen && (
        <DietBuilderModal 
          onClose={() => setIsDietBuilderOpen(false)}
          preloadedEval={preloadedEval}
          onSave={async (presc) => {
            try {
              presc.patient_id = patient.id;
              presc.patient_name = patient.name;
              const saved = await dietotherapyService.savePrescription(presc);
              setPrescriptions(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
              setIsDietBuilderOpen(false);
              alert('Orientação dietética criada com sucesso!');
            } catch (e: any) {
              alert(e.message || 'Erro ao salvar orientação.');
            }
          }}
          user={user}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isDeleteConfirmOpen} 
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPackageToDeleteId(null);
        }}
        onConfirm={async () => {
          if (packageToDeleteId) {
            await onDeletePackage?.(packageToDeleteId);
            setPackageToDeleteId(null);
          }
        }}
        title="Excluir Pacote?"
        message="Esta ação irá remover permanentemente o pacote e seus lançamentos financeiros pendentes. Sessões já realizadas não serão afetadas."
        confirmText="Sim, Excluir"
        type="danger"
      />
    </div>
  );
}
