'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, User, CreditCard, ShieldCheck, AlertCircle, Info, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getInitials } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { InsurancePlan, Insurer } from '@/types/billing';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  maritalStatus: string;
  profession: string;
  status: 'Ativo' | 'Inativo';
  lastVisit: string;
  avatar: string;
  cpf?: string;
  birthDate?: string;
  // Insurance data
  insurerId?: string;
  insurancePlanName?: string;
  insuranceSubplan?: string;
  insurancePlanId?: string;
  insuranceCardNumber?: string;
  insuranceValidity?: string;
  metadata?: any;
}

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patientData: any) => void;
  editingPatient: Patient | null;
}

export default function PatientModal({ isOpen, onClose, onSave, editingPatient }: PatientModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [isNewInsurerModalOpen, setIsNewInsurerModalOpen] = useState(false);
  const [newInsurerName, setNewInsurerName] = useState('');
  const [isSavingInsurer, setIsSavingInsurer] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Feminino',
    phone: '',
    email: '',
    address: '',
    maritalStatus: 'Solteiro(a)',
    profession: '',
    status: 'Ativo' as 'Ativo' | 'Inativo',
    avatar: '',
    cpf: '',
    birthDate: '',
    // Insurance
    insurerId: '',
    insurancePlanName: '',
    insuranceSubplan: '',
    insurancePlanId: '',
    insuranceCardNumber: '',
    insuranceValidity: '',
    metadata: {} as any
  });

  useEffect(() => {
    const fetchInsurers = async () => {
      if (!supabase) return;
      const { data } = await (supabase as any)
        .from('insurers')
        .select('*')
        .order('name');
      if (data) setInsurers(data as any[]);
    };

    if (isOpen) {
      fetchInsurers();
      setFormData({
        name: editingPatient?.name || '',
        age: editingPatient?.age?.toString() || '',
        gender: editingPatient?.gender || 'Feminino',
        phone: editingPatient?.phone || '',
        email: editingPatient?.email || '',
        address: editingPatient?.address || '',
        maritalStatus: editingPatient?.maritalStatus || 'Solteiro(a)',
        profession: editingPatient?.profession || '',
        status: editingPatient?.status || 'Ativo' as 'Ativo' | 'Inativo',
        avatar: editingPatient?.avatar || '',
        cpf: editingPatient?.cpf || '',
        birthDate: (editingPatient as any)?.birth_date || editingPatient?.birth_date || '',
        insurerId: editingPatient?.insurerId || '',
        insurancePlanName: editingPatient?.insurancePlanName || '',
        insuranceSubplan: editingPatient?.insuranceSubplan || '',
        insurancePlanId: editingPatient?.insurancePlanId || '',
        insuranceCardNumber: editingPatient?.insuranceCardNumber || '',
        insuranceValidity: editingPatient?.insuranceValidity || '',
        metadata: editingPatient?.metadata || {}
      });
    }
  }, [isOpen, editingPatient]);

  const handleSaveNewInsurer = async () => {
    if (!newInsurerName.trim() || !supabase) return;
    setIsSavingInsurer(true);
    try {
      const { data, error } = await (supabase as any)
        .from('insurers')
        .insert([{ name: newInsurerName.trim() }])
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        setInsurers(prev => [...prev, data].sort((a: any,b: any) => a.name.localeCompare(b.name)));
        setFormData(prev => ({ ...prev, insurerId: data.id }));
        setIsNewInsurerModalOpen(false);
        setNewInsurerName('');
      }
    } catch (e: any) {
      console.error(e);
      alert('Erro ao criar operadora.');
    } finally {
      setIsSavingInsurer(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const age = parseInt(formData.age);
    if (isNaN(age)) {
      alert('Por favor, insira uma idade válida.');
      return;
    }

    setIsSaving(true);
    try {
      let finalPlanId = formData.insurancePlanId;
      
      // Lazy Create Plan
      if (formData.insurerId && formData.insurancePlanName && supabase) {
        const planFullName = formData.insuranceSubplan 
          ? `${formData.insurancePlanName} - ${formData.insuranceSubplan}` 
          : formData.insurancePlanName;
          
        const { data: existing } = await (supabase as any).from('insurance_plans')
          .select('id')
          .eq('insurer_id', formData.insurerId)
          .eq('name', planFullName)
          .single();

        if (existing) {
          finalPlanId = existing.id;
        } else {
          const { data: newPlan } = await (supabase as any).from('insurance_plans')
            .insert([{ insurer_id: formData.insurerId, name: planFullName }])
            .select()
            .single();
          if (newPlan) finalPlanId = newPlan.id;
        }
      }

      await onSave({
        ...formData,
        cpf: formData.cpf.replace(/\D/g, ''), // Salva limpo no banco
        insurancePlanId: finalPlanId,
        age: age,
        birth_date: formData.birthDate || null,
      });
    } catch (error: any) {
      console.error('PatientModal: Error saving patient:', error);
      alert(error.message || 'Erro ao salvar paciente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div key="patient-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full h-full md:h-auto max-h-[100dvh] md:max-h-[90vh] md:max-w-2xl rounded-none md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
              <h3 className="text-2xl font-bold font-headline text-on-surface">
                {editingPatient ? 'Editar Paciente' : 'Novo Cadastro'}
              </h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-surface-container-low rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 md:p-8 flex-1 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Photo Upload Section */}
              <div className="flex flex-col items-center justify-center pb-6">
                <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border border-primary/20">
                  {getInitials(formData.name)}
                </div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest mt-4">Avatar Automático</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    placeholder="Ex: Maria Silva"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">CPF</label>
                  <input 
                    required
                    type="text" 
                    value={formData.cpf}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 11) val = val.slice(0, 11);
                      if (val.length > 9) val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                      else if (val.length > 6) val = val.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
                      else if (val.length > 3) val = val.replace(/(\d{3})(\d{3})/, "$1.$2");
                      setFormData({...formData, cpf: val});
                    }}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Data de Nascimento</label>
                    <input 
                      required
                      type="date" 
                      value={formData.birthDate}
                      onChange={e => {
                        const newDate = e.target.value;
                        const newAge = calculateAge(newDate);
                        setFormData({...formData, birthDate: newDate, age: newAge});
                      }}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Idade</label>
                    <input 
                      readOnly
                      type="number" 
                      value={formData.age}
                      className="w-full px-5 py-4 bg-surface-container-high rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium cursor-not-allowed opacity-80"
                      placeholder="--"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Gênero</label>
                    <select 
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                    >
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Telefone</label>
                  <input 
                    required
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">E-mail</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-outline uppercase tracking-widest">Endereço Completo</label>
                <input 
                  required
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  placeholder="Ex: Rua das Flores, 123 - São Paulo, SP"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Estado Civil</label>
                  <select 
                    value={formData.maritalStatus}
                    onChange={e => setFormData({...formData, maritalStatus: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="União Estável">União Estável</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Profissão</label>
                  <input 
                    required
                    type="text" 
                    value={formData.profession}
                    onChange={e => setFormData({...formData, profession: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    placeholder="Ex: Designer"
                  />
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-2">
                  <ShieldCheck size={18} className="text-primary" />
                  <h4 className="text-sm font-black text-on-surface uppercase tracking-wider">Informações de Convênio</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Operadora</label>
                    <div className="flex gap-2">
                      <div className="relative group flex-1">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={18} />
                        <select 
                          value={formData.insurerId}
                          onChange={e => setFormData({...formData, insurerId: e.target.value})}
                          className="w-full pl-12 pr-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                        >
                          <option value="">Particular / Nenhuma</option>
                          {insurers.map((insurer, idx) => (
                            <option key={insurer.id || `ins-${idx}`} value={insurer.id}>{insurer.name}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                         type="button" 
                         onClick={() => setIsNewInsurerModalOpen(true)}
                         className="px-4 bg-surface-container-low border border-outline-variant/10 rounded-xl hover:bg-primary/5 text-primary transition-colors"
                      >
                         <Plus size={20} />
                      </button>
                    </div>
                  </div>
                  
                  {formData.insurerId && (
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome do Plano</label>
                          <input 
                            type="text" 
                            value={formData.insurancePlanName}
                            onChange={e => setFormData({...formData, insurancePlanName: e.target.value})}
                            className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                            placeholder="Ex: Ideal, Preferencial"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-outline uppercase tracking-widest">Subplano</label>
                          <input 
                            type="text" 
                            value={formData.insuranceSubplan}
                            onChange={e => setFormData({...formData, insuranceSubplan: e.target.value})}
                            className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                            placeholder="Ex: S380 Enfermaria"
                          />
                        </div>
                     </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Nº Carteirinha</label>
                    <input 
                      type="text" 
                      value={formData.insuranceCardNumber}
                      onChange={e => setFormData({...formData, insuranceCardNumber: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      placeholder="0000000..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Validade</label>
                    <input 
                      type="date" 
                      value={formData.insuranceValidity}
                      onChange={e => setFormData({...formData, insuranceValidity: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                </div>

                {formData.insurerId && !formData.insuranceCardNumber && (
                   <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-[10px] font-bold border border-amber-200 animate-in fade-in slide-in-from-top-1">
                      <AlertCircle size={14} />
                      Lembre-se de preencher o número da carteirinha para evitar pendências no faturamento.
                   </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-outline uppercase tracking-widest">Status do Cadastro</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as 'Ativo' | 'Inativo'})}
                  className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              {/* Dynamic Metadata Section */}
              {formData.metadata && Object.keys(formData.metadata).length > 0 && (
                <div className="space-y-6 pt-4 border-t border-outline-variant/10">
                  <div className="flex items-center gap-2 pb-2">
                    <Info size={18} className="text-primary" />
                    <h4 className="text-sm font-black text-on-surface uppercase tracking-wider">Informações Adicionais (Planilha)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(formData.metadata).map(([key, value], index) => (
                      <div key={key || `meta-${index}`} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/5">
                        <label className="text-[10px] font-black text-outline uppercase tracking-widest block mb-1">{key}</label>
                        <p className="text-sm font-bold text-on-surface truncate">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              </div>

              <div className="p-6 md:p-8 border-t border-outline-variant/10 bg-slate-50/50 flex gap-4 shrink-0">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl border border-outline-variant/20 font-bold text-outline hover:bg-surface-container-low transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className={`flex-1 py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check size={20} />
                  )}
                  {isSaving ? 'Salvando...' : (editingPatient ? 'Atualizar Cadastro' : 'Salvar Cadastro')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isNewInsurerModalOpen && (
        <div key="new-insurer-modal-overlay" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm m-4">
            <h4 className="font-bold text-lg mb-4 text-on-surface">Nova Operadora</h4>
            <input 
              type="text"
              value={newInsurerName}
              onChange={e => setNewInsurerName(e.target.value)}
              placeholder="Nome da Operadora (ex: Bradesco, Amil)"
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20 mb-4 outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setIsNewInsurerModalOpen(false)}
                className="flex-1 py-3 text-outline font-bold hover:bg-surface-container-low rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleSaveNewInsurer}
                disabled={!newInsurerName.trim() || isSavingInsurer}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50 transition-all flex justify-center items-center"
              >
                {isSavingInsurer ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AnimatePresence>
  );
}
