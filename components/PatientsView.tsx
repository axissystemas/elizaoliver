'use client';

import React, { useState } from 'react';
import { 
  Search, 
  User, 
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  UserPlus,
  FileText,
  Package,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getInitials } from '@/lib/utils';
import { openWhatsApp, WhatsAppTemplates } from '@/lib/whatsapp';

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
  hasActivePackage?: boolean;
}

import { User as UserType } from '@/types/auth';

export default function PatientsView({ 
  patients,
  setPatients,
  onNewAppointment, 
  onOpenEvaluations,
  onOpenDetail,
  onOpenPatientModal,
  onDeletePatient,
  user
}: { 
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  onNewAppointment?: () => void;
  onOpenEvaluations?: (patientId: string) => void;
  onOpenDetail?: (patient: Patient) => void;
  onOpenPatientModal?: (patient?: Patient) => void;
  onDeletePatient?: (id: string) => Promise<void>;
  user: UserType | null;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivePackage, setFilterActivePackage] = useState(false);

  const canCreate = user?.permissions.includes('patients:create') || user?.role === 'ADMIN';
  const canEdit = user?.permissions.includes('patients:edit') || user?.role === 'ADMIN';
  const canDelete = user?.permissions.includes('patients:delete') || user?.role === 'ADMIN';

  const handleOpenModal = (patient?: Patient) => {
    if (patient) {
      if (!canEdit) return;
      onOpenPatientModal?.(patient);
    } else {
      if (!canCreate) return;
      onOpenPatientModal?.();
    }
  };

  const handleDelete = async (id: string) => {
    if (onDeletePatient) {
      await onDeletePatient(id);
    } else {
      setPatients(prev => prev.filter(p => p.id !== id));
    }
  };

  const filteredPatients = patients.filter(p => {
    const name = p.name || '';
    const email = p.email || '';
    const profession = p.profession || '';
    const search = searchTerm.toLowerCase();
    
    const matchesSearch = name.toLowerCase().includes(search) ||
           email.toLowerCase().includes(search) ||
           profession.toLowerCase().includes(search);

    const matchesPackageFilter = !filterActivePackage || p.hasActivePackage === true;

    return matchesSearch && matchesPackageFilter;
  });

  const activePackageCount = patients.filter(p => p.hasActivePackage).length;

  return (
    <div className="p-10 space-y-10 relative">
      {/* Header */}
      <section className="flex flex-col md:flex-row gap-8 items-start justify-between">
        <div>
          <h2 className="text-4xl font-bold font-headline text-on-surface">Gestão de Pacientes</h2>
          <p className="text-on-surface-variant text-lg mt-2 font-medium">Visualize e gerencie o histórico clínico de seus pacientes.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onNewAppointment}
            className="px-8 py-4 rounded-2xl text-sm font-bold bg-secondary-container text-on-secondary-container shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
          >
            <Calendar size={20} /> Agendar Consulta
          </button>
          {canCreate && (
            <button 
              onClick={() => handleOpenModal()}
              className="px-8 py-4 rounded-2xl text-sm font-bold bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
            >
              <UserPlus size={20} /> Cadastrar Paciente
            </button>
          )}
        </div>
      </section>

      {/* Search, Filter and Stats */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-outline" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome, email ou diagnóstico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-white rounded-2xl border border-outline-variant/10 shadow-sm focus:ring-2 focus:ring-primary/10 text-on-surface font-medium"
            />
          </div>

          {/* Active Package Filter Toggle */}
          <button
            onClick={() => setFilterActivePackage(prev => !prev)}
            title="Filtrar por Pacote Ativo"
            className={`flex items-center gap-2.5 px-6 py-4 rounded-2xl font-bold text-sm border shadow-sm transition-all whitespace-nowrap ${
              filterActivePackage
                ? 'bg-primary text-white border-primary shadow-primary/20 shadow-lg scale-[1.02]'
                : 'bg-white text-outline border-outline-variant/10 hover:border-primary/30 hover:text-primary'
            }`}
          >
            <Package size={18} />
            Pacote Ativo
            {activePackageCount > 0 && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                filterActivePackage ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
              }`}>
                {activePackageCount}
              </span>
            )}
          </button>
        </div>

        {/* Stats card */}
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
              {filterActivePackage ? 'Com Pacote Ativo' : 'Total de Pacientes'}
            </p>
            <p className="text-2xl font-bold text-primary">{filteredPatients.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {filterActivePackage ? <Package size={24} /> : <User size={24} />}
          </div>
        </div>
      </section>

      {/* Active Filter Banner */}
      <AnimatePresence>
        {filterActivePackage && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-6 py-3.5 bg-primary/5 border border-primary/15 rounded-2xl text-primary">
              <Package size={16} className="shrink-0" />
              <p className="text-sm font-semibold">
                Exibindo apenas pacientes com <span className="font-black">pacote de consultas ativo</span>.
              </p>
              <button
                onClick={() => setFilterActivePackage(false)}
                className="ml-auto text-xs font-bold underline underline-offset-2 hover:no-underline opacity-70 hover:opacity-100 transition-opacity"
              >
                Limpar filtro
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patients Table/List */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="px-8 py-6 text-[10px] font-bold text-outline uppercase tracking-widest">Paciente</th>
                <th className="px-8 py-6 text-[10px] font-bold text-outline uppercase tracking-widest">Profissão / Estado Civil</th>
                <th className="px-8 py-6 text-[10px] font-bold text-outline uppercase tracking-widest">Contato</th>
                <th className="px-8 py-6 text-[10px] font-bold text-outline uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-bold text-outline uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredPatients.map((patient) => (
                  <motion.tr 
                    key={patient.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-outline-variant/5 hover:bg-surface-container-low transition-colors group"
                  >
                    <td className="px-8 py-6 cursor-pointer" onClick={() => onOpenDetail?.(patient)}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl border border-outline-variant/10 bg-primary/5 flex items-center justify-center text-primary font-bold text-sm relative">
                          {getInitials(patient.name)}
                          {patient.hasActivePackage && (
                            <span
                              title="Pacote Ativo"
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"
                            />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <p className="font-bold text-on-surface group-hover:text-primary transition-colors">{patient.name}</p>
                            {patient.hasActivePackage && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                <Package size={9} /> Pacote Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant">{patient.age} anos • {patient.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 cursor-pointer" onClick={() => onOpenDetail?.(patient)}>
                      <p className="text-sm font-medium text-on-surface">{patient.profession || 'Não informada'}</p>
                      <p className="text-[10px] text-outline mt-1 uppercase tracking-tight">{patient.maritalStatus || 'Não informado'}</p>
                    </td>
                    <td className="px-8 py-6 cursor-pointer" onClick={() => onOpenDetail?.(patient)}>
                      <div className="space-y-1">
                        <p className="text-xs flex items-center gap-2 text-on-surface-variant">
                          <Phone size={12} /> {patient.phone}
                        </p>
                        <p className="text-xs flex items-center gap-2 text-on-surface-variant">
                          <Mail size={12} /> {patient.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 cursor-pointer" onClick={() => onOpenDetail?.(patient)}>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${
                        patient.status === 'Ativo' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-surface-container-high text-outline'
                      }`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {patient.phone && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              openWhatsApp(patient.phone, WhatsAppTemplates.welcome(patient.name)); 
                            }}
                            title="Conversar no WhatsApp"
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          >
                            <MessageSquare size={18} />
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); onNewAppointment?.(); }}
                          title="Agendar Consulta"
                          className="p-2 rounded-xl hover:bg-white hover:shadow-sm text-outline hover:text-secondary transition-all"
                        >
                          <Calendar size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onOpenEvaluations?.(patient.id); }}
                          title="Ver Avaliações"
                          className="p-2 rounded-xl hover:bg-white hover:shadow-sm text-outline hover:text-primary transition-all"
                        >
                          <FileText size={18} />
                        </button>
                        {canEdit && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(patient); }}
                            title="Editar Ficha"
                            className="p-2 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(patient.id); }}
                            title="Excluir"
                            className="p-2 rounded-xl hover:bg-rose-50 text-outline hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => onOpenDetail?.(patient)}
                          className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-all"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filteredPatients.length === 0 && (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-6 text-outline">
                {filterActivePackage ? <Package size={40} /> : <User size={40} />}
              </div>
              <h3 className="text-xl font-bold text-on-surface">
                {filterActivePackage ? 'Nenhum paciente com pacote ativo' : 'Nenhum paciente encontrado'}
              </h3>
              <p className="text-on-surface-variant mt-2">
                {filterActivePackage
                  ? 'Nenhum paciente possui um pacote de consultas ativo no momento.'
                  : 'Tente ajustar sua busca ou cadastrar um novo paciente.'}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
