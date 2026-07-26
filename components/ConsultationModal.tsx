'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  MapPin, 
  FileText, 
  Trash2, 
  Save, 
  Plus, 
  Check, 
  TrendingUp, 
  Stethoscope, 
  Clipboard, 
  Activity,
  AlertCircle,
  Play, 
  Square, 
  Minus, 
  Package,
  ShieldCheck,
  CreditCard,
  Hash,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Procedure, InsurancePlan } from '@/types/billing';
import { PatientAttachment } from '@/types/attachments';
import { attachmentService } from '@/lib/attachmentService';
import PhotoUploaderModal from './attachments/PhotoUploaderModal';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  patient: any;
  activeConsultation?: any;
  editingConsultation?: any;
  inventoryItems: any[];
  specialties?: any[];
  isUnscheduledCandidate?: boolean;
  requireExtraConsultationConfirm?: boolean;
  isPackageSession?: boolean;
}

type ConsultationStatus = 'idle' | 'running' | 'finished';

export default function ConsultationModal({ 
  isOpen, 
  onClose, 
  onSave, 
  patient,
  activeConsultation,
  editingConsultation,
  inventoryItems,
  specialties = [],
  isUnscheduledCandidate = false,
  requireExtraConsultationConfirm = true,
  isPackageSession = false
}: ConsultationModalProps) {
  const [status, setStatus] = useState<ConsultationStatus>(() => {
    if (editingConsultation) return 'finished';
    if (activeConsultation) return 'running';
    return 'idle';
  });

  const [startTime, setStartTime] = useState(editingConsultation?.startTime || activeConsultation?.startTime || null);
  const [endTime, setEndTime] = useState(editingConsultation?.endTime || '');
  const [notes, setNotes] = useState(editingConsultation?.notes || activeConsultation?.notes || '');
  const [specialty, setSpecialty] = useState(editingConsultation?.type || activeConsultation?.type || (specialties.length > 0 ? specialties[0].name : 'Auriculoterapia'));
  const [usedMaterials, setUsedMaterials] = useState<any[]>(editingConsultation?.materials_used || []);
  const [hasConfirmedExtra, setHasConfirmedExtra] = useState(false);
  const [showExtraConfirmUI, setShowExtraConfirmUI] = useState(false);
  
  // Billing fields
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedProcedureId, setSelectedProcedureId] = useState(editingConsultation?.procedureId || '');
  const [guiaNumber, setGuiaNumber] = useState(editingConsultation?.guiaNumber || '');
  const [authCode, setAuthCode] = useState(editingConsultation?.authCode || '');
  const [isInsuranceConsultation, setIsInsuranceConsultation] = useState(!!patient?.insurancePlanId);
  // Attachments / Photos fields
  const [sessionAttachments, setSessionAttachments] = useState<PatientAttachment[]>([]);
  const [isPhotoUploaderOpen, setIsPhotoUploaderOpen] = useState(false);

  const fetchSessionAttachments = React.useCallback(async () => {
    if (!patient?.id) return;
    const constId = activeConsultation?.id || editingConsultation?.id;
    const list = await attachmentService.getPatientAttachments(patient.id, constId);
    setSessionAttachments(list);
  }, [patient?.id, activeConsultation?.id, editingConsultation?.id]);

  useEffect(() => {
    if (isOpen && patient?.id) {
      fetchSessionAttachments();
    }
  }, [isOpen, patient?.id, fetchSessionAttachments]);

  useEffect(() => {
    const fetchProcedures = async () => {
      if (!supabase) return;
      const { data } = await (supabase as any).from('procedures').select('*').order('name');
      if (data) setProcedures(data);
    };
    if (isOpen) {
      fetchProcedures();
      setIsInsuranceConsultation(!!patient?.insurancePlanId);
      // If patient has insurance, try to auto-select a procedure if only one exists or if it's editing
      if (editingConsultation) {
        setSelectedProcedureId(editingConsultation.procedureId || '');
        setGuiaNumber(editingConsultation.guiaNumber || '');
        setAuthCode(editingConsultation.authCode || '');
      }
    }
  }, [isOpen, patient, editingConsultation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [elapsedTime, setElapsedTime] = useState(() => {
    if (editingConsultation && editingConsultation.startTime && editingConsultation.endTime) {
      const start = new Date(editingConsultation.startTime).getTime();
      const end = new Date(editingConsultation.endTime).getTime();
      const diff = Math.floor((end - start) / 1000);
      return isNaN(diff) ? 0 : diff;
    }
    if (activeConsultation && activeConsultation.startTime) {
      const start = new Date(activeConsultation.startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      return isNaN(diff) ? 0 : diff;
    }
    return 0;
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'running' && isOpen) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, isOpen]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (isUnscheduledCandidate && requireExtraConsultationConfirm && !hasConfirmedExtra) {
      setShowExtraConfirmUI(true);
      return;
    }
    const now = new Date().toISOString();
    setStartTime(now);
    setStatus('running');
    setElapsedTime(0);
  };

  const handleConfirmExtra = () => {
    setHasConfirmedExtra(true);
    setShowExtraConfirmUI(false);
    
    // Start consultation immediately after confirmation
    const now = new Date().toISOString();
    setStartTime(now);
    setStatus('running');
    setElapsedTime(0);
  };

  const handleFinish = () => {
    const now = new Date().toISOString();
    setEndTime(now);
    setStatus('finished');
  };

  const handleSave = () => {
    // Se ainda estiver rodando (caso improvável pelo fluxo da UI), marcamos o fim agora ao salvar
    const finalEndTime = endTime || new Date().toISOString();
    
    onSave({
      startTime: startTime || new Date().toISOString(),
      endTime: finalEndTime,
      notes,
      type: specialty,
      materials_used: usedMaterials,
      patientId: patient.id,
      id: editingConsultation?.id,
      is_unscheduled: isUnscheduledCandidate,
      // Billing integration
      procedureId: selectedProcedureId,
      guiaNumber,
      authCode,
      isInsurance: isInsuranceConsultation
    });
    
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              role="dialog"
              aria-modal="true"
              aria-labelledby="consultation-modal-title"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl rounded-none md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low">
                <div>
                  <h3 id="consultation-modal-title" className="text-2xl font-bold font-headline text-on-surface">
                    {editingConsultation ? 'Editar Consulta' : status === 'finished' ? 'Consulta Finalizada' : status === 'running' ? 'Consulta em Andamento' : 'Nova Consulta'}
                  </h3>
                  <p className="text-xs font-bold text-outline uppercase tracking-widest mt-1">
                    Paciente: {patient.name}
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white rounded-full transition-all shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* Timer Display */}
                <div className={`rounded-[2rem] p-8 flex flex-col items-center justify-center border transition-all duration-500 ${
                  status === 'running' ? 'bg-primary/10 border-primary/20 scale-[1.02]' : 
                  status === 'finished' ? 'bg-emerald-50 border-emerald-100' :
                  'bg-surface-container-low border-outline-variant/10'
                }`}>
                  <div className={`flex items-center gap-3 mb-2 ${status === 'running' ? 'text-primary' : 'text-outline'}`}>
                    <Clock size={20} className={status === 'running' ? 'animate-pulse' : ''} />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {status === 'finished' ? 'Duração Final' : 'Tempo Decorrido'}
                    </span>
                  </div>
                  <div className={`text-5xl font-mono font-bold tracking-tighter ${
                    status === 'running' ? 'text-primary' : 
                    status === 'finished' ? 'text-emerald-600' : 
                    'text-outline-variant'
                  }`}>
                    {formatTime(elapsedTime)}
                  </div>
                  
                  {startTime && (
                    <div className="flex gap-4 mt-6">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Início</p>
                        <p className="text-sm font-bold text-on-surface">
                          {new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-outline-variant/30" />
                      {status === 'finished' && (
                        <>
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Fim</p>
                            <p className="text-sm font-bold text-on-surface">
                              {new Date(endTime || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="w-px h-8 bg-outline-variant/30" />
                        </>
                      )}
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Data</p>
                        <p className="text-sm font-bold text-on-surface">
                          {new Date(startTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {status === 'idle' && (
                    <p className="text-[10px] text-outline-variant mt-4 font-medium italic">Clique no botão abaixo para iniciar o atendimento.</p>
                  )}
                  
                  {isUnscheduledCandidate && status === 'idle' && (
                    <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3">
                      <AlertCircle size={18} className="text-rose-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-rose-700 uppercase tracking-widest">Consulta Extra</p>
                        <p className="text-[10px] text-rose-600 font-medium">Este paciente não possui agendamento para hoje.</p>
                      </div>
                    </div>
                  )}

                  {isPackageSession && (
                    <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
                      <Plus size={18} className="text-primary" />
                      <div>
                        <p className="text-xs font-bold text-primary uppercase tracking-widest leading-none">Sessão de Pacote</p>
                        <p className="text-[10px] text-on-surface-variant font-medium mt-1">Esta consulta não gera cobrança adicional.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Especialidade</label>
                    <select 
                      value={specialty}
                      onChange={e => setSpecialty(e.target.value)}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none transition-all"
                    >
                      {specialties.length > 0 ? (
                        specialties.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Auriculoterapia">Auriculoterapia</option>
                          <option value="Acupuntura Sistêmica">Acupuntura Sistêmica</option>
                          <option value="Avaliação Inicial">Avaliação Inicial</option>
                          <option value="Retorno">Retorno</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Billing / Insurance Section */}
                  <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                    <div className="flex items-center justify-between">
                      <label 
                        className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${isInsuranceConsultation ? 'text-primary' : 'text-outline'}`}
                      >
                        <ShieldCheck size={14} /> Atendimento via Convênio
                      </label>
                      <button 
                        type="button"
                        onClick={() => setIsInsuranceConsultation(!isInsuranceConsultation)}
                        className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${
                          isInsuranceConsultation 
                            ? 'bg-primary/10 border-primary/20 text-primary' 
                            : 'bg-surface-container-low border-outline-variant/20 text-outline'
                        }`}
                      >
                        {isInsuranceConsultation ? 'Ativado' : 'Ativar'}
                      </button>
                    </div>

                    <AnimatePresence>
                      {isInsuranceConsultation && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          {patient?.insurancePlanId ? (
                            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-3">
                              <CreditCard size={16} className="text-primary" />
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest leading-none mb-1">Convênio do Paciente</p>
                                <p className="text-xs font-bold text-on-surface">
                                  {patient.insuranceCardNumber || 'Sem carteirinha'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3 text-amber-700">
                              <AlertCircle size={16} />
                              <p className="text-[10px] font-bold">Paciente sem convênio vinculado. Informe os dados abaixo para faturar avulso.</p>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-1.5">
                              Procedimento (TUSS)
                            </label>
                            <select 
                              value={selectedProcedureId}
                              onChange={e => setSelectedProcedureId(e.target.value)}
                              className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium text-sm appearance-none"
                            >
                              <option value="">Selecionar procedimento...</option>
                              {procedures.map(proc => (
                                <option key={proc.id} value={proc.id}>
                                  {proc.code} - {proc.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-1.5">
                                <Hash size={12} /> Nº Guia
                              </label>
                              <input 
                                type="text"
                                value={guiaNumber}
                                onChange={e => setGuiaNumber(e.target.value)}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium text-sm"
                                placeholder="00000..."
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-1.5">
                                Cod. Autorização
                              </label>
                              <input 
                                type="text"
                                value={authCode}
                                onChange={e => setAuthCode(e.target.value)}
                                className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium text-sm"
                                placeholder="00000..."
                              />
                            </div>
                          </div>
                          
                          {(!guiaNumber || !authCode) && (
                            <p className="text-[9px] text-amber-600 font-bold flex items-center gap-1 px-1">
                              <AlertCircle size={10} /> O item será salvo como RASCUNHO na fila de faturamento.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Notas da Sessão</label>
                    <textarea 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium min-h-[120px] resize-none transition-all"
                      placeholder="Descreva a evolução, pontos utilizados ou observações..."
                    />
                  </div>

                  {/* Materials Section */}
                  <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-2">
                        <Package size={14} /> Materiais Utilizados
                      </label>
                      <button 
                        onClick={() => setUsedMaterials([...usedMaterials, { itemId: '', quantity: 1 }])}
                        className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> Adicionar
                      </button>
                    </div>

                    <div className="space-y-3">
                      {usedMaterials.map((material, index) => (
                        <div key={index} className="flex gap-3 items-center">
                          <select 
                            value={material.itemId}
                            onChange={(e) => {
                              const newList = [...usedMaterials];
                              const selectedItem = inventoryItems.find(i => i.id === e.target.value);
                              newList[index] = {
                                ...newList[index],
                                itemId: e.target.value,
                                itemName: selectedItem?.name || ''
                              };
                              setUsedMaterials(newList);
                            }}
                            className="flex-1 min-w-0 px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none text-sm font-medium"
                          >
                            <option value="">Selecionar item...</option>
                            {inventoryItems.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.quantity} {item.unit})
                              </option>
                            ))}
                          </select>
                          <div className="flex flex-col items-center">
                            <input 
                              type="number" 
                              min="1"
                              value={material.quantity}
                              onChange={(e) => {
                                const newList = [...usedMaterials];
                                newList[index].quantity = parseInt(e.target.value) || 1;
                                setUsedMaterials(newList);
                              }}
                              className="w-16 px-2 py-3 bg-white rounded-xl border border-outline-variant/20 outline-none text-sm font-bold text-center shadow-sm"
                            />
                            <span className="text-[8px] font-bold text-outline-variant uppercase mt-1">Qtde</span>
                          </div>
                          <button 
                            onClick={() => setUsedMaterials(usedMaterials.filter((_, i) => i !== index))}
                            className="p-2 text-outline hover:text-rose-500 transition-all flex-shrink-0"
                          >
                            <Minus size={18} />
                          </button>
                        </div>
                      ))}
                      {usedMaterials.length === 0 && (
                        <p className="text-[10px] text-outline-variant italic">Nenhum material registrado para esta sessão.</p>
                      )}
                    </div>
                  </div>

                  {/* Photos / Visual Registration Section */}
                  <div className="space-y-4 pt-4 border-t border-outline-variant/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-2">
                        <Camera size={14} className="text-purple-600" /> Registro Visual (Auriculoterapia / Língua)
                      </label>
                      <button 
                        type="button"
                        onClick={() => setIsPhotoUploaderOpen(true)}
                        className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Camera size={13} /> Tirar / Anexar Foto
                      </button>
                    </div>

                    {sessionAttachments.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {sessionAttachments.map((att) => (
                          <div key={att.id} className="relative rounded-2xl overflow-hidden border border-outline-variant/15 group bg-slate-900 h-24 flex items-center justify-center">
                            <img src={att.url} alt={att.title || 'Foto da Sessão'} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                              <span className="text-[9px] font-bold text-white line-clamp-2">{att.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-outline-variant italic">
                        Nenhuma foto anexada a esta sessão (ex: foto da orelha ou língua).
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-6 md:p-8 border-t border-outline-variant/10 bg-surface-container-low/30 flex gap-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl border border-outline-variant/20 font-bold text-outline hover:bg-surface-container-low transition-all"
                >
                  Cancelar
                </button>
                
                {status === 'idle' ? (
                  <button 
                    onClick={handleStart}
                    className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={20} /> Iniciar Consulta
                  </button>
                ) : status === 'running' ? (
                  <button 
                    onClick={handleFinish}
                    className="flex-1 py-4 rounded-2xl bg-amber-500 text-white font-bold shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Square size={20} /> Finalizar Consulta
                  </button>
                ) : (
                  <button 
                    onClick={() => handleSave()}
                    className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={20} /> Salvar e Concluir (OK)
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Extra Consultation Confirmation Modal */}
      <AnimatePresence>
        {showExtraConfirmUI && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExtraConfirmUI(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8 space-y-6"
            >
              <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <AlertCircle size={40} />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold font-headline text-on-surface">Consulta Extra</h3>
                <p className="text-on-surface-variant font-medium">
                  Este paciente não possui um agendamento prévio para hoje no sistema.
                </p>
              </div>

              <label className="flex items-start gap-3 p-5 bg-surface-container-low rounded-2xl border border-outline-variant/10 cursor-pointer hover:bg-surface-container-high transition-all group">
                <div className="pt-0.5">
                  <input 
                    type="checkbox" 
                    checked={hasConfirmedExtra}
                    onChange={e => setHasConfirmedExtra(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-outline-variant text-primary focus:ring-primary/20 transition-all cursor-pointer"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">Confirmar atendimento não agendado</p>
                  <p className="text-[10px] text-outline-variant font-medium mt-1 uppercase tracking-widest">Isso será registrado nos relatórios de produtividade.</p>
                </div>
              </label>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setShowExtraConfirmUI(false)}
                  className="flex-1 py-4 rounded-2xl border border-outline-variant/20 font-bold text-outline hover:bg-surface-container-low transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmExtra}
                  disabled={!hasConfirmedExtra}
                  className="flex-[2] py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                >
                  Iniciar Atendimento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Photo Uploader Modal */}
      {isPhotoUploaderOpen && patient && (
        <PhotoUploaderModal
          patientId={patient.id}
          consultationId={activeConsultation?.id || editingConsultation?.id}
          defaultCategory="auriculotherapy"
          onClose={() => setIsPhotoUploaderOpen(false)}
          onSuccess={() => {
            fetchSessionAttachments();
          }}
        />
      )}
    </div>
  );
}
