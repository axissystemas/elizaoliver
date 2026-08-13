'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  FileText, 
  X, 
  Check,
  Calendar as CalendarIcon,
  MoreVertical,
  Trash2,
  Edit2,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType } from '@/types/auth';
import { openWhatsApp, WhatsAppTemplates } from '@/lib/whatsapp';

import PreBookingManagementView from '@/components/PreBookingManagementView';
import { fetchPreBookingRequests } from '@/lib/preBookingService';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // ISO string
  time: string; // HH:mm
  duration: number; // minutes
  type: 'initial' | 'follow-up' | 'emergency';
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  price: number;
  paymentStatus: 'pendente' | 'pago';
  isInsurance?: boolean;
  planName?: string;
}

interface Patient {
  id: string;
  name: string;
  phone?: string;
}

interface ConsultationType {
  id: string;
  name: string;
  price: number;
}

interface CalendarViewProps {
  forceOpenModal?: boolean;
  onModalClose?: () => void;
  user?: UserType | null;
  appointments: Appointment[];
  patients: Patient[];
  onSaveAppointment: (data: any) => Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onOpenPatientModal?: () => void;
  packages?: any[];
  onRefreshData?: () => void;
}

export default function CalendarView({ 
  forceOpenModal = false, 
  onModalClose,
  user,
  appointments,
  patients,
  onSaveAppointment,
  onDeleteAppointment,
  onOpenPatientModal,
  packages = [],
  onRefreshData
}: CalendarViewProps) {
  const [mainTab, setMainTab] = useState<'calendar' | 'pre_booking'>('calendar');
  const [pendingPreBookingCount, setPendingPreBookingCount] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week');

  useEffect(() => {
    async function loadPendingCount() {
      const list = await fetchPreBookingRequests();
      setPendingPreBookingCount(list.filter(r => r.status === 'PENDENTE').length);
    }
    loadPendingCount();
  }, [mainTab]);
  
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([
    { id: 'initial', name: 'Primeira Consulta', price: 250 },
    { id: 'followup', name: 'Retorno', price: 150 },
    { id: 'emergency', name: 'Emergência', price: 300 }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(forceOpenModal);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canCreate = user?.permissions.includes('calendar:create') || user?.role === 'ADMIN';
  const canEdit = user?.permissions.includes('calendar:edit') || user?.role === 'ADMIN';
  const canDelete = user?.permissions.includes('calendar:delete') || user?.role === 'ADMIN';

  const [newAppointment, setNewAppointment] = useState<Partial<Appointment>>({
    date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
    time: '09:00',
    duration: 60,
    type: 'initial',
    status: 'scheduled',
    patientId: '',
    notes: ''
  });

  const resetForm = (date?: string) => {
    setEditingAppointment(null);
    setNewAppointment({
      date: date || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
      time: '09:00',
      duration: 60,
      type: 'initial',
      status: 'scheduled',
      patientId: '',
      notes: ''
    });
  };

  useEffect(() => {
    if (forceOpenModal) {
      const timer = setTimeout(() => {
        resetForm();
        setIsModalOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [forceOpenModal]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevDate = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const nextDate = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const normalizeType = (type?: string): 'initial' | 'followup' | 'emergency' => {
    const t = (type || '').toLowerCase().replace(/[\s-_/]/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (t === 'initial' || t === 'primeiraconsulta') return 'initial';
    if (t === 'emergency' || t === 'emergencia' || t === 'urgencia') return 'emergency';
    return 'followup';
  };

  const getPriceByType = (type: string) => {
    const norm = normalizeType(type);
    const found = consultationTypes.find(t => t.id === norm || t.id === type || t.name === type);
    return found ? found.price : (norm === 'initial' ? 250 : norm === 'emergency' ? 300 : 150);
  };

  const getAppointmentColor = (type: string) => {
    const norm = normalizeType(type);
    if (norm === 'initial') return 'bg-emerald-50 border-emerald-500 text-emerald-700';
    if (norm === 'emergency') return 'bg-rose-50 border-rose-500 text-rose-700';
    // followup / follow-up / retorno / outros
    return 'bg-amber-50 border-amber-500 text-amber-700';
  };

  const handleSaveAppointment = async () => {
    if (!newAppointment.patientId) {
      alert('Por favor, selecione um paciente para o agendamento.');
      return;
    }
    if (!newAppointment.date || !newAppointment.time) {
      alert('Por favor, preencha a data e o horário da consulta.');
      return;
    }

    setIsSaving(true);
    try {
      const patient = patients.find(p => p.id === newAppointment.patientId);
      const type = newAppointment.type || 'follow-up';
      
      const appointmentData = {
        ...newAppointment,
        patientName: patient?.name || 'Paciente Desconhecido',
        price: (newAppointment.price !== undefined && newAppointment.price !== null) ? newAppointment.price : getPriceByType(type),
        id: editingAppointment?.id
      };

      await onSaveAppointment(appointmentData);

      setIsModalOpen(false);
      setEditingAppointment(null);
      setNewAppointment({
        date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
        time: '09:00',
        duration: 45,
        type: 'follow-up',
        status: 'scheduled',
        patientId: '',
        notes: ''
      });
      if (onModalClose) onModalClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    await onDeleteAppointment(id);
  };

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const renderMonthView = () => {
    const days = [];
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    // Padding for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 border-b border-r border-outline-variant/5 bg-surface-container-low/30"></div>);
    }

    // Days of the month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayAppointments = appointments.filter(app => app.date === dateStr);
      const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      const isToday = todayStr === dateStr;

      days.push(
        <div key={d} className={`h-32 border-b border-r border-outline-variant/5 p-2 transition-colors hover:bg-surface-container-low/50 group relative`}>
          <div className="flex justify-between items-start">
            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>
              {d}
            </span>
            {canCreate && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  resetForm(dateStr);
                  setIsModalOpen(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/10 text-primary rounded-md transition-all"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <div className="mt-1 space-y-1 overflow-y-auto max-h-20 scrollbar-hide">
            {dayAppointments.map(app => (
              <div 
                key={app.id} 
                onClick={() => {
                  if (canEdit) {
                    setEditingAppointment(app);
                    setNewAppointment(app);
                    setIsModalOpen(true);
                  }
                }}
                className={`text-[10px] p-1 rounded border-l-2 truncate cursor-pointer transition-all hover:brightness-95 ${getAppointmentColor(app.type)}`}
              >
                <span className="font-bold">{app.time}</span> {app.patientName}
                {app.isInsurance && <ShieldCheck size={10} className="inline ml-1 text-primary opacity-80" />}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  const renderWeekView = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
      const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const isToday = todayStr === dateStr;
      const dayAppointments = appointments.filter((app: any) => app.date === dateStr);

      days.push(
        <div key={i} className={`h-[500px] border-r border-outline-variant/5 p-2 transition-colors hover:bg-surface-container-low/50 group relative`}>
          <div className="flex flex-col items-center mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
              {day.toLocaleString('pt-BR', { weekday: 'short' })}
            </span>
            <span className={`text-lg font-bold w-10 h-10 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : 'text-on-surface'}`}>
              {day.getDate()}
            </span>
          </div>
          
          <div className="space-y-2 overflow-y-auto h-[400px] scrollbar-hide pr-1">
            {dayAppointments.sort((a, b) => a.time.localeCompare(b.time)).map(app => (
              <div 
                key={app.id} 
                onClick={() => {
                  if (canEdit) {
                    setEditingAppointment(app);
                    setNewAppointment(app);
                    setIsModalOpen(true);
                  }
                }}
                className={`p-3 rounded-xl border-l-4 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${getAppointmentColor(app.type)}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold">{app.time}</span>
                  </div>
                  {app.isInsurance && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 scale-90">
                      <ShieldCheck size={10} />
                      <span className="text-[8px] font-bold uppercase tracking-tighter">{app.planName?.split(' ')[0]}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-bold truncate">{app.patientName}</p>
                <p className="text-[10px] opacity-70 truncate">
                  {normalizeType(app.type) === 'initial' && (!app.duration || app.duration === 45) ? 60 : (app.duration || 45)} min
                </p>
              </div>
            ))}
            {canCreate && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  resetForm(dateStr);
                  setIsModalOpen(true);
                }}
                className="w-full py-3 border-2 border-dashed border-outline-variant/20 rounded-xl text-outline hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span className="text-[10px] font-bold uppercase">Novo</span>
              </button>
            )}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="p-6 lg:p-10 relative flex flex-col space-y-6">
      {/* Barra de Abas Superiores (Agenda vs Pré-Agendamentos) */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
        <button
          onClick={() => setMainTab('calendar')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            mainTab === 'calendar'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <CalendarIcon size={16} />
          <span>Agenda da Clínica</span>
        </button>

        <button
          onClick={() => setMainTab('pre_booking')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            mainTab === 'pre_booking'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Clock size={16} />
          <span>Solicitações de Pré-Agendamento</span>
          {pendingPreBookingCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-amber-950 font-extrabold text-[10px]">
              {pendingPreBookingCount}
            </span>
          )}
        </button>
      </div>

      {mainTab === 'pre_booking' ? (
        <PreBookingManagementView 
          user={user || null} 
          onAppointmentCreated={() => {
            if (onRefreshData) onRefreshData();
            fetchPreBookingRequests().then(list => {
              setPendingPreBookingCount(list.filter(r => r.status === 'PENDENTE').length);
            });
          }} 
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold font-headline text-on-surface capitalize">
                {viewMode === 'month' ? `${monthName} ${year}` : `Semana de ${currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`}
              </h2>
              <p className="text-on-surface-variant text-lg mt-2 font-medium">Gerencie seus atendimentos e horários.</p>
            </div>
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10">
                <button 
                  onClick={() => setViewMode('month')}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Mês
                </button>
                <button 
                  onClick={() => setViewMode('week')}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Semana
                </button>
              </div>

              <div className="flex bg-white rounded-2xl shadow-sm border border-outline-variant/10 p-1">
                <button onClick={prevDate} className="p-2 hover:bg-surface-container-low rounded-xl transition-all text-on-surface-variant">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-low rounded-xl transition-all">
                  Hoje
                </button>
                <button onClick={nextDate} className="p-2 hover:bg-surface-container-low rounded-xl transition-all text-on-surface-variant">
                  <ChevronRight size={20} />
                </button>
              </div>
              {canCreate && (
                <button 
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(true);
                  }}
                  className="bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:brightness-110 transition-all shadow-xl shadow-primary/20"
                >
                  <Plus size={18} /> Novo Atendimento
                </button>
              )}
            </div>
          </div>

      {/* Legend */}
      <div className="flex items-center gap-6 flex-wrap">
        <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Legenda:</span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Primeira Consulta
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Retorno
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
          <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Emergência
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-outline-variant/10 overflow-hidden flex flex-col">
        {viewMode === 'month' ? (
          <>
            {/* Weekdays */}
            <div className="grid grid-cols-7 border-b border-outline-variant/10 bg-surface-container-low/50">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-outline">
                  {day}
                </div>
              ))}
            </div>
            {/* Days */}
            <div className="flex-1 grid grid-cols-7 overflow-y-auto">
              {renderMonthView()}
            </div>
          </>
        ) : (
          <div className="flex-1 grid grid-cols-7 overflow-y-auto">
            {renderWeekView()}
          </div>
        )}
      </div>

      {/* Appointment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
                if (onModalClose) onModalClose();
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
                <div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">
                    {editingAppointment ? 'Editar Atendimento' : 'Novo Atendimento'}
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium">Preencha os detalhes da consulta.</p>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                    if (onModalClose) onModalClose();
                  }} 
                  className="p-2 hover:bg-surface-container-low rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><User size={14} /> Paciente</span>
                    {onOpenPatientModal && (
                      <button 
                        onClick={() => {
                          setIsModalOpen(false);
                          if (onModalClose) onModalClose();
                          onOpenPatientModal();
                        }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        + Novo Paciente
                      </button>
                    )}
                  </label>
                  <select 
                    value={newAppointment.patientId || ''}
                    onChange={e => setNewAppointment({...newAppointment, patientId: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                  >
                    <option value="">Selecione um paciente...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Package Selection */}
                {newAppointment.patientId && packages.filter(p => p.patient_id === newAppointment.patientId && p.status === 'active' && (p.total_sessions - p.used_sessions) > 0).length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Plus size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary uppercase tracking-widest leading-none mb-1">Pacote Disponível</p>
                          <p className="text-sm font-medium text-on-surface">Este paciente possui sessões pendentes.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={!!(newAppointment as any).isPackageSession}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const patientPkg = packages.find(p => p.patient_id === newAppointment.patientId && p.status === 'active');
                            setNewAppointment({
                              ...newAppointment, 
                              isPackageSession: isChecked,
                              packageId: isChecked ? patientPkg?.id : null,
                              price: isChecked ? 0 : getPriceByType(newAppointment.type || 'follow-up')
                            } as any);
                          }}
                        />
                        <div className="w-14 h-8 bg-outline/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    {(newAppointment as any).isPackageSession && (
                      <div className="pt-2 border-t border-primary/10">
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Aviso Financeiro</p>
                        <p className="text-xs text-on-surface-variant font-medium mt-1">
                          Esta consulta será registrada com **valor zero** no financeiro para evitar duplicidade com a venda do pacote.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-2">
                      <CalendarIcon size={14} /> Data
                    </label>
                    <input 
                      type="date" 
                      value={newAppointment.date}
                      onChange={e => setNewAppointment({...newAppointment, date: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} /> Horário
                    </label>
                    <input 
                      type="time" 
                      value={newAppointment.time}
                      onChange={e => setNewAppointment({...newAppointment, time: e.target.value})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Duração (min)</label>
                    <select 
                      value={newAppointment.duration}
                      onChange={e => setNewAppointment({...newAppointment, duration: parseInt(e.target.value)})}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Tipo de Consulta</label>
                    <select 
                      value={newAppointment.type}
                      onChange={e => {
                        const selectedType = e.target.value;
                        const isInitial = normalizeType(selectedType) === 'initial';
                        setNewAppointment({
                          ...newAppointment, 
                          type: selectedType as any,
                          duration: isInitial ? 60 : (newAppointment.duration === 60 ? 45 : (newAppointment.duration || 45))
                        });
                      }}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                    >
                      {consultationTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} /> Observações
                  </label>
                  <textarea 
                    value={newAppointment.notes}
                    onChange={e => setNewAppointment({...newAppointment, notes: e.target.value})}
                    placeholder="Alguma observação importante para este atendimento?"
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium min-h-[100px] resize-none"
                  />
                </div>

                {newAppointment.patientId && (() => {
                  const selectedPatient = patients.find(p => p.id === newAppointment.patientId);
                  if (!selectedPatient?.phone) return null;
                  const formattedDate = newAppointment.date ? new Date(newAppointment.date + 'T00:00:00').toLocaleDateString('pt-BR') : '';
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const msg = WhatsAppTemplates.appointmentReminder(
                          selectedPatient.name,
                          formattedDate,
                          newAppointment.time || '',
                          'Axis GC'
                        );
                        openWhatsApp(selectedPatient.phone!, msg);
                      }}
                      className="w-full py-3.5 rounded-2xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 border border-emerald-200"
                    >
                      <MessageSquare size={18} /> Enviar Lembrete no WhatsApp
                    </button>
                  );
                })()}

                <div className="flex gap-4 pt-2">
                  {editingAppointment && canDelete && (
                    <button 
                      onClick={() => {
                        handleDeleteAppointment(editingAppointment.id);
                        setIsModalOpen(false);
                        setEditingAppointment(null);
                        if (onModalClose) onModalClose();
                      }}
                      className="flex-1 py-4 rounded-2xl border border-rose-200 text-rose-500 font-bold hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={20} /> Excluir
                    </button>
                  )}
                  <button 
                    onClick={handleSaveAppointment}
                    disabled={isSaving}
                    className="flex-[2] py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Salvando...
                      </span>
                    ) : (
                      <><Check size={20} /> {editingAppointment ? 'Salvar Alterações' : 'Confirmar Agendamento'}</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
