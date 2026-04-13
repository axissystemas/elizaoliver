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
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User } from '@/types/auth';
import ConfirmationModal from './ConfirmationModal';

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
  const [notes, setNotes] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [packageToDeleteId, setPackageToDeleteId] = useState<string | null>(null);
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'historico' | 'pacotes'>('geral');

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
      doc.setFontSize(16);
      doc.text('Anamnese e Histórico Clínico', 14, currentY);
      
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Categoria', 'Detalhes']],
        body: [
          ['Anamnese (Cód)', latestEvaluation?.code || 'N/A'],
          ['Queixa Principal', latestEvaluation?.mainComplaint || 'N/A'],
          ['Sono', latestEvaluation?.sleep ? `${latestEvaluation.sleep.hours}h, ${latestEvaluation.sleep.restorative ? 'Repousante' : 'Não repousante'}` : 'N/A'],
          ['Apetite/Digestão', latestEvaluation?.appetite ? `Apetite ${latestEvaluation.appetite.level}${latestEvaluation.appetite.fullness ? ', Plenitude' : ''}` : 'N/A'],
          ['Língua', latestEvaluation?.tonguePulse ? `${latestEvaluation.tonguePulse.color}, ${latestEvaluation.tonguePulse.shape}, ${latestEvaluation.tonguePulse.coating}` : 'N/A'],
          ['Pulso', latestEvaluation?.tonguePulse?.pulse || 'N/A'],
          ['Hipótese Diagnóstica', latestEvaluation?.syndromeHypothesis || 'N/A']
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 82, 56] },
      });
      
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
                <a href={`tel:${patient.phone}`} className="flex items-center gap-2 text-xs font-bold text-primary hover:underline">
                  <Phone size={14} /> {patient.phone}
                </a>
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
        <div className="flex gap-4 no-print">
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
      <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-[2rem] w-fit no-print">
        {['geral', 'historico', 'pacotes'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-8 py-3 rounded-[1.5rem] text-sm font-bold transition-all ${
              activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-primary'
            }`}
          >
            {tab === 'geral' ? 'Resumo Clínico' : tab === 'historico' ? 'Consultas' : 'Pacotes'}
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
                       <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-black">{latestEvaluation?.code || '#EV-0000'}</span>
                    </div>
                    <p className="text-on-surface font-medium leading-relaxed">{latestEvaluation?.mainComplaint || "Nenhuma avaliação."}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mt-6">
                    <div className="bg-surface-container-low p-6 rounded-2xl">
                      <label className="text-[10px] font-bold text-primary uppercase">Sono</label>
                      <p className="text-sm font-medium">{latestEvaluation?.sleep ? `${latestEvaluation.sleep.hours}h, ${latestEvaluation.sleep.restorative ? 'Repousante' : 'Não'}` : 'N/A'}</p>
                    </div>
                    <div className="bg-surface-container-low p-6 rounded-2xl">
                      <label className="text-[10px] font-bold text-primary uppercase">Digestão</label>
                      <p className="text-sm font-medium">{latestEvaluation?.appetite ? `Apetite ${latestEvaluation.appetite.level}` : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
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
                </div>
              </div>
              <div className="col-span-12 lg:col-span-4">
                 <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-outline-variant/10">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-outline mb-8">Tratamento Inicial</h3>
                  <p className="text-sm font-bold text-on-surface">{latestEvaluation?.initialTreatment || "N/A"}</p>
                </div>
              </div>
            </div>

            <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-outline-variant/10">
              <h3 className="text-2xl font-bold font-headline mb-8">Notas de Evolução</h3>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[180px] bg-surface-container-low border-none rounded-[2rem] p-8 text-base text-on-surface focus:ring-2 focus:ring-primary/10" placeholder="Evolução do paciente..." />
              <div className="flex justify-end mt-4">
                <button className="p-3 bg-primary text-white rounded-2xl shadow-lg hover:scale-110 transition-all"><SaveIcon size={20} /></button>
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
                        "{c.notes}"
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
      </AnimatePresence>

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
